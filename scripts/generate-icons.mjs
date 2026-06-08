/**
 * Generates minimal valid RGBA PNG placeholder icons into assets/.
 * Produces both 1x (16x16) and @2x (32x32) variants for macOS retina support.
 * Skips creation if the file already exists so custom icons aren't overwritten.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// CRC32 lookup table (PNG uses standard IEEE polynomial)
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const combined = Buffer.concat([typeBytes, data]);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(combined), 0);
  return Buffer.concat([lenBuf, combined, crcBuf]);
}

function createPng(width, height, r, g, b, a = 255) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  // Raw scanlines: 1 filter byte + width*4 pixel bytes per row
  const raw = Buffer.allocUnsafe(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const base = y * (1 + width * 4);
    raw[base] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      const off = base + 1 + x * 4;
      raw[off] = r;
      raw[off + 1] = g;
      raw[off + 2] = b;
      raw[off + 3] = a;
    }
  }

  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const assetsDir = join(ROOT, 'assets');
mkdirSync(assetsDir, { recursive: true });

const iconDefs = [
  { base: 'icon',       r: 80,  g: 80,  b: 80,  a: 255 }, // neutral grey
  { base: 'icon-badge', r: 255, g: 140, b: 0,   a: 255 }, // attention orange
  { base: 'icon-error', r: 220, g: 50,  b: 50,  a: 255 }, // error red
];

for (const { base, r, g, b, a } of iconDefs) {
  // 1x — 16x16
  const dest1x = join(assetsDir, `${base}.png`);
  if (existsSync(dest1x)) {
    console.log(`skip  ${base}.png (already exists)`);
  } else {
    writeFileSync(dest1x, createPng(16, 16, r, g, b, a));
    console.log(`wrote ${base}.png`);
  }

  // @2x — 32x32 (macOS retina; Electron auto-selects when file is named @2x)
  const dest2x = join(assetsDir, `${base}@2x.png`);
  if (existsSync(dest2x)) {
    console.log(`skip  ${base}@2x.png (already exists)`);
  } else {
    writeFileSync(dest2x, createPng(32, 32, r, g, b, a));
    console.log(`wrote ${base}@2x.png`);
  }
}
