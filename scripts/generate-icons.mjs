/**
 * Generates PNG tray icons into assets/.
 * Produces both 1x (16x16) and @2x (32x32) variants for macOS retina support.
 * Design: three horizontal bars (stacked-layers motif) to match "StrataFlux".
 * The base icon uses black-on-transparent so macOS can use it as a template image.
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

/**
 * Creates a PNG where each pixel's RGBA is determined by drawPixel(lx, ly) where
 * lx/ly are logical coordinates in a 16x16 grid (scaled up for @2x).
 */
function createIconPng(width, height, drawPixel) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const raw = Buffer.allocUnsafe(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const base = y * (1 + width * 4);
    raw[base] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      // Map physical pixels to 16x16 logical space
      const lx = Math.floor(x * 16 / width);
      const ly = Math.floor(y * 16 / height);
      const [r, g, b, a] = drawPixel(lx, ly);
      const off = base + 1 + x * 4;
      raw[off]     = r;
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

/**
 * Three horizontal bars (rows 3-4, 6-7, 9-10 in 16x16 logical space,
 * x from 1 to 14) — a stacked-layers motif.
 */
function isBar(lx, ly) {
  const inX = lx >= 1 && lx <= 14;
  const inY = (ly >= 3 && ly <= 4) || (ly >= 6 && ly <= 7) || (ly >= 9 && ly <= 10);
  return inX && inY;
}

// Icon definitions: base is black-on-transparent (macOS template image compatible);
// badge/error are coloured so they stand out regardless of menu-bar theme.
const iconDefs = [
  {
    base: 'icon',
    drawPixel: (lx, ly) => isBar(lx, ly) ? [0, 0, 0, 255] : [0, 0, 0, 0],
  },
  {
    base: 'icon-badge',
    // Attention state: amber/orange bars
    drawPixel: (lx, ly) => isBar(lx, ly) ? [255, 140, 0, 255] : [0, 0, 0, 0],
  },
  {
    base: 'icon-error',
    // Error state: red bars
    drawPixel: (lx, ly) => isBar(lx, ly) ? [220, 50, 50, 255] : [0, 0, 0, 0],
  },
];

const assetsDir = join(ROOT, 'assets');
mkdirSync(assetsDir, { recursive: true });

for (const { base, drawPixel } of iconDefs) {
  const dest1x = join(assetsDir, `${base}.png`);
  if (existsSync(dest1x)) {
    console.log(`skip  ${base}.png (already exists)`);
  } else {
    writeFileSync(dest1x, createIconPng(16, 16, drawPixel));
    console.log(`wrote ${base}.png`);
  }

  const dest2x = join(assetsDir, `${base}@2x.png`);
  if (existsSync(dest2x)) {
    console.log(`skip  ${base}@2x.png (already exists)`);
  } else {
    writeFileSync(dest2x, createIconPng(32, 32, drawPixel));
    console.log(`wrote ${base}@2x.png`);
  }
}
