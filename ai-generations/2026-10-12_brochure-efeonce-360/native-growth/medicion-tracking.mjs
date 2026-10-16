import fs from 'node:fs';
const S=process.argv[2];const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const R='/Users/jreye/Documents/greenhouse-eo/';const AX=R+'node_modules/@efeoncepro/axis-brand-assets/assets/platforms/';
const BUB='file://'+R+'node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const T='#36c8bf',TL='#72ded8';
const gtmPath=fs.readFileSync(R+'node_modules/simple-icons/icons/googletagmanager.svg','utf8').match(/d="([^"]+)"/)[1];
const logo=f=>`file://${f}`;
const groups=[
 {name:'Medios',sub:'conversiones de vuelta a cada plataforma',y:110,items:[['Meta · CAPI',logo(AX+'meta-isotype.svg')],['Google Ads',logo(AX+'google-ads-isotype.svg')],['TikTok',logo(AX+'tiktok-isotype.svg')],['LinkedIn',logo(AX+'linkedin-isotype.svg')]]},
 {name:'CRM',sub:'cada lead con su origen',y:420,items:[['HubSpot',logo(R+'public/images/logos/axis/hubspot-isotype.svg')],['Salesforce',logo('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-12_brochure-efeonce-360/native-growth/logos/salesforce.svg')]]},
 {name:'Analítica',sub:'el mismo evento en cada herramienta',y:680,items:[['Google Analytics',logo(AX+'google-analytics-isotype.svg')],['Amplitude',logo('/Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-12_brochure-efeonce-360/native-growth/logos/amplitude-icon.svg')],['Adobe Analytics',logo(R+'public/images/logos/axis/adobe-isotype.svg')]]}];
