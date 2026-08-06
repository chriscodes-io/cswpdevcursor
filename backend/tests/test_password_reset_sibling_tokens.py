"""Regression: Mongo password-reset must invalidate sibling tokens.

Dev file fallback already replaces prior tokens per email. Mongo only
inserted new rows, so older unused reset links stayed valid after a newer
request — and after a successful reset — enabling account takeover.

Run with:  python3 -m pytest backend/tests/test_password_reset_sibling_tokens.py -v
"""

from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/")
os.environ.setdefault("DB_NAME", "seo_project_manager_test")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DEV_AUTH_FALLBACK", "true")

from backend import password_reset  # noqa: E402
from backend.models import ResetPasswordRequest  # noqa: E402
from backend.server import reset_password  # noqa: E402


class FakeResetTokenCollection:
    def __init__(self, records):
        self.records = [dict(r) for r in records]
        self.inserts = []
        self.update_many_calls = []

    async def find_one(self, filter_query, projection=None):
        for record in self.records:
            if record.get("token_hash") != filter_query.get("token_hash"):
                continue
            if "used" in filter_query and record.get("used") != filter_query.get("used"):
                continue
            doc = dict(record)
            if projection and projection.get("_id") == 0:
                doc.pop("_id", None)
            return doc
        return None

    async def update_one(self, filter_query, update):
        for record in self.records:
            if record.get("token_hash") != filter_query.get("token_hash"):
                continue
            if "used" in filter_query and record.get("used") != filter_query.get("used"):
                continue
            record.update(update["$set"])
            return SimpleNamespace(modified_count=1, matched_count=1)
        return SimpleNamespace(modified_count=0, matched_count=0)

    async def update_many(self, filter_query, update):
        self.update_many_calls.append({"filter": filter_query, "update": update})
        matched = 0
        or_clauses = filter_query.get("$or") or []
        for record in self.records:
            if filter_query.get("used") is not None and record.get("used") != filter_query.get("used"):
                continue
            if or_clauses:
                hit = False
                for clause in or_clauses:
                    if all(record.get(k) == v for k, v in clause.items()):
                        hit = True
                        break
                if not hit:
                    continue
            record.update(update["$set"])
            matched += 1
        return SimpleNamespace(modified_count=matched, matched_count=matched)

    async def insert_one(self, doc):
        self.inserts.append(doc)
        self.records.append(dict(doc))
        return SimpleNamespace(inserted_id="new")


@pytest.mark.asyncio
async def test_save_reset_token_invalidates_prior_mongo_tokens(monkeypatch):
    old_hash = password_reset._hash_token("old-token")
    collection = FakeResetTokenCollection(
        [
            {
                "token_hash": old_hash,
                "user_id": "user-1",
                "email": "staff@example.com",
                "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
                "used": False,
            }
        ]
    )

    monkeypatch.setattr(password_reset, "ping_db", AsyncMock(return_value=True))
    monkeypatch.setattr(
        password_reset,
        "db",
        SimpleNamespace(password_reset_tokens=collection),
    )

    await password_reset.save_reset_token("user-1", "staff@example.com", "new-token")

    assert collection.records[0]["used"] is True
    assert len(collection.inserts) == 1
    assert collection.inserts[0]["token_hash"] == password_reset._hash_token("new-token")
    assert collection.inserts[0]["used"] is False


@pytest.mark.asyncio
async def test_successful_reset_invalidates_sibling_tokens(monkeypatch):
    token_a = "token-a-used-for-reset"
    token_b = "token-b-sibling-attacker"
    expires_iso = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    collection = FakeResetTokenCollection(
        [
            {
                "token_hash": password_reset._hash_token(token_a),
                "user_id": "user-1",
                "email": "staff@example.com",
                "expires_at": expires_iso,
                "used": False,
            },
            {
                "token_hash": password_reset._hash_token(token_b),
                "user_id": "user-1",
                "email": "staff@example.com",
                "expires_at": expires_iso,
                "used": False,
            },
        ]
    )

    monkeypatch.setattr(password_reset, "ping_db", AsyncMock(return_value=True))
    monkeypatch.setattr(
        password_reset,
        "db",
        SimpleNamespace(password_reset_tokens=collection, users=SimpleNamespace()),
    )
    monkeypatch.setattr(password_reset, "update_user_password", AsyncMock(return_value=True))

    result = await reset_password(
        ResetPasswordRequest(token=token_a, password="brand-new-secret")
    )
    assert "Password updated" in result["message"]

    # Primary token consumed; sibling burned by invalidate_user_tokens.
    by_hash = {r["token_hash"]: r for r in collection.records}
    assert by_hash[password_reset._hash_token(token_a)]["used"] is True
    assert by_hash[password_reset._hash_token(token_b)]["used"] is True

    # Sibling must no longer be consumable.
    assert await password_reset.consume_reset_token(token_b) is None
