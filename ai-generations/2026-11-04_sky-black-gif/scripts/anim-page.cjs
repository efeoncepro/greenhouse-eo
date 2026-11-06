// Página «KV Black · Animación GIF»: 12 KV animados (CSS), referencias en video y audio.
const fs = require('fs');
const P = process.argv[2] + '/';
const man = JSON.parse(fs.readFileSync(__dirname + '/anim/manifest.json', 'utf8'));
// Ids de los MP4 subidos como assets (se regeneran al republicar los videos): vid-blobs.json.
const VB = JSON.parse(fs.readFileSync(__dirname + '/vid-blobs.json', 'utf8'));
const VID = new Proxy({}, { get: (_, n) => VB[n + '__gif'] });
const T = 3.968; // duración de las referencias (s)
const pct = (t) => (t / T * 100).toFixed(3) + '%';
const OUT = 'cubic-bezier(.33,1,.68,1)', INOUT = 'cubic-bezier(.42,0,.58,1)';
// Tiempos medidos en REF_KV1/KV2 (s). op = opacidad, mv = movimiento.
const SPEC = {
  lista: { op: [0.0, 0.55], mv: [0.0, 1.0], from: 'translateY(150px)' },
  precio: { op: [0.05, 1.0], mv: [0.10, 1.40], from: 'translateX(-230px)' },
  destino: { op: [0.07, 0.90], mv: [0.07, 1.20], from: 'translateY(100px)' },
  badge: { op: [0.05, 0.20], mv: [0.05, 0.20], from: 'scale(.6)' }
};
const kf = (name, prop, a, b, [t0, t1], fn) =>
  `@keyframes ${name}{0%,${pct(t0)}{${prop}:${a};animation-timing-function:${fn}}${pct(t1)},100%{${prop}:${b}}}`;
let css = '';
for (const [k, s] of Object.entries(SPEC)) {
  css += kf('op-' + k, 'opacity', 0, 1, s.op, INOUT);
  css += kf('mv-' + k, 'transform', s.from, 'none', s.mv, OUT);
}
css += `.ly{position:absolute;animation:${T}s linear infinite both}.ly>img{display:block;width:100%;height:100%;animation:${T}s linear infinite both}`;
for (const k of Object.keys(SPEC)) css += `.ly.${k}{animation-name:op-${k}}.ly.${k}>img{animation-name:mv-${k}}`;
const TIT = {
  HM_PE_KV_DOM: 'Perú · Nacional', 'HM_PE_KV_DOM-RUTA': 'Perú · Nacional con ruta', HM_PE_KV_INTER: 'Perú · Internacional', 'HM_PE_KV_INTER-RUTA': 'Perú · Internacional con ruta',
  HM_CL_KV_DOM: 'Chile · Nacional', HM_CL_KV_INTER: 'Chile · Internacional', HM_AR_KV: 'Argentina', HM_UY_KV: 'Uruguay', HM_BR_KV: 'Brasil', HM_US_KV: 'Estados Unidos',
  HM_CL_KV_DOM_CLUSTER: 'Chile · Nacional, clúster', HM_CL_KV_INTER_CLUSTER: 'Chile · Internacional, clúster'
};
const GRID = [['HM_PE_KV_DOM', 'HM_PE_KV_DOM-RUTA', 'HM_PE_KV_INTER', 'HM_PE_KV_INTER-RUTA'],
  ['HM_CL_KV_DOM', 'HM_CL_KV_INTER', 'HM_AR_KV', 'HM_UY_KV', 'HM_BR_KV', 'HM_US_KV'],
  ['HM_CL_KV_DOM_CLUSTER', 'HM_CL_KV_INTER_CLUSTER']];
