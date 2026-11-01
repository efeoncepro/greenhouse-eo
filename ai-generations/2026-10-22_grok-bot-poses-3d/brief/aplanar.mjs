import sharp from 'sharp';
const [,, inp, out, bg] = process.argv;
await sharp(inp).resize(1600,1600,{fit:'contain',background:bg}).flatten({background:bg}).png().toFile(out);
