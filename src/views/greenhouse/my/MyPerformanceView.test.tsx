// @vitest-environment jsdom

import { beforeAll, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import MyPerformanceView from '@/views/greenhouse/my/MyPerformanceView'
import { MY_PERFORMANCE_MOCK } from '@/views/greenhouse/my/my-performance-mock'
import { GH_MY_PERFORMANCE } from '@/lib/copy/my-performance'

// framer-motion (NexaInsightsBlock InsightCard) needs IntersectionObserver,
// which jsdom does not provide. Stub it so the REAL Nexa block renders and the
// safe-mention assertion is end-to-end (vs mocking the block away).
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

beforeAll(() => {
  vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
})

describe('MyPerformanceView (TASK-1027 runtime)', () => {
  it('renders the self-service dashboard from a payload (header, focus, KPIs)', () => {
    const { getByText, getAllByText } = renderWithTheme(<MyPerformanceView mockData={MY_PERFORMANCE_MOCK} />)

    expect(getByText(GH_MY_PERFORMANCE.title)).toBeInTheDocument()
    // Focus signal labels
    expect(getByText(GH_MY_PERFORMANCE.focus.otd.label)).toBeInTheDocument()
    expect(getByText(GH_MY_PERFORMANCE.focus.ftr.label)).toBeInTheDocument()
    // KPI label (RpA) appears in the grid (and possibly radar rail)
    expect(getAllByText(GH_MY_PERFORMANCE.metrics.rpa).length).toBeGreaterThan(0)
    // Activity chips
    expect(getByText(GH_MY_PERFORMANCE.activityLabels.completed)).toBeInTheDocument()
  })

  it('renders Nexa mentions as non-navigable in self-service (safe mode)', () => {
    const { container, getByText } = renderWithTheme(<MyPerformanceView mockData={MY_PERFORMANCE_MOCK} />)

    // The Sky mention is visible…
    expect(getByText('Sky')).toBeInTheDocument()
    // …but never links out to the agency space surface.
    expect(container.querySelector('a[href="/agency/spaces/spc-9"]')).toBeNull()
    expect(container.textContent).not.toContain('spc-9')
  })

  it('shows the in-progress partial-period alert when the period is current', () => {
    const { getByText } = renderWithTheme(<MyPerformanceView mockData={MY_PERFORMANCE_MOCK} />)

    expect(getByText(GH_MY_PERFORMANCE.partialAlert)).toBeInTheDocument()
  })

  it('renders an honest empty state when there is no data', () => {
    const empty = {
      ...MY_PERFORMANCE_MOCK,
      period: { ...MY_PERFORMANCE_MOCK.period, status: 'no_data' as const, isCurrentPeriod: false },
      ico: null,
      operational: null,
      nexaInsights: null,
      trend: []
    }

    const { getByText } = renderWithTheme(<MyPerformanceView mockData={empty} />)

    expect(getByText(GH_MY_PERFORMANCE.emptyTitle)).toBeInTheDocument()
  })
})
