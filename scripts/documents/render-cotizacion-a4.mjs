import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

import { chromium } from 'playwright';
import { efeonceGraphicLine as gl, axisGeometry, axisSurface } from '@efeoncepro/axis-tokens';
import { brandAssetUrl } from '@efeoncepro/axis-brand-assets';
import { orbitSvg, sphereDividerSvg } from '@efeoncepro/axis-graphic-line';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const templateDir = path.join(repo, 'docs/commercial/templates/cotizacion-a4');
const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const money = value => '$' + new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value);
const lines = value => (Array.isArray(value) ? value : [value]).map(esc).join('<br>');

export function validateQuote(q) {
  const fail = message => { throw new Error(message); };

  if (q.version !== 1 || !['example', 'draft'].includes(q.status)) fail('Se requiere version: 1 y status: example o draft.');
  if (q.submitted || q.signed) fail('No se regenera una cotización presentada o firmada. Cree una nueva versión.');
  if (q.currency !== 'CLP') fail('Esta plantilla calcula pesos chilenos enteros: currency debe ser CLP.');
  if (!Number.isSafeInteger(q.net) || q.net <= 0) fail('net debe ser un entero positivo en CLP para el servicio completo.');
  if (!Number.isFinite(q.vatRate) || q.vatRate < 0 || q.vatRate > 1 || Math.abs(q.vatRate * 10000 - Math.round(q.vatRate * 10000)) > 1e-8) fail('vatRate debe estar entre 0 y 1, con hasta cuatro decimales.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.date ?? '') || !Number.isFinite(Date.parse(q.date)) || new Date(q.date).toISOString().slice(0, 10) !== q.date) fail('date debe ser una fecha real YYYY-MM-DD.');
  const string = (value, name) => { if (typeof value !== 'string' || !value.trim()) fail(`${name} debe ser texto no vacío.`); };
  const title = (value, name) => { if (Array.isArray(value)) { if (!value.length || value.length > 3) fail(`${name}: máximo tres líneas.`); value.forEach(v => string(v, name)); } else string(value, name); };

  string(q.reference, 'reference');
  for (const key of ['name', 'taxId', 'contact', 'email', 'phone']) string(q.supplier?.[key], `supplier.${key}`);
  if (!/^[^\s@<>"?&#]+@[^\s@<>"?&#]+\.[^\s@<>"?&#]+$/.test(q.supplier.email)) fail('supplier.email debe ser un correo válido.');
  if (!/^\+?[\d ()-]{6,}$/.test(q.supplier.phone)) fail('supplier.phone debe ser un teléfono válido.');
  for (const key of ['name', 'unit', 'taxId']) string(q.buyer?.[key], `buyer.${key}`);

  if (q.buyer.logo != null) {
    string(q.buyer.logo.path, 'buyer.logo.path');
    string(q.buyer.logo.source, 'buyer.logo.source');
    if (!/^https:\/\//.test(q.buyer.logo.source)) fail('buyer.logo.source debe señalar la fuente oficial HTTPS; no se descarga automáticamente.');
    if (!['.svg', '.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(q.buyer.logo.path).toLowerCase())) fail('Formato de logo no soportado.');
  }

  string(q.cover?.label, 'cover.label'); title(q.cover?.title, 'cover.title'); string(q.cover?.subtitle, 'cover.subtitle');
  for (const key of ['name', 'detail']) string(q.service?.[key], `service.${key}`);
  title(q.scope?.title, 'scope.title'); string(q.scope?.intro, 'scope.intro');

  const rows = (value, name, max) => {
    if (!Array.isArray(value) || !value.length || value.length > max) fail(`${name}: entre 1 y ${max} entradas.`);
    value.forEach((row, i) => { string(row.title, `${name}.${i}.title`); string(row.text, `${name}.${i}.text`); });
  };

  rows(q.scope?.rows, 'scope.rows', 7);
  string(q.schedule?.title, 'schedule.title'); string(q.schedule?.note, 'schedule.note');
  rows(q.schedule?.phases, 'schedule.phases', 3);
  q.schedule.phases.forEach((p, i) => string(p.label, `schedule.phases.${i}.label`));
  title(q.pricing?.title, 'pricing.title');
  for (const key of ['intro', 'summary', 'taxNote']) string(q.pricing?.[key], `pricing.${key}`);

  if (q.pricing.monthly != null) {
    if (!Number.isSafeInteger(q.pricing.monthly.months) || q.pricing.monthly.months < 1 || q.pricing.monthly.months > 120) fail('pricing.monthly.months: entero de 1 a 120.');
    string(q.pricing.monthly.note, 'pricing.monthly.note');
  }

  title(q.conditions?.title, 'conditions.title'); rows(q.conditions?.rows, 'conditions.rows', 6);
  if (q.status === 'example' && !/sin validez comercial/i.test(q.cover.label)) fail('El ejemplo debe decir Sin validez comercial en cover.label.');

return q;
}

export function quoteAmounts(q) {
  // Aritmética entera: redondeo del impuesto al peso más cercano, mitad hacia arriba.
  const vatBig = (BigInt(q.net) * BigInt(Math.round(q.vatRate * 10000)) + 5000n) / 10000n;
  const totalBig = BigInt(q.net) + vatBig;

  if (totalBig > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('El total excede el límite de precisión segura.');
  const vat = Number(vatBig), total = Number(totalBig);
  const months = q.pricing.monthly?.months;


return { net: q.net, vat, total, monthly: months ? { months, net: q.net / months, vat: vat / months, total: total / months } : null };
}

export function fillSlots(template, slots) {
  // Una sola pasada evita interpretar {{...}} que venga en el texto del cliente.
  return template.replace(/\{\{([\w.]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(slots, key)) throw new Error(`Slot sin resolver: ${key}`);

return slots[key];
  });
}

export async function buildHtml(q, dataPath) {
  validateQuote(q);
  const amounts = quoteAmounts(q), assets = [];

  async function asset(file, type, source) {
    const bytes = await fs.readFile(file);

    assets.push({ file: path.relative(repo, file), source, bytes: bytes.length, sha256: sha(bytes) });

return `data:${type};base64,${bytes.toString('base64')}`;
  }

  const logo = await asset(fileURLToPath(brandAssetUrl('efeonce-logo-positive')), 'image/svg+xml', 'axis-brand-assets:efeonce-logo-positive');
  const bubble = await asset(fileURLToPath(brandAssetUrl('url-bubble-baked-light')), 'image/svg+xml', 'axis-brand-assets:url-bubble-baked-light');
  let clientLogo = `<div class="client-name" data-slot="buyer.name">${esc(q.buyer.name)}</div>`;

  if (q.buyer.logo) {
    const file = path.resolve(path.dirname(dataPath), q.buyer.logo.path);
    const mime = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[path.extname(file).toLowerCase()];

    clientLogo = `<img data-slot="buyer.logo" src="${await asset(file, mime, q.buyer.logo.source)}" alt="${esc(q.buyer.unit)}">`;
  }

  let fonts = '';

  for (const [family, weight, file] of [
    [gl.type.answer.family, '100 900', 'bricolage-grotesque-variable.ttf'],
    ...['400', '500', '600', '700'].map(w => [gl.type.text.family, w, `poppins-${w}.ttf`])
  ]) fonts += `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url("${await asset(path.join(repo, 'src/lib/artifact-composer/brand-packs/axis/fonts', file), 'font/ttf', 'axis-fonts')}") format("truetype")}\n`;
  const contactSource = 'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json';
  const contact = JSON.parse(await fs.readFile(path.join(repo, contactSource), 'utf8')).slots.contactDetails.value;
  const engine = gl.lines.find(l => l.key === 'engine'), W = gl.orbit.baseWidthPx;
  const orbit = orbitSvg({ width: W, height: Math.round(W * 297 / 210), line: 'engine', surface: 'light', channel: 'print', circle: { cx: W, cy: 0, r: W * gl.orbit.radiusRatio.portraitOfWidth }, start: 'bottom', span: 'accent', halo: false, idPrefix: 'quote-cover' });
  const divider = sphereDividerSvg({ widthPx: W - 136, line: 'engine', surface: 'light' });

  const css = fillSlots(await fs.readFile(path.join(templateDir, 'template.css'), 'utf8'), {
    'brand.fonts': fonts, 'brand.ink': gl.color.navy, 'brand.paper': axisSurface.light.paper, 'brand.soft': gl.color.paper,
    'brand.navy': engine.darkBg, 'brand.accent': engine.accentOnLight, 'brand.textFamily': gl.type.text.family, 'brand.displayFamily': gl.type.answer.family,
    'brand.radius': axisGeometry.radius.display, 'brand.step': axisGeometry.spacing.base, 'brand.round': axisGeometry.radius.round, 'brand.weight': gl.type.answer.weight, 'brand.tracking': gl.type.answer.tracking
  });

  const header = label => `<header class="page-header"><img class="header-logo" src="${logo}" alt="Efeonce"><div class="header-meta"><span data-slot="buyer.unit">${esc(q.buyer.unit)}</span><span>${esc(label)} · <span data-slot="reference">${esc(q.reference)}</span></span></div></header>`;
  const footer = n => `<footer class="page-footer">${n === 1 ? '<div class="plain-divider"></div>' : `<div class="brand-divider">${divider}</div>`}<div class="footer-body"><div class="footer-contact"><span>${esc(contact.address)}</span><a href="tel:${esc(contact.chilePhone.replaceAll(' ', ''))}">${esc(contact.chilePhone)}</a></div><a class="url-bubble" href="https://efeoncepro.com/" aria-label="Sitio web de Efeonce"><img src="${bubble}" alt="efeoncepro.com"></a><span class="folio">0${n} / 04</span></div></footer>`;

  const slots = {
    'document.title': esc(`${q.buyer.name} · Cotización · Efeonce`), 'document.description': esc(`Cotización de ${q.service.name} para ${q.buyer.name}. ${q.reference}.`),
    'brand.css': css, 'brand.logo': logo, 'brand.orbit': orbit.svg,
    'date.label': esc(new Intl.DateTimeFormat('es-CL', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(q.date))), 'reference': esc(q.reference),
    'buyer.logo': clientLogo, 'buyer.name': esc(q.buyer.name), 'buyer.taxId': esc(q.buyer.taxId),
    'supplier.name': esc(q.supplier.name), 'supplier.taxId': esc(q.supplier.taxId), 'supplier.contact': esc(q.supplier.contact),
    'supplier.email': esc(q.supplier.email), 'supplier.emailHref': esc(`mailto:${q.supplier.email}`), 'supplier.phone': esc(q.supplier.phone), 'supplier.phoneHref': esc(`tel:${q.supplier.phone.replaceAll(/[ ()-]/g, '')}`),
    'cover.label': esc(q.cover.label), 'cover.title': lines(q.cover.title), 'cover.subtitle': esc(q.cover.subtitle),
    'scope.title': lines(q.scope.title), 'scope.intro': esc(q.scope.intro),
    'scope.rows': q.scope.rows.map((r, i) => `<tr><th scope="row" data-slot="scope.rows.${i}.title">${esc(r.title)}</th><td data-slot="scope.rows.${i}.text">${esc(r.text)}</td></tr>`).join(''),
    'schedule.title': esc(q.schedule.title), 'schedule.note': esc(q.schedule.note), 'schedule.count': q.schedule.phases.length,
    'schedule.phases': q.schedule.phases.map((p, i) => `<div><span class="label" data-slot="schedule.phases.${i}.label">${esc(p.label)}</span><h4 data-slot="schedule.phases.${i}.title">${esc(p.title)}</h4><p data-slot="schedule.phases.${i}.text">${esc(p.text)}</p></div>`).join(''),
    'service.name': esc(q.service.name), 'service.detail': esc(q.service.detail),
    'pricing.title': lines(q.pricing.title), 'pricing.intro': esc(q.pricing.intro), 'pricing.summary': esc(q.pricing.summary), 'pricing.taxNote': esc(q.pricing.taxNote),
    'amount.net': money(amounts.net), 'amount.vat': money(amounts.vat), 'amount.total': money(amounts.total), 'vatRate.label': new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(q.vatRate * 100),
    'pricing.monthly': amounts.monthly ? `<div class="monthly" data-slot="pricing.monthly"><p class="overline">Referencia de distribución</p><h3>Equivalente mensual</h3><div class="monthly-grid"><div><span>Neto</span><strong data-slot="amount.monthly.net">${money(amounts.monthly.net)}</strong></div><div><span>IVA</span><strong data-slot="amount.monthly.vat">${money(amounts.monthly.vat)}</strong></div><div><span>Con IVA</span><strong data-slot="amount.monthly.total">${money(amounts.monthly.total)}</strong></div></div><p>${esc(q.pricing.monthly.note)}</p></div>` : '',
    'conditions.title': lines(q.conditions.title), 'conditions.rows': q.conditions.rows.map((r, i) => `<section><span class="condition-index">${String(i + 1).padStart(2, '0')}</span><div><h3 data-slot="conditions.rows.${i}.title">${esc(r.title)}</h3><p data-slot="conditions.rows.${i}.text">${esc(r.text)}</p></div></section>`).join('')
  };

  ['Alcance y calendario', 'Detalle de la cotización', 'Condiciones de ejecución'].forEach((label, i) => { slots[`header.${i + 2}`] = header(label); });
  for (let n = 1; n <= 4; n++) slots[`footer.${n}`] = footer(n);
  const html = fillSlots(await fs.readFile(path.join(templateDir, 'template.html'), 'utf8'), slots);


return { html, amounts, brand: { line: 'engine', assets, contactSource, orbit: orbit.manifest } };
}

async function main(args) {
  if (args.length !== 4 || args[0] !== '--data' || args[2] !== '--out') throw new Error('Uso: node scripts/documents/render-cotizacion-a4.mjs --data cotizacion.json --out carpeta-nueva');
  const dataPath = path.resolve(args[1]), output = path.resolve(args[3]);
  const q = JSON.parse(await fs.readFile(dataPath, 'utf8'));
  const { html, amounts, brand } = await buildHtml(q, dataPath);

  try { if ((await fs.readdir(output)).length) throw new Error('La carpeta de salida contiene archivos. Use una carpeta nueva para conservar las versiones.'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 1300 } });
    const errors = [];

 page.on('pageerror', e => errors.push(e.message));
    const load = async handle => { await handle.setContent(html, { waitUntil: 'load' }); await handle.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); }); };

    await load(page); await page.emulateMedia({ media: 'print' });

    const layout = await page.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => {
      const box = p.getBoundingClientRect(), foot = p.querySelector('.page-footer').getBoundingClientRect(), content = p.querySelector('.page-content, .cover-content');

      const overflow = [...content.querySelectorAll('*'), ...p.querySelectorAll('header *, footer *')].filter(el => { const r = el.getBoundingClientRect();



return r.height && (r.left < box.left - 1 || r.right > box.right + 1 || (content.contains(el) && r.bottom > foot.top - 6)); }).map(el => el.textContent.slice(0, 80));

      const contentBox = content.getBoundingClientRect();
      const headerGapPx = contentBox.top - p.querySelector('header').getBoundingClientRect().bottom;


return { page: i + 1, gapPx: foot.top - contentBox.bottom, headerGapPx, overflow };
    }));

    if (errors.length || layout.some(p => p.overflow.length || p.gapPx < 6 || p.headerGapPx < 6)) throw new Error(`Contenido fuera del A4. Acorte el texto o prepare otra paginación; no se reduce la tipografía automáticamente.\n${JSON.stringify({ layout, errors }, null, 2)}`);
    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });

 await load(mobile);
    const mobileCheck = await mobile.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));

    if (mobileCheck.scrollWidth > mobileCheck.width + 1) throw new Error('El documento desborda en móvil. Acorte los textos o revise la composición.');
    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true, tagged: true, outline: true, displayHeaderFooter: false });

    await fs.mkdir(output, { recursive: true }); await fs.mkdir(path.join(output, 'qa'), { recursive: true });
    await fs.writeFile(path.join(output, 'cotizacion.html'), html); await fs.writeFile(path.join(output, 'cotizacion.pdf'), pdf);
    const snapshot = structuredClone(q);

    if (q.buyer.logo) {
      const source = path.resolve(path.dirname(dataPath), q.buyer.logo.path);
      const localName = `logo-cliente${path.extname(source).toLowerCase()}`;

      await fs.copyFile(source, path.join(output, localName));
      snapshot.buyer.logo.path = localName;
    }

    await fs.writeFile(path.join(output, 'datos.json'), JSON.stringify(snapshot, null, 2) + '\n');
    for (let i = 0; i < 4; i++) await page.locator('.page').nth(i).screenshot({ path: path.join(output, 'qa', `pagina-${i + 1}.png`) });
    await mobile.screenshot({ path: path.join(output, 'qa', 'mobile.png') });
    const templateFiles = await Promise.all(['template.html', 'template.css'].map(async name => ({ name, sha256: sha(await fs.readFile(path.join(templateDir, name))) })));
    const manifest = { template: 'cotizacion-a4', version: 1, templateFiles, generatedAt: new Date().toISOString(), status: q.status, signed: false, submitted: false, currency: q.currency, amounts, dataSource: path.relative(repo, dataPath), dataSha256: sha(await fs.readFile(dataPath)), brand, checks: { layout, mobile: mobileCheck, browserErrors: errors, visualReview: 'pending', pdfTextAndPageAudit: 'pending' }, files: [{ name: 'cotizacion.html', sha256: sha(html) }, { name: 'cotizacion.pdf', sha256: sha(pdf) }] };

    await fs.writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log(JSON.stringify({ output, amounts, layout, mobile: mobileCheck }, null, 2));
  } finally { await browser.close(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
