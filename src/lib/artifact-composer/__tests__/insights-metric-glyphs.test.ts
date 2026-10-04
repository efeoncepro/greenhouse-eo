/**
 * TASK-1990/1996 — los glifos Trazo de las métricas en las plantillas de Insights son los de AXIS (sello
 * `metric-glyphs.axis.json`, axis-graphic-line 0.16.0) y la lista del catálogo es la misma que la del dominio
 * (`metricGlyphOf`). Una plantilla con un trazo distinto o una clave que el dominio emite sin glifo rompe aquí.
 */
import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { METRIC_GLYPH_KEYS } from '@/lib/efeonce-insights/presentation/metric-glyphs'

import seal from '../catalogs/insights-shared/metric-glyphs.axis.json'
import { CATALOG_METRIC_GLYPH_KEYS } from '../catalogs/insights-shared/metric-glyphs'

const TEMPLATES = [
  'insights-report/report-figure-stat.html',
  'insights-report/report-figure-comparison.html',
  'insights-report/report-figure-targets.html',
  'insights-deck/insights-figure-stat.html',
  'insights-deck/insights-figure-comparison.html',
  'insights-deck/insights-figure-targets.html',
  'insights-report/report-table.html'
]

const glyphs = seal.glyphs as Record<string, string[]>

describe('glifos Trazo de las métricas', () => {
  it('el catálogo, el dominio y el sello de AXIS tienen las mismas claves', () => {
    expect([...CATALOG_METRIC_GLYPH_KEYS].sort()).toEqual([...METRIC_GLYPH_KEYS].sort())
    expect(Object.keys(glyphs).sort()).toEqual([...CATALOG_METRIC_GLYPH_KEYS].sort())
  })

  it.each(TEMPLATES)('%s lleva cada glifo con los trazos exactos de AXIS', template => {
    const html = fs.readFileSync(path.join(process.cwd(), 'src/lib/artifact-composer/catalogs', template), 'utf8')

    for (const key of CATALOG_METRIC_GLYPH_KEYS) {
      const match = html.match(new RegExp(`<svg class="stroke-icon m-${key}"[^>]*>(.*?)</svg>`))

      expect(match, `${template}: falta m-${key}`).not.toBeNull()
      expect([...match![1]!.matchAll(/<path d="([^"]+)"><\/path>/g)].map(m => m[1]), `${template}: m-${key}`).toEqual(glyphs[key])
    }
  })
})
