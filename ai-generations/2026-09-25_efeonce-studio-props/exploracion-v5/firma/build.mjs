// node build.mjs  → out/<id>.html (URLs de producción, listo para pegar) + out/preview-<id>.png (render local).
import {readFileSync,writeFileSync} from 'node:fs';import {firma} from './firma.mjs';
import {chromium} from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs';
const DIR=new URL('./',import.meta.url).pathname,BASE='https://greenhouse.efeoncepro.com/branding/email/firma/';
const personas=JSON.parse(readFileSync(DIR+'personas.json','utf8'));
const local=n=>'data:image/png;base64,'+readFileSync(DIR+'assets/'+n+'.png').toString('base64');
const fonts=`<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,800&family=Poppins:ital,wght@0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">`;
const b=await chromium.launch();
for(const p of personas){writeFileSync(DIR+'out/'+p.id+'.html',firma(p,n=>BASE+n+'.png')+'\n');
 for(const [modo,w,bg,font] of [['claro',640,'#FFFFFF',true],['movil',360,'#FFFFFF',true],['sin-fuentes',640,'#FFFFFF',false]]){
  const pg=await b.newPage({viewport:{width:w,height:400},deviceScaleFactor:2});
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${font?fonts:''}</head><body style="margin:0;padding:24px 20px;background:${bg};font-family:Arial">${font?'':'<style>*{font-family:Arial,Helvetica,sans-serif!important}</style>'}<p style="font:14px Arial;color:#222;margin:0 0 22px">Quedo atento.</p>${firma(p,local)}</body></html>`,{waitUntil:'networkidle'});
  await pg.evaluate(()=>document.fonts.ready);const h=await pg.evaluate(()=>document.body.scrollHeight);
  await pg.screenshot({path:DIR+`out/preview-${p.id}-${modo}.png`,clip:{x:0,y:0,width:w,height:h}});await pg.close();}}
await b.close();console.log('ok',personas.length);
