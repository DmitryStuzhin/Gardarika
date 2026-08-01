#!/usr/bin/env python3
"""Generate a GardarikaV2 browser project module from HouseSpec."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

IMPORT_ONLY = {"schemaVersion", "evidence", "visual", "importMeta"}

def runtime_project(spec):
    identity = spec["project"]
    project = {"id": identity["id"], "name": identity["name"], "version": spec["schemaVersion"], "units": "m", "geometryMode": identity["geometryMode"]}
    if identity.get("geometryAdapter"): project["geometryAdapter"] = identity["geometryAdapter"]
    for key, value in spec.items():
        if key not in IMPORT_ONLY | {"project"}: project[key] = value
    project["visual"] = spec.get("visual", {})
    return project

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec")
    parser.add_argument("--output", required=True)
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()
    spec = json.loads(sys.stdin.read() if args.spec == "-" else Path(args.spec).read_text(encoding="utf-8"))
    project = runtime_project(spec)
    encoded = json.dumps(project, ensure_ascii=False, indent=2)
    js = f'''(function (root) {{
  "use strict";
  var G = root.GardarikaV2 = root.GardarikaV2 || {{}};
  var project = {encoded};
  G.projects = G.projects || {{}};
  G.projects[project.id] = project;
  G.originalProject = project;
  G.cloneProject = function () {{ return JSON.parse(JSON.stringify(G.originalProject)); }};
}})(window);
'''
    output = Path(args.output).expanduser()
    if output.exists() and not args.force: parser.error("output exists; use --force to replace it")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(js, encoding="utf-8")
    print(output)
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
