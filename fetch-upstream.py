import concurrent.futures, json, pathlib, urllib.request, re

ROOT = pathlib.Path(__file__).parent / 'vendor' / 'SpaceCadetPinball'
if ROOT.exists():
    raise SystemExit('Refusing to overwrite the patched vendor snapshot. Use a separate empty directory for provenance refresh.')
REF = '0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9'
BASE = 'https://raw.githubusercontent.com/alula/SpaceCadetPinball/' + REF + '/'
tree = json.load(urllib.request.urlopen('https://api.github.com/repos/alula/SpaceCadetPinball/git/trees/' + REF + '?recursive=1'))['tree']
paths = [t['path'] for t in tree if t['type'] == 'blob' and
         (t['path'] in ('LICENSE', 'README.md', 'CMakeLists.txt') or
          t['path'].startswith('CMakeModules/') or
          (t['path'].startswith('SpaceCadetPinball/') and
           t['path'].endswith(('.cpp', '.h', '.html')) and
           t['path'] != 'SpaceCadetPinball/gm_sf2.cpp'))]

def fetch(path):
    data = urllib.request.urlopen(BASE + path).read().decode('utf-8-sig')
    if path.endswith('/score.cpp'):
        # Do not persist or distribute the original commercial font byte array.
        data = re.sub(r'// Todo: load font from file\s+const uint8_t PB_MSGFT_bin\[\]\s*\{.*?\};',
                      '// Original embedded font excluded; loaded from user resources.\nstatic std::vector<uint8_t> PB_MSGFT_data;', data, flags=re.S)
        data = data.replace('PB_MSGFT_bin', 'PB_MSGFT_data.data()')
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(data)

with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    list(pool.map(fetch, paths))
print('Fetched', len(paths), 'source files; excluded binary assets and embedded font/soundfont.')
