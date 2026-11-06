const fs = require('fs');
const P = process.argv[2] + '/';
const KV = [
  // [archivo, título, blob, fila, columna]
  ['HM_PE_KV_DOM', 'Perú · Nacional', '6db1409d0ce85eaefe90eb3faa90020c', 0, 0],
  ['HM_PE_KV_DOM-RUTA', 'Perú · Nacional con ruta', '5c9f25e26dbdfec497ccb389fdfb5e99', 0, 1],
  ['HM_PE_KV_INTER', 'Perú · Internacional', 'f5978c077f42bb0e4840817a607ad595', 0, 2],
  ['HM_PE_KV_INTER-RUTA', 'Perú · Internacional con ruta', '85f363e3fc2c42da2a30f3c5ae650053', 0, 3],
  ['HM_CL_KV_DOM', 'Chile · Nacional', 'f9b590806c438f70ccb14b56fae4d359', 1, 0],
  ['HM_CL_KV_INTER', 'Chile · Internacional', '6eb7f0a8f5cd6854934627a00bf655d1', 1, 1],
  ['HM_AR_KV', 'Argentina', '805b3783159e39ee2c59916226b59e89', 1, 2],
  ['HM_UY_KV', 'Uruguay', '95e89c9e55586a74bd9ee8f8da717f5f', 1, 3],
  ['HM_BR_KV', 'Brasil', '86f71d081f10b4e5123477fd11f0c9a5', 1, 4],
  ['HM_US_KV', 'Estados Unidos', '21b2c70c2834464f10cb5504ff41ce29', 1, 5],
  ['HM_CL_KV_DOM_CLUSTER', 'Chile · Nacional, clúster de regiones', 'f0ae07f53b6b9b7c92b7cc1d4f0b73de', 2, 0],
  ['HM_CL_KV_INTER_CLUSTER', 'Chile · Internacional, clúster de banderas', '69e1dd023035f9c49fb29b5072531e6c', 2, 1]
];
const c = JSON.parse(fs.readFileSync(P + 'canvas.json', 'utf8'));
if (!c.pages.find((p) => p.id === 'kv-black')) c.pages.push({ id: 'kv-black', name: 'KV Black · HM' });
const out = [];
for (const [f, t, blob, row, col] of KV) {
  const file = 'kv-' + f.toLowerCase() + '.dc.html';
  fs.writeFileSync(P + file, `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>KV Black · ${t}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{margin:0}
</style>
</helmet>
<div style="width: 1080px; height: 1350px; position: relative; overflow: hidden;">
<img src="/_blob/${blob}" alt="KV Black ${t} (${f})" style="position: absolute; left: 0; top: 0; width: 1080px; height: 1350px; display: block;">
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1080,"height":1350}}'>
class Component extends DCLogic {
renderVals() {
return {};
}
}
</script>
</body>
</html>
`);
  c.boards[file] = { x: col * 1160, y: row * 1830, w: 1080, h: 1350, title: `${f} · ${t}`, page: 'kv-black' };
  if (!c.order.includes(file)) c.order.push(file);
  out.push(file);
}
c.notes['t-kv-pe'] = { x: 0, y: -280, text: 'KV Black · Perú (HM PE)', kind: 'title1', maxW: 4600, page: 'kv-black' };
c.notes['t-kv-otros'] = { x: 0, y: 1550, text: 'KV Black · Chile, Argentina, Uruguay, Brasil y Estados Unidos', kind: 'title1', maxW: 6900, page: 'kv-black' };
c.notes['t-kv-cluster'] = { x: 0, y: 3380, text: 'KV Black · Chile clúster (regiones y banderas)', kind: 'title1', maxW: 2240, page: 'kv-black' };
fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
console.log(JSON.stringify(out));
