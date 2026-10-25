/**
 * Ajuste a mano pedido por el operador (2026-10-20): el eyebrow de cada lámina va como chip de contorno, sin relleno.
 * Clona el catálogo graphic-line-deck a una carpeta temporal y le agrega UNA regla CSS al final de graphic-line.css;
 * el builder, las plantillas, los slots y el render son los canónicos. No toca el catálogo del repo.
 * Uso: tsx --require ./scripts/lib/server-only-shim.cjs <este> <intent.json> <outDir> [--montos]
 *   --montos: aplica los montos reales de la cotización (ver render-pricing-real.ts) a content-pricing live.
 *   --css <archivo>: agrega además ese CSS al catálogo clonado (p. ej. la portada a mano de `cover-proposal` ·
 *   `orbit-decision`, mientras Greenhouse no adopta AXIS 0.7.6 — TASK-2014).
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { composeArtifact } from '@/lib/artifact-composer'
import { planSurfacePiece } from '@/lib/brand-surfaces'
import { catalogFor, materializeAssets, surfaceProvenance } from '../../scripts/brand-surfaces/compose'

const CHIP_CSS = `
/* Ajuste Assetplan 2026-10-20: eyebrow como chip de contorno, sin relleno (pedido del operador). */
.gl-eyebrow {
  display: inline-block;
  padding: 9px 16px 9px 20px;
  border: 1.5px solid color-mix(in srgb, currentColor 55%, transparent);
  border-radius: 999px;
  background: none;
  translate: 0 -10px;
  white-space: nowrap;
}
`
const AMOUNTS = ['40 UF / mes', '−10 UF / mes', 'Incluido', 'Incluido']
const TOTAL = '30 UF'

const chipCatalog = async (extraCss = '') => {
  const base = await catalogFor('graphic-line-deck')
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gl-deck-chip-'))
  fs.cpSync(base.templatesDir, dir, { recursive: true })
  fs.appendFileSync(path.join(dir, 'graphic-line.css'), CHIP_CSS + extraCss)
  return { ...base, templatesDir: dir }
}

const patchAmounts = (slides: unknown) => {
  let replaced = 0
  const walk = (node: any): any => {
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object') {
      if (Array.isArray(node.lines) && node.lines.every((l: any) => typeof l?.amount === 'string')) {
        node.lines = node.lines.map((l: any, i: number) => { replaced++; return { ...l, amount: AMOUNTS[i] } })
      }
      if (typeof node.total === 'string' && node.total.includes('[MONTO]')) { node.total = TOTAL; replaced++ }
      for (const k of Object.keys(node)) node[k] = walk(node[k])
    }
    return node
  }
  const out = walk(JSON.parse(JSON.stringify(slides)))
  if (replaced !== AMOUNTS.length + 1 || /\[MONTO\]/.test(JSON.stringify(out))) throw new Error(`montos: reemplazos=${replaced}`)
  return out
}

const main = async () => {
  const [intentPath, outArg] = process.argv.slice(2)
  const raw = fs.readFileSync(intentPath, 'utf8')
  const artifactId = path.basename(intentPath).replace(/\.json$/, '')
  const piece = planSurfacePiece(JSON.parse(raw), { artifactId })
  const cssIdx = process.argv.indexOf('--css')
  const extraCss = cssIdx > -1 ? fs.readFileSync(process.argv[cssIdx + 1], 'utf8') : ''
  const slides = process.argv.includes('--montos') ? patchAmounts(piece.plan.slides) : piece.plan.slides
  const outDir = path.resolve(outArg)
  const externalAssets = await materializeAssets(piece.assets, process.cwd())
  fs.mkdirSync(outDir, { recursive: true })
  await composeArtifact((await chipCatalog(extraCss)) as never, { tenderId: artifactId, slides } as never, outDir, { externalAssets })
  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-manifest.json`), `${JSON.stringify(piece.manifest, null, 2)}\n`)
  fs.writeFileSync(path.join(outDir, `${artifactId}.provenance.json`), `${JSON.stringify({ ...surfaceProvenance(raw, piece, process.cwd()), adjustment: 'eyebrow-chip-outline-2026-10-20' }, null, 2)}\n`)
  console.log('ok', artifactId)
}
main().catch(e => { console.error(e); process.exit(1) })
