const { chromium } = require('/Users/jreye/Documents/greenhouse-eo/node_modules/playwright');
(async()=>{const E=await import(process.cwd()+'/elementos.mjs');const b=await chromium.launch();const p=await b.newPage({viewport:{width:1600,height:1600},deviceScaleFactor:2});
await p.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600&display=swap"><style>body{margin:0;background:transparent}.e{display:inline-block;padding:40px;margin:10px}</style></head><body>
<div class="e" id="w-gauge">${E.gauge}</div><div class="e" id="w-pill">${E.pill}</div><div class="e" id="w-som">${E.som}</div><div class="e" id="w-motores">${E.motores}</div></body></html>`);
await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(600);
for(const id of ['gauge','pill','som','motores']){const el=await p.$('#w-'+id);await el.screenshot({path:`el-${id}.png`,omitBackground:true});}
// variantes sólo-texto para reponer (sin arcos ni barras), misma caja
await p.addStyleTag({content:'#gauge svg path{stroke:transparent!important} #motores [style*="height:18px"]{visibility:hidden}'});
await p.waitForTimeout(200);
for(const id of ['gauge','motores']){const el=await p.$('#w-'+id);await el.screenshot({path:`el-${id}-txt.png`,omitBackground:true});}
await b.close();console.log('ok')})();
