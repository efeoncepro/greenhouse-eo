// ================= Ronda 3 · profundización =================
// Ventana: círculo que muestra (foto, color o textura). Esfera de acento tangente, con aire, como la esfera sobre la órbita de la nave.
const window_=({cx,cy,D,src,fill,alt,accent,gapAng=-50,accentScale=.14})=>{const r=D/2,d=D*accentScale,g=D*.02,a=gapAng*Math.PI/180,sx=cx+(r+g+d/2)*Math.cos(a)-d/2,sy=cy+(r+g+d/2)*Math.sin(a)-d/2;
 const inner=src?`<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${D}px; height: ${D}px; object-fit: cover">`:'';
 return abs(cx-r,cy-r,D,D,{borderRadius:'50%',overflow:'hidden',background:fill??C.navy},inner)+(accent?abs(sx,sy,d,d,{borderRadius:'50%',background:accent}):'');};
// Palabra en contorno fuera de la ventana y llena dentro (recurso que el operador eligió en la ronda de Codex).
const crossWord=({txt,x,top,size,stroke,fillIn,cx,cy,D,W,H})=>{const st_={fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:1,letterSpacing:TRK+'em',whiteSpace:'nowrap'};
 return abs(x,top,null,null,{},div({...st_,color:'transparent',WebkitTextStroke:`${Math.max(2,size*.008)}px ${stroke}`},txt))+
  abs(0,0,W,H,{clipPath:`circle(${D/2}px at ${cx}px ${cy}px)`},abs(x,top,null,null,{},div({...st_,color:fillIn},txt)));};
S.winWall=()=>{const W=1920,H=1080,fl=H-110,cx=1300,cy=470,D=780;return {W,H,bg:C.wall,html:abs(0,fl,W,110,{background:C.floor})+window_({cx,cy,D,src:IMG.studio,alt:'Estudio visto a través de la ventana',accent:C.tealDark})+crossWord({txt:'Hacer',x:180,top:300,size:400,stroke:C.navy,fillIn:C.white,cx,cy,D,W,H})};};
S.winCover=()=>{const W=1920,H=1080,cx=1480,cy=620,D=1040,c=convo({x:140,top:330,qs:38,ds:150,ink:C.white,sub:C.soft,Q:'¿Qué cambió este trimestre?',A:'Lo que medimos',maxW:900});
 return {W,H,bg:C.navy,html:window_({cx,cy,D,src:IMG.conv,alt:'Dos personas revisan una pantalla',accent:C.teal,gapAng:-135})+c.html};};
S.winPost=(b)=>()=>{const W=1080,H=1350,cx=540,cy=640,D=820;return {W,H,bg:C.paper,html:window_({cx,cy,D,src:IMG.edit,alt:'Estación de edición vista a través de la ventana',accent:b.onLight})+lkImg(b,false,W/2-130,H-90-260*LK[b.k].r,260)};};
S.winTote=()=>{const W=800,H=900,cx=470,cy=470,D=520;return {W,H,bg:'#EDE8DF',html:window_({cx,cy,D,fill:C.navy,accent:C.tealDark,gapAng:-45})+crossWord({txt:'Hacer',x:70,top:390,size:190,stroke:C.navy,fillIn:C.white,cx,cy,D,W,H})};};
boards['R3-01-ventana.dc.html']=board('Ronda 3 · la ventana',
 head('Ronda 3 · recurso protagonista','La ventana.','Un círculo que muestra: foto, color o textura. Es la esfera a escala de muro, con una esfera chica de acento que la toca con aire, como la esfera sobre la órbita de la nave. Da el momento visual donde no hay copy y retoma el recurso que te gustó: letras en contorno que se llenan al entrar al círculo.')+
 place(64,270,'Muro de recepción · palabra en contorno que se llena dentro de la ventana',S.winWall,.37)+place(820,270,'Portada de deck · ventana que sangra',S.winCover,.37)+
 place(64,730,'Post sin copy · Efeonce',S.winPost(FAM[0]),.3)+place(408,730,'Post sin copy · Globe',S.winPost(FAM[1]),.3)+place(752,730,'Bolso · ventana de color',S.winTote,.38)+
 col(1100,730,436,420,'Reglas de la ventana',list(['Siempre un círculo perfecto; una sola ventana por pieza.','Puede sangrar por un borde o quedar entera; nunca se deforma ni se repite como patrón.','Esfera de acento: 0,14 × el diámetro, separada por un aire de 0,02 ×, en el color de la marca.','Palabra que la cruza: contorno afuera, llena adentro. Sólo una palabra, del banco de voz.','En productos, la ventana y su esfera toman el acento del producto; la firma es su logo.'],13.5)),1600,1180);

