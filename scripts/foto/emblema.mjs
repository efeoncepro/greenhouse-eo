// pnpm foto:emblema <plate.png> [más plates...]
//
// Recorta y AMPLÍA las zonas donde puede haber un emblema bordado, y las escribe en una hoja para
// mirarlas. Existe porque el QA del emblema estaba escrito en el kit («inspect it at 100% before
// publishing»), se emitía en el prompt y aun así se omitió: el 2026-09-20 cinco piezas salieron con
// una espiral inventada en lugar del emblema de Efeonce, revisadas sobre una hoja de contacto de
// 520 px de alto donde un bordado no se lee.
//
// NO decide: un emblema no se valida por píxeles, se compara letra por letra contra el kit. Lo que
// hace es quitar la excusa de no haberlo mirado.
import path from 'node:path'

import sharp from 'sharp'

const files = process.argv.slice(2).filter(a => !a.startsWith('--'))

if (files.length === 0) {
  console.error(`
pnpm foto:emblema <plate.png> [más plates...]

Amplía las zonas donde vive un bordado (pecho, gorra, manga) y las junta en una hoja para mirarlas
al 100% y compáralo contra el kit. OJO, no todas las prendas llevan la misma marca:

  PECHO (polo, hoodie, chaquetas) → ISOTIPO: nave apuntando a la derecha con la nariz redondeada a la
    derecha y las dos aletas abajo a la izquierda, órbita elíptica con cortes, punto arriba, tres
    ventanas. SIN letras: si aparecen letras, está mal.
  GORRA (frente y lateral)        → LOGOTIPO: «efeonce» con la nave en el lugar de la «o». Algunas
    variantes de gorra llevan sólo el isotipo, y la trasera y la cenital NO llevan marca.

Una forma distinta de la que toca obliga a regenerar. El modelo NO reproduce la marca fiel: inventa
una parecida, la mueve, la agranda o la espeja, y a tamaño de feed pasa por buena.

Si el emblema no se sostiene, muestra la prenda donde no se lea —de espaldas, en sombra, pequeña—
en vez de publicar un logo inventado.
`)
  process.exit(1)
}

// Franjas donde suele caer un bordado en un retrato o plano medio. Son generosas a propósito:
// vale más recortar de más y mirar, que afinar y perderse el emblema.
const ZONAS = [
  ['pecho', 0.25, 0.45, 0.85, 0.85],
  ['cabeza', 0.2, 0.0, 0.85, 0.35]
]

const out = []

for (const file of files) {
  const m = await sharp(file).metadata()

  for (const [nombre, x0, y0, x1, y1] of ZONAS) {
    const buf = await sharp(file)
      .extract({
        left: Math.round(x0 * m.width),
        top: Math.round(y0 * m.height),
        width: Math.round((x1 - x0) * m.width),
        height: Math.round((y1 - y0) * m.height)
      })
      .resize({ height: 520, kernel: 'lanczos3' })
      .toBuffer()

    out.push({ buf, etiqueta: `${path.basename(file, '.png')} · ${nombre}` })
  }
}

const metas = await Promise.all(out.map(o => sharp(o.buf).metadata()))
let x = 0

const comps = out.map((o, i) => {
  const c = { input: o.buf, left: x, top: 0 }

  x += metas[i].width + 12

  return c
})

const destino = path.join(path.dirname(files[0]), 'emblemas-al-100.jpg')

await sharp({ create: { width: x - 12, height: 520, channels: 3, background: '#1a1a1a' } })
  .composite(comps)
  .jpeg({ quality: 95 })
  .toFile(destino)

console.log(`→ ${destino}`)
console.log(`  ${out.length} recortes de ${files.length} plate(s) — las zonas son FIJAS (pecho y cabeza), no`)
console.log('  detectan el bordado: si un recorte sale sin marca, es que ahí no había prenda, no un fallo.')
console.log('  MÍRALOS: el PECHO lleva ISOTIPO (nave, órbita, tres ventanas, SIN letras) y la GORRA de frente')
console.log('  lleva LOGOTIPO («efeonce» con la nave en la «o»). Una forma distinta obliga a regenerar.')
