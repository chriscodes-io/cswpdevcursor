"""Regression: audit-ready email must resolve clients via Agiled + project_meta.

Production defaults USE_AGILED_CRM=true. Projects/clients are not in Mongo
db.projects / db.clients — client_id is in project_meta and contacts are in
Agiled. Looking only at Mongo silently skips every audit-ready email.

Run with:  python3 -m pytest backend/tests/test_audit_ready_agiled_recipient.py -v
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/")
os.environ.setdefault("DB_NAME", "seo_project_manager_test")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DEV_AUTH_FALLBACK", "true")
os.environ.setdefault("USE_AGILED_CRM", "true")
os.environ.setdefault("AGILED_API_KEY", "test-agiled-key")

from backend.server import _resolve_audit_client_recipient  # noqa: E402
from backend import agiled_client  # noqa: E402


@pytest.mark.asyncio
async def test_resolve_recipient_via_agiled_meta(monkeypatch):
    monkeypatch.setenv("USE_AGILED_CRM", "true")
    monkeypatch.setattr(agiled_client, "AGILED_API_KEY", "test-key")

    with patch(
        "backend.server.project_meta.get_meta",
        AsyncMock(return_value={"client_id": "42", "type": "seo"}),
    ), patch(
        "backend.server.agiled_client.get_contact",
        AsyncMock(
            return_value={
                "data": {
                    "id": 42,
                    "first_name": "Ada",
                    "last_name": "Lovelace",
                    "email": "ada@example.com",
                    "status": "active",
                }
            }
        ),
    ):
        recipient = await _resolve_audit_client_recipient("proj-99")

    assert recipient == {"name": "Ada Lovelace", "email": "ada@example.com"}


@pytest.mark.asyncio
async def test_resolve_recipient_skips_when_meta_missing_client(monkeypatch):
    monkeypatch.setenv("USE_AGILED_CRM", "true")
    monkeypatch.setattr(agiled_client, "AGILED_API_KEY", "test-key")

    with patch(
        "backend.server.project_meta.get_meta",
        AsyncMock(return_value={"client_id": "", "type": "seo"}),
    ), patch(
        "backend.server.agiled_client.get_contact",
        AsyncMock(),
    ) as get_contact:
        recipient = await _resolve_audit_client_recipient("proj-99")

    assert recipient is None
    get_contact.assert_not_awaited()


@pytest.mark.asyncio
async def test_resolve_recipient_mongo_fallback_when_agiled_disabled(monkeypatch):
    from types import SimpleNamespace

    monkeypatch.setenv("USE_AGILED_CRM", "false")

    project_doc = {"id": "proj-1", "client_id": "client-1"}
    client_doc = {"id": "client-1", "name": "Mongo Client", "email": "mongo@example.com"}

    projects = AsyncMock()
    projects.find_one = AsyncMock(return_value=project_doc)
    clients = AsyncMock()
    clients.find_one = AsyncMock(return_value=client_doc)

    with patch(
        "backend.server.db",
        SimpleNamespace(projects=projects, clients=clients),
    ):
        recipient = await _resolve_audit_client_recipient("proj-1")

    assert recipient == {"name": "Mongo Client", "email": "mongo@example.com"}
    projects.find_one.assert_awaited_once()
    clients.find_one.assert_awaited_once()
