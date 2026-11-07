// Página «KV Black · Popup y Story»: estáticos 1080x1080 y 1080x1920 de los 12 KV.
const fs = require('fs');
const P = process.argv[2] + '/';
const TIT = {
  HM_PE_KV_DOM: 'Perú · Nacional', 'HM_PE_KV_DOM-RUTA': 'Perú · Nacional con ruta', HM_PE_KV_INTER: 'Perú · Internacional', 'HM_PE_KV_INTER-RUTA': 'Perú · Internacional con ruta',
  HM_CL_KV_DOM: 'Chile · Nacional', HM_CL_KV_INTER: 'Chile · Internacional', HM_AR_KV: 'Argentina', HM_UY_KV: 'Uruguay', HM_BR_KV: 'Brasil', HM_US_KV: 'Estados Unidos',
  HM_CL_KV_DOM_CLUSTER: 'Chile · Nacional, clúster', HM_CL_KV_INTER_CLUSTER: 'Chile · Internacional, clúster'
};
const GRUPOS = [['Perú', ['HM_PE_KV_DOM', 'HM_PE_KV_DOM-RUTA', 'HM_PE_KV_INTER', 'HM_PE_KV_INTER-RUTA']],
  ['Chile, Argentina, Uruguay, Brasil y Estados Unidos', ['HM_CL_KV_DOM', 'HM_CL_KV_INTER', 'HM_AR_KV', 'HM_UY_KV', 'HM_BR_KV', 'HM_US_KV']],
  ['Chile clúster (regiones y banderas)', ['HM_CL_KV_DOM_CLUSTER', 'HM_CL_KV_INTER_CLUSTER']]];
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
const PAGE = 'kv-black-formatos';
if (!c.pages.find((p) => p.id === PAGE)) c.pages.push({ id: PAGE, name: 'KV Black · Popup y Story' });
for (const k of Object.keys(c.boards)) if (c.boards[k].page === PAGE) delete c.boards[k];
c.order = c.order.filter((k) => c.boards[k]);
for (const k of Object.keys(c.notes)) if (c.notes[k].page === PAGE) delete c.notes[k];
let y = 0; const out = [];
GRUPOS.forEach(([g, ns], gi) => {
  c.notes['t-fmt-' + gi] = { x: 0, y: y - 280, text: 'Popup 1080×1080 y story 1080×1920 · ' + g, kind: 'title1', maxW: 6900, page: PAGE };
  ns.forEach((n, col) => {
    for (const [fmt, w, h, dy, label] of [['popup', 1080, 1080, 0, 'Popup 1080×1080'], ['story', 1080, 1920, 1160, 'Story 1080×1920']]) {
      const file = `${fmt}-${n.toLowerCase()}.dc.html`;
      fs.writeFileSync(P + file, doc(`KV Black ${label} · ${TIT[n]}`, `formatos/${n}__${fmt}.jpg`, `KV Black ${label} ${TIT[n]} (${n})`, w, h));
      c.boards[file] = { x: col * 1160, y: y + dy, w, h, title: `${label} · ${n} · ${TIT[n]}`, page: PAGE };
      c.order.push(file); out.push(file);
    }
  });
  y += 1160 + 1920 + 560;
});
fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
fs.writeFileSync(__dirname + '/formats-files.json', JSON.stringify(Object.fromEntries([...out, ...fs.readdirSync(P + 'formatos').map((f) => 'formatos/' + f)].map((f) => ['project/' + f, 'project/' + f]))));
console.log(out.length);
