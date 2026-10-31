// Máscara del cuadro inicial nuevo sobre el plano 11a (1024x1280). Blanco = editable.
// Abre la zona del agua (mesa entre el portátil y Paula, y el aire donde estaba el rocío) y protege la cara y el pelo de
// Paula, sus dos manos, la tapa y la base del portátil, el hombro de Antonio y el borde derecho.
const sharp = require('sharp')
const W = 1024, H = 1280
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="100%" height="100%" fill="black"/>
  <polygon points="0,700 0,560 120,520 230,470 300,430 520,430 560,330 700,290 930,290 930,560 952,650 1024,700 900,740 786,800 786,1000 0,1010" fill="white"/>
  <ellipse cx="385" cy="300" rx="115" ry="150" fill="black"/>
  <rect x="225" y="430" width="115" height="150" rx="20" fill="black"/>
  <polygon points="406,802 786,802 786,1070 374,1070 374,996 406,996" fill="black"/>
</svg>`
;(async () => {
  await sharp(Buffer.from(svg)).grayscale().blur(5).png().toFile('mascara-11a.png')
})()
