// Exploración 05 · línea gráfica como sistema de activos distintivos.
// Cada vía se prueba en seis superficies SIN LOGO, con el mismo copy y los mismos fondos: lo único que cambia es
// el recurso de marca. La pregunta es cuál se reconoce como Efeonce sin firma. node exploracion-v5/sistema.mjs
import sharp from 'sharp';import {writeFile,mkdir,readFile} from 'node:fs/promises';import {join} from 'node:path';
import {dir,root,C,svg,rect,text,fit,width,layout,label} from './lib.mjs';

const T={navy:'#023C70',blue:'#0375DB',teal:'#12AFA2',white:'#FFFFFF',paper:'#F7F8F6',wall:'#ECEEEC',soft:'#CFE4FA',ink:'#00284D',muted:'#6D6777'};
const B=(o={})=>({family:'brico',...o}),P=(w='Regular')=>({family:'poppins',weight:w});
const ship=(await readFile(join(root,'public/branding/SVG/isotipo-full-efeonce.svg'))).toString('base64');
const shipNeg=(await readFile(join(root,'public/branding/SVG/isotipo-efeonce-negativo.svg'))).toString('base64');
const shipVB=(await readFile(join(root,'public/branding/SVG/isotipo-full-efeonce.svg'),'utf8')).match(/viewBox="([^"]+)"/)[1].split(/[ ,]+/).map(Number);
const SHIP_R=shipVB[3]/shipVB[2];
const shipAt=(x,y,w,dark)=>`<image href="data:image/svg+xml;base64,${dark?shipNeg:ship}" x="${x}" y="${y}" width="${w}" height="${w*SHIP_R}"/>`;

// Cursor (punta en 0,0) y etiqueta de persona. Forma de puntero estándar; el color teal es el acento oficial Efeonce.
const cursorPath='M0 0 L0 23 L6.2 17.2 L10.4 26.4 L14.2 24.7 L10.1 15.7 L18.4 15.7 Z';
function cursor(x,y,s,fill,name){const tag=name?(()=>{const fs=11*s,w=width(name,fs,P('SemiBold'))+16*s;return `<rect x="${x+14*s}" y="${y+24*s}" width="${w}" height="${fs*1.9}" rx="${fs*.95}" fill="${fill}"/>`+text(name,x+22*s,y+24*s+fs*1.33,fs,T.white,P('SemiBold'));})():'';
 return `<path d="${cursorPath}" transform="translate(${x} ${y}) scale(${s})" fill="${fill}" stroke="${T.white}" stroke-width="${1.6}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`+tag;}
function selection(x,y,w,h,dark,s=1){const c=dark?T.soft:T.blue,hs=7*s;let o=`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="${c}" stroke-width="${1.4*s}" stroke-dasharray="${5*s} ${4*s}"/>`;
 for(const[hx,hy]of[[0,0],[.5,0],[1,0],[0,.5],[1,.5],[0,1],[.5,1],[1,1]])o+=`<rect x="${x+hx*w-hs/2}" y="${y+hy*h-hs/2}" width="${hs}" height="${hs}" fill="${T.white}" stroke="${c}" stroke-width="${1.2*s}"/>`;return o;}

