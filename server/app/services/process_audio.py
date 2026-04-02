from app.config.config import groq_client
from app.services.file_service import save_file

async def get_transcript(filename):
    with open(filename, "rb") as file:
        transcription = groq_client.audio.transcriptions.create(
        file=(filename, file.read()),
        model="whisper-large-v3-turbo",
        temperature=0,
        response_format="verbose_json",
        )
        return transcription.text


async def process_audio(file, upload_dir):
    file_path, filename = await save_file(file, upload_dir)
    transcription = await get_transcript(file_path)

    return {
        "filename": filename,
        "path": file_path,
        "transcription": transcription
    }