#!/usr/bin/env python3
"""Validate HouseSpec structure, geometry constraints, and package contract."""
from __future__ import annotations
import argparse, json, math, re, sys
from pathlib import Path

GROUPS = {"foundation", "walls", "slab", "roofCover", "facade", "windows", "engineering", "layout", "interior", "terrace"}
CONFIDENCE = {"published", "measured", "traced", "inferred", "illustrative"}
STANDARD_OPTIONS = {"foundation":{"slab","strip","piles"},"walls":{"aerated","arbolit","frame"},"slab":{"concrete","beams"},"roofCover":{"ceramic","soft","metal"},"facade":{"clinker","plaster","prepared"},"windows":{"premium","standard"},"engineering":{"full","basic","later"},"layout":{"original","custom"},"interior":{"turnkey","prefinish","shell"},"terrace":{"full","base","later"}}

def positive(value): return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0

def validate(spec, strict=False, base_dir=None):
    errors, warnings = [], []
    def err(path, message): errors.append({"path": path, "message": message})
    def warn(path, message): warnings.append({"path": path, "message": message})
    if spec.get("schemaVersion") != 1: err("schemaVersion", "must equal 1")
    project = spec.get("project", {})
    if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(project.get("id", ""))): err("project.id", "must be kebab-case")
    if not project.get("name"): err("project.name", "is required")
    mode = project.get("geometryMode")
    if mode not in {"rect-gable-2level", "custom-adapter"}: err("project.geometryMode", "must be rect-gable-2level or custom-adapter")
    if mode == "custom-adapter" and not project.get("geometryAdapter"): err("project.geometryAdapter", "is required for custom-adapter")
    if mode == "custom-adapter" and not project.get("adapterModule"): err("project.adapterModule", "is required for custom-adapter")
    if strict and mode == "custom-adapter" and project.get("adapterModule") and base_dir and not Path(project["adapterModule"]).expanduser().is_file() and not (base_dir / project["adapterModule"]).is_file(): err("project.adapterModule", "file does not exist")
    if mode == "custom-adapter":
        geometry=spec.get("geometry") or {}
        for key in ("footprintPolygons","volumes","wallSegments","roofFaces","levelElevations"):
            if not geometry.get(key): err("geometry."+key, "is required and cannot be empty for custom-adapter")
    source, structure = spec.get("source", {}), spec.get("structure", {})
    for key in ("usefulArea", "footprintArea", "roofArea", "totalHeight"):
        if not positive(source.get(key)): err(f"source.{key}", "must be positive")
    fp = source.get("footprint", [])
    if len(fp) != 2 or not all(positive(v) for v in fp): err("source.footprint", "must contain positive width and length")
    elif positive(source.get("footprintArea")):
        delta = abs(fp[0] * fp[1] - source["footprintArea"]) / source["footprintArea"]
        if mode == "rect-gable-2level" and delta > .02: err("source.footprintArea", "must match rectangular footprint product within 2%")
        elif mode != "rect-gable-2level" and delta > .08: warn("source.footprintArea", "differs from custom bounding-box product")
    for key in ("exteriorWall", "partition", "groundWallHeight", "slab", "plinth"):
        if not positive(structure.get(key)): err(f"structure.{key}", "must be positive")
    if mode == "rect-gable-2level":
        for key in ("kneeWall", "roofPitch", "roofOverhangSide", "roofOverhangGable"):
            if not positive(structure.get(key)): err(f"structure.{key}", "must be positive for standard geometry")
        pitch = structure.get("roofPitch", 0)
        if not 5 < pitch < 75: err("structure.roofPitch", "must be between 5 and 75 degrees")
        if isinstance(source.get("roofPitch"),(int,float)) and abs(source["roofPitch"]-pitch)>.01: err("source.roofPitch", "must equal structure.roofPitch")
    confidence = source.get("confidence", {})
    for key in ("footprint", "roofPitch", "totalHeight", "openings", "partitions", "kneeWall"):
        if confidence.get(key) not in CONFIDENCE: (err if strict else warn)(f"source.confidence.{key}", "needs an evidence class")
    levels = spec.get("levels", [])
    level_ids = [level.get("id") for level in levels]
    if mode == "rect-gable-2level" and level_ids != ["ground", "mansard"]: err("levels", "standard engine requires ordered ground and mansard levels")
    for li, level in enumerate(levels):
        if not isinstance(level.get("elevation"), (int, float)): err(f"levels[{li}].elevation", "must be numeric")
        for pi, segment in enumerate(level.get("partitions", [])):
            if len(segment) != 4 or not all(isinstance(v, (int, float)) for v in segment): err(f"levels[{li}].partitions[{pi}]", "must be [x1,z1,x2,z2]")
        for ri, room in enumerate(level.get("rooms", [])):
            room_box=room.get("box",[])
            if len(room_box)!=4 or not all(isinstance(v,(int,float)) for v in room_box) or not positive(room_box[2]) or not positive(room_box[3]): err(f"levels[{li}].rooms[{ri}].box", "must be [minX,minZ,width,depth]")
        if strict and mode == "rect-gable-2level":
            for key in ("adaptedPartitions","interiorDoors","furniture"):
                if key not in level: err(f"levels[{li}].{key}", "must be explicitly supplied for reusable standard geometry")
            if not level.get("rooms"): err(f"levels[{li}].rooms", "must describe the plan")
            if not level.get("adaptedPartitions"): err(f"levels[{li}].adaptedPartitions", "must contain an explicit alternative layout")
            if not level.get("interiorDoors"): err(f"levels[{li}].interiorDoors", "must contain interior doors")
            if not level.get("furniture"): err(f"levels[{li}].furniture", "must contain the intended warm interior visualization")
    stair = spec.get("stairVoid", {})
    if not positive(stair.get("width")) or not positive(stair.get("depth")): err("stairVoid", "width and depth must be positive")
    if len(fp) == 2 and all(positive(v) for v in fp) and positive(stair.get("width")) and positive(stair.get("depth")):
        if abs(stair.get("x", 0)) + stair["width"] / 2 >= fp[0] / 2 or abs(stair.get("z", 0)) + stair["depth"] / 2 >= fp[1] / 2: err("stairVoid", "must fit inside footprint")
    staircase=spec.get("staircase",{})
    if mode == "rect-gable-2level":
        for key in ("steps","rise","run","width"):
            if not positive(staircase.get(key)): err("staircase."+key, "must be positive")
        if len(levels)>1 and positive(staircase.get("steps")) and positive(staircase.get("rise")):
            target=levels[1].get("elevation",0)-levels[0].get("elevation",0)
            if abs(staircase["steps"]*staircase["rise"]-target)>.08: err("staircase", "steps × rise must reach the upper-floor elevation within 80 mm")
        if len(fp)==2 and all(positive(v) for v in fp) and positive(structure.get("roofPitch")) and positive(structure.get("kneeWall")) and len(levels)>1:
            apex=levels[1].get("elevation",0)+structure["kneeWall"]+fp[0]/2*math.tan(math.radians(structure["roofPitch"]))
            if positive(source.get("totalHeight")) and abs(apex-source["totalHeight"])>.15: err("source.totalHeight", "differs from calculated roof apex by more than 150 mm")
    openings = spec.get("openings", [])
    by_wall = {}
    for i, opening in enumerate(openings):
        path = f"openings[{i}]"
        if opening.get("level") not in level_ids: err(path + ".level", "references unknown level")
        wall = opening.get("wall")
        if mode == "rect-gable-2level" and wall not in {"front", "back", "left", "right"}: err(path + ".wall", "must be a standard wall id")
        if mode == "custom-adapter" and (not isinstance(wall,str) or not wall or not positive(opening.get("wallLength"))): err(path + ".wall", "custom opening needs a wall segment id and positive wallLength")
        for key in ("width", "height"):
            if not positive(opening.get(key)): err(path + "." + key, "must be positive")
        if not isinstance(opening.get("center"), (int, float)) or not isinstance(opening.get("sill"), (int, float)): err(path, "center and sill must be numeric")
        if positive(opening.get("width")) and ((wall in {"front", "back", "left", "right"} and len(fp) == 2 and all(positive(v) for v in fp)) or positive(opening.get("wallLength"))):
            length = opening.get("wallLength") or (fp[0] if wall in {"front", "back"} else fp[1])
            if abs(opening.get("center", 0)) + opening["width"] / 2 > length / 2 - .38: err(path, "needs at least 380 mm from wall end")
        by_wall.setdefault((opening.get("level"), wall), []).append((i, opening))
        if mode == "rect-gable-2level" and opening.get("level") == "mansard" and wall in {"front", "back"} and len(fp) == 2 and all(positive(v) for v in fp):
            edge = max(abs(opening.get("center", 0) - opening.get("width", 0)/2), abs(opening.get("center", 0) + opening.get("width", 0)/2))
            available = structure.get("kneeWall", 0) + (fp[0]/2-edge)*math.tan(math.radians(structure.get("roofPitch", 0)))
            if opening.get("sill", 0) + opening.get("height", 0) > available - .08: err(path, "intersects gable roof clearance")
    for items in by_wall.values():
        items.sort(key=lambda item: item[1].get("center", 0))
        for (ia, a), (ib, b) in zip(items, items[1:]):
            gap = b.get("center", 0) - b.get("width", 0)/2 - (a.get("center", 0) + a.get("width", 0)/2)
            if gap < .3: err(f"openings[{ia}],openings[{ib}]", "need 300 mm pier between openings")
    package = spec.get("package", {})
    if package.get("pricingStatus") not in {"approved", "illustrative", "missing"}: err("package.pricingStatus", "must be approved, illustrative, or missing")
    if strict and package.get("pricingStatus") == "missing": err("package.pricingStatus", "cannot be missing in strict mode")
    if strict and package.get("pricingStatus") != "missing" and not positive(package.get("cataloguePrice")): err("package.cataloguePrice", "must be positive in strict mode")
    groups = package.get("groups", [])
    ids = {g.get("id") for g in groups}
    if ids != GROUPS: err("package.groups", "must contain the exact 10 required group ids")
    defaults = package.get("defaults", {})
    for gi, group in enumerate(groups):
        opts = group.get("options", [])
        if len(opts) < 2: err(f"package.groups[{gi}].options", "needs at least two options")
        option_ids = {o.get("id") for o in opts}
        if mode == "rect-gable-2level" and group.get("id") in STANDARD_OPTIONS and not option_ids.issubset(STANDARD_OPTIONS[group["id"]]): err(f"package.groups[{gi}].options", "contains option ids unsupported by the standard engine")
        if defaults.get(group.get("id")) not in option_ids: err(f"package.defaults.{group.get('id')}", "must select an existing option")
        for oi, option in enumerate(opts):
            opath = f"package.groups[{gi}].options[{oi}]"
            if not option.get("visual"): err(opath + ".visual", "must name the visible 3D change")
            if not isinstance(option.get("price"), (int, float)): err(opath + ".price", "must be numeric")
    if strict and not openings: err("openings", "at least one exterior opening is required")
    if strict and not any(level.get("partitions") for level in levels): err("levels.partitions", "at least one partition is required")
    if strict:
        evidence=spec.get("evidence",{})
        for key in ("plans","facades","sections","roofPlans"):
            if not evidence.get(key): err("evidence."+key, "must list at least one source file")
        source_folder=Path(project.get("sourceFolder") or base_dir or ".").expanduser()
        for key, items in evidence.items():
            for index, item in enumerate(items or []):
                rel=item.get("path") if isinstance(item,dict) else item
                if not rel or not (source_folder / rel).is_file(): err(f"evidence.{key}[{index}]", "source file does not exist")
        inventory=(spec.get("importMeta") or {}).get("inventoryFile")
        if not inventory: err("importMeta.inventoryFile", "is required")
        elif base_dir and not Path(inventory).expanduser().is_file() and not (base_dir / inventory).is_file(): err("importMeta.inventoryFile", "file does not exist")
        if mode == "rect-gable-2level" and not any((spec.get("exteriorDetails") or {}).values()): err("exteriorDetails", "must contain project-specific exterior primitives")
    return {"valid": not errors, "errors": errors, "warnings": warnings, "checks": 12}

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("spec")
    parser.add_argument("--strict", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    spec = json.loads(sys.stdin.read() if args.spec == "-" else Path(args.spec).read_text(encoding="utf-8"))
    result = validate(spec, args.strict, None if args.spec == "-" else Path(args.spec).resolve().parent)
    if args.json: print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("VALID" if result["valid"] else "INVALID")
        for item in result["errors"]: print(f"ERROR {item['path']}: {item['message']}")
        for item in result["warnings"]: print(f"WARN  {item['path']}: {item['message']}")
    return 0 if result["valid"] else 1

if __name__ == "__main__":
    raise SystemExit(main())