// Bloque de voz. copy = {e, d, r, rb (palabra en negrita del remate), q (pregunta), a (respuesta)}.
// kind: 'voz' | 'seleccion' | 'conversacion' | 'nave'. x = borde izquierdo; top = borde superior; w = ancho máx. del dominante.
function block(kind,copy,x,top,w,dark,opts={}){
 const ink=dark?T.white:T.navy,sub=dark?T.soft:T.ink;let o='';
 if(kind==='conversacion'){const q=copy.q,a=copy.a;const ds=Math.min(fit(a,w,B()),opts.maxD??1e9),es=Math.max(ds/3.4,opts.minE??0);
  const cap=layout('H',ds,B()).capHeight;let y=top+es;o+=text(q,x+ds*.02,y,es,sub,P('Light'));y+=es*.9+cap*1.05;
  if(a==='—'){o+=text('—',x,y,ds,T.teal,B());return o;}
  const rw=width('—',ds,B());o+=text('—',x,y,ds,T.teal,B())+text(a.slice(1),x+rw+ds*.02,y,ds,ink,B());return o;}
 const d=copy.d,ds=Math.min(fit(d,w,B()),opts.maxD??1e9),es=Math.max(ds/3.4,opts.minE??0),cap=layout('H',ds,B()).capHeight;let y=top;
 if(copy.e){y+=es;o+=text(copy.e,x+ds*.02,y,es,sub,P());y+=es*.55;}
 y+=cap*1.08;const base=y;
 if(kind==='voz'){const body=d.endsWith('.')?d.slice(0,-1):d;o+=text(body,x,y,ds,ink,B());if(d.endsWith('.'))o+=text('.',x+width(body,ds,B())-ds*.02,y,ds,T.teal,B());}
 else o+=text(d,x,y,ds,ink,B());
 const dw=width(d,ds,B());
 if(kind==='seleccion'){const p=ds*.1,bx=x-p,by=base-cap-p*1.1,bw=dw+2*p,bh=cap+p*2.1,s=Math.max(.7,ds/90);
  o+=selection(bx,by,bw,bh,dark,s)+cursor(bx+bw+4*s,by+bh*.55,s*1.25,T.teal,opts.who??'Equipo');}
 if(copy.r){y+=es*1.75;const r=copy.r,rb=copy.rb;if(rb&&r.includes(rb)){const [a,b]=r.split(rb);let xx=x+ds*.02;o+=text(a,xx,y,es,sub,P());xx+=width(a,es,P())+es*.28*(a.endsWith(' ')?1:0);o+=text(rb,xx,y,es,sub,P('SemiBold'));xx+=width(rb,es,P('SemiBold'));o+=text(b,xx,y,es,sub,P());}else o+=text(r,x+ds*.02,y,es,sub,P());}
 return o;}

// Copy idéntico entre vías; «conversación» usa su par pregunta/respuesta equivalente.
const COPY={
 post:{e:'Lo que aprendiste este ciclo',d:'no se pierde.',r:'Queda en tu historial.',rb:'historial',q:'¿Y lo que aprendimos?',a:'—Se queda.'},
 slide:{e:'Ciclo 07 · Resultados',d:'Lo que cambió.',r:'Tres decisiones y su evidencia.',rb:'evidencia',q:'¿Qué cambió en el ciclo 07?',a:'—Tres cosas.'},
 wall:{e:'Aquí se viene a',d:'hacer.',q:'¿A qué venimos?',a:'—A hacer.'},
 notebook:{e:'Cuaderno de',d:'Ideas.',r:'Las buenas se prueban.',rb:'prueban',q:'¿Qué probamos hoy?',a:'—'},
 mug:{d:'Hacer.',q:'¿Otra vuelta?',a:'—Vamos.'},
 badge:{e:'Hola, soy',d:'Nexa.',r:'Equipo de estrategia',rb:'estrategia',q:'¿Quién eres?',a:'—Nexa.'},
};

