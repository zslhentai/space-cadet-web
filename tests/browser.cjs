// Browser tests exercise the real UI and real compiled WASM missing-resource
// path. Input tests record calls only: there is no fake table or fake physics.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, firefox, webkit } = require('playwright');
const base = process.env.TEST_URL || 'http://127.0.0.1:8080/';
const output = [];

async function checks(type, options) {
  const browser = await type.launch(options);
  const timeout = setTimeout(() => { console.error(`${type.name()}: browser checks timed out`); browser.close(); }, 45000);
  try {
    const context = await browser.newContext({ viewport: {width: 390, height: 844}, hasTouch: true });
    const page = await context.newPage();
    const errors = [], dialogs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.dismiss(); });
    await page.goto(base);
    await page.waitForFunction(() => document.getElementById('best').textContent !== '');
    assert.equal(await page.locator('#start').isDisabled(), true);
    for (const [width, height] of [[390,844], [375,667], [320,568], [412,915], [844,390], [1440,900]]) {
      await page.setViewportSize({width,height});
      // ResizeObserver settles asynchronously after a browser viewport change.
      await page.waitForFunction(() => {
        const canvas = document.getElementById('canvas').getBoundingClientRect();
        return canvas.height > 0 && Math.abs(canvas.width / canvas.height - 600 / 416) < 0.01;
      }, null, {timeout:5000});
      const shape = await page.evaluate(() => {
        const app = document.getElementById('app').getBoundingClientRect();
        const stage = document.getElementById('stage').getBoundingClientRect();
        const controls = document.getElementById('controls').getBoundingClientRect();
        const style = getComputedStyle(document.getElementById('canvas'));
        const canvas = document.getElementById('canvas').getBoundingClientRect();
        return {appBottom:app.bottom, controlsBottom:controls.bottom, height:innerHeight, stageHeight:stage.height, fit:style.objectFit, aspect:canvas.width/canvas.height, overflow:document.documentElement.scrollWidth > innerWidth};
      });
      assert.equal(shape.overflow, false);
      assert.equal(shape.fit, 'contain');
      assert.ok(Math.abs(shape.aspect - 600 / 416) < 0.01);
      assert.ok(shape.stageHeight > 0);
      assert.ok(shape.controlsBottom <= height + 1);
    }
    await page.setViewportSize({width:390,height:844});

    // Disable the native fullscreen API to verify the iPhone page fallback.
    await page.evaluate(() => Object.defineProperty(document.getElementById('app'), 'requestFullscreen', {value: undefined}));
    await page.evaluate(() => Object.defineProperty(document.getElementById('app'), 'webkitRequestFullscreen', {value: undefined}));
    await page.locator('#fullscreen').click();
    assert.equal(await page.evaluate(() => document.body.classList.contains('immersive')), true);
    await page.locator('#fullscreen').click();
    assert.equal(await page.evaluate(() => document.body.classList.contains('immersive')), false);
    await page.locator('#volume').fill('23');
    await page.reload();
    assert.equal(await page.locator('#volume').inputValue(), '23');

    const inputs = await page.evaluate(async () => {
      const {createControls} = await import('./controls.js');
      const calls = [], els = [0,1,2].map(action => {
        const el = document.createElement('button'); el.dataset.action = action; document.body.append(el);
        el.setPointerCapture = () => {}; // Synthetic pointer unit events have no browser-owned capture.
        return el;
      });
      const keyboard = new EventTarget();
      const c = createControls({elements:els, keyboardTarget:keyboard, send:(a,d)=>calls.push([a,d]), enabled:()=>true});
      const pointer = (el,type,id) => el.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',cancelable:true}));
      pointer(els[0],'pointerdown',1);
      pointer(els[1],'pointerdown',2);
      pointer(els[2],'pointerdown',3);
      pointer(els[0],'pointerdown',4);
      pointer(els[0],'pointerup',1); // second left finger still owns the flipper
      pointer(els[2],'pointerup',3); // independent plunger release
      pointer(els[0],'pointercancel',4);
      pointer(els[1],'lostpointercapture',2);
      const key = (type,code,repeat=false) => keyboard.dispatchEvent(new KeyboardEvent(type,{code,repeat,cancelable:true}));
      key('keydown','KeyZ'); key('keydown','KeyZ',true);
      pointer(els[0],'pointerdown',5);
      key('keyup','KeyZ'); // touch retains ownership
      c.releaseAll(); c.dispose(); els.forEach(el=>el.remove());
      return calls;
    });
    assert.deepEqual(inputs, [[0,true],[1,true],[2,true],[2,false],[0,false],[1,false],[0,true],[0,false]]);

    const wasm = await page.evaluate(async () => {
      const {default:createPinball} = await import('./engine/pinball.js');
      const canvas = document.getElementById('canvas');
      const engine = await createPinball({canvas,noInitialRun:true,preRun:[m=>m.FS.mkdir('/game_resources')]});
      const exports = ['_sc_input','_sc_release','_sc_pause','_sc_paused','_sc_restart','_sc_volume','_sc_ready','_sc_resize','_sc_best','_sc_snapshot','_sc_high_scores','_sc_dialog','_sc_audio_resume'];
      const present = exports.every(key => typeof engine[key] === 'function');
      engine._sc_input(0,1); engine._sc_release(); engine._sc_pause(1); engine._sc_restart();
      engine.callMain([]); // Original engine initialization: must report missing DAT, no mock game.
      return {present,ready:engine._sc_ready(),best:engine._sc_best(),requests:performance.getEntriesByType('resource').filter(x=>x.name.endsWith('.wasm')).map(x=>x.decodedBodySize)};
    });
    assert.equal(wasm.present, true);
    assert.equal(wasm.ready, 0);
    assert.equal(wasm.best, 0);
    assert.ok(dialogs.some(text => text.includes('dat file is missing')));
    assert.deepEqual(errors, []);
    output.push({browser:type.name(),version:browser.version(),result:'PASS',viewports:6,multiPointer:'PASS',keyboardTouchOwnership:'PASS',fullscreenFallback:'PASS',settingsReload:'PASS',realWasmExports:'PASS',missingResourceGuard:'PASS',gameplay:'BLOCKED: no authorized game resources',wasmBytes:wasm.requests});
    await context.close();
  } finally { clearTimeout(timeout); await browser.close(); }
}
(async () => {
  const types = process.env.TEST_BROWSERS?.split(',') || ['chromium'];
  for (const name of types) {
    const type = {chromium,firefox,webkit}[name];
    if (!type) throw new Error(`Unknown browser: ${name}`);
    const options = {headless:true};
    if (name === 'chromium') { options.executablePath = process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined); options.args = ['--no-sandbox']; }
    if (name === 'firefox') options.firefoxUserPrefs = {'security.sandbox.content.level':0};
    await checks(type, options);
  }
  fs.mkdirSync('test-results',{recursive:true});
  fs.writeFileSync('test-results/browser-results.json', JSON.stringify(output,null,2)+'\n');
  console.log(JSON.stringify(output,null,2));
})().catch(error => { console.error(error); process.exitCode=1; });
