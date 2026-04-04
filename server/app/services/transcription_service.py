from app.config.config import groq_transcription_client
from fastapi import HTTPException

def transcribe_bytes(audio_bytes: bytes) -> dict:
    try:
        return groq_transcription_client.audio.transcriptions.create(
            file=("audio.webm", audio_bytes),
            model="whisper-large-v3-turbo",
            temperature=0,
            response_format="verbose_json",
            timestamp_granularities=["word"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def transcribe_file(filepath: str) -> str:
    try:
        with open(filepath, "rb") as f:
            result = transcribe_bytes(f.read())
        return result.text
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
def transcribe_chunk(audio_bytes: bytes) -> str:
    result = transcribe_bytes(audio_bytes)
    return result.text
    
