// Canvas aparte «SKY BLACK — Pruebas de difuminado superior» (2026-11-06; Julio: «abre otro canvas»; Daniela: «dos o tres
// pruebas, no en todas»). Escribe project/canvas.json, Main.dc.html (análisis) y un tablero por imagen en <root>/project.
// Uso: node pruebas-velo-canvas.cjs <root> <ids.json>   (ids.json: {"<archivo jpg>": "<id de asset>"})
const fs = require('fs');
const [root, idsFile] = process.argv.slice(2), P = root + '/project/', IDS = JSON.parse(fs.readFileSync(idsFile, 'utf8'));
const V = [['0-actual', 'Hoy'], ['A-suave', 'A · Suave'], ['B-curva', 'B · Curva (recomendada)'], ['C-logo', 'C · Sólo detrás del logo']];
const N = [['HM_AR_KV_LIMA', 'Argentina · Volá a Lima'], ['HM_PE_KV_ENCUENTRA', 'Perú · Encuentra destinos'], ['HM_CL_KV_ENCUENTRA', 'Chile · Encuentra destinos']];
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
${inner}
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
const c = { v: 3, createdOnFiles: { v: 1, at: new Date().toISOString() }, title: 'SKY BLACK — Pruebas de difuminado superior', launch: { view: 'canvas' }, pages: [], boards: {}, order: [], notes: {}, designSystems: [] };
const board = (file, title, inner, w, h, x, y) => { fs.writeFileSync(P + file, shell(title, inner, w, h)); c.boards[file] = { x, y, w, h, title }; c.order.push(file); };
const li = (t) => `<li style="margin: 0 0 10px 0">${t}</li>`;
board('Main.dc.html', 'Difuminado superior · análisis', `<div style="width: 4600px; height: 600px; box-sizing: border-box; padding: 56px 64px; background: #14121a; color: #f4f2f7; font-family: 'Helvetica Neue', Arial, sans-serif; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 80px">
<div>
<h1 style="margin: 0 0 20px 0; font-size: 52px; font-weight: 700">Difuminado superior · 3 pruebas</h1>
<p style="margin: 0 0 18px 0; font-size: 26px; line-height: 1.4; color: #cfc9da">Pedido de Dianesty: «si vamos a considerar algún difuminado en la parte superior, que sea lo mismo para todos y no tan oscuro». Tres piezas de muestra (Lima, Perú y Chile «Encuentra destinos»), en popup y KV; el resto del lote no se tocó.</p>
<ul style="margin: 0; padding-left: 28px; font-size: 26px; line-height: 1.4">
${li('<b>Hoy:</b> negro al 69 % arriba que se apaga a mitad de la pieza, más una sombra lateral en las piezas con lista. Por eso unas se ven más oscuras que otras.')}
${li('<b>A · Suave:</b> el mismo degradado al 40 %, sin sombra lateral. Igual en todas.')}
${li('<b>B · Curva:</b> 45 % arriba con caída suave: baja rápido justo bajo el logo y se apaga sin borde. Igual en todas.')}
${li('<b>C · Sólo logo:</b> velo ovalado al 38 % sólo detrás del logo; el resto de la foto queda sin oscurecer.')}
</ul>
</div>
<div>
<h2 style="margin: 8px 0 20px 0; font-size: 34px; font-weight: 700">Cuánto se aclara (luz promedio del tercio superior del popup, 0 a 255)</h2>
<table style="border-collapse: collapse; font-size: 26px; width: 100%">
<thead><tr style="text-align: left; color: #cfc9da"><th style="padding: 8px 12px">Pieza</th><th style="padding: 8px 12px">Hoy</th><th style="padding: 8px 12px">A</th><th style="padding: 8px 12px">B</th><th style="padding: 8px 12px">C</th></tr></thead>
<tbody>
<tr><td style="padding: 8px 12px">Argentina · Lima</td><td style="padding: 8px 12px">104</td><td style="padding: 8px 12px">130</td><td style="padding: 8px 12px">136</td><td style="padding: 8px 12px">150</td></tr>
<tr><td style="padding: 8px 12px">Perú · Encuentra</td><td style="padding: 8px 12px">75</td><td style="padding: 8px 12px">110</td><td style="padding: 8px 12px">114</td><td style="padding: 8px 12px">128</td></tr>
<tr><td style="padding: 8px 12px">Chile · Encuentra</td><td style="padding: 8px 12px">86</td><td style="padding: 8px 12px">106</td><td style="padding: 8px 12px">111</td><td style="padding: 8px 12px">122</td></tr>
</tbody></table>
<p style="margin: 22px 0 0 0; font-size: 26px; line-height: 1.4"><b>Recomendación: B.</b> Aclara la foto de forma pareja en todas las piezas y deja el apoyo justo donde está el logo. C es la más clara, pero en cielos claros el logo pierde algo de fuerza.</p>
</div>
</div>`, 4600, 600, 0, 0);
let y = 1400;
const fila = (fmt, h) => {
  c.notes['t-' + fmt] = { x: 0, y: y - 620, text: fmt === 'popup' ? 'Popup 1080×1080' : 'KV 1080×1350 (base del MP4)', kind: 'title1', maxW: 4600 };
  V.forEach(([v, t], i) => { c.notes[`t-${fmt}-${v}`] = { x: i * 1160, y: y - 260, text: t, kind: 'title1', maxW: 1080 }; });
  for (const [n, t] of N) {
    V.forEach(([v, vt], i) => {
      const f = `${v}__${n}__${fmt}.jpg`, id = IDS[f]; if (!id) throw new Error('sin id ' + f);
      board(`${fmt}-${v}-${n.toLowerCase()}.dc.html`, `${vt} · ${t}`, `<img src="/_blob/${id}" alt="${fmt} ${t}, ${vt}" style="display: block; width: 1080px; height: ${h}px">`, 1080, h, i * 1160, y);
    });
    y += h + 120;
  }
  y += 720;
};
fila('popup', 1080);
fila('kv', 1350);
fs.writeFileSync(P + 'canvas.json', JSON.stringify(c, null, 1) + '\n');
console.log(c.order.length, 'tableros');
