// ================= 5.3–5.5 · Do's & Don'ts: logo correcto, logo incorrecto y elementos sí/no =================
const OK='#1E7F4F',NO='#B3261E';
const badge=(ok,x=12,y=12)=>abs(x,y,30,30,{borderRadius:'50%',background:ok?OK:NO,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontFamily:PO,fontWeight:700,fontSize:17,lineHeight:1},ok?'✓':'✕');
// Tile con fondo, contenido, marca ✓/✕ y leyenda debajo
const tile=(x,y,w,h,bg,inner,ok,title,note='')=>abs(x,y,w,h,{background:bg,outline:`1px solid ${C.line}`,overflow:'hidden'},inner+badge(ok))+
 abs(x,y+h+10,w,null,{},p(`<b style="font-weight: 600; color: ${ok?OK:NO}">${title}</b>${note?' · '+note:''}`,13,C.ink,400,{lineHeight:1.4}));
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
  tile(X[2],300,TW,TH,'#001A33',`<img src="${IMG.studio}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover; object-position: 50% 20%">`+LG(E.neg,24,150,150,R),true,'Sobre foto, en una zona calma','contraste ≥ 4,5:1 medido; nunca con velo encima')+
  abs(X[0],640,TW*2+g,TH+40,{background:C.white,outline:`1px solid ${C.line}`},resguardo+badge(true))+abs(X[0],640+TH+50,TW*2+g,null,{},p(`<b style="font-weight: 600; color: ${OK}">Área de resguardo</b> · X = alto de la nave. Nada entra en ese margen: ni texto, ni bordes, ni la órbita.`,13,C.ink))+
  tile(X[2],640,TW,TH+40,C.white,minimo,true,'Tamaño mínimo','bajo eso, el isotipo')+
  tile(X[0],1060,TW,TH,C.paper,fam(false),true,'Familia a color','cada marca con su archivo')+
  tile(X[1],1060,TW,TH,C.ink2,fam(true),true,'Familia en negativo','productos sobre #091951')+
  tile(X[2],1060,TW,TH,C.paper,`<img src="${LOCK.light}" alt="" style="position: absolute; left: 40px; top: ${(TH-380*LOCK.r)/2}px; width: 380px; height: ${+(380*LOCK.r).toFixed(1)}px">`,true,'Logo con eslogan','sólo el bloque oficial, en cierres')+
  col(64,1420,1472,260,'Cómo elegir',list(['¿Hay espacio para el logo completo a 96 px o más? Logo completo. Si no, isotipo (avatar, favicon, pin, credencial).','¿El fondo es navy u oscuro? Negativo oficial. ¿Blanco o papel? A color. ¿Foto? Busca la zona calma o cambia la foto; no se oscurece encima.','En objetos, el logo va en el dorso, solo; adelante va la palabra con su punto.','Los archivos viven en src/assets y en OneDrive (13- Branding/SVG). Nunca se redibujan ni se exportan desde una captura.'],13.5)),1600,1720);}

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
  ['Sobre una foto cargada','el logo compite con la escena',C.dark,`<img src="${IMG.conv}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover">`+LG(E.neg,lx,ly,lw,R)],
  ['Órbita alrededor del logo','la órbita rodea palabras, nunca el logo',C.dark,orbit({W:TW,H:TH,cx:TW/2,cy:TH/2,r:92,a0:200,a1:250,k:1.3,haloOp:.14})+LG(E.neg,lx+20,ly+5,lw-40,R)],
  ['Agregarle la esfera o un punto','la esfera es de la palabra, no del logo',C.white,LG(E.full,lx-10,ly,lw,R)+abs(lx+lw-4,ly+lh-16,14,14,{borderRadius:'50%',background:C.tealDark})],
  ['Escribirlo con una fuente','se usa el archivo, no se tipea',C.white,abs(0,ly-8,TW,null,{},div({fontFamily:PO,fontWeight:800,fontStyle:'italic',fontSize:46,color:C.navy,textAlign:'center',letterSpacing:'-0.02em'},'efeonce'))],
  ['Logo e isotipo juntos','uno u otro en cada vista',C.white,`<img src="${FAM[0].iso[0]}" alt="" style="position: absolute; left: ${lx-30}px; top: ${ly-8}px; width: 60px; height: 60px; object-fit: contain">`+LG(E.full,lx+40,ly,lw-40,R)],
  ['Dentro de una frase','«Somos efeonce y…»: el logo no reemplaza una palabra',C.white,abs(24,ly-6,TW-48,null,{display:'flex',alignItems:'center',gap:10,justifyContent:'center'},p('Somos',22,C.navy,500,{whiteSpace:'nowrap'})+`<img src="${E.full}" alt="" style="width: 96px; height: ${+(96*R).toFixed(1)}px">`+p('y medimos.',22,C.navy,500,{whiteSpace:'nowrap'}))],
 ];
 const X=(i)=>abs(0,0,TW,TH,{},svgW(TW,TH,`<line x1="0" y1="${TH}" x2="${TW}" y2="0" stroke="${NO}" stroke-opacity=".35" stroke-width="2"/>`));
 boards['D-02-logo-incorrecto.dc.html']=board('5.4 · Logo: usos incorrectos',
  head('5.4 · Logo · Usos incorrectos','Doce cosas que nunca se le hacen al logo.','Todas tienen la misma causa: tratar el logo como una imagen editable. El logo es un archivo cerrado; lo que cambia es dónde y sobre qué se pone.')+
  bad.map(([t,n,bg,inner],i)=>tile(col_(i),row(i),TW,TH,bg,inner+X(i),false,t,n)).join('')+
  col(64,1180,1472,200,'Si ninguna versión funciona',list(['Cambia el fondo o la foto, no el logo.','Si el espacio es muy chico, usa el isotipo; si es muy grande, deja más aire, no lo estires.','¿Falta una versión (por ejemplo, un negativo todo blanco de Wave)? Se pide a diseño; no se arma en la pieza.'],13.5)),1600,1420);}

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
   '#001A33',`<img src="${IMG.studio}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover; object-position: 50% 30%">`,'Oficio real, luz con carácter',
   '#001A33',`<img src="${IMG.studio}" alt="" style="position: absolute; left: 0; top: 0; width: ${TW}px; height: ${TH}px; object-fit: cover; object-position: 50% 30%; filter: grayscale(1)">`+abs(0,0,TW,TH,{background:'rgba(0,26,51,0.65)'})+abs(40,100,null,null,{},div(W8(56,C.white,760),'Hacer')),'Velo navy encima o foto de banco'],
 ];
 const mk=(rows,code,title,lede,file,tt)=>{boards[file]=board(`${code} · ${tt}`,head(`${code} · Elementos · Sí y no`,title,lede)+rows.map((r,i)=>rowEl(300+i*340,...r)).join(''),1600,300+rows.length*340+60);};
 mk(rows1,'5.6','Cada elemento tiene un trabajo; fuera de él, sobra.','Esfera, órbita, voz y color: lo correcto a la izquierda, lo que se evita a la derecha.','D-03-elementos-si-no.dc.html','Elementos: sí y no (1/2)');
 mk(rows2,'5.6','Lo que dice y cómo se ve, sin inventos.','Tipografía, eslogan, objetos y fotografía.','D-04-elementos-si-no-2.dc.html','Elementos: sí y no (2/2)');}
