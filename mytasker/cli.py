"""Command-line interface for MyTasker."""

from __future__ import annotations

import argparse
import sys
from typing import Sequence

from . import __version__
from .manager import TaskManager, TaskNotFoundError
from .models import Task, VALID_PRIORITIES

_PRIORITY_MARK = {"high": "!!", "medium": " !", "low": "  "}


def _format_task(task: Task) -> str:
    box = "[x]" if task.done else "[ ]"
    mark = _PRIORITY_MARK.get(task.priority, "  ")
    return f"{task.id:>3} {box} {mark} {task.title}"


def _print_tasks(tasks: list[Task]) -> None:
    if not tasks:
        print("No tasks found.")
        return
    for task in tasks:
        print(_format_task(task))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mytasker",
        description="MyTasker — a simple command-line task manager.",
    )
    parser.add_argument(
        "--version", action="version", version=f"%(prog)s {__version__}"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_add = sub.add_parser("add", help="Add a new task.")
    p_add.add_argument("title", help="What needs to be done.")
    p_add.add_argument(
        "-p",
        "--priority",
        choices=VALID_PRIORITIES,
        default="medium",
        help="Task priority (default: medium).",
    )

    p_list = sub.add_parser("list", help="List tasks.")
    group = p_list.add_mutually_exclusive_group()
    group.add_argument(
        "--pending", action="store_true", help="Show only pending tasks."
    )
    group.add_argument(
        "--completed", action="store_true", help="Show only completed tasks."
    )

    p_done = sub.add_parser("done", help="Mark a task as complete.")
    p_done.add_argument("id", type=int, help="Task id.")

    p_reopen = sub.add_parser("reopen", help="Reopen a completed task.")
    p_reopen.add_argument("id", type=int, help="Task id.")

    p_rm = sub.add_parser("remove", help="Delete a task.")
    p_rm.add_argument("id", type=int, help="Task id.")

    sub.add_parser("clear", help="Remove all completed tasks.")

    return parser


def main(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    manager = TaskManager()

    try:
        if args.command == "add":
            task = manager.add(args.title, priority=args.priority)
            print(f"Added task {task.id}: {task.title}")
        elif args.command == "list":
            if args.pending:
                _print_tasks(manager.pending())
            elif args.completed:
                _print_tasks(manager.completed())
            else:
                _print_tasks(manager.all())
        elif args.command == "done":
            task = manager.complete(args.id)
            print(f"Completed task {task.id}: {task.title}")
        elif args.command == "reopen":
            task = manager.reopen(args.id)
            print(f"Reopened task {task.id}: {task.title}")
        elif args.command == "remove":
            task = manager.remove(args.id)
            print(f"Removed task {task.id}: {task.title}")
        elif args.command == "clear":
            count = manager.clear_completed()
            print(f"Cleared {count} completed task(s).")
    except TaskNotFoundError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except ValueError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
