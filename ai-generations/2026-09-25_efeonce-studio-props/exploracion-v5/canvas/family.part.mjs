// ================= Familia de marcas =================
const LK={efeonce:{full:'/_blob/d4fb42de8b158fe19d1649d2ededcc8c',neg:'/_blob/88b2200767ec5e47d13d9d416ad8e509',r:282/1200},globe:{full:'/_blob/a241996c8b86978d3bbecdea29c62413',neg:'/_blob/f001de31e1e9bff1d68e7d8fd538c949',r:591/1200},wave:{full:'/_blob/a9c050e2937a59cb66c66d1dec764cee',neg:'/_blob/068576fe4441d3dfbf3eee12b93dbbc0',r:494/1200},reach:{full:'/_blob/7b5e6f52f836987c1d7604867610402b',neg:'/_blob/691ae2ad1659c7cddcebf698c68d0a90',r:375/1200}};
const FAM=[
 {k:'efeonce',name:'Efeonce',role:'Marca principal',dark:C.navy,ink:C.navy,onDark:C.teal,onLight:C.tealDark,crD:'4,1',crL:'3,9',verb:'Hacer',Q:'¿Lo medimos?',A:'Siempre',R:'Tu operación, a la vista.',mug:['/_blob/7ed3f0528a67df69d2df9fa5c704de53','/_blob/a2b458005f7c582b3f35a901476f9f8f']},
 {k:'globe',name:'Globe',role:'Creative Studio',dark:C.ink2,ink:C.ink2,onDark:'#FF6500',onLight:'#BB1954',crD:'5,6',crL:'5,8',verb:'Crear',Q:'¿Cuál sale al aire?',A:'Esta',R:'Del brief a la pieza aprobada.',mug:['/_blob/1c8e4b402e80bdd3901aafcc6868a293','/_blob/777df3d8bea50ac5e55d3e03f8343a91']},
 {k:'wave',name:'Wave',role:'Búsqueda, web y medición',dark:C.ink2,ink:C.ink2,onDark:'#0375DB',onLight:'#0375DB',crD:'3,6',crL:'4,3',verb:'Aparecer',Q:'¿Te están encontrando?',A:'Veámoslo',R:'En buscadores y en respuestas de IA.',mug:['/_blob/29e01bac0440a743cfb2ffa98613c589','/_blob/ec8eb277e4632d355c3683b60afa6b32']},
 {k:'reach',name:'Reach',role:'Medios y distribución',dark:C.ink2,ink:C.ink2,onDark:'#F83902',onLight:'#F83902',crD:'4,4',crL:'3,5',verb:'Llegar',Q:'¿A quién le llega?',A:'Lo medimos',R:'Medios con alcance medido.',mug:['/_blob/6c950d3b77da11e1665cdc88a5355e5c','/_blob/3d98bccbd0cf557b328c97445d60bdda']},
];
const lkImg=(b,neg,x,y,w)=>`<img src="${neg?LK[b.k].neg:LK[b.k].full}" alt="Logo ${b.name}" style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${+(w*LK[b.k].r).toFixed(1)}px">`;
const famPost=b=>()=>{const W=1080,H=1350,c=convo({x:96,top:380,qs:38,ds:170,ink:C.white,sub:C.soft,Q:b.Q,A:b.A,R:b.R,maxW:880,sph:b.onDark});
 return {W,H,bg:b.dark,html:crop(60,60,W-120,H-120,'rgba(207,228,250,0.45)',40,10)+c.html+lkImg(b,true,96,H-110-300*LK[b.k].r,300)};};
const famSlide=b=>()=>{const W=1920,H=1080,c=convo({x:140,top:300,qs:40,ds:180,ink:b.ink,sub:C.ink,Q:b.Q,A:b.A,R:b.R,maxW:1400,sph:b.onLight});
 return {W,H,bg:C.paper,html:guideV(140,H,C.guideLight)+c.html+lkImg(b,false,W-140-340,H-110-340*LK[b.k].r,340)};};
