"""Data model for a single task."""

from __future__ import annotations

from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any

VALID_PRIORITIES = ("low", "medium", "high")


def _utcnow() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class Task:
    """A single to-do item."""

    id: int
    title: str
    done: bool = False
    priority: str = "medium"
    created_at: str = field(default_factory=_utcnow)
    completed_at: str | None = None

    def __post_init__(self) -> None:
        if not self.title or not self.title.strip():
            raise ValueError("Task title must not be empty.")
        self.title = self.title.strip()
        if self.priority not in VALID_PRIORITIES:
            raise ValueError(
                f"Priority must be one of {VALID_PRIORITIES}, got {self.priority!r}."
            )

    def mark_done(self) -> None:
        if not self.done:
            self.done = True
            self.completed_at = _utcnow()

    def mark_undone(self) -> None:
        self.done = False
        self.completed_at = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Task":
        return cls(
            id=int(data["id"]),
            title=data["title"],
            done=bool(data.get("done", False)),
            priority=data.get("priority", "medium"),
            created_at=data.get("created_at", _utcnow()),
            completed_at=data.get("completed_at"),
        )
