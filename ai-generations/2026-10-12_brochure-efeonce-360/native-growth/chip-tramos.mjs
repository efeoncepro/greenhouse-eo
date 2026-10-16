import sharp from '/Users/jreye/Documents/greenhouse-eo/node_modules/sharp/lib/index.js';
const P=process.argv[2];
const cfg={C01:['#0375db',400,445],C02:['#ff6500',400,445],C03:['#f83902',490,516],C04:['#e86bd0',400,445],C05:['#36c8bf',400,445]};
for(const [k,[col,ya,yb]] of Object.entries(cfg)){
 const {data,info}=await sharp(`${P}/${k}.jpg`).raw().toBuffer({resolveWithObject:true});
 let x0=9999,x1=0,y0=9999,y1=0;for(let y=ya;y<yb;y++)for(let x=120;x<(k==="C03"?620:760);x++){const i=(y*info.width+x)*3;if(data[i]>160&&data[i+1]>160&&data[i+2]>160){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
 const padX=18,padY=11;const rx0=x0-padX,ry0=y0-padY,w=x1-x0+2*padX,h=y1-y0+2*padY;
 const svg=`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect x="${rx0}" y="${ry0}" width="${w}" height="${h}" rx="${h/2}" fill="none" stroke="${col}" stroke-width="2"/></svg>`;
 await sharp(`${P}/${k}.jpg`).composite([{input:Buffer.from(svg)}]).jpeg({quality:92,chromaSubsampling:'4:4:4'}).toFile(`${P}/${k}-chip.jpg`);
 console.log(k,{x0,x1,y0,y1});}
const comps=[];let i=0;for(const k of Object.keys(cfg)){comps.push({input:await sharp(`${P}/${k}-chip.jpg`).extract({left:80,top:cfg[k][1]-60,width:760,height:150}).toBuffer(),left:0,top:i*160});i++;}
await sharp({create:{width:760,height:800,channels:3,background:'#fff'}}).composite(comps).jpeg({quality:85}).toFile(`${P}/chips.jpg`);
