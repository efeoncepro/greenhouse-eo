// Genera el canvas «Línea gráfica Efeonce — exploración»: una lámina de punto de partida + seis vías.
import {writeFileSync} from 'node:fs';
const OUT=new URL('./project/',import.meta.url).pathname;
const ISO='/_blob/44e2f55cdc712e2ff3ed0dfdd74758f7',MUGIMG='/_blob/8fb027ffffef185a2178dfd52b91ddf4',AD='/_blob/17344e56fcff2a1febef7eaa96a877d0';
const C={navy:'#023C70',blue:'#0375DB',teal:'#12AFA2',white:'#FFFFFF',paper:'#F7F8F6',wall:'#E6E8E6',floor:'#CDD1CD',ink:'#00284D',muted:'#5F5A69',soft:'#CFE4FA',line:'#C9CCC9',tile:'#EEF0EF'};
const BR="'Bricolage Grotesque', sans-serif",PO="'Poppins', sans-serif";
const st=o=>Object.entries(o).map(([k,v])=>`${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}: ${typeof v==='number'&&!/opacity|weight|index|flex|line/i.test(k)?v+'px':v}`).join('; ');
const div=(o,inner='',title)=>`<div${title?` title="${title}"`:''} style="${st(o)}">${inner}</div>`;
const abs=(x,y,w,h,o={},inner='')=>div({position:'absolute',left:x,top:y,width:w,height:h,...o},inner);
const t=(txt,o)=>div(o,txt);
const D=(size,color,o={})=>({fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:.92,letterSpacing:'-0.035em',color,margin:0,...o});
const Pp=(size,color,w=400,o={})=>({fontFamily:PO,fontWeight:w,fontSize:size,lineHeight:1.35,color,margin:0,...o});
const cap=(txt,color=C.muted,size=11)=>t(txt,{...Pp(size,color,500),letterSpacing:'0.14em',textTransform:'uppercase'});
const sphere=(d,color=C.teal)=>`<span style="display: inline-block; width: ${d}; height: ${d}; border-radius: 50%; background: ${color}; margin-left: 0.05em"></span>`;
const dots=(d,color=C.teal,o={})=>div({display:'flex',gap:Math.round(d*.64),...o},[0,1,2].map(()=>div({width:d,height:d,borderRadius:'50%',background:color,flexShrink:0})).join(''));
const gap=(bg,px=3)=>{const a=[];for(let i=0;i<16;i++){const r=i/16*2*Math.PI;a.push(`${(Math.cos(r)*px).toFixed(1)}px ${(Math.sin(r)*px).toFixed(1)}px 0 ${bg}`);}return a.join(', ');};
const ANG=6,tan=Math.tan(ANG*Math.PI/180);
const angBand=(w,h,topFrac,color)=>{const rise=w*tan;const y1=h*topFrac;return abs(0,0,w,h,{background:color,clipPath:`polygon(0 ${y1}px, ${w}px ${y1-rise}px, ${w}px ${h}px, 0 ${h}px)`});};
const guideH=(y,w,c)=>abs(0,y,w,1,{background:c});const guideV=(x,h,c)=>abs(x,0,1,h,{background:c});
const crop=(x,y,w,h,c,L=14)=>[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].map(([cx,cy,sx,sy])=>abs(sx>0?cx-L-4:cx+4,cy,L,1,{background:c})+abs(cx,sy>0?cy-L-4:cy+4,1,L,{background:c})).join('');
const cursor=(x,y,s,color,name)=>abs(x,y,20*s+120,40*s,{},`<svg width="${19*s}" height="${27*s}" viewBox="0 0 19 27" style="position: absolute; left: 0; top: 0"><path d="M1 1 L1 23 L7 17.5 L11 26 L14.5 24.5 L10.6 16 L18 16 Z" fill="${color}" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"></path></svg>`+(name?div({position:'absolute',left:14*s,top:22*s,background:color,color:C.white,fontFamily:PO,fontWeight:600,fontSize:10*s,lineHeight:1,padding:`${4*s}px ${7*s}px`,borderRadius:20,whiteSpace:'nowrap'},name):''));
const selBox=(x,y,w,h,c)=>abs(x,y,w,h,{border:`1.5px dashed ${c}`,boxSizing:'border-box'})+[[0,0],[.5,0],[1,0],[0,.5],[1,.5],[0,1],[.5,1],[1,1]].map(([a,b])=>abs(x+a*w-4,y+b*h-4,8,8,{background:C.white,border:`1.2px solid ${c}`,boxSizing:'border-box'})).join('');

