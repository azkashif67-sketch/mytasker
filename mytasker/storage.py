"""JSON-backed persistence for tasks."""

from __future__ import annotations

import json
import os
from pathlib import Path

from .models import Task


def default_store_path() -> Path:
    """Return the default location of the task store.

    Honors the ``MYTASKER_STORE`` environment variable so tests and power
    users can redirect it; otherwise falls back to ``~/.mytasker/tasks.json``.
    """
    env = os.environ.get("MYTASKER_STORE")
    if env:
        return Path(env)
    return Path.home() / ".mytasker" / "tasks.json"


class TaskStore:
    """Loads and saves a collection of :class:`Task` objects to a JSON file."""

    def __init__(self, path: Path | str | None = None) -> None:
        self.path = Path(path) if path is not None else default_store_path()

    def load(self) -> list[Task]:
        if not self.path.exists():
            return []
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError) as exc:
            raise RuntimeError(f"Could not read task store at {self.path}: {exc}") from exc
        return [Task.from_dict(item) for item in raw]

    def save(self, tasks: list[Task]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = json.dumps([t.to_dict() for t in tasks], indent=2)
        # Write atomically to avoid corrupting the store on interruption.
        tmp = self.path.with_suffix(self.path.suffix + ".tmp")
        tmp.write_text(payload, encoding="utf-8")
        tmp.replace(self.path)

    def next_id(self, tasks: list[Task]) -> int:
        return (max((t.id for t in tasks), default=0)) + 1
