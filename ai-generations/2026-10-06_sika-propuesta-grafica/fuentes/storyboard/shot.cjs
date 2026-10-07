const {chromium}=require('playwright');const F=process.argv[2];
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1080,height:1920}});
for(const k of ['01','02','03','04','05','06','07','08']){await p.goto('file://'+F+'/html/'+k+'.html');await p.waitForTimeout(700);await p.screenshot({path:F+'/f'+k+'.png'});}
await b.close();})();
