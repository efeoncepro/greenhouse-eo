// Páginas nuevas del canvas (2026-11-04, pedidos de Daniela):
//  · «KV Black · Grilla por mercado»: los 12 mensajes de popup y GIF (KV, popup, GIF, story estático, story video).
//  · «KV Black · Rutas foco Perú»: 13 rutas con popup y story.
//  · «KV Black · Chile KV listo»: Banner TikTok, DAT y PMAX desde las referencias de Daniela.
// Los videos van como assets (/_blob/); sus ids se leen de vid-blobs.json.
const fs = require('fs');
const P = process.argv[2] + '/';
const VB = JSON.parse(fs.readFileSync(__dirname + '/vid-blobs.json', 'utf8'));
const shell = (title, inner, w, h) => `<!doctype html>
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
<div style="width: ${w}px; height: ${h}px; position: relative; overflow: hidden; background:#000;">
${inner}
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
const img = (src, alt, w, h) => `<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; display: block;">`;
const vid = (id, w, h, audio) => `<video src="/_blob/${id}" autoplay muted loop playsinline${audio ? ' controls' : ''} style="display:block;width:${w}px;height:${h}px;"></video>`;
const c = JSON.parse(fs.readFileSync(P + 'canvas.json', 'utf8'));
const out = [];
const reset = (id, name) => {
  if (!c.pages.find((p) => p.id === id)) c.pages.push({ id, name });
  for (const k of Object.keys(c.boards)) if (c.boards[k].page === id) delete c.boards[k];
  c.order = c.order.filter((k) => c.boards[k]);
  for (const k of Object.keys(c.notes)) if (c.notes[k].page === id) delete c.notes[k];
};
const board = (page, file, title, inner, w, h, x, y) => { fs.writeFileSync(P + file, shell(title, inner, w, h)); c.boards[file] = { x, y, w, h, title, page }; c.order.push(file); out.push(file); };
// ---------- Grilla por mercado ----------
const G = 'kv-black-grilla';
reset(G, 'KV Black · Grilla por mercado');
const GRILLA = [
  ['Chile', [['HM_CL_KV_DOM_CLUSTER', 'Vuela por Chile · clúster regiones'], ['HM_CL_KV_INTER_CLUSTER', 'Vuela internacional · clúster banderas'], ['HM_CL_KV_ENCUENTRA', 'Encuentra destinos']]],
  ['Perú', [['HM_PE_KV_DOM_REGIONES', 'Vuela por Perú · regiones (propuesta sin fotos)'], ['HM_PE_KV_INTER_BANDERAS', 'Vuela internacional · banderas Perú'], ['HM_PE_KV_ENCUENTRA', 'Encuentra destinos']]],
  ['Argentina', [['HM_AR_KV_SANTIAGO', 'Volá a Santiago'], ['HM_AR_KV_LIMA', 'Volá a Lima']]],
  ['Uruguay', [['HM_UY_KV_BANDERAS', 'Volá internacional · banderas UY']]],
  ['Brasil', [['HM_BR_KV_SANTIAGO', 'Voe a Santiago · Chile Travel'], ['HM_BR_KV_PERU', 'Voe para Peru · PromPerú (por confirmar: alianza o KV)']]],
  ['Estados Unidos', [['HM_US_KV_BANDERAS', 'Fly international · banderas USA']]],
  ['Extra · KV con banderas de Argentina y Brasil (base de los HPH por mercado)', [['HM_AR_KV_BANDERAS', 'Volá internacional · banderas AR'], ['HM_BR_KV_BANDERAS', 'Voe internacional · banderas BR']]]
];
let y = 0;
c.notes['t-grilla'] = { x: 0, y: -620, text: 'Grilla por mercado · KV 1080×1350, popup 1080×1080, GIF, story 1080×1920 y story video (5 slides, con audio)', kind: 'title1', maxW: 6900, page: G };
GRILLA.forEach(([mk, msgs], gi) => {
  c.notes['t-grilla-' + gi] = { x: 0, y: y - 420, text: mk, kind: 'title1', maxW: 5800, page: G };
  for (const [n, t] of msgs) {
    const k = n.toLowerCase();
    c.notes['t-grilla-' + k] = { x: 0, y: y - 200, text: `${t} · ${n}`, kind: 'title1', maxW: 5800, page: G };
    board(G, `g-kv-${k}.dc.html`, `KV 1080×1350 · ${t}`, img(`kv/${n}.jpg`, `KV ${t}`, 1080, 1350), 1080, 1350, 0, y);
    board(G, `g-popup-${k}.dc.html`, `Popup 1080×1080 · ${t}`, img(`formatos/${n}__popup.jpg`, `Popup ${t}`, 1080, 1080), 1080, 1080, 1160, y);
    board(G, `g-gif-${k}.dc.html`, `GIF 1080×1350 · ${t}`, vid(VB[n + '__gif'], 1080, 1350, false), 1080, 1350, 2320, y);
    board(G, `g-story-${k}.dc.html`, `Story 1080×1920 · ${t}`, img(`formatos/${n}__story.jpg`, `Story ${t}`, 1080, 1920), 1080, 1920, 3480, y);
    if (VB[n + '__story-video']) board(G, `g-storyv-${k}.dc.html`, `Story video 1080×1920 · ${t}`, vid(VB[n + '__story-video'], 1080, 1920, true), 1080, 1920, 4640, y);
    y += 1920 + 420;
  }
  y += 300;
});
// ---------- Rutas foco Perú ----------
const R = 'kv-black-rutas';
reset(R, 'KV Black · Rutas foco Perú');
// 2026-11-05: las 15 rutas del CSV de Daniela, con la foto aprobada, el legal, la ubicación y el crédito.
const RUTAS = fs.readFileSync(__dirname + '/rutas-prompe.csv', 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1).map((l) => l.split(';')[0].trim()).filter((d) => d !== 'Vuela por el Perú');
c.notes['t-rutas'] = { x: 0, y: -420, text: 'Rutas foco Perú · 15 rutas con la foto aprobada, legal, ubicación y crédito del CSV de Daniela (Chiclayo y Talara siguen sin foto aprobada)', kind: 'title1', maxW: 8000, page: R };
RUTAS.forEach((r, i) => {
  const n = 'HM_PE_RUTA_' + r.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, ''), k = n.toLowerCase();
  const x = (i % 7) * 1160, yy = Math.floor(i / 7) * (1080 + 80 + 1920 + 420);
  c.notes['t-ruta-' + k] = { x, y: yy - 200, text: r, kind: 'title1', maxW: 1080, page: R };
  board(R, `r-popup-${k}.dc.html`, `Popup 1080×1080 · ${r}`, img(`formatos/${n}__popup.jpg`, `Popup ruta ${r}`, 1080, 1080), 1080, 1080, x, yy);
  board(R, `r-story-${k}.dc.html`, `Story 1080×1920 · ${r}`, img(`formatos/${n}__story.jpg`, `Story ruta ${r}`, 1080, 1920), 1080, 1920, x, yy + 1160);
});
// ---------- Chile KV listo ----------
const C = 'kv-black-chile';
reset(C, 'KV Black · Chile KV listo');
c.notes['t-chile'] = { x: 0, y: -420, text: 'BLACK SKY CL 26 · formatos «KV listo» desde las referencias editables (Banner TikTok, DAT, PMAX precio+dcto)', kind: 'title1', maxW: 6900, page: C };
const CH = [
  ['CL_BANNER-TIKTOK_PRECIO_1920x1080', 'Banner TikTok 1920×1080 · precio', 1920, 1080, 0, 0],
  ['CL_BANNER-TIKTOK_DCTO_1920x1080', 'Banner TikTok 1920×1080 · descuento', 1920, 1080, 2000, 0],
  ['CL_BANNER-TIKTOK_PRECIO-DCTO_1920x1080', 'Banner TikTok 1920×1080 · precio + descuento', 1920, 1080, 4000, 0],
  ['CL_DAT_DOM', 'DAT 1080×1080 · nacional', 1080, 1080, 0, 1500],
  ['CL_DAT_INTER', 'DAT 1080×1080 · internacional', 1080, 1080, 1160, 1500],
  ['CL_PMAX_1080x1080', 'PMAX 1080×1080', 1080, 1080, 0, 3000],
  ['CL_PMAX_1080x1350', 'PMAX 1080×1350', 1080, 1350, 1160, 3000],
  ['CL_PMAX_1080x1920', 'PMAX 1080×1920', 1080, 1920, 2320, 3000],
  ['CL_PMAX_1200x628', 'PMAX 1200×628', 1200, 628, 3480, 3000]
];
c.notes['t-chile-dat'] = { x: 0, y: 1300, text: 'DAT (portadas del buscador)', kind: 'title1', maxW: 2240, page: C };
c.notes['t-chile-pmax'] = { x: 0, y: 2800, text: 'PMAX estático · 4 formatos', kind: 'title1', maxW: 4680, page: C };
for (const [f, t, w, h, x, yy] of CH) board(C, `c-${f.toLowerCase()}.dc.html`, t, img(`chile/${f}.jpg`, t, w, h), w, h, x, yy);
fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
fs.writeFileSync(__dirname + '/new-pages-files.json', JSON.stringify(out));
console.log(out.length, 'artboards');
