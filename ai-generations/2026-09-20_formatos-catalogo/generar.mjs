// Corredor de la ronda de cobertura. Secuencial (nunca en ráfaga) y REANUDABLE: si la plancha
// ya existe, la salta. Así un fallo a mitad de camino no cuesta volver a pagar lo hecho.
// Guarda el prompt junto a cada plancha: en la ola 1 y la ola 3 no se versionaron y hoy no se
// puede saber qué se le pidió al modelo. Eso costó una regla entera del canon.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const RUN = 'ai-generations/2026-09-20_formatos-catalogo'
const OUT = path.join(RUN, 'rondas/cobertura')
const SIZE = { '169': '2048x1152', '916': '1152x2048', '11': '1152x1152' }
// Ya generadas con el armador corregido; no se repagan.
const YA = { 'T13-escala-169-plate.png': 'rondas/ola5-oscuro/T13-escala-169-oscuro.png', 'T19-picado-60-sobre-la-obra-169-plate.png': 'rondas/ola4-claro/T19-picado-169-claro.png' }

fs.mkdirSync(OUT, { recursive: true })
const cola = []
for (const f of ['169', '916', '11']) {
  for (const x of JSON.parse(fs.readFileSync(path.join(RUN, `brief/batch-${f}.json`), 'utf8'))) {
    if (YA[x.filename]) continue
    cola.push({ ...x, size: SIZE[f] })
  }
}

console.log(`${cola.length} planchas por generar · ~USD ${(cola.length * 0.105).toFixed(2)}\n`)
let hechas = 0, saltadas = 0, fallidas = []

for (const [i, x] of cola.entries()) {
  const dest = path.join(OUT, x.filename)
  if (fs.existsSync(dest)) { saltadas++; console.log(`[${i + 1}/${cola.length}] ${x.filename} · ya existe`); continue }
  fs.writeFileSync(dest.replace('.png', '.prompt.txt'), `${x.prompt}\n`)
  try {
    execFileSync('pnpm', ['ai:image', '--model', 'gpt-image-2.5-flare', '--size', x.size, '--out', dest, '--prompt', x.prompt], { stdio: 'pipe' })
    hechas++
    console.log(`[${i + 1}/${cola.length}] ✓ ${x.filename}`)
  } catch (e) {
    fallidas.push(x.filename)
    console.log(`[${i + 1}/${cola.length}] ✗ ${x.filename} — ${String(e.stderr ?? e).slice(-200)}`)
  }
}

console.log(`\ngeneradas ${hechas} · ya existían ${saltadas} · fallidas ${fallidas.length}`)
if (fallidas.length) console.log('  ' + fallidas.join('\n  '))
console.log(`gasto de esta corrida ~USD ${(hechas * 0.105).toFixed(2)}`)
