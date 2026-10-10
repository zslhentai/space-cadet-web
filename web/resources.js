const decode = bytes => new TextDecoder('ascii').decode(bytes).replace(/\0.*$/s, '');
const fieldSizes = [2, -1, 2, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1];

export function inspectDat(bytes) {
  if (bytes.length < 183 || decode(bytes.subarray(0, 21)) !== 'PARTOUT(4.0)RESOURCE') throw new Error('PINBALL.DAT 不是原版 PARTOUT 资源文件。');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = view.getUint16(175, true);
  let offset = 183 + view.getUint16(181, true);
  const names = new Set(), sounds = new Set();
  const need = length => { if (length < 0 || offset + length > bytes.length) throw new Error('PINBALL.DAT 记录不完整或已损坏。'); };
  if (count < 1 || count > 10000) throw new Error('PINBALL.DAT 记录数量无效。');
  for (let group = 0; group < count; group++) {
    need(1);
    const entries = bytes[offset++];
    for (let entry = 0; entry < entries; entry++) {
      need(1);
      const type = bytes[offset++];
      if (type >= fieldSizes.length) throw new Error('PINBALL.DAT 含未知记录类型。');
      let size = fieldSizes[type];
      if (size < 0) { need(4); size = view.getInt32(offset, true); offset += 4; }
      need(size);
      if (type === 3) names.add(decode(bytes.subarray(offset, offset + size)));
      if (type === 9) {
        const text = decode(bytes.subarray(offset, offset + size));
        if (/^[\w.-]+\.wav$/i.test(text)) sounds.add(text.toUpperCase());
      }
      if (type === 1) {
        if (size < 14) throw new Error('DAT 位图记录不完整。');
        const width = view.getInt16(offset + 1, true), height = view.getInt16(offset + 3, true);
        if (bytes[offset] > 2 || width <= 0 || height <= 0 || width > 4096 || height > 4096 || view.getInt32(offset + 9, true) + 14 !== size) throw new Error('DAT 位图尺寸无效。');
      }
      offset += size;
    }
  }
  for (const name of ['background', 'camera_info']) if (!names.has(name)) throw new Error(`PINBALL.DAT 缺少原版球台记录：${name}。`);
  return { groups: count, sounds: [...sounds].sort() };
}

export function inspectFont(bytes) {
  if (bytes.length < 134 || bytes.length > 65536) throw new Error('PB_MSGFT.BIN 大小无效，请从你自己的原版 PINBALL.EXE 提取 FONT/PB_MSGFT 资源。');
  const height = bytes[4] | (bytes[5] << 8);
  if (height < 1 || height > 64) throw new Error('PB_MSGFT.BIN 字体高度无效。');
  let length = 134;
  for (const width of bytes.subarray(6, 134)) {
    if (width > 64) throw new Error('PB_MSGFT.BIN 字符宽度无效。');
    if (width) length += height * width + 1;
  }
  if (length > bytes.length) throw new Error('PB_MSGFT.BIN 字体数据不完整。');
}

export async function collectResources(files, previous = new Map()) {
  const result = new Map(previous);
  let total = [...result.values()].reduce((n, bytes) => n + bytes.length, 0);
  for (const file of files) {
    const name = file.name.toUpperCase();
    if (!/^(PINBALL\.DAT|PB_MSGFT\.BIN|PINBALL\.MID|GM\.SF2|[\w.-]+\.WAV)$/.test(name)) continue;
    if (file.size > 32 * 1024 * 1024) throw new Error(`${name} 超过 32 MB 的单文件限制。`);
    total += file.size - (result.get(name)?.length || 0);
    if (total > 80 * 1024 * 1024) throw new Error('资源总大小超过 80 MB。');
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (name === 'PINBALL.DAT') inspectDat(bytes);
    if (name === 'PB_MSGFT.BIN') inspectFont(bytes);
    if (name.endsWith('.WAV') && (decode(bytes.subarray(0, 4)) !== 'RIFF' || decode(bytes.subarray(8, 12)) !== 'WAVE')) throw new Error(`${name} 不是 RIFF/WAVE 音效。`);
    if (name === 'GM.SF2' && (decode(bytes.subarray(0, 4)) !== 'RIFF' || decode(bytes.subarray(8, 12)) !== 'sfbk')) throw new Error('GM.SF2 不是 SoundFont2 音色库。');
    if (name === 'PINBALL.MID' && decode(bytes.subarray(0, 4)) !== 'MThd') throw new Error('PINBALL.MID 不是 MIDI 文件。');
    result.set(name, bytes);
  }
  return result;
}

export function resourceSummary(resources) {
  const missing = ['PINBALL.DAT', 'PB_MSGFT.BIN'].filter(name => !resources.has(name));
  const info = resources.has('PINBALL.DAT') ? inspectDat(resources.get('PINBALL.DAT')) : { sounds: [] };
  const missingSounds = info.sounds.filter(name => !resources.has(name));
  return { missing, missingSounds, ready: !missing.length && !missingSounds.length, count: resources.size };
}
