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

_mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017/")
_db_name = os.environ.get("DB_NAME", "seo_project_manager")

_client = AsyncIOMotorClient(
    _mongo_url,
    serverSelectionTimeoutMS=1500,
    connectTimeoutMS=1500,
    socketTimeoutMS=1500,
)
db = _client[_db_name]


async def ping_db() -> bool:
    """Return True when MongoDB accepts a ping."""
    try:
        await _client.admin.command("ping")
        return True
    except Exception:
        return False


async def ensure_indexes():
	"""Create the indexes used by the app's most common query paths."""
	await db.users.create_index("email")
	await db.user_sessions.create_index("session_token")
	await db.user_sessions.create_index("user_id")
	await db.password_reset_tokens.create_index("token_hash", unique=True)
	await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
	await db.project_meta.create_index("project_id", unique=True)
	await db.project_meta.create_index("client_id")

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
