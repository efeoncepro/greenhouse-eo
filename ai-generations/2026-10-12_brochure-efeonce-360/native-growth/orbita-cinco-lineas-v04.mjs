import fs from 'node:fs';
const S=process.argv[2];const ID="'Bricolage Grotesque', system-ui, sans-serif", ST="'Poppins', system-ui, sans-serif";
const BUB='file:///Users/jreye/Documents/greenhouse-eo/node_modules/@efeoncepro/axis-brand-assets/assets/url-bubble-baked-dark.svg';
const cx=1185,cy=590,rx=440,ry=240;
const items=[['01','Te encuentran','Engine','#0375db'],['02','Te recuerdan','Brand','#ff6500'],['03','Llegas a quien compra','Voice','#f83902'],['04','Te compran','Revenue','#e86bd0'],['05','Lo mides','Growth','#36c8bf']];
const ang=[-126,-54,18,90,162];
const hex=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));const mix=(a,b,t)=>{const A=hex(a),B=hex(b);return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`};
const P=a=>[cx+rx*Math.cos(a),cy+ry*Math.sin(a)];
let seed=7;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
// ring segments colored between line accents; front (lower half) thicker/brighter
let ring='',ringGlow='';const N=240;
for(let k=0;k<N;k++){const d0=-126+k*360/N,d1=d0+360/N+0.4;const seg=Math.floor(((d0+126)%360+360)%360/72),t=(((d0+126)%360+360)%360-seg*72)/72;
 const c=mix(items[seg][3],items[(seg+1)%5][3],t);const a0=d0*Math.PI/180,a1=d1*Math.PI/180;const [x0,y0]=P(a0),[x1,y1]=P(a1);const depth=(Math.sin((a0+a1)/2)+1)/2;
 const w=2.2+depth*5,op=0.35+depth*0.65;
 ring+=`<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${rx},${ry} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${c}" stroke-width="${w.toFixed(1)}" stroke-opacity="${op.toFixed(2)}" fill="none" stroke-linecap="butt"/>`;
 ringGlow+=`<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${rx},${ry} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${c}" stroke-width="${(10+depth*22).toFixed(1)}" stroke-opacity="${(0.25+depth*0.35).toFixed(2)}" fill="none"/>`;}
// comet trails behind each sphere (counter-clockwise behind direction of travel)
let trails='';items.forEach(([,,,c],i)=>{const steps=30;for(let s=0;s<steps;s++){const d0=ang[i]-34+s*34/steps,d1=d0+34/steps+0.3;const [x0,y0]=P(d0*Math.PI/180),[x1,y1]=P(d1*Math.PI/180);const t=s/steps;const depth=(Math.sin(ang[i]*Math.PI/180)+1)/2;
 trails+=`<path d="M${x0.toFixed(1)},${y0.toFixed(1)} A${rx},${ry} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)}" stroke="${c}" stroke-width="${(3+t*(10+depth*8)).toFixed(1)}" stroke-opacity="${(t*t*0.95).toFixed(2)}" fill="none" stroke-linecap="round"/>`;}});
let grads='',spheres='',labels='';
items.forEach(([n,m,l,c],i)=>{grads+=`<radialGradient id="sph${i}" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.28" stop-color="${c}" stop-opacity="0.9"/><stop offset="0.85" stop-color="${c}"/><stop offset="1" stop-color="${mix(c,'#000814',0.45)}"/></radialGradient><radialGradient id="glow${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.85"/><stop offset="0.45" stop-color="${c}" stop-opacity="0.25"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
 const a=ang[i]*Math.PI/180;const [x,y]=P(a);const depth=(Math.sin(a)+1)/2;const r=26+depth*20;
 spheres+=`<circle cx="${x}" cy="${y}" r="${r*3.6}" fill="url(#glow${i})" opacity="${0.6+depth*0.4}"/><ellipse cx="${x}" cy="${y+r*0.95}" rx="${r*0.9}" ry="${r*0.22}" fill="#000814" opacity="0.35"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#sph${i})"/>`;
 const cs=Math.cos(a),sn=Math.sin(a);const big=m.length>16;const fs2=big?30:36;const w=big?250:300;
 let style;if(Math.abs(cs)>0.35){const ax=x+cs*(r+34),ay=y+sn*(r*0.6)+(sn<0?-34:10);style=cs>0?`left:${ax}px;text-align:left;`:`left:${ax-w}px;text-align:right;`;style+=`top:${ay-40}px;`;}
 else{style=`left:${x-w/2}px;text-align:center;top:${y+r+26}px;`;}
 labels+=`<div style="position:absolute;${style}width:${w}px;font-family:${ID}"><div style="font-family:${ST};font-size:15px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;color:${c}">${n} · ${l}</div><div style="margin-top:6px;font-size:${fs2}px;font-weight:760;letter-spacing:-0.025em;line-height:1.02;color:#fff;text-shadow:0 0 24px rgba(0,8,20,0.9)">${m}</div></div>`;});
