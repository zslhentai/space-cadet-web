cmake_minimum_required(VERSION 3.16)
project(SpaceCadetWeb LANGUAGES C CXX)
if(NOT EMSCRIPTEN)
  message(FATAL_ERROR "Use emcmake cmake to build this WebAssembly target")
endif()
set(CMAKE_CXX_STANDARD 11)
set(ENGINE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/vendor/SpaceCadetPinball/SpaceCadetPinball)
file(GLOB ENGINE_SOURCES CONFIGURE_DEPENDS ${ENGINE_DIR}/*.cpp)
list(FILTER ENGINE_SOURCES EXCLUDE REGEX "/(gm_sf2|imgui_demo)\\.cpp$")
add_executable(pinball ${ENGINE_SOURCES} src/web_bridge.cpp)
target_include_directories(pinball PRIVATE ${ENGINE_DIR})
target_compile_definitions(pinball PRIVATE MUSIC_TSF NDEBUG)
target_compile_options(pinball PRIVATE -O2 "-sUSE_SDL=2" "-sUSE_SDL_MIXER=2" "-sSDL2_MIXER_FORMATS=[]")
target_link_options(pinball PRIVATE
  -O2 "-sUSE_SDL=2" "-sUSE_SDL_MIXER=2" "-sSDL2_MIXER_FORMATS=[]"
  "-sALLOW_MEMORY_GROWTH=1" "-sINITIAL_MEMORY=33554432" "-sMAXIMUM_MEMORY=268435456"
  "-sFORCE_FILESYSTEM=1" "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sENVIRONMENT=web"
  "-sINVOKE_RUN=0" "-sEXIT_RUNTIME=0" "-sASSERTIONS=1"
  "-sEXPORTED_RUNTIME_METHODS=['FS','callMain','UTF8ToString']"
  "-sEXPORTED_FUNCTIONS=['_main','_sc_input','_sc_release','_sc_pause','_sc_paused','_sc_restart','_sc_volume','_sc_ready','_sc_resize','_sc_best','_sc_snapshot','_sc_high_scores','_sc_music_available','_sc_dialog','_sc_audio_resume']")
set_target_properties(pinball PROPERTIES SUFFIX .js RUNTIME_OUTPUT_DIRECTORY ${CMAKE_CURRENT_SOURCE_DIR}/dist/engine)

