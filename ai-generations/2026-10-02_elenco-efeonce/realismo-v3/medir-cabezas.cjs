const sharp=require('sharp');const fs=require('fs');
const L=fs.readFileSync(process.argv[2],'utf8').trim().split('\n').map(JSON.parse);
(async()=>{for(const m of L){if(m.error){console.log(m.archivo.split('/').pop(),m.error);continue}
const {data,info}=await sharp(m.archivo).raw().toBuffer({resolveWithObject:true});const W=info.width,H=info.height,c=info.channels;
let pies=0;for(let y=H-1;y>H*0.5&&!pies;y--){let n=0;for(let x=Math.floor(W*0.2);x<W*0.8;x++){const i=(y*W+x)*c;if(data[i]>215&&data[i+1]>215&&data[i+2]>215)n++;}if(n>6)pies=y;}
const ec=m.menton-m.ojos;const cab=2*ec;const alto=pies-(m.ojos-ec);
console.log(m.archivo.split('/').pop().padEnd(24),'cabezas',(alto/cab).toFixed(2),'pies',pies,'de',H);}})()
