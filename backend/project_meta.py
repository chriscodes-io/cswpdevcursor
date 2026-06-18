"""App-specific project fields Agiled does not return (client_id, type)."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

from .db import db, ping_db

_DATA_DIR = Path(__file__).parent / "data"
_META_FILE = _DATA_DIR / "project_meta.json"


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

    return _load_file_meta().get(project_id)


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

    file_meta = _load_file_meta()
    return {project_id: file_meta[project_id] for project_id in project_ids if project_id in file_meta}


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

    meta = _load_file_meta()
    meta[project_id] = {"client_id": client_id, "type": project_type}
    _save_file_meta(meta)


async def delete_meta(project_id: str) -> None:
    if await ping_db():
        await db.project_meta.delete_one({"project_id": project_id})
        return

    meta = _load_file_meta()
    if project_id in meta:
        del meta[project_id]
        _save_file_meta(meta)


async def export_all() -> list[dict[str, Any]]:
    if await ping_db():
        return await db.project_meta.find({}, {"_id": 0}).to_list(10000)
    return [
        {"project_id": project_id, **values}
        for project_id, values in _load_file_meta().items()
    ]
