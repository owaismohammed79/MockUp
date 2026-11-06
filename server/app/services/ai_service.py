from app.config.config import groq_llm_client
from fastapi import HTTPException


async def stream_ai_response(system: str, history: list[dict]):
    try:
        completion = groq_llm_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[{"role": "system", "content": system}, *history],
            temperature=0.6,
            max_completion_tokens=300,
            top_p=1,
            stream=True,
            stop=None,
        )

        for chunk in completion:
            content = chunk.choices[0].delta.content or ""
            if content:
                yield content

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
