// Ronda 2 · «La esfera»: profundización de esfera + oficio a la vista + conversación.
// Selección y cursores: contrato AXIS efeonce.collaboration-selection, resueltos con resolveCollaborationSelectionIntent
// y pintados con el painter oficial de Greenhouse (renderCollaborationSelection). Nada de cursores propios.
import {writeFileSync,readFileSync} from 'node:fs';import {createRequire} from 'node:module';
const REPO='/Users/jreye/Documents/greenhouse-eo';const require=createRequire(REPO+'/package.json');
const fontkit=require('fontkit');
const {resolveCollaborationSelectionIntent}=await import(REPO+'/node_modules/@efeoncepro/axis-ui-contracts/dist/index.js');
const {renderCollaborationSelection}=await import(REPO+'/scripts/creative/layout-compiler/axis-advertising.mjs');
const OUT=new URL('./project/',import.meta.url).pathname;
const IMG={iso:'/_blob/44e2f55cdc712e2ff3ed0dfdd74758f7',conv:'/_blob/dda1be0e55a18a3a071201c5846c9b23',studio:'/_blob/a37f73a3fe897850f619b2f73ca85418',edit:'/_blob/4ba705bb72901fa5714a8d2122cfca51',L1:'/_blob/ab920786816bebbb40948fe11aced041',L2:'/_blob/b0b87928f3bc7d9b30076fe57fc639a3',L3:'/_blob/a802078ccecb1ff4203f524147dd971e',L4:'/_blob/319a5d7b13e308d7b77579ae00dc751a',L5:'/_blob/9e75185f4b3502abd58f254f7b116f22',L6:'/_blob/dc8ff8c92a03a63cc9e48a2be4dcb4af',L7:'/_blob/303e37011bac675577175bc1f70f5cf8',L8:'/_blob/2bf388593f0c590d7d71927e7bf25940',...JSON.parse(readFileSync(new URL('./mugs.json',import.meta.url),'utf8'))};
const BANCO=[['1 · manos',IMG.L1,'Manos ajustando una curva de color'],['2 · variantes',IMG.L2,'Doce pruebas de una etiqueta; una mano retira la elegida'],['3 · sombra',IMG.L3,'Sombra de la mano poniendo un imán lima sobre la órbita'],['4 · quien sostiene',IMG.L4,'Camarógrafo revisa la toma en el monitor'],['5 · cenital',IMG.L5,'Informe impreso con una pestaña lima en la línea que sube'],['6 · escucha',IMG.L6,'Una mujer escucha al cliente en una llamada'],['7 · proyección',IMG.L7,'La pieza aprobada proyectada sobre ladrillo'],['8 · ausencia',IMG.L8,'Mesa al final del ciclo con la pieza impresa']];

// ---------- Tokens ----------
const C={dark:'#001A33',navy:'#023C70',blue:'#0375DB',teal:'#36C8BF',white:'#FFFFFF',paper:'#F7F8F6',wall:'#E4E6E3',floor:'#C9CDC9',ink:'#00284D',muted:'#5F5A69',soft:'#CFE4FA',line:'#D3D8DD',tile:'#EDEFEE',guideDark:'rgba(207,228,250,0.34)',guideLight:'#B7C4D1',red:'#B3261E',tealDark:'#0E8C82',ink2:'#091951'};
// URL bubble oficial (asset de marca): siempre que aparezca la URL, va la burbuja, nunca el texto. Tratamiento
// canónico del catálogo: el SVG es gris y `mix-blend-mode: luminosity` lo adapta al fondo. Como el canvas y los
// visores no garantizan la fusión, se usa el resultado horneado (fórmula W3C): claro #848484 · sobre navy #6F89A2.
const URL_BUBBLE='/_blob/25fe50ecf373a63012616c56fb92149b',URL_BUBBLE_DARK='/_blob/a9c61255a36d2a15dc5cdcba67b7b7b7';
const urlB=(h,o='',dark=false)=>`<img src="${dark?URL_BUBBLE_DARK:URL_BUBBLE}" alt="efeoncepro.com" style="height: ${h}px; width: auto; vertical-align: middle; ${o}">`;
const BR="'Bricolage Grotesque', sans-serif",PO="'Poppins', sans-serif";
const TRK=-0.035,SPH=0.2; // tracking del dominante (em) · diámetro de la esfera (em)
const GAPS={r:-0.02,a:0.03,s:0.03,o:0.035,n:0.035,e:0.035,í:0.03,i:0.03,z:0.03,d:0.035,x:0.02,t:0.0,default:0.03};
const sphereGap=w=>GAPS[w.slice(-1)]??GAPS.default;

// ---------- Medición (fuentes reales) ----------
const brFile=fontkit.openSync(REPO+'/src/assets/fonts/BricolageGrotesque-Variable.ttf');const brCache={};
const br=size=>{const o=Math.max(12,Math.min(96,Math.round(size)));return brCache[o]??=brFile.getVariation({wght:760,opsz:o,wdth:100});};
const popB=fontkit.openSync('/Users/jreye/Library/Fonts/Poppins-Bold.ttf');
const measureLabel=(v,size)=>{const r=popB.layout(v);return r.positions.reduce((s,p)=>s+p.xAdvance,0)*size/popB.unitsPerEm;};
// Caja pintada del dominante con esfera, en coordenadas de la superficie. top = borde superior del div (line-height 1).
function domBounds(txt,size,x,top){const f=br(size),sc=size/1000,run=f.layout(txt);let dx=0,minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
 run.glyphs.forEach((g,i)=>{const b=g.bbox;if(b.maxX>b.minX){minX=Math.min(minX,dx+b.minX*sc);maxX=Math.max(maxX,dx+b.maxX*sc);minY=Math.min(minY,b.minY);maxY=Math.max(maxY,b.maxY);}dx+=run.positions[i].xAdvance*sc+TRK*size;});
 const base=top+0.83*size;const sx=dx+sphereGap(txt)*size;maxX=Math.max(maxX,sx+SPH*size);
 return {left:x+minX,right:x+maxX,top:base-Math.max(maxY*sc,SPH*size),bottom:base-Math.min(minY,-13)*sc};}

function plainBounds(txt,size,x,top){const f=br(size),sc=size/1000,run=f.layout(txt);let dx=0,minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
 run.glyphs.forEach((g,i)=>{const b=g.bbox;if(b.maxX>b.minX){minX=Math.min(minX,dx+b.minX*sc);maxX=Math.max(maxX,dx+b.maxX*sc);minY=Math.min(minY,b.minY);maxY=Math.max(maxY,b.maxY);}dx+=run.positions[i].xAdvance*sc+TRK*size;});
 const base=top+0.83*size;return {left:x+minX,right:x+maxX,top:base-maxY*sc,bottom:base-Math.min(minY,0)*sc,width:dx};}
// Palabra centrada en una superficie, con su caja medida.
const centered=(txt,size,W,top,color)=>{const w=plainBounds(txt,size,0,top).width,x=(W-w)/2;return {html:abs(x,top,null,null,{},domPlain(txt,size,color)),bounds:plainBounds(txt,size,x,top),x};};
// ---------- Markup ----------
const st=o=>Object.entries(o).map(([k,v])=>`${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}: ${typeof v==='number'&&!/opacity|weight|index|flex|line|scale/i.test(k)?+v.toFixed(2)+'px':v}`).join('; ');
const div=(o,inner='')=>`<div style="${st(o)}">${inner}</div>`;
const abs=(x,y,w,h,o={},inner='')=>div({position:'absolute',left:x,top:y,...(w!=null?{width:w}:{}),...(h!=null?{height:h}:{}),...o},inner);
const sphere=(color=C.teal)=>globalThis.__DIST?'':`<span style="display: inline-block; width: ${SPH}em; height: ${SPH}em; border-radius: 50%; background: ${color}; vertical-align: baseline"></span>`;
const ring=(color=C.teal)=>globalThis.__DIST?'':`<span style="display: inline-block; width: 0.62em; height: 0.62em; border-radius: 50%; border: 0.1em solid ${color}; box-sizing: border-box; margin-right: 0.42em; vertical-align: -0.04em"></span>`;
// Dominante: texto + esfera con espaciado óptico. Bricolage, line-height 1.
const dom=(txt,size,color,oo={})=>{const {sphereColor,...o}=oo;return div({fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:1,letterSpacing:TRK+'em',color,whiteSpace:'nowrap',...o},txt+`<span style="display: inline-block; width: ${sphereGap(txt)}em"></span>`+sphere(sphereColor??(color===C.white?C.teal:C.tealDark)));};
const domPlain=(txt,size,color,o={})=>div({fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:1,letterSpacing:TRK+'em',color,whiteSpace:'nowrap',...o},txt);
const q=(txt,size,color,oo={})=>{const {ringColor,...o}=oo;return div({fontFamily:PO,fontWeight:300,fontSize:size,lineHeight:1.2,color,...o},ring(ringColor??((color===C.soft||color===C.white)?C.teal:C.tealDark))+txt);};
const p=(txt,size,color,w=400,o={})=>div({fontFamily:PO,fontWeight:w,fontSize:size,lineHeight:1.4,color,...o},txt);
const cap=(txt,color=C.muted,size=11,o={})=>p(txt,size,color,500,{letterSpacing:'0.14em',textTransform:'uppercase',lineHeight:1.2,...o});
const b=s=>`<b style="font-weight: 600">${s}</b>`;
const guideV=(x,h,c,y=0)=>abs(x,y,1,h,{background:c});const guideH=(y,w,c,x=0)=>abs(x,y,w,1,{background:c});
const crop=(x,y,w,h,c,L,o=6)=>[[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].map(([cx,cy,sx,sy])=>abs(sx>0?cx-L-o:cx+o,cy,L,1,{background:c})+abs(cx,sy>0?cy-L-o:cy+o,1,L,{background:c})).join('');
// Superficie nativa escalada a su tile.
const surface=(W,H,s,inner,bg=C.white)=>div({position:'relative',width:W*s,height:H*s,overflow:'hidden',flexShrink:0},div({position:'absolute',left:0,top:0,width:W,height:H,background:bg,transform:`scale(${s})`,transformOrigin:'0 0',overflow:'hidden'},inner));
// Capa AXIS: intent → manifest → painter oficial. targetBounds en coords de la superficie.
function axis(W,H,intent,bounds,presentation){const m=resolveCollaborationSelectionIntent(intent);const r=renderCollaborationSelection({manifest:m,targetBounds:bounds,canvas:{width:W,height:H},measureLabel,presentation});
 return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; left: 0; top: 0; overflow: visible" aria-hidden="true">${r.underlay}${r.overlay}</svg>`;}
const who=(id,label,kind,anchor,action='select')=>({id,kind:'collaborator',targetId:'t',anchor,action,label,participantKind:kind});
const moving=(id,label,kind,region,direction='north-west')=>({id,kind:'collaborator',state:'moving',canvasRegion:region,direction,action:'move',label,participantKind:kind});
const local=(anchor,action='select')=>({id:'local',kind:'local',targetId:'t',anchor,orientation:'screen-fixed',action});
const sel=(variant,cursors,o={})=>({targetId:'t',targetKind:o.kind??'text',variant,padding:o.padding??'standard',overlay:o.overlay??'subtle',cursors});
// Bloque de conversación completo en una superficie: pregunta (anillo), respuesta (esfera), evidencia.
function convo({x,top,qs,ds,ink,sub,Q,A,R,maxW,rExtra=0,qExtra=0,sph,ringC}){if(maxW){const w=domBounds(A,ds,0,0);const ww=w.right-w.left;if(ww>maxW)ds=ds*maxW/ww;}const qh=qs*1.2,gap1=qs*.9+qExtra,dTop=top+qh+gap1;let o=abs(x,top,maxW,null,{},q(Q,qs,sub,(ringC||sph)?{ringColor:ringC||sph}:{}))+abs(x,dTop,null,null,{},dom(A,ds,ink,sph?{sphereColor:sph}:{}));
 const bnd=domBounds(A,ds,x,dTop);if(R)o+=abs(x,dTop+ds*1.0+qs*.8+rExtra,maxW,null,{},p(R,qs,sub));return {html:o,bounds:bnd};}
// Lámina
const H1=(t,o={})=>div({fontFamily:BR,fontWeight:760,fontSize:56,lineHeight:1,letterSpacing:TRK+'em',color:C.navy,...o},t);
// Export de elementos (EXPORT=1): cada lámina registra sus piezas para reconstruirlas como HTML nativo en AXIS.
const __EXP={on:!!process.env.EXPORT,boards:[],buf:[],depth:0,label:''};
const REC=(o)=>{if(__EXP.on&&__EXP.depth===0)__EXP.buf.push({label:__EXP.label,...o});};
// Bloque compuesto directo en la lámina: se registra entero (con su alto natural si no lo tiene fijo).
const RB=(x,y,w,h,o={},inner='')=>{REC({type:'block',html:div({position:'relative',width:w,...(h!=null?{height:h}:{}),...o},inner),W:w,H:h,dw:w});return abs(x,y,w,h,o,inner);};
const board=(title,inner,W=1600,H=1000)=>{if(__EXP.on){__EXP.boards.push({title,items:__EXP.buf});__EXP.buf=[];__EXP.label='';}return page(title,W,H,div({width:W,height:H,position:'relative',background:C.paper,overflow:'hidden'},inner));};
const head=(kicker,title,lede)=>(REC({type:'head',kicker,title,lede}),abs(64,56,1472,null,{display:'flex',flexDirection:'column',gap:14},cap(kicker,C.navy,12)+H1(title)+(lede?p(lede,17,C.ink,400,{maxWidth:980,lineHeight:1.5}):'')));
const lab=(x,y,t)=>(__EXP.label=t,abs(x,y-24,1400,16,{},cap(t,C.muted,10.5,{whiteSpace:'nowrap'})));
const list=(items,size=14)=>items.map(r=>div({display:'flex',gap:10,alignItems:'flex-start'},div({width:7,height:7,borderRadius:'50%',background:C.dark,marginTop:size*.55,flexShrink:0})+p(r,size,C.ink))).join('');
const col=(x,y,w,h,title,body)=>(REC({type:'col',title,body,W:w,H:h}),abs(x,y,w,h,{display:'flex',flexDirection:'column',gap:8},cap(title,C.muted,10.5)+body));
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
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&amp;family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&amp;display=swap">
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

// ================= Superficies reutilizables (nativas) =================
const S={};
// Post 4:5 sobre foto: conversación de dos personas.
S.adConv=()=>{const W=1080,H=1350,c=convo({x:84,top:56,qs:34,ds:150,ink:C.white,sub:C.soft,Q:'¿Quién escribe el próximo brief?',A:'Los dos',R:'Tu equipo y el nuestro, en la misma pantalla.',maxW:900,rExtra:56,qExtra:64});
 return {W,H,bg:C.dark,html:`<img src="${IMG.L6}" alt="Una mujer escucha al cliente en una llamada, con la libreta y el lápiz sin usar" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover">`+c.html+axis(W,H,sel('eight-handles',[who('c1','Tu equipo','department','top-end'),who('c2','Estrategia','role','bottom-end','resize')]),c.bounds,{collaboratorScale:1.4})};};
// Post 4:5 sobre foto: la selección cae sobre el objeto (el frasco en pantalla).
S.adEdit=()=>{const W=1080,H=1350,c=convo({x:84,top:96,qs:34,ds:150,ink:C.white,sub:C.soft,Q:'¿Cuál sale al aire?',A:'Esta',maxW:900});
 return {W,H,bg:C.dark,html:`<img src="${IMG.L1}" alt="Manos ajustando la curva de color de una pieza en la mesa de corrección" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover">`+c.html+
  axis(W,H,sel('four-corners',[local('bottom-end','point'),who('c1','Dirección de arte','role','top-start')],{kind:'object',overlay:'none'}),{left:466,top:452,right:628,bottom:734},{collaboratorScale:1.4})};};
// Story 9:16 tipográfica con oficio.
S.story=()=>{const W=1080,H=1920,c=convo({x:96,top:620,qs:40,ds:190,ink:C.white,sub:C.soft,Q:'¿Qué aprendimos este ciclo?',A:'Tres cosas',R:`Te las contamos en ${b('60 segundos')}.`,maxW:880});
 return {W,H,bg:C.dark,html:guideV(96,H,C.guideDark)+guideH(620+48+36+190*.83,W,C.guideDark)+crop(60,60,W-120,H-120,C.soft,40,10)+c.html+abs(96,H-190,880,null,{},p('v07 · revisado con el equipo de [CLIENTE]',26,C.soft,500))};};
// LinkedIn 1200 × 627 sobre foto horizontal.
S.linkedin=()=>{const W=1200,H=627,c=convo({x:64,top:150,qs:24,ds:96,ink:C.white,sub:C.soft,Q:'¿Cómo va tu campaña?',A:'En vivo',R:'Entra a tu operación cuando quieras.',maxW:520});
 return {W,H,bg:C.dark,html:`<img src="${IMG.L4}" alt="Camarógrafo revisa la toma en el monitor mientras la barista trabaja al fondo" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: 60% 40%">`+c.html+
  axis(W,H,sel('eight-handles',[moving('m1','Tu equipo','department','lower-end','north-west')],{overlay:'subtle'}),c.bounds,{collaboratorScale:1.2})};};
// Slides 1920 × 1080
S.slideCover=()=>{const W=1920,H=1080,c=convo({x:140,top:330,qs:40,ds:200,ink:C.white,sub:C.soft,Q:'¿Qué cambió este trimestre?',A:'Lo que medimos',maxW:1500});
 return {W,H,bg:C.dark,html:crop(80,80,W-160,H-160,C.soft,44,10)+abs(140,150,1200,null,{},cap('Revisión trimestral · [CLIENTE] · [FECHA]',C.soft,22))+c.html};};
S.slideSection=()=>{const W=1920,H=1080;return {W,H,bg:C.white,html:guideV(140,H,C.guideLight)+abs(140,250,null,null,{},domPlain('02',360,C.navy))+abs(140,680,null,null,{},dom('Lo que probamos',120,C.navy))+abs(140,860,900,null,{},p('Cuatro pruebas, dos aprendizajes y una decisión pendiente.',30,C.ink))};};
S.slideContent=()=>{const W=1920,H=1080,c=convo({x:140,top:200,qs:34,ds:110,ink:C.navy,sub:C.ink,Q:'¿Qué funcionó?',A:'Lo que repetimos',R:'[EVIDENCIA: métrica, fuente y período]',maxW:760});
 const ch={left:1010,top:210,right:1780,bottom:820};
 return {W,H,bg:C.white,html:c.html+abs(ch.left,ch.top,ch.right-ch.left,ch.bottom-ch.top,{background:'#F1F4F7',border:`1px solid ${C.line}`,boxSizing:'border-box',display:'flex',alignItems:'center',justifyContent:'center'},cap('[Gráfico con datos reales]',C.muted,20))+
  axis(W,H,sel('four-corners',[who('c1','Datos','department','top-start')],{kind:'object',overlay:'none'}),ch,{collaboratorScale:1.3})+abs(140,930,1500,null,{},p('v03 · revisó [NOMBRE], equipo de datos',22,C.muted,500))+guideH(900,W-280,C.line,140)};};
S.slideClose=()=>{const W=1920,H=1080,c=convo({x:140,top:230,qs:40,ds:170,ink:C.white,sub:C.soft,Q:'¿Qué sigue?',A:'Decidir juntos',maxW:1500});
 return {W,H,bg:C.dark,html:c.html+abs(140,640,1600,null,{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:48},['[DECISIÓN 1]','[DECISIÓN 2]','[DECISIÓN 3]'].map((d,i)=>div({borderTop:`1px solid ${C.guideDark}`,paddingTop:24},p(`0${i+1}`,26,C.soft,500)+p(d,34,C.white,500,{marginTop:8}))).join(''))};};
// Espacio: elevaciones 1920 × 1080 (1 m ≈ 400 px).
S.reception=()=>{const W=1920,H=1080,fl=H-110;return {W,H,bg:C.wall,html:abs(0,fl,W,110,{background:C.floor})+guideV(300,fl,'#9FB0C0')+abs(300,330,null,null,{},dom('Hacer',330,C.navy))};};
S.meeting=()=>{const W=1920,H=1080,fl=H-110,glassL=160,glassR=1500;let dotsRow='';for(let x=glassL+34;x<glassR-24;x+=48)dotsRow+=abs(x,fl-520,20,20,{borderRadius:'50%',background:C.tealDark});
 return {W,H,bg:C.wall,html:abs(0,fl,W,110,{background:C.floor})+abs(glassL,120,glassR-glassL,fl-120,{background:'rgba(207,228,250,0.35)',border:'10px solid #B9C1C8',boxSizing:'border-box'})+abs(900,120,10,fl-120,{background:'#B9C1C8'})+dotsRow+
  abs(1560,330,300,190,{background:C.white,padding:26,boxSizing:'border-box',borderRadius:6},cap('Sala 02',C.muted,18)+div({display:'flex',alignItems:'center',gap:14,marginTop:16},div({width:26,height:26,borderRadius:'50%',background:C.tealDark})+p('En sesión',34,C.navy,600))+div({display:'flex',alignItems:'center',gap:14,marginTop:8},div({width:22,height:22,borderRadius:'50%',border:`4px solid ${C.tealDark}`,boxSizing:'border-box'})+p('Libre 16:00',22,C.muted,400)))};};
S.whiteboard=()=>{const W=1920,H=1080,fl=H-110;return {W,H,bg:C.wall,html:abs(0,fl,W,110,{background:C.floor})+abs(180,110,1560,760,{background:C.white,border:`12px solid ${C.line}`,boxSizing:'border-box'},abs(70,70,1300,null,{},q('¿Qué aprendimos en este ciclo?',64,C.ink))+crop(70,200,1380,440,C.guideLight,40,10))};};
// Objetos
S.notebook=()=>{const W=740,H=1050;return {W,H,bg:C.dark,html:crop(44,44,W-88,H-88,C.soft,26,8)+guideV(90,H,C.guideDark)+abs(90,760,560,null,{},dom('Ideas',120,C.white))+abs(90,930,560,null,{},p('Cuaderno de ciclo · v01',20,C.soft,500))};};
S.notebookIn=()=>{const W=740,H=1050;let l='';for(let i=0;i<12;i++)l+=guideH(360+i*52,W-180,'#D5DCE3',90);return {W,H,bg:C.white,html:abs(90,110,560,null,{},q('¿Qué probamos hoy?',34,C.ink))+abs(90,190,560,null,{},q('¿Qué aprendimos?',34,C.ink,{marginTop:18}))+l};};
S.badge=()=>{const W=600,H=900;return {W,H,bg:C.white,html:abs(W/2-60,40,120,22,{borderRadius:11,background:C.tile})+guideV(64,H,C.guideLight)+abs(64,470,480,null,{},q('¿Quién eres?',28,C.muted))+abs(64,540,null,null,{},dom('Nexa',140,C.navy))+abs(64,720,480,null,{},p(b('Estrategia')+' · Equipo',26,C.ink))};};
S.cardFront=()=>{const W=850,H=550;return {W,H,bg:C.dark,html:abs(W-110,H-110,40,40,{borderRadius:'50%',background:C.teal})};};
S.cardBack=()=>{const W=850,H=550;return {W,H,bg:C.white,html:abs(64,90,700,null,{},dom('[Nombre]',74,C.navy))+abs(64,200,700,null,{},p('[Cargo]',26,C.ink,500))+guideH(330,W-128,C.line,64)+abs(64,360,720,null,{},p('[correo] · [teléfono]<br>'+urlB(26,'margin-top: 6px'),22,C.muted,400))};};
S.tote=()=>{const W=800,H=900;return {W,H,bg:'#EDE8DF',html:abs(90,380,null,null,{},dom('Hacer',180,C.navy))};};
S.stickers=()=>{const W=1200,H=420;return {W,H,bg:C.tile,html:abs(40,60,300,300,{borderRadius:'50%',background:C.teal})+abs(400,60,300,300,{borderRadius:'50%',border:`36px solid ${C.teal}`,boxSizing:'border-box'})+abs(760,70,400,280,{background:C.dark,borderRadius:40,display:'flex',alignItems:'center',justifyContent:'center'},dom('Sí',150,C.white))};};

const tileOf=(fn,s)=>{__EXP.depth++;const x=fn();__EXP.depth--;REC({type:'surface',W:x.W,H:x.H,bg:x.bg,html:x.html,dw:x.W*s});return surface(x.W,x.H,s,x.html,x.bg);};
const place=(x,y,label,fn,s)=>lab(x,y,label)+abs(x,y,null,null,{outline:`1px solid ${C.line}`},tileOf(fn,s));

// ================= Láminas =================
const boards={};
// 01 · Sistema
boards['R2-01-sistema.dc.html']=board('Sistema',
 head('A1 · Sistema','Una esfera, el oficio a la vista y dos voces.','Tres capas con roles distintos. La esfera es el activo que se debe reconocer sin logo; el oficio es cómo se comportan las piezas; la conversación es cómo hablan. Lo publicado queda ordenado dentro de este sistema.')+
 abs(64,250,1472,330,{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:24},
  [['1 · Activo','La esfera',`La esfera de la nave, en teal. Cierra cada afirmación, marca lo abierto como anillo y firma cuando no hay logo.`,abs(40,70,null,null,{},dom('Hacer',120,C.navy))],
   ['2 · Comportamiento','Oficio a la vista','Guías, marcas de corte, notas de versión y la selección con cursores de AXIS. El trabajo se ve mientras ocurre.',(()=>{const c=centered('Idea',230,1080,230,C.navy);return surface(1080,700,.35,guideV(c.bounds.left,700,'#8FA3B8')+crop(c.bounds.left-120,c.bounds.top-110,c.bounds.right-c.bounds.left+240,c.bounds.bottom-c.bounds.top+220,'#8FA3B8',40,10)+c.html+axis(1080,700,sel('eight-handles',[local('bottom-end'),who('c1','Estrategia','role','top-start')]),c.bounds,{collaboratorScale:1.6}),C.white);})()],
   ['3 · Voz','Conversación','Siempre dos voces: una pregunta real, con anillo, y una respuesta corta que cierra con la esfera.',abs(36,60,null,null,{},q('¿Lo medimos?',26,C.ink))+abs(36,110,null,null,{},dom('Siempre',96,C.navy))]]
   .map(([k,n,t,vis])=>div({background:C.white,border:`1px solid ${C.line}`,display:'flex',flexDirection:'column'},div({position:'relative',height:245,overflow:'hidden',borderBottom:`1px solid ${C.line}`},vis)+div({padding:'18px 22px'},cap(k,C.teal,10.5)+p(`${b(n)}. ${t}`,13.5,C.ink,400,{marginTop:6})))).join(''))+
 col(64,640,460,300,'Invariable',list(['El acento existe sólo como esfera o anillo: teal para Efeonce (#36C8BF sobre oscuro, #0E8C82 sobre claro); cada producto, el suyo.','La esfera es un círculo perfecto, plano, sin brillo ni volumen.','Una esfera de cierre por mensaje.','Selección y cursores: siempre los de AXIS (contrato efeonce.collaboration-selection).','Bricolage Grotesque para la respuesta; Poppins para pregunta, evidencia y notas.'],13.5))+
 col(560,640,440,300,'Variable',list(['Copy, foto, formato y campo de color.','Cuántas herramientas del oficio aparecen (máximo dos por pieza).','Variante de selección: eight-handles en campaña, four-corners en superficies tranquilas.','El logo: se agrega en uso real; no es necesario para reconocer la pieza.'],13.5))+
 col(1040,640,500,300,'Proporción de color',div({display:'flex',height:56,marginTop:6},div({flex:55,background:C.dark})+div({flex:30,background:C.paper,border:`1px solid ${C.line}`})+div({flex:12,background:C.blue})+div({flex:3,background:C.teal}))+
  div({display:'flex',justifyContent:'space-between',marginTop:8},p('Navy 55',12,C.ink,500)+p('Papel 30',12,C.ink,500)+p('Azul 12',12,C.ink,500)+p('Teal ≤ 3',12,C.ink,500))+p('La escasez del teal es lo que lo vuelve señal. Si aparece en todo, deja de reconocerse.',13.5,C.ink,400,{marginTop:14})));

// 02 · Construcción de la esfera
{const specSize=220,x0=660,top0=240,bnd=domBounds('Hacer',specSize,x0,top0),base=top0+.83*specSize,capTop=base-.66*specSize,sph=SPH*specSize;
 const words=['Hacer','Ideas','Medir','Nexa','Vamos','Sí'];
 const don=(label,vis)=>div({display:'flex',flexDirection:'column',gap:8},div({position:'relative',height:96,background:C.white,border:`1px solid ${C.line}`,overflow:'hidden'},vis+`<svg width="28" height="28" viewBox="0 0 28 28" style="position: absolute; right: 8px; top: 8px" aria-hidden="true"><path d="M6 6 L22 22 M22 6 L6 22" stroke="${C.red}" stroke-width="3" stroke-linecap="round"></path></svg>`)+p(label,12,C.ink));
 const w0=(t,o={})=>abs(20,26,null,null,{},div({fontFamily:BR,fontWeight:760,fontSize:44,lineHeight:1,letterSpacing:TRK+'em',color:C.navy,whiteSpace:'nowrap',...o},t));
 boards['R2-02-esfera.dc.html']=board('La esfera · construcción',
  head('A2 · La esfera','De la nave al punto final.')+
  RB(64,190,520,300,{background:C.white,border:`1px solid ${C.line}`},`<img src="${IMG.iso}" alt="Isotipo de Efeonce" style="position: absolute; left: 90px; top: 40px; width: 300px; height: 213px">`+abs(206,31.5,68,68,{borderRadius:'50%',border:`3px solid ${C.teal}`,boxSizing:'border-box'})+abs(24,262,470,null,{},p('La esfera mide el 24 % del alto del isotipo. Se toma entera, sin la órbita.',13,C.ink)))+
  RB(620,190,916,300,{background:C.white,border:`1px solid ${C.line}`,overflow:'hidden'},
   guideH(base-190,916,'#9FB2C4')+guideH(capTop-190,916,C.guideLight)+abs(x0-620,top0-190,null,null,{},dom('Hacer',specSize,C.navy))+
   abs(bnd.right-sph-620-4,base-190+12,sph+8,null,{},p('0,20 em',12,C.teal,600,{textAlign:'center'}))+abs(700,base-190-20,200,null,{},p('línea base',11,C.muted,400,{textAlign:'right'}))+abs(700,capTop-190-20,200,null,{},p('altura de mayúscula',11,C.muted,400,{textAlign:'right'})))+
  col(620,510,450,200,'Regla de tamaño',list(['Diámetro = 0,20 em del dominante (el punto tipográfico mide 0,197 em).','Apoyada en la línea base, sin superar la altura de x.','Mínimo: 4 px en pantalla, 1,5 mm impresa. Bajo eso, se omite.','Dos tintas: #36C8BF sobre oscuro (8,5:1) y #0E8C82 sobre claro (3,9:1); el teal claro sobre blanco da 2,1:1 y no alcanza.']))+
  col(1100,510,436,200,'Espaciado óptico',list(['Después de r: −0,02 em (el brazo deja aire).','Después de a, s, í, z: 0,03 em.','Después de o, n, e, d: 0,035 em (curvas y astas).','Sola: área de respeto de 2 diámetros.']))+
  lab(64,540,'Espaciado aplicado')+RB(64,540,520,170,{background:C.white,border:`1px solid ${C.line}`,display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',alignItems:'center',justifyItems:'start',padding:'18px 24px',boxSizing:'border-box',rowGap:14},words.map(w=>dom(w,40,C.navy)).join(''))+
  lab(64,770,'No')+RB(64,770,1472,160,{display:'grid',gridTemplateColumns:'repeat(6, minmax(0, 1fr))',gap:16},
   don('Otro color de esfera',w0('Hacer'+`<span style="display: inline-block; width: 0.03em"></span>`+sphere('#FF6500')))+
   don('Volumen, brillo o sombra',w0('Hacer'+`<span style="display: inline-block; width: 0.03em"></span><span style="display: inline-block; width: 0.2em; height: 0.2em; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #7FE3DA, #0B6F67); box-shadow: 0 3px 6px rgba(0,0,0,0.3)"></span>`))+
   don('Deformarla o agrandarla',w0('Hacer'+`<span style="display: inline-block; width: 0.03em"></span><span style="display: inline-block; width: 0.42em; height: 0.3em; border-radius: 50%; background: ${C.teal}"></span>`))+
   don('Repetirla como patrón',abs(14,14,160,70,{display:'flex',flexWrap:'wrap',gap:10},Array.from({length:14}).map(()=>div({width:14,height:14,borderRadius:'50%',background:C.teal})).join('')))+
   don('Reemplazar letras',w0('Hac●r'.replace('●',`<span style="display: inline-block; width: 0.5em; height: 0.5em; border-radius: 50%; background: ${C.teal}"></span>`)))+
   don('Teal en textos o fondos',abs(0,0,240,96,{background:C.teal},abs(20,26,null,null,{},domPlain('Hacer.',44,C.white))))));}

// 03 · Oficio a la vista (kit)
{const W=1080,H=700,s=.26;const panel=(label,inner,sc=s)=>div({display:'flex',flexDirection:'column',gap:8},surface(W,H,sc,inner,C.white)+p(label,12.5,C.ink));
 const cw=centered('Idea',220,W,200,C.navy),tgt=cw.bounds,word=cw.html,bl=200+.83*220;
 boards['R2-03-oficio.dc.html']=board('Oficio a la vista · kit',
  head('A4 · Oficio a la vista','El trabajo se ve mientras ocurre.','Cinco herramientas, máximo dos por pieza además de la esfera. Las guías y marcas van en azules; la selección y los cursores son los de AXIS, tal como se resuelven y pintan en producción.')+
  lab(64,270,'Herramientas')+RB(64,270,1472,300,{display:'grid',gridTemplateColumns:'repeat(5, minmax(0, 1fr))',gap:16},
   panel('Guía · 1 px, del borde del texto al borde del soporte',word+guideV(tgt.left,H,'#8FA3B8')+guideH(bl,W,'#8FA3B8'))+
   panel('Marcas de corte · brazo 3 % del lado corto',word+crop(tgt.left-90,tgt.top-80,tgt.right-tgt.left+180,tgt.bottom-tgt.top+160,C.navy,32,8))+
   panel('Selección AXIS · eight-handles (campaña)',word+axis(W,H,sel('eight-handles',[local('bottom-end')]),tgt))+
   panel('Selección AXIS · four-corners (superficies tranquilas)',word+axis(W,H,sel('four-corners',[who('c1','Estrategia','role','top-start')],{overlay:'none'}),tgt,{collaboratorScale:1.6}))+
   panel('Nota al margen · una por pieza, firmada',word+abs(tgt.left,500,900,null,{},p('v07 · revisado por [NOMBRE], estrategia',34,C.muted,500))))+
  lab(64,560,'Cursores AXIS: quién actúa y quién sólo está')+RB(64,560,1472,340,{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:16},
   panel('Local · screen-fixed, punta en el anclaje',word+axis(W,H,sel('open-brackets',[local('end-center','point')],{overlay:'none'}),tgt),.42)+
   panel('Multiplayer acting · el cuerpo fuera, la punta en la esquina',word+axis(W,H,sel('eight-handles',[who('c1','Tu equipo','department','top-start'),who('c2','Datos','department','bottom-end','resize')]),tgt,{collaboratorScale:1.6}),.42)+
   panel('Multiplayer moving · presencia en tránsito',word+axis(W,H,sel('four-corners',[moving('m1','Camila','person','lower-end')],{overlay:'none'}),tgt,{collaboratorScale:1.6}),.42)));}

// 04 · Conversación (voz)
{const pairs=[['¿Lo medimos?','Siempre'],['¿Quién decide?','Tú, con evidencia'],['¿Y si después lo hago yo?','Esa es la idea'],['¿Y el reporte del viernes?','Ya lo viste'],['¿Cuánto rindió?','Te mostramos todo'],['¿Cómo va?','En vivo'],['¿Dónde quedó lo aprendido?','En tu historial'],['¿Otra agencia más?','No. Un sistema'],['¿Y si lo probamos?','Hoy']];
 boards['R2-04-conversacion.dc.html']=board('Conversación · voz',
  head('A5 · Voz','Siempre hay dos voces.','La pregunta abre con el anillo: es la voz de quien trabaja con nosotros. La respuesta cierra con la esfera: la decisión. La evidencia, cuando existe, va debajo.')+
  lab(64,260,'Estructura')+RB(64,260,720,320,{background:C.dark,overflow:'hidden'},abs(56,56,620,null,{},q('¿Qué aprendimos este ciclo?',26,C.soft))+abs(56,112,null,null,{},dom('Tres cosas',110,C.white))+abs(56,250,620,null,{},p(`Te las contamos en ${b('60 segundos')}.`,20,C.soft)))+
  RB(820,260,716,320,{display:'flex',flexDirection:'column',gap:14},
   div({display:'grid',gridTemplateColumns:'150px 1fr',rowGap:12,columnGap:16},[['Pregunta','Poppins Light con anillo teal. Es la entrada de las tres voces: una pregunta real del cliente, no retórica.'],['Respuesta','Bricolage, una a tres palabras, cierra con la esfera. Es el dominante: mide al menos 3× la pregunta.'],['Evidencia','Poppins, una palabra en negrita. Es el remate: dato, fuente o mecanismo. Puede faltar.'],['Abierta','En cuadernos, pizarras y formularios la pregunta queda sola con su anillo: responde quien lo usa.']].map(([a,c])=>p(a,14,C.navy,600)+p(c,14,C.ink)).join('')))+
  lab(64,640,'Banco de pares (candidatos, sin aprobar)')+RB(64,640,1000,300,{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:12},pairs.map(([Q,A])=>div({background:C.white,border:`1px solid ${C.line}`,padding:'12px 18px',height:88,boxSizing:'border-box'},q(Q,12.5,C.muted)+div({marginTop:6},dom(A,26,C.navy)))).join(''))+
  col(1100,640,436,300,'Cuidar',list(['Preguntas que el cliente hace de verdad; nunca chistes ni frases motivacionales.','Tuteo neutro; sin voseo ni modismos.','Nunca dos preguntas ni dos respuestas seguidas.','La respuesta no promete resultados que no podemos probar.'],13.5)));}

// 05 · Campaña con foto
boards['R2-05-campana.dc.html']=board('Campaña con foto',
 head('B1 · Campaña con foto','Ordena lo publicado sin reemplazarlo.','Mismo lenguaje fotográfico y mismas tres voces. Cambia la entrada, que ahora es una pregunta con anillo, y el cierre, que es la esfera. La selección y los cursores son los de AXIS. Sin logo, para probar el reconocimiento; en pauta real, la firma va al pie.')+
 place(64,290,'Post 4:5 · conversación',S.adConv,.38)+place(494,290,'Post 4:5 · selección sobre objeto',S.adEdit,.38)+place(924,290,'Story 9:16',S.story,.267)+
 place(64,860,'LinkedIn 1200 × 627',S.linkedin,.5)+
 col(1252,290,284,520,'Qué cambió respecto de lo publicado',list(['Entrada → pregunta con anillo.','Punto final → esfera teal.','Selección y cursores: sin cambio, AXIS.','Notas de versión y marcas de corte como oficio.','Foto: el mismo lenguaje fotográfico aprobado.'],13.5))+
 col(700,860,836,300,'Nota',p('Las fotos muestran el emblema bordado en la ropa. Para la prueba sin logo se deben usar tomas donde no se vea.',13.5,C.ink)),1600,1220);

// 06 · Deck
boards['R2-06-deck.dc.html']=board('Deck',
 head('B2 · Deck','Portada, sección, contenido y cierre.')+
 place(64,220,'Portada',S.slideCover,.33)+place(760,220,'Sección',S.slideSection,.33)+place(64,620,'Contenido',S.slideContent,.33)+place(760,620,'Cierre',S.slideClose,.33));

// 07 · Espacio → reemplazado por office.part (lente)
// 08 · Objetos
boards['R2-08-objetos.dc.html']=board('Objetos',
 head('B4 · Objetos','Los objetos, dentro del sistema.')+
 lab(64,210,'Taza · frente')+abs(64,210,300,300,{background:C.white,border:`1px solid ${C.line}`},`<img src="${IMG.mugFront}" alt="Taza blanca con Hacer y esfera teal" style="width: 300px; height: 300px; object-fit: contain">`)+
 lab(384,210,'Taza · reverso')+abs(384,210,300,300,{background:C.white,border:`1px solid ${C.line}`},`<img src="${IMG.mugBack}" alt="Reverso de la taza con logo chico abajo" style="width: 300px; height: 300px; object-fit: contain">`)+
 lab(704,210,'Taza navy · conversación')+abs(704,210,300,300,{background:C.white,border:`1px solid ${C.line}`},`<img src="${IMG.mugNavy}" alt="Taza navy con pregunta y respuesta" style="width: 300px; height: 300px; object-fit: contain">`)+
 place(1030,210,'Cuaderno · tapa',S.notebook,.29)+place(1260,210,'Cuaderno · interior',S.notebookIn,.29)+
 place(64,580,'Credencial',S.badge,.36)+place(300,580,'Tarjeta · frente (firma sin logo)',S.cardFront,.34)+place(300,810,'Tarjeta · dorso',S.cardBack,.34)+place(660,580,'Bolso',S.tote,.36)+place(980,580,'Stickers',S.stickers,.46)+
 col(980,800,556,160,'Criterio',list(['Una esfera por objeto; si no hay copy, la esfera sola en la esquina del margen.','El logo chico abajo y con aire, como en la taza que funcionó, sólo donde la pieza lo necesita.'],13.5)));

// 09 · Motion y producto
{const fr=(n,label,inner)=>div({display:'flex',flexDirection:'column',gap:8},surface(1080,608,.3,inner,C.navy)+p(`${n} · ${label}`,12.5,C.ink));
 const Q=abs(96,90,900,null,{},q('¿Qué aprendimos?',40,C.soft)),A=t=>abs(96,250,null,null,{},div({fontFamily:BR,fontWeight:760,fontSize:170,lineHeight:1,letterSpacing:TRK+'em',color:C.white,whiteSpace:'nowrap'},t));
 const ab=domBounds('Esto',170,96,250),sx=ab.right-SPH*170,sy=250+.83*170-SPH*170;
 const ball=(y,sxScale=1,syScale=1)=>abs(sx,y,SPH*170,SPH*170,{borderRadius:'50%',background:C.teal,transform:`scale(${sxScale}, ${syScale})`,transformOrigin:'50% 100%'});
 boards['R2-09-motion.dc.html']=board('Motion y producto',
  head('B8 · Motion y producto','La esfera aterriza.','La firma en movimiento: la pregunta abre, la respuesta se escribe y la esfera cae hasta la línea base. En producto, el anillo es «pensando» y la esfera es «respondido».')+
  lab(64,270,'Storyboard · 1,6 s')+abs(64,270,1472,220,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:16},
   fr('0,0 s','el anillo abre la pregunta',Q)+fr('0,4 s','la respuesta se escribe',Q+A('Est'))+fr('0,9 s','la esfera cae',Q+A('Esto')+abs(sx,sy-190,SPH*170,SPH*170,{borderRadius:'50%',background:C.teal,opacity:.18})+abs(sx,sy-150,SPH*170,SPH*170,{borderRadius:'50%',background:C.teal,opacity:.4})+ball(sy-105))+fr('1,2 s','aterriza, se aplasta y asienta',Q+A('Esto')+ball(sy,1.18,.82)))+
  lab(64,560,'Producto · Nexa (concepto de marca; la interfaz la decide AXIS)')+abs(64,560,700,210,{background:C.white,border:`1px solid ${C.line}`,padding:28,boxSizing:'border-box',display:'flex',flexDirection:'column',gap:18},
   div({alignSelf:'flex-end',background:'#EEF2F6',borderRadius:14,padding:'12px 16px',maxWidth:420},p('¿Qué campañas convirtieron mejor este mes?',15,C.ink))+
   div({display:'flex',alignItems:'center',gap:12},div({width:18,height:18,borderRadius:'50%',border:`3px solid ${C.tealDark}`,boxSizing:'border-box'})+p('Nexa está revisando la evidencia',14,C.muted))+
   div({display:'flex',gap:12},div({width:18,height:18,borderRadius:'50%',background:C.tealDark,marginTop:4,flexShrink:0})+p('[Respuesta con datos, fuente y período]',15,C.ink))+p('Anillo = trabajando · esfera = respondido. Nunca un spinner genérico.',12.5,C.muted))+
  col(800,560,736,300,'Reglas de motion',list(['Duración total 1,2–1,6 s; la esfera cae en 300 ms con aceleración y asienta con un rebote corto.','El aplastamiento no pasa del 18 %; vuelve a círculo perfecto.','Anillo pensando: pulso lento, 1,2 s por ciclo. Nunca gira.','Con movimiento reducido: la esfera aparece sin caída.'],13.5)));}

// 10 · Prueba sin logo
{const thumbs=[['Post',S.adConv,.16],['Post',S.adEdit,.16],['Story',S.story,.112],['Slide',S.slideCover,.112],['Muro',S.reception,.112]];
 boards['R2-10-prueba.dc.html']=board('Prueba sin logo',
  head('Archivo · versión anterior de C3','¿Se reconoce como Efeonce?','La línea sólo genera brand lift si la gente la atribuye a Efeonce sin ver el logo. Eso se mide; no se asume.')+
  abs(64,240,1472,240,{display:'flex',gap:18,alignItems:'flex-end'},thumbs.map(([l,fn,s])=>div({display:'flex',flexDirection:'column',gap:8},tileOf(fn,s)+p(l,12,C.muted))).join(''))+
  col(64,540,700,340,'Cómo se mide',list(['Atribución sin logo: se muestran piezas sin firma y se pregunta de qué empresa son, sin opciones sugeridas.','Muestra: al menos 100 personas del público objetivo por celda; medición antes y después de un período de exposición.','Distractores: las mismas piezas con otro recurso de marca (sin esfera ni anillo) y piezas de la categoría, para aislar el efecto.','Métricas: atribución correcta, unicidad (atribuciones a otras marcas) y recuerdo de la esfera.'],13.5))+
  col(820,540,716,340,'Qué no se puede afirmar todavía',list(['Que la esfera ya sea un activo distintivo: hoy es un sistema consistente, no un activo medido.','Que la pregunta con anillo mejore el rendimiento de los anuncios: requiere una prueba A/B aparte.','Exclusividad frente a otras marcas: falta revisar competidores y disponibilidad legal.'],13.5)));}

// ================= Familia de marcas =================
const LK={efeonce:{full:'/_blob/d4fb42de8b158fe19d1649d2ededcc8c',neg:'/_blob/88b2200767ec5e47d13d9d416ad8e509',r:282/1200},globe:{full:'/_blob/a241996c8b86978d3bbecdea29c62413',neg:'/_blob/81cb6e7e57ddef7e8b5b7f72c769d98e',r:591/1200},wave:{full:'/_blob/a9c050e2937a59cb66c66d1dec764cee',neg:'/_blob/5d76b8b59b7d37202e113a972f5990e0',r:494/1200},reach:{full:'/_blob/7b5e6f52f836987c1d7604867610402b',neg:'/_blob/79ae125d1c0f036155196cc20a76360e',r:375/1200}};
const FAM=[
 {k:'efeonce',name:'Efeonce',role:'Marca principal',dark:C.dark,ink:C.navy,onDark:C.teal,onLight:C.tealDark,crD:'8,5',crL:'3,9',verb:'Hacer',Q:'¿Lo medimos?',A:'Siempre',R:'Tu operación, a la vista.',mug:['/_blob/7ed3f0528a67df69d2df9fa5c704de53','/_blob/a2b458005f7c582b3f35a901476f9f8f'],iso:['/_blob/990b67ac0ab7d286d5ba24e5132a7e2a','/_blob/649ed684715f687669dd68e1fa6da890']},
 {k:'globe',name:'Globe',role:'Creative Studio',dark:C.ink2,ink:C.ink2,onDark:'#FF6500',onLight:'#BB1954',crD:'5,6',crL:'5,8',verb:'Crear',Q:'¿Cuál sale al aire?',A:'Esta',R:'Del brief a la pieza aprobada.',mug:['/_blob/348e8a8348d3ea57ffd920030d4572f7','/_blob/d1d1c4ac7e122f83ac0fa446f28a6358'],mugC:['/_blob/b5a876f350a1db1a3dd0f4f76d398994','/_blob/48b1fd1aabe1c4cbef8f4d07ad72c222'],iso:['/_blob/a2926d021c38f3d7ebeaf6e25ef264f3','/_blob/25c579d7e4cb8baf3d2fd3dc17abc02b']},
 {k:'wave',name:'Wave',role:'Búsqueda, web y medición',dark:C.ink2,ink:C.ink2,onDark:'#0375DB',onLight:'#0375DB',crD:'3,6',crL:'4,3',verb:'Aparecer',Q:'¿Apareces cuando preguntan por tu categoría?',A:'Veamos el dato',R:'En buscadores y en respuestas de IA.',mug:['/_blob/9cde27626eb3d446899ed805d276af84','/_blob/4441368069eb22c25867fdac74f938eb'],mugC:['/_blob/d979a9c2b3bc600787e00774b3834c19','/_blob/4e01d4a2d9aa2300858259634b9b80e1'],iso:['/_blob/dc922c6fa31737c39fd914b3adf50438','/_blob/1fad5dfade1129498e176bdd65bbc7f1']},
 {k:'reach',name:'Reach',role:'Medios y distribución',dark:C.ink2,ink:C.ink2,onDark:'#F83902',onLight:'#F83902',crD:'4,4',crL:'3,5',verb:'Llegar',Q:'¿A quién le llega tu pauta?',A:'Te lo mostramos',R:'Medios con alcance medido.',mug:['/_blob/65a92adb73f5542ff7408b51b21957ab','/_blob/b6af856d4c25bdac526007c088540a3e'],mugC:['/_blob/174672e6bc66b532583dcbb4eea513f2','/_blob/615667b113010096077a194d79764d40'],iso:['/_blob/6f816fa91d4ebb83ee616a9e89acb8f1','/_blob/e1f7d5b99529743484b6e0f11d5f0137']},
];
const lkImg=(b,neg,x,y,w)=>`<img src="${neg?LK[b.k].neg:LK[b.k].full}" alt="Logo ${b.name}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${+(w*LK[b.k].r).toFixed(1)}px">`;
const famPost=b=>()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:170,ink:C.white,sub:C.soft,Q:b.Q,A:b.A,R:b.R,maxW:880,sph:b.onDark});
 return {W,H,bg:b.dark,html:crop(60,60,W-120,H-120,'rgba(207,228,250,0.45)',40,10)+c.html+lkImg(b,true,96,H-110-300*LK[b.k].r,300)};};
