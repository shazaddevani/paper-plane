/* eslint-disable no-console */
/**
 * Tiny linen-speckle tile used as a full-screen paper grain overlay.
 *
 *   node tools/makeGrain.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 128;
const OUT = path.join(__dirname, '..', 'assets', 'paper-grain.png');

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

function encodePng(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function hash(n) {
  let x = (n + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const rgba = Buffer.alloc(SIZE * SIZE * 4);

for (let y = 0; y < SIZE; y += 1) {
  for (let x = 0; x < SIZE; x += 1) {
    const i = (y * SIZE + x) * 4;
    const n = hash(x * 131 + y * 9176 + 42);
    const fiber = hash(x * 3 + y * 41) > 0.992 ? 1 : 0;
    const speckle = n > 0.82 ? (n - 0.82) / 0.18 : 0;
    const warm = 0.12 + speckle * 0.55 + fiber * 0.35;
    const cool = speckle * 0.22;
    rgba[i] = Math.round(210 + warm * 30 - cool * 40);
    rgba[i + 1] = Math.round(190 + warm * 28 - cool * 20);
    rgba[i + 2] = Math.round(168 + warm * 18);
    rgba[i + 3] = Math.round(fiber ? 55 : speckle * 48);
  }
}

fs.writeFileSync(OUT, encodePng(SIZE, SIZE, rgba));
console.log(`wrote ${path.relative(process.cwd(), OUT)} (${SIZE}x${SIZE})`);
