// Hueco de tinta entre palabras, medido sobre los glifos REALES de la cadena completa: se recorre
// el shaping y se toma el borde derecho de la tinta anterior al espacio contra el borde izquierdo de
// la siguiente. Una versión previa de este medidor sumaba el avance del espacio dos veces y daba un
// factor imposible; por eso se mide glifo a glifo y no con aritmética de trozos.
import { createRequire } from 'node:module'
import { axisAdvertising } from '@efeoncepro/axis-tokens'

const require = createRequire(import.meta.url)
const fontkit = require('fontkit')
const bric = fontkit.openSync('/Users/jreye/Documents/greenhouse-eo/src/assets/fonts/BricolageGrotesque-Variable.ttf')
const R = axisAdvertising.recipes

export const huecosDePalabra = (texto, font, size, trackingEm, k = 1) => {
  const run = font.layout(texto)
  const scale = size / font.unitsPerEm
  let x = 0
  const huecos = []
  let derechaPrevia = null
  let pendiente = false

  run.glyphs.forEach((g, i) => {
    const p = run.positions[i]
    const esEspacio = g.codePoints?.[0] === 32
    const tieneTinta = g.bbox && g.bbox.maxX > g.bbox.minX

    if (tieneTinta) {
      const izq = x + p.xOffset * scale + g.bbox.minX * scale

      if (pendiente && derechaPrevia != null) { huecos.push(izq - derechaPrevia); pendiente = false }
      derechaPrevia = x + p.xOffset * scale + g.bbox.maxX * scale
    }
    if (esEspacio) pendiente = true
    x += p.xAdvance * scale * (esEspacio ? k : 1) + (i === run.glyphs.length - 1 ? 0 : trackingEm * size)
  })

  return huecos
}

if (process.argv[1].endsWith('medir-espacio.mjs')) {
  const casos = [
    ['«¿Claude o Codex?» aprobado', '¿Claude o Codex?', 96, 98],
    ['«todos te» GTA aprobado', 'todos te', 78, 200],
    ['«El oficio manda.» mía', 'El oficio manda.', 96, 108],
    ['«Se nota.» mía', 'Se nota.', 96, 225]
  ]

  console.log('caso                              cuerpo  huecos px          hueco/cuerpo')
  for (const [n, t, w, s] of casos) {
    const f = bric.getVariation({ wght: R.ideaImpact.weight, wdth: w, opsz: R.ideaImpact.opticalSize })
    const h = huecosDePalabra(t, f, s, Number.parseFloat(R.ideaImpact.tracking))

    console.log(`${n.padEnd(34)}${String(s).padEnd(8)}${h.map(x => Math.round(x)).join(' ').padEnd(19)}${h.map(x => (x / s).toFixed(3)).join(' ')}`)
  }

  console.log('\n«Se nota.» a 225 px por factor de espacio:')
  const f = bric.getVariation({ wght: R.ideaImpact.weight, wdth: 96, opsz: R.ideaImpact.opticalSize })

  for (const k of [1, 0.9, 0.8, 0.7, 0.6, 0.5]) {
    const h = huecosDePalabra('Se nota.', f, 225, Number.parseFloat(R.ideaImpact.tracking), k)

    console.log(`  factor ${String(k).padEnd(5)} hueco ${Math.round(h[0])}px = ${(h[0] / 225).toFixed(3)} del cuerpo`)
  }
}
