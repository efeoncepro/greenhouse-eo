const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');const fs=require('fs');const path=require('path');
const root=process.argv[2];const files=[];(function w(d){for(const f of fs.readdirSync(d)){const p=path.join(d,f);if(fs.statSync(p).isDirectory()){if(f!=='scripts')w(p)}else if(/\.(png|jpg)$/.test(f))files.push(p)}})(root);
(async()=>{for(const f of files){const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width,H=info.height,C=info.channels;
const lum=(x,y)=>{const i=(y*W+x)*C;return (data[i]+data[i+1]+data[i+2])/3};
const out=[];
for(const e of ['b','t','l','r']){const L=(e=='b'||e=='t')?W:H;let worst=0;for(let k=0;k<6;k++){let bright=0;for(let j=0;j<L;j++){const [x,y,xi,yi]=e=='b'?[j,H-1-k,j,H-12]:e=='t'?[j,k,j,11]:e=='l'?[k,j,11,j]:[W-1-k,j,W-12,j];if(lum(x,y)-lum(xi,yi)>25)bright++}if(bright/L>0.6)worst=k+1}if(worst)out.push(e+'='+worst+'px')}
if(out.length)console.log(path.relative(root,f),W+'x'+H,out.join(' '))}})();
