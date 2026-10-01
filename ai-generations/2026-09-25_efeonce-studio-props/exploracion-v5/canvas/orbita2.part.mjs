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
S.c_conv=()=>{const W=1080,H=1350,cx=540,cy=500,D=700,r=D/2+34,k=SOC(W);return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.conv,W,H,cx,cy,D,zoom:1.02,pos:'50% 45%',alt:'Dos personas revisan una pantalla en penumbra; dentro del círculo, a color'})+orbit({W,H,cx,cy,r,a0:195,a1:250,k,haloOp:0,rings:[[1,.28]]})+
 abs(96,1010,900,null,{},q('¿Quién escribe el próximo brief?',36,OR.ink,{ringColor:OR.teal}))+abs(96,1080,900,null,{},dom('Los dos',130,C.white,{sphereColor:OR.teal}))};};
S.c_linkedin=()=>{const W=1200,H=627,cx=860,cy=280,D=440,r=D/2+26,k=1.5;return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.studio,W,H,cx,cy,D,zoom:1.0,pos:'50% 50%',alt:'Estudio en penumbra; dentro del círculo, a color, el estratega'})+orbit({W,H,cx,cy,r,a0:195,a1:250,k,haloOp:0,rings:[[1,.28]]})+
 abs(70,330,500,null,{},q('¿Cómo va tu campaña?',26,OR.ink,{ringColor:OR.teal}))+abs(70,380,500,null,{},dom('En vivo',90,C.white,{sphereColor:OR.teal}))+abs(70,500,500,null,{},p('Entra a tu operación cuando quieras.',20,OR.sub))};};
// Oficina
S.e_sala=()=>{const W=1920,H=1080,x=140,y=90,w=1640,h=880,cx=1180,cy=470,D=560,r=D/2+34;return {W,H,bg:'#E4E6E3',html:frosted({src:IMG.conv,x,y,w,h,cx,cy,D,alt:'Sala de reuniones tras vidrio esmerilado; se ve nítida sólo a través del círculo'})+
 orbit({W,H,cx,cy,r,a0:195,a1:250,k:2.2,accent:C.tealDark,halo:C.navy,rings:[[1,.35]],haloOp:0,arcW:2})+abs(x,y,w,h,{border:'14px solid #9AA4AC',boxSizing:'border-box'})+
 abs(x+120,y+110,null,null,{},div(W8(170,C.navy,300),'Sala 02'))+abs(x+128,y+330,560,null,{},p('En sesión hasta las 16:00',34,C.navy,500))+abs(0,970,W,110,{background:'#C9CDC9'})};};
S.e_pasillo=()=>{const W=1920,H=1080,cx=1080,cy=470,D=560,r=D/2+40;return {W,H,bg:OR.navy,html:lensPhoto({src:IMG.edit,W,H:970,cx,cy,D,zoom:1.25,pos:'50% 42%',alt:'Muro de pasillo: estación de edición en navy con el frasco a color dentro del círculo'})+orbit({W,H,cx,cy,r,a0:195,a1:250,k:2.2,haloOp:0,rings:[[1,.28]]})+
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