// F-01 · Arquitectura
boards['F-01-arquitectura.dc.html']=board('Familia · arquitectura',
 head('Familia de marcas','Un lenguaje, cuatro acentos.','Efeonce es la marca principal; Globe, Wave y Reach son marcas de producto. Todas hablan con la esfera, el oficio y la conversación. Cambia sólo el acento: cada marca tiene su color de esfera y el teal es sólo de Efeonce.')+
 abs(64,250,1472,450,{display:'grid',gridTemplateColumns:'repeat(4, minmax(0, 1fr))',gap:20},FAM.map(b=>div({background:C.white,border:`1px solid ${C.line}`,display:'flex',flexDirection:'column'},
  div({position:'relative',height:110,borderBottom:`1px solid ${C.line}`},lkImg(b,false,24,Math.round(55-(b.k==='efeonce'?200:180)*LK[b.k].r/2),b.k==='efeonce'?200:180))+
  div({padding:'14px 20px 0'},cap(b.role,C.muted,10.5))+
  div({position:'relative',height:120,margin:'12px 20px 0',background:b.dark},abs(20,26,null,null,{},dom(b.verb,52,C.white,{sphereColor:b.onDark})))+p(`Oscuro ${b.dark===C.navy?'navy #023C70':'tinta #091951'} · esfera ${b.onDark} · ${b.crD}:1`,11.5,C.ink,400,{margin:'6px 20px 0'})+
  div({position:'relative',height:120,margin:'12px 20px 0',background:C.paper,border:`1px solid ${C.line}`},abs(20,26,null,null,{},dom(b.verb,52,b.ink,{sphereColor:b.onLight})))+p(`Claro papel · esfera ${b.onLight} · ${b.crL}:1`,11.5,C.ink,400,{margin:'6px 20px 16px'}))).join(''))+
 col(64,740,460,240,'Igual en toda la familia',list(['La esfera y el anillo: forma, tamaño 0,20 em y comportamiento.','El oficio a la vista y los cursores de AXIS.','La voz: pregunta, respuesta y evidencia.','Bricolage + Poppins, papel como fondo claro.'],13.5))+
 col(560,740,460,240,'Cambia por marca',list(['El color de la esfera y del anillo (una tinta para oscuro y otra para claro).','El fondo oscuro: navy para Efeonce, tinta #091951 para los productos.','La firma: el logo propio de cada producto, con «by efeonce».'],13.5))+
 col(1060,740,476,240,'Por qué funciona',p('Los logos de producto ya hablan este idioma: una palabra en tinta con un solo acento de color (el globo de Globe, la W de Wave, la «a» de Reach). La esfera extiende esa gramática al resto de las piezas.',13.5,C.ink)+p('Regla: una marca, un acento por pieza. El teal nunca aparece en una pieza de producto.',13.5,C.ink,600)));
// F-02 · Misma pieza
boards['F-02-misma-pieza.dc.html']=board('Familia · misma pieza',
 head('Familia · misma pieza','Cuatro marcas, una voz.')+
 FAM.map((b,i)=>place(64+i*372,220,`${b.name} · post`,famPost(b),.32)+place(64+i*372,700,`${b.name} · slide`,famSlide(b),.18)).join('')+
 abs(64,940,1472,null,{},p('Copy de ejemplo por marca, sin aprobar. Las cuatro piezas comparten grilla, tamaños y comportamiento; sólo cambian el acento y la firma.',13,C.muted)));