const famSlide=b=>()=>{const W=1920,H=1080,c=convo({x:140,top:300,qs:40,ds:180,ink:b.ink,sub:C.ink,Q:b.Q,A:b.A,R:b.R,maxW:1400,sph:b.onLight});
 return {W,H,bg:C.paper,html:guideV(140,H,C.guideLight)+c.html+lkImg(b,false,W-140-340,H-110-340*LK[b.k].r,340)};};
// F-01 · Arquitectura
boards['F-01-arquitectura.dc.html']=board('Familia · arquitectura',
 head('A7 · Familia de marcas','Un lenguaje, cuatro acentos.','Efeonce es la marca principal; Globe, Wave y Reach son marcas de producto. Todas hablan con la esfera, el oficio y la conversación. Cambia sólo el acento: cada marca tiene su color de esfera y el teal es sólo de Efeonce.')+
 RB(64,250,1472,450,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:20},FAM.map(b=>div({background:C.white,border:`1px solid ${C.line}`,display:'flex',flexDirection:'column'},
  div({position:'relative',height:110,borderBottom:`1px solid ${C.line}`},lkImg(b,false,24,Math.round(55-(b.k==='efeonce'?200:180)*LK[b.k].r/2),b.k==='efeonce'?200:180))+
  div({padding:'14px 20px 0'},cap(b.role,C.muted,10.5))+
  div({position:'relative',height:120,margin:'12px 20px 0',background:b.dark},abs(20,26,null,null,{},dom(b.verb,52,C.white,{sphereColor:b.onDark})))+p(`Oscuro ${b.dark===C.dark?'navy #001A33':'tinta #091951'} · esfera ${b.onDark} · ${b.crD}:1`,11.5,C.ink,400,{margin:'6px 20px 0'})+
  div({position:'relative',height:120,margin:'12px 20px 0',background:C.paper,border:`1px solid ${C.line}`},abs(20,26,null,null,{},dom(b.verb,52,b.ink,{sphereColor:b.onLight})))+p(`Claro papel · esfera ${b.onLight} · ${b.crL}:1`,11.5,C.ink,400,{margin:'6px 20px 16px'}))).join(''))+
 col(64,740,460,240,'Igual en toda la familia',list(['La esfera y el anillo: forma, tamaño 0,20 em y comportamiento.','El oficio a la vista y los cursores de AXIS.','La voz: pregunta, respuesta y evidencia.','Bricolage + Poppins, papel como fondo claro.'],13.5))+
 col(560,740,460,240,'Cambia por marca',list(['El color de la esfera y del anillo (una tinta para oscuro y otra para claro).','El fondo oscuro: navy para Efeonce, tinta #091951 para los productos.','La firma: el logo propio de cada producto, con «by efeonce».'],13.5))+
 col(1060,740,476,240,'Por qué funciona',p('Los logos de producto ya hablan este idioma: una palabra en tinta con un solo acento de color (el globo de Globe, la W de Wave, la «a» de Reach). La esfera extiende esa gramática al resto de las piezas.',13.5,C.ink)+p('Regla: una marca, un acento por pieza. El teal nunca aparece en una pieza de producto.',13.5,C.ink,600)));
// F-02 · Misma pieza
boards['F-02-misma-pieza.dc.html']=board('Familia · misma pieza',
 head('B5 · Familia: misma pieza','Cuatro marcas, una voz.')+
 FAM.map((b,i)=>place(64+i*372,220,`${b.name} · post`,famPost(b),.32)+place(64+i*372,700,`${b.name} · slide`,famSlide(b),.18)).join('')+
 abs(64,940,1472,null,{},p('Copy de ejemplo por marca, sin aprobar. Las cuatro piezas comparten grilla, tamaños y comportamiento; sólo cambian el acento y la firma.',13,C.muted)));
// F-03 · Objetos de familia
{const mug=(x,y,src,alt)=>abs(x,y,200,200,{background:C.white,border:`1px solid ${C.line}`},`<img src="${src}" alt="${alt}" style="width: 200px; height: 200px; object-fit: contain">`);
 const cols=[...FAM.map(b=>({l:`${b.name}`,s:`«${b.verb}» · tinta`,f:b.mug[0],r:b.mug[1]})),...FAM.slice(1).map(b=>({l:`${b.name}`,s:'edición de color',f:b.mugC[0],r:b.mugC[1]}))];
 boards['F-03-objetos.dc.html']=board('Familia · objetos',
  head('B6 · Familia: objetos','Cada marca con su verbo y su acento.')+
  cols.map((c,i)=>lab(64+i*212,220,`${c.l} · ${c.s}`)+mug(64+i*212,220,c.f,`Taza ${c.l} ${c.s}, frente`)+mug(64+i*212,440,c.r,`Taza ${c.l} ${c.s}, reverso con logo`)).join('')+
  col(64,700,700,260,'Regla de objetos',list(['Efeonce en papel con esfera teal; productos en tinta #091951 con esfera e interior en su acento.','La firma va en el reverso, chica y abajo: el logo completo de cada marca, en negativo blanco sobre fondos oscuros o de color.','Los verbos son candidatos: Hacer, Crear, Aparecer, Llegar.'],13.5))+
  col(800,700,736,260,'Edición de color',list(['Cuerpo del color principal de la marca, texto y esfera en blanco, interior en su segundo color.','Funciona en las tres porque los negativos oficiales son todo blanco (OneDrive · Alineación/6. Marca/Logotipos/SVG).','Los *-negativo.svg del repo conservan acentos de color y no son el negativo oficial: conviene sincronizarlos.'],13.5)));}
// F-04 · Convivencia
S.portfolio=()=>{const W=1920,H=1080;const row=(b,y,desc)=>abs(140,y,1640,120,{borderTop:`1px solid ${C.line}`},abs(0,36,34,34,{borderRadius:'50%',background:b.onLight})+lkImg(b,false,70,60-230*LK[b.k].r/2,230)+abs(420,34,1100,null,{},p(desc,30,C.ink)));
 return {W,H,bg:C.paper,html:abs(140,110,1400,null,{},cap('Efeonce · cómo trabajamos',C.muted,22))+abs(140,170,null,null,{},dom('Una operación, tres productos',120,C.navy))+row(FAM[1],480,'Creative Studio: dirección, producción y aprobación en un solo lugar.')+row(FAM[2],620,'Búsqueda, web y medición: aparecer donde te buscan, también en respuestas de IA.')+row(FAM[3],760,'Medios y distribución: pauta con alcance medido.')};};
S.directory=()=>{const W=900,H=1400;const r=(b,label,y)=>abs(90,y,720,110,{borderTop:'1px solid rgba(207,228,250,0.25)',display:'flex',alignItems:'center',gap:30},div({width:40,height:40,borderRadius:'50%',background:b.onDark,flexShrink:0})+div({},p(label,40,C.white,600)+p(b.name,26,C.soft,400)));
 return {W,H,bg:C.ink2,html:abs(90,110,700,null,{},cap('Piso 3',C.soft,26))+abs(90,170,null,null,{},domPlain('¿A dónde vas?',96,C.white))+r(FAM[0],'Operación',420)+r(FAM[1],'Estudio',560)+r(FAM[2],'Búsqueda y datos',700)+r(FAM[3],'Medios',840)+abs(90,1230,720,null,{},p('Cada zona conserva el color de su marca.',24,C.soft))};};
boards['F-04-convivencia.dc.html']=board('Familia · convivencia',
 head('B7 · Familia: convivencia','Cuando aparecen juntas, habla Efeonce.')+
 place(64,220,'Mapa de portafolio · slide',S.portfolio,.5)+place(1070,220,'Directorio de piso',S.directory,.38)+
 col(64,800,1472,200,'Reglas',list(['Efeonce abre y firma: título con la esfera teal.','Cada producto conserva su esfera como viñeta y su logo propio.','El mapa de portafolio y la señalética son las únicas piezas con los cuatro acentos juntos.','Nunca dos acentos en una misma frase.','En oscuro, la familia usa tinta #091951: ahí los cuatro acentos pasan 3:1; sobre navy, el azul de Wave no llega (2,4:1).'],13.5)));


// F-05 · Firma: logo completo o isotipo
{const isoBox=(src,alt,bg,size=120,pad=18)=>div({width:size,height:size,background:bg,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,border:bg===C.paper?`1px solid ${C.line}`:'none',boxSizing:'border-box'},`<img src="${src}" alt="${alt}" style="width: ${size-2*pad}px; height: ${size-2*pad}px; object-fit: contain">`);
 const card=b=>{const dark=b.dark;return div({background:C.white,border:`1px solid ${C.line}`,padding:18,display:'flex',flexDirection:'column',gap:12},
  cap(b.name,C.muted,10.5)+
  div({position:'relative',height:92,background:C.paper,border:`1px solid ${C.line}`},lkImg(b,false,16,46-150*LK[b.k].r/2,150))+
  div({position:'relative',height:92,background:dark},lkImg(b,true,16,46-150*LK[b.k].r/2,150))+
  div({display:'flex',gap:12},isoBox(b.iso[0],`Isotipo ${b.name}`,C.paper,96,14)+isoBox(b.iso[1],`Isotipo ${b.name} en negativo`,dark,96,14)));};
 const avatar=b=>div({width:110,height:110,borderRadius:'50%',background:b.dark,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},`<img src="${b.iso[1]}" alt="Avatar ${b.name}" style="width: 64px; height: 64px; object-fit: contain">`);
 const sticker=b=>div({width:110,height:110,borderRadius:24,background:C.white,border:`1px solid ${C.line}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0},`<img src="${b.iso[0]}" alt="Sticker ${b.name}" style="width: 70px; height: 70px; object-fit: contain">`);
 boards['F-05-firma.dc.html']=board('Familia · firma',
  head('A8 · Firma','Logo completo o isotipo.','Cada marca tiene logo completo e isotipo. El logo completo firma cuando hay espacio; el isotipo firma en formatos chicos o cuadrados. En oscuro se usa siempre el negativo oficial todo blanco.')+
  RB(64,250,1060,420,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:16},FAM.map(card).join(''))+
  col(1160,250,376,420,'Cuándo usar cada uno',list(['Logo completo: post, slide, portada, email, reverso de taza, muro.','Isotipo: avatar de redes, favicon, pin, sticker, credencial, lomo de cuaderno, marca de agua en video.','Nunca los dos en la misma vista.','Nunca recolorear un isotipo ni combinar isotipos de distintas marcas en un emblema nuevo.','Productos: su isotipo firma dentro de su propio contexto; Efeonce aparece en el logo completo («by efeonce») o en la pieza madre.'],13))+
  lab(64,720,'Avatares · isotipo en negativo sobre el fondo de cada marca')+RB(64,720,700,120,{display:'flex',gap:24},FAM.map(avatar).join(''))+
  lab(820,720,'Stickers · isotipo a color')+RB(820,720,700,120,{display:'flex',gap:24},FAM.map(sticker).join(''))+
  RB(64,880,1472,null,{},p('Aviso: el isotipo de Wave en negativo (repo y OneDrive) conserva media figura en azul. Si existe una versión toda blanca, se reemplaza.',13,C.muted)));}

// ================= Ronda 3 · profundización =================
// Ventana: círculo que muestra (foto, color o textura). Esfera de acento tangente, con aire, como la esfera sobre la órbita de la nave.
const window_=({cx,cy,D,src,fill,alt,accent,gapAng=-50,accentScale=.14})=>{const r=D/2,d=D*accentScale,g=D*.02,a=gapAng*Math.PI/180,sx=cx+(r+g+d/2)*Math.cos(a)-d/2,sy=cy+(r+g+d/2)*Math.sin(a)-d/2;
 const inner=src?`<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${D}px; height: ${D}px; object-fit: cover">`:'';
 return abs(cx-r,cy-r,D,D,{borderRadius:'50%',overflow:'hidden',background:fill??C.navy},inner)+(accent?abs(sx,sy,d,d,{borderRadius:'50%',background:accent}):'');};
// Palabra en contorno fuera de la ventana y llena dentro (recurso que el operador eligió en la ronda de Codex).
const crossWord=({txt,x,top,size,stroke,fillIn,cx,cy,D,W,H})=>{const st_={fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:1,letterSpacing:TRK+'em',whiteSpace:'nowrap'};
 return abs(x,top,null,null,{},div({...st_,color:'transparent',WebkitTextStroke:`${Math.max(2,size*.008)}px ${stroke}`},txt))+
  abs(0,0,W,H,{clipPath:`circle(${D/2}px at ${cx}px ${cy}px)`},abs(x,top,null,null,{},div({...st_,color:fillIn},txt)));};
S.winWall=()=>{const W=1920,H=1080,fl=H-110,cx=1300,cy=470,D=780;return {W,H,bg:C.wall,html:abs(0,fl,W,110,{background:C.floor})+window_({cx,cy,D,src:IMG.L4,alt:'Camarógrafo revisa la toma en el monitor mientras la barista trabaja al fondo',accent:C.tealDark})+crossWord({txt:'Hacer',x:180,top:300,size:400,stroke:C.navy,fillIn:C.white,cx,cy,D,W,H})};};
S.winCover=()=>{const W=1920,H=1080,cx=1600,cy=620,D=980,c=convo({x:140,top:330,qs:38,ds:150,ink:C.white,sub:C.soft,Q:'¿Qué cambió este trimestre?',A:'Lo que medimos',maxW:900});
 return {W,H,bg:C.dark,html:window_({cx,cy,D,src:IMG.L5,alt:'Vista cenital: una mano marca con una pestaña lima la línea que sube en un informe impreso',accent:C.teal,gapAng:-120})+c.html};};
S.winPost=(b)=>()=>{const W=1080,H=1350,cx=540,cy=640,D=820;return {W,H,bg:C.paper,html:window_({cx,cy,D,src:IMG.L1,alt:'Manos ajustando la curva de color de una pieza en la mesa de corrección',accent:b.onLight})+lkImg(b,false,W/2-130,H-90-260*LK[b.k].r,260)};};
S.winTote=()=>{const W=800,H=900,cx=470,cy=470,D=520;return {W,H,bg:'#EDE8DF',html:window_({cx,cy,D,fill:C.navy,accent:C.tealDark,gapAng:-45})+crossWord({txt:'Hacer',x:70,top:390,size:190,stroke:C.navy,fillIn:C.white,cx,cy,D,W,H})};};
boards['A3-0-anterior.dc.html']=board('Archivo · A3 anterior',
 head('Archivo · versión anterior de A3','La ventana.','Un círculo que muestra: foto, color o textura. Es la esfera a escala de muro, con una esfera chica de acento que la toca con aire, como la esfera sobre la órbita de la nave. Da el momento visual donde no hay copy y retoma el recurso que te gustó: letras en contorno que se llenan al entrar al círculo.')+
 place(64,270,'Muro de recepción · palabra en contorno que se llena dentro de la ventana',S.winWall,.37)+place(820,270,'Portada de deck · ventana que sangra',S.winCover,.37)+
 place(64,730,'Post sin copy · Efeonce',S.winPost(FAM[0]),.3)+place(408,730,'Post sin copy · Globe',S.winPost(FAM[1]),.3)+place(752,730,'Bolso · ventana de color',S.winTote,.38)+
 col(1100,730,436,420,'Reglas de la ventana',list(['Siempre un círculo perfecto; una sola ventana por pieza.','Puede sangrar por un borde o quedar entera; nunca se deforma ni se repite como patrón.','Esfera de acento: 0,14 × el diámetro, separada por un aire de 0,02 ×, en el color de la marca.','Palabra que la cruza: contorno afuera, llena adentro. Sólo una palabra, del banco de voz.','En productos, la ventana y su esfera toman el acento del producto; la firma es su logo.'],13.5)),1600,1180);

// Eslogan: «Empower your ___». SSOT src/config/efeonce-brand.ts: Empower ExtraBold Italic · your ExtraBold · palabra final Black Italic.
const LOCK={light:'/_blob/54b5f7ee4cf5337b1e41e22b4208f06f',dark:'/_blob/da25b54e72e02c9afd40e5351c217bc8',r:371/1200,rd:365/1200};
const WORD={efeonce:'Growth',globe:'Brand',wave:'Engine',reach:'Voice'};
const slogan=(word,size,{dark=false,accent,align='left'}={})=>{const base=dark?'#E2E2E2':'#848484',fin=accent??(dark?C.white:C.navy);
 return div({fontFamily:PO,fontSize:size,lineHeight:1.15,whiteSpace:'nowrap',color:base,textAlign:align},`<span style="font-weight: 800; font-style: italic">Empower</span> <span style="font-weight: 800">your</span> <span style="font-weight: 900; font-style: italic; color: ${fin}">${word}</span>`);};
// Hilo Efeonce: A (actual) vs B (anillo siempre teal) vs C (eslogan como hilo).
const famPostB=b=>()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:170,ink:C.white,sub:C.soft,Q:b.Q,A:b.A,R:b.R,maxW:880,sph:b.onDark,ringC:C.teal});
 return {W,H,bg:b.dark,html:crop(60,60,W-120,H-120,'rgba(207,228,250,0.45)',40,10)+c.html+lkImg(b,true,96,H-110-300*LK[b.k].r,300)};};
const famPostC=b=>()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:170,ink:C.white,sub:C.soft,Q:b.Q,A:b.A,R:b.R,maxW:880,sph:b.onDark}),lw=300,lh=lw*LK[b.k].r;
 return {W,H,bg:b.dark,html:crop(60,60,W-120,H-120,'rgba(207,228,250,0.45)',40,10)+c.html+lkImg(b,true,96,H-150-lh,lw)+abs(96,H-128,900,null,{},slogan(WORD[b.k],34,{dark:true,accent:b.onDark}))};};
const optRow=(y,key,label,fn,colr)=>abs(64,y,100,30,{},cap(label,colr,12,{whiteSpace:'nowrap'}))+FAM.slice(1).map((b,i)=>place(190+i*262,y+30,`${b.name} · ${key}`,fn(b),.22)).join('');
boards['R3-02-hilo.dc.html']=board('Ronda 3 · hilo Efeonce',
 head('C1 · Por decidir · hilo de familia','¿Qué dice Efeonce en una pieza de producto?','Tres opciones sobre las mismas piezas. A: sin señal de Efeonce más allá del «by efeonce» del logo. B: el anillo de la pregunta siempre teal. C: la pieza cierra con la variante del eslogan: «Empower your» es de Efeonce, la palabra final es del producto.')+
 optRow(260,'A','A · actual',famPost,C.muted)+optRow(620,'B','B · anillo teal',famPostB,C.muted)+optRow(980,'C','C · eslogan',famPostC,C.teal)+
 col(1000,290,536,900,'Lectura',list(['A: cada producto es coherente consigo mismo, pero sin logo nada dice Efeonce.','B: a tamaño de feed el anillo mide pocos píxeles; entre A y B casi no hay diferencia visible. Como hilo, pesa poco.','C: el eslogan ya es un activo de Efeonce, con tipografía propia (Poppins en cursiva) y un color fijo (gris). Aparece en todas las piezas de producto sin agregar un segundo acento: la palabra final toma el color del producto.','Costo de C: más texto en la firma. Sólo va en piezas con espacio de cierre; en formatos chicos queda el isotipo.','Cursores AXIS en piezas de producto: fijar sus colores (participantColors) para que no repitan el acento del producto.'],13.5)+
  p('Recomendación: C. B queda descartada por escala. Se valida en la prueba sin logo (C3) comparando A contra C.',13.5,C.ink,600,{marginTop:8})),1600,1340);

// Pasada de copy
{const rows=[['¿Otra vuelta?','Vamos','¿Y si después lo hago yo?','Esa es la idea','Era simpática pero vacía. La nueva prueba el Why: te dejamos más capaz, no dependiente.'],
 ['¿Lo enseñamos?','Claro','¿Y el reporte del viernes?','Ya lo viste','La pregunta la hacía Efeonce, no el cliente. La nueva nace de un dolor real y responde con transparencia en vivo.'],
 ['¿Lo hacemos juntos?','Así se hace','¿Otra agencia más?','No. Un sistema','Cliché de co-creación sin mecanismo. La nueva usa el contraste «no es X, es Y».'],
 ['—','—','¿Cuánto rindió?','Te mostramos todo','Nueva: rompe el pacto de las vanity metrics (creencia 3).'],
 ['¿Te están encontrando?','Veámoslo','¿Apareces cuando preguntan por tu categoría?','Veamos el dato','Wave: «Veámoslo» era evasivo. La nueva nombra el problema de AEO y promete prueba, no resultado.'],
 ['¿A quién le llega?','Lo medimos','¿A quién le llega tu pauta?','Te lo mostramos','Reach: «Lo medimos» repetía el par de Efeonce. La nueva pone el foco en la evidencia compartida.']];
 const cell=(Q,A,dim)=>Q==='—'?p('—',14,C.muted):div({},q(Q,12,dim?C.muted:C.ink)+div({marginTop:4},dom(A,24,dim?'#8A96A3':C.navy,dim?{sphereColor:'#B9C3CC'}:{})));
 boards['R3-03-copy.dc.html']=board('Ronda 3 · copy',
  head('C2 · Por decidir · copy','Preguntas que el cliente hace de verdad.','Criterios de la voz Efeonce: la pregunta nace de un dolor real del cliente, la respuesta tiene una o tres palabras y viene con prueba o mecanismo. Nada de chistes, superlativos ni frases de taza.')+
  abs(64,260,1472,null,{display:'grid',gridTemplateColumns:'300px 360px 1fr',columnGap:32,rowGap:18,alignItems:'start'},
   cap('Antes',C.muted,10.5)+cap('Ahora',C.teal,10.5)+cap('Por qué',C.muted,10.5)+
   rows.map(([qa,aa,qn,an,why])=>cell(qa,aa,true)+cell(qn,an,false)+p(why,13.5,C.ink)).join(''))+
  col(64,700,700,200,'Se mantienen',p('«¿Lo medimos? / Siempre», «¿Quién decide? / Tú, con evidencia», «¿Cómo va? / En vivo», «¿Dónde quedó lo aprendido? / En tu historial», «¿Y si lo probamos? / Hoy», «¿Cuál sale al aire? / Esta» (Globe).',13.5,C.ink))+
  col(800,700,736,200,'Verbos por marca',p('Hacer (Efeonce), Crear (Globe), Aparecer (Wave), Llegar (Reach): cada uno nombra lo que la marca hace por el cliente. Alternativa para Efeonce: «Crecer», más cerca del Why; «Hacer» queda porque ya probó que funciona en la taza.',13.5,C.ink)),1600,960);}

