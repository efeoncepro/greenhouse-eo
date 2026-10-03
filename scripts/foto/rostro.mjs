// pnpm foto:rostro <imagen.png> [...] [--persona <clave>] [--canon 0.83] [--tolerancia 0.015]
//
// Mide la PROPORCIÓN del rostro con Vision (macOS) y avisa si el modelo lo afinó o lo ensanchó respecto del canon de la
// persona [operador, 2026-10-03: «le alarga o achata la cara al ancho, poniéndola excesivamente fina, eso le quita
// realismo»]. La medida es largo/ancho: ojos→mentón sobre el ancho del contorno de la mandíbula, que no depende de la
// escala. El canon sale de `rostro` en la persona del catálogo (`PERSONAS`/`ELENCO`) o de `--canon`.
//
// Sólo juzga caras casi frontales (|giro| ≤ 0,15): con giro, el ancho aparente baja por perspectiva y la medida no
// compara. Una boca ABIERTA (risa, sorpresa) alarga la cara de verdad (≈ +0,04): el aviso lo dice, no lo esconde.
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
const tolerancia = Number(opt('tolerancia', def?.tolerancia ?? 0.015))

if (!archivos.length) {
  console.error('Uso: pnpm foto:rostro <imagen.png> [...] [--persona nexa] [--canon 0.83] [--tolerancia 0.015]')
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

  const desvio = m.largoAncho - canon

  if (Math.abs(desvio) <= tolerancia) {
    console.log(`  ✓ ${base}  (canon ${canon.toFixed(2)})`)
    continue
  }

  fuera++
  console.log(
    `  ⚠ ${base}  ${desvio > 0 ? 'MÁS FINA/LARGA' : 'MÁS ANCHA'} que el canon ${canon.toFixed(2)}` +
      (desvio > 0 ? ' — si la boca está abierta, es real (≈ +0,04); si no, el modelo la afinó' : '')
  )
}

process.exit(fuera ? 1 : 0)
