const fs=require('fs');const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
(async()=>{const b=await chromium.launch();
for(const f of process.argv.slice(2)){const p=await b.newPage({viewport:{width:1080,height:1350}});
fs.writeFileSync(__dirname+'/_t.html','<!doctype html><meta charset="utf-8">'+fs.readFileSync(__dirname+'/src2/KV X HM/'+f,'utf8').replace(/^<\?xml[^>]*>/,'').replace('<svg ','<svg width="1080" height="1350" '));
await p.goto('file://'+__dirname+'/_t.html');
const r=await p.evaluate(()=>[...document.querySelectorAll('text')].map(t=>{const q=t.getBoundingClientRect();return [t.textContent.trim().slice(0,40),Math.round(q.left),Math.round(q.top),Math.round(q.width),Math.round(q.height),t.getAttribute('font-size')||t.querySelector('tspan')?.getAttribute('font-size'),t.getAttribute('font-family')]}).filter(x=>x[2]>880&&x[2]<1240&&x[1]<560));
console.log(f,JSON.stringify(r));await p.close();}await b.close();})();
