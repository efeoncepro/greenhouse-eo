// Arma los PNG @2x de la firma: foto en círculo (sin punto: se leería como estado «disponible»), y logos con halo blanco
// (invisible sobre blanco, mantiene el logo legible cuando el cliente de correo pasa a modo oscuro).
import {createRequire} from 'node:module';const require=createRequire('/Users/jreye/Documents/greenhouse-eo/package.json');const sharp=require('sharp');
const CV=process.argv[2],OUT=new URL('./assets/',import.meta.url).pathname;
const foto=async(src,dst,acento='#12AFA2')=>{const S=184,D=184,cx=92,cy=92,r=D/2,d=19,g=6,ang=-Math.PI/4;
 const face=await sharp(src).resize(D,D,{fit:'cover',position:'top'}).toBuffer();
 const mask=Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${r}" cy="${r}" r="${r}"/></svg>`);
 const circ=await sharp(face).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
 const lx=cx+(r+g+d/2)*Math.cos(ang),ly=cy+(r+g+d/2)*Math.sin(ang);
 const lamp=Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${lx}" cy="${ly}" r="${d/2}" fill="${acento}"/></svg>`);
 await sharp({create:{width:S,height:S,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:circ,left:cx-r,top:cy-r}]).png().toFile(OUT+dst);};
const logo=async(src,dst,w)=>{const W=w*2;const base=await sharp(src).resize(W).png().toBuffer();const m=await sharp(base).metadata();const P=4;
 const white=await sharp(base).ensureAlpha().extractChannel(3).toColourspace('b-w').toBuffer().then(a=>sharp({create:{width:m.width,height:m.height,channels:3,background:'#fff'}}).joinChannel(a).png().toBuffer());
 const halo=[];for(let dx=-3;dx<=3;dx++)for(let dy=-3;dy<=3;dy++)if(dx*dx+dy*dy<=9)halo.push({input:white,left:P+dx,top:P+dy});
 await sharp({create:{width:m.width+2*P,height:m.height+2*P,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([...halo,{input:base,left:P,top:P}]).png().toFile(OUT+dst);return [(m.width+2*P)/2,(m.height+2*P)/2];};
console.log('efeonce',await logo(CV+'/lk-efeonce-logo-full.png','logo-efeonce.png',112));
console.log('globe',await logo(CV+'/lk-globe-full.png','logo-globe.png',64));
console.log('wave',await logo(CV+'/lk-wave-full.png','logo-wave.png',76));
console.log('reach',await logo(CV+'/lk-reach-full.png','logo-reach.png',84));
await foto('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png','foto-julio-reyes.png');
// Foto con órbita (opciones A y B): 104 px de caja (@2x = 208). Anillo fino, arco y esfera en la punta; la foto adentro.
const fotoOrbita=async(src,dst,{ring,ringOp,accent})=>{const S=208,cx=104,cy=104,R=96,D=156,a0=200,a1=250,P=a=>[cx+R*Math.cos(a*Math.PI/180),cy+R*Math.sin(a*Math.PI/180)];
 const face=await sharp(src).resize(D,D,{fit:'cover',position:'top'}).toBuffer();const mask=Buffer.from(`<svg width="${D}" height="${D}"><circle cx="${D/2}" cy="${D/2}" r="${D/2}"/></svg>`);
 const circ=await sharp(face).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();const[x0,y0]=P(a0),[x1,y1]=P(a1);
 const orb=Buffer.from(`<svg width="${S}" height="${S}"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${ring}" stroke-opacity="${ringOp}" stroke-width="2"/><path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="7" fill="${accent}"/></svg>`);
 await sharp({create:{width:S,height:S,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input:circ,left:cx-D/2,top:cy-D/2},{input:orb}]).png().toFile(OUT+dst);};
await fotoOrbita('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png','foto-orbita-julio-reyes.png',{ring:'#023C70',ringOp:.22,accent:'#0E8C82'});
await fotoOrbita('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-20_identidad-julio-nexa/refs-aprobadas/julio-ap-04.png','foto-orbita-oscura-julio-reyes.png',{ring:'#72DED8',ringOp:.4,accent:'#36C8BF'});
const neg=await sharp(CV+'/lk-efeonce-logo-negative.png').resize(232).png().toBuffer();await sharp(neg).toFile(OUT+'logo-efeonce-negativo.png');console.log('orbita ok',(await sharp(neg).metadata()).height/2);
