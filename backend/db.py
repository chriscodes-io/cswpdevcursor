"""Single MongoDB client/db shared by server.py and auth.py."""

import os
from pathlib import Path
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load env BEFORE building the client (db.py may be imported before server.py
# gets a chance to call load_dotenv). Secrets belong in .env.local (gitignored).
_env_dir = Path(__file__).parent
load_dotenv(_env_dir / ".env")
load_dotenv(_env_dir / ".env.local", override=True)

_client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = _client[os.environ["DB_NAME"]]


async def ensure_indexes():
	"""Create the indexes used by the app's most common query paths."""
	await db.users.create_index("email")
	await db.user_sessions.create_index("session_token")
	await db.user_sessions.create_index("user_id")

	for coll in ("users", "clients", "projects", "tasks", "seo_audits"):
		await db[coll].create_index("id", unique=True)

	await db.clients.create_index("email")
	await db.projects.create_index("client_id")
	await db.projects.create_index("status")
	await db.tasks.create_index("project_id")
	await db.tasks.create_index("status")

	await db.seo_audits.create_index([("project_id", 1), ("audit_date", -1)])
	await db.seo_audits.create_index("audit_date")
	await db.payment_transactions.create_index([("project_id", 1), ("created_at", -1)])
	await db.payment_transactions.create_index("session_id")
	await db.contact_messages.create_index([("created_at", -1)])
