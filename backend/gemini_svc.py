"""Gemini helpers: text chat (Gemini 3 Flash) and image generation (Nano Banana).

Uses emergentintegrations LlmChat with the universal EMERGENT_LLM_KEY.
"""
from __future__ import annotations

import base64
import logging
import os
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

log = logging.getLogger("gemini_svc")

EMERGENT_KEY_ENV = "EMERGENT_LLM_KEY"

GEMINI_TEXT_MODEL = "gemini-3-flash-preview"
GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview"  # Nano Banana


def _key() -> str:
    k = os.environ.get(EMERGENT_KEY_ENV, "").strip()
    if not k:
        raise RuntimeError("EMERGENT_LLM_KEY not set")
    return k


async def gemini_text(prompt: str, system: str = "You are a helpful assistant.", session_id: str | None = None) -> str:
    """One-shot text generation with Gemini 3 Flash. Returns the assembled text."""
    chat = LlmChat(
        api_key=_key(),
        session_id=session_id or f"gem-{uuid.uuid4().hex[:8]}",
        system_message=system,
    ).with_model("gemini", GEMINI_TEXT_MODEL)
    buf: list[str] = []
    async for ev in chat.stream_message(UserMessage(text=prompt)):
        if isinstance(ev, TextDelta):
            buf.append(ev.content)
        elif isinstance(ev, StreamDone):
            break
    return "".join(buf).strip()


async def gemini_generate_image(prompt: str, session_id: str | None = None) -> tuple[bytes, str]:
    """Generate an image via Nano Banana. Returns (image_bytes, mime_type).

    Raises RuntimeError if the model returns no image (e.g., safety filter).
    """
    chat = LlmChat(
        api_key=_key(),
        session_id=session_id or f"nb-{uuid.uuid4().hex[:8]}",
        system_message="You generate a single photorealistic image based on the user's prompt.",
    ).with_model("gemini", GEMINI_IMAGE_MODEL).with_params(modalities=["image", "text"])

    _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
    if not images:
        raise RuntimeError("Nano Banana returned no image (possibly blocked by safety filter)")
    img = images[0]
    image_bytes = base64.b64decode(img["data"])
    mime = img.get("mime_type", "image/png")
    return image_bytes, mime
