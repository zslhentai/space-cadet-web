#include "pch.h"
#include "pb.h"
#include "winmain.h"
#include "options.h"
#include "TPinballTable.h"
#include "fullscrn.h"
#include "high_score.h"
#include "midi.h"
#include <emscripten.h>

static bool held[6]{};
static int actionKey(int action) {
    switch (action) {
    case 0: return options::Options.LeftFlipperKey;
    case 1: return options::Options.RightFlipperKey;
    case 2: return options::Options.PlungerKey;
    case 3: return options::Options.LeftTableBumpKey;
    case 4: return options::Options.RightTableBumpKey;
    default: return options::Options.BottomTableBumpKey;
    }
}
extern "C" {
int sc_ready() { return pb::MainTable != nullptr; }
void sc_input(int action, int down) {
    if (!sc_ready() || action < 0 || action >= 6) return;
    if (down && winmain::single_step) return;
    if (held[action] == bool(down)) return;
    held[action] = bool(down);
    if (down) pb::keydown(actionKey(action));
    else pb::keyup(actionKey(action));
}
void sc_release() {
    for (int action = 0; action < 6; ++action) sc_input(action, 0);
    if (sc_ready()) pb::loose_focus();
}
void sc_pause(int paused) {
    if (!sc_ready()) return;
    sc_release();
    if (bool(winmain::single_step) != bool(paused)) winmain::pause();
}
int sc_paused() { return winmain::single_step; }
void sc_restart() {
    if (!sc_ready()) return;
    sc_release();
    winmain::new_game();
}
void sc_volume(int volume) {
    volume = std::max(0, std::min(128, volume));
    Mix_Volume(-1, volume);
    midi::set_volume(volume / 128.0f);
}
void sc_resize(int width, int height) {
    if (!sc_ready() || width < 1 || height < 1) return;
    SDL_SetWindowSize(winmain::MainWindow, width, height);
    fullscrn::window_size_changed();
}
double sc_best() {
    if (!sc_ready()) return 0;
    double best = 0;
    for (auto& entry : pb::highscore_table) best = std::max(best, double(entry.Score));
    auto table = pb::MainTable;
    if (!table->CheatsUsed) {
        best = std::max(best, table->CurScoreE9 * 1000000000.0 + table->CurScore);
        for (int i = 0; i < table->PlayerCount; ++i) {
            auto& score = table->PlayerScores[i];
            best = std::max(best, score.ScoreE9Part * 1000000000.0 + score.Score);
        }
    }
    return best;
}
const char* sc_snapshot() {
    if (!sc_ready()) return "";
    options::uninit();
    high_score::write(pb::highscore_table);
    return ImGui::SaveIniSettingsToMemory();
}
void sc_high_scores() {
    if (!sc_ready()) return;
    sc_pause(1);
    pb::high_scores();
}
int sc_music_available() { return options::Options.Music; }
int sc_dialog() { return sc_ready() && ImGui::IsPopupOpen(nullptr, ImGuiPopupFlags_AnyPopupId); }
void sc_audio_resume() {
    EM_ASM({
        if (typeof SDL2 !== 'undefined' && SDL2.audioContext) {
            SDL2.audioContext.resume().catch(function() {});
        }
    });
}
}
