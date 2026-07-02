"""Focused tests for password reset token consumption."""

from datetime import datetime, timedelta
import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend import password_reset  # noqa: E402


class _FakePasswordResetTokens:
    def __init__(self, doc):
        self.doc = doc
        self.update = None

    async def find_one(self, query, projection):
        if (
            query.get("token_hash") == self.doc.get("token_hash")
            and query.get("used") == self.doc.get("used")
        ):
            return self.doc
        return None

    async def update_one(self, query, update):
        self.update = {"query": query, "update": update}


class _FakeDb:
    def __init__(self, doc):
        self.password_reset_tokens = _FakePasswordResetTokens(doc)


@pytest.mark.asyncio
async def test_consume_reset_token_accepts_mongo_datetime_expires_at(monkeypatch):
    token = "reset-token"
    doc = {
        "token_hash": password_reset._hash_token(token),
        "user_id": "user-123",
        "email": "staff@example.com",
        "expires_at": datetime.utcnow() + timedelta(minutes=15),
        "used": False,
    }
    fake_db = _FakeDb(doc)

    async def ping_true():
        return True

    monkeypatch.setattr(password_reset, "ping_db", ping_true)
    monkeypatch.setattr(password_reset, "db", fake_db)

    result = await password_reset.consume_reset_token(token)

    assert result == {"user_id": "user-123", "email": "staff@example.com"}
    assert fake_db.password_reset_tokens.update == {
        "query": {"token_hash": doc["token_hash"]},
        "update": {"$set": {"used": True}},
    }
