// ================= v4 (2026-09-25): tazas decididas, firma de mail v2, prueba sin logo lista para campo =================
const OB2={navyPalabra:'/_blob/e541cf052faf7dd9827d0f1d1ae1aec0',globePalabra:'/_blob/9e62b5034654cf6f6d50763259938b93',tazaDist:'/_blob/781d2cd440b2ad85e1297eb83ff5f947'};
const tag=(x,y,t,ok)=>abs(x,y,null,null,{padding:'4px 10px',borderRadius:14,background:ok?'#E3F4F2':'#F6E4E1',color:ok?'#0B6B63':'#9A2A12',fontFamily:PO,fontSize:12,fontWeight:600},t);
boards['O-06-orbita-objetos-motion.dc.html']=board('O-06 · Órbita: objetos y movimiento',
 head('O-06 · Objetos y movimiento','En la taza, la órbita acompaña a la palabra; nunca al logo.','Decisión del operador (25-09-2026): la taza blanca con «Hacer.» y su punto es la favorita; la órbita alrededor de la palabra en Bricolage también funciona; la órbita alrededor del logo no. Renders 3D sobre el mismo modelo de taza.')+
 lab(64,300,'Favorita · blanca con punto final')+photo(64,300,340,340,FAM[0].mug[0],'Taza blanca con «Hacer.» y punto teal')+tag(80,600,'Se usa',true)+
 lab(424,300,'Blanca · órbita con la palabra')+photo(424,300,340,340,OB.mugBlanca,'Taza blanca con «Hacer.» dentro de una órbita fina')+tag(440,600,'Se usa',true)+
 lab(784,300,'Navy · órbita con la palabra')+photo(784,300,340,340,OB2.navyPalabra,'Taza navy con «Hacer.» en blanco dentro de una órbita teal')+tag(800,600,'Se usa',true)+
 lab(1144,300,'Globe · órbita con la palabra')+photo(1144,300,340,340,OB2.globePalabra,'Taza Globe en tinta con «Crear.» dentro de una órbita naranja')+tag(1160,600,'Se usa',true)+
 lab(64,700,'Órbita con el logo')+photo(64,700,340,340,OB.mugNavy,'Taza navy con la órbita alrededor del logo')+tag(80,1000,'Descartada',false)+
 col(424,700,1112,340,'Regla de objetos',list(['La cara frontal lleva la palabra en Bricolage con su punto; la órbita es opcional y siempre alrededor de la palabra.','El logo va en el reverso, chico y abajo, sin órbita.','En cerámica no hay halo: anillo 0,5 mm, arco 1,2 mm, esfera Ø 4,4 mm; órbita Ø 74 mm.','El interior toma el acento de la marca.'],13.5))+
 lab(64,1100,'Cierre de marca 16:9 · 4,5 s')+video(64,1100,800,450,OB.vid169,OB.fin169,'Animación: aparece el anillo, crece el arco, la esfera llega, sube el halo y aparecen el logo y el eslogan')+
 lab(900,1100,'Cierre 1:1 · redes')+video(900,1100,450,450,OB.vid11,OB.fin11,'La misma animación en formato cuadrado')+
 col(1380,1100,156,450,'Guion',list(['0–0,5 s anillo','0,4–1,4 s arco','1,4–1,7 s la esfera asienta','1,2–2,0 s halo','1,9–2,5 s logo','2,5–3,0 s eslogan'],12)),1600,1620);
// Firma de mail v2
const {firmaV2:FIRMA2}=await import('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-09-25_efeonce-studio-props/exploracion-v5/firma/firma.mjs');
const FB2={...FBLOB,'foto-orbita-julio-reyes':'/_blob/34c7881fe2f7f10d4c725f66ec13f478','foto-orbita-oscura-julio-reyes':'/_blob/8a7a16320f9eb417f05e79f7e8521d3c','logo-efeonce-negativo':'/_blob/cc13e3a6067a76265716de61bfc23cd4'};
const fp2=(id,e)=>FIRMA2(FPERS.find(p=>p.id===id),n=>FB2[n],e);
const pane2=(x,y,w,h,id,e,scale=1)=>abs(x,y,w,h,{background:C.white,border:`1px solid ${C.line}`,boxSizing:'border-box',overflow:'hidden'},div({position:'absolute',left:28,top:24,width:(w-56)/scale,transform:`scale(${scale})`,transformOrigin:'0 0'},`<p style="font:14px Arial, Helvetica, sans-serif;color:#222;margin:0 0 20px">Quedo atento.</p>`+fp2(id,e)));
boards['F-06b-firma-correo-v2.dc.html']=board('F-06b · Firma de correo v2',
 head('F-06b · Firma de correo, v2','Más marca: la órbita llega a la firma.','La v1 quedó demasiado simple. Dos opciones con la órbita alrededor de la foto (con el anillo y el arco ya no se lee como estado «disponible»). Siguen siendo HTML con texto vivo y dos imágenes como máximo.')+
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
 lab(1336,1080,'R7 · taza')+photo(1336,1080,96,96,FAM[0].mug[0],'Taza con «Hacer.» y punto teal')+photo(1440,1080,96,96,OB2.tazaDist,'Taza distractora con «Hacer» en gris sin punto')+
 col(64,1330,1472,260,'Diseño y umbral',list(['600 personas (300 por versión): decisores de marketing y comercial en Chile, empresas de 50+ personas, sin agencias. Con 150 por versión sólo se detectan ~15 puntos.','Métrica: % que elige «Efeonce» entre Efeonce, 5 competidores reales y «No sé». Éxito: +10 puntos sobre el distractor, p < 0,05.','Kit en exploracion-v5/prueba-sin-logo/: PROTOCOLO.md, CUESTIONARIO.md, 24 estímulos, potencia.mjs y analisis.mjs (probado con datos sintéticos).','Riesgo conocido: el emblema bordado aparece en R4–R6 en ambas versiones; se reemplaza con el banco de fotos O-08.','Falta: elegir el panel (Netquest, Cint o Toluna, a cotizar) y producir 4 piezas de relleno de marcas ficticias.'],13)),1600,1660);
