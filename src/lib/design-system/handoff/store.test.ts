import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AXIS_FILE_KEY } from '@/lib/design-system/figma-nodes/axis-file'
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

describe('createDesignHandoffEntry — fail-closed validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(runGreenhousePostgresQuery).mockResolvedValue([])
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
})
