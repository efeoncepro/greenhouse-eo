// Cierre de marca con la órbita (O-01/O-02). Render determinístico cuadro a cuadro → mp4 (H.264) + gif de muestra.
// Guion (4,5 s a 30 fps): anillo aparece (0–0,5) · arco crece 200°→250° con ease-out (0,4–1,4) · la esfera viaja en la punta
// y asienta con un rebote corto (1,4–1,7) · el halo sube (1,2–2,0) · logo (1,9–2,5) · eslogan (2,5–3,0) · pausa.
import {chromium} from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs';import {readFileSync,mkdirSync,rmSync} from 'node:fs';import {execSync} from 'node:child_process';
const DIR=new URL('./',import.meta.url).pathname,FPS=30,DUR=4.5;
const logo='data:image/png;base64,'+readFileSync('/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/fb3bbb61-67a5-42ed-baee-4eae67dc34fd/scratchpad/canvas/assets/lk-efeonce-logo-negative.png').toString('base64');
const fonts='<link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">';
for(const [name,W,H] of [['cierre-16x9',1920,1080],['cierre-1x1',1080,1080]]){
 const r=Math.round(Math.min(W,H)*.3),cx=W/2,cy=H/2-H*.04,k=W/794*.9,lw=Math.round(Math.min(W,H)*.22);
 const html=`<!doctype html><html><head><meta charset="utf-8">${fonts}<style>body{margin:0;background:#001A33}</style></head><body><svg id="s" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position:absolute;left:0;top:0">
<defs><radialGradient id="h" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r*1.86}"><stop id="h0" offset="0" stop-color="#36C8BF" stop-opacity="0"/><stop id="h1" offset=".6" stop-color="#36C8BF" stop-opacity="0"/><stop offset="1" stop-color="#36C8BF" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#h)"/><circle id="ring" cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#72DED8" stroke-opacity="0" stroke-width="${Math.max(1.5,k)}"/>
<path id="arc" fill="none" stroke="#36C8BF" stroke-width="${2*k}" stroke-linecap="round"/><circle id="dot" r="0" fill="#36C8BF"/></svg>
<img id="logo" src="${logo}" style="position:absolute;left:${cx-lw/2}px;top:${cy-lw*282/1200/2}px;width:${lw}px;opacity:0">
<div id="sl" style="position:absolute;left:0;width:${W}px;top:${cy+r*.28}px;text-align:center;font-family:Poppins;font-size:${Math.round(Math.min(W,H)*.026)}px;color:#E2E2E2;opacity:0;white-space:nowrap"><span style="font-weight:800;font-style:italic">Empower</span> <span style="font-weight:800">your</span> <span style="font-weight:900;font-style:italic;color:#fff">Growth</span></div></body></html>`;
 const b=await chromium.launch();const pg=await b.newPage({viewport:{width:W,height:H}});await pg.setContent(html,{waitUntil:'networkidle'});await pg.evaluate(()=>document.fonts.ready);
 const fr=DIR+'frames-'+name+'/';rmSync(fr,{recursive:true,force:true});mkdirSync(fr);
 for(let i=0;i<Math.round(DUR*FPS);i++){const t=i/FPS;
  await pg.evaluate(({t,cx,cy,r,k})=>{const cl=(x)=>Math.max(0,Math.min(1,x)),seg=(a,b)=>cl((t-a)/(b-a)),out=x=>1-Math.pow(1-x,3),io=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2;
   document.getElementById('ring').setAttribute('stroke-opacity',(.18*out(seg(0,.5))).toFixed(3));
   const p=out(seg(.4,1.4)),a0=200,a1=200+50*p,P=a=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)],[x0,y0]=P(a0),[x1,y1]=P(a1);
   document.getElementById('arc').setAttribute('d',p>0.002?`M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`:'');
   const land=seg(1.4,1.7),bounce=land>0&&land<1?1+.35*Math.sin(land*Math.PI):1,d=document.getElementById('dot');d.setAttribute('cx',x1);d.setAttribute('cy',y1);d.setAttribute('r',p>0.002?(3.5*k*bounce).toFixed(2):0);
   const h=io(seg(1.2,2.0));document.getElementById('h0').setAttribute('stop-opacity',(.13*h).toFixed(3));document.getElementById('h1').setAttribute('stop-opacity',(.03*h).toFixed(3));
   const lg=out(seg(1.9,2.5)),L=document.getElementById('logo');L.style.opacity=lg;L.style.transform=`translateY(${(1-lg)*12}px)`;
   const s=out(seg(2.5,3.0)),S=document.getElementById('sl');S.style.opacity=s;S.style.transform=`translateY(${(1-s)*10}px)`;},{t,cx,cy,r,k});
  await pg.screenshot({path:fr+String(i).padStart(4,'0')+'.png'});}
 await b.close();
 execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${fr}%04d.png" -c:v libx264 -pix_fmt yuv420p -crf 16 -movflags +faststart "${DIR}${name}.mp4"`);
 execSync(`ffmpeg -y -loglevel error -framerate ${FPS} -i "${fr}%04d.png" -vf "fps=15,scale=${Math.round(W/3)}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" "${DIR}${name}.gif"`);
 execSync(`cp "${fr}0134.png" "${DIR}${name}-final.png"`);rmSync(fr,{recursive:true,force:true});console.log(name,'ok');}
