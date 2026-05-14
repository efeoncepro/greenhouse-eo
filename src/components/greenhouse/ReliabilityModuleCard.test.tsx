// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import ReliabilityModuleCard from './ReliabilityModuleCard'

import type { ReliabilityModuleSnapshot } from '@/types/reliability'
import type { ReliabilitySignal } from '@/types/reliability'

const buildSignal = (overrides: Partial<ReliabilitySignal> & Pick<ReliabilitySignal, 'signalId' | 'severity' | 'summary'>): ReliabilitySignal => ({
  signalId: overrides.signalId,
  moduleKey: overrides.moduleKey ?? 'identity',
  kind: overrides.kind ?? 'drift',
  source: overrides.source ?? 'test',
  label: overrides.label ?? 'Members SCIM con ficha laboral pendiente',
  severity: overrides.severity,
  summary: overrides.summary,
  observedAt: overrides.observedAt ?? new Date().toISOString(),
  evidence: overrides.evidence ?? []
})

const buildModule = (overrides?: Partial<ReliabilityModuleSnapshot>): ReliabilityModuleSnapshot => ({
  moduleKey: 'identity',
  label: 'Identity & Access',
  domain: 'identity',
  description: 'SCIM, role assignments, workforce intake.',
  summary: 'Identity module summary.',
  status: 'warning',
  confidence: 'high',
  signals: [],
  expectedSignalKinds: ['drift'],
  missingSignalKinds: [],
  routes: [],
  apis: [],
  smokeTests: [],
  dependencies: [],
  signalCounts: { ok: 0, warning: 1, error: 0, unknown: 0, not_configured: 0, awaiting_data: 0 },
  ...overrides
})

describe('TASK-873 Slice 5 — ReliabilityModuleCard signal action CTA', () => {
  it('renders CTA link to /admin/workforce/activation when workforce signal alerts', () => {
    const moduleSnap = buildModule({
      signals: [
        buildSignal({
          signalId: 'workforce.scim_members_pending_profile_completion',
          source: 'getWorkforceScimMembersPendingProfileCompletionSignal',
          severity: 'warning',
          summary: '2 members con ficha pendiente > 7 días.'
        })
      ]
    })

    renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    const ctaLinks = screen
      .queryAllByRole('link')
      .filter(el => el.getAttribute('href') === '/hr/workforce/activation')

    expect(ctaLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('does NOT render CTA when workforce signal is ok (steady state)', () => {
    const moduleSnap = buildModule({
      status: 'ok',
      signals: [
        buildSignal({
          signalId: 'workforce.scim_members_pending_profile_completion',
          source: 'getWorkforceScimMembersPendingProfileCompletionSignal',
          severity: 'ok',
          summary: 'Sin members con ficha laboral pendiente > 7 días.'
        })
      ]
    })

    const { container } = renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    const links = container.querySelectorAll('a[href="/hr/workforce/activation"]')

    expect(links.length).toBe(0)
  })

  it('does NOT render CTA for unrelated signals (no entry in SIGNAL_ACTION_CTAS map)', () => {
    const moduleSnap = buildModule({
      signals: [
        buildSignal({
          signalId: 'identity.scim.users_without_member',
          source: 'getScimUsersWithoutMemberSignal',
          label: 'SCIM users sin member',
          severity: 'error',
          summary: '1 user sin member operativo.'
        })
      ]
    })

    const { container } = renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    const links = container.querySelectorAll('a[href="/hr/workforce/activation"]')

    expect(links.length).toBe(0)
  })

  it('renders signal label + summary regardless of severity', () => {
    const moduleSnap = buildModule({
      signals: [
        buildSignal({
          signalId: 'workforce.scim_members_pending_profile_completion',
          source: 'getWorkforceScimMembersPendingProfileCompletionSignal',
          severity: 'error',
          summary: '5 members con ficha pendiente > 30 días (escalar).'
        })
      ]
    })

    renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    // Label may appear in multiple places (signal title + chip tooltip etc).
    expect(screen.getAllByText('Members SCIM con ficha laboral pendiente').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/5 members con ficha pendiente/)).toBeInTheDocument()
  })
})
