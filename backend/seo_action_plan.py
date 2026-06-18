"""SEO Action Plan and Template 129 report payload builders."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional


def _item(
    title: str,
    issue: str,
    recommendation: str,
    *,
    priority: str = "medium",
    source: str = "audit",
    sop_ref: Optional[str] = None,
) -> Dict[str, Any]:
    return {
        "title": title,
        "issue": issue,
        "recommendation": recommendation,
        "priority": priority,
        "source": source,
        "sop_ref": sop_ref,
    }


def _priority_from_score(score: int) -> str:
    if score < 50:
        return "high"
    if score < 70:
        return "medium"
    return "low"


def _items_from_issue_lists(
    issues: List[str],
    recommendations: List[str],
    *,
    category: str,
    score: int,
) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    priority = _priority_from_score(score)
    for idx, issue_text in enumerate(issues or []):
        rec = (
            recommendations[idx]
            if idx < len(recommendations or [])
            else f"Resolve this {category} issue identified during the audit."
        )
        items.append(
            _item(
                title=issue_text[:80] + ("…" if len(issue_text) > 80 else ""),
                issue=issue_text,
                recommendation=rec,
                priority=priority,
                source="audit",
            )
        )
    return items


def _framework_items() -> Dict[str, List[Dict[str, Any]]]:
    return {
        "technical_site_audit": [
            _item(
                "Crawlability & indexation audit",
                "Baseline technical SEO review not yet completed for this site.",
                "Run a full crawl (Screaming Frog or Sitebulb), fix indexation blocks, and validate in Search Console.",
                priority="high",
                source="framework",
                sop_ref="027",
            ),
            _item(
                "Core Web Vitals remediation plan",
                "Performance may be limiting rankings and conversions.",
                "Prioritize LCP, INP, and CLS fixes; retest after deployment.",
                priority="high",
                source="framework",
                sop_ref="055",
            ),
            _item(
                "On-page technical cleanup",
                "Title tags, meta descriptions, and heading structure need a structured pass.",
                "Apply on-page fixes site-wide using a prioritized URL list from the crawl.",
                priority="medium",
                source="framework",
                sop_ref="002",
            ),
        ],
        "guest_post_link_building": [
            _item(
                "Link gap analysis",
                "Competitor backlink profile not yet benchmarked.",
                "Identify top referring domains for 3–5 competitors and build a prospect list.",
                priority="medium",
                source="framework",
                sop_ref="012",
            ),
            _item(
                "Guest post outreach campaign",
                "No active outreach pipeline for authority links.",
                "Create 10–15 qualified prospects per month with tailored pitches.",
                priority="medium",
                source="framework",
                sop_ref="076",
            ),
            _item(
                "Digital PR / linkable asset",
                "Limited linkable assets to earn editorial links.",
                "Develop one data-led or expert asset to support outreach.",
                priority="low",
                source="framework",
                sop_ref="090",
            ),
        ],
        "keyword_research": [
            _item(
                "Seed keyword discovery",
                "Target keyword universe not fully mapped.",
                "Brainstorm seeds from products, services, and Search Console queries.",
                priority="medium",
                source="framework",
                sop_ref="011",
            ),
            _item(
                "Keyword clustering & mapping",
                "Pages may not align to intent-based keyword groups.",
                "Cluster keywords by intent and assign primary URLs.",
                priority="medium",
                source="framework",
                sop_ref="041",
            ),
            _item(
                "Content gap analysis",
                "Competitors may rank for terms you do not target.",
                "Compare ranking gaps and add priority topics to the content calendar.",
                priority="low",
                source="framework",
                sop_ref="092",
            ),
        ],
    }


def build_action_plan(audit: Dict[str, Any]) -> Dict[str, Any]:
    """Build three-campaign SEO action plan from audit scores and issue lists."""
    technical_score = int(audit.get("technical_score") or 0)
    performance_score = int(audit.get("performance_score") or 0)
    seo_score = int(audit.get("seo_score") or 0)
    security_score = int(audit.get("security_score") or 0)

    framework = _framework_items()

    technical_items: List[Dict[str, Any]] = []
    technical_items.extend(
        _items_from_issue_lists(
            (audit.get("technical_issues") or []) + (audit.get("security_issues") or []),
            (audit.get("technical_recommendations") or [])
            + (audit.get("security_recommendations") or []),
            category="technical",
            score=min(technical_score, security_score),
        )
    )
    technical_items.extend(
        _items_from_issue_lists(
            audit.get("performance_issues") or [],
            audit.get("performance_recommendations") or [],
            category="performance",
            score=performance_score,
        )
    )
    if technical_score < 75 or performance_score < 75:
        technical_items.extend(framework["technical_site_audit"])

    link_items: List[Dict[str, Any]] = []
    if seo_score < 90:
        link_items.extend(
            _items_from_issue_lists(
                audit.get("seo_issues") or [],
                audit.get("seo_recommendations") or [],
                category="SEO",
                score=seo_score,
            )
        )
    if seo_score < 75:
        link_items.extend(framework["guest_post_link_building"])

    keyword_items: List[Dict[str, Any]] = []
    if seo_score < 95:
        keyword_items.extend(framework["keyword_research"][:2])
    if seo_score < 80:
        keyword_items.extend(framework["keyword_research"][2:])

    campaigns = {
        "technical_site_audit": {
            "id": "technical_site_audit",
            "title": "Technical Site Audit",
            "items": technical_items,
        },
        "guest_post_link_building": {
            "id": "guest_post_link_building",
            "title": "Guest Post Link Building",
            "items": link_items,
        },
        "keyword_research": {
            "id": "keyword_research",
            "title": "Keyword Research",
            "items": keyword_items,
        },
    }

    all_items = technical_items + link_items + keyword_items
    high_count = sum(1 for i in all_items if i.get("priority") == "high")

    return {
        "campaigns": campaigns,
        "summary": {
            "total_actions": len(all_items),
            "high_priority": high_count,
            "technical_count": len(technical_items),
            "link_building_count": len(link_items),
            "keyword_count": len(keyword_items),
        },
    }


def _parse_audit_date(audit: Dict[str, Any]) -> datetime:
    raw = audit.get("audit_date")
    if isinstance(raw, datetime):
        return raw
    if isinstance(raw, str):
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    return datetime.now()


def build_report_payload(
    audit: Dict[str, Any],
    *,
    company: str = "",
    created_by: str = "",
) -> Dict[str, Any]:
    """Template 129-shaped JSON for client SEO reports."""
    audit_date = _parse_audit_date(audit)
    action_plan = audit.get("action_plan") or build_action_plan(audit)

    return {
        "template": "129",
        "company": company or audit.get("company") or "",
        "created_by": created_by or audit.get("created_by") or "",
        "report_month": audit_date.strftime("%B"),
        "report_year": audit_date.year,
        "audited_url": audit.get("url") or "",
        "audit_id": audit.get("id"),
        "audit_date": audit_date.isoformat(),
        "key_figures": {
            "overall_score": audit.get("overall_score"),
            "performance_score": audit.get("performance_score"),
            "seo_score": audit.get("seo_score"),
            "security_score": audit.get("security_score"),
            "technical_score": audit.get("technical_score"),
            "accessibility_score": audit.get("accessibility_score"),
        },
        "pages": [
            {
                "url": audit.get("url") or "",
                "overall_score": audit.get("overall_score"),
                "performance_score": audit.get("performance_score"),
                "seo_score": audit.get("seo_score"),
                "notes": "Primary URL from automated audit",
            }
        ],
        "top_keywords": [],
        "action_plan": action_plan,
    }
