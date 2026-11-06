/**
 * Lámina «Cambios controlados» de Fiordo Austral (Wherex 428823) con los pasos del ciclo reales para Sales Hub
 * Professional (06/11/2026). La receta `content-day-release-cycle` trae fijos «Sandbox → Pruebas → Tu aprobación →
 * Producción» desde AXIS; Professional no incluye sandbox (la propuesta prueba en una cuenta de pruebas y valida con registros de prueba) y va
 * en usted. Mismo método que render-pricing-real.ts: builder y plantilla canónicos, sólo reemplaza las cuatro
 * etiquetas en el plan. No toca el catálogo. Se retira cuando la receta acepte los pasos en el intent.
 * Uso (desde la raíz): pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs ai-generations/2026-11-05_propuesta-fiordo-austral/render-release-steps.ts <intent.json> <outDir>
 */
import fs from 'node:fs'
import path from 'node:path'
import { composeArtifact } from '@/lib/artifact-composer'
import { planSurfacePiece } from '@/lib/brand-surfaces'
import { catalogFor, materializeAssets } from '../../scripts/brand-surfaces/compose'

const [intentPath, outArg] = process.argv.slice(2)
const FROM = ['Sandbox', 'Pruebas', 'Tu aprobación', 'Producción']
const TO = ['Prueba', 'Validación', 'Su aprobación', 'Producción']

const main = async () => {
  const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8'))
  const artifactId = path.basename(intentPath).replace(/\.json$/, '')
  const piece = planSurfacePiece(intent, { artifactId })
  let replaced = 0
  const walk = (node: any): any => {
    if (Array.isArray(node)) return node.map(walk)
    if (node && typeof node === 'object') {
      if (typeof node.label === 'string' && FROM.includes(node.label) && node.label !== TO[FROM.indexOf(node.label)]) {
        node.label = TO[FROM.indexOf(node.label)]
        replaced++
      }
      for (const k of Object.keys(node)) node[k] = walk(node[k])
    }
    return node
  }
  const slides = walk(JSON.parse(JSON.stringify(piece.plan.slides)))
  const left = JSON.stringify(slides).match(/"Sandbox"|"Tu aprobación"/g)?.length ?? 0
  if (replaced !== 3 || left) throw new Error(`reemplazos=${replaced} restantes=${left}`)
  const outDir = path.resolve(outArg)
  const externalAssets = await materializeAssets(piece.assets, process.cwd())
  fs.mkdirSync(outDir, { recursive: true })
  await composeArtifact(await catalogFor(piece.catalog), { tenderId: artifactId, slides } as never, outDir, { externalAssets })
  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-manifest.json`), `${JSON.stringify(piece.manifest, null, 2)}\n`)
  console.log('ok', artifactId, replaced)
}
main().catch(e => { console.error(e); process.exit(1) })
