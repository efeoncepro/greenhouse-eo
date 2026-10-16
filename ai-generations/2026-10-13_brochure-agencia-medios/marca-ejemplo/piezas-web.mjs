// Piezas sueltas de la marca de ejemplo para la landing: la misma idea en 9:16, 4:5, 1:1 y 16:9, y nueve versiones
// de una plantilla (creatividad dinámica). Cada pieza se renderiza sola, sin contexto de lámina, para componerla en web.
// La barra lima de la composición vertical sube (slashTop) para no cruzar el titular.
// Uso: node piezas-web.mjs [pieza…]  → marca-ejemplo/web/*.png (sin argumentos, todas)
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { nortAd, FONTS, SHOE } from './nortica.mjs';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const DIR = new URL('.', import.meta.url).pathname;
const OUT = `${DIR}web/`;
// La foto original deja la cabeza de la corredora pegada al borde superior: en los formatos verticales el logo le cortaba
// la cara. Esta versión (foto:expandir al 72 %, relleno sólo del cielo y la ciudad) le da aire arriba sin tocarla.
const HERO = `${DIR}ej-hero-volt-aire.png`;
const SHOT = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs';
fs.mkdirSync(OUT, { recursive: true });

const piezas = [
  ['fmt-9x16', 540, 960, { lines: ['CORRE', 'DE NOCHE'], img: HERO, pos: '37% 50%', slashTop: 0.24 }],
  ['fmt-4x5', 640, 800, { lines: ['CORRE', 'DE NOCHE'], img: HERO, pos: '37% 50%', slashTop: 0.2 }],
  ['fmt-1x1', 720, 720, { lines: ['CORRE', 'DE NOCHE'], img: HERO, kind: 'wide', pos: '70% 50%', hs: 0.7 }],
  ['fmt-16x9', 960, 540, { lines: ['CORRE', 'DE NOCHE'], kind: 'wide', img: HERO }],
  ['dg-191x1', 764, 400, { lines: ['HOY LLUEVE', 'CORRE IGUAL'], img: SHOE, kind: 'wide' }],
  ...[[['CORRE', 'DE NOCHE'], HERO], [['HOY LLUEVE', 'CORRE IGUAL'], SHOE], [['MÁS', 'LIVIANA'], SHOE], [['TU PRIMER', '10K'], HERO], [['VUELVE', 'A CORRER'], HERO],
    [['SANTIAGO', 'CORRE'], HERO], [['CDMX', 'CORRE'], HERO], [['ÚLTIMAS', 'TALLAS'], SHOE], [['ELIGE', 'TU SUELA'], SHOE]]
    .map(([lines, img], i) => [`dco-${i + 1}`, 480, 600, { lines, img, pos: img === HERO ? '37% 50%' : 'center', slashTop: 0.18, label: i % 3 === 2 ? 'Comprar' : 'Ver modelo' }]),
];

const solo = process.argv.slice(2);
for (const [nombre, w, h, opts] of piezas.filter(([n]) => !solo.length || solo.includes(n))) {
  const html = `${OUT}${nombre}.html`;
  fs.writeFileSync(html, `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?${FONTS}&family=Poppins:wght@400;600&display=swap"><style>body{margin:0;background:#000}</style></head><body><div style="position:relative;width:${w}px;height:${h}px;overflow:hidden">${nortAd(w, h, opts)}</div></body></html>`);
  const tmp = `${OUT}_${nombre}-1920.png`;
  execFileSync('node', [SHOT, html, tmp]);
  await sharp(tmp).extract({ left: 0, top: 0, width: w, height: h }).png().toFile(`${OUT}${nombre}.png`);
  fs.unlinkSync(tmp);
  console.log(nombre);
}
