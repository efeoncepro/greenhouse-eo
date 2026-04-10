// @vitest-environment jsdom

import type { ReactNode } from 'react'

import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'
import type { Space360Detail } from '@/lib/agency/space-360'

import Space360View from './Space360View'

const replaceMock = vi.fn()
let searchParams = new URLSearchParams()

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  )
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  usePathname: () => '/agency/spaces/client-1',
  useSearchParams: () => searchParams
}))

// Mock IntersectionObserver for AnimatedCounter's useInView
beforeAll(() => {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

const detail: Space360Detail = {
  requestedId: 'client-1',
  clientId: 'client-1',
  clientName: 'Acme',
  tenantType: 'client',
  isInternal: false,
  businessLines: ['creative_hub', 'performance_marketing'],
  spaceId: null,
  spaceName: null,
  organizationId: 'org-1',
  organizationName: 'Acme Group',
  organizationPublicId: 'ORG-001',
  resolutionStatus: 'client_only',
  dataStatus: 'partial',
  kpis: {
    revenueClp: 1800000,
    totalCostClp: 600000,
    marginPct: 67,
    rpaAvg: 1.4,
    otdPct: 94,
    projectCount: 2,
    assignedMembers: 1,
    allocatedFte: 1,
    activeServices: 2,
    activePlacements: 1
  },
  badges: {
    health: { zone: 'attention', label: 'Atención', color: 'warning' },
    risk: { level: 'medium', label: 'Medio', color: 'warning' }
  },
  overview: {
    dimensions: [
      {
        key: 'delivery',
        label: 'Delivery',
        status: 'attention',
        summary: 'RpA 1.4 · OTD 94%',
        detail: '1 activo atascado'
      }
    ],
    alerts: ['Falta el vínculo canónico a Space; algunos drilldowns quedan en modo client-first.'],
    provenance: ['Sin vínculo canónico a greenhouse_core.spaces; la vista opera sobre clientId'],
    recentActivity: [
      {
        eventId: 'evt-1',
        eventType: 'assignment.updated',
        aggregateType: 'assignment',
        aggregateId: 'client-1',
        occurredAt: '2026-03-30T10:00:00.000Z',
        title: 'Assignment Updated',
        description: 'Asignación de equipo actualizada'
      }
    ]
  },
  team: {
    summary: {
      assignedMembers: 1,
      allocatedFte: 1,
      avgUsagePct: 92,
      totalLoadedCostClp: 950000,
      activePlacements: 1,
      providerCount: 1,
      overcommittedCount: 0,
      requiredSkillCount: 2,
      coveredSkillCount: 1,
      gapSkillCount: 1,
      serviceCountWithRequirements: 1,
      coveragePct: 50
    },
    members: [
      {
        assignmentId: 'asg-1',
        memberId: 'member-1',
        displayName: 'Ana',
        roleTitle: 'Designer',
        roleCategory: 'design',
        fteAllocation: 1,
        contractedHoursMonth: 160,
        usagePercent: 92,
        capacityHealth: 'attention',
        loadedCostTarget: 950000,
        costPerHourTarget: 15000,
        targetCurrency: 'CLP',
        assignmentType: 'commercial',
        startDate: '2026-03-01',
        placementId: 'placement-1',
        placementStatus: 'active',
        placementProviderId: 'provider-1',
        placementProviderName: 'Anthropic',
        skills: [
          {
            memberId: 'member-1',
            skillCode: 'ux_ui_design',
            skillName: 'UX/UI Design',
            skillCategory: 'design',
            seniorityLevel: 'senior',
            sourceSystem: 'manual',
            notes: null,
            verifiedBy: 'user-1',
            verifiedAt: '2026-04-10T00:00:00.000Z'
          }
        ]
      }
    ],
    staffing: {
      services: [
        {
          serviceId: 'service-1',
          serviceName: 'Creative Retainer',
          serviceLine: 'creative',
          serviceType: 'retainer',
          requirements: [
            {
              serviceId: 'service-1',
              skillCode: 'ux_ui_design',
              skillName: 'UX/UI Design',
              skillCategory: 'design',
              requiredSeniority: 'senior',
              requiredFte: 1,
              notes: null,
              matchedMemberCount: 1,
              coverageFte: 1,
              status: 'covered',
              topCandidates: [
                {
                  memberId: 'member-1',
                  displayName: 'Ana',
                  roleTitle: 'Designer',
                  roleCategory: 'design',
                  assignmentId: 'asg-1',
                  assignmentFte: 1,
                  availableFte: 0.1,
                  utilizationPercent: 92,
                  placementId: 'placement-1',
                  placementStatus: 'active',
                  seniorityLevel: 'senior',
                  seniorityScore: 100,
                  availabilityScore: 10,
                  fitScore: 69
                }
              ]
            }
          ],
          gaps: [],
          summary: {
            totalRequirementCount: 1,
            coveredRequirementCount: 1,
            gapRequirementCount: 0,
            averageFitScore: 69
          }
        }
      ]
    }
  },
  services: {
    items: [
      {
        serviceId: 'service-1',
        publicId: 'EO-SVC-0001',
        name: 'Creative Retainer',
        spaceId: 'space-1',
        spaceName: 'Acme Space',
        organizationId: 'org-1',
        organizationName: 'Acme Group',
        pipelineStage: 'active',
        lineaDeServicio: 'creative',
        servicioEspecifico: 'retainer',
        modalidad: 'monthly',
        billingFrequency: 'monthly',
        country: 'CL',
        status: 'active',
        startDate: '2026-03-01',
        targetEndDate: null,
        currency: 'CLP',
        totalCost: 600000,
        amountPaid: 0,
        hubspotServiceId: null,
        active: true,
        createdAt: '2026-03-01T10:00:00.000Z',
        updatedAt: '2026-03-10T10:00:00.000Z'
      }
    ],
    totalCostClp: 600000,
    stageMix: { active: 1 }
  },
  delivery: {
    snapshot: null,
    trends: [],
    projectMetrics: [],
    stuckAssets: []
  },
  ownership: {
    accountLead: null,
    deliveryLead: null,
    financeReviewer: null,
    operationsLead: null
  },
  finance: {
    snapshot: null,
    receivablesClp: 1500000,
    payablesClp: 220000,
    payrollExposureClp: 950000,
    toolingExposureClp: 120000,
    recentIncome: [
      {
        incomeId: 'inc-1',
        invoiceNumber: 'FAC-1',
        invoiceDate: '2026-03-10',
        dueDate: '2026-03-25',
        totalAmountClp: 1800000,
        amountPaid: 1200000,
        paymentStatus: 'partial',
        description: 'Retainer marzo'
      }
    ],
    recentExpenses: [
      {
        expenseId: 'exp-1',
        expenseType: 'supplier',
        description: 'Media spend',
        paymentDate: '2026-03-18',
        dueDate: '2026-03-20',
        supplierName: 'Meta',
        paymentStatus: 'paid',
        totalAmountClp: 220000,
        memberName: null
      }
    ]
  }
}

describe('Space360View', () => {
  beforeEach(() => {
    replaceMock.mockReset()
    searchParams = new URLSearchParams()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the agency space 360 shell with honest partial-state messaging', () => {
    renderWithTheme(<Space360View detail={detail} requestedId='client-1' />)

    expect(screen.getAllByText('Acme').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Health Atención')).toBeInTheDocument()
    expect(screen.getByText('Risk Medio')).toBeInTheDocument()
    expect(screen.getByText('Sin vínculo canónico a Space')).toBeInTheDocument()
    expect(screen.getByText(/sigue parcial en las zonas donde aún faltan vínculos canónicos/i)).toBeInTheDocument()
    expect(screen.getByText('Ingresos')).toBeInTheDocument()
    expect(screen.getByText('Margin')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Resumen' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Equipo' })).toBeInTheDocument()
    expect(screen.getByText('Resumen operativo')).toBeInTheDocument()
    expect(screen.getByText('Actividad reciente')).toBeInTheDocument()
    expect(screen.getByText('Assignment Updated')).toBeInTheDocument()
  })

  it('renders an empty state when the requested space cannot be resolved', () => {
    renderWithTheme(<Space360View detail={null} requestedId='missing-space' />)

    expect(screen.getByText('Space no encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver a Spaces' })).toHaveAttribute('href', '/agency?tab=spaces')
  })

  it('renders the team tab with skill coverage and service gaps', () => {
    searchParams = new URLSearchParams('tab=team')

    renderWithTheme(<Space360View detail={detail} requestedId='client-1' />)

    expect(screen.getByText('Cobertura de skills')).toBeInTheDocument()
    expect(screen.getByText('50% cubierto')).toBeInTheDocument()
    expect(screen.getByText('Servicios con requisitos')).toBeInTheDocument()
    expect(screen.getByText('Cubiertas')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'UX/UI Design · Senior' })).toBeInTheDocument()
    expect(screen.getByText('Creative Retainer')).toBeInTheDocument()
    expect(screen.getByText('Cubierto')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Verificado por Efeonce' })).toBeInTheDocument()
  })
})
