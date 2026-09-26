import {chromium} from 'playwright';
import fs from 'node:fs';import path from 'node:path';import {spawn} from 'node:child_process';import {once} from 'node:events';
const v=path.dirname(new URL(import.meta.url).pathname),root=path.resolve(v,'../..');
const logo=fs.readFileSync(path.join(root,'kit/refs/logo-negative.svg'),'utf8');
const sky=fs.readFileSync(path.join(root,'kit/refs/sky-white.svg'),'utf8');
const url=fs.readFileSync('/Users/jreye/Documents/greenhouse-eo/src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg','utf8');
const b=await chromium.launch(),p=await b.newPage({viewport:{width:720,height:1280}});
await p.setContent(`<style>*{box-sizing:border-box}body{margin:0;background:#022a4e}#stage{width:1080px;height:1920px;transform:scale(.6666666667);transform-origin:0 0;position:absolute}#row{position:absolute;top:930px;left:138px;width:803px;display:flex;align-items:center;gap:44px}#eo{width:470px;flex:none}#sky{width:250px;flex:none}#bar{height:145px;width:5px;background:white;flex:none}svg{display:block;width:100%;height:auto}#url{position:absolute;width:420px;top:1382px;left:330px;opacity:.83}#url .cls-1{fill:#fff}#eo .cls-1{fill:#fff}</style><div id="stage"><div id="row"><div id="eo">${logo}</div><div id="bar"></div><div id="sky">${sky}</div></div><div id="url">${url}</div></div>`);
const enc=spawn('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','image2pipe','-framerate','24','-vcodec','mjpeg','-i','pipe:0','-an','-c:v','libx264','-crf','17','-preset','fast','-pix_fmt','yuv420p','-movflags','+faststart',path.join(v,'closing-official-5s.mp4')],{stdio:['pipe','inherit','inherit']});
for(let i=0;i<120;i++){
 const t=i/24,q=Math.max(0,Math.min(1,(t-2)/1.2)),a=q*q*(3-2*q);const c=[2,42,78].map((x,j)=>Math.round(x+([112,28,116][j]-x)*a));
 await p.evaluate(c=>document.body.style.background=`rgb(${c.join(',')})`,c);
 const bytes=await p.screenshot({type:'jpeg',quality:98});if(i===24)fs.writeFileSync(path.join(v,'finish/closing-blue-readable.jpg'),bytes);if(i===100)fs.writeFileSync(path.join(v,'finish/closing-purple-readable.jpg'),bytes);
 if(!enc.stdin.write(bytes))await once(enc.stdin,'drain');
}enc.stdin.end();await once(enc,'close');await b.close();
