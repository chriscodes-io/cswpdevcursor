"""ASGI entrypoint for uvicorn (Railway/Render) when service root is backend/."""

from pathlib import Path
import sys

_repo_root = Path(__file__).resolve().parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))

from backend.server import app  # noqa: F401
