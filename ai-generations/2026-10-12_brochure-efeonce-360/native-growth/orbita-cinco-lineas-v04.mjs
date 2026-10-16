import fs from 'node:fs';
const S=process.argv[2];const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const cx=1230,cy=590,rx=470,ry=235;
const items=[['01','Te encuentran','Engine','#0375db'],['02','Te recuerdan','Brand','#ff6500'],['03','Le hablas a quien compra','Voice','#f83902'],['04','Te compran','Revenue','#e86bd0'],['05','Lo mides','Growth','#36c8bf']];
let grads='';
const ang=[-90,-18,54,126,198];
let spheres='',labels='';
items.forEach(([n,m,l,c],i)=>{grads+=`<radialGradient id="sph${i}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="${c}" stop-opacity="0.85"/><stop offset="1" stop-color="${c}"/></radialGradient><radialGradient id="glow${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.75"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;const a=ang[i]*Math.PI/180;const x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);const depth=(Math.sin(a)+1)/2;const r=20+depth*16;
 spheres+=`<circle cx="${x}" cy="${y}" r="${r*2.6}" fill="url(#glow${i})" opacity="${0.55+depth*0.35}"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sph${i})"/>`;
 const dx=Math.cos(a),dy=Math.sin(a);const w=260;let left,top,anchor='center';
 if(dy>0.5){left=x-w/2;top=y+r+22;}else{left=x-w/2;top=y-r-(m.length>16?118:92);}
 labels+=`<div style="position:absolute;left:${left}px;top:${top}px;width:${w}px;text-align:${anchor};font-family:${ID}">
<div style="font-family:${ST};font-size:15px;font-weight:500;letter-spacing:0.16em;text-transform:uppercase;color:${c}">${n} · ${l}</div>
<div style="margin-top:6px;font-size:${m.length>16?28:34}px;font-weight:740;letter-spacing:-0.02em;line-height:1.05;color:#fff">${m}</div></div>`;});
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0">
<defs>
<radialGradient id="halo" cx="${cx}" cy="${cy}" r="820" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#72ded8" stop-opacity="0.30"/><stop offset="0.4" stop-color="#36c8bf" stop-opacity="0.10"/><stop offset="1" stop-color="#36c8bf" stop-opacity="0"/></radialGradient>
<linearGradient id="floor" x1="0" y1="778" x2="0" y2="1080" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000814" stop-opacity="0"/><stop offset="1" stop-color="#000814" stop-opacity="0.55"/></linearGradient>
<linearGradient id="ring" x1="${cx-rx}" y1="0" x2="${cx+rx}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#72ded8" stop-opacity="0.95"/><stop offset="0.5" stop-color="#36c8bf" stop-opacity="0.55"/><stop offset="1" stop-color="#72ded8" stop-opacity="0.95"/></linearGradient>
<radialGradient id="sph" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#9ff1ea"/><stop offset="1" stop-color="#1f9e94"/></radialGradient>
<radialGradient id="glow"><stop offset="0" stop-color="#72ded8" stop-opacity="0.8"/><stop offset="1" stop-color="#72ded8" stop-opacity="0"/></radialGradient>
<radialGradient id="core" cx="${cx}" cy="${cy}" r="230" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#72ded8" stop-opacity="0.28"/><stop offset="1" stop-color="#72ded8" stop-opacity="0"/></radialGradient>
${grads}<filter id="blur"><feGaussianBlur stdDeviation="9"/></filter><filter id="blur2"><feGaussianBlur stdDeviation="22"/></filter>
</defs>
<rect width="1920" height="1080" fill="url(#halo)"/><rect y="778" width="1920" height="302" fill="url(#floor)"/>
<ellipse cx="${cx}" cy="${cy+395}" rx="${rx*0.9}" ry="48" fill="none" stroke="#72ded8" stroke-opacity="0.18" stroke-width="2"/>
<ellipse cx="${cx}" cy="${cy}" rx="230" ry="110" fill="url(#core)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="#72ded8" stroke-opacity="0.55" stroke-width="26" filter="url(#blur2)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="url(#ring)" stroke-width="5" filter="url(#blur)" opacity="0.9"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" stroke="url(#ring)" stroke-width="4"/>
${spheres}
</svg>
<div style="position:absolute;left:${cx-200}px;top:${cy-46}px;width:400px;text-align:center"><div style="font-family:${ID};font-size:52px;font-weight:760;letter-spacing:-0.035em;color:#fff">Tu cliente</div><div style="margin-top:4px;font-family:${ST};font-size:18px;font-weight:300;color:#cfe4fa">al centro de la vuelta</div></div>
${labels}
<div style="position:absolute;left:140px;top:120px;width:600px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Cinco momentos, un equipo</div>
<div style="margin-top:64px;font-family:${ID};font-size:92px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">Una vuelta,<br>cinco líneas,<br>un equipo<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36c8bf;margin-left:0.04em"></span></div>
<div style="margin-top:44px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:500px">Cada momento de la vuelta tiene su línea de servicio. Las cinco las opera el mismo equipo, con <b>un solo</b> interlocutor.</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;
fs.writeFileSync(`${S}/v9/html/V04.html`,html);console.log('ok');
