// Convierte el deck a archivos del canvas Design: nativas como .dc.html vivos, recetas/reutilizadas como imagen.
// Uso: node to-canvas.mjs <carpeta-html-nativas> <root-canvas>
import fs from 'node:fs';
import path from 'node:path';
const [SRC, ROOT] = process.argv.slice(2);
const BUBBLE = '/_blob/40e09a0874c56f6b637ff8e6fbd198e4', LOGO = '/_blob/7f619c1e9582ec8670098ba49e11f63d';
const IMG = {
  '01-portada': ['/_blob/9c18754b5045dff48a9e1c4649a9d228', 'Portada · Performance comercial'],
  '12-medicion': ['/_blob/ac9626e2df6b7cd58fcea920e5bdcfac', 'Medición (brochure Agencia de Medios)'],
  '15-senal': ['/_blob/411772c9e1f6b2ea9db10b65af3cdb42', 'Señal hasta ventas (brochure Agencia de Medios)'],
  '16-plan': ['/_blob/e5dfec9a8cda9ef35fb65745cf1abeb1', 'Plan de trabajo'],
  '20-caso-sky': ['/_blob/dee6a779b022d903a4a633bfa9048dd7', 'Caso Sky (brochure 360°)'],
  '21-caso-berel': ['/_blob/d5bda30c8cf086687155e6c07eff11d3', 'Caso Berel (brochure 360°)'],
  '22-partners': ['/_blob/510828e517701451f87a8f8785ed8802', 'Partners (brochure Agencia de Medios)'],
  '24-contraportada': ['/_blob/6a7143f7d4bd10b3e86cdab9f175d130', 'Contraportada Voice']
};
const ORDER = ['01-portada','02-encargo','03-quienes','04-presencia','05-comunicacion','06-oportunidades','07-recorrido','08-equipo','09-ritmo','10-portafolio','11-nucleo','12-medicion','13-recomendado','14-expansion','15-senal','16-plan','17-tarifa','18-total','19-technogym','20-caso-sky','21-caso-berel','22-partners','23-pasos','24-contraportada'];
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap">';
const dc = (title, inner) => `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
${FONTS}
<style>body{margin:0}b{font-weight:600}</style>
</helmet>
${inner}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":1920,"height":1080}}'>
class Component extends DCLogic {
renderVals() { return {}; }
}
</script>
</body>
</html>
`;
const titleOf = (k) => k.replace(/^\d+-/, '').replace(/-/g, ' ');
const project = path.join(ROOT, 'project');
fs.mkdirSync(project, { recursive: true });
const boards = {}, order = [];
ORDER.forEach((k, i) => {
  const file = i === 0 ? 'Main.dc.html' : `${k}.dc.html`;
  let inner, title;
  if (IMG[k]) {
    title = IMG[k][1];
    inner = `<div style="width:1920px;height:1080px;overflow:hidden;background:#001a33"><img src="${IMG[k][0]}" alt="${title}" style="display:block;width:1920px;height:1080px"></div>`;
  } else {
    const html = fs.readFileSync(path.join(SRC, `${k}.html`), 'utf8');
    inner = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>')).trim()
      .replace(/file:\/\/[^"]*url-bubble-baked-dark\.svg"([^>]*)style="[^"]*"/, `${BUBBLE}"$1style="position:absolute;left:135px;top:993px;width:162px;height:auto"`)
      .replace(/file:\/\/[^"]*intermedica-blanco\.png/g, LOGO);
    if (inner.includes('file://')) throw new Error(`ruta local sin reemplazar en ${k}`);
    title = titleOf(k);
  }
  const n = k.slice(0, 2);
  fs.writeFileSync(path.join(project, file), dc(`${n} · ${title}`, inner));
  boards[file] = { x: (i % 4) * 2000, y: Math.floor(i / 4) * 1300, w: 1920, h: 1080, title: `${n} · ${title}` };
  order.push(file);
});
const canvas = { v: 3, createdOnFiles: { v: 1, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z') }, title: 'Propuesta Intermedica', launch: { view: 'canvas' }, pages: [], boards, order, notes: {}, designSystems: [] };
fs.writeFileSync(path.join(project, 'canvas.json'), JSON.stringify(canvas, null, 2));
console.log(order.length, 'tableros');
