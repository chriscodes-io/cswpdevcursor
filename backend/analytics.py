"""Analytics hook shim.

Mixpanel has been removed from this repo. This module remains so the API layer
can keep calling `track_event(...)` without breaking runtime behavior.
"""

from typing import Any, Dict, Optional


def track_event(
    distinct_id: str,
    event: str,
    properties: Optional[Dict[str, Any]] = None,
    *,
    insert_id: Optional[str] = None,
) -> None:
    # no-op
    _ = (distinct_id, event, properties, insert_id)
