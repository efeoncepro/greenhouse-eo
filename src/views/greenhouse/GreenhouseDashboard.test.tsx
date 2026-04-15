// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { GreenhouseDashboardData } from '@/types/greenhouse-dashboard'
import { renderWithTheme } from '@/test/render'

import GreenhouseDashboard from './GreenhouseDashboard'

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

vi.mock('@/libs/styles/AppReactApexCharts', () => ({
  default: () => <div data-testid='chart' />
}))

vi.mock('@/components/greenhouse', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  ExecutiveCardShell: ({ title, children }: { title: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  SectionErrorBoundary: ({ children }: { children: ReactNode }) => <>{children}</>,
  TeamCapacitySection: () => <div>Team capacity</div>
}))

vi.mock('@views/greenhouse/dashboard/ClientAttentionProjectsAccordion', () => ({
  default: () => <div>Attention projects</div>
}))

vi.mock('@views/greenhouse/dashboard/ClientDashboardHero', () => ({
  default: ({ clientName }: { clientName: string }) => <div>{clientName}</div>
}))

vi.mock('@views/greenhouse/dashboard/ClientAiCreditsSection', () => ({
  default: () => <div>AI credits</div>
}))

vi.mock('@views/greenhouse/dashboard/ClientEcosystemSection', () => ({
  default: () => <div>Ecosystem</div>
}))

vi.mock('@views/greenhouse/dashboard/ClientPortfolioHealthAccordion', () => ({
  default: () => <div>Portfolio health</div>
}))

vi.mock('@views/greenhouse/dashboard/DashboardKpiCard', () => ({
  default: ({ title, stats }: { title: string; stats: string }) => (
    <div>
      <span>{title}</span>
      <span>{stats}</span>
    </div>
  )
}))

vi.mock('@views/greenhouse/dashboard/DashboardRequestDialog', () => ({
  default: () => null
}))

const dashboardData: GreenhouseDashboardData = {
  kpis: [],
  scope: {
    clientId: 'client-1',
    projectCount: 1,
    projectIds: ['project-1'],
    businessLines: [],
    serviceModules: [],
    lastActivityAt: null,
    lastSyncedAt: null
  },
  summary: {
    avgOnTimePct: 0,
    activeWorkItems: 0,
    blockedTasks: 0,
    clientChangeTasks: 0,
    completedLast30Days: 0,
    completedTasks: 0,
    completionRate: 0,
    createdLast30Days: 0,
    healthyProjects: 0,
    netFlowLast30Days: 0,
    openFrameComments: 0,
    projectsAtRisk: 0,
    queuedWorkItems: 0,
    reviewPressureTasks: 0,
    totalTasks: 0
  },
  relationship: {
    startedAt: null,
    months: 0,
    days: 0,
    label: 'Sin actividad visible'
  },
  accountTeam: {
    members: [],
    totalMonthlyHours: 0,
    averageAllocationPct: null
  },
  tooling: {
    technologyTools: [],
    aiTools: []
  },
  qualitySignals: [],
  charts: {
    throughput: [],
    monthlyDelivery: [],
    statusMix: [],
    effortMix: [],
    deliveryCadenceWeekly: [],
    projectRpa: []
  },
  projects: []
}

describe('GreenhouseDashboard', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the legacy /dashboard view even when quality and delivery signals are empty', () => {
    expect(() => renderWithTheme(<GreenhouseDashboard clientName='Acme Space' data={dashboardData} />)).not.toThrow()

    expect(screen.getByText('Acme Space')).toBeInTheDocument()
    expect(screen.getByText('RpA promedio')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Pulse' })).toHaveAttribute('href', '/home')
  })
})
