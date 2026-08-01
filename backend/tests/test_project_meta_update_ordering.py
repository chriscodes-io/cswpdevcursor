"""Regression: Agiled project updates must not persist local meta on failure.

When USE_AGILED_CRM is on, client_id/type live in project_meta (Mongo/file),
while name/status/budget live in Agiled. Saving meta *before* the Agiled write
meant a failed Agiled update still reassigned the project's client/type. The
edit UI showed an error, but later reads/filters already used the new linkage.

Run with:  python3 -m pytest backend/tests/test_project_meta_update_ordering.py -v
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

from backend.agiled_client import AgiledError  # noqa: E402
from backend.models import ProjectUpdate  # noqa: E402
from backend.server import update_project  # noqa: E402


@pytest.mark.asyncio
async def test_update_project_does_not_save_meta_when_agiled_fails():
    existing_meta = {"client_id": "client-a", "type": "seo"}
    save_meta = AsyncMock()

    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.project_meta.get_meta", AsyncMock(return_value=existing_meta)
    ), patch(
        "backend.server.project_meta.save_meta", save_meta
    ), patch(
        "backend.server.agiled_client.update_project",
        AsyncMock(side_effect=AgiledError("Agiled unavailable", status_code=503)),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await update_project(
                "42",
                ProjectUpdate(client_id="client-b", name="Renamed project"),
                current_user={"user_id": "staff-1", "email": "staff@example.com"},
            )

    assert exc_info.value.status_code == 503
    save_meta.assert_not_awaited()


@pytest.mark.asyncio
async def test_update_project_saves_meta_only_after_agiled_succeeds():
    existing_meta = {"client_id": "client-a", "type": "seo"}
    save_meta = AsyncMock()
    get_meta = AsyncMock(
        side_effect=[
            existing_meta,
            {"client_id": "client-b", "type": "seo"},
        ]
    )
    agiled_result = {
        "data": {
            "id": 42,
            "name": "Renamed project",
            "status": "active",
            "budget": 500,
        }
    }

    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.project_meta.get_meta", get_meta
    ), patch(
        "backend.server.project_meta.save_meta", save_meta
    ), patch(
        "backend.server.agiled_client.update_project",
        AsyncMock(return_value=agiled_result),
    ) as update_agiled:
        project = await update_project(
            "42",
            ProjectUpdate(client_id="client-b", name="Renamed project"),
            current_user={"user_id": "staff-1", "email": "staff@example.com"},
        )

    update_agiled.assert_awaited_once()
    save_meta.assert_awaited_once_with("42", "client-b", "seo")
    assert project.id == "42"
    assert project.client_id == "client-b"
    assert project.name == "Renamed project"


@pytest.mark.asyncio
async def test_update_project_meta_only_still_requires_agiled_read_ok():
    """Meta-only edits call get_project; a failed read must not write meta."""
    existing_meta = {"client_id": "client-a", "type": "seo"}
    save_meta = AsyncMock()

    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.project_meta.get_meta", AsyncMock(return_value=existing_meta)
    ), patch(
        "backend.server.project_meta.save_meta", save_meta
    ), patch(
        "backend.server.agiled_client.get_project",
        AsyncMock(side_effect=AgiledError("not found", status_code=404)),
    ), patch(
        "backend.server.agiled_client.update_project", AsyncMock()
    ) as update_agiled:
        with pytest.raises(HTTPException) as exc_info:
            await update_project(
                "missing",
                ProjectUpdate(client_id="client-b"),
                current_user={"user_id": "staff-1", "email": "staff@example.com"},
            )

    assert exc_info.value.status_code == 404
    update_agiled.assert_not_awaited()
    save_meta.assert_not_awaited()
