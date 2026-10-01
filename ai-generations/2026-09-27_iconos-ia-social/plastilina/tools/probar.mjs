// Arma variantes de esfera para comparar. Uso: node tools/probar.mjs src.json nombre x y [nombre x y ...]
import { readFileSync, writeFileSync } from 'node:fs'
const [src, ...r] = process.argv.slice(2)
const g = JSON.parse(readFileSync(src, 'utf8'))
for (let i = 0; i < r.length; i += 3) {
  const out = { ...g, key: r[i], label: r[i], use: 'prueba', dot: [+r[i + 1], +r[i + 2]] }
  writeFileSync(`pruebas/${r[i]}.json`, JSON.stringify(out, null, 1))
}
