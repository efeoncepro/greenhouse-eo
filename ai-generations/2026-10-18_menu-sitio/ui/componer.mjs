// Pone una UI renderizada sobre la pantalla blanca de una foto: componente blanco mayor → esquinas por rectas → homografía → sólo sobre la pantalla.
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const require=createRequire('/Users/jreye/Documents/greenhouse-eo/package.json'); const sharp=require('sharp');
const [base,ui,out]=process.argv.slice(2);
const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
const W=info.width,H=info.height,C=info.channels;
const ok=(x,y)=>{const i=(y*W+x)*C,r=data[i],g=data[i+1],b=data[i+2];return Math.min(r,g,b)>200&&Math.max(r,g,b)-Math.min(r,g,b)<40;};
// componente blanco más grande
const lab=new Int32Array(W*H); let best=null,id=0;
for(let y=0;y<H;y+=2)for(let x=0;x<W;x+=2){if(lab[y*W+x]||!ok(x,y))continue;id++;const st=[[x,y]],pts=[];while(st.length){const [a,b]=st.pop();if(a<0||b<0||a>=W||b>=H)continue;const k=b*W+a;if(lab[k]||!ok(a,b))continue;lab[k]=id;pts.push([a,b]);st.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]);}if(!best||pts.length>best.length)best=pts;}
const pts=best;const bb=pts.reduce((a,[x,y])=>[Math.min(a[0],x),Math.min(a[1],y),Math.max(a[2],x),Math.max(a[3],y)],[1e9,1e9,-1,-1]);
const rows=new Map(),cols=new Map();for(const [x,y] of pts){const r=rows.get(y)||[1e9,-1];rows.set(y,[Math.min(r[0],x),Math.max(r[1],x)]);const c=cols.get(x)||[1e9,-1];cols.set(x,[Math.min(c[0],y),Math.max(c[1],y)]);}
const fit=(p)=>{const n=p.length,sx=p.reduce((a,q)=>a+q[0],0),sy=p.reduce((a,q)=>a+q[1],0),sxx=p.reduce((a,q)=>a+q[0]*q[0],0),sxy=p.reduce((a,q)=>a+q[0]*q[1],0);const m=(n*sxy-sx*sy)/(n*sxx-sx*sx||1);return [m,(sy-m*sx)/n];};
const hb=bb[3]-bb[1],wb=bb[2]-bb[0];const mid=(map,lo,hi,k)=>[...map].filter(([t])=>t>lo&&t<hi).map(([t,v])=>[t,v[k]]);
const Lf=fit(mid(rows,bb[1]+hb*.2,bb[3]-hb*.2,0)),Rf=fit(mid(rows,bb[1]+hb*.2,bb[3]-hb*.2,1)),Tf=fit(mid(cols,bb[0]+wb*.2,bb[2]-wb*.2,0)),Bf=fit(mid(cols,bb[0]+wb*.2,bb[2]-wb*.2,1));
const meet=([ma,ba],[mb,b2])=>{const y=(mb*ba+b2)/(1-mb*ma);return [ma*y+ba,y];};
let q=[meet(Lf,Tf),meet(Rf,Tf),meet(Rf,Bf),meet(Lf,Bf)];
// pantalla girada: esquinas por puntos extremos en las diagonales
if(process.env.EXTREMOS){const by=(fn)=>pts.reduce((a,p)=>fn(p)>fn(a)?p:a);q=[by(p=>-(p[0]+p[1])),by(p=>p[0]-p[1]),by(p=>p[0]+p[1]),by(p=>p[1]-p[0])];}const cx=q.reduce((a,p)=>a+p[0],0)/4,cy=q.reduce((a,p)=>a+p[1],0)/4;q=q.map(([x,y])=>[x+(x-cx)*(process.env.EXTREMOS?.075:.01),y+(y-cy)*(process.env.EXTREMOS?.075:.01)]);
const um=await sharp(ui).metadata();const w=um.width,h=um.height;
const src=[[0,0],[w,0],[w,h],[0,h]],M=[];src.forEach(([x,y],i)=>{const [u,v]=q[i];M.push([x,y,1,0,0,0,-u*x,-u*y,u]);M.push([0,0,0,x,y,1,-v*x,-v*y,v]);});
for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];for(let r=0;r<8;r++)if(r!==c){const f=M[r][c]/M[c][c];for(let k=c;k<=8;k++)M[r][k]-=f*M[c][k];}}
const [a,b,c,d,e,f,g,hh]=M.map((r,i)=>r[8]/r[i]);
const html=out.replace(/\.png$/,'.html');
fs.writeFileSync(html,`<!doctype html><html><body style="margin:0;background:#000"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden"><img src="file://${base}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px"><img src="file://${ui}" style="position:absolute;left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;transform:matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)"></div></body></html>`);
const shot=fs.readFileSync('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs','utf8').replace('{width:1920,height:1080}',`{width:${W},height:${H}}`);fs.writeFileSync('/tmp/shot-comp.cjs',shot);
const tmp=out.replace(/\.png$/,'-raw.png');execFileSync('node',['/tmp/shot-comp.cjs',html,tmp]);
// máscara: la pantalla blanca dilatada y suavizada (respeta dedos y marco)
const m=Buffer.alloc(W*H);for(let p=0,i=0;p<m.length;p++,i+=C){const r=data[i],g2=data[i+1],bl=data[i+2];m[p]=(Math.min(r,g2,bl)>165&&Math.max(r,g2,bl)-Math.min(r,g2,bl)<50)?255:0;}
const mask=await sharp(m,{raw:{width:W,height:H,channels:1}}).blur(0.9).png().toBuffer();
// acabado: la pantalla toma un leve desenfoque óptico y un brillo diagonal tenue
const comp=await sharp(tmp).removeAlpha().blur(0.5).modulate({brightness:0.97}).png().toBuffer();
await sharp(base).composite([{input:await sharp(comp).joinChannel(mask).png().toBuffer()}]).png().toFile(out);
console.log(out,JSON.stringify(q.map(p=>p.map(Math.round))));