// Kit de prueba sin logo (no ejecutada)
S.distPost=()=>{const W=1080,H=1350;return {W,H,bg:'#1E2A38',html:abs(96,380,880,null,{},p('¿Quién escribe el próximo brief?',38,'#C8CED6',400))+abs(96,450,880,null,{},p('Los dos.',150,C.white,700,{lineHeight:1,letterSpacing:'-0.02em'}))+abs(96,640,880,null,{},p('Tu equipo y el nuestro, en la misma pantalla.',38,'#C8CED6'))};};
S.distSlide=()=>{const W=1920,H=1080;return {W,H,bg:C.white,html:abs(140,300,1400,null,{},p('Ciclo 07 · Resultados',40,'#55606B'))+abs(140,380,1600,null,{},p('Lo que cambió.',170,'#1E2A38',700,{lineHeight:1,letterSpacing:'-0.02em'}))};};
S.testPost=()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:150,ink:C.white,sub:C.soft,Q:'¿Quién escribe el próximo brief?',A:'Los dos',R:'Tu equipo y el nuestro, en la misma pantalla.',maxW:880});return {W,H,bg:C.dark,html:c.html};};
S.testSlide=()=>{const W=1920,H=1080,c=convo({x:140,top:300,qs:40,ds:170,ink:C.navy,sub:C.ink,Q:'¿Qué cambió en el ciclo 07?',A:'Lo que cambió',maxW:1500});return {W,H,bg:C.white,html:guideV(140,H,C.guideLight)+c.html};};
boards['R3-04-prueba.dc.html']=board('Ronda 3 · kit de prueba',
 head('C3 · Por decidir · prueba sin logo','Listo para correr; todavía no se corrió.','Diseño entre sujetos: cada persona ve piezas de una sola versión. La versión de prueba lleva la línea; el distractor tiene el mismo copy y la misma composición sin esfera, anillo ni oficio. La diferencia de atribución entre ambas mide lo que aporta la línea.')+
 lab(64,290,'Estímulo · versión de prueba')+abs(64,290,null,null,{display:'flex',gap:16,alignItems:'flex-end'},tileOf(S.testPost,.22)+tileOf(S.testSlide,.2))+
 lab(760,290,'Estímulo · distractor')+abs(760,290,null,null,{display:'flex',gap:16,alignItems:'flex-end'},tileOf(S.distPost,.22)+tileOf(S.distSlide,.2))+
 col(64,640,700,420,'Protocolo',list(['Público: marketing y dirección comercial de empresas medianas y grandes en Chile (ICP de Efeonce).','Muestra: 150 personas por versión (300 en total), reclutadas por panel; sin exposición previa controlada.','Estímulos: 8 piezas por versión (post, story, slide, muro, taza, cuaderno, credencial, LinkedIn), en orden aleatorio, 5 segundos cada una.','Momento: antes de lanzar la línea (línea base) y a los 3 meses de uso.'],13.5))+
 col(800,640,736,420,'Preguntas y umbral',list(['1. «¿De qué empresa crees que es esta pieza?» (abierta, sin opciones).','2. «¿Cuál de estas empresas crees que la hizo?» (6 opciones: Efeonce y 5 agencias o consultoras de la categoría, más «no sé»).','3. «¿Qué recuerdas de la pieza?» (abierta; se codifica si mencionan la esfera, el anillo o la pregunta).','Éxito: la versión de prueba supera al distractor en atribución asistida por al menos 10 puntos con 95 % de confianza, y la atribución a competidores no sube.','Costo y proveedor de panel: por definir.'],13.5)),1600,1100);

S.endEfeonce=()=>{const W=1920,H=1080,w=900;return {W,H,bg:C.dark,html:`<img src="${LOCK.dark}" alt="Logo Efeonce con eslogan Empower your Growth" style="position: absolute; left: ${(W-w)/2}px; top: ${(H-w*LOCK.rd)/2}px; width: ${w}px; height: ${+(w*LOCK.rd).toFixed(1)}px">`};};
S.endProduct=b=>()=>{const W=1920,H=1080,w=640,lh=w*LK[b.k].r,top=(H-lh-120)/2;return {W,H,bg:b.dark,html:lkImg(b,true,(W-w)/2,top,w)+abs(0,top+lh+44,W,null,{},slogan(WORD[b.k],60,{dark:true,accent:b.onDark,align:'center'}))};};
S.emailSig=()=>{const W=1200,H=380;return {W,H,bg:C.white,html:abs(56,70,560,null,{},p('[Nombre Apellido]',34,C.navy,600)+p('[Cargo] · Efeonce',24,C.ink,400,{marginTop:4})+p('[correo] · [teléfono]',22,C.muted,400,{marginTop:18})+div({marginTop:6},urlB(26)))+abs(640,60,2,260,{background:C.line})+`<img src="${LOCK.light}" alt="Logo Efeonce con eslogan" style="position: absolute; left: 700px; top: ${(H-440*LOCK.r)/2}px; width: 440px; height: ${+(440*LOCK.r).toFixed(1)}px">`};};
boards['R3-05-eslogan.dc.html']=board('Ronda 3 · eslogan',
 head('A6 · Eslogan','El acento cierra, también en el eslogan.','«Empower your Growth» tiene dos formas oficiales: el bloque con el logo, centrado debajo, y el eslogan solo, con la palabra final destacada. La palabra final rota por capability, y en la línea toma el mismo papel que la esfera: el acento va al cierre.')+
 lab(64,270,'Oficial · bloque logo + eslogan')+abs(64,270,520,190,{background:C.paper,border:`1px solid ${C.line}`},`<img src="${LOCK.light}" alt="Logo Efeonce con eslogan" style="position: absolute; left: 40px; top: ${(190-440*LOCK.r)/2}px; width: 440px; height: ${+(440*LOCK.r).toFixed(1)}px">`)+
 abs(604,270,520,190,{background:C.dark},`<img src="${LOCK.dark}" alt="Logo Efeonce con eslogan en negativo" style="position: absolute; left: 40px; top: ${(190-440*LOCK.rd)/2}px; width: 440px; height: ${+(440*LOCK.rd).toFixed(1)}px">`)+
 lab(1144,270,'Oficial · eslogan solo')+abs(1144,270,392,90,{background:C.paper,border:`1px solid ${C.line}`,display:'flex',alignItems:'center',paddingLeft:22,boxSizing:'border-box'},slogan('Growth',30))+abs(1144,370,392,90,{background:C.dark,display:'flex',alignItems:'center',paddingLeft:22,boxSizing:'border-box'},slogan('Growth',30,{dark:true}))+
 lab(64,530,'Familia · la palabra final rota y toma el acento de la marca (propuesta para productos)')+abs(64,530,1472,150,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:16},FAM.map(b=>div({display:'flex',flexDirection:'column',gap:8},div({height:66,background:C.paper,border:`1px solid ${C.line}`,display:'flex',alignItems:'center',paddingLeft:18},slogan(WORD[b.k],24,{accent:b.k==='efeonce'?undefined:b.onLight}))+div({height:66,background:b.dark,display:'flex',alignItems:'center',paddingLeft:18},slogan(WORD[b.k],24,{dark:true,accent:b.k==='efeonce'?undefined:b.onDark})))).join(''))+
 place(64,750,'Cierre de video · Efeonce',S.endEfeonce,.2)+place(468,750,'Cierre de video · Globe',S.endProduct(FAM[1]),.2)+place(872,750,'Firma de correo · la actual está en 4.5',S.emailSig,.3)+
 col(1250,750,286,380,'Reglas',list(['El bloque se usa desde el archivo oficial; no se rearma.','Va en cierres: final de video, última lámina, contratapa, firma de correo, recepción, merch.','No va en cada post: ahí la respuesta con esfera ya cierra.','Nunca pegar la esfera al eslogan, traducirlo ni cambiar pesos o cursivas.','Growth, Brand, Engine y Voice según la capability que lidera (09_marca-agencia).'],12.5)),1600,1160);


// 00 · Índice
{const sec=(code,name,state,items)=>div({background:C.white,border:`1px solid ${C.line}`,padding:'22px 26px',display:'flex',flexDirection:'column',gap:10},div({display:'flex',alignItems:'baseline',gap:12},p(code,22,C.teal,700)+p(name,22,C.navy,700))+cap(state,C.muted,10.5)+items.map(([c,t])=>div({display:'flex',gap:12},p(c,13.5,C.navy,600,{width:30,flexShrink:0})+p(t,13.5,C.ink))).join(''));
 boards['00-indice.dc.html']=board('Índice',
  head('Línea gráfica Efeonce','Cómo leer este canvas.','Todo está en exploración: nada está aprobado. Las láminas van en cuatro secciones, de izquierda a derecha y de arriba abajo. Doble clic sobre una lámina para verla en grande.')+
  abs(64,270,1472,null,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:18,alignItems:'start'},
   sec('A','La línea','Fundamentos · leer primero',[['A1','Sistema: esfera, oficio y voz'],['A2','La esfera: construcción y reglas'],['00b','Manual de la línea en una lámina (leer primero)'],['O','La órbita: regla, aplicaciones, familia, deck y campaña, oficina, objetos y video, especificaciones, fotografía y decisiones'],['A3','La ventana: A3·2 La lente y A3·2+ El foco: «Te hacemos visible»'],['A4','Oficio a la vista: guías, cortes, cursores AXIS'],['A5','Voz: pregunta y respuesta'],['A6','Eslogan y su composición'],['A7','Familia: un lenguaje, cuatro acentos'],['A8','Firma: logo completo o isotipo']])+
   sec('B','Aplicaciones','La línea en uso',[['B1','Campaña con foto'],['B2','Deck'],['B3','Espacio y oficina'],['B4','Objetos Efeonce'],['B5','Familia: misma pieza'],['B6','Familia: objetos y ediciones de color'],['B7','Familia: portafolio y señalética'],['B8','Motion y producto']])+
   sec('C','Por decidir','Necesitan tu decisión',[['C1','Hilo de familia: A, B o C (recomendada C)'],['C2','Copy: banco de pares y verbos'],['C3','Prueba sin logo: panel y presupuesto']])+
   sec('—','Archivo','Historia, no vigente',[['R1','Punto de partida y seis vías divergentes'],['R2','Primera versión de la prueba sin logo'],['A3','Versiones anteriores de la ventana (punto gigante, esfera tipográfica)']]))+
  col(64,680,1472,150,'Cómo llegamos aquí',p('Ronda 1: seis vías; elegiste la esfera, el oficio a la vista y lo conversacional. Ronda 2: esas tres se unieron en un sistema. Familia: Globe, Wave y Reach con sus acentos. Ronda 3: la ventana, el hilo de familia, el copy, el kit de prueba y el eslogan.',13.5,C.ink)));}

// ================= A3 · La ventana con punch: tres versiones =================
const BIG=(size,color,o={})=>({fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:1,letterSpacing:TRK+'em',color,whiteSpace:'nowrap',...o});
// Esfera gigante como punto final de una palabra: su borde inferior apoya en la línea base.
const giantPeriod=({txt,x,top,size,color,D,sph=C.teal})=>{const b=plainBounds(txt,size,x,top),base=top+.83*size,sx=b.right+size*.04;return abs(x,top,null,null,{},div(BIG(size,color),txt))+abs(sx,base-D,D,D,{borderRadius:'50%',background:sph});};
// Lente: la foto entera en navy apagado; dentro del círculo, a color y ampliada.
const lens=({src,W,H,cx,cy,D,zoom=1.3,pos='50% 50%',alt,accent=C.teal})=>{const r=D/2,d=D*.13,g=D*.025,a=-45*Math.PI/180,sx=cx+(r+g+d/2)*Math.cos(a)-d/2,sy=cy+(r+g+d/2)*Math.sin(a)-d/2;
 const base=`<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: ${pos}; filter: grayscale(1) contrast(1.1) brightness(0.62)">`+abs(0,0,W,H,{background:C.dark,mixBlendMode:'multiply',opacity:.72});
 const inner=abs(0,0,W,H,{clipPath:`circle(${r}px at ${cx}px ${cy}px)`},`<img src="${src}" alt="" style="position: absolute; left: ${cx-cx*zoom}px; top: ${cy-cy*zoom}px; width: ${W*zoom}px; height: ${H*zoom}px; object-fit: cover; object-position: ${pos}">`);
 const R=r+D*.06,P=a=>[cx+R*Math.cos(a*Math.PI/180),cy+R*Math.sin(a*Math.PI/180)],[x0,y0]=P(200),[x1,y1]=P(250),k=W/794*1.4;
 return base+inner+`<svg width="${W}" height="${H}" style="position: absolute; left: 0; top: 0" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#72DED8" stroke-opacity="0.28" stroke-width="${k}"/><path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${accent}" stroke-width="${2*k}" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="${4*k}" fill="${accent}"/></svg>`;};
// Esfera tipográfica: disco teal gigante; la palabra va en contorno afuera y se llena en navy adentro.
const typoSphere=({txt,x,top,size,cx,cy,D,W,H,stroke=C.white,fillIn=C.navy,disc=C.teal})=>abs(cx-D/2,cy-D/2,D,D,{borderRadius:'50%',background:disc})+
 abs(x,top,null,null,{},div(BIG(size,'transparent',{WebkitTextStroke:`${Math.max(2,size*.007)}px ${stroke}`}),txt))+
 abs(0,0,W,H,{clipPath:`circle(${D/2}px at ${cx}px ${cy}px)`},abs(x,top,null,null,{},div(BIG(size,fillIn),txt)));
const wallBase=(bg,inner)=>abs(0,0,1920,1080,{background:bg,overflow:'hidden'},inner+abs(0,970,1920,110,{background:'#0A1F33',opacity:.55}));
// A · Punto gigante
S.pA_wall=()=>({W:1920,H:1080,bg:C.dark,html:wallBase(C.navy,giantPeriod({txt:'Hacer',x:150,top:420,size:400,color:C.white,D:780}))});
S.pA_cover=()=>({W:1920,H:1080,bg:C.dark,html:abs(140,150,1200,null,{},q('¿Qué cambió este trimestre?',40,C.soft))+giantPeriod({txt:'Lo que medimos',x:140,top:640,size:170,color:C.white,D:900})});
S.pA_post=()=>({W:1080,H:1350,bg:C.dark,html:abs(90,130,900,null,{},q('¿Lo medimos?',44,C.soft))+giantPeriod({txt:'Siempre',x:90,top:980,size:210,color:C.white,D:640})});
S.pA_bag=()=>({W:800,H:900,bg:'#EDE8DF',html:giantPeriod({txt:'Hacer',x:70,top:560,size:170,color:C.navy,D:420,sph:C.teal})});
// B · La lente
S.pB_wall=()=>({W:1920,H:1080,bg:C.dark,html:lens({src:IMG.L1,W:1920,H:1080,cx:1150,cy:420,D:700,zoom:1.15,alt:'Manos ajustando la curva de color de una pieza en la mesa de corrección'})+abs(120,760,null,null,{},dom('Hacer',150,C.white))});
S.pB_cover=()=>({W:1920,H:1080,bg:C.dark,html:lens({src:IMG.L5,W:1920,H:1080,cx:1420,cy:600,D:720,zoom:1.3,pos:'50% 42%',alt:'Vista cenital: una mano marca con una pestaña lima la línea que sube en un informe impreso'})+abs(120,150,760,null,{},q('¿Qué cambió este trimestre?',40,C.soft))+abs(120,230,null,null,{},dom('Lo que medimos',130,C.white))});
S.pB_post=()=>({W:1080,H:1350,bg:C.dark,html:lens({src:IMG.L2,W:1080,H:1350,cx:548,cy:600,D:470,zoom:1.4,alt:'Doce pruebas de la misma etiqueta en la pared; una mano retira la elegida'})+abs(90,90,900,null,{},q('¿Cuál sale al aire?',42,C.soft))+abs(90,160,null,null,{},dom('Esta',170,C.white))});
S.pB_story=()=>({W:1080,H:1920,bg:C.dark,html:lens({src:IMG.L6,W:1080,H:1920,cx:420,cy:760,D:640,zoom:1.15,pos:'50% 40%',alt:'Una mujer escucha al cliente en una llamada, con la libreta y el lápiz sin usar'})+abs(90,1400,900,null,{},q('¿Quién escribe el próximo brief?',44,C.soft))+abs(90,1480,null,null,{},dom('Los dos',200,C.white))});
// C · Esfera tipográfica
S.pC_wall=()=>({W:1920,H:1080,bg:C.dark,html:wallBase(C.navy,typoSphere({txt:'Hacer',x:120,top:300,size:520,cx:1230,cy:470,D:880,W:1920,H:1080}))});
S.pC_cover=()=>({W:1920,H:1080,bg:C.dark,html:typoSphere({txt:'Medir',x:120,top:300,size:560,cx:1500,cy:560,D:1000,W:1920,H:1080})+abs(120,120,900,null,{},q('¿Qué cambió este trimestre?',40,C.soft))});
S.pC_post=()=>({W:1080,H:1350,bg:C.dark,html:typoSphere({txt:'Probar',x:40,top:520,size:340,cx:700,cy:700,D:760,W:1080,H:1350})+abs(90,110,900,null,{},q('¿Y si lo probamos?',44,C.soft))});
S.pC_bag=()=>({W:800,H:900,bg:'#EDE8DF',html:typoSphere({txt:'Hacer',x:40,top:360,size:230,cx:470,cy:470,D:560,W:800,H:900,stroke:C.navy,fillIn:C.white,disc:C.navy})});
const dirBoard=(file,code,title,idea,why,risk,tiles)=>{boards[file]=board(`${code} · ${title}`,
 head(`${code} · La ventana con punch`,title,idea)+
 place(64,270,tiles[0][0],tiles[0][1],.37)+place(820,270,tiles[1][0],tiles[1][1],.37)+
 place(64,730,tiles[2][0],tiles[2][1],tiles[2][2]??.3)+place(tiles[2][3]??420,730,tiles[3][0],tiles[3][1],tiles[3][2]??.36)+
 col(760,730,776,400,'Por qué tiene punch',list(why,14))+col(760,1000,776,200,'Riesgo',p(risk,14,C.ink)),1600,1200);};
dirBoard('A3-1-punto.dc.html','A3·1','Punto gigante','El punto final de la palabra crece hasta ser el protagonista y se sale del soporte. Es la taza «Hacer.» llevada a escala de muro.',
 ['Escala invertida: el elemento más chico de la frase se vuelve el más grande. Se lee en dos tiempos: primero el disco, después la palabra.','Alto contraste de color: teal pleno sobre navy, la combinación con más fuerza del sistema.','Es el activo principal a la vista: nadie confunde el punto con decoración.'],
 'Si todo lleva el punto gigante, se vuelve fórmula. Úsalo en piezas hito (muro, portada, lanzamiento), no en el día a día.',
 [['Muro de recepción',S.pA_wall],['Portada de deck',S.pA_cover],['Post',S.pA_post,.3],['Bolso',S.pA_bag,.36,420]]);
dirBoard('A3-2-lente.dc.html','A3·2','La lente','La foto entera en navy apagado; dentro del círculo, a todo color y ampliada. La esfera muestra lo que importa: donde está la decisión.',
 ['Contraste de tratamiento: monocromo contra color. El ojo va directo al círculo.','Tiene significado: enfocar, decidir, mirar de cerca. Encaja con el oficio a la vista.','Funciona con cualquier foto del lenguaje fotográfico, sin producir imágenes nuevas.'],
 'Depende de que la foto tenga un punto de interés claro para el círculo. Con una foto débil, se nota el truco.',
 [['Muro de recepción',S.pB_wall],['Portada de deck',S.pB_cover],['Post',S.pB_post,.3],['Story',S.pB_story,.2,420]]);
dirBoard('A3-3-tipografica.dc.html','A3·3','Esfera tipográfica','Una esfera teal gigante sobre una palabra enorme en contorno: afuera la palabra es línea, adentro de la esfera se llena. Es el recurso que te gustó en la ronda de Codex, con color y escala.',
 ['Lectura en dos tiempos: la palabra se completa sólo dentro de la esfera.','Escala de cartel: la palabra ocupa todo el ancho y se corta en los bordes.','Es el más propio de los tres: combina la esfera con la tipografía del sistema.'],
 'El contorno pierde fuerza a distancia o en tamaños chicos. Es para gran formato; en redes funciona con palabras cortas.',
 [['Muro de recepción',S.pC_wall],['Portada de deck',S.pC_cover],['Post',S.pC_post,.3],['Bolso',S.pC_bag,.36,420]]);
// A3 · explicación simple
boards['R3-01-ventana.dc.html']=board('A3 · La ventana',
 head('A3 · La ventana','La esfera en grande.','Qué es, en simple: la esfera deja de ser el punto final y se vuelve el protagonista de la pieza. Sirve donde no hay texto o hay muy poco: muros, portadas, posts, merch. Estas son tres maneras de hacerlo con fuerza.')+
 [['A3·1 · Punto gigante','El punto final crece y se sale del soporte.',S.pA_wall],['A3·2 · La lente · elegida','Foto en navy apagado; a color dentro del círculo.',S.pB_wall],['A3·3 · Esfera tipográfica','Palabra en contorno que se llena dentro de la esfera.',S.pC_wall]].map(([t,d,fn],i)=>lab(64+i*500,290,t)+abs(64+i*500,290,null,null,{},tileOf(fn,.24))+abs(64+i*500,560,460,null,{},p(d,14,C.ink))).join('')+
 col(64,660,1472,300,'Decisión (25-09-2026)',list(['Elegida: A3·2 · La lente. Es la que se siente moderna; las demás versiones de la ventana no.','Siguiente paso: llevar la lente a todas las aplicaciones (B) y afinar su ejecución.','A3·1, A3·3 y las variantes A3·4–A3·6 quedan como referencia, no como línea.'],14)));

// ================= A3·4–A3·6 · Hacerlo contemporáneo =================
const M1={muro:'/_blob/81a03d2129752fd45f9c4b3309480be3',post:'/_blob/1e3a14dd632afa7f5fccd9b1cb88c28e'};
const PAP='#EFEBE4';
const W8=(size,color,wght,o={})=>({fontFamily:BR,fontWeight:wght,fontSize:size,lineHeight:.95,letterSpacing:(wght<700?-0.02:TRK)+'em',color,whiteSpace:'nowrap',...o});
const sph=(d,color=C.tealDark)=>`<span style="display: inline-block; width: ${d}; height: ${d}; border-radius: 50%; background: ${color}; margin-left: 0.04em"></span>`;
const meta=(l,r,W,y=90,col=C.ink)=>abs(90,y,W-180,null,{display:'flex',justifyContent:'space-between',borderBottom:`1px solid ${col}`,paddingBottom:14},cap(l,col,20)+cap(r,col,20));
// M2 · Editorial
S.m2_post=()=>({W:1080,H:1350,bg:PAP,html:meta('Efeonce · Cuaderno de ciclo','07 / 12',1080)+abs(600,260,390,null,{},q('¿Lo medimos?',34,C.ink))+abs(600,330,380,null,{},p('Cada pieza entra al tablero el día que sale. La creatividad que se mide, se defiende.',22,C.ink,400,{lineHeight:1.45}))+
 abs(84,930,null,null,{},div(W8(130,C.navy,300),'Cada pieza,'))+abs(80,1060,null,null,{},div(W8(210,C.navy,800),'medida'+sph('0.2em')))});
S.m2_slide=()=>({W:1920,H:1080,bg:PAP,html:meta('Revisión trimestral · [CLIENTE]','[FECHA]',1920)+abs(90,200,300,null,{},div(W8(180,C.navy,300),'01'))+
 abs(520,230,1300,null,{},div(W8(150,C.navy,300),'Lo que')+div(W8(150,C.navy,800,{marginTop:4}),'medimos'+sph('0.2em')))+
 abs(520,640,1300,1,{background:C.ink})+abs(520,670,1300,null,{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:40},['[DATO 1]','[DATO 2]','[DATO 3]'].map((d,i)=>div({},cap(`0${i+1}`,C.muted,18)+p(d,30,C.ink,500,{marginTop:10}))).join(''))});
S.m2_wall=()=>({W:1920,H:1080,bg:PAP,html:abs(120,110,1200,null,{},cap('Efeonce · Santiago',C.ink,22))+abs(100,300,null,null,{},div(W8(560,C.navy,300),'Hacer'+sph('0.16em')))+abs(0,980,1920,100,{background:'#DDD7CD'})});
// M3 · Viva
S.m3_data=(v,lab)=>()=>{const W=1080,H=1350,D=Math.round(760*Math.sqrt(v/100));return {W,H,bg:PAP,html:meta('Efeonce · En vivo',lab,1080)+abs(W/2-D/2,640-D/2,D,D,{borderRadius:'50%',background:C.teal})+abs(90,1080,900,null,{},div(W8(170,C.navy,800),`${v} %`))+abs(90,1270,900,null,{},p('Escala de ejemplo: el área de la esfera es el dato.',22,C.muted))};};
S.m3_frame=(t,wght,drop,label)=>()=>{const W=1920,H=1080;const word=abs(140,380,null,null,{},div(W8(300,C.navy,wght),'Hacer'));const f=brFile.getVariation({wght,opsz:96,wdth:100}),run=f.layout('Hacer'),sc=300/1000,tr=-0.02*300;let dx=0;run.positions.forEach((q,i)=>{dx+=q.xAdvance*sc+(i<run.positions.length-1?tr:0);});const lg=run.glyphs[run.glyphs.length-1].bbox,right=140+dx-(run.positions[run.positions.length-1].xAdvance-lg.maxX)*sc,lh=.95*300,base=380+(lh-1.2*300)/2+.93*300-16,d=60;const b={right};
 return {W,H,bg:PAP,html:word+abs(b.right+14,base-d-drop,d,d,{borderRadius:'50%',background:C.tealDark})+abs(140,140,900,null,{},cap(`${t} · ${label}`,C.muted,24))};};
boards['M-01-objeto.dc.html']=board('A3·4 · Objeto real',
 head('A3·4 · Contemporáneo · objeto real','La esfera existe.','Por qué se veía 2008: discos planos y saturados, navy dominante, composiciones centradas y la esfera como burbuja decorativa. La corrección no es el brillo ni el vidrio (eso es la Web 2.0), sino la materia: la esfera como objeto mate, con luz y sombra reales, apoyada al final de una palabra impresa.')+
 lab(64,300,'Muro · render 3D')+abs(64,300,960,540,{overflow:'hidden'},`<img src="${M1.muro}" alt="Esfera teal mate apoyada al final de la palabra Hacer impresa en un muro de papel" style="width: 960px; height: 540px; object-fit: cover">`)+
 lab(1064,300,'Post · render 3D')+abs(1064,300,432,540,{overflow:'hidden'},`<img src="${M1.post}" alt="Primer plano del final de la palabra Siempre con la esfera teal como punto" style="width: 432px; height: 540px; object-fit: cover">`)+
 col(64,900,700,260,'Qué lo hace actual',list(['Materia y luz reales: sombra, rebote y profundidad de campo, no un círculo plano.','Papel cálido en vez de navy de fondo: el navy queda para la tipografía.','La palabra sangra por el borde; la composición no se centra.'],14))+
 col(800,900,736,260,'Cómo se produce',list(['Render 3D (Blender) con la tipografía real impresa en el muro; la esfera nunca la dibuja un modelo generativo.','Sirve también como objeto físico: una esfera de cerámica teal en recepción o en la mesa de reuniones.','Pendiente: probar la esfera dentro de fotos del lenguaje fotográfico.'],14)),1600,1200);
boards['M-02-editorial.dc.html']=board('A3·5 · Editorial',
 head('A3·5 · Contemporáneo · editorial','Menos masa, más precisión.','La tipografía pesada en todo es parte de lo que se ve viejo. El contraste entre pesos de Bricolage (300 contra 800), el aire, una grilla asimétrica y los metadatos chicos se leen hoy como diseño editorial actual. La esfera queda chica y exacta.')+
 place(64,300,'Post',S.m2_post,.36)+place(480,300,'Slide',S.m2_slide,.33)+place(480,700,'Muro',S.m2_wall,.25)+
 col(1150,700,386,420,'Reglas editoriales',list(['Fondo papel cálido #EFEBE4; navy para texto.','Una frase en dos pesos: la parte que abre en 300, la que cierra en 800 con la esfera.','Metadatos chicos en versalitas con filete fino arriba.','Grilla asimétrica: nunca centrar el bloque principal.'],13.5)),1600,1100);
boards['M-03-viva.dc.html']=board('A3·6 · Viva',
 head('A3·6 · Contemporáneo · viva','La esfera se mueve y mide.','Una identidad actual no es una imagen fija. La esfera cambia de tamaño con un dato real y la tipografía variable cambia de peso en movimiento. Así el sistema se ve vivo en pantallas, video y producto.')+
 [[20,'Ejemplo A'],[50,'Ejemplo B'],[80,'Ejemplo C']].map(([v,l],i)=>place(64+i*320,300,`Dato ${l.slice(-1)} · ${v} %`,S.m3_data(v,l),.27)).join('')+
 lab(1040,300,'Movimiento · peso variable y esfera que cae')+abs(1040,300,500,null,{display:'flex',flexDirection:'column',gap:10},[['0,0 s',300,240,'peso 300'],['0,4 s',550,120,'peso 550'],['0,8 s',800,0,'peso 800, la esfera asienta']].map(([t,w,dr,lb])=>tileOf(S.m3_frame(t,w,dr,lb),.26)).join(''))+
 col(64,760,940,300,'Reglas',list(['El área de la esfera representa el dato (no el diámetro), para no exagerar diferencias.','Sólo con datos reales y su fuente; en ejemplos se rotula como tal.','Motion: el peso sube de 300 a 800 mientras la esfera cae y asienta en 1,2 s.','En producto, el anillo pulsa mientras Nexa trabaja y se llena al responder.'],14)),1600,1100);

// ================= B3 · Espacio con la lente (reemplaza la versión de puntos) =================
// Vidrio esmerilado: la sala se ve borrosa y aclarada; un solo círculo transparente a la altura de los ojos.
const frosted=({src,x,y,w,h,cx,cy,D,pos='50% 45%',alt})=>abs(x,y,w,h,{overflow:'hidden'},
 `<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; object-fit: cover; object-position: ${pos}; filter: blur(22px) brightness(1.35) saturate(0.35)">`+abs(0,0,w,h,{background:'rgba(236,240,243,0.72)'})+
 abs(0,0,w,h,{clipPath:`circle(${D/2}px at ${cx-x}px ${cy-y}px)`},`<img src="${src}" alt="" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; object-fit: cover; object-position: ${pos}">`)+
 abs(cx-x-D/2,cy-y-D/2,D,D,{borderRadius:'50%',boxShadow:'inset 0 0 0 3px rgba(255,255,255,0.55)'}));
S.o_recep=()=>{const W=1920,H=1080;return {W,H,bg:C.dark,html:lens({src:IMG.L4,W,H:970,cx:1150,cy:400,D:760,zoom:1.12,alt:'Camarógrafo revisa la toma en el monitor mientras la barista trabaja al fondo'})+abs(120,700,null,null,{},dom('Hacer',190,C.white))+abs(0,970,W,110,{background:'#1A2530'})};};
S.o_sala=()=>{const W=1920,H=1080,x=140,y=90,w=1640,h=880;return {W,H,bg:'#E4E6E3',html:frosted({src:IMG.L6,x,y,w,h,cx:1180,cy:470,D:620,alt:'Una mujer escucha al cliente en una llamada, con la libreta y el lápiz sin usar'})+
 abs(x,y,w,h,{border:'14px solid #9AA4AC',boxSizing:'border-box'})+abs(x+120,y+110,null,null,{},div(W8(170,C.navy,300),'Sala 02'))+
 abs(x+128,y+330,520,null,{display:'flex',alignItems:'center',gap:18},div({width:30,height:30,borderRadius:'50%',background:C.tealDark})+p('En sesión hasta las 16:00',34,C.navy,500))+abs(0,970,W,110,{background:'#C9CDC9'})};};
S.o_pasillo=()=>{const W=1920,H=1080;return {W,H,bg:C.dark,html:lens({src:IMG.L2,W,H:970,cx:980,cy:470,D:560,zoom:1.25,pos:'50% 42%',alt:'Doce pruebas de la misma etiqueta en la pared; una mano retira la elegida'})+abs(120,120,700,null,{},q('¿Cuál sale al aire?',40,C.soft))+abs(120,190,null,null,{},dom('Esta',170,C.white))+abs(1380,860,420,null,{},p('v07 · aprobada por dirección de arte',22,C.soft,500))+abs(0,970,W,110,{background:'#1A2530'})};};
S.o_pizarra=()=>{const W=1920,H=1080,bx=120,by=90,bw=1680,bh=860,cx=1330,cy=520,D=640,r=D/2,d=D*.13,g=D*.025,a=-45*Math.PI/180;
 return {W,H,bg:'#E4E6E3',html:abs(bx,by,bw,bh,{background:C.white,border:'14px solid #C9CDC9',boxSizing:'border-box'})+
  abs(bx+90,by+110,null,null,{},div(W8(118,C.navy,300),'¿Qué aprendimos')+div(W8(118,C.navy,800,{marginTop:6}),'en este ciclo?'))+
  abs(cx-r,cy-r,D,D,{borderRadius:'50%',border:`28px solid ${C.tealDark}`,boxSizing:'border-box'})+
  abs(cx+(r+g+d/2)*Math.cos(a)-d/2,cy+(r+g+d/2)*Math.sin(a)-d/2,d,d,{borderRadius:'50%',background:C.teal,boxShadow:'0 6px 10px rgba(0,0,0,0.18)'})+
  abs(cx-220,cy+150,440,null,{},p('Escríbelo adentro.',30,C.muted,500,{textAlign:'center'}))+abs(bx+90,by+bh-110,700,null,{},cap('Pizarra de proyecto · ciclo 07',C.muted,22))+abs(0,970,W,110,{background:'#C9CDC9'})};};
boards['R2-07-espacio.dc.html']=board('B3 · Espacio',
 head('B3 · Espacio','La oficina se mira a través de la lente.','La lente pasa de la gráfica a la arquitectura. Los muros son fotos del trabajo real en navy apagado con un solo círculo a color; el vidrio de las salas es esmerilado y sólo deja ver hacia adentro a través de un círculo. Nada de patrones de puntos: una lente por muro.')+
 place(64,300,'Recepción · mural con lente',S.o_recep,.37)+place(820,300,'Sala de reuniones · vidrio esmerilado con un círculo transparente',S.o_sala,.37)+place(64,760,'Pasillo · muro de trabajo',S.o_pasillo,.37)+place(820,760,'Pizarra de proyecto · el anillo gigante espera la respuesta',S.o_pizarra,.37)+
 col(64,1220,1472,380,'Reglas de espacio',list(['Una lente por muro o por vidrio, a la altura de los ojos (centro a 1,5 m). Diámetro entre 1,2 y 2,4 m según el muro.','Murales: foto real del trabajo, en navy apagado; dentro de la lente, a color. Se renuevan con cada ciclo de proyectos.','Vidrio de salas: vinilo esmerilado completo con el círculo transparente; cumple además la función de visibilidad del vidrio.','Estado de la sala en texto, con la esfera teal oscuro: «En sesión hasta las 16:00».','Una palabra o pregunta del banco de voz por espacio, nunca más.','Pizarras: la pregunta impresa en dos pesos y un anillo teal gigante impreso donde el equipo escribe la respuesta; un imán esfera marca cuando se decide.'],13.5)),1600,1560);

// ================= A3·2+ · El foco: «Te hacemos visible» =================
// Foco de escenario: todo en penumbra; un círculo de luz de borde suave. La esfera chica tangente es la lámpara.
const lamp=(cx,cy,D,ang=-45,color=C.teal)=>{const R=D/2+D*.05,P=a=>[cx+R*Math.cos(a*Math.PI/180),cy+R*Math.sin(a*Math.PI/180)],[x0,y0]=P(ang-50),[x1,y1]=P(ang),k=Math.max(2,D/180);return `<svg width="${cx+R+40}" height="${cy+R+40}" style="position: absolute; left: 0; top: 0; overflow: visible" aria-hidden="true"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#72DED8" stroke-opacity="0.22" stroke-width="${k/2}"/><path d="M ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1}" fill="none" stroke="${color}" stroke-width="${k}" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="${2.2*k}" fill="${color}"/></svg>`;};
const spot=({src,W,H,cx,cy,D,pos='50% 45%',alt,ang=-45})=>{const r=D/2;
 return `<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: ${pos}; filter: grayscale(0.85) brightness(0.32)">`+abs(0,0,W,H,{background:'#021a33',mixBlendMode:'multiply',opacity:.6})+
  abs(0,0,W,H,{WebkitMaskImage:`radial-gradient(circle ${r}px at ${cx}px ${cy}px, #000 78%, transparent 100%)`,maskImage:`radial-gradient(circle ${r}px at ${cx}px ${cy}px, #000 78%, transparent 100%)`},`<img src="${src}" alt="" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: ${pos}; filter: brightness(1.12) contrast(1.05)">`)+
  lamp(cx,cy,D,ang);};
// Campo de palabras en penumbra; una sola en el foco. El foco no deja ver a nadie más dentro.
// El foco es luz, no un disco: halo difuso en el acento, sin borde.
const beam=(cx,cy,D)=>abs(cx-D*.75,cy-D*.75,D*1.5,D*1.5,{borderRadius:'50%',background:'radial-gradient(circle, rgba(54,200,191,0.30) 0%, rgba(54,200,191,0.16) 30%, rgba(54,200,191,0.05) 55%, rgba(54,200,191,0) 70%)'});
const wfield=(W,x0,y0,cols,rows,dx,dy,size,cx,cy,r)=>{let h='';for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=x0+i*dx+(j%2?dx*.35:0),y=y0+j*dy;const mx=x+size*2.4,my=y+size*.5;if(Math.hypot(mx-cx,my-cy)<r+size*1.6)continue;if(x+size*4.8>W)continue;h+=abs(x,y,null,null,{},div(W8(size,'#123A63',(i+j)%3?800:300),'Otra marca'));}return h;};
S.f_aeo=()=>{const W=1080,H=1350,cx=540,cy=780,D=520;
 return {W,H,bg:'#021A33',html:wfield(W,40,400,3,7,350,112,52,cx,cy,D/2)+beam(cx,cy,D)+abs(cx-300,cy-85,600,null,{display:'flex',justifyContent:'center'},dom('Tú',170,C.white))+lamp(cx,cy,D)+
  abs(90,110,900,null,{},q('¿Quién aparece cuando le preguntan a la IA por tu categoría?',40,C.soft))+abs(90,1240,900,null,{},p(`Te hacemos visible. ${b('Y lo medimos.')}`,30,C.soft))};};
