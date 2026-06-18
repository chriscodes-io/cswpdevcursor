"""Smoke tests for the email_service module — verify graceful fallback when
Resend env vars are missing. We never make real HTTP calls in unit tests.

Run with:  python -m pytest backend/tests/test_email.py -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from email_service import (  # noqa: E402
    is_configured,
    send_contact_notification,
    send_contact_autoreply,
    send_audit_ready,
    _wrap_html,
)


@pytest.mark.asyncio
async def test_is_configured_false_when_keys_missing(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM_EMAIL", raising=False)
    assert is_configured() is False


@pytest.mark.asyncio
async def test_is_configured_true_when_both_set(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "from@example.com")
    assert is_configured() is True


@pytest.mark.asyncio
async def test_send_contact_notification_no_op_when_key_missing(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    monkeypatch.delenv("RESEND_FROM_EMAIL", raising=False)
    monkeypatch.setenv("CONTACT_TO_EMAIL", "owner@example.com")
    result = await send_contact_notification("Jane", "jane@example.com", "https://x.com", "hi")
    assert result is None  # silent no-op


@pytest.mark.asyncio
async def test_send_contact_autoreply_no_op_when_key_missing(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    result = await send_contact_autoreply("Jane", "jane@example.com")
    assert result is None


@pytest.mark.asyncio
async def test_send_audit_ready_no_op_when_key_missing(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    result = await send_audit_ready("Client", "client@example.com", "https://x.com", 85)
    assert result is None


def test_wrap_html_includes_brand_and_title():
    html = _wrap_html("Test title", "<p>body</p>", cta={"label": "Click", "url": "https://x.com"})
    assert "Chris Smith" in html
    assert "Test title" in html
    assert "Click" in html
    assert "https://x.com" in html
    assert "#00FF9D" in html  # accent color present


def test_wrap_html_without_cta_renders_no_button():
    html = _wrap_html("No button", "<p>body</p>")
    # cta block is absent → no anchor tag with display:inline-block
    assert "display:inline-block" not in html


@pytest.mark.asyncio
async def test_send_contact_notification_skips_when_to_address_missing(monkeypatch):
    # Keys present but CONTACT_TO_EMAIL missing → no owner email attempted
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("RESEND_FROM_EMAIL", "from@example.com")
    monkeypatch.delenv("CONTACT_TO_EMAIL", raising=False)
    result = await send_contact_notification("X", "x@example.com", None, "msg")
    assert result is None
