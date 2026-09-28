import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { parseGlitchEditionManifest, type GlitchEditionManifest } from '../manifest'
import { GlitchPieceError } from '../types'

const EXAMPLE = path.resolve(__dirname, '../examples/edition-17.example.json')
const load = (): GlitchEditionManifest => JSON.parse(readFileSync(EXAMPLE, 'utf8'))

const issuesOf = (input: unknown) => {
  try {
    parseGlitchEditionManifest(input)

    return []
  } catch (error) {
    expect(error).toBeInstanceOf(GlitchPieceError)
    expect((error as GlitchPieceError).code).toBe('manifest-invalid')

    return (error as GlitchPieceError).issues
  }
}

describe('GlitchEditionManifest', () => {
  it('validates the #17 example, marked as example with synthetic generated photos', () => {
    const manifest = parseGlitchEditionManifest(load())

    expect(manifest.edition.number).toBe(17)
    expect(manifest.previousEdition.number).toBe(16)
    expect(manifest.example).toBe(true)
    expect(manifest.news).toHaveLength(8)

    for (const news of manifest.news) {
      expect(news.headline.startsWith('[Ejemplo]')).toBe(true)
      expect(news.photo.license.kind).toBe('generated')
    }
  })

  it('rejects a photo without credit or license, pointing at the field', () => {
    const noCredit = load()

    delete (noCredit.news[2].photo as Partial<typeof noCredit.news[2]['photo']>).credit
    expect(issuesOf(noCredit).map((i) => i.path)).toContain('news[2].photo.credit')

    const noLicense = load()

    delete (noLicense.news[0].photo as Partial<typeof noLicense.news[0]['photo']>).license
    expect(issuesOf(noLicense)).toContainEqual(expect.objectContaining({ path: 'news[0].photo.license', code: 'field-required' }))
  })

  it('rejects a press kit as license (operator decision, 2026-09-27)', () => {
    const manifest = load() as unknown as { news: { photo: { license: { kind: string } } }[] }

    manifest.news[1].photo.license.kind = 'press-kit'
    expect(issuesOf(manifest).map((i) => i.path)).toContain('news[1].photo.license.kind')
  })

  it('rejects the press exception in the weekly edition with its own code (it only exists in a Glitch Flash)', () => {
    const manifest = load() as unknown as { news: { photo: { license: Record<string, unknown> } }[] }

    manifest.news[3].photo.license = {
      kind: 'press',
      ref: 'https://www.anthropic.com/news',
      approval: { approvedBy: 'julio-reyes', approvedOn: '2026-09-28', flash: 'x', reason: 'x' }
    }
    expect(issuesOf(manifest)).toContainEqual(expect.objectContaining({ code: 'press-license-weekly-not-allowed', path: 'news[3].photo.license.kind' }))

    // Con la forma que sea: la semanal no la valida, la rechaza.
    manifest.news[3].photo.license = { kind: 'press' }
    expect(issuesOf(manifest)).toEqual([expect.objectContaining({ code: 'press-license-weekly-not-allowed', path: 'news[3].photo.license.kind' })])
  })

  describe('video.closingLine — la muletilla del cierre del video varía por edición', () => {
    const withOverlays = (closingLine: unknown) => {
      const manifest = load() as unknown as { video: Record<string, unknown>; outputs: { overlays: string[] } }

      if (closingLine === undefined) delete manifest.video.closingLine
      else manifest.video.closingLine = closingLine

      manifest.outputs.overlays = ['reel', 'vlog']

      return manifest
    }

    it('reads it from the manifest (the example keeps the text the overlay always had)', () => {
      expect(parseGlitchEditionManifest(load()).video?.closingLine).toBe('el #18 sale el lunes.')
      expect(parseGlitchEditionManifest(withOverlays('nos vemos en el blog.')).video?.closingLine).toBe('nos vemos en el blog.')
    })

    it('is required when overlays are requested: an old manifest fails with field-required, never a fixed phrase', () => {
      expect(issuesOf(withOverlays(undefined))).toContainEqual(expect.objectContaining({ code: 'field-required', path: 'video.closingLine' }))
      expect(issuesOf(withOverlays('   '))).toContainEqual(expect.objectContaining({ path: 'video.closingLine' }))
    })

    it('is optional without overlays', () => {
      const manifest = withOverlays(undefined) as unknown as { outputs: { overlays: string[] } }

      manifest.outputs.overlays = []
      expect(parseGlitchEditionManifest(manifest).video?.closingLine).toBeUndefined()
    })

    it('rejects a phrase the operator rejected, an unresolved #N and a number that is not the next edition', () => {
      expect(issuesOf(withOverlays('El resto, el lunes.'))).toContainEqual(expect.objectContaining({ code: 'field-invalid', path: 'video.closingLine' }))
      expect(issuesOf(withOverlays('el #N sale el lunes.'))).toContainEqual(expect.objectContaining({ path: 'video.closingLine' }))
      expect(issuesOf(withOverlays('el #19 sale el lunes.'))).toContainEqual(
        expect.objectContaining({ path: 'video.closingLine', message: 'la muletilla anuncia el #19, pero la próxima edición es la #18' })
      )
    })
  })

  it('requires faceRegions explicitly ([] means no faces)', () => {
    const manifest = load()

    delete (manifest.news[3].photo as Partial<typeof manifest.news[3]['photo']>).faceRegions
    expect(issuesOf(manifest).map((i) => i.path)).toContain('news[3].photo.faceRegions')
  })

  it('requires exactly eight news in order, and a POV per news', () => {
    const seven = load()

    seven.news.pop()
    expect(issuesOf(seven).map((i) => i.path)).toContain('news')

    const swapped = load()

    ;[swapped.news[0], swapped.news[1]] = [swapped.news[1], swapped.news[0]]
    expect(issuesOf(swapped).some((i) => i.path === 'news[0].id')).toBe(true)

    const noPov = load()

    delete (noPov.news[5] as Partial<typeof noPov.news[5]>).pov
    expect(issuesOf(noPov).map((i) => i.path)).toContain('news[5].pov')
  })

  it('never lets the author choose the template of this edition', () => {
    const withTemplate = { ...load(), template: 'CoverPhoto' }

    expect(issuesOf(withTemplate)).toContainEqual(expect.objectContaining({ code: 'field-unknown' }))

    const withCoverTemplate = load() as unknown as { cover: Record<string, unknown> }

    withCoverTemplate.cover.coverTemplate = 'A'
    expect(issuesOf(withCoverTemplate)).toContainEqual(expect.objectContaining({ code: 'field-unknown', path: 'cover' }))
  })

  it('checks references between news, cover, mosaic and video', () => {
    const badCover = load()

    badCover.cover.newsId = 'n9'
    expect(issuesOf(badCover).map((i) => i.path)).toContain('cover.newsId')

    const repeated = load()

    repeated.cover.mosaic = ['n2', 'n2', 'n4', 'n5']
    expect(issuesOf(repeated).map((i) => i.path)).toContain('cover.mosaic')

    const drop = load()

    drop.video!.drop.newsId = 'n7'
    expect(issuesOf(drop).map((i) => i.path)).toContain('video.drop.newsId')
  })

  it('rejects a face region outside the photo', () => {
    const manifest = load()

    manifest.news[0].photo.faceRegions = [{ x: 0.9, y: 0.1, w: 0.2, h: 0.2 }]
    expect(issuesOf(manifest).map((i) => i.path)).toContain('news[0].photo.faceRegions[0]')
  })
})
