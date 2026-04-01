from pydantic_settings import BaseSettings
from groq import Groq
import os


class Settings(BaseSettings):
    upload_dir: str
    groq_api_key: str

    class Config:
        env_file = ".env"

settings = Settings()

os.makedirs(settings.upload_dir, exist_ok=True)
groq_transcription_client = Groq(api_key=settings.groq_api_key)