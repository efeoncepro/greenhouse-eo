// Interfaces renderizadas (no capturas) para componer en las pantallas de las fotos del menú.
import fs from 'node:fs';
const A='/Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/';
const L='/Users/jreye/Documents/axis-design-system/apps/lab/public/branding/';
const svg=(p)=>'data:image/svg+xml;base64,'+fs.readFileSync(p).toString('base64');
export const FONTS='family=Poppins:wght@300;400;500;600;700&family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800';
const ring=(v,size,stroke,color,track)=>{const r=(size-stroke)/2,c=2*Math.PI*r,o=c*(1-v/100);return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/><circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${o}" transform="rotate(-90 ${size/2} ${size/2})"/></svg>`;};

// AI Visibility Report en tableta (horizontal)
export function avr(w,h){
  const bar=(n,v,c)=>`<div style="display:flex;align-items:center;gap:18px;margin:16px 0"><span style="width:150px;font:500 22px Poppins;color:#023c70">${n}</span><div style="flex:1;height:14px;border-radius:7px;background:#e3e9f0"><div style="width:${v}%;height:100%;border-radius:7px;background:${c}"></div></div><span style="width:56px;text-align:right;font:600 22px Poppins;color:#022a4e">${v}</span></div>`;
  return `<div style="width:${w}px;height:${h}px;background:#f7f8f6;font-family:Poppins;display:flex;flex-direction:column">
  <div style="height:96px;background:#001a33;display:flex;align-items:center;padding:0 48px;gap:24px"><img src="${svg(A+'ai-visibility-report-lockup-negative.svg')}" style="height:40px"><span style="margin-left:auto;font:400 20px Poppins;color:#9fb3c8">Nórtica · 18 oct 2026</span></div>
  <div style="flex:1;display:grid;grid-template-columns:520px 1fr;gap:40px;padding:44px 48px">
    <div style="background:#001a33;border-radius:28px;padding:40px;display:flex;flex-direction:column;align-items:center;color:#fff">
      <div style="font:500 20px Poppins;letter-spacing:.12em;color:#9fb3c8">TU PUNTO DE PARTIDA</div>
      <div style="position:relative;width:300px;height:300px;margin:28px 0">${ring(63,300,22,'#0375db','#1d3a57')}<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center"><span style="font:800 120px 'Bricolage Grotesque';line-height:1">63</span><span style="font:400 22px Poppins;color:#9fb3c8">de 100</span></div></div>
      <div style="font:700 40px 'Bricolage Grotesque';text-align:center;line-height:1.1">Te encuentran, pero casi no te citan.</div>
    </div>
    <div style="display:flex;flex-direction:column">
      <div style="font:700 44px 'Bricolage Grotesque';color:#022a4e">Motor por motor</div>
      <div style="font:400 22px Poppins;color:#4a6480;margin:6px 0 18px">Presencia de tu marca en las respuestas</div>
      ${bar('ChatGPT',72,'#0375db')}${bar('Gemini',58,'#0375db')}${bar('Claude',51,'#0375db')}${bar('Perplexity',44,'#0375db')}${bar('AI Overviews',37,'#0375db')}
      <div style="margin-top:auto;background:#fff;border:1px solid #d5dee8;border-radius:20px;padding:24px 28px"><div style="font:600 18px Poppins;letter-spacing:.1em;color:#0375db">QUÉ MOVER PRIMERO</div><div style="font:600 28px Poppins;color:#022a4e;margin-top:8px">Consigue citas creíbles en tu categoría</div></div>
    </div>
  </div></div>`;
}

// Glitch en el teléfono (vertical): la edición del lunes en el correo
export function glitch(w,h){
  const item=(k,t)=>`<div style="padding:30px 0;border-top:1px solid #1d3a57"><div style="font:600 24px Poppins;letter-spacing:.12em;color:#6ec207">${k}</div><div style="font:600 38px Poppins;color:#fff;line-height:1.25;margin-top:10px">${t}</div></div>`;
  return `<div style="width:${w}px;height:${h}px;background:#001a33;font-family:Poppins;color:#fff;padding:110px 64px 0;box-sizing:border-box;overflow:hidden">
  <div style="display:flex;align-items:center;justify-content:space-between"><img src="${svg(L+'glitch/glitch-logo-negative.svg')}" style="height:72px"><span style="font:700 40px 'Bricolage Grotesque';color:#6ec207">#18</span></div>
  <div style="font:500 26px Poppins;color:#9fb3c8;margin-top:28px;letter-spacing:.06em">EDICIÓN DEL LUNES · 19 OCT</div>
  <div style="font:800 92px 'Bricolage Grotesque';line-height:1.02;margin-top:40px">El buscador ya no es tuyo<span style="color:#6ec207">.</span></div>
  <div style="font:300 34px Poppins;color:#cfe4fa;line-height:1.4;margin-top:28px">Ocho noticias de IA, marketing y negocios. En seis palabras cada una.</div>
  <div style="margin-top:56px;height:560px;border-radius:32px;background:#022a4e;position:relative;overflow:hidden;display:flex;align-items:center;justify-content:center">
    <img src="${svg(L+'glitch/glitch-apple.svg')}" style="width:380px;filter:brightness(0) saturate(100%) invert(62%) sepia(91%) saturate(1200%) hue-rotate(50deg) brightness(95%)">
    <div style="position:absolute;right:0;bottom:0;width:62%;height:44%;background-image:linear-gradient(#022a4e 6px,transparent 6px),linear-gradient(90deg,#022a4e 6px,transparent 6px);background-size:46px 46px;opacity:.9"></div>
    ${Array.from({length:9},(_,i)=>`<div style="position:absolute;width:40px;height:40px;background:#6ec207;opacity:${0.35+0.07*i};left:${560+((i*67)%300)}px;top:${330+((i*41)%170)}px"></div>`).join('')}
  </div>
  <div style="margin-top:20px">${item('MARKETING + IA','El funnel ahora lo recorre un agente')}${item('TECNOLOGÍA + IA','Tu stack ya no se integra: se conversa')}${item('CREATIVIDAD + IA','Generar es gratis. El criterio, no')}${item('NEGOCIOS + IA','El precio que miente, el canal sin dueño')}${item('MODELOS','El barato ya alcanza al caro')}</div>
  </div>`;
}

// Marketing con Manzanitas en el portátil: una guía del blog
export function manzanitas(w,h){
  const line=(wd,o=1)=>`<div style="height:18px;width:${wd}%;border-radius:9px;background:#c9d2dc;opacity:${o};margin:16px 0"></div>`;
  return `<div style="width:${w}px;height:${h}px;background:#f7f8f6;font-family:Poppins;display:flex;flex-direction:column">
  <div style="height:88px;display:flex;align-items:center;padding:0 64px;border-bottom:1px solid #dde4ea;background:#fff"><img src="${svg(L+'manzanitas/manzanitas-logo-positive.svg')}" style="height:46px"><span style="margin-left:auto;display:flex;gap:40px;font:500 20px Poppins;color:#022a4e"><span>AEO</span><span>HubSpot</span><span>Loop</span><span>Growth</span></span></div>
  <div style="flex:1;display:grid;grid-template-columns:1fr 520px;gap:56px;padding:56px 64px">
    <div>
      <span style="display:inline-block;font:600 18px Poppins;letter-spacing:.1em;color:#fff;background:#0375db;padding:8px 16px;border-radius:8px">AEO · GUÍA</span>
      <div style="font:800 68px 'Bricolage Grotesque';color:#022a4e;line-height:1.04;margin-top:28px">¿Qué revisa una IA antes de recomendarte<span style="color:#0375db">?</span></div>
      <div style="font:400 24px Poppins;color:#4a6480;margin-top:24px">Cinco cosas, explicadas con manzanitas.</div>
      <div style="margin-top:28px">${line(96)}${line(88)}${line(92)}${line(60,.8)}</div>
    </div>
    <div style="background:#001a33;border-radius:28px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">
      <img src="${svg(L+'manzanitas/manzanitas-apple.svg')}" style="width:220px;filter:brightness(0) saturate(100%) invert(32%) sepia(97%) saturate(2400%) hue-rotate(196deg)">
      <div style="font:800 96px 'Bricolage Grotesque';color:#fff;line-height:1">5 cosas<span style="color:#0375db">.</span></div>
    </div>
  </div></div>`;
}
