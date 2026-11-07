/**
 * Portada de Fiordo Austral (Wherex 428823) sin pregunta, por el método de la portada aprobada de Assetplan: clona el
 * catálogo graphic-line-deck a una carpeta temporal y le agrega `portada-orbit-decision.css` al final de
 * graphic-line.css; builder, plantilla, slots y render canónicos. No toca el catálogo del repo. Se retira con TASK-2014
 * (receta `cover-proposal` · `orbit-decision`).
 * Uso (desde la raíz): pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-11-05_propuesta-fiordo-austral/render-portada.ts <intent.json> <outDir> [css]
 * El tercer argumento elige otra hoja (p. ej. `portada-dawn.css` para la composición `dawn`, 2026-11-06).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { composeArtifact } from '@/lib/artifact-composer'
import { planSurfacePiece } from '@/lib/brand-surfaces'
import { catalogFor, materializeAssets, surfaceProvenance } from '../../scripts/brand-surfaces/compose'

const HERE = path.dirname(new URL(import.meta.url).pathname)

const main = async () => {
  const [intentPath, outArg, cssArg] = process.argv.slice(2)
  const CSS = cssArg ? path.resolve(cssArg) : path.join(HERE, 'portada-orbit-decision.css')
  const raw = fs.readFileSync(intentPath, 'utf8')
  const artifactId = path.basename(intentPath).replace(/\.json$/, '')
  const piece = planSurfacePiece(JSON.parse(raw), { artifactId })
  const base = await catalogFor('graphic-line-deck')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-deck-portada-'))
  fs.cpSync(base.templatesDir, dir, { recursive: true })
  fs.appendFileSync(path.join(dir, 'graphic-line.css'), fs.readFileSync(CSS, 'utf8'))
  const outDir = path.resolve(outArg)
  const externalAssets = await materializeAssets(piece.assets, process.cwd())
  fs.mkdirSync(outDir, { recursive: true })
  await composeArtifact({ ...base, templatesDir: dir } as never, { tenderId: artifactId, slides: piece.plan.slides } as never, outDir, { externalAssets })
  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-manifest.json`), `${JSON.stringify(piece.manifest, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, `${artifactId}.provenance.json`), `${JSON.stringify({ ...surfaceProvenance(raw, piece, process.cwd()), adjustment: `cover-by-hand-${path.basename(CSS, '.css')}-2026-11-06` }, null, 2)}\n`)
  console.log('ok', artifactId)
}
main().catch(e => { console.error(e); process.exit(1) })
