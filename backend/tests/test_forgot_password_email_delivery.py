"""Forgot-password must not claim success when the reset email was not delivered.

Staff-only production auth has no self-serve registration path. A silent
"check your inbox" response after a failed/missing Resend send leaves the
operator locked out with no recovery link.

Run: python3 -m pytest backend/tests/test_forgot_password_email_delivery.py -v
"""

from __future__ import annotations

import os
import sys
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.server import app  # noqa: E402


STAFF = {
    "id": "user-1",
    "email": "staff@example.com",
    "name": "Staff",
}


@pytest.mark.asyncio
async def test_forgot_password_returns_502_when_resend_send_fails():
    with (
        patch("backend.server._lookup_user_by_email", new=AsyncMock(return_value=STAFF)),
        patch("backend.server.password_reset.generate_token", return_value="tok-abc"),
        patch("backend.server.password_reset.save_reset_token", new=AsyncMock()),
        patch("backend.server.email_is_configured", return_value=True),
        patch("backend.server.send_password_reset", new=AsyncMock(return_value=None)),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/forgot-password",
                json={"email": "staff@example.com"},
            )

    assert response.status_code == 502
    assert "Failed to send reset email" in response.json()["detail"]


@pytest.mark.asyncio
async def test_forgot_password_returns_503_when_email_unconfigured_in_production():
    with (
        patch("backend.server._lookup_user_by_email", new=AsyncMock(return_value=STAFF)),
        patch("backend.server.password_reset.generate_token", return_value="tok-abc"),
        patch("backend.server.password_reset.save_reset_token", new=AsyncMock()),
        patch("backend.server.email_is_configured", return_value=False),
        patch("backend.server.dev_auth.is_enabled", return_value=False),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/forgot-password",
                json={"email": "staff@example.com"},
            )

    assert response.status_code == 503
    assert "Email delivery is not configured" in response.json()["detail"]


@pytest.mark.asyncio
async def test_forgot_password_dev_fallback_returns_reset_url_without_resend():
    with (
        patch("backend.server._lookup_user_by_email", new=AsyncMock(return_value=STAFF)),
        patch("backend.server.password_reset.generate_token", return_value="tok-dev"),
        patch("backend.server.password_reset.save_reset_token", new=AsyncMock()),
        patch("backend.server.email_is_configured", return_value=False),
        patch("backend.server.dev_auth.is_enabled", return_value=True),
        patch.dict(os.environ, {"FRONTEND_URL": "http://localhost:3000"}, clear=False),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/forgot-password",
                json={"email": "staff@example.com"},
            )

    assert response.status_code == 200
    body = response.json()
    assert "dev_reset_url" in body
    assert "token=tok-dev" in body["dev_reset_url"]


@pytest.mark.asyncio
async def test_forgot_password_success_when_email_sent():
    with (
        patch("backend.server._lookup_user_by_email", new=AsyncMock(return_value=STAFF)),
        patch("backend.server.password_reset.generate_token", return_value="tok-ok"),
        patch("backend.server.password_reset.save_reset_token", new=AsyncMock()),
        patch("backend.server.email_is_configured", return_value=True),
        patch(
            "backend.server.send_password_reset",
            new=AsyncMock(return_value="msg_123"),
        ) as send_mock,
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/forgot-password",
                json={"email": "staff@example.com"},
            )

    assert response.status_code == 200
    assert "dev_reset_url" not in response.json()
    send_mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_forgot_password_unknown_email_still_returns_generic_message():
    with patch(
        "backend.server._lookup_user_by_email",
        new=AsyncMock(return_value=None),
    ):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/auth/forgot-password",
                json={"email": "nobody@example.com"},
            )

    assert response.status_code == 200
    assert "If an account exists" in response.json()["message"]
