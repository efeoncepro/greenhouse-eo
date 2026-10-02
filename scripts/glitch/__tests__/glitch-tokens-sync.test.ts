import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import { glitchLine } from '@efeoncepro/axis-tokens'

import { glitchCatalogDir } from '../../../src/lib/artifact-composer/catalogs/glitch/brand'
import { buildGlitchTokenArtifacts } from '../glitch-tokens'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const brandAssets = path.join(path.dirname(require.resolve('@efeoncepro/axis-brand-assets/package.json')), 'assets')
const read = (rel: string) => fs.readFileSync(path.join(glitchCatalogDir, rel))

describe('glitch tokens (pnpm glitch:tokens)', () => {
  it('the committed CSS and JSON are exactly what glitchLine compiles to', () => {
    const { css, json } = buildGlitchTokenArtifacts()

    expect(read('glitch-tokens.css').toString(), 'corre pnpm glitch:tokens').toBe(css)
    expect(read('glitch-tokens.json').toString(), 'corre pnpm glitch:tokens').toBe(json)
  })

  it('the official files are byte-identical copies of @efeoncepro/axis-brand-assets', () => {
    for (const [dest, src] of [
      ['glitch-logo-negative.svg', 'glitch/glitch-logo-negative.svg'],
      ['glitch-apple.svg', 'glitch/glitch-apple.svg'],
      ['efeonce-logo-negative.svg', 'efeonce-logo-negative.svg']
    ]) {
      expect(read(`assets/${dest}`).equals(fs.readFileSync(path.join(brandAssets, src))), dest).toBe(true)
    }
  })

  it('the five action icons are flat Plastilina (rest state, no line sphere, never the volume)', () => {
    for (const glyph of glitchLine.icons.glitchGlyphs) {
      const svg = read(`assets/icon-${glyph}.svg`).toString()

      expect(svg).toMatch(/^<svg /)
      expect(svg).not.toMatch(/<image|\.png/)
      expect(svg).not.toMatch(/#36c8bf|#ff6500/)
    }

    expect(glitchLine.icons.actions.volume).toBe('never')
  })

  it('the pack extension glitch carries Guttery with embed rights and Bricolage as a weight range', () => {
    const pack = JSON.parse(fs.readFileSync(path.join(glitchCatalogDir, '../../brand-packs/axis/fonts.json'), 'utf8')) as {
      fonts: { family: string; weight: number | string; extension?: string; embedRights: boolean; license: string }[]
    }

    const glitch = pack.fonts.filter((f) => f.extension === 'glitch')

    expect(glitch.map((f) => `${f.family} ${f.weight}`).sort()).toEqual(['Bricolage Grotesque 200 800', 'Guttery 400', 'Poppins 400', 'Poppins 500'])
    expect(glitch.every((f) => f.embedRights)).toBe(true)
    expect(glitch.find((f) => f.family === 'Guttery')?.license).toMatch(/2026-09-27/)
    expect(read('deck-fonts.css').toString()).toContain("font-family: 'Guttery'")
  })
})
