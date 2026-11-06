// Entrega de las rutas foco de Chile y Perú inter (2026-11-06), con la convención de organizar.cjs:
// <BLACK SKY 2026>/HM CL|HM PE/RUTAS FOCO/<DESTINO>/BS_POPUP_<IATA>.png y BS_STORY_<IATA>.png, y la copia local en
// OUT/rutas-foco/. Sólo copia; no borra. Compara por tamaño (sin leer el destino: un archivo sólo en la nube de OneDrive
// se descargaría entero). Con --revision copia además a «BLACK SKY 2026 - PARA REVISION», con la misma estructura (como
// split.py con las rutas DOM de Perú: la entrega directa queda y la carpeta de estado la acompaña; al aprobarse, la pieza
// se mueve a «BLACK SKY 2026 - APROBADO»). Uso: node rf-entregar.cjs <OUT> <carpeta BLACK SKY 2026> [--dry] [--revision]
const fs = require('fs'), path = require('path');
const [O, DST] = process.argv.slice(2), dry = process.argv.includes('--dry'), rev = process.argv.includes('--revision');
const { RUTAS } = require(__dirname + '/rutas-foco.cjs');
const carpeta = (d) => d.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
let n = 0, igual = 0;
for (const r of RUTAS) for (const fmt of ['popup', 'story']) {
  const src = path.join(__dirname, 'formatos', `${r.name}__${fmt}.png`);
  const rel = path.join(`HM ${r.mk}`, 'RUTAS FOCO', carpeta(r.d), `BS_${fmt.toUpperCase()}_${r.iata}.png`);
  const dsts = [path.join(O, 'rutas-foco', `${r.name}__${fmt}.png`), path.join(DST, rel)];
  if (rev) dsts.push(path.join(DST + ' - PARA REVISION', rel));
  for (const dst of dsts) {
    const s = fs.statSync(src);
    if (fs.existsSync(dst)) { const t = fs.statSync(dst); if (t.size === s.size && t.mtimeMs >= s.mtimeMs) { igual++; continue; } }
    console.log((dry ? '[dry] ' : '') + path.relative(path.dirname(DST), dst));
    if (!dry) { fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst); }
    n++;
  }
}
console.log('copiados', n, 'ya al día', igual);
