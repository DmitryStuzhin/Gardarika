#!/usr/bin/env python3
"""Generate a calculator HTML entry that loads a chosen project module."""
from __future__ import annotations
import argparse, html as html_lib, json, re
from pathlib import Path

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec")
    parser.add_argument("--template", required=True)
    parser.add_argument("--project-module", required=True)
    parser.add_argument("--adapter-module")
    parser.add_argument("--output", required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    name = spec["project"]["name"]
    if spec["project"].get("geometryMode") == "custom-adapter" and not args.adapter_module:
        parser.error("custom-adapter requires --adapter-module; refusing standard-engine fallback")
    html = Path(args.template).read_text(encoding="utf-8")
    html = re.sub(r"<title>.*?</title>", f"<title>{html_lib.escape(name)} — Калькулятор V2 · Гардарика</title>", html, count=1, flags=re.S)
    html, count = re.subn(r'<script src="v2/(?:projects/)?[^"/]+\.js"></script>\s*(?=<script src="v2/geometry-engine\.js")', f'<script src="{args.project_module}"></script>\n  ', html, count=1)
    if count != 1: raise SystemExit("project module script tag was not found in template")
    if args.adapter_module:
        marker = '  <script src="v2/geometry-engine.js"></script>'
        if marker not in html: raise SystemExit("geometry engine script marker was not found")
        html = html.replace(marker, f'  <script src="{args.adapter_module}"></script>\n{marker}', 1)
    output = Path(args.output).expanduser()
    if output.exists() and not args.force: parser.error("output exists; use --force to replace it")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(output)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
