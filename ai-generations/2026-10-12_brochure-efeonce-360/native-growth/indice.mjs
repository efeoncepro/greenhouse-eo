// Lámina índice (IDX), va después de la 04. Cada fila enlaza a su sección en el PDF (build-pdf.mjs usa ROW_TOP/ROW_H).
// Uso: node indice.mjs <salida.html> '<json filas>'  — filas: [{n, titulo, sub, color, pagina, to}]
import fs from 'node:fs';
export const ROW_TOP = 176, ROW_H = 80, ROW_X0 = 820, ROW_X1 = 1780;
const [out, json] = process.argv.slice(2);
if (out) {
  const rows = JSON.parse(json);
  const ID = 'Bricolage Grotesque, system-ui, sans-serif', ST = 'Poppins, system-ui, sans-serif';
  const BUB = 'file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
  const row = (r, i) => `<div style="position:absolute;left:${ROW_X0}px;top:${ROW_TOP + i * ROW_H}px;width:${ROW_X1 - ROW_X0}px;height:${ROW_H - 12}px;box-sizing:border-box;display:flex;align-items:center;gap:22px;padding:0 26px;border-radius:14px;background:${r.sub2 ? 'transparent' : 'rgba(160,200,255,0.055)'};border:1px solid ${r.sub2 ? 'transparent' : 'rgba(160,200,255,0.16)'}">
<span style="width:14px;height:14px;border-radius:50%;background:${r.color};box-shadow:0 0 18px ${r.color};flex:none;${r.sub2 ? 'margin-left:24px;width:9px;height:9px' : ''}"></span>
<span style="font-family:${ST};font-size:15px;font-weight:600;letter-spacing:0.14em;color:${r.color};width:${r.sub2 ? 0 : 34}px;flex:none">${r.n || ''}</span>
<span style="font-family:${ID};font-size:${r.sub2 ? 22 : 28}px;font-weight:${r.sub2 ? 600 : 740};letter-spacing:-0.02em;color:#fff;white-space:nowrap">${r.titulo}</span>
<span style="flex:1;font-family:${ST};font-size:17px;font-weight:300;color:#9fb6cf;white-space:nowrap">${r.sub}</span>
<span style="font-family:${ID};font-size:24px;font-weight:300;color:#fff;font-variant-numeric:tabular-nums">${String(r.pagina).padStart(2, '0')}</span>
<span style="font-family:${ST};font-size:20px;color:#36c8bf">→</span></div>`;
  const html = `<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:radial-gradient(ellipse 900px 700px at 1300px 540px, rgba(54,200,191,0.12), rgba(0,26,51,0) 75%), #001a33">
<div style="position:absolute;left:140px;top:120px;width:560px">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Índice</div>
<div style="margin-top:64px;font-family:${ID};font-size:96px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">Todo el<br>recorrido<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36c8bf;margin-left:0.04em"></span></div>
<div style="margin-top:40px;font-family:${ST};font-size:23px;font-weight:300;line-height:1.45;color:#fff;max-width:500px">Las cinco líneas, cómo trabajamos contigo y las pruebas. <b>Toca una sección</b> para ir directo.</div></div>
${rows.map(row).join('')}
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px"></div></body></html>`;
  fs.writeFileSync(out, html); console.log('ok');
}
