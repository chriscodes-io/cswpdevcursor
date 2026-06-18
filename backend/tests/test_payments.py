"""Backend tests for Stripe payments + Resend graceful-degrade (iteration 4).

Covers:
 - GET /api/seo-audit-status returns stripe_enabled=true & email_enabled=false
 - POST /api/contact still succeeds when Resend not configured (graceful no-op)
 - POST /api/payments/checkout success/error/auth paths + price-manipulation guard
 - GET /api/payments/status/{session_id} (incl. local-fallback path) + unknown 404
 - GET /api/payments?project_id=<id> filtered + sorted, no _id
 - POST /api/webhook/stripe rejects missing/invalid signature with 400 (no crash)
"""
import os
import uuid
import pytest
import requests


def _load_base_url():
    val = os.environ.get('REACT_APP_BACKEND_URL')
    if val:
        return val.rstrip('/')
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
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def auth_token(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": TEST_EMAIL, "password": TEST_PASSWORD})
    if r.status_code != 200:
        reg = api_client.post(f"{BASE_URL}/api/auth/register",
                              json={"email": TEST_EMAIL, "name": "Test User",
                                    "password": TEST_PASSWORD})
        if reg.status_code != 200:
            pytest.skip(f"Cannot auth. login={r.status_code} register={reg.status_code}")
        return reg.json()["access_token"]
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth_headers(auth_token):
    return {"Content-Type": "application/json",
            "Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="module")
def test_client_id(auth_headers):
    """Create a temp client, yield id, delete on teardown."""
    payload = {"name": f"TEST_PayClient_{uuid.uuid4().hex[:6]}",
               "email": "test_pay_client@example.com",
               "company": "TEST PayCo"}
    r = requests.post(f"{BASE_URL}/api/clients", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    yield cid
    requests.delete(f"{BASE_URL}/api/clients/{cid}", headers=auth_headers)


@pytest.fixture(scope="module")
def project_with_budget(auth_headers, test_client_id):
    """Project with budget=750.00 — used as the happy-path checkout target."""
    payload = {"name": f"TEST_PayProj_{uuid.uuid4().hex[:6]}",
               "client_id": test_client_id,
               "type": "seo", "status": "active", "budget": 750.0}
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield {"id": pid, "budget": 750.0}
    requests.delete(f"{BASE_URL}/api/projects/{pid}", headers=auth_headers)


@pytest.fixture(scope="module")
def project_no_budget(auth_headers, test_client_id):
    """Project with no budget — used to assert 400."""
    payload = {"name": f"TEST_PayProjNoBudget_{uuid.uuid4().hex[:6]}",
               "client_id": test_client_id, "type": "seo", "status": "active"}
    r = requests.post(f"{BASE_URL}/api/projects", json=payload, headers=auth_headers)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    requests.delete(f"{BASE_URL}/api/projects/{pid}", headers=auth_headers)


# ---------- integrations status ----------
class TestStatusEndpoint:
    def test_status_includes_stripe_and_email_flags(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/seo-audit-status", headers=auth_headers)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("stripe_enabled") is True, body
        assert body.get("email_enabled") is False, body


# ---------- Resend graceful no-op ----------
class TestContactWithoutResend:
    def test_contact_still_succeeds_when_resend_unconfigured(self, api_client):
        msg = f"TEST_iter4_no_resend_{uuid.uuid4().hex[:8]}"
        r = api_client.post(f"{BASE_URL}/api/contact",
                            json={"name": "TEST_QA", "email": "qa@example.com",
                                  "website": "https://example.com", "message": msg})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["message"] == msg
        assert "_id" not in body


# ---------- POST /api/payments/checkout ----------
class TestPaymentsCheckout:
    def test_no_auth_returns_401(self, api_client, project_with_budget):
        r = api_client.post(f"{BASE_URL}/api/payments/checkout",
                            json={"project_id": project_with_budget["id"],
                                  "origin_url": "https://app.example.com"})
        assert r.status_code in (401, 403), r.text

    def test_unknown_project_404(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"project_id": "does-not-exist-xyz",
                                "origin_url": "https://app.example.com"},
                          headers=auth_headers)
        assert r.status_code == 404, r.text
        assert "not found" in r.json()["detail"].lower()

    def test_no_budget_400(self, auth_headers, project_no_budget):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"project_id": project_no_budget,
                                "origin_url": "https://app.example.com"},
                          headers=auth_headers)
        assert r.status_code == 400, r.text
        assert "budget" in r.json()["detail"].lower()

    def test_happy_path_creates_session(self, auth_headers, project_with_budget):
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"project_id": project_with_budget["id"],
                                "origin_url": "https://app.example.com",
                                "description": "TEST_iter4 invoice"},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["session_id"].startswith("cs_test_"), body
        assert body["stripe_url"].startswith("https://checkout.stripe.com/"), body
        assert body["status"] == "initiated"
        assert body["amount"] == project_with_budget["budget"]
        assert body["currency"] == "usd"
        assert body["project_id"] == project_with_budget["id"]
        assert "_id" not in body
        # Stash for status & list tests
        TestPaymentsCheckout.session_id = body["session_id"]
        TestPaymentsCheckout.project_id = project_with_budget["id"]

    def test_amount_field_from_client_is_ignored(self, auth_headers, project_with_budget):
        """Price-manipulation guard: amount in body must be ignored; server uses
        project.budget. CreateCheckoutRequest doesn't declare amount, so it's
        silently dropped by Pydantic."""
        r = requests.post(f"{BASE_URL}/api/payments/checkout",
                          json={"project_id": project_with_budget["id"],
                                "origin_url": "https://app.example.com",
                                "amount": 0.01,  # malicious tiny amount
                                "description": "TEST_iter4 attack"},
                          headers=auth_headers, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        # MUST equal project.budget, not 0.01
        assert body["amount"] == project_with_budget["budget"]


# ---------- GET /api/payments/status/{session_id} ----------
class TestPaymentStatus:
    def test_unknown_session_returns_404(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/payments/status/cs_test_unknown_xyz",
                         headers=auth_headers)
        assert r.status_code == 404, r.text
        assert "unknown" in r.json()["detail"].lower()

    def test_known_session_returns_status_200(self, auth_headers):
        sid = getattr(TestPaymentsCheckout, "session_id", None)
        if not sid:
            pytest.skip("happy-path checkout did not run / session_id missing")
        r = requests.get(f"{BASE_URL}/api/payments/status/{sid}",
                         headers=auth_headers, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        # required keys
        for k in ("session_id", "status", "payment_status",
                  "amount_total", "currency", "source"):
            assert k in body, f"missing {k}: {body}"
        assert body["session_id"] == sid
        assert body["currency"] == "usd"
        # status is either initiated/pending (unpaid fresh session)
        assert body["status"] in ("initiated", "pending"), body
        # source must be 'upstream' or 'local-fallback' — both 200, never 500
        assert body["source"] in ("upstream", "local-fallback"), body


# ---------- GET /api/payments ----------
class TestPaymentsList:
    def test_list_by_project_id(self, auth_headers):
        pid = getattr(TestPaymentsCheckout, "project_id", None)
        if not pid:
            pytest.skip("checkout did not run")
        r = requests.get(f"{BASE_URL}/api/payments",
                         params={"project_id": pid}, headers=auth_headers)
        assert r.status_code == 200, r.text
        rows = r.json()
        assert isinstance(rows, list) and len(rows) >= 1
        for row in rows:
            assert "_id" not in row
            assert row["project_id"] == pid
        # sorted desc by created_at — most recent first
        if len(rows) >= 2:
            assert rows[0]["created_at"] >= rows[1]["created_at"]

    def test_list_requires_auth(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/payments")
        assert r.status_code in (401, 403)


# ---------- POST /api/webhook/stripe ----------
class TestStripeWebhook:
    def test_missing_signature_returns_400(self, api_client):
        # No Stripe-Signature header → verification fails → 400, NOT 500
        r = requests.post(f"{BASE_URL}/api/webhook/stripe",
                          data=b'{"id":"evt_x","type":"checkout.session.completed"}',
                          headers={"Content-Type": "application/json"})
        assert r.status_code == 400, r.text
        assert "invalid" in r.json()["detail"].lower() or "signature" in r.json()["detail"].lower()

    def test_invalid_signature_returns_400(self, api_client):
        r = requests.post(f"{BASE_URL}/api/webhook/stripe",
                          data=b'{"id":"evt_x","type":"checkout.session.completed"}',
                          headers={"Content-Type": "application/json",
                                   "Stripe-Signature": "t=123,v1=deadbeef"})
        assert r.status_code == 400, r.text

    def test_health_check_after_webhook_no_crash(self, auth_headers):
        # Backend must still respond after the bad-webhook calls above
        r = requests.get(f"{BASE_URL}/api/seo-audit-status", headers=auth_headers)
        assert r.status_code == 200
