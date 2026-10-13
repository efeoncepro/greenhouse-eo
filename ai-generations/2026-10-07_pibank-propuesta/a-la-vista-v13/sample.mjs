import sharp from 'sharp'
const {data,info}=await sharp(process.argv[2]).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width
const px=(x,y)=>{const i=(y*W+x)*3;return [data[i],data[i+1],data[i+2]]}
for(const [x,y] of [[1620,520],[1770,570],[1700,512],[1625,544],[1660,543],[1700,545],[1740,545],[1612,560]])console.log(x,y,px(x,y))
// darkest pixel in button interior
let d=[999,0,0,0];for(let y=525;y<565;y++)for(let x=1635;x<1760;x++){const p=px(x,y);const s=p[0]+p[1]+p[2];if(s<d[0])d=[s,x,y,p]}console.log('darkest',d)
