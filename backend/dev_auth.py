"""File-backed user store for local development when MongoDB is unavailable."""

from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from .auth import hash_password, verify_password

_DATA_DIR = Path(__file__).parent / "data"
_USERS_FILE = _DATA_DIR / "dev_users.json"


def _enabled() -> bool:
    return os.getenv("DEV_AUTH_FALLBACK", "true").lower() in ("1", "true", "yes")


def is_enabled() -> bool:
    return _enabled()


def _load_users() -> list[dict[str, Any]]:
    if not _USERS_FILE.exists():
        return []
    with _USERS_FILE.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, list) else []


def _save_users(users: list[dict[str, Any]]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _USERS_FILE.open("w", encoding="utf-8") as handle:
        json.dump(users, handle, indent=2)


def find_by_email(email: str) -> Optional[dict[str, Any]]:
    normalized = email.lower().strip()
    for user in _load_users():
        if user.get("email") == normalized:
            return user
    return None


def find_by_id(user_id: str) -> Optional[dict[str, Any]]:
    for user in _load_users():
        if user.get("id") == user_id:
            return user
    return None


def register_user(email: str, name: str, password: str) -> dict[str, Any]:
    if not _enabled():
        raise RuntimeError("DEV_AUTH_FALLBACK is disabled")

    normalized_email = email.lower().strip()
    users = _load_users()
    if any(user.get("email") == normalized_email for user in users):
        raise ValueError("Email already registered")

    user = {
        "id": str(uuid.uuid4()),
        "email": normalized_email,
        "name": name.strip(),
        "password_hash": hash_password(password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    users.append(user)
    _save_users(users)
    return user


def authenticate(email: str, password: str) -> Optional[dict[str, Any]]:
    user = find_by_email(email)
    if not user or not user.get("password_hash"):
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user


def update_password(email: str, new_password: str) -> bool:
    if not _enabled():
        return False

    normalized_email = email.lower().strip()
    users = _load_users()
    updated = False
    for index, user in enumerate(users):
        if user.get("email") == normalized_email:
            users[index]["password_hash"] = hash_password(new_password)
            updated = True
            break

    if updated:
        _save_users(users)
    return updated
