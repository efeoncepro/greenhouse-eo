import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

import { describe, expect, it } from 'vitest'

import { efeonceGraphicLine as GL } from '@efeoncepro/axis-tokens'

import { manzanitasCatalogDir } from '../../../src/lib/artifact-composer/catalogs/manzanitas/brand'
import { buildManzanitasOutputs, recolorAccentGroup, swipeVoiceOf } from '../compile-tokens'
import { measureSloganEm, sloganEmOf } from '../manzanitas-tokens'

const require = createRequire(path.join(process.cwd(), 'package.json'))
const brandAssets = path.join(path.dirname(require.resolve('@efeoncepro/axis-brand-assets/package.json')), 'assets')

describe('manzanitas tokens (pnpm manzanitas:tokens)', () => {
  it('every committed output is exactly what the pinned AXIS packages compile to (same check as --check)', () => {
    for (const [file, bytes] of buildManzanitasOutputs()) {
      expect(fs.existsSync(file) && fs.readFileSync(file).equals(bytes), `${path.relative(process.cwd(), file)}: corre pnpm manzanitas:tokens`).toBe(true)
    }
  })

  it('the official files are byte-identical copies of @efeoncepro/axis-brand-assets', () => {
    for (const [dest, src] of [
      ['manzanitas-wordmark-positive.svg', 'manzanitas/manzanitas-wordmark-positive.svg'],
      ['manzanitas-wordmark-negative.svg', 'manzanitas/manzanitas-wordmark-negative.svg'],
      ['efeonce-logo-negative.svg', 'efeonce-logo-negative.svg'],
      ['efeonce-logo-positive.svg', 'efeonce-logo-positive.svg']
    ]) {
      expect(fs.readFileSync(path.join(manzanitasCatalogDir, 'assets', dest)).equals(fs.readFileSync(path.join(brandAssets, src))), dest).toBe(true)
    }
  })

  it('recolouring paints only the accent group; the rest of the official SVG stays as published', () => {
    const svg = '<svg><path fill="#001a33" d="M0"/><g data-axis-accent="topic-line"><path fill="#123456" d="M1"/><circle fill="#123456"/></g></svg>'
    const painted = recolorAccentGroup(svg, '#0375db')

    expect(painted).toContain('<path fill="#001a33" d="M0"/>')
    expect(painted.match(/#0375db/g)).toHaveLength(2)
    expect(() => recolorAccentGroup('<svg></svg>', '#0375db')).toThrow(/data-axis-accent/)
  })

  it('the slogan width comes from AXIS, and the catalog fonts measure exactly what AXIS publishes (drift)', () => {
    // AXIS publica el ancho (efeonceGraphicLine.slogan.widthEmByWord, axis-tokens 0.3.29); la medición con fontkit sobre
    // las fuentes que pinta el render tiene que dar lo mismo: si no, el eslogan saldría a otro ancho que el del contrato.
    for (const line of GL.lines) expect(measureSloganEm(line.sloganWord), line.sloganWord).toBe(sloganEmOf(line.sloganWord))
    expect(sloganEmOf('Growth')).toBe(11.586)
  })

  it('every line has its slogan width; the one of the line word decides the body size of the close', () => {
    const css = fs.readFileSync(path.join(manzanitasCatalogDir, 'manzanitas-tokens.css'), 'utf8')

    for (const line of GL.lines) expect(css, line.key).toContain(`.mcm-line-${line.key} {\n  --mcm-accent-paper: ${line.accentOnLight};\n  --mcm-accent-navy: ${line.accentOnDark};\n  --mcm-slogan-em: ${measureSloganEm(line.sloganWord)};`)
  })

  it('«Desliza» speaks the voice of its line; Voice, without a La órbita voice, takes Trazo (decision 2026-09-29)', () => {
    expect(swipeVoiceOf('voice')).toBe('stroke')

    for (const line of GL.lines) expect(['stroke', 'plastilina'], line.key).toContain(swipeVoiceOf(line.key))
  })

  it('the pack extension manzanitas carries Bricolage as a weight range and Poppins 400 and 500', () => {
    const pack = JSON.parse(fs.readFileSync(path.join(manzanitasCatalogDir, '../../brand-packs/axis/fonts.json'), 'utf8')) as {
      fonts: { family: string; weight: number | string; extension?: string; embedRights: boolean }[]
    }

    const fonts = pack.fonts.filter((f) => f.extension === 'manzanitas')

    expect(fonts.map((f) => `${f.family} ${f.weight}`).sort()).toEqual(['Bricolage Grotesque 200 800', 'Poppins 400', 'Poppins 500'])
    expect(fonts.every((f) => f.embedRights)).toBe(true)
  })
})
