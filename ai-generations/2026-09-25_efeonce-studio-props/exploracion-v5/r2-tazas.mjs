// Ronda 2 · texturas de taza del sistema «La esfera» (mismo modelo/UV que tazas-renders-v1).
import sharp from 'sharp';import {writeFile,mkdir} from 'node:fs/promises';import {join} from 'node:path';
import {dir,svg,rect,text,width,layout,logo,LOGO_RATIO,MUG,mmx,zy,U} from './lib.mjs';
const N='#023C70',T='#12AFA2',W='#FFFFFF',PAPER='#F7F8F6',TRK=-0.035,SPH=0.2;
const B={family:'brico',wght:760,tracking:TRK};
const mugLogo=(neg,w=34,z=18)=>logo(U(.75)-mmx(w)/2,zy(z)-mmx(w)*LOGO_RATIO/2,mmx(w),neg);
// Dominante + esfera: la esfera sigue al último glifo con el espaciado óptico de la ronda 2.
function dom(t,x,z,size,ink,gap){const w=width(t,size,B);const d=SPH*size,sx=x+w+(TRK+gap)*size;return text(t,x,zy(z),size,ink,B)+`<circle cx="${sx+d/2}" cy="${zy(z)-d/2}" r="${d/2}" fill="${T}"/>`;}
const domW=(t,size,gap)=>width(t,size,B)+(TRK+gap+SPH)*size;
const faces=[
 {id:'r2-blanco',base:PAPER,interior:N,art(){const size=mmx(66)/domW('Hacer',100,-0.02)*100,w=domW('Hacer',size,-0.02);return rect(0,0,MUG.W,MUG.H,PAPER)+dom('Hacer',U(.25)-w/2,39,size,N,-0.02)+mugLogo(false);}},
 {id:'r2-navy',base:N,interior:PAPER,art(){const size=mmx(60)/domW('Vamos',100,0.03)*100,w=domW('Vamos',size,0.03),x=U(.25)-w/2,qs=mmx(6.4),r=qs*.31;
  return rect(0,0,MUG.W,MUG.H,N)+`<circle cx="${x+r+qs*.02}" cy="${zy(60)-qs*.3}" r="${r-qs*.05}" fill="none" stroke="${T}" stroke-width="${qs*.1}"/>`+text('¿Otra vuelta?',x+qs*.62+qs*.42,zy(60),qs,'#CFE4FA',{family:'poppins',weight:'Light'})+dom('Vamos',x,36,size,W,0.03)+mugLogo(true);}},
];
await mkdir(join(dir,'texturas'),{recursive:true});
for(const f of faces){const s=svg(MUG.W,MUG.H,f.art());await writeFile(join(dir,'texturas',f.id+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(join(dir,'texturas',f.id+'.png'));}
await writeFile(join(dir,'rutas-r2.json'),JSON.stringify(faces.map(f=>({id:f.id,base:f.base,interior:f.interior})),null,2));
console.log('ok');
