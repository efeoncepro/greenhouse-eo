// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { AdminAccessOverview } from '@/lib/admin/get-admin-access-overview'
import type { AdminTenantsOverview } from '@/lib/admin/get-admin-tenants-overview'
import type {
  InternalDashboardClientRow,
  InternalDashboardOverview
} from '@/lib/internal/get-internal-dashboard-overview'
import type { OperationsOverview } from '@/lib/operations/get-operations-overview'
import type { ReliabilityOverview } from '@/types/reliability'

import AdminCenterView from './AdminCenterView'

const replaceMock = vi.fn()
const pushMock = vi.fn()
let currentSearchParams = new URLSearchParams()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
  usePathname: () => '/admin',
  useSearchParams: () => currentSearchParams
}))

vi.mock('@/components/greenhouse', () => ({
  ExecutiveCardShell: ({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) => (
    <section>
      <h2>{title}</h2>
      {subtitle ? <p>{subtitle}</p> : null}
      {children}
    </section>
  ),
  ExecutiveMiniStatCard: ({ title, value, detail }: { title: string; value: string; detail: string }) => (
    <section>
      <h3>{title}</h3>
      <div>{value}</div>
      <p>{detail}</p>
    </section>
  ),
  GreenhouseDragList: <T extends { id: string }>({
    items,
    renderItem
  }: {
    items: T[]
    renderItem: (item: T) => ReactNode
  }) => <div>{items.map(item => renderItem(item))}</div>,
  ReliabilityModuleCard: ({ module }: { module: { moduleKey: string; label: string } }) => (
    <article data-testid={`reliability-module-${module.moduleKey}`}>{module.label}</article>
  ),
  GreenhouseRouteLink: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
}))

vi.mock('@components/greenhouse/SectionErrorBoundary', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>
}))

