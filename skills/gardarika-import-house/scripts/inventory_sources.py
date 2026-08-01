#!/usr/bin/env python3
"""Create a deterministic inventory of architectural source files."""
from __future__ import annotations
import argparse, json, os, struct
from pathlib import Path

CATEGORIES = {
    "image": {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff", ".heic"},
    "pdf": {".pdf"},
    "cad": {".dwg", ".dxf", ".ifc", ".rvt", ".skp", ".obj", ".fbx", ".glb", ".gltf"},
    "document": {".doc", ".docx", ".xls", ".xlsx", ".txt", ".md"},
    "archive": {".zip", ".rar", ".7z", ".tar", ".gz"},
}

def category(ext: str) -> str:
    return next((name for name, exts in CATEGORIES.items() if ext in exts), "other")

def dimensions(path: Path):
    try:
        with path.open("rb") as fh:
            head = fh.read(24)
            if head.startswith(b"\x89PNG\r\n\x1a\n"):
                return list(struct.unpack(">II", head[16:24]))
        try:
            from PIL import Image
            with Image.open(path) as image:
                return list(image.size)
        except (ImportError, OSError):
            return None
    except OSError:
        return None

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_dir")
    parser.add_argument("--output")
    args = parser.parse_args()
    root = Path(args.source_dir).expanduser().resolve()
    if not root.is_dir():
        parser.error(f"source directory does not exist: {root}")
    files = []
    for path in sorted((p for p in root.rglob("*") if p.is_file()), key=lambda p: str(p).lower()):
        ext = path.suffix.lower()
        item = {"path": path.relative_to(root).as_posix(), "extension": ext, "category": category(ext), "bytes": path.stat().st_size}
        if item["category"] == "image":
            size = dimensions(path)
            if size: item["pixels"] = size
        files.append(item)
    counts = {}
    for item in files: counts[item["category"]] = counts.get(item["category"], 0) + 1
    payload = {"schemaVersion": 1, "sourceDir": str(root), "fileCount": len(files), "counts": counts, "files": files}
    encoded = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        output = Path(args.output).expanduser()
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(encoded, encoding="utf-8")
    else:
        print(encoded, end="")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
