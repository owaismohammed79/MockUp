from __future__ import annotations
import asyncio
import logging
import time
from fastapi import WebSocket
from .ai_service import stream_ai_response
from .interview_prompt import system_prompt
from .session_store import InterviewSession, question_cap
from .tts_service import synthesize_and_send

logger = logging.getLogger(__name__)


async def run_ai_turn(websocket: WebSocket, session: InterviewSession, purpose: str):
    tts_queue: asyncio.Queue[str | None] = asyncio.Queue()

    async def tts_consumer():
        try:
            while True:
                sentence = await tts_queue.get()
                if sentence is None:
                    break
                await synthesize_and_send(sentence, websocket)
                tts_queue.task_done()
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.exception("tts consumer error: %s", e)

    consumer_task = asyncio.create_task(tts_consumer())
    spoken = ""

    try:
        history = list(session.turns)
        if purpose == "open":
            history.append({"role": "user", "content": "Begin the interview now."})

        buffer = ""
        async for token in stream_ai_response(system_prompt(session, purpose), history):
            spoken += token
            await websocket.send_json({"type": "llm_text", "text": token})
            buffer += token
            if any(p in buffer for p in [".", "?", "!"]):
                await tts_queue.put(buffer)
                buffer = ""

        if buffer.strip():
            await tts_queue.put(buffer)

        await tts_queue.put(None)
        await consumer_task

        if spoken.strip():
            session.turns.append({"role": "assistant", "content": spoken.strip()})
        if purpose in {"open", "next"}:
            session.questions_asked += 1

        await websocket.send_json({
            "type": "ai_turn_complete",
            "questions_asked": session.questions_asked,
            "question_cap": question_cap(session.duration_minutes),
        })

        if purpose == "wrap":
            session.status = "ended"
            session.ended_at = time.time()
            await websocket.send_json({"type": "session_ended", "id": session.id})

    except asyncio.CancelledError:
        consumer_task.cancel()
        while not tts_queue.empty():
            tts_queue.get_nowait()
        try:
            await consumer_task
        except asyncio.CancelledError:
            pass
        if spoken.strip():
            session.turns.append({"role": "assistant", "content": spoken.strip()})
        logger.info("AI turn cancelled")
        raise

    except Exception:
        logger.exception("AI turn failed")
        consumer_task.cancel()
        await websocket.send_json({"type": "ai_turn_complete", "questions_asked": session.questions_asked})
