// Varios paneles de luz blancos en una escena: cada uno recibe una pieza de UI renderizada (de arriba hacia abajo),
// con perspectiva por homografía, sólo sobre los píxeles del panel, y un halo suave de vidrio iluminado.
// Uso: node componer-paneles.mjs <base.png> <salida.png> <ui-arriba.png> <ui-medio.png> <ui-abajo.png> ...
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const require=createRequire('/Users/jreye/Documents/greenhouse-eo/package.json'); const sharp=require('sharp');
const [base,out,...uis]=process.argv.slice(2);
const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
const W=info.width,H=info.height,C=info.channels;
const ok=(x,y)=>{const i=(y*W+x)*C,r=data[i],g=data[i+1],b=data[i+2];return Math.min(r,g,b)>205&&Math.max(r,g,b)-Math.min(r,g,b)<38;};
const lab=new Int32Array(W*H);const comps=[];let id=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){if(lab[y*W+x]||!ok(x,y))continue;id++;const st=[[x,y]],pts=[];while(st.length){const [a,b]=st.pop();if(a<0||b<0||a>=W||b>=H)continue;const k=b*W+a;if(lab[k]||!ok(a,b))continue;lab[k]=id;pts.push([a,b]);st.push([a+1,b],[a-1,b],[a,b+1],[a,b-1]);}if(pts.length>W*H*0.004)comps.push({id,pts});}
comps.sort((a,b)=>a.pts.reduce((s,p)=>s+p[1],0)/a.pts.length-b.pts.reduce((s,p)=>s+p[1],0)/b.pts.length);
const fit=(p)=>{const n=p.length,sx=p.reduce((a,q)=>a+q[0],0),sy=p.reduce((a,q)=>a+q[1],0),sxx=p.reduce((a,q)=>a+q[0]*q[0],0),sxy=p.reduce((a,q)=>a+q[0]*q[1],0);const m=(n*sxy-sx*sy)/(n*sxx-sx*sx||1);return [m,(sy-m*sx)/n];};
const meet=([ma,ba],[mb,b2])=>{const y=(mb*ba+b2)/(1-mb*ma);return [ma*y+ba,y];};
const quadOf=(pts)=>{const bb=pts.reduce((a,[x,y])=>[Math.min(a[0],x),Math.min(a[1],y),Math.max(a[2],x),Math.max(a[3],y)],[1e9,1e9,-1,-1]);
 const rows=new Map(),cols=new Map();for(const [x,y] of pts){const r=rows.get(y)||[1e9,-1];rows.set(y,[Math.min(r[0],x),Math.max(r[1],x)]);const c=cols.get(x)||[1e9,-1];cols.set(x,[Math.min(c[0],y),Math.max(c[1],y)]);}
 const hb=bb[3]-bb[1],wb=bb[2]-bb[0];const mid=(map,lo,hi,k)=>[...map].filter(([t])=>t>lo&&t<hi).map(([t,v])=>[t,v[k]]);
 const L=fit(mid(rows,bb[1]+hb*.25,bb[3]-hb*.25,0)),R=fit(mid(rows,bb[1]+hb*.25,bb[3]-hb*.25,1)),T=fit(mid(cols,bb[0]+wb*.25,bb[2]-wb*.25,0)),B=fit(mid(cols,bb[0]+wb*.25,bb[2]-wb*.25,1));
 let q=[meet(L,T),meet(R,T),meet(R,B),meet(L,B)];
 // paneles inclinados: si las rectas no cierran sobre el panel, esquinas por puntos extremos en las diagonales
 const by=(fn)=>pts.reduce((a,p)=>fn(p)>fn(a)?p:a);const ext=[by(p=>-(p[0]+p[1])),by(p=>p[0]-p[1]),by(p=>p[0]+p[1]),by(p=>p[1]-p[0])];
 const area=(Q)=>Math.abs(Q.reduce((s,p,i)=>{const n=Q[(i+1)%4];return s+p[0]*n[1]-n[0]*p[1];},0))/2;
 if(Math.abs(area(q)-pts.length)>Math.abs(area(ext)-pts.length)) q=ext;const cx=q.reduce((a,p)=>a+p[0],0)/4,cy=q.reduce((a,p)=>a+p[1],0)/4;return q.map(([x,y])=>[x+(x-cx)*.012,y+(y-cy)*.012]);};
const H3=(w,h,q)=>{const src=[[0,0],[w,0],[w,h],[0,h]],M=[];src.forEach(([x,y],i)=>{const [u,v]=q[i];M.push([x,y,1,0,0,0,-u*x,-u*y,u]);M.push([0,0,0,x,y,1,-v*x,-v*y,v]);});
 for(let c=0;c<8;c++){let p=c;for(let r=c+1;r<8;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];for(let r=0;r<8;r++)if(r!==c){const f=M[r][c]/M[c][c];for(let k=c;k<=8;k++)M[r][k]-=f*M[c][k];}}
 const [a,b,c,d,e,f,g,hh]=M.map((r,i)=>r[8]/r[i]);return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;};
console.log('paneles',comps.length);
let layers='';const meta=[];
for(let i=0;i<comps.length&&i<uis.length;i++){const q=quadOf(comps[i].pts);const m=await sharp(uis[i]).metadata();meta.push(q.map(p=>p.map(Math.round)));
 layers+=`<img src="file://${uis[i]}" style="position:absolute;left:0;top:0;width:${m.width}px;height:${m.height}px;transform-origin:0 0;transform:${H3(m.width,m.height,q)}">`;}
const html=out.replace(/\.png$/,'.html');
fs.writeFileSync(html,`<!doctype html><html><body style="margin:0;background:#000"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden"><img src="file://${base}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px">${layers}</div></body></html>`);
const shot=fs.readFileSync('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-29_deck-seo-aeo-documentos/render-src/shot.cjs','utf8').replace('{width:1920,height:1080}',`{width:${W},height:${H}}`);fs.writeFileSync('/tmp/shot-multi.cjs',shot);
const raw=out.replace(/\.png$/,'-raw.png');execFileSync('node',['/tmp/shot-multi.cjs',html,raw]);
const m=Buffer.alloc(W*H);for(let p=0;p<m.length;p++)m[p]=lab[p]&&comps.slice(0,uis.length).some(c=>c.id===lab[p])?255:0;
// máscara a mano (RGBA crudo): sólo donde había panel, con el borde suavizado; respeta lo que lo tape.
const soft=await sharp(m,{raw:{width:W,height:H,channels:1}}).blur(1.0).extractChannel(0).raw().toBuffer();
const rawc=await sharp(raw).removeAlpha().blur(0.4).raw().toBuffer();
const outb=Buffer.alloc(W*H*3);
for(let p=0;p<W*H;p++){const a=Math.min(1,soft[p]/255*1.4);for(let k=0;k<3;k++)outb[p*3+k]=Math.round(rawc[p*3+k]*a+data[p*C+k]*(1-a));}
await sharp(outb,{raw:{width:W,height:H,channels:3}}).png().toFile(out);
fs.writeFileSync(out.replace(/\.png$/,'.json'),JSON.stringify(meta));console.log(out,JSON.stringify(meta));
