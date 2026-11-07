// Página «KV Black · PMAX y HPH»: paquete PMAX por KV (1080×1080, 1080×1350, 1080×1920, 1200×628)
// y HPH (genérico Chile + PE, AR, UY, BR, US en 1200×1200, 300×600, 300×250, 728×90).
const fs = require('fs');
const P = process.argv[2] + '/';
const TIT = {
  HM_PE_KV_DOM: 'Perú · Nacional', 'HM_PE_KV_DOM-RUTA': 'Perú · Nacional con ruta', HM_PE_KV_INTER: 'Perú · Internacional', 'HM_PE_KV_INTER-RUTA': 'Perú · Internacional con ruta',
  HM_CL_KV_DOM: 'Chile · Nacional', HM_CL_KV_INTER: 'Chile · Internacional', HM_AR_KV: 'Argentina', HM_UY_KV: 'Uruguay', HM_BR_KV: 'Brasil', HM_US_KV: 'Estados Unidos',
  HM_CL_KV_DOM_CLUSTER: 'Chile · Nacional, clúster', HM_CL_KV_INTER_CLUSTER: 'Chile · Internacional, clúster'
};
const doc = (title, src, alt, w, h) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="width: ${w}px; height: ${h}px; position: relative; overflow: hidden;">
<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; display: block;">
</div>
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
const PAGE = 'kv-black-pmax-hph';
if (!c.pages.find((p) => p.id === PAGE)) c.pages.push({ id: PAGE, name: 'KV Black · PMAX y HPH' });
for (const k of Object.keys(c.boards)) if (c.boards[k].page === PAGE) delete c.boards[k];
c.order = c.order.filter((k) => c.boards[k]);
for (const k of Object.keys(c.notes)) if (c.notes[k].page === PAGE) delete c.notes[k];
const out = [];
const add = (file, title, src, w, h, x, y) => {
  fs.writeFileSync(P + file, doc(title, src, title, w, h));
  c.boards[file] = { x, y, w, h, title, page: PAGE };
  c.order.push(file); out.push(file);
};
// PMAX: una fila por KV. El 1080×1350 es el KV fijo (mismo asset que la página KV Black · HM).
const kvBlob = (n) => 'kv/' + n + '.jpg';
let y = 0;
c.notes['t-pmax'] = { x: 0, y: -520, text: 'PMAX · 1080×1080, 1080×1350, 1080×1920 y 1200×628 por KV', kind: 'title1', maxW: 6900, page: PAGE };
for (const n of Object.keys(TIT)) {
  const k = n.toLowerCase();
  c.notes['t-pmax-' + k] = { x: 0, y: y - 220, text: `${n} · ${TIT[n]}`, kind: 'title1', maxW: 4600, page: PAGE };
  add(`pmax-1080x1080-${k}.dc.html`, `PMAX 1080×1080 · ${n}`, `formatos/${n}__popup.jpg`, 1080, 1080, 0, y);
  add(`pmax-1080x1350-${k}.dc.html`, `PMAX 1080×1350 · ${n}`, kvBlob(n), 1080, 1350, 1160, y);
  add(`pmax-1080x1920-${k}.dc.html`, `PMAX 1080×1920 · ${n}`, `formatos/${n}__story.jpg`, 1080, 1920, 2320, y);
  add(`pmax-1200x628-${k}.dc.html`, `PMAX 1200×628 · ${n}`, `banners/${n}__pmax-1200x628.jpg`, 1200, 628, 3480, y);
  y += 1920 + 320;
}
// HPH: genérico Chile y una fila por mercado.
y += 440;
c.notes['t-hph'] = { x: 0, y: y - 520, text: 'HPH · 1200×1200, 300×600, 300×250 y 728×90', kind: 'title1', maxW: 6900, page: PAGE };
const HPH = [['generico', 'Genérico Chile internacional', (f) => `banners/HPH_${f}_GENERICO${f === '1200x1200' ? '.jpg' : '_2x.png'}`],
  ...['HM_PE_KV_INTER', 'HM_AR_KV', 'HM_UY_KV', 'HM_BR_KV', 'HM_US_KV'].map((n) => [n.toLowerCase(), `${n} · ${TIT[n]}`, (f) => `banners/${n}__hph-${f}${f === '1200x1200' ? '.jpg' : '_2x.png'}`])];
for (const [k, t, src] of HPH) {
  c.notes['t-hph-' + k] = { x: 0, y: y - 220, text: 'HPH · ' + t, kind: 'title1', maxW: 4600, page: PAGE };
  add(`hph-1200x1200-${k}.dc.html`, `HPH 1200×1200 · ${t}`, src('1200x1200'), 1200, 1200, 0, y);
  add(`hph-300x600-${k}.dc.html`, `HPH 300×600 · ${t}`, src('300x600'), 300, 600, 1280, y);
  add(`hph-300x250-${k}.dc.html`, `HPH 300×250 · ${t}`, src('300x250'), 300, 250, 1660, y);
  add(`hph-728x90-${k}.dc.html`, `HPH 728×90 · ${t}`, src('728x90'), 728, 90, 1660, y + 330);
  y += 1200 + 320;
}
fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
const files = Object.fromEntries([...out, ...fs.readdirSync(P + 'banners').map((f) => 'banners/' + f)].map((f) => ['project/' + f, 'project/' + f]));
fs.writeFileSync(__dirname + '/pmax-hph-files.json', JSON.stringify(files));
console.log(out.length, Object.keys(files).length);
