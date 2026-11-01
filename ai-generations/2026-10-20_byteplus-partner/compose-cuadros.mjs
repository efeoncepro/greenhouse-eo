import sharp from 'sharp'; import fs from 'node:fs';
const [,,D,BG,key,NW,NH,OUT]=process.argv;
const spec=JSON.parse(fs.readFileSync(D+'/capas-cuadros.json'))[key]; const W=+NW,H=+NH,sc=W/spec.W;
const st={far:{blur:2.5,bright:0.55,sat:0.45,op:0.6},mid:{blur:0.5,bright:0.97,sat:1,op:1},near:{blur:10,bright:0.9,sat:1,op:0.95}};
const comps=[];
for(const [n,layer,x,y,w0,rot] of spec.frames){const s=st[layer]; const w=Math.round(w0*sc); const h=Math.round(w*856/2048); const r=Math.round(6*sc);
 const mask=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}" fill="#fff"/></svg>`);
 let b=await sharp(D+'/cine/'+n+'.png').resize(w,h).modulate({brightness:s.bright,saturation:s.sat}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 const pad=Math.round(90*sc);
 b=await sharp(b).extend({top:pad,bottom:pad,left:pad,right:pad,background:{r:0,g:0,b:0,alpha:0}}).rotate(rot,{background:{r:0,g:0,b:0,alpha:0}}).blur(Math.max(0.3,s.blur*sc)).png().toBuffer();
 const R=await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true}); for(let i=3;i<R.data.length;i+=4)R.data[i]=Math.round(R.data[i]*s.op);
 b=await sharp(R.data,{raw:R.info}).png().toBuffer(); const m=await sharp(b).metadata();
 let L=Math.round(x*sc+w/2-m.width/2), T=Math.round(y*sc+h/2-m.height/2);
 const l0=Math.max(0,-L),t0=Math.max(0,-T); const ww=Math.min(m.width-l0,W-Math.max(L,0)), hh=Math.min(m.height-t0,H-Math.max(T,0)); if(ww<=0||hh<=0)continue;
 b=await sharp(b).extract({left:l0,top:t0,width:ww,height:hh}).toBuffer(); comps.push({input:b,left:Math.max(L,0),top:Math.max(T,0)});}
await sharp(await sharp(BG).resize(W,H).toBuffer()).composite(comps).png().toFile(OUT); console.log('ok',OUT);