// Seis superficies. Devuelven {w,h,svg}. Fondos idénticos en todas las vías.
const S={
 post(k){const w=540,h=675;return {w,h,s:rect(0,0,w,h,T.navy)+block(k,COPY.post,56,150,420,true,{who:'Julio'})+(k==='nave'?shipAt(w/2-34,h-86,68,true):'')};},
 slide(k){const w=960,h=540;return {w,h,s:rect(0,0,w,h,T.white)+block(k,COPY.slide,72,120,560,false,{who:'Cliente'})+rect(72,440,816,1,'#D8DCE0')+label('EFEONCE · CICLO 07',72,480,11,T.muted,{tracking:.14})+(k==='nave'?shipAt(w-72-46,452,46,false):'')};},
 wall(k){const w=960,h=540;return {w,h,s:rect(0,0,w,h,T.wall)+block(k,COPY.wall,120,120,560,false,{who:'Equipo',maxD:250})+rect(0,h-24,w,24,'#D5D8D5')+(k==='nave'?shipAt(w-190,330,110,false):'')};},
 notebook(k){const w=380,h=540;let lines='';if(k==='conversacion')for(let i=0;i<5;i++)lines+=rect(70,300+i*44,270,1.5,'#3D6590');
  return {w,h,s:rect(0,0,w,h,T.navy)+block(k,COPY.notebook,40,90,270,true,{who:'Tú',minE:15})+lines+(k==='nave'?shipAt(w/2-26,h-70,52,true):'')};},
 mug(k){const w=460,h=420,bx=70,by=50,bw=290,bh=320;
  const body=`<path d="M${bx} ${by} H${bx+bw} V${by+bh-26} Q${bx+bw} ${by+bh} ${bx+bw-26} ${by+bh} H${bx+26} Q${bx} ${by+bh} ${bx} ${by+bh-26} Z" fill="${T.white}" stroke="#C9CCC9" stroke-width="2"/>`+
   `<path d="M${bx+bw} ${by+70} C${bx+bw+85} ${by+60} ${bx+bw+85} ${by+230} ${bx+bw} ${by+220}" fill="none" stroke="#C9CCC9" stroke-width="30" stroke-linecap="round"/><path d="M${bx+bw} ${by+70} C${bx+bw+85} ${by+60} ${bx+bw+85} ${by+230} ${bx+bw} ${by+220}" fill="none" stroke="${T.white}" stroke-width="26" stroke-linecap="round"/>`+
   rect(bx,by,bw,10,'#E4E8EC');
  return {w,h,s:rect(0,0,w,h,'#E9ECEE')+body+block(k,COPY.mug,bx+36,by+(k==='conversacion'?70:100),bw-80,false,{who:'Tú',minE:14})+(k==='nave'?shipAt(bx+bw/2-22,by+bh-62,44,false):'')};},
 badge(k){const w=320,h=460,cx=40,cy=40,cw=240,ch=380;
  return {w,h,s:rect(0,0,w,h,'#E9ECEE')+`<rect x="${cx}" y="${cy}" width="${cw}" height="${ch}" rx="16" fill="${T.white}" stroke="#C9CCC9" stroke-width="2"/><rect x="${cx+cw/2-26}" y="${cy+16}" width="52" height="9" rx="4.5" fill="#E4E8EC"/>`+
   block(k,COPY.badge,cx+24,cy+150,176,false,{who:'Hoy',minE:12})+(k==='nave'?shipAt(cx+cw/2-20,cy+ch-54,40,false):'')};},
};

const ROUTES=[
 {k:'seleccion',n:'1',name:'Selección',
  asset:'La caja de selección punteada con tiradores y un cursor teal con nombre de persona, siempre sobre la palabra que decide.',
  why:'Ya está en circulación: todos los ads de Efeonce la usan. Hace visible el Why —trabajo construido en vivo, con personas— sin decirlo.',
  own:'Propiedad = combinación exacta: trazo punteado azul, tiradores blancos, cursor teal #12AFA2 con etiqueta y Bricolage con punto. Ningún elemento suelto es propio.',
  risk:'Es el lenguaje de Figma/Canva: si se usa sin la combinación exacta o en exceso, se lee como «diseño de herramienta» y no como Efeonce.'},
 {k:'voz',n:'2',name:'Voz con punto teal',
  asset:'Las tres voces (entrada Poppins · dominante Bricolage · remate con palabra en negrita) y el punto final del dominante en teal.',
  why:'Es la gramática tipográfica de los ads y de la taza «Hacer.» que te gustó. El punto es la decisión tomada; en teal se vuelve firma.',
  own:'Propiedad = el punto teal en el mismo lugar, siempre. Puede vivir solo (un punto teal en un muro, en un botón, en un slide).',
  risk:'Sin disciplina de copy es sólo «tipografía grande». El punto teal pesa poco a distancia; necesita repetición para ser propio.'},
 {k:'conversacion',n:'3',name:'Conversación',
  asset:'Pregunta en Poppins Light y respuesta con raya de diálogo teal en Bricolage. En soportes de trabajo, la respuesta queda por escribir.',
  why:'Traduce «lo construimos contigo» a una forma: siempre hay dos voces. La raya es un signo del español que casi ninguna marca usa.',
  own:'Propiedad = la raya teal + el par pregunta/respuesta. Funciona en voz alta, en texto plano y en superficies físicas.',
  risk:'Nueva: parte sin exposición previa. Si las frases se vuelven chistes, cae en merch genérico; exige curar el vocabulario.'},
 {k:'nave',n:'4',name:'Nave sola (control)',
  asset:'Tipografía neutra y la nave oficial sola, chica y siempre en la misma posición, sin logotipo.',
  why:'Es el camino más directo al reconocimiento: la nave ya se ve en polos, chaquetas y 3D. Sirve de control para medir si 1–3 aportan más que el símbolo.',
  own:'Propiedad = el isotipo oficial. No es un recurso nuevo: es el logo reducido.',
  risk:'No cumple del todo «sin logo»: sin la nave, no queda nada propio. Por eso es el control, no una propuesta.'},
];

