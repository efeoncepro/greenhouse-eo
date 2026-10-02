// ================= A3·4–A3·6 · Hacerlo contemporáneo =================
const M1={muro:'/_blob/81a03d2129752fd45f9c4b3309480be3',post:'/_blob/1e3a14dd632afa7f5fccd9b1cb88c28e'};
const PAP='#EFEBE4';
const W8=(size,color,wght,o={})=>({fontFamily:BR,fontWeight:wght,fontSize:size,lineHeight:.95,letterSpacing:(wght<500?-0.02:TRK)+'em',color,whiteSpace:'nowrap',...o});
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
S.m3_frame=(t,wght,drop,label)=>()=>{const W=1920,H=1080;const word=abs(140,380,null,null,{},div(W8(300,C.navy,wght),'Hacer'));const b=plainBounds('Hacer',300,140,380),base=380+.95*300*.87,d=60;
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
