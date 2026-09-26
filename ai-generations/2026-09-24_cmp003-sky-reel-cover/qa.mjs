import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';import {chromium} from 'playwright';
const D=path.dirname(new URL(import.meta.url).pathname),m=JSON.parse(fs.readFileSync(D+'/manifest.json'));
const {data:fg,info}=await sharp(D+'/qa/composed-before-url.png').removeAlpha().raw().toBuffer({resolveWithObject:true});
const bg=await sharp(D+'/qa/background.png').removeAlpha().raw().toBuffer();
const lum=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
const evidence={};
for(const id of ['skyTitle','chosen','gesture','support','efeonce','skyMark']){
 const box=m.layout[id],bounds={l:Math.floor(box.x*2),t:Math.floor(box.y*2),r:Math.ceil((box.x+box.w)*2),b:Math.ceil((box.y+box.h)*2)},L=[];let minx=info.width,miny=info.height,maxx=0,maxy=0;
 for(let y=bounds.t;y<bounds.b;y++)for(let x=bounds.l;x<bounds.r;x++){
 const p=(y*info.width+x)*3;const delta=Math.max(...[0,1,2].map(c=>Math.abs(fg[p+c]-bg[p+c])));if(delta<45)continue;
 L.push(lum([bg[p],bg[p+1],bg[p+2]]));minx=Math.min(x,minx);maxx=Math.max(x,maxx);miny=Math.min(y,miny);maxy=Math.max(y,maxy);
 }
 L.sort((a,b)=>a-b);const p98=L[Math.floor(L.length*.98)];const ink=id==='gesture'?[70,220,40]:[255,255,255];const contrast=(lum(ink)+.05)/(p98+.05);
 evidence[id]={contrastP98:Number(contrast.toFixed(2)),inkPixels:L.length,inkBounds:[minx/2,miny/2,(maxx+1)/2,(maxy+1)/2],pass:contrast>=4.5};
 if(!evidence[id].pass)throw new Error('Contrast failed '+id);
}
const b=await chromium.launch();const page=await b.newPage({viewport:{width:1080,height:1920}});await page.setContent(fs.readFileSync(D+'/cover.html','utf8'));await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()))});
const fonts=await page.evaluate(()=>['Bricolage','Poppins','Guttery'].map(name=>({name,loaded:document.fonts.check(`40px ${name}`)})));
const strips=[];for(const [key,tracking]of[['closed','-.07em'],['balanced','-.025em'],['open','.05em']]){
 await page.evaluate(t=>document.getElementById('chosen').style.letterSpacing=t,tracking);
 const bytes=await page.screenshot({clip:{x:80,y:645,width:950,height:200}});await sharp(bytes).png().toFile(D+'/qa/spacing-'+key+'.png');strips.push({input:bytes,left:0,top:strips.length*200});
}
await sharp({create:{width:950,height:600,channels:3,background:'#023c70'}}).composite(strips).png().toFile(D+'/qa/spacing-comparison.png');await b.close();
const report={status:'PASS technical; visual review recorded in README',contrast:evidence,fonts,url:m.url.method,preview:{mobile:390,crop:'central 3:4 editorial test, not a live platform preview'},limits:['Not published','Guttery uses the existing local campaign font asset; no new license verification or font redistribution claimed','No CTA-compositor certification claimed: this is a typographic cover without CTA or photographic plate']};
fs.writeFileSync(D+'/qa/review.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
