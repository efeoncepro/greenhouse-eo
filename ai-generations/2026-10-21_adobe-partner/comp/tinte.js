// node tinte.js <in> <out> <horizonteY>
const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [,,inp,out,hy]=process.argv;const HY=+hy;
(async()=>{const {data,info}=await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,ch=info.channels,red=[255,52,48],cob=[34,96,255];
for(let y=HY-210;y<H;y++){const d=y-HY;const w=Math.exp(-Math.pow(d/(d<0?60:150),2));if(w<0.01)continue;
 for(let x=0;x<W;x++){const t=x/(W-1);const center=Math.exp(-Math.pow((t-0.5)/0.12,2));
  const T=[0,1,2].map(i=>t<0.5? red[i]*(1-t*2)+255*(t*2) : 255*(1-(t-0.5)*2)+cob[i]*((t-0.5)*2));
  const k=0.6*w*(1-0.85*center);const i=(y*W+x)*ch;const L=0.2126*data[i]+0.7152*data[i+1]+0.0722*data[i+2];const mx=Math.max(...T);
  for(let c=0;c<3;c++){const tc=L*(T[c]/mx)*1.15;const bloom=T[c]*0.07*w*(1-center);data[i+c]=Math.min(255,Math.round(data[i+c]*(1-k)+tc*k+bloom));}}}
await sharp(data,{raw:info}).png().toFile(out)})()
