import sharp from 'sharp'
const {data,info}=await sharp(process.argv[2]).removeAlpha().raw().toBuffer({resolveWithObject:true});const W=info.width
const px=(x,y)=>{const i=(y*W+x)*3;return [data[i],data[i+1],data[i+2]]}
console.log('left edge (row: x1620..1632 G)');for(const y of [535,545,555,565,575,579,582])console.log(y,[...Array(13)].map((_,k)=>px(1620+k,y)[1]).join(' '))
console.log('top edge (col: y526..538 G)');for(const x of [1630,1640,1650,1660,1670,1675,1678])console.log(x,[...Array(13)].map((_,k)=>px(x,526+k)[1]).join(' '))
