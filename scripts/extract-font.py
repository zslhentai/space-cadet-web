#!/usr/bin/env python3
"""Extract only FONT/PB_MSGFT from the user's own PINBALL.EXE. No downloads."""
import argparse, pathlib

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('exe', type=pathlib.Path)
parser.add_argument('--output', type=pathlib.Path, default=pathlib.Path('legal-resources/PB_MSGFT.BIN'))
args = parser.parse_args()
try:
    import pefile
except ImportError:
    raise SystemExit('Install the extractor dependency first: python3 -m pip install pefile==2024.8.26')
pe = pefile.PE(str(args.exe), fast_load=True)
pe.parse_data_directories(directories=[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_RESOURCE']])
matches = []
directory = getattr(pe, 'DIRECTORY_ENTRY_RESOURCE', None)
if directory is None:
    raise SystemExit('The provided executable has no resource directory.')
for kind in directory.entries:
    if kind.id != 8 and str(kind.name).upper() != 'FONT':
        continue
    for resource in kind.directory.entries:
        name = str(resource.name).upper()
        if name not in ('PB_MSGFT', 'PBMSG_FT'):
            continue
        for language in resource.directory.entries:
            entry = language.data.struct
            matches.append(pe.get_data(entry.OffsetToData, entry.Size))
if not matches:
    raise SystemExit('FONT/PB_MSGFT not found. Use the Windows XP Space Cadet executable from your own licensed installation; do not substitute an online download.')
data = matches[0]
if not 134 <= len(data) <= 65536:
    raise SystemExit('Unexpected font resource size; output not written.')
height = int.from_bytes(data[4:6], 'little')
size = 134 + sum(height * width + 1 for width in data[6:134] if width)
if not 1 <= height <= 64 or any(width > 64 for width in data[6:134]) or size > len(data):
    raise SystemExit('Invalid font resource; output not written.')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_bytes(data)
print(f'Extracted local FONT/PB_MSGFT: {args.output} ({len(data)} bytes). Keep it out of Git and public hosting.')
