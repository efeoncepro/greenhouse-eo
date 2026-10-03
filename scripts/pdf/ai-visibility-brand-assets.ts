/** TASK-1938: report-only assets, byte-sealed from AXIS; no legacy PDF assets are regenerated. */
import { createHash } from 'node:crypto'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  brandAssetUrl,
  emailAssetUrl,
  findBrandAsset,
  findEmailAsset,
  findPlatformAsset,
  platformAssetUrl
} from '@efeoncepro/axis-brand-assets'
import { auditIconGroup, resolveIcon, type StrokeGlyphKey } from '@efeoncepro/axis-graphic-line/icons'
import sharp from 'sharp'

const OUT = resolve(process.cwd(), 'public/branding/pdf')
const hash = (data: Buffer | string): string => createHash('sha256').update(data).digest('hex')

const BRAND = [
  { id: 'ai-visibility-report-lockup-positive', height: 112 },
  { id: 'ai-visibility-report-lockup-negative', height: 112 },
  { id: 'aeo-lockup-positive', height: 104 },
  { id: 'aeo-lockup-negative', height: 104 },
  { id: 'efeonce-logo-positive', width: 960 },
  { id: 'efeonce-logo-negative', width: 960 },
  { id: 'url-bubble-baked-light', height: 72 },
  { id: 'url-bubble-baked-dark', height: 128 }
] as const

const ENGINES = ['chatgpt', 'claude', 'gemini', 'perplexity', 'google-ai-overview'] as const
const SOCIALS = ['linkedin', 'instagram', 'youtube', 'threads'] as const

// Approved source icons.json / generar-hojas.py: chapters, levels, dimensions, quality and provenance.
const GLYPHS: readonly StrokeGlyphKey[] = [
  'busqueda', 'codigo', 'checklist', 'integracion', 'objetivo', 'medicion', 'ia',
  'prensa', 'social', 'crm', 'revenue', 'medios', 'calendario', 'composer', 'contrato'
]

interface OutputSeal {
  file: string
  sourceId: string
  sourceSha256: string
  pngSha256: string
  width: number
  height: number
  transform: string
}

/** SVG export variables have declared canonical fallback colours; librsvg needs those materialized. */
const literalFallbacks = (svg: string): string => svg.replace(/var\(\s*--[\w-]+\s*,\s*([^()]+)\)/g, (_, fallback: string) => fallback.trim())

