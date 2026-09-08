#!/usr/bin/env python3
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SETS_DIR = ROOT / "data" / "discovery" / "sets"
SETS_INDEX_PATH = SETS_DIR / "index.json"
CATALOGUE_INDEX_PATH = ROOT / "data" / "catalogue" / "index.json"
MAX_UPDATES = 12
EXPECTED_TOTAL = 84
EXPECTED_FALLBACK = 36


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_compact_json(path: Path, value):
    path.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def discovery_rows(payload, label):
    if isinstance(payload, list):
        return payload, "array"
    if isinstance(payload, dict) and isinstance(payload.get("sets"), list):
        return payload["sets"], "wrapped"
    raise SystemExit(f"Discovery chunk has unsupported shape: {label}")


def has_categories(record):
    categories = record.get("categories")
    return isinstance(categories, list) and len(categories) > 0


def insert_categories_after_link(record, categories):
    updated = {}
    inserted = False
    for key, value in record.items():
        updated[key] = value
        if key == "linkedReleaseId":
            updated["categories"] = list(categories)
            inserted = True
    if not inserted:
        updated["categories"] = list(categories)
    return updated


sets_index = load_json(SETS_INDEX_PATH)
catalogue_index = load_json(CATALOGUE_INDEX_PATH)

release_by_id = {}
for release_path_text in catalogue_index.get("releaseChunks", []):
    release_path = ROOT / release_path_text
    releases = load_json(release_path)
    if not isinstance(releases, list):
        raise SystemExit(f"Release chunk is not an array: {release_path_text}")
    for release in releases:
        release_id = release.get("id")
        if not release_id:
            raise SystemExit(f"Release without id in {release_path_text}")
        if release_id in release_by_id:
            raise SystemExit(f"Duplicate active release id: {release_id}")
        release_by_id[release_id] = (release, release_path_text)

retired_release_ids = set(catalogue_index.get("retiredReleaseIds", []))

chunk_rows = []
all_sets = []
for chunk_name in sets_index.get("chunks", []):
    chunk_path = SETS_DIR / chunk_name
    payload = load_json(chunk_path)
    rows, shape = discovery_rows(payload, chunk_name)
    chunk_rows.append((chunk_name, chunk_path, payload, rows, shape))
    for row_index, record in enumerate(rows):
        all_sets.append((chunk_name, row_index, record))

fallback = [entry for entry in all_sets if not has_categories(entry[2])]
structured = len(all_sets) - len(fallback)

if len(all_sets) != EXPECTED_TOTAL or len(fallback) != EXPECTED_FALLBACK:
    raise SystemExit(
        "Baseline drift: expected "
        f"{EXPECTED_TOTAL} total / {EXPECTED_FALLBACK} fallback, got "
        f"{len(all_sets)} total / {len(fallback)} fallback. Refresh main and re-audit."
    )

print(f"✓ baseline: {structured} structured / {len(fallback)} fallback / {len(all_sets)} total")
print("\nRemaining fallback inventory:")

candidates = []
for chunk_name, row_index, record in fallback:
    set_id = record.get("id", f"<row-{row_index}>")
    linked_release_id = record.get("linkedReleaseId")
    status = ""
    categories = None
    release_path_text = None

    if not linked_release_id:
        status = "no-linked-release"
    elif linked_release_id in retired_release_ids:
        status = "linked-release-retired"
    elif linked_release_id not in release_by_id:
        status = "linked-release-missing"
    else:
        release, release_path_text = release_by_id[linked_release_id]
        release_categories = release.get("categories")
        if not isinstance(release_categories, list) or not release_categories:
            status = "linked-release-has-no-categories"
        elif not all(isinstance(category, str) and category for category in release_categories):
            raise SystemExit(
                f"Invalid canonical categories on release {linked_release_id}: {release_categories!r}"
            )
        else:
            status = "exact-linked-release-candidate"
            categories = list(release_categories)
            candidates.append(
                {
                    "chunk": chunk_name,
                    "row_index": row_index,
                    "set_id": set_id,
                    "linked_release_id": linked_release_id,
                    "release_path": release_path_text,
                    "categories": categories,
                }
            )

    category_text = f" categories={categories}" if categories else ""
    release_text = f" release={linked_release_id}" if linked_release_id else ""
    print(f"- {chunk_name} :: {set_id} :: {status}{release_text}{category_text}")

print(f"\nExact linked-release candidates: {len(candidates)}")
if not candidates:
    raise SystemExit("No exact linked-release taxonomy candidates remain; do not manufacture a patch.")

selected = candidates[:MAX_UPDATES]
selected_keys = {(item["chunk"], item["row_index"]): item for item in selected}
changed_paths = []

for chunk_name, chunk_path, payload, rows, shape in chunk_rows:
    changed = False
    updated_rows = list(rows)
    for row_index, record in enumerate(rows):
        selected_item = selected_keys.get((chunk_name, row_index))
        if not selected_item:
            continue
        if has_categories(record):
            raise SystemExit(f"Selected set became structured unexpectedly: {selected_item['set_id']}")
        if record.get("linkedReleaseId") != selected_item["linked_release_id"]:
            raise SystemExit(f"Linked release drift for {selected_item['set_id']}")
        updated_rows[row_index] = insert_categories_after_link(record, selected_item["categories"])
        changed = True
    if changed:
        if shape == "array":
            updated_payload = updated_rows
        else:
            updated_payload = dict(payload)
            updated_payload["sets"] = updated_rows
        write_compact_json(chunk_path, updated_payload)
        changed_paths.append(chunk_name)

# Re-load and prove the exact copied taxonomy after writing.
after_sets = []
for chunk_name in sets_index.get("chunks", []):
    payload = load_json(SETS_DIR / chunk_name)
    rows, _ = discovery_rows(payload, chunk_name)
    for row_index, record in enumerate(rows):
        after_sets.append((chunk_name, row_index, record))

after_by_location = {(chunk, row_index): record for chunk, row_index, record in after_sets}
for item in selected:
    record = after_by_location[(item["chunk"], item["row_index"])]
    if record.get("categories") != item["categories"]:
        raise SystemExit(
            f"Category copy mismatch for {item['set_id']}: "
            f"{record.get('categories')} != {item['categories']}"
        )

after_fallback = sum(1 for _, _, record in after_sets if not has_categories(record))
expected_after_fallback = EXPECTED_FALLBACK - len(selected)
if after_fallback != expected_after_fallback:
    raise SystemExit(
        f"Unexpected fallback count after patch: {after_fallback}; expected {expected_after_fallback}"
    )

print("\nSelected exact linked-release backfills:")
for item in selected:
    print(
        f"- {item['set_id']} -> {item['linked_release_id']} "
        f"{item['categories']} ({item['release_path']})"
    )
print(f"\n✓ changed discovery shards: {', '.join(changed_paths)}")
print(
    f"✓ structured browse metadata: {structured} -> {structured + len(selected)}; "
    f"fallback: {EXPECTED_FALLBACK} -> {after_fallback}"
)
