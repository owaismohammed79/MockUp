from pydantic_settings import BaseSettings
from groq import Groq


class Settings(BaseSettings):
    groq_api_key: str
    groq_llm_api_key: str
    frontend_url: str

    class Config:
        env_file = ".env"

settings = Settings()

groq_transcription_client = Groq(api_key=settings.groq_api_key)
groq_llm_client = Groq(api_key=settings.groq_llm_api_key)