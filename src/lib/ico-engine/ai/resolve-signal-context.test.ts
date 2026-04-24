import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mockGetDb = vi.fn()

vi.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args)
}))

const { getResolvedProjectLabel, resolveSignalContext } = await import('./resolve-signal-context')

const createBuilder = (rows: unknown[]) => {
  const builder = {
    select: vi.fn(() => builder),
    where: vi.fn(() => builder),
    execute: vi.fn(async () => rows)
  }

  return builder
}

const baseSignal = {
  signalId: 'EO-AIS-1',
  signalType: 'root_cause' as const,
  spaceId: 'space-1',
  memberId: 'member-1',
  projectId: 'notion-project-1',
  metricName: 'ftr_pct' as const,
  periodYear: 2026,
  periodMonth: 4,
  severity: 'warning' as const,
  currentValue: 61.2,
  expectedValue: 80,
  zScore: 1.8,
  predictedValue: null,
  confidence: 0.88,
  predictionHorizon: null,
  contributionPct: 53.4,
  dimension: 'project' as const,
  dimensionId: 'notion-project-1',
  actionType: null,
  actionSummary: null,
  actionTargetId: 'notion-project-1',
  modelVersion: 'ico-ai-core-v1.0.0',
  generatedAt: '2026-04-17T12:00:00.000Z',
  aiEligible: true,
  payloadJson: {
    dimensionLabel: 'notion-project-1'
  }
}

describe('resolveSignalContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockGetDb.mockResolvedValue({
      selectFrom: (table: string) => {
        if (table === 'greenhouse_core.spaces') {
          return createBuilder([{ space_id: 'space-1', space_name: 'Sky Airlines' }])
        }

        if (table === 'greenhouse_core.members') {
          return createBuilder([{ member_id: 'member-1', display_name: 'Andres Carlosama' }])
        }

        if (table === 'greenhouse_delivery.projects') {
          return createBuilder([
            {
              project_record_id: 'project-notion-project-1',
              notion_project_id: 'notion-project-1',
              project_name: 'Campana Q1 Digital',
              space_id: 'space-1'
            }
          ])
        }

        throw new Error(`Unexpected table ${table}`)
      }
    })
  })

  it('resolves projects by source id and canonical record id within the same space', async () => {
    const context = await resolveSignalContext([baseSignal])

    expect(context.spaces.get('space-1')).toBe('Sky Airlines')
    expect(context.members.get('member-1')).toBe('Andres Carlosama')
    expect(getResolvedProjectLabel(context, 'space-1', 'notion-project-1')).toBe('Campana Q1 Digital')
    expect(getResolvedProjectLabel(context, 'space-1', 'project-notion-project-1')).toBe('Campana Q1 Digital')
  })

  it('keeps project resolution tenant-safe by space_id', async () => {
    const context = await resolveSignalContext([baseSignal])

    expect(getResolvedProjectLabel(context, 'space-2', 'notion-project-1')).toBeNull()
  })

  it('returns null when project_name is null (post-TASK-588 canonical may hold null)', async () => {
    mockGetDb.mockResolvedValue({
      selectFrom: (table: string) => {
        if (table === 'greenhouse_core.spaces') {
          return createBuilder([{ space_id: 'space-1', space_name: 'Sky Airlines' }])
        }

        if (table === 'greenhouse_core.members') {
          return createBuilder([{ member_id: 'member-1', display_name: 'Andres Carlosama' }])
        }

        if (table === 'greenhouse_delivery.projects') {
          return createBuilder([
            {
              project_record_id: 'project-notion-project-1',
              notion_project_id: 'notion-project-1',
              project_name: null,
              space_id: 'space-1'
            }
          ])
        }

        throw new Error(`Unexpected table ${table}`)
      }
    })

    const context = await resolveSignalContext([baseSignal])

    expect(getResolvedProjectLabel(context, 'space-1', 'notion-project-1')).toBeNull()
  })

  it('rejects sentinel project_name values even if stored (defensive against legacy BQ data)', async () => {
    mockGetDb.mockResolvedValue({
      selectFrom: (table: string) => {
        if (table === 'greenhouse_core.spaces') {
          return createBuilder([{ space_id: 'space-1', space_name: 'Sky Airlines' }])
        }

        if (table === 'greenhouse_core.members') {
          return createBuilder([])
        }

        if (table === 'greenhouse_delivery.projects') {
          return createBuilder([
            {
              project_record_id: 'project-notion-project-1',
              notion_project_id: 'notion-project-1',
              project_name: 'Sin nombre',
              space_id: 'space-1'
            }
          ])
        }

        throw new Error(`Unexpected table ${table}`)
      }
    })

    const context = await resolveSignalContext([baseSignal])

    expect(getResolvedProjectLabel(context, 'space-1', 'notion-project-1')).toBeNull()
  })
})
