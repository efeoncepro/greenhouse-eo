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
 * Documento (TASK-1927): si el intent trae `pages`, es un documento `efeonce.surface-composition` 0.1.2 (un brochure o
 * una propuesta). Sale UN PDF con todas sus páginas, su manifest `axis.surface-document.v1`
 * (`<id>.surface-document-manifest.json`) y su procedencia. Un documento con un solo issue de AXIS no compone nada.
 *
 * Es el taller local. La ruta productiva (API + artifact-worker + MCP) es TASK-1921.
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

import sharp from 'sharp'

import { resolveCollaborationSelectionIntent } from '@efeoncepro/axis-ui-contracts'

import { composeArtifact, EXTERNAL_ASSET_PREFIX, type ArtifactCatalog } from '@/lib/artifact-composer'
import type { GraphicLineCtaPainter } from '@/lib/artifact-composer/catalogs/graphic-line-shared/cta-hook'
import type { GraphicLineCatalogOptions } from '@/lib/artifact-composer/catalogs/graphic-line-shared/options'
import type { GraphicLineSelectionPainter } from '@/lib/artifact-composer/catalogs/graphic-line-shared/selection-hook'
import {
  planSurfaceDocument,
  planSurfacePiece,
  SurfacePieceError,
  type SurfaceAssetRequest,
  type SurfaceDocumentIntent,
  type SurfaceIntent
} from '@/lib/brand-surfaces'

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
    variant: request.variant ?? 'eight-handles',
    padding: request.padding ?? 'standard',
    overlay: request.overlay ?? (request.targetKind === 'text' ? 'subtle' : 'none'),
    cursors: [
      {
        id: 'collaborator',
        kind: 'collaborator',
        targetId: 'answer',
        anchor: request.anchor,
        action: 'select',
        label: request.label,
        participantKind: request.participantKind
      },
      // Otros colaboradores sobre el mismo objetivo (la fuerza híbrida): cada uno con su ancla y su acción.
      ...(request.extraCursors ?? []).map((cursor, index) => ({
        id: `collaborator-${index + 2}`,
        kind: 'collaborator',
        targetId: 'answer',
        anchor: cursor.anchor,
        action: cursor.action,
        label: cursor.label,
        participantKind: cursor.participantKind
      }))
    ]
  } as never)

  // El color de un participante sólo cuando la receta lo midió; el resto sigue el orden de la paleta del renderer.
  const participantColors: Record<string, string> = {}

  if (request.color) participantColors.collaborator = request.color
  ;(request.extraCursors ?? []).forEach((cursor, index) => {
    if (cursor.color) participantColors[`collaborator-${index + 2}`] = cursor.color
  })

  const painted = renderCollaborationSelection({
    manifest,
    targetBounds: request.bounds,
    canvas: request.canvas,
    measureLabel: (label: string, size: number) => label.length * size * 0.62,
    presentation: { collaboratorScale: request.scale, participantColors }
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

    if (asset.kind === 'file') {
      const mime = FILE_MIME[path.extname(file).toLowerCase()]

      if (!mime) throw new Error(`El archivo ${asset.path} no es SVG ni PNG: un logo se entrega en uno de esos dos.`)
      if (!fs.existsSync(file)) throw new Error(`No encuentro el archivo ${asset.path}.`)

      out[key(asset.ref)] = `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`
      continue
    }

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

const FILE_MIME: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png' }

const sha256 = (data: Buffer | string): string => crypto.createHash('sha256').update(data).digest('hex')

/** Versión instalada de un paquete: su package.json está junto a su entrada (no todos lo exportan). */
const packageVersion = (name: string): string => {
  let dir = path.dirname(createRequire(path.join(process.cwd(), 'package.json')).resolve(name))

  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'package.json')

    if (fs.existsSync(candidate)) {
      const pkg = JSON.parse(fs.readFileSync(candidate, 'utf8')) as { name?: string; version?: string }

      if (pkg.name === name && pkg.version) return pkg.version
    }

    dir = path.dirname(dir)
  }

  return 'desconocida'
}

/**
 * Procedencia de la pieza: qué pedido, qué fotos y qué versión de AXIS la gobernaron. Sin fechas: dos
 * composiciones del mismo pedido con los mismos plates escriben la misma procedencia.
 */
