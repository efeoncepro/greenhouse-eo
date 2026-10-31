const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');const fs=require('fs'),path=require('path');
const dir=process.argv[2],out=process.argv[3];const files=fs.readdirSync(dir).filter(f=>/\.(png|jpg)$/.test(f)).sort();
const C=5,T=360,L=40,R=Math.ceil(files.length/C);
(async()=>{const comps=[];for(let i=0;i<files.length;i++){const x=(i%C)*T,y=Math.floor(i/C)*(T+L);
const img=await sharp(path.join(dir,files[i])).resize(T,T,{fit:'contain',background:'#F4F4F4'}).flatten({background:'#F4F4F4'}).toBuffer();
comps.push({input:img,left:x,top:y});
const label=files[i].replace(/\.(png|jpg)$/,'');
comps.push({input:Buffer.from(`<svg width="${T}" height="${L}"><rect width="100%" height="100%" fill="#1E2021"/><text x="10" y="26" font-family="Helvetica" font-size="17" fill="#fff">${label}</text></svg>`),left:x,top:y+T});}
await sharp({create:{width:C*T,height:R*(T+L)+60,channels:3,background:'#FFFFFF'}}).composite([...comps.map(c=>({...c,top:c.top+60})),{input:Buffer.from(`<svg width="${C*T}" height="60"><text x="12" y="40" font-family="Helvetica" font-size="26" font-weight="bold" fill="#001A33">Muse (Meta) · mascota «Jolly» (proyecto interno Hatch) · fuente oficial: bundle Muse.app 1.0</text></svg>`),left:0,top:0}]).png().toFile(out);console.log('ok',files.length);})();
