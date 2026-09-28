// Generates the PWA PNG icons (abstract widget grid, no brand imagery).
// Usage: node scripts/gen-icons.mjs
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [0x0f, 0x11, 0x14];
const ACCENT = [0x38, 0xbd, 0xf8];
const LIGHT = [0xf2, 0xf4, 0xf6];

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function inRoundRect(x, y, rx, ry, rw, rh, r) {
  if (x < rx || y < ry || x >= rx + rw || y >= ry + rh) return false;
  const cx = Math.min(Math.max(x, rx + r), rx + rw - r);
  const cy = Math.min(Math.max(y, ry + r), ry + rh - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function png(size, maskable) {
  const s = size / 32;
  const pad = maskable ? size * 0.12 : 0;
  const k = (size - 2 * pad) / size;
  const rects = [
    [2, 2, 16, 12, ACCENT, 1],
    [20, 2, 10, 12, LIGHT, 0.85],
    [2, 16, 10, 14, LIGHT, 0.85],
    [14, 16, 16, 14, ACCENT, 0.55],
  ];
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let col = BG;
      for (const [rx, ry, rw, rh, c, a] of rects) {
        if (inRoundRect(x, y, pad + rx * s * k, pad + ry * s * k, rw * s * k, rh * s * k, 3.5 * s * k)) {
          col = c.map((v, i) => Math.round(v * a + BG[i] * (1 - a)));
        }
      }
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = col[0];
      raw[o + 1] = col[1];
      raw[o + 2] = col[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

writeFileSync("public/icons/icon-192.png", png(192, false));
writeFileSync("public/icons/icon-512.png", png(512, false));
writeFileSync("public/icons/icon-maskable-512.png", png(512, true));
writeFileSync("public/favicon.ico", png(48, false)); // PNG-in-ICO is accepted by browsers
console.log("icons written");
