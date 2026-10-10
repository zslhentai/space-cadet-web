import hashlib, json, pathlib
root = pathlib.Path(__file__).resolve().parents[1]
lock = json.loads((root / 'docs/core-sha256.json').read_text())
for name, expected in lock.items():
    assert hashlib.sha256((root / name).read_bytes()).hexdigest() == expected, f'Gameplay source changed: {name}'
print(f'All {len(lock)} original gameplay source/header hashes match: physics, collisions, flippers, plunger, missions, scores and ranks.')
