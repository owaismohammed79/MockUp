from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from ..services.resume_parsing_service import parse
from ..services.session_store import (
    COMPANY_KINDS,
    DURATIONS,
    EXPERIENCE,
    TRACKS,
    InterviewSession,
    create,
    get,
    new_id,
    public_view,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])

JD_MIN_CHARS = 200


@router.post("")
async def create_session(
    kind: str = Form(...),
    duration_minutes: int = Form(...),
    track: str | None = Form(None),
    experience: str | None = Form(None),
    company_kind: str | None = Form(None),
    job_description: str | None = Form(None),
    resume: UploadFile | None = File(None),
):
    if kind not in {"general", "resume"}:
        raise HTTPException(status_code=400, detail="Interview kind must be general or resume")
    if duration_minutes not in DURATIONS:
        raise HTTPException(status_code=400, detail="Duration must be 3, 5, 7, or 10 minutes")

    session = InterviewSession(id=new_id(), kind=kind, duration_minutes=duration_minutes)

    if kind == "general":
        if track not in TRACKS:
            raise HTTPException(status_code=400, detail="Track must be frontend, backend, or sde")
        if experience not in EXPERIENCE:
            raise HTTPException(status_code=400, detail="Experience must be 0-1, 1-3, 3-5, or 5+")
        if company_kind not in COMPANY_KINDS:
            raise HTTPException(status_code=400, detail="Company kind must be startup or mnc")
        session.track = track
        session.experience = experience
        session.company_kind = company_kind
    else:
        description = (job_description or "").strip()
        if len(description) < JD_MIN_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"Job description must be at least {JD_MIN_CHARS} characters",
            )
        if resume is None:
            raise HTTPException(status_code=400, detail="A resume file is required")
        parsed = await parse(resume)
        session.job_description = description
        session.resume_text = parsed["text"]

    create(session)
    return public_view(session)


@router.get("/{session_id}")
def read_session(session_id: str):
    session = get(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return public_view(session)
