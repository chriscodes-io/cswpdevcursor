"""
Backend tests for the Freelance SEO/Web Dev PM app.
Covers: auth, public contact form, contact list (auth-only), and
regression checks for dashboard/clients/projects/tasks endpoints.
"""

import os
import uuid
import pytest
import requests

def _load_base_url():
    val = os.environ.get('REACT_APP_BACKEND_URL')
    if val:
        return val.rstrip('/')
    # Fallback: parse /app/frontend/.env
    env_path = '/app/frontend/.env'
    if os.path.exists(env_path):
        with open(env_path) as fh:
            for line in fh:
                line = line.strip()
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip().rstrip('/')
    raise RuntimeError("REACT_APP_BACKEND_URL not configured")


BASE_URL = _load_base_url()
TEST_EMAIL = os.environ.get("TEST_USER_EMAIL", "test@seoaudit.com")
TEST_PASSWORD = os.environ.get("TEST_USER_PASSWORD", "test123456")


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def auth_token(api_client):
    # Try login. If user doesn't exist, register first.
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    if r.status_code != 200:
        # Try register (may already exist with different password - skip in that case)
        reg = api_client.post(f"{BASE_URL}/api/auth/register",
                              json={"email": TEST_EMAIL, "name": "Test User",
                                    "password": TEST_PASSWORD})
        if reg.status_code != 200:
            pytest.skip(f"Cannot obtain auth token. login={r.status_code} register={reg.status_code}")
        return reg.json()["access_token"]
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(auth_token):
    return {"Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_success(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data and isinstance(data["access_token"], str)
        assert data["user"]["email"] == TEST_EMAIL

    def test_login_invalid_credentials(self, api_client):
        r = api_client.post(f"{BASE_URL}/api/auth/login",
                            json={"email": TEST_EMAIL, "password": "wrong-password"})
        assert r.status_code == 401

    def test_me_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code in (401, 403)

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == TEST_EMAIL


# ---------- CONTACT (public) ----------
class TestContactPublic:
    submitted_message_text = f"TEST_msg_{uuid.uuid4().hex[:8]} - automated contact test"

    def test_contact_submit_public_success(self, api_client):
        payload = {
            "name": "TEST_QA Bot",
            "email": "qa-bot@example.com",
            "website": "https://example.com",
            "message": self.__class__.submitted_message_text,
        }
        r = api_client.post(f"{BASE_URL}/api/contact", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["name"] == payload["name"]
        assert body["email"] == payload["email"]
        assert body["message"] == payload["message"]
        assert "id" in body and isinstance(body["id"], str)
        assert "_id" not in body  # Mongo _id must be excluded

    def test_contact_submit_no_auth_required(self, api_client):
        # explicit: bare session, no Authorization
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        r = s.post(f"{BASE_URL}/api/contact",
                   json={"name": "TEST_anon", "email": "a@b.com",
                         "message": "hello"})
        assert r.status_code == 200

    def test_contact_submit_missing_required_fields(self, api_client):
        # Pydantic should reject missing required field
        r = api_client.post(f"{BASE_URL}/api/contact",
                            json={"email": "x@y.com", "message": "no name"})
        assert r.status_code == 422

    def test_contact_list_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/contact")
        assert r.status_code in (401, 403)

    def test_contact_list_with_auth_includes_submitted(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/contact", headers=auth_headers)
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)
        # _id field must never appear
        for it in items:
            assert "_id" not in it
        # find our test message
        matches = [m for m in items
                   if m.get("message") == TestContactPublic.submitted_message_text]
        assert matches, "Submitted contact message not found in list"


# ---------- REGRESSION: existing endpoints ----------
class TestRegression:
    def test_dashboard_stats(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        for k in ("active_projects", "total_clients", "total_tasks",
                  "completed_tasks", "billable_hours"):
            assert k in data

    def test_dashboard_stats_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code in (401, 403)

    def test_get_clients(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/clients", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_projects(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/projects", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_get_tasks(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/tasks", headers=auth_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_seo_audit_status_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/seo-audit-status")
        assert r.status_code in (401, 403)

    def test_seo_audit_status_with_auth_fallback(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/seo-audit-status", headers=auth_headers)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("pagespeed_enabled") is False
        assert data.get("performance_source") == "fallback"

    def _validate_audit_fallback_response(self, body):
        # Provenance fields
        assert body.get("performance_source") == "fallback"
        assert body.get("pagespeed_strategy") is None
        assert body.get("lighthouse_seo_score") is None
        assert body.get("lighthouse_accessibility_score") is None
        assert body.get("lighthouse_best_practices_score") is None
        # Other scores present
        for k in ("performance_score", "seo_score", "security_score",
                  "technical_score", "accessibility_score", "overall_score"):
            assert k in body, f"missing {k}"
            assert isinstance(body[k], int)

    def test_seo_audit_fallback_default_strategy(self, auth_headers):
        payload = {"project_id": "TEST_proj", "url": "https://example.com"}
        r = requests.post(f"{BASE_URL}/api/seo-audit", json=payload,
                          headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        self._validate_audit_fallback_response(r.json())

    def test_seo_audit_fallback_mobile_strategy(self, auth_headers):
        payload = {"project_id": "TEST_proj", "url": "https://example.com",
                   "strategy": "mobile"}
        r = requests.post(f"{BASE_URL}/api/seo-audit", json=payload,
                          headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        self._validate_audit_fallback_response(r.json())

    def test_seo_audit_fallback_desktop_strategy(self, auth_headers):
        payload = {"project_id": "TEST_proj", "url": "https://example.com",
                   "strategy": "desktop"}
        r = requests.post(f"{BASE_URL}/api/seo-audit", json=payload,
                          headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        self._validate_audit_fallback_response(r.json())

    def test_seo_audit_fallback_invalid_strategy_defaults(self, auth_headers):
        # Invalid strategy must not error - server normalizes to mobile in fallback mode
        payload = {"project_id": "TEST_proj", "url": "https://example.com",
                   "strategy": "garbage"}
        r = requests.post(f"{BASE_URL}/api/seo-audit", json=payload,
                          headers=auth_headers, timeout=120)
        assert r.status_code == 200, r.text
        self._validate_audit_fallback_response(r.json())

    def test_client_crud_roundtrip(self, auth_headers):
        # CREATE
        payload = {"name": "TEST_Client " + uuid.uuid4().hex[:6],
                   "email": "test_client@example.com",
                   "company": "TEST Co"}
        cr = requests.post(f"{BASE_URL}/api/clients", json=payload,
                           headers=auth_headers)
        assert cr.status_code == 200, cr.text
        cid = cr.json()["id"]
        # GET
        gr = requests.get(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers)
        assert gr.status_code == 200
        assert gr.json()["name"] == payload["name"]
        # DELETE cleanup
        dr = requests.delete(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers)
        assert dr.status_code == 200
        # verify gone
        gr2 = requests.get(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers)
        assert gr2.status_code == 404
