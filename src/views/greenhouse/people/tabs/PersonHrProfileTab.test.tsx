// @vitest-environment jsdom

import { cleanup, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { IcoMetricSnapshot } from '@/lib/ico-engine/read-metrics'
import type { PersonHrContext } from '@/lib/person-360/get-person-hr'
import type { PersonOperationalMetrics } from '@/types/people'
import { renderWithTheme } from '@/test/render'

import PersonHrProfileTab from './PersonHrProfileTab'
import { buildPersonHrProfileViewModel } from './person-hr-profile-view-model'

const fetchMock = vi.fn()

const hrContext: PersonHrContext = {
  identityProfileId: 'ip-1',
  eoId: 'EO-001',
  memberId: 'member-1',
  displayName: 'Andres Carlosama',
  email: 'andres@efeoncepro.com',
  departmentName: 'Diseño',
  jobLevel: 'senior',
  employmentType: 'full_time',
  hireDate: '2026-03-15',
  contractEndDate: null,
  dailyRequired: true,
  supervisorMemberId: 'member-2',
  supervisorName: 'Daniela Ferreira',
  compensation: {
    payRegime: 'international',
    currency: 'USD',
    baseSalary: 675,
    contractType: 'indefinido'
  },
  leave: {
    vacationAllowance: 15,
    vacationCarried: 2,
    vacationUsed: 3,
    vacationReserved: 1,
    vacationAvailable: 13,
    personalAllowance: 2,
    personalUsed: 1,
    pendingRequests: 1,
    approvedRequestsThisYear: 2,
    totalApprovedDaysThisYear: 4
  }
}

const fallbackOperationalMetrics: PersonOperationalMetrics = {
  rpaAvg30d: 1.8,
  otdPercent30d: 90,
  tasksCompleted30d: 12,
  tasksActiveNow: 4,
  projectBreakdown: []
}

describe('PersonHrProfileTab', () => {
  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('renders HR master data from hrContext even when supplemental HR profile is empty', async () => {
    fetchMock.mockImplementation(async (input: string | URL | Request) => {
      const url = String(input)

      if (url.includes('/api/hr/core/members/')) {
        return { ok: false, json: async () => ({}) }
      }

      if (url.includes('/api/people/member-1/ico')) {
        return { ok: false, json: async () => ({}) }
      }

      return { ok: false, json: async () => ({}) }
    })

    renderWithTheme(
      <PersonHrProfileTab
        memberId='member-1'
        hrContext={hrContext}
        defaultOperationalMetrics={fallbackOperationalMetrics}
      />
    )

    expect(screen.getByText('Información laboral')).toBeInTheDocument()
    expect(screen.getByText('Diseño')).toBeInTheDocument()
    expect(screen.getByText('Daniela Ferreira')).toBeInTheDocument()
    expect(screen.getByText('Tiempo completo')).toBeInTheDocument()
    expect(screen.getByText('$675.00')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Este bloque aún no tiene datos cargados en HR Core para este colaborador.')).toBeInTheDocument()
    })
  })

  it('prefers ICO metrics over fallback operational metrics when available', () => {
    const icoSnapshot: IcoMetricSnapshot = {
      dimension: 'member',
      dimensionValue: 'member-1',
      dimensionLabel: 'Andres Carlosama',
      periodYear: 2026,
      periodMonth: 3,
      metrics: [
        { metricId: 'throughput', value: 18, zone: 'optimal' },
        { metricId: 'rpa', value: 1.45, zone: 'optimal' },
        { metricId: 'otd_pct', value: 92, zone: 'optimal' }
      ],
      cscDistribution: [],
      context: {
        totalTasks: 24,
        completedTasks: 18,
        activeTasks: 6
      },
      computedAt: '2026-03-21T00:00:00.000Z',
      engineVersion: 'v1',
      source: 'materialized'
    }

    const viewModel = buildPersonHrProfileViewModel({
      hrContext,
      supplementalProfile: null,
      icoSnapshot,
      fallbackOperationalMetrics
    })

    expect(viewModel.operational.source).toBe('ico')
    expect(viewModel.operational.sourceLabel).toBe('Fuente ICO')
    expect(viewModel.operational.volume).toBe(24)
    expect(viewModel.operational.throughput).toBe(18)
    expect(viewModel.operational.otdPercent).toBe(92)
    expect(viewModel.operational.rpa).toBe(1.45)
  })
})