// ---------- Superficies (mismo copy y fondo en todas las vías) ----------
// Cada vía implementa: post, slide, wall, notebook, mug, badge, sticker, solo. Tile = contenido absoluto en su caja.
const mugShell=(inner,band='')=>abs(40,34,176,196,{background:C.white,border:`1px solid ${C.line}`,borderRadius:'4px 4px 22px 22px',overflow:'hidden',boxSizing:'border-box'},band+inner)+abs(212,72,62,108,{border:`16px solid ${C.white}`,borderLeft:'none',borderRadius:'0 56px 56px 0',boxSizing:'border-box',boxShadow:`1px 0 0 ${C.line}`})+abs(40,30,176,10,{background:'#DDE3E8',borderRadius:'50%'});
const badgeShell=(inner,holes)=>abs(30,16,170,250,{background:C.white,border:`1px solid ${C.line}`,borderRadius:12,overflow:'hidden',boxSizing:'border-box'},(holes??abs(67,12,36,7,{background:C.tile,borderRadius:4}))+inner);
const wallShell=inner=>abs(0,0,460,259,{background:C.wall},inner+abs(0,236,460,23,{background:C.floor}));

const V={};
// 1 · Tres ventanas
V.ventanas={n:1,name:'Tres ventanas',
 idea:'Las tres ventanas de la nave, sueltas del logo, como signo propio: puntuación, ritmo, perforación y señal de «en curso».',
 rule:['Siempre tres, en fila, con el paso de la nave (separación = 0,64 × diámetro).','Teal sobre claro y oscuro; blanco sólo como perforación real.','Ocupa el lugar de la firma, del separador o del indicador de estado; nunca es patrón de relleno.'],
 pub:'Ordena lo publicado: reemplaza chips y viñetas sueltas, y firma las piezas donde hoy va el logo. En producto es el «Nexa está escribiendo».',
 lift:'Es literalmente parte de la nave: quien vio el logo lo completa. Además funciona en movimiento (tres puntos que laten).',
 risk:'Tres puntos también son «más opciones» o «cargando» en cualquier interfaz. Lo propio es la proporción exacta y el teal; sin rigor, se diluye.',
 post:()=>abs(0,0,300,375,{background:C.navy},abs(28,36,120,14,{},dots(9))+abs(28,78,244,200,{},t('Lo que aprendiste este ciclo',Pp(12.5,C.soft))+t('no se pierde.',D(46,C.white,{marginTop:8}))+t('Queda en tu <b style="font-weight: 600">historial</b>.',Pp(12.5,C.soft,400,{marginTop:12})))+abs(119,318,62,14,{},dots(14))),
 slide:()=>abs(0,0,460,259,{background:C.white},abs(36,40,300,20,{display:'flex',alignItems:'center',gap:10},dots(7)+t('Ciclo 07 · Resultados',Pp(11,C.ink)))+abs(36,78,380,120,{},t('Lo que cambió.',D(44,C.navy))+t('Tres decisiones y su evidencia.',Pp(11.5,C.ink,400,{marginTop:12})))+abs(36,205,388,1,{background:'#D8DCE0'})+abs(388,222,40,10,{},dots(6,C.navy))),
 wall:()=>wallShell(abs(44,70,240,120,{},t('Hacer.',D(86,C.navy)))+abs(296,58,140,40,{},dots(34))),
 notebook:()=>abs(0,0,220,312,{background:C.navy},abs(52,78,116,34,{},dots(30,C.white))+abs(28,236,160,50,{},t('Ideas.',D(34,C.white)))),
 mug:()=>mugShell(abs(26,56,130,100,{},t('Hacer.',D(40,C.navy))+abs(0,58,60,10,{},dots(9)))),
 badge:()=>badgeShell(abs(18,120,140,100,{},t('Hola, soy',Pp(10,C.muted))+t('Nexa.',D(38,C.navy,{marginTop:4}))+t('Estrategia',Pp(10,C.ink,500,{marginTop:8}))),abs(58,14,54,12,{},dots(12,C.tile))),
 sticker:()=>abs(10,40,110,64,{background:C.teal,borderRadius:32,display:'flex',alignItems:'center',justifyContent:'center'},dots(14,C.white))+abs(140,24,96,96,{background:C.navy,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'},dots(14))+abs(256,40,64,64,{background:C.white,borderRadius:14,display:'flex',alignItems:'center',justifyContent:'center'},dots(10,C.navy)),
 solo:()=>abs(30,70,160,60,{},dots(40))+abs(30,150,170,40,{},t('d · 0,64 d · d · 0,64 d · d',Pp(10,C.muted)))};
// 2 · La esfera
V.esfera={n:2,name:'La esfera',
 idea:'La esfera de la nave se vuelve el punto final. Cada afirmación termina en una esfera teal: la decisión tomada.',
 rule:['El dominante siempre cierra con la esfera, nunca con un punto tipográfico.','Diámetro = 0,2 × cuerpo del dominante; apoyada en la línea base.','Sola, la esfera marca presencia: una por superficie, nunca un patrón de puntos.'],
 pub:'Ordena lo publicado: las tres voces ya cierran el dominante con punto («No estabas.»). La vía sólo le da origen, color y regla. La taza «Hacer.» pasa a ser su aplicación directa.',
 lift:'Sale de la anatomía del logo y del hábito que ya existe en los ads. Se repite en cada pieza con copy, lo que la vuelve el activo de mayor frecuencia.',
 risk:'Un punto de color es fácil de copiar y, solo, pesa poco a distancia. Necesita disciplina de copy (afirmaciones cortas) para que el cierre signifique algo.',
 post:()=>abs(0,0,300,375,{background:C.navy},abs(28,96,244,210,{},t('Lo que aprendiste este ciclo',Pp(12.5,C.soft))+t('no se pierde'+sphere('0.2em'),D(46,C.white,{marginTop:8}))+t('Queda en tu <b style="font-weight: 600">historial</b>.',Pp(12.5,C.soft,400,{marginTop:12})))),
 slide:()=>abs(0,0,460,259,{background:C.white},abs(36,52,380,140,{},t('Ciclo 07 · Resultados',Pp(11,C.ink))+t('Lo que cambió'+sphere('0.2em'),D(44,C.navy,{marginTop:10}))+t('Tres decisiones y su evidencia.',Pp(11.5,C.ink,400,{marginTop:12})))+abs(36,205,388,1,{background:'#D8DCE0'})),
 wall:()=>wallShell(abs(60,64,380,150,{},t('Hacer'+sphere('0.2em'),D(104,C.navy)))),
 notebook:()=>abs(0,0,220,312,{background:C.navy},abs(28,220,170,60,{},t('Ideas'+sphere('0.2em'),D(40,C.white))))+abs(150,36,40,40,{borderRadius:'50%',background:C.teal}),
 mug:()=>mugShell(abs(24,70,140,70,{},t('Hacer'+sphere('0.2em'),D(42,C.navy)))),
 badge:()=>badgeShell(abs(18,120,140,100,{},t('Hola, soy',Pp(10,C.muted))+t('Nexa'+sphere('0.2em'),D(38,C.navy,{marginTop:4}))+t('Estrategia',Pp(10,C.ink,500,{marginTop:8})))),
 sticker:()=>abs(14,30,84,84,{background:C.teal,borderRadius:'50%'})+abs(124,24,110,96,{background:C.navy,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center'},t('Sí'+sphere('0.2em'),D(44,C.white)))+abs(252,24,76,96,{background:C.white,borderRadius:18,display:'flex',alignItems:'center',justifyContent:'center'},t('Ok'+sphere('0.2em'),D(30,C.navy))),
 solo:()=>abs(26,40,190,120,{},t('Hacer'+sphere('0.2em'),D(56,C.navy)))+abs(26,150,180,40,{},t('esfera = 0,2 × cuerpo, sobre la línea base',Pp(10,C.muted)))};
// 3 · El cruce
V.cruce={n:3,name:'El cruce',
 idea:'La regla de construcción de la nave: cuando dos cosas se cruzan, una pasa por delante y deja un aire del color de fondo. Nada se funde.',
 rule:['Un campo de color y una palabra que lo atraviesa; el aire mide 1/12 del cuerpo.','La palabra siempre pasa por delante; el campo nunca se recorta con formas nuevas.','Sirve también para texto sobre foto: el aire reemplaza al scrim.'],
 pub:'Complementa lo publicado: resuelve cómo el titular convive con la foto sin velo, y cómo la caja de selección se superpone al texto.',
 lift:'Es cómo está dibujado el logo (la nave cruza la órbita con un corte blanco). Se reconoce como método, no como motivo, y se aplica a cualquier material.',
 risk:'Es sutil: a tamaño chico el aire desaparece. Exige campos grandes y buena impresión; mal ejecutado parece un contorno de Word.',
 post:()=>abs(0,0,300,375,{background:C.navy},abs(150,0,150,375,{background:C.blue})+abs(28,120,260,200,{},t('Lo que aprendiste este ciclo',Pp(12.5,C.soft))+t('no se pierde.',D(50,C.white,{marginTop:8,textShadow:gap(C.navy,3.5)}))+t('Queda en tu <b style="font-weight: 600">historial</b>.',Pp(12.5,C.soft,400,{marginTop:12})))),
 slide:()=>abs(0,0,460,259,{background:C.white},abs(250,0,210,259,{background:C.blue})+abs(36,60,420,140,{},t('Ciclo 07 · Resultados',Pp(11,C.ink))+t('Lo que cambió.',D(50,C.navy,{marginTop:10,textShadow:gap(C.white,3.5)}))+t('Tres decisiones y su evidencia.',Pp(11.5,C.ink,400,{marginTop:12})))),
 wall:()=>wallShell(abs(210,30,200,206,{background:C.blue})+abs(60,70,380,150,{},t('Hacer.',D(104,C.navy,{textShadow:gap(C.wall,5)})))),
 notebook:()=>abs(0,0,220,312,{background:C.navy},abs(0,170,220,142,{background:C.blue})+abs(28,120,190,70,{},t('Ideas.',D(56,C.white,{textShadow:gap(C.navy,3.5)})))),
 mug:()=>mugShell(abs(20,64,140,70,{},t('Hacer.',D(44,C.navy,{textShadow:gap(C.white,3)}))),abs(0,96,176,100,{background:C.blue})),
 badge:()=>badgeShell(abs(0,0,170,118,{background:C.teal})+abs(18,86,150,120,{},t('Nexa.',D(42,C.navy,{textShadow:gap(C.white,3)}))+t('Estrategia',Pp(10,C.ink,500,{marginTop:8})))),
 sticker:()=>abs(14,24,96,96,{background:C.blue,borderRadius:'50%'})+abs(8,54,120,40,{},t('Sí.',D(40,C.navy,{textShadow:gap(C.tile,3)})))+abs(150,24,170,96,{background:C.navy,borderRadius:18,overflow:'hidden'},abs(90,0,80,96,{background:C.teal})+abs(20,26,150,50,{},t('Hoy.',D(40,C.white,{textShadow:gap(C.navy,3)})))),
 solo:()=>abs(90,30,110,130,{background:C.blue})+abs(26,60,200,80,{},t('Aire',D(60,C.navy,{textShadow:gap(C.white,4)})))+abs(26,160,190,40,{},t('aire = 1/12 del cuerpo, del color del fondo',Pp(10,C.muted)))};
// 4 · El ángulo
V.angulo={n:4,name:'El ángulo',
 idea:'La inclinación de la nave como ángulo de marca. Todo lo que corta (campos, bandas, encuadres de foto) corta en ese ángulo; el texto nunca se inclina.',
 rule:[`Un solo ángulo, ${ANG}° (a fijar midiendo el eje del vector de la nave).`,'Sólo los bordes de campos y encuadres se inclinan; tipografía y logo quedan rectos.','Un corte por superficie, siempre ascendiendo hacia la derecha.'],
 pub:'Amplía lo publicado: da un encuadre propio a las fotos del lenguaje fotográfico y un borde a los campos de color, sin tocar la tipografía de los ads.',
 lift:'Un ángulo constante es de los activos más fáciles de reconocer a distancia y en arquitectura (muros, vidrios, pisos). Viene del movimiento de la nave.',
 risk:'Las diagonales son comunes en marcas deportivas y de energía. Si el ángulo varía entre piezas, se pierde por completo.',
 post:()=>abs(0,0,300,375,{background:C.navy},angBand(300,375,.74,C.blue)+abs(28,70,244,200,{},t('Lo que aprendiste este ciclo',Pp(12.5,C.soft))+t('no se pierde.',D(46,C.white,{marginTop:8}))+t('Queda en tu <b style="font-weight: 600">historial</b>.',Pp(12.5,C.soft,400,{marginTop:12})))),
 slide:()=>abs(0,0,460,259,{background:C.white},angBand(460,259,.86,C.blue)+abs(36,44,380,140,{},t('Ciclo 07 · Resultados',Pp(11,C.ink))+t('Lo que cambió.',D(44,C.navy,{marginTop:10}))+t('Tres decisiones y su evidencia.',Pp(11.5,C.ink,400,{marginTop:12})))),
 wall:()=>wallShell(angBand(460,236,.62,C.blue)+abs(50,40,380,120,{},t('Hacer.',D(88,C.navy)))),
 notebook:()=>abs(0,0,220,312,{background:C.navy},angBand(220,312,.7,C.blue)+abs(28,60,170,60,{},t('Ideas.',D(40,C.white)))),
 mug:()=>mugShell(abs(22,34,140,70,{},t('Hacer.',D(42,C.navy))),angBand(176,196,.66,C.blue)),
 badge:()=>badgeShell(angBand(170,250,.62,C.blue)+abs(18,44,150,100,{},t('Hola, soy',Pp(10,C.muted))+t('Nexa.',D(38,C.navy,{marginTop:4}))+t('Estrategia',Pp(10,C.ink,500,{marginTop:8})))),
 sticker:()=>abs(14,24,96,96,{background:C.white,borderRadius:'50%',overflow:'hidden'},angBand(96,96,.55,C.blue))+abs(136,24,96,96,{background:C.navy,borderRadius:18,overflow:'hidden'},angBand(96,96,.55,C.teal))+abs(256,24,70,96,{background:C.white,borderRadius:14,overflow:'hidden'},angBand(70,96,.4,C.navy)),
 solo:()=>abs(20,30,200,130,{background:C.white,overflow:'hidden',border:`1px solid ${C.line}`},angBand(200,130,.6,C.blue))+abs(20,172,200,40,{},t(`${ANG}°, siempre ascendiendo a la derecha`,Pp(10,C.muted)))};
// 5 · Oficio a la vista
V.oficio={n:5,name:'Oficio a la vista',
 idea:'El gemelo gráfico del lenguaje fotográfico aprobado: las marcas del trabajo quedan visibles. Guías, marcas de corte, selección y notas de versión.',
 rule:['Guías de 1 px que salen del texto hasta el borde; marcas de corte en esquinas.','Una sola nota por pieza, en Poppins, con la versión en teal («v07»).','La selección con cursor es una herramienta más del set, no el todo.'],
 pub:'Ordena lo publicado: la caja de selección con cursores de los ads pasa a ser una herramienta dentro de un sistema mayor, junto a guías, cortes y notas.',
 lift:'Hace visible el Why (el cliente ve el trabajo en vivo) y rima con «El oficio a la vista» de la fotografía: la marca se reconoce por comportamiento.',
 risk:'El lenguaje de herramientas de diseño está muy usado (Figma, portfolios). Puede leerse como «estética de diseñador» y no de agencia de crecimiento.',
 post:()=>abs(0,0,300,375,{background:C.navy},guideV(28,375,'rgba(207,228,250,0.35)')+guideH(180,300,'rgba(207,228,250,0.35)')+abs(28,112,250,200,{},t('Lo que aprendiste este ciclo',Pp(12.5,C.soft))+t('no se pierde.',D(46,C.white,{marginTop:8}))+t('Queda en tu <b style="font-weight: 600">historial</b>.',Pp(12.5,C.soft,400,{marginTop:12})))+crop(18,18,264,339,C.soft,10)+abs(28,336,240,16,{},t('<span style="color: #12AFA2; font-weight: 600">v07</span> · revisado por el equipo',Pp(9.5,C.soft)))),
 slide:()=>abs(0,0,460,259,{background:C.white},guideV(36,259,'#D8DCE0')+abs(36,52,400,140,{},t('Ciclo 07 · Resultados',Pp(11,C.ink))+t('Lo que cambió.',D(44,C.navy,{marginTop:10}))+t('Tres decisiones y su evidencia.',Pp(11.5,C.ink,400,{marginTop:12})))+selBox(30,72,300,52,C.blue)+cursor(326,104,1,C.teal,'Cliente')),
 wall:()=>wallShell(crop(50,56,330,112,C.navy,18)+abs(60,64,380,120,{},t('Hacer.',D(96,C.navy)))+abs(60,190,200,16,{},t('<span style="color: #0E8C82; font-weight: 600">2,4 m</span> · muro norte',Pp(10,C.ink)))),
 notebook:()=>abs(0,0,220,312,{background:C.navy},guideV(28,312,'rgba(207,228,250,0.35)')+guideH(260,220,'rgba(207,228,250,0.35)')+crop(14,14,192,284,C.soft,9)+abs(28,208,170,60,{},t('Ideas.',D(40,C.white)))+abs(28,272,170,14,{},t('<span style="color: #12AFA2; font-weight: 600">v01</span> · empezado hoy',Pp(9,C.soft)))),
 mug:()=>mugShell(crop(20,64,134,48,C.navy,9)+abs(24,68,140,70,{},t('Hacer.',D(42,C.navy)))+abs(24,126,130,14,{},t('<span style="color: #0E8C82; font-weight: 600">v03</span> · tu taza',Pp(8.5,C.ink)))),
 badge:()=>badgeShell(abs(18,120,140,100,{},t('Hola, soy',Pp(10,C.muted))+t('Nexa.',D(38,C.navy,{marginTop:4}))+t('Estrategia',Pp(10,C.ink,500,{marginTop:8})))+selBox(12,138,104,42,C.blue)+cursor(108,168,.9,C.teal,'Hoy')),
 sticker:()=>abs(10,24,110,96,{background:C.white,borderRadius:14},crop(18,18,74,60,C.navy,8))+abs(140,40,120,64,{},cursor(0,0,1.7,C.teal,'Tú'))+abs(262,40,64,64,{background:C.teal,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'},t('v07',Pp(15,C.white,600))),
 solo:()=>crop(30,40,170,70,C.navy,12)+abs(38,52,170,60,{},t('Idea.',D(44,C.navy)))+abs(30,150,190,40,{},t('guía · corte · selección · nota',Pp(10,C.muted)))};
// 6 · Conversación
V.conversacion={n:6,name:'Conversación',
 idea:'Siempre hay dos voces. Una pregunta, y la respuesta con raya de diálogo teal. En los soportes de trabajo, la respuesta queda por escribir.',
 rule:['Pregunta en Poppins Light, respuesta en Bricolage precedida por la raya (—) en teal.','Nunca dos preguntas ni dos respuestas seguidas.','En cuadernos, pizarras y formularios la raya queda sola: la escribe quien lo usa.'],
 pub:'Complementa lo publicado: las tres voces ya funcionan como diálogo (la entrada plantea, el dominante responde). La vía lo hace explícito y lo lleva a la voz de marca.',
 lift:'La raya es un signo del español que casi ninguna marca usa, y cuenta «lo construimos contigo» sin decirlo. Funciona también en voz, texto plano y audio.',
 risk:'Parte sin exposición previa. Si las frases se vuelven ingeniosas por sí mismas, cae en merch de frases; exige curar el vocabulario.',
 post:()=>abs(0,0,300,375,{background:C.navy},abs(28,120,250,200,{},t('¿Y lo que aprendimos?',Pp(14,C.soft,300))+t('<span style="color: #12AFA2">—</span>Se queda.',D(46,C.white,{marginTop:10})))),
 slide:()=>abs(0,0,460,259,{background:C.white},abs(36,64,400,140,{},t('¿Qué cambió en el ciclo 07?',Pp(13,C.ink,300))+t('<span style="color: #12AFA2">—</span>Tres cosas.',D(46,C.navy,{marginTop:10})))),
 wall:()=>wallShell(abs(40,24,380,190,{background:C.white,border:`4px solid ${C.line}`,boxSizing:'border-box'},abs(20,18,340,20,{},t('¿Qué aprendimos en este ciclo?',Pp(14,C.ink,300)))+abs(20,50,80,60,{},t('—',D(64,C.teal))))),
 notebook:()=>abs(0,0,220,312,{background:C.navy},abs(28,56,170,40,{},t('¿Qué probamos hoy?',Pp(13,C.soft,300)))+abs(28,86,60,50,{},t('—',D(48,C.teal)))+[0,1,2,3].map(i=>abs(28,168+i*30,164,1,{background:'rgba(207,228,250,0.3)'})).join('')),
 mug:()=>mugShell(abs(22,60,140,90,{},t('¿Otra vuelta?',Pp(11,C.ink,300))+t('<span style="color: #12AFA2">—</span>Vamos.',D(36,C.navy,{marginTop:6})))),
 badge:()=>badgeShell(abs(18,120,140,100,{},t('¿Quién eres?',Pp(10,C.muted,300))+t('<span style="color: #12AFA2">—</span>Nexa.',D(38,C.navy,{marginTop:4}))+t('Estrategia',Pp(10,C.ink,500,{marginTop:8})))),
 sticker:()=>abs(10,24,100,96,{background:C.white,borderRadius:14,padding:12,boxSizing:'border-box'},t('¿Lo medimos?',Pp(9.5,C.ink,300))+t('<span style="color: #12AFA2">—</span>Sí.',D(30,C.navy,{marginTop:4})))+abs(124,24,100,96,{background:C.navy,borderRadius:14,padding:12,boxSizing:'border-box'},t('¿Otra idea?',Pp(9.5,C.soft,300))+t('<span style="color: #12AFA2">—</span>Va.',D(30,C.white,{marginTop:4})))+abs(238,24,90,96,{background:C.teal,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'},t('—',D(52,C.white))),
 solo:()=>abs(26,50,200,100,{},t('¿Y ahora?',Pp(13,C.ink,300))+t('<span style="color: #12AFA2">—</span>Probemos.',D(40,C.navy,{marginTop:8})))+abs(26,160,190,40,{},t('raya teal = la otra voz',Pp(10,C.muted)))};

// ---------- Lámina de una vía: 1600 × 1000 ----------
const tile=(x,y,w,h,label,inner,bg=C.tile)=>abs(x,y-22,w,16,{},cap(label,C.muted,10))+abs(x,y,w,h,{background:bg,overflow:'hidden'},inner);
function routeBoard(v){
 const list=a=>a.map(r=>div({display:'flex',gap:10},div({width:6,height:6,borderRadius:'50%',background:C.teal,marginTop:8,flexShrink:0})+t(r,Pp(13.5,C.ink)))).join('');
 const block=(h,body)=>div({display:'flex',flexDirection:'column',gap:6},cap(h,C.muted,10.5)+t(body,Pp(13.5,C.ink)));
 const left=abs(64,64,440,880,{display:'flex',flexDirection:'column',gap:15},
  cap(`Vía ${v.n} · sin logo`,C.teal,12)+t(v.name,D(60,C.navy))+t(v.idea,Pp(16,C.ink,500,{lineHeight:1.42}))+
  div({position:'relative',height:210,background:C.white,border:`1px solid ${C.line}`,flexShrink:0},v.solo())+
  div({display:'flex',flexDirection:'column',gap:8},cap('Regla',C.muted,10.5)+list(v.rule))+block('Con lo publicado',v.pub)+block('Por qué se reconocería sin logo',v.lift)+block('Riesgo',v.risk));
 const R=560;
 const right=tile(R,86,300,375,'Post 4:5',v.post())+tile(R+330,86,460,259,'Slide 16:9',v.slide())+tile(R+330,397,460,259,'Muro de oficina',v.wall())+
  tile(R+820,86,200,280,'Credencial',v.badge())+tile(R,517,220,312,'Cuaderno',v.notebook())+tile(R+250,688,300,262,'Taza',v.mug())+tile(R+580,688,440,150,'Stickers',v.sticker())+
  tile(R+820,397,200,260,'Pin',abs(0,0,200,260,{display:'flex',alignItems:'center',justifyContent:'center'},div({width:120,height:120,borderRadius:'50%',background:C.navy,position:'relative',overflow:'hidden'},pinContent(v))));
 return page(`Vía ${v.n} · ${v.name}`,1600,1000,div({width:1600,height:1000,position:'relative',background:C.paper,overflow:'hidden'},left+right));}
function pinContent(v){switch(v.n){
 case 1:return abs(0,0,120,120,{display:'flex',alignItems:'center',justifyContent:'center'},dots(16));
 case 2:return abs(36,36,48,48,{borderRadius:'50%',background:C.teal});
 case 3:return abs(60,0,60,120,{background:C.blue})+abs(14,36,110,50,{},t('Sí.',D(46,C.white,{textShadow:gap(C.navy,3)})));
 case 4:return angBand(120,120,.58,C.blue);
 case 5:return crop(30,34,60,52,C.soft,8)+abs(38,44,60,40,{},t('v07',Pp(18,C.white,600)));
 case 6:return abs(0,0,120,120,{display:'flex',alignItems:'center',justifyContent:'center'},t('—',D(64,C.teal)));}}

function page(title,w,h,body){return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>${title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&amp;family=Poppins:wght@300;400;500;600&amp;display=swap">
<style>
body{margin:0;font-family:'Poppins',sans-serif;color:${C.ink};background:${C.paper}}
a{color:${C.blue}}a:hover{color:${C.navy}}
</style>
</helmet>
${body}
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{"$preview":{"width":${w},"height":${h}}}'>
class Component extends DCLogic {
renderVals() { return {}; }
}
</script>
</body>
</html>
`;}

// ---------- Punto de partida ----------
function brief(){
 const anat=[['Esfera','punto final · presencia'],['Tres ventanas','ritmo · «en curso»'],['Cruce con aire','nada se funde'],['Inclinación','el ángulo del movimiento']];
 const body=div({width:1600,height:1000,position:'relative',background:C.paper,overflow:'hidden'},
  abs(64,64,700,60,{},cap('Punto de partida',C.teal,12))+abs(64,96,760,140,{},t('Una línea que se reconozca como Efeonce sin el logo.',D(52,C.navy)))+
  abs(64,250,700,120,{},t('No es un set de tazas ni una extensión de los ads. Es un lenguaje propio que funcione en cualquier superficie y contexto, que ordene y amplíe lo que ya se publica, y cuyo reconocimiento se pueda medir.',Pp(17,C.ink,400,{lineHeight:1.5})))+
  abs(64,410,330,16,{},cap('Lo que funcionó',C.muted,10.5))+abs(64,436,330,330,{background:C.white,border:`1px solid ${C.line}`,display:'flex',alignItems:'center',justifyContent:'center'},`<img src="${MUGIMG}" alt="Taza blanca con la palabra Hacer. en navy" style="width: 300px; height: 300px; object-fit: contain">`)+
  abs(64,782,330,80,{},t('Palabra grande que usa la superficie, logo chico abajo y con aire.',Pp(13.5,C.ink)))+
  abs(430,410,330,16,{},cap('Lo publicado',C.muted,10.5))+abs(430,436,264,330,{background:C.navy,overflow:'hidden'},`<img src="${AD}" alt="Anuncio publicado de Efeonce con titular No estabas y caja de selección" style="width: 264px; height: 330px; object-fit: cover">`)+
  abs(430,782,300,80,{},t('Tres voces, cierre con punto, caja de selección con cursores, foto documental.',Pp(13.5,C.ink)))+
  abs(840,64,700,16,{},cap('Anatomía de la nave: de dónde salen los recursos',C.muted,10.5))+
  abs(840,96,696,470,{background:C.white,border:`1px solid ${C.line}`},`<img src="${ISO}" alt="Isotipo de Efeonce: nave, órbita, esfera y tres ventanas" style="position: absolute; left: 150px; top: 60px; width: 400px; height: 284px">`+
   abs(24,380,648,70,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:16},anat.map(([a,b])=>div({},t(a,Pp(13,C.navy,600))+t(b,Pp(11.5,C.muted)))).join('')))+
  abs(840,600,696,300,{display:'flex',flexDirection:'column',gap:14},cap('Cómo leer las seis vías',C.muted,10.5)+
   t('Cada vía es un lenguaje completo, no un adorno. Todas usan el mismo copy, los mismos fondos y las mismas superficies, y ninguna lleva logo: lo único que cambia es el recurso de marca.',Pp(14.5,C.ink,400,{lineHeight:1.5}))+
   t('Cuatro salen de la anatomía de la nave (1–4); dos, del Why y del comportamiento (5–6). No son excluyentes: la línea final puede combinar un activo principal con uno de apoyo.',Pp(14.5,C.ink,400,{lineHeight:1.5}))+
   t('Paleta común: navy #023C70 · azul #0375DB · teal #12AFA2 (acento oficial) · papel #F7F8F6. Bricolage Grotesque + Poppins.',Pp(12.5,C.muted))));
 return page('Punto de partida',1600,1000,body);}

const files={'Main.dc.html':brief()};
const order=['ventanas','esfera','cruce','angulo','oficio','conversacion'];
order.forEach(k=>{files[`Via-${V[k].n}-${k}.dc.html`]=routeBoard(V[k]);});
for(const[f,s]of Object.entries(files))writeFileSync(OUT+f,s);
const boards={'Main.dc.html':{x:0,y:0,w:1600,h:1000,title:'Punto de partida'}};
order.forEach((k,i)=>{const row=Math.floor(i/3),col=i%3;boards[`Via-${V[k].n}-${k}.dc.html`]={x:col*1680,y:1400+row*1120,w:1600,h:1000,title:`Vía ${V[k].n} · ${V[k].name}`};});
const canvas={v:3,createdOnFiles:{v:1,at:new Date().toISOString().replace(/\.\d+Z$/,'Z')},title:'Línea gráfica Efeonce — exploración',launch:{view:'canvas'},pages:[],boards,order:Object.keys(boards),
 notes:{t1:{x:0,y:1120,text:'Seis vías · mismo copy, mismos fondos, sin logo',kind:'title1',maxW:4960},
  s1:{x:1720,y:0,w:420,maxH:560,fill:'teal',text:'Para revisar: marca en cada vía qué te dice «Efeonce» y qué no. Puedes elegir un activo principal y uno de apoyo; la siguiente ronda los combina y los prueba en más contextos (señalética, video, producto, campaña con foto).\n\nNinguna vía está aprobada. El reconocimiento sin logo se mide después con una prueba de atribución (n ≥ 100, con distractores).'}},
 designSystems:[]};
writeFileSync(OUT+'canvas.json',JSON.stringify(canvas,null,1));
console.log(Object.keys(files).join('\n'));
