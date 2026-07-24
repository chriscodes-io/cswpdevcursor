"""Regression: Stripe checkout must resolve projects via Agiled in CRM mode."""

from __future__ import annotations

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

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
from backend.server import _resolve_project_for_payment  # noqa: E402


@pytest.mark.asyncio
async def test_resolve_project_for_payment_uses_agiled_when_configured():
    agiled_payload = {
        "data": {
            "id": 42,
            "name": "Site rebuild",
            "budget": 750,
            "status": "active",
        }
    }
    meta = {"client_id": "client-9", "type": "seo"}

    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.agiled_client.get_project",
        AsyncMock(return_value=agiled_payload),
    ) as get_project, patch(
        "backend.server.project_meta.get_meta", AsyncMock(return_value=meta)
    ):
        project = await _resolve_project_for_payment("42")

    get_project.assert_awaited_once_with("42")
    assert project["id"] == "42"
    assert project["budget"] == 750
    assert project["client_id"] == "client-9"
    assert project["name"] == "Site rebuild"


@pytest.mark.asyncio
async def test_resolve_project_for_payment_maps_agiled_404():
    with patch("backend.server._use_agiled_crm", return_value=True), patch(
        "backend.server.agiled_client.is_configured", return_value=True
    ), patch(
        "backend.server.agiled_client.get_project",
        AsyncMock(side_effect=AgiledError("missing", status_code=404)),
    ):
        with pytest.raises(HTTPException) as exc_info:
            await _resolve_project_for_payment("missing-id")

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Project not found"


@pytest.mark.asyncio
async def test_resolve_project_for_payment_falls_back_to_mongo_when_crm_off():
    mongo_project = {"id": "local-1", "name": "Local", "budget": 100.0}
    fake_db = MagicMock()
    fake_db.projects.find_one = AsyncMock(return_value=mongo_project)

    with patch("backend.server._use_agiled_crm", return_value=False), patch(
        "backend.server.agiled_client.is_configured", return_value=False
    ), patch("backend.server.db", fake_db), patch(
        "backend.server.agiled_client.get_project", AsyncMock()
    ) as get_project:
        project = await _resolve_project_for_payment("local-1")

    fake_db.projects.find_one.assert_awaited_once_with({"id": "local-1"}, {"_id": 0})
    get_project.assert_not_awaited()
    assert project == mongo_project
