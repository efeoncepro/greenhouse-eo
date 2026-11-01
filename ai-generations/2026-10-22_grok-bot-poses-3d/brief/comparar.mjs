import sharp from 'sharp';
const [,, out, ...imgs] = process.argv;
const s = 700, tiles = await Promise.all(imgs.map(i => sharp(i).resize(s, s, {fit:'contain', background:'#E9E7E3'}).flatten({background:'#E9E7E3'}).png().toBuffer()));
await sharp({create:{width:s*tiles.length+20*(tiles.length+1), height:s+40, channels:3, background:'#ffffff'}})
  .composite(tiles.map((t,i)=>({input:t, left:20+i*(s+20), top:20}))).png().toFile(out);