export const surfaceProvenance = (
  intentRaw: string,
  piece: { catalog: string; contentType: string; assets: SurfaceAssetRequest[] },
  root: string
) => ({
  schema: 'efeonce.brand-surface-piece.provenance.v1',
  intentSha256: sha256(intentRaw),
  catalog: piece.catalog,
  contentType: piece.contentType,
  plates: piece.assets
    .filter((asset): asset is Extract<SurfaceAssetRequest, { kind: 'plate' }> => asset.kind === 'plate')
    .map(asset => ({ ref: asset.ref, path: asset.path, sha256: sha256(fs.readFileSync(path.resolve(root, asset.path))) })),
  files: piece.assets
    .filter((asset): asset is Extract<SurfaceAssetRequest, { kind: 'file' }> => asset.kind === 'file')
    .map(asset => ({ ref: asset.ref, path: asset.path, sha256: sha256(fs.readFileSync(path.resolve(root, asset.path))) })),
  axis: Object.fromEntries(
    ['@efeoncepro/axis-ui-contracts', '@efeoncepro/axis-tokens', '@efeoncepro/axis-graphic-line', '@efeoncepro/axis-brand-assets'].map(
      name => [name, packageVersion(name)]
    )
  )
})

/** Un intent con `pages` es un documento (misma detección que `pnpm surface:resolve` en AXIS). */
export const isDocumentIntent = (intent: unknown): intent is SurfaceDocumentIntent =>
  typeof intent === 'object' && intent !== null && Array.isArray((intent as { pages?: unknown }).pages)

/**
 * Procedencia del documento: el pedido, las fotos de TODAS sus páginas y la versión de AXIS que lo gobernó. Sin
 * fechas, como la de la pieza: el mismo pedido con los mismos plates escribe la misma procedencia.
 */
export const surfaceDocumentProvenance = (
  intentRaw: string,
  document: { catalog: string; use: string; contentTypes: string[]; assets: SurfaceAssetRequest[] },
  root: string
) => {
  const piece = surfaceProvenance(intentRaw, { catalog: document.catalog, contentType: '', assets: document.assets }, root)

  return {
    schema: 'efeonce.brand-surface-document.provenance.v1',
    intentSha256: piece.intentSha256,
    catalog: piece.catalog,
    use: document.use,
    pageCount: document.contentTypes.length,
    contentTypes: document.contentTypes,
    plates: piece.plates,
    files: piece.files,
    axis: piece.axis
  }
}

const fail = (error: unknown): never => {
  if (error instanceof SurfacePieceError) {
    console.error(`✗ ${error.message}`)

    for (const issue of error.issues) console.error(`  · ${JSON.stringify(issue)}`)
    process.exit(1)
  }

  throw error
}

const composeDocument = async (intentRaw: string, intent: SurfaceDocumentIntent, artifactId: string, outDir: string): Promise<void> => {
  let document

  try {
    document = planSurfaceDocument(intent, { artifactId })
  } catch (error) {
    return fail(error)
  }

  // Los plates se leen ANTES de crear la carpeta: un documento al que le falta una foto no deja salida a medias.
  const externalAssets = await materializeAssets(document.assets, process.cwd())

  fs.mkdirSync(outDir, { recursive: true })

  const result = await composeArtifact(
    await catalogFor(document.catalog),
    { tenderId: artifactId, slides: document.plan.slides as never },
    outDir,
    { externalAssets }
  )

  const contentTypes = document.plan.slides.map(slide => String(slide.contentType))

  fs.writeFileSync(path.join(outDir, `${artifactId}.surface-document-manifest.json`), `${JSON.stringify(document.manifest, null, 2)}\n`)
  fs.writeFileSync(
    path.join(outDir, `${artifactId}.provenance.json`),
    `${JSON.stringify(surfaceDocumentProvenance(intentRaw, { catalog: document.catalog, use: document.use, contentTypes, assets: document.assets }, process.cwd()), null, 2)}\n`
  )

  console.log(`✓ documento ${document.use} · ${contentTypes.length} páginas → ${document.catalog}`)
  console.log(`  ${outDir}`)
  console.log(JSON.stringify(result, null, 2).slice(0, 600))
}

const main = async (): Promise<void> => {
  const intentPath = arg('intent')

  if (!intentPath) {
    console.error('Uso: pnpm brand:compose -- --intent <intent.json> [--out <dir>] [--artifact-id <id>]')
    process.exit(2)
  }

  const intentRaw = fs.readFileSync(intentPath, 'utf8')
  const intent = JSON.parse(intentRaw) as SurfaceIntent | SurfaceDocumentIntent
  const artifactId = arg('artifact-id') ?? path.basename(intentPath).replace(/-intent\.json$|\.json$/i, '')
  const outDir = path.resolve(arg('out') ?? path.join('.captures', 'brand-surfaces', artifactId))

  if (isDocumentIntent(intent)) return composeDocument(intentRaw, intent, artifactId, outDir)

  let piece

  try {
    piece = planSurfacePiece(intent, { artifactId })
  } catch (error) {
    return fail(error)
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
  fs.writeFileSync(
    path.join(outDir, `${artifactId}.provenance.json`),
    `${JSON.stringify(surfaceProvenance(intentRaw, piece, process.cwd()), null, 2)}\n`
  )

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
