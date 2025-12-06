"""
Utility script to find the UUIDs of levels that satisfy a custom condition.
Update the `satisfy` predicate to describe the levels you are looking for.
"""

import argparse
import json
from pathlib import Path
from typing import Callable, Iterable, List, Optional, Sequence

DEFAULT_SEARCH_DIR = Path("/mnt/c/Users/Rayzh/Downloads")


def satisfy(level_map: dict) -> bool:
    """Return True if the provided level metadata matches the search criteria."""
    return "solated" in level_map["meta"]["name"].lower()


def load_level_map(file_path: Path) -> dict:
    with file_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def iter_level_files(directory: Path) -> Iterable[Path]:
    if not directory.exists():
        raise FileNotFoundError(f"{directory} does not exist")
    return directory.glob("*.json")


def find_matching_levels(directory: Path, predicate: Callable[[dict], bool]) -> List[str]:
    matches: List[str] = []
    for level_file in iter_level_files(directory):
        level_map = load_level_map(level_file)
        if predicate(level_map):
            matches.append(level_map["meta"]["levelId"])
    return matches


def parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Search through a directory of JSON level files."
    )
    parser.add_argument(
        "directory",
        nargs="?",
        type=Path,
        default=DEFAULT_SEARCH_DIR,
        help=f"Directory containing JSON levels (default: {DEFAULT_SEARCH_DIR})",
    )
    return parser.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> None:
    args = parse_args(argv)
    matching_levels = find_matching_levels(args.directory, satisfy)
    print(matching_levels)


if __name__ == "__main__":
    main()
