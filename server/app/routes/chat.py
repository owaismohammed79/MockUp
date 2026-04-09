from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from ..services.file_service import save_file
from ..services.ai_service import stream_ai_response
from ..services.transcription_service import transcribe_bytes, transcribe_file
from ..services.tts_service import synthesize_and_send
from ..config.config import settings
import json
import asyncio

router = APIRouter()

# @router.post("/voice-chat")
# async def upload_file(file: UploadFile = File(...)):
#     if not file.content_type.startswith("audio/"):
#         raise HTTPException(status_code=400, detail="Invalid file type")
    
#     try:
#         file_path, filename = await save_file(file, settings.upload_dir)
#         transcription = await transcribe_file(file_path)
#         return StreamingResponse(
#             stream_voice_response(transcription),
#             media_type="audio/mpeg",
#         )
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))
    

@router.websocket("/ws/interview")
async def interview_ws(websocket: WebSocket):
    await websocket.accept()
    audio_chunks = []

    try:
        while True:
            msg = await websocket.receive()

            if msg.get("bytes"):
                audio_chunks.append(msg["bytes"])

            elif msg.get("text"):
                data = json.loads(msg["text"])
                if data["type"] == "end":
                    full_audio = b"".join(audio_chunks)

                    result = await asyncio.to_thread(transcribe_bytes, full_audio)
                    transcript = result.text

                    await websocket.send_json({
                        "type": "transcript",
                        "text": transcript
                    })

                    tts_queue = asyncio.Queue()

                    async def tts_consumer():
                        while True:
                            sentence = await tts_queue.get()
                            if sentence is None:
                                break
                            await synthesize_and_send(sentence, websocket)

                    consumer_task = asyncio.create_task(tts_consumer())

                    #stream llm text and tts audio back
                    buffer = ""

                    async for token in stream_ai_response(transcript):
                        await websocket.send_json({
                            "type": "llm_text",
                            "text": token
                        })

                        buffer += token

                        # chunk sentence
                        if any(p in buffer for p in [".", "?", "!"]) and len(buffer) > 30:
                            await tts_queue.put(buffer)
                            buffer = ""

                    #flush remaining
                    if buffer:
                        await tts_queue.put(buffer)

                    await tts_queue.put(None)
                    await consumer_task

                    #clear the audio chunks so that when the turn ends, you don't have audio chunks of prev one
                    audio_chunks = []
    except WebSocketDisconnect:
        print("Client disconnected")

    except Exception as e:
        print("Error:", e)
        await websocket.close(code=1011)