// Hilo Efeonce: A (actual) vs B (anillo siempre teal).
const famPostB=b=>()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:170,ink:C.white,sub:C.soft,Q:b.Q,A:b.A,R:b.R,maxW:880,sph:b.onDark,ringC:C.teal});
 return {W,H,bg:b.dark,html:crop(60,60,W-120,H-120,'rgba(207,228,250,0.45)',40,10)+c.html+lkImg(b,true,96,H-110-300*LK[b.k].r,300)};};
boards['R3-02-hilo.dc.html']=board('Ronda 3 · hilo Efeonce',
 head('Ronda 3 · hilo de familia','Efeonce pregunta; cada producto responde.','Prototipo de la opción B: el anillo de la pregunta es siempre teal, en todas las marcas, y la esfera de la respuesta toma el color del producto. Así cada pieza de producto conserva una señal de Efeonce sin sumar logos.')+
 abs(64,250,70,30,{},cap('A · actual',C.muted,12))+FAM.slice(1).map((b,i)=>place(170+i*300,280,`${b.name} · A`,famPost(b),.25)).join('')+
 abs(64,650,70,30,{},cap('B · hilo',C.teal,12))+FAM.slice(1).map((b,i)=>place(170+i*300,680,`${b.name} · B`,famPostB(b),.25)).join('')+
 col(1100,280,436,760,'Lectura',list(['A: cada producto es coherente consigo mismo, pero sin logo no hay nada que diga Efeonce.','B: el anillo teal es la voz de Efeonce (el método que pregunta); la esfera es la respuesta del producto. La familia se lee en todas las piezas.','Costo de B: rompe la regla «un acento por pieza» con un segundo color chico y fijo. Contraste: teal sobre tinta 6,0:1; teal oscuro sobre papel 3,9:1.','Cursores AXIS en piezas de producto: fijar sus colores (participantColors) para que no repitan el acento del producto; por ejemplo, violeta y lima en Globe y Reach, violeta y naranja en Wave.'],13.5)+
  p('Recomendación: B, sujeta a la prueba sin logo (R3-04). Si B no mejora la atribución a Efeonce frente a A, se queda A.',13.5,C.ink,600,{marginTop:8})),1600,1080);

// Pasada de copy
{const rows=[['¿Otra vuelta?','Vamos','¿Y si después lo hago yo?','Esa es la idea','Era simpática pero vacía. La nueva prueba el Why: te dejamos más capaz, no dependiente.'],
 ['¿Lo enseñamos?','Claro','¿Y el reporte del viernes?','Ya lo viste','La pregunta la hacía Efeonce, no el cliente. La nueva nace de un dolor real y responde con transparencia en vivo.'],
 ['¿Lo hacemos juntos?','Así se hace','¿Otra agencia más?','No. Un sistema','Cliché de co-creación sin mecanismo. La nueva usa el contraste «no es X, es Y».'],
 ['—','—','¿Cuánto rindió?','Te mostramos todo','Nueva: rompe el pacto de las vanity metrics (creencia 3).'],
 ['¿Te están encontrando?','Veámoslo','¿Apareces cuando preguntan por tu categoría?','Veamos el dato','Wave: «Veámoslo» era evasivo. La nueva nombra el problema de AEO y promete prueba, no resultado.'],
 ['¿A quién le llega?','Lo medimos','¿A quién le llega tu pauta?','Te lo mostramos','Reach: «Lo medimos» repetía el par de Efeonce. La nueva pone el foco en la evidencia compartida.']];
 const cell=(Q,A,dim)=>Q==='—'?p('—',14,C.muted):div({},q(Q,12,dim?C.muted:C.ink)+div({marginTop:4},dom(A,24,dim?'#8A96A3':C.navy,dim?{sphereColor:'#B9C3CC'}:{})));
 boards['R3-03-copy.dc.html']=board('Ronda 3 · copy',
  head('Ronda 3 · pasada de copy','Preguntas que el cliente hace de verdad.','Criterios de la voz Efeonce: la pregunta nace de un dolor real del cliente, la respuesta tiene una o tres palabras y viene con prueba o mecanismo. Nada de chistes, superlativos ni frases de taza.')+
  abs(64,260,1472,null,{display:'grid',gridTemplateColumns:'300px 360px 1fr',columnGap:32,rowGap:18,alignItems:'start'},
   cap('Antes',C.muted,10.5)+cap('Ahora',C.teal,10.5)+cap('Por qué',C.muted,10.5)+
   rows.map(([qa,aa,qn,an,why])=>cell(qa,aa,true)+cell(qn,an,false)+p(why,13.5,C.ink)).join(''))+
  col(64,880,700,200,'Se mantienen',p('«¿Lo medimos? / Siempre», «¿Quién decide? / Tú, con evidencia», «¿Cómo va? / En vivo», «¿Dónde quedó lo aprendido? / En tu historial», «¿Y si lo probamos? / Hoy», «¿Cuál sale al aire? / Esta» (Globe).',13.5,C.ink))+
  col(800,880,736,200,'Verbos por marca',p('Hacer (Efeonce), Crear (Globe), Aparecer (Wave), Llegar (Reach): cada uno nombra lo que la marca hace por el cliente. Alternativa para Efeonce: «Crecer», más cerca del Why; «Hacer» queda porque ya probó que funciona en la taza.',13.5,C.ink)),1600,1100);}

