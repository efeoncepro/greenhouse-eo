import { readFileSync } from 'node:fs'
import path from 'node:path'

import { platformIsotypeFor } from '@efeoncepro/axis-brand-assets'
import { describe, expect, it } from 'vitest'

import { CHANNEL_ISOTYPES } from '@/lib/artifact-composer/catalogs/insights-shared/channels'

// Los isotipos de canal de los catálogos de Insights son copias de AXIS_PLATFORM_ASSETS (@efeoncepro/axis-brand-assets):
// el catálogo viaja solo al worker, así que guarda su copia, pero la copia debe ser idéntica al archivo oficial.
const CATALOGS = ['insights-report', 'insights-deck'] as const

describe('isotipos de canal de los catálogos de Insights = AXIS_PLATFORM_ASSETS', () => {
  const cases = CATALOGS.flatMap(catalog => Object.entries(CHANNEL_ISOTYPES).map(([platform, file]) => [catalog, platform, file] as const))

  it.each(cases)('%s · %s es la copia exacta del isotipo de AXIS', (catalog, platform, file) => {
    const official = platformIsotypeFor(platform)

    expect(official, `${platform} no está en AXIS_PLATFORM_ASSETS`).toBeDefined()

    const copy = readFileSync(path.join(process.cwd(), 'src/lib/artifact-composer/catalogs', catalog, file))
    const source = readFileSync(new URL(`../assets/${official!.file}`, import.meta.resolve('@efeoncepro/axis-brand-assets')))

    expect(copy.equals(source)).toBe(true)
  })

  it('AI Overview usa su lupa en color, no la G de Google', () => {
    expect(CHANNEL_ISOTYPES.google_ai_overview).toBe('assets/channels/google-ai-overview.svg')
  })
})