const gx=1180,gy=560;const px=1460;
let beams='',panels='';
groups.forEach((g,gi)=>{const h=g.name==='Analítica'?270:g.items.length>3?230:170;const cy=g.y+h/2;
 beams+=`<path d="M${gx+90},${gy} C${gx+200},${gy} ${px-140},${cy} ${px},${cy}" stroke="url(#beam)" stroke-width="5" fill="none" filter="url(#gl)"/><path d="M${gx+90},${gy} C${gx+200},${gy} ${px-140},${cy} ${px},${cy}" stroke="${TL}" stroke-width="2" fill="none"/><circle cx="${px}" cy="${cy}" r="7" fill="${TL}"/>`;
 const rows=g.items.map(([n,src])=>false?`<div style="display:flex;align-items:center;height:44px"><img src="file://${R}ai-generations/2026-09-29_deck-salesforce/logos/salesforce-partner-badge-horizontal.svg" style="height:40px"></div>`:`<div style="display:flex;align-items:center;gap:14px;height:44px">${src?`<div style="width:44px;height:44px;border-radius:12px;background:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 16px rgba(0,8,20,0.35)"><img src="${src}" style="max-width:30px;max-height:28px"></div>`:`<div style="width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-family:${ID};font-size:20px;font-weight:700;color:#fff">${n[0]}</div>`}<div style="font-family:${ST};font-size:19px;font-weight:600;color:#fff">${n}</div></div>`).join('');
 panels+=`<div style="position:absolute;left:${px+18}px;top:${g.y}px;width:400px;height:${h}px;box-sizing:border-box;padding:16px 22px;border-radius:22px;background:linear-gradient(160deg,rgba(18,58,84,0.9),rgba(6,30,52,0.9));border:1px solid rgba(114,222,216,0.35);box-shadow:0 30px 60px rgba(0,8,20,0.5)">
<div style="margin-bottom:10px"><div style="font-family:${ID};font-size:28px;font-weight:760;color:#fff">${g.name}</div><div style="font-family:${ST};font-size:14px;color:${TL};margin-top:2px">${g.sub}</div></div>
<div style="display:grid;grid-template-columns:${g.name==='Analítica'?'1fr':'1fr 1fr'};gap:8px 12px">${rows}</div></div>`;});
// plan de tracking card
const ev=[['page_view','todas las páginas'],['generate_lead','formulario enviado'],['schedule_call','agenda una reunión'],['purchase','compra con valor']];
const plan=`<div style="position:absolute;left:740px;top:390px;width:300px;transform:rotate(-3deg);box-sizing:border-box;padding:20px 22px;border-radius:20px;background:#f4fbfb;box-shadow:0 30px 60px rgba(0,8,20,0.6),0 0 0 6px rgba(114,222,216,0.15)">
<div style="font-family:${ST};font-size:12px;font-weight:700;letter-spacing:0.12em;color:#127a74">PLAN DE TRACKING</div>
${ev.map(([e,d])=>`<div style="margin-top:12px;padding-top:10px;border-top:1px solid #d5e7e7"><div style="font-family:'Geist Mono',ui-monospace,monospace;font-size:15px;font-weight:600;color:#0b2440">${e}</div><div style="font-family:${ST};font-size:12px;color:#5b7385">${d}</div></div>`).join('')}</div>
<div style="position:absolute;left:760px;top:360px;width:280px;height:300px;transform:rotate(4deg);border-radius:20px;background:rgba(244,251,251,0.25);z-index:-1"></div>`;
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600;700&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<div style="position:absolute;inset:0;background:radial-gradient(ellipse 700px 520px at ${gx}px ${gy}px,rgba(54,200,191,0.30),rgba(54,200,191,0.06) 55%,rgba(0,26,51,0) 80%)"></div>
<svg width="1920" height="1080" style="position:absolute;inset:0"><defs><linearGradient id="beam" x1="0" x2="1"><stop offset="0" stop-color="${TL}" stop-opacity="0.9"/><stop offset="1" stop-color="${T}" stop-opacity="0.5"/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="6"/></filter><radialGradient id="core"><stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="0.35" stop-color="${TL}" stop-opacity="0.6"/><stop offset="1" stop-color="${T}" stop-opacity="0"/></radialGradient></defs>
<path d="M1040,${gy} L${gx-90},${gy}" stroke="${TL}" stroke-width="3" stroke-dasharray="2 10" stroke-linecap="round"/>
${beams}
<circle cx="${gx}" cy="${gy}" r="190" fill="url(#core)" opacity="0.55"/>
<circle cx="${gx}" cy="${gy}" r="120" fill="none" stroke="${TL}" stroke-opacity="0.35" stroke-width="2"/><circle cx="${gx}" cy="${gy}" r="150" fill="none" stroke="${TL}" stroke-opacity="0.15" stroke-width="1.5" stroke-dasharray="3 9"/>
<rect x="${gx-78}" y="${gy-78}" width="156" height="156" rx="38" fill="#ffffff"/><image href="file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-12_brochure-efeonce-360/native-growth/logos/google-tag-manager.svg" x="${gx-56}" y="${gy-56}" width="112" height="112"/></svg>
<div style="position:absolute;left:${gx-160}px;top:${gy+150}px;width:320px;text-align:center"><div style="font-family:${ID};font-size:28px;font-weight:760;color:#fff">Google Tag Manager</div><div style="font-family:${ST};font-size:15px;color:${TL};margin-top:4px">manual o programático · web y server-side · con consentimiento</div></div>
${plan}
${panels}
<div style="position:absolute;left:140px;top:120px;width:560px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">05 · Lo mides · Growth · Medición</div>
<div style="margin-top:56px;display:flex;align-items:center;gap:16px;font-family:${ST};font-size:34px;font-weight:300;color:#fff"><span style="width:22px;height:22px;border-radius:50%;border:4px solid ${T};box-sizing:border-box"></span>¿Confío en mis números?</div>
<div style="margin-top:24px;font-family:${ID};font-size:104px;font-weight:780;letter-spacing:-0.05em;line-height:0.9;color:#fff">Si se miden<br>bien<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${T};margin-left:0.04em"></span></div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff">Diseñamos qué medir, instalamos cada tag y conectamos medios, CRM y analítica. Tus números <b>cuadran</b> entre herramientas.</div>
</div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px"></div></body></html>`;
fs.writeFileSync(S+'/v9/html/MED.html',html);console.log('ok');
