// Arma el PDF v9 desde laminas-v9/ (orden por nombre) y agrega los enlaces internos.
// Uso (desde la raíz del repo): node ai-generations/2026-10-12_brochure-efeonce-360/build-pdf.mjs
import fs from 'node:fs';
import { PDFDocument, PDFName, PDFArray, PDFNumber } from 'pdf-lib';
const D = 'ai-generations/2026-10-12_brochure-efeonce-360/';
const files = fs.readdirSync(D + 'laminas-v9').filter(f => f.endsWith('.jpg')).sort();
const code = f => f.split('-')[1];
const pdf = await PDFDocument.create();
const pages = [];
for (const f of files) {
  const img = await pdf.embedJpg(fs.readFileSync(D + 'laminas-v9/' + f));
  const p = pdf.addPage([1920, 1080]);
  p.drawImage(img, { x: 0, y: 0, width: 1920, height: 1080 });
  pages.push(p);
}
// Lámina 04 (órbita): cada esfera y su rótulo llevan a la portada de su línea. Cajas en px de la lámina (y desde arriba).
const LINKS = { V04: [
  { to: 'C01', box: [640, 290, 980, 440] },   // Engine
  { to: 'C02', box: [1400, 290, 1720, 440] }, // Brand
  { to: 'C03', box: [1560, 610, 1890, 740] }, // Voice
  { to: 'C04', box: [1040, 780, 1330, 970] }, // Revenue
  { to: 'C05', box: [540, 620, 820, 720] }    // Growth
] };
for (const [from, links] of Object.entries(LINKS)) {
  const i = files.findIndex(f => code(f) === from);
  if (i < 0) throw new Error('No encuentro ' + from);
  const annots = [];
  for (const { to, box: [x0, y0, x1, y1] } of links) {
    const j = files.findIndex(f => code(f) === to);
    if (j < 0) throw new Error('No encuentro ' + to);
    const dest = PDFArray.withContext(pdf.context);
    dest.push(pages[j].ref); dest.push(PDFName.of('Fit'));
    annots.push(pdf.context.register(pdf.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [x0, 1080 - y1, x1, 1080 - y0].map(n => PDFNumber.of(n)),
      Border: [0, 0, 0], Dest: dest
    })));
  }
  pages[i].node.set(PDFName.of('Annots'), pdf.context.obj(annots));
}
pdf.setTitle('Efeonce — Agencia de Marketing 360°');
fs.writeFileSync(D + 'Efeonce-Brochure-Agencia-de-Marketing-360-v9.pdf', await pdf.save());
console.log(files.length, 'páginas · enlaces en', Object.keys(LINKS).join(', '));
