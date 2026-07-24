"""Unit tests for password reset token expiry parsing and consumption."""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from backend.password_reset import _parse_expires_at, consume_reset_token  # noqa: E402


def test_parse_expires_at_accepts_bson_datetime():
    value = datetime(2026, 7, 24, 12, 0, tzinfo=timezone.utc)
    assert _parse_expires_at(value) is value


def test_parse_expires_at_normalizes_naive_datetime_to_utc():
    value = datetime(2026, 7, 24, 12, 0)
    parsed = _parse_expires_at(value)
    assert parsed.tzinfo == timezone.utc
    assert parsed.replace(tzinfo=None) == value


def test_parse_expires_at_accepts_iso_string():
    parsed = _parse_expires_at("2026-07-24T12:00:00Z")
    assert parsed == datetime(2026, 7, 24, 12, 0, tzinfo=timezone.utc)


@pytest.mark.asyncio
async def test_consume_reset_token_handles_mongo_datetime_expires_at():
    token = "reset-token-value"
    expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
    doc = {
        "token_hash": "ignored",
        "user_id": "user-1",
        "email": "staff@example.com",
        "expires_at": expires_at,
        "used": False,
    }

    fake_db = MagicMock()
    fake_db.password_reset_tokens.find_one = AsyncMock(return_value=doc)
    fake_db.password_reset_tokens.update_one = AsyncMock()

    with patch("backend.password_reset.ping_db", AsyncMock(return_value=True)), patch(
        "backend.password_reset.db", fake_db
    ):
        context = await consume_reset_token(token)

    assert context == {"user_id": "user-1", "email": "staff@example.com"}
    fake_db.password_reset_tokens.update_one.assert_awaited_once()


@pytest.mark.asyncio
async def test_consume_reset_token_rejects_expired_mongo_datetime():
    token = "expired-token"
    doc = {
        "token_hash": "ignored",
        "user_id": "user-1",
        "email": "staff@example.com",
        "expires_at": datetime.now(timezone.utc) - timedelta(minutes=5),
        "used": False,
    }

    fake_db = MagicMock()
    fake_db.password_reset_tokens.find_one = AsyncMock(return_value=doc)
    fake_db.password_reset_tokens.update_one = AsyncMock()

    with patch("backend.password_reset.ping_db", AsyncMock(return_value=True)), patch(
        "backend.password_reset.db", fake_db
    ):
        context = await consume_reset_token(token)

    assert context is None
    fake_db.password_reset_tokens.update_one.assert_not_awaited()
