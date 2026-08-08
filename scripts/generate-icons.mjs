// Genera los iconos PNG del PWA sin dependencias externas.
// Uso: node scripts/generate-icons.mjs
import zlib from 'node:zlib';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

// ---- CRC32 (PNG) ----
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
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- Paleta ----
const SKY = [0x4a, 0x90, 0xd9];
const GREEN = [0x3d, 0x7a, 0x3f];

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.2; // esquinas redondeadas
  const cos45 = Math.SQRT1_2;
  const sin45 = Math.SQRT1_2;
  // Hoja blanca: elipse girada 45° respecto a su centro
  const leafCx = size * 0.52;
  const leafCy = size * 0.5;
  const leafA = size * 0.21;
  const leafB = size * 0.36;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const px = x + 0.5;
      const py = y + 0.5;

      // Esquina redondeada
      const qx = Math.max(radius - px, px - (size - radius), 0);
      const qy = Math.max(radius - py, py - (size - radius), 0);
      const inside = qx * qx + qy * qy <= radius * radius;
      if (!inside) {
        rgba[i + 3] = 0;
        continue;
      }

      // Fondo: gradiente cielo -> verde
      const t = py / size;
      const r = Math.round(lerp(SKY[0], GREEN[0], t));
      const g = Math.round(lerp(SKY[1], GREEN[1], t));
      const b = Math.round(lerp(SKY[2], GREEN[2], t));

      // Hoja blanca
      const dx = px - leafCx;
      const dy = py - leafCy;
      const rx = dx * cos45 + dy * sin45;
      const ry = -dx * sin45 + dy * cos45;
      const inLeaf = (rx * rx) / (leafA * leafA) + (ry * ry) / (leafB * leafB) <= 1;

      let cr = r;
      let cg = g;
      let cb = b;
      if (inLeaf) {
        // Hoja blanca con ligero degradado y "nervio" verde
        const vein =
          Math.abs(rx) < size * 0.028 && ry > -leafB * 0.7 && ry < leafB * 0.9;
        if (vein) {
          cr = 0x2f;
          cg = 0x5f;
          cb = 0x31;
        } else {
          const shade = 0.92 + 0.08 * (ry / leafB + 0.5);
          cr = Math.round(255 * shade);
          cg = Math.round(255 * shade);
          cb = Math.round(255 * shade);
        }
      }

      rgba[i] = cr;
      rgba[i + 1] = cg;
      rgba[i + 2] = cb;
      rgba[i + 3] = 255;
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'apple-touch-icon.png', size: 180 },
];

for (const { file, size } of targets) {
  const png = drawIcon(size);
  fs.writeFileSync(path.join(outDir, file), png);
  console.log(`✓ ${file} (${size}x${size}, ${png.length} bytes)`);
}
