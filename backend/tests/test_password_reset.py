from datetime import datetime, timedelta, timezone

import pytest

from backend import password_reset


class _FakeResetTokens:
    def __init__(self, doc):
        self.doc = doc
        self.updated = False

    async def find_one(self, query, projection):
        if query["token_hash"] != self.doc["token_hash"] or query["used"] is not False:
            return None
        return self.doc

    async def update_one(self, query, update):
        assert query == {"token_hash": self.doc["token_hash"]}
        assert update == {"$set": {"used": True}}
        self.updated = True


class _FakeDB:
    def __init__(self, doc):
        self.password_reset_tokens = _FakeResetTokens(doc)


@pytest.mark.asyncio
async def test_consume_mongo_reset_token_accepts_datetime_expiry(monkeypatch):
    token = "reset-token"
    doc = {
        "token_hash": password_reset._hash_token(token),
        "user_id": "user-1",
        "email": "user@example.com",
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
        "used": False,
    }
    fake_db = _FakeDB(doc)

    async def fake_ping_db():
        return True

    monkeypatch.setattr(password_reset, "ping_db", fake_ping_db)
    monkeypatch.setattr(password_reset, "db", fake_db)

    context = await password_reset.consume_reset_token(token)

    assert context == {"user_id": "user-1", "email": "user@example.com"}
    assert fake_db.password_reset_tokens.updated is True
