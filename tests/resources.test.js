import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inspectFont, inspectDat, collectResources, resourceSummary } from '../web/resources.js';

test('reject missing/truncated commercial resource files before native parsing', () => {
  assert.throws(() => inspectDat(new Uint8Array(10)), /PARTOUT/);
  const truncated = new Uint8Array(183);
  truncated.set(new TextEncoder().encode('PARTOUT(4.0)RESOURCE'));
  new DataView(truncated.buffer).setUint16(175, 600, true);
  assert.throws(() => inspectDat(truncated), /不完整/);
  assert.throws(() => inspectFont(new Uint8Array(10)), /大小/);
  const font = new Uint8Array(134); font[4] = 22; font[6 + 65] = 12;
  assert.throws(() => inspectFont(font), /不完整/);
  font[6 + 65] = 255;
  assert.throws(() => inspectFont(font), /宽度/);
});

test('require original table + extracted font, ignore executables and unrelated assets', async () => {
  assert.equal(resourceSummary(new Map()).ready, false);
  assert.deepEqual(resourceSummary(new Map()).missing, ['PINBALL.DAT', 'PB_MSGFT.BIN']);
  const unrelated = {name: 'PINBALL.EXE', size: 3, arrayBuffer() { throw new Error('must not read executable'); }};
  assert.equal((await collectResources([unrelated])).size, 0);
  await assert.rejects(collectResources([{name: 'SOUND1.WAV', size: 4, arrayBuffer: async () => new ArrayBuffer(4)}]), /RIFF/);
});
