// Tormenta de piezas reales de Sky en profundidad (lejos: chicas y nítidas; cerca: grandes y desenfocadas).
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js'; import fs from 'node:fs';
const S = process.argv[2];
// [pieza, cx, cy, ancho, rotación, desenfoque]
const C = [
  ['c12', 760, 470, 54, -18, 0], ['c14', 640, 520, 62, 14, 0], ['c03', 880, 560, 70, -8, 0], ['c17', 560, 600, 52, 22, 0.4],
  ['c22', 1010, 600, 58, 10, 0], ['c18', 720, 640, 78, -14, 0], ['c06', 1180, 640, 60, 18, 0],
  ['c16', 520, 760, 130, 12, 0], ['c13', 900, 740, 140, -10, 0], ['c21', 1250, 770, 120, 16, 0], ['c09', 700, 860, 160, -20, 0],
  ['c07', 1080, 900, 170, 8, 0], ['c24', 1380, 930, 150, -14, 0], ['c11', 560, 1010, 190, 18, 0], ['c02', 880, 1040, 210, -6, 0],
  ['c20', 1290, 1150, 300, 14, 3.5], ['c10', 600, 1250, 360, -12, 4.5], ['c04', 1050, 1260, 330, 7, 3],
];
const comps = [], masks = [], meta = [];
for (const [p, cx, cy, w, rot, blur] of C) {
  const f = `${S}/cand/${p}.png`; const m = await sharp(f).metadata(); const h = Math.round(w * m.height / m.width); const B = Math.max(2, Math.round(w / 45));
  const inner = await sharp(f).removeAlpha().resize(w, h).png().toBuffer();
  let card = await sharp(Buffer.from(`<svg width="${w + 2 * B}" height="${h + 2 * B}"><rect width="100%" height="100%" rx="${Math.max(3, B * 1.4)}" fill="#fff"/></svg>`)).composite([{ input: inner, left: B, top: B }]).png().toBuffer();
  let r = await sharp(card).rotate(rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  if (blur) r = await sharp(r).blur(blur).png().toBuffer();
  const rm = await sharp(r).metadata(); const x = Math.round(cx - rm.width / 2), y = Math.round(cy - rm.height / 2);
  const sh = await sharp(r).ensureAlpha().linear(0, 0).blur(Math.max(4, w / 16)).png().toBuffer();
  const ins = (img, lx, ty) => { // recorta a la imagen base
    return { input: img, left: lx, top: ty }; };
  comps.push({ ...ins(sh, x + Math.round(w / 25), y + Math.round(w / 14)), blend: 'multiply' }, ins(r, x, y));
  if (!blur) { const ms = await sharp(Buffer.from(`<svg width="${w + 2 * B}" height="${h + 2 * B}"><rect x="${B + 2}" y="${B + 2}" width="${w - 4}" height="${h - 4}" fill="#fff"/></svg>`)).rotate(rot, { background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(); masks.push({ input: ms, left: x, top: y }); }
  meta.push({ f: `cand/${p}.png`, x, y, w: rm.width, h: rm.height, blur });
}
// Composición en un lienzo con margen para piezas que salen del cuadro, luego recorte.
const M = 400; const base = await sharp(`${S}/base-cine.png`).extend({ top: M, bottom: M, left: M, right: M, background: '#000' }).png().toBuffer();
const sh = c => ({ ...c, left: c.left + M, top: c.top + M });
await sharp(await sharp(base).composite(comps.map(sh)).png().toBuffer()).extract({ left: M, top: M, width: 1536, height: 1344 }).png().toFile(`${S}/comp-cine.png`);
const mk = await sharp({ create: { width: 1536 + 2 * M, height: 1344 + 2 * M, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } }).composite(masks.map(sh)).png().toBuffer();
await sharp(mk).extract({ left: M, top: M, width: 1536, height: 1344 }).png().toFile(`${S}/cards-mask.png`);
fs.writeFileSync(`${S}/cards-r.json`, JSON.stringify(meta.filter(k => !k.blur && k.x >= 0 && k.y >= 0 && k.x + k.w <= 1536 && k.y + k.h <= 1344))); console.log('ok', meta.length);
