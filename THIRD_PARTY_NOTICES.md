# Third-party notices

This distribution includes code, not the original commercial game assets.

| Component | Source/version | License / notice |
| --- | --- | --- |
| SpaceCadetPinball reverse-engineered engine | Andrey Muzychenko / alula, commit `0bc12d3ca97a30a61e1e325cfde1eeec379bb9b9` | MIT; `LICENSE` and `vendor/SpaceCadetPinball/LICENSE` |
| Dear ImGui | bundled upstream, v1.83 | MIT; `licenses/DearImGui.txt`; stb implementation notices remain in vendor headers |
| ImGui SDL renderer | Tyyppi77/imgui_sdl, upstream bundled snapshot | MIT; `licenses/ImGuiSDL.txt` |
| TinySoundFont / TinyMidiLoader | Bernhard Schelling, upstream bundled snapshot | MIT; complete notices in `tsf.h`, `tml.h` and `licenses/TinySoundFont.txt` |
| SDL2 | Emscripten port, 2.28.4 | zlib; `licenses/SDL2.txt` |
| SDL2_mixer | Emscripten port, 2.8.0; WAV decoding only | zlib; `licenses/SDL2_mixer.txt` |
| Emscripten runtime | 3.1.64 | MIT / University of Illinois-NCSA; `licenses/Emscripten.txt` |

Original game title and commercial resources remain the property of their respective owners. The upstream MIT license applies to the repository code; it is not a grant to redistribute Windows/Full Tilt game data, extracted fonts, artwork, audio or an unidentified SoundFont. No such assets are included or fetched by the build/deployment workflow.

Excluded from the alula snapshot: `PB_MSGFT.bin`, the embedded `PB_MSGFT_bin` byte array in `score.cpp`, `splash_bitmap.bmp`, `Icon_1.ico`, `gm.sf2`, `gm_sf2.cpp`, and analysis dumps / spreadsheets. The replacement font path accepts only a local user-supplied resource. Optional MIDI synthesis accepts a locally supplied, authorized `GM.SF2`.

The Web interface and integration changes in this project are offered under MIT, Copyright (c) 2026 Space Cadet Web contributors.
