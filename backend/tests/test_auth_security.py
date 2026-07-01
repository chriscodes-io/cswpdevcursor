import importlib
import sys

import pytest


def _reload_auth(monkeypatch, *, jwt_secret=None, dev_auth_fallback=None):
    if jwt_secret is None:
        monkeypatch.delenv("JWT_SECRET", raising=False)
    else:
        monkeypatch.setenv("JWT_SECRET", jwt_secret)

    if dev_auth_fallback is None:
        monkeypatch.delenv("DEV_AUTH_FALLBACK", raising=False)
    else:
        monkeypatch.setenv("DEV_AUTH_FALLBACK", dev_auth_fallback)

    sys.modules.pop("backend.auth", None)
    return importlib.import_module("backend.auth")


@pytest.fixture(autouse=True)
def restore_auth_module(monkeypatch):
    yield
    monkeypatch.delenv("JWT_SECRET", raising=False)
    monkeypatch.delenv("DEV_AUTH_FALLBACK", raising=False)
    sys.modules.pop("backend.auth", None)
    importlib.import_module("backend.auth")


@pytest.mark.parametrize("secret", ["", "change-me-in-production", "your-secret-key-change-in-production"])
def test_production_auth_rejects_blank_or_known_jwt_secret(monkeypatch, secret):
    with pytest.raises(RuntimeError, match="JWT_SECRET must be set"):
        _reload_auth(monkeypatch, jwt_secret=secret, dev_auth_fallback="false")


def test_local_dev_auth_can_use_default_jwt_secret(monkeypatch):
    auth = _reload_auth(monkeypatch, jwt_secret=None, dev_auth_fallback="true")

    token = auth.create_access_token({"user_id": "dev-user", "email": "dev@example.com"})

    assert auth.decode_token(token)["user_id"] == "dev-user"
