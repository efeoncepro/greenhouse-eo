/**
 * Lámina de Fiordo Austral (Wherex 428823) con rótulos fijos de la plantilla corregidos (06/11/2026). Builder,
 * plantilla, slots y render canónicos; sólo cambia el plan antes de renderizar, según un archivo de parche:
 *   { "replace": [{ "from": "Fuente", "to": "Entra por", "count": 5 }],   // valores de texto exactos; count opcional
 *     "assets": { "file:entra-mfa": "ruta/al/icono.svg" },                  // íconos oficiales que no están en el catálogo
 *     "css": "archivo.css" }                                                 // opcional: se agrega a graphic-line.css
 * Generaliza render-release-steps.ts y render-portada.ts. No toca el catálogo del repo. Se retira cuando las recetas
 * acepten esos rótulos en el intent.
 * Uso (desde la raíz): pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-11-05_propuesta-fiordo-austral/render-patch.ts <intent.json> <outDir> <patch.json>
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { composeArtifact } from '@/lib/artifact-composer'
import { planSurfacePiece } from '@/lib/brand-surfaces'
import { catalogFor, materializeAssets, surfaceProvenance } from '../../scripts/brand-surfaces/compose'

type Patch = { replace?: { from: string; to: string; count?: number }[]; assets?: Record<string, string>; css?: string }

const main = async () => {
  const [intentPath, outArg, patchPath] = process.argv.slice(2)
  const patchDir = path.dirname(path.resolve(patchPath))
  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8')) as Patch
  const raw = fs.readFileSync(intentPath, 'utf8')
  const artifactId = path.basename(intentPath).replace(/\.json$/, '')
  const piece = planSurfacePiece(JSON.parse(raw), { artifactId })
  const counts = new Map<string, number>()
  const rules = new Map((patch.replace ?? []).map(r => [r.from, r]))
  const walk = (node: unknown): unknown => {
    if (typeof node === 'string' && rules.has(node)) {
      counts.set(node, (counts.get(node) ?? 0) + 1)
      return rules.get(node)!.to
    }
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]))
    return node
  }
  const slides = walk(JSON.parse(JSON.stringify(piece.plan.slides)))
  for (const r of patch.replace ?? []) {
    const n = counts.get(r.from) ?? 0
    if (n === 0 || (r.count !== undefined && n !== r.count)) throw new Error(`«${r.from}»: ${n} reemplazos (esperados ${r.count ?? '≥ 1'})`)
  }
  const externalAssets: Record<string, string> = await materializeAssets(piece.assets, process.cwd())
  for (const [key, rel] of Object.entries(patch.assets ?? {})) {
    const file = path.resolve(patchDir, rel)
    const mime = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
    externalAssets[key] = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
  }
  const base = await catalogFor(piece.catalog)
  let catalog = base
  if (patch.css) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-deck-patch-'))
    fs.cpSync(base.templatesDir, dir, { recursive: true })
    fs.appendFileSync(path.join(dir, 'graphic-line.css'), fs.readFileSync(path.resolve(patchDir, patch.css), 'utf8'))
    catalog = { ...base, templatesDir: dir } as typeof base
  }
  const outDir = path.resolve(outArg)
  fs.mkdirSync(outDir, { recursive: true })
  await composeArtifact(catalog, { tenderId: artifactId, slides } as never, outDir, { externalAssets })
  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-manifest.json`), `${JSON.stringify(piece.manifest, null, 2)}\n`)
  fs.writeFileSync(
    path.join(outDir, `${artifactId}.provenance.json`),
    `${JSON.stringify({ ...surfaceProvenance(raw, piece, process.cwd()), adjustment: `patch-${path.basename(patchPath, '.json')}-2026-11-06` }, null, 2)}\n`
  )
  console.log('ok', artifactId, [...counts.entries()].map(([k, v]) => `${k}×${v}`).join(' '))
}
main().catch(e => { console.error(e); process.exit(1) })