S.f_photo=()=>({W:1920,H:1080,bg:'#021F3D',html:spot({src:IMG.L7,W:1920,H:1080,cx:1150,cy:420,D:720,alt:'La pieza aprobada proyectada sobre un muro de ladrillo, con la directora dentro del haz'})+abs(120,720,null,null,{},div(W8(120,C.white,300),'Te hacemos'))+abs(120,850,null,null,{},dom('visible',150,C.white))});
S.f_event=()=>{const W=1920,H=1080,cx=960,cy=470,D=760;return {W,H,bg:'#0A1826',html:abs(cx-D/2,cy-D/2,D,D,{borderRadius:'50%',background:'radial-gradient(circle, #F4F8F7 0%, #E6F0EE 40%, rgba(214,236,232,0.45) 66%, rgba(214,236,232,0) 92%)'})+
 `<img src="${LK.efeonce.full}" alt="Logo Efeonce iluminado por el foco" style="position: absolute; left: ${cx-230}px; top: ${cy-90}px; width: 460px; height: ${+(460*LK.efeonce.r).toFixed(1)}px">`+abs(cx-300,cy+60,600,null,{},p('Te hacemos visible.',38,C.navy,600,{textAlign:'center'}))+lamp(cx,cy,D,-60)};};
S.f_frame=(k)=>()=>{const W=1080,H=608,D=300,cy=320,cx=[540,300,540,540][k];const f=wfield(W,40,130,4,4,270,120,40,540,cy,D/2);
 const paso=['1 · Todo en penumbra','2 · El foco busca','3 · Se posa sobre ti','4 · Te hacemos visible'][k];
 const light=k===0?'':beam(cx,cy,D)+lamp(cx,cy,D);
 const lit=k>=2?abs(cx-200,cy-48,400,null,{display:'flex',justifyContent:'center'},dom('Tú',96,C.white,{sphereColor:C.teal})):'';
 return {W,H,bg:C.dark,html:f+light+lit+abs(40,32,W-80,null,{},p(paso,26,C.white,600))+(k===3?abs(0,H-78,W,null,{},p(`Te hacemos visible. <b style="font-weight: 600; color: #FFFFFF">Y lo medimos.</b>`,26,'#9FB3C8',400,{textAlign:'center'})):'')};};
boards['A3-2b-foco.dc.html']=board('A3·2+ · El foco',
 head('A3·2+ · El foco','Te hacemos visible.','La lente leída como foco de escenario. La esfera, en la punta de su arco, es la lámpara; el círculo, su luz; lo que queda dentro, el cliente. Es la promesa más clara del marketing dicha con la forma de la marca, y siempre va con su prueba: la visibilidad se mide.')+
 place(64,300,'Post AEO · la tuya en el foco',S.f_aeo,.33)+place(460,300,'Foto · luz de escenario',S.f_photo,.37)+
 place(460,760,'Evento o recepción · un foco real proyecta el círculo',S.f_event,.37)+
 lab(1200,300,'Movimiento · cuatro cuadros')+abs(1200,300,336,null,{display:'flex',flexDirection:'column',gap:8},[0,1,2,3].map(k=>tileOf(S.f_frame(k),.31)).join(''))+
 col(64,780,360,420,'Cómo se expresa',list(['Verbal: «Te hacemos visible.» como idea de campaña bajo «Empower your Growth», con remate de prueba: «Y lo medimos.»','Visual: penumbra navy y un solo foco; la esfera chica es la lámpara.','Espacio: un foco real con el círculo en recepción, stand o escenario.','Motion: el foco barre la escena y se posa sobre el cliente.'],12.5))+
 col(64,1230,1472,200,'Cuidar',list(['Anti-humo: «visible» siempre con mecanismo al lado (visibilidad en buscadores y respuestas de IA, alcance medido); calza sobre todo con Wave y Reach.','El foco de escenario es un recurso conocido: lo propio es la esfera en la punta del arco, la penumbra navy y una sola luz por pieza.','Nunca nombres reales de competidores en el campo en penumbra.'],13)),1600,1440);

// ================= F-06 · Firma de correo =================
const {firma:FIRMA}=await import('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/firma/firma.mjs');
const FPERS=JSON.parse(readFileSync('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/firma/personas.json','utf8'));
const FBLOB={'foto-julio-reyes':'/_blob/34f2c24378e9f021256a6e197472892b','logo-efeonce':'/_blob/7a7d2ec5a1f04676ffd7a4d0f6e65ef7','logo-globe':'/_blob/a38be0bd00678c161793a8dea6eb1319','logo-wave':'/_blob/05bd13281af6ec439c223757267f8790','logo-reach':'/_blob/7d79453f5ceabea2d833e8c84fda4726'};
const fp=id=>FIRMA(FPERS.find(p=>p.id===id),n=>FBLOB[n]);
const _mailPane=(x,y,w,h,id,scale=1)=>abs(x,y,w,h,{background:C.white,border:`1px solid ${C.line}`,boxSizing:'border-box',overflow:'hidden'},
 div({position:'absolute',left:28,top:24,width:(w-56)/scale,transform:`scale(${scale})`,transformOrigin:'0 0'},`<p style="font:14px Arial, Helvetica, sans-serif;color:#222;margin:0 0 20px">Quedo atento.</p>`+fp(id)));
const mailPane=(x,y,w,h,id,scale=1)=>{const r=_mailPane(x,y,w,h,id,scale);REC({type:'block',html:r,W:w,H:h,dw:w});return r;};
boards['F-06-firma-correo.dc.html']=board('F-06 · Firma de correo',
 head('F-06 · Firma de correo','La firma también cierra con la esfera.','HTML de correo con texto vivo: se selecciona, se llama y se busca, y no desaparece cuando el cliente bloquea imágenes. La esfera es el punto final del nombre, en el color de cada marca; debajo, el logo y el eslogan con su palabra de producto. Una línea opcional lleva la pregunta de la campaña vigente con su anillo.')+
 lab(64,320,'Persona · con línea de campaña (opcional)')+mailPane(64,320,700,330,'julio-reyes-campana')+
 lab(800,320,'Área · sin foto')+mailPane(800,320,440,330,'ventas')+
 lab(1276,320,'Móvil · 360 px')+mailPane(1276,320,260,330,'julio-reyes',.62)+
 lab(64,720,'Globe')+mailPane(64,720,464,300,'globe')+lab(568,720,'Wave')+mailPane(568,720,464,300,'wave')+lab(1072,720,'Reach')+mailPane(1072,720,464,300,'reach')+
 lab(64,1100,'Antes · firma 2025 (una sola imagen)')+`<img src="/_blob/ae0b2bc237a479c05ab191a8305668cc" alt="Firma de correo 2025 de Efeonce: imagen con foto, degradado, íconos naranjos, logos de productos y franja de partners" style="position: absolute; left: 64px; top: 1100px; width: 520px; height: 180px">`+
 col(64,1300,520,160,'Qué corrige',list(['Era una imagen: sin texto seleccionable ni enlaces, y en blanco si el cliente bloquea imágenes.','Mostraba Nexus, que no está en la familia vigente (Globe, Wave, Reach).','La franja de partners declara Meta, Truora y ActiveCampaign sin respaldo en el registro de partnerships.'],12.5))+
 col(640,1100,420,380,'Reglas',list(['Nombre en Bricolage con el punto en el color de la marca; resto en Arial para que se vea igual en Outlook.','Máximo dos imágenes: foto opcional y logo. Sin íconos ni banners.','La foto va sin punto al lado: en un avatar se lee como estado «disponible».','La línea de campaña es una sola, con pregunta real del cliente y un enlace; se cambia por campaña o se quita.','Partners: sólo con estado «Partnership activo» en el registro; hoy ninguno se muestra.'],12.5))+
 col(1100,1100,436,380,'Para instalarla',list(['Generador: exploracion-v5/firma (build.mjs + personas.json).','Logos y fotos se alojan en greenhouse.efeoncepro.com/branding/email/firma/ (pendiente de publicar).','En Outlook se pega el HTML de out/«persona».html; en M365 conviene firma centralizada para todo el equipo.','Fotos: retrato real de cada persona, fondo gris oscuro, recorte en círculo.'],12.5)),1600,1520);

// ================= La órbita · forma canónica de la esfera (origen: portadas de Efeonce Insights, en producción) =================
// Valores del catálogo insights-report (tokens del deck AXIS): fondo navy-920 #001A33, acento teal-500 #36C8BF, halo #72DED8.
const OR={navy:'#001A33',teal:'#36C8BF',halo:'#72DED8',ink:'#F4F6F8',sub:'#9FB3C8'};
const CH={google:'/_blob/b12b3200e29f478667bacb58fdd563ef',chatgpt:'/_blob/3ae04823b1994580496733493b7fe3ca',gemini:'/_blob/c1f699d37a4f86da4a943b30268247f9',claude:'/_blob/9130fff43e9c71c5c00bf4d06d3d5ac5',perplexity:'/_blob/30c70188f85edf14e65701475b974230'};
// Piso para redes: en lienzos de hasta 1200 px de ancho la línea se engrosa 1,75× para leerse en un teléfono (390 px).
const SOC=W=>W<=1200?W/794*1.75:W/794;
const pt=(cx,cy,r,a)=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)];
let ORB_ID=0;
// Órbita: anillo(s) + arco + esfera en la punta + halo. Ángulos en grados, 0 = derecha, sentido horario.
// Proporciones del catálogo: r ≈ 0,30 del ancho de página; anillo 1 px en 794 px de ancho; arco 1,6–2; esfera r 3,5–4.
const orbit=(o)=>globalThis.__DIST?'':orbit0(o);
const orbit0=({W,H,cx,cy,r,a0,a1,accent=OR.teal,halo=OR.halo,rings=[[1,.16]],haloOp=.13,k=SOC(W),grad=false,dot=true,dotRing=false,arcW=1.6})=>{
 const id='o'+(ORB_ID++),[x0,y0]=pt(cx,cy,r,a0),[x1,y1]=pt(cx,cy,r,a1),span=((a1-a0)%360+360)%360;
 const rs=rings.map(([f,op])=>`<circle cx="${cx}" cy="${cy}" r="${r*f}" fill="none" stroke="${halo}" stroke-opacity="${op}" stroke-width="${Math.max(1,k)}"/>`).join('');
 const g=grad?`<linearGradient id="${id}a" gradientUnits="userSpaceOnUse" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"><stop offset="0" stop-color="${accent}" stop-opacity=".15"/><stop offset="1" stop-color="${accent}"/></linearGradient>`:'';
 const arc=span>0?`<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${span>180?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" fill="none" stroke="${grad?`url(#${id}a)`:accent}" stroke-width="${arcW*k}" stroke-linecap="round"/>`:'';
 const d=dot?`<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${3.5*k}" fill="${accent}"/>`+(dotRing?`<circle cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" r="${9*k}" fill="none" stroke="${accent}" stroke-opacity=".4" stroke-width="${k}"/>`:''):'';
 return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; left: 0; top: 0" aria-hidden="true"><defs><radialGradient id="${id}h" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r*1.86}"><stop offset="0" stop-color="${accent}" stop-opacity="${haloOp}"/><stop offset=".6" stop-color="${accent}" stop-opacity="${haloOp*.23}"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>${g}</defs><rect width="${W}" height="${H}" fill="url(#${id}h)"/>${rs}${arc}${d}</svg>`;};
const sat=(cx,cy,r,a,src,alt,k,disc=OR.ink,accent=OR.teal)=>{const[x,y]=pt(cx,cy,r,a),D=30*k,I=18*k;return abs(x-D/2,y-D/2,D,D,{borderRadius:'50%',background:disc,boxShadow:`0 0 0 ${4*k}px ${accent}29, 0 ${6*k}px ${18*k}px rgba(0,8,20,0.45)`,display:'flex',alignItems:'center',justifyContent:'center'},`<img src="${src}" alt="${alt}" style="width: ${I}px; height: ${I}px; object-fit: contain">`);};
const logoNeg=(x,y,w)=>`<img src="${LK.efeonce.neg}" alt="Efeonce" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${+(w*LK.efeonce.r).toFixed(1)}px">`;
const kick=(t,size,color=OR.teal)=>p(t,size,color,500,{letterSpacing:'0.22em',textTransform:'uppercase',lineHeight:1.2,whiteSpace:'nowrap'});
const lensPhoto=(o)=>globalThis.__DIST?`<img src="${o.src}" alt="${o.alt}" style="position: absolute; left: 0; top: 0; width: ${o.W}px; height: ${o.H}px; object-fit: cover; object-position: ${o.pos||'50% 50%'}">`+abs(0,0,o.W,o.H,{background:'rgba(0,0,0,0.38)'}):lensPhoto0(o);
const lensPhoto0=({src,W,H,cx,cy,D,zoom=1.25,pos='50% 50%',alt})=>`<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: ${pos}; filter: grayscale(1) contrast(1.1) brightness(0.5)">`+abs(0,0,W,H,{background:OR.navy,mixBlendMode:'multiply',opacity:.8})+abs(0,0,W,H,{clipPath:`circle(${D/2}px at ${cx}px ${cy}px)`},`<img src="${src}" alt="" style="position: absolute; left: ${cx-cx*zoom}px; top: ${cy-cy*zoom}px; width: ${W*zoom}px; height: ${H*zoom}px; object-fit: cover; object-position: ${pos}">`);

// ---- Superficies ----
S.o_anat=()=>{const W=1920,H=1080,cx=1180,cy=540,r=380,k=2.1;const call=(x,y,t)=>abs(x,y,null,null,{},kick(t,15,OR.sub));
 const line=(x1,y1,x2,y2)=>`<svg width="${W}" height="${H}" style="position: absolute; left: 0; top: 0"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${OR.sub}" stroke-opacity=".5" stroke-width="1.5"/></svg>`;
 const[ax,ay]=pt(cx,cy,r,250),[sx,sy]=pt(cx,cy,r,-40),[mx,my]=pt(cx,cy,r,215);
 return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,rings:[[1,.22],[.72,.11],[.44,.06]],k,haloOp:.2,dotRing:true})+sat(cx,cy,r,-40,CH.gemini,'Gemini',k)+logoNeg(cx-150,cy-35,300)+
  line(ax,ay,ax-120,ay-40)+call(ax-420,ay-58,'Esfera · punta del arco')+line(mx,my,mx-160,my+10)+call(mx-450,my-2,'Arco · el avance')+line(cx+r,cy,cx+r+60,cy)+call(cx+r+70,cy-10,'Anillo · el recorrido')+
  line(sx,sy,sx+70,sy-60)+call(sx+40,sy-90,'Satélite')+line(cx+r*.72*Math.cos(2.4),cy+r*.72*Math.sin(2.4),cx-560,cy+330)+call(cx-900,cy+320,'Órbitas interiores (máx. 2)')+call(cx-120,cy+r*.44+40,'Halo · el foco')};};
S.o_simple=()=>{const W=1080,H=1350,cx=640,cy=520,r=320,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k})+abs(96,90,null,null,{},kick('Efeonce · Insights',17))+
 abs(96,900,900,null,{},q('¿Qué cambió este mes?',38,OR.ink,{ringColor:OR.teal}))+abs(96,970,900,null,{},dom('Lo que medimos',110,C.white,{sphereColor:OR.teal}))};};
S.o_avance=(pct=62)=>()=>{const W=1080,H=1350,cx=540,cy=560,r=330,k=SOC(W),a0=-90,a1=-90+360*pct/100;return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0,a1,k,arcW:2.4,haloOp:.16})+
 abs(cx-260,cy-120,520,null,{textAlign:'center'},div(W8(190,C.white,300,{textAlign:'center'}),`${pct}<span style="font-size: 110px"> %</span>`))+abs(cx-260,cy+95,520,null,{textAlign:'center'},p('de las respuestas de IA<br>ya mencionan la marca',26,OR.sub,400,{textAlign:'center'}))+
 abs(96,1150,900,null,{},p('Ejemplo: el arco mide el dato real. <b style="font-weight: 600; color: #F4F6F8">Sin dato, no hay arco de avance.</b>',24,OR.sub))};};
S.o_sats=()=>{const W=1080,H=1350,cx=700,cy=560,r=350,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:165,a1:305,k,grad:true,dot:false,rings:[[1,.22],[.72,.11],[.44,.06]],haloOp:.24,arcW:2})+
 sat(cx,cy,r,200,CH.google,'Google',k)+sat(cx,cy,r,235,CH.chatgpt,'ChatGPT',k)+sat(cx,cy,r,270,CH.gemini,'Gemini',k)+sat(cx,cy,r,305,CH.perplexity,'Perplexity',k)+
 abs(cx-54,cy-40,null,null,{},dom('Tú',96,C.white,{sphereColor:OR.teal}))+abs(96,1010,900,null,{},q('¿Apareces cuando le preguntan a la IA por tu categoría?',36,OR.ink,{ringColor:OR.teal}))+abs(96,1140,900,null,{},p('Te lo medimos en Google, ChatGPT, Gemini y Perplexity.',26,OR.sub))};};
// Aplicaciones
S.o_deck=()=>{const W=1920,H=1080,cx=1500,cy=380,r=340,k=W/1123*1.0;return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k:1.9})+logoNeg(140,110,230)+abs(400,118,null,null,{},kick('Revisión trimestral · Q3 2026',18,OR.sub))+
 abs(140,640,1100,null,{},q('¿Qué cambió este trimestre?',40,OR.ink,{ringColor:OR.teal}))+abs(140,715,1300,null,{},dom('Lo que medimos',150,C.white,{sphereColor:OR.teal}))};};
S.o_lenspost=()=>{const W=1080,H=1350,cx=640,cy=520,D=560,r=D/2+34,k=SOC(W);return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.L1,W,H,cx,cy,D,pos:'50% 40%',alt:'Manos ajustando la curva de color de una pieza en la mesa de corrección'})+orbit({W,H,cx,cy,r,a0:100,a1:160,k,haloOp:0,rings:[[1,.28]]})+
 abs(96,960,900,null,{},q('¿Cuál sale al aire?',36,OR.ink,{ringColor:OR.teal}))+abs(96,1030,900,null,{},dom('Esta',130,C.white,{sphereColor:OR.teal}))};};
S.o_story=()=>{const W=1080,H=1920,cx=540,cy=760,r=380,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:20,a1:95,k,rings:[[1,.2],[.72,.1]],haloOp:.2})+abs(0,cy-60,W,null,{display:'flex',justifyContent:'center'},dom('Visible',120,C.white,{sphereColor:OR.teal}))+
 abs(140,1400,W-280,null,{display:'flex',justifyContent:'center',textAlign:'center'},q('¿Quién aparece cuando preguntan por tu categoría?',38,OR.ink,{ringColor:OR.teal,textAlign:'center'}))+abs(0,1560,W,null,{},p(`Te hacemos visible. <b style="font-weight: 600; color: #F4F6F8">Y lo medimos.</b>`,30,OR.sub,400,{textAlign:'center'}))+logoNeg(W/2-110,1760,220)};};
S.o_banner=()=>{const W=1584,H=396,cx=1250,cy=198,r=150,k=1.2;return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k,rings:[[1,.2],[.6,.08]],haloOp:.18})+abs(80,112,null,null,{},dom('Te hacemos visible',64,C.white,{sphereColor:OR.teal}))+abs(80,210,null,null,{},p('Crecimiento medido: marca, búsqueda y medios.',22,OR.sub))+logoNeg(cx-80,cy-19,160)};};
S.o_muro=()=>{const W=1920,H=1080,cx=1150,cy=420,D=700,r=D/2+40;return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.L3,W,H,cx,cy,D,zoom:1.0,pos:'50% 27%',alt:'La sombra de una mano pone un imán lima sobre un anillo azul dibujado en la pizarra'})+orbit({W,H,cx,cy,r,a0:200,a1:250,k:2.2,haloOp:0,rings:[[1,.3]]})+abs(140,780,null,null,{},dom('Hacer',150,C.white,{sphereColor:OR.teal}))};};
S.o_frame=(i)=>()=>{const W=1080,H=608,cx=540,cy=304,r=190,k=SOC(W);const a1=[200,215,250,250][i];return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1,k,dot:i>0,haloOp:[0,.06,.13,.13][i]})+(i>=2?logoNeg(cx-110,cy-26,220):'')+(i===3?abs(0,cy+50,W,null,{},slogan('Growth',20,{dark:true,align:'center'})):'')};};
// Familia
S.o_fam=(b)=>()=>{const W=1080,H=1350,cx=540,cy=560,r=330,k=SOC(W),acc=b.k==='efeonce'?OR.teal:b.onDark,bg=b.k==='efeonce'?OR.navy:C.ink2;
 return {W,H,bg,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k,accent:acc,halo:b.k==='efeonce'?OR.halo:acc})+lkImg(b,true,cx-170,cy-170*LK[b.k].r,340)+abs(0,1080,W,null,{},slogan({efeonce:'Growth',globe:'Brand',wave:'Engine',reach:'Voice'}[b.k],34,{dark:true,align:'center',accent:b.k==='efeonce'?C.white:acc}))};};
S.o_portafolio=()=>{const W=1920,H=1080,cx=1180,cy=540,r=380,k=2.2;const f=FAM.slice(1);
 const disc=(a,b)=>{const[x,y]=pt(cx,cy,r,a),D=92;return abs(x-D/2,y-D/2,D,D,{borderRadius:'50%',background:OR.ink,boxShadow:`0 0 0 9px ${b.onDark}33, 0 12px 30px rgba(0,8,20,0.5)`,display:'flex',alignItems:'center',justifyContent:'center'},`<img src="${b.iso[0]}" alt="Isotipo ${b.name}" style="width: 52px; height: 52px; object-fit: contain">`)+(a>45&&a<135?abs(x-200,y+D/2+14,400,null,{},p(`<b style="font-weight: 600; color: #F4F6F8">${b.name}</b><br>${b.role}`,20,OR.sub,400,{lineHeight:1.35,textAlign:'center'})):a>225&&a<315?abs(x-200,y-D/2-72,400,null,{},p(`<b style="font-weight: 600; color: #F4F6F8">${b.name}</b><br>${b.role}`,20,OR.sub,400,{lineHeight:1.35,textAlign:'center'})):Math.cos(a*Math.PI/180)<0?abs(x-D/2-380,y-24,360,null,{},p(`<b style="font-weight: 600; color: #F4F6F8">${b.name}</b><br>${b.role}`,20,OR.sub,400,{lineHeight:1.35,textAlign:'right'})):abs(x+D/2+18,y-24,360,null,{},p(`<b style="font-weight: 600; color: #F4F6F8">${b.name}</b><br>${b.role}`,20,OR.sub,400,{lineHeight:1.35})));};
 return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:150,a1:330,k,grad:true,dot:false,rings:[[1,.22],[.72,.11],[.44,.06]],haloOp:.2,arcW:2})+logoNeg(cx-150,cy-35,300)+disc(200,f[0])+disc(265,f[1])+disc(330,f[2])+disc(90,{name:'Greenhouse',role:'Plataforma operativa',iso:['/_blob/59db7d6b9744c5df40036b436c0cab99'],onDark:'#0d6b3f'})+
  abs(140,120,null,null,{},kick('Efeonce · cómo trabajamos',16,OR.sub))+abs(140,170,560,null,{},dom('Tres productos, una plataforma',72,C.white,{sphereColor:OR.teal,whiteSpace:'normal',lineHeight:1.02}))};};

// ---- Láminas ----
const swatch=(x,y,hex,name,tok)=>abs(x,y,220,null,{display:'flex',gap:12,alignItems:'center'},div({width:44,height:44,borderRadius:'50%',background:hex,border:`1px solid ${C.line}`,flexShrink:0})+p(`<b style="font-weight: 600">${name}</b> ${hex}<br><span style="color: ${C.muted}">${tok}</span>`,12,C.ink,400,{lineHeight:1.4}));
boards['O-01-orbita.dc.html']=board('O-01 · La órbita',
 head('O-01 · La órbita','La esfera viaja por su órbita.','La forma canónica de la esfera sale del propio isotipo (nave, órbita y esfera) y ya está en producción en las portadas de Efeonce Insights. Un anillo tenue es el recorrido; el arco, lo avanzado; la esfera en la punta, dónde vamos; el halo, el foco sobre lo importante. Todo es línea fina y luz, nunca un disco plano.')+
 place(64,300,'Anatomía',S.o_anat,.5)+
 col(1080,300,456,540,'Regla',list(['Anillo: 1 px por cada 794 px de ancho (en redes, ×1,75: 2,4 px sobre 1080), opacidad 16–22 %. Máximo dos órbitas interiores (72 % y 44 % del radio, opacidad 11 % y 6 %).','Arco: 1,6–2 px por cada 794 px, punta redonda, sentido horario. Corto (40–60°) con esfera; largo (hasta 140°) en degradé cuando lleva satélites, y entonces sin esfera.','Esfera: radio 3,5–4 px por cada 794 px (en redes, ×1,75: 8 px sobre 1080); siempre en la punta del arco, nunca suelta.','Radio de la órbita: 30 % del ancho en retrato; en horizontal, 40 % del alto.','Halo radial: 13 % en el centro, 3 % al 60 %, 0 al borde. Nada de brillos ni reflejos.','Arco de avance: sólo con un dato real; el arco mide el dato.','Satélites: discos de 30 px con el ícono del canal o producto, sobre la órbita exterior.'],12.5))+
 place(64,900,'Simple · portada',S.o_simple,.3)+place(420,900,'Avance · el arco mide',S.o_avance(62),.3)+place(776,900,'Con satélites',S.o_sats,.3)+
 col(1140,900,396,420,'Color (tokens AXIS del deck)',swatch(0,40,OR.navy,'Fondo','--axis-deck-navy-920')+swatch(0,110,OR.teal,'Acento','--axis-deck-teal-500')+swatch(0,180,OR.halo,'Halo','--axis-deck-recipe-cover-halo-teal')+
  abs(0,260,396,null,{},p('Decidido (25-09-2026): en oscuro manda esta paleta. En papel, navy #023C70 para texto y teal #0E8C82 sólo para gráfica (esfera, arco, anillo): en texto chico no llega a 4,5:1.',12.5,C.ink,400,{lineHeight:1.45}))),1600,1460);
boards['O-02-orbita-aplicaciones.dc.html']=board('O-02 · Órbita: aplicaciones',
 head('O-02 · Aplicaciones con la órbita','Donde antes había un disco, ahora hay una órbita.','Deck, campaña, story, banner, muro y movimiento con la misma regla. En las fotos, la órbita rodea la lente: la foto en navy apagado, el círculo a color y el arco con su esfera alrededor.')+
 place(64,300,'Portada de deck',S.o_deck,.4)+place(864,300,'Post · la lente con órbita',S.o_lenspost,.3)+place(1220,300,'Story',S.o_story,.166)+
 place(64,780,'Muro de recepción',S.o_muro,.4)+place(864,780,'Banner de LinkedIn',S.o_banner,.42)+
 lab(864,1000,'Movimiento · el arco crece, la esfera llega y aparece la firma')+abs(864,1000,672,null,{display:'flex',gap:8,flexWrap:'wrap'},[0,1,2,3].map(i=>tileOf(S.o_frame(i),.307)).join(''))+
 col(64,1260,1472,160,'Cómo se lee',list(['Una sola órbita por pieza. La esfera marca dónde vamos; el titular sigue cerrando con su punto.','En fotos, la órbita no tapa la cara ni el gesto: rodea la lente con aire.','En movimiento: el anillo aparece, el arco crece en 600 ms, la esfera llega y asienta; al final, la firma.'],13)),1600,1440);
boards['O-03-orbita-familia.dc.html']=board('O-03 · Órbita: familia',
 head('O-03 · La órbita en la familia','Cada producto en su órbita; Efeonce en el centro.','La misma órbita con el acento de cada marca: teal en Efeonce, naranja en Globe, azul en Wave y naranja rojo en Reach. En el mapa de portafolio, los productos y Greenhouse, la plataforma, son satélites de Efeonce.')+
 FAM.map((b,i)=>place(64+i*370,300,b.name,S.o_fam(b),.3)).join('')+
 place(64,800,'Mapa de portafolio · productos como satélites',S.o_portafolio,.5)+
 col(1080,800,456,460,'Reglas',list(['Efeonce: fondo navy #001A33 y acento teal. Productos: tinta #091951 y su acento en oscuro.','El halo toma el color del acento; nunca dos acentos en la misma órbita.','En el mapa de portafolio, el arco y el centro son de Efeonce; los productos van como satélites con su isotipo.','Greenhouse, la plataforma operativa, también orbita como satélite con su marca (la G verde). La línea gráfica es de Efeonce: no se aplica a la interfaz de Greenhouse.','La palabra final del eslogan toma el acento de la marca.'],13)),1600,1400);

// ================= La órbita · deck, campaña y oficina =================
const PAPER={bg:C.paper,accent:C.tealDark,ring:C.navy};
const orbitPaper=o=>orbit({accent:PAPER.accent,halo:PAPER.ring,rings:[[1,.14]],haloOp:.05,...o});
const prog=(n,of)=>[-90,-90+360*n/of];
S.d_seccion=(n,of,t)=>()=>{const W=1920,H=1080,cx=1420,cy=540,r=300,[a0,a1]=prog(n,of);return {W,H,bg:PAPER.bg,html:orbitPaper({W,H,cx,cy,r,a0,a1,k:2.2,arcW:1.8})+
 abs(cx-200,cy-110,400,null,{},div(W8(190,C.navy,300,{textAlign:'center'}),String(n).padStart(2,'0')))+abs(cx-200,cy+100,400,null,{},p(`Sección ${n} de ${of}`,24,C.muted,500,{textAlign:'center'}))+
 abs(140,420,900,null,{},q('¿Qué probamos?',40,C.ink))+abs(140,495,1000,null,{},dom(t,120,C.navy))};};
S.d_contenido=()=>{const W=1920,H=1080,[a0,a1]=prog(3,5);const kpi=(x,v,l)=>abs(x,620,380,null,{},div(W8(110,C.navy,300),v)+p(l,22,C.muted,400,{marginTop:12}));
 return {W,H,bg:PAPER.bg,html:orbitPaper({W,H,cx:1760,cy:130,r:40,a0,a1,k:2.2,arcW:1.8,haloOp:0})+abs(140,110,null,null,{},cap('Revisión trimestral · 3 de 5',C.muted,16))+
  abs(140,200,1300,null,{},q('¿Qué funcionó?',40,C.ink))+abs(140,270,1500,null,{},dom('Lo que repetimos',110,C.navy))+kpi(140,'+38 %','clics orgánicos vs. Q2')+kpi(620,'12','piezas aprobadas en primera ronda')+kpi(1100,'4 de 5','respuestas de IA nos mencionan')+
  abs(140,960,1400,null,{},p('Ejemplo de estructura; las cifras son de muestra, no datos reales.',18,C.muted))};};
S.d_cierre=()=>{const W=1920,H=1080,cx=960,cy=330,r=200;return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:-90,a1:269.5,k:2.2,arcW:1.8,haloOp:.16})+logoNeg(cx-110,cy-26,220)+
 abs(0,620,W,null,{display:'flex',justifyContent:'center'},q('¿Qué sigue?',40,OR.ink,{ringColor:OR.teal}))+abs(0,690,W,null,{display:'flex',justifyContent:'center'},dom('Decidir juntos',120,C.white,{sphereColor:OR.teal}))+
 abs(0,900,W,null,{},slogan('Growth',28,{dark:true,align:'center'}))};};
S.c_conv=()=>{const W=1080,H=1350,cx=540,cy=500,D=700,r=D/2+34,k=SOC(W);return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.L6,W,H,cx,cy,D,zoom:1.02,pos:'50% 45%',alt:'Una mujer escucha al cliente en una llamada, con la libreta y el lápiz sin usar'})+orbit({W,H,cx,cy,r,a0:195,a1:250,k,haloOp:0,rings:[[1,.28]]})+
 abs(96,1010,900,null,{},q('¿Quién escribe el próximo brief?',36,OR.ink,{ringColor:OR.teal}))+abs(96,1080,900,null,{},dom('Los dos',130,C.white,{sphereColor:OR.teal}))};};
S.c_linkedin=()=>{const W=1200,H=627,cx=860,cy=280,D=440,r=D/2+26,k=1.5;return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.L4,W,H,cx,cy,D,zoom:1.0,pos:'50% 50%',alt:'Camarógrafo revisa la toma en el monitor mientras la barista trabaja al fondo'})+orbit({W,H,cx,cy,r,a0:195,a1:250,k,haloOp:0,rings:[[1,.28]]})+
 abs(70,330,500,null,{},q('¿Cómo va tu campaña?',26,OR.ink,{ringColor:OR.teal}))+abs(70,380,500,null,{},dom('En vivo',90,C.white,{sphereColor:OR.teal}))+abs(70,500,500,null,{},p('Entra a tu operación cuando quieras.',20,OR.sub))};};
// Oficina
S.e_sala=()=>{const W=1920,H=1080,x=140,y=90,w=1640,h=880,cx=1180,cy=470,D=560,r=D/2+34;return {W,H,bg:'#E4E6E3',html:frosted({src:IMG.L6,x,y,w,h,cx,cy,D,alt:'Una mujer escucha al cliente en una llamada, con la libreta y el lápiz sin usar'})+
 orbit({W,H,cx,cy,r,a0:195,a1:250,k:2.2,accent:C.tealDark,halo:C.navy,rings:[[1,.35]],haloOp:0,arcW:2})+abs(x,y,w,h,{border:'14px solid #9AA4AC',boxSizing:'border-box'})+
 abs(x+120,y+110,null,null,{},div(W8(170,C.navy,300),'Sala 02'))+abs(x+128,y+330,560,null,{},p('En sesión hasta las 16:00',34,C.navy,500))+abs(0,970,W,110,{background:'#C9CDC9'})};};
S.e_pasillo=()=>{const W=1920,H=1080,cx=1080,cy=470,D=560,r=D/2+40;return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.L2,W,H:970,cx,cy,D,zoom:1.25,pos:'50% 42%',alt:'Doce pruebas de la misma etiqueta en la pared; una mano retira la elegida'})+orbit({W,H,cx,cy,r,a0:195,a1:250,k:2.2,haloOp:0,rings:[[1,.28]]})+
 abs(120,120,700,null,{},q('¿Cuál sale al aire?',40,OR.ink,{ringColor:OR.teal}))+abs(120,190,null,null,{},dom('Esta',170,C.white,{sphereColor:OR.teal}))+abs(1380,860,420,null,{},p('v07 · aprobada por dirección de arte',22,OR.sub,500))+abs(0,970,W,110,{background:'#101A24'})};};
S.e_pizarra=()=>{const W=1920,H=1080,bx=120,by=90,bw=1680,bh=860,cx=1330,cy=520,r=330;const[mx,my]=pt(cx,cy,r,-40),m=58;return {W,H,bg:'#E4E6E3',html:abs(bx,by,bw,bh,{background:C.white,border:'14px solid #C9CDC9',boxSizing:'border-box'})+
 orbit({W,H,cx,cy,r,a0:-110,a1:-40,k:4,accent:C.tealDark,halo:C.navy,rings:[[1,.3],[.72,.12]],haloOp:0,dot:false,arcW:2.5})+
 abs(bx+90,by+110,null,null,{},div(W8(110,C.navy,300),'¿Qué aprendimos')+div(W8(110,C.navy,800,{marginTop:6}),'en este ciclo?'))+
 abs(mx-m/2,my-m/2,m,m,{borderRadius:'50%',background:`radial-gradient(circle at 35% 30%, #3FD1C6, ${C.tealDark} 70%)`,boxShadow:'0 8px 14px rgba(0,0,0,0.22)'})+
 abs(cx-200,cy-20,400,null,{},p('Escríbelo adentro.',30,C.muted,400,{textAlign:'center'}))+abs(bx+90,by+bh-110,700,null,{},cap('Pizarra de proyecto · ciclo 07',C.muted,16))+abs(0,970,W,110,{background:'#C9CDC9'})};};
boards['O-04-orbita-deck-campana.dc.html']=board('O-04 · Órbita: deck y campaña',
 head('O-04 · Deck y campaña con la órbita','La órbita también cuenta el avance.','En el deck, la órbita es la navegación: el arco crece sección a sección y en el cierre se completa. En campaña, rodea la lente sobre las fotos del lenguaje fotográfico.')+
 place(64,300,'Portada',S.o_deck,.36)+place(780,300,'Sección · el arco = 2 de 5',S.d_seccion(2,5,'Lo que probamos'),.36)+
 place(64,740,'Contenido · la órbita chica marca 3 de 5',S.d_contenido,.36)+place(780,740,'Cierre · la órbita se completa',S.d_cierre,.36)+
 place(64,1180,'Post 4:5 · campaña',S.c_conv,.28)+place(400,1180,'LinkedIn 1200 × 627',S.c_linkedin,.48)+
 col(1020,1180,516,360,'Reglas',list(['Deck: portada con arco corto; cada sección suma su tramo; el cierre completa la órbita con la esfera arriba.','Contenido en papel: la órbita baja a 80 px en la esquina, sólo como indicador.','Campaña: la órbita rodea la lente con aire; la esfera va arriba a la izquierda, lejos de la cara.','El titular sigue cerrando con su punto; la órbita no reemplaza la voz.'],12.5)),1600,1600);
boards['O-05-orbita-espacio.dc.html']=board('O-05 · Órbita: oficina',
 head('O-05 · La oficina con la órbita','La órbita se imprime; la esfera se toca.','Recepción, sala, pasillo y pizarra. En vinilo y en muro, la órbita es una línea fina; en la pizarra, la esfera es un imán real que se mueve por su órbita a medida que el equipo avanza.')+
 place(64,300,'Recepción · lente con órbita',S.o_muro,.38)+place(840,300,'Sala · vidrio esmerilado con órbita en vinilo',S.e_sala,.36)+
 place(64,760,'Pasillo · muro de trabajo',S.e_pasillo,.38)+place(840,760,'Pizarra · el imán avanza por la órbita',S.e_pizarra,.36)+
 col(64,1220,1472,200,'Reglas de espacio',list(['Vinilo: anillo de 3 mm de ancho, arco de 5 mm, esfera de 18 mm; en muro, a la altura de los ojos (centro a 1,5 m).','Una órbita por muro o por vidrio; nada de patrones de anillos.','Pizarra: órbita impresa fina y un imán esférico teal que el equipo mueve para marcar el avance del ciclo.','El estado de la sala va en texto; la órbita no se usa como semáforo.'],13)),1600,1460);

