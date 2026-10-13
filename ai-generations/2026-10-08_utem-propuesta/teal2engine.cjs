const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [inp,out]=process.argv.slice(2);
function rgb2hsl(r,g,b){r/=255;g/=255;b/=255;const M=Math.max(r,g,b),m=Math.min(r,g,b);let h=0,s=0,l=(M+m)/2;if(M!==m){const d=M-m;s=l>0.5?d/(2-M-m):d/(M+m);h=M===r?(g-b)/d+(g<b?6:0):M===g?(b-r)/d+2:(r-g)/d+4;h*=60}return [h,s,l]}
function hsl2rgb(h,s,l){h/=360;const f=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p};if(s===0)return [l,l,l].map(v=>v*255);const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;return [f(p,q,h+1/3),f(p,q,h),f(p,q,h-1/3)].map(v=>Math.round(v*255))}
(async()=>{const {data,info}=await sharp(inp).removeAlpha().raw().toBuffer({resolveWithObject:true});let n=0;
for(let i=0;i<data.length;i+=3){const [h,s,l]=rgb2hsl(data[i],data[i+1],data[i+2]);if(h>=155&&h<=192&&s>0.18){const w=Math.min(1,(s-0.18)/0.15);const nh=h+(208-h)*w;const [r,g,b]=hsl2rgb(nh,s,l);data[i]=r;data[i+1]=g;data[i+2]=b;n++}}
await sharp(data,{raw:info}).png().toFile(out);console.log('recolored px',n)})();
