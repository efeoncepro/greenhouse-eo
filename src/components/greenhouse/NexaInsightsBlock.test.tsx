// @vitest-environment jsdom

import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import NexaInsightsBlock, { type NexaInsightItem } from './NexaInsightsBlock'

afterEach(() => {
  cleanup()
})

// JSDOM no implementa IntersectionObserver — framer-motion (AnimatedCounter)
// lo usa para entrar en viewport. Stub canonical para tests que renderean
// el state `ready` con KPI counters.
beforeAll(() => {
  if (typeof globalThis.IntersectionObserver === 'undefined') {
    class StubIntersectionObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }

      root = null
      rootMargin = ''
      thresholds = []
    }

    ;(globalThis as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver =
      StubIntersectionObserver as unknown as typeof IntersectionObserver
  }
})

// ─── TASK-946 — Anti-regresión del dispatcher de estados canonical ──────────
//
// Cubre los 4 estados server-side + backward-compat sin `dataStatus`. Tests
// minimalistas: el invariante crítico es que cada estado renderea la microcopy
// canonical correspondiente con el rol a11y correcto.

describe('NexaInsightsBlock — honest degradation states (TASK-946)', () => {
  const baseProps = {
    insights: [] as NexaInsightItem[],
    totalAnalyzed: 0,
    lastAnalysis: null,
    runStatus: null as null,
    defaultExpanded: true
  }

  it('dataStatus=empty-pending renderea microcopy es-CL canonical', () => {
    const { getAllByText } = renderWithTheme(
      <NexaInsightsBlock {...baseProps} dataStatus='empty-pending' />
    )

    expect(getAllByText('Aún sin observaciones para este período').length).toBeGreaterThan(0)
  })

  it('dataStatus=empty-positive renderea microcopy canonical de salud', () => {
    const { getAllByText } = renderWithTheme(
      <NexaInsightsBlock {...baseProps} dataStatus='empty-positive' />
    )

    expect(getAllByText('Sin anomalías detectadas').length).toBeGreaterThan(0)
  })

  it('dataStatus=stale-degraded renderea Alert con role=alert (a11y canonical)', () => {
    const { getByRole, getAllByText } = renderWithTheme(
      <NexaInsightsBlock {...baseProps} dataStatus='stale-degraded' />
    )

    expect(getByRole('alert')).toBeInTheDocument()
    expect(getAllByText('Análisis del pipeline pausado').length).toBeGreaterThan(0)
  })

  it('backward-compat: sin dataStatus + totalAnalyzed=0 cae a empty-pending legacy', () => {
    const { getAllByText } = renderWithTheme(<NexaInsightsBlock {...baseProps} />)

    // Comportamiento legacy: hasData=false → ahora mapea a empty-pending.
    expect(getAllByText('Aún sin observaciones para este período').length).toBeGreaterThan(0)
  })

  it('dataStatus=ready con totalAnalyzed>0 renderea el header canonical del bento', () => {
    const { getAllByText, queryAllByText } = renderWithTheme(
      <NexaInsightsBlock
        {...baseProps}
        totalAnalyzed={5}
        dataStatus='ready'
        insights={[
          {
            id: 'EO-AIENR-1',
            signalType: 'ftr_drop',
            metricId: 'FTR%',
            severity: 'warning',
            explanation: 'FTR cayó 8% vs mes anterior',
            rootCauseNarrative: null,
            recommendedAction: null
          }
        ]}
      />
    )

    // El header "Nexa Insights" sí aparece (chrome canonical del bento).
    expect(getAllByText('Nexa Insights').length).toBeGreaterThan(0)
    // Las microcopy honest degradation NO aparecen en estado ready.
    expect(queryAllByText('Aún sin observaciones para este período').length).toBe(0)
    expect(queryAllByText('Sin anomalías detectadas').length).toBe(0)
    expect(queryAllByText('Análisis del pipeline pausado').length).toBe(0)
  })

  it('dataStatus=loading renderea estado canonical de carga (aria-label)', () => {
    const { getByText } = renderWithTheme(
      <NexaInsightsBlock {...baseProps} dataStatus='loading' />
    )

    expect(getByText('Cargando observaciones de Nexa')).toBeInTheDocument()
  })
})
