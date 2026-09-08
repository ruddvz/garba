import json
from collections import defaultdict
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[2]
SETS_ROOT = ROOT / "data" / "discovery" / "sets"

TARGETS = [
    {
        "shard": "sets-04.json",
        "setId": "set-dhara-rankar-2025",
        "videoId": "F0pzEoxowzM",
        "releaseId": "dhara-rankar-2025",
    },
    {
        "shard": "sets-05.json",
        "setId": "set-kirtidan-tahukar-10-2022",
        "videoId": "Pm0Yt_iuURw",
        "releaseId": "tahukar-10-kirtidan-gadhvi-2022",
    },
]
FALGUNI_SET_ID = "set-falguni-nonstop-garba-2022"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def youtube_id(url):
    if not isinstance(url, str) or not url:
        return None
    parsed = urlparse(url)
    host = parsed.netloc.lower().split(":")[0]
    if host in {"youtu.be", "www.youtu.be"}:
        return parsed.path.strip("/").split("/")[0] or None
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}:
        if parsed.path == "/watch":
            values = parse_qs(parsed.query).get("v", [])
            return values[0] if values else None
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) >= 2 and parts[0] in {"embed", "shorts", "live"}:
            return parts[1]
    return None


def inventory():
    index = load(SETS_ROOT / "index.json")
    rows = []
    for chunk in index["chunks"]:
        rows.extend(load(SETS_ROOT / chunk)["sets"])
    structured = sum(bool(row.get("categories")) for row in rows)
    return len(rows), structured, len(rows) - structured


def find_set(payload, set_id):
    matches = [row for row in payload["sets"] if row.get("id") == set_id]
    if len(matches) != 1:
        raise SystemExit(f"expected one set {set_id}, found {len(matches)}")
    return matches[0]


before = inventory()
if before != (84, 64, 20):
    raise SystemExit(f"baseline drift: expected (84, 64, 20), got {before}")

catalogue_index = load(ROOT / "data" / "catalogue" / "index.json")
retired = set(catalogue_index.get("retiredReleaseIds", []))
release_by_id = {}
video_to_release_ids = defaultdict(set)
for chunk in catalogue_index.get("releaseChunks", []):
    for release in load(ROOT / chunk):
        rid = release.get("id")
        if not rid:
            continue
        if rid in release_by_id:
            raise SystemExit(f"duplicate canonical release id: {rid}")
        release_by_id[rid] = release
        if rid in retired:
            continue
        for source in release.get("sources") or []:
            if not isinstance(source, dict):
                continue
            url = source.get("url") or source.get("sourceUrl")
            vid = source.get("videoId") or youtube_id(url)
            if vid:
                video_to_release_ids[vid].add(rid)

sets05_before = load(SETS_ROOT / "sets-05.json")
falguni_before = json.loads(json.dumps(find_set(sets05_before, FALGUNI_SET_ID), sort_keys=True))
if falguni_before.get("categories"):
    raise SystemExit("Falguni exclusion baseline changed: categories already present")

for target in TARGETS:
    release_id = target["releaseId"]
    video_id = target["videoId"]
    if release_id in retired:
        raise SystemExit(f"target canonical release is retired: {release_id}")
    exact_matches = sorted(video_to_release_ids.get(video_id, set()))
    if exact_matches != [release_id]:
        raise SystemExit(f"exact source identity drift for {target['setId']}: {video_id} -> {exact_matches}")

    release = release_by_id.get(release_id)
    if not release:
        raise SystemExit(f"canonical release missing: {release_id}")
    categories = release.get("categories")
    if not isinstance(categories, list) or not categories or not all(isinstance(x, str) and x for x in categories):
        raise SystemExit(f"canonical categories invalid: {release_id}")

    path = SETS_ROOT / target["shard"]
    payload = load(path)
    row = find_set(payload, target["setId"])
    source = row.get("source") if isinstance(row.get("source"), dict) else {}
    if source.get("videoId") != video_id:
        raise SystemExit(f"discovery video drift for {target['setId']}: {source.get('videoId')}")
    if row.get("categories"):
        raise SystemExit(f"target already has categories: {target['setId']}")

    text = path.read_text(encoding="utf-8")
    anchor = f'"videoId":"{video_id}","url":"https://www.youtube.com/watch?v={video_id}","embeddable":true}},"linkedReleaseId":null,'
    replacement = anchor + f'"categories":{json.dumps(categories, separators=(",", ":"))},'
    if text.count(anchor) != 1:
        raise SystemExit(f"expected one exact insertion anchor for {target['setId']}, found {text.count(anchor)}")
    path.write_text(text.replace(anchor, replacement, 1), encoding="utf-8")

    updated = load(path)
    updated_row = find_set(updated, target["setId"])
    if updated_row.get("categories") != categories:
        raise SystemExit(f"category copy mismatch for {target['setId']}")
    print(f"{target['setId']}: {categories}")

sets05_after = load(SETS_ROOT / "sets-05.json")
falguni_after = json.loads(json.dumps(find_set(sets05_after, FALGUNI_SET_ID), sort_keys=True))
if falguni_after != falguni_before:
    raise SystemExit("Falguni exclusion violated: set-falguni-nonstop-garba-2022 changed")

after = inventory()
if after != (84, 66, 18):
    raise SystemExit(f"unexpected taxonomy result: expected (84, 66, 18), got {after}")

print(f"taxonomy inventory: {before} -> {after}")
print("Falguni exclusion: unchanged")
