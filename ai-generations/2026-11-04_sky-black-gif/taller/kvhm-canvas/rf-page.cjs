// Página del canvas «KV Black · Rutas foco Chile y Perú inter» (2026-11-06): popup y story de rutas-foco.cjs.
// Sólo toca su página (borra y recrea sus boards y notas). Un board por ruta con popup y story lado a lado: el canvas
// está cerca del tope de 511 archivos por versión, así que las imágenes van como assets (/_blob/, ids en rf-blobs.json,
// subidas con Artifact publish asset:true desde P/formatos/, que este script escribe como JPG 4:4:4 q90).
// Uso: node rf-page.cjs <P>   → escribe rf-page-files.json con el mapa {"project/<ruta>": "project/<ruta>"} para publicar.
const fs = require('fs');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const K = __dirname, P = process.argv[2] + '/';
const { RUTAS } = require(K + '/rutas-foco.cjs');
const BL = fs.existsSync(K + '/rf-blobs.json') ? require(K + '/rf-blobs.json') : {};
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
const img = (src, alt, x, y, w, h) => `<img src="${src}" alt="${alt}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; display: block;">`;
(async () => {
  const c = JSON.parse(fs.readFileSync(P + 'canvas.json', 'utf8'));
  const ID = 'kv-black-rutas-foco', out = ['canvas.json'];
  if (!c.pages.find((p) => p.id === ID)) c.pages.push({ id: ID, name: 'KV Black · Rutas foco Chile y Perú inter' });
  for (const k of Object.keys(c.boards)) if (c.boards[k].page === ID) delete c.boards[k];
  c.order = c.order.filter((k) => c.boards[k]);
  for (const k of Object.keys(c.notes)) if (c.notes[k].page === ID) delete c.notes[k];
  const board = (file, title, inner, w, h, x, y) => { fs.writeFileSync(P + file, shell(title, inner, w, h)); c.boards[file] = { x, y, w, h, title, page: ID }; c.order.push(file); out.push(file); };
  const GRUPOS = [
    ['CL DOM', 'HM Chile · rutas foco domésticas · DESDE / $000.000 / «Final tramo. Tasas e impuestos incluidos.»'],
    ['CL INTER', 'HM Chile · rutas foco internacionales · IDA Y VUELTA DESDE / $000.000 / «Tasas e impuestos incluidos.»'],
    ['PE INTER', 'HM Perú · rutas foco internacionales · IDA Y VUELTA DESDE / US$000 o S/0,000 / «Final ruta Lima-(destino)-Lima.»']
  ];
  c.notes['t-rf'] = { x: 0, y: -420, text: 'Rutas foco Chile y Perú inter (Daniela, Teams y Notion 2026-11-06) · popup y story · fotos del banco, sin PromPerú, ubicación ni marca de agua · precios en 000 hasta la grilla', kind: 'title1', maxW: 9200, page: ID };
  const ROW = 1920 + 520, W = 1080 + 80 + 1080;
  let fila = 0;
  for (const [g, titulo] of GRUPOS) {
    const rs = RUTAS.filter((r) => r.mk + ' ' + r.tipo === g), y0 = fila * ROW;
    c.notes['t-rf-' + g.replace(' ', '-').toLowerCase()] = { x: 0, y: y0 - 320, text: titulo, kind: 'title1', maxW: 9200, page: ID };
    for (const [i, r] of rs.entries()) {
      const k = r.name.toLowerCase(), x = i * (W + 80);
      let inner = '';
      for (const [fmt, h, dx] of [['popup', 1080, 0], ['story', 1920, 1160]]) {
        await sharp(K + `/formatos/${r.name}__${fmt}.png`).flatten({ background: '#000' }).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toFile(P + `formatos/${r.name}__${fmt}.jpg`);
        const id = BL[r.name + '__' + fmt]; if (!id) throw new Error('sin blob ' + r.name + ' ' + fmt);
        inner += img('/_blob/' + id, `${fmt} ruta ${r.d}`, dx, 0, 1080, h);
      }
      board(`rf-${k}.dc.html`, `${r.d} (${r.iata}) · popup 1080×1080 + story 1080×1920`, inner, W, 1920, x, y0);
    }
    fila++;
  }
  fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
  const map = Object.fromEntries(out.map((f) => ['project/' + f, 'project/' + f]));
  fs.writeFileSync(K + '/rf-page-files.json', JSON.stringify(map, null, 1));
  console.log(out.length, 'archivos');
})();
