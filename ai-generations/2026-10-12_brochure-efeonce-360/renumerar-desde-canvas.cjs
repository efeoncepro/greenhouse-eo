// Renumera laminas-v9/ según el orden del canvas (project/canvas.json) hasta S33. Las láminas nuevas se pasan como
// pares CODIGO=ruta.jpg:slug. Lo anterior se mueve a un respaldo (nunca se borra).
// Uso: node renumerar-desde-canvas.cjs <canvas.json> <laminas-v9> <respaldo> [COD=ruta:slug ...]
const fs = require('fs'), path = require('path');
const [canvasPath, L, BK, ...pairs] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync(canvasPath, 'utf8'));
const main = c.order.slice(0, c.order.indexOf('S33.dc.html') + 1).map(f => f.replace('.dc.html', ''));
const extra = Object.fromEntries(pairs.map(p => { const [k, v] = p.split('='); const [src, slug] = v.split(':'); return [k, [src, slug]]; }));
const files = fs.readdirSync(L); const byCode = {}; for (const f of files) byCode[f.split('-')[1]] = f;
const plan = main.map((code, i) => { const n = String(i + 1).padStart(2, '0');
  if (extra[code]) return [extra[code][0], `${n}-${code}-${extra[code][1]}.jpg`];
  if (byCode[code]) return [path.join(BK, byCode[code]), `${n}-${byCode[code].split('-').slice(1).join('-')}`];
  throw new Error('falta ' + code); });
fs.mkdirSync(BK, { recursive: true }); for (const f of files) fs.renameSync(path.join(L, f), path.join(BK, f));
for (const [src, dst] of plan) fs.copyFileSync(src, path.join(L, dst));
console.log(plan.length, 'láminas');
