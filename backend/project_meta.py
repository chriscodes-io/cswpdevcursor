"""App-specific project fields Agiled does not return (client_id, type)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from .db import db, ping_db

_DATA_DIR = Path(__file__).parent / "data"
_META_FILE = _DATA_DIR / "project_meta.json"


def _file_fallback_allowed() -> bool:
    """File-backed meta is for local DEV_AUTH only.

    Production (DEV_AUTH_FALLBACK=false) must not silently write CRM linkage to
    an ephemeral disk — JWT auth still works when Mongo is down, so a file
    fallback would orphan project→client links after a dyno restart.
    """
    return os.getenv("DEV_AUTH_FALLBACK", "true").lower() in ("1", "true", "yes")


def _require_storage() -> None:
    raise RuntimeError(
        "MongoDB unavailable for project_meta and DEV_AUTH_FALLBACK is disabled"
    )


def _load_file_meta() -> dict[str, dict[str, str]]:
    if not _META_FILE.exists():
        return {}
    with _META_FILE.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, dict) else {}


def _save_file_meta(meta: dict[str, dict[str, str]]) -> None:
    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    with _META_FILE.open("w", encoding="utf-8") as handle:
        json.dump(meta, handle, indent=2)


async def get_meta(project_id: str) -> Optional[dict[str, str]]:
    if await ping_db():
        doc = await db.project_meta.find_one({"project_id": project_id}, {"_id": 0})
        if not doc:
            return None
        return {"client_id": doc.get("client_id", ""), "type": doc.get("type", "seo")}

    if _file_fallback_allowed():
        return _load_file_meta().get(project_id)

    _require_storage()


async def get_meta_map(project_ids: list[str]) -> dict[str, dict[str, str]]:
    if not project_ids:
        return {}

    if await ping_db():
        cursor = db.project_meta.find(
            {"project_id": {"$in": project_ids}},
            {"_id": 0},
        )
        docs = await cursor.to_list(len(project_ids))
        return {
            doc["project_id"]: {
                "client_id": doc.get("client_id", ""),
                "type": doc.get("type", "seo"),
            }
            for doc in docs
        }

    if _file_fallback_allowed():
        file_meta = _load_file_meta()
        return {
            project_id: file_meta[project_id]
            for project_id in project_ids
            if project_id in file_meta
        }

    _require_storage()


async def list_ids_for_client(client_id: str) -> list[str]:
    """Return project_ids linked to client_id (meta is the source of truth)."""
    if not client_id:
        return []

    if await ping_db():
        cursor = db.project_meta.find(
            {"client_id": client_id},
            {"_id": 0, "project_id": 1},
        )
        docs = await cursor.to_list(10000)
        return [doc["project_id"] for doc in docs if doc.get("project_id")]

    if _file_fallback_allowed():
        return [
            project_id
            for project_id, values in _load_file_meta().items()
            if values.get("client_id") == client_id
        ]

    _require_storage()


async def save_meta(project_id: str, client_id: str, project_type: str) -> None:
    record = {
        "project_id": project_id,
        "client_id": client_id,
        "type": project_type,
    }

    if await ping_db():
        await db.project_meta.update_one(
            {"project_id": project_id},
            {"$set": record},
            upsert=True,
        )
        return

    if _file_fallback_allowed():
        meta = _load_file_meta()
        meta[project_id] = {"client_id": client_id, "type": project_type}
        _save_file_meta(meta)
        return

    _require_storage()


async def delete_meta(project_id: str) -> None:
    if await ping_db():
        await db.project_meta.delete_one({"project_id": project_id})
        return

    if _file_fallback_allowed():
        meta = _load_file_meta()
        if project_id in meta:
            del meta[project_id]
            _save_file_meta(meta)
        return

    _require_storage()


async def export_all() -> list[dict[str, Any]]:
    if await ping_db():
        return await db.project_meta.find({}, {"_id": 0}).to_list(10000)

    if _file_fallback_allowed():
        return [
            {"project_id": project_id, **values}
            for project_id, values in _load_file_meta().items()
        ]

    _require_storage()
