import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AXIS_FILE_KEY } from '@/lib/design-system/figma-nodes/axis-file'
import { getFigmaNodeRender } from '@/lib/design-system/figma-nodes/figma-render'
import { runGreenhousePostgresQuery, withGreenhousePostgresTransaction } from '@/lib/postgres/client'

import type { DesignHandoffError } from './state-machine'
import { createDesignHandoffEntry } from './store'

vi.mock('@/lib/postgres/client', () => ({
  runGreenhousePostgresQuery: vi.fn(async () => []),
  withGreenhousePostgresTransaction: vi.fn(async () => {
    throw new Error('transaction must not run on fail-closed validation')
  })
}))

vi.mock('@/lib/sync/publish-event', () => ({
  publishOutboxEvent: vi.fn()
}))

vi.mock('@/lib/design-system/figma-nodes/figma-render', () => ({
  getFigmaNodeRender: vi.fn(async () => ({ imageUrl: null, nodeName: null, status: 'unavailable' }))
}))

describe('createDesignHandoffEntry — fail-closed validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValue([])
    vi.mocked(withGreenhousePostgresTransaction).mockImplementation(async () => {
      throw new Error('transaction must not run on fail-closed validation')
    })
  })

  it('rejects non-Figma URLs before touching Postgres', async () => {
    await expect(
      createDesignHandoffEntry({
        url: 'not a figma url',
        kind: 'page',
        actorUserId: 'designer-1'
      })
    ).rejects.toMatchObject({ code: 'invalid_figma_url' } satisfies Partial<DesignHandoffError>)

    expect(runGreenhousePostgresQuery).not.toHaveBeenCalled()
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('rejects AXIS nodes because product handoff is a separate aggregate', async () => {
    await expect(
      createDesignHandoffEntry({
        url: `https://www.figma.com/design/${AXIS_FILE_KEY}/AXIS?node-id=10-20`,
        kind: 'component',
        actorUserId: 'designer-1'
      })
    ).rejects.toMatchObject({ code: 'figma_file_not_allowed' })

    expect(runGreenhousePostgresQuery).not.toHaveBeenCalled()
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('rejects non-allowlisted product files before opening a write transaction', async () => {
    await expect(
      createDesignHandoffEntry({
        url: 'https://www.figma.com/design/PRODUCTFILE123/Product?node-id=10-20',
        kind: 'page',
        actorUserId: 'designer-1'
      })
    ).rejects.toMatchObject({ code: 'figma_file_not_allowed' })

    expect(runGreenhousePostgresQuery).toHaveBeenCalledTimes(1)
    expect(withGreenhousePostgresTransaction).not.toHaveBeenCalled()
  })

  it('creates an initial Figma verification snapshot when the product file is allowed', async () => {
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValueOnce([
      {
        file_key: 'PRODUCTFILE123',
        file_label: 'Product approved',
        added_by: 'admin-1',
        added_at: '2026-06-20T00:00:00.000Z',
        superseded_at: null
      }
    ])
    vi.mocked(getFigmaNodeRender).mockResolvedValueOnce({
      imageUrl: 'https://figma.example/render.png',
      nodeName: 'Approved home',
      status: 'ready'
    })

    const query = vi.fn(async (sql: string) => {
      if (sql.includes('INSERT INTO greenhouse_core.design_handoff_node_snapshots')) {
        return {
          rows: [
            {
              snapshot_id: 'dhns-test',
              entry_id: 'dhe-test',
              file_key: 'PRODUCTFILE123',
              node_id: '10:20',
              expected_name: 'Approved home',
              observed_name: 'Approved home',
              node_status: 'reachable',
              render_url: 'https://figma.example/render.png',
              render_hash: 'hash-test',
              provider_checked_at: '2026-06-20T00:00:00.000Z',
              metadata_json: { source: 'figma_render', trigger: 'create' },
              created_by: 'designer-1',
              created_at: '2026-06-20T00:00:00.000Z'
            }
          ]
        }
      }

      if (sql.includes('FROM greenhouse_core.design_handoff_entries')) {
        return {
          rows: [
            {
              entry_id: 'dhe-test',
              title: 'Approved home',
              kind: 'page',
              file_key: 'PRODUCTFILE123',
              file_label: 'Product approved',
              node_id: '10:20',
              node_name: 'Approved home',
              status: 'proposed',
              designer_owner_member_id: null,
              dev_owner_member_id: null,
              priority: 'normal',
              target_surface_key: null,
              due_at: null,
              blocked_reason: null,
              implemented_surface_key: null,
              implementation_strategy: null,
              primitive_key: null,
              primitive_variant: null,
              primitive_kind: null,
              primitive_lab_route: null,
              primitive_runtime_route: null,
              primitive_gvc_ref: null,
              primitive_docs_ref: null,
              primitive_rationale: null,
              primitive_decision_owner: null,
              primitive_decision_due_at: null,
              primitive_decision_updated_at: null,
              created_by: 'designer-1',
              updated_by: 'designer-1',
              created_at: '2026-06-20T00:00:00.000Z',
              updated_at: '2026-06-20T00:00:00.000Z',
              archived_at: null
            }
          ]
        }
      }

      return { rows: [] }
    })

    vi.mocked(withGreenhousePostgresTransaction).mockImplementationOnce(async callback =>
      callback({ query } as never)
    )

    await expect(
      createDesignHandoffEntry({
        url: 'https://www.figma.com/design/PRODUCTFILE123/Product?node-id=10-20',
        kind: 'page',
        actorUserId: 'designer-1'
      })
    ).resolves.toMatchObject({ entryId: 'dhe-test', nodeName: 'Approved home' })

    expect(getFigmaNodeRender).toHaveBeenCalledWith({ fileKey: 'PRODUCTFILE123', nodeId: '10:20' })
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO greenhouse_core.design_handoff_node_snapshots'),
      expect.arrayContaining(['PRODUCTFILE123', '10:20', 'Approved home', 'Approved home', 'reachable'])
    )
  })
})
