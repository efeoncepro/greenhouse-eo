import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'
import {efeonceGraphicLine as gl} from '../../../axis-design-system/packages/tokens/dist/index.js'
const root=path.dirname(fileURLToPath(import.meta.url)); const list=JSON.parse(await fs.readFile(path.join(root,'flat/selection.json'),'utf8'));
const lane=process.argv[2]??'flare';const W=2048,H=680,bg=gl.color.paper;const layers=[];
const labels=list.map((g,i)=>`<text x="${i*512+256}" y="592" text-anchor="middle" font-size="27">${g.label}</text>`).join('');
layers.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="${bg}"/><g fill="${gl.color.navy}" font-family="${gl.type.question.family}"><text x="32" y="43" font-size="29">PNG sin fondo · ${lane==='flare'?'Flare max':'Seedream 5 Pro, dos pasadas'} · prueba sobre papel</text>${labels}<text x="32" y="641" font-size="20">Alfa derivado por color-key AXIS · formas candidatas sin publicar</text></g></svg>`),left:0,top:0});
for(const[i,g]of list.entries()) layers.push({input:await sharp(path.join(root,`alpha/${lane}/${g.key}.png`)).resize(450,450).png().toBuffer(),left:i*512+31,top:95});
await sharp({create:{width:W,height:H,channels:3,background:bg}}).composite(layers).png().toFile(path.join(root,`transparencia-${lane}.png`));
console.log('paper preview generated',lane);