// F-03 · Objetos de familia
{const mug=(x,y,src,alt)=>abs(x,y,272,272,{background:C.white,border:`1px solid ${C.line}`},`<img src="${src}" alt="${alt}" style="width: 272px; height: 272px; object-fit: contain">`);
 const cols=[...FAM.map(b=>({l:`${b.name} · «${b.verb}»`,f:b.mug[0],r:b.mug[1]})),{l:'Globe · edición de color',f:'/_blob/99c7c905c553eaf98da0198c37d271ae',r:'/_blob/df27539a87048ca833833bda86601383'}];
 boards['F-03-objetos.dc.html']=board('Familia · objetos',
  head('Familia · objetos','Cada marca con su verbo y su acento.')+
  cols.map((c,i)=>lab(64+i*296,220,c.l)+mug(64+i*296,220,c.f,`Taza ${c.l}, frente`)+mug(64+i*296,512,c.r,`Taza ${c.l}, reverso con logo`)).join('')+
  col(64,820,700,160,'Regla de objetos',list(['Efeonce en papel con esfera teal; productos en tinta #091951 con esfera e interior en su acento.','La firma va en el reverso, chica y abajo: el logo propio de cada marca.','Los verbos son candidatos: Hacer, Crear, Aparecer, Llegar.'],13.5))+
  col(800,820,736,160,'Edición de color y un aviso',list(['Cuerpo del color de la marca sólo si su logo en negativo sigue legible: Globe sí; en Reach la «a» y en Wave la W desaparecen sobre su propio color.','El negativo oficial de Wave (repo) tiene media W en #082E8E: sobre fondos oscuros esa mitad casi no se ve. Conviene revisarlo con el dueño de marca.'],13.5)));}
// F-04 · Convivencia
S.portfolio=()=>{const W=1920,H=1080;const row=(b,y,desc)=>abs(140,y,1640,120,{borderTop:`1px solid ${C.line}`},abs(0,36,34,34,{borderRadius:'50%',background:b.onLight})+lkImg(b,false,70,60-150*LK[b.k].r/2,150)+abs(420,34,1100,null,{},p(desc,30,C.ink)));
 return {W,H,bg:C.paper,html:abs(140,110,1400,null,{},cap('Efeonce · cómo trabajamos',C.muted,22))+abs(140,170,null,null,{},dom('Una operación, tres productos',120,C.navy))+row(FAM[1],480,'Creative Studio: dirección, producción y aprobación en un solo lugar.')+row(FAM[2],620,'Búsqueda, web y medición: aparecer donde te buscan, también en respuestas de IA.')+row(FAM[3],760,'Medios y distribución: pauta con alcance medido.')};};
S.directory=()=>{const W=900,H=1400;const r=(b,label,y)=>abs(90,y,720,110,{borderTop:'1px solid rgba(207,228,250,0.25)',display:'flex',alignItems:'center',gap:30},div({width:40,height:40,borderRadius:'50%',background:b.onDark,flexShrink:0})+div({},p(label,40,C.white,600)+p(b.name,26,C.soft,400)));
 return {W,H,bg:C.ink2,html:abs(90,110,700,null,{},cap('Piso 3',C.soft,26))+abs(90,170,null,null,{},dom('¿Dónde vas',110,C.white,{sphereColor:C.teal}).replace('¿Dónde vas','¿Dónde vas?').replace(/<span style="display: inline-block; width: [^"]*"><\/span><span[^>]*><\/span>/,''))+r(FAM[0],'Operación',420)+r(FAM[1],'Estudio',560)+r(FAM[2],'Búsqueda y datos',700)+r(FAM[3],'Medios',840)+abs(90,1230,720,null,{},p('Cada zona conserva el color de su marca.',24,C.soft))};};
boards['F-04-convivencia.dc.html']=board('Familia · convivencia',
 head('Familia · convivencia','Cuando aparecen juntas, habla Efeonce.')+
 place(64,220,'Mapa de portafolio · slide',S.portfolio,.42)+place(900,220,'Directorio de piso',S.directory,.32)+
 col(1230,220,306,700,'Reglas',list(['Efeonce abre y firma: título con la esfera teal.','Cada producto conserva su esfera como viñeta y su logo propio.','El mapa de portafolio y la señalética son las únicas piezas con los cuatro acentos juntos.','Nunca dos acentos en una misma frase.','En oscuro, la familia usa tinta #091951: ahí los cuatro acentos pasan 3:1; sobre navy, el azul de Wave no llega (2,4:1).'],13.5)));
