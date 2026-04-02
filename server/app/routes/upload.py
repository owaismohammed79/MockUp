from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.audio_service import process_audio
from app.config.config import settings

router = APIRouter()

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    try:
        result = await process_audio(file, settings.upload_dir)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))