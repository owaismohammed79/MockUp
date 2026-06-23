from __future__ import annotations
import asyncio
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import interview_session
from app.services.vad_service import load_model
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan():
    """warm the silero vad model in a thread so the event loop is not blocked during synchronous load call"""
    logger.info("Warming silero vad model")
    await asyncio.to_thread(load_model)
    logger.info("silero vad model ready")
    yield
    logger.info("app stopping")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def healthCheck():
    return {"data": "Server is running"}

app.include_router(interview_session.router)