// Kit de prueba sin logo (no ejecutada)
S.distPost=()=>{const W=1080,H=1350;return {W,H,bg:'#1E2A38',html:abs(96,380,880,null,{},p('¿Quién escribe el próximo brief?',38,'#C8CED6',400))+abs(96,450,880,null,{},p('Los dos.',150,C.white,700,{lineHeight:1,letterSpacing:'-0.02em'}))+abs(96,640,880,null,{},p('Tu equipo y el nuestro, en la misma pantalla.',38,'#C8CED6'))};};
S.distSlide=()=>{const W=1920,H=1080;return {W,H,bg:C.white,html:abs(140,300,1400,null,{},p('Ciclo 07 · Resultados',40,'#55606B'))+abs(140,380,1600,null,{},p('Lo que cambió.',170,'#1E2A38',700,{lineHeight:1,letterSpacing:'-0.02em'}))};};
S.testPost=()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:150,ink:C.white,sub:C.soft,Q:'¿Quién escribe el próximo brief?',A:'Los dos',R:'Tu equipo y el nuestro, en la misma pantalla.',maxW:880});return {W,H,bg:C.navy,html:c.html};};
S.testSlide=()=>{const W=1920,H=1080,c=convo({x:140,top:300,qs:40,ds:170,ink:C.navy,sub:C.ink,Q:'¿Qué cambió en el ciclo 07?',A:'Lo que cambió',maxW:1500});return {W,H,bg:C.white,html:guideV(140,H,C.guideLight)+c.html};};
boards['R3-04-prueba.dc.html']=board('Ronda 3 · kit de prueba',
 head('Ronda 3 · kit de prueba sin logo','Listo para correr; todavía no se corrió.','Diseño entre sujetos: cada persona ve piezas de una sola versión. La versión de prueba lleva la línea; el distractor tiene el mismo copy y la misma composición sin esfera, anillo ni oficio. La diferencia de atribución entre ambas mide lo que aporta la línea.')+
 lab(64,290,'Estímulo · versión de prueba')+abs(64,290,null,null,{display:'flex',gap:16,alignItems:'flex-end'},tileOf(S.testPost,.22)+tileOf(S.testSlide,.2))+
 lab(760,290,'Estímulo · distractor')+abs(760,290,null,null,{display:'flex',gap:16,alignItems:'flex-end'},tileOf(S.distPost,.22)+tileOf(S.distSlide,.2))+
 col(64,640,700,420,'Protocolo',list(['Público: marketing y dirección comercial de empresas medianas y grandes en Chile (ICP de Efeonce).','Muestra: 150 personas por versión (300 en total), reclutadas por panel; sin exposición previa controlada.','Estímulos: 8 piezas por versión (post, story, slide, muro, taza, cuaderno, credencial, LinkedIn), en orden aleatorio, 5 segundos cada una.','Momento: antes de lanzar la línea (línea base) y a los 3 meses de uso.'],13.5))+
 col(800,640,736,420,'Preguntas y umbral',list(['1. «¿De qué empresa crees que es esta pieza?» (abierta, sin opciones).','2. «¿Cuál de estas empresas crees que la hizo?» (6 opciones: Efeonce y 5 agencias o consultoras de la categoría, más «no sé»).','3. «¿Qué recuerdas de la pieza?» (abierta; se codifica si mencionan la esfera, el anillo o la pregunta).','Éxito: la versión de prueba supera al distractor en atribución asistida por al menos 10 puntos con 95 % de confianza, y la atribución a competidores no sube.','Costo y proveedor de panel: por definir.'],13.5)),1600,1100);
