"""Server-side Mixpanel tracking (optional — requires MIXPANEL_TOKEN in env)."""

import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_mp = None


def is_configured() -> bool:
    return bool(os.environ.get("MIXPANEL_TOKEN"))


def _client():
    global _mp
    if _mp is None and is_configured():
        from mixpanel import Mixpanel

        _mp = Mixpanel(os.environ["MIXPANEL_TOKEN"])
    return _mp


def track_event(
    distinct_id: str,
    event: str,
    properties: Optional[Dict[str, Any]] = None,
    *,
    insert_id: Optional[str] = None,
) -> None:
    """Fire-and-forget server event. Never raises to callers."""
    mp = _client()
    if not mp or not distinct_id:
        return

    props = dict(properties or {})
    props["platform"] = props.get("platform", "server")
    if insert_id:
        props["$insert_id"] = insert_id

    try:
        mp.track(distinct_id, event, props)
    except Exception as exc:
        logger.warning("Mixpanel track failed for %s: %s", event, exc)
