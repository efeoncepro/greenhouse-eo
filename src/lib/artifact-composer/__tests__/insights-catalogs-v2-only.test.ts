/**
 * TASK-1889 — en los catálogos Insights sólo existe el diseño editorial (v2). Decisión del operador
 * (2026-09-25): las plantillas del canvas aprobado REEMPLAZAN a las v1 de TASK-1847; no conviven, para
 * que ningún agente componga con una v1 cuando ya existe su v2.
 *
 * Qué verifica esta guarda y qué no. Mira el REGISTRY y el molde que enlaza cada plantilla —el dato
 * que el selector usa para elegir—, no el render. El render lo verifican `pnpm composer:visual-gate
 * --catalog=insights` (cero píxeles) y `pnpm insights:canvas-fidelity` (contra el canvas aprobado).
 *
 * Legado: NINGUNO. Las páginas de gráfico v1 (`ReportAnalysisPage`, `InsightsEvidenceSlide`) y sus moldes
 * v1 se retiraron en el Slice 4 de TASK-1889; cada familia con productor tiene su página de figura premium.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { insightsDeckCatalogDir } from '../catalogs/insights-deck'
import { insightsReportCatalogDir } from '../catalogs/insights-report'

interface RegistryEntry {
  name: string
  status: string
  replacedBy?: string
  contentTypes: string[]
  prototype: string
}

const CATALOGS = [
  { name: 'insights-report', dir: insightsReportCatalogDir, editorialMold: 'report-editorial.css', legacyMold: 'report-mold.css' },
  { name: 'insights-deck', dir: insightsDeckCatalogDir, editorialMold: 'deck-editorial.css', legacyMold: 'deck-mold.css' }
]

/** Nombres que existieron sólo como transición y NO pueden volver: el canónico es el contentType de siempre. */
const RETIRED_TEMPLATE_NAMES = [
  'ReportCoverNavyPage',
  'ReportContentsPage',
  'ReportDenseTablePage',
  'ReportLimitsV2Page',
  'InsightsCoverNavySlide',
  // Retiradas en el Slice 4: las reemplazan las páginas de figura premium.
  'ReportAnalysisPage',
  'InsightsEvidenceSlide'
]

/** Legado permitido: ninguno desde el Slice 4 de TASK-1889. */
const ALLOWED_LEGACY = new Set<string>()

describe.each(CATALOGS)('catálogo $name: sólo diseño editorial', ({ dir, editorialMold, legacyMold }) => {
  const registry = JSON.parse(fs.readFileSync(path.join(dir, 'registry.json'), 'utf8')) as {
    templates: RegistryEntry[]
    selector: { map: Record<string, string> }
  }

  it('cada plantilla construida enlaza el molde editorial y ninguna el molde v1', () => {
    for (const entry of registry.templates.filter(t => t.status !== 'legacy')) {
      const html = fs.readFileSync(path.join(dir, entry.prototype), 'utf8')

      expect(html, entry.name).toContain(`href="${editorialMold}"`)
      expect(html, entry.name).not.toContain(`href="${legacyMold}"`)
    }
  })

  it('el legado es sólo el permitido y declara quién lo reemplaza', () => {
    for (const entry of registry.templates.filter(t => t.status === 'legacy')) {
      expect(ALLOWED_LEGACY.has(entry.name), `${entry.name} no está permitido como legado`).toBe(true)
      expect(entry.replacedBy, `${entry.name} sin replacedBy`).toBeTruthy()
    }
  })

  it('un contentType tiene una sola plantilla (no conviven v1 y v2)', () => {
    const owners = new Map<string, string[]>()

    for (const entry of registry.templates) {
      for (const contentType of entry.contentTypes) owners.set(contentType, [...(owners.get(contentType) ?? []), entry.name])
    }

    for (const [contentType, names] of owners) expect(names, contentType).toHaveLength(1)
  })

  it('los nombres de transición no vuelven, ni en el registry ni como archivo', () => {
    const names = registry.templates.map(t => t.name)
    const files = fs.readdirSync(dir).join('\n')

    for (const retired of RETIRED_TEMPLATE_NAMES) expect(names).not.toContain(retired)

    expect(files).not.toMatch(/-(navy|v2)\.(html|slots\.json)$/m)
    expect(files).not.toMatch(/report-(contents|dense-table)\./)
    // El molde v1 no vuelve: una plantilla nueva no puede enlazarlo porque ya no existe.
    expect(fs.existsSync(path.join(dir, legacyMold))).toBe(false)
  })
})
