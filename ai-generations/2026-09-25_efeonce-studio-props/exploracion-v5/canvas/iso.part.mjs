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
  abs(64,586,TW*2+g,TH+60,{background:C.white,outline:`1px solid ${C.line}`},resguardo+badge(true))+abs(64,586+TH+70,TW*2+g,null,{},p(`<b style="font-weight: 600; color: ${OK}">Área de resguardo</b> · X = diámetro de la esfera del isotipo, en los cuatro lados.`,13,C.ink))+
  abs(cx_(2),586,TW*2+g,TH+60,{background:C.white,outline:`1px solid ${C.line}`},escalera)+abs(cx_(2),586+TH+70,TW*2+g,null,{},p(`<b style="font-weight: 600; color: ${OK}">Tamaño mínimo</b> · 24 px en pantalla y 8 mm impreso. A 16 px las tres ventanas se pierden: el favicon de 16 px se valida aparte.`,13,C.ink))+
  bad.map(([t,n,bg,inner],i)=>tile(cx_(i),920+Math.floor(i/4)*286,TW,TH,bg,inner+Xl,false,t,n)).join('')+
  col(64,1520,1472,200,'Logo o isotipo',list(['Isotipo: avatar, favicon, ícono de app, pin, sticker, credencial, lomo de cuaderno, marca de agua en video.','Logo completo: todo lo demás, siempre que quepa a 96 px o más.','Nunca los dos en la misma vista. Cada marca de la familia tiene su isotipo; ninguno se recolorea ni se combina.'],13.5)),1600,1740);}
