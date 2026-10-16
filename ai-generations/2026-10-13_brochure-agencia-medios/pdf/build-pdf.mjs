// PDF del brochure: cada lámina es una página 1920×1080 (JPEG q90); el índice (pág. 2) es HTML vivo con vínculos internos #p<N>.
// Marcadores (outline) por capítulo. Uso: node build-pdf.mjs
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');
const sharp = require('sharp');
const { chromium } = require('playwright');
const R = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-13_brochure-agencia-medios';
const pages = JSON.parse(fs.readFileSync('/tmp/_pages.json', 'utf8'));
const titles = JSON.parse(fs.readFileSync('/tmp/_titles.json', 'utf8'));
pages.splice(1, 0, ['IX-indice.dc.html', null]);
const ix = fs.readFileSync(`${R}/native/formatos/IX-indice.html`, 'utf8');
const ixHead = ix.match(/<head>([\s\S]*?)<\/head>/)[1], ixBody = ix.match(/<body>([\s\S]*?)<\/body>/)[1];
let html = `<!doctype html><html lang="es"><head>${ixHead}<style>@page{size:1920px 1080px;margin:0}html,body{margin:0;padding:0;background:#001a33}section{position:relative;width:1920px;height:1080px;overflow:hidden;page-break-after:always;break-after:page}section img{display:block;width:1920px;height:1080px}h1,h2{position:absolute;left:-9999px;top:0;margin:0;font-size:1px}</style></head><body>`;
for (let i = 0; i < pages.length; i++) {
  const [k, src] = pages[i], n = i + 1, t = titles[k] || 'Índice';
  const isCap = /^R[1-6]-capitulo/.test(k) || k === 'Main.dc.html' || k === 'IX-indice.dc.html';
  const head = isCap ? `<h1>${t}</h1>` : `<h2>${t}</h2>`;
  if (!src) { html += `<section id="p${n}">${head}${ixBody}</section>`; continue; }
  const jpg = `${R}/pdf/jpg/${String(n).padStart(2, '0')}.jpg`;
  await sharp(src).resize(1920, 1080, { fit: 'cover' }).flatten({ background: '#001a33' }).jpeg({ quality: 90, mozjpeg: true }).toFile(jpg);
  html += `<section id="p${n}">${head}<img src="file://${jpg}" alt=""></section>`;
}
html += `</body></html>`;
fs.writeFileSync(`${R}/pdf/brochure.html`, html);
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await pg.goto(`file://${R}/pdf/brochure.html`, { waitUntil: 'networkidle' });
await pg.evaluate(() => document.fonts.ready);
await pg.pdf({ path: `${R}/Efeonce-Brochure-Agencia-de-Medios.pdf`, width: '1920px', height: '1080px', printBackground: true, outline: true, tagged: true, preferCSSPageSize: true });
await b.close();
console.log('pages', pages.length);
