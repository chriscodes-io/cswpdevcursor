"""Agiled Public API client for CRM data (contacts, projects, etc.)."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Optional
from urllib.parse import quote, unquote

import httpx
from dotenv import load_dotenv

_env_dir = Path(__file__).parent
load_dotenv(_env_dir / ".env")
load_dotenv(_env_dir / ".env.local", override=True)
# Reuse the Agiled service credentials when backend/.env.local has no AGILED_* keys.
load_dotenv(_env_dir.parent / "services/agiled/.env", override=False)

AGILED_API_BASE_URL = os.getenv(
    "AGILED_API_BASE_URL", "https://api.agiled.ai/public/v1"
).rstrip("/")
AGILED_API_KEY = os.getenv("AGILED_API_KEY", "").strip()


class AgiledError(Exception):
    def __init__(self, message: str, status_code: int = 500, payload: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.payload = payload


_SAFE_PATH_SEGMENT = re.compile(r"^[A-Za-z0-9_-]+$")


def _safe_path_segment(value: str, label: str = "id") -> str:
    """Reject path separators/traversal before interpolating IDs into Agiled URLs."""
    if not isinstance(value, str) or not value:
        raise AgiledError(f"Invalid {label}", 400)
    try:
        decoded = unquote(value)
    except Exception as exc:  # pragma: no cover - unquote rarely raises
        raise AgiledError(f"Invalid {label}", 400) from exc
    if not _SAFE_PATH_SEGMENT.fullmatch(decoded):
        raise AgiledError(f"Invalid {label}", 400)
    return quote(decoded, safe="")


def is_configured() -> bool:
    return bool(AGILED_API_KEY)


async def _request(
    method: str,
    path: str,
    *,
    params: Optional[dict[str, Any]] = None,
    json_body: Optional[dict[str, Any]] = None,
    idempotency_key: Optional[str] = None,
) -> Any:
    if not AGILED_API_KEY:
        raise AgiledError("AGILED_API_KEY is not configured", 503)

    headers = {
        "Authorization": f"Bearer {AGILED_API_KEY}",
        "Accept": "application/json",
    }
    if json_body is not None:
        headers["Content-Type"] = "application/json"
    if idempotency_key:
        headers["Idempotency-Key"] = idempotency_key

    url = f"{AGILED_API_BASE_URL}{path}"
    timeout = httpx.Timeout(30.0, connect=10.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            response = await client.request(
                method,
                url,
                headers=headers,
                params=params,
                json=json_body,
            )
        except httpx.RequestError as exc:
            raise AgiledError(f"Agiled API unreachable: {exc}", 502) from exc

    if response.status_code >= 400:
        payload: Any
        try:
            payload = response.json()
        except ValueError:
            payload = response.text
        raise AgiledError(
            f"Agiled API {method} {path} failed with {response.status_code}",
            response.status_code,
            payload,
        )

    if response.status_code == 204 or not response.content:
        return None
    return response.json()


async def get_me() -> dict[str, Any]:
    return await _request("GET", "/me")


async def list_contacts(
    page: int = 1, per_page: int = 100, **query: Any
) -> dict[str, Any]:
    params = {"page": page, "per_page": per_page, **query}
    return await _request("GET", "/contacts", params=params)


async def get_contact(contact_id: str) -> dict[str, Any]:
    return await _request("GET", f"/contacts/{_safe_path_segment(contact_id, 'contact_id')}")


async def create_contact(body: dict[str, Any], idempotency_key: Optional[str] = None) -> dict[str, Any]:
    return await _request("POST", "/contacts", json_body=body, idempotency_key=idempotency_key)


async def update_contact(contact_id: str, body: dict[str, Any]) -> dict[str, Any]:
    return await _request(
        "PATCH",
        f"/contacts/{_safe_path_segment(contact_id, 'contact_id')}",
        json_body=body,
    )


async def list_projects(
    page: int = 1, per_page: int = 100, **query: Any
) -> dict[str, Any]:
    params = {"page": page, "per_page": per_page, **query}
    return await _request("GET", "/projects", params=params)


async def get_project(project_id: str) -> dict[str, Any]:
    return await _request("GET", f"/projects/{_safe_path_segment(project_id, 'project_id')}")


async def create_project(body: dict[str, Any], idempotency_key: Optional[str] = None) -> dict[str, Any]:
    return await _request("POST", "/projects", json_body=body, idempotency_key=idempotency_key)


async def update_project(project_id: str, body: dict[str, Any]) -> dict[str, Any]:
    return await _request(
        "PATCH",
        f"/projects/{_safe_path_segment(project_id, 'project_id')}",
        json_body=body,
    )


async def delete_project(project_id: str) -> dict[str, Any]:
    return await _request("DELETE", f"/projects/{_safe_path_segment(project_id, 'project_id')}")


_APP_TO_AGILED_STATUS = {
    "active": "active",
    "completed": "completed",
    "on-hold": "planning",
}

_AGILED_TO_APP_STATUS = {
    "planning": "active",
    "in_progress": "active",
    "active": "active",
    "completed": "completed",
    "on_hold": "on-hold",
    "cancelled": "on-hold",
}


def parse_agiled_datetime(value: Optional[str]) -> Optional[str]:
    """Normalize Agiled date strings to ISO-8601."""
    if not value:
        return None

    from datetime import datetime, timezone

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).replace(tzinfo=timezone.utc).isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).isoformat()
    except ValueError:
        return value


def format_agiled_date(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    return value.split("T")[0]


def project_to_app(
    project: dict[str, Any],
    meta: Optional[dict[str, str]] = None,
) -> dict[str, Any]:
    status = _AGILED_TO_APP_STATUS.get((project.get("status") or "planning").lower(), "active")
    meta = meta or {}

    return {
        "id": str(project.get("id")),
        "name": project.get("name") or "Untitled project",
        "client_id": meta.get("client_id") or "",
        "type": meta.get("type") or "seo",
        "status": status,
        "start_date": parse_agiled_datetime(project.get("start_date")),
        "deadline": parse_agiled_datetime(project.get("end_date")),
        "budget": project.get("budget"),
        "description": project.get("description"),
        "created_at": parse_agiled_datetime(project.get("created_at")) or datetime_now_iso(),
    }


def project_create_to_agiled(body: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "name": body.get("name"),
        "description": body.get("description"),
        "budget": body.get("budget"),
        "status": _APP_TO_AGILED_STATUS.get(body.get("status", "active"), "active"),
    }
    if body.get("client_id"):
        payload["client_id"] = body["client_id"]
    if body.get("start_date"):
        payload["start_date"] = format_agiled_date(body["start_date"])
    if body.get("deadline"):
        payload["end_date"] = format_agiled_date(body["deadline"])
    return {key: value for key, value in payload.items() if value not in (None, "")}


def project_update_to_agiled(body: dict[str, Any]) -> dict[str, Any]:
    payload: dict[str, Any] = {}
    if "name" in body and body["name"] is not None:
        payload["name"] = body["name"]
    if "description" in body and body["description"] is not None:
        payload["description"] = body["description"]
    if "budget" in body and body["budget"] is not None:
        payload["budget"] = body["budget"]
    if "status" in body and body["status"] is not None:
        payload["status"] = _APP_TO_AGILED_STATUS.get(body["status"], "active")
    if "start_date" in body and body["start_date"] is not None:
        payload["start_date"] = format_agiled_date(body["start_date"])
    if "deadline" in body and body["deadline"] is not None:
        payload["end_date"] = format_agiled_date(body["deadline"])
    return payload


def contact_to_client(contact: dict[str, Any]) -> dict[str, Any]:
    """Map an Agiled contact record to the app's Client shape."""
    first = (contact.get("first_name") or "").strip()
    last = (contact.get("last_name") or "").strip()
    name = (contact.get("name") or f"{first} {last}".strip() or contact.get("email") or "Unknown").strip()

    company = contact.get("company_name") or contact.get("company")
    if not company and isinstance(contact.get("account"), dict):
        company = contact["account"].get("name")

    created_at = contact.get("created_at") or datetime_now_iso()

    return {
        "id": str(contact.get("id")),
        "name": name,
        "email": (contact.get("email") or "").lower(),
        "phone": contact.get("phone") or contact.get("mobile"),
        "company": company,
        "website": contact.get("website"),
        "status": "active" if contact.get("status") in (None, "active", "Active") else "inactive",
        "notes": contact.get("notes") or contact.get("description"),
        "created_at": created_at,
    }


def client_create_to_contact(body: dict[str, Any]) -> dict[str, Any]:
    """Map ClientCreate payload to Agiled contact fields."""
    name = body.get("name", "").strip()
    parts = name.split(None, 1)
    payload: dict[str, Any] = {
        "email": body.get("email"),
        "phone": body.get("phone"),
        "company_name": body.get("company"),
        "website": body.get("website"),
        "notes": body.get("notes"),
    }
    if len(parts) == 2:
        payload["first_name"] = parts[0]
        payload["last_name"] = parts[1]
    else:
        payload["first_name"] = name
    return {key: value for key, value in payload.items() if value not in (None, "")}


def datetime_now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).isoformat()
