// Generează icon-urile PWA (PNG) fără dependențe: patru operatori (+ − × ÷) pe fundal indigo.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
mkdirSync(outDir, { recursive: true });

const BG_A = [99, 102, 241]; // #6366f1
const BG_B = [139, 92, 246]; // #8b5cf6
const WHITE = [255, 255, 255];
const AMBER = [251, 191, 36];

// Forme în coordonate unitare [0,1]: capsule (segment + rază) și cercuri.
function shapes() {
  const s = 0.105;
  const r = 0.034;
  const q = [
    [0.31, 0.31],
    [0.69, 0.31],
    [0.31, 0.69],
    [0.69, 0.69],
  ];
  const d = s * 0.72;
  return [
    // +
    { seg: [q[0][0] - s, q[0][1], q[0][0] + s, q[0][1]], r, c: WHITE },
    { seg: [q[0][0], q[0][1] - s, q[0][0], q[0][1] + s], r, c: WHITE },
    // −
    { seg: [q[1][0] - s, q[1][1], q[1][0] + s, q[1][1]], r, c: WHITE },
    // ×
    { seg: [q[2][0] - d, q[2][1] - d, q[2][0] + d, q[2][1] + d], r, c: AMBER },
    { seg: [q[2][0] - d, q[2][1] + d, q[2][0] + d, q[2][1] - d], r, c: AMBER },
    // ÷
    { seg: [q[3][0] - s, q[3][1], q[3][0] + s, q[3][1]], r, c: WHITE },
    { seg: [q[3][0], q[3][1] - s * 0.95, q[3][0], q[3][1] - s * 0.95], r: r * 1.15, c: WHITE },
    { seg: [q[3][0], q[3][1] + s * 0.95, q[3][0], q[3][1] + s * 0.95], r: r * 1.15, c: WHITE },
  ];
}

function segDist(px, py, [ax, ay, bx, by]) {
  const vx = bx - ax;
  const vy = by - ay;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / len2));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function roundRectDist(px, py, size, radius) {
  const hx = size / 2;
  const cx = Math.abs(px - hx) - (hx - radius);
  const cy = Math.abs(py - hx) - (hx - radius);
  const outside = Math.hypot(Math.max(cx, 0), Math.max(cy, 0));
  return outside + Math.min(Math.max(cx, cy), 0) - radius;
}

function render(size, { cornerRadius = 0, contentScale = 1 } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const list = shapes();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      const t = (cx + cy) / (2 * size);
      let rgb = BG_A.map((a, i) => a + (BG_B[i] - a) * t);
      let alpha = 1;
      if (cornerRadius > 0) {
        alpha = Math.max(0, Math.min(1, 0.5 - roundRectDist(cx, cy, size, cornerRadius)));
      }
      // coordonate unitare ale conținutului (scalat în jurul centrului)
      const ux = ((cx / size - 0.5) / contentScale) + 0.5;
      const uy = ((cy / size - 0.5) / contentScale) + 0.5;
      for (const sh of list) {
        const dPx = (segDist(ux, uy, sh.seg) - sh.r) * size * contentScale;
        const cov = Math.max(0, Math.min(1, 0.5 - dPx));
        if (cov > 0) rgb = rgb.map((v, i) => v + (sh.c[i] - v) * cov);
      }
      const o = (y * size + x) * 4;
      px[o] = Math.round(rgb[0]);
      px[o + 1] = Math.round(rgb[1]);
      px[o + 2] = Math.round(rgb[2]);
      px[o + 3] = Math.round(alpha * 255);
    }
  }
  return encodePng(size, size, px);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePng(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const files = {
  'icon-192.png': render(192, { cornerRadius: 192 * 0.22 }),
  'icon-512.png': render(512, { cornerRadius: 512 * 0.22 }),
  'icon-maskable-512.png': render(512, { contentScale: 0.78 }),
  'apple-touch-icon.png': render(180, { contentScale: 0.86 }),
};
for (const [name, buf] of Object.entries(files)) {
  writeFileSync(join(outDir, name), buf);
  console.log(`${name}: ${buf.length} B`);
}
