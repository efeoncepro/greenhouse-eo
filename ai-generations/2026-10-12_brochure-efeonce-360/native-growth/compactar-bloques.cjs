const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const [compP,plateP,outP,movesJ]=process.argv.slice(2);const moves=JSON.parse(movesJ);
(async()=>{const W=1920,H=1080;
const comp=(await sharp(compP).removeAlpha().raw().toBuffer());
const pl=await sharp(plateP).resize(W,H,{fit:'cover'}).removeAlpha().raw().toBuffer();
const out=Buffer.from(comp);
const layers=[];
for(const m of moves){const {x0,y0,x1,y1,dy}=m;const L=[];for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*W+x)*3;let d=0;for(let c=0;c<3;c++)d=Math.max(d,Math.abs(comp[i+c]-pl[i+c]));if(d>3){const bg=Math.max(pl[i],pl[i+1],pl[i+2]);const a=Math.min(1,d/Math.max(40,255-bg));L.push([x,y+dy,a,comp[i],comp[i+1],comp[i+2],pl[i],pl[i+1],pl[i+2]]);}
 for(let c=0;c<3;c++)out[i+c]=pl[i+c];}layers.push(L);}
for(const L of layers)for(const [x,y,a,r,g,b,pr,pg,pb] of L){const i=(y*W+x)*3;// recover text colour: comp = a*t + (1-a)*bg_src  => t
 const t=[r,g,b].map((v,k)=>Math.max(0,Math.min(255,(v-(1-a)*[pr,pg,pb][k])/a)));for(let c=0;c<3;c++)out[i+c]=Math.round(a*t[c]+(1-a)*out[i+c]);}
await sharp(out,{raw:{width:W,height:H,channels:3}}).png().toFile(outP);console.log('ok');})();
