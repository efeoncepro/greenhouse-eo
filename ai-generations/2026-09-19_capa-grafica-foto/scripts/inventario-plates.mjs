// Inventario real de plates por formato, leído del archivo y no de la documentación.
// Motivo: la tabla §9 del maestro decía que 9:16 y 16:9 estaban pendientes cuando ya existían 15
// plates nativos. Yo repetí esa afirmación aunque venía usando esos mismos archivos. La regla que
// sale de ahí: el inventario se mide, no se cita.
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../2026-09-19_lenguaje-fotografico-efeonce/rondas')
const FORMATO = (w, h) => {
  const r = w / h

  if (Math.abs(r - 0.8) < 0.02) return '4:5'
  if (Math.abs(r - 0.5625) < 0.02) return '9:16'
  if (Math.abs(r - 1.7778) < 0.03) return '16:9'
  if (Math.abs(r - 1) < 0.02) return '1:1'

  return `otro ${w}×${h}`
}

const archivos = []
const recorrer = d => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const f = path.join(d, e.name)

    if (e.isDirectory()) recorrer(f)
    else if (/-plate\.png$|^p\d\.png$/i.test(e.name)) archivos.push(f)
  }
}

recorrer(RAIZ)
const porFormato = {}
const porCarpeta = {}

for (const f of archivos) {
  const { width, height } = await sharp(f).metadata()
  const fmt = FORMATO(width, height)
  const carpeta = path.relative(RAIZ, path.dirname(f))

  porFormato[fmt] = (porFormato[fmt] ?? 0) + 1
  porCarpeta[carpeta] ??= {}
  porCarpeta[carpeta][fmt] = (porCarpeta[carpeta][fmt] ?? 0) + 1
}

console.log(`Plates limpios en el archivo: ${archivos.length}\n`)
console.log('Por formato:')
for (const [k, v] of Object.entries(porFormato).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(12)}${v}`)
console.log('\nPor ronda (carpeta = familia de tomas):')
console.log('  ronda'.padEnd(18) + '4:5   9:16  16:9  1:1')
for (const [c, f] of Object.entries(porCarpeta).sort()) {
  console.log('  ' + c.padEnd(16) + String(f['4:5'] ?? '·').padEnd(6) + String(f['9:16'] ?? '·').padEnd(6) + String(f['16:9'] ?? '·').padEnd(6) + String(f['1:1'] ?? '·'))
}
