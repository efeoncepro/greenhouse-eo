/**
 * Excepción aprobada por el operador (2026-10-20): la cotización de Assetplan muestra los montos reales.
 * Usa el builder y la plantilla canónicos de `content-pricing` (live); sólo reemplaza el marcador `[MONTO]`
 * por el monto de la cotización formal ASSETPLAN-2026-10-20-v2. No toca el catálogo.
 */
import fs from 'node:fs'
import path from 'node:path'
import { composeArtifact } from '@/lib/artifact-composer'
import { planSurfacePiece } from '@/lib/brand-surfaces'
import { catalogFor, materializeAssets } from '../../scripts/brand-surfaces/compose'

const [intentPath, outArg] = process.argv.slice(2)
const AMOUNTS = ['40 UF / mes', '−10 UF / mes', 'Incluido', 'Incluido']
const TOTAL = '30 UF'

const main = async () => {
  const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'))
  const artifactId = path.basename(intentPath).replace(/\.json$/, '')
  const piece = planSurfacePiece(intent, { artifactId })
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
  const slides = walk(JSON.parse(JSON.stringify(piece.plan.slides)))
  const left = JSON.stringify(slides).match(/\[MONTO\]/g)?.length ?? 0
  if (replaced !== AMOUNTS.length + 1 || left) throw new Error(`reemplazos=${replaced} marcadores restantes=${left}`)
  const outDir = path.resolve(outArg)
  const externalAssets = await materializeAssets(piece.assets, process.cwd())
  fs.mkdirSync(outDir, { recursive: true })
  const result = await composeArtifact(await catalogFor(piece.catalog), { tenderId: artifactId, slides } as never, outDir, { externalAssets })
  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-manifest.json`), `${JSON.stringify(piece.manifest, null, 2)}\n`)
  console.log('ok', piece.contentType, JSON.stringify(result).slice(0, 300))
}
main().catch(e => { console.error(e); process.exit(1) })
