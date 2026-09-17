// Boceto de composición 9:16 (1152×2048) para guiar el plate nativo: escala y posición del sujeto, espacio de titular,
// Clawd apoyado en el hombro y escritorio en primer plano. Formas planas; el modelo sólo toma encuadre de aquí.
import path from 'node:path'
import sharp from 'sharp'

const DIR = path.dirname(new URL(import.meta.url).pathname)
const W = 1152
const H = 2048
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0f2744"/>
  <rect x="0" y="0" width="120" height="1600" fill="#9fb4c8"/><rect x="100" y="0" width="22" height="1600" fill="#111a24"/>
  <rect x="1032" y="0" width="120" height="1600" fill="#9fb4c8"/><rect x="1030" y="0" width="22" height="1600" fill="#111a24"/>
  <!-- torso con hoodie -->
  <path d="M 330 860 Q 576 790 822 860 L 850 1600 L 302 1600 Z" fill="#1f3fd1"/>
  <!-- brazos en encogimiento, palmas arriba -->
  <path d="M 340 900 L 250 1180 L 210 1130 L 300 870 Z" fill="#1f3fd1"/><ellipse cx="205" cy="1120" rx="70" ry="26" fill="#c99a7c"/>
  <path d="M 812 900 L 902 1180 L 942 1130 L 852 870 Z" fill="#1f3fd1"/><ellipse cx="947" cy="1120" rx="70" ry="26" fill="#c99a7c"/>
  <!-- cuello, pelo y cabeza girada hacia su hombro derecho (izquierda del cuadro) -->
  <rect x="540" y="760" width="72" height="90" fill="#c99a7c"/>
  <path d="M 470 600 Q 560 520 670 590 L 700 900 L 450 900 Z" fill="#241a14"/>
  <ellipse cx="566" cy="690" rx="88" ry="112" fill="#c99a7c"/>
  <!-- Clawd apoyado sobre el hombro derecho de ella, con «?» -->
  <rect x="330" y="700" width="170" height="150" fill="#d77757"/>
  <rect x="300" y="740" width="30" height="60" fill="#d77757"/><rect x="500" y="740" width="30" height="60" fill="#d77757"/>
  <rect x="345" y="850" width="24" height="30" fill="#d77757"/><rect x="385" y="850" width="24" height="30" fill="#d77757"/>
  <rect x="425" y="850" width="24" height="30" fill="#d77757"/><rect x="465" y="850" width="24" height="30" fill="#d77757"/>
  <rect x="395" y="600" width="60" height="22" fill="#d77757"/><rect x="433" y="622" width="22" height="30" fill="#d77757"/><rect x="410" y="662" width="22" height="22" fill="#d77757"/>
  <!-- escritorio y laptop en primer plano -->
  <rect x="0" y="1600" width="${W}" height="448" fill="#16233a"/><rect x="0" y="1600" width="${W}" height="40" fill="#22314d"/>
  <rect x="300" y="1660" width="552" height="46" rx="8" fill="#2a2f38"/>
</svg>`
await sharp(Buffer.from(svg)).png().toFile(path.join(DIR, 'layout-sketch.png'))
console.log('sketch ok')
