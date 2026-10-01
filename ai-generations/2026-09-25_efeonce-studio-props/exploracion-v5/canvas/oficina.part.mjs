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
  orbit({W:tw,H:th,cx:tw-120,cy:th/2,r,a0:-90,a1:-90+360*.6,k:1.5,haloOp:.12})+abs(36,40,300,null,{},cap('Sala',OR.sub,16))+abs(36,74,320,null,{},dom('Hacer',56,C.white,{sphereColor:OR.teal}))+
  abs(36,190,280,null,{},p('En sesión',26,C.white,600)+p('Termina a las 16:00',20,OR.sub)))+abs(tx-40,ty+th+50,tw+80,null,{},p('El arco muestra el tiempo real que ya pasó de la reunión.',22,C.muted,400,{textAlign:'center'}))+floor(W,H)};};
S.of_voz=()=>{const W=1920,H=1080;return {W,H,bg:'#F2F3F0',html:abs(180,230,1500,null,{},q('¿Lo medimos?',84,C.navy,{ringColor:C.tealDark}))+abs(180,380,1500,null,{},dom('Siempre',330,C.navy,{sphereColor:C.tealDark}))+
 abs(180,820,1400,null,{},p('Muro de voz: una pregunta y su respuesta, pintadas. Una por espacio.',26,C.muted))+floor(W,H)};};
S.of_cabina=()=>{const W=1920,H=1080;const letrero=(x,on)=>abs(x,160,560,200,{background:OR.navy,display:'flex',alignItems:'center',gap:30,padding:'0 44px',boxSizing:'border-box'},(on?div({width:64,height:64,borderRadius:'50%',background:OR.teal,flexShrink:0}):div({width:64,height:64,borderRadius:'50%',border:'8px solid #72DED8',boxSizing:'border-box',flexShrink:0}))+div({},dom(on?'En el aire':'Libre',on?54:58,C.white,{sphereColor:OR.teal})));
 return {W,H,bg:WALL,html:letrero(300,false)+letrero(1060,true)+abs(300,390,560,null,{},p('Anillo: libre',26,C.muted,500))+abs(1060,390,560,null,{},p('Esfera: grabando o en llamada',26,C.muted,500))+
  abs(300,470,560,500,{background:'#D5DADB',border:'14px solid #9AA4AC',boxSizing:'border-box'})+abs(1060,470,560,500,{background:'#C3CACC',border:'14px solid #9AA4AC',boxSizing:'border-box'})+floor(W,H)};};
// Convivir
S.of_cocina=()=>{const W=1920,H=1080,shelf=660;const mugs=[FAM[0].mug[0],OB2.navyPalabra,OB2.globePalabra,'/_blob/94bc009ca795c2af84bda6969f89061a','/_blob/44d6c3c085adc4dccbcb08dbc111a50c',OB.mugBlanca];
 return {W,H,bg:'#F2F3F0',html:abs(180,150,1500,null,{},q('¿Otra vuelta?',64,C.navy,{ringColor:C.tealDark}))+abs(180,250,1500,null,{},dom('Vamos',220,C.navy,{sphereColor:C.tealDark}))+
  mugs.map((m,i)=>`<img src="${m}" alt="" style="position: absolute; left: ${210+i*250}px; top: ${shelf-230}px; width: 250px; height: 250px; object-fit: contain">`).join('')+abs(180,shelf,1560,22,{background:'#B8BFC2'})+floor(W,H)};};
S.of_puesto=()=>{const W=1920,H=1080;const cuaderno=abs(150,170,480,660,{background:OR.navy,overflow:'hidden',boxShadow:'0 14px 30px rgba(0,26,51,0.25)'},orbit({W:480,H:660,cx:300,cy:230,r:150,a0:200,a1:250,k:1.3,haloOp:.1})+abs(44,520,400,null,{},dom('Ideas',84,C.white,{sphereColor:OR.teal})));
 const credencial=abs(720,150,380,560,{background:'#FAFBFA',boxShadow:'0 14px 30px rgba(0,26,51,0.18)',padding:'40px 36px',boxSizing:'border-box'},`<img src="/_blob/34c7881fe2f7f10d4c725f66ec13f478" alt="Foto de la persona con la órbita" style="width: 200px; height: 200px; display: block">`+div({marginTop:30},dom('Julio Reyes',44,C.navy,{sphereColor:C.tealDark}))+p('Head of Growth',24,C.muted,400,{marginTop:10})+`<img src="${LK.efeonce.full}" alt="Efeonce" style="position: absolute; left: 36px; bottom: 36px; width: 150px; height: ${+(150*LK.efeonce.r).toFixed(1)}px">`);
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
