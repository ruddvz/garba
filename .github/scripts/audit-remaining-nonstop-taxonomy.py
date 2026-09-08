import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[2]
SETS_ROOT = ROOT / "data" / "discovery" / "sets"
CATALOGUE_INDEX = ROOT / "data" / "catalogue" / "index.json"


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def youtube_id_from_url(url):
    if not isinstance(url, str) or not url:
        return None
    try:
        parsed = urlparse(url)
    except ValueError:
        return None
    host = parsed.netloc.lower().split(":")[0]
    if host in {"youtu.be", "www.youtu.be"}:
        candidate = parsed.path.lstrip("/").split("/")[0]
        return candidate or None
    if host in {"youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"}:
        if parsed.path == "/watch":
            values = parse_qs(parsed.query).get("v", [])
            return values[0] if values else None
        parts = [part for part in parsed.path.split("/") if part]
        if len(parts) >= 2 and parts[0] in {"embed", "shorts", "live"}:
            return parts[1]
    return None


def release_sources(release):
    sources = release.get("sources")
    return sources if isinstance(sources, list) else []


sets_index = load(SETS_ROOT / "index.json")
all_sets = []
for shard in sets_index["chunks"]:
    payload = load(SETS_ROOT / shard)
    for item in payload.get("sets", []):
        row = dict(item)
        row["_shard"] = shard
        all_sets.append(row)

fallbacks = [item for item in all_sets if not item.get("categories")]
structured = len(all_sets) - len(fallbacks)
baseline = (len(all_sets), structured, len(fallbacks))
if baseline != (84, 64, 20):
    raise SystemExit(f"baseline drift: expected (84, 64, 20), got {baseline}")

catalogue_index = load(CATALOGUE_INDEX)
retired = set(catalogue_index.get("retiredReleaseIds", []))
release_by_id = {}
release_shard_by_id = {}
for chunk in catalogue_index.get("releaseChunks", []):
    releases = load(ROOT / chunk)
    if not isinstance(releases, list):
        raise SystemExit(f"release chunk is not a list: {chunk}")
    for release in releases:
        rid = release.get("id")
        if not rid:
            continue
        if rid in release_by_id:
            raise SystemExit(f"duplicate canonical release id: {rid}")
        release_by_id[rid] = release
        release_shard_by_id[rid] = chunk

active_release_ids = set(release_by_id) - retired
video_to_releases = defaultdict(set)
url_to_releases = defaultdict(set)
for rid in active_release_ids:
    release = release_by_id[rid]
    for source in release_sources(release):
        if not isinstance(source, dict):
            continue
        url = source.get("url") or source.get("sourceUrl")
        video_id = source.get("videoId") or youtube_id_from_url(url)
        provider = str(source.get("provider") or "").lower()
        if video_id and (provider == "youtube" or youtube_id_from_url(url) == video_id):
            video_to_releases[video_id].add(rid)
        if isinstance(url, str) and url:
            url_to_releases[url].add(rid)

report = []
for item in fallbacks:
    linked_id = item.get("linkedReleaseId")
    linked_release = release_by_id.get(linked_id) if linked_id else None
    linked_active = bool(linked_id and linked_id in active_release_ids)
    linked_categories = linked_release.get("categories") if linked_release else None
    linked_categories = linked_categories if isinstance(linked_categories, list) and linked_categories else None

    source = item.get("source") if isinstance(item.get("source"), dict) else {}
    source_url = source.get("url") or source.get("sourceUrl")
    source_video_id = source.get("videoId") or youtube_id_from_url(source_url)

    exact_ids = set()
    if source_video_id:
        exact_ids.update(video_to_releases.get(source_video_id, set()))
    if isinstance(source_url, str) and source_url:
        exact_ids.update(url_to_releases.get(source_url, set()))

    exact_active = sorted(rid for rid in exact_ids if rid in active_release_ids)
    exact_with_categories = [
        rid for rid in exact_active
        if isinstance(release_by_id[rid].get("categories"), list) and release_by_id[rid].get("categories")
    ]

    if linked_active and linked_categories:
        evidence_class = 1
        canonical_id = linked_id
        reason = "exact active linkedReleaseId resolves to canonical categories"
    elif len(exact_with_categories) == 1 and len(exact_active) == 1:
        evidence_class = 2
        canonical_id = exact_with_categories[0]
        reason = "unique exact YouTube/source identity resolves to one active canonical release with categories"
    elif linked_id or exact_active:
        if len(exact_active) > 1:
            evidence_class = 5
            canonical_id = None
            reason = "exact source identity maps to multiple active canonical releases"
        else:
            evidence_class = 3
            canonical_id = linked_id if linked_active else (exact_active[0] if exact_active else None)
            reason = "canonical identity exists but taxonomy is missing or linked identity is inactive/unresolved"
    else:
        evidence_class = 4
        canonical_id = None
        reason = "no exact canonical linked-release or source-video identity"

    categories = None
    canonical_shard = None
    if canonical_id and canonical_id in release_by_id:
        candidate_categories = release_by_id[canonical_id].get("categories")
        if isinstance(candidate_categories, list) and candidate_categories:
            categories = candidate_categories
        canonical_shard = release_shard_by_id.get(canonical_id)

    report.append({
        "class": evidence_class,
        "reason": reason,
        "setId": item.get("id"),
        "title": item.get("title"),
        "discoveryShard": f"data/discovery/sets/{item['_shard']}",
        "linkedReleaseId": linked_id,
        "linkedReleaseActive": linked_active,
        "sourceProvider": source.get("provider"),
        "sourceVideoId": source_video_id,
        "sourceUrl": source_url,
        "setType": item.get("setType"),
        "officiality": item.get("officiality"),
        "segmentCount": len(item.get("segments") or []),
        "exactActiveSourceReleaseIds": exact_active,
        "canonicalReleaseId": canonical_id,
        "canonicalReleaseShard": canonical_shard,
        "canonicalCategories": categories,
    })

report.sort(key=lambda row: (row["class"], row["discoveryShard"], row["setId"] or ""))
counts = Counter(row["class"] for row in report)

print("NONSTOP_TAXONOMY_AUDIT_JSON_START")
print(json.dumps({
    "baseline": {"total": baseline[0], "structured": baseline[1], "fallback": baseline[2]},
    "classCounts": {str(key): counts.get(key, 0) for key in range(1, 6)},
    "records": report,
}, ensure_ascii=False, indent=2))
print("NONSTOP_TAXONOMY_AUDIT_JSON_END")

print("\nImplementation-safe candidates:")
for row in report:
    if row["class"] in {1, 2}:
        print(f"- class {row['class']} | {row['setId']} | {row['discoveryShard']} | {row['canonicalReleaseId']} | {row['canonicalCategories']}")

if len(report) != 20:
    raise SystemExit(f"expected 20 fallback rows, got {len(report)}")