vi.mock('@/components/greenhouse/admin/ReliabilitySyntheticCard', () => ({
  default: ({ snapshots }: { snapshots: { routePath: string }[] }) => (
    <article data-testid='reliability-synthetic-card'>{snapshots.length} probes</article>
  )
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
  updatedAt: '2026-03-15T00:00:00.000Z',
  lastLoginAt: '2026-03-15T00:00:00.000Z',
  lastActivityAt: '2026-03-15T00:00:00.000Z',
  notionProjectCount: 1,
  scopedProjects: 2,
  trackedOtdProjects: 1,
  avgOnTimePct: 91,
  totalUsers: 4,
  activeUsers: 3,
  invitedUsers: 1,
  pendingResetUsers: 0,
  featureFlagCount: 1,
  businessLines: ['creative_hub'],
  serviceModules: ['retainer'],
  ...overrides
})

const access: AdminAccessOverview = {
  totals: {
    totalUsers: 18,
    activeUsers: 14,
    invitedUsers: 12,
    internalUsers: 4,
    clientUsers: 14
  },
  users: [],
  roles: []
}

const tenants: AdminTenantsOverview = {
  totals: {
    totalTenants: 3,
    activeTenants: 3,
    tenantsWithCredentials: 3,
    tenantsPendingReset: 1,
    tenantsWithScopedProjects: 2
  },
  tenants: []
}

const controlTower: InternalDashboardOverview = {
  totals: {
    internalAdmins: 2,
    totalClients: 3
  },
  clients: [
    buildClient({
      clientId: 'acme',
      clientName: 'Acme',
      primaryContactEmail: 'acme@example.com',
      scopedProjects: 0,
      totalUsers: 8,
      activeUsers: 0,
      invitedUsers: 6,
      lastActivityAt: '2026-01-10T00:00:00.000Z'
    }),
    buildClient({
      clientId: 'zen',
      clientName: 'Zen Labs',
      primaryContactEmail: 'zen@example.com',
      createdAt: '2026-03-20T00:00:00.000Z',
      lastActivityAt: '2026-03-25T00:00:00.000Z'
    }),
    buildClient({
      clientId: 'orbit',
      clientName: 'Orbit',
      primaryContactEmail: 'orbit@example.com',
      createdAt: '2025-12-01T00:00:00.000Z',
      lastActivityAt: '2026-03-30T00:00:00.000Z',
      scopedProjects: 3,
      totalUsers: 10,
      activeUsers: 9,
      invitedUsers: 0
    })
  ]
}

const operations: OperationsOverview = {
  kpis: {
    outboxEvents24h: 28,
    pendingProjections: 4,
    hiddenReactiveBacklog: 128,
    notificationsSent24h: 12,
    activeSyncs: 5,
    failedHandlers: 2
  },
  reactiveBacklog: {
    totalUnreacted: 128,
    last24hUnreacted: 128,
    oldestUnreactedAt: '2026-03-20T08:22:59.000Z',
    newestUnreactedAt: '2026-04-05T12:59:23.000Z',
    lastReactedAt: '2026-04-03T01:50:29.000Z',
    lagHours: 59,
    status: 'down',
    topEventTypes: [
      { eventType: 'ico.materialization.completed', count: 187 },
      { eventType: 'finance.income.created', count: 132 }
    ]
  },
  subsystems: [],
  recentEvents: [],
  failedProjections: [],
  failedHandlers: [],
  webhooks: {
    endpointsActive: 1,
    subscriptionsActive: 1,
    inboxReceived24h: 12,
    inboxFailed24h: 0,
    deliveriesPending: 0,
    deliveriesRetryScheduled: 0,
    deliveriesDeadLetter: 1,
    secretRefsRegistered: 1,
    secretRefs: [],
    lastInboxAt: '2026-03-30T10:00:00.000Z',
    lastDeliveryAt: '2026-03-30T10:10:00.000Z',
    schemaReady: true
  },
  cloud: {
    health: {
      ok: false,
      overallStatus: 'degraded',
      summary: 'Delayed',
      checks: [
        { name: 'Cron', ok: true, status: 'ok', summary: 'OK' },
        { name: 'Postgres', ok: false, status: 'degraded', summary: 'Delayed' }
      ],
      runtimeChecks: [],
      postureChecks: [],
      timestamp: '2026-03-30T10:00:00.000Z'
    },
    posture: {
      overallStatus: 'warning',
      controls: []
    },
    auth: {
      mode: 'wif',
      summary: 'Configured'
    },
    cron: {
      secretConfigured: true,
      summary: 'Configured'
    },
    postgres: {
      configured: true,
      usesConnector: true,
      sslEnabled: true,
      maxConnections: 15,
      summary: 'Healthy'
    },
    bigquery: {
      projectId: 'test-project',
      maximumBytesBilled: 1000000,
      summary: 'Guarded',
      blockedQueries: []
    },
    observability: {
      posture: {
        summary: 'Configured',
        sentry: {
          dsnConfigured: true,
          clientDsnConfigured: true,
          authTokenConfigured: true,
          orgConfigured: true,
          projectConfigured: true,
          enabled: true,
          sourceMapsReady: true
        },
        slack: {
          alertsWebhookConfigured: true,
          enabled: true
        }
      },
      incidents: {
        status: 'ok',
        enabled: true,
        available: true,
        incidents: [],
        summary: 'No incidents',
        fetchedAt: '2026-03-30T10:00:00.000Z',
        error: null
      }
    }
  }
}

const reliability: ReliabilityOverview = {
  generatedAt: '2026-03-30T10:00:00.000Z',
  modules: [
    {
      moduleKey: 'finance',
      label: 'Finance',
      description: 'Test fixture',
      domain: 'finance',
      status: 'ok',
      confidence: 'medium',
      summary: '0 señales sanas.',
      routes: [],
      apis: [],
      dependencies: [],
      smokeTests: [],
      signals: [],
      signalCounts: { ok: 0, warning: 0, error: 0, unknown: 0, not_configured: 0, awaiting_data: 0 },
      expectedSignalKinds: ['subsystem'],
      missingSignalKinds: ['subsystem']
    }
  ],
  totals: { totalModules: 1, healthy: 1, warning: 0, error: 0, unknownOrPending: 0 },
  integrationBoundaries: [],
  notes: []
}

describe('AdminCenterView', () => {
  beforeEach(() => {
    replaceMock.mockReset()
    pushMock.mockReset()
    currentSearchParams = new URLSearchParams()
    window.localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('hydrates the attention filter from the URL and keeps the query string shareable', async () => {
    currentSearchParams = new URLSearchParams('filter=attention&q=acme')

    renderWithTheme(
      <AdminCenterView
        access={access}
        tenants={tenants}
        controlTower={controlTower}
        operations={operations}
        reliability={reliability}
        syntheticSnapshots={[]}
        syntheticSweep={null}
        aiObservation={null}
        aiModuleObservations={[]}
      />
    )

    expect(screen.getByDisplayValue('acme')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Requiere atencion' })).toBeInTheDocument()
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.queryByText('Orbit')).not.toBeInTheDocument()
    expect(screen.getByText('Posture parcial')).toBeInTheDocument()
    expect(screen.getAllByText('128 backlog oculto').length).toBeGreaterThan(0)

    const user = userEvent.setup()
    const searchInput = screen.getByPlaceholderText('Buscar por cliente o email')

    await user.clear(searchInput)
    await user.type(searchInput, 'zen')

    await waitFor(() => {
      expect(replaceMock).toHaveBeenLastCalledWith('/admin?filter=attention&q=zen', { scroll: false })
    })
  })

  it('renders the consolidated alert block only when there are active signals', () => {
    renderWithTheme(
      <AdminCenterView
        access={access}
        tenants={tenants}
        controlTower={controlTower}
        operations={operations}
        reliability={reliability}
        syntheticSnapshots={[]}
        syntheticSweep={null}
        aiObservation={null}
        aiModuleObservations={[]}
      />
    )

    expect(screen.getByRole('link', { name: /abrir commercial parties/i })).toHaveAttribute(
      'href',
      '/admin/commercial/parties'
    )
    expect(screen.getAllByText('Commercial Parties').length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { level: 2, name: 'Requiere atencion' })).toBeInTheDocument()
    expect(screen.getByText('2 handlers degradados')).toBeInTheDocument()
    expect(screen.getByText('128 backlog reactivo oculto')).toBeInTheDocument()
    expect(screen.getByText('1 deliveries en dead-letter')).toBeInTheDocument()
    expect(screen.getByText('12 usuarios sin activar')).toBeInTheDocument()
  })

  it('hides the consolidated alert block when all signals are clean', () => {
    renderWithTheme(
      <AdminCenterView
        access={{
          ...access,
          totals: { ...access.totals, invitedUsers: 2 }
        }}
        tenants={tenants}
        controlTower={{
          ...controlTower,
          clients: [
            buildClient({
              clientId: 'orbit',
              clientName: 'Orbit',
              primaryContactEmail: 'orbit@example.com',
              createdAt: '2025-12-01T00:00:00.000Z',
              lastActivityAt: '2026-03-30T00:00:00.000Z',
              scopedProjects: 3,
              totalUsers: 10,
              activeUsers: 9,
              invitedUsers: 0
            })
          ]
        }}
        operations={{
          ...operations,
          kpis: {
            ...operations.kpis,
            hiddenReactiveBacklog: 0,
            failedHandlers: 0,
            pendingProjections: 0
          },
          reactiveBacklog: {
            ...operations.reactiveBacklog,
            totalUnreacted: 0,
            last24hUnreacted: 0,
            status: 'healthy',
            topEventTypes: []
          },
          webhooks: {
            ...operations.webhooks,
            deliveriesDeadLetter: 0
          }
        }}
        reliability={reliability}
        syntheticSnapshots={[]}
        syntheticSweep={null}
        aiObservation={null}
        aiModuleObservations={[]}
      />
    )

    expect(screen.queryByRole('heading', { level: 2, name: 'Requiere atencion' })).not.toBeInTheDocument()
  })
})
