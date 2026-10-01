// pnpm ai-gen:protected [--json]
//
// Carpetas de `ai-generations/` que NO se archivan, derivadas del estado actual del repo (nunca una
// lista literal): las que sella el lock de foto, las que citan las recetas de deck y las que cita el
// código de `src/` y `scripts/`. Imprime carpeta, motivo(s) y tamaño en disco.
import { computeProtected, formatBytes, listFolders } from './lib.mjs'

const asJson = process.argv.includes('--json')
const protectedMap = computeProtected()
const onDisk = new Map(listFolders().map(f => [f.name, f]))

const rows = [...protectedMap].map(([folder, motivos]) => {
  const f = onDisk.get(folder)

  return { carpeta: folder, motivos, enDisco: Boolean(f), bytes: f?.bytes ?? 0, archivos: f?.files ?? 0 }
})

const present = rows.filter(r => r.enDisco)
const total = present.reduce((s, r) => s + r.bytes, 0)

if (asJson) {
  console.log(JSON.stringify({ total: { carpetas: present.length, bytes: total }, carpetas: rows }, null, 2))
  process.exit(0)
}

console.log(`Protegidas (derivadas): ${present.length} carpetas en disco · ${formatBytes(total)}\n`)

for (const r of present) {
  console.log(`  ${r.carpeta}  ·  ${formatBytes(r.bytes)} (${r.archivos} archivos)`)
  for (const m of r.motivos) console.log(`      ↳ ${m}`)
}

const absent = rows.filter(r => !r.enDisco)

if (absent.length) {
  console.log(`\n  Citadas pero sin carpeta en disco (${absent.length}; archivadas, por crear o citas que no son carpeta):`)
  for (const r of absent) console.log(`    ${r.carpeta}  ↳ ${r.motivos.join(' · ')}`)
}
