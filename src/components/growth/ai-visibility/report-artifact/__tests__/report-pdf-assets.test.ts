/** TASK-1938: prove that the PDF bundle contains the approved, sealed AXIS resources. */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, resolve } from 'node:path'
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
import { Font } from '@react-pdf/renderer'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { ensurePdfFontsRegistered } from '@/lib/finance/pdf/register-fonts'

import layoutProjection from '../pdf/ai-visibility-layout.generated.json'
import { AI_VISIBILITY_PDF_ASSET_PATHS } from '../pdf/report-pdf-asset-paths.generated'

interface AssetSeal {
  file: string
  sourceId: string
  sourceSha256: string
  pngSha256: string
  width: number
  height: number
  transform: string
}

interface FontSeal {
  file: string
  family: string
  axes: { opsz: number; wdth: number; wght: number }
  sha256: string
  bytes: number
}

interface InspectableFont {
  familyName: string
  variationAxes: Record<string, { min: number; max: number; default: number }>
  'OS/2': { usWeightClass: number }
  hasGlyphForCodePoint(codePoint: number): boolean
}

const root = process.cwd()
const assetDir = resolve(root, 'public/branding/pdf')
const fontDir = resolve(root, 'src/assets/fonts')
const sha = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex')

const assets = JSON.parse(readFileSync(resolve(assetDir, 'ai-visibility-assets.manifest.json'), 'utf8')) as {
  schema: string
  outputs: AssetSeal[]
}

const fonts = JSON.parse(readFileSync(resolve(fontDir, 'BricolageGrotesque-AiVisibility.manifest.json'), 'utf8')) as {
  schema: string
  source: string
  sourceSha256: string
  license: string
  tool: { name: string; version: string }
  outputs: FontSeal[]
}

const fontkit = createRequire(resolve(root, 'package.json'))('fontkit') as {
  openSync(path: string): InspectableFont
}

const archive = resolve(root, layoutProjection.source.approvedArchive.path)
const approvedIcons = JSON.parse(execFileSync('tar', ['-xOf', archive, 'fuente/icons.json'], { encoding: 'utf8' })) as Record<string, string>

const iconRequests = assets.outputs.filter(item => item.sourceId.startsWith('axis-graphic-line/icons:')).map(item => {
  const [, glyph, opticalSize, line, surface, state] = item.sourceId.split(':')

  expect({ line, surface, state }).toEqual({ line: 'engine', surface: 'light', state: 'rest' })
  expect([18, 22]).toContain(Number(opticalSize))

  return { seal: item, request: { glyph: glyph as StrokeGlyphKey, size: Number(opticalSize) as 18 | 22, line: 'engine' as const, surface: 'light' as const, state: 'rest' as const } }
})

