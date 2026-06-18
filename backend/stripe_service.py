"""Native Stripe Checkout integration."""

from __future__ import annotations

import os
from typing import Any, Optional

import stripe


def is_configured() -> bool:
    key = os.environ.get("STRIPE_API_KEY", "").strip()
    if not key or key == "sk_test_emergent":
        return False
    return key.startswith(("sk_test_", "sk_live_"))


def _configure_stripe() -> None:
    if not is_configured():
        raise RuntimeError("Stripe not configured")
    stripe.api_key = os.environ["STRIPE_API_KEY"].strip()


def create_checkout_session(
    *,
    amount_usd: float,
    description: str,
    success_url: str,
    cancel_url: str,
    metadata: dict[str, str],
) -> dict[str, Any]:
    _configure_stripe()
    session = stripe.checkout.Session.create(
        mode="payment",
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "product_data": {"name": description},
                    "unit_amount": int(round(amount_usd * 100)),
                },
                "quantity": 1,
            }
        ],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )
    return {"session_id": session.id, "url": session.url}


def get_checkout_status(session_id: str) -> dict[str, Any]:
    _configure_stripe()
    session = stripe.checkout.Session.retrieve(session_id)
    return {
        "session_id": session.id,
        "status": session.status,
        "payment_status": session.payment_status,
        "amount_total": session.amount_total or 0,
        "currency": session.currency or "usd",
    }


def parse_webhook_event(payload: bytes, signature: str) -> Optional[dict[str, Any]]:
    """Verify webhook signature and return normalized checkout update, if any."""
    secret = os.environ.get("STRIPE_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET not configured")

    _configure_stripe()
    event = stripe.Webhook.construct_event(payload, signature, secret)

    if event.type in ("checkout.session.completed", "checkout.session.async_payment_succeeded"):
        session = event.data.object
        return {
            "session_id": session["id"],
            "payment_status": session.get("payment_status") or "paid",
            "session_status": session.get("status"),
        }

    if event.type == "checkout.session.expired":
        session = event.data.object
        return {
            "session_id": session["id"],
            "payment_status": session.get("payment_status") or "unpaid",
            "session_status": "expired",
        }

    return None
