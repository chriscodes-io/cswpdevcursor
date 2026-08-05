"""Regression tests for Agiled CRM data-integrity bugs on main.

1. project_meta must not silently write to ephemeral files in production when
   Mongo is down (JWT auth still works; file meta is lost on dyno restart).
2. client_create_to_contact must forward status so inactive/archived sticks.
3. GET /projects?client_id= must resolve via meta IDs, not post-filter one Agiled page.

Run with:  python3 -m pytest backend/tests/test_agiled_crm_data_integrity.py -v
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017/")
os.environ.setdefault("DB_NAME", "seo_project_manager_test")
os.environ.setdefault("JWT_SECRET", "test-secret")
os.environ.setdefault("DEV_AUTH_FALLBACK", "true")
os.environ.setdefault("USE_AGILED_CRM", "true")

from backend.agiled_client import client_create_to_contact  # noqa: E402
from backend import project_meta  # noqa: E402
from backend.server import get_projects  # noqa: E402


# ---------- project_meta fail-closed ----------


@pytest.mark.asyncio
async def test_save_meta_raises_when_mongo_down_and_dev_auth_disabled(monkeypatch, tmp_path):
    monkeypatch.setenv("DEV_AUTH_FALLBACK", "false")
    monkeypatch.setattr(project_meta, "_META_FILE", tmp_path / "project_meta.json")

    with patch("backend.project_meta.ping_db", AsyncMock(return_value=False)):
        with pytest.raises(RuntimeError, match="MongoDB unavailable"):
            await project_meta.save_meta("proj-1", "client-a", "seo")

    assert not (tmp_path / "project_meta.json").exists()


@pytest.mark.asyncio
async def test_save_meta_file_fallback_when_dev_auth_enabled(monkeypatch, tmp_path):
    monkeypatch.setenv("DEV_AUTH_FALLBACK", "true")
    monkeypatch.setattr(project_meta, "_META_FILE", tmp_path / "project_meta.json")

    with patch("backend.project_meta.ping_db", AsyncMock(return_value=False)):
        await project_meta.save_meta("proj-1", "client-a", "seo")
        meta = await project_meta.get_meta("proj-1")

    assert meta == {"client_id": "client-a", "type": "seo"}


@pytest.mark.asyncio
async def test_get_meta_map_raises_when_mongo_down_in_production(monkeypatch):
    monkeypatch.setenv("DEV_AUTH_FALLBACK", "false")

    with patch("backend.project_meta.ping_db", AsyncMock(return_value=False)):
        with pytest.raises(RuntimeError, match="MongoDB unavailable"):
            await project_meta.get_meta_map(["proj-1"])


# ---------- client status mapping ----------


def test_client_create_to_contact_maps_inactive_status():
    payload = client_create_to_contact(
        {
            "name": "Ada Lovelace",
            "email": "ada@example.com",
            "status": "inactive",
        }
    )
    assert payload["status"] == "inactive"
    assert payload["first_name"] == "Ada"
    assert payload["last_name"] == "Lovelace"
    assert payload["email"] == "ada@example.com"


def test_client_create_to_contact_maps_archived_to_inactive():
    payload = client_create_to_contact({"name": "Test", "status": "archived"})
    assert payload["status"] == "inactive"


def test_client_create_to_contact_maps_active_status():
    payload = client_create_to_contact({"name": "Test", "status": "active"})
    assert payload["status"] == "active"


def test_client_create_to_contact_status_only_update():
    """Status-only PUT must not produce an empty Agiled PATCH body."""
    payload = client_create_to_contact({"status": "inactive"})
    assert payload == {"status": "inactive"}


# ---------- client_id filter via meta ----------


@pytest.mark.asyncio
async def test_get_projects_client_id_uses_meta_ids_not_agiled_page_filter():
    """Projects linked in meta must be returned even if absent from Agiled page 1."""
    list_projects = AsyncMock()
    get_project = AsyncMock(
        return_value={
            "data": {
                "id": "99",
                "name": "Client-only project",
                "status": "active",
            }
        }
    )

    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.project_meta.list_ids_for_client",
        AsyncMock(return_value=["99"]),
    ), patch(
        "backend.server.project_meta.get_meta_map",
        AsyncMock(return_value={"99": {"client_id": "client-x", "type": "seo"}}),
    ), patch(
        "backend.server.agiled_client.list_projects", list_projects
    ), patch(
        "backend.server.agiled_client.get_project", get_project
    ):
        projects = await get_projects(
            client_id="client-x",
            skip=0,
            limit=100,
            current_user={"user_id": "staff-1", "email": "staff@example.com"},
        )

    list_projects.assert_not_awaited()
    get_project.assert_awaited_once_with("99")
    assert len(projects) == 1
    assert projects[0].id == "99"
    assert projects[0].client_id == "client-x"


@pytest.mark.asyncio
async def test_get_projects_client_id_meta_unavailable_returns_503():
    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.project_meta.list_ids_for_client",
        AsyncMock(side_effect=RuntimeError("MongoDB unavailable for project_meta")),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await get_projects(
                client_id="client-x",
                skip=0,
                limit=100,
                current_user={"user_id": "staff-1", "email": "staff@example.com"},
            )

    assert exc_info.value.status_code == 503
