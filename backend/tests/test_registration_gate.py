import os
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "cswp-test")

from backend import server
from backend.models import UserCreate


class FakeUsers:
    def __init__(self, docs=None):
        self.docs = list(docs or [])

    async def find_one(self, query, projection=None):
        if "email" in query:
            return next((doc for doc in self.docs if doc["email"] == query["email"]), None)
        return self.docs[0] if self.docs else None

    async def insert_one(self, doc):
        self.docs.append(doc)
        return SimpleNamespace(inserted_id=doc["id"])


class FakeRegistrationLocks:
    def __init__(self):
        self.docs = {}

    async def insert_one(self, doc):
        self.docs[doc["_id"]] = doc
        return SimpleNamespace(inserted_id=doc["_id"])


@pytest.mark.asyncio
async def test_registration_bootstraps_first_user(monkeypatch):
    users = FakeUsers()
    monkeypatch.delenv("ALLOW_PUBLIC_REGISTRATION", raising=False)
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users, registration_locks=FakeRegistrationLocks()))

    token = await server.register(
        UserCreate(email="first@example.com", name="First User", password="secret123")
    )

    assert token.user["email"] == "first@example.com"
    assert users.docs[0]["email"] == "first@example.com"


@pytest.mark.asyncio
async def test_registration_closes_after_first_user(monkeypatch):
    users = FakeUsers([{"id": "existing", "email": "owner@example.com"}])
    monkeypatch.delenv("ALLOW_PUBLIC_REGISTRATION", raising=False)
    monkeypatch.setattr(server, "db", SimpleNamespace(users=users, registration_locks=FakeRegistrationLocks()))

    with pytest.raises(HTTPException) as exc:
        await server.register(
            UserCreate(email="second@example.com", name="Second User", password="secret123")
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Registration is closed"
