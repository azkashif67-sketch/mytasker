# MyTasker

A simple, dependency-free command-line task manager written in Python. Add
tasks, set priorities, mark them done, and keep track of what's left — all from
your terminal, with data stored in a plain JSON file.

## Features

- Add tasks with `low` / `medium` / `high` priority
- List all, pending, or completed tasks
- Complete, reopen, and remove tasks
- Clear out completed tasks in one command
- Human-readable JSON storage, atomically written so it won't corrupt
- No third-party runtime dependencies — just the Python standard library

## Requirements

- Python 3.9 or newer

## Installation

Clone the repository and install it (a virtual environment is recommended):

```bash
git clone https://github.com/azkashif67-sketch/mytasker.git
cd mytasker
pip install -e .
```

This installs the `mytasker` command. You can also run it without installing:

```bash
python -m mytasker --help
```

## Usage

```bash
# Add tasks
mytasker add "Write the quarterly report" --priority high
mytasker add "Water the plants" -p low

# List tasks
mytasker list              # everything
mytasker list --pending    # only unfinished
mytasker list --completed  # only finished

# Update tasks
mytasker done 1            # mark task 1 complete
mytasker reopen 1          # mark it pending again
mytasker remove 2          # delete task 2
mytasker clear             # remove all completed tasks
```

Example list output (priority shown as `!!` for high, ` !` for medium):

```
  1 [ ] !! Write the quarterly report
  2 [x]    Water the plants
```

## Data storage

Tasks are stored in `~/.mytasker/tasks.json` by default. Set the
`MYTASKER_STORE` environment variable to use a different location:

```bash
export MYTASKER_STORE=/path/to/my/tasks.json
```

## Development

Install the development dependencies and run the test suite:

```bash
pip install -e ".[dev]"
pytest
```

## Project layout

```
mytasker/
├── __init__.py     # package metadata / version
├── __main__.py     # enables `python -m mytasker`
├── models.py       # Task dataclass
├── storage.py      # JSON persistence
├── manager.py      # core task operations
└── cli.py          # argparse command-line interface
tests/
└── test_mytasker.py
```

## License

Released under the [MIT License](LICENSE).