const out=join(dir,'sistema');await mkdir(out,{recursive:true});
const png=(s,f)=>sharp(Buffer.from(s),{density:144}).png().toFile(f);
const order=['post','slide','wall','notebook','mug','badge'];const names={post:'Post 4:5',slide:'Slide 16:9',wall:'Muro de oficina',notebook:'Cuaderno',mug:'Taza (frente)',badge:'Credencial'};
for(const r of ROUTES){const d=join(out,r.k);await mkdir(d,{recursive:true});const tiles={};
 for(const sname of order){const t=S[sname](r.k);tiles[sname]=t;const s=svg(t.w,t.h,t.s);await writeFile(join(d,sname+'.svg'),s);await png(s,join(d,sname+'.png'));}
 // Lámina de la vía: 1920 × 1240
 const W=1920,H=1240;let g=rect(0,0,W,H,T.white);
 g+=label(`VÍA ${r.n} · SIN LOGO`,80,86,14,T.muted,{tracking:.16})+text(r.name,76,160,64,T.navy,B());
 const para=(t,x,y,w,size,col,weight='Regular')=>{const words=t.split(' ');let line='',yy=y,o='';for(const wd of words){const tr=line?line+' '+wd:wd;if(width(tr,size,P(weight))>w){o+=text(line,x,yy,size,col,P(weight));yy+=size*1.5;line=wd;}else line=tr;}return o+text(line,x,yy,size,col,P(weight));};
 g+=para(r.asset,80,212,840,20,T.ink,'Medium')+para(r.why,1000,100,840,17,T.muted)+para(r.own,1000,190,840,17,T.muted);
 // grilla: fila 1 post, slide, wall ; fila 2 notebook, mug, badge
 const place=[['post',80,300,340],['slide',460,300,620],['wall',1120,300,720],['notebook',80,760,300],['mug',420,760,430],['badge',890,760,300]];
 for(const[sn,x,y,w]of place){const t=tiles[sn],sc=w/t.w;g+=`<g transform="translate(${x} ${y}) scale(${sc})">${t.s}</g>`+label(names[sn].toUpperCase(),x,y-12,11,T.muted,{tracking:.14});}
 g+=label('RIESGO',1240,790,12,T.muted,{tracking:.16})+para(r.risk,1240,826,600,18,T.ink);
 const sheet=svg(W,H,g);await writeFile(join(out,`via-${r.n}-${r.k}.svg`),sheet);await png(sheet,join(out,`via-${r.n}-${r.k}.png`));}
// Comparativa: misma superficie (post) y taza, las cuatro vías lado a lado.
{const W=1920,H=1100;let g=rect(0,0,W,H,T.white)+text('Mismo copy, mismo fondo, sin logo.',76,110,54,T.navy,B())+text('Lo único que cambia es el recurso de marca. ¿Cuál dice Efeonce?',80,160,22,T.muted,P());
 ROUTES.forEach((r,i)=>{const x=80+i*450,p=S.post(r.k),m=S.mug(r.k),sc=400/p.w;g+=label(`VÍA ${r.n} · ${r.name.toUpperCase()}`,x,230,12,T.navy,{tracking:.14})+`<g transform="translate(${x} 250) scale(${sc})">${p.s}</g>`+`<g transform="translate(${x} 770) scale(${400/m.w})">${m.s}</g>`;});
 const s=svg(W,H,g);await writeFile(join(out,'00-comparativa.svg'),s);await png(s,join(out,'00-comparativa.png'));}
await writeFile(join(out,'vias.json'),JSON.stringify(ROUTES,null,2));console.log('ok');
