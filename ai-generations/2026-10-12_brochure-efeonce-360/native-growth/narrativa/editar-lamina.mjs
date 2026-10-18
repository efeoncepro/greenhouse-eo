// node editar.mjs cfg.json  → {src,out,erase:[[x,y,w,h,'v'|'h']],html:'<div…>'}
import fs from 'node:fs';import {execFileSync} from 'node:child_process';
import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js';
const cfg=JSON.parse(fs.readFileSync(process.argv[2],"utf8"));const path=await import("node:path");cfg.src=path.resolve(cfg.src);cfg.out=path.resolve(cfg.out);
const img=sharp(cfg.src).removeAlpha().resize(1920,1080);const {data,info}=await img.raw().toBuffer({resolveWithObject:true});const W=info.width;
for(const [x,y,w,h,dir='v'] of cfg.erase||[]){
 if(dir==='v'){for(let xx=x;xx<x+w;xx++){const a=((y-1)*W+xx)*3,b=((y+h)*W+xx)*3;for(let yy=y;yy<y+h;yy++){const t=(yy-y+1)/(h+1);const i=(yy*W+xx)*3;for(let c=0;c<3;c++)data[i+c]=data[a+c]*(1-t)+data[b+c]*t;}}}
 else if(dir==='f'){let r=0,g=0,bb=0,n=0;for(let xx=x;xx<x+w;xx++){const i=((y-1)*W+xx)*3;r+=data[i];g+=data[i+1];bb+=data[i+2];n++;}r/=n;g/=n;bb/=n;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*W+xx)*3;data[i]=r;data[i+1]=g;data[i+2]=bb;}}
 else {for(let yy=y;yy<y+h;yy++){const a=(yy*W+x-1)*3,b=(yy*W+x+w)*3;for(let xx=x;xx<x+w;xx++){const t=(xx-x+1)/(w+1);const i=(yy*W+xx)*3;for(let c=0;c<3;c++)data[i+c]=data[a+c]*(1-t)+data[b+c]*t;}}}}
const base=cfg.out.replace(/\.jpg$/,'-base.png');await sharp(data,{raw:{width:W,height:1080,channels:3}}).png().toFile(base);
const ID='Bricolage Grotesque, system-ui, sans-serif', ST='Poppins, system-ui, sans-serif';
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}.eb{position:absolute;left:140px;font-family:${ST};font-size:16px;font-weight:500;letter-spacing:.14em;text-transform:uppercase;color:#e2e2e2;white-space:nowrap}</style></head><body><div style="position:relative;width:1920px;height:1080px;overflow:hidden"><img src="file://${base}" style="position:absolute;inset:0;width:1920px;height:1080px">${cfg.html.replaceAll('$ID',ID).replaceAll('$ST',ST)}</div></body></html>`;
const hp=cfg.out.replace(/\.jpg$/,'.html');fs.writeFileSync(hp,html);const pp=cfg.out.replace(/\.jpg$/,'-shot.png');
execFileSync('node',['/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs',hp,pp]);
await sharp(pp).jpeg({quality:92,chromaSubsampling:'4:4:4'}).toFile(cfg.out);console.log('ok',cfg.out);
