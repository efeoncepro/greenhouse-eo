import fs from 'node:fs';
import sharp from 'sharp';
const base='ai-generations/2026-11-05_glitch-flash-images-2-6/pruebas-propias';
const ids=['GF26-B','GF26-B-edit1','GF26-B-edit2'];
const files=await Promise.all(ids.map(async id=>{
 const {data,info}=await sharp(`${base}/plates/${id}.png`).removeAlpha().raw().toBuffer({resolveWithObject:true});
 return {id,data,info};
}));
const {width:W,height:H,channels:C}=files[0].info;
if(files.some(f=>f.info.width!==W||f.info.height!==H||f.info.channels!==C))throw Error('Mismatched native shapes');
// Same rectangle as the markup annotation, deliberately includes air around the target.
const target={left:970,top:463,width:350,height:238};
const within=(x,y,r)=>x>=r.left&&x<r.left+r.width&&y>=r.top&&y<r.top+r.height;
const rows=[];
for(const [a,b] of [[0,1],[1,2],[0,2]]){
 let outsideCount=0,changed=0,total=0,peak=0;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  if(within(x,y,target))continue;
  let max=0;
  for(let c=0;c<C;c++){
   const d=Math.abs(files[a].data[(y*W+x)*C+c]-files[b].data[(y*W+x)*C+c]);
   total+=d;max=Math.max(max,d);peak=Math.max(peak,d);
  }
  outsideCount++;if(max>8)changed++;
 }
 rows.push({from:ids[a],to:ids[b],outsideRectanglePixels:outsideCount,
   meanAbsoluteRgbDifferenceOutside:total/(outsideCount*C),
   pixelsWithAnyRgbChannelDifferenceAbove8:changed,
   percentOutsideWithAnyRgbChannelDifferenceAbove8:changed/outsideCount*100,maxChannelDifferenceOutside:peak});
}
const report={nativeSize:{width:W,height:H},targetRectangle:target,threshold:'8 levels on 8-bit RGB; diagnostic threshold chosen for this review, not a perceptual or identity score',
 note:'Raw provider files without alignment, mask recomposition, retouch or grade. Pixel differences do not by themselves establish visible or semantic drift. The rectangle includes surrounding pixels and is not a segmentation of the frame.',rows};
fs.writeFileSync(`${base}/pixel-comparison.json`,JSON.stringify(report,null,2)+'\n');
fs.mkdirSync(`${base}/qa`,{recursive:true});
const regions={face:{left:1240,top:160,width:360,height:350},frame:{left:950,top:435,width:390,height:300},mark:{left:1560,top:675,width:230,height:195}};
for(const [name,roi] of Object.entries(regions)){
 const crops=await Promise.all(ids.map(id=>sharp(`${base}/plates/${id}.png`).extract(roi).png().toBuffer()));
 await sharp({create:{width:roi.width*3,height:roi.height,channels:3,background:'#ffffff'}}).composite(crops.map((input,i)=>({input,left:roi.width*i,top:0}))).png().toFile(`${base}/qa/${name}-original-edit1-edit2.png`);
}
console.log(JSON.stringify(report,null,2));
