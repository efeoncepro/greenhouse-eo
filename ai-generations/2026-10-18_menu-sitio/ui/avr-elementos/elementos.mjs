// Elementos del AI Visibility Report recreados sueltos (no recortes): tokens del informe (report-tokens.ts), Geist, isotipos oficiales.
import fs from 'node:fs';
const logo=(n)=>'data:image/svg+xml;base64,'+fs.readFileSync('/Users/jreye/Documents/efeonce-think/public/logos/engines/'+n+'.svg').toString('base64');
const A={accent:'#0375db',warning:'#ffb703',warning700:'#8a6300'};
// datos del informe de ejemplo oficial (SAMPLE_PUBLIC_REPORT, marca ficticia Nórtica)
const score=63, somV=71, engines=[['chatgpt','ChatGPT',18],['gemini','Gemini',19],['claude','Claude',17],['perplexity','Perplexity',14]];
const R=90, CIRC=Math.PI*R, dash=CIRC*score/100;
export const gauge=`<div id="gauge" style="position:relative;width:660px;height:400px">
 <svg viewBox="0 0 220 128" style="width:660px;height:auto;overflow:visible"><path d="M 18 114 A 90 90 0 0 1 202 114" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="15" stroke-linecap="round"/>
 <path d="M 18 114 A 90 90 0 0 1 202 114" fill="none" stroke="${A.warning}" stroke-width="15" stroke-linecap="round" stroke-dasharray="${dash} ${CIRC}"/></svg>
 <div style="position:absolute;left:0;right:0;bottom:6px;text-align:center;font:600 196px/1 Geist;color:#fff;font-variant-numeric:tabular-nums;letter-spacing:-0.03em">${score}</div></div>`;
export const pill=`<div id="pill" style="display:inline-block;padding:18px 40px;border-radius:999px;background:${A.warning};font:600 46px/1 Geist;color:#fff">Atención</div>`;
export const som=`<div id="som" style="display:flex;flex-direction:column;align-items:flex-start;gap:6px"><span style="font:600 30px/1 Geist;letter-spacing:.14em;color:rgba(255,255,255,.72)">SHARE OF MODEL</span><span style="font:600 200px/0.95 Geist;color:#fff;letter-spacing:-0.04em;font-variant-numeric:tabular-nums">${somV}<span style="font-size:96px;color:rgba(255,255,255,.7)">%</span></span></div>`;
export const motores=`<div id="motores" style="display:flex;flex-direction:column;gap:34px;width:760px">${engines.map(([k,n,v])=>`<div style="display:flex;align-items:center;gap:26px">
 <span style="width:72px;height:72px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;flex:none"><img src="${logo(k)}" style="width:44px;height:44px"></span>
 <div style="flex:1;height:18px;border-radius:9px;background:rgba(255,255,255,.16)"><div style="width:${v/24*100}%;height:100%;border-radius:9px;background:${A.accent};box-shadow:0 0 18px rgba(3,117,219,.9)"></div></div>
 <span style="width:120px;text-align:right;font:600 44px/1 Geist;color:#fff;font-variant-numeric:tabular-nums">${v}/24</span></div>`).join('')}</div>`;
