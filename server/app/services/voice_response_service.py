import re
from app.services.ai_service import stream_ai_response
from app.services.tts_service import synthesize


SENTENCE_END_RE = re.compile(r"([.!?])\s+")


def split_ready_sentences(buffer: str, min_chars: int = 80):
    """returns a tuple: (sentences to speak, remaining buffer)"""
    sentences = re.split(r'(?<=[.!?])\s+', buffer)
    start = 0

    for match in SENTENCE_END_RE.finditer(buffer):
        end = match.end()
        candidate = buffer[start:end].strip()

        if len(candidate) >= min_chars:
            sentences.append(candidate)
            start = end

    return sentences, buffer[start:]


async def stream_voice_response(user_text: str):
    buffer = ""

    async for text in stream_ai_response(user_text):
        buffer += text

        ready, buffer = split_ready_sentences(buffer)

        for sentence in ready:
            audio_bytes = await synthesize(sentence)
            if audio_bytes:
                yield audio_bytes

    left = buffer.strip()
    if left:
        audio_bytes = await synthesize(left)
        if audio_bytes:
            yield audio_bytes