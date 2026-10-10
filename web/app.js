import { createControls } from './controls.js';
import { collectResources, resourceSummary } from './resources.js';

const $ = id => document.getElementById(id);
const storageKey = 'space-cadet-web.v1';
let saved = {};
try { saved = JSON.parse(localStorage.getItem(storageKey) || '{}'); } catch { /* private browsing or corrupted storage */ }
if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
let resources = new Map(), engine, playing = false, dialogOpen = false, loading = false, failed = false;
let best = Number.isFinite(saved.best) && saved.best >= 0 ? saved.best : 0;
let storageFailed = false;
$('best').textContent = best.toLocaleString('zh-CN');
$('volume').value = Number.isFinite(saved.volume) ? Math.max(0, Math.min(100, saved.volume)) : 70;
function persist() {
  if (engine?._sc_ready() && !failed) {
    best = Math.max(best, engine._sc_best());
    saved.ini = engine.UTF8ToString(engine._sc_snapshot());
  }
  saved.best = best;
  saved.volume = Number($('volume').value);
  $('best').textContent = best.toLocaleString('zh-CN');
  try { localStorage.setItem(storageKey, JSON.stringify(saved)); }
  catch { storageFailed = true; if (playing) $('status').textContent = '游戏运行中 · 本机存档不可用'; }
}

const controls = createControls({
  elements: [...document.querySelectorAll('[data-action]')],
  enabled: () => playing && !dialogOpen && !engine._sc_paused(),
  send: (action, down) => { if (!failed) engine?._sc_input(action, Number(down)); },
  onGesture: () => engine?._sc_audio_resume(),
});

function reflectPause() {
  if (!playing) return;
  const paused = Boolean(engine._sc_paused());
  $('pause').textContent = paused ? '继续' : '暂停';
  $('pause-cover').hidden = !paused || dialogOpen;
  $('status').textContent = paused ? '已暂停' : storageFailed ? '游戏运行中 · 本机存档不可用' : '原版引擎运行中';
}
function setPause(paused) {
  if (!playing) return;
  controls.releaseAll();
  engine._sc_pause(Number(paused));
  if (!paused) engine._sc_audio_resume();
  reflectPause();
  persist();
}

$('files').addEventListener('change', async event => {
  $('start').disabled = true;
  $('files').disabled = true;
  try {
    resources = await collectResources(event.target.files, resources);
    const summary = resourceSummary(resources);
    $('start').disabled = !summary.ready;
    if (summary.missing.length) $('resource-status').textContent = `已读取 ${summary.count} 个文件。还需要：${summary.missing.join('、')}`;
    else if (summary.missingSounds.length) $('resource-status').textContent = `球台和字体已就绪。还需 ${summary.missingSounds.length} 个原版音效：${summary.missingSounds.join('、')}。请继续选择文件补齐，保留原版声音及事件时序。`;
    else $('resource-status').textContent = `已读取 ${summary.count} 个文件，球台、字体和引用音效已就绪。`;
  } catch (error) { $('resource-status').textContent = error.message; }
  finally { $('files').disabled = false; }
  event.target.value = '';
});

function fail(message) {
  failed = true;
  controls.releaseAll();
  playing = false;
  $('resource-panel').hidden = false;
  $('touch-zones').hidden = true;
  $('pause-cover').hidden = true;
  $('status').textContent = '启动或运行失败';
  $('resource-status').textContent = `${message}。请刷新后使用完整原版资源重试。`;
  $('start').disabled = true;
  ['pause', 'restart', 'scores'].forEach(id => $(id).disabled = true);
  document.querySelectorAll('#controls button').forEach(button => button.disabled = true);
}

