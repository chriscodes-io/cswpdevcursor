"""Unit tests for the PageSpeed parser + missing-key behavior.

These tests don't hit Google; they only verify mapping logic and the
PageSpeedUnavailable fallback path.

Run with:  python -m pytest backend/tests/test_pagespeed.py -v
"""

import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from pagespeed_client import (  # noqa: E402
    map_pagespeed_to_seo_audit,
    fetch_pagespeed_insights,
    PageSpeedUnavailable,
    is_configured,
)


SAMPLE_PSI_RESPONSE = {
    "lighthouseResult": {
        "categories": {
            "performance": {"score": 0.85},
            "seo": {"score": 0.93},
            "accessibility": {"score": 0.78},
            "best-practices": {"score": 0.90},
        },
        "audits": {
            "first-contentful-paint": {
                "id": "first-contentful-paint", "title": "FCP",
                "score": 0.95, "numericValue": 1234.0, "scoreDisplayMode": "numeric",
            },
            "largest-contentful-paint": {
                "id": "largest-contentful-paint", "title": "LCP",
                "score": 0.7, "numericValue": 2500.0, "scoreDisplayMode": "numeric",
            },
            "interactive": {
                "id": "interactive", "title": "TTI",
                "score": 0.8, "numericValue": 3000.0, "scoreDisplayMode": "numeric",
            },
            "total-blocking-time": {
                "id": "total-blocking-time", "title": "TBT",
                "score": 0.75, "numericValue": 150.0, "scoreDisplayMode": "numeric",
            },
            "cumulative-layout-shift": {
                "id": "cumulative-layout-shift", "title": "CLS",
                "score": 0.96, "numericValue": 0.025, "scoreDisplayMode": "numeric",
            },
            "speed-index": {
                "id": "speed-index", "title": "Speed Index",
                "score": 0.82, "numericValue": 2800.0, "scoreDisplayMode": "numeric",
            },
            "server-response-time": {
                "id": "server-response-time", "title": "Reduce initial server response time",
                "description": "Keep your server response time short.",
                "score": 0.4, "scoreDisplayMode": "numeric",
            },
            "render-blocking-resources": {
                "id": "render-blocking-resources", "title": "Eliminate render-blocking resources",
                "description": "Resources are blocking the first paint of your page.",
                "score": 0.0, "scoreDisplayMode": "numeric",
            },
        },
    }
}


def test_map_performance_score_scaled_to_100():
    mapped = map_pagespeed_to_seo_audit(SAMPLE_PSI_RESPONSE)
    assert mapped["performance_score"] == 85
    assert mapped["lighthouse_seo_score"] == 93
    assert mapped["lighthouse_accessibility_score"] == 78
    assert mapped["lighthouse_best_practices_score"] == 90


def test_map_metrics_units():
    metrics = map_pagespeed_to_seo_audit(SAMPLE_PSI_RESPONSE)["performance_metrics"]
    # FCP, LCP, TTI, Speed Index converted to seconds
    assert metrics["fcp"] == 1.23
    assert metrics["lcp"] == 2.5
    assert metrics["tti"] == 3.0
    assert metrics["speed_index"] == 2.8
    # TBT stays in ms
    assert metrics["tbt"] == 150.0
    # CLS unitless
    assert metrics["cls"] == 0.025


def test_failed_audits_become_issues_and_recommendations():
    mapped = map_pagespeed_to_seo_audit(SAMPLE_PSI_RESPONSE)
    titles = " ".join(mapped["performance_issues"])
    # LCP audit has score 0.7 (< 0.9) so it should show up as an issue
    assert "LCP" in titles
    # render-blocking-resources is in the recommendable allowlist
    rec_titles = " ".join(mapped["performance_recommendations"])
    assert "render-blocking" in rec_titles.lower() or "Eliminate render-blocking" in rec_titles


def test_empty_response_does_not_crash():
    mapped = map_pagespeed_to_seo_audit({})
    assert mapped["performance_score"] is None
    assert mapped["performance_metrics"] == {}
    assert mapped["performance_issues"] == []
    assert mapped["performance_recommendations"] == []


@pytest.mark.asyncio
async def test_missing_key_raises_pagespeed_unavailable(monkeypatch):
    monkeypatch.delenv("GOOGLE_PAGESPEED_API_KEY", raising=False)
    assert is_configured() is False
    with pytest.raises(PageSpeedUnavailable):
        await fetch_pagespeed_insights("https://example.com")


@pytest.mark.asyncio
async def test_empty_key_treated_as_missing(monkeypatch):
    monkeypatch.setenv("GOOGLE_PAGESPEED_API_KEY", "")
    assert is_configured() is False
    with pytest.raises(PageSpeedUnavailable):
        await fetch_pagespeed_insights("https://example.com")
