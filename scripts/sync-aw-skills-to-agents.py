#!/usr/bin/env python3
from __future__ import annotations

import os
import re
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE_DIR = REPO_ROOT / "skills"
TARGET_DIR = REPO_ROOT / ".agents" / "skills"
BRAND_COLOR = "#0F766E"


def parse_frontmatter(skill_file: Path) -> tuple[str, str]:
    text = skill_file.read_text(encoding="utf-8")
    match = re.match(r"(?s)^---\n(.*?)\n---\n", text)
    frontmatter = match.group(1) if match else ""

    name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
    desc_match = re.search(r"^description:\s*(.+)$", frontmatter, re.MULTILINE)

    name = name_match.group(1).strip().strip('"').strip("'") if name_match else skill_file.parent.name
    description = (
        desc_match.group(1).strip().strip('"').strip("'")
        if desc_match
        else f"Use the {name} skill when its trigger applies."
    )
    return name, description


def to_display_name(skill_name: str, folder_name: str) -> str:
    label = skill_name.split(":")[-1].replace("-", " ").strip() or folder_name.replace("-", " ").strip()
    return " ".join(part.capitalize() for part in label.split())


def ensure_symlink(link_path: Path, target_path: Path) -> None:
    relative_target = Path(os.path.relpath(target_path, link_path.parent))
    if link_path.is_symlink():
        if link_path.readlink() == relative_target:
            return
        link_path.unlink()
    elif link_path.exists():
        link_path.unlink()

    link_path.symlink_to(relative_target)


def main() -> None:
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    synced: list[str] = []

    for skill_dir in sorted(path for path in SOURCE_DIR.iterdir() if path.is_dir()):
        skill_file = skill_dir / "SKILL.md"
        if not skill_file.exists():
            continue

        skill_name, description = parse_frontmatter(skill_file)
        display_name = to_display_name(skill_name, skill_dir.name)

        target_skill_dir = TARGET_DIR / skill_dir.name
        target_agents_dir = target_skill_dir / "agents"
        target_agents_dir.mkdir(parents=True, exist_ok=True)

        ensure_symlink(target_skill_dir / "SKILL.md", skill_file)

        metadata = (
            "interface:\n"
            f'  display_name: "{display_name}"\n'
            f'  short_description: "{description.replace(chr(34), chr(39))}"\n'
            f'  brand_color: "{BRAND_COLOR}"\n'
            f'  default_prompt: "Use the {skill_name} skill when its trigger applies."\n'
            "policy:\n"
            "  allow_implicit_invocation: true\n"
        )
        (target_agents_dir / "openai.yaml").write_text(metadata, encoding="utf-8")
        synced.append(skill_dir.name)

    print(f"Synced {len(synced)} skills into {TARGET_DIR}")
    for name in synced:
        print(name)


if __name__ == "__main__":
    main()
