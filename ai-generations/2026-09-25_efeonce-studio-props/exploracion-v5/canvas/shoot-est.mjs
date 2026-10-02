import {chromium} from '/Users/jreye/Documents/greenhouse-eo/node_modules/playwright/index.mjs';import {readFileSync,mkdirSync} from 'node:fs';
const SP=process.argv[2],OUT=process.argv[3];mkdirSync(OUT,{recursive:true});
const map=eval('('+readFileSync(SP+'/shoot.mjs','utf8').match(/const map=(\{[\s\S]*?\});/)[1]+')');
const idx=JSON.parse(readFileSync(SP+'/canvas/estimulos/index.json','utf8'));const b=await chromium.launch();
for(const e of idx){let s=readFileSync(SP+'/canvas/estimulos/'+e.file,'utf8');for(const[k,v]of Object.entries(map)){const ext=v.split('.').pop();const mime=ext==='svg'?'image/svg+xml':ext==='jpg'?'image/jpeg':'image/png';if(s.includes(k))s=s.split(k).join('data:'+mime+';base64,'+readFileSync(SP+'/canvas/'+v).toString('base64'));}
 const head=s.match(/<helmet>([\s\S]*?)<\/helmet>/)[1];const body=s.split('</helmet>')[1].split('</x-dc>')[0];
 const pg=await b.newPage({viewport:{width:e.W,height:e.H}});await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${head}<style>body{margin:0}</style></head><body>${body}</body></html>`,{waitUntil:'networkidle'});await pg.evaluate(()=>document.fonts.ready);await pg.waitForTimeout(200);
 await pg.screenshot({path:OUT+e.file.replace('.html','.png')});await pg.close();}
await b.close();console.log('ok',idx.length);
