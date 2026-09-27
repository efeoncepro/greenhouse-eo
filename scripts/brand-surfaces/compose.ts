/**
 * pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]
 *
 * Compone una pieza de «La órbita» por superficie con el Artifact Composer (TASK-1919):
 *   intent (`efeonce.surface-composition`) → contrato de AXIS → plan del composer → PDF (deck) o PNG.
 *
 * Qué hace además del plan:
 *   - Materializa los assets que el plan referencia: el plate aprobado (recortado al lienzo) y los íconos
 *     que `resolveIcon` de AXIS devolvió en SVG. El motor recibe bytes, nunca rutas de la máquina.
 *   - Inyecta la pintura de la selección colaborativa (el adaptador canónico de Greenhouse sobre el contrato
 *     `efeonce.collaboration-selection`), que el catálogo no puede importar.
 *   - Deja junto a la pieza el manifest de AXIS que la gobernó (`<id>.surface-manifest.json`).
 *
 * Es el taller local. La ruta productiva (API + artifact-worker + MCP) es TASK-1921.
 */

import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { composeArtifact, EXTERNAL_ASSET_PREFIX, type ArtifactCatalog } from '@/lib/artifact-composer'
import type { GraphicLineCtaPainter } from '@/lib/artifact-composer/catalogs/graphic-line-shared/cta-hook'
import type { GraphicLineCatalogOptions } from '@/lib/artifact-composer/catalogs/graphic-line-shared/options'
import type { GraphicLineSelectionPainter } from '@/lib/artifact-composer/catalogs/graphic-line-shared/selection-hook'
import { planSurfacePiece, SurfacePieceError, type SurfaceAssetRequest, type SurfaceIntent } from '@/lib/brand-surfaces'

import { renderCollaborationSelection } from '../creative/layout-compiler/axis-advertising.mjs'

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)

  return i === -1 ? undefined : process.argv[i + 1]
}

/** La pintura canónica de la selección: mismo contrato y mismo adaptador que las piezas con CTA. */
export const greenhouseSelectionPainter: GraphicLineSelectionPainter = request => {
  const manifest = resolveCollaborationSelectionIntent({
    targetId: 'answer',
    targetKind: request.targetKind,
    variant: 'eight-handles',
    padding: 'standard',
    overlay: request.targetKind === 'text' ? 'subtle' : 'none',
    cursors: [
      {
        id: 'collaborator',
        kind: 'collaborator',
        targetId: 'answer',
        anchor: request.anchor,
        action: 'select',
        label: request.label,
        participantKind: request.participantKind
      }
    ]
  } as never)

  const painted = renderCollaborationSelection({
    manifest,
    targetBounds: request.bounds,
    canvas: request.canvas,
    measureLabel: (label: string, size: number) => label.length * size * 0.62,
    presentation: { collaboratorScale: request.scale }
  }) as { underlay: string; overlay: string; evidence: { withinCanvas: boolean } }

  return { underlay: painted.underlay, overlay: painted.overlay, withinCanvas: painted.evidence.withinCanvas }
}

/** El CTA canónico: grupo con corchetes abiertos y el cursor local en `end-center`. */
export const greenhouseCtaPainter: GraphicLineCtaPainter = request => {
  const manifest = resolveCollaborationSelectionIntent({
    targetId: 'cta',
    targetKind: 'group',
    variant: 'open-brackets',
    padding: 'compact',
    overlay: 'none',
    cursors: [{ id: 'local', kind: 'local', targetId: 'cta', anchor: 'end-center', action: 'select' }]
  } as never)

  const painted = renderCollaborationSelection({
    manifest,
    targetBounds: request.bounds,
    canvas: request.canvas,
    measureLabel: (label: string, size: number) => label.length * size * 0.62,
    presentation: { localCursorScale: request.cursorScale }
  }) as unknown as {
    overlay: string
    bounds: { top: number; height: number; bottom?: number }
    evidence: { withinCanvas: boolean; cursorEvidence: { bounds: { top: number; height: number; bottom?: number } }[] }
  }

  const bottomOf = (b: { top: number; height: number; bottom?: number }) => b.bottom ?? b.top + b.height
  const bottom = Math.max(bottomOf(painted.bounds), ...painted.evidence.cursorEvidence.map(c => bottomOf(c.bounds)))

  return { overlay: painted.overlay, bottom, withinCanvas: painted.evidence.withinCanvas }
}

