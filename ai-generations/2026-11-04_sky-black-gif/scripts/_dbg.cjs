const fs=require('fs');const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage();
const s=fs.readFileSync(process.argv[2],'utf8').replace(/^<\?xml[^>]*>/,'');fs.writeFileSync(__dirname+'/_d.html','<!doctype html>'+s);await p.goto('file://'+__dirname+'/_d.html');
console.log(await p.evaluate(()=>{const svg=document.querySelector('svg');const fr=[...svg.querySelectorAll('path')].filter(p=>/^M[\d.]+,[\d.]+h-[\d.]+c-10\.21/.test(p.getAttribute('d')||''));
return {fr:fr.map(f=>{const bb=f.getBBox();return [bb.x,bb.y,bb.width,bb.height]}), texts:[...svg.querySelectorAll('text')].slice(0,4).map(t=>[t.textContent,t.getBBox().y])}}));await b.close();})();
