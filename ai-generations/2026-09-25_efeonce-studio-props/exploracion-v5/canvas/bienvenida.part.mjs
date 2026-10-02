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
  divisor(90,1016,614,C.line,C.tealDark)+abs(90,1040,420,null,{},p(`${DIR}<br>+56 9 3732 3064 · efeoncepro.com`,10,C.muted,400,{lineHeight:1.6}))+abs(470,1044,234,null,{},slogan('Growth',11,{align:'right'}))};};
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
S.ev_telon=()=>{const W=1500,H=1200;return {W,H,bg:OR.navy,html:orbit({W,H,cx:1150,cy:430,r:320,a0:200,a1:250,k:W/794,haloOp:.14})+
 logoNeg(90,80,240)+abs(90,250,null,null,{},q('¿Te encuentran cuando te buscan?',44,OR.ink,{ringColor:OR.teal}))+abs(90,330,null,null,{},dom('Aquí',260,C.white,{sphereColor:OR.teal}))+abs(90,640,null,null,{},p('efeoncepro.com',30,OR.sub,500))};};
S.ev_pendon=()=>{const W=425,H=1000;return {W,H,bg:OR.navy,html:orbit({W,H,cx:212,cy:470,r:128,a0:200,a1:250,k:1.2,haloOp:.14})+logoNeg(112,70,200)+
 abs(40,390,345,null,{},q('¿Lo medimos?',24,OR.ink,{ringColor:OR.teal,textAlign:'center'}))+abs(0,436,W,null,{display:'flex',justifyContent:'center'},dom('Siempre',70,C.white,{sphereColor:OR.teal}))+
 abs(0,760,W,null,{},p('efeoncepro.com',18,OR.sub,500,{textAlign:'center'}))+abs(0,900,W,100,{background:'#00122A'},cap('Zona baja sin contenido',OR.sub,11,{textAlign:'center',paddingTop:42}))};};
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
