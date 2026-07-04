from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest

from backend import password_reset


@pytest.mark.asyncio
async def test_consume_reset_token_accepts_mongo_datetime(monkeypatch):
    token = "valid-reset-token"
    token_hash = password_reset._hash_token(token)
    update_calls = []

    class FakeResetTokenCollection:
        async def find_one(self, query, projection):
            assert query == {"token_hash": token_hash, "used": False}
            assert projection == {"_id": 0}
            return {
                "token_hash": token_hash,
                "user_id": "user-123",
                "email": "staff@example.com",
                "expires_at": datetime.now(timezone.utc) + timedelta(minutes=5),
                "used": False,
            }

        async def update_one(self, query, update):
            update_calls.append((query, update))

    async def ping_true():
        return True

    monkeypatch.setattr(password_reset, "ping_db", ping_true)
    monkeypatch.setattr(
        password_reset,
        "db",
        SimpleNamespace(password_reset_tokens=FakeResetTokenCollection()),
    )

    context = await password_reset.consume_reset_token(token)

    assert context == {"user_id": "user-123", "email": "staff@example.com"}
    assert update_calls == [
        ({"token_hash": token_hash}, {"$set": {"used": True}}),
    ]

