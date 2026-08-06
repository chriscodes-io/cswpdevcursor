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


async def invalidate_user_tokens(user_id: str, email: str) -> None:
    """Mark every unused reset token for this user as used (Mongo or dev file)."""
    normalized_email = email.lower().strip()

    if await ping_db():
        await db.password_reset_tokens.update_many(
            {
                "used": False,
                "$or": [{"user_id": user_id}, {"email": normalized_email}],
            },
            {"$set": {"used": True}},
        )
        return

    if dev_auth.is_enabled():
        tokens = _load_dev_tokens()
        changed = False
        for entry in tokens:
            if entry.get("used"):
                continue
            if entry.get("user_id") == user_id or entry.get("email") == normalized_email:
                entry["used"] = True
                changed = True
        if changed:
            _save_dev_tokens(tokens)


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
        # Invalidate prior unused tokens so only the newest link works.
        await db.password_reset_tokens.update_many(
            {
                "used": False,
                "$or": [{"user_id": user_id}, {"email": record["email"]}],
            },
            {"$set": {"used": True}},
        )
        mongo_record = {**record, "expires_at": expires_at}
        await db.password_reset_tokens.insert_one(mongo_record)
        return

    if dev_auth.is_enabled():
        tokens = [entry for entry in _load_dev_tokens() if entry.get("email") != record["email"]]
        tokens.append(record)
        _save_dev_tokens(tokens)
        return

    raise RuntimeError("No storage available for password reset tokens")


async def consume_reset_token(token: str) -> Optional[dict[str, str]]:
    token_hash = _hash_token(token)
    now = _now()

    if await ping_db():
        doc = await db.password_reset_tokens.find_one(
            {"token_hash": token_hash, "used": False},
            {"_id": 0},
        )
        if not doc:
            return None

        expires_at = datetime.fromisoformat(doc["expires_at"].replace("Z", "+00:00"))
        if expires_at < now:
            return None

        await db.password_reset_tokens.update_one(
            {"token_hash": token_hash},
            {"$set": {"used": True}},
        )
        return {"user_id": doc["user_id"], "email": doc["email"]}

    if dev_auth.is_enabled():
        tokens = _load_dev_tokens()
        for index, entry in enumerate(tokens):
            if entry.get("token_hash") != token_hash or entry.get("used"):
                continue

            expires_at = datetime.fromisoformat(entry["expires_at"].replace("Z", "+00:00"))
            if expires_at < now:
                return None

            tokens[index]["used"] = True
            _save_dev_tokens(tokens)
            return {"user_id": entry["user_id"], "email": entry["email"]}

    return None


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
