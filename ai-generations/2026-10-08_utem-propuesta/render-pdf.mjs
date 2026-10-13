import { chromium } from 'playwright';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
const [dir, blobs, out] = process.argv.slice(2);
const map = Object.fromEntries(fs.readdirSync(blobs).map(f => [f.split('.')[0], `file://${blobs}/${f}`]));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const pdf = await PDFDocument.create();
const files = fs.readdirSync(dir).filter(f => /^Tec-\d\d\.dc\.html$/.test(f)).sort();
for (const f of files) {
  let html = fs.readFileSync(dir + '/' + f, 'utf8').replace('<script src="./support.js"></script>', '');
  html = html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => { if (!map[id]) throw new Error('missing ' + id); return map[id]; });
  const tmp = `${dir}/../_render_${f}`; fs.writeFileSync(tmp, html);
  await p.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
  fs.unlinkSync(tmp);
  const j = await pdf.embedJpg(buf); const pg = pdf.addPage([960, 540]); pg.drawImage(j, { x: 0, y: 0, width: 960, height: 540 });
}
pdf.setTitle('Pibank · Propuesta técnica SEO y AEO 2027'); pdf.setAuthor('Efeonce');
fs.writeFileSync(out, await pdf.save()); await b.close(); console.log('pages', files.length);
