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

  it('publicWeb muestra "Visibilidad por motor" con logos + nombres de motor', () => {
    const model = modelFromPublicReport(SAMPLE_PUBLIC_REPORT)
    const { container } = renderWithTheme(<AiVisibilityReportArtifact model={model} header={HEADER} />)

    expect(container.textContent).toContain('Visibilidad por motor')
    expect(container.textContent).toContain('Gemini (Google)')
    expect(container.textContent).toContain('Perplexity')
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
