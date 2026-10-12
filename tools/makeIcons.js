/* eslint-disable no-console */
/**
 * Draws the app icons from scratch: a golden-hour sky and a folded paper dart,
 * rasterised here and written straight out as PNG. Keeping the artwork as code
 * means every pixel shipped with the app came from this repository.
 *
 *   node tools/makeIcons.js
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS = path.join(__dirname, '..', 'assets');

// ---------------------------------------------------------------- png writing

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

function encodePng(width, height, rgba, { opaque = false } = {}) {
  const channels = opaque ? 3 : 4;
  const stride = width * channels;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    if (!opaque) {
      rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
      continue;
    }
    for (let x = 0; x < width; x += 1) {
      const si = (y * width + x) * 4;
      const di = y * (stride + 1) + 1 + x * 3;
      raw[di] = rgba[si];
      raw[di + 1] = rgba[si + 1];
      raw[di + 2] = rgba[si + 2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = opaque ? 2 : 6; // truecolour, or truecolour with alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ------------------------------------------------------------------- painting

function hex(value) {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function canvas(size) {
  return { size, data: Buffer.alloc(size * size * 4) };
}

/** Source-over one pixel. */
function blend(target, x, y, rgb, alpha) {
  if (alpha <= 0) return;
  const i = (y * target.size + x) * 4;
  const dstA = target.data[i + 3] / 255;
  const outA = alpha + dstA * (1 - alpha);
  if (outA <= 0) return;
  for (let c = 0; c < 3; c += 1) {
    const dst = target.data[i + c];
    target.data[i + c] = Math.round((rgb[c] * alpha + dst * dstA * (1 - alpha)) / outA);
  }
  target.data[i + 3] = Math.round(outA * 255);
}

const SAMPLES = 4;

/**
 * Fills whatever `inside(x, y)` says is covered, supersampled so the diagonal
 * wing edges do not come out as staircases.
 */
function fill(target, bounds, rgb, inside, alphaScale = 1) {
  const x0 = Math.max(0, Math.floor(bounds[0]));
  const y0 = Math.max(0, Math.floor(bounds[1]));
  const x1 = Math.min(target.size - 1, Math.ceil(bounds[2]));
  const y1 = Math.min(target.size - 1, Math.ceil(bounds[3]));
  const step = 1 / SAMPLES;
  const total = SAMPLES * SAMPLES;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          if (inside(x + (sx + 0.5) * step, y + (sy + 0.5) * step)) hits += 1;
        }
      }
      if (hits > 0) blend(target, x, y, rgb, (hits / total) * alphaScale);
    }
  }
}

function polygonTest(points) {
  return (px, py) => {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
      const [xi, yi] = points[i];
      const [xj, yj] = points[j];
      if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  };
}

function polygonBounds(points) {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1];
}

function fillPolygon(target, points, rgb, alphaScale = 1) {
  fill(target, polygonBounds(points), rgb, polygonTest(points), alphaScale);
}

function fillEllipse(target, cx, cy, rx, ry, rgb, alphaScale = 1) {
  fill(
    target,
    [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1],
    rgb,
    (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1,
    alphaScale,
  );
}

// --------------------------------------------------------------------- pieces

const SKY = [
  [0.0, hex('#141D38')],
  [0.34, hex('#3A4574')],
  [0.6, hex('#7C5A82')],
  [0.82, hex('#D97E58')],
  [1.0, hex('#F2B472')],
];

function skyAt(t) {
  for (let i = 1; i < SKY.length; i += 1) {
    if (t <= SKY[i][0]) {
      const span = SKY[i][0] - SKY[i - 1][0];
      return mix(SKY[i - 1][1], SKY[i][1], (t - SKY[i - 1][0]) / span);
    }
  }
  return SKY[SKY.length - 1][1];
}

/** Gradient sky with a low sun bloom, painted opaque across the whole square. */
function paintSky(target) {
  const { size } = target;
  const sun = hex('#FFD79A');
  const sunX = size * 0.5;
  const sunY = size * 0.92;
  const sunR = size * 0.52;

  for (let y = 0; y < size; y += 1) {
    const base = skyAt((y + 0.5) / size);
    for (let x = 0; x < size; x += 1) {
      const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY) / sunR;
      const glow = Math.max(0, 1 - d) ** 2.2 * 0.85;
      const rgb = mix(base, sun, glow);
      const i = (y * size + x) * 4;
      target.data[i] = Math.round(rgb[0]);
      target.data[i + 1] = Math.round(rgb[1]);
      target.data[i + 2] = Math.round(rgb[2]);
      target.data[i + 3] = 255;
    }
  }

  fillEllipse(target, sunX, sunY, size * 0.12, size * 0.12, hex('#FFEBC4'), 0.9);
}

/**
 * The dart, in a unit space where the paper spans u 0..1 and the streamer
 * trails back to u -0.3. Two triangles meeting at a centre crease, with the
 * notch between the tail corners left open, which is what makes it read as
 * folded paper rather than an arrowhead.
 */
const NOSE = [1.0, 0.31];
const TAIL_TOP = [0.0, 0.0];
const TAIL_BOTTOM = [0.03, 0.62];
const KEEL = [0.24, 0.31];
const U_MIN = -0.3;
const U_MAX = 1.0;

function paintPlane(target, centerX, centerY, width, withStreamer = true) {
  const s = width / (U_MAX - U_MIN);
  const ox = centerX - ((U_MIN + U_MAX) / 2) * s;
  const oy = centerY - 0.31 * s;
  const at = ([u, v]) => [ox + u * s, oy + v * s];

  if (withStreamer) {
    const ribbon = hex('#E0605A');
    for (let i = 0; i < 5; i += 1) {
      const [x, y] = at([0.15 - i * 0.082, 0.31 + i * 0.012]);
      fillEllipse(target, x, y, s * 0.038 - i * s * 0.005, s * 0.02, ribbon, 0.95 - i * 0.16);
    }
  }

  fillPolygon(target, [NOSE, TAIL_TOP, KEEL].map(at), hex('#FDF7EC'));
  fillPolygon(target, [NOSE, KEEL, TAIL_BOTTOM].map(at), hex('#D8CCB8'));

  const [kx, ky] = at(KEEL);
  const [nx, ny] = at(NOSE);
  const t = s * 0.008;
  fillPolygon(
    target,
    [
      [kx, ky - t],
      [nx, ny - t],
      [nx, ny + t],
      [kx, ky + t],
    ],
    hex('#A8997F'),
  );
}

function write(name, target, opts) {
  const file = path.join(ASSETS, name);
  fs.writeFileSync(file, encodePng(target.size, target.size, target.data, opts));
  console.log(`wrote ${name} (${target.size}x${target.size})`);
}

// ---------------------------------------------------------------------- build

fs.mkdirSync(ASSETS, { recursive: true });

const icon = canvas(1024);
paintSky(icon);
paintPlane(icon, 1024 * 0.5, 1024 * 0.44, 1024 * 0.66);
write('icon.png', icon, { opaque: true });

const favicon = canvas(96);
paintSky(favicon);
paintPlane(favicon, 96 * 0.5, 96 * 0.44, 96 * 0.72);
write('favicon.png', favicon);

const background = canvas(1024);
paintSky(background);
write('android-icon-background.png', background);

// Adaptive icons crop hard, so the plane sits well inside the safe circle.
const foreground = canvas(1024);
paintPlane(foreground, 512, 512, 1024 * 0.5);
write('android-icon-foreground.png', foreground);

const splash = canvas(512);
paintPlane(splash, 256, 256, 512 * 0.86);
write('splash-icon.png', splash);
