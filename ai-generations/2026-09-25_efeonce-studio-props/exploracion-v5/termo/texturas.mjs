// Texturas del vaso térmico: circunferencia media 2π·36 mm ≈ 226 mm, zona imprimible 150 mm. U=.25 frente, U=.75 reverso.
import sharp from 'sharp';import {writeFile,readFile,mkdir} from 'node:fs/promises';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {svg,rect,text,width,logo,LOGO_RATIO} from '../lib.mjs';
const dir=dirname(fileURLToPath(import.meta.url));const W=4096,CIRC=2*Math.PI*36,HMM=150,H=Math.round(W*HMM/CIRC);const mmx=mm=>mm*W/CIRC,zy=z=>H*(1-z/HMM),U=u=>u*W;
const B={family:'brico',wght:760,tracking:-0.035},GAP={r:-0.02,a:0.03,e:0.035,o:0.035};
const dom=(t,cx,z,wmm,ink,sph)=>{const g=GAP[t.slice(-1)]??0.03,unit=width(t,100,B)+(-0.035+g+0.2)*100,size=mmx(wmm)/unit*100,w=width(t,size,B),total=w+(-0.035+g+0.2)*size,x=cx-total/2,d=.2*size,sx=x+w+(-0.035+g)*size;
 return text(t,x,zy(z),size,ink,B)+`<circle cx="${sx+d/2}" cy="${zy(z)-d/2}" r="${d/2}" fill="${sph}"/>`;};
const pt=(cx,cy,r,a)=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];
const orbita=(ring,op,acc,cx=U(.25),z=80,dmm=64)=>{const cy=zy(z),r=mmx(dmm/2),[x0,y0]=pt(cx,cy,r,200),[x1,y1]=pt(cx,cy,r,250);return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-opacity="${op}" stroke-width="${mmx(.5)}"/><path d="M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${acc}" stroke-width="${mmx(1.2)}" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="${mmx(2.2)}" fill="${acc}"/>`;};
const lk=async f=>'data:image/png;base64,'+(await readFile('/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/fb3bbb61-67a5-42ed-baee-4eae67dc34fd/scratchpad/canvas/assets/lk-'+f+'.png')).toString('base64');
const img=async(f,ratio,cx,z,wmm)=>{const w=mmx(wmm),h=w*ratio;return `<image href="${await lk(f)}" x="${cx-w/2}" y="${zy(z)-h/2}" width="${w}" height="${h}"/>`;};
const T=[
 {id:'termo-navy',tapa:'#1B1F24',base:'#001A33',art:async()=>rect(0,0,W,H,'#001A33')+orbita('#72DED8',.35,'#36C8BF')+dom('Hacer',U(.25),76,44,'#FFFFFF','#36C8BF')+await img('efeonce-logo-negative',282/1200,U(.75),22,30)},
 {id:'termo-blanco',tapa:'#E9ECEE',base:'#F4F5F2',art:async()=>rect(0,0,W,H,'#F4F5F2')+orbita('#023C70',.22,'#0E8C82')+dom('Medir',U(.25),76,42,'#023C70','#0E8C82')+logo(U(.75)-mmx(30)/2,zy(22)-mmx(30)*LOGO_RATIO/2,mmx(30),false)},
 {id:'termo-globe',tapa:'#1B1F24',base:'#091951',art:async()=>rect(0,0,W,H,'#091951')+orbita('#FFFFFF',.25,'#FF6500')+dom('Crear',U(.25),76,42,'#FFFFFF','#FF6500')+await img('globe-blanco',591/1200,U(.75),24,28)}];
await mkdir(join(dir,'texturas'),{recursive:true});
for(const t of T){const s=svg(W,H,await t.art());await sharp(Buffer.from(s)).png().toFile(join(dir,'texturas',t.id+'.png'));}
await writeFile(join(dir,'rutas-termo.json'),JSON.stringify(T.map(t=>({id:t.id,tapa:t.tapa})),null,1));console.log('ok',W,H);