// ================= La órbita · objetos, movimiento, especificaciones, fotografía, decisiones y manual =================
const OB={mugBlanca:'/_blob/7e77938b0047f683c8583b4512812f48',mugNavy:'/_blob/15a172d35a0ac70a0995c7466dda936e',mugNavy34:'/_blob/b11e28c09653583f320d4f7da67e1096',mugGlobe:'/_blob/3c494f03246cc554e274fc493bc8baa3',vid169:'/_blob/7043b207bc1ab1073e642e7ddc1e7605',vid11:'/_blob/5148e31a14a14537112a4863b05d0a0c',fin169:'/_blob/5b5e18458a084e70697abd625c02860a',fin11:'/_blob/bd7bf39c29ecf029c1108ca5f45c2e43'};
const photo=(x,y,w,h,src,alt,bg='#EDEFEE')=>(REC({type:'photo',src,alt,W:w,H:h,dw:w}),abs(x,y,w,h,{background:bg,outline:`1px solid ${C.line}`},`<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; object-fit: contain">`));
const _video=(x,y,w,h,src,poster,label)=>abs(x,y,w,h,{background:OR.navy,outline:`1px solid ${C.line}`,overflow:'hidden'},`<video src="${src}" poster="${poster}" autoplay loop muted playsinline aria-label="${label}" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; object-fit: cover"></video>`);
const video=(x,y,w,h,src,poster,label)=>{REC({type:'video',src,poster,label,W:w,H:h,dw:w});return _video(x,y,w,h,src,poster,label);};
boards['O-06-orbita-objetos-motion.dc.html']=board('O-06 · Órbita: objetos y movimiento',
 head('O-06 · Objetos y movimiento','La taza blanca se queda con su punto; la navy lleva la órbita.','Probamos la órbita sobre el mismo modelo de taza (render 3D real). La versión blanca con «Hacer.» ya era la más elegante y la órbita no le suma: queda igual. En navy y en las ediciones de producto, la órbita con el logo sí convierte la taza en objeto de marca. Abajo, el cierre de marca producido en video.')+
 lab(64,300,'Actual · blanca con punto final')+photo(64,300,340,340,FAM[0].mug[0],'Taza blanca con «Hacer.» y punto teal')+lab(424,300,'Blanca con órbita')+photo(424,300,340,340,OB.mugBlanca,'Taza blanca con «Hacer.» dentro de una órbita fina')+
 lab(784,300,'Navy · órbita con el logo')+photo(784,300,340,340,OB.mugNavy,'Taza navy con órbita teal alrededor del logo Efeonce e interior teal')+lab(1144,300,'Navy · tres cuartos')+photo(1144,300,340,340,OB.mugNavy34,'La misma taza navy en tres cuartos: la órbita se curva con el cilindro')+
 lab(64,700,'Globe · la órbita en su acento')+photo(64,700,340,340,OB.mugGlobe,'Taza Globe en tinta con órbita naranja alrededor del logo e interior naranja')+
 col(424,700,1112,340,'Decisión propuesta',list(['Blanca: se queda con «Hacer.» y su punto (sin órbita). Es la pieza de todos los días.','Navy y productos: órbita con logo. Es la edición de marca y de regalo.','En cerámica no hay halo: sólo anillo 0,5 mm, arco 1,2 mm y esfera Ø 4,4 mm. La órbita mide 74 mm y va centrada en la cara frontal.','El interior toma el acento de la marca.'],13.5))+
 lab(64,1100,'Cierre de marca 16:9 · 4,5 s')+video(64,1100,800,450,OB.vid169,OB.fin169,'Animación: aparece el anillo, crece el arco, la esfera llega, sube el halo y aparecen el logo y el eslogan')+
 lab(900,1100,'Cierre 1:1 · redes')+video(900,1100,450,450,OB.vid11,OB.fin11,'La misma animación en formato cuadrado')+
 col(1380,1100,156,450,'Guion',list(['0–0,5 s anillo','0,4–1,4 s arco','1,4–1,7 s la esfera asienta','1,2–2,0 s halo','1,9–2,5 s logo','2,5–3,0 s eslogan'],12)),1600,1620);
// Especificaciones
const gridTile=({W,H,m,orb,text,unsafe=[],label})=>()=>{let h='';unsafe.forEach(([y0,y1])=>{h+=abs(0,y0,W,y1-y0,{background:'repeating-linear-gradient(45deg, rgba(248,57,2,0.16) 0 10px, transparent 10px 20px)'});});
 h+=abs(m,m,W-2*m,H-2*m,{border:'3px dashed rgba(114,222,216,0.55)',boxSizing:'border-box'});h+=orbit({W,H,cx:orb[0],cy:orb[1],r:orb[2],a0:200,a1:250,k:SOC(W)});
 h+=abs(text[0],text[1],text[2],text[3],{background:'rgba(244,246,248,0.10)',border:'2px solid rgba(244,246,248,0.35)',boxSizing:'border-box'},abs(16,12,null,null,{},p('Texto',Math.round(W/40),OR.ink,500)));
 return {W,H,bg:OR.navy,html:h};};
const T=(rows)=>`<table style="border-collapse: collapse; width: 100%; font-family: 'Poppins', sans-serif; font-size: 12.5px; color: ${C.ink}">${rows.map((r,i)=>`<tr>${r.map(c=>`<${i?'td':'th'} style="text-align: left; padding: 7px 10px 7px 0; border-bottom: 1px solid ${C.line}; vertical-align: top; font-weight: ${i?400:600}">${c}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</table>`;
boards['O-07-orbita-especificaciones.dc.html']=board('O-07 · Órbita: especificaciones',
 head('O-07 · Grillas y especificaciones','Dónde va la órbita y cómo se produce.','Grillas por formato con margen, zona de texto, posición de la órbita y zonas que tapa la interfaz de cada red. Abajo, medidas de producción por soporte.')+
 place(64,300,'4:5 · 1080 × 1350',gridTile({W:1080,H:1350,m:96,orb:[640,500,324],text:[96,900,888,354]}),.26)+
 place(370,300,'9:16 · rayado = interfaz',gridTile({W:1080,H:1920,m:96,orb:[540,760,324],text:[96,1300,888,280],unsafe:[[0,250],[1580,1920]]}),.183)+
 place(600,300,'16:9 · 1920 × 1080',gridTile({W:1920,H:1080,m:140,orb:[1340,470,432],text:[140,600,700,340]}),.31)+
 place(1220,300,'A4 · informe (Insights)',gridTile({W:794,H:1123,m:68,orb:[520,376,236],text:[68,720,658,335]}),.28)+
 col(64,700,1472,120,'Proporciones',list(['Margen: 9 % del lado corto en redes (96 px sobre 1080); 140 px en 16:9. Órbita: radio 30 % del ancho en vertical, 40 % del alto en horizontal; centro fuera del eje, hacia la derecha y arriba. El texto vive en el tercio inferior izquierdo y nunca cruza la órbita.'],13))+
 col(64,860,1472,560,'Producción por soporte',T([['Soporte','Anillo','Arco','Esfera','Halo','Notas'],
  ['Pantalla (base 794 px de ancho)','1 px · 16–22 %','1,6–2 px','r 3,5–4 px','13 → 3 → 0 %','Escala con el ancho del lienzo.'],
  ['Redes (≤ 1200 px de ancho)','× 1,75 (2,4 px sobre 1080)','× 1,75','× 1,75 (r 8 px)','igual','Verificado a 390 px de ancho: se lee sin perder finura.'],
  ['Papel (informe, cuaderno)','mín. 0,3 mm','mín. 0,5 mm','mín. Ø 1,5 mm','se omite o fondo liso','Degradados bajo 5 % hacen bandas en offset.'],
  ['Cerámica (taza)','0,5 mm','1,2 mm','Ø 4,4 mm','sin halo','Órbita Ø 74 mm, centrada en la cara frontal.'],
  ['Vinilo (muro, vidrio) · órbita Ø 1,2 m','3 mm','5 mm','Ø 18 mm','sin halo','Escala lineal con el diámetro; centro a 1,5 m del piso.'],
  ['Pizarra','impreso 2 mm, 30 %','impreso 4 mm','imán Ø 45 mm','sin halo','El imán es la esfera y se mueve.'],
  ['Video','igual que pantalla','crece en 1 s, ease-out','asienta con rebote de 0,3 s','sube en 0,8 s','Cierre de 4,5 s; con movimiento reducido, cuadro final fijo.']])+
  abs(0,300,1472,null,{},p('Color: los valores son sRGB. Para papel, cerámica y vinilo, la conversión a CMYK o Pantone se define con prueba física del proveedor; no se fija un código sin prueba.',12.5,C.muted))),1600,1260);
// Fotografía para la lente
boards['O-08-orbita-fotografia.dc.html']=board('O-08 · Órbita: fotografía para la lente',
 head('O-08 · Fotografía para la lente','Fotos pensadas para ser vistas a través de un círculo.','Antes repetíamos tres fotos y en todas se veía el emblema bordado, lo que invalidaba la prueba sin logo. Este es el banco propio: ocho tomas en el lenguaje fotográfico de Efeonce, registro documental, nadie mira al lente.')+
 col(64,300,700,560,'Reglas de la toma',list(['El sujeto importante cabe en un círculo del 55 % del lado corto, con 15 % de aire al borde del círculo.','Fuera del círculo la foto tolera quedar en navy apagado: nada esencial vive ahí.','Sin emblema legible: de espaldas, en sombra, fuera de cuadro o sin bordado. El logo lo pone la pieza, no la ropa.','El azul lo porta un objeto del oficio (trackball, etiqueta, azulejo, libreta, tinta), nunca un muro de fondo.','Un acento cálido, naranja o lima, en una de cada dos fotos, nacido de la acción.','Oficio a la vista: manos, pantalla, pieza, pizarra; la obra en proceso. Nadie mira al lente.'],13.5))+
 col(840,300,696,560,'Lista de tomas (8)',T([['#','Toma','Palanca','Acento'],['1','Manos ajustando una curva de color','manos','—'],['2','Elegir entre doce pruebas de una etiqueta','variantes','naranja'],['3','Estratega pone el imán sobre la órbita','sombra','lima'],['4','Camarógrafo revisa la toma en el monitor','quien-sostiene','—'],['5','Informe impreso, la línea que sube','cenital','lima'],['6','Llamada con cliente, sólo la escucha','escucha','—'],['7','La pieza aprobada, proyectada','proyeccion','naranja'],['8','Mesa al final del ciclo, con la pieza impresa','ausencia','—']]))+
 BANCO.map((f,i)=>lab(64+i*184,680,f[0])+photo(64+i*184,704,170,212,f[1],f[2])).join('')+
 col(64,960,1472,300,'Producción',list(['Generado el 2026-09-25 con pnpm foto:generar (una ficha por toma, gpt-image-2.5-sunburst en calidad alta): 11 generaciones, del orden de USD 0,55.','Tres rehechas por el lenguaje: la 5 (flatlay de stock), la 8 (oficina ordenada, sin huella) y la 6 (muro navy de fondo).','Palancas ajustadas: la 3 pasó a sombra y la 4 a quien-sostiene; instrumento exige mirar a través de una herramienta.','Ya reemplazan a las tres fotos repetidas en todas las piezas con lente, ventana y foco, y en los estímulos de la prueba sin logo.'],13.5)),1600,1280);
// Decisiones y prueba
const stim=(orbital)=>()=>{const W=1080,H=1350,cx=640,cy=500,r=324,k=SOC(W);return {W,H,bg:orbital?OR.navy:'#1C2430',html:(orbital?orbit({W,H,cx,cy,r,a0:200,a1:250,k}):'')+
 abs(96,900,900,null,{},orbital?q('¿Qué cambió este mes?',38,OR.ink,{ringColor:OR.teal}):p('¿Qué cambió este mes?',38,OR.ink,300))+abs(96,970,900,null,{},orbital?dom('Lo que medimos',110,C.white,{sphereColor:OR.teal}):div(W8(110,C.white,760),'Lo que medimos'))};};
boards['O-09-orbita-decisiones.dc.html']=board('O-09 · Órbita: decisiones y prueba',
 head('O-09 · Decisiones tomadas y prueba sin logo','Lo que quedó decidido y cómo se va a medir.','Decisiones aplicadas en este canvas (reversibles) y la prueba de atribución actualizada con piezas de la órbita.')+
 col(64,300,720,600,'Decisiones aplicadas',list(['Forma: la órbita es la forma canónica; el punto final se mantiene en titulares, firma de mail y taza blanca; el foco, en fotos.','Color: en oscuro manda la paleta de la órbita (#001A33, #36C8BF, #72DED8, tokens del deck AXIS); en papel, navy #023C70 y teal #0E8C82.','Hilo de familia: la órbita misma es el hilo (misma forma en las cuatro marcas) + la variante del eslogan (opción C). Queda descartada la B (anillo teal en productos).','Redes: grosor ×1,75 en lienzos de hasta 1200 px.','Retirado del canvas: punto gigante, esfera tipográfica, objeto 3D, variantes contemporáneas y aplicaciones planas. Queda en el repo como historia.'],13.5))+
 place(840,300,'Estímulo de prueba · con la órbita',stim(true),.3)+place(1196,300,'Distractor · mismo copy, sin órbita ni esfera',stim(false),.3)+
 col(840,760,696,440,'Protocolo (v2, ver O-10)',list(['Fase de aprendizaje con logo y atribución de piezas nuevas sin logo; 300 personas por versión (ver O-10).','8 piezas de atribución por versión: post, story, deck, muro, post con lente, LinkedIn, taza y post con satélites.','Preguntas: «¿de qué empresa crees que es?» (abierta), elección entre Efeonce y 5 competidores, y recuerdo de la pieza.','Éxito: +10 puntos de atribución asistida sobre el distractor, con 95 % de confianza.','Pendiente: proveedor de panel y presupuesto (decisión tuya).'],13.5))+
 col(64,960,720,260,'Sigue siendo tuyo',list(['Aprobar el banco de pares de copy (2.1).','Presupuesto del panel de la prueba (el banco de fotos O-08 ya está hecho).','Elegir firma A o B (F-06b) e instalarla.'],13.5)),1600,1260);
// Manual resumen
const msec=(x,y,w,n,t,body)=>(REC({type:'col',title:`${n} · ${t}`,body,W:w}),abs(x,y,w,null,{display:'flex',flexDirection:'column',gap:8},cap(`${n} · ${t}`,C.teal,12)+body));
boards['00b-manual.dc.html']=board('00b · Manual de la línea',
 head('00b · Manual de la línea gráfica (resumen)','Una esfera, su órbita y dos voces.','La línea en una lámina. Cada punto enlaza con su lámina de detalle.')+
 msec(64,300,450,'1','Idea',list(['La esfera del isotipo es el activo. Recorre su órbita: el avance es visible, el oficio está a la vista y la conversación cierra con una respuesta.'],13))+
 msec(574,300,450,'2','La esfera, tres estados',list(['Órbita: portadas, cierres, carga y avance (O-01).','Punto final: titulares, firma de mail y taza blanca (A2).','Foco: el halo sobre lo importante en fotos (A3·2+).'],13))+
 msec(1084,300,452,'3','Color',list(['Oscuro: #001A33, acento #36C8BF, halo #72DED8.','Papel: navy #023C70, teal #0E8C82.','Productos: tinta #091951 con su acento (Globe #FF6500, Wave #0375DB, Reach #F83902).'],13))+
 msec(64,560,450,'4','Tipografía',list(['Bricolage Grotesque para la respuesta; Poppins para la pregunta y el texto. Eslogan con los pesos del SSOT de marca.'],13))+
 msec(574,560,450,'5','Voz',list(['Pregunta real del cliente con anillo; respuesta de una a tres palabras que cierra con la esfera; evidencia debajo (A5).'],13))+
 msec(1084,560,452,'6','Oficio a la vista',list(['Selección y cursores de AXIS; guías y marcas de corte; máximo dos herramientas por pieza (A4).'],13))+
 msec(64,800,450,'7','Familia',list(['Misma órbita y misma voz; cambia el acento. En el portafolio, los productos son satélites de Efeonce (O-03).'],13))+
 msec(574,800,450,'8','Fotografía',list(['La lente: foto en navy apagado y el círculo a color, rodeado por la órbita. Sin emblema legible (O-08).'],13))+
 msec(1084,800,452,'9','Aplicaciones',list(['Deck con órbita de navegación (O-04), oficina (O-05), objetos y video de cierre (O-06), firma de mail (F-06).'],13))+
 msec(64,1040,1472,'10','No hacer',list(['Discos planos rellenos, brillos, reflejos o esferas de vidrio.','Dos órbitas o dos acentos en una pieza.','Arco de avance sin dato real.','Emblemas o logos de terceros como si fueran alianzas: los satélites de canales muestran dónde medimos, no con quién nos asociamos.','Texto cruzando la órbita.','Órbita alrededor del logo en objetos.'],13)),1600,1320);

// ================= Prueba sin logo · estímulos (versión línea vs. distractor) =================
// Distractor: misma copia, composición, foto y tipografía; sin órbita, sin esfera, sin anillo, sin lente y sin la paleta navy/teal.
const DIST=(fn)=>()=>{globalThis.__DIST=true;try{const x=fn();return {...x,bg:x.bg===OR.navy?'#1C2430':x.bg===C.paper?'#FFFFFF':x.bg,html:x.html.split('#001A33').join('#1C2430').split(OR.teal).join('#AEB6BF').split('#023C70').join('#2B2F36').split('#0E8C82').join('#8A929C')};}finally{globalThis.__DIST=false;}};
S.t_learn_post=()=>{const W=1080,H=1350,cx=640,cy=520,r=320,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k})+logoNeg(96,96,220)+abs(96,900,900,null,{},q('¿Lo medimos?',38,OR.ink,{ringColor:OR.teal}))+abs(96,970,900,null,{},dom('Siempre',130,C.white,{sphereColor:OR.teal}))};};
S.t_post=()=>{const W=1080,H=1350,cx=640,cy=520,r=320,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k})+abs(96,900,900,null,{},q('¿Qué funcionó?',38,OR.ink,{ringColor:OR.teal}))+abs(96,970,900,null,{},dom('Lo que repetimos',100,C.white,{sphereColor:OR.teal}))};};
S.t_story=()=>{const W=1080,H=1920,cx=540,cy=760,r=380,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:20,a1:95,k,rings:[[1,.2],[.72,.1]],haloOp:.2})+abs(0,cy-60,W,null,{display:'flex',justifyContent:'center'},dom('Visible',120,C.white,{sphereColor:OR.teal}))+
 abs(140,1400,W-280,null,{display:'flex',justifyContent:'center',textAlign:'center'},q('¿Quién aparece cuando preguntan por tu categoría?',38,OR.ink,{ringColor:OR.teal,textAlign:'center'}))};};
const ESTIMULOS={
 aprendizaje:[['L1-deck-portada',S.o_deck],['L2-banner-linkedin',S.o_banner],['L3-post',S.t_learn_post],['L4-cierre',S.d_cierre]],
 atribucion:[['R1-post',S.t_post],['R2-story',S.t_story],['R3-deck-seccion',S.d_seccion(2,5,'Lo que probamos')],['R4-muro',S.o_muro],['R5-post-lente',S.c_conv],['R6-linkedin',S.c_linkedin],['R8-post-satelites',S.o_sats]]};
const EST_DIR=new URL('./estimulos/',import.meta.url).pathname;import('node:fs').then(({mkdirSync})=>mkdirSync(EST_DIR,{recursive:true}));
globalThis.__ESTIMULOS=[];
for(const [fase,list] of Object.entries(ESTIMULOS))for(const [id,fn] of list)for(const [v,f] of [['linea',fn],['distractor',DIST(fn)]]){const x=f();globalThis.__ESTIMULOS.push({file:`${fase}-${id}-${v}.html`,W:x.W,H:x.H,html:page(id,x.W,x.H,div({width:x.W,height:x.H,position:'relative',background:x.bg,overflow:'hidden'},x.html))});}

// ================= v4 (2026-09-25): tazas decididas, firma de mail v2, prueba sin logo lista para campo =================
const OB2={navyPalabra:'/_blob/7ed3f0528a67df69d2df9fa5c704de53',globePalabra:'/_blob/9e62b5034654cf6f6d50763259938b93',tazaDist:'/_blob/781d2cd440b2ad85e1297eb83ff5f947'};
const tag=(x,y,t,ok)=>abs(x,y,null,null,{padding:'4px 10px',borderRadius:14,background:ok?'#E3F4F2':'#F6E4E1',color:ok?'#0B6B63':'#9A2A12',fontFamily:PO,fontSize:12,fontWeight:600},t);
const MUGS=[
 ['Blanca · favorita',FAM[0].mug[0],'Taza blanca con «Hacer.» y punto teal',FAM[0].mug[1],'Reverso blanco: sólo el logo Efeonce, chico y abajo','Reverso · blancas'],
 ['Blanca · órbita',OB.mugBlanca,'Taza blanca con «Hacer.» dentro de una órbita fina',null,'',''],
 ['Navy · órbita',OB2.navyPalabra,'Taza navy con «Hacer.» en blanco dentro de una órbita teal','/_blob/b3a2c526972a2edba0baf59f6b543614','Reverso navy: sólo el logo Efeonce en blanco','Reverso · navy'],
 ['Globe · órbita',OB2.globePalabra,'Taza Globe en tinta con «Crear.» dentro de una órbita naranja','/_blob/a32ea42722c417cce121d7be83203e29','Reverso Globe: sólo el logo Globe by efeonce','Reverso · Globe'],
 ['Wave · órbita','/_blob/94bc009ca795c2af84bda6969f89061a','Taza Wave en tinta con «Aparecer.» dentro de una órbita azul','/_blob/9ed19d0cc4250c3bfb822b53fd467d47','Reverso Wave: sólo el logo Wave by efeonce','Reverso · Wave'],
 ['Reach · órbita','/_blob/44d6c3c085adc4dccbcb08dbc111a50c','Taza Reach en tinta con «Llegar.» dentro de una órbita naranja rojo','/_blob/852ba7136d42b2b730fee0233cb13298','Reverso Reach: sólo el logo Reach by efeonce','Reverso · Reach']];
const MT=232,GX=248;
boards['O-06-orbita-objetos-motion.dc.html']=board('O-06 · Órbita: objetos y movimiento',
 head('O-06 · Objetos y movimiento','En la taza, la órbita acompaña a la palabra; nunca al logo.','Decisión del operador (25-09-2026): la blanca con «Hacer.» y su punto es la favorita; la órbita alrededor de la palabra en Bricolage también funciona, en toda la familia. Cada taza tiene dos caras: adelante la palabra, atrás el logo solo. Renders 3D sobre el mismo modelo de taza.')+
 MUGS.map(([l,src,alt],i)=>lab(64+i*GX,300,'Frente · '+l)+photo(64+i*GX,300,MT,MT,src,alt)).join('')+
 MUGS.map(([,,,src,alt,l],i)=>src?lab(64+i*GX,590,l)+photo(64+i*GX,590,MT,MT,src,alt):'').join('')+
 col(64+GX,590,MT,MT,'',p('Las dos blancas comparten el reverso: el logo solo.',13,C.muted))+
 col(64,880,1472,190,'Regla de objetos',list(['Frente: la palabra en Bricolage con su punto; la órbita es opcional y siempre alrededor de la palabra, con el acento de cada marca.','Reverso: el logo solo, chico y abajo, sin órbita ni texto. La órbita alrededor del logo quedó descartada.','En cerámica no hay halo: anillo 0,5 mm, arco 1,2 mm, esfera Ø 4,4 mm; órbita Ø 74 mm. El interior toma el acento de la marca.'],13.5))+
 lab(64,1110,'Cierre de marca 16:9 · 4,5 s')+video(64,1110,800,450,OB.vid169,OB.fin169,'Animación: aparece el anillo, crece el arco, la esfera llega, sube el halo y aparecen el logo y el eslogan')+
 lab(900,1110,'Cierre 1:1 · redes')+video(900,1110,450,450,OB.vid11,OB.fin11,'La misma animación en formato cuadrado')+
 col(1380,1110,156,450,'Guion',list(['0–0,5 s anillo','0,4–1,4 s arco','1,4–1,7 s la esfera asienta','1,2–2,0 s halo','1,9–2,5 s logo','2,5–3,0 s eslogan'],12)),1600,1620);
// Firma de mail v2
const {firmaV2:FIRMA2}=await import('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/firma/firma.mjs');
const FB2={...FBLOB,'foto-orbita-julio-reyes':'/_blob/34c7881fe2f7f10d4c725f66ec13f478','foto-orbita-oscura-julio-reyes':'/_blob/8a7a16320f9eb417f05e79f7e8521d3c','logo-efeonce-negativo':'/_blob/cc13e3a6067a76265716de61bfc23cd4','url-bubble':'/_blob/25fe50ecf373a63012616c56fb92149b','url-bubble-dark':'/_blob/a9c61255a36d2a15dc5cdcba67b7b7b7'};
const fp2=(id,e)=>FIRMA2(FPERS.find(p=>p.id===id),n=>FB2[n],e);
const _pane2=(x,y,w,h,id,e,scale=1)=>abs(x,y,w,h,{background:C.white,border:`1px solid ${C.line}`,boxSizing:'border-box',overflow:'hidden'},div({position:'absolute',left:28,top:24,width:(w-56)/scale,transform:`scale(${scale})`,transformOrigin:'0 0'},`<p style="font:14px Arial, Helvetica, sans-serif;color:#222;margin:0 0 20px">Quedo atento.</p>`+fp2(id,e)));
const pane2=(x,y,w,h,id,e,scale=1)=>{const r=_pane2(x,y,w,h,id,e,scale);REC({type:'block',html:r,W:w,H:h,dw:w});return r;};
boards['F-06b-firma-correo-v2.dc.html']=board('F-06b · Firma de correo v2',
 head('F-06b · Firma de correo, v2','Más marca: la órbita llega a la firma.','La v1 quedó demasiado simple. Dos opciones con la órbita alrededor de la foto (con el anillo y el arco ya no se lee como estado «disponible»). Siguen siendo HTML con texto vivo; tres imágenes como máximo: la foto, el logo y la burbuja oficial de la URL.')+
 lab(64,320,'A · clara · órbita en la foto y divisor que termina en la esfera')+pane2(64,320,700,400,'julio-reyes-campana','clara')+
 lab(836,320,'B · tarjeta navy · la portada de Insights en miniatura (recomendada)')+pane2(836,320,700,400,'julio-reyes-campana','tarjeta')+
 lab(64,790,'B · área sin foto')+pane2(64,790,700,320,'ventas','tarjeta')+lab(836,790,'B · móvil 360 px')+pane2(836,790,300,320,'julio-reyes','tarjeta',.72)+
 col(1172,790,364,420,'Por qué B',list(['Es la única que se reconoce de lejos en una bandeja de entrada: bloque navy, órbita y punto teal.','Funciona en modo oscuro sin cambios.','En Outlook de escritorio queda fija a 460 px; en móvil se adapta.'],12.5))+
 col(64,1180,1060,200,'Pendiente para instalarla',list(['Alojar los PNG en greenhouse.efeoncepro.com/branding/email/firma/ (requiere deploy).','Foto real de cada persona, recortada con la órbita por el generador (firma/assets.mjs).','Confirmar el correo de cada área y el enlace de la línea de campaña vigente.'],12.5)),1600,1440);
// Prueba sin logo
const pairT=(x,y,s,fn,label)=>lab(x,y,label)+abs(x,y,null,null,{display:'flex',gap:8},tileOf(fn,s)+tileOf(DIST(fn),s));
boards['O-10-prueba-sin-logo.dc.html']=board('O-10 · Prueba sin logo: lista para campo',
 head('O-10 · Prueba sin logo, lista para campo','Primero con logo, después sin él: ¿se reconoce a Efeonce?','La prueba no se puede correr sin un panel de personas reales: el kit está listo para el proveedor. Cambió el diseño: como Efeonce tiene poco reconocimiento en Chile, primero se aprende la marca con logo y después se atribuyen piezas nuevas sin logo. Cada par: línea a la izquierda, distractor a la derecha (mismo copy, foto y tipografía; sin órbita, esfera, anillo, lente ni paleta).')+
 cap('Fase 1 · aprendizaje (con logo)',C.teal,12,{position:'absolute',left:64,top:300})+
 pairT(64,350,.15,S.o_deck,'L1 · portada')+pairT(680,350,.18,S.t_learn_post,'L3 · post')+pairT(1090,350,.115,S.d_cierre,'L4 · cierre')+
 cap('Fase 2 · atribución (sin logo, piezas nuevas)',C.teal,12,{position:'absolute',left:64,top:680})+
 pairT(64,730,.2,S.t_post,'R1 · post')+pairT(524,730,.2,S.c_conv,'R5 · post con lente')+pairT(984,730,.14,S.t_story,'R2 · story')+
 pairT(64,1080,.17,S.o_muro,'R4 · muro')+pairT(740,1080,.17,S.d_seccion(2,5,'Lo que probamos'),'R3 · deck (papel)')+
 abs(1405,1310,120,null,{},cap('R7 · taza',C.muted,10.5))+photo(1193,1276,96,96,FAM[0].mug[0],'Taza con «Hacer.» y punto teal')+photo(1297,1276,96,96,OB2.tazaDist,'Taza distractora con «Hacer» en gris sin punto')+
 col(64,1420,1472,260,'Diseño y umbral',list(['600 personas (300 por versión): decisores de marketing y comercial en Chile, empresas de 50+ personas, sin agencias. Con 150 por versión sólo se detectan ~15 puntos.','Métrica: % que elige «Efeonce» entre Efeonce, 5 competidores reales y «No sé». Éxito: +10 puntos sobre el distractor, p < 0,05.','Kit en exploracion-v5/prueba-sin-logo/: PROTOCOLO.md, CUESTIONARIO.md, 24 estímulos, potencia.mjs y analisis.mjs (probado con datos sintéticos).','Resuelto: los estímulos con foto usan ahora el banco O-08, sin emblema bordado.','Falta: elegir el panel (Netquest, Cint o Toluna, a cotizar) y producir 4 piezas de relleno de marcas ficticias.'],13)),1600,1740);


// ================= 4.3 · La oficina de Efeonce, en tres láminas: llegar, trabajar y convivir =================
const WALL='#E4E6E3',FLOOR='#C9CDC9',DFLOOR='#101A24';
const floor=(W,H,c=FLOOR)=>abs(0,H-110,W,110,{background:c});
const esfera=(x,y,d,c=OR.teal)=>abs(x,y,d,d,{borderRadius:'50%',background:c});
const anillo=(x,y,d,c,w)=>abs(x,y,d,d,{borderRadius:'50%',border:`${w}px solid ${c}`,boxSizing:'border-box'});
// Llegar
S.of_marca=()=>{const W=1920,H=1080,cx=960,cy=420,r=300;return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k:2.2,haloOp:.14})+logoNeg(cx-260,cy-61,520)+
 abs(0,cy+r+50,W,null,{},slogan('Growth',34,{dark:true,align:'center'}))+abs(560,860,800,110,{background:'#0B2742',borderTop:'6px solid #1D3A57',boxSizing:'border-box'})+floor(W,H,DFLOOR)};};
S.of_tv=()=>{const W=1920,H=1080;return {W,H,bg:WALL,html:abs(410,150,1100,640,{background:'#0A0F14',borderRadius:18,padding:22,boxSizing:'border-box'},
 div({position:'relative',width:1056,height:596,overflow:'hidden',background:OR.navy},`<video src="${OB.vid169}" poster="${OB.fin169}" autoplay loop muted playsinline aria-label="Pantalla de recepción con el cierre de marca en loop" style="position: absolute; left: 0; top: 0; width: 1056px; height: 596px; object-fit: cover"></video>`))+
 abs(0,820,W,null,{},p('Loop de marca de 4,5 s; con movimiento reducido, cuadro fijo.',26,C.muted,500,{textAlign:'center'}))+floor(W,H)};};
S.of_directorio=()=>{const W=1920,H=1080,x=610,y=90,w=700,h=860;const fila=(t,sub,c)=>div({display:'flex',alignItems:'center',gap:22,padding:'20px 0',borderTop:'1px solid #1D3A57'},div({width:22,height:22,borderRadius:'50%',background:c,flexShrink:0})+div({},p(t,34,C.white,600)+p(sub,22,OR.sub)));
 return {W,H,bg:WALL,html:abs(x,y,w,h,{background:OR.navy,padding:'60px 56px',boxSizing:'border-box',overflow:'hidden'},
  orbit({W:w,H:h,cx:w-40,cy:40,r:150,a0:95,a1:145,k:1.6,haloOp:0,rings:[[1,.25]]})+q('¿A dónde vas?',30,OR.ink,{ringColor:OR.teal})+abs(56,150,w-112,null,{},
  fila('Salas Hacer y Medir','Reuniones · piso 3',OR.teal)+fila('Estudio','Globe · producción creativa','#FF6500')+fila('Búsqueda y datos','Wave','#0375DB')+fila('Medios','Reach','#F83902')+fila('Cocina','Café y agua',C.white)))+floor(W,H)};};
