// Compone los elementos del informe sobre la escena con perspectiva y brillo. Sale la composición y la capa sola (alfa) para reponer.
const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [plate,out,layout]=process.argv.slice(2);
(async()=>{const m=await sharp(plate).metadata();const W=m.width,H=m.height;const L=JSON.parse(require('fs').readFileSync(layout,'utf8'));
const el=(f,c)=>`<img src="file://${process.cwd()}/${f}" style="position:absolute;left:${c.x*W}px;top:${c.y*H}px;width:${c.w*W}px;transform:perspective(${W*1.6}px) rotateY(${c.ry??-16}deg) rotateX(${c.rx??2}deg);transform-origin:50% 50%;opacity:${c.op??1};filter:drop-shadow(0 0 ${W*0.012}px rgba(170,205,255,.55)) drop-shadow(0 0 ${W*0.03}px rgba(90,150,255,.35))${c.blur?` blur(${c.blur}px)`:''}">`;
const layer=L.map(c=>el(c.f,c)).join('');
const html=(bg)=>`<!doctype html><html><body style="margin:0;background:transparent"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden">${bg?`<img src="file://${plate}" style="position:absolute;inset:0;width:${W}px;height:${H}px">`:''}${layer}</div></body></html>`;
const b=await chromium.launch();const p=await b.newPage({viewport:{width:W,height:H}});
require('fs').writeFileSync(out+'.bg.html',html(true));await p.goto('file://'+out+'.bg.html');await p.waitForTimeout(500);await p.screenshot({path:out});
require('fs').writeFileSync(out+'.capa.html',html(false));await p.goto('file://'+out+'.capa.html');await p.waitForTimeout(500);await p.screenshot({path:out.replace(/\.png$/,'-capa.png'),omitBackground:true});
const exact=L.map(c=>el(c.f,{...c,blur:0}).replace(/filter:[^;"]*/,'filter:none')).join('');require('fs').writeFileSync(out+'.exacta.html',`<!doctype html><html><body style="margin:0;background:transparent"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden">${exact}</div></body></html>`);await p.goto('file://'+out+'.exacta.html');await p.waitForTimeout(400);await p.screenshot({path:out.replace(/\.png$/,'-exacta.png'),omitBackground:true});
await b.close();console.log('ok',out)})();
