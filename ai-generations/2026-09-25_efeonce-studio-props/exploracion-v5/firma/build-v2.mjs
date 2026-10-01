// node build-v2.mjs → out/v2-<estilo>-<id>.html + previews claro/móvil/sin fuentes.
import {readFileSync,writeFileSync} from 'node:fs';import {firmaV2} from './firma.mjs';
import {chromium} from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs';
const DIR=new URL('./',import.meta.url).pathname,BASE='https://greenhouse.efeoncepro.com/branding/email/firma/';
const personas=JSON.parse(readFileSync(DIR+'personas.json','utf8')).filter(p=>['julio-reyes','julio-reyes-campana','ventas'].includes(p.id));
const local=n=>'data:image/png;base64,'+readFileSync(DIR+'assets/'+n+'.png').toString('base64');
const fonts=`<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:ital,wght@0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">`;
const b=await chromium.launch();
for(const estilo of ['clara','tarjeta'])for(const p of personas){writeFileSync(DIR+`out/v2-${estilo}-${p.id}.html`,firmaV2(p,n=>BASE+n+'.png',estilo)+'\n');
 for(const [modo,w,font] of [['claro',560,true],['movil',360,true],['sin-fuentes',560,false]]){const pg=await b.newPage({viewport:{width:w,height:400},deviceScaleFactor:2});
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${font?fonts:''}</head><body style="margin:0;padding:24px 20px;background:#fff">${font?'':'<style>*{font-family:Arial,Helvetica,sans-serif!important}</style>'}<p style="font:14px Arial;color:#222;margin:0 0 22px">Quedo atento.</p>${firmaV2(p,local,estilo)}</body></html>`,{waitUntil:'networkidle'});
  await pg.evaluate(()=>document.fonts.ready);const h=await pg.evaluate(()=>document.body.scrollHeight);await pg.screenshot({path:DIR+`out/preview-v2-${estilo}-${p.id}-${modo}.png`,clip:{x:0,y:0,width:w,height:h}});await pg.close();}}
await b.close();console.log('ok');