S.of_placas=()=>{const W=1920,H=1080;const placa=(x,v)=>abs(x,170,380,480,{background:'#FAFBFA',boxShadow:'0 10px 24px rgba(0,26,51,0.12)',padding:'44px 40px',boxSizing:'border-box'},cap('Sala',C.muted,20)+div({marginTop:26},dom(v,92,C.navy))+p('Libre desde las 16:00',22,C.muted,400,{marginTop:170}));
 const serv=(x,t,flecha)=>abs(x,760,300,90,{background:'#FAFBFA',boxShadow:'0 6px 14px rgba(0,26,51,0.10)',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 28px',boxSizing:'border-box'},p(t,30,C.navy,600)+p(flecha,34,C.navy,400));
 return {W,H,bg:WALL,html:placa(300,'Hacer')+placa(770,'Medir')+placa(1240,'Crear')+serv(300,'Cocina','→')+serv(640,'Baños','←')+serv(980,'Salida','↓')+floor(W,H)};};
// Trabajar
S.of_tablet=()=>{const W=1920,H=1080,tx=1200,ty=330,tw=520,th=360,cx=tx+tw-120,cy=ty+th/2,r=86;return {W,H,bg:WALL,html:abs(300,120,760,850,{border:'14px solid #9AA4AC',boxSizing:'border-box',background:'#D5DADB'})+abs(1020,560,24,60,{background:'#9AA4AC',borderRadius:6})+
 abs(tx-18,ty-18,tw+36,th+36,{background:'#0A0F14',borderRadius:26})+abs(tx,ty,tw,th,{background:OR.navy,overflow:'hidden'},
  orbit({W:tw,H:th,cx:tw-120,cy:th/2,r,a0:-90,a1:-90+360*.6,k:3,arcW:2,haloOp:.12})+abs(36,40,300,null,{},cap('Sala',OR.sub,16))+abs(36,74,320,null,{},dom('Hacer',56,C.white,{sphereColor:OR.teal}))+
  abs(36,190,280,null,{},p('En sesión',26,C.white,600)+p('Termina a las 16:00',20,OR.sub)))+abs(tx-40,ty+th+50,tw+80,null,{},p('El arco muestra el tiempo real que ya pasó de la reunión.',22,C.muted,400,{textAlign:'center'}))+floor(W,H)};};
S.of_voz=()=>{const W=1920,H=1080;return {W,H,bg:'#F2F3F0',html:abs(180,230,1500,null,{},q('¿Lo medimos?',84,C.navy,{ringColor:C.tealDark}))+abs(180,380,1500,null,{},dom('Siempre',330,C.navy,{sphereColor:C.tealDark}))+
 abs(180,820,1400,null,{},p('Muro de voz: una pregunta y su respuesta, pintadas. Una por espacio.',26,C.muted))+floor(W,H)};};
S.of_cabina=()=>{const W=1920,H=1080;const letrero=(x,on)=>abs(x,160,560,200,{background:OR.navy,display:'flex',alignItems:'center',gap:30,padding:'0 44px',boxSizing:'border-box'},(on?div({width:64,height:64,borderRadius:'50%',background:OR.teal,flexShrink:0}):div({width:64,height:64,borderRadius:'50%',border:'8px solid #72DED8',boxSizing:'border-box',flexShrink:0}))+div(W8(on?54:58,C.white,760),on?'En el aire':'Libre'));
 return {W,H,bg:WALL,html:letrero(300,false)+letrero(1060,true)+abs(300,390,560,null,{},p('Anillo: libre',26,C.muted,500))+abs(1060,390,560,null,{},p('Esfera: grabando o en llamada',26,C.muted,500))+
  abs(300,470,560,500,{background:'#D5DADB',border:'14px solid #9AA4AC',boxSizing:'border-box'})+abs(1060,470,560,500,{background:'#C3CACC',border:'14px solid #9AA4AC',boxSizing:'border-box'})+floor(W,H)};};
// Convivir
S.of_cocina=()=>{const W=1920,H=1080,shelf=780;const mugs=[FAM[0].mug[0],OB2.navyPalabra,OB2.globePalabra,'/_blob/94bc009ca795c2af84bda6969f89061a','/_blob/44d6c3c085adc4dccbcb08dbc111a50c',OB.mugBlanca];
 return {W,H,bg:'#F2F3F0',html:abs(180,150,1500,null,{},q('¿Otra vuelta?',64,C.navy,{ringColor:C.tealDark}))+abs(180,250,1500,null,{},dom('Vamos',220,C.navy,{sphereColor:C.tealDark}))+
  mugs.map((m,i)=>`<img src="${m}" alt="" style="position: absolute; left: ${210+i*250}px; top: ${shelf-230}px; width: 250px; height: 250px; object-fit: contain; mix-blend-mode: multiply">`).join('')+abs(180,shelf,1560,22,{background:'#B8BFC2'})+floor(W,H)};};
S.of_puesto=()=>{const W=1920,H=1080;const cuaderno=abs(150,170,480,660,{background:OR.navy,overflow:'hidden',boxShadow:'0 14px 30px rgba(0,26,51,0.25)'},orbit({W:480,H:660,cx:300,cy:230,r:150,a0:200,a1:250,k:1.3,haloOp:.1})+abs(44,520,400,null,{},dom('Ideas',84,C.white,{sphereColor:OR.teal})));
 const credencial=abs(720,150,380,560,{background:'#FAFBFA',boxShadow:'0 14px 30px rgba(0,26,51,0.18)',padding:'40px 36px',boxSizing:'border-box'},`<img src="/_blob/34c7881fe2f7f10d4c725f66ec13f478" alt="Foto de la persona con la órbita" style="width: 200px; height: 200px; display: block">`+div({marginTop:30},dom('Julio Reyes',44,C.navy,{sphereColor:C.tealDark}))+p('Managing & GTM Director',24,C.muted,400,{marginTop:10})+`<img src="${LK.efeonce.full}" alt="Efeonce" style="position: absolute; left: 36px; bottom: 36px; width: 150px; height: ${+(150*LK.efeonce.r).toFixed(1)}px">`);
 const sticker=(x,y,html)=>abs(x,y,170,170,{borderRadius:'50%',background:'#FAFBFA',boxShadow:'0 8px 18px rgba(0,26,51,0.16)',display:'flex',alignItems:'center',justifyContent:'center'},html);
 return {W,H,bg:'#DDE1DE',html:cuaderno+credencial+sticker(1200,170,div({width:90,height:90,borderRadius:'50%',background:OR.teal}))+sticker(1420,170,div({width:92,height:92,borderRadius:'50%',border:`16px solid ${C.tealDark}`,boxSizing:'border-box'}))+
  sticker(1200,400,dom('Sí',64,C.navy,{sphereColor:C.tealDark}))+abs(1410,390,190,190,{borderRadius:'50%',background:OR.navy,overflow:'hidden'},orbit({W:190,H:190,cx:95,cy:95,r:62,a0:200,a1:250,k:1,haloOp:0,rings:[[1,.4]]}))+
  abs(1200,640,440,300,{background:'#EFEAE0',boxShadow:'0 10px 22px rgba(0,26,51,0.16)',display:'flex',alignItems:'center',justifyContent:'center'},dom('Hacer',92,C.navy,{sphereColor:C.tealDark}))};};
S.of_wallpaper=()=>{const W=1920,H=1080;return {W,H,bg:OR.navy,html:orbit({W,H,cx:1380,cy:430,r:380,a0:200,a1:250,k:2.2,rings:[[1,.2],[.72,.1]],haloOp:.16})+`<img src="${LK.efeonce.neg}" alt="Efeonce" style="position: absolute; right: 70px; bottom: 60px; width: 200px; height: ${+(200*LK.efeonce.r).toFixed(1)}px">`+
 abs(70,H-150,700,null,{},p('Fondo de escritorio y de Teams: la zona izquierda queda libre para la cámara.',22,OR.sub))};};
S.of_wifi=()=>{const W=1920,H=1080;const carpa=(x,qq,a)=>abs(x,240,640,540,{background:'#FAFBFA',boxShadow:'0 16px 32px rgba(0,26,51,0.16)',padding:'60px 56px',boxSizing:'border-box'},q(qq,36,C.ink,{ringColor:C.tealDark})+div({marginTop:40},dom(a,104,C.navy,{sphereColor:C.tealDark})));
 return {W,H,bg:'#DDE1DE',html:carpa(260,'¿Clave del wifi?','[clave]')+carpa(1020,'¿Primera vez aquí?','Pasa')+abs(0,850,W,null,{},p('Tarjetas de mesa: la voz también recibe a las visitas.',26,C.muted,500,{textAlign:'center'}))};};
const PL=(x,y,l,fn)=>place(x,y,l,fn,.37);
boards['O-05-orbita-espacio.dc.html']=board('4.3 · Oficina (1 de 3): llegar',
 head('4.3 · La oficina (1 de 3) · Llegar','Lo primero que se ve es la órbita.','Recepción, pantalla, directorio y señalética. La marca completa aparece una sola vez, en el muro de recepción; desde ahí, la línea guía sin repetir el logo.')+
 PL(64,300,'Muro de recepción · la órbita y el logo',S.of_marca)+PL(826,300,'Pantalla de recepción · cierre de marca en loop',S.of_tv)+
 PL(64,760,'Directorio de piso',S.of_directorio)+PL(826,760,'Placas de sala y señalética de servicio',S.of_placas)+
 PL(64,1220,'Sala de espera · mural con lente',S.o_muro)+
 col(826,1220,710,400,'Reglas para llegar',list(['El logo completo va una sola vez: en el muro de recepción, dentro de su órbita.','Las salas se llaman como los verbos de la línea, con su punto: Hacer, Medir, Crear (propuesta).','En el directorio, cada área lleva la esfera en el acento de su marca.','La señalética de servicio (cocina, baños, salida) va en Poppins, sin esfera ni órbita: se lee, no decora.','Pantalla de recepción: el cierre de marca en loop; sin sonido.'],13.5)),1600,1680);
boards['O-05b-oficina-trabajar.dc.html']=board('4.3 · Oficina (2 de 3): trabajar',
 head('4.3 · La oficina (2 de 3) · Trabajar','El estado se dice con la forma.','Salas, pasillo, pizarras y cabinas. El anillo significa abierto o libre; la esfera, decidido u ocupado. Es la misma gramática de la voz, ahora en la arquitectura.')+
 PL(64,300,'Sala · vidrio esmerilado con órbita en vinilo',S.e_sala)+PL(826,300,'Estado de sala · el arco mide el tiempo',S.of_tablet)+
 PL(64,760,'Pasillo · muro de trabajo con lente',S.e_pasillo)+PL(826,760,'Pizarra · el imán avanza por la órbita',S.e_pizarra)+
 PL(64,1220,'Muro de voz · pregunta y respuesta',S.of_voz)+PL(826,1220,'Cabina de llamadas y podcast · anillo libre, esfera en el aire',S.of_cabina)+
 col(64,1680,1472,200,'Reglas para trabajar',list(['Anillo = libre o abierto; esfera = ocupado o decidido. Nunca como semáforo de colores.','El arco del estado de sala mide tiempo real; sin dato, no hay arco.','Una lente o una órbita por muro o por vidrio; nada de patrones.','Muro de voz: una pregunta y su respuesta por espacio, del banco de voz (2.1).'],13.5)),1600,1900);
boards['O-05c-oficina-convivir.dc.html']=board('4.3 · Oficina (3 de 3): convivir',
 head('4.3 · La oficina (3 de 3) · Convivir','La marca también se toma y se lleva.','Cocina, puesto de trabajo, pantallas y mesas. Aquí la línea es cotidiana: tazas, cuaderno, credencial, stickers, fondos de pantalla y tarjetas de mesa.')+
 PL(64,300,'Cocina · la repisa de tazas bajo su pregunta',S.of_cocina)+PL(826,300,'Puesto · cuaderno, credencial, stickers y bolsa',S.of_puesto)+
 PL(64,760,'Fondo de escritorio y de Teams',S.of_wallpaper)+PL(826,760,'Tarjetas de mesa',S.of_wifi)+
 col(64,1220,1472,260,'Reglas para convivir',list(['Tazas: adelante la palabra con su punto (con o sin órbita); atrás el logo solo (4.4).','Credencial: la foto con su órbita, el nombre con su punto y el logo abajo.','Stickers: la esfera, el anillo, la órbita y una respuesta; nunca el logo recoloreado.','Fondos de pantalla: la órbita a la derecha y la zona izquierda libre para la cámara.','Tarjetas de mesa y avisos usan la voz: pregunta con anillo y respuesta corta. Los datos reales (clave, horarios) los completa la oficina.'],13.5)),1600,1540);

// ================= 4.6 · Merch y credenciales, en tres láminas: llevar, vestir, identificarse =================
const MB={tNavy:'/_blob/ffb4e5134be385c6e9322527146b2ece',tNavy34:'/_blob/0e83a375da1b711ee69435409201891e',tNavyRev:'/_blob/02d7b9ad18618b78ec00a2bbcb7f1849',tBlanco:'/_blob/717b5346f7812b472323fee93529e50a',tGlobe:'/_blob/cf98a500637d8f59e95dc85a06fb6e63',
 kPolo:'/_blob/a9a0cd4f1a2b660060094d0b190673eb',kHoodie:'/_blob/2faac0086ae30e6e226854276b7e5608',kGorra:'/_blob/82069eb9859716bdc6bcbc810ec725dc',fotoOrb:'/_blob/34c7881fe2f7f10d4c725f66ec13f478'};
const svgW=(W,H,inner)=>`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; left: 0; top: 0" aria-hidden="true">${inner}</svg>`;
const orbSvg=(cx,cy,r,ring,op,acc,sw,dotR,a0=200,a1=250)=>{const P=a=>[cx+r*Math.cos(a*Math.PI/180),cy+r*Math.sin(a*Math.PI/180)],[x0,y0]=P(a0),[x1,y1]=P(a1);return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-opacity="${op}" stroke-width="${sw/2}"/><path d="M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}" fill="none" stroke="${acc}" stroke-width="${sw}" stroke-linecap="round"/><circle cx="${x1}" cy="${y1}" r="${dotR}" fill="${acc}"/>`;};
// Llevar
S.mc_lapiceros=()=>{const W=1920,H=1080;const pen=(y,body,ink,acc,word,lk)=>abs(0,0,W,H,{},svgW(W,H,`<path d="M 300 ${y} L 230 ${y+35} L 300 ${y+70} Z" fill="#C9CDD2"/><rect x="300" y="${y}" width="1180" height="70" rx="12" fill="${body}"/><rect x="1300" y="${y-18}" width="170" height="16" rx="8" fill="#C9CDD2"/><circle cx="1520" cy="${y+35}" r="40" fill="${acc}"/>`)+abs(420,y+10,null,null,{},dom(word,44,ink,{sphereColor:acc}))+`<img src="${lk}" alt="" style="position: absolute; left: 1080px; top: ${y+21}px; width: 130px; height: ${+(130*LK.efeonce.r).toFixed(1)}px">`);
 return {W,H,bg:'#DDE1DE',html:pen(260,OR.navy,C.white,OR.teal,'Hacer',LK.efeonce.neg)+pen(500,'#F4F5F2',C.navy,C.tealDark,'Medir',LK.efeonce.full)+pen(740,C.ink2,C.white,'#FF6500','Crear',LK.efeonce.neg)+abs(0,900,W,null,{},p('El botón del lapicero es la esfera, en el acento de cada marca.',26,C.muted,500,{textAlign:'center'}))};};
S.mc_pulseras=()=>{const W=1920,H=1080;const bands=[['#001A33','Hacer','#FFFFFF',OR.teal],['#F4F5F2','Medir',C.navy,C.tealDark],['#FF6500','Crear','#FFFFFF','#FFFFFF'],['#0375DB','Aparecer','#FFFFFF','#FFFFFF'],['#F83902','Llegar','#FFFFFF','#FFFFFF']];
 let s='';bands.forEach(([c,w,ink,dot],i)=>{const cx=260+i*350,cy=470,rx=150,ry=70,id='pb'+i;s+=`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#9AA4AC" stroke-opacity=".45" stroke-width="44"/><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="${c}" stroke-width="40"/><ellipse cx="${cx}" cy="${cy}" rx="${rx+20}" ry="${ry+20}" fill="none" stroke="#000" stroke-opacity=".06" stroke-width="2"/><path id="${id}" d="M ${cx-rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx+rx} ${cy}" fill="none"/><text font-family="Bricolage Grotesque, sans-serif" font-weight="760" font-size="28" letter-spacing="-0.5" fill="${ink}" text-anchor="middle" dominant-baseline="middle"><textPath href="#${id}" startOffset="50%">${w}<tspan fill="${dot}">●</tspan></textPath></text>`;});
 return {W,H,bg:'#EDEFEE',html:svgW(W,H,s)+abs(0,700,W,null,{},p('Silicona. Cada pulsera lleva un verbo; en las de color, texto y punto van en blanco.',26,C.muted,500,{textAlign:'center'}))};};
S.mc_mousepad=()=>{const W=1920,H=1080;return {W,H,bg:'#C9CDC9',html:abs(200,220,1520,640,{background:OR.navy,borderRadius:28,overflow:'hidden',boxShadow:'0 20px 40px rgba(0,0,0,0.25)'},
 orbit({W:1520,H:640,cx:1150,cy:320,r:230,a0:200,a1:250,k:2.2,haloOp:.12,rings:[[1,.2],[.72,.1]]})+abs(80,470,null,null,{},dom('Hacer',96,C.white,{sphereColor:OR.teal}))+`<img src="${LK.efeonce.neg}" alt="Efeonce" style="position: absolute; right: 60px; bottom: 50px; width: 160px; height: ${+(160*LK.efeonce.r).toFixed(1)}px">`)+
 abs(0,920,W,null,{},p('Alfombra de escritorio 90 × 40 cm: la órbita queda bajo el mouse, no bajo el teclado.',26,C.muted,500,{textAlign:'center'}))};};
// Vestir: siluetas técnicas planas
const G=(W,H,body,inner)=>({W,H,bg:'#EDEFEE',html:svgW(W,H,body)+inner});
const HOOD='M 190 140 C 230 70 370 70 410 140 L 470 160 L 555 470 L 500 495 L 455 290 L 460 600 L 140 600 L 145 290 L 100 495 L 45 470 L 130 160 Z';
// Polera navy: la órbita con la palabra funciona en un frente liso (en el hoodie, la capucha y el bolsillo la cortaban).
S.mc_poleraNavy=()=>G(600,640,`<path d="M 205 70 C 240 95 360 95 395 70 L 470 95 L 560 190 L 505 250 L 455 215 L 455 590 L 145 590 L 145 215 L 95 250 L 40 190 L 130 95 Z" fill="#001A33"/><path d="M 205 70 C 240 118 360 118 395 70" fill="none" stroke="#0A2A48" stroke-width="8"/>`+orbSvg(300,300,105,'#72DED8',.35,OR.teal,5,9),abs(0,282,600,null,{display:'flex',justifyContent:'center'},dom('Hacer',40,C.white,{sphereColor:OR.teal})));
S.mc_polera=()=>G(600,640,`<path d="M 205 70 C 240 95 360 95 395 70 L 470 95 L 560 190 L 505 250 L 455 215 L 455 590 L 145 590 L 145 215 L 95 250 L 40 190 L 130 95 Z" fill="#F7F8F6" stroke="#C9CDD2" stroke-width="3"/><path d="M 205 70 C 240 118 360 118 395 70" fill="none" stroke="#C9CDD2" stroke-width="6"/>`,abs(345,200,null,null,{},dom('Siempre',26,C.navy,{sphereColor:C.tealDark})));
// Polo navy: «Hacer.» bordado en el pecho y el botón superior de la tapeta en teal (la esfera es el botón, como en la gorra y el lapicero).
S.mc_polo=()=>G(600,640,`<path d="M 205 78 L 250 70 L 300 96 L 350 70 L 395 78 L 470 100 L 560 195 L 505 255 L 455 220 L 455 590 L 145 590 L 145 220 L 95 255 L 40 195 L 130 100 Z" fill="#001A33"/><path d="M 250 70 L 300 96 L 350 70 L 368 110 L 300 132 L 232 110 Z" fill="#0A2A48"/><rect x="288" y="112" width="24" height="120" fill="#0A2A48"/><circle cx="300" cy="150" r="8" fill="${OR.teal}"/><circle cx="300" cy="195" r="6" fill="#1D3A57"/><path d="M 95 255 L 145 220 M 505 255 L 455 220" stroke="#0A2A48" stroke-width="10"/>`,abs(345,210,null,null,{},dom('Hacer',26,C.white,{sphereColor:OR.teal})));
S.mc_gorra=()=>G(600,640,`<path d="M 140 390 C 140 160 460 160 460 390 Z" fill="#001A33"/><path d="M 300 175 L 300 390" stroke="#0A2A48" stroke-width="3"/><path d="M 112 388 L 488 388 C 455 472 145 472 112 388 Z" fill="#0A2A48"/><circle cx="300" cy="178" r="14" fill="${OR.teal}"/>`,abs(0,285,600,null,{display:'flex',justifyContent:'center'},dom('Hacer',50,C.white,{sphereColor:OR.teal})));
// Identificarse
S.mc_carnet=()=>{const W=540,H=860;return {W,H,bg:'#FAFBFA',html:`<img src="${MB.fotoOrb}" alt="Foto con su órbita" style="position: absolute; left: 150px; top: 80px; width: 240px; height: 240px">`+abs(0,360,W,null,{display:'flex',justifyContent:'center'},dom('Julio Reyes',44,C.navy,{sphereColor:C.tealDark}))+
 abs(0,420,W,null,{},p('Managing & GTM Director',22,C.muted,400,{textAlign:'center'}))+abs(160,480,220,2,{background:'#DCE2E8'})+abs(0,510,W,null,{},slogan('Growth',20,{align:'center'}))+`<img src="${LK.efeonce.full}" alt="Efeonce" style="position: absolute; left: 170px; top: 740px; width: 200px; height: ${+(200*LK.efeonce.r).toFixed(1)}px">`};};
S.mc_carnetRev=()=>{const W=540,H=860;return {W,H,bg:OR.navy,html:orbit({W,H,cx:270,cy:300,r:150,a0:200,a1:250,k:1.4,haloOp:.14})+logoNeg(170,288,200)+abs(50,560,440,null,{},q('¿Lo encontraste?',26,OR.ink,{ringColor:OR.teal}))+abs(50,610,440,null,{},dom('Devuélvelo',46,C.white,{sphereColor:OR.teal}))+abs(50,680,440,null,{},p('En recepción o en '+urlB(22,'margin-left: 4px',true),20,OR.sub))};};
const ROL={Asistente:'anillo',Speaker:'orbita',Staff:'esfera'};
S.mc_evento=(rol)=>()=>{const W=700,H=980;const forma=ROL[rol];const f=forma==='anillo'?div({width:40,height:40,borderRadius:'50%',border:`6px solid ${OR.teal}`,boxSizing:'border-box'}):forma==='esfera'?div({width:40,height:40,borderRadius:'50%',background:OR.teal}):div({position:'relative',width:44,height:44},svgW(44,44,orbSvg(22,22,17,'#72DED8',.5,OR.teal,4,5)));
 return {W,H,bg:'#FAFBFA',html:abs(0,0,W,330,{background:OR.navy,overflow:'hidden'},orbit({W,H:330,cx:560,cy:120,r:130,a0:200,a1:250,k:1.4,haloOp:.14})+abs(50,60,420,null,{},cap('[Nombre del evento]',OR.sub,18))+abs(50,110,420,null,{},p('[Fecha] · [Ciudad]',22,C.white,500))+logoNeg(50,250,160))+
  abs(50,410,600,null,{},dom('[Nombre]',72,C.navy,{sphereColor:C.tealDark}))+abs(50,510,600,null,{},p('[Empresa]',28,C.muted))+abs(0,830,W,150,{background:rol==='Staff'?OR.navy:'#EEF1F0',display:'flex',alignItems:'center',gap:20,padding:'0 50px',boxSizing:'border-box'},f+p(rol,32,rol==='Staff'?C.white:C.navy,600))};};
S.mc_tarjeta=()=>{const W=850,H=550;return {W,H,bg:'#FAFBFA',html:abs(60,70,null,null,{},dom('Julio Reyes',52,C.navy,{sphereColor:C.tealDark}))+abs(60,140,600,null,{},p('Managing & GTM Director',24,C.muted))+abs(60,300,600,null,{},p('+56 9 3732 3064<br>sales@efeoncepro.com<br>'+urlB(28,'margin-top: 6px'),22,C.navy,400,{lineHeight:1.6}))+`<img src="${LK.efeonce.full}" alt="Efeonce" style="position: absolute; right: 60px; bottom: 60px; width: 190px; height: ${+(190*LK.efeonce.r).toFixed(1)}px">`};};
S.mc_tarjetaRev=()=>{const W=850,H=550;return {W,H,bg:OR.navy,html:orbit({W,H,cx:425,cy:250,r:170,a0:200,a1:250,k:1.5,haloOp:.14})+logoNeg(305,222,240)+abs(0,450,W,null,{},slogan('Growth',22,{dark:true,align:'center'}))};};
S.mc_pin=()=>{const W=500,H=500;return {W,H,bg:'#EDEFEE',html:svgW(W,H,`<circle cx="250" cy="250" r="200" fill="#001A33" stroke="#C9CDD2" stroke-width="10"/>`+orbSvg(250,250,130,'#C9CDD2',.9,OR.teal,10,16))};};
// Láminas
const PH=(x,y,w,l,src,alt)=>lab(x,y,l)+photo(x,y,w,w,src,alt);
boards['O-11-merch-llevar.dc.html']=board('4.6 · Merch (1/3): llevar',
 head('4.6 · Merch (1 de 3) · Llevar','Lo que sale de la oficina con la marca.','Vaso térmico, lapiceros, pulseras y mousepad. La regla de los objetos se mantiene: adelante la palabra con su punto (y la órbita si hay espacio); el logo va atrás, solo.')+
 PH(64,300,272,'Vaso térmico · navy',MB.tNavy,'Vaso térmico navy con «Hacer.» dentro de una órbita teal')+PH(356,300,272,'Tres cuartos',MB.tNavy34,'El mismo vaso en tres cuartos')+PH(648,300,272,'Reverso · el logo solo',MB.tNavyRev,'Reverso del vaso con el logo Efeonce solo')+
 PH(940,300,272,'Vaso térmico · blanco',MB.tBlanco,'Vaso térmico blanco con «Medir.» y órbita teal oscuro')+PH(1232,300,272,'Vaso térmico · Globe',MB.tGlobe,'Vaso térmico Globe con «Crear.» y órbita naranja')+
 PL(64,660,'Lapiceros · la esfera es el botón',S.mc_lapiceros)+PL(826,660,'Pulseras de silicona · un verbo por pulsera',S.mc_pulseras)+
 PL(64,1120,'Alfombra de escritorio',S.mc_mousepad)+
 col(826,1120,710,400,'Reglas para llevar',list(['Vaso térmico: acero con pintura en polvo, banda de acero y tapa con cierre. Diseño propio: no copia la forma ni la tapa de marcas existentes.','Lapiceros: el botón superior es la esfera; la palabra va en el cuerpo y el logo cerca del clip.','Pulseras: un verbo con su punto; las de producto usan su color y texto blanco.','Alfombra: la órbita queda a la derecha, bajo el mouse.','Todo se valida con muestra física del proveedor antes de producir.'],13.5)),1600,1580);
boards['O-12-merch-vestir.dc.html']=board('4.6 · Merch (2/3): vestir',
 head('4.6 · Merch (2 de 3) · Vestir','El uniforme real se queda; estas son ediciones.','El uniforme actual (polo, hoodie, gorra, chaqueta y lanyard) sigue vigente. Estas alternativas llevan la línea a cápsulas y ediciones especiales, sin reemplazarlo.')+
 PH(64,300,340,'Actual · polo navy',MB.kPolo,'Polo navy actual con el isotipo bordado')+PH(424,300,340,'Actual · hoodie (espalda)',MB.kHoodie,'Hoodie royal actual con el logo y el eslogan en la espalda')+PH(784,300,340,'Actual · gorra',MB.kGorra,'Gorra royal actual con el logo bordado')+
 col(1144,300,392,340,'Qué cambia',p('Nada en el uniforme diario. Las ediciones suman la órbita y la voz donde el uniforme hoy sólo lleva el logo.',14,C.ink,400,{lineHeight:1.5}))+
 place(64,720,'Polera navy · órbita con «Hacer.» en el pecho',S.mc_poleraNavy,.5667)+place(424,720,'Polera blanca · «Siempre.» en el pecho',S.mc_polera,.5667)+
 place(784,720,'Polo navy · la esfera es el botón',S.mc_polo,.5667)+place(1144,720,'Gorra · el botón superior es la esfera',S.mc_gorra,.5667)+
 col(64,1150,1472,200,'Reglas para vestir',list(['Polera navy: la órbita con «Hacer.» centrada en el pecho, en un frente liso. En el hoodie no se usa: la capucha y el bolsillo la cortan.','Polera: una respuesta chica en el pecho y su pregunta en la nuca, por dentro («¿Lo medimos?»).','Polo: «Hacer.» bordado chico en el pecho y el botón superior de la tapeta en teal. La softshell se queda como está hoy.','Gorra: «Hacer.» bordado adelante y el botón superior en teal: la esfera.','Técnica según la tela: bordado en piqué y softshell; estampado en algodón. Prueba física antes de producir.'],13.5)),1600,1400);
boards['O-13-merch-identificarse.dc.html']=board('4.6 · Merch (3/3): identificarse',
 head('4.6 · Merch (3 de 3) · Identificarse','La credencial dice quién eres; la forma, qué rol tienes.','Carnet de equipo, credenciales de evento, tarjeta de presentación y pin. En los eventos, el rol se lee por la forma: anillo para asistentes, órbita para speakers y esfera para staff.')+
 place(64,300,'Carnet · frente',S.mc_carnet,.42)+place(311,300,'Carnet · reverso',S.mc_carnetRev,.42)+
 place(600,300,'Evento · asistente',S.mc_evento('Asistente'),.36)+place(870,300,'Evento · speaker',S.mc_evento('Speaker'),.36)+place(1140,300,'Evento · staff',S.mc_evento('Staff'),.36)+
 place(64,740,'Tarjeta de presentación · frente',S.mc_tarjeta,.5)+place(509,740,'Tarjeta · reverso',S.mc_tarjetaRev,.5)+place(954,740,'Pin esmaltado',S.mc_pin,.55)+
 col(64,1080,1472,240,'Reglas para identificarse',list(['Carnet: la foto con su órbita, el nombre con su punto y el cargo; el logo abajo. Atrás, la voz: «¿Lo encontraste? Devuélvelo.»','Credencial de evento: el rol por la forma (anillo, órbita, esfera), no por colores; el staff va en navy para encontrarlo rápido.','Tarjeta: adelante la persona; atrás la órbita con el logo y el eslogan.','Los datos entre corchetes se completan por evento. El lanyard actual se mantiene.'],13.5)),1600,1260);

// ================= Narrativa final: capítulos, numeración y canvas sólo con lo vigente =================
// ================= 4.7 · Bienvenida, papelería y eventos, en tres láminas =================
// Gramática que se mantiene: anillo = pregunta/abierto · esfera = respuesta/cerrado. Frente = palabra con su punto; dorso = logo solo.
const BT={navyF:'/_blob/236a6d6bb4080171c1ad1c066c182c09',navyR:'/_blob/96fb83850161219792845c34afe25bd0',blancaF:'/_blob/c1e1fac50310a9b421b986a770f293f9',blancaR:'/_blob/b9f4fb2e52f37a794a524ee975d1e465',reachF:'/_blob/da3ba05825e79aff7124f7566e1dc0d6',reachR:'/_blob/477f0455c6b142e2a2612c3f3907e3b8'};
const DIR='Dr. Manuel Barros Borgoño 71, of. 1105, Providencia, Chile';
const lkF=(x,y,w,alt='Efeonce')=>`<img src="${LK.efeonce.full}" alt="${alt}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${+(w*LK.efeonce.r).toFixed(1)}px">`;
const oLight=(W,H,cx,cy,r,a0,a1,k)=>orbit({W,H,cx,cy,r,a0,a1,halo:C.navy,accent:C.tealDark,rings:[[1,.18]],haloOp:.06,k});
const shadowBox={boxShadow:'0 18px 36px rgba(0,26,51,0.22)'};
// Divisor de la firma de correo: línea fina que termina EN la esfera.
const divisor=(x,y,w,line,dot,d=9)=>abs(x,y,w-d,1,{background:line,top:y+d/2})+abs(x+w-d,y,d,d,{borderRadius:'50%',background:dot});

// ---------- 1 · Bienvenida y envíos ----------
S.bv_tapa=()=>{const W=1600,H=1100,bx=200,by=160,bw=1200,bh=780;
 return {W,H,bg:'#D9DDD9',html:abs(bx,by,bw,bh,{background:OR.navy,borderRadius:14,overflow:'hidden',...shadowBox},
  orbit({W:bw,H:bh,cx:860,cy:390,r:300,a0:200,a1:250,k:bw/794,haloOp:.14})+abs(90,300,null,null,{},q('¿Primer día?',40,OR.ink,{ringColor:OR.teal}))+abs(90,370,null,null,{},dom('Adelante',120,C.white,{sphereColor:OR.teal})))+
  abs(bx,by+bh,bw,60,{background:'#00122A',borderRadius:'0 0 14px 14px',display:'flex',alignItems:'center',justifyContent:'center'},`<img src="${LK.efeonce.neg}" alt="Efeonce" style="width: 120px; height: ${+(120*LK.efeonce.r).toFixed(1)}px">`)};};
S.bv_abierta=()=>{const W=1600,H=1100,T='#EEF1F0',L='#D3D8DD';
 const slot=(x,y,w,h,label,inner='')=>abs(x,y,w,h,{background:T,border:`2px solid ${L}`,borderRadius:10,overflow:'hidden'},inner+abs(0,h-38,w,null,{},cap(label,C.muted,15,{textAlign:'center'})));
 const lid=abs(80,60,1440,300,{background:OR.navy,borderRadius:'14px 14px 4px 4px',overflow:'hidden'},orbit({W:1440,H:300,cx:1240,cy:150,r:110,a0:200,a1:250,k:1.8,haloOp:.14})+abs(80,70,null,null,{},q('Esto es tuyo.',34,OR.ink,{ringColor:OR.teal}))+abs(80,130,null,null,{},dom('[Nombre]',84,C.white,{sphereColor:OR.teal})));
 const tray=abs(80,380,1440,660,{background:C.white,borderRadius:'4px 4px 14px 14px',...shadowBox},
  slot(30,30,560,250,'Botella',svgW(560,210,`<rect x="110" y="70" width="300" height="76" rx="20" fill="${OR.navy}"/><path d="M 410 78 C 440 78 452 92 452 108 C 452 124 440 138 410 138 Z" fill="${OR.navy}"/><rect x="452" y="94" width="12" height="28" fill="#9AA3AC"/><rect x="464" y="88" width="26" height="40" rx="5" fill="#1B1F24"/><circle cx="230" cy="108" r="30" fill="none" stroke="#72DED8" stroke-opacity=".35" stroke-width="2"/><circle cx="209" cy="87" r="5" fill="${OR.teal}"/>`))+
  slot(610,30,380,250,'Carnet',abs(140,24,100,160,{background:C.white,border:`1px solid ${L}`,borderRadius:8},abs(30,18,40,40,{borderRadius:'50%',background:'#C9D3DC'})+abs(10,70,80,null,{},div({fontFamily:BR,fontWeight:760,fontSize:13,color:C.navy,textAlign:'center'},'[Nombre]'))))+
  slot(1010,30,400,250,'Llavero',svgW(400,210,`<circle cx="200" cy="90" r="48" fill="none" stroke="#9AA3AC" stroke-width="7"/><circle cx="${200+48*Math.cos(-Math.PI/4)}" cy="${90+48*Math.sin(-Math.PI/4)}" r="12" fill="${OR.teal}"/><rect x="176" y="136" width="48" height="66" rx="10" fill="${OR.navy}"/>`))+
  slot(30,300,760,330,'Polo del uniforme',svgW(760,290,`<path d="M 290 40 C 330 62 430 62 470 40 L 540 62 L 600 140 L 560 180 L 520 155 L 520 270 L 240 270 L 240 155 L 200 180 L 160 140 L 220 62 Z" fill="#023C70"/>`))+
  slot(810,300,280,330,'Lapicero',svgW(280,290,`<rect x="126" y="40" width="28" height="200" rx="8" fill="${OR.navy}"/><circle cx="140" cy="30" r="16" fill="${OR.teal}"/><path d="M 126 240 L 140 268 L 154 240 Z" fill="#C9CDD2"/>`))+
  slot(1110,300,300,330,'Tarjeta de bienvenida',abs(40,30,220,240,{background:C.white,border:`1px solid ${L}`,borderRadius:6,padding:20,boxSizing:'border-box'},p('Hola, [Nombre]. Tu primer mes, paso a paso: [enlace].',15,C.navy,500,{lineHeight:1.45})+abs(20,190,null,null,{},div({width:14,height:14,borderRadius:'50%',background:C.tealDark})))));
 return {W,H,bg:'#D9DDD9',html:lid+tray};};
S.bv_envioFuera=()=>{const W=1200,H=900,bx=150,by=170,bw=900,bh=560;
 return {W,H,bg:'#D9DDD9',html:abs(bx,by,bw,bh,{background:'#F4F5F2',borderRadius:10,...shadowBox,overflow:'hidden'},
  abs(40,40,340,190,{background:C.white,border:'2px dashed #C9CDD2',borderRadius:6,padding:24,boxSizing:'border-box'},cap('Envío',C.muted,14)+p('[Destinatario]<br>[Dirección]<br>[Ciudad]',20,C.navy,400,{lineHeight:1.5,marginTop:10}))+
  lkF(bw-190,bh-80,150)+svgW(bw,bh,`<circle cx="${bw-100}" cy="90" r="46" fill="none" stroke="${C.navy}" stroke-opacity=".2" stroke-width="2"/>`))};};
S.bv_envioDentro=()=>{const W=1200,H=900;
 return {W,H,bg:'#D9DDD9',html:abs(150,120,900,300,{background:OR.navy,borderRadius:'10px 10px 2px 2px',overflow:'hidden'},orbit({W:900,H:300,cx:700,cy:150,r:110,a0:200,a1:250,k:1.6,haloOp:.14})+abs(70,100,null,null,{},dom('Gracias',96,C.white,{sphereColor:OR.teal})))+
  abs(150,430,900,360,{background:'#E9ECEF',borderRadius:'2px 2px 10px 10px',...shadowBox,overflow:'hidden'},
   svgW(900,360,`<path d="M 0 180 C 200 120 300 250 450 180 C 600 110 700 240 900 170 L 900 360 L 0 360 Z" fill="#F7F8F6"/><path d="M 0 180 C 200 120 300 250 450 180 C 600 110 700 240 900 170" fill="none" stroke="#D3D8DD" stroke-width="3"/><circle cx="450" cy="180" r="34" fill="${C.tealDark}"/>`)+
   abs(300,240,300,null,{},p('El sello es la esfera: cierra el papel de seda.',17,C.muted,500,{textAlign:'center'})))};};

// ---------- 2 · Papelería y llavero ----------
S.pp_carta=()=>{const W=794,H=1123,bar=(y,w)=>abs(90,y,w,8,{background:'#E3E7EA',borderRadius:4});
 return {W,H,bg:C.white,html:oLight(W,H,794,0,238,105,160,1)+lkF(90,80,150)+
  abs(90,230,500,null,{},p('[Ciudad], [fecha]',14,C.navy))+abs(90,280,500,null,{},p('[Destinatario]<br>[Cargo] · [Empresa]',14,C.navy,500,{lineHeight:1.5}))+
  [370,392,414,436,458,480,524,546,568,590,612,656,678,700].map((y,i)=>bar(y,i%5===4?380:614)).join('')+
  abs(90,780,300,null,{},p('[Nombre]',14,C.navy,600))+abs(90,800,300,null,{},p('[Cargo]',12,C.muted))+
  divisor(90,1016,614,C.line,C.tealDark)+abs(90,1040,420,null,{},p(`${DIR}<br>+56 9 3732 3064 · `+urlB(12),10,C.muted,400,{lineHeight:1.6}))+abs(470,1044,234,null,{},slogan('Growth',11,{align:'right'}))};};
S.pp_cartaSeg=()=>{const W=794,H=1123,bar=(y,w)=>abs(90,y,w,8,{background:'#E3E7EA',borderRadius:4});
 return {W,H,bg:C.white,html:lkF(90,80,100)+abs(604,82,100,null,{},p('2',12,C.muted,500,{textAlign:'right'}))+[180,202,224,246,268,312,334,356,378].map((y,i)=>bar(y,i===4||i===8?380:614)).join('')+divisor(90,1016,614,C.line,C.tealDark)};};
S.pp_sobre=()=>{const W=1100,H=550;return {W,H,bg:C.white,html:lkF(60,56,150)+abs(60,110,420,null,{},p(DIR,11,C.muted,400,{lineHeight:1.5}))+
 abs(560,260,440,190,{border:`1px solid ${C.line}`,borderRadius:6,padding:24,boxSizing:'border-box'},p('[Destinatario]<br>[Empresa]<br>[Dirección]<br>[Ciudad]',16,C.navy,400,{lineHeight:1.55}))};};
S.pp_sobreDorso=()=>{const W=1100,H=550,tx=550,ty=300;return {W,H,bg:'#F7F8F6',html:svgW(W,H,`<path d="M 0 0 L ${tx} ${ty} L ${W} 0" fill="#FFFFFF" stroke="#D3D8DD" stroke-width="2"/><path d="M 0 ${H} L 430 250 M ${W} ${H} L 670 250" stroke="#E3E7EA" stroke-width="2"/><circle cx="${tx}" cy="${ty}" r="70" fill="none" stroke="${C.navy}" stroke-opacity=".18" stroke-width="2"/><circle cx="${tx}" cy="${ty}" r="26" fill="${C.tealDark}"/>`)+
 abs(0,470,W,null,{},p('El sello del sobre es la esfera: cerrado = respondido.',16,C.muted,500,{textAlign:'center'}))};};
S.pp_llavero=()=>{const W=900,H=700,cx=450,cy=210,R=110,a=-Math.PI/4;
 return {W,H,bg:'#EDEFEE',html:svgW(W,H,`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#8E98A2" stroke-width="12"/><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#DDE2E6" stroke-width="3" stroke-dasharray="1 0"/><circle cx="${cx+R*Math.cos(a)}" cy="${cy+R*Math.sin(a)}" r="26" fill="${OR.teal}"/><rect x="${cx-14}" y="${cy+R-8}" width="28" height="40" rx="6" fill="#8E98A2"/>`)+
  abs(cx-130,cy+R+26,260,300,{background:OR.navy,borderRadius:'22px 22px 40px 40px',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center'},div({position:'absolute',left:115,top:18,width:30,height:30,borderRadius:'50%',background:'#EDEFEE'})+dom('Adelante',46,C.white,{sphereColor:OR.teal}))};};
S.pp_llaveroRev=()=>{const W=900,H=700,cx=450,cy=210,R=110,a=-Math.PI/4;
 return {W,H,bg:'#EDEFEE',html:svgW(W,H,`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#8E98A2" stroke-width="12"/><circle cx="${cx+R*Math.cos(a)}" cy="${cy+R*Math.sin(a)}" r="26" fill="${OR.teal}"/><rect x="${cx-14}" y="${cy+R-8}" width="28" height="40" rx="6" fill="#8E98A2"/>`)+
  abs(cx-130,cy+R+26,260,300,{background:OR.navy,borderRadius:'22px 22px 40px 40px',overflow:'hidden'},div({position:'absolute',left:115,top:18,width:30,height:30,borderRadius:'50%',background:'#EDEFEE'})+logoNeg(55,150,150))};};

// ---------- 3 · Eventos: stand y paraguas ----------
S.ev_telon=()=>{const W=1500,H=1200;return {W,H,bg:OR.navy,html:orbit({W,H,cx:1180,cy:430,r:270,a0:200,a1:250,k:W/794,haloOp:.14})+
 logoNeg(90,80,240)+abs(90,230,620,null,{},q('¿Te encuentran cuando te buscan?',44,OR.ink,{ringColor:OR.teal,lineHeight:1.25}))+abs(90,370,null,null,{},dom('Aquí',240,C.white,{sphereColor:OR.teal}))+abs(90,680,null,null,{},urlB(40,'',true))};};
S.ev_pendon=()=>{const W=425,H=1000;return {W,H,bg:OR.navy,html:orbit({W,H,cx:212,cy:255,r:78,a0:200,a1:250,k:1.2,haloOp:.14})+logoNeg(112,70,200)+
 abs(40,390,345,null,{},q('¿Lo medimos?',24,OR.ink,{ringColor:OR.teal,textAlign:'center'}))+abs(0,436,W,null,{display:'flex',justifyContent:'center'},dom('Siempre',70,C.white,{sphereColor:OR.teal}))+
 abs(0,760,W,null,{display:'flex',justifyContent:'center'},urlB(24,'',true))+abs(0,900,W,100,{background:'#00122A'},cap('Zona baja sin contenido',OR.sub,11,{textAlign:'center',paddingTop:42}))};};
S.ev_meson=()=>{const W=700,H=680;return {W,H,bg:'#EDEFEE',html:abs(20,40,660,50,{background:'#F7F8F6',borderRadius:6,border:'1px solid #D3D8DD'})+abs(40,90,620,560,{background:OR.navy,overflow:'hidden'},orbit({W:620,H:560,cx:310,cy:230,r:0,a0:0,a1:0,k:1,haloOp:.12,rings:[],dot:false})+logoNeg(160,250,300))};};
S.ev_stand=()=>{const W=1920,H=1080,fl=920;return {W,H,bg:'#E4E6E3',html:abs(0,fl,W,H-fl,{background:'#C9CDC9'})+
 abs(560,200,null,null,{boxShadow:'0 10px 30px rgba(0,0,0,0.18)'},tileOf(S.ev_telon,.6))+abs(250,fl-600,null,null,{},tileOf(S.ev_pendon,.6))+abs(1100,fl-286,null,null,{},tileOf(S.ev_meson,.42))+
 abs(0,1000,W,null,{},p('Frente del stand de 3 × 2,4 m: el telón pregunta y responde, el pendón repite el eslogan de la conversación y el mesón firma.',22,C.muted,500,{textAlign:'center'}))};};
S.ev_paraguas=()=>{const W=900,H=900,cx=450,cy=450,R=380,n=8;let s='';for(let i=0;i<n;i++){const a0=(i/n)*2*Math.PI-Math.PI/2,a1=((i+1)/n)*2*Math.PI-Math.PI/2;s+=`<path d="M ${cx} ${cy} L ${cx+R*Math.cos(a0)} ${cy+R*Math.sin(a0)} L ${cx+R*Math.cos(a1)} ${cy+R*Math.sin(a1)} Z" fill="${i%2?'#001A33':'#062540'}"/>`;}
 return {W,H,bg:'#EDEFEE',html:svgW(W,H,s)+abs(0,0,W,H,{clipPath:`circle(${R*.92}px at ${cx}px ${cy}px)`},orbit({W,H,cx,cy,r:260,a0:200,a1:250,k:1.8,haloOp:.12}))+svgW(W,H,`<circle cx="${cx}" cy="${cy}" r="12" fill="#8E98A2"/>`)+abs(0,cy+40,W,null,{display:'flex',justifyContent:'center'},dom('Siempre',64,C.white,{sphereColor:OR.teal}))};};
S.ev_paraguasLado=()=>{const W=900,H=900,cx=450;return {W,H,bg:'#EDEFEE',html:svgW(W,H,`<path d="M 90 430 C 120 180 780 180 810 430 C 760 400 700 400 650 430 C 600 400 520 400 450 430 C 380 400 300 400 250 430 C 200 400 140 400 90 430 Z" fill="#001A33"/><path d="M ${cx} 240 L ${cx} 760 C ${cx} 820 ${cx-70} 820 ${cx-70} 760" fill="none" stroke="#8E98A2" stroke-width="12" stroke-linecap="round"/><path d="M ${cx} 240 L ${cx} 200" stroke="#8E98A2" stroke-width="8"/>`)+logoNeg(cx-90,320,180)};};

boards['O-14-bienvenida-envios.dc.html']=board('4.7 · Bienvenida y envíos (1/3)',
 head('4.7 · Bienvenida y envíos (1 de 3)','Lo primero que se abre ya habla como Efeonce.','La caja de bienvenida para quien se integra al equipo, la botella deportiva que va adentro y el empaque para enviar merch a clientes. Afuera, la palabra con su punto; adentro, lo que la persona recibe.')+
 place(64,300,'Caja de bienvenida · tapa',S.bv_tapa,.45)+place(832,300,'Caja de bienvenida · abierta',S.bv_abierta,.45)+
 PH(64,860,272,'Botella · navy',BT.navyF,'Botella deportiva navy con «Hacer.» dentro de una órbita teal')+PH(356,860,272,'Botella · reverso',BT.navyR,'Reverso de la botella con el logo Efeonce solo')+
 PH(648,860,272,'Botella · blanca',BT.blancaF,'Botella deportiva blanca con «Medir.» y órbita teal oscuro')+PH(940,860,272,'Botella · Reach',BT.reachF,'Botella deportiva Reach con «Llegar.» y órbita naranja')+PH(1232,860,272,'Reach · reverso',BT.reachR,'Reverso de la botella Reach con su logo solo')+
 place(64,1220,'Envío a clientes · por fuera',S.bv_envioFuera,.5)+place(704,1220,'Envío a clientes · por dentro',S.bv_envioDentro,.5)+
 col(64,1720,1472,240,'Reglas',list(['Caja de bienvenida: la tapa pregunta y responde («¿Primer día? Adelante.»); adentro, el nombre de la persona con su punto. El logo va en el canto.','Botella deportiva: acero con pintura en polvo y tapa rosca con asa; adelante el verbo en su órbita, atrás el logo solo. Diseño propio, no la forma de una marca existente.','Envío a clientes: por fuera, sobrio (logo chico y un anillo); lo que viaja por correo no anuncia lo que lleva. Por dentro, «Gracias.» y el papel de seda cerrado con un sello teal: la esfera.','Los datos entre corchetes se completan por persona o por envío.'],13.5)),1600,2020);
boards['O-15-papeleria-llavero.dc.html']=board('4.7 · Papelería y llavero (2/3)',
 head('4.7 · Papelería y llavero (2 de 3)','El papel lleva la órbita en la esquina y el punto al pie.','Hoja membretada (primera página y continuación), sobre americano y llavero. La hoja usa la misma línea que la firma de mail: termina en la esfera.')+
 place(64,300,'Hoja membretada · A4',S.pp_carta,.44)+place(440,300,'Hoja de continuación',S.pp_cartaSeg,.44)+
 place(816,300,'Sobre americano · frente',S.pp_sobre,.66)+place(816,720,'Sobre · dorso',S.pp_sobreDorso,.66)+
 place(64,880,'Llavero · frente',S.pp_llavero,.4)+place(440,880,'Llavero · reverso',S.pp_llaveroRev,.4)+
 col(64,1200,1472,240,'Reglas',list(['Hoja: logo arriba a la izquierda y la órbita recortada en la esquina superior derecha, al 18 % en navy. Pie con dirección, teléfono y web; la línea del pie termina en la esfera.','La continuación no lleva órbita: logo chico y número de página.','Sobre: frente con logo y remitente; en el dorso, el sello es la esfera. Cerrado = respondido.','Llavero: la argolla es el anillo y la cuenta teal es la esfera; la placa dice «Adelante.» y, atrás, el logo solo.','Texto de la carta en Poppins 11 pt; nunca la órbita detrás del texto.'],13.5)),1600,1500);
boards['O-16-eventos.dc.html']=board('4.7 · Eventos: stand y paraguas (3/3)',
 head('4.7 · Eventos (3 de 3) · Stand y paraguas','En una feria la órbita se ve desde el pasillo.','Kit de stand (telón de fondo, pendón y mesón) y paraguas para eventos. El telón hace la pregunta, el mesón firma.')+
 place(64,300,'Stand armado · vista frontal',S.ev_stand,.52)+
 place(1080,300,'Pendón roll-up · 85 × 200 cm',S.ev_pendon,.42)+
 place(64,920,'Telón de fondo · 3 × 2,4 m',S.ev_telon,.42)+place(720,920,'Mesón · 100 × 90 cm',S.ev_meson,.5)+
 place(1100,920,'Paraguas · desde arriba',S.ev_paraguas,.24)+place(1340,920,'Paraguas · de lado',S.ev_paraguasLado,.21)+
 col(1100,1160,436,380,'Reglas',list(['Telón: pregunta chica, respuesta grande («¿Te encuentran cuando te buscan? Aquí.») en la mitad de arriba, sobre la altura del mesón; la órbita a la derecha.','Pendón: logo arriba, la conversación al centro y los 20 cm de abajo libres (los tapan el mesón y la gente).','Mesón: el logo solo; es la firma del stand.','Paraguas: visto desde arriba es una órbita con «Siempre.»; de lado, el logo en un paño.','Validar colores con prueba de impresión en tela.'],13)),1600,1560);
// ================= 4.8 · Merch en foto (IA generativa sobre el arte plano y los kits reales) =================
const IA={lapiceros:'bf9d60aa6db8746b01b092f68aac642b',pulseras:'ec6bb867071fae7f8a4cfb58fdc668f4',mousepad:'2a5756352b5bb0a6b01110eefe279fa6',polo:'c0bff12e33a90125b98860f24c735af1',polera:'174c9963477f11bd476d354e00da9ec9',gorra:'053a791cb754e6023e8003b038971c97',pin:'d41dae71893c384aea9f78a2c3e64468',carnet:'e0bbe9c372e3a8e6b3fd6f35c2f0fde9',credencial:'b78d102b9ce148f587ef9d700da58288',tarjetas:'77e2ad25e02cf5fcd9849a1e03eeefc8',cajaTapa:'b2abd097609186e1a60dd4457f148829',cajaAbierta:'8cf945faba44066a6a3bacfdced10834',envio:'be39bd4c9c9cf77d6c1e0ff5b5c737b2',papeleria:'ab78667e69eca95e1b3359fa51968061',llavero:'44f1a3fbc433a6825c25f336bb6b1e2c',stand:'349a951785a68abfd31f102515440b0d',paraguas:'33343b2eb73cd8c9c54d776d21807f48'};
const _iaP=(x,y,w,h,k,l,alt)=>lab(x,y,l)+abs(x,y,w,h,{background:'#E6E9EB',outline:`1px solid ${C.line}`,overflow:'hidden'},`<img src="/_blob/${IA[k]}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${w}px; height: ${h}px; object-fit: cover">`);
const iaP=(x,y,w,h,k,l,alt)=>{__EXP.label=l;REC({type:'photo',src:`/_blob/${IA[k]}`,alt,W:w,H:h,dw:w});const d=__EXP.depth;__EXP.depth++;const r=_iaP(x,y,w,h,k,l,alt);__EXP.depth=d;return r;};
const iaNota=y=>col(64,y,1472,200,'Cómo se hicieron',list(['Cada foto parte del arte plano de 4.6 y 4.7 como referencia exacta: el modelo (GPT Image 2.5 Sunburst) sólo pone material y luz; la gráfica no se redibuja.','Las prendas usan además los kits reales de Efeonce (polo, gorra, lanyard) como referencia de forma y tela.','Son maquetas de presentación. La producción sale siempre de los archivos vectoriales y de una muestra física del proveedor.'],13.5));
boards['M-01-merch-foto-llevar.dc.html']=board('4.8 · Merch en foto (1/3): llevar y vestir',
 head('4.8 · Merch en foto (1 de 3) · Llevar y vestir','Así se ve la línea cuando sale de la pantalla.','Lapiceros, pulseras, alfombra de escritorio, polo, polera, gorra y pin, fotografiados a partir de su arte plano.')+
 iaP(64,300,480,320,'lapiceros','Lapiceros','Tres lapiceros Efeonce con Hacer., Medir. y Crear. y el botón como esfera')+iaP(560,300,480,320,'pulseras','Pulseras de silicona','Cinco pulseras de silicona con un verbo y su punto')+iaP(1056,300,480,320,'mousepad','Alfombra de escritorio','Alfombra navy con Hacer., la órbita y el logo sobre un escritorio')+
 iaP(64,680,356,356,'polo','Polo navy · la esfera es el botón','Polo navy con botón teal y Hacer. bordado')+iaP(436,680,356,356,'polera','Polera navy · órbita en el pecho','Polera navy con Hacer. dentro de la órbita')+iaP(808,680,356,356,'gorra','Gorra · el botón es la esfera','Gorra con Hacer. bordado y botón teal')+iaP(1180,680,356,356,'pin','Pin esmaltado','Pin esmaltado navy con la órbita en plata y teal')+
 iaNota(1100),1600,1340);
boards['M-02-merch-foto-identificarse.dc.html']=board('4.8 · Merch en foto (2/3): identificarse y bienvenida',
 head('4.8 · Merch en foto (2 de 3) · Identificarse y bienvenida','Lo que se cuelga, se entrega y se abre.','Carnet, credencial de evento, tarjetas de presentación, caja de bienvenida y empaque de envío a clientes.')+
 iaP(64,300,300,450,'carnet','Carnet de equipo','Carnet de Julio Reyes en su portacarnet con el yoyo de la nave')+iaP(380,300,300,450,'credencial','Credencial de evento · staff','Credencial de evento con Nombre y rol Staff')+iaP(696,300,840,450,'tarjetas','Tarjetas de presentación · frente y reverso','Tarjeta de Julio Reyes y su reverso navy con la órbita y el logo')+
 iaP(64,810,480,320,'cajaTapa','Caja de bienvenida · tapa','Caja navy con ¿Primer día? Adelante.')+iaP(560,810,480,320,'cajaAbierta','Caja de bienvenida · abierta','Caja abierta con botella, carnet, llavero, polo, lapicero y tarjeta')+iaP(1056,810,480,320,'envio','Envío a clientes','Caja de envío abierta con Gracias. y el sello teal')+
 iaNota(1190),1600,1430);
boards['M-03-merch-foto-papeleria-eventos.dc.html']=board('4.8 · Merch en foto (3/3): papelería y eventos',
 head('4.8 · Merch en foto (3 de 3) · Papelería y eventos','La hoja, el sobre, las llaves y el stand.','Papelería, llavero, stand para ferias y paraguas para eventos.')+
 iaP(64,300,720,480,'papeleria','Hoja membretada y sobres','Hoja membretada, sobre frente y sobre dorso con el sello teal')+iaP(816,300,720,480,'stand','Stand para ferias','Stand con telón Aquí., pendón Siempre. y mesón con el logo')+
 iaP(64,840,480,480,'llavero','Llavero · frente y reverso','Dos llaveros, uno con Adelante. y otro con el logo')+iaP(560,840,480,480,'paraguas','Paraguas · desde arriba','Paraguas navy con la órbita y Siempre.')+
 col(1056,840,480,480,'Estado',p('Maquetas aprobables como dirección. Antes de producir: muestra física, prueba de color sobre la tela o el papel real y revisión del texto contra el archivo vectorial.',15,C.ink,400,{lineHeight:1.5}))+
 iaNota(1380),1600,1620);
// ================= 4.9 · Oficina en foto (IA generativa sobre el arte plano de 4.3) =================
Object.assign(IA,{ofRecepcion:'96548858f38d557ec85fa45a3bb0dc20',ofSala:'8bf6e293318371e92d540f3c542456aa',ofPasillo:'6eb5d5543590d4ba881f808d06017324',ofPizarra:'8e7293793e50e2021a43b7b2473dec12',ofEstado:'38ec8b7c99db02c7c12831c190d35cea',ofVoz:'5f2ccbf87c4e00c319e42a8447d52c8c',ofCocina:'0f5af896c162cab35048f73d504fe077',ofPuesto:'7ba8f92494f3783f2c24dc7ef092ec14',ofCabinas:'f944fbe713b522c1333d5a2328231616'});
boards['M-04-oficina-foto.dc.html']=board('4.9 · Oficina en foto',
 head('4.9 · Oficina en foto · Llegar, trabajar, convivir','La oficina de 4.3, fotografiada.','Las nueve aplicaciones de oficina llevadas a un espacio real: mural, vidrios, pasillo, pizarra, pantalla de sala, muro de voz, cocina, puesto y cabinas.')+
 iaP(64,300,720,480,'ofRecepcion','Recepción · el mural','Mural navy de recepción con Hacer. y la lente con una mano que ajusta la esfera')+iaP(816,300,720,480,'ofSala','Sala · vidrio esmerilado','Vidrio de sala con Sala 02, En sesión hasta las 16:00. y la lente como ventana')+
 iaP(64,840,480,320,'ofPasillo','Pasillo · muro de trabajo','Muro navy de pasillo con ¿Cuál sale al aire? Esta. y la lente sobre una botella')+iaP(560,840,480,320,'ofPizarra','Pizarra de proyecto','Pizarra con ¿Qué aprendimos en este ciclo? y un imán teal como esfera')+iaP(1056,840,480,320,'ofEstado','Estado de sala','Pantalla junto a la puerta con Hacer., En sesión y el arco del tiempo')+
 iaP(64,1220,480,320,'ofVoz','Muro de voz','Muro pintado con ¿Lo medimos? Siempre.')+iaP(560,1220,480,320,'ofCocina','Cocina','Muro de cocina con ¿Otra vuelta? Vamos. y seis tazas Efeonce')+iaP(1056,1220,480,320,'ofPuesto','Puesto de bienvenida','Cuaderno Ideas., carnet, stickers y bolsa Hacer. sobre un escritorio')+
 iaP(64,1600,720,480,'ofCabinas','Cabinas · libre y en el aire','Dos cabinas acústicas con los letreros Libre. y En el aire.')+
 col(816,1600,720,480,'Cómo se hicieron',list(['Cada foto parte del arte plano de 4.3 como referencia exacta: GPT Image 2.5 Sunburst sólo pone el espacio, el material y la luz; la gráfica no se redibuja.','Registro documental: luz de día con una dirección, materiales reales, nadie mira al lente.','Cuatro se corrigieron editando la foto: dos notas de la lámina que el modelo pintó en el muro, un espacio antes del punto y el logo del carnet (repuesto desde el logo oficial).','Son maquetas de dirección. La producción sale de los archivos vectoriales, con prueba de color sobre el material real.'],13.5)),1600,2140);
// ================= 5.3–5.5 · Do's & Don'ts: logo correcto, logo incorrecto y elementos sí/no =================
const OK='#1E7F4F',NO='#B3261E';
const badge=(ok,x=12,y=12)=>abs(x,y,30,30,{borderRadius:'50%',background:ok?OK:NO,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:PO,fontWeight:700,fontSize:17,lineHeight:1},ok?'✓':'✕');
// Tile con fondo, contenido, marca ✓/✕ y leyenda debajo
const _tile=(x,y,w,h,bg,inner,ok,title,note='')=>abs(x,y,w,h,{background:bg,outline:`1px solid ${C.line}`,overflow:'hidden'},inner+badge(ok))+
 abs(x,y+h+10,w,null,{},p(`<b style="font-weight: 600; color: ${ok?OK:NO}">${title}</b>${note?' · '+note:''}`,13,C.ink,400,{lineHeight:1.4}));
const tile=(x,y,w,h,bg,inner,ok,title,note='')=>{REC({type:'verdict',ok,title,note,bg,html:inner,W:w,H:h,dw:w});return _tile(x,y,w,h,bg,inner,ok,title,note);};
const LG=(src,x,y,w,r,o={})=>`<img src="${src}" alt="" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${+(w*r).toFixed(1)}px; ${Object.entries(o).map(([k,v])=>k+': '+v).join('; ')}">`;
const cLogo=(src,w,h,lw,r,o)=>LG(src,(w-lw)/2,(h-lw*r)/2,lw,r,o);
const maskLogo=(src,x,y,w,r,bg)=>abs(x,y,w,+(w*r).toFixed(1),{background:bg,WebkitMaskImage:`url(${src})`,maskImage:`url(${src})`,WebkitMaskSize:'100% 100%',maskSize:'100% 100%'});
const E=LK.efeonce,R=E.r;

// ---------- 5.3 · Logo: uso correcto ----------
{const TW=460,TH=250,g=46,X=[64,64+TW+g,64+2*(TW+g)];
 // Área de resguardo: X = alto de la nave (≈ 60 % del alto del logo)
 const lw=300,lh=lw*R,xu=lh*.6,cx=(TW*2+g-lw)/2,cy=(TH+40-lh)/2;
 const resguardo=abs(0,0,TW*2+g,TH+40,{},LG(E.full,cx,cy,lw,R)+abs(cx-xu,cy-xu,lw+2*xu,lh+2*xu,{border:`1.5px dashed ${C.tealDark}`,boxSizing:'border-box'})+
  abs(cx-xu,cy-xu-26,xu,20,{},cap('X',C.tealDark,13,{textAlign:'center'}))+abs(cx-xu,cy-xu,xu,xu,{background:'rgba(14,140,130,0.10)'})+abs(cx+lw,cy+lh,xu,xu,{background:'rgba(14,140,130,0.10)'}));
 const minimo=abs(0,0,TW,TH,{},LG(E.full,60,80,96,R)+abs(60,112,200,null,{},cap('96 px · 25 mm',C.muted,11))+LG(LK.efeonce.full,240,84,160,R)+abs(240,130,200,null,{},cap('Recomendado ≥ 160 px',C.muted,11))+
  `<img src="${FAM[0].iso[0]}" alt="" style="position: absolute; left: 60px; top: 170px; width: 24px; height: 24px; object-fit: contain">`+abs(96,176,300,null,{},cap('Isotipo mínimo · 24 px · 8 mm',C.muted,11)));
 const fam=(dark)=>abs(0,0,TW,TH,{background:dark?C.ink2:C.paper},FAM.map((b,i)=>LG(dark?LK[b.k].neg:LK[b.k].full,30+(i%2)*215,50+Math.floor(i/2)*100,Math.min(170,50/LK[b.k].r),LK[b.k].r)).join(''));
 boards['D-01-logo-correcto.dc.html']=board('5.3 · Logo: uso correcto',
  head('5.3 · Logo · Uso correcto','El logo se usa desde el archivo oficial, con aire y contraste.','Ocho reglas que cubren casi todos los casos. Si una pieza no calza con ninguna, se consulta antes de inventar una variante.')+
  tile(X[0],300,TW,TH,C.white,cLogo(E.full,TW,TH,260,R),true,'A color sobre blanco o papel','navy oficial')+
  tile(X[1],300,TW,TH,C.dark,cLogo(E.neg,TW,TH,260,R),true,'Negativo sobre navy','siempre el archivo negativo, todo blanco')+
  tile(X[2],300,TW,TH,'#001A33',`<img src="${IMG.L4}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover; object-position: 50% 20%">`+LG(E.neg,24,150,150,R),true,'Sobre foto, en una zona calma','contraste ≥ 4,5:1 medido; nunca con velo encima')+
  RB(X[0],640,TW*2+g,TH+40,{background:C.white,outline:`1px solid ${C.line}`},resguardo+badge(true))+abs(X[0],640+TH+50,TW*2+g,null,{},p(`<b style="font-weight: 600; color: ${OK}">Área de resguardo</b> · X = alto de la nave. Nada entra en ese margen: ni texto, ni bordes, ni la órbita.`,13,C.ink))+
  tile(X[2],640,TW,TH+40,C.white,minimo,true,'Tamaño mínimo','bajo eso, el isotipo')+
  tile(X[0],1060,TW,TH,C.paper,fam(false),true,'Familia a color','cada marca con su archivo')+
  tile(X[1],1060,TW,TH,C.ink2,fam(true),true,'Familia en negativo','productos sobre #091951')+
  tile(X[2],1060,TW,TH,C.paper,`<img src="${LOCK.light}" alt="" style="position: absolute; left: 40px; top: ${(TH-380*LOCK.r)/2}px; width: 380px; height: ${+(380*LOCK.r).toFixed(1)}px">`,true,'Logo con eslogan','sólo el bloque oficial, en cierres')+
  abs(64,1420,1472,300,{background:C.white,outline:`1px solid ${C.line}`,overflow:'hidden'},badge(true)+
   abs(80,70,900,null,{},div({fontFamily:BR,fontWeight:760,fontSize:64,letterSpacing:'-0.035em',color:C.navy,lineHeight:1.1,whiteSpace:'nowrap'},'Somos <img src="'+E.full+'" alt="Efeonce" style="height: 0.94em; width: auto; vertical-align: -0.19em; margin: 0 0.06em"> y medimos'+sph('0.2em')))+
   abs(80,170,860,null,{},p('Titular de display con el logo en lugar de la palabra Efeonce: misma altura de x, misma línea base.',13,C.muted))+
   abs(1000,50,420,null,{},p('<b style="font-weight: 600; color: #1E7F4F">Sí, con reglas</b> · En una frase de display',14,C.ink)+list(['Sólo en titulares grandes: el logo queda sobre 96 px de ancho. Nunca en texto corrido, interfaz ni legales.','Misma altura de x y misma línea base que el texto: la «e» del logo mide lo que la x de la frase; la nave se descuelga como en el logo aislado.','Una vez por pieza y sin repetir el logo como firma en la misma vista.','Reemplaza sólo la palabra Efeonce: la frase se lee igual en voz alta.','Color oficial, sin recolorear; el punto final va al cierre de la frase, nunca pegado al logo.'],12.5)))+
  abs(64,1730,1472,null,{},p('Medida: la altura de x de «efeonce» es el 55 % del alto del archivo y su línea base cae al 80 %. En CSS: <code>height: 0.94em; vertical-align: -0.19em</code> con Bricolage 760.',13,C.muted))+
  col(64,1800,1472,260,'Cómo elegir',list(['¿Hay espacio para el logo completo a 96 px o más? Logo completo. Si no, isotipo (avatar, favicon, pin, credencial).','¿El fondo es navy u oscuro? Negativo oficial. ¿Blanco o papel? A color. ¿Foto? Busca la zona calma o cambia la foto; no se oscurece encima.','En objetos, el logo va en el dorso, solo; adelante va la palabra con su punto.','Los archivos viven en src/assets y en OneDrive (13- Branding/SVG). Nunca se redibujan ni se exportan desde una captura.'],13.5)),1600,2100);}

// ---------- 5.4 · Logo: usos incorrectos ----------
{const TW=344,TH=200,g=32,col_=i=>64+(i%4)*(TW+g),row=i=>300+Math.floor(i/4)*(TH+86);
 const lw=200,lh=lw*R,lx=(TW-lw)/2,ly=(TH-lh)/2;
 const bad=[
  ['Estirar o comprimir','cambia la proporción',C.white,LG(E.full,lx-40,ly,lw+80,R,{height:(lh*.8).toFixed(1)+'px'})],
  ['Rotar o inclinar','el logo va siempre horizontal',C.white,LG(E.full,lx,ly,lw,R,{transform:'rotate(-14deg)'})],
  ['Recolorear','ni teal, ni el acento de otra marca',C.white,maskLogo(E.full,lx,ly,lw,R,C.tealDark)],
  ['Degradados o efectos','el logo es plano',C.white,maskLogo(E.full,lx,ly,lw,R,'linear-gradient(90deg,#0375DB,#36C8BF,#FF6500)')],
  ['Sombras, brillos o contornos','',C.white,LG(E.full,lx,ly,lw,R,{filter:'drop-shadow(6px 8px 4px rgba(0,0,0,0.45))'})],
  ['Sin contraste','navy sobre azul oscuro, o sobre textura','#12375E',LG(E.full,lx,ly,lw,R)],
  ['Sobre una foto cargada','el logo compite con la escena',C.dark,`<img src="${IMG.L7}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover">`+LG(E.neg,lx,ly,lw,R)],
  ['Órbita alrededor del logo','la órbita rodea palabras, nunca el logo',C.dark,orbit({W:TW,H:TH,cx:TW/2,cy:TH/2,r:92,a0:200,a1:250,k:1.3,haloOp:.14})+LG(E.neg,lx+20,ly+5,lw-40,R)],
  ['Agregarle la esfera o un punto','la esfera es de la palabra, no del logo',C.white,LG(E.full,lx-10,ly,lw,R)+abs(lx+lw-4,ly+lh-16,14,14,{borderRadius:'50%',background:C.tealDark})],
  ['Escribirlo con una fuente','se usa el archivo, no se tipea',C.white,abs(0,ly-8,TW,null,{},div({fontFamily:PO,fontWeight:800,fontStyle:'italic',fontSize:46,color:C.navy,textAlign:'center',letterSpacing:'-0.02em'},'efeonce'))],
  ['Logo e isotipo juntos','uno u otro en cada vista',C.white,`<img src="${FAM[0].iso[0]}" alt="" style="position: absolute; left: ${lx-30}px; top: ${ly-8}px; width: 60px; height: 60px; object-fit: contain">`+LG(E.full,lx+40,ly,lw-40,R)],
  ['En texto corrido','en párrafos, interfaz o tamaño chico; en titulares sí, con reglas (5.3)',C.white,abs(28,54,TW-56,null,{},p('Nuestro equipo en <img src="'+E.full+'" alt="" style="height: 0.9em; width: auto; vertical-align: -0.1em"> revisa cada informe antes de enviarlo y documenta las decisiones.',14,C.ink,400,{lineHeight:1.55}))],
 ];
 const X=(i)=>abs(0,0,TW,TH,{},svgW(TW,TH,`<line x1="0" y1="${TH}" x2="${TW}" y2="0" stroke="${NO}" stroke-opacity=".35" stroke-width="2"/>`));
 boards['D-02-logo-incorrecto.dc.html']=board('5.4 · Logo: usos incorrectos',
  head('5.4 · Logo · Usos incorrectos','Doce cosas que nunca se le hacen al logo.','Todas tienen la misma causa: tratar el logo como una imagen editable. El logo es un archivo cerrado; lo que cambia es dónde y sobre qué se pone.')+
  bad.map(([t,n,bg,inner],i)=>tile(col_(i),row(i),TW,TH,bg,inner+X(i),false,t,n)).join('')+
  col(64,1180,1472,200,'Si ninguna versión funciona',list(['Cambia el fondo o la foto, no el logo.','Si el espacio es muy chico, usa el isotipo; si es muy grande, deja más aire, no lo estires.','¿Falta una versión (por ejemplo, un negativo todo blanco de Wave)? Se pide a diseño; no se arma en la pieza.'],13.5)),1600,1420);}

// ---------- 5.5 · Isotipo: uso correcto, incorrecto y tamaño mínimo ----------
{const TW=344,TH=200,g=32,cx_=i=>64+(i%4)*(TW+g),IR=426/600,ISO=FAM[0].iso[0],ISOW=FAM[0].iso[1];
 const I=(src,x,y,w,o={})=>LG(src,x,y,w,IR,o);const cI=(src,w,o)=>I(src,(TW-w)/2,(TH-w*IR)/2,w,o);
 const maskI=(x,y,w,bg)=>maskLogo(ISO,x,y,w,IR,bg);
 const good=[
  ['A color sobre blanco o papel','',C.white,cI(ISO,120)],
  ['Blanco sobre navy','el archivo blanco oficial',C.dark,cI(ISOW,120)],
  ['Avatar de redes','círculo navy; el isotipo ocupa 60 % del ancho',C.paper,abs((TW-150)/2,25,150,150,{borderRadius:'50%',background:C.dark},I(ISOW,30,75-90*IR/2,90))],
  ['Ícono de app o favicon','cuadrado redondeado, mismo margen',C.paper,abs((TW-130)/2,35,130,130,{borderRadius:28,background:C.dark},I(ISOW,26,65-78*IR/2,78))],
 ];
 const iw=150,ih=iw*IR,xu=iw*.17,ix=(TW*2+g-iw)/2,iy=(TH+60-ih)/2;
 const resguardo=I(ISO,ix,iy,iw)+abs(ix-xu,iy-xu,iw+2*xu,ih+2*xu,{border:`1.5px dashed ${C.tealDark}`,boxSizing:'border-box'})+abs(ix-xu,iy-xu,xu,xu,{background:'rgba(14,140,130,0.10)'})+abs(ix+iw,iy+ih,xu,xu,{background:'rgba(14,140,130,0.10)'})+abs(ix-xu,iy-xu-24,xu,20,{},cap('X',C.tealDark,13,{textAlign:'center'}));
 const sizes=[96,48,32,24,16];let sx=40;const escalera=sizes.map(s=>{const h=s*IR,html=I(ISO,sx,150-h,s)+abs(sx-6,166,s+40,null,{},cap(s+' px',s<24?NO:C.muted,11))+(s<24?abs(sx+s+4,150-h-6,20,20,{borderRadius:'50%',background:NO,color:'#fff',fontFamily:PO,fontWeight:700,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center'},'✕'):'');sx+=s+70;return html;}).join('');
 const bad=[
  ['Rotarlo o voltearlo','la nave sube hacia la derecha, siempre',C.white,cI(ISO,120,{transform:'scaleX(-1) rotate(-20deg)'})],
  ['Recolorearlo','ni teal, ni naranja, ni degradé',C.white,abs((TW-120)/2,(TH-120*IR)/2,120,120*IR,{},maskI(0,0,120,'linear-gradient(90deg,#36C8BF,#FF6500)'))],
  ['Estirarlo','',C.white,cI(ISO,120,{width:'180px',left:((TW-180)/2)+'px'})],
  ['Ponerle otra órbita','el isotipo ya trae la suya',C.dark,orbit({W:TW,H:TH,cx:TW/2,cy:TH/2,r:88,a0:200,a1:250,k:1.3,haloOp:.14})+cI(ISOW,100)],
  ['Recortarlo en un círculo que lo corta','el círculo contiene; no corta',C.paper,abs((TW-110)/2,45,110,110,{borderRadius:'50%',background:C.dark,overflow:'hidden'},I(ISOW,-25,55-160*IR/2,160))],
  ['Armar un lockup propio','isotipo + palabra tipeada no es el logo',C.white,I(ISO,70,(TH-60*IR)/2,60)+abs(140,(TH-40)/2,200,null,{},div({fontFamily:PO,fontWeight:700,fontSize:34,color:C.navy},'Efeonce'))],
  ['Sin contraste','navy sobre azul oscuro',"#12375E",cI(ISO,120)],
  ['Mezclarlo con otro isotipo','nada de emblemas combinados',C.white,I(ISO,100,(TH-90*IR)/2,90)+`<img src="${FAM[1].iso[0]}" alt="" style="position: absolute; left: 160px; top: 60px; width: 80px; height: 80px; object-fit: contain">`],
 ];
 const Xl=abs(0,0,TW,TH,{},svgW(TW,TH,`<line x1="0" y1="${TH}" x2="${TW}" y2="0" stroke="${NO}" stroke-opacity=".35" stroke-width="2"/>`));
 boards['D-05-isotipo.dc.html']=board('5.5 · Isotipo: uso correcto, incorrecto y tamaño mínimo',
  head('5.5 · Isotipo · Correcto, incorrecto y tamaño mínimo','El isotipo ya es una órbita: no se le agrega nada.','La nave con su anillo y su esfera es el origen de la línea gráfica. Por eso firma sola en formatos chicos y nunca lleva otra órbita, otro punto ni otro color.')+
  good.map(([t,n,bg,inner],i)=>tile(cx_(i),300,TW,TH,bg,inner,true,t,n)).join('')+
  RB(64,586,TW*2+g,TH+60,{background:C.white,outline:`1px solid ${C.line}`},resguardo+badge(true))+abs(64,586+TH+70,TW*2+g,null,{},p(`<b style="font-weight: 600; color: ${OK}">Área de resguardo</b> · X = diámetro de la esfera del isotipo, en los cuatro lados.`,13,C.ink))+
  RB(cx_(2),586,TW*2+g,TH+60,{background:C.white,outline:`1px solid ${C.line}`},escalera)+abs(cx_(2),586+TH+70,TW*2+g,null,{},p(`<b style="font-weight: 600; color: ${OK}">Tamaño mínimo</b> · 24 px en pantalla y 8 mm impreso. A 16 px las tres ventanas se pierden: el favicon de 16 px se valida aparte.`,13,C.ink))+
  bad.map(([t,n,bg,inner],i)=>tile(cx_(i),920+Math.floor(i/4)*286,TW,TH,bg,inner+Xl,false,t,n)).join('')+
  col(64,1520,1472,200,'Logo o isotipo',list(['Isotipo: avatar, favicon, ícono de app, pin, sticker, credencial, lomo de cuaderno, marca de agua en video.','Logo completo: todo lo demás, siempre que quepa a 96 px o más.','Nunca los dos en la misma vista. Cada marca de la familia tiene su isotipo; ninguno se recolorea ni se combina.'],13.5)),1600,1740);}
// ---------- 5.5 · Elementos: sí y no ----------
{const TW=500,TH=250,xL=64,xDo=520,xNo=1040;
 const rowEl=(y,name,rule,doBg,doIn,doT,noBg,noIn,noT)=>abs(xL,y,420,null,{display:'flex',flexDirection:'column',gap:10},div(W8(30,C.navy,760),name)+p(rule,14,C.ink,400,{lineHeight:1.5}))+
  tile(xDo,y,TW,TH,doBg,doIn,true,doT)+tile(xNo,y,TW,TH,noBg,noIn,false,noT);
 const OB=(W,H,cx,cy,r,o={})=>orbit({W,H,cx,cy,r,a0:200,a1:250,k:1.3,haloOp:.14,...o});
 const rows1=[
  ['La esfera','Es el punto final de una respuesta: al final de la palabra, en el acento, a 0,2 em. Una por pieza.',
   C.white,abs(50,90,null,null,{},dom('Medir',96,C.navy,{sphereColor:C.tealDark})),'Al final de la respuesta',
   C.white,abs(50,50,null,null,{},div(W8(60,C.navy,760),'¿Medimos'+sph('0.2em')+'?'))+abs(50,140,null,null,{},div({display:'flex',gap:14,alignItems:'center'},[0,1,2].map(()=>div({width:14,height:14,borderRadius:'50%',background:C.tealDark})).join('')+p('Viñetas con la esfera',22,C.navy))),'En preguntas, viñetas o varias por pieza'],
  ['La órbita','Un anillo fino al 16–22 %, un arco y la esfera en la punta. Radio ≈ 30 % del ancho. Máximo dos anillos.',
   C.dark,OB(TW,TH,340,125,100)+abs(40,95,null,null,{},dom('Hacer',64,C.white,{sphereColor:OR.teal})),'Anillo fino, arco y esfera, al costado del texto',
   C.dark,orbit({W:TW,H:TH,cx:250,cy:125,r:110,a0:120,a1:400,k:4,haloOp:.3,rings:[[1,.8],[.8,.6],[.6,.5],[.4,.4]]})+abs(130,95,null,null,{},dom('Hacer',64,C.white,{sphereColor:OR.teal})),'Anillos gruesos, muchos, o la órbita detrás del texto'],
  ['La voz','Pregunta chica en Poppins Light con su anillo; respuesta grande en Bricolage con su esfera. La respuesta, en 1 a 3 palabras.',
   C.paper,abs(40,60,null,null,{},q('¿Lo medimos?',26,C.ink))+abs(40,110,null,null,{},dom('Siempre',80,C.navy,{sphereColor:C.tealDark})),'Pregunta chica, respuesta grande',
   C.paper,abs(40,50,null,null,{},div(W8(52,C.navy,760),'¿Lo medimos?'))+abs(40,130,420,null,{},p('Sí, medimos todo lo que hacemos siempre.',22,C.ink)),'Pregunta grande, respuesta larga y chica'],
  ['El color','En oscuro: #001A33 con teal #36C8BF. En papel: navy #023C70 y teal oscuro #0E8C82 sólo en gráficos. Los acentos de producto, en su producto.',
   C.dark,abs(40,70,null,null,{},dom('Aparecer',72,C.white,{sphereColor:OR.teal}))+abs(40,170,null,null,{},p('#001A33 · #36C8BF',16,OR.sub,500)),'Navy profundo con teal',
   C.white,abs(40,70,null,null,{},div(W8(72,OR.teal,760),'Aparecer'))+abs(40,170,null,null,{},p('Texto teal claro sobre blanco: 2,1:1',16,NO,500)),'Teal claro como texto sobre blanco'],
 ];
 const rows2=[
  ['Tipografía','Bricolage Grotesque 760 para la palabra dominante; Poppins para preguntas y texto. Números en Poppins con cifras tabulares.',
   C.white,abs(40,50,null,null,{},dom('Crear',80,C.ink2,{sphereColor:'#BB1954'}))+abs(40,150,420,null,{},p('Del brief a la pieza aprobada.',20,C.ink)),'Bricolage para decir, Poppins para explicar',
   C.white,abs(40,50,420,null,{},div({fontFamily:BR,fontWeight:760,fontSize:26,color:C.ink2,lineHeight:1.3},'Del brief a la pieza aprobada, en cada ronda, con cada revisión y cada entrega.'))+abs(40,170,null,null,{},div({fontFamily:'Courier New, monospace',fontSize:20,color:C.ink2},'Crear.')),'Bricolage en párrafos o monoespaciada'],
  ['El eslogan','«Empower your Growth» desde el archivo oficial, con su palabra por capability (Growth, Brand, Engine, Voice). En cierres.',
   C.paper,abs(40,100,420,null,{},slogan('Growth',34)),'Bloque oficial, sin tocar',
   C.paper,abs(40,70,null,null,{},div({fontFamily:PO,fontWeight:700,fontSize:34,color:C.navy},'Empodera tu crecimiento'+sph('0.2em')))+abs(40,140,null,null,{},div({fontFamily:PO,fontWeight:300,fontSize:30,color:C.navy},'EMPOWER YOUR GROWTH')),'Traducido, con esfera o con otros pesos'],
  ['Los objetos','Adelante, la palabra con su punto (y la órbita si hay espacio). Atrás, el logo solo.',
   '#EDEFEE',`<img src="/_blob/7ed3f0528a67df69d2df9fa5c704de53" alt="" style="position: absolute; left: 30px; top: 10px; width: 220px; height: 230px; object-fit: contain"><img src="/_blob/a2b458005f7c582b3f35a901476f9f8f" alt="" style="position: absolute; left: 250px; top: 10px; width: 220px; height: 230px; object-fit: contain">`,'Frente: palabra · dorso: logo solo',
   '#EDEFEE',abs(150,40,200,180,{background:OR.navy,borderRadius:'10px 10px 26px 26px',overflow:'hidden'},orbit({W:200,H:180,cx:100,cy:90,r:62,a0:200,a1:250,k:1,haloOp:.14})+LG(E.neg,40,80,120,R)),'Logo y órbita juntos al frente'],
  ['La fotografía','La foto va en la lente o en el foco, con su luz y sin velo. Personas reales del equipo o escenas del oficio.',
   '#001A33',`<img src="${IMG.L4}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover; object-position: 50% 30%">`,'Oficio real, luz con carácter',
   '#001A33',`<img src="${IMG.L4}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover; object-position: 50% 30%; filter: grayscale(1)">`+abs(0,0,TW,TH,{background:'rgba(0,26,51,0.65)'})+abs(40,100,null,null,{},div(W8(56,C.white,760),'Hacer')),'Velo navy encima o foto de banco'],
 ];
 const mk=(rows,code,title,lede,file,tt)=>{boards[file]=board(`${code} · ${tt}`,head(`${code} · Elementos · Sí y no`,title,lede)+rows.map((r,i)=>rowEl(300+i*340,...r)).join(''),1600,300+rows.length*340+60);};
 mk(rows1,'5.6','Cada elemento tiene un trabajo; fuera de él, sobra.','Esfera, órbita, voz y color: lo correcto a la izquierda, lo que se evita a la derecha.','D-03-elementos-si-no.dc.html','Elementos: sí y no (1/2)');
 mk(rows2,'5.6','Lo que dice y cómo se ve, sin inventos.','Tipografía, eslogan, objetos y fotografía.','D-04-elementos-si-no-2.dc.html','Elementos: sí y no (2/2)');}
// ================= 7 · Pruebas en producto: Efeonce Insights (en el canvas, sin tocar producción) =================
// Las cifras son de muestra y se rotulan como tales. El arco de avance sólo mide datos (muestra) o navegación real.
const INS={url:'/_blob/5823f43dce4bda46fb955295bc5d0df3',hoy:{cover:'/_blob/15caeded92506c72eccf96a3dd4f52bf',chapter:'/_blob/36dcad4490495810c62ca9e57d4cef36',trend:'/_blob/59f784a91a7a9edc3cf5b4286d127c87',plan:'/_blob/4d5666a7f15cabe8aaa336cde57e657e'}};
const MUESTRA='Dato de muestra';
const inHead=(W,dark,right)=>(dark?logoNeg(56,44,104):lkF(56,44,104))+abs(172,50,200,null,{},kick('Insights',11,dark?OR.halo:C.tealDark))+abs(W-356,48,300,null,{},p(right,11,dark?OR.sub:C.muted,500,{textAlign:'right'}));
const inFoot=(W,H,dark,n)=>abs(56,H-58,W-112,1,{background:dark?'rgba(255,255,255,0.14)':C.line})+`<img src="${dark?URL_BUBBLE_DARK:URL_BUBBLE}" alt="efeoncepro.com" style="position: absolute; left: 56px; top: ${H-44}px; height: 20px; width: auto">`+(n?abs(W-156,H-44,100,null,{},p(String(n),11,dark?OR.sub:C.muted,500,{textAlign:'right'})):'');
// Arco de avance: mide una fracción desde las 12 en punto, en sentido horario.
const progress=(W,H,cx,cy,r,frac,dark,k)=>dark?orbit({W,H,cx,cy,r,a0:-90,a1:-90+frac*360,k,haloOp:.12}):oLight(W,H,cx,cy,r,-90,-90+frac*360,k);

// ---- Informe A4 ----
S.in_cover=()=>{const W=794,H=1123;return {W,H,bg:OR.navy,html:orbit({W,H,cx:560,cy:390,r:238,a0:200,a1:250,k:1,rings:[[1,.2],[.72,.1]],haloOp:.14})+inHead(W,true,'Agosto 2026')+
 abs(56,720,560,null,{},kick('[Marca] · Informe mensual',12,OR.halo))+abs(56,756,620,null,{},q('¿Qué cambió este mes?',22,OR.ink,{ringColor:OR.teal}))+abs(56,796,680,null,{},dom('Lo que medimos',74,C.white,{sphereColor:OR.teal}))+
 abs(56,900,560,null,{},p('Búsqueda, respuestas de IA y medios, en una lectura de diez minutos.',15,OR.sub,400,{lineHeight:1.5}))+inFoot(W,H,true,0)};};
S.in_chapter=()=>{const W=794,H=1123;return {W,H,bg:OR.navy,html:progress(W,H,560,330,190,2/5,true,1)+abs(560-60,330-40,120,null,{},p('2 de 5',22,OR.ink,500,{textAlign:'center'}))+inHead(W,true,'Capítulo 2')+
 abs(56,700,600,null,{},kick('Capítulo 2 · Búsqueda y respuestas de IA',12,OR.halo))+abs(56,736,620,null,{},q('¿Dónde nos encuentran?',22,OR.ink,{ringColor:OR.teal}))+abs(56,776,680,null,{},dom('En la respuesta',64,C.white,{sphereColor:OR.teal}))+
 abs(56,870,540,null,{},p('El arco mide la navegación real del informe: vas en el capítulo 2 de 5.',14,OR.sub,400,{lineHeight:1.5}))+inFoot(W,H,true,4)};};
S.in_summary=()=>{const W=794,H=1123;const row=(y,n,qq,a,ev)=>abs(56,y,470,1,{background:C.line})+abs(56,y+18,40,null,{},p(n,13,C.tealDark,600))+abs(96,y+14,430,null,{},q(qq,14,C.ink,{ringColor:C.tealDark}))+abs(96,y+42,430,null,{},dom(a,30,C.navy,{sphereColor:C.tealDark}))+abs(96,y+86,430,null,{},p(ev,11.5,C.muted,400,{lineHeight:1.45}));
 return {W,H,bg:C.white,html:inHead(W,false,'Resumen · Agosto 2026')+abs(56,130,500,null,{},kick('Resumen',12,C.tealDark))+abs(56,160,500,null,{},q('¿Qué tienes que saber?',20,C.ink,{ringColor:C.tealDark}))+abs(56,196,520,null,{},dom('Tres cosas',54,C.navy,{sphereColor:C.tealDark}))+
  row(300,'01','¿Te nombran?','Más que en julio','Menciones en respuestas de IA: 62 % de las consultas medidas. '+MUESTRA+'.')+row(440,'02','¿Y en Google?','Estable','Clics orgánicos sin cambio relevante frente a julio. '+MUESTRA+'.')+row(580,'03','¿Qué hacemos?','Dos ajustes','Reforzar dos páginas de categoría y medir en septiembre.')+
  abs(560,300,190,300,{},progress(190,190,95,95,78,.62,false,1.4)+abs(0,72,190,null,{},div({fontFamily:BR,fontWeight:760,fontSize:36,letterSpacing:'-0.035em',color:C.navy,textAlign:'center'},'62 %'))+abs(0,200,190,null,{},p('de las respuestas de IA mencionan la marca',12,C.ink,500,{textAlign:'center',lineHeight:1.4}))+abs(0,250,190,null,{},p(MUESTRA+' · el arco mide el dato',10.5,C.muted,400,{textAlign:'center'})))+
  inFoot(W,H,false,5)};};
S.in_trend=()=>{const W=794,H=1123;const X0=80,X1=714,Y0=640,Y1=360,vals=[31,34,33,38,41,40,47,52,55,58,60,62];const px=i=>X0+(X1-X0)*i/(vals.length-1),py=v=>Y0-(Y0-Y1)*(v-20)/50;
 const grid=[20,40,60].map(v=>`<line x1="${X0}" x2="${X1}" y1="${py(v)}" y2="${py(v)}" stroke="#DCE2E8" stroke-width="1"/><text x="${X0-12}" y="${py(v)+4}" font-size="11" fill="#5F5A69" text-anchor="end">${v} %</text>`).join('');
 const d=vals.map((v,i)=>`${i?'L':'M'} ${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');const lx=px(vals.length-1),ly=py(vals[vals.length-1]);
 return {W,H,bg:C.white,html:inHead(W,false,'Figura 2.1 · Agosto 2026')+abs(56,130,600,null,{},kick('Capítulo 2 · Figura 2.1',12,C.tealDark))+abs(56,160,620,null,{},q('¿Cómo evolucionó tu presencia en respuestas de IA?',18,C.ink,{ringColor:C.tealDark}))+abs(56,194,640,null,{},dom('Doce semanas al alza',44,C.navy,{sphereColor:C.tealDark}))+
  svgW(W,H,grid+`<path d="${d}" fill="none" stroke="#023C70" stroke-width="2" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="16" fill="none" stroke="#0E8C82" stroke-opacity=".25" stroke-width="1"/><circle cx="${lx}" cy="${ly}" r="6" fill="#0E8C82"/>`)+
  abs(lx-170,ly-58,160,null,{},p('<b style="font-weight: 600; color: #023C70">62 %</b> · semana 12',12,C.ink,400,{textAlign:'right'}))+
  abs(56,680,640,null,{},p('Porcentaje de consultas medidas en las que la IA menciona la marca, por semana. Fuente: medición de Efeonce en ChatGPT, Gemini, Perplexity y Google. '+MUESTRA+'.',11.5,C.muted,400,{lineHeight:1.5}))+
  abs(56,760,682,190,{background:C.paper,borderLeft:`3px solid ${C.tealDark}`,padding:'22px 26px',boxSizing:'border-box'},q('¿Qué lo explica?',15,C.ink,{ringColor:C.tealDark})+div({marginTop:10},dom('Las páginas de categoría',26,C.navy,{sphereColor:C.tealDark}))+p('Las dos páginas nuevas explican 7 de los 10 puntos ganados. '+MUESTRA+'.',12,C.muted,400,{marginTop:10}))+
  inFoot(W,H,false,9)};};
S.in_plan=()=>{const W=794,H=1123;const st=(done)=>done?div({width:12,height:12,borderRadius:'50%',background:C.tealDark,flexShrink:0}):div({width:12,height:12,borderRadius:'50%',border:`2px solid ${C.tealDark}`,boxSizing:'border-box',flexShrink:0});
 const rowP=(y,done,t,d,who)=>abs(56,y,682,1,{background:C.line})+abs(56,y+20,682,null,{display:'flex',gap:16,alignItems:'flex-start'},div({marginTop:4},st(done))+div({flex:1},p(t,15,C.navy,600)+p(d,12,C.muted,400,{marginTop:4,lineHeight:1.45}))+p(done?'Decidido':'Abierto',11.5,done?C.tealDark:C.muted,600,{width:90,textAlign:'right'})+p(who,11.5,C.muted,400,{width:110,textAlign:'right'}));
 return {W,H,bg:C.white,html:inHead(W,false,'Plan · Septiembre 2026')+abs(56,130,600,null,{},kick('Plan',12,C.tealDark))+abs(56,160,620,null,{},q('¿Qué hacemos en septiembre?',20,C.ink,{ringColor:C.tealDark}))+abs(56,196,620,null,{},dom('Cuatro acciones',50,C.navy,{sphereColor:C.tealDark}))+
  abs(56,290,682,null,{display:'flex',gap:24},div({display:'flex',gap:8,alignItems:'center'},st(true)+p('Decidido: esfera',12,C.ink))+div({display:'flex',gap:8,alignItems:'center'},st(false)+p('Abierto: anillo',12,C.ink)))+
  rowP(340,true,'Reforzar dos páginas de categoría','Contenido y datos estructurados en las dos páginas con más consultas.','[Responsable]')+rowP(440,true,'Medir en ChatGPT y Gemini cada semana','Mismas consultas, mismo panel, para comparar contra agosto.','Efeonce')+
  rowP(540,false,'Definir la tercera categoría','Decisión en la reunión de revisión: entre dos candidatas.','[Cliente]')+rowP(640,false,'Probar un formato de respuesta corta','Hipótesis por validar con el equipo de contenido.','[Cliente]')+
  abs(56,760,682,null,{},p('Es la gramática de la línea: el anillo es lo abierto, la esfera lo decidido. No reemplaza al color del estado; lo acompaña con la forma.',12,C.muted,400,{lineHeight:1.5}))+
  inFoot(W,H,false,12)};};
S.in_back=()=>{const W=794,H=1123;return {W,H,bg:OR.navy,html:orbit({W,H,cx:560,cy:330,r:200,a0:-90,a1:269.5,k:1,haloOp:.12,dot:false})+abs(560-9,130-9,18,18,{borderRadius:'50%',background:OR.teal})+inHead(W,true,'Agosto 2026')+
 abs(56,660,600,null,{},q('¿Qué sigue?',22,OR.ink,{ringColor:OR.teal}))+abs(56,700,600,null,{},dom('Decidir juntos',64,C.white,{sphereColor:OR.teal}))+abs(56,790,520,null,{},p('La órbita se completa en el cierre: el informe terminó y la esfera vuelve arriba.',14,OR.sub,400,{lineHeight:1.5}))+
 `<img src="${LOCK.dark}" alt="Efeonce · Empower your Growth" style="position: absolute; left: 56px; top: 930px; width: 260px; height: ${+(260*LOCK.rd).toFixed(1)}px">`+inFoot(W,H,true,0)};};

// ---- Deck 16:9 ----
S.in_deckCover=()=>{const W=1920,H=1080;return {W,H,bg:OR.navy,html:orbit({W,H,cx:1500,cy:380,r:340,a0:200,a1:250,k:W/794,rings:[[1,.2],[.72,.1]],haloOp:.14})+logoNeg(140,110,230)+abs(400,122,400,null,{},kick('Insights · Agosto 2026',18,OR.halo))+
 abs(140,640,1000,null,{},q('¿Qué cambió este mes?',40,OR.ink,{ringColor:OR.teal}))+abs(140,715,1200,null,{},dom('Lo que medimos',150,C.white,{sphereColor:OR.teal}))};};
S.in_deckFigure=()=>{const W=1920,H=1080;const X0=160,X1=1180,Y0=880,Y1=420,vals=[31,34,33,38,41,40,47,52,55,58,60,62];const px=i=>X0+(X1-X0)*i/(vals.length-1),py=v=>Y0-(Y0-Y1)*(v-20)/50;const d=vals.map((v,i)=>`${i?'L':'M'} ${px(i)} ${py(v)}`).join(' ');const lx=px(11),ly=py(62);
 return {W,H,bg:C.white,html:lkF(140,90,180)+abs(1400,96,380,null,{},kick('Capítulo 2 · 3 de 5',16,C.tealDark))+oLight(W,H,1780,120,34,-90,-90+.6*360,W/794/2)+
  abs(140,200,1200,null,{},q('¿Cómo evolucionó tu presencia en respuestas de IA?',32,C.ink,{ringColor:C.tealDark}))+abs(140,260,1500,null,{},dom('Doce semanas al alza',96,C.navy,{sphereColor:C.tealDark}))+
  svgW(W,H,[20,40,60].map(v=>`<line x1="${X0}" x2="${X1}" y1="${py(v)}" y2="${py(v)}" stroke="#DCE2E8" stroke-width="2"/>`).join('')+`<path d="${d}" fill="none" stroke="#023C70" stroke-width="4" stroke-linejoin="round"/><circle cx="${lx}" cy="${ly}" r="30" fill="none" stroke="#0E8C82" stroke-opacity=".25" stroke-width="2"/><circle cx="${lx}" cy="${ly}" r="12" fill="#0E8C82"/>`)+
  abs(1300,470,480,null,{},div({fontFamily:BR,fontWeight:760,fontSize:120,letterSpacing:'-0.035em',color:C.navy,lineHeight:1},'62 %')+p('de las consultas medidas mencionan la marca. '+MUESTRA+'.',24,C.ink,400,{marginTop:16,lineHeight:1.4}))};};
S.in_deckClose=()=>{const W=1920,H=1080;return {W,H,bg:OR.navy,html:orbit({W,H,cx:1380,cy:540,r:380,a0:-90,a1:269.5,k:W/794,haloOp:.12,dot:false})+abs(1380-18,160-18,36,36,{borderRadius:'50%',background:OR.teal})+
 abs(140,420,1000,null,{},q('¿Qué sigue?',40,OR.ink,{ringColor:OR.teal}))+abs(140,495,1100,null,{},dom('Decidir juntos',140,C.white,{sphereColor:OR.teal}))+`<img src="${LOCK.dark}" alt="Efeonce · Empower your Growth" style="position: absolute; left: 140px; top: 880px; width: 380px; height: ${+(380*LOCK.rd).toFixed(1)}px">`};};

// ---- Correo de aviso ----
S.in_email=()=>{const W=640,H=900;return {W,H,bg:'#EEF1F0',html:abs(40,40,560,820,{background:C.white,borderRadius:8,overflow:'hidden'},
 abs(0,0,560,250,{background:OR.navy,overflow:'hidden'},orbit({W:560,H:250,cx:480,cy:66,r:46,a0:200,a1:250,k:1.6,haloOp:.14})+logoNeg(40,36,96)+abs(40,128,400,null,{},q('¿Qué cambió en agosto?',17,OR.ink,{ringColor:OR.teal}))+abs(40,160,480,null,{},dom('Tu informe está listo',36,C.white,{sphereColor:OR.teal})))+
 abs(40,290,480,null,{},p('Hola, [Nombre]:',15,C.ink,500)+p('El informe de Insights de agosto ya está disponible. En diez minutos verás qué cambió, qué lo explica y qué proponemos para septiembre.',14,C.ink,400,{marginTop:12,lineHeight:1.6}))+
 abs(40,470,220,50,{background:C.navy,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'},p('Ver el informe',15,C.white,600))+
 abs(40,560,480,1,{background:C.line})+abs(40,590,480,null,{},p('Recibes este correo porque tu equipo tiene Insights activo. [Enlace de preferencias]',11.5,C.muted,400,{lineHeight:1.5}))+
 `<img src="${LOCK.light}" alt="Efeonce · Empower your Growth" style="position: absolute; left: 40px; top: 700px; width: 200px; height: ${+(200*LOCK.r).toFixed(1)}px">`)};};

const hoyP=(x,y,w,h,src,l)=>lab(x,y,l)+photo(x,y,w,h,src,l);
boards['P-01-insights-informe.dc.html']=board('7.1 · Insights: informe (1/2)',
 head('7.1 · Pruebas en producto · Efeonce Insights (1 de 2)','El informe, contado con la línea.','Portada, apertura de capítulo, resumen y figura del informe mensual A4. Prueba en el canvas: el producto no cambia hasta decidirlo. Las cifras son de muestra.')+
 place(64,300,'Portada · pregunta y respuesta',S.in_cover,.44)+place(436,300,'Capítulo · el arco mide la navegación (2 de 5)',S.in_chapter,.44)+place(808,300,'Resumen · tres respuestas y un dato',S.in_summary,.44)+place(1180,300,'Figura · el último punto es la esfera',S.in_trend,.44)+
 col(64,850,1472,300,'Qué cambia en el informe',list(['Títulos como respuesta: pregunta en Poppins Light con anillo y respuesta en Bricolage con su esfera; hoy son títulos Poppins sin voz.','El arco de avance aparece sólo donde mide algo real: la navegación del informe o el dato de la página (62 % → 62 % del círculo).','En las figuras, el último punto de la serie es la esfera con su halo: la mirada termina donde está la respuesta.','La caja de lectura navy se vuelve una nota en papel con borde teal oscuro y la misma voz; el navy queda para portadas y capítulos.','Todo lo demás se conserva: grilla A4, pie con la burbuja oficial, fuentes y reglas de contraste del estándar de informes.'],13.5)),1600,1200);
boards['P-02-insights-plan-deck.dc.html']=board('7.2 · Insights: plan, cierre, deck y correo (2/2)',
 head('7.2 · Pruebas en producto · Efeonce Insights (2 de 2)','Del plan al cierre, y del informe al deck.','Plan con la gramática abierto/decidido, contraportada con la órbita completa, deck 16:9 y el correo que avisa que el informe está listo. Cifras de muestra.')+
 place(64,300,'Plan · anillo abierto, esfera decidida',S.in_plan,.44)+place(436,300,'Contraportada · la órbita se completa',S.in_back,.44)+place(808,300,'Correo de aviso',S.in_email,.58)+
 place(64,850,'Deck · portada',S.in_deckCover,.24)+place(552,850,'Deck · figura',S.in_deckFigure,.24)+place(1040,850,'Deck · cierre',S.in_deckClose,.24)+
 abs(1200,300,336,null,{},col(0,0,336,500,'Reglas para Insights',list(['El plan marca el estado con la forma: esfera = decidido, anillo = abierto. Acompaña al texto del estado, no lo reemplaza.','La contraportada y la última lámina completan la órbita con la esfera arriba; el logo va fuera de la órbita.','El correo usa la misma voz: pregunta del mes y respuesta «Tu informe está listo».','En el deck, la órbita chica de la esquina es la navegación (3 de 5).'],13)))+
 abs(64,1150,900,null,{},cap('Hoy en producción · plantillas del gate visual, sin datos',C.navy,12))+hoyP(64,1200,200,283,INS.hoy.cover,'Portada')+hoyP(284,1200,200,283,INS.hoy.chapter,'Capítulo')+hoyP(504,1200,200,283,INS.hoy.trend,'Figura')+hoyP(724,1200,200,283,INS.hoy.plan,'Plan')+
 col(964,1200,572,283,'Lectura',p('La portada de hoy ya lleva la órbita; la prueba extiende la misma forma a la voz, al avance, a las figuras y al plan, sin cambiar la grilla ni el pie. Si se aprueba, el cambio vive en las plantillas del catálogo de Insights y pasa por su gate visual.',14,C.ink,400,{lineHeight:1.55})),1600,1540);
const CAP=[
 ['1','La esfera','¿Qué se reconoce de Efeonce aunque no esté el logo?',[['1.1','El punto final'],['1.2','La órbita'],['1.3','La lente'],['1.4','El foco']]],
 ['2','La voz y el oficio','¿Cómo habla y cómo muestra su trabajo?',[['2.1','Voz: pregunta y respuesta'],['2.2','Eslogan'],['2.3','Oficio a la vista']]],
 ['3','La familia','¿Cómo conviven Efeonce, Globe, Wave y Reach?',[['3.1','Un lenguaje, cuatro acentos'],['3.2','La órbita en la familia'],['3.3','Logo completo o isotipo']]],
 ['4','En uso','¿Cómo se ve en el día a día?',[['4.1','Aplicaciones'],['4.2','Deck y campaña'],['4.3','Oficina: llegar, trabajar, convivir'],['4.4','Objetos y video'],['4.5','Firma de mail'],['4.6','Merch: llevar, vestir, identificarse'],['4.7','Bienvenida, papelería y eventos'],['4.8','Merch en foto'],['4.9','Oficina en foto']]],
 ['5','Producción','¿Cómo se hace bien?',[['5.1','Grillas y especificaciones'],['5.2','Fotografía para la lente'],['5.3','Logo: uso correcto'],['5.4','Logo: usos incorrectos'],['5.5','Isotipo: correcto, incorrecto y tamaño'],['5.6','Elementos: sí y no']]],
 ['6','Decisiones y validación','¿Qué está decidido y cómo lo medimos?',[['6.1','Decisiones tomadas'],['6.2','Prueba sin logo']]],
 ['7','Pruebas en producto','¿Cómo se ve en Efeonce Insights?',[['7.1','Informe'],['7.2','Plan, cierre, deck y correo']]]];
const capCard=([n,t,qq,items])=>div({background:C.white,border:`1px solid ${C.line}`,padding:'24px 28px',display:'flex',flexDirection:'column',gap:10},
 div({display:'flex',alignItems:'baseline',gap:14},div(W8(44,C.navy,300),n)+div(W8(28,C.navy,760),t))+q(qq,16,C.ink)+
 items.map(([c,l])=>div({display:'flex',gap:12},p(c,14,C.navy,600,{width:34,flexShrink:0})+p(l,14,C.ink))).join(''));
boards['00-indice.dc.html']=board('0.1 · Empieza aquí',
 head('0.1 · Empieza aquí','Una esfera que recorre su órbita.','Esta es la línea gráfica de Efeonce en siete capítulos. Cada uno responde una pregunta y se lee de izquierda a derecha. Lo descartado ya no está en el canvas: queda en el repo como historia. Si tienes un minuto, lee primero 0.2, el manual en una lámina.')+
 abs(64,270,1472,null,{display:'grid',gridTemplateColumns:'repeat(3, minmax(0, 1fr))',gap:18},CAP.map(capCard).join(''))+
 abs(64,1320,1472,null,{},p('<b style="font-weight: 600">Estado (25-09-2026):</b> dirección aprobada. Para cerrar faltan tres decisiones (fotos, panel de la prueba y firma A o B) y, después, el ADR. El capítulo 7 prueba la línea en Efeonce Insights sin tocar el producto.',14,C.ink)),1600,1400);
const RENUM={'R2-02-esfera.dc.html':['A2 · La esfera','1.1 · El punto final'],'O-01-orbita.dc.html':null,'A3-2-lente.dc.html':['A3·2 · La ventana con punch','1.3 · La lente'],'A3-2b-foco.dc.html':['A3·2+ · El foco','1.4 · El foco'],
 'R2-04-conversacion.dc.html':['A5 · Voz','2.1 · Voz'],'R3-05-eslogan.dc.html':['A6 · Eslogan','2.2 · Eslogan'],'R2-03-oficio.dc.html':['A4 · Oficio a la vista','2.3 · Oficio a la vista'],
 'F-01-arquitectura.dc.html':['A7 · Familia de marcas','3.1 · Familia de marcas'],'O-03-orbita-familia.dc.html':null,'F-05-firma.dc.html':['A8 · Firma','3.3 · Firma'],
 'O-02-orbita-aplicaciones.dc.html':null,'O-04-orbita-deck-campana.dc.html':null,'O-05-orbita-espacio.dc.html':null,'O-05b-oficina-trabajar.dc.html':null,'O-05c-oficina-convivir.dc.html':null,'O-11-merch-llevar.dc.html':null,'O-12-merch-vestir.dc.html':null,'O-13-merch-identificarse.dc.html':null,'O-14-bienvenida-envios.dc.html':null,'O-15-papeleria-llavero.dc.html':null,'O-16-eventos.dc.html':null,'O-06-orbita-objetos-motion.dc.html':null,'F-06b-firma-correo-v2.dc.html':null,
 'O-07-orbita-especificaciones.dc.html':null,'O-08-orbita-fotografia.dc.html':null,'O-09-orbita-decisiones.dc.html':null,'O-10-prueba-sin-logo.dc.html':null,'00b-manual.dc.html':null,'00-indice.dc.html':null};
const CODES={'O-01':'1.2','O-02':'4.1','O-03':'3.2','O-04':'4.2','O-05':'4.3','O-06':'4.4','O-07':'5.1','O-08':'5.2','O-09':'6.1','O-10':'6.2','F-06b':'4.5','F-06':'4.5','00b':'0.2','A3·2+':'1.4','(A2)':'(1.1)','(A4)':'(2.3)','(A5)':'(2.1)'};
const renum=(f,h)=>{const k=RENUM[f];if(k)h=h.split(k[0]).join(k[1]);h=h.replace('<title>A3·2 · La lente','<title>1.3 · La lente');
 h=h.replace(/\(A2\)|\(A4\)|\(A5\)/g,m=>CODES[m]).replace(/A3·2\+/g,'1.4').replace(/(^|[^\w#-])(F-06b|F-06|O-0[1-9]|O-10|00b)(?![\w])/g,(m,a,c)=>a+CODES[c]);return h;};
if(__EXP.on){const {writeFileSync:wf}=await import('node:fs');const byTitle=new Map(__EXP.boards.map(b=>[b.title,b.items]));const out={};
 for(const[f,h]of Object.entries(boards)){const t=(h.match(/<title>([^<]*)<\/title>/)||[])[1];const items=byTitle.get(t?.replace(/&amp;/g,'&'));if(items)out[f]=items;}
 wf(new URL('./export-elements.json',import.meta.url).pathname,JSON.stringify(out));console.error('export boards',Object.keys(out).length);}
for(const f of Object.keys(boards))if(f in RENUM)boards[f]=renum(f,boards[f]);

for(const[f,s]of Object.entries(boards))writeFileSync(OUT+f,s);
console.log(Object.keys(boards).join('\n'));
import('node:fs').then(({mkdirSync,writeFileSync:w})=>{const d=new URL('./estimulos/',import.meta.url).pathname;mkdirSync(d,{recursive:true});for(const e of globalThis.__ESTIMULOS)w(d+e.file,e.html);w(d+'index.json',JSON.stringify(globalThis.__ESTIMULOS.map(({file,W,H})=>({file,W,H})),null,1));});
// Exportar superficies sueltas (para usar el diseño plano como referencia exacta): SURF=id,id:arg node gen2.mjs
if(process.env.SURF){const {mkdirSync:mk,writeFileSync:wf}=await import('node:fs');const d=new URL('./surf/',import.meta.url).pathname;mk(d,{recursive:true});
 for(const spec of process.env.SURF.split(',')){const [id,arg]=spec.split(':');const fn=arg?S[id](arg):S[id];const x=fn();
  wf(d+spec.replace(':','-')+'.dc.html',page(spec,x.W,x.H,div({width:x.W,height:x.H,position:'relative',background:x.bg,overflow:'hidden'},x.html)).replace('<x-dc','<x-dc data-w="'+x.W+'" data-h="'+x.H+'"'));}}
