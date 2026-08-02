"""Password reset token storage and validation (MongoDB or dev file fallback)."""

from __future__ import annotations

import hashlib
import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional

from . import dev_auth
from .auth import hash_password
from .db import db, ping_db

_DATA_DIR = Path(__file__).parent / "data"
_TOKENS_FILE = _DATA_DIR / "dev_reset_tokens.json"
_TOKEN_TTL_HOURS = int(os.getenv("PASSWORD_RESET_TTL_HOURS", "1"))


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generate_token() -> str:
    return secrets.token_urlsafe(32)


def _load_dev_tokens() -> list[dict[str, Any]]:
    if not _TOKENS_FILE.exists():
        return []
    with _TOKENS_FILE.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, list) else []


def _save_dev_tokens(tokens: list[dict[str, Any]]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _TOKENS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(tokens, handle, indent=2)


async def save_reset_token(user_id: str, email: str, token: str) -> None:
    token_hash = _hash_token(token)
    expires_at = _now() + timedelta(hours=_TOKEN_TTL_HOURS)
    record = {
        "token_hash": token_hash,
        "user_id": user_id,
        "email": email.lower().strip(),
        "expires_at": expires_at.isoformat(),
        "used": False,
    }

    if await ping_db():
        mongo_record = {**record, "expires_at": expires_at}
        await db.password_reset_tokens.insert_one(mongo_record)
        return

    if dev_auth.is_enabled():
        tokens = [entry for entry in _load_dev_tokens() if entry.get("email") != record["email"]]
        tokens.append(record)
        _save_dev_tokens(tokens)
        return

    raise RuntimeError("No storage available for password reset tokens")


def _parse_expires_at(value: Any) -> Optional[datetime]:
    """Normalize Mongo BSON datetimes and ISO strings to aware UTC datetimes."""
    if value is None:
        return None
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


async def get_reset_token_context(token: str) -> Optional[dict[str, str]]:
    """Return user context for a valid unused token without consuming it."""
    token_hash = _hash_token(token)
    now = _now()

    if await ping_db():
        doc = await db.password_reset_tokens.find_one(
            {"token_hash": token_hash, "used": False},
            {"_id": 0},
        )
        if not doc:
            return None

        expires_at = _parse_expires_at(doc.get("expires_at"))
        if expires_at is None or expires_at < now:
            return None

        return {"user_id": doc["user_id"], "email": doc["email"]}

    if dev_auth.is_enabled():
        for entry in _load_dev_tokens():
            if entry.get("token_hash") != token_hash or entry.get("used"):
                continue

            expires_at = _parse_expires_at(entry.get("expires_at"))
            if expires_at is None or expires_at < now:
                return None

            return {"user_id": entry["user_id"], "email": entry["email"]}

    return None


async def mark_reset_token_used(token: str) -> bool:
    """Mark a reset token used. Returns True when this call consumed it."""
    token_hash = _hash_token(token)

    if await ping_db():
        result = await db.password_reset_tokens.update_one(
            {"token_hash": token_hash, "used": False},
            {"$set": {"used": True}},
        )
        return result.modified_count > 0

    if dev_auth.is_enabled():
        tokens = _load_dev_tokens()
        for index, entry in enumerate(tokens):
            if entry.get("token_hash") != token_hash or entry.get("used"):
                continue
            tokens[index]["used"] = True
            _save_dev_tokens(tokens)
            return True

    return False


async def consume_reset_token(token: str) -> Optional[dict[str, str]]:
    """Validate and mark a reset token used in one step (legacy helper)."""
    context = await get_reset_token_context(token)
    if not context:
        return None
    await mark_reset_token_used(token)
    return context


async def update_user_password(user_id: str, email: str, new_password: str) -> bool:
    password_hash = hash_password(new_password)

    if await ping_db():
        result = await db.users.update_one(
            {"id": user_id},
            {"$set": {"password_hash": password_hash}},
        )
        return result.matched_count > 0

    if dev_auth.is_enabled():
        return dev_auth.update_password(email, new_password)

    return False
