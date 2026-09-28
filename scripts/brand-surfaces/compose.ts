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



import { composeArtifact, type ArtifactCatalog } from '@/lib/artifact-composer'
import type { GraphicLineCatalogOptions } from '@/lib/artifact-composer/catalogs/graphic-line-shared/options'
import {
  planSurfaceDocument,
  planSurfacePiece,
  SurfacePieceError,
  type SurfaceAssetRequest,
  type SurfaceDocumentIntent,
  type SurfaceIntent
} from '@/lib/brand-surfaces'

import { materializeSurfaceAssets } from '@/lib/brand-surfaces/production/materialize'
import { greenhouseCtaPainter, greenhouseSelectionPainter } from '../../services/artifact-worker/brand/painters'

// Los pintores viven en src/lib desde TASK-1921 (los usa también el artifact-worker); se reexportan para el gate visual.
export { greenhouseCtaPainter, greenhouseSelectionPainter }

/** Lee una fuente del disco (el CLI es el taller local; el worker lee del asset store). */
export const materializeAssets = (assets: SurfaceAssetRequest[], root: string) =>
  materializeSurfaceAssets(assets, async (rel) => {
    const file = path.resolve(root, rel)

    if (!fs.existsSync(file)) {
      throw new Error(`No encuentro ${rel}. Los plates viven fuera de git (ai-generations/**/*.png): genéralo o cópialo antes de componer.`)
    }

    return { bytes: fs.readFileSync(file), mimeType: null }
  })

const arg = (name: string): string | undefined => {
  const i = process.argv.indexOf(`--${name}`)

  return i === -1 ? undefined : process.argv[i + 1]
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
