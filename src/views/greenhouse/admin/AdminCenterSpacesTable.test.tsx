// @vitest-environment jsdom

import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { InternalDashboardClientRow } from '@/lib/internal/get-internal-dashboard-overview'

import { finalizeControlTowerTenant } from '../internal/dashboard/helpers'

import AdminCenterSpacesTable from './AdminCenterSpacesTable'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock })
}))

const buildClient = (overrides: Partial<InternalDashboardClientRow>): InternalDashboardClientRow => ({
  clientId: 'client-default',
  clientName: 'Default Space',
  logoUrl: null,
  status: 'active',
  active: true,
  primaryContactEmail: 'ops@example.com',
  authMode: 'credentials',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-03-20T00:00:00.000Z',
  lastLoginAt: '2026-03-20T00:00:00.000Z',
  lastActivityAt: '2026-03-20T00:00:00.000Z',
  notionProjectCount: 1,
  scopedProjects: 2,
  trackedOtdProjects: 1,
  avgOnTimePct: 90,
  totalUsers: 4,
  activeUsers: 3,
  invitedUsers: 1,
  pendingResetUsers: 0,
  featureFlagCount: 1,
  businessLines: ['creative_hub'],
  serviceModules: ['retainer'],
  ...overrides
})

const rows = [
  finalizeControlTowerTenant(
    buildClient({
      clientId: 'beta',
      clientName: 'Beta',
      scopedProjects: 0,
      totalUsers: 8,
      activeUsers: 0,
      invitedUsers: 6,
      lastActivityAt: '2026-03-29T00:00:00.000Z'
    })
  ),
  finalizeControlTowerTenant(
    buildClient({
      clientId: 'acme',
      clientName: 'Acme',
      createdAt: '2025-12-01T00:00:00.000Z',
      lastActivityAt: '2026-01-10T00:00:00.000Z',
      scopedProjects: 3,
      totalUsers: 12,
      activeUsers: 10,
      invitedUsers: 0
    })
  ),
  finalizeControlTowerTenant(
    buildClient({
      clientId: 'zen',
      clientName: 'Zen',
      createdAt: '2026-03-25T00:00:00.000Z',
      lastActivityAt: '2026-03-24T00:00:00.000Z',
      scopedProjects: 1,
      totalUsers: 2,
      activeUsers: 1,
      invitedUsers: 1
    })
  )
]

const getBodyRows = () => screen.getAllByRole('row').slice(1)

describe('AdminCenterSpacesTable', () => {
  beforeEach(() => {
    pushMock.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('sorts the table by status and activity from the column headers', async () => {
    const user = userEvent.setup()

    renderWithTheme(
      <AdminCenterSpacesTable
        rows={rows}
        totalRows={rows.length}
        searchValue=''
        onSearchChange={() => {}}
        statusFilter='all'
        onStatusFilterChange={() => {}}
        onExport={() => {}}
        attentionCount={1}
      />
    )

    expect(within(getBodyRows()[0]!).getByText('Beta')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Actividad' }))

    expect(within(getBodyRows()[0]!).getByText('Acme')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Estado' }))

    expect(within(getBodyRows()[0]!).getByText('Beta')).toBeInTheDocument()
  })
})
