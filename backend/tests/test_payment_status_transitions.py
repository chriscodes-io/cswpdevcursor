"""Unit tests for Stripe payment status terminal-state transitions.

Locks in: once a payment_transactions row is paid, polls and expired
webhooks must not demote it — including when a stale poll races a webhook.

Run with:  python3 -m pytest backend/tests/test_payment_status_transitions.py -q
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from stripe_service import (  # noqa: E402
    payment_status_update_filter,
    resolve_local_payment_status,
)


def test_paid_is_never_demoted_by_expired_session():
    assert (
        resolve_local_payment_status(
            "paid",
            upstream_payment_status="unpaid",
            upstream_session_status="expired",
        )
        == "paid"
    )


def test_paid_is_never_demoted_by_unpaid_poll():
    assert (
        resolve_local_payment_status(
            "paid",
            upstream_payment_status="unpaid",
            upstream_session_status="open",
        )
        == "paid"
    )


def test_unpaid_poll_promotes_initiated_to_pending():
    assert (
        resolve_local_payment_status(
            "initiated",
            upstream_payment_status="unpaid",
            upstream_session_status="open",
        )
        == "pending"
    )


def test_paid_upstream_promotes_pending():
    assert (
        resolve_local_payment_status(
            "pending",
            upstream_payment_status="paid",
            upstream_session_status="complete",
        )
        == "paid"
    )


def test_expired_session_marks_initiated_expired():
    assert (
        resolve_local_payment_status(
            "initiated",
            upstream_payment_status="unpaid",
            upstream_session_status="expired",
        )
        == "expired"
    )


def test_expired_local_not_reopened_by_unpaid_poll():
    assert (
        resolve_local_payment_status(
            "expired",
            upstream_payment_status="unpaid",
            upstream_session_status="open",
        )
        == "expired"
    )


def test_update_filter_blocks_non_paid_overwrite_of_paid():
    filt = payment_status_update_filter("cs_test_123", "pending")
    assert filt == {
        "session_id": "cs_test_123",
        "status": {"$nin": ["paid", "expired"]},
    }


def test_update_filter_blocks_expired_overwrite_of_paid():
    filt = payment_status_update_filter("cs_test_123", "expired")
    assert filt == {
        "session_id": "cs_test_123",
        "status": {"$nin": ["paid", "expired"]},
    }


def test_update_filter_allows_paid_idempotent_write():
    filt = payment_status_update_filter("cs_test_123", "paid")
    assert filt == {
        "session_id": "cs_test_123",
        "status": {"$ne": "paid"},
    }
