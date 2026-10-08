import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { marked } from 'marked';
import { chromium } from 'playwright';

const root = path.dirname(fileURLToPath(import.meta.url));
const out = '/Users/jreye/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/4. Comercial/Licitaciones/UTEM/1. Agencia SEO-AEO/05. Propuesta tecnica';
const base = 'UTEM - Propuesta tecnica SEO GEO AEO';
const md = await fs.readFile(path.join(root, 'oferta-tecnica.md'), 'utf8');
const body = marked.parse(md.split('\n---\n')[1]);
const html = `<!doctype html>
<html lang="es-CL"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Propuesta técnica · Educación Continua UTEM · Efeonce</title>
<style>
:root {color-scheme:light; --ink:#202b35;--muted:#52616c;--line:#d9e1e6;--blue:#203e53;}
* {box-sizing:border-box} html {background:#edf1f4} body {margin:0;color:var(--ink);font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.58}
.document {max-width:930px;background:white;margin:36px auto;padding:64px 68px;box-shadow:0 8px 40px #203e5312}
.eyebrow {font-size:11px;letter-spacing:.13em;font-weight:700;text-transform:uppercase;color:var(--muted)}
.cover {border-bottom:2px solid var(--blue);padding-bottom:28px;margin-bottom:32px}
.cover h1 {font-size:40px;line-height:1.08;letter-spacing:-.035em;color:var(--blue);margin:22px 0 15px;max-width:650px}
.cover .subtitle {font-size:23px;line-height:1.3;margin:0 0 25px;max-width:650px;color:var(--muted)}
.meta {display:grid;grid-template-columns:1fr 1fr;gap:14px 30px;font-size:12px;border-top:1px solid var(--line);padding-top:20px}
.meta p {margin:0}.meta b {display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin-bottom:3px}
h2 {font-size:23px;line-height:1.25;letter-spacing:-.02em;margin:34px 0 15px;color:var(--blue);break-after:avoid}
h3 {font-size:16px;line-height:1.35;margin:24px 0 10px;color:var(--blue);break-after:avoid}
p {margin:0 0 12px;orphans:3;widows:3;break-inside:avoid} li {margin-bottom:6px;orphans:2;widows:2} ul,ol {padding-left:21px;margin:10px 0 17px;break-inside:avoid}
strong {font-weight:700} a {color:#245b80;text-decoration:underline;text-underline-offset:2px;overflow-wrap:anywhere}
table {width:100%;border-collapse:collapse;table-layout:auto;font-size:11.7px;line-height:1.38;margin:16px 0 22px;break-inside:avoid}
thead {display:table-header-group} th {background:#eaf0f4;color:var(--blue);font-weight:700;text-align:left}
th,td {padding:9px 10px;border:1px solid var(--line);vertical-align:top;overflow-wrap:break-word}
tbody tr:nth-child(even) {background:#f8fafb} tr {break-inside:avoid} td:first-child {font-weight:600}
.screen-note {max-width:930px;margin:18px auto;color:#52616c;font-size:12px;text-align:center}
@media(max-width:680px) {.document {margin:0;padding:30px 22px}.cover h1{font-size:33px}.cover .subtitle{font-size:20px}.meta{grid-template-columns:1fr}table{font-size:10px}th,td{padding:6px}}
@page {size:A4;margin:19mm 17mm 19mm}
@media print {html,body{background:white}.document{max-width:none;box-shadow:none;margin:0;padding:0}.screen-note{display:none}body{font-size:10.3pt;line-height:1.45}.cover h1{font-size:30pt}.cover .subtitle{font-size:17pt}.cover{padding-bottom:19px;margin-bottom:22px}.meta{font-size:9pt;gap:10px 20px}.eyebrow{font-size:8pt}h2{font-size:16pt;margin-top:23px}h3{font-size:11.5pt;margin-top:17px}p{margin-bottom:9px}li{margin-bottom:4px}table{font-size:8.8pt;line-height:1.3;margin:12px 0 16px}th,td{padding:7px 8px}a{color:inherit}h2.section-start{break-before:page}}
</style></head><body>
<p class="screen-note">Documento técnico editable · Compra Ágil 5251-1060-COT26 · Versión 1.0</p>
<main class="document">
<header class="cover"><div class="eyebrow">Efeonce Group SpA · Educación Continua UTEM</div>
<h1>Propuesta técnica</h1><p class="subtitle">Posicionamiento SEO, GEO y AEO para Educación Continua UTEM</p>
<div class="meta">
<p><b>Compra Ágil</b>5251-1060-COT26</p><p><b>Institución</b>Universidad Tecnológica Metropolitana</p>
<p><b>Oferente</b>Efeonce Group SpA · RUT 77.357.182-1</p><p><b>Duración</b>Tres meses desde la fecha de inicio establecida por UTEM</p>
<p><b>Responsable y contacto</b>Julio Reyes · jreyes@efeoncepro.com<br>+56 9 3480 2860</p><p><b>Fecha y versión</b>8 de octubre de 2026 · v1.0</p>
</div></header>
<article>${body.replace(/<h2>(11\.|12\.)/g,'<h2 class="section-start">$1')}</article>
</main></body></html>`;
await fs.mkdir(out,{recursive:true});
await fs.writeFile(path.join(out,base+'.md'),md);
await fs.writeFile(path.join(out,base+'.html'),html);
await fs.copyFile(path.join(root,'CLAUDE-HANDOFF-INTERNO.md'),path.join(out,'CLAUDE-HANDOFF-INTERNO.md'));
const browser = await chromium.launch();
const page = await browser.newPage({viewport:{width:1100,height:1500}});
await page.setContent(html,{waitUntil:'load'});
await page.pdf({path:path.join(out,base+'.pdf'),format:'A4',preferCSSPageSize:true,printBackground:true,displayHeaderFooter:true,
headerTemplate:'<div style="font-family:Arial;font-size:8px;color:#64717b;width:100%;margin:0 17mm">EFEONCE · EDUCACIÓN CONTINUA UTEM</div>',
footerTemplate:'<div style="font-family:Arial;font-size:8px;color:#64717b;width:100%;margin:0 17mm;display:flex;justify-content:space-between"><span>5251-1060-COT26 · Propuesta técnica · v1.0</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'});
const metrics=await page.evaluate(()=>({horizontalOverflow:document.documentElement.scrollWidth>innerWidth,headings:[...document.querySelectorAll('article h2')].map(e=>e.textContent),tables:document.querySelectorAll('table').length}));
await browser.close();
const files=[];
for(const name of [base+'.md',base+'.html',base+'.pdf','CLAUDE-HANDOFF-INTERNO.md']) {
 const buf=await fs.readFile(path.join(out,name));
 files.push({name,bytes:buf.length,sha256:createHash('sha256').update(buf).digest('hex')});
}
const manifest={version:'1.0',generated_at:new Date().toISOString(),source:'docs/commercial/tenders/utem-seo-aeo-2026/oferta-tecnica.md',output_folder:out,formats:['md','html','pdf'],status:'prepared_for_operator_review_not_submitted',signed:false,economic_offer_included:false,metrics,files};
await fs.writeFile(path.join(root,'delivery-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
await fs.writeFile(path.join(out,'VERIFICACION-ENTREGA.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({out,files:files.map(x=>({name:x.name,bytes:x.bytes})),metrics},null,2));
