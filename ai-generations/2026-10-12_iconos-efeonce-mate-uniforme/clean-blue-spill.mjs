import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import sharp from 'sharp'
const root=path.dirname(fileURLToPath(import.meta.url));
const list=JSON.parse(await fs.readFile(path.join(root,'flat/selection.json'),'utf8'));
const out=path.join(root,'alpha/seedream-smooth-clean');await fs.mkdir(out,{recursive:true});
const stats=[];
for(const g of list){
 const src=await sharp(path.join(root,`seedream-smooth/${g.key}.png`)).removeAlpha().raw().toBuffer({resolveWithObject:true});
 const rgba=await sharp(path.join(root,`alpha/seedream-smooth/${g.key}.png`)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let removed=0,feathered=0;
 for(let i=0;i<src.info.width*src.info.height;i++){
  const d=src.data[i*3]-src.data[i*3+2]; // navy background/shadows have blue >= red; warm body and orange have red > blue.
  const keep=Math.max(0,Math.min(1,(d-2)/10));
  const a=rgba.data[i*4+3];rgba.data[i*4+3]=Math.round(a*keep);
  if(a>0&&rgba.data[i*4+3]===0)removed++;else if(a>rgba.data[i*4+3])feathered++;
 }
 await sharp(rgba.data,{raw:rgba.info}).png().toFile(path.join(out,g.key+'.png'));
 stats.push({icon:g.key,removedPixels:removed,featheredPixels:feathered});
}
await fs.writeFile(path.join(root,'blue-spill-cleanup.json'),JSON.stringify({scope:'derived alpha only; RGB retained; canonical key derivatives preserved separately',criterion:'source R-B: alpha 0 at <=2, linear feather to full at >=12; specific to warm body/orange on navy of this proof',stats},null,2)+'\n');
console.log(stats);
