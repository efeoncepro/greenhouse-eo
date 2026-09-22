import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import sharp from 'sharp';
const d='ai-generations/2026-09-22_aeo-fuente-preferida';
const p=JSON.parse(fs.readFileSync(`${d}/piezas.json`));
fs.writeFileSync(`${d}/piezas-texto.json`,JSON.stringify(p.map(({logo,...s})=>s),null,2));
execFileSync(process.execPath,['scripts/foto/componer.mjs',`${d}/piezas-texto.json`],{stdio:'inherit'});
let log='Firma oficial 20% del lado corto; centro vertical 93.5%.\n';
for(const s of p){
 const tmp=`${d}/out/${s.id}-texto.png`,out=`${d}/out/${s.id}.png`;
 fs.renameSync(out,tmp);
 log+=execFileSync(process.execPath,['ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/componer.mjs',tmp,out],{encoding:'utf8'});
 await sharp(out).resize({width:390}).png().toFile(`${d}/out/preview-390/${s.id}.png`);
 fs.unlinkSync(tmp);
}
fs.writeFileSync(`${d}/out/qa-firma.txt`,log);console.log(log);
