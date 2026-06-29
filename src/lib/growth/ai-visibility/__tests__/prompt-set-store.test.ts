import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * TASK-1290 Slice 2 — Prompt set store + lifecycle + command gobernado.
 *
 * Cubre: createDraft (version = max+1, status draft), approve atómico (supersede el active previo
 * + activa este; no-op idempotente si ya active; rechazo de superseded), y el gate `can()` del
 * command gobernado (autoría/aprobación).
 */

vi.mock('@/lib/entitlements/runtime', () => ({ can: vi.fn() }))
vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(),
  withGreenhousePostgresTransaction: vi.fn()
}))

import { can } from '@/lib/entitlements/runtime'
import { withGreenhousePostgresTransaction } from '@/lib/postgres/client'
import { approvePromptSet, createDraftPromptSet, PromptSetLifecycleError } from '../prompt-packs/prompt-set-store'
import {
  approveGraderPromptSet,
  createGraderPromptSetDraft,
  PromptSetCommandError
} from '../prompt-packs/prompt-set-command'

const subject = { roleCodes: ['efeonce_account'], routeGroups: ['internal'], authorizedViews: [] } as never
const fakeClient = { query: vi.fn() }

const baseRow = (over: Record<string, unknown>) => ({
  set_id: 'gps-1',
  profile_id: 'gprf-1',
  version: 1,
  business_model: 'consumer_b2c',
  category_node_id: 'sector:passenger_airlines',
  prompts_json: [{ id: 'cb01', family: 'category_discovery', fanOutType: 'related', intentStage: 'awareness', namesBrand: false, text: '¿…?' }],
  generation_strategy: 'template_baseline',
  model: null,
  system_prompt_version: null,
  grounding_sources_json: [],
  status: 'draft',
  created_by: 'op-1',
  approved_by: null,
  approved_at: null,
  created_at: 't0',
  ...over
})

beforeEach(() => {
  vi.clearAllMocks()
  fakeClient.query.mockReset()
  vi.mocked(withGreenhousePostgresTransaction).mockImplementation(
    (async (cb: (c: typeof fakeClient) => unknown) => cb(fakeClient)) as never
  )
})

describe('createDraftPromptSet', () => {
  it('crea un draft con version = max+1', async () => {
    fakeClient.query
      .mockResolvedValueOnce({ rows: [{ next_version: 3 }] }) // MAX(version)+1
      .mockResolvedValueOnce({ rows: [baseRow({ version: 3 })] }) // INSERT RETURNING

    const result = await createDraftPromptSet({
      profileId: 'gprf-1',
      businessModel: 'consumer_b2c',
      categoryNodeId: 'sector:passenger_airlines',
      prompts: [],
      generationStrategy: 'template_baseline',
      createdBy: 'op-1'
    })

    expect(result.status).toBe('draft')
    expect(result.version).toBe(3)
  })
})

describe('approvePromptSet — lifecycle atómico', () => {
  it('not_found si el set no existe', async () => {
    fakeClient.query.mockResolvedValueOnce({ rows: [] })
    await expect(approvePromptSet({ setId: 'gps-x', approvedBy: 'op-1' })).rejects.toMatchObject({
      code: 'not_found'
    })
  })

  it('no-op idempotente si ya está active', async () => {
    fakeClient.query.mockResolvedValueOnce({ rows: [baseRow({ status: 'active' })] })

    const result = await approvePromptSet({ setId: 'gps-1', approvedBy: 'op-1' })

    expect(result.status).toBe('active')
    expect(fakeClient.query).toHaveBeenCalledTimes(1) // solo el SELECT FOR UPDATE
  })

  it('rechaza aprobar un superseded', async () => {
    fakeClient.query.mockResolvedValueOnce({ rows: [baseRow({ status: 'superseded' })] })
    await expect(approvePromptSet({ setId: 'gps-1', approvedBy: 'op-1' })).rejects.toBeInstanceOf(
      PromptSetLifecycleError
    )
  })

  it('draft → active: supersede el active previo + activa este (un solo active)', async () => {
    fakeClient.query
      .mockResolvedValueOnce({ rows: [baseRow({ status: 'draft' })] }) // SELECT FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }) // UPDATE supersede prior active
      .mockResolvedValueOnce({ rows: [baseRow({ status: 'active', approved_by: 'op-1', approved_at: 't1' })] }) // activate

    const result = await approvePromptSet({ setId: 'gps-1', approvedBy: 'op-1' })

    expect(result.status).toBe('active')
    expect(result.approvedBy).toBe('op-1')
    expect(fakeClient.query).toHaveBeenCalledTimes(3)
    // el supersede del active previo del MISMO perfil corre antes de activar.
    expect(String(fakeClient.query.mock.calls[1][0])).toContain("status = 'superseded'")
  })
})

describe('command gobernado — gate can()', () => {
  it('createGraderPromptSetDraft forbidden sin la capability', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(
      createGraderPromptSetDraft({
        subject,
        profileId: 'gprf-1',
        businessModel: 'consumer_b2c',
        categoryNodeId: null,
        prompts: [],
        generationStrategy: 'template_baseline',
        createdBy: 'op-1'
      })
    ).rejects.toBeInstanceOf(PromptSetCommandError)
    expect(can).toHaveBeenCalledWith(subject, 'growth.ai_visibility.prompt_set.manage', 'execute', 'tenant')
  })

  it('approveGraderPromptSet forbidden sin la capability (no abre transacción)', async () => {
    vi.mocked(can).mockReturnValue(false)
    await expect(approveGraderPromptSet({ subject, setId: 'gps-1', approvedBy: 'op-1' })).rejects.toMatchObject({
      code: 'forbidden'
    })
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })
})
