"""Unit tests for SEO action plan generation."""

import os
import sys

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from seo_action_plan import build_action_plan, build_report_payload  # noqa: E402


def _low_score_audit():
    return {
        "id": "audit-1",
        "url": "https://example.com",
        "overall_score": 55,
        "performance_score": 60,
        "seo_score": 65,
        "security_score": 70,
        "technical_score": 68,
        "accessibility_score": 72,
        "performance_issues": ["Slow LCP"],
        "performance_recommendations": ["Optimize hero image"],
        "seo_issues": ["Missing meta description"],
        "seo_recommendations": ["Add unique meta descriptions"],
        "technical_issues": ["No sitemap"],
        "technical_recommendations": ["Submit XML sitemap"],
        "security_issues": [],
        "security_recommendations": [],
        "audit_date": "2026-05-24T10:00:00+00:00",
    }


def _high_score_audit():
    return {
        "id": "audit-2",
        "url": "https://example.com",
        "overall_score": 95,
        "performance_score": 96,
        "seo_score": 98,
        "security_score": 97,
        "technical_score": 94,
        "accessibility_score": 93,
        "performance_issues": [],
        "performance_recommendations": [],
        "seo_issues": [],
        "seo_recommendations": [],
        "technical_issues": [],
        "technical_recommendations": [],
        "security_issues": [],
        "security_recommendations": [],
        "audit_date": "2026-05-24T10:00:00+00:00",
    }


def test_low_scores_produce_all_three_campaigns():
    plan = build_action_plan(_low_score_audit())
    campaigns = plan["campaigns"]
    assert len(campaigns["technical_site_audit"]["items"]) >= 1
    assert len(campaigns["guest_post_link_building"]["items"]) >= 1
    assert len(campaigns["keyword_research"]["items"]) >= 1
    assert plan["summary"]["total_actions"] >= 3


def test_high_scores_minimize_framework_items():
    plan = build_action_plan(_high_score_audit())
    campaigns = plan["campaigns"]
    assert len(campaigns["technical_site_audit"]["items"]) == 0
    assert len(campaigns["guest_post_link_building"]["items"]) == 0
    assert len(campaigns["keyword_research"]["items"]) == 0
    assert plan["summary"]["total_actions"] == 0


def test_report_payload_shape():
    audit = _low_score_audit()
    audit["action_plan"] = build_action_plan(audit)
    report = build_report_payload(audit, company="Acme Co", created_by="Chris Smith")
    assert report["template"] == "129"
    assert report["company"] == "Acme Co"
    assert report["created_by"] == "Chris Smith"
    assert report["pages"][0]["url"] == "https://example.com"
    assert report["top_keywords"] == []
    assert "action_plan" in report
