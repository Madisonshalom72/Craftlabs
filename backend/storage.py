"""Emergent Object Storage helpers.

Wraps the /objstore/api/v1/storage endpoints with an app-level path prefix
and a cached storage_key. All paths are relative (no leading slash).
"""
from __future__ import annotations

import logging
import os

import requests

log = logging.getLogger("storage")

APP_NAME = "craftpulse"
_STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = _STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"

_storage_key: str | None = None


def _emergent_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY", "").strip()
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY not set")
    return key


def init_storage(force: bool = False) -> str:
    """Return a session-scoped storage key. Call at startup; retry with force=True on 404."""
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    resp = requests.post(
        f"{STORAGE_URL}/init",
        json={"emergent_key": _emergent_key()},
        timeout=30,
    )
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    log.info("storage: initialized key ***%s", _storage_key[-6:])
    return _storage_key


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """Upload bytes. Returns {'path','size','etag'}."""
    key = init_storage()
    try:
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=180,
        )
        if resp.status_code == 404:
            key = init_storage(force=True)
            resp = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                data=data,
                timeout=180,
            )
        resp.raise_for_status()
    except requests.HTTPError as exc:
        log.error("storage put failed path=%s status=%s body=%s",
                  path, exc.response.status_code, exc.response.text[:200])
        raise
    return resp.json()


def get_object(path: str) -> tuple[bytes, str]:
    """Download bytes. Returns (content, content_type)."""
    key = init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=90,
    )
    if resp.status_code == 404 and _storage_key:
        key = init_storage(force=True)
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=90,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


MIME_BY_EXT = {
    "jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png",
    "gif": "image/gif", "webp": "image/webp",
    "pdf": "application/pdf",
}


def build_path(kind: str, user_id: str, filename_uuid: str, ext: str) -> str:
    """kind: portfolio|job|license|blog|generic  →  craftpulse/{kind}/{user}/{uuid}.{ext}"""
    ext = (ext or "bin").lower().lstrip(".")
    return f"{APP_NAME}/{kind}/{user_id}/{filename_uuid}.{ext}"
