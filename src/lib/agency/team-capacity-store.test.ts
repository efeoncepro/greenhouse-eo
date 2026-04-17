import { describe, expect, it } from 'vitest'

import {
  buildAgencyTeamCapacityPayload,
  toAgencyCapacityOverview
} from '@/lib/agency/team-capacity-store'
import type { MemberCapacityEconomicsSnapshot } from '@/lib/member-capacity-economics/store'

const makeSnapshot = (
  memberId: string,
  overrides: Partial<MemberCapacityEconomicsSnapshot>
): MemberCapacityEconomicsSnapshot => ({
  memberId,
  periodYear: 2026,
  periodMonth: 4,
  contractedFte: 1,
  contractedHours: 160,
  assignedHours: 0,
  usageKind: 'percent',
  usedHours: null,
  usagePercent: 0,
  commercialAvailabilityHours: 160,
  operationalAvailabilityHours: null,
  sourceCurrency: 'CLP',
  targetCurrency: 'CLP',
  totalCompSource: null,
  totalLaborCostTarget: null,
  directOverheadTarget: 0,
  sharedOverheadTarget: 0,
  loadedCostTarget: null,
  costPerHourTarget: null,
  suggestedBillRateTarget: null,
  fxRate: null,
  fxRateDate: null,
  fxProvider: null,
  fxStrategy: null,
  snapshotStatus: 'materialized',
  sourceCompensationVersionId: null,
  sourcePayrollPeriodId: null,
  assignmentCount: 0,
  materializedAt: null,
  ...overrides
})

describe('team-capacity-store', () => {
  it('shows all active members including those without external assignments', () => {
    const payload = buildAgencyTeamCapacityPayload({
      members: [
        {
          member_id: 'member-1',
          display_name: 'Andres Carlosama',
          role_title: 'Operations Lead',
          role_category: 'operations',
          assignable: true
        },
        {
          member_id: 'member-2',
          display_name: 'Luis Reyes',
          role_title: 'HubSpot Specialist',
          role_category: 'media',
          assignable: true
        },
        {
          member_id: 'member-3',
          display_name: 'Valentina Hoyos',
          role_title: 'Designer',
          role_category: 'design',
          assignable: true
        }
      ],
      assignments: [
        {
          assignment_id: 'a-internal',
          member_id: 'member-1',
          client_id: 'client_internal',
          client_name: 'Efeonce Internal',
          space_id: null,
          space_name: null,
          organization_id: null,
          role_title_override: null,
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          start_date: '2026-01-01',
          assignment_type: 'internal',
          placement_id: null,
          placement_status: null
        },
        {
          assignment_id: 'a-sky',
          member_id: 'member-1',
          client_id: 'client-sky',
          client_name: 'Sky Airline',
          space_id: 'space-sky',
          space_name: 'Sky Operations',
          organization_id: 'org-sky',
          role_title_override: null,
          fte_allocation: '1.000',
          contracted_hours_month: 160,
          start_date: '2026-01-01',
          assignment_type: 'staff_augmentation',
          placement_id: 'placement-1',
          placement_status: 'active'
        },
        {
          assignment_id: 'a-sky-2',
          member_id: 'member-2',
          client_id: 'client-sky',
          client_name: 'Sky Airline',
          space_id: 'space-sky',
          space_name: 'Sky Operations',
          organization_id: 'org-sky',
          role_title_override: null,
          fte_allocation: '0.300',
          contracted_hours_month: 48,
          start_date: '2026-02-01',
          assignment_type: 'internal',
          placement_id: null,
          placement_status: null
        }
      ],
      snapshots: new Map([
        ['member-1', makeSnapshot('member-1', {
          assignedHours: 160,
          usagePercent: 78,
          commercialAvailabilityHours: 0,
          targetCurrency: 'CLP'
        })],
        ['member-3', makeSnapshot('member-3', {
          assignedHours: 0,
          usagePercent: 0,
          commercialAvailabilityHours: 160,
          targetCurrency: 'CLP'
        })]
      ])
    })

    expect(payload.memberCount).toBe(3)
    expect(payload.members.map(member => member.displayName)).toEqual([
      'Andres Carlosama',
      'Luis Reyes',
      'Valentina Hoyos'
    ])

    expect(payload.members[0]).toMatchObject({
      displayName: 'Andres Carlosama',
      fteAllocation: 1,
      capacityHealth: 'balanced',
      usageKind: 'percent'
    })
    expect(payload.members[0].assignments).toHaveLength(1)
    expect(payload.members[0].assignments[0]).toMatchObject({
      assignmentType: 'staff_augmentation',
      placementId: 'placement-1',
      placementStatus: 'active',
      spaceId: 'space-sky'
    })

    expect(payload.members[1]).toMatchObject({
      displayName: 'Luis Reyes',
      capacity: expect.objectContaining({ assignedHoursMonth: 48 })
    })
    expect(payload.members[1].assignments).toHaveLength(1)

    expect(payload.members[2]).toMatchObject({
      displayName: 'Valentina Hoyos',
      capacityHealth: 'idle'
    })
    expect(payload.members[2].assignments).toHaveLength(0)
    expect(payload.members[2].capacity.availableHoursMonth).toBe(160)
  })

  it('computes team totals and legacy capacity overview from the shared payload', () => {
    const payload = buildAgencyTeamCapacityPayload({
      members: [
        {
          member_id: 'member-1',
          display_name: 'Daniela Ferreira',
          role_title: 'Designer',
          role_category: 'design',
          assignable: true
        },
        {
          member_id: 'member-2',
          display_name: 'Mateo Silva',
          role_title: 'Operations Analyst',
          role_category: 'operations',
          assignable: false
        }
      ],
      assignments: [
        {
          assignment_id: 'a-1',
          member_id: 'member-1',
          client_id: 'client-sky',
          client_name: 'Sky Airline',
          space_id: 'space-sky',
          space_name: 'Sky Operations',
          organization_id: 'org-sky',
          role_title_override: null,
          fte_allocation: '0.650',
          contracted_hours_month: 104,
          start_date: null,
          assignment_type: 'staff_augmentation',
          placement_id: null,
          placement_status: null
        }
      ],
      snapshots: new Map([
        ['member-1', makeSnapshot('member-1', {
          assignedHours: 104,
          usagePercent: 100,
          commercialAvailabilityHours: 56
        })],
        ['member-2', makeSnapshot('member-2', {
          assignedHours: 0,
          usagePercent: 0,
          commercialAvailabilityHours: 160
        })]
      ])
    })

    expect(payload.memberCount).toBe(1)
    expect(payload.excludedCount).toBe(1)
    expect(payload.hasOperationalMetrics).toBe(true)
    expect(payload.team.usedHoursMonth).toBeNull()
    expect(payload.team.usageKind).toBe('percent')
    expect(payload.team.usagePercent).toBe(100)
    expect(payload.members[0].capacityHealth).toBe('high')

    const legacy = toAgencyCapacityOverview(payload)

    expect(legacy).toMatchObject({
      totalFte: 1,
      allocatedFte: 0.7,
      utilizationPct: 65,
      monthlyHours: 160
    })
    expect(legacy.members[0].spaceAllocations[0]).toMatchObject({
      clientId: 'client-sky',
      clientName: 'Sky Airline',
      fte: 0.7
    })
  })
})