$('start').addEventListener('click', async () => {
  if (loading || !resourceSummary(resources).ready) return;
  loading = true;
  $('start').disabled = true;
  $('files').disabled = true;
  $('status').textContent = '正在加载原版 WASM 引擎…';
  try {
    const { default: createPinball } = await import('./engine/pinball.js');
    engine = await createPinball({
      canvas: $('canvas'), noInitialRun: true,
      print: text => console.info('[Pinball]', text),
      printErr: text => console.warn('[Pinball]', text),
      onAbort: reason => fail(String(reason)),
      preRun: [module => {
        module.FS.mkdir('/game_resources');
        for (const [name, bytes] of resources) module.FS.writeFile(`/game_resources/${name}`, bytes);
        // The original top-five leaderboard and settings use the original INI format.
        if (typeof saved.ini === 'string' && saved.ini.length < 65536) module.FS.writeFile('/game_resources/imgui_pb.ini', saved.ini);
      }],
    });
    engine.callMain([]);
    if (!engine._sc_ready()) throw new Error('原版引擎未能加载球台数据');
    playing = true;
    resources.clear(); // Copies now live only in the engine's local virtual filesystem.
    $('resource-panel').hidden = true;
    $('touch-zones').hidden = false;
    ['pause', 'restart', 'scores'].forEach(id => $(id).disabled = false);
    document.querySelectorAll('#controls button').forEach(button => button.disabled = false);
    engine._sc_volume(Math.round(Number($('volume').value) * 128 / 100));
    engine._sc_audio_resume();
    resize();
    reflectPause();
  } catch (error) { fail(error.message); }
});

$('pause').addEventListener('click', () => setPause(!engine._sc_paused()));
$('resume').addEventListener('click', () => setPause(false));
$('scores').addEventListener('click', () => {
  controls.releaseAll();
  engine._sc_high_scores();
  dialogOpen = true;
  $('stage').classList.add('dialog-open');
  reflectPause();
});
$('restart').addEventListener('click', () => { setPause(true); $('restart-confirm').showModal(); });
$('restart-confirm').addEventListener('close', event => {
  if (event.target.returnValue === 'restart') {
    persist();
    controls.releaseAll();
    engine._sc_restart();
    reflectPause();
  }
});
$('volume').addEventListener('input', () => {
  engine?._sc_volume(Math.round(Number($('volume').value) * 128 / 100));
  engine?._sc_audio_resume();
  persist();
});

async function fullscreen() {
  const app = $('app');
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) await exit.call(document);
    document.body.classList.remove('immersive');
  } else if (document.body.classList.contains('immersive')) {
    document.body.classList.remove('immersive');
  } else {
    document.body.classList.add('immersive');
    const request = app.requestFullscreen || app.webkitRequestFullscreen;
    if (request) { try { await request.call(app); } catch { /* iPhone: page-level immersive fallback */ } }
  }
  $('fullscreen').setAttribute('aria-pressed', String(document.body.classList.contains('immersive')));
  resize();
}
$('fullscreen').addEventListener('click', fullscreen);
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) document.body.classList.remove('immersive');
  resize();
});
function resize() {
  // Give the canvas itself the fitted rectangle, so SDL mouse coordinates for
  // the original name-entry dialog remain correct even with portrait black bars.
  if (playing) engine._sc_resize(600, 416);
  const scale = Math.min($('stage').clientWidth / 600, $('stage').clientHeight / 416);
  $('canvas').style.width = `${600 * scale}px`;
  $('canvas').style.height = `${416 * scale}px`;
}
new ResizeObserver(resize).observe($('stage'));
window.visualViewport?.addEventListener('resize', resize);
window.addEventListener('blur', () => { if (playing) setPause(true); else controls.releaseAll(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && playing) setPause(true); });
window.addEventListener('pagehide', () => { if (playing) setPause(true); persist(); });
window.addEventListener('keydown', event => {
  if (!playing || event.target.closest?.('input,textarea,dialog')) return;
  if (event.code === 'F3' && !event.repeat) { event.preventDefault(); setPause(!engine._sc_paused()); }
  if (event.code === 'F2' && !event.repeat && !dialogOpen) { event.preventDefault(); setPause(true); $('restart-confirm').showModal(); }
  if (event.code === 'Escape' && !dialogOpen) { event.preventDefault(); setPause(true); }
}, true);
$('canvas').addEventListener('webglcontextlost', event => {
  event.preventDefault();
  if (playing) { setPause(true); fail('WebGL 上下文已丢失，最高分已尝试保存'); }
});
setInterval(() => {
  if (!playing) return;
  const nowOpen = Boolean(engine._sc_dialog());
  if (nowOpen !== dialogOpen) {
    controls.releaseAll();
    dialogOpen = nowOpen;
    $('stage').classList.toggle('dialog-open', nowOpen);
  }
  reflectPause();
}, 100);
setInterval(() => { if (playing) persist(); }, 1000);
persist();
