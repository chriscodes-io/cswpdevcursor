from datetime import datetime, timedelta, timezone

import pytest

from backend import password_reset


class _FakeResetTokenCollection:
    def __init__(self, doc):
        self.doc = doc
        self.updated = False

    async def find_one(self, query, projection):
        if (
            query == {"token_hash": self.doc["token_hash"], "used": False}
            and projection == {"_id": 0}
        ):
            return self.doc
        return None

    async def update_one(self, query, update):
        if query == {"token_hash": self.doc["token_hash"]} and update == {"$set": {"used": True}}:
            self.updated = True


class _FakeDb:
    def __init__(self, doc):
        self.password_reset_tokens = _FakeResetTokenCollection(doc)


@pytest.mark.asyncio
async def test_consume_reset_token_accepts_mongo_datetime_expiry(monkeypatch):
    token = "reset-token"
    doc = {
        "token_hash": password_reset._hash_token(token),
        "user_id": "user-1",
        "email": "user@example.com",
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "used": False,
    }
    fake_db = _FakeDb(doc)

    async def _ping_db():
        return True

    monkeypatch.setattr(password_reset, "ping_db", _ping_db)
    monkeypatch.setattr(password_reset, "db", fake_db)

    result = await password_reset.consume_reset_token(token)

    assert result == {"user_id": "user-1", "email": "user@example.com"}
    assert fake_db.password_reset_tokens.updated is True
