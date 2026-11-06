// Renderiza las 66 piezas del canvas a tamaño real y las une en un PDF (una página por pieza).
const fs = require('fs');
const path = require('path');
const NM = '/Users/jreye/Documents/greenhouse-eo/node_modules/';
const { chromium } = require(NM + 'playwright');
const { PDFDocument } = require(NM + 'pdf-lib');
const SP = '/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/556be26d-0508-40ae-90b2-998711ee8289/scratchpad';
const P = SP + '/canvas/project/';
const OUT = SP + '/export';
const SEL = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-cybersky-peru/selfies/grado-v4/';
fs.mkdirSync(OUT + '/img', { recursive: true });
fs.mkdirSync(OUT + '/fonts', { recursive: true });
for (const f of fs.readdirSync(SP + '/skyds/project/fonts')) fs.copyFileSync(SP + '/skyds/project/fonts/' + f, OUT + '/fonts/' + f);
fs.copyFileSync(SP + '/skyds/project/tokens.css', OUT + '/tokens.css');

// blob -> archivo local
const blobs = {
  '45cf674e6ba1b4aea9014bea5fdbcc6c': SP + '/kv/foto-buenos-aires.jpg',
  'ca0994320972d5e6f78d39a39dc2f915': SP + '/kv/sello-puntualidad.png'
};
const swap = fs.readFileSync(SP + '/swap-fotos.cjs', 'utf8');
for (const m of swap.matchAll(/'([a-z-]+)': '([0-9a-f]{32})'/g)) blobs[m[2]] = SEL + m[1] + '.jpg';
const fixBlobs = (s) => s.replace(/\/_blob\/([0-9a-f]{32})/g, (x, id) => {
  if (!blobs[id]) throw new Error('blob sin archivo ' + id);
  return 'file://' + blobs[id];
});

const body = (file) => {
  const s = fs.readFileSync(P + file, 'utf8');
  return s.split('</helmet>')[1].split('</x-dc>')[0];
};
const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function render(tpl, vals) {
  tpl = tpl.replace(/<sc-for list="\{\{([^}]+)\}\}" as="([a-z]+)"[^>]*>([\s\S]*?)<\/sc-for>/g, (m, list, as, inner) =>
    get(vals, list).map((it) => render(inner, Object.assign({}, vals, { [as]: it }))).join(''));
  tpl = tpl.replace(/<sc-if value="\{\{([^}]+)\}\}"[^>]*>([\s\S]*?)<\/sc-if>/g, (m, cond, inner) => (get(vals, cond) ? inner : ''));
  tpl = tpl.replace(/<dc-import name="([A-Za-z]+)"[^>]*><\/dc-import>/g, (m, name) => render(body(name + '.dc.html'), vals));
  return tpl.replace(/\{\{([^}]+)\}\}/g, (m, p) => { const v = get(vals, p.trim()); if (v === undefined) throw new Error('hueco ' + p); return v; });
}
function vals(tplFile, destino) {
  const s = fs.readFileSync(P + tplFile, 'utf8');
  const code = s.match(/<script type="text\/x-dc" data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1];
  const fn = new Function('DCLogic', 'props', code + '\nconst c = new Component(); c.props = props; return c.renderVals();');
  return fn(class {}, { destino });
}
const canvas = JSON.parse(fs.readFileSync(P + 'canvas.json', 'utf8'));
const TPL = { popup: 'PlantillaPopup.dc.html', post: 'PlantillaPost.dc.html', story: 'PlantillaStory.dc.html' };
const pages = [];
for (const file of canvas.order) {
  const b = canvas.boards[file];
  if (b.page === 'plantillas') continue;
  const src = fs.readFileSync(P + file, 'utf8');
  const m = src.match(/name="(Plantilla[A-Za-z]+)" destino="([a-z-]+)"/);
  const fmt = Object.keys(TPL).find((k) => TPL[k] === m[1] + '.dc.html');
  pages.push({ page: b.page, file, fmt, destino: m[2], w: b.w, h: b.h, title: b.title });
}
// orden: internacionales y luego nacionales, por destino y formato
const ordenFmt = { popup: 0, post: 1, story: 2 };
const filas = canvas.order.filter((f) => canvas.boards[f].page !== 'plantillas');
pages.sort((a, b) => (a.page === b.page ? 0 : a.page === 'internacionales' ? -1 : 1) || filas.indexOf(a.file) - filas.indexOf(b.file) || ordenFmt[a.fmt] - ordenFmt[b.fmt]);

(async () => {
  const browser = await chromium.launch();
  const pdf = await PDFDocument.create();
  for (const pg of pages) {
    const v = vals(TPL[pg.fmt], pg.destino);
    const html = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="tokens.css"><style>body{margin:0}</style></head><body>' +
      fixBlobs(render(body(TPL[pg.fmt]), v)) + '</body></html>';
    const hf = OUT + '/pieza.html';
    fs.writeFileSync(hf, html);
    const page = await browser.newPage({ viewport: { width: pg.w, height: pg.h }, deviceScaleFactor: 1 });
    await page.goto('file://' + hf);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: pg.w, height: pg.h } });
    await page.close();
    const name = pg.fmt + '-' + pg.destino;
    fs.writeFileSync(OUT + '/img/' + name + '.png', png);
    const img = await pdf.embedPng(png);
    const p = pdf.addPage([pg.w, pg.h]);
    p.drawImage(img, { x: 0, y: 0, width: pg.w, height: pg.h });
    process.stdout.write('.');
  }
  await browser.close();
  pdf.setTitle('SKY CyberSky Perú — Adaptaciones');
  const bytes = await pdf.save();
  const dest = process.env.HOME + '/Downloads/SKY-CyberSky-Peru-adaptaciones.pdf';
  fs.writeFileSync(dest, bytes);
  console.log('\n' + pages.length + ' páginas →', dest, (bytes.length / 1e6).toFixed(1) + ' MB');
})();
