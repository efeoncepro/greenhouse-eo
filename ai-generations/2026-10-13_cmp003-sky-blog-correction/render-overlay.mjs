import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const D=path.dirname(new URL(import.meta.url).pathname);
fs.mkdirSync(D+'/alpha',{recursive:true});
const b=await chromium.launch();const p=await b.newPage({viewport:{width:2160,height:3840},deviceScaleFactor:1});
await p.setContent(fs.readFileSync(D+'/overlay-blog.html','utf8'));
await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));document.body.classList.add('render');document.body.dataset.layer='text';document.documentElement.style.setProperty('--scale','2')});
const report=[];
for(let f=484;f<564;f++){
 await p.evaluate(t=>renderFrame(t,false),f/24-15.25);
 await p.screenshot({path:D+'/alpha/frame-'+String(f-484).padStart(3,'0')+'.png',omitBackground:true});
 if([500,510,528,550].includes(f))report.push(await p.evaluate(f=>({frame:f,boxes:['intro','agency','scope','seo'].map(id=>{const el=document.getElementById(id),r=el.firstChild.getBoundingClientRect();return {id,text:el.textContent,x:r.x,y:r.y,width:r.width,height:r.height}})}),f));
 if(f%24===0)console.log('Overlay frame '+f+'/564');
}
fs.writeFileSync(D+'/qa/text-layout.json',JSON.stringify(report,null,2));await b.close();
