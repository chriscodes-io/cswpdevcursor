"""Agiled path-segment validation — block CRM allowlist escape via ../ IDs."""

from urllib.parse import quote

import pytest

import agiled_client


def test_safe_path_segment_accepts_normal_ids():
    assert agiled_client._safe_path_segment("12345") == "12345"
    assert agiled_client._safe_path_segment("proj_abc-1") == "proj_abc-1"


@pytest.mark.parametrize(
    "value",
    [
        "../webhook-subscriptions",
        quote("../webhook-subscriptions", safe=""),
        "foo/bar",
        "foo\\bar",
        "..",
        ".",
        "",
    ],
)
def test_safe_path_segment_rejects_traversal(value):
    with pytest.raises(agiled_client.AgiledError) as exc_info:
        agiled_client._safe_path_segment(value, "contact_id")
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_get_contact_rejects_traversal_before_http_call(monkeypatch):
    async def boom(*_args, **_kwargs):
        raise AssertionError("_request should not be called for unsafe contact ids")

    monkeypatch.setattr(agiled_client, "_request", boom)

    with pytest.raises(agiled_client.AgiledError) as exc_info:
        await agiled_client.get_contact("../webhook-subscriptions")
    assert exc_info.value.status_code == 400
