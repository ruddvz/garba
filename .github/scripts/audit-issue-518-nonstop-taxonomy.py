import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SETS_ROOT = ROOT / "data" / "discovery" / "sets"

TARGETS = [
    ("sets-17-trupti-kaushal.json", "set-pop-skope-dandiya-2-2023", "pop-skope-dandiya-2-2023"),
    ("sets-19-ramzat-2017.json", "set-ramzat-2017-official-jukebox", "ramzat-2017"),
    ("sets-20-ramzat-2-2018.json", "set-ramzat-2-2018-official-jukebox", "ramzat-2-tran-taali-2018"),
    ("sets-21-rangtaali-2017.json", "set-rangtaali-2017-official-jukebox", "rangtaali-2017"),
]


def read_json(path):
    return json.loads(path.read_text())


def inventory():
    index = read_json(SETS_ROOT / "index.json")
    sets = []
    for chunk in index["chunks"]:
        sets.extend(read_json(SETS_ROOT / chunk)["sets"])
    structured = sum(bool(item.get("categories")) for item in sets)
    return len(sets), structured, len(sets) - structured


def release_map():
    releases = []
    for name in ("releases-03.json", "releases-42-trupti-kaushal-rajesh.json"):
        releases.extend(read_json(ROOT / "data" / "catalogue" / "releases" / name))
    by_id = {}
    for release in releases:
        rid = release["id"]
        if rid in by_id:
            raise SystemExit(f"duplicate canonical release id: {rid}")
        by_id[rid] = release
    return by_id


before = inventory()
if before != (84, 60, 24):
    raise SystemExit(f"baseline drift: expected (84, 60, 24), got {before}")

catalogue_index = read_json(ROOT / "data" / "catalogue" / "index.json")
retired = set(catalogue_index.get("retiredReleaseIds", []))
releases = release_map()

for filename, set_id, release_id in TARGETS:
    if release_id in retired:
        raise SystemExit(f"linked release is retired: {release_id}")
    release = releases.get(release_id)
    if not release:
        raise SystemExit(f"canonical release not found: {release_id}")
    categories = release.get("categories")
    if not isinstance(categories, list) or not categories or not all(isinstance(x, str) and x for x in categories):
        raise SystemExit(f"canonical release has invalid categories: {release_id}")

    path = SETS_ROOT / filename
    payload = read_json(path)
    matches = [item for item in payload["sets"] if item.get("id") == set_id]
    if len(matches) != 1:
        raise SystemExit(f"expected one discovery record for {set_id}, found {len(matches)}")
    item = matches[0]
    if item.get("linkedReleaseId") != release_id:
        raise SystemExit(f"linked release drift for {set_id}: {item.get('linkedReleaseId')}")
    if item.get("categories"):
        raise SystemExit(f"target already has categories: {set_id}")

    text = path.read_text()
    if "\n" not in text.strip():
        old = f'"linkedReleaseId":"{release_id}",'
        new = f'"linkedReleaseId":"{release_id}","categories":{json.dumps(categories, separators=(",", ":"))},'
    else:
        old = f'      "linkedReleaseId": "{release_id}",\n'
        new = old + f'      "categories": {json.dumps(categories, separators=(",", ":"))},\n'
    if text.count(old) != 1:
        raise SystemExit(f"could not locate one textual insertion point for {set_id}")
    path.write_text(text.replace(old, new, 1))

    updated = read_json(path)
    updated_item = next(item for item in updated["sets"] if item["id"] == set_id)
    if updated_item.get("categories") != categories:
        raise SystemExit(f"category copy mismatch for {set_id}")
    print(f"{set_id}: {categories}")

after = inventory()
if after != (84, 64, 20):
    raise SystemExit(f"unexpected result: expected (84, 64, 20), got {after}")

print(f"taxonomy inventory: {before} -> {after}")
