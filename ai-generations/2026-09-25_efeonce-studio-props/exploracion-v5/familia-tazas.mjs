// Familia de marcas · texturas de taza (mismo modelo/UV). Efeonce + Globe/Wave/Reach con la gramática de la esfera.
import sharp from 'sharp';import {writeFile,readFile,mkdir} from 'node:fs/promises';import {join} from 'node:path';
import {dir,svg,rect,text,width,logo,LOGO_RATIO,MUG,mmx,zy,U} from './lib.mjs';
const TRK=-0.035,SPH=0.2,B={family:'brico',wght:760,tracking:TRK};
const GAP={r:-0.02,a:0.03,e:0.035,o:0.035};
const dom=(t,cx,z,wmm,ink,sph)=>{const g=GAP[t.slice(-1)]??0.03,unit=width(t,100,B)+(TRK+g+SPH)*100,size=mmx(wmm)/unit*100,w=width(t,size,B),total=w+(TRK+g+SPH)*size,x=cx-total/2,d=SPH*size,sx=x+w+(TRK+g)*size;
 return text(t,x,zy(z),size,ink,B)+'<circle cx="'+(sx+d/2)+'" cy="'+(zy(z)-d/2)+'" r="'+(d/2)+'" fill="'+sph+'"/>';};
const lk=async(f)=>'data:image/png;base64,'+(await readFile('/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/fb3bbb61-67a5-42ed-baee-4eae67dc34fd/scratchpad/canvas/assets/lk-'+f+'.png')).toString('base64');
const lockup=async(f,ratio,wmm=40,z=18)=>{const w=mmx(wmm),h=w*ratio;return '<image href="'+(await lk(f))+'" x="'+(U(.75)-w/2)+'" y="'+(zy(z)-h/2)+'" width="'+w+'" height="'+h+'"/>';};
const faces=[
 {id:'f-efeonce',base:'#F7F8F6',interior:'#023C70',art:async()=>rect(0,0,MUG.W,MUG.H,'#F7F8F6')+dom('Hacer',U(.25),39,66,'#023C70','#0E8C82')+logo(U(.75)-mmx(34)/2,zy(18)-mmx(34)*LOGO_RATIO/2,mmx(34),false)},
 {id:'f-globe',base:'#091951',interior:'#FF6500',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+dom('Crear',U(.25),39,62,'#FFFFFF','#FF6500')+await lockup('globe-blanco',591/1200,34,20)},
 {id:'f-wave',base:'#091951',interior:'#0375DB',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+dom('Aparecer',U(.25),39,70,'#FFFFFF','#0375DB')+await lockup('wave-blanco',494/1200,36,19)},
 {id:'f-reach',base:'#091951',interior:'#F83902',art:async()=>rect(0,0,MUG.W,MUG.H,'#091951')+dom('Llegar',U(.25),39,62,'#FFFFFF','#F83902')+await lockup('reach-blanco',374/1200,40,18)},
 {id:'f-wave-color',base:'#0375DB',interior:'#082E8E',art:async()=>rect(0,0,MUG.W,MUG.H,'#0375DB')+dom('Aparecer',U(.25),39,70,'#FFFFFF','#FFFFFF')+await lockup('wave-blanco',494/1200,36,19)},
 {id:'f-reach-color',base:'#F83902',interior:'#FF6F00',art:async()=>rect(0,0,MUG.W,MUG.H,'#F83902')+dom('Llegar',U(.25),39,62,'#FFFFFF','#FFFFFF')+await lockup('reach-blanco',374/1200,40,18)},
 {id:'f-globe-color',base:'#BB1954',interior:'#FF6500',art:async()=>rect(0,0,MUG.W,MUG.H,'#BB1954')+dom('Crear',U(.25),39,62,'#FFFFFF','#FFFFFF')+await lockup('globe-blanco',591/1200,34,20)},
];
await mkdir(join(dir,'texturas'),{recursive:true});
for(const f of faces){const s=svg(MUG.W,MUG.H,await f.art());await writeFile(join(dir,'texturas',f.id+'.svg'),s);await sharp(Buffer.from(s)).png().toFile(join(dir,'texturas',f.id+'.png'));}
await writeFile(join(dir,'rutas-familia.json'),JSON.stringify(faces.map(f=>({id:f.id,base:f.base,interior:f.interior})),null,2));console.log('ok');
