"""Regression: password reset must not burn tokens before a successful write."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from backend import password_reset
from backend.auth import hash_password, verify_password
from backend.models import ResetPasswordRequest, UserCreate
from backend.server import reset_password


class FakeResetTokenCollection:
    def __init__(self, record):
        self.record = record
        self.update_calls = []

    async def find_one(self, filter_query, projection=None):
        if (
            self.record.get("token_hash") == filter_query.get("token_hash")
            and self.record.get("used") == filter_query.get("used")
        ):
            doc = dict(self.record)
            if projection and projection.get("_id") == 0:
                doc.pop("_id", None)
            return doc
        return None

    async def update_one(self, filter_query, update):
        self.update_calls.append({"filter": filter_query, "update": update})
        matches = (
            self.record.get("token_hash") == filter_query.get("token_hash")
            and self.record.get("used") == filter_query.get("used")
        )
        if not matches:
            return SimpleNamespace(modified_count=0, matched_count=0)
        self.record.update(update["$set"])
        return SimpleNamespace(modified_count=1, matched_count=1)


@pytest.mark.asyncio
async def test_failed_password_update_does_not_consume_token(monkeypatch):
    token = "reset-token-keep-alive"
    collection = FakeResetTokenCollection(
        {
            "_id": "mongo-id",
            "token_hash": password_reset._hash_token(token),
            "user_id": "missing-user",
            "email": "staff@example.com",
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
            "used": False,
        }
    )

    async def ping_ok():
        return True

    monkeypatch.setattr(password_reset, "ping_db", ping_ok)
    monkeypatch.setattr(
        password_reset,
        "db",
        SimpleNamespace(password_reset_tokens=collection, users=SimpleNamespace()),
    )

    async def update_fails(user_id, email, new_password):
        return False

    monkeypatch.setattr(password_reset, "update_user_password", update_fails)

    with pytest.raises(HTTPException) as exc:
        await reset_password(ResetPasswordRequest(token=token, password="new-secret"))

    assert exc.value.status_code == 404
    assert collection.record["used"] is False
    assert collection.update_calls == []


@pytest.mark.asyncio
async def test_successful_password_update_marks_token_used(monkeypatch):
    token = "reset-token-success"
    collection = FakeResetTokenCollection(
        {
            "_id": "mongo-id",
            "token_hash": password_reset._hash_token(token),
            "user_id": "user-123",
            "email": "staff@example.com",
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
            "used": False,
        }
    )

    async def ping_ok():
        return True

    monkeypatch.setattr(password_reset, "ping_db", ping_ok)
    monkeypatch.setattr(
        password_reset,
        "db",
        SimpleNamespace(password_reset_tokens=collection),
    )

    update_mock = AsyncMock(return_value=True)
    monkeypatch.setattr(password_reset, "update_user_password", update_mock)

    result = await reset_password(
        ResetPasswordRequest(token=token, password="new-secret")
    )

    assert result["message"].startswith("Password updated successfully")
    assert update_mock.await_count == 1
    assert collection.record["used"] is True
    assert collection.update_calls[0]["filter"] == {
        "token_hash": password_reset._hash_token(token),
        "used": False,
    }


@pytest.mark.asyncio
async def test_mongo_bson_datetime_expiry_is_accepted(monkeypatch):
    token = "reset-token-bson"
    collection = FakeResetTokenCollection(
        {
            "token_hash": password_reset._hash_token(token),
            "user_id": "user-123",
            "email": "staff@example.com",
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
            "used": False,
        }
    )

    async def ping_ok():
        return True

    monkeypatch.setattr(password_reset, "ping_db", ping_ok)
    monkeypatch.setattr(
        password_reset,
        "db",
        SimpleNamespace(password_reset_tokens=collection),
    )

    context = await password_reset.get_reset_token_context(token)
    assert context == {"user_id": "user-123", "email": "staff@example.com"}
    assert collection.record["used"] is False


def test_password_longer_than_bcrypt_limit_rejected_by_models():
    long_password = "a" * 73
    with pytest.raises(ValidationError):
        UserCreate(email="a@example.com", name="Staff", password=long_password)
    with pytest.raises(ValidationError):
        ResetPasswordRequest(token="t", password=long_password)


def test_hash_password_refuses_silent_bcrypt_truncation():
    long_password = "a" * 80
    with pytest.raises(ValueError, match="72 bytes"):
        hash_password(long_password)
    assert verify_password(long_password, hash_password("short-ok")) is False
