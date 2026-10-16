// Compone las piezas reales de Berel sobre la base generada. Escribe comp.png y cards.json.
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'; import fs from 'node:fs';
const S = process.argv[2]; const base = process.argv[3] || 'base-v1.png'; const out = process.argv[4] || 'comp.png';
const CARDS = [
  { f: 'portada-3.webp', x: 1080, y: 70, w: 400, rot: 7 },
  { f: 'portada-6.webp', x: 1150, y: 470, w: 330, rot: -6 },
  { f: 'portada-4.webp', x: 450, y: 620, w: 360, rot: -9 },
  { f: 'story-n42.png', x: 430, y: 150, w: 150, rot: 8 },
  { f: 'story-n35.png', x: 1370, y: 760, w: 140, rot: 9 },
];
const comps = []; const meta = [];
for (const c of CARDS) {
  const m = await sharp(`${S}/${c.f}`).metadata(); const h = Math.round(c.w * m.height / m.width); const B = 7;
  const inner = await sharp(`${S}/${c.f}`).resize(c.w, h).png().toBuffer();
  const svg = `<svg width="${c.w + 2 * B}" height="${h + 2 * B}"><rect width="100%" height="100%" rx="10" fill="#fbfaf7"/></svg>`;
  const card = await sharp(Buffer.from(svg)).composite([{ input: inner, left: B, top: B }]).png().toBuffer();
  const rotated = await sharp(card).rotate(c.rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const shadow = await sharp(rotated).ensureAlpha().linear(0, 0).blur(14).png().toBuffer();
  comps.push({ input: shadow, left: c.x + 10, top: c.y + 18, blend: 'multiply' }, { input: rotated, left: c.x, top: c.y });
  meta.push({ ...c, h, B });
}
await sharp(`${S}/${base}`).composite(comps).png().toFile(`${S}/${out}`);
// Máscara de las piezas (blanco = pieza), para reponer su contenido exacto después del acabado.
const masks = [];
for (const c of meta) {
  const svg = `<svg width="${c.w + 2 * c.B}" height="${c.h + 2 * c.B}"><rect x="${c.B + 3}" y="${c.B + 3}" width="${c.w - 6}" height="${c.h - 6}" fill="#fff"/></svg>`;
  masks.push({ input: await sharp(Buffer.from(svg)).rotate(c.rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: c.x, top: c.y });
}
const mb = await sharp(`${S}/${base}`).metadata();
await sharp({ create: { width: mb.width, height: mb.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).composite(masks).png().toFile(`${S}/cards-mask.png`);
fs.writeFileSync(`${S}/cards.json`, JSON.stringify(meta)); console.log('ok');
