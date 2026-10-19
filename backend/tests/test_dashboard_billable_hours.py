"""Regression: dashboard billable-hours sum must tolerate null actual_hours.

Task.model_dump() writes actual_hours=None on create. Mongo $exists matches
that null, and dict.get('actual_hours', 0) still returns None — a raw sum()
TypeErrors and 500s GET /dashboard/stats.

Run with:  python -m pytest backend/tests/test_dashboard_billable_hours.py -v
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from backend.server import _sum_billable_hours  # noqa: E402


def test_sum_ignores_null_actual_hours():
    tasks = [
        {"actual_hours": None},
        {"actual_hours": 2.5},
        {"actual_hours": 1},
        {},
    ]
    assert _sum_billable_hours(tasks) == 3.5


def test_sum_empty_and_all_null():
    assert _sum_billable_hours([]) == 0.0
    assert _sum_billable_hours([{"actual_hours": None}, {}]) == 0.0


def test_sum_skips_non_numeric_hours():
    tasks = [{"actual_hours": "not-a-number"}, {"actual_hours": 4}]
    assert _sum_billable_hours(tasks) == 4.0
