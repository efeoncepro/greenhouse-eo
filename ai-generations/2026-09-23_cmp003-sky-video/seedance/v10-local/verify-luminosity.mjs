import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { compositeLuminosity } from '../../../../scripts/creative/layout-compiler/compiler.mjs';
const D=path.dirname(new URL(import.meta.url).pathname);
const b=await chromium.launch(),p=await b.newPage({viewport:{width:1080,height:1920}});
await p.setContent(fs.readFileSync(D+'/overlay-preview.html','utf8'));
await p.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));document.body.classList.add('render');document.documentElement.style.setProperty('--scale','1')});
const evidence=[];
for(const [name,time]of [['blue',10.8],['purple',13.2]]){
 await p.evaluate(t=>{document.body.dataset.layer='text';renderFrame(t,true)},time);
 const backdropBytes=await p.screenshot();
 await p.evaluate(()=>document.body.dataset.layer='preview');
 const actual=await p.screenshot();
 const sourceBytes=await sharp(path.resolve(D,'../../kit/refs/url-lum.svg')).png().toBuffer();
 const result=await compositeLuminosity({backdropBytes,sourceBytes,left:230,top:1215,width:620,opacity:.72});
 if(result.evidence.method!=='non-separable-luminosity'||!result.evidence.visible)throw Error('Canonical blend evidence failed');
 const a=await sharp(actual).removeAlpha().raw().toBuffer(),c=await sharp(result.output).removeAlpha().raw().toBuffer();
 const base=await sharp(backdropBytes).removeAlpha().raw().toBuffer();let sampled=0,error=0,max=0;
 for(let y=1215;y<1338;y++)for(let x=230;x<850;x++){const k=(y*1080+x)*3;if(Math.abs(c[k]-base[k])+Math.abs(c[k+1]-base[k+1])+Math.abs(c[k+2]-base[k+2])<30)continue;for(let ch=0;ch<3;ch++){const d=Math.abs(a[k+ch]-c[k+ch]);sampled++;error+=d;max=Math.max(max,d);}}
 const mean=error/sampled;evidence.push({name,...result.evidence,comparedChannels:sampled,meanChannelError:mean,maxChannelError:max});
 if(!sampled||mean>3)throw Error('Browser blend differs from canonical compositor');
}
await b.close();fs.writeFileSync(D+'/qa/luminosity-check.json',JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
