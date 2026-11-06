from __future__ import annotations
import asyncio
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import interview_session, resume, sessions
from app.services.vad_service import load_model
from dotenv import load_dotenv
logger = logging.getLogger(__name__)

load_dotenv()
frontend_url = os.environ.get("FRONTEND_URL")
origins = [frontend_url] if frontend_url else []
for port in (5173, 5174):
    for host in ("localhost", "127.0.0.1"):
        origin = f"http://{host}:{port}"
        if origin not in origins:
            origins.append(origin)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    """warm the silero vad model in a thread so the event loop is not blocked during synchronous load call"""
    logger.info("Warming silero vad model")
    await asyncio.to_thread(load_model)
    logger.info("silero vad model ready")
    yield
    logger.info("app stopping")

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def healthCheck():
    return {"data": "Server is running"}

app.include_router(interview_session.router)
app.include_router(resume.router)
app.include_router(sessions.router)