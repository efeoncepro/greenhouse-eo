// Exploración 05 · seis vías nuevas sobre el mismo set: taza (textura para el modelo 3D de tazas-renders-v1),
// agenda A5, tres stickers y muro de oficina. node exploracion-v5/build.mjs
import sharp from 'sharp';import {writeFile,mkdir} from 'node:fs/promises';import {join} from 'node:path';
import {dir,C,svg,rect,text,fit,width,label,logo,LOGO_RATIO,MUG,mmx,zy,U,logoData} from './lib.mjs';

const {navy,blue,white,paper,gray,pale}=C;const WALL='#ECEEEC';
const AW=740,AH=1050;           // agenda A5, 5 px/mm
const WW=2000,WH=1040;          // muro 5 × 2,6 m, 400 px/m
const SW=1500,SH=560;           // pliego de tres stickers
const face=(u,w)=>U(u)-mmx(w)/2;// borde izquierdo de un bloque centrado en la cara u
const mugLogo=(neg,w=34,z=18,u=.75)=>logo(U(u)-mmx(w)/2,zy(z)-mmx(w)*LOGO_RATIO/2,mmx(w),neg);
const agendaLogo=(neg,w=150,y=930)=>logo(AW/2-w/2,y,w,neg);
const floor=`${rect(0,WH-40,WW,40,'#D5D8D5')}`;
const stickerSheet=items=>items.map((s,i)=>`<g transform="translate(${60+i*480} 70)">${s}</g>`).join('');

