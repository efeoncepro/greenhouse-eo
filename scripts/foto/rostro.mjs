// pnpm foto:rostro <imagen.png> [...] [--persona <clave>] [--canon 0.81] [--tolerancia 0.02]
//
// Mide la PROPORCIÓN del rostro con Vision (macOS) y avisa si el modelo lo afinó o lo ensanchó respecto del canon de la
// persona [operador, 2026-10-03: «le alarga o achata la cara al ancho, poniéndola excesivamente fina, eso le quita
// realismo»]. La medida es largo/ancho: ojos→mentón sobre el ancho del contorno de la mandíbula, que no depende de la
// escala. El canon sale de `rostro` en la persona del catálogo (`PERSONAS`/`ELENCO`) o de `--canon`.
//
// Sólo juzga caras casi frontales (|giro| ≤ 0,15): con giro, el ancho aparente baja por perspectiva y la medida no
// compara. Una boca ABIERTA (risa, sorpresa) alarga la cara de verdad: se informa y no compara. La línea de los ojos
// sale del contorno de cada ojo, no de la pupila, para que la mirada no corra la medida. Límite conocido: con los ojos
// en blanco (hartazgo) el párpado sube y la cara mide ≈ +0,03 más larga sin estarlo; se mira a ojo.
// Sale con 1 si alguna cara frontal queda fuera de la tolerancia; 2 si no puede medir.
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ELENCO, PERSONAS } from './build-prompt.mjs'

const AQUI = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const opt = (n, d) => (args.includes(`--${n}`) ? args[args.indexOf(`--${n}`) + 1] : d)
const archivos = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--'))
const clave = opt('persona', null)
const def = clave ? (PERSONAS[clave] ?? ELENCO[clave])?.rostro : null
const canon = Number(opt('canon', def?.largoAncho ?? NaN))
const tolerancia = Number(opt('tolerancia', def?.tolerancia ?? 0.02))

if (!archivos.length) {
  console.error('Uso: pnpm foto:rostro <imagen.png> [...] [--persona nexa] [--canon 0.81] [--tolerancia 0.02]')
  process.exit(2)
}

if (clave && !def && !args.includes('--canon')) {
  console.error(`foto:rostro — "${clave}" no declara \`rostro\` en el catálogo; pasa --canon.`)
  process.exit(2)
}

const r = spawnSync('swift', [path.join(AQUI, 'proporcion-rostro.swift'), ...archivos], { encoding: 'utf8' })

if (r.status !== 0 && !r.stdout) {
  console.error(`foto:rostro — no pude correr Vision: ${(r.stderr || '').trim().split('\n').pop()}`)
  process.exit(2)
}

// Alto de la boca (contorno interior de los labios) sobre la distancia entre ojos, sobre el que la boca cuenta como abierta.
const BOCA_ABIERTA = 0.12
// Apertura media de los ojos (alto del contorno / distancia entre ojos) bajo la que cuentan como cerrados (medido: 0,15 abiertos, 0,05 cerrados).
const OJOS_CERRADOS = 0.09

let fuera = 0

for (const linea of r.stdout.split('\n').filter(l => l.startsWith('{'))) {
  const m = JSON.parse(linea)

  if (m.error) {
    console.log(`  ? ${m.archivo}: ${m.error}`)
    continue
  }

  const frontal = Math.abs(m.giro) <= 0.15
  const base = `${m.archivo}  largo/ancho ${m.largoAncho.toFixed(2)}  giro ${m.giro.toFixed(2)}`

  if (!Number.isFinite(canon)) {
    console.log(`  · ${base}`)
    continue
  }

  if (!frontal) {
    console.log(`  · ${base}  (con giro: no compara)`)
    continue
  }

  // Con la boca abierta la cara se alarga de verdad: se informa, no se cuenta como afinada.
  if (m.boca > BOCA_ABIERTA) {
    console.log(`  · ${base}  (boca abierta: se alarga de verdad, no compara)`)
    continue
  }

  // Con los ojos cerrados el contorno del ojo baja y la medida se corre sin que la cara cambie.
  if (m.ojos < OJOS_CERRADOS) {
    console.log(`  · ${base}  (ojos cerrados: no compara)`)
    continue
  }

  const desvio = m.largoAncho - canon

  if (Math.abs(desvio) <= tolerancia) {
    console.log(`  ✓ ${base}  (canon ${canon.toFixed(2)})`)
    continue
  }

  fuera++
  console.log(
    `  ⚠ ${base}  ${desvio > 0 ? 'MÁS FINA/LARGA' : 'MÁS ANCHA'} que el canon ${canon.toFixed(2)}` +
      (desvio > 0 ? ' — el modelo la afinó' : '')
  )
}

process.exit(fuera ? 1 : 0)
