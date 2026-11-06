// Página «KV Black · Neón del logo (exploración)»: un tablero por fila con las 4 intensidades lado a lado.
const fs = require('fs');
const SRC = '/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-11-04_sky-black-gif/taller/canvas/project/canvas.json';
const ROOT = __dirname + '/canvas', P = ROOT + '/project', PAGE = 'kv-black-neon';
fs.mkdirSync(P, { recursive: true });
// Ids de assets del canvas (subidos con Artifact publish asset:true); un archivo re-subido cambia de id.
const B = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(__dirname + '/blobs.json', 'utf8'))).map(([k, v]) => [k, '/_blob/' + v]));
const LV = [['0-actual', 'ACTUAL · SIN NEÓN'], ['1-sutil', 'OPCIÓN 1 · NEÓN SUTIL'], ['2-medio', 'OPCIÓN 2 · NEÓN MEDIO'], ['3-fuerte', 'OPCIÓN 3 · NEÓN FUERTE']];
const CIU = { HM_PE_RUTA_TACNA: 'Tacna · foto clara', HM_PE_RUTA_IQUITOS: 'Iquitos · foto oscura' };
const GAP = 60, HEAD = 120;
const tablero = (title, w, h, cols) => {
  const W = cols.length * w + (cols.length - 1) * GAP, H = HEAD + h;
  const celdas = cols.map((c, i) => `<div style="position:absolute;left:${i * (w + GAP)}px;top:0;width:${w}px;height:${H}px;">
<div style="height:${HEAD}px;display:flex;align-items:center;font:800 44px/1 var(--font-metric, Metric), sans-serif;letter-spacing:.02em;color:${c.dest ? '#26de00' : '#fff'};">${c.label}</div>
${c.video ? `<video src="${c.src}" autoplay muted loop playsinline style="position:absolute;left:0;top:${HEAD}px;width:${w}px;height:${h}px;display:block;"></video>`
          : `<img src="${c.src}" alt="${c.label}" style="position:absolute;left:0;top:${HEAD}px;width:${w}px;height:${h}px;display:block;">`}
</div>`).join('\n');
  return { W, H, html: `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
<link rel="stylesheet" href="ds/skyperformance/tokens.css">
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="width: ${W}px; height: ${H}px; position: relative; overflow: hidden; background:#111;">
${celdas}
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${W},"height":${H}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
` };
};
const c = JSON.parse(fs.readFileSync(SRC, 'utf8'));
for (const k of Object.keys(c.boards)) if (c.boards[k].page === PAGE) delete c.boards[k];
for (const k of Object.keys(c.notes)) if (c.notes[k].page === PAGE) delete c.notes[k];
c.order = c.order.filter(k => c.boards[k]);
if (!c.pages.find(p => p.id === PAGE)) c.pages.push({ id: PAGE, name: 'KV Black · Neón del logo (exploración)' });
const filas = [['negro', 'HM_PE_RUTA_TACNA', 780, 400, 'Sin diseño de pieza · logo solo sobre negro']];
for (const n of Object.keys(CIU)) filas.push(['foto', n, 1080, 1350, `Sin diseño de pieza · logo sobre la foto sola · ${CIU[n]}`]);
for (const [fmt, h, nom] of [['kv', 1350, 'KV 1080×1350'], ['popup', 1080, 'Popup 1080×1080'], ['story', 1080 * 0 + 1920, 'Story 1080×1920']])
  for (const n of Object.keys(CIU)) filas.push([fmt, n, 1080, h, `En la pieza · ${nom} · ${CIU[n]}`]);
c.notes['neon-intro'] = { x: 0, y: -700, page: PAGE, kind: 'title1', maxW: 5400,
  text: 'Neón del logo BLACK · ronda 3 (letras planas en verde de marca, sin bisel; el neón está en el halo y el marco encendido; la opción = opacidad de la luz) para que Dianesty elija. No reemplaza ninguna pieza aprobada. Columnas: actual · opción 1 sutil · opción 2 medio · opción 3 fuerte · encendido animado para GIF/video.' };
const pub = { 'project/canvas.json': 'project/canvas.json' };
let y = 0;
filas.forEach(([fmt, n, w, h, titulo], i) => {
  const cols = LV.map(([lv, label]) => ({ label, src: B[`${n}__${fmt}__${lv}`] }));
  const short = n.replace('HM_PE_RUTA_', '');
  const vid = B[`encendido-${fmt}-${short}`];
  if (vid) cols.push({ label: 'ENCENDIDO ANIMADO · GIF/VIDEO', src: vid, video: true, dest: true });
  if (cols.some(x => !x.src)) throw new Error('falta blob ' + n + fmt);
  const t = tablero(titulo, w, h, cols), f = `neon-${fmt}-${short.toLowerCase()}.dc.html`;
  fs.writeFileSync(`${P}/${f}`, t.html);
  c.notes[`neon-t${i}`] = { x: 0, y: y - 280, text: titulo, kind: 'title1', maxW: 5400, page: PAGE };
  c.boards[f] = { x: 0, y, w: t.W, h: t.H, title: titulo, page: PAGE }; c.order.push(f);
  pub[`project/${f}`] = `project/${f}`;
  y += t.H + 400;
});
fs.writeFileSync(`${P}/canvas.json`, JSON.stringify(c, null, 1));
fs.writeFileSync(`${ROOT}/pub-neon.json`, JSON.stringify(pub, null, 1));
console.log(Object.keys(pub).length, 'archivos');
