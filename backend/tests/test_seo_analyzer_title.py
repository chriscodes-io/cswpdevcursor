"""Regression: empty/mixed <title> tags must not crash SEOAnalyzer.

Tag.string is None when the title is empty or has mixed children, and
len(None) TypeError'd the whole POST /seo-audit path.

Run with:  python3 -m pytest backend/tests/test_seo_analyzer_title.py -v
"""

import asyncio
import os
import sys
from unittest.mock import patch

from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from wp_analyzers import SEOAnalyzer  # noqa: E402


def _analyze(html: str, url: str = "https://example.com/page"):
    soup = BeautifulSoup(html, "html.parser")
    with patch.object(SEOAnalyzer, "_check_url_exists", return_value=False):
        return asyncio.run(SEOAnalyzer.analyze(url, html, soup))


def test_empty_title_tag_does_not_crash():
    result = _analyze("<html><head><title></title></head><body></body></html>")
    assert result["details"]["title"] == ""
    assert result["details"]["title_length"] == 0
    assert "Missing page title" in result["issues"]
    assert isinstance(result["score"], int)


def test_nested_title_children_does_not_crash():
    result = _analyze(
        "<html><head><title>Hello <span>World</span></title></head><body></body></html>"
    )
    assert result["details"]["title"] == "Hello World"
    assert result["details"]["title_length"] == 11
    assert isinstance(result["score"], int)


def test_title_with_comment_does_not_crash():
    result = _analyze(
        "<html><head><title><!-- x -->Hello</title></head><body></body></html>"
    )
    assert result["details"]["title"] == "Hello"
    assert result["details"]["title_length"] == 5


def test_normal_title_still_extracted():
    result = _analyze(
        "<html><head><title>A reasonably sized page title here</title>"
        '<meta name="description" content="A reasonably sized meta description that is long enough to pass.">'
        "</head><body><h1>Hi</h1></body></html>"
    )
    assert result["details"]["title"] == "A reasonably sized page title here"
    assert result["details"]["title_length"] == 34
    assert "Missing page title" not in result["issues"]


def test_missing_title_tag_does_not_crash():
    result = _analyze("<html><head></head><body></body></html>")
    assert result["details"]["title"] == ""
    assert result["details"]["title_length"] == 0
    assert "Missing page title" in result["issues"]
