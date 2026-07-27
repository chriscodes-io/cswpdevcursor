"""Regression: app on-hold must round-trip through Agiled without becoming active."""

from agiled_client import (
    project_create_to_agiled,
    project_to_app,
    project_update_to_agiled,
)


def test_on_hold_maps_to_agiled_on_hold_not_planning():
    create_payload = project_create_to_agiled({"name": "Hold me", "status": "on-hold"})
    update_payload = project_update_to_agiled({"status": "on-hold"})

    assert create_payload["status"] == "on_hold"
    assert update_payload["status"] == "on_hold"


def test_on_hold_round_trips_through_project_to_app():
    create_payload = project_create_to_agiled({"name": "Hold me", "status": "on-hold"})
    mapped = project_to_app(
        {
            "id": "42",
            "name": "Hold me",
            "status": create_payload["status"],
            "created_at": "2026-07-27 00:00:00",
        }
    )

    assert mapped["status"] == "on-hold"


def test_agiled_planning_still_reads_as_active():
    mapped = project_to_app(
        {
            "id": "7",
            "name": "New project",
            "status": "planning",
            "created_at": "2026-07-27 00:00:00",
        }
    )

    assert mapped["status"] == "active"


def test_agiled_on_hold_reads_as_app_on_hold():
    mapped = project_to_app(
        {
            "id": "8",
            "name": "Paused",
            "status": "on_hold",
            "created_at": "2026-07-27 00:00:00",
        }
    )

    assert mapped["status"] == "on-hold"
