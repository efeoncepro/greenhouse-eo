import { readFileSync } from 'node:fs'
import path from 'node:path'

import { brandAssetUrl, type AxisBrandAssetId } from '@efeoncepro/axis-brand-assets'
import { describe, expect, it } from 'vitest'

// The official brand files live in @efeoncepro/axis-brand-assets (AXIS). Greenhouse still keeps local copies that
// renderers and catalogs read; they must carry the same drawing as the package. Whitespace is ignored (the only
// difference found on 2026-09-26 was a trailing newline); any other change means a copy drifted from the source.
const LOCAL_COPIES: ReadonlyArray<[string, AxisBrandAssetId]> = [
  ['public/branding/logo-full.svg', 'efeonce-logo-positive'],
  ['public/branding/logo-negative.svg', 'efeonce-logo-negative'],
  ['public/branding/SVG/isotipo-full-efeonce.svg', 'efeonce-isotype-positive'],
  ['public/branding/SVG/isotipo-efeonce-negativo.svg', 'efeonce-isotype-negative'],
  ['docs/operations/brand-graphic-line/deliverables/assets/url-lum-light.svg', 'url-bubble-baked-light'],
  ['docs/operations/brand-graphic-line/deliverables/assets/url-lum-dark.svg', 'url-bubble-baked-dark'],
  ['src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg', 'url-bubble-source'],
  ['src/lib/artifact-composer/catalogs/insights-report/assets/url-lum.svg', 'url-bubble-source'],
  ['src/lib/artifact-composer/catalogs/insights-deck/assets/url-lum.svg', 'url-bubble-source']
]

const drawing = (svg: string) => svg.replace(/\s+/g, '')

describe('Efeonce brand files match @efeoncepro/axis-brand-assets', () => {
  it.each(LOCAL_COPIES)('%s carries the drawing of %s', (local, id) => {
    const copy = readFileSync(path.join(process.cwd(), local), 'utf8')
    const official = readFileSync(brandAssetUrl(id), 'utf8')

    expect(drawing(copy)).toBe(drawing(official))
  })
})