let dust='';for(let k=0;k<160;k++){const a=rnd()*Math.PI*2,rr=0.55+rnd()*0.9;const x=cx+Math.cos(a)*rx*rr*1.15,y=cy+Math.sin(a)*ry*rr*1.3;if(x<700)continue;dust+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6+rnd()*1.8).toFixed(2)}" fill="#cfeffc" opacity="${(0.12+rnd()*0.45).toFixed(2)}"/>`;}
const html=`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,200..800&family=Poppins:wght@300;400;500;600&display=swap"><style>body{margin:0}b{font-weight:600}</style></head><body>
<div style="position:relative;width:1920px;height:1080px;overflow:hidden;background:#001a33">
<svg width="1920" height="1080" viewBox="0 0 1920 1080" style="position:absolute;inset:0"><defs>
<radialGradient id="halo" cx="${cx}" cy="${cy}" r="900" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#1b4f7a" stop-opacity="0.75"/><stop offset="0.45" stop-color="#0a3358" stop-opacity="0.35"/><stop offset="1" stop-color="#001a33" stop-opacity="0"/></radialGradient>
<radialGradient id="core" cx="${cx}" cy="${cy}" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffffff" stop-opacity="0.38"/><stop offset="0.25" stop-color="#9fe9f5" stop-opacity="0.22"/><stop offset="1" stop-color="#36c8bf" stop-opacity="0"/></radialGradient>
<radialGradient id="pool" cx="${cx}" cy="${cy+300}" r="420" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 ${cy+300}) scale(1 0.18) translate(0 ${-(cy+300)})"><stop offset="0" stop-color="#72ded8" stop-opacity="0.35"/><stop offset="1" stop-color="#72ded8" stop-opacity="0"/></radialGradient>
<linearGradient id="vig" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#001a33" stop-opacity="1"/><stop offset="0.24" stop-color="#001a33" stop-opacity="0.7"/><stop offset="0.35" stop-color="#001a33" stop-opacity="0"/></linearGradient>
${grads}<filter id="b1"><feGaussianBlur stdDeviation="10"/></filter><filter id="b2"><feGaussianBlur stdDeviation="26"/></filter><filter id="b3"><feGaussianBlur stdDeviation="3"/></filter></defs>
<rect width="1920" height="1080" fill="url(#halo)"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx*1.32}" ry="${ry*1.32}" fill="none" stroke="#9fd7f0" stroke-opacity="0.10" stroke-width="1.5" stroke-dasharray="2 10"/>
<ellipse cx="${cx}" cy="${cy}" rx="${rx*0.62}" ry="${ry*0.62}" fill="none" stroke="#9fd7f0" stroke-opacity="0.12" stroke-width="1.2"/>
${dust}
<rect y="${cy+250}" width="1920" height="${1080-cy-250}" fill="url(#pool)"/>
<ellipse cx="${cx}" cy="${cy}" rx="300" ry="170" fill="url(#core)"/>
<circle cx="${cx}" cy="${cy-6}" r="9" fill="#ffffff" filter="url(#b3)" opacity="0.0"/>
<g filter="url(#b2)">${ringGlow}</g><g filter="url(#b1)" opacity="0.8">${ring}</g>${ring}
<g filter="url(#b1)" opacity="0.7">${trails}</g>${trails}
${spheres}
<rect width="1920" height="1080" fill="url(#vig)"/>
</svg>
<div style="position:absolute;left:${cx-220}px;top:${cy-56}px;width:440px;text-align:center"><div style="font-family:${ID};font-size:68px;font-weight:780;letter-spacing:-0.04em;line-height:1;color:#fff;text-shadow:0 0 40px rgba(114,222,216,0.45)">Tu cliente</div><div style="margin-top:10px;font-family:${ST};font-size:15px;font-weight:500;letter-spacing:0.18em;text-transform:uppercase;color:#bfe9f0">al centro de la vuelta</div></div>
${labels}
<div style="position:absolute;left:140px;top:120px;width:600px;display:flex;flex-direction:column">
<div style="font-family:${ST};font-size:16px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#e2e2e2">Cinco momentos, un equipo</div>
<div style="margin-top:64px;font-family:${ID};font-size:92px;font-weight:760;letter-spacing:-0.045em;line-height:0.94;color:#fff">Una vuelta,<br>cinco líneas,<br>un equipo<span style="display:inline-block;width:0.2em;height:0.2em;border-radius:50%;background:#36c8bf;margin-left:0.04em"></span></div>
<div style="margin-top:44px;font-family:${ST};font-size:24px;font-weight:300;line-height:1.45;color:#fff;max-width:470px">Cada momento de la vuelta tiene su línea de servicio. Las cinco las opera el mismo equipo, con <b>un solo</b> interlocutor.</div></div>
<img src="${BUB}" style="position:absolute;left:135px;top:990px;width:162px;height:38px">
</div></body></html>`;
fs.writeFileSync(`${S}/v9/html/V04b.html`,html);console.log('ok');