describe('AI Visibility PDF — resource bundle and provenance', () => {
  it('seals the unpublished AXIS layout extension to the approved source archive', () => {
    expect(layoutProjection.status).toBe('local-unpublished')
    expect(layoutProjection.extendsContract).toEqual({ id: 'efeonce.ai-visibility-report', version: '0.1.0' })
    expect(sha(JSON.stringify(layoutProjection.extension))).toBe(layoutProjection.extensionSha256)
    expect(sha(readFileSync(archive))).toBe(layoutProjection.source.approvedArchive.sha256)
    expect(layoutProjection.source.sha256).toMatch(/^[a-f0-9]{64}$/)

    const approvedGenerator = execFileSync('tar', ['-xOf', archive, layoutProjection.source.approvedArchive.member], { encoding: 'utf8' })

    expect(approvedGenerator).toContain('CHAPTERS=')
    expect(approvedGenerator).toContain('DIMS=')
  })

  it('ships decodable, nonempty PNGs at their sealed paths and dimensions', async () => {
    expect(assets.schema).toBe('efeonce.ai-visibility-pdf-assets.v1')
    expect(new Set(assets.outputs.map(item => item.file)).size).toBe(assets.outputs.length)
    expect(Object.keys(AI_VISIBILITY_PDF_ASSET_PATHS).sort()).toEqual(assets.outputs.map(item => item.file.replace(/^ai-visibility-/, '').replace(/\.png$/, '')).sort())

    for (const seal of assets.outputs) {
      expect(seal.file).toBe(basename(seal.file))
      expect(seal.file).toMatch(/^ai-visibility-.+\.png$/)
      const id = seal.file.replace(/^ai-visibility-/, '').replace(/\.png$/, '')

      expect(AI_VISIBILITY_PDF_ASSET_PATHS[id]).toBe(resolve(assetDir, seal.file))
      const bytes = readFileSync(resolve(assetDir, seal.file))

      expect(sha(bytes), seal.file).toBe(seal.pngSha256)
      const image = sharp(bytes)
      const metadata = await image.metadata()

      expect(metadata.format, seal.file).toBe('png')
      expect([metadata.width, metadata.height], seal.file).toEqual([seal.width, seal.height])
      const stats = await image.ensureAlpha().stats()

      expect(stats.channels.at(-1)?.max, seal.file).toBeGreaterThan(0)
    }
  })

  it('uses official AXIS files for logos, all five engines and social marks', () => {
    for (const seal of assets.outputs.filter(item => !item.sourceId.startsWith('axis-graphic-line/icons:'))) {
      const brand = findBrandAsset(seal.sourceId)
      const platform = findPlatformAsset(seal.sourceId)
      const email = findEmailAsset(seal.sourceId)
      const source = brand ?? platform ?? email

      expect(source, seal.sourceId).toBeDefined()
      if (!source) throw new Error(`Missing official resource ${seal.sourceId}`)
      const url = brand ? brandAssetUrl(brand.id) : platform ? platformAssetUrl(platform.id) : email ? emailAssetUrl(email.id) : null

      if (!url) throw new Error(`Missing official resource URL ${seal.sourceId}`)

      expect(sha(readFileSync(fileURLToPath(url))), seal.sourceId).toBe(source.sha256)
      expect(seal.sourceSha256, seal.sourceId).toBe(source.sha256)
      if (email) expect(seal.pngSha256, seal.sourceId).toBe(source.sha256)
    }

    for (const engine of ['chatgpt', 'claude', 'gemini', 'perplexity', 'google-ai-overview']) {
      expect(assets.outputs.some(item => item.sourceId === `${engine}-isotype`), engine).toBe(true)
    }
  })

  it('keeps the approved Trazo optical glyphs in rest state alongside the report sphere', () => {
    expect(auditIconGroup(iconRequests.map(item => item.request), { pieceHasSphere: true }).ok).toBe(true)
    expect(iconRequests.map(item => `${item.request.glyph}_${item.request.size}`).sort()).toEqual(Object.keys(approvedIcons).sort())

    for (const { seal, request } of iconRequests) {
      const official = resolveIcon(request)
      const approved = approvedIcons[`${request.glyph}_${request.size}`]

      expect(approved, seal.sourceId).toBeDefined()
      expect(official.svg, seal.sourceId).toBe(approved)
      expect(sha(official.svg), seal.sourceId).toBe(seal.sourceSha256)
      expect(official.voice).toBe('stroke')
      expect(official.warnings).toEqual([])
    }
  })

  it('embeds static Bricolage instances from the licensed, sealed variable source', () => {
    expect(fonts.schema).toBe('efeonce.ai-visibility-pdf-fonts.v1')
    expect(sha(readFileSync(resolve(fontDir, fonts.source)))).toBe(fonts.sourceSha256)
    expect(readFileSync(resolve(fontDir, fonts.license), 'utf8')).toContain('SIL OPEN FONT LICENSE')
    expect(fonts.tool).toEqual({ name: 'fonttools', version: '4.60.1' })
    const source = fontkit.openSync(resolve(fontDir, fonts.source))

    for (const seal of fonts.outputs) {
      const bytes = readFileSync(resolve(fontDir, seal.file))
      const font = fontkit.openSync(resolve(fontDir, seal.file))

      expect(sha(bytes), seal.file).toBe(seal.sha256)
      expect(bytes.length, seal.file).toBe(seal.bytes)
      expect(font.familyName, seal.file).toBe(seal.family)
      expect(font.variationAxes, seal.file).toEqual({})
      expect(font['OS/2'].usWeightClass, seal.file).toBe(seal.axes.wght)

      for (const [axis, value] of Object.entries(seal.axes)) {
        expect(value).toBeGreaterThanOrEqual(source.variationAxes[axis].min)
        expect(value).toBeLessThanOrEqual(source.variationAxes[axis].max)
      }

      for (const character of 'áéíóúñüÁÉÍÓÚÑÜãõçÃÕÇâêôàÂÊÔÀ—→') {
        expect(font.hasGlyphForCodePoint(character.codePointAt(0)!), `${seal.family}: ${character}`).toBe(true)
      }
    }

    for (const role of Object.values(layoutProjection.extension.type.editorial)) {
      if (role.family === 'Bricolage Grotesque') expect(fonts.outputs.some(item => item.axes.wght === role.weight)).toBe(true)
    }
  })

  it('loads every report family from local files and preserves the shared Poppins 600 alias', async () => {
    await ensurePdfFontsRegistered()

    for (const seal of fonts.outputs) {
      await Font.load({ fontFamily: seal.family })
      const registered = Font.getFont({ fontFamily: seal.family })

      expect(registered.src, seal.family).toBe(resolve(fontDir, seal.file))
      expect(registered.data?.familyName, seal.family).toBe(seal.family)
    }

    for (const [family, file, weight] of [
      ['Poppins Light', 'Poppins-Light.ttf', 300],
      ['Poppins Regular', 'Poppins-Regular.ttf', 400],
      ['Poppins', 'Poppins-SemiBold.ttf', 600]
    ] as const) {
      await Font.load({ fontFamily: family })
      const registered = Font.getFont({ fontFamily: family })

      expect(registered.src, family).toBe(resolve(fontDir, file))
      const font = fontkit.openSync(registered.src)

      expect(font['OS/2'].usWeightClass, family).toBe(weight)

      for (const character of 'áéíóúñüãõçâêôà—') {
        expect(font.hasGlyphForCodePoint(character.codePointAt(0)!), `${family}: ${character}`).toBe(true)
      }
    }
  })
})
