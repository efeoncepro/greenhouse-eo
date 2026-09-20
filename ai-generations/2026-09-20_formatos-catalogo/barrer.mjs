// Barrido de la ronda de cobertura con el arnés CANÓNICO (`scripts/foto/validar-reservas.mjs`),
// no con uno propio. Mi arnés de carpeta no tiene tests; el canónico sí.
//
// Nota de lectura: la reserva 5 (campo al margen) se evalúa siempre, pero en 9:16 y 1:1 yo NO la
// pedí a propósito — en vertical la reserva es la banda superior y una banda lateral además son
// dos instrucciones que se contradicen. Ahí un ✗ en la 5 no es un defecto de la plancha.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DIR = 'ai-generations/2026-09-20_formatos-catalogo/rondas/cobertura'
// Sin las hojas de contacto: son láminas de revisión, no planchas.
const plates = fs.readdirSync(DIR).filter(f => f.endsWith('-plate.png')).sort()
const filas = []

for (const f of plates) {
  let out = ''
  try { out = execFileSync('node', ['scripts/foto/validar-reservas.mjs', path.join(DIR, f), '--zona-texto'], { encoding: 'utf8' }) }
  catch (e) { out = String(e.stdout ?? '') }

  const fmt = (out.match(/formato ([\d:]+)/) ?? [, '?'])[1]
  const get = re => (out.match(re) ?? [, '—', ''])
  const [, zonaVal, zonaOk] = get(/1 · zona de texto[^\n]*?(blanca [\d.]+ · oscura [\d.]+)[^\n]*?([✓✗])/)
  // 🔴 No anclar a la etiqueta: el canónico la cambió de «(16% por formato)» a «(16% · señal
  // débil)» y mi expresión dejó de casar, reportando 0/37 lechos rotos cuando pasaban casi todos.
  // Un barrido que lee mal reprueba a ciegas. Se ancla al número, que es el dato.
  const [, lechoVal, lechoOk] = get(/3 · lecho[\s\S]*?(nitidez [\d.]+)[^✓✗\n]*([✓✗])/)
  const [, aireOk] = get(/4 · aire[^\n]*?([✓✗])/)
  const [, margenVal, margenOk] = get(/5 · campo profundo[^\n]*?(hasta [\d.]+)[^\n]*?([✓✗])/)

  filas.push({ f: f.replace('-plate.png', ''), fmt, zonaVal, zonaOk, lechoOk, lechoVal, aireOk, margenVal, margenOk })
}

const col = (s, n) => String(s).padEnd(n).slice(0, n)
console.log('\n  plancha                              fmt    zona de texto                  lecho  aire  margen')
for (const r of filas) {
  const margen = r.fmt === '16:9' ? `${r.margenOk} ${r.margenVal}` : '— no pedida'
  console.log(' ', col(r.f, 36), col(r.fmt, 6), col(`${r.zonaOk} ${r.zonaVal}`, 30), col(r.lechoOk, 6), col(r.aireOk, 5), margen)
}

const n = k => filas.filter(r => r[k] === '✓').length
console.log(`\n  zona de texto ${n('zonaOk')}/${filas.length} · lecho ${n('lechoOk')}/${filas.length} · aire ${n('aireOk')}/${filas.length}`)
const h = filas.filter(r => r.fmt === '16:9')
console.log(`  margen (sólo 16:9) ${h.filter(r => r.margenOk === '✓').length}/${h.length}`)
