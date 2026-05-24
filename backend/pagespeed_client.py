"""Google PageSpeed Insights API v5 client + Lighthouse response parser.

Reads the API key from env var GOOGLE_PAGESPEED_API_KEY. When the key is missing
the caller will get PageSpeedUnavailable so the rest of the audit can fall back
to the BeautifulSoup-based PerformanceAnalyzer.
"""

import os
from typing import Any, Dict, List, Optional, Tuple

import httpx

PAGESPEED_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"
DEFAULT_CATEGORIES = ["performance", "seo", "accessibility", "best-practices"]
DEFAULT_TIMEOUT_SECONDS = 65


class PageSpeedUnavailable(Exception):
    """Raised when PageSpeed is not configured or the upstream call fails."""


def is_configured() -> bool:
    return bool(os.environ.get("GOOGLE_PAGESPEED_API_KEY"))


async def fetch_pagespeed_insights(
    target_url: str,
    strategy: str = "mobile",
    categories: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """Call the PageSpeed Insights v5 endpoint and return the parsed JSON.

    Raises PageSpeedUnavailable if the API key is missing or the request fails.
    """
    api_key = os.environ.get("GOOGLE_PAGESPEED_API_KEY")
    if not api_key:
        raise PageSpeedUnavailable(
            "GOOGLE_PAGESPEED_API_KEY is not configured. Add it to /app/backend/.env to enable Lighthouse-based metrics."
        )

    if categories is None:
        categories = DEFAULT_CATEGORIES

    params: List[Tuple[str, str]] = [
        ("url", target_url),
        ("key", api_key),
        ("strategy", strategy),
    ]
    for cat in categories:
        params.append(("category", cat))

    timeout = httpx.Timeout(DEFAULT_TIMEOUT_SECONDS, connect=10.0, read=DEFAULT_TIMEOUT_SECONDS, write=10.0)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.get(PAGESPEED_ENDPOINT, params=params)
    except httpx.RequestError as exc:
        raise PageSpeedUnavailable(f"PageSpeed request failed: {exc}") from exc

    if response.status_code != 200:
        raise PageSpeedUnavailable(
            f"PageSpeed returned HTTP {response.status_code}: {response.text[:200]}"
        )

    data = response.json()
    if "error" in data:
        message = data["error"].get("message", "Unknown PageSpeed error")
        raise PageSpeedUnavailable(f"PageSpeed error: {message}")
    return data


# ---------- Parsers (Lighthouse response -> SEOAudit fields) ----------

def _audit_numeric(audits: Dict[str, Any], audit_id: str) -> Optional[float]:
    audit = audits.get(audit_id)
    if not audit:
        return None
    value = audit.get("numericValue")
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _category_score(lighthouse_result: Dict[str, Any], category: str) -> Optional[int]:
    cat = lighthouse_result.get("categories", {}).get(category)
    if not cat:
        return None
    score = cat.get("score")
    if score is None:
        return None
    return int(round(score * 100))


def extract_performance_metrics(lighthouse_result: Dict[str, Any]) -> Dict[str, float]:
    audits = lighthouse_result.get("audits", {})
    metrics: Dict[str, float] = {}

    fcp_ms = _audit_numeric(audits, "first-contentful-paint")
    lcp_ms = _audit_numeric(audits, "largest-contentful-paint")
    tti_ms = _audit_numeric(audits, "interactive")
    tbt_ms = _audit_numeric(audits, "total-blocking-time")
    si_ms = _audit_numeric(audits, "speed-index")
    cls = _audit_numeric(audits, "cumulative-layout-shift")

    if fcp_ms is not None:
        metrics["fcp"] = round(fcp_ms / 1000.0, 2)
    if lcp_ms is not None:
        metrics["lcp"] = round(lcp_ms / 1000.0, 2)
    if tti_ms is not None:
        metrics["tti"] = round(tti_ms / 1000.0, 2)
    if tbt_ms is not None:
        metrics["tbt"] = round(tbt_ms, 2)
    if si_ms is not None:
        metrics["speed_index"] = round(si_ms / 1000.0, 2)
    if cls is not None:
        metrics["cls"] = round(cls, 3)

    return metrics


def extract_issues_and_recommendations(
    lighthouse_result: Dict[str, Any],
    max_items: int = 8,
) -> Tuple[List[str], List[str]]:
    """Pick the highest-impact failed audits as issues + recommendations."""
    audits = lighthouse_result.get("audits", {})
    issues: List[str] = []
    recs: List[str] = []

    # Audits worth surfacing as recommendations (subset of Lighthouse opportunities/diagnostics)
    recommendable = {
        "unused-javascript",
        "unused-css-rules",
        "render-blocking-resources",
        "server-response-time",
        "uses-responsive-images",
        "uses-text-compression",
        "uses-optimized-images",
        "modern-image-formats",
        "efficient-animated-content",
        "uses-rel-preconnect",
        "uses-rel-preload",
        "font-display",
    }

    for audit_id, audit in audits.items():
        score = audit.get("score")
        title = audit.get("title")
        description = audit.get("description") or ""
        display = audit.get("displayValue")
        if score is None or title is None:
            continue
        # treat <1 binary or <0.9 numeric as a failure worth surfacing
        mode = audit.get("scoreDisplayMode")
        failed = (mode == "binary" and score < 1) or (mode != "binary" and isinstance(score, (int, float)) and score < 0.9)
        if not failed:
            continue
        prefix = f"{title}" + (f" ({display})" if display else "")
        if len(issues) < max_items:
            issues.append(prefix)
        if audit_id in recommendable and len(recs) < max_items:
            # Trim long Lighthouse descriptions (they often contain trailing learn-more links)
            short = description.split("[Learn")[0].strip()
            recs.append(f"{title}: {short}" if short else title)

    return issues, recs


def map_pagespeed_to_seo_audit(ps_data: Dict[str, Any]) -> Dict[str, Any]:
    """Map a PSI v5 response to SEOAudit-shaped fields.

    Returned dict keys (any may be None / empty if PSI didn't provide them):
      - performance_score: int 0..100
      - lighthouse_seo_score: int (informational; main SEO score still from our analyzer)
      - lighthouse_accessibility_score: int (informational)
      - lighthouse_best_practices_score: int
      - performance_metrics: dict
      - performance_issues: list[str]
      - performance_recommendations: list[str]
    """
    lighthouse_result = ps_data.get("lighthouseResult", {})
    issues, recs = extract_issues_and_recommendations(lighthouse_result)
    return {
        "performance_score": _category_score(lighthouse_result, "performance"),
        "lighthouse_seo_score": _category_score(lighthouse_result, "seo"),
        "lighthouse_accessibility_score": _category_score(lighthouse_result, "accessibility"),
        "lighthouse_best_practices_score": _category_score(lighthouse_result, "best-practices"),
        "performance_metrics": extract_performance_metrics(lighthouse_result),
        "performance_issues": issues,
        "performance_recommendations": recs,
    }
