// Ordena los entregables en «BLACK SKY 2026» según Daniela (Teams, 2026-11-05):
// carpeta por mercado → carpeta por formato (HPH, PMAX, GIF + POPUP, …); en GIF + POPUP una carpeta por pieza
// confirmada por Adri; PMAX con más de una agrupación → una carpeta por agrupación con sus 4 imágenes.
// Nomenclatura BS_<MEDIDA o FORMATO>_<PIEZA>: INTER / DOM / DESTINOS en genéricos, IATA en destinos y rutas foco.
// Uso: node organizar.cjs <OUT local> <carpeta BLACK SKY 2026>   (sólo copia; no borra nada; avisa si pisaría algo distinto)
const fs = require('fs'), path = require('path');
const [O, DST] = process.argv.slice(2);
const csv = fs.readFileSync(__dirname + '/rutas-prompe.csv', 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/).slice(1).map((l) => l.split(';')[0].trim()).filter((d) => d !== 'Vuela por el Perú');
const slug = (s) => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const IATA = { AREQUIPA: 'AQP', AYACUCHO: 'AYP', CAJAMARCA: 'CJA', CHICLAYO: 'CIX', CUSCO: 'CUZ', IQUITOS: 'IQT', JAUJA: 'JAU', JULIACA: 'JUL', PIURA: 'PIU', PUCALLPA: 'PCL', TACNA: 'TCQ', TALARA: 'TYL', TARAPOTO: 'TPP', TRUJILLO: 'TRU', TUMBES: 'TBP' };
const PM = ['1080x1080', '1080x1350', '1080x1920', '1200x628'];
const HPH = ['1200x1200', '300x600', '300x250', '728x90'];
const up = (s) => s.toUpperCase();
const plan = [];
const add = (src, dst) => plan.push([path.join(O, src), path.join(DST, dst)]);
const pmax = (mk, kv, suf, grupo) => PM.forEach((m) => add(`pmax/${kv}__pmax-${m}.png`, `${mk}/PMAX/${grupo ? grupo + '/' : ''}BS_${up(m)}_${suf}.png`));
const hph = (mk, kv, suf) => HPH.forEach((m) => add(kv ? `hph/${kv}__hph-${m}.png` : `hph/HPH_${m}_GENERICO.png`, `${mk}/HPH/BS_${up(m)}_${suf}.png`));
// Popup + GIF + story + story en video de una pieza, en su carpeta.
const gif = (mk, kv, carpeta, suf) => {
  const d = `${mk}/GIF + POPUP/${carpeta}/`;
  add(`estaticos/${kv}__popup.png`, d + `BS_POPUP_${suf}.png`);
  add(`estaticos/${kv}__story.png`, d + `BS_STORY_${suf}.png`);
  add(`${kv}.gif`, d + `BS_GIF_${suf}.gif`);
  // Sólo el GIF: el MP4 con el mismo nombre se veía como «exportado dos veces» (Daniela, 2026-11-05).
  add(`story-video/${kv}__story-video.mp4`, d + `BS_STORYVIDEO_${suf}.mp4`);
};
// HM CL
hph('HM CL', null, 'INTER');
pmax('HM CL', 'HM_CL_KV_DOM', 'DOM', 'PMAX DOM'); pmax('HM CL', 'HM_CL_KV_INTER', 'INTER', 'PMAX INTER');
pmax('HM CL', 'HM_CL_KV_DOM_CLUSTER', 'DOM-CLUSTER', 'PMAX DOM CLUSTER'); pmax('HM CL', 'HM_CL_KV_INTER_CLUSTER', 'INTER-CLUSTER', 'PMAX INTER CLUSTER');
PM.forEach((m) => add(`chile-kv-listo/CL_PMAX_${m}.png`, `HM CL/PMAX/PMAX PRECIO DCTO/BS_${up(m)}_PRECIO-DCTO.png`));
gif('HM CL', 'HM_CL_KV_DOM_CLUSTER', 'VUELA POR CHILE', 'DOM'); gif('HM CL', 'HM_CL_KV_INTER_CLUSTER', 'VUELA INTER', 'INTER'); gif('HM CL', 'HM_CL_KV_ENCUENTRA', 'ENCUENTRA DESTINOS', 'DESTINOS');
for (const [k, s] of [['PRECIO', 'PRECIO'], ['DCTO', 'DCTO'], ['PRECIO-DCTO', 'PRECIO-DCTO']]) add(`chile-kv-listo/CL_BANNER-TIKTOK_${k}_1920x1080.png`, `HM CL/BANNER TIKTOK/BS_1920X1080_${s}.png`);
add('chile-kv-listo/CL_DAT_DOM.png', 'HM CL/DAT/BS_DAT_DOM.png'); add('chile-kv-listo/CL_DAT_INTER.png', 'HM CL/DAT/BS_DAT_INTER.png');
// HM PE
hph('HM PE', 'HM_PE_KV_INTER', 'INTER');
pmax('HM PE', 'HM_PE_KV_DOM', 'DOM', 'PMAX DOM'); pmax('HM PE', 'HM_PE_KV_INTER', 'INTER', 'PMAX INTER');
pmax('HM PE', 'HM_PE_KV_DOM-RUTA', 'DOM-RUTA', 'PMAX DOM RUTA'); pmax('HM PE', 'HM_PE_KV_INTER-RUTA', 'INTER-RUTA', 'PMAX INTER RUTA');
gif('HM PE', 'HM_PE_KV_DOM_REGIONES', 'VUELA POR PERU', 'DOM'); gif('HM PE', 'HM_PE_KV_INTER_BANDERAS', 'VUELA INTER', 'INTER'); gif('HM PE', 'HM_PE_KV_ENCUENTRA', 'ENCUENTRA DESTINOS', 'DESTINOS');
for (const d of csv) { const s = slug(d), i = IATA[s]; add(`rutas-peru/HM_PE_RUTA_${s}__popup.png`, `HM PE/RUTAS FOCO/${s}/BS_POPUP_${i}.png`); add(`rutas-peru/HM_PE_RUTA_${s}__story.png`, `HM PE/RUTAS FOCO/${s}/BS_STORY_${i}.png`); }
// HM AR · HM UY · HM BR · HM USA
hph('HM AR', 'HM_AR_KV', 'INTER'); pmax('HM AR', 'HM_AR_KV', 'INTER');
gif('HM AR', 'HM_AR_KV_SANTIAGO', 'VOLA A SANTIAGO', 'SCL'); gif('HM AR', 'HM_AR_KV_LIMA', 'VOLA A LIMA', 'LIM');
hph('HM UY', 'HM_UY_KV', 'INTER'); pmax('HM UY', 'HM_UY_KV', 'INTER'); gif('HM UY', 'HM_UY_KV_BANDERAS', 'VOLA INTERNACIONAL', 'INTER');
hph('HM BR', 'HM_BR_KV', 'INTER'); pmax('HM BR', 'HM_BR_KV', 'INTER'); gif('HM BR', 'HM_BR_KV_SANTIAGO', 'VOE A SANTIAGO', 'SCL');
hph('HM USA', 'HM_US_KV', 'INTER'); pmax('HM USA', 'HM_US_KV', 'INTER'); gif('HM USA', 'HM_US_KV_BANDERAS', 'FLY INTERNATIONAL', 'INTER');

const falta = plan.filter(([s]) => !fs.existsSync(s));
if (falta.length) { console.log('FALTAN', falta.map(([s]) => path.relative(O, s))); process.exit(1); }
const dup = plan.map(([, d]) => d).filter((d, i, a) => a.indexOf(d) !== i);
if (dup.length) { console.log('DESTINOS REPETIDOS', dup); process.exit(1); }
let n = 0, igual = 0;
for (const [s, d] of plan) {
  // Sin leer el destino: en OneDrive puede ser un archivo sólo en la nube y leerlo fuerza su descarga (se colgaba,
  // 2026-11-05). Se copia si falta, si cambia el tamaño o si la fuente es más nueva que la copia.
  if (fs.existsSync(d)) { const a = fs.statSync(s), z = fs.statSync(d); if (a.size === z.size && a.mtimeMs <= z.mtimeMs) { igual++; continue; } }
  fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(s, d); n++;
}
fs.writeFileSync(__dirname + '/organizar-plan.json', JSON.stringify(plan.map(([s, d]) => [path.relative(O, s), path.relative(DST, d)]), null, 1));
console.log('plan', plan.length, 'copiados', n, 'ya iguales', igual);
