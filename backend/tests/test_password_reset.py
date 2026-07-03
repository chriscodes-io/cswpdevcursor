from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from pymongo import ReturnDocument

from backend import password_reset


class FakeResetTokenCollection:
    def __init__(self, record):
        self.record = record
        self.calls = []

    async def find_one_and_update(
        self,
        filter_query,
        update,
        projection=None,
        return_document=None,
    ):
        self.calls.append(
            {
                "filter": filter_query,
                "update": update,
                "projection": projection,
                "return_document": return_document,
            }
        )

        expires_after = filter_query["expires_at"]["$gte"]
        matches = (
            self.record["token_hash"] == filter_query["token_hash"]
            and self.record["used"] == filter_query["used"]
            and self.record["expires_at"] >= expires_after
        )
        if not matches:
            return None

        original = dict(self.record)
        self.record.update(update["$set"])
        if projection and projection.get("_id") == 0:
            original.pop("_id", None)
        return original


@pytest.mark.asyncio
async def test_mongo_reset_token_is_consumed_atomically_once(monkeypatch):
    token = "valid-reset-token"
    collection = FakeResetTokenCollection(
        {
            "_id": "mongo-id",
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

    first = await password_reset.consume_reset_token(token)
    second = await password_reset.consume_reset_token(token)

    assert first == {"user_id": "user-123", "email": "staff@example.com"}
    assert second is None
    assert collection.record["used"] is True

    first_call = collection.calls[0]
    assert first_call["filter"]["used"] is False
    assert "$gte" in first_call["filter"]["expires_at"]
    assert first_call["update"] == {"$set": {"used": True}}
    assert first_call["projection"] == {"_id": 0}
    assert first_call["return_document"] == ReturnDocument.BEFORE
