#!/usr/bin/env python3
"""Create a new HouseSpec and source inventory from the bundled template."""
from __future__ import annotations
import argparse, json, re, subprocess, sys
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--id", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--source-dir", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", args.id):
        parser.error("--id must contain lowercase letters, digits, and internal hyphens")
    here = Path(__file__).resolve().parent
    template = here.parent / "assets" / "house-spec.template.json"
    output = Path(args.output).expanduser().resolve()
    source = Path(args.source_dir).expanduser().resolve()
    inventory = output.with_name(output.stem + ".inventory.json")
    if not args.force and (output.exists() or inventory.exists()):
        parser.error("output already exists; use --force to replace it")
    spec = json.loads(template.read_text(encoding="utf-8"))
    spec["project"].update({"id": args.id, "name": args.name, "sourceFolder": str(source)})
    spec["package"]["groups"][7]["options"][0]["name"] = f"Планировка {args.name}"
    spec["importMeta"]["inventoryFile"] = str(inventory)
    output.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run([sys.executable, str(here / "inventory_sources.py"), str(source), "--output", str(inventory)], check=False)
    if result.returncode: return result.returncode
    output.write_text(json.dumps(spec, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(output)
    print(inventory)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
