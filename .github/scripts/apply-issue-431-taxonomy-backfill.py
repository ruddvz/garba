import json
from pathlib import Path

ROOT = Path('.')
SETS_INDEX = ROOT / 'data/discovery/sets/index.json'
CATALOGUE_INDEX = ROOT / 'data/catalogue/index.json'

TARGETS = {
    'set-pooja-garba-ni-ramzat-2021': (
        'pooja-garba-ni-ramzat-2021',
        ['modern-gujarati-garba'],
    ),
    'set-pooja-garba-ni-ramzat-2-0-2023': (
        'pooja-garba-ni-ramzat-2-0-2023',
        ['modern-gujarati-garba'],
    ),
    'set-pooja-garba-ni-ramzat-3-0-2024': (
        'pooja-garba-ni-ramzat-3-0-2024',
        ['modern-gujarati-garba'],
    ),
    'set-pooja-garba-ni-ramzat-4-0-2025': (
        'pooja-garba-ni-ramzat-4-0-continuous-2025',
        ['modern-gujarati-garba'],
    ),
    'set-shakti-2-santvani-rushabh-2022': (
        'shakti-2-nonstop-garba-continuous-2022',
        ['mataji-devotional', 'dakla', 'hinch', 'modern-gujarati-garba'],
    ),
    'set-ramzat5-2024': (
        'ramzat5-continuous-2024',
        ['modern-gujarati-garba', 'mataji-devotional', 'dakla'],
    ),
}

OWNED_SET_FILES = [
    ROOT / 'data/discovery/sets/sets-09-pooja-santvani.json',
    ROOT / 'data/discovery/sets/sets-13-ramzat5.json',
]


def load_json(path: Path):
    return json.loads(path.read_text())


def all_sets():
    index = load_json(SETS_INDEX)
    result = []
    for chunk in index['chunks']:
        payload = load_json(SETS_INDEX.parent / chunk)
        result.extend(payload.get('sets', []))
    return result


def structured_count(sets):
    return sum(
        any(isinstance(item.get(field), list) and item[field] for field in ('genres', 'categories', 'styles'))
        for item in sets
    )


def release_map():
    index = load_json(CATALOGUE_INDEX)
    releases = {}
    for rel_path in index.get('releaseChunks', []):
        for release in load_json(ROOT / rel_path):
            release_id = release['id']
            if release_id in releases:
                raise SystemExit(f'duplicate release id: {release_id}')
            releases[release_id] = release
    return releases


before_sets = all_sets()
before_structured = structured_count(before_sets)
before_fallback = len(before_sets) - before_structured
if (before_structured, before_fallback) != (34, 50):
    raise SystemExit(
        f'baseline moved: expected 34 structured / 50 fallback, got '
        f'{before_structured} structured / {before_fallback} fallback'
    )

releases = release_map()
found = set()

for path in OWNED_SET_FILES:
    payload = load_json(path)
    changed = False
    for item in payload.get('sets', []):
        set_id = item.get('id')
        if set_id not in TARGETS:
            continue
        expected_release_id, expected_categories = TARGETS[set_id]
        linked_release_id = item.get('linkedReleaseId')
        if linked_release_id != expected_release_id:
            raise SystemExit(
                f'{set_id}: expected linkedReleaseId {expected_release_id}, got {linked_release_id}'
            )
        release = releases.get(linked_release_id)
        if not release:
            raise SystemExit(f'{set_id}: linked release {linked_release_id} not found')
        actual_release_categories = release.get('categories')
        if actual_release_categories != expected_categories:
            raise SystemExit(
                f'{set_id}: linked release categories moved: '
                f'expected {expected_categories}, got {actual_release_categories}'
            )
        existing = item.get('categories')
        if existing not in (None, [], expected_categories):
            raise SystemExit(
                f'{set_id}: refusing to replace existing categories {existing}'
            )
        item['categories'] = list(expected_categories)
        found.add(set_id)
        changed = True
    if changed:
        path.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')

missing = set(TARGETS) - found
if missing:
    raise SystemExit(f'target sets not found in owned shards: {sorted(missing)}')

after_sets = all_sets()
after_structured = structured_count(after_sets)
after_fallback = len(after_sets) - after_structured
if (after_structured, after_fallback) != (40, 44):
    raise SystemExit(
        f'unexpected result: expected 40 structured / 44 fallback, got '
        f'{after_structured} structured / {after_fallback} fallback'
    )

print('✓ copied exact linked-release categories onto 6 Nonstop sets')
print(f'✓ structured browse metadata: {before_structured} -> {after_structured}')
print(f'✓ legacy fallback sets: {before_fallback} -> {after_fallback}')
