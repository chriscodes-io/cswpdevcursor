#!/usr/bin/env python3
"""Import local dev auth users and project metadata into MongoDB Atlas."""

from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / "backend" / ".env")
load_dotenv(ROOT / "backend" / ".env.local", override=True)

from backend.db import db, ping_db  # noqa: E402


async def migrate_users(dry_run: bool) -> int:
    users_file = ROOT / "backend" / "data" / "dev_users.json"
    if not users_file.exists():
        print("No dev_users.json found — skipping user import.")
        return 0

    users = json.loads(users_file.read_text(encoding="utf-8"))
    imported = 0
    for user in users:
        email = user.get("email")
        if not email:
            continue
        existing = await db.users.find_one({"email": email}, {"_id": 0, "id": 1})
        if existing:
            print(f"skip user (exists): {email}")
            continue
        if dry_run:
            print(f"would import user: {email}")
        else:
            await db.users.insert_one(user)
            print(f"imported user: {email}")
        imported += 1
    return imported


async def migrate_project_meta(dry_run: bool) -> int:
    meta_file = ROOT / "backend" / "data" / "project_meta.json"
    if not meta_file.exists():
        print("No project_meta.json found — skipping project metadata import.")
        return 0

    payload = json.loads(meta_file.read_text(encoding="utf-8"))
    imported = 0
    for project_id, values in payload.items():
        record = {
            "project_id": project_id,
            "client_id": values.get("client_id", ""),
            "type": values.get("type", "seo"),
        }
        if dry_run:
            print(f"would import project meta: {project_id}")
        else:
            await db.project_meta.update_one(
                {"project_id": project_id},
                {"$set": record},
                upsert=True,
            )
            print(f"imported project meta: {project_id}")
        imported += 1
    return imported


async def main() -> int:
    parser = argparse.ArgumentParser(description="Migrate local dev data into MongoDB Atlas")
    parser.add_argument("--dry-run", action="store_true", help="Print actions without writing")
    args = parser.parse_args()

    if not await ping_db():
        print("MongoDB is not reachable. Set MONGO_URL in backend/.env.local first.")
        return 1

    print("Connected to MongoDB.")
    users = await migrate_users(args.dry_run)
    meta = await migrate_project_meta(args.dry_run)
    print(f"Done. users={users}, project_meta={meta}")
    if not args.dry_run:
        print("Set DEV_AUTH_FALLBACK=false in backend/.env.local for production auth.")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
