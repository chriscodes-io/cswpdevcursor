from types import SimpleNamespace

import pytest

from backend import server
from backend.models import CreateCheckoutRequest


@pytest.mark.asyncio
async def test_checkout_uses_agiled_project_when_crm_enabled(monkeypatch):
    inserted_docs = []
    stripe_calls = []

    class FakePaymentTransactions:
        async def insert_one(self, doc):
            inserted_docs.append(doc)

    async def fake_get_project(project_id):
        assert project_id == "agiled-project-123"
        return {
            "data": {
                "id": project_id,
                "name": "Agiled SEO Project",
                "budget": "750.00",
            }
        }

    async def fake_get_meta(project_id):
        assert project_id == "agiled-project-123"
        return {"client_id": "agiled-client-456", "type": "seo"}

    def fake_create_checkout_session(**kwargs):
        stripe_calls.append(kwargs)
        return {
            "session_id": "cs_test_agiled",
            "url": "https://checkout.stripe.com/c/pay/cs_test_agiled",
        }

    monkeypatch.setattr(server, "_stripe_is_configured", lambda: True)
    monkeypatch.setattr(server, "_use_agiled_crm", lambda: True)
    monkeypatch.setattr(server.agiled_client, "is_configured", lambda: True)
    monkeypatch.setattr(server.agiled_client, "get_project", fake_get_project)
    monkeypatch.setattr(server.project_meta, "get_meta", fake_get_meta)
    monkeypatch.setattr(server.stripe_service, "create_checkout_session", fake_create_checkout_session)
    monkeypatch.setattr(server, "track_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(
        server,
        "db",
        SimpleNamespace(payment_transactions=FakePaymentTransactions()),
    )

    txn = await server.create_payment_checkout(
        CreateCheckoutRequest(
            project_id="agiled-project-123",
            origin_url="https://app.example.com",
            description=None,
        ),
        request=None,
        current_user={"user_id": "staff-user-1"},
    )

    assert txn.project_id == "agiled-project-123"
    assert txn.client_id == "agiled-client-456"
    assert txn.amount == 750.0
    assert txn.description == "Agiled SEO Project"
    assert txn.session_id == "cs_test_agiled"
    assert inserted_docs[0]["project_id"] == "agiled-project-123"
    assert stripe_calls == [
        {
            "amount_usd": 750.0,
            "description": "Agiled SEO Project",
            "success_url": "https://app.example.com/projects?session_id={CHECKOUT_SESSION_ID}",
            "cancel_url": "https://app.example.com/projects",
            "metadata": {
                "project_id": "agiled-project-123",
                "client_id": "agiled-client-456",
                "description": "Agiled SEO Project",
            },
        }
    ]

