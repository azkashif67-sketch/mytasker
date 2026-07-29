"""Tests for MyTasker core and CLI."""

from __future__ import annotations

import json

import pytest

from mytasker.cli import main
from mytasker.manager import TaskManager, TaskNotFoundError
from mytasker.models import Task
from mytasker.storage import TaskStore


@pytest.fixture
def store_path(tmp_path):
    return tmp_path / "tasks.json"


@pytest.fixture
def manager(store_path):
    return TaskManager(store=TaskStore(store_path))


# -- model -----------------------------------------------------------------
def test_task_requires_title():
    with pytest.raises(ValueError):
        Task(id=1, title="   ")


def test_task_rejects_bad_priority():
    with pytest.raises(ValueError):
        Task(id=1, title="x", priority="urgent")


def test_task_roundtrip():
    task = Task(id=1, title="write tests", priority="high")
    assert Task.from_dict(task.to_dict()) == task


def test_mark_done_sets_timestamp():
    task = Task(id=1, title="ship")
    assert task.completed_at is None
    task.mark_done()
    assert task.done is True
    assert task.completed_at is not None


# -- manager ---------------------------------------------------------------
def test_add_and_get(manager):
    task = manager.add("buy milk", priority="low")
    assert task.id == 1
    assert manager.get(1).title == "buy milk"


def test_ids_increment(manager):
    a = manager.add("a")
    b = manager.add("b")
    assert (a.id, b.id) == (1, 2)


def test_complete_and_reopen(manager):
    manager.add("task")
    manager.complete(1)
    assert manager.get(1).done is True
    assert manager.completed() and not manager.pending()
    manager.reopen(1)
    assert manager.get(1).done is False


def test_remove(manager):
    manager.add("task")
    manager.remove(1)
    assert manager.all() == []


def test_missing_task_raises(manager):
    with pytest.raises(TaskNotFoundError):
        manager.complete(99)


def test_clear_completed(manager):
    manager.add("a")
    manager.add("b")
    manager.complete(1)
    removed = manager.clear_completed()
    assert removed == 1
    assert len(manager.pending()) == 1


def test_persistence_across_instances(store_path):
    TaskManager(store=TaskStore(store_path)).add("persist me")
    reloaded = TaskManager(store=TaskStore(store_path))
    assert reloaded.get(1).title == "persist me"


def test_next_id_uses_max_plus_one(manager):
    manager.add("a")
    manager.add("b")
    manager.remove(1)  # removing a lower id does not affect the next id
    assert manager.add("c").id == 3


# -- storage ---------------------------------------------------------------
def test_store_writes_valid_json(store_path):
    store = TaskStore(store_path)
    store.save([Task(id=1, title="x")])
    data = json.loads(store_path.read_text())
    assert data[0]["title"] == "x"


def test_load_missing_file_returns_empty(store_path):
    assert TaskStore(store_path).load() == []


# -- cli -------------------------------------------------------------------
def test_cli_add_and_list(monkeypatch, store_path, capsys):
    monkeypatch.setenv("MYTASKER_STORE", str(store_path))
    assert main(["add", "hello", "-p", "high"]) == 0
    assert main(["list"]) == 0
    out = capsys.readouterr().out
    assert "hello" in out


def test_cli_done_missing_returns_error(monkeypatch, store_path):
    monkeypatch.setenv("MYTASKER_STORE", str(store_path))
    assert main(["done", "42"]) == 1
