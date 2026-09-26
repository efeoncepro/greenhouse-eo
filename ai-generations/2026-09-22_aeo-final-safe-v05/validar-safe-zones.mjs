import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const dir=path.dirname(path.resolve(process.argv[2]));const plan=JSON.parse(fs.readFileSync(process.argv[2]));
const signs=fs.readFileSync(dir+'/out/qa-firma.txt','utf8').split('\n').filter(l=>l.startsWith('{')).map(l=>JSON.parse(l));
fs.mkdirSync(dir+'/out/qa-safe',{recursive:true});const results=[];
const contains=(b,s)=>b.left>=s.left&&b.top>=s.top&&b.right<=s.right&&b.bottom<=s.bottom;
for(const [index,p] of plan.entries()){
 const {width:w,height:h}=await sharp(path.resolve(dir,p.plate)).metadata();const {data,info}=await sharp(`${dir}/out/${p.id}-overlay.svg`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const b={left:w,top:h,right:0,bottom:0};for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>12){b.left=Math.min(b.left,x);b.right=Math.max(b.right,x+1);b.top=Math.min(b.top,y);b.bottom=Math.max(b.bottom,y+1)}
 const a=p.safeArea;const safe={left:a.x0*w,top:a.y0*h,right:a.x1*w,bottom:a.y1*h};const sign=signs[index];const [W,H]=p.final;
 const outputSafe={left:Math.ceil(a.x0*W),top:Math.ceil(a.y0*H),right:Math.floor(a.x1*W),bottom:Math.floor(a.y1*H)};
 const pass=contains(b,safe)&&contains(sign.signatureBounds,outputSafe)&&sign.signatureContrast>=4.5;
 results.push({id:p.id,profile:a.profile,graphicBoundsNative:b,safeNative:safe,signatureBoundsExport:sign.signatureBounds,safeExport:outputSafe,signatureContrast:sign.signatureContrast,pass,preview:'local exclusion mask; not a live app screenshot'});
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g fill="#ff3344" fill-opacity=".40"><rect width="${W}" height="${outputSafe.top}"/><rect y="${outputSafe.bottom}" width="${W}" height="${H-outputSafe.bottom}"/><rect y="${outputSafe.top}" width="${outputSafe.left}" height="${outputSafe.bottom-outputSafe.top}"/><rect x="${outputSafe.right}" y="${outputSafe.top}" width="${W-outputSafe.right}" height="${outputSafe.bottom-outputSafe.top}"/></g><rect x="${outputSafe.left}" y="${outputSafe.top}" width="${outputSafe.right-outputSafe.left}" height="${outputSafe.bottom-outputSafe.top}" fill="none" stroke="#00ffff" stroke-width="3"/></svg>`;
 await sharp(await sharp(dir+'/out/'+p.id+'.png').composite([{input:Buffer.from(svg)}]).png().toBuffer()).resize({width:390}).png().toFile(dir+'/out/qa-safe/'+p.id+'.png');
}
fs.writeFileSync(dir+'/out/safe-zones.json',JSON.stringify({method:'Bounds of all visible graphic pixels including cursor and descriptor plus official signature box. Thresholds evaluated before rounding. Editorial profiles are explicit and are not official universal UI templates.',results},null,2)+'\n');
console.log(results.map(r=>({id:r.id,pass:r.pass})));if(results.some(r=>!r.pass))process.exitCode=1;
const items=plan.filter(p=>p.id.endsWith('916'));const layers=await Promise.all(items.map(async(p,i)=>({input:await sharp(dir+'/out/qa-safe/'+p.id+'.png').toBuffer(),left:16+i%2*406,top:16+Math.floor(i/2)*709})));
await sharp({create:{width:828,height:1434,channels:3,background:'#ddd'}}).composite(layers).png().toFile(dir+'/out/contacto-916-safe.png');
