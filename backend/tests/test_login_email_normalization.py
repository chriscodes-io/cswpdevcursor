"""Regression: login email must normalize like registration / forgot-password.

Staff users are stored with lowercased emails (UserCreate, create-staff-user.py).
Before this fix, UserLogin passed the raw email through to MongoDB, so a valid
password typed with different casing (common browser autofill) returned 401
in production while DEV_AUTH_FALLBACK still worked.

Run with:  python -m pytest backend/tests/test_login_email_normalization.py -v
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models import UserCreate, UserLogin, ForgotPasswordRequest  # noqa: E402


def test_user_login_lowercases_and_strips_email():
    login = UserLogin(email="  Chris@Example.COM ", password="secret1")
    assert login.email == "chris@example.com"


def test_user_login_rejects_invalid_email():
    with pytest.raises(Exception):
        UserLogin(email="not-an-email", password="secret1")


def test_user_login_matches_user_create_normalization():
    created = UserCreate(email="Chris@Example.COM", name="Chris", password="secret1")
    login = UserLogin(email="CHRIS@EXAMPLE.COM", password="secret1")
    assert created.email == login.email == "chris@example.com"


def test_forgot_password_matches_login_normalization():
    forgot = ForgotPasswordRequest(email="  Chris@Example.COM ")
    login = UserLogin(email="Chris@Example.COM", password="secret1")
    assert forgot.email == login.email == "chris@example.com"
