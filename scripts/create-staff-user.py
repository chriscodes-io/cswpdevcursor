#!/usr/bin/env python3
"""Create a staff user in MongoDB when public registration is disabled."""

from __future__ import annotations

import argparse
import asyncio
import getpass
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

load_dotenv(ROOT / "backend" / ".env")
load_dotenv(ROOT / "backend" / ".env.local", override=True)

from backend.auth import hash_password  # noqa: E402
from backend.db import db, ping_db  # noqa: E402
from backend.models import User  # noqa: E402


async def create_staff_user(email: str, name: str, password: str) -> None:
    if not await ping_db():
        print("MongoDB is not reachable. Set MONGO_URL in backend/.env.local and try again.", file=sys.stderr)
        sys.exit(1)

    normalized = email.lower().strip()
    existing = await db.users.find_one({"email": normalized}, {"_id": 0, "id": 1})
    if existing:
        print(f"User already exists: {normalized}", file=sys.stderr)
        sys.exit(1)

    user = User(email=normalized, name=name.strip(), password_hash=hash_password(password))
    doc = user.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.users.insert_one(doc)
    print(f"Created staff user: {normalized} ({user.id})")


def main() -> None:
    parser = argparse.ArgumentParser(description="Create a staff user in MongoDB Atlas.")
    parser.add_argument("--email", required=True, help="Staff email address")
    parser.add_argument("--name", required=True, help="Display name")
    parser.add_argument(
        "--password",
        help="Password (min 6 chars). Prompts securely if omitted.",
    )
    args = parser.parse_args()

    password = args.password or getpass.getpass("Password: ")
    if len(password) < 6:
        print("Password must be at least 6 characters.", file=sys.stderr)
        sys.exit(1)

    asyncio.run(create_staff_user(args.email, args.name, password))


if __name__ == "__main__":
    main()
