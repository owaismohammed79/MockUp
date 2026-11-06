from __future__ import annotations
import json
import asyncio
import logging
import time
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.turn_pipeline import run_ai_turn
from ..services.transcription_service import transcribe_bytes, is_no_speech
from ..services.vad_service import contains_speech
from ..services.session_store import get, should_ask_another, ends_at, question_cap

logger = logging.getLogger(__name__)

router = APIRouter()


def _end_session(session) -> None:
    if session.status != "ended":
        session.status = "ended"
        session.ended_at = time.time()


@router.websocket("/ws/interview/{session_id}")
async def interview_ws(websocket: WebSocket, session_id: str):
    await websocket.accept()
    session = get(session_id)
    if session is None:
        await websocket.send_json({"type": "error", "message": "Unknown session"})
        await websocket.close(code=1008)
        return

    audio_chunks = []
    ai_turn_task = None

    await websocket.send_json({
        "type": "session",
        "id": session.id,
        "status": session.status,
        "ends_at": ends_at(session),
        "questions_asked": session.questions_asked,
        "question_cap": question_cap(session.duration_minutes),
    })

    if session.status == "ended":
        await websocket.send_json({"type": "session_ended", "id": session.id})
        await websocket.close()
        return

    try:
        needs_opening = session.status == "ready" or (
            session.status == "live" and session.questions_asked == 0
        )
        if needs_opening:
            session.status = "live"
            if session.started_at is None:
                session.started_at = time.time()
            await websocket.send_json({
                "type": "session",
                "id": session.id,
                "status": session.status,
                "ends_at": ends_at(session),
                "questions_asked": session.questions_asked,
                "question_cap": question_cap(session.duration_minutes),
            })
            ai_turn_task = asyncio.create_task(run_ai_turn(websocket, session, "open"))

        while True:
            msg = await websocket.receive()

            if msg.get("bytes"):
                audio_chunks.append(msg["bytes"])
                logger.debug("Audio chunk received (%d bytes)", len(msg["bytes"]))

            elif msg.get("text"):
                data = json.loads(msg["text"])

                if data["type"] == "barge_in":
                    if ai_turn_task and not ai_turn_task.done():
                        ai_turn_task.cancel()
                        try:
                            await ai_turn_task
                        except asyncio.CancelledError:
                            pass
                    audio_chunks = []

                elif data["type"] == "time_up":
                    session.closing = True
                    idle = ai_turn_task is None or ai_turn_task.done()
                    if idle and session.status == "live":
                        ai_turn_task = asyncio.create_task(run_ai_turn(websocket, session, "wrap"))

                elif data["type"] == "stop":
                    if ai_turn_task and not ai_turn_task.done():
                        ai_turn_task.cancel()
                        try:
                            await ai_turn_task
                        except asyncio.CancelledError:
                            pass
                    _end_session(session)
                    await websocket.send_json({"type": "session_ended", "id": session.id})

                elif data["type"] == "end":
                    if session.status == "ended":
                        continue
                    if not audio_chunks:
                        logger.warning("Chat end received with no audio chunks, ignored")
                        continue

                    full_audio = b"".join(audio_chunks)
                    audio_chunks = []

                    try:
                        has_speech, max_vad_prob = await asyncio.to_thread(contains_speech, full_audio)
                    except ValueError as e:
                        logger.warning("vad Audio decode failed: %s", e)
                        has_speech = False
                        max_vad_prob = 0.0

                    if not has_speech:
                        logger.info("vad rejected audio (max_prob=%.3f), sending no_speech", max_vad_prob)
                        await websocket.send_json({"type": "no_speech"})
                        continue

                    result = await asyncio.to_thread(transcribe_bytes, full_audio)
                    if is_no_speech(result):
                        logger.info("stt rejected transcript, sending no_speech")
                        await websocket.send_json({"type": "no_speech"})
                        continue

                    transcript = result.text.strip()
                    logger.info("stt transcript: %r", transcript)
                    session.turns.append({"role": "user", "content": transcript})
                    await websocket.send_json({"type": "transcript", "text": transcript})

                    purpose = "next" if should_ask_another(session) else "wrap"
                    if ai_turn_task and not ai_turn_task.done():
                        ai_turn_task.cancel()
                        try:
                            await ai_turn_task
                        except asyncio.CancelledError:
                            pass
                    ai_turn_task = asyncio.create_task(run_ai_turn(websocket, session, purpose))

                else:
                    logger.debug("Unknown msg type: %r", data.get("type"))

    except WebSocketDisconnect:
        logger.info("Client disconnected from session %s", session_id)
    except asyncio.CancelledError:
        raise
    except Exception:
        logger.exception("Interview socket error")
        try:
            await websocket.close(code=1011)
        except Exception:
            pass
    finally:
        if ai_turn_task and not ai_turn_task.done():
            ai_turn_task.cancel()
