import fs from 'node:fs';
const S=process.argv[2];const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const LOCK='file:///Users/jreye/Documents/greenhouse-eo/ai-generations/2026-10-10_propuesta-sky-social-care/assets/insights/insights-lockup-negative.svg';
const T='#36c8bf',TL='#72ded8',P='#8fa3e8',C='#ff6b5e',INK='#e8f1fb',SOFT='#9fb4cc';
const card=(x,y,w,h,tag,title,svg,hl=false)=>`<div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:20px;background:linear-gradient(160deg,rgba(18,52,86,0.92),rgba(8,30,56,0.92));border:1px solid ${hl?'rgba(114,222,216,0.7)':'rgba(143,163,232,0.22)'};box-shadow:0 30px 60px rgba(0,8,20,0.55)${hl?',0 0 60px rgba(54,200,191,0.35)':''};box-sizing:border-box;padding:18px 20px">
<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:${ST};font-size:15px;font-weight:600;color:${INK}">${title}</div><div style="font-family:${ST};font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${TL};border:1px solid rgba(114,222,216,0.4);border-radius:999px;padding:3px 9px">${tag}</div></div>
<svg width="${w-40}" height="${h-64}" viewBox="0 0 ${w-40} ${h-64}" style="margin-top:10px;display:block">${svg}</svg></div>`;
const txt=(x,y,s,c,sz=12,w=400,a='start')=>`<text x="${x}" y="${y}" fill="${c}" font-family="Poppins" font-size="${sz}" font-weight="${w}" text-anchor="${a}">${s}</text>`;
// 1 tendencia (grande)
const tw=640,th=300;const pts=[40,46,44,52,61,68,74];const avg=[42,43,44,45,45,46,47];const sx=i=>40+i*((tw-40-60)/6),sy=v=>th-40-(v-30)*((th-70)/50);
const line=a=>a.map((v,i)=>`${i?'L':'M'}${sx(i)},${sy(v)}`).join(' ');
const trend=`<defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T}" stop-opacity="0.45"/><stop offset="1" stop-color="${T}" stop-opacity="0"/></linearGradient></defs>
${[0,1,2,3].map(k=>`<line x1="40" x2="${tw-60}" y1="${sy(30+k*15)}" y2="${sy(30+k*15)}" stroke="#ffffff" stroke-opacity="0.07"/>`).join('')}
<path d="${line(pts)} L${sx(6)},${sy(30)} L${sx(0)},${sy(30)} Z" fill="url(#ar)"/><path d="${line(avg)}" stroke="${SOFT}" stroke-width="2" stroke-dasharray="6 6" fill="none"/><path d="${line(pts)}" stroke="${TL}" stroke-width="4" fill="none" stroke-linecap="round"/>
<circle cx="${sx(6)}" cy="${sy(74)}" r="9" fill="${TL}"/><circle cx="${sx(6)}" cy="${sy(74)}" r="18" fill="${TL}" opacity="0.25"/>
${txt(sx(6)-6,sy(74)-22,'74 %',INK,26,700,'end')}${txt(sx(6)-6,sy(74)-4,'+32 pts en 6 meses',TL,12,600,'end')}
${['abr','may','jun','jul','ago','sep','oct'].map((m,i)=>txt(sx(i),th-14,m,SOFT,11,400,'middle')).join('')}
${txt(44,18,'— Tu marca',TL,12,600)}${txt(140,18,'- - Promedio del sector',SOFT,12,500)}`;
// 2 comparación barras agrupadas
const cmp=(()=>{const g=[['Google',62,48],['IA',41,22],['Redes',35,30]];return g.map(([n,a,b],i)=>{const x=24+i*96;return `<rect x="${x}" y="${150-a*2}" width="30" height="${a*2}" rx="5" fill="${T}"/><rect x="${x+34}" y="${150-b*2}" width="30" height="${b*2}" rx="5" fill="${P}"/>${txt(x+32,170,n,SOFT,11,500,'middle')}${txt(x+15,150-a*2-6,a,INK,12,700,'middle')}`}).join('')+txt(4,12,'■ este mes',T,11,600)+txt(90,12,'■ mes anterior',P,11,600)})();
// 3 donut
const donut=(()=>{const r=58,cx=80,cy=88,Ccirc=2*Math.PI*r;const parts=[[0.38,T],[0.27,P],[0.2,C],[0.15,'#c9d6ea']];let off=0;let s='';for(const [f,c] of parts){s+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${c}" stroke-width="22" stroke-dasharray="${(f*Ccirc-3).toFixed(1)} ${Ccirc}" stroke-dashoffset="${(-off*Ccirc).toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>`;off+=f}s+=txt(cx,cy+2,'38 %',INK,24,700,'middle')+txt(cx,cy+20,'orgánico',SOFT,11,500,'middle');[['Orgánico','38 %',T],['Pago','27 %',P],['Directo','20 %',C],['Referidos','15 %','#c9d6ea']].forEach(([n,v,c],i)=>{s+=`<rect x="160" y="${42+i*28}" width="10" height="10" rx="2" fill="${c}"/>`+txt(178,51+i*28,n,INK,12,500)+txt(290,51+i*28,v,INK,12,700,'end')});return s})();
// 4 waffle
const waffle=(()=>{let s='';for(let i=0;i<100;i++){const c=i<34?T:i<55?C:'rgba(255,255,255,0.10)';s+=`<rect x="${4+(i%10)*15}" y="${8+Math.floor(i/10)*15}" width="12" height="12" rx="2.5" fill="${c}"/>`}[['Top 10','34',T],['A un paso','21',C],['Sin posición','45','rgba(255,255,255,0.35)']].forEach(([n,v,c],i)=>{s+=`<rect x="172" y="${30+i*40}" width="10" height="10" rx="2" fill="${c}"/>`+txt(190,39+i*40,n,INK,12,500)+txt(300,39+i*40,v,INK,18,700,'end')});return s})();
// 5 bullet metas
const bullet=(()=>{const rows=[['Leads',82,100],['Citas en IA',37,40],['Ventas',58,80]];return rows.map(([n,v,t],i)=>{const y=20+i*52;const W=190;return txt(0,y+12,n,INK,12,600)+`<rect x="90" y="${y}" width="${W}" height="16" rx="8" fill="rgba(255,255,255,0.08)"/><rect x="90" y="${y}" width="${W*v/t}" height="16" rx="8" fill="${v/t>=0.9?T:C}"/><rect x="${90+W-2}" y="${y-5}" width="3" height="26" fill="${INK}"/>`+txt(90,y+34,`${v} de ${t}`,SOFT,11,500)+txt(90+W,y+34,`${Math.round(v/t*100)} %`,v/t>=0.9?TL:C,12,700,'end')}).join('')})();
// 6 waterfall
const wf=(()=>{const st=[['Julio',1102,0,P],['Blog',96,1102,T],['Servicios',58,1198,T],['Home',-23,1256,C],['Agosto',1233,0,TL]];const sc=v=>v*0.12;let s='';st.forEach(([n,v,base,c],i)=>{const y=12+i*30;const x0=60+sc(v<0?base+v:base);s+=txt(0,y+13,n,SOFT,11,500)+`<rect x="${x0}" y="${y}" width="${Math.max(4,sc(Math.abs(v)))}" height="18" rx="4" fill="${c}"/>`+txt(x0+sc(Math.abs(v))+6,y+13,(i&&i<4?(v>0?'+':''):'')+v.toLocaleString('es-CL'),INK,11,700)});return s})();
// 7 apiladas
const stk=(()=>{const d=[['jun',530,490],['jul',604,498],['ago',688,470],['sep',760,455]];let s='';d.forEach(([m,a,b],i)=>{const x=10+i*72,k=0.12;const k2=0.1;s+=`<rect x="${x}" y="${160-a*k2}" width="44" height="${a*k2}" rx="4" fill="${T}"/><rect x="${x}" y="${160-(a+b)*k2}" width="44" height="${b*k2-3}" rx="4" fill="${P}"/>`+txt(x+22,178,m,SOFT,11,500,'middle')});s+=txt(4,12,'■ con marca',T,11,600)+txt(100,12,'■ sin marca',P,11,600);return s})();
// 8 stat
const stat=`${txt(0,74,'93 %',INK,64,700)}${txt(4,104,'de las respuestas de IA',SOFT,13,500)}${txt(4,122,'te mencionan correctamente',SOFT,13,500)}${txt(4,156,'▲ 11 pts vs trimestre anterior',TL,13,600)}`;
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600;700&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<div style="position:absolute;inset:0;background:radial-gradient(ellipse 900px 640px at 1300px 540px,rgba(54,200,191,0.22),rgba(54,200,191,0.05) 55%,rgba(0,26,51,0) 80%)"></div>
<div style="position:absolute;left:0;top:0;width:1920px;height:1080px;transform:perspective(2200px) rotateY(-9deg) rotateX(4deg);transform-origin:70% 50%">
${card(720,90,700,370,'Tendencia','Visibilidad en IA · 6 meses',trend,true)}
${card(1440,90,360,240,'Comparación','Tráfico por canal',cmp)}
${card(1440,350,360,240,'Composición','De dónde llegan',donut)}
${card(720,480,340,250,'Distribución','Tus 100 palabras clave',waffle)}
${card(1080,480,340,250,'Metas','Contra lo comprometido',bullet)}
${card(1440,610,360,250,'Aportes','Sesiones: qué sumó y qué restó',wf)}
${card(720,750,340,250,'Proporción','Con y sin marca',stk)}
${card(1080,750,340,250,'Indicador','Exactitud de la IA',stat)}
</div>
<div style="position:absolute;left:140px;top:72px"><img src="${LOCK}" style="height:30px"></div>
<div style="position:absolute;left:140px;top:150px;width:560px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">05 · Lo mides · Growth</div>
<div style="margin-top:56px;display:flex;align-items:center;gap:16px;font-family:${ST};font-size:34px;font-weight:300;color:#fff"><span style="width:22px;height:22px;border-radius:50%;border:4px solid ${T};box-sizing:border-box"></span>¿Y si no entiendo los datos?</div>
<div style="margin-top:24px;font-family:${ID};font-size:110px;font-weight:780;letter-spacing:-0.05em;line-height:0.9;color:#fff">Cada dato,<br>su gráfico<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:${T};margin-left:0.04em"></span></div>
<div style="margin-top:40px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff">Insights elige cómo mostrar cada métrica: tendencia, comparación, composición, metas o aportes. Lo entiendes de un vistazo y lo presentas <b>sin rehacer nada</b>.</div>
<div style="margin-top:40px;display:flex;gap:40px">${[['9','tipos de gráfico'],['1','lectura escrita por la IA'],['5','formatos de entrega']].map(([v,l])=>`<div style="display:flex;flex-direction:column;gap:4px;padding-top:12px;border-top:2px solid ${T}"><div style="font-family:${ID};font-size:44px;font-weight:740;color:#fff">${v}</div><div style="font-family:${ST};font-size:15px;color:#cfe4fa">${l}</div></div>`).join('')}</div></div>
<div style="position:absolute;right:60px;bottom:40px;font-family:${ST};font-size:13px;color:#8fa9c4">Gráficos de Efeonce Insights con datos de ejemplo.</div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px"></div></body></html>`;
fs.writeFileSync(S+'/v9/html/INSG.html',html);console.log('ok');
