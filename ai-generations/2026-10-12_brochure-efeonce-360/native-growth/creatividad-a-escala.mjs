import fs from 'node:fs';
const S=process.argv[2];const B=`file://${S}/brio`;const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const O='#ff6500';
// muro de fondo: muchas piezas que se alejan
const wallImgs=['brio-p2-gente','brio-p3-fila','brio-p4-pack','brio-p5-calle','brio-fmt-11','brio-fmt-45','brio-p1-hero','brio-fmt-916'];
let wall='';let k=0;for(let r=0;r<5;r++)for(let c=0;c<9;c++){const im=wallImgs[(k++*5+r)%wallImgs.length];wall+=`<img src="${B}/${im}.webp" style="position:absolute;left:${c*150}px;top:${r*150}px;width:138px;height:138px;object-fit:cover;border-radius:10px;opacity:${(0.25+0.5*((c+r)%3)/2).toFixed(2)}">`;}
const card=(im,l,t,w,h,rot,tag,z,glow,right)=>`<div style="position:absolute;left:${l}px;top:${t}px;width:${w}px;height:${h}px;transform:rotate(${rot}deg);z-index:${z}">
<img src="${B}/${im}.webp" style="width:100%;height:100%;object-fit:cover;border-radius:18px;box-shadow:0 40px 80px rgba(0,8,20,0.7)${glow?`,0 0 0 3px ${O},0 0 90px rgba(255,101,0,0.55)`:',0 0 0 1px rgba(255,255,255,0.25)'}">
<div style="position:absolute;${right?"right:14px":"left:14px"};bottom:-40px;font-family:${ST};font-size:15px;font-weight:600;letter-spacing:0.08em;color:#fff;background:rgba(0,26,51,0.85);border:1.5px solid ${glow?O:'rgba(207,228,250,0.45)'};border-radius:999px;padding:5px 14px">${tag}</div></div>`;
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<div style="position:absolute;left:760px;top:-120px;width:1400px;height:800px;transform:perspective(1400px) rotateX(38deg) rotateZ(-8deg);transform-origin:50% 0;-webkit-mask-image:radial-gradient(ellipse 60% 70% at 50% 30%,#000 30%,transparent 80%);mask-image:radial-gradient(ellipse 60% 70% at 50% 30%,#000 30%,transparent 80%)">${wall}</div>
<div style="position:absolute;inset:0;background:radial-gradient(ellipse 760px 560px at 1340px 600px,rgba(255,101,0,0.32),rgba(255,101,0,0.06) 55%,rgba(0,26,51,0) 80%),linear-gradient(90deg,#001a33 0,#001a33 34%,rgba(0,26,51,0.55) 46%,rgba(0,26,51,0) 60%)"></div>
<svg width="1920" height="1080" style="position:absolute;inset:0"><ellipse cx="1340" cy="600" rx="560" ry="380" fill="none" stroke="#ffb27a" stroke-opacity="0.22" stroke-width="2"/><circle cx="1340" cy="220" r="9" fill="${O}"/></svg>
${card('brio-fmt-916',930,300,250,444,-9,'9:16',2,false)}
${card('brio-fmt-191',1340,690,480,251,6,'1,91:1',2,false)}
${card('brio-fmt-45',1530,250,300,375,8,'4:5',2,false,true)}
${card('brio-fmt-11',1130,330,400,400,-2,'1:1 · pieza madre',3,true)}
<div style="position:absolute;left:140px;top:120px;width:640px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">02 · Te recuerdan · Brand</div>
<div style="margin-top:56px;display:flex;align-items:center;gap:16px;font-family:${ST};font-size:36px;font-weight:300;color:#fff"><span style="width:22px;height:22px;border-radius:50%;border:4px solid ${O};box-sizing:border-box"></span>¿Más piezas, mismo estándar?</div>
<div style="margin-top:26px;font-family:${ID};font-size:132px;font-weight:780;letter-spacing:-0.05em;line-height:0.88;color:#fff">Creatividad<br>a escala<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${O};margin-left:0.04em"></span></div>
<div style="margin-top:36px;font-family:${ID};font-size:34px;font-weight:600;letter-spacing:-0.02em;line-height:1.15;color:#ffb27a">Una idea. Todos los formatos.<br>La misma marca.</div>
<div style="margin-top:26px;font-family:${ST};font-size:22px;font-weight:300;line-height:1.45;color:#fff;max-width:560px">Un sistema medible e impulsado por IA: menos rondas, ciclos más cortos y campañas que llegan <b>antes</b> al mercado.</div>
<div style="margin-top:40px;display:flex;gap:36px">${[['≥ 80 %','a la primera'],['≤ 1,5','rondas por pieza'],['≥ 90 %','entregas a tiempo']].map(([v,l])=>`<div style="display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:2px solid ${O}"><div style="font-family:${ID};font-size:40px;font-weight:740;letter-spacing:-0.02em;color:#fff">${v}</div><div style="font-family:${ST};font-size:15px;font-weight:400;color:#cfe4fa">${l}</div></div>`).join('')}</div>
<div style="margin-top:12px;font-family:${ST};font-size:13px;font-weight:400;color:#8fa9c4">Estándares que medimos en cada pieza, en Creative Studio.</div></div>
<div style="position:absolute;right:60px;bottom:40px;font-family:${ST};font-size:13px;font-weight:400;color:#8fa9c4">BRÍO es una marca de ejemplo, producida con dirección de arte humana e IA.</div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px"></div></body></html>`;
fs.writeFileSync(S+'/v9/html/ESC.html',html);console.log('ok');
