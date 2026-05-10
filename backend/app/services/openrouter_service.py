import json
from typing import Any

import httpx

from app.config import get_settings

_OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


def _ensure_allowed_model(model: str) -> None:
    lower = model.lower()
    if lower == "openrouter/auto" or lower.startswith("google/") or "gemini" in lower:
        raise ValueError(
            "Gemini/Google LLM models are disabled for this app. "
            "Choose a non-Google OpenRouter model."
        )


def _headers() -> dict[str, str]:
    settings = get_settings()
    if not settings.openrouter_api_key:
        raise ValueError("OPENROUTER_API_KEY is required for LLM features")

    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": settings.openrouter_site_url,
        "X-Title": settings.openrouter_app_name,
        "X-OpenRouter-Title": settings.openrouter_app_name,
    }


def _text_from_choice(data: dict[str, Any]) -> str:
    choices = data.get("choices") or []
    if not choices:
        return ""
    content = choices[0].get("message", {}).get("content", "")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "".join(
            str(part.get("text", ""))
            for part in content
            if isinstance(part, dict)
        ).strip()
    return str(content).strip()


async def openrouter_chat(
    system: str,
    user_message: str,
    *,
    max_tokens: int,
    temperature: float = 0.2,
    model: str | None = None,
    json_mode: bool = False,
) -> str:
    settings = get_settings()
    selected_model = model or settings.openrouter_model
    _ensure_allowed_model(selected_model)

    payload: dict[str, Any] = {
        "model": selected_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }
    # The prompt enforces JSON where needed. Avoid response_format here because
    # not every OpenRouter model/provider supports that parameter.

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(_OPENROUTER_URL, headers=_headers(), json=payload)

    if response.status_code >= 400:
        raise ValueError(f"OpenRouter request failed: {response.text[:500]}")

    return _text_from_choice(response.json())


async def openrouter_vision_json(
    prompt: str,
    data_url: str,
    *,
    max_tokens: int = 2500,
    temperature: float = 0.1,
    model: str | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    selected_model = model or settings.openrouter_vision_model
    _ensure_allowed_model(selected_model)

    payload: dict[str, Any] = {
        "model": selected_model,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            }
        ],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(_OPENROUTER_URL, headers=_headers(), json=payload)

    if response.status_code >= 400:
        raise ValueError(f"OpenRouter vision request failed: {response.text[:500]}")

    text = _text_from_choice(response.json())
    if text.startswith("```"):
        lines = text.splitlines()
        text = "\n".join(lines[1:-1]) if len(lines) > 2 else text
        if text.lower().startswith("json"):
            text = text[4:].strip()
    return json.loads(text)
