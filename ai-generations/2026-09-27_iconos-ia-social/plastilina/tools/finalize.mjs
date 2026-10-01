// Arma el JSON final de cada candidato: fuente, clave, label, use y esfera.
import { readFileSync, writeFileSync } from 'node:fs'
const C = JSON.parse(readFileSync(new URL('./candidatos.json', import.meta.url), 'utf8'))
for (const [key, c] of Object.entries(C)) {
  const g = JSON.parse(readFileSync(new URL('../' + c.src, import.meta.url), 'utf8'))
  const out = { key, label: c.label, use: c.use, t: g.t, d: g.d, dot: c.dot, over: [], gesture: c.gesture ?? [], area: g.area, holes: g.holes, source: c.src }
  writeFileSync(new URL(`../final/${key}.json`, import.meta.url), JSON.stringify(out, null, 1) + '\n')
}
console.log(Object.keys(C).length, 'finales')
