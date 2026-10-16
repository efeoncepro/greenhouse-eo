import fs from 'node:fs';
const S=process.argv[2];const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const A='#0375db',AL='#5fb0ff';
const base=880,x0=820,bw=232,gap=22;
const bars=[['01','Tráfico calificado','Visitas con intención comercial, por cluster de tema.','Google · IA',300],['02','Leads','Quién llegó, desde qué búsqueda y qué pidió.','Formularios · CRM',410],['03','Pipeline','Oportunidades que nacen del orgánico, en tu CRM.','HubSpot · Salesforce',540],['04','Ingresos','Lo que el SEO trae al negocio, medido.','Greenhouse',710]];
let html='',pts=[];
bars.forEach(([n,t,d,src,h],i)=>{const x=x0+i*(bw+gap),top=base-h;const last=i===3,first=i===0;pts.push([x+bw/2,top]);
 const fill=last?`linear-gradient(180deg,${A} 0%,#0359ad 55%,#023a72 100%)`:first?`linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))`:`linear-gradient(180deg,rgba(3,117,219,${0.18+i*0.1}) 0%,rgba(3,117,219,0.04) 100%)`;
 const border=last?`2px solid ${AL}`:first?'1px solid rgba(255,255,255,0.12)':`1px solid rgba(95,176,255,${0.25+i*0.15})`;
 const shadow=last?`0 0 80px rgba(3,117,219,0.65),0 0 200px rgba(3,117,219,0.35),inset 0 1px 0 rgba(255,255,255,0.4)`:`0 20px 50px rgba(0,8,20,0.5)`;
 const numC=last?'#ffffff':first?'#8fa3b8':AL;const txtC=first?'#9fb2c6':'#fff';const dC=last?'#e6f1ff':first?'#7f93a8':'#cfe4fa';
 html+=`<div style="position:absolute;left:${x}px;top:${top}px;width:${bw}px;height:${h}px;border-radius:20px;background:${fill};border:${border};box-shadow:${shadow};box-sizing:border-box;padding:22px 20px;display:flex;flex-direction:column">
<div style="font-family:${ID};font-size:${last?64:40}px;font-weight:${last?760:300};line-height:1;color:${numC}">${n}</div>
<div style="margin-top:10px;font-family:${ID};font-size:${last?40:28}px;font-weight:740;letter-spacing:-0.02em;line-height:1.02;color:${txtC}">${t}</div>
<div style="margin-top:10px;font-family:${ST};font-size:16px;font-weight:400;line-height:1.35;color:${dC}">${d}</div>
<div style="margin-top:auto;font-family:${ST};font-size:12px;font-weight:600;letter-spacing:0.14em;text-transform:uppercase;color:${last?'#fff':first?'#7f93a8':'#9fd0ff'}">${src}</div></div>`;});
const path=pts.map((p,i)=>`${i?'L':'M'}${p[0]},${p[1]-26}`).join(' ');
const dx=x0+bw+gap/2;
const svg=`<svg width="1920" height="1080" style="position:absolute;inset:0"><defs><linearGradient id="ln" x1="${x0}" x2="${pts[3][0]}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#8fa3b8" stop-opacity="0.4"/><stop offset="0.35" stop-color="${AL}"/><stop offset="1" stop-color="#ffffff"/></linearGradient><filter id="g"><feGaussianBlur stdDeviation="8"/></filter><radialGradient id="dot"><stop offset="0" stop-color="#fff"/><stop offset="0.3" stop-color="${AL}"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient>
<radialGradient id="spot" cx="${pts[3][0]}" cy="${pts[3][1]}" r="700" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${A}" stop-opacity="0.45"/><stop offset="0.5" stop-color="${A}" stop-opacity="0.12"/><stop offset="1" stop-color="${A}" stop-opacity="0"/></radialGradient></defs>
<rect width="1920" height="1080" fill="url(#spot)"/>
<path d="${path}" stroke="url(#ln)" stroke-width="10" fill="none" filter="url(#g)" opacity="0.8"/><path d="${path}" stroke="url(#ln)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
${pts.slice(0,3).map((p,i)=>`<circle cx="${p[0]}" cy="${p[1]-26}" r="7" fill="${i?AL:'#8fa3b8'}"/>`).join('')}
<circle cx="${pts[3][0]}" cy="${pts[3][1]-26}" r="46" fill="url(#dot)"/><circle cx="${pts[3][0]}" cy="${pts[3][1]-26}" r="11" fill="#fff"/>
<line x1="${x0-40}" y1="${base}" x2="1880" y2="${base}" stroke="#9fd0ff" stroke-opacity="0.25" stroke-width="1.5"/>
<line x1="${dx}" y1="${base-470}" x2="${dx}" y2="${base+24}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="2" stroke-dasharray="6 8"/></svg>`;
const note=`<div style="position:absolute;left:${dx-250}px;top:${base-600}px;width:240px;text-align:right;font-family:${ST};font-size:16px;font-weight:600;line-height:1.3;color:#fff">La mayoría de las agencias <span style="color:#9fb2c6">se detiene aquí</span></div>
<div style="position:absolute;left:${dx+16}px;top:${base-600}px;width:260px;font-family:${ST};font-size:16px;font-weight:600;line-height:1.3;color:${AL}">Nosotros seguimos hasta el ingreso →</div>`;
const out=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">${svg}${html}${note}
<div style="position:absolute;left:140px;top:120px;width:640px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">01 · Te encuentran · Engine</div>
<div style="margin-top:64px;font-family:${ID};font-size:78px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">El SEO termina<br>en ingresos,<br>no en visitas<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${A};margin-left:0.04em"></span></div>
<div style="margin-top:44px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:560px">SEO, AEO y web conectados a tus indicadores de negocio: tráfico calificado, leads, pipeline e <b>ingresos</b>.</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px"></div></body></html>`;
fs.writeFileSync(`${S}/v9/html/V07b.html`,out);console.log('ok');
