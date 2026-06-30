/**
 * TASK-1273 — AI Visibility Report PDF · no-leak + render smoke test (Slice 3).
 *
 * El PDF es el tercer render adapter del report artifact, sobre el MISMO
 * `ReportArtifactModel` (variant `attachment`, leak-safe por tipo). Esta suite
 * cierra el RENDER PDF:
 *  - no-leak: recorre el árbol de elementos del documento y verifica que NO
 *    aparezca ninguna string internal-only (providerFindings/accuracyFindings/
 *    raw text marcados con "INTERNAL"). El componente se autora inline (sin
 *    sub-componentes que reciban el modelo crudo) → el walk colecta todas las
 *    strings visibles sin ejecutar primitivas de react-pdf.
 *  - disclosure: el variant attachment NO muestra trend ni narrativa por motor.
 *  - render smoke: `renderToBuffer` produce un PDF real no vacío (fuentes +
 *    assets resueltos), garantizando que el árbol efectivamente renderiza.
 */

import { isValidElement, type ReactNode } from 'react'

import { describe, expect, it } from 'vitest'

import { GH_GROWTH_AI_VISIBILITY } from '@/lib/copy/growth'

import AiVisibilityReportPdf from '../pdf/AiVisibilityReportPdf'
import { renderAiVisibilityReportPdf } from '../pdf/render-ai-visibility-report-pdf'
import { SAMPLE_PUBLIC_REPORT } from '../fixtures'
import { modelFromPublicReport } from '../model'
import type { ReportHeader } from '../web/AiVisibilityReportArtifact'

const HEADER: ReportHeader = { organizationName: 'Globe', reportDate: '19 may 2026', periodLabel: '4 – 19 de mayo de 2026' }

// Strings internal-only que NUNCA deben aparecer en el PDF público (attachment).
const INTERNAL_LEAK_STRINGS = [
  'INTERNAL',
  'invisible en Perplexity',
  'confusión con una marca homónima',
  'Confusión de identidad'
]

/** Colecta todas las strings/números del árbol de elementos (sin ejecutar componentes). */
const collectStrings = (node: ReactNode, out: string[]): void => {
  if (node === null || node === undefined || typeof node === 'boolean') return

  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node))

    return
  }

  if (Array.isArray(node)) {
    node.forEach(child => collectStrings(child, out))

    return
  }

  if (isValidElement(node)) {
    collectStrings((node.props as { children?: ReactNode }).children, out)
  }
}

describe('AiVisibilityReportPdf — no-leak + render', () => {
  const model = modelFromPublicReport(SAMPLE_PUBLIC_REPORT, 'attachment')
  const tree = AiVisibilityReportPdf({ model, header: HEADER })
  const strings: string[] = []

  collectStrings(tree, strings)
  const text = strings.join('  ')

  it('no filtra data internal-only', () => {
    for (const leak of INTERNAL_LEAK_STRINGS) {
      expect(text).not.toContain(leak)
    }
  })

  it('renderiza contenido público-safe esperado (marca, motores, competidores)', () => {
    expect(text).toContain('Globe')
    expect(text).toContain('Competidor A')
    expect(text).toContain(GH_GROWTH_AI_VISIBILITY.provider_label.gemini)
    expect(text).toContain(GH_GROWTH_AI_VISIBILITY.provider_label.perplexity)
  })

  it('respeta la disclosure del attachment (sin tendencia)', () => {
    // El título de tendencia NO debe aparecer (attachment oculta trend).
    expect(text).not.toContain('Tendencia de visibilidad')
  })

  it('renderToBuffer produce un PDF real no vacío', async () => {
    const buffer = await renderAiVisibilityReportPdf({ model, header: HEADER })

    expect(buffer.length).toBeGreaterThan(1000)
    // Firma del formato PDF.
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  }, 20000)
})
