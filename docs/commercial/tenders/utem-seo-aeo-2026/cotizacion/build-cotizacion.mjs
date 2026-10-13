import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { efeonceGraphicLine as gl, axisGeometry, axisSurface } from '@efeoncepro/axis-tokens';
import { brandAssetUrl } from '@efeoncepro/axis-brand-assets';
import { orbitSvg, sphereDividerSvg } from '@efeoncepro/axis-graphic-line';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../..');
const q = JSON.parse(await fs.readFile(path.join(here, 'cotizacion.json'), 'utf8'));
if (q.submitted) throw new Error('La cotización ya fue presentada: conservar el paquete aprobado y crear otra versión sólo bajo un nuevo mandato del operador.');
const totalPages = 4;
const vat = Math.round(q.net * q.vatRate);
const total = q.net + vat;
const monthlyNet = q.net / q.months;
const monthlyVat = vat / q.months;
const money = n => '$' + new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(n);
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const assetFiles = [];
async function dataAsset(file, type) {
  const buf = await fs.readFile(file);
  assetFiles.push({ source: path.relative(repo, file), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  return `data:${type};base64,${buf.toString('base64')}`;
}
const logo = await dataAsset(fileURLToPath(brandAssetUrl('efeonce-logo-positive')), 'image/svg+xml');
const bubble = await dataAsset(fileURLToPath(brandAssetUrl('url-bubble-baked-light')), 'image/svg+xml');
const client = await dataAsset(path.join(repo, 'ai-generations/2026-10-08_utem-propuesta/logos-cliente/logo-v3.svg'), 'image/svg+xml');
const fonts = [
  [gl.type.answer.family, '100 900', 'src/lib/artifact-composer/brand-packs/axis/fonts/bricolage-grotesque-variable.ttf'],
  [gl.type.text.family, '400', 'src/lib/artifact-composer/brand-packs/axis/fonts/poppins-400.ttf'],
  [gl.type.text.family, '500', 'src/lib/artifact-composer/brand-packs/axis/fonts/poppins-500.ttf'],
  [gl.type.text.family, '600', 'src/lib/artifact-composer/brand-packs/axis/fonts/poppins-600.ttf'],
  [gl.type.text.family, '700', 'src/lib/artifact-composer/brand-packs/axis/fonts/poppins-700.ttf']
];
let fontCss = '';
for (const [family, weight, file] of fonts) {
  fontCss += `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight};font-display:block;src:url("${await dataAsset(path.join(repo, file), 'font/ttf')}") format("truetype")}\n`;
}
const contactSource = 'src/lib/artifact-composer/catalogs/deck-axis/back-cover-full.slots.json';
const institutional = JSON.parse(await fs.readFile(path.join(repo, contactSource), 'utf8')).slots.contactDetails.value;
const engine = gl.lines.find(l => l.key === 'engine');
const W = gl.orbit.baseWidthPx;
const H = Math.round(W * 297 / 210);
const orbit = orbitSvg({ width: W, height: H, line: 'engine', surface: 'light', channel: 'print',
  circle: { cx: W, cy: 0, r: W * gl.orbit.radiusRatio.portraitOfWidth },
  start: 'bottom', span: 'accent', halo: false, idPrefix: 'utem-cover' });
const divider = sphereDividerSvg({ widthPx: W - 136, line: 'engine', surface: 'light' });
function header(label) {
  return `<header class="page-header"><img class="header-logo" src="${logo}" alt="Efeonce"><div class="header-meta"><span>${esc(q.buyer.unit)}</span><span>${esc(label)} · ${q.process}</span></div></header>`;
}
function footer(n, cover = false) {
  return `<footer class="page-footer">${cover ? '<div class="plain-divider"></div>' : `<div class="brand-divider">${divider}</div>`}
    <div class="footer-body"><div class="footer-contact"><span>${esc(institutional.address)}</span><a href="tel:${institutional.chilePhone.replaceAll(' ', '')}">${esc(institutional.chilePhone)}</a></div>
    <a class="url-bubble" href="https://efeoncepro.com/" aria-label="Sitio web de Efeonce"><img src="${bubble}" alt="efeoncepro.com"></a><span class="folio">${String(n).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}</span></div></footer>`;
}
function page(n, label, body, className = '') {
  return `<section id="pagina-${n}" class="page ${className}" aria-label="Página ${n}: ${label}">${header(label)}<div class="page-content">${body}</div>${footer(n)}</section>`;
}
const scopeRows = [
  ['Auditoría y estrategia', 'Diagnóstico SEO/GEO/AEO, línea base, revisión técnica y editorial, arquitectura, indexación, autoridad y acciones priorizadas.'],
  ['Contenido editorial', '15 artículos originales, 5 por mes, con ficha SEO/AEO, fuentes, enlaces y dos rondas consolidadas de revisión. Aprobación UTEM antes de publicar.'],
  ['Implementación', 'Optimización de hasta 10 páginas existentes prioritarias. Carga y publicación de artículos aprobados, según permisos y componentes disponibles del CMS.'],
  ['Autoridad y PR digital', 'Una campaña con al menos 10 destinos o interlocutores pertinentes; preparación, gestión, seguimiento y reporte de acciones y enlaces obtenidos.'],
  ['Medición SEO y respuestas de IA', 'Panel de 15 consultas en 2 sistemas, con cortes inicial, intermedio y final. Seguimiento orgánico según fuentes disponibles.'],
  ['Informes y seguimiento', 'Informe de auditoría, informe de seguimiento e informe final; reportes mensuales de SEO/AEO con Insights y revisión de resultados.'],
  ['Coordinación y acceso', 'Responsable de proyecto, coordinación quincenal, inicio y transferencia final. Plan editorial, revisión colaborativa y panel Greenhouse durante los 3 meses.']
];
const scopeTable = `<table class="scope-table"><caption class="sr-only">Componentes incluidos en el servicio integral</caption><thead><tr><th scope="col">Componente</th><th scope="col">Alcance incluido</th></tr></thead><tbody>${scopeRows.map(([title, text]) => `<tr><th scope="row">${title}</th><td>${text}</td></tr>`).join('')}</tbody></table>`;
const p1 = `<section id="pagina-1" class="page cover" aria-label="Página 1: Portada de la cotización"><div class="cover-orbit" aria-hidden="true">${orbit.svg}</div>
  <header class="cover-header"><img src="${logo}" alt="Efeonce"><p class="overline">Oferta económica · ${q.dateLabel}</p><p class="cover-code">Compra Ágil ${q.process}</p></header>
  <div class="cover-content"><p class="overline">Cotización formal</p><h1>Posicionamiento<br>SEO, GEO<br>y AEO.</h1><p class="cover-deck">Un programa integral de tres meses<br>para Educación Continua UTEM.</p>
    <div class="client-block"><span class="label">Preparado para</span><img src="${client}" alt="Dirección de Educación Continua UTEM"><p>${esc(q.buyer.name)}<br>RUT ${q.buyer.rut}</p></div>
    <div class="cover-investment"><div><span class="label">Valor neto del servicio completo</span><strong>${money(q.net)}</strong><span>Tres meses · Pesos chilenos · IVA no incluido</span></div><div class="cover-total"><span class="label">Total con IVA</span><b>${money(total)}</b></div></div>
    <div class="cover-supplier"><div><span class="label">Oferente</span><b>${q.supplier.name}</b><span>RUT ${q.supplier.rut}</span></div><div><span class="label">Responsable</span><b>${q.supplier.contact}</b><a href="mailto:${q.supplier.email}">${q.supplier.email}</a></div></div>
  </div>${footer(1, true)}</section>`;
const p2 = page(2, 'Alcance y calendario', `<p class="overline">01 · El servicio</p><h2>Un alcance completo,<br>con entregas cada mes.</h2><p class="intro">Estrategia, contenidos, implementación y medición sobre <strong>${q.buyer.domain}</strong>. La ejecución se realiza con el equipo interno de Efeonce, sin subcontratación.</p>
  ${scopeTable}
  <div class="section-heading"><h3>Calendario de tres meses</h3><span>Desde el inicio fijado por UTEM</span></div>
  <div class="timeline"><div><span class="label">Mes 1</span><h4>Diagnóstico y arranque</h4><p>Auditoría, línea base, priorización e inicio de ajustes. Primeros <strong>5 artículos</strong> y preparación de PR.</p></div><div><span class="label">Mes 2</span><h4>Implementación</h4><p>Continuidad de ajustes y PR. <strong>5 artículos</strong>, medición intermedia e informe de seguimiento.</p></div><div><span class="label">Mes 3</span><h4>Resultados y cierre</h4><p>Últimos <strong>5 artículos</strong>, reporte de PR, informe final, recomendaciones y transferencia.</p></div></div>`);
const p3 = page(3, 'Detalle de la cotización', `<p class="overline">02 · Inversión</p><h2>Una cotización por<br>el servicio integral.</h2><p class="intro">Precio fijo para los tres meses de ejecución. Todos los valores se expresan en pesos chilenos (CLP).</p>
  <table class="price-table"><caption class="sr-only">Precio del servicio integral de posicionamiento</caption><thead><tr><th scope="col">Servicio</th><th scope="col">Cantidad</th><th scope="col">Valor neto</th></tr></thead><tbody><tr><td><strong>${q.service}</strong><span>Duración: ${q.months} meses desde el inicio establecido por UTEM.<br>Incluye todos los componentes descritos en la página 2.</span></td><td>${q.quantity}<span>servicio</span></td><td>${money(q.net)}</td></tr></tbody></table>
  <div class="totals"><div><span>Subtotal neto</span><strong data-amount="net">${money(q.net)}</strong></div><div><span>IVA (${Math.round(q.vatRate * 100)} %)</span><strong data-amount="vat">${money(vat)}</strong></div><div class="grand-total"><span>Total con IVA</span><strong data-amount="total">${money(total)}</strong></div></div>
  <p class="tax-note">El valor neto excluye IVA. El total incluye IVA y corresponde al precio completo del servicio por tres meses.</p>
  <div class="monthly"><p class="overline">Referencia de distribución</p><h3>Equivalente mensual</h3><div class="monthly-grid"><div><span>Neto</span><strong>${money(monthlyNet)}</strong></div><div><span>IVA</span><strong>${money(monthlyVat)}</strong></div><div><span>Con IVA</span><strong>${money(monthlyNet + monthlyVat)}</strong></div></div><p>Esta distribución es una referencia aritmética. La facturación se realizará después de la recepción conforme, según las bases.</p></div>
`);
const conditions = [
  ['Plazo e inicio', 'Tres meses contados desde la fecha de inicio establecida por UTEM. El calendario de temas, entregas, revisión y publicación se acordará con la contraparte institucional.'],
  ['Recepción, facturación y pago', 'La contraparte técnica de UTEM otorgará la recepción conforme previa verificación del cumplimiento de las especificaciones. Después de dicha recepción se emitirá la factura, con el número de Orden de Compra de Mercado Público, y se enviará a facturas@utem.cl. Pago por transferencia electrónica, sin anticipos.'],
  ['Aprobaciones y accesos', 'UTEM validará los temas y datos académicos y aprobará los artículos antes de publicar. Facilitará accesos al CMS, Search Console y analítica, según disponibilidad. Los cambios se ejecutarán con autorización institucional; cuando los aplique UTEM, Efeonce entregará instrucciones y acompañará su verificación.'],
  ['Límites de implementación y PR', 'El alcance comprende los ajustes editoriales y técnicos descritos. Rediseño integral, migraciones, funcionalidades nuevas, servidores y sistemas académicos requieren un alcance independiente. La campaña de PR se basa en gestión editorial; las publicaciones y enlaces dependen de la decisión de cada medio.'],
  ['Herramientas y resguardo', 'El panel y los reportes se configurarán para el servicio con las fuentes disponibles. El acceso se incluye durante los tres meses; las integraciones nuevas con sistemas institucionales quedan fuera del alcance. Efeonce resguardará accesos, estadísticas e información de UTEM.'],
  ['Vigencia y documentación', `Esta cotización tiene una vigencia de ${q.validityDays} días corridos desde su fecha de emisión. Complementa la propuesta técnica SEO/GEO/AEO y se presenta junto a los anexos administrativos firmados. Los mínimos de las especificaciones se mantienen íntegros.`]
];
const p4 = page(4, 'Condiciones de ejecución', `<p class="overline">03 · Condiciones comerciales</p><h2>Alcance, responsabilidades<br>y condiciones de cobro.</h2>
  <div class="conditions">${conditions.map(([title, text], i) => `<section><span class="condition-index">${String(i + 1).padStart(2, '0')}</span><div><h3>${title}</h3><p>${text}</p></div></section>`).join('')}</div>
  <div class="contact-line"><strong>${q.supplier.contact}</strong><a href="mailto:${q.supplier.email}">${q.supplier.email}</a><a href="tel:${q.supplier.phone.replaceAll(' ', '')}">${q.supplier.phone}</a></div>`);
const css = `${fontCss}
:root{--ink:${gl.color.navy};--paper:${axisSurface.light.paper};--soft:${gl.color.paper};--navy:${engine.darkBg};--accent:${engine.accentOnLight};--text:"${gl.type.text.family}";--display:"${gl.type.answer.family}";--radius:${axisGeometry.radius.display};--step:${axisGeometry.spacing.base};--muted:color-mix(in srgb,var(--ink) 77%,var(--paper));--line:color-mix(in srgb,var(--ink) 16%,var(--paper));--screen:color-mix(in srgb,var(--ink) 7%,var(--paper));color-scheme:light}
*{box-sizing:border-box}html{font-size:16px;background:var(--screen);scroll-behavior:smooth}body{margin:0;color:var(--ink);font-family:var(--text);font-size:10.5pt;line-height:1.5}a{color:inherit;text-decoration:none}a:focus-visible{outline:2px solid var(--accent);outline-offset:4px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.toolbar{display:flex;align-items:center;justify-content:space-between;gap:24px;max-width:210mm;margin:24px auto 0;padding:0 4px;font-size:12px}.toolbar nav{display:flex;gap:18px}.toolbar a{text-decoration:underline;text-underline-offset:3px}.toolbar button{border:0;background:var(--ink);color:var(--paper);font:500 12px var(--text);padding:12px 20px;border-radius:${axisGeometry.radius.round};cursor:pointer}.toolbar button:focus-visible{outline:2px solid var(--accent);outline-offset:4px}
.page{position:relative;isolation:isolate;background:var(--paper);width:210mm;height:297mm;padding:38mm 18mm 29mm;margin:24px auto;box-shadow:0 8px 30px color-mix(in srgb,var(--ink) 10%,transparent);break-after:page;page-break-after:always}.page:last-child{break-after:auto;page-break-after:auto}.page-content{position:relative;z-index:1}h1,h2,h3,h4,p{margin:0}h1,h2,h3,h4{font-family:var(--display);font-weight:${gl.type.answer.weight};letter-spacing:${gl.type.answer.tracking}}h2{font-size:29pt;line-height:1.1;margin-top:10px;margin-bottom:14px}h3{font-size:14pt;line-height:1.25}strong,b{font-weight:600}.overline,.label{font-family:var(--text);font-size:8pt;line-height:1.5;font-weight:500;letter-spacing:.12em;text-transform:uppercase}.overline{color:var(--muted)}.label{display:block;letter-spacing:.08em}.intro{font-size:10.3pt;line-height:1.6;max-width:95%;margin-bottom:20px;color:var(--muted)}
.page-header{position:absolute;top:14mm;left:18mm;right:18mm;display:flex;align-items:center;justify-content:space-between;gap:20px;padding-bottom:12px;border-bottom:1px solid var(--line)}.header-logo{width:110px;height:auto}.header-meta{text-align:right;font-size:7.7pt;line-height:1.8;color:var(--muted)}.header-meta span{display:block}.header-meta span:first-child{font-weight:600;color:var(--ink)}.page-footer{position:absolute;bottom:12mm;left:18mm;right:18mm;font-size:6.8pt;line-height:1.6}.brand-divider svg{width:100%;height:6px;display:block}.plain-divider{border-top:1px solid var(--line);height:6px}.footer-body{display:grid;grid-template-columns:1fr auto 42px;align-items:center;gap:18px;margin-top:10px}.footer-contact span,.footer-contact a{display:block;color:var(--muted)}.url-bubble img{width:105px;height:auto;display:block}.folio{text-align:right;color:var(--muted);font-variant-numeric:tabular-nums;font-size:8pt}
.cover{padding-top:14mm}.cover-orbit{position:absolute;inset:0;z-index:-1;overflow:hidden;pointer-events:none}.cover-orbit svg{width:100%;height:100%;display:block}.cover-header>img{width:164px;height:auto;margin-bottom:22px}.cover-header .overline{font-size:8.5pt}.cover-code{margin-top:5px;font-size:9pt}.cover-content{margin-top:64px}.cover-content>h1{font-size:47pt;line-height:.99;letter-spacing:-.04em;margin:16px 0 22px;max-width:550px}.cover-deck{font-size:16pt;line-height:1.45;letter-spacing:-.01em;max-width:540px}.client-block{margin-top:28px}.client-block img{width:205px;height:auto;display:block;margin:10px 0 10px}.client-block p{font-size:9pt;line-height:1.65;color:var(--muted)}.cover-investment{margin-top:28px;padding:23px 24px;background:var(--navy);color:var(--paper);border-radius:var(--radius);display:flex;align-items:center;justify-content:space-between;gap:20px}.cover-investment strong{display:block;font-family:var(--display);font-weight:${gl.type.answer.weight};font-size:32pt;line-height:1.2;margin:7px 0}.cover-investment .label{color:color-mix(in srgb,var(--paper) 85%,var(--navy));font-size:7.6pt}.cover-investment span:not(.label){font-size:7.9pt}.cover-total{text-align:right;padding-left:24px;border-left:1px solid color-mix(in srgb,var(--paper) 23%,transparent)}.cover-total b{display:block;font-size:19pt;font-variant-numeric:tabular-nums;margin-top:8px}.cover-supplier{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:24px;font-size:9pt}.cover-supplier b,.cover-supplier span,.cover-supplier a{display:block}.cover-supplier .label{margin-bottom:5px;color:var(--muted)}
table{width:100%;border-collapse:collapse;table-layout:fixed}th{text-align:left}thead th{font-size:8pt;text-transform:uppercase;font-weight:600;letter-spacing:.04em;background:var(--soft);padding:11px 13px}tbody th,tbody td{border-bottom:1px solid var(--line)}.scope-table{font-size:8.8pt;line-height:1.47}.scope-table th:first-child{width:30%}.scope-table tbody th{font-weight:600;padding:11px 13px 11px 0;vertical-align:top}.scope-table tbody td{padding:11px 0 11px 13px;vertical-align:top}.section-heading{display:flex;align-items:center;justify-content:space-between;margin-top:23px;margin-bottom:14px;gap:14px}.section-heading span{font-size:7.5pt;color:var(--muted)}.timeline{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.timeline>div{padding-top:10px;border-top:2px solid var(--ink)}.timeline .label{color:var(--muted);font-size:7pt}.timeline h4{font-size:12pt;line-height:1.2;margin:8px 0}.timeline p{font-size:8.4pt;line-height:1.55}
.price-table{margin-top:20px}.price-table th:nth-child(1){width:66%}.price-table th:nth-child(2){width:12%;text-align:center}.price-table th:nth-child(3){width:22%;text-align:right}.price-table td{padding:18px 12px;vertical-align:top;font-size:10pt;line-height:1.6}.price-table td:first-child{padding-left:0}.price-table td:nth-child(2){text-align:center}.price-table td:last-child{text-align:right;padding-right:0;font-weight:600;white-space:nowrap}.price-table td span{display:block;font-size:8.8pt;color:var(--muted);margin-top:8px}.price-table td:nth-child(2) span{font-size:8pt}.totals{margin-top:22px}.totals>div{display:flex;align-items:center;justify-content:space-between;padding:15px 0;border-bottom:1px solid var(--line);font-size:12pt}.totals strong{font-variant-numeric:tabular-nums}.totals .grand-total{border:0;background:var(--navy);color:var(--paper);padding:22px 24px;border-radius:var(--radius);margin-top:18px}.grand-total strong{font-family:var(--display);font-size:30pt;font-weight:${gl.type.answer.weight};letter-spacing:-.03em}.grand-total span{font-weight:500}.tax-note{font-size:8.5pt;color:var(--muted);margin:14px 0 20px;line-height:1.6}.monthly{background:var(--soft);padding:20px;border-radius:var(--radius)}.monthly h3{margin:6px 0 18px;font-size:19pt}.monthly-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}.monthly-grid span{display:block;font-size:8pt;color:var(--muted)}.monthly-grid strong{display:block;font-family:var(--display);font-size:18pt;line-height:1.3;margin-top:5px}.monthly p:last-child{font-size:8.5pt;line-height:1.6;color:var(--muted)}.included-note{margin-top:28px}.included-note p{font-size:9.5pt;line-height:1.65;margin-top:10px;color:var(--muted)}
.contact-line{display:flex;align-items:center;justify-content:space-between;gap:12px;border-top:2px solid var(--ink);padding-top:14px;margin-top:22px;font-size:8.3pt}.conditions{margin-top:22px}.conditions>section{display:grid;grid-template-columns:28px 1fr;gap:14px;border-bottom:1px solid var(--line);padding:10px 0}.condition-index{font-size:8pt;font-weight:600;color:var(--muted);padding-top:3px}.conditions h3{font-size:13pt;margin-bottom:6px}.conditions p{font-size:9.3pt;line-height:1.6;color:var(--muted)}.responsible{display:flex;align-items:center;gap:26px;background:var(--navy);color:var(--paper);padding:24px;border-radius:var(--radius);margin-top:26px}.responsible>img{width:130px;height:auto}.responsible>div{border-left:1px solid color-mix(in srgb,var(--paper) 25%,transparent);padding-left:26px}.responsible .label{font-size:7pt;color:color-mix(in srgb,var(--paper) 85%,var(--navy))}.responsible h3{font-size:18pt;margin:5px 0}.responsible p,.responsible a{display:block;font-size:8.2pt;line-height:1.7}
@page{size:A4 portrait;margin:0}@media print{html,body{background:var(--paper)}.toolbar{display:none}.page{margin:0;box-shadow:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}a{text-decoration:none}}
@media screen and (max-width:820px){html{font-size:14px}.toolbar{margin:18px;padding:0}.toolbar nav{gap:12px}.toolbar nav a:first-child{display:none}.page{width:100%;height:auto;min-height:297mm;margin:18px 0;padding:120px 24px 110px;box-shadow:none}.page-header{left:24px;right:24px}.header-meta{font-size:7pt}.page-footer{left:24px;right:24px;bottom:28px}.footer-body{grid-template-columns:1fr auto;gap:10px}.folio{grid-column:2}.url-bubble{grid-row:1;grid-column:2}.footer-contact{grid-row:1/3}.cover{padding-top:32px}.cover-content{margin-top:68px}.cover-content>h1{font-size:clamp(24pt,10.8vw,38pt)}.cover-orbit svg{height:auto}.cover-investment{align-items:flex-start;flex-direction:column}.cover-total{text-align:left;border-left:0;padding:0}.cover-total b{font-size:22pt}.cover-supplier{grid-template-columns:1fr;gap:14px}.timeline{grid-template-columns:1fr}.section-heading{align-items:flex-start;flex-direction:column}.scope-table th:first-child{width:32%}.scope-table{font-size:8.6pt}h2{font-size:25pt}.price-table{table-layout:auto}.price-table th:nth-child(1){width:58%}.price-table th:nth-child(2){width:14%}.price-table th:nth-child(3){width:28%}.price-table td{font-size:8.8pt}.grand-total strong{font-size:24pt}.grand-total span{font-size:10pt}.monthly{padding:18px}.monthly-grid{grid-template-columns:1fr;gap:12px}.monthly-grid>div{display:flex;align-items:center;justify-content:space-between}.monthly-grid strong{margin:0;font-size:18pt}.contact-line{align-items:flex-start;flex-direction:column}.responsible{align-items:flex-start;flex-direction:column}.responsible>div{border:0;padding:0}}
`;
const html = `<!doctype html><html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Cotización de Efeonce para el servicio integral SEO, GEO y AEO de Educación Continua UTEM. Compra Ágil ${q.process}."><title>UTEM · Cotización SEO, GEO y AEO · Efeonce</title><style>${css}</style></head><body><div class="toolbar"><nav aria-label="Secciones del documento"><a href="#pagina-1">Portada</a><a href="#pagina-2">Alcance</a><a href="#pagina-3">Cotización</a><a href="#pagina-4">Condiciones</a></nav><button type="button" onclick="window.print()">Imprimir / Guardar PDF</button></div><main>${p1}${p2}${p3}${p4}</main></body></html>`;
const base = 'UTEM - Cotizacion SEO GEO AEO';
const htmlPath = path.join(here, base + '.html');
await fs.writeFile(htmlPath, html);
const browser = await chromium.launch();
const pageHandle = await browser.newPage({ viewport: { width: 1100, height: 1300 }, deviceScaleFactor: 1 });
const errors = [];
pageHandle.on('pageerror', err => errors.push(err.message));
await pageHandle.setContent(html, { waitUntil: 'load' });
await pageHandle.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.decode()));
});
await pageHandle.emulateMedia({ media: 'print' });
const layout = await pageHandle.evaluate(() => {
  const margin = 6;
  return [...document.querySelectorAll('.page')].map((page, i) => {
    const box = page.getBoundingClientRect();
    const content = page.querySelector('.page-content') ?? page.querySelector('.cover-content');
    const foot = page.querySelector('.page-footer').getBoundingClientRect();
    const c = content.getBoundingClientRect();
    const overflow = [...content.querySelectorAll('*')].filter(el => {
      const r = el.getBoundingClientRect();
      return r.height && (r.bottom > foot.top - margin || r.left < box.left - 1 || r.right > box.right + 1);
    }).map(el => ({ tag: el.tagName, text: el.textContent.slice(0, 100) }));
    return { page: i + 1, width: box.width, height: box.height, contentBottom: c.bottom - box.top,
      footerTop: foot.top - box.top, gapPx: foot.top - c.bottom, overflow };
  });
});
if (errors.length || layout.some(p => p.overflow.length || p.gapPx < 6)) {
  await browser.close();
  throw new Error(JSON.stringify({ errors, layout }, null, 2));
}
const pdfPath = path.join(here, base + '.pdf');
await pageHandle.pdf({ path: pdfPath, printBackground: true, preferCSSPageSize: true, tagged: true, outline: true, displayHeaderFooter: false });
const captures = path.join(repo, '.captures/utem-cotizacion-2026-10-08');
await fs.mkdir(captures, { recursive: true });
for (let i = 0; i < totalPages; i++) {
  await pageHandle.locator('.page').nth(i).screenshot({ path: path.join(captures, `pagina-${i + 1}.png`) });
}
const mobileHandle = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobileHandle.setContent(html, { waitUntil: 'load' });
await mobileHandle.evaluate(async () => {
  await document.fonts.ready;
  await Promise.all([...document.images].map(img => img.decode()));
});
const mobile = await mobileHandle.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: document.documentElement.scrollWidth > innerWidth + 1 }));
await mobileHandle.screenshot({ path: path.join(captures, 'mobile-portada.png'), fullPage: false });
await browser.close();
if (mobile.overflow) throw new Error('El HTML desborda en móvil: ' + JSON.stringify(mobile));
const outputFolder = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/UTEM/1. Agencia SEO-AEO/06. Cotizacion';
await fs.mkdir(outputFolder, { recursive: true });
await fs.copyFile(htmlPath, path.join(outputFolder, base + '.html'));
await fs.copyFile(pdfPath, path.join(outputFolder, base + '.pdf'));
const files = [];
for (const file of [htmlPath, pdfPath]) {
  const buf = await fs.readFile(file);
  files.push({ name: path.basename(file), bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
}
const manifest = { version: '1.0', generatedAt: new Date().toISOString(), status: 'prepared_not_signed_not_submitted',
  source: path.relative(repo, path.join(here, 'cotizacion.json')), net: q.net, vat, total, monthlyEquivalent: { net: monthlyNet, vat: monthlyVat, total: monthlyNet + monthlyVat },
  priceAuthority: q.authority, signed: false, submitted: false, outputFolder, remoteSyncVerified: false,
  brand: { line: 'engine', tokens: '@efeoncepro/axis-tokens', assets: assetFiles, contactSource, orbit: orbit.manifest },
  checks: { fontsLoaded: true, imagesDecoded: true, layout, mobile, browserErrors: errors, visualReview: 'pending', pdfTextAndPageAudit: 'pending' }, files };
await fs.writeFile(path.join(here, 'delivery-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ htmlPath, pdfPath, outputFolder, files, layout, mobile }, null, 2));
