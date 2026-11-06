from __future__ import annotations

from .session_store import InterviewSession, question_cap

TRACK_FOCUS = {
    "frontend": "This is a frontend engineering interview centered on React.",
    "backend": "This is a backend engineering interview.",
    "sde": "This is a general software engineering interview. Do not limit it to frontend or backend.",
}

RESUME_CHAR_LIMIT = 8000


def system_prompt(session: InterviewSession, purpose: str) -> str:
    cap = question_cap(session.duration_minutes)
    if session.kind == "general":
        situation = (
            f"{TRACK_FOCUS[session.track]}\n"
            f"Experience: {session.experience} years.\n"
            f"Company kind: {session.company_kind}."
        )
    else:
        resume = (session.resume_text or "")[:RESUME_CHAR_LIMIT]
        situation = (
            "This interview is based on the candidate's resume and the job description.\n"
            f"Job description:\n{session.job_description}\n\n"
            f"Resume:\n{resume}"
        )

    if purpose == "open":
        task = (
            "Introduce yourself in one short sentence as the interviewer, then ask the first question. "
            "Ask only one question."
        )
    elif purpose == "next":
        task = (
            f"The candidate just answered. You have asked {session.questions_asked} of {cap} questions. "
            "Acknowledge them in one short sentence, then ask the next question. Ask only one question."
        )
    else:
        task = (
            "The interview is over. Thank them in one or two short sentences. "
            "Do not ask another question."
        )

    return (
        "You are a spoken interviewer in a live voice interview.\n"
        f"{situation}\n"
        f"Duration: {session.duration_minutes} minutes. Ask at most {cap} questions.\n"
        "Speak plain English that can be read aloud. No markdown, lists, or symbols.\n"
        "Keep each turn to a few short sentences.\n"
        "If they leave the interview, bring them back.\n"
        f"{task}"
    )
