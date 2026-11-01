// Rótulo simple para explicar cada tramo de la secuencia en la previa.
const sharp = require('sharp')
const [txt, out] = process.argv.slice(2)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350"><rect x="30" y="1230" width="1020" height="90" rx="14" fill="rgba(0,0,0,.72)"/><text x="60" y="1290" font-family="Helvetica" font-size="40" font-weight="700" fill="#fff">${txt}</text></svg>`
sharp(Buffer.from(svg)).png().toFile(out)