/**
 * Todo catálogo de La órbita exporta `createCatalog(options)`: se resuelve por nombre y recibe las dos
 * pinturas que el motor no puede importar.
 */
export const catalogFor = async (name: string): Promise<ArtifactCatalog> => {
  const mod = (await import(`@/lib/artifact-composer/catalogs/${name}/index`)) as {
    createCatalog?: (options: GraphicLineCatalogOptions) => ArtifactCatalog
  }

  if (!mod.createCatalog) throw new Error(`El catálogo ${name} no exporta createCatalog.`)

  return mod.createCatalog({ selectionPainter: greenhouseSelectionPainter, ctaPainter: greenhouseCtaPainter })
}

/**
 * Bytes de cada asset del plan, como data URI (el render bloquea la red y no lee rutas externas). La clave es
 * la referencia sin el prefijo `asset-ref:`, que es como el motor las busca.
 */
export const materializeAssets = async (assets: SurfaceAssetRequest[], root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {}
  const key = (ref: string) => ref.slice(EXTERNAL_ASSET_PREFIX.length)

  for (const asset of assets) {
    if (asset.kind === 'svg') {
      out[key(asset.ref)] = `data:image/svg+xml;base64,${Buffer.from(asset.svg).toString('base64')}`
      continue
    }

    const file = path.resolve(root, asset.path)

    if (!fs.existsSync(file)) {
      throw new Error(
        `No encuentro el plate ${asset.path}. Los plates viven fuera de git (ai-generations/**/*.png): genéralo o cópialo antes de componer.`
      )
    }

    const jpeg = await sharp(file)
      .resize(asset.fit.width, asset.fit.height, { fit: 'cover', position: 'centre' })
      .jpeg({ quality: 90 })
      .toBuffer()

    out[key(asset.ref)] = `data:image/jpeg;base64,${jpeg.toString('base64')}`
  }

  return out
}

const main = async (): Promise<void> => {
  const intentPath = arg('intent')

  if (!intentPath) {
    console.error('Uso: pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]')
    process.exit(2)
  }

  const intent = JSON.parse(fs.readFileSync(intentPath, 'utf8')) as SurfaceIntent
  const artifactId = arg('artifact-id') ?? path.basename(intentPath).replace(/-intent\.json$|\.json$/i, '')
  const outDir = path.resolve(arg('out') ?? path.join('.captures', 'brand-surfaces', artifactId))

  let piece

  try {
    piece = planSurfacePiece(intent, { artifactId })
  } catch (error) {
    if (error instanceof SurfacePieceError) {
      console.error(`✗ ${error.message}`)

      for (const issue of error.issues) console.error(`  · ${JSON.stringify(issue)}`)
      process.exit(1)
    }

    throw error
  }

  const externalAssets = await materializeAssets(piece.assets, process.cwd())

  fs.mkdirSync(outDir, { recursive: true })

  const result = await composeArtifact(
    await catalogFor(piece.catalog),
    { tenderId: artifactId, slides: piece.plan.slides as never },
    outDir,
    { externalAssets }
  )

  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-manifest.json`), `${JSON.stringify(piece.manifest, null, 2)}\n`)

  console.log(`✓ ${piece.contentType} → ${piece.catalog}`)
  console.log(`  ${outDir}`)
  console.log(JSON.stringify(result, null, 2).slice(0, 600))
}

if (process.argv[1] && path.basename(process.argv[1]).startsWith('compose')) {
  main().catch(error => {
    console.error(error)
    process.exit(1)
  })
}
