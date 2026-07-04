import importlib

import pytest

from backend import auth


def _restore_auth_module(monkeypatch, original_secret):
    monkeypatch.setenv("DEV_AUTH_FALLBACK", "true")
    monkeypatch.setenv("JWT_SECRET", original_secret)
    importlib.reload(auth)


def test_production_auth_rejects_missing_jwt_secret(monkeypatch):
    original_secret = auth.JWT_SECRET
    monkeypatch.setenv("DEV_AUTH_FALLBACK", "false")
    monkeypatch.delenv("JWT_SECRET", raising=False)

    try:
        with pytest.raises(RuntimeError, match="JWT_SECRET must be set"):
            importlib.reload(auth)
    finally:
        _restore_auth_module(monkeypatch, original_secret)


def test_production_auth_accepts_configured_jwt_secret(monkeypatch):
    original_secret = auth.JWT_SECRET
    monkeypatch.setenv("DEV_AUTH_FALLBACK", "false")
    monkeypatch.setenv("JWT_SECRET", "test-secret-that-is-not-a-placeholder")

    try:
        module = importlib.reload(auth)
        assert module.JWT_SECRET == "test-secret-that-is-not-a-placeholder"
    finally:
        _restore_auth_module(monkeypatch, original_secret)

