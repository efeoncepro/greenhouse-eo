const sharp=require('sharp')
const [src,out,x0,y0,x1,y1]=process.argv.slice(2)
;(async()=>{const {data,info}=await sharp(src).greyscale().raw().toBuffer({resolveWithObject:true})
const W=info.width,H=info.height
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const inR=x>=x0*W&&x<=x1*W&&y>=y0*H&&y<=y1*H;if(!inR)data[y*W+x]=0}
await sharp(data,{raw:{width:W,height:H,channels:1}}).png().toFile(out);console.log('ok',out)})()
