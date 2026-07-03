from types import SimpleNamespace

import pytest

from backend import server
from backend.models import CreateCheckoutRequest


class FailingProjectsCollection:
    async def find_one(self, *args, **kwargs):
        raise AssertionError("Agiled checkout must not read Mongo projects")


class CapturingPaymentsCollection:
    def __init__(self):
        self.inserted = None

    async def insert_one(self, doc):
        self.inserted = doc
        return SimpleNamespace(inserted_id="payment-id")


@pytest.mark.asyncio
async def test_checkout_uses_agiled_project_when_crm_enabled(monkeypatch):
    payments = CapturingPaymentsCollection()

    async def get_agiled_project(project_id):
        assert project_id == "agiled-project-1"
        return {
            "data": {
                "id": project_id,
                "name": "Agiled SEO Retainer",
                "budget": "450.50",
                "status": "active",
                "description": "Monthly SEO",
            }
        }

    async def get_project_meta(project_id):
        assert project_id == "agiled-project-1"
        return {"client_id": "agiled-client-1", "type": "seo"}

    monkeypatch.setattr(server, "_use_agiled_crm", lambda: True)
    monkeypatch.setattr(server.agiled_client, "is_configured", lambda: True)
    monkeypatch.setattr(server.agiled_client, "get_project", get_agiled_project)
    monkeypatch.setattr(server.project_meta, "get_meta", get_project_meta)
    monkeypatch.setattr(server.stripe_service, "is_configured", lambda: True)
    monkeypatch.setattr(
        server.stripe_service,
        "create_checkout_session",
        lambda **kwargs: {"session_id": "cs_test_agiled", "url": "https://stripe.test/session"},
    )
    monkeypatch.setattr(server, "track_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        server,
        "db",
        SimpleNamespace(
            projects=FailingProjectsCollection(),
            payment_transactions=payments,
        ),
    )

    txn = await server.create_payment_checkout(
        CreateCheckoutRequest(
            project_id="agiled-project-1",
            origin_url="https://app.example.com",
            description=None,
        ),
        request=SimpleNamespace(),
        current_user={"user_id": "staff-1"},
    )

    assert txn.session_id == "cs_test_agiled"
    assert txn.project_id == "agiled-project-1"
    assert txn.client_id == "agiled-client-1"
    assert txn.amount == 450.50
    assert txn.description == "Agiled SEO Retainer"
    assert payments.inserted["session_id"] == "cs_test_agiled"
    assert payments.inserted["project_id"] == "agiled-project-1"
