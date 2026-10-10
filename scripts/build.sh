#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v emcc >/dev/null || { echo 'Activate Emscripten 3.1.64 (source emsdk_env.sh) first.' >&2; exit 1; }
cmake_bin="${CMAKE_BIN:-cmake}"
build_args=(-S . -B build -DCMAKE_BUILD_TYPE=Release)
if [[ -n "${NINJA_BIN:-}" ]]; then build_args+=(-G Ninja "-DCMAKE_MAKE_PROGRAM=$NINJA_BIN"); fi
emcmake "$cmake_bin" "${build_args[@]}"
"$cmake_bin" --build build --parallel 4
cp web/* dist/
cp LICENSE THIRD_PARTY_NOTICES.md dist/
cp -R licenses dist/
touch dist/.nojekyll
python3 scripts/check-dist.py