let clipN=0;const circle=(r,fillc,inner)=>{const id='k'+(++clipN);return `<clipPath id="${id}"><circle cx="${r}" cy="${r}" r="${r}"/></clipPath><g clip-path="url(#${id})"><rect width="${2*r}" height="${2*r}" fill="${fillc}"/>${inner}</g>`;};const clip=(x,y,w,h,inner,rx=0)=>{const id='k'+(++clipN);return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath><g clip-path="url(#${id})">${inner}</g>`;};
const B={family:'brico'},P=(weight='Regular')=>({family:'poppins',weight});

const routes=[
{id:'a-verbos',n:'A',name:'Verbos',idea:'Un verbo, un punto. El objeto dice qué se hace con él.',
 rule:'Infinitivo + punto en Bricolage, tan ancho como la cara del objeto. Nada más en esa cara; el logo vive en la otra, bajo y chico.',
 risk:'Depende del vocabulario: un verbo débil o motivacional («Soñar.») lo vuelve cartel de oficina genérico.',
 mug:{base:blue,interior:paper,art(){const w=76,s=fit('Probar.',mmx(w),B);return rect(0,0,MUG.W,MUG.H,blue)+text('Probar.',face(.25,w),zy(40),s,white,B)+mugLogo(true);}},
 agenda(){const s=fit('Pensar.',AW*1.08,B);return rect(0,0,AW,AH,navy)+text('Pensar.',58,610,s,white,B)+agendaLogo(true);},
 stickers(){const st=(t,bg,ink)=>{const s=fit(t,300,B);return clip(0,0,420,420,rect(0,0,420,420,bg)+text(t,60,250,s,ink,B),60);};
  return stickerSheet([st('Medir.',paper,navy),st('Enseñar.',blue,white),st('Decidir.',navy,white)]);},
 wall(){const s=fit('Hacer.',1420,B);return rect(0,0,WW,WH,WALL)+text('Hacer.',290,690,s,navy,B)+floor;}},

{id:'b-empower',n:'B',name:'Empower your ___',idea:'El sistema verbal que Efeonce ya tiene, llevado a los objetos.',
 rule:'«Empower your» chico en el gris canónico del eslogan; la palabra final grande (Growth · Brand · Voice · Engine) según el objeto o la zona.',
 risk:'En inglés sobre objetos de uso diario en Chile; si la palabra no se vincula con el objeto, es sólo un eslogan repetido.',
 mug:{base:paper,interior:navy,art(){const w=70,s=fit('Engine',mmx(w),B),x=face(.25,w);return rect(0,0,MUG.W,MUG.H,paper)+text('Empower your',x+mmx(1),zy(61),mmx(6.2),gray,P())+text('Engine',x,zy(34),s,navy,B)+mugLogo(false);}},
 agenda(){const s=fit('Brand',600,B);return rect(0,0,AW,AH,paper)+text('Empower your',72,200,34,gray,P())+text('Brand',66,400,s,navy,B)+agendaLogo(false);},
 stickers(){const st=(t,bg,ink,sub)=>{const s=fit(t,280,B);return circle(210,bg,text('Empower your',210,170,24,sub,{...P(),anchor:'middle'})+text(t,210-width(t,s,B)/2,262,s,ink,B));};
  return stickerSheet([st('Growth',navy,white,'#B8C4D0'),st('Voice',paper,navy,gray),st('Brand',blue,white,'#D6E6F7')]);},
 wall(){const s=fit('Growth',1120,B);return rect(0,0,WW,WH,WALL)+text('Empower your',440,330,64,gray,P())+text('Growth',430,640,s,navy,B)+logo(1560,860,260,false)+floor;}},

{id:'c-conversacion',n:'C',name:'Conversación',idea:'Cada objeto es media conversación: una pregunta y la respuesta con raya de diálogo.',
 rule:'Pregunta en Poppins Light, chica. Respuesta en Bricolage con raya (—), la voz del otro. En los soportes de trabajo, la respuesta queda en blanco para escribirla.',
 risk:'Si las frases se vuelven chistes de taza, se cae a merch genérico. Exige curar el vocabulario tanto como en Verbos.',
 mug:{base:navy,interior:blue,art(){const w=66,s=fit('—Vamos.',mmx(w),B),x=face(.25,w);return rect(0,0,MUG.W,MUG.H,navy)+text('¿Otra vuelta?',x+mmx(1.5),zy(62),mmx(7),white,P('Light'))+text('—Vamos.',x,zy(35),s,white,B)+mugLogo(true);}},
 agenda(){let lines='';for(let i=0;i<5;i++)lines+=rect(170,470+i*78,500,2,'#3D6590');
  return rect(0,0,AW,AH,navy)+text('¿Qué aprendimos',72,190,50,white,P('Light'))+text('esta semana?',72,252,50,white,P('Light'))+text('—',64,470,190,blue,B)+lines+agendaLogo(true);},
 stickers(){const st=(q,a,bg,ink,acc)=>clip(0,0,420,420,rect(0,0,420,420,bg)+text(q,48,150,34,ink,P('Light'))+text(a,40,290,fit(a,Math.min(330,width(a,120,B)),B),acc,B),60);
  return stickerSheet([st('¿Lo medimos?','—Sí.',paper,navy,blue),st('¿Otra idea?','—Siempre.',blue,white,white),st('¿Lo enseñamos?','—Claro.',navy,white,white)]);},
 wall(){return rect(0,0,WW,WH,WALL)+rect(200,120,1600,760,white,'stroke="#C9CCC9" stroke-width="10"')+text('¿Qué aprendimos en este ciclo?',270,250,68,navy,P('Light'))+text('—',262,470,260,blue,B)+logo(1560,800,190,false)+floor;}},

{id:'d-instrumento',n:'D',name:'Instrumento',idea:'Los objetos rotulados como equipo calibrado: número, ficha y regla.',
 rule:'Número grande en Bricolage, rótulos en Poppins Medium versales con tracking, filetes finos. Todo rótulo informa algo real del objeto o del espacio.',
 risk:'Cerca de la estética industrial/Teenage Engineering; sin contenido real se vuelve ficha falsa. No simular medidas que no existen.',
 mug:{base:paper,interior:navy,art(){const w=70,x=face(.25,w),r=x+mmx(w),rule=(z)=>rect(x,zy(z),mmx(w),mmx(.45),navy);const L=(t,xx,z,a)=>label(t,xx,zy(z),mmx(3.1),navy,{anchor:a,tracking:.14});
  return rect(0,0,MUG.W,MUG.H,paper)+L('TAZA N.º',x,80.5,'start')+L('EQUIPO EFEONCE',r,80.5,'end')+rule(78)+text('01',x-mmx(1.5),zy(30),mmx(46),navy,{...B,wght:700})+rule(26)+L('SANTIAGO, CHILE',x,20.5,'start')+L('CICLO 2026',r,20.5,'end')+mugLogo(false,30,18);}},
 agenda(){const L=(t,x,y)=>label(t,x,y,17,navy,{tracking:.16});let f='';['CICLO','DESDE','HASTA','HIPÓTESIS','APRENDIZAJE'].forEach((t,i)=>{f+=L(t,72,520+i*78)+rect(250,520+i*78+6,420,2,navy);});
  return rect(0,0,AW,AH,paper)+L('CUADERNO DE CICLO',72,110)+label('EFEONCE',668,110,17,navy,{tracking:.16,anchor:'end'})+rect(72,130,596,3,navy)+text('N.º 07',64,380,190,navy,{...B,wght:700})+f+agendaLogo(false,130,960);},
 stickers(){const st=(k,v,bg,ink)=>clip(0,0,420,280,rect(0,0,420,280,bg)+label(k,34,70,20,ink,{tracking:.16})+rect(34,90,352,3,ink)+text(v,30,210,fit(v,Math.min(350,width(v,90,B)),B),ink,B),24);
  return stickerSheet([st('N.º 03','Idea',paper,navy),st('REVISADO POR','Personas',blue,white),st('MEDIDO','En vivo',navy,white)]);},
 wall(){return rect(0,0,WW,WH,WALL)+text('02',250,720,560,navy,{...B,wght:700})+rect(900,380,4,360,navy)+label('SALA',960,470,44,navy,{tracking:.18})+text('Producción',952,640,150,navy,B)+floor;}},

{id:'e-inmersion',n:'E',name:'Inmersión',idea:'Sin palabras: el azul Efeonce como material, siempre hasta la misma altura.',
 rule:'Cada objeto se «sumerge» en azul hasta el 38 % de su alto. La línea es la marca; el logo, cuando va, vive dentro del azul.',
 risk:'Es la más silenciosa: reconocible sólo con repetición y constancia de la proporción. Sola, una taza bicolor no es propia.',
 mug:{base:paper,interior:blue,art(){return rect(0,0,MUG.W,MUG.H,paper)+rect(0,zy(37),MUG.W,MUG.H-zy(37),blue)+mugLogo(true,30,17);}},
 agenda(){return rect(0,0,AW,AH,paper)+rect(0,AH*.62,AW,AH*.38,blue)+agendaLogo(true,150,AH*.62+AH*.38/2-18);},
 stickers(){const d=(r)=>rect(0,2*r*.62,2*r,2*r*.38,blue);return stickerSheet([circle(210,paper,d(210)),clip(0,0,420,420,rect(0,0,420,420,paper)+rect(0,420*.62,420,420*.38,blue)+logo(110,420*.62+55,200,true),70),circle(210,navy,rect(0,420*.62,420,420*.38,blue))]);},
 wall(){const h=WH-40,band=h*.38;return rect(0,0,WW,WH,WALL)+rect(0,h-band,WW,band,blue)+logo(1480,h-band/2-40,340,true)+floor;}},

{id:'f-supergrafica',n:'F',name:'Supergráfica',idea:'El logotipo oficial a escala de arquitectura: nunca se ve entero de una vez.',
 rule:'Logo oficial intacto, escalado hasta desbordar el soporte. En la taza rodea todo el cuerpo: se lee girándola.',
 risk:'Recortar el logotipo (y la nave) requiere autorización del dueño de marca. Puede leerse como merch de logo grande si no se cuida el recorte.',
 mug:{base:blue,interior:paper,art(){const w=MUG.W*.9,h=w*LOGO_RATIO,y=zy(50)-h/2,x=U(.55);return rect(0,0,MUG.W,MUG.H,blue)+logo(x,y,w,true)+logo(x-MUG.W,y,w,true);}},
 agenda(){const w=AW*2.4;return rect(0,0,AW,AH,blue)+logo(-70,330,w,true);},
 stickers(){const st=(dx,dy,w,bg,neg)=>circle(210,bg,logo(dx,dy,w,neg));return stickerSheet([st(-40,40,1560,navy,true),st(-560,40,1560,paper,false),st(-1120,40,1560,blue,true)]);},
 wall(){const w=2700;return rect(0,0,WW,WH,WALL)+logo(-260,(WH-40)/2-w*LOGO_RATIO/2,w,false)+floor;}},
];

const out=join(dir,'art');await mkdir(join(dir,'texturas'),{recursive:true});
const png=(s,f)=>sharp(Buffer.from(s),{density:72}).png().toFile(f);
for(const r of routes){const d=join(out,r.id);await mkdir(d,{recursive:true});
 const parts={mug:svg(MUG.W,MUG.H,r.mug.art()),agenda:svg(AW,AH,r.agenda()),stickers:svg(SW,SH,r.stickers()),muro:svg(WW,WH,r.wall())};
 for(const[k,s]of Object.entries(parts)){await writeFile(join(d,k+'.svg'),s);await png(s,join(d,k+'.png'));}
 await png(parts.mug,join(dir,'texturas',r.id+'.png'));}
await writeFile(join(dir,'rutas.json'),JSON.stringify(routes.map(r=>({id:r.id,n:r.n,name:r.name,idea:r.idea,rule:r.rule,risk:r.risk,base:r.mug.base,interior:r.mug.interior})),null,2));
console.log('ok',routes.length);
