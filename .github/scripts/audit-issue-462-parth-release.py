import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SET_FILE = "data/discovery/sets/sets-04.json"
SET_ID = "set-parth-oza-garbe-ghoome-2023"
RELEASE_ID = "parth-oza-nonstop-garbe-ghoome-2023"
VIDEO_ID = "-Y8ueSkgvmA"


def read_json(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def write_json(relative, value):
    (ROOT / relative).write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def structured_count():
    index = read_json("data/discovery/sets/index.json")
    base = Path("data/discovery/sets")
    total = 0
    structured = 0
    for chunk in index["chunks"]:
        for row in read_json(str(base / chunk)).get("sets", []):
            total += 1
            if isinstance(row.get("categories"), list) and row["categories"]:
                structured += 1
    return total, structured


catalogue_index = read_json("data/catalogue/index.json")
matches = []
for relative in catalogue_index["releaseChunks"]:
    for release in read_json(relative):
        if release.get("id") == RELEASE_ID:
            matches.append((relative, release))

if len(matches) != 1:
    raise SystemExit(f"expected exactly one canonical {RELEASE_ID} release, found {len(matches)}")

release_file, release = matches[0]
categories = release.get("categories")
if not isinstance(categories, list) or not categories:
    raise SystemExit(f"{RELEASE_ID} has no canonical categories")
if release.get("originalReleaseYear") != 2023:
    raise SystemExit(f"{RELEASE_ID} has unexpected originalReleaseYear {release.get('originalReleaseYear')}")
if "garbe ghoome" not in str(release.get("title", "")).lower():
    raise SystemExit(f"{RELEASE_ID} title does not match Garbe Ghoome: {release.get('title')}")
artist_text = str(release.get("artist", "")).lower()
if "parth oza" not in artist_text or "maulik mehta" not in artist_text:
    raise SystemExit(f"{RELEASE_ID} artist identity does not match 2023 set: {release.get('artist')}")

sets_data = read_json(SET_FILE)
rows = [row for row in sets_data.get("sets", []) if row.get("id") == SET_ID]
if len(rows) != 1:
    raise SystemExit(f"expected exactly one {SET_ID} discovery row, found {len(rows)}")
row = rows[0]
if row.get("linkedReleaseId") != RELEASE_ID:
    raise SystemExit(f"{SET_ID} linkedReleaseId changed: {row.get('linkedReleaseId')}")
source = row.get("source") or {}
if source.get("provider") != "youtube" or source.get("videoId") != VIDEO_ID:
    raise SystemExit(f"{SET_ID} listening identity changed: {source}")
existing = row.get("categories")
if existing not in (None, [], categories):
    raise SystemExit(f"{SET_ID} already has conflicting categories: {existing}")

total_before, structured_before = structured_count()
if total_before != 84 or structured_before != 47:
    raise SystemExit(f"unexpected taxonomy baseline: total={total_before}, structured={structured_before}")

row["categories"] = list(categories)
write_json(SET_FILE, sets_data)

total_after, structured_after = structured_count()
if total_after != 84 or structured_after != 48:
    raise SystemExit(f"unexpected taxonomy result: total={total_after}, structured={structured_after}")

print(f"✓ canonical 2023 Parth release resolved in {release_file}")
print(f"✓ title: {release.get('title')}")
print(f"✓ artist: {release.get('artist')}")
print(f"✓ categories: {categories}")
print("✓ preserved official YouTube master -Y8ueSkgvmA")
print("✓ structured browse metadata: 47 -> 48; fallback: 37 -> 36")
