from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field

QUESTION_CAPS = {3: 2, 5: 3, 7: 4, 10: 5}
MIN_SECONDS_FOR_NEXT_QUESTION = 45

TRACKS = {"frontend", "backend", "sde"}
EXPERIENCE = {"0-1", "1-3", "3-5", "5+"}
COMPANY_KINDS = {"startup", "mnc"}
DURATIONS = set(QUESTION_CAPS)


@dataclass
class InterviewSession:
    id: str
    kind: str
    duration_minutes: int
    track: str | None = None
    experience: str | None = None
    company_kind: str | None = None
    job_description: str | None = None
    resume_text: str | None = None
    status: str = "ready"
    created_at: float = field(default_factory=time.time)
    started_at: float | None = None
    ended_at: float | None = None
    questions_asked: int = 0
    closing: bool = False
    turns: list[dict] = field(default_factory=list)


_sessions: dict[str, InterviewSession] = {}


def create(session: InterviewSession) -> InterviewSession:
    _sessions[session.id] = session
    return session


def get(session_id: str) -> InterviewSession | None:
    return _sessions.get(session_id)


def new_id() -> str:
    return str(uuid.uuid4())


def question_cap(duration_minutes: int) -> int:
    return QUESTION_CAPS[duration_minutes]


def seconds_remaining(session: InterviewSession) -> float | None:
    if session.started_at is None:
        return None
    elapsed = time.time() - session.started_at
    return session.duration_minutes * 60 - elapsed


def should_ask_another(session: InterviewSession) -> bool:
    if session.closing or session.status != "live":
        return False
    if session.questions_asked >= question_cap(session.duration_minutes):
        return False
    remaining = seconds_remaining(session)
    if remaining is None:
        return False
    return remaining > MIN_SECONDS_FOR_NEXT_QUESTION


def ends_at(session: InterviewSession) -> float | None:
    if session.started_at is None:
        return None
    return session.started_at + session.duration_minutes * 60


def public_view(session: InterviewSession) -> dict:
    return {
        "id": session.id,
        "kind": session.kind,
        "track": session.track,
        "experience": session.experience,
        "company_kind": session.company_kind,
        "duration_minutes": session.duration_minutes,
        "question_cap": question_cap(session.duration_minutes),
        "questions_asked": session.questions_asked,
        "status": session.status,
        "started_at": session.started_at,
        "ends_at": ends_at(session),
        "turn_count": len(session.turns),
    }
