import { describe, expect, it } from 'vitest'

import type { OrganizationWorkspaceCompactSignals } from '@/lib/organization-workspace/compact-signals-types'

import { buildDataAwarePromptsFromCompactSignals } from './suggested-prompts-data-aware'
import { GH_NEXA } from '@/lib/copy/nexa'

const COPY = GH_NEXA.floating.data_aware_prompts
const ORG_ID = 'org-berel'
const ENTITY = 'Grupo Berel'

const fill = (template: string): string => template.replace(/\{entity\}/g, ENTITY)

// Baseline "sano": status ready, sin señales en rojo, todo completo.
const baseSignals = (
  overrides: Partial<OrganizationWorkspaceCompactSignals> = {}
): OrganizationWorkspaceCompactSignals => ({
  organizationId: ORG_ID,
  entrypointContext: 'agency',
  status: 'ready',
  computedAt: '2026-06-15T00:00:00.000Z',
  asOf: '2026-06-15',
  period: { year: 2026, month: 6 },
  projection: { visibleFacets: ['delivery', 'finance'], defaultFacet: 'delivery', degradedMode: false, degradedReason: null },
  health: { overallState: 'good', score: 100, drivers: [] },
  readiness: [],
  recentSignals: [],
  nextActions: [],
  provenance: [],
  degradedSources: [],
  sourceFreshness: {
    workspace_projection: null,
    organization_360: null,
    account_360: null,
    projects: null,
    finance_summary: null,
    client_lifecycle: null,
    reliability_signals: null
  },
  ...overrides
})

describe('buildDataAwarePromptsFromCompactSignals (TASK-1087)', () => {
  it('degrada a [] cuando el reader está unavailable', () => {
    const result = buildDataAwarePromptsFromCompactSignals(baseSignals({ status: 'unavailable' }), ENTITY, ORG_ID)

    expect(result).toEqual([])
  })

  it('degrada a [] cuando no hay señal accionable (cuenta sana sin drivers)', () => {
    const result = buildDataAwarePromptsFromCompactSignals(baseSignals(), ENTITY, ORG_ID)

    expect(result).toEqual([])
  })

  it('mapea un driver de delivery en rojo a una anomalía + interpola el nombre real + entityRef', () => {
    const signals = baseSignals({
      health: {
        overallState: 'risk',
        score: 40,
        drivers: [{ id: 'delivery.projectHealth', label: 'Health delivery', value: 'red', severity: 'error', source: 'projects', facet: 'delivery' }]
      }
    })

    const result = buildDataAwarePromptsFromCompactSignals(signals, ENTITY, ORG_ID)

    expect(result[0]).toEqual({ text: fill(COPY.anomaly_delivery_error), hint: 'anomaly', entityRef: ORG_ID })
  })

  it('prioriza bloqueo de onboarding por sobre el resto', () => {
    const signals = baseSignals({
      health: { overallState: 'blocked', score: 20, drivers: [] },
      readiness: [{ id: 'lifecycle.onboarding', label: 'Lifecycle', state: 'blocked', source: 'client_lifecycle', helper: '' }]
    })

    const result = buildDataAwarePromptsFromCompactSignals(signals, ENTITY, ORG_ID)

    expect(result[0].text).toBe(fill(COPY.lifecycle_blocked))
    expect(result[0].hint).toBe('pending')
  })

  it('NUNCA echa el monto crudo del driver/signal al texto del prompt (allowlist)', () => {
    const signals = baseSignals({
      health: {
        overallState: 'watch',
        score: 70,
        drivers: [{ id: 'finance.outstanding', label: 'Saldo pendiente', value: '$1.234.567', severity: 'warning', source: 'account_360', facet: 'finance' }]
      },
      recentSignals: [{ id: 'finance.summary', title: 'Finance', body: '12 facturas · $1.234.567 pendiente.', severity: 'warning', source: 'account_360', facet: 'finance', observedAt: null }]
    })

    const result = buildDataAwarePromptsFromCompactSignals(signals, ENTITY, ORG_ID)

    expect(result.length).toBeGreaterThan(0)

    for (const prompt of result) {
      expect(prompt.text).not.toContain('1.234.567')
      expect(prompt.text).not.toContain('$')
      expect(prompt.text).not.toContain('factura')
    }
  })

  it('anti-oracle: un facet no visible no aparece en señales → no origina prompt', () => {
    // visibleFacets sin finance → aunque hubiera drivers de finance, el reader no los incluye.
    const signals = baseSignals({
      projection: { visibleFacets: ['delivery'], defaultFacet: 'delivery', degradedMode: false, degradedReason: null },
      health: { overallState: 'watch', score: 70, drivers: [] },
      recentSignals: []
    })

    const result = buildDataAwarePromptsFromCompactSignals(signals, ENTITY, ORG_ID)

    // Sin drivers/signals de finance, no hay prompt de saldo pendiente.
    expect(result.every(prompt => prompt.text !== fill(COPY.anomaly_finance_warning))).toBe(true)
  })

  it('deduplica y corta a 4 prompts como máximo', () => {
    const signals = baseSignals({
      health: {
        overallState: 'blocked',
        score: 10,
        drivers: [{ id: 'delivery.projectHealth', label: 'Health delivery', value: 'red', severity: 'error', source: 'projects', facet: 'delivery' }]
      },
      readiness: [
        { id: 'lifecycle.onboarding', label: 'Lifecycle', state: 'blocked', source: 'client_lifecycle', helper: '' },
        { id: 'data.coverage', label: 'Cobertura', state: 'blocked', source: 'account_360', helper: '' }
      ],
      recentSignals: [
        { id: 'delivery.projects', title: 'Delivery', body: 'rojo', severity: 'error', source: 'projects', facet: 'delivery', observedAt: null },
        { id: 'finance.summary', title: 'Finance', body: 'pendiente', severity: 'warning', source: 'account_360', facet: 'finance', observedAt: null }
      ],
      nextActions: [{ id: 'x', label: 'Revisar', kind: 'review', source: 'account_360', href: null, dueAt: null }]
    })

    const result = buildDataAwarePromptsFromCompactSignals(signals, ENTITY, ORG_ID)

    expect(result.length).toBeLessThanOrEqual(4)
    expect(new Set(result.map(p => p.text)).size).toBe(result.length)
  })

  it('usa "este cliente" como genérico cuando no hay nombre declarado', () => {
    const signals = baseSignals({ health: { overallState: 'risk', score: 40, drivers: [] } })

    const result = buildDataAwarePromptsFromCompactSignals(signals, null, ORG_ID)

    expect(result[0].text).toContain('este cliente')
  })
})
