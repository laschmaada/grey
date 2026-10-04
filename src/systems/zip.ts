/**
 * In-house STORE-method ZIP writer with per-entry CRC32 (D10).
 *
 * We don't compress — STORE = method 0 (no compression). The on-disk layout is:
 *   local header 1   <data>
 *   ...
 *   central header 1
 *   ...
 *   end-of-central-directory
 */

export interface ZipEntry {
  name: string; // path inside the zip (forward slashes)
  content: Uint8Array;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const VERSION = 20; // 2.0 — STORE, no extra field

export function writeZip(entries: ReadonlyArray<ZipEntry>): Uint8Array {
  const enc = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.content);
    const size = e.content.length;

    // local file header (30 bytes + name)
    const lfh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lfh.buffer);
    dv.setUint32(0, SIG_LOCAL, true);
    dv.setUint16(4, VERSION, true);
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // method = STORE
    dv.setUint16(10, 0, true); // time
    dv.setUint16(12, 0, true); // date
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true); // compressed size
    dv.setUint32(22, size, true); // uncompressed size
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true); // extra
    lfh.set(nameBytes, 30);
    localChunks.push(lfh, e.content);

    // central directory header
    const cfh = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cfh.buffer);
    cdv.setUint32(0, SIG_CENTRAL, true);
    cdv.setUint16(4, VERSION, true); // version made by
    cdv.setUint16(6, VERSION, true); // version needed
    cdv.setUint16(8, 0, true); // flags
    cdv.setUint16(10, 0, true); // method
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    cfh.set(nameBytes, 46);
    centralChunks.push(cfh);

    offset += lfh.length + size;
  }

  const centralSize = centralChunks.reduce((a, c) => a + c.length, 0);
  const centralOffset = offset;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, SIG_EOCD, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralOffset, true);
  ev.setUint16(20, 0, true);

  // Concat all parts
  const total =
    localChunks.reduce((a, c) => a + c.length, 0) +
    centralSize +
    22;
  const out = new Uint8Array(total);
  let pos = 0;
  for (const c of localChunks) {
    out.set(c, pos);
    pos += c.length;
  }
  for (const c of centralChunks) {
    out.set(c, pos);
    pos += c.length;
  }
  out.set(eocd, pos);
  return out;
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i]!;
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Read a STORE ZIP back into entries; used by the parse-back test. */
export function readZip(buf: Uint8Array): ZipEntry[] {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // EOCD
  const eocdAt = buf.length - 22;
  if (dv.getUint32(eocdAt, true) !== SIG_EOCD) throw new Error('not a ZIP');
  const count = dv.getUint16(eocdAt + 10, true);
  const centralStart = dv.getUint32(eocdAt + 16, true);
  const out: ZipEntry[] = [];
  let p = centralStart;
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== SIG_CENTRAL) throw new Error('bad central sig');
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const commentLen = dv.getUint16(p + 32, true);
    const size = dv.getUint32(p + 24, true);
    const localOffset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(buf.slice(p + 46, p + 46 + nameLen));
    const content = buf.slice(localOffset + 30 + nameLen, localOffset + 30 + nameLen + size);
    out.push({ name, content });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}