const rasterize = async (
  source: Buffer,
  sourceId: string,
  expectedHash: string,
  file: string,
  size: { width?: number; height?: number }
): Promise<OutputSeal> => {
  if (hash(source) !== expectedHash) throw new Error(`AXIS source seal mismatch: ${sourceId}`)
  const svg = literalFallbacks(source.toString('utf8'))

  if (/\bvar\(/.test(svg)) throw new Error(`Unresolved SVG colour: ${sourceId}`)

  const { data, info } = await sharp(Buffer.from(svg), { density: 600 })
    .resize({ ...size, fit: 'inside' })
    .png({ compressionLevel: 9 })
    .toBuffer({ resolveWithObject: true })

  await writeFile(resolve(OUT, file), data)

  return {
    file, sourceId, sourceSha256: expectedHash, pngSha256: hash(data), width: info.width, height: info.height,
    transform: svg === source.toString('utf8') ? 'SVG rasterized; shape and colour unchanged' : 'Declared SVG variable fallbacks materialized; then rasterized'
  }
}

export const buildAiVisibilityPdfBrandAssets = async (): Promise<void> => {
  await mkdir(OUT, { recursive: true })
  const seals: OutputSeal[] = []

  for (const spec of BRAND) {
    const source = findBrandAsset(spec.id)

    if (!source) throw new Error(`Missing AXIS brand asset: ${spec.id}`)
    const bytes = await readFile(fileURLToPath(brandAssetUrl(source.id)))

    seals.push(await rasterize(bytes, source.id, source.sha256, `ai-visibility-${source.id}.png`, spec))
  }

  for (const engine of ENGINES) {
    const id = `${engine}-isotype`
    const source = findPlatformAsset(id)

    if (!source) throw new Error(`Missing AXIS platform asset: ${id}`)
    const bytes = await readFile(fileURLToPath(platformAssetUrl(source.id)))

    seals.push(await rasterize(bytes, source.id, source.sha256, `ai-visibility-engine-${engine}.png`, { width: 144, height: 144 }))
  }

  for (const network of SOCIALS) {
    const id = `email-social-${network}-white`
    const source = findEmailAsset(id)

    if (!source) throw new Error(`Missing AXIS social asset: ${id}`)
    const bytes = await readFile(fileURLToPath(emailAssetUrl(source.id)))

    if (hash(bytes) !== source.sha256) throw new Error(`AXIS source seal mismatch: ${id}`)
    const file = `ai-visibility-social-${network}.png`
    const info = await sharp(bytes).metadata()

    if (!info.width || !info.height) throw new Error(`Invalid AXIS social PNG: ${id}`)
    await writeFile(resolve(OUT, file), bytes)
    seals.push({ file, sourceId: id, sourceSha256: source.sha256, pngSha256: hash(bytes), width: info.width, height: info.height, transform: 'Official AXIS PNG copied byte for byte' })
  }

  for (const size of [18, 22] as const) {
    const requests = GLYPHS.map(glyph => ({ glyph, state: 'rest' as const, line: 'engine' as const, surface: 'light' as const, size }))
    const audit = auditIconGroup(requests, { pieceHasSphere: true })

    if (!audit.ok) throw new Error(`AXIS report icon group rejected: ${JSON.stringify(audit.issues)}`)

    for (const request of requests) {
      const icon = resolveIcon(request)

      if (icon.voice !== 'stroke' || icon.state !== 'rest' || icon.warnings.length) throw new Error(`Invalid report icon: ${request.glyph}`)
      const bytes = Buffer.from(icon.svg)
      const seal = await rasterize(bytes, `axis-graphic-line/icons:${request.glyph}:${size}:engine:light:rest`, hash(bytes), `ai-visibility-icon-${request.glyph}-${size}.png`, { width: size * 4, height: size * 4 })

      seals.push({ ...seal, transform: 'AXIS resolveIcon at approved optical size; rest state; rasterized at 4x' })
    }
  }

  await writeFile(resolve(OUT, 'ai-visibility-assets.manifest.json'), `${JSON.stringify({ schema: 'efeonce.ai-visibility-pdf-assets.v1', sources: { brandAssets: '@efeoncepro/axis-brand-assets', icons: '@efeoncepro/axis-graphic-line/icons', approvedMapping: 'TASK-1938 fuente-canvas-2026-09-29.tar.gz:fuente/generar-hojas.py' }, outputs: seals }, null, 2)}\n`)

  // Literal paths let Vercel trace only the report resources, rather than public/**.
  const pathMap = seals.map(seal => {
    const id = seal.file.replace(/^ai-visibility-/, '').replace(/\.png$/, '')

    return `  '${id}': resolve(process.cwd(), 'public/branding/pdf/${seal.file}')`
  }).sort().join(',\n')

  await writeFile(resolve(process.cwd(), 'src/components/growth/ai-visibility/report-artifact/pdf/report-pdf-asset-paths.generated.ts'), `/** Generated by scripts/build-pdf-brand-assets.ts --ai-visibility-report. Do not edit. */\nimport { resolve } from 'node:path'\n\nexport const AI_VISIBILITY_PDF_ASSET_PATHS: Readonly<Record<string, string>> = {\n${pathMap}\n}\n`)
  console.log(`[brand-assets] AI Visibility Report: ${seals.length} sealed PNGs generated; other PDF assets unchanged`)
}
