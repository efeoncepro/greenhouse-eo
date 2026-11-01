import sharp from 'sharp';
const [,, out, ...imgs] = process.argv; const s=600;
const tiles = await Promise.all(imgs.map(i => sharp(i).resize(s,s,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer()));
const W = s*tiles.length+20*(tiles.length+1);
const fondo = (c) => sharp({create:{width:W,height:s+40,channels:4,background:c}}).composite(tiles.map((t,i)=>({input:t,left:20+i*(s+20),top:20}))).png().toBuffer();
const [a,b] = await Promise.all([fondo('#001a33'), fondo('#f7f8f6')]);
await sharp({create:{width:W,height:(s+40)*2,channels:4,background:'#ffffff'}}).composite([{input:a,top:0,left:0},{input:b,top:s+40,left:0}]).png().toFile(out);
