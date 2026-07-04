// @vitest-environment jsdom

/**
 * TASK-1252 — AI Visibility Report Artifact · no-leak VISUAL test (Slice C, defensa capa C).
 *
 * Los DTOs ya son leak-safe por tipo (capa A) + builder (capa B). Esta capa cierra
 * el RENDER: que el artifact publicWeb/clientPortal NO pinte data internal-only aunque
 * provenga del mismo run interno. El fixture deriva del `GraderReport` interno que SÍ
 * tiene providerFindings/accuracyFindings/internal text marcados con "INTERNAL".
 */

import { describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'
import { GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT } from '@/lib/copy/growth'
import type { PublicGraderReport } from '@/lib/growth/ai-visibility/report'

import AiVisibilityReportArtifact, { type ReportHeader } from '../web/AiVisibilityReportArtifact'
import AiVisibilityReportPrint from '../print/AiVisibilityReportPrint'
import { SAMPLE_CLIENT_REPORT, SAMPLE_PUBLIC_REPORT } from '../fixtures'
import { modelFromClientReport, modelFromPublicReport, reportSectionVisible } from '../model'

// jsdom no trae IntersectionObserver (AnimatedCounter) ni ResizeObserver (Recharts).
class MockObserver {
  disconnect() {}
  observe() {}
  takeRecords() {
    return []
  }
  unobserve() {}
}

window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver
window.ResizeObserver = MockObserver as unknown as typeof ResizeObserver

const HEADER: ReportHeader = { organizationName: 'Globe', reportDate: '20 may 2025', periodLabel: '5–18 may 2025' }
const C_TREND_TITLE = GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT.signals.trendTitle

// Strings internal-only que NUNCA deben aparecer en el render público/cliente.
// Nota: la PRESENCIA por motor (sección "Visibilidad por motor" con conteos + logo + nombre)
// SÍ es pública (TASK-1252); lo internal-only es la NARRATIVA cruda por motor (providerFindings).
const INTERNAL_LEAK_STRINGS = [
  'INTERNAL',
  'invisible en Perplexity',
  'confusión con una marca homónima',
  'Confusión de identidad'
]

const PUBLIC_REPORT_WITH_READINESS: PublicGraderReport = {
  ...SAMPLE_PUBLIC_REPORT,
  readiness: {
    scoreVersion: 'ai_readiness_score_v1',
    structural: {
      axis: 'structural',
      overallScore: 58,
      severity: 'atencion',
      dimensions: [
        {
          key: 'json_ld',
          label: 'Datos estructurados',
          score: 58,
          max: 100,
          status: 'ok',
          severity: 'atencion'
        }
      ],
      coverage: { probed: 1, measured: 1 }
    },
    agentic: {
      axis: 'agentic',
      overallScore: 64,
      severity: 'atencion',
      dimensions: [
        {
          key: 'well_known_mcp',
          label: 'MCP discoverability',
          score: 64,
          max: 100,
          status: 'ok',
          severity: 'atencion'
        }
      ],
      coverage: { probed: 1, measured: 1 }
    }
  }
}

describe('AiVisibilityReportArtifact — no-leak visual', () => {
  it('publicWeb no filtra data internal-only', () => {
    const model = modelFromPublicReport(SAMPLE_PUBLIC_REPORT)
    const { container } = renderWithTheme(<AiVisibilityReportArtifact model={model} header={HEADER} />)
    const html = container.innerHTML

    for (const leak of INTERNAL_LEAK_STRINGS) {
      expect(html).not.toContain(leak)
    }

    // Sanity: SÍ renderiza contenido público-safe esperado.
    expect(container.textContent).toContain('Globe')
    expect(container.textContent).toContain('Competidor A')
  })

  it('clientPortal no filtra data internal-only', () => {
    const model = modelFromClientReport(SAMPLE_CLIENT_REPORT)
    const { container } = renderWithTheme(<AiVisibilityReportArtifact model={model} header={HEADER} />)
    const html = container.innerHTML

    for (const leak of INTERNAL_LEAK_STRINGS) {
      expect(html).not.toContain(leak)
    }
  })

  it('engineSnapshot (visibilidad por motor) es público en todas las variants', () => {
    expect(reportSectionVisible('publicWeb', 'engineSnapshot')).toBe(true)
    expect(reportSectionVisible('clientPortal', 'engineSnapshot')).toBe(true)
    expect(reportSectionVisible('attachment', 'engineSnapshot')).toBe(true)
    expect(reportSectionVisible('adminPreview', 'engineSnapshot')).toBe(true)
  })

  it('publicWeb muestra canales de respuesta con logos + nombres de motor', () => {
    const model = modelFromPublicReport(SAMPLE_PUBLIC_REPORT)
    const { container } = renderWithTheme(<AiVisibilityReportArtifact model={model} header={HEADER} />)

    expect(container.textContent).toContain(GH_GROWTH_AI_VISIBILITY_REPORT_ARTIFACT.engineSnapshot.title)
    expect(container.textContent).toContain('Gemini (Google)')
    expect(container.textContent).toContain('Perplexity')
  })

  it('publicWeb materializa Be Actionable desde readiness agentic sin mezclarlo con percepción', () => {
    const model = modelFromPublicReport(PUBLIC_REPORT_WITH_READINESS)
    const actionable = model.levels.find(level => level.id === 'actionable')

    expect(model.agenticAxisScore).toBe(64)
    expect(actionable).toMatchObject({
      id: 'actionable',
      axis: 'agentic',
      score: 64,
      status: 'measured',
      severity: 'atencion'
    })
    expect(model.perceptionAxisScore).not.toBe(model.agenticAxisScore)
    expect(model.overallScore).toBe(SAMPLE_PUBLIC_REPORT.overallScore)
  })

  it('publicWeb expone señales additive public-safe para el hub sin reasons internos', () => {
    const model = modelFromPublicReport(PUBLIC_REPORT_WITH_READINESS)
    const serialized = JSON.stringify(model)

    expect(model.citationSourceBreakdown.domains[0]).toMatchObject({ domain: 'g2.com' })
    expect(model.categoryTaxonomySummary.status).toBe('mapped')
    expect(model.readiness?.agentic.overallScore).toBe(64)
    expect(model.viewFacts.engineCoverage.summary.shareOfModel).toBe(71)
    expect(model.viewFacts.citationTotals).toMatchObject({
      ownDomain: 9,
      competitor: 7,
      thirdParty: 18,
      ugc: 11
    })
    expect(model.viewFacts.dimensionHighlights.critical).toContainEqual({
      key: 'citation_quality',
      label: 'Citation Quality',
      score: 32
    })
    expect(model.levels.filter(level => level.isNext)).toHaveLength(1)
    expect(model.levels.find(level => level.isNext)?.id).toBe('readable')
    expect(serialized).not.toContain('razón interna')
    expect(serialized).not.toContain('providerFindings')
    expect(serialized).not.toContain('accuracyFindings')
    expect(serialized).not.toContain('rawEvidencePointer')
    expect(serialized).not.toContain('providerRequestHash')
  })

  it('print/attachment adapter renderiza público-safe (sin leak, sin trend/engine)', () => {
    const model = modelFromPublicReport(SAMPLE_PUBLIC_REPORT, 'attachment')
    const { container } = renderWithTheme(<AiVisibilityReportPrint model={model} header={HEADER} />)
    const html = container.innerHTML

    for (const leak of INTERNAL_LEAK_STRINGS) {
      expect(html).not.toContain(leak)
    }

    // Contenido esperado del attachment.
    expect(container.textContent).toContain('Globe')
    expect(container.textContent).toContain('Competidor A')
    // attachment SÍ incluye visibilidad por motor (público-safe) pero NO tendencia.
    expect(reportSectionVisible('attachment', 'engineSnapshot')).toBe(true)
    expect(reportSectionVisible('attachment', 'trend')).toBe(false)
    expect(container.textContent).toContain('Gemini (Google)')
    expect(container.textContent).not.toContain(C_TREND_TITLE)
  })
})
