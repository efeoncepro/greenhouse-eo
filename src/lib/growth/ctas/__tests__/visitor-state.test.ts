import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({ query: vi.fn(), withTransaction: vi.fn() }))

import {
  mergeGlobalWindows,
  mergeStateSnapshots,
  resolveVisitorSubjects,
  type CtaVisitorStateRow,
} from '../visitor-state'

/**
 * TASK-1428 — capa pura del visitor state: consent-gating de sujetos (arch §16.2) y
 * merge cross-subject restrictivo. El SQL vivo se ejercita en
 * `scripts/growth/_sanity-cta-suppression-sql.ts` contra PG real (gate TASK-893).
 */

const row = (overrides: Partial<CtaVisitorStateRow>): CtaVisitorStateRow => ({
  state_id: 'cvst-x',
  subject_kind: 'visitor',
  subject_hash: 'hash',
  cta_id: 'cdef-1',
  last_dismissed_at: null,
  dismiss_count: 0,
  converted_at: null,
  conversion_ref: null,
  window_started_at: null,
  impressions_in_window: 0,
  last_impression_at: null,
  consent_state: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
})

describe('resolveVisitorSubjects (consent-aware, arch §16.2)', () => {
  const context = (consentState: 'granted' | 'denied' | 'unknown') => ({
    visitorKey: 'raw-visitor',
    sessionKey: 'raw-session',
    consentState,
    consentSource: 'host_cmp',
  })

  it('consent granted → visitor durable + session', () => {
    const subjects = resolveVisitorSubjects(context('granted'))

    expect(subjects.map(subject => subject.kind)).toEqual(['visitor', 'session'])
  })

  it('sin consent (denied/unknown) → SOLO session (sin fingerprint durable)', () => {
    for (const state of ['denied', 'unknown'] as const) {
      const subjects = resolveVisitorSubjects(context(state))

      expect(subjects.map(subject => subject.kind)).toEqual(['session'])
    }
  })

  it('las keys crudas se hashean — jamás cruzan tal cual', () => {
    const subjects = resolveVisitorSubjects(context('granted'))

    for (const subject of subjects) {
      expect(subject.hash).not.toContain('raw-')
      expect(subject.hash).toMatch(/^[a-f0-9]{64}$/)
    }
  })

  it('sin contexto o sin keys → sin sujetos (fallback conservador aguas arriba)', () => {
    expect(resolveVisitorSubjects(undefined)).toEqual([])
    expect(
      resolveVisitorSubjects({ visitorKey: null, sessionKey: null, consentState: 'granted', consentSource: 'none' }),
    ).toEqual([])
  })
})

describe('mergeStateSnapshots (evidencia más restrictiva cross-subject)', () => {
  it('sin filas → null', () => {
    expect(mergeStateSnapshots([])).toBeNull()
  })

  it('toma el dismiss más reciente, la conversión más antigua y la ventana con más impresiones', () => {
    const older = new Date('2026-07-01T00:00:00Z')
    const newer = new Date('2026-07-15T00:00:00Z')

    const merged = mergeStateSnapshots([
      row({ subject_kind: 'visitor', last_dismissed_at: older, converted_at: newer, impressions_in_window: 1, window_started_at: newer }),
      row({ subject_kind: 'session', last_dismissed_at: newer, converted_at: older, impressions_in_window: 3, window_started_at: older }),
    ])

    expect(merged).toEqual({
      lastDismissedAt: newer,
      convertedAt: older,
      windowStartedAt: older,
      impressionsInWindow: 3,
    })
  })
})

describe('mergeGlobalWindows', () => {
  it('solo considera filas cta_id IS NULL y toma la de más impresiones', () => {
    const started = new Date('2026-07-18T10:00:00Z')

    const merged = mergeGlobalWindows([
      row({ cta_id: 'cdef-1', impressions_in_window: 99 }),
      row({ cta_id: null, impressions_in_window: 2, window_started_at: started }),
      row({ cta_id: null, subject_kind: 'session', impressions_in_window: 1 }),
    ])

    expect(merged).toEqual({ windowStartedAt: started, impressionsInWindow: 2 })
  })

  it('sin fila global → null', () => {
    expect(mergeGlobalWindows([row({ cta_id: 'cdef-1' })])).toBeNull()
  })
})
