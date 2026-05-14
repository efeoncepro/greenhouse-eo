// @vitest-environment jsdom

import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'

import ReliabilityModuleCard from './ReliabilityModuleCard'

import type { ReliabilityModuleSnapshot } from '@/types/reliability'

const buildModule = (overrides?: Partial<ReliabilityModuleSnapshot>): ReliabilityModuleSnapshot => ({
  moduleKey: 'identity',
  label: 'Identity & Access',
  domain: 'Identity',
  description: 'SCIM, role assignments, workforce intake.',
  status: 'warning',
  confidence: 'high',
  signals: [],
  expectedSignalKinds: ['drift'],
  missingSignalKinds: [],
  routes: [],
  smokeTests: [],
  dependencies: [],
  observedAt: new Date().toISOString(),
  ...overrides
})

describe('TASK-873 Slice 5 — ReliabilityModuleCard signal action CTA', () => {
  it('renders CTA link to /admin/workforce/activation when workforce signal alerts', () => {
    const moduleSnap = buildModule({
      signals: [
        {
          signalId: 'workforce.scim_members_pending_profile_completion',
          moduleKey: 'identity',
          kind: 'drift',
          source: 'getWorkforceScimMembersPendingProfileCompletionSignal',
          label: 'Members SCIM con ficha laboral pendiente',
          severity: 'warning',
          summary: '2 members con ficha pendiente > 7 días.',
          observedAt: new Date().toISOString()
        }
      ]
    })

    renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    const ctaLinks = screen
      .queryAllByRole('link')
      .filter(el => el.getAttribute('href') === '/admin/workforce/activation')

    expect(ctaLinks.length).toBeGreaterThanOrEqual(1)
  })

  it('does NOT render CTA when workforce signal is ok (steady state)', () => {
    const moduleSnap = buildModule({
      status: 'ok',
      signals: [
        {
          signalId: 'workforce.scim_members_pending_profile_completion',
          moduleKey: 'identity',
          kind: 'drift',
          source: 'getWorkforceScimMembersPendingProfileCompletionSignal',
          label: 'Members SCIM con ficha laboral pendiente',
          severity: 'ok',
          summary: 'Sin members con ficha laboral pendiente > 7 días.',
          observedAt: new Date().toISOString()
        }
      ]
    })

    const { container } = renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    const links = container.querySelectorAll('a[href="/admin/workforce/activation"]')

    expect(links.length).toBe(0)
  })

  it('does NOT render CTA for unrelated signals (no entry in SIGNAL_ACTION_CTAS map)', () => {
    const moduleSnap = buildModule({
      signals: [
        {
          signalId: 'identity.scim.users_without_member',
          moduleKey: 'identity',
          kind: 'drift',
          source: 'getScimUsersWithoutMemberSignal',
          label: 'SCIM users sin member',
          severity: 'error',
          summary: '1 user sin member operativo.',
          observedAt: new Date().toISOString()
        }
      ]
    })

    const { container } = renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    const links = container.querySelectorAll('a[href="/admin/workforce/activation"]')

    expect(links.length).toBe(0)
  })

  it('renders signal label + summary regardless of severity', () => {
    const moduleSnap = buildModule({
      signals: [
        {
          signalId: 'workforce.scim_members_pending_profile_completion',
          moduleKey: 'identity',
          kind: 'drift',
          source: 'getWorkforceScimMembersPendingProfileCompletionSignal',
          label: 'Members SCIM con ficha laboral pendiente',
          severity: 'error',
          summary: '5 members con ficha pendiente > 30 días (escalar).',
          observedAt: new Date().toISOString()
        }
      ]
    })

    renderWithTheme(<ReliabilityModuleCard module={moduleSnap} />)

    // Label may appear in multiple places (signal title + chip tooltip etc).
    expect(screen.getAllByText('Members SCIM con ficha laboral pendiente').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/5 members con ficha pendiente/)).toBeInTheDocument()
  })
})
