// Genera anim-css-<KV>.html (animación CSS de cada KV) para renderizar GIF/MP4 con render-gif.sh.
const fs = require('fs');
const man = JSON.parse(fs.readFileSync(__dirname + '/anim/manifest.json', 'utf8'));
const VID = { HM_PE_KV_DOM: '7f3dcf49947c3fb24609430cd48b1361', 'HM_PE_KV_DOM-RUTA': '4ddced03c449cc22804983cbdd7d9d04', HM_PE_KV_INTER: '35077c95b02e0e180cf11ebf203c4625',
  'HM_PE_KV_INTER-RUTA': '95d1099d400628d070064275b159d55f', HM_CL_KV_DOM: '56bbd332613387c0ea2151945269ad0e', HM_CL_KV_INTER: '7d3a1a9b2fe999612d26800a9f4a5cdf',
  HM_AR_KV: '4543574b671694099af452abe2af9b0f', HM_UY_KV: 'b2581b54125095ed93b5183ee12eaabc', HM_BR_KV: 'a397da94c77dbffbd7d0a1c688ee048b', HM_US_KV: '2e24abebf5f059a7dfa31d577b668ff9',
  HM_CL_KV_DOM_CLUSTER: '298fe6a36b4994f6a6b0a2eabe8cbb3b', HM_CL_KV_INTER_CLUSTER: 'c16a42fb199c5259ea4af2298611b4e8' };
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

for (const n of process.argv.slice(2)) {
  const m = man[n];
  const order = ['lista', 'precio', 'destino', 'badge'].filter((l) => m[l]);
  const layers = order.map((l) => { const L = m[l];
    return `<div class="ly ${l}" style="left:${L.x}px;top:${L.y}px;width:${L.w}px;height:${L.h}px;"><img src="anim/${L.file}" alt="" style="transform-origin:50% 50%;"></div>`; }).join('\n');
  fs.writeFileSync(__dirname + '/anim-css-' + n + '.html', doc(`KV Black animado · ${n}`, `<div style="width:1080px;height:1350px;position:relative;overflow:hidden;">
<img src="anim/${m.base.file}" alt="" style="position:absolute;left:0;top:0;width:1080px;height:1350px;display:block;">
${layers}
</div>`, 1080, 1350, css));
  console.log(n, order.join(','));
}
