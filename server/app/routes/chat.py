from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.file_service import save_file
from ..services.ai_service import stream_ai_response
from ..services.transcription_service import transcribe_bytes, transcribe_file
from ..services.tts_service import synthesize_and_send
from ..config.config import settings
import json
import asyncio

router = APIRouter()

@router.websocket("/ws/interview")
async def interview_ws(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []
    ai_turn_task = None
    tts_queue = asyncio.Queue()

    async def run_ai_turn(transcript: str):
        tts_queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def tts_consumer():
            try:
                while True:
                    sentence = await tts_queue.get()
                    if sentence is None:
                        break
                    await synthesize_and_send(sentence, websocket)
                    tts_queue.task_done()
            except Exception as e:
                print(f"tts consumer error: {e}")
            
        consumer_task = asyncio.create_task(tts_consumer())

        try:
            buffer = ""
            async for token in stream_ai_response(transcript):
                #Cancelled error can be raised at any of these awaits
                await websocket.send_json({ "type": "llm_text", "text": token })
                buffer += token
                if any(p in buffer for p in [".", "?", "!"]):
                    await tts_queue.put(buffer)
                    buffer = ""

            if buffer:
                await tts_queue.put(buffer)

            await tts_queue.put(None)
            await consumer_task

            await websocket.send_json({ "type": "ai_turn_complete", "text": None })

        except asyncio.CancelledError:
            #user interrupted, cancel tts 
            consumer_task.cancel()

            while not tts_queue.empty():
                tts_queue.get_nowait()

            #wait for consumer to finish cancelling
            try:
                await consumer_task
            except asyncio.CancelledError:
                pass

            print("AI turn cancelled")
            raise  #so that we know that the tts was cancelled rather than completing successfully  

    try:
        while True:
            msg = await websocket.receive()

            if msg.get("bytes"):
                audio_chunks.append(msg["bytes"])
                print("Audio chunks recieving")

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

                elif data["type"] == "end":
                    full_audio = b"".join(audio_chunks)
                    print("Complete audio found")
                    #clear the audio chunks so that when the turn starts, you don't have audio chunks of prev one
                    audio_chunks = []

                    result = await asyncio.to_thread(transcribe_bytes, full_audio)
                    transcript = result.text
                    print("Transcription of audio done:", transcript)

                    await websocket.send_json({
                        "type": "transcript",
                        "text": transcript
                    })
                    print("Sent transcript")

                    ai_turn_task = asyncio.create_task(run_ai_turn(transcript))

    except WebSocketDisconnect:
        print("Client disconnected")

    except Exception as e:
        print("Error:", e)
        await websocket.close(code=1011)