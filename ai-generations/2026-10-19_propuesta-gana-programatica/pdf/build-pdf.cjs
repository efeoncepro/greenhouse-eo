const fs = require('fs'), path = require('path');
const sharp = require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const dir = path.resolve(__dirname, '../deck'), out = path.resolve(__dirname, process.argv[2] || 'Efeonce-Propuesta-Gana-Programatica-BORRADOR.pdf');
(async () => {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
  const imgs = [];
  for (const f of files) imgs.push((await sharp(path.join(dir, f)).jpeg({ quality: 90 }).toBuffer()).toString('base64'));
  const html = `<!doctype html><html><head><style>@page{size:1920px 1080px;margin:0}body{margin:0}img{display:block;width:1920px;height:1080px;page-break-after:always}</style></head><body>${imgs.map(b => `<img src="data:image/jpeg;base64,${b}">`).join('')}</body></html>`;
  const b = await chromium.launch(); const p = await b.newPage();
  await p.setContent(html, { waitUntil: 'load' });
  await p.pdf({ path: out, width: '1920px', height: '1080px', printBackground: true });
  await b.close(); console.log(out, files.length, 'páginas', fs.statSync(out).size, 'bytes');
})();
