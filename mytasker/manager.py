"""Core task-management operations, independent of any UI."""

from __future__ import annotations

from .models import Task, VALID_PRIORITIES
from .storage import TaskStore


class TaskNotFoundError(LookupError):
    """Raised when an operation references a task id that does not exist."""


class TaskManager:
    """High-level API for creating, querying, and mutating tasks."""

    def __init__(self, store: TaskStore | None = None) -> None:
        self.store = store or TaskStore()
        self._tasks: list[Task] = self.store.load()

    # -- queries -----------------------------------------------------------
    def all(self) -> list[Task]:
        return list(self._tasks)

    def pending(self) -> list[Task]:
        return [t for t in self._tasks if not t.done]

    def completed(self) -> list[Task]:
        return [t for t in self._tasks if t.done]

    def get(self, task_id: int) -> Task:
        for task in self._tasks:
            if task.id == task_id:
                return task
        raise TaskNotFoundError(f"No task with id {task_id}.")

    # -- mutations ---------------------------------------------------------
    def add(self, title: str, priority: str = "medium") -> Task:
        task = Task(
            id=self.store.next_id(self._tasks),
            title=title,
            priority=priority,
        )
        self._tasks.append(task)
        self._persist()
        return task

    def complete(self, task_id: int) -> Task:
        task = self.get(task_id)
        task.mark_done()
        self._persist()
        return task

    def reopen(self, task_id: int) -> Task:
        task = self.get(task_id)
        task.mark_undone()
        self._persist()
        return task

    def remove(self, task_id: int) -> Task:
        task = self.get(task_id)
        self._tasks.remove(task)
        self._persist()
        return task

    def clear_completed(self) -> int:
        done = self.completed()
        self._tasks = self.pending()
        self._persist()
        return len(done)

    def _persist(self) -> None:
        self.store.save(self._tasks)


__all__ = ["TaskManager", "TaskNotFoundError", "VALID_PRIORITIES"]
