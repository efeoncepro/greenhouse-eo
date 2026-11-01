const sharp=require('/Users/jreye/Documents/greenhouse-eo/node_modules/sharp');
const f=process.argv[2];
(async()=>{const {data,info}=await sharp(f).removeAlpha().raw().toBuffer({resolveWithObject:true});
const W=info.width,H=info.height,px=(x,y)=>{const i=(y*W+x)*3;return[data[i],data[i+1],data[i+2]]};
const bg=px(5,5);let x0=W,y0=H,x1=0,y1=0;
for(let y=0;y<H;y++)for(let x=0;x<W;x++){const p=px(x,y);const d=Math.max(...p.map((v,k)=>Math.abs(v-bg[k])));if(d>22){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
const hex=p=>'#'+p.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
const avg=(cx,cy,r)=>{let s=[0,0,0],n=0;for(let y=cy-r;y<=cy+r;y++)for(let x=cx-r;x<=cx+r;x++){const p=px(x,y);s=s.map((v,k)=>v+p[k]);n++}return hex(s.map(v=>Math.round(v/n)))};
console.log(JSON.stringify({size:[W,H],bg:hex(bg),bbox:[x0,y0,x1,y1],w:x1-x0,h:y1-y0}));
const pts=JSON.parse(process.argv[3]||'{}');for(const[k,[x,y,r]]of Object.entries(pts))console.log(k,avg(x,y,r||4));
// scan horizontal row through face center to find face edges (lighter/smoother skin vs fur)
})();
