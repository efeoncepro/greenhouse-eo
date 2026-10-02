// ================= A3 · La ventana con punch: tres versiones =================
const BIG=(size,color,o={})=>({fontFamily:BR,fontWeight:760,fontSize:size,lineHeight:1,letterSpacing:TRK+'em',color,whiteSpace:'nowrap',...o});
// Esfera gigante como punto final de una palabra: su borde inferior apoya en la línea base.
const giantPeriod=({txt,x,top,size,color,D,sph=C.teal})=>{const b=plainBounds(txt,size,x,top),base=top+.83*size,sx=b.right+size*.04;return abs(x,top,null,null,{},div(BIG(size,color),txt))+abs(sx,base-D,D,D,{borderRadius:'50%',background:sph});};
// Lente: la foto entera en navy apagado; dentro del círculo, a color y ampliada.
const lens=({src,W,H,cx,cy,D,zoom=1.3,pos='50% 50%',alt,accent=C.teal})=>{const r=D/2,d=D*.13,g=D*.025,a=-45*Math.PI/180,sx=cx+(r+g+d/2)*Math.cos(a)-d/2,sy=cy+(r+g+d/2)*Math.sin(a)-d/2;
 const base=`<img src="${src}" alt="${alt}" style="position: absolute; left: 0; top: 0; width: ${W}px; height: ${H}px; object-fit: cover; object-position: ${pos}; filter: grayscale(1) contrast(1.1) brightness(0.62)">`+abs(0,0,W,H,{background:C.navy,mixBlendMode:'multiply',opacity:.72});
 const inner=abs(0,0,W,H,{clipPath:`circle(${r}px at ${cx}px ${cy}px)`},`<img src="${src}" alt="" style="position: absolute; left: ${cx-cx*zoom}px; top: ${cy-cy*zoom}px; width: ${W*zoom}px; height: ${H*zoom}px; object-fit: cover; object-position: ${pos}">`);
 return base+inner+abs(sx,sy,d,d,{borderRadius:'50%',background:accent});};
// Esfera tipográfica: disco teal gigante; la palabra va en contorno afuera y se llena en navy adentro.
const typoSphere=({txt,x,top,size,cx,cy,D,W,H,stroke=C.white,fillIn=C.navy,disc=C.teal})=>abs(cx-D/2,cy-D/2,D,D,{borderRadius:'50%',background:disc})+
 abs(x,top,null,null,{},div(BIG(size,'transparent',{WebkitTextStroke:`${Math.max(2,size*.007)}px ${stroke}`}),txt))+
 abs(0,0,W,H,{clipPath:`circle(${D/2}px at ${cx}px ${cy}px)`},abs(x,top,null,null,{},div(BIG(size,fillIn),txt)));
const wallBase=(bg,inner)=>abs(0,0,1920,1080,{background:bg,overflow:'hidden'},inner+abs(0,970,1920,110,{background:'#0A1F33',opacity:.55}));
// A · Punto gigante
S.pA_wall=()=>({W:1920,H:1080,bg:C.navy,html:wallBase(C.navy,giantPeriod({txt:'Hacer',x:150,top:420,size:400,color:C.white,D:780}))});
S.pA_cover=()=>({W:1920,H:1080,bg:C.navy,html:abs(140,150,1200,null,{},q('¿Qué cambió este trimestre?',40,C.soft))+giantPeriod({txt:'Lo que medimos',x:140,top:640,size:170,color:C.white,D:900})});
S.pA_post=()=>({W:1080,H:1350,bg:C.navy,html:abs(90,130,900,null,{},q('¿Lo medimos?',44,C.soft))+giantPeriod({txt:'Siempre',x:90,top:980,size:210,color:C.white,D:640})});
S.pA_bag=()=>({W:800,H:900,bg:'#EDE8DF',html:giantPeriod({txt:'Hacer',x:70,top:560,size:170,color:C.navy,D:420,sph:C.tealDark})});
// B · La lente
S.pB_wall=()=>({W:1920,H:1080,bg:C.navy,html:lens({src:IMG.studio,W:1920,H:1080,cx:1180,cy:400,D:620,zoom:1.35,alt:'Estudio en navy con el estratega a color dentro del círculo'})+abs(120,760,null,null,{},dom('Hacer',150,C.white))});
S.pB_cover=()=>({W:1920,H:1080,bg:C.navy,html:lens({src:IMG.conv,W:1920,H:1080,cx:1300,cy:600,D:720,zoom:1.3,pos:'50% 42%',alt:'Equipo en navy con la pantalla a color dentro del círculo'})+abs(120,150,760,null,{},q('¿Qué cambió este trimestre?',40,C.soft))+abs(120,230,null,null,{},dom('Lo que medimos',130,C.white))});
S.pB_post=()=>({W:1080,H:1350,bg:C.navy,html:lens({src:IMG.edit,W:1080,H:1350,cx:548,cy:600,D:470,zoom:1.4,alt:'Estación de edición en navy con el frasco a color dentro del círculo'})+abs(90,90,900,null,{},q('¿Cuál sale al aire?',42,C.soft))+abs(90,160,null,null,{},dom('Esta',170,C.white))});
S.pB_story=()=>({W:1080,H:1920,bg:C.navy,html:lens({src:IMG.conv,W:1080,H:1920,cx:500,cy:800,D:760,zoom:1.3,pos:'50% 40%',alt:'Dos personas en navy, a color dentro del círculo'})+abs(90,1400,900,null,{},q('¿Quién escribe el próximo brief?',44,C.soft))+abs(90,1480,null,null,{},dom('Los dos',200,C.white))});
// C · Esfera tipográfica
S.pC_wall=()=>({W:1920,H:1080,bg:C.navy,html:wallBase(C.navy,typoSphere({txt:'Hacer',x:120,top:300,size:520,cx:1230,cy:470,D:880,W:1920,H:1080}))});
S.pC_cover=()=>({W:1920,H:1080,bg:C.navy,html:typoSphere({txt:'Medir',x:120,top:300,size:560,cx:1500,cy:560,D:1000,W:1920,H:1080})+abs(120,120,900,null,{},q('¿Qué cambió este trimestre?',40,C.soft))});
S.pC_post=()=>({W:1080,H:1350,bg:C.navy,html:typoSphere({txt:'Probar',x:40,top:520,size:340,cx:700,cy:700,D:760,W:1080,H:1350})+abs(90,110,900,null,{},q('¿Y si lo probamos?',44,C.soft))});
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
 [['A3·1 · Punto gigante','El punto final crece y se sale del soporte.',S.pA_wall],['A3·2 · La lente','Foto en navy apagado; a color dentro del círculo.',S.pB_wall],['A3·3 · Esfera tipográfica','Palabra en contorno que se llena dentro de la esfera.',S.pC_wall]].map(([t,d,fn],i)=>lab(64+i*500,290,t)+abs(64+i*500,290,null,null,{},tileOf(fn,.24))+abs(64+i*500,560,460,null,{},p(d,14,C.ink))).join('')+
 col(64,660,1472,300,'Cómo elegir',list(['Mira cada versión en su lámina (A3·1, A3·2, A3·3): mismas superficies, distinta fuerza.','Se puede quedar una sola o combinar dos con roles distintos; por ejemplo, el punto gigante en piezas hito y la lente en fotografía.','La versión anterior de A3 quedó en el archivo.'],14)));