const doc = (title, body, w, h, extraCss = '') => `<!doctype html>
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
${extraCss}
</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`;
const c = JSON.parse(fs.readFileSync(P + 'canvas.json', 'utf8'));
const PAGE = 'kv-black-anim';
if (!c.pages.find((p) => p.id === PAGE)) c.pages.push({ id: PAGE, name: 'KV Black · Animación GIF' });
for (const k of Object.keys(c.boards)) if (c.boards[k].page === PAGE) delete c.boards[k];
c.order = c.order.filter((k) => c.boards[k]);
for (const k of Object.keys(c.notes)) if (c.notes[k].page === PAGE) delete c.notes[k];
const written = [];
const add = (file, html, b) => { fs.writeFileSync(P + file, html); c.boards[file] = { ...b, page: PAGE }; c.order.push(file); written.push(file); };
GRID.forEach((row, r) => row.forEach((n, col) => {
  const m = man[n];
  const order = ['lista', 'precio', 'destino', 'badge'].filter((l) => m[l]);
  const layers = order.map((l) => {
    const L = m[l];
    // El badge escala desde su centro; las demás capas se mueven completas.
    return `<div class="ly ${l}" style="left:${L.x}px;top:${L.y}px;width:${L.w}px;height:${L.h}px;"><img src="anim/${L.file}" alt="" style="transform-origin:50% 50%;"></div>`;
  }).join('\n');
  // El canvas muestra los artboards como estáticos y congela la animación CSS: cada pieza animada
  // se publica como MP4 renderizado cuadro a cuadro desde esa misma animación (25 fps, 3,96 s, en bucle).
  const kvFile = P + 'kv-' + n.toLowerCase() + '.dc.html';
  const poster = 'kv/' + n + '.jpg';
  const body = `<div style="width:1080px;height:1350px;position:relative;overflow:hidden;background:#000;">
<video src="/_blob/${VID[n]}" poster="${poster}" autoplay muted loop playsinline style="display:block;width:1080px;height:1350px;"></video>
</div>`;
  fs.writeFileSync(__dirname + '/anim-css-' + n + '.html', doc(`KV Black animado · ${TIT[n]}`, `<div style="width:1080px;height:1350px;position:relative;overflow:hidden;">
<img src="anim/${m.base.file}" alt="" style="position:absolute;left:0;top:0;width:1080px;height:1350px;display:block;">
${layers}
</div>`, 1080, 1350, css));
  add('anim-' + n.toLowerCase() + '.dc.html', doc(`KV Black animado · ${TIT[n]}`, body, 1080, 1350),
    { x: col * 1160, y: r * 1830, w: 1080, h: 1350, title: `${n} · animado · ${TIT[n]}` });
}));
c.notes['t-anim-pe'] = { x: 0, y: -280, text: 'Animado · Perú', kind: 'title1', maxW: 4600, page: PAGE };
c.notes['t-anim-otros'] = { x: 0, y: 1550, text: 'Animado · Chile, Argentina, Uruguay, Brasil y Estados Unidos', kind: 'title1', maxW: 6900, page: PAGE };
c.notes['t-anim-cluster'] = { x: 0, y: 3380, text: 'Animado · Chile clúster', kind: 'title1', maxW: 2240, page: PAGE };
// Referencias del kit (videos con su audio) y la pista de audio.
// Los videos van como assets (/_blob/): los archivos publicados no se sirven como media.
const REFS = [['ref-kv1-1', 'REF_KV1-1 · Uruguay', '170eee92e0fba64551a84ab544000139'], ['ref-kv1-2', 'REF_KV1-2 · Argentina', '9d24714bb381300429aeba1ed4fff465'],
  ['ref-kv2-1', 'REF_KV2_1 · Perú internacional (sin audio)', '6cf30316d5aaa4ef562906a7dbe56743'], ['ref-kv2-2', 'REF_KV2_2 · Perú nacional', 'f119cf77f63754c2e88409c55cf7b899'],
  ['ref-kv3-1', 'REF_KV3_1 · Argentina', '5732b819b9f728cc0f273729e68d26c1'], ['ref-kv3-2', 'REF_KV3_2 · Perú nacional', '043df1b8c3a18fbb8b1e861428e3adb9']];
const Y = 5500;
c.notes['t-anim-ref'] = { x: 0, y: Y - 280, text: 'Referencias de animación del kit (FORMATO GIF)', kind: 'title1', maxW: 6900, page: PAGE };
REFS.forEach(([f, t, blob], i) => add(f + '.dc.html', doc(t, `<div style="width:1080px;height:1350px;position:relative;background:#000;">
<video src="/_blob/${blob}" autoplay muted loop playsinline controls style="display:block;width:1080px;height:1350px;"></video>
</div>`, 1080, 1350), { x: i * 1160, y: Y, w: 1080, h: 1350, title: t }));
add('audio-gif.dc.html', doc('Previa MP4 con audio · Chile Nacional', `<div style="width:1080px;height:1350px;position:relative;background:#000;">
<video src="/_blob/d5df2c1c89f5000033ba87c7943bec3a" autoplay muted loop playsinline controls style="display:block;width:1080px;height:1350px;"></video>
</div>`, 1080, 1350), { x: 0, y: Y + 1350 + 400, w: 1080, h: 1350, title: 'Previa MP4 con audio · HM_CL_KV_DOM animado + AUDIO FINAL PARA LOS GIF (activa el sonido en el control)' });
c.notes['t-anim-audio'] = { x: 0, y: Y + 1350 + 120, text: 'Audio para GIF: versión MP4 con la pista del kit', kind: 'title1', maxW: 4600, page: PAGE };
fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
console.log(JSON.stringify(written));
