// Tazas con la órbita (O-01): mismo modelo/UV que familia-tazas.mjs. En cerámica no hay halo: sólo anillo, arco y esfera.
import sharp from 'sharp';import {writeFile,readFile} from 'node:fs/promises';import {join} from 'node:path';
import {dir,svg,rect,text,width,logo,LOGO_RATIO,MUG,mmx,zy,U} from './lib.mjs';
const TRK=-0.035,SPH=0.2,B={family:'brico',wght:760,tracking:TRK};const GAP={r:-0.02,a:0.03,e:0.035,o:0.035};
const dom=(t,cx,z,wmm,ink,sph)=>{const g=GAP[t.slice(-1)]??0.03,unit=width(t,100,B)+(TRK+g+SPH)*100,size=mmx(wmm)/unit*100,w=width(t,size,B),total=w+(TRK+g+SPH)*size,x=cx-total/2,d=SPH*size,sx=x+w+(TRK+g)*size;
 return text(t,x,zy(z),size,ink,B)+'<circle cx="'+(sx+d/2)+'" cy="'+(zy(z)-d/2)+'" r="'+(d/2)+'" fill="'+sph+'"/>';};
const pt=(cx,cy,r,a)=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];
// Órbita en mm sobre la cara frontal (U=.25). Anillo 0,5 mm · arco 1,2 mm · esfera r 2,2 mm.
const orbitMug=({cx=U(.25),z=49,dmm=74,ring,ringOp,accent,a0=200,a1=250})=>{const cy=zy(z),r=mmx(dmm/2),[x0,y0]=pt(cx,cy,r,a0),[x1,y1]=pt(cx,cy,r,a1);
 return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-opacity="${ringOp}" stroke-width="${mmx(.5)}"/><path d="M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${accent}" stroke-width="${mmx(1.2)}" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="${mmx(2.2)}" fill="${accent}"/>`;};
const lk=async(f)=>'data:image/png;base64,'+(await readFile('/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/fb3bbb61-67a5-42ed-baee-4eae67dc34fd/scratchpad/canvas/assets/lk-'+f+'.png')).toString('base64');
const img=async(f,ratio,cx,z,wmm)=>{const w=mmx(wmm),h=w*ratio;return '<image href="'+(await lk(f))+'" x="'+(cx-w/2)+'" y="'+(zy(z)-h/2)+'" width="'+w+'" height="'+h+'"/>';};
const faces=[
 {id:'o-efeonce-blanca',base:'#F7F8F6',interior:'#001A33',art:async()=>rect(0,0,MUG.W,MUG.H,'#F7F8F6')+orbitMug({ring:'#023C70',ringOp:.22,accent:'#0E8C82'})+dom('Hacer',U(.25),44,48,'#023C70','#0E8C82')+logo(U(.75)-mmx(30)/2,zy(18)-mmx(30)*LOGO_RATIO/2,mmx(30),false)},
 {id:'o-efeonce-navy',base:'#001A33',interior:'#36C8BF',art:async()=>rect(0,0,MUG.W,MUG.H,'#001A33')+orbitMug({ring:'#72DED8',ringOp:.35,accent:'#36C8BF'})+await img('efeonce-logo-negative',282/1200,U(.25),49,42)},
 {id:'o-globe',base:'#091951',interior:'#FF6500',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+orbitMug({ring:'#FFFFFF',ringOp:.25,accent:'#FF6500'})+await img('globe-blanco',591/1200,U(.25),49,34)},
 {id:'o-efeonce-navy-palabra',base:'#001A33',interior:'#36C8BF',art:async()=>rect(0,0,MUG.W,MUG.H,'#001A33')+orbitMug({ring:'#72DED8',ringOp:.35,accent:'#36C8BF'})+dom('Hacer',U(.25),44,48,'#FFFFFF','#36C8BF')+await img('efeonce-logo-negative',282/1200,U(.75),18,30)},
 {id:'o-globe-palabra',base:'#091951',interior:'#FF6500',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+orbitMug({ring:'#FFFFFF',ringOp:.25,accent:'#FF6500'})+dom('Crear',U(.25),44,46,'#FFFFFF','#FF6500')+await img('globe-blanco',591/1200,U(.75),20,30)},
 {id:'o-wave-palabra',base:'#091951',interior:'#0375DB',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+orbitMug({ring:'#FFFFFF',ringOp:.25,accent:'#0375DB'})+dom('Aparecer',U(.25),44,56,'#FFFFFF','#0375DB')+await img('wave-blanco',494/1200,U(.75),19,32)},
 {id:'o-reach-palabra',base:'#091951',interior:'#F83902',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+orbitMug({ring:'#FFFFFF',ringOp:.25,accent:'#F83902'})+dom('Llegar',U(.25),44,46,'#FFFFFF','#F83902')+await img('reach-blanco',374/1200,U(.75),18,36)},
];
for(const f of faces){const s=svg(MUG.W,MUG.H,await f.art());await writeFile(join(dir,'texturas',f.id+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(join(dir,'texturas',f.id+'.png'));}
await writeFile(join(dir,'rutas-orbita2.json'),JSON.stringify(faces.filter(f=>['o-wave-palabra','o-reach-palabra'].includes(f.id)).map(f=>({id:f.id,base:f.base,interior:f.interior})),null,2));await writeFile(join(dir,'rutas-orbita.json'),JSON.stringify(faces.map(f=>({id:f.id,base:f.base,interior:f.interior})),null,2));console.log('ok');
