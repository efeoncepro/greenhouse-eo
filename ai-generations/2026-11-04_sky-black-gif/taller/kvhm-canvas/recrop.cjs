const sharp=require("/Users/jreye/Documents/greenhouse-eo/node_modules/sharp");const fs=require("fs");const S=__dirname,L=S+"/layers/";
(async()=>{const man=JSON.parse(fs.readFileSync(S+"/anim/manifest.json"));for(const n of process.argv.slice(2)){man[n]={};
for(const f of fs.readdirSync(L).filter(x=>x.startsWith(n+"__"))){const l=f.replace(".png","").split("__")[1];
if(l==="base"){await sharp(L+f).jpeg({quality:90,chromaSubsampling:"4:4:4"}).toFile(S+"/anim/"+n+"__base.jpg");man[n].base={file:n+"__base.jpg"};continue;}
const {data,info}=await sharp(L+f).ensureAlpha().raw().toBuffer({resolveWithObject:true});let x0=1e9,y0=1e9,x1=-1,y1=-1;
for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>0){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
const p=4;x0=Math.max(0,x0-p);y0=Math.max(0,y0-p);x1=Math.min(1079,x1+p);y1=Math.min(1349,y1+p);
await sharp(L+f).extract({left:x0,top:y0,width:x1-x0+1,height:y1-y0+1}).png({compressionLevel:9}).toFile(S+"/anim/"+f);man[n][l]={file:f,x:x0,y:y0,w:x1-x0+1,h:y1-y0+1};}
console.log(n,JSON.stringify(man[n].destino));}
fs.writeFileSync(S+"/anim/manifest.json",JSON.stringify(man,null,1));})();
