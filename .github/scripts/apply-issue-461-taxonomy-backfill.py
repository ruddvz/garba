import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

EXPECTED = {
    "set-aditya-ochhav-2023": (
        "data/discovery/sets/sets-01.json",
        "ochhav-aditya-gadhvi-2023",
        ["folk-lokgeet", "traditional-garba", "mataji-devotional", "krishna-garba"],
    ),
    "set-rutvi-ni-ramzat-2022": (
        "data/discovery/sets/sets-08-rutvi-pandya.json",
        "rutvi-ni-ramzat-nonstop-2022",
        ["modern-gujarati-garba"],
    ),
    "set-rutvi-ni-ramzat-2-0-2023": (
        "data/discovery/sets/sets-08-rutvi-pandya.json",
        "rutvi-ni-ramzat-2-0-nonstop-2023",
        ["modern-gujarati-garba"],
    ),
    "set-rutvi-ni-ramzat-3-0-2024": (
        "data/discovery/sets/sets-08-rutvi-pandya.json",
        "rutvi-ni-ramzat-3-0-nonstop-2024",
        ["modern-gujarati-garba"],
    ),
    "set-rutvi-ni-ramzat-4-0-2026": (
        "data/discovery/sets/sets-08-rutvi-pandya.json",
        "rutvi-ni-ramzat-4-0-nonstop-2026",
        ["modern-gujarati-garba"],
    ),
    "set-alpa-navratri3-2025": (
        "data/discovery/sets/sets-18-alpa-current.json",
        "alpa-navratri-3-3taali-continuous-2025",
        ["tran-taali", "modern-gujarati-garba"],
    ),
    "set-alpa-aayu-dasha-maa-2026": (
        "data/discovery/sets/sets-18-alpa-current.json",
        "alpa-aayu-dasha-maa-nu-vrat-2026",
        ["mataji-devotional", "modern-gujarati-garba"],
    ),
}


def read_json(relative):
    return json.loads((ROOT / relative).read_text(encoding="utf-8"))


def write_json(relative, value):
    (ROOT / relative).write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def load_releases():
    index = read_json("data/catalogue/index.json")
    releases = {}
    for relative in index["releaseChunks"]:
        for release in read_json(relative):
            release_id = release.get("id")
            if release_id in releases:
                raise SystemExit(f"duplicate release id while auditing issue 461: {release_id}")
            releases[release_id] = release
    return releases


def structured_count():
    set_index = read_json("data/discovery/sets/index.json")
    base = Path("data/discovery/sets")
    total = 0
    structured = 0
    for chunk in set_index["chunks"]:
        data = read_json(str(base / chunk))
        for row in data.get("sets", []):
            total += 1
            if isinstance(row.get("categories"), list) and row["categories"]:
                structured += 1
    return total, structured


releases = load_releases()
total_before, structured_before = structured_count()
if total_before != 84:
    raise SystemExit(f"expected 84 Nonstop discovery sets, found {total_before}")
if structured_before != 40:
    raise SystemExit(f"expected 40 structured sets before issue 461, found {structured_before}")

by_file = {}
for set_id, (relative, release_id, expected_categories) in EXPECTED.items():
    by_file.setdefault(relative, []).append((set_id, release_id, expected_categories))

for relative, rows in by_file.items():
    data = read_json(relative)
    sets = {row.get("id"): row for row in data.get("sets", [])}
    for set_id, release_id, expected_categories in rows:
        row = sets.get(set_id)
        if row is None:
            raise SystemExit(f"{relative} no longer contains expected set {set_id}")
        if row.get("linkedReleaseId") != release_id:
            raise SystemExit(
                f"{set_id} linkedReleaseId changed: expected {release_id}, got {row.get('linkedReleaseId')}"
            )
        release = releases.get(release_id)
        if release is None:
            raise SystemExit(f"{set_id} points to missing canonical release {release_id}")
        actual_categories = release.get("categories")
        if actual_categories != expected_categories:
            raise SystemExit(
                f"{release_id} canonical categories changed: expected {expected_categories}, got {actual_categories}"
            )
        existing = row.get("categories")
        if existing not in (None, [], expected_categories):
            raise SystemExit(f"{set_id} already has conflicting categories {existing}")
        row["categories"] = list(actual_categories)
    write_json(relative, data)

total_after, structured_after = structured_count()
if total_after != total_before:
    raise SystemExit(f"Nonstop set count changed unexpectedly: {total_before} -> {total_after}")
if structured_after != 47:
    raise SystemExit(f"expected 47 structured sets after issue 461, found {structured_after}")

print("✓ copied exact linked-release categories onto 7 Nonstop sets")
print(f"✓ structured browse metadata: {structured_before} -> {structured_after}")
print(f"✓ legacy fallback sets: {total_before - structured_before} -> {total_after - structured_after}")
