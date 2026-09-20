// Mide las planchas contra los rangos de impacto del canon (§5 del lenguaje fotográfico):
// contraste p95−p5 = 70–90 en piezas de impacto · quemado ≤0,5–1% · aplastado ≤5% · croma p95 ≤40.
// Esto convierte «falta impacto visual» en un número que el canon ya definió, en vez de opinión.
// zsh no divide en palabras una variable sin comillas, así que el envoltorio arma argv él mismo.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2).flatMap(spec => {
  const [etq, dir, filtro] = spec.split(':')
  return fs.readdirSync(dir).filter(f => f.endsWith('.png') && (!filtro || f.includes(filtro)))
    .sort().map(f => `${etq}${f.replace(/(-169|-916|-11)?-plate\.png|\.png/, '')}=${path.join(dir, f)}`)
})

console.log(execFileSync('node', ['ai-generations/2026-09-19_lenguaje-fotografico-efeonce/scripts/metricas.cjs', ...args], { encoding: 'utf8' }))
