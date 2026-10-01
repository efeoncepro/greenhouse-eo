// ================= Prueba sin logo · estímulos (versión línea vs. distractor) =================
// Distractor: misma copia, composición, foto y tipografía; sin órbita, sin esfera, sin anillo, sin lente y sin la paleta navy/teal.
const DIST=(fn)=>()=>{globalThis.__DIST=true;try{const x=fn();return {...x,bg:x.bg===OR.navy?'#1C2430':x.bg===C.paper?'#FFFFFF':x.bg,html:x.html.split('#001A33').join('#1C2430').split(OR.teal).join('#AEB6BF').split('#023C70').join('#2B2F36').split('#0E8C82').join('#8A929C')};}finally{globalThis.__DIST=false;}};
S.t_learn_post=()=>{const W=1080,H=1350,cx=640,cy=520,r=320,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k})+logoNeg(96,96,220)+abs(96,900,900,null,{},q('¿Lo medimos?',38,OR.ink,{ringColor:OR.teal}))+abs(96,970,900,null,{},dom('Siempre',130,C.white,{sphereColor:OR.teal}))};};
S.t_post=()=>{const W=1080,H=1350,cx=640,cy=520,r=320,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:200,a1:250,k})+abs(96,900,900,null,{},q('¿Qué funcionó?',38,OR.ink,{ringColor:OR.teal}))+abs(96,970,900,null,{},dom('Lo que repetimos',100,C.white,{sphereColor:OR.teal}))};};
S.t_story=()=>{const W=1080,H=1920,cx=540,cy=760,r=380,k=SOC(W);return {W,H,bg:OR.navy,html:orbit({W,H,cx,cy,r,a0:20,a1:95,k,rings:[[1,.2],[.72,.1]],haloOp:.2})+abs(0,cy-60,W,null,{display:'flex',justifyContent:'center'},dom('Visible',120,C.white,{sphereColor:OR.teal}))+
 abs(140,1400,W-280,null,{display:'flex',justifyContent:'center',textAlign:'center'},q('¿Quién aparece cuando preguntan por tu categoría?',38,OR.ink,{ringColor:OR.teal,textAlign:'center'}))};};
const ESTIMULOS={
 aprendizaje:[['L1-deck-portada',S.o_deck],['L2-banner-linkedin',S.o_banner],['L3-post',S.t_learn_post],['L4-cierre',S.d_cierre]],
 atribucion:[['R1-post',S.t_post],['R2-story',S.t_story],['R3-deck-seccion',S.d_seccion(2,5,'Lo que probamos')],['R4-muro',S.o_muro],['R5-post-lente',S.c_conv],['R6-linkedin',S.c_linkedin],['R8-post-satelites',S.o_sats]]};
const EST_DIR=new URL('./estimulos/',import.meta.url).pathname;import('node:fs').then(({mkdirSync})=>mkdirSync(EST_DIR,{recursive:true}));
globalThis.__ESTIMULOS=[];
for(const [fase,list] of Object.entries(ESTIMULOS))for(const [id,fn] of list)for(const [v,f] of [['linea',fn],['distractor',DIST(fn)]]){const x=f();globalThis.__ESTIMULOS.push({file:`${fase}-${id}-${v}.html`,W:x.W,H:x.H,html:page(id,x.W,x.H,div({width:x.W,height:x.H,position:'relative',background:x.bg,overflow:'hidden'},x.html))});}
