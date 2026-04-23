import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockQuery = vi.fn()

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  getDb: () => {
    throw new Error('not used in this suite')
  },
  withTransaction: () => {
    throw new Error('not used in this suite')
  }
}))

vi.mock('../deal-events', () => ({
  publishDealCreated: vi.fn(),
  publishDealLost: vi.fn(),
  publishDealStageChanged: vi.fn(),
  publishDealSynced: vi.fn(),
  publishDealWon: vi.fn()
}))

import { getDealCreationContext, validateDealCreationSelection } from '../deals-store'

// Helpers to keep the table rows short.
const stageRow = (
  pipelineId: string,
  pipelineLabel: string | null,
  stageId: string,
  stageLabel: string,
  overrides: Partial<{
    pipelineDisplayOrder: number | null
    pipelineActive: boolean
    stageDisplayOrder: number | null
    isOpenSelectable: boolean
    isClosed: boolean
    isWon: boolean
    isDefaultForCreate: boolean
  }> = {}
) => ({
  pipeline_id: pipelineId,
  pipeline_label: pipelineLabel,
  pipeline_display_order: overrides.pipelineDisplayOrder ?? 1,
  pipeline_active: overrides.pipelineActive ?? true,
  stage_id: stageId,
  stage_label: stageLabel,
  stage_display_order: overrides.stageDisplayOrder ?? 1,
  is_open_selectable: overrides.isOpenSelectable ?? true,
  is_closed: overrides.isClosed ?? false,
  is_won: overrides.isWon ?? false,
  is_default_for_create: overrides.isDefaultForCreate ?? false
})

describe('getDealCreationContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('picks the single active pipeline when only one exists', async () => {
    mockQuery
      .mockResolvedValueOnce([
        stageRow('p1', 'Default', 's1', 'Appointment', { stageDisplayOrder: 1 }),
        stageRow('p1', 'Default', 's2', 'Qualified', { stageDisplayOrder: 2, isDefaultForCreate: true })
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const context = await getDealCreationContext({ tenantScope: 'efeonce_internal:efeonce' })

    expect(context.pipelines).toHaveLength(1)
    expect(context.defaultPipelineId).toBe('p1')
    expect(context.defaultStageId).toBe('s2')
    expect(context.defaultsSource).toEqual({
      pipeline: 'single_option',
      stage: 'pipeline_default',
      dealType: 'none',
      priority: 'none',
      owner: 'none'
    })
  })

  it('prefers tenant default over global', async () => {
    mockQuery
      .mockResolvedValueOnce([
        stageRow('p1', 'Sales', 's1', 'New', { pipelineDisplayOrder: 1 }),
        stageRow('p2', 'Ops', 's3', 'Intake', { pipelineDisplayOrder: 2 })
      ])
      .mockResolvedValueOnce([
        { scope: 'global', scope_key: '__global__', pipeline_id: 'p1', stage_id: 's1', deal_type: null, priority: null, owner_hubspot_user_id: 'owner-global' },
        { scope: 'tenant', scope_key: 'efeonce_internal:efeonce', pipeline_id: 'p2', stage_id: 's3', deal_type: null, priority: null, owner_hubspot_user_id: 'owner-tenant' }
      ])
      .mockResolvedValueOnce([])

    const context = await getDealCreationContext({ tenantScope: 'efeonce_internal:efeonce' })

    expect(context.defaultPipelineId).toBe('p2')
    expect(context.defaultStageId).toBe('s3')
    expect(context.defaultOwnerHubspotUserId).toBe('owner-tenant')
    expect(context.defaultsSource.pipeline).toBe('tenant_policy')
  })

  it('flags governance incomplete when multiple selectable stages lack an explicit default', async () => {
    mockQuery
      .mockResolvedValueOnce([
        stageRow('p1', 'Sales', 's-closed', 'Lost', { isClosed: true, isOpenSelectable: false, stageDisplayOrder: 3 }),
        stageRow('p1', 'Sales', 's-open', 'New', { stageDisplayOrder: 1 }),
        stageRow('p1', 'Sales', 's-mid', 'Proposal', { stageDisplayOrder: 2 })
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const context = await getDealCreationContext()

    expect(context.defaultStageId).toBeNull()
    expect(context.readyToCreate).toBe(false)
    expect(context.blockingIssues).toContain('pipeline:p1:multiple_selectable_stages_without_default')
  })
})

describe('validateDealCreationSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns pipeline_unknown when the id is not in the registry', async () => {
    const result = await validateDealCreationSelection({
      pipelineId: 'missing',
      stageId: 's',
      context: {
        defaultPipelineId: null,
        defaultStageId: null,
        defaultDealType: null,
        defaultPriority: null,
        defaultOwnerHubspotUserId: null,
        defaultsSource: { pipeline: 'none', stage: 'none', dealType: 'none', priority: 'none', owner: 'none' },
        readyToCreate: false,
        blockingIssues: [],
        dealTypeOptions: [],
        priorityOptions: [],
        pipelines: []
      }
    })

    expect(result).toMatchObject({ valid: false, errorCode: 'pipeline_unknown' })
  })

  it('returns stage_closed when the stage is closed', async () => {
    const result = await validateDealCreationSelection({
      pipelineId: 'p1',
      stageId: 's-closed',
      context: {
        defaultPipelineId: 'p1',
        defaultStageId: null,
        defaultDealType: null,
        defaultPriority: null,
        defaultOwnerHubspotUserId: null,
        defaultsSource: { pipeline: 'single_option', stage: 'none', dealType: 'none', priority: 'none', owner: 'none' },
        readyToCreate: false,
        blockingIssues: [],
        dealTypeOptions: [],
        priorityOptions: [],
        pipelines: [
          {
            pipelineId: 'p1',
            label: 'Sales',
            displayOrder: 1,
            active: true,
            isDefault: true,
            stages: [
              {
                stageId: 's-closed',
                label: 'Lost',
                displayOrder: 1,
                isClosed: true,
                isWon: false,
                isSelectableForCreate: false,
                isDefault: false
              }
            ]
          }
        ]
      }
    })

    expect(result).toMatchObject({ valid: false, errorCode: 'stage_closed' })
  })

  it('returns valid when the pipeline and stage line up', async () => {
    const result = await validateDealCreationSelection({
      pipelineId: 'p1',
      stageId: 's-open',
      context: {
        defaultPipelineId: 'p1',
        defaultStageId: 's-open',
        defaultDealType: null,
        defaultPriority: null,
        defaultOwnerHubspotUserId: null,
        defaultsSource: { pipeline: 'single_option', stage: 'pipeline_default', dealType: 'none', priority: 'none', owner: 'none' },
        readyToCreate: true,
        blockingIssues: [],
        dealTypeOptions: [],
        priorityOptions: [],
        pipelines: [
          {
            pipelineId: 'p1',
            label: 'Sales',
            displayOrder: 1,
            active: true,
            isDefault: true,
            stages: [
              {
                stageId: 's-open',
                label: 'New',
                displayOrder: 1,
                isClosed: false,
                isWon: false,
                isSelectableForCreate: true,
                isDefault: true
              }
            ]
          }
        ]
      }
    })

    expect(result).toMatchObject({ valid: true, pipelineLabel: 'Sales', stageLabel: 'New' })
  })
})
