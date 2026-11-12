// Gera public/pwa-192.png e public/pwa-512.png sem dependências: quadrado chapado em court com
// um "N" em on-court, o mesmo desenho de public/favicon.svg (sem símbolo próprio, ver identidade).
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

// Contorno do "N" em unidades de 64, igual ao path do favicon.svg.
const N_SHAPE = [
  [18, 50],
  [18, 14],
  [26, 14],
  [38, 36],
  [38, 14],
  [46, 14],
  [46, 50],
  [38, 50],
  [26, 28],
  [26, 50],
];
const inside = (x, y) => {
  let hit = false;
  for (let i = 0, j = N_SHAPE.length - 1; i < N_SHAPE.length; j = i++) {
    const [xi, yi] = N_SHAPE[i];
    const [xj, yj] = N_SHAPE[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
};

function icon(size) {
  const court = [0x00, 0x04, 0x43]; // azul Trojan #000443
  const onCourt = [0xf5, 0xf4, 0xf3]; // branco #f5f4f3
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const px = inside(((x + 0.5) * 64) / size, ((y + 0.5) * 64) / size) ? onCourt : court;
      raw.set(px, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const size of [192, 512])
  writeFileSync(new URL(`../public/pwa-${size}.png`, import.meta.url), icon(size));
