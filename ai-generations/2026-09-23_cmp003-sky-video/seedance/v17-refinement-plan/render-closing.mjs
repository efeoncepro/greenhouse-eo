import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const D=path.dirname(new URL(import.meta.url).pathname), A=path.resolve(D,'../v10-local');
fs.mkdirSync(D+'/closing-alpha',{recursive:true});
const b=await chromium.launch(),page=await b.newPage({viewport:{width:2160,height:3840},deviceScaleFactor:1});
await page.setContent(fs.readFileSync(A+'/overlay-preview.html','utf8'));
const logo='data:image/svg+xml;base64,'+fs.readFileSync(D+'/sky-white-separated.svg').toString('base64');
await page.evaluate(async logo=>{
 document.getElementById('skyMark').src=logo;
 await document.fonts.ready; await Promise.all([...document.images].map(i=>i.decode()));
 document.body.classList.add('render'); document.body.dataset.layer='text';
 document.documentElement.style.setProperty('--scale','2');
},logo);
for(let i=0;i<96;i++) {
 await page.evaluate(t=>renderFrame(t,false),10.25+i/24);
 await page.screenshot({path:D+'/closing-alpha/frame-'+String(i+1).padStart(3,'0')+'.png',omitBackground:true});
 if(i%24===0) console.log('Closing '+i+'/96');
}
fs.writeFileSync(D+'/qa/closing-vector.json',JSON.stringify(await page.evaluate(()=>{
 const r=id=>{const a=document.getElementById(id).getBoundingClientRect();return {x:a.x,y:a.y,width:a.width,height:a.height}};
 return {sky:r('skyMark'),efeonce:r('eo'),divider:r('divider'),renderResolution:[2160,3840],frames:96,allWhite:true};
}),null,2));
await b.close();
