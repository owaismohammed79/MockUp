from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from ..services.voice_response_service import stream_voice_response
from ..services.file_service import save_file
from ..services.transcription_service import transcribe_file
from ..config.config import settings

router = APIRouter()

@router.post("/voice-chat")
async def upload_file(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    try:
        file_path, filename = await save_file(file, settings.upload_dir)
        transcription = await transcribe_file(file_path)
        return StreamingResponse(
            stream_voice_response(transcription),
            media_type="audio/mpeg",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

