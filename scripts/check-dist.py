import pathlib
root = pathlib.Path(__file__).resolve().parents[1] / 'dist'
required = ['index.html', 'app.js', 'style.css', 'controls.js', 'resources.js', 'engine/pinball.js', 'engine/pinball.wasm', 'LICENSE', 'THIRD_PARTY_NOTICES.md']
for name in required:
    assert (root / name).is_file(), f'Missing {name}'
for file in root.rglob('*'):
    assert file.suffix.lower() not in ['.dat', '.wav', '.mid', '.sf2', '.bin', '.exe', '.data'], f'Unexpected bundled asset: {file}'
assert (root / 'engine/pinball.wasm').read_bytes()[:4] == b'\0asm'
print('Static distribution verified: WASM present, no game assets or preload package.')

