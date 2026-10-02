import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  createDataForSeoResearchCheckpoint,
  evaluateDataForSeoResearchBudget,
  fingerprintDataForSeoResearch,
  isReusableDataForSeoCheckpointStep,
  loadDataForSeoResearchCheckpoint,
  recordDataForSeoCheckpointStep,
  writeDataForSeoResearchCheckpoint
} from '../dataforseo-research-checkpoint'

describe('DataForSEO research checkpoints', () => {
  it('uses a stable plan fingerprint independent of object key order', () => {
    expect(fingerprintDataForSeoResearch({ market: 'CL', limits: { page: 100, pages: 2 } })).toBe(
      fingerprintDataForSeoResearch({ limits: { pages: 2, page: 100 }, market: 'CL' })
    )
  })

  it('stops the next paid request against observed accumulated cost', () => {
    expect(evaluateDataForSeoResearchBudget({ actualCostUsd: 0.08, nextEstimatedCostUsd: 0.03, maxUsd: 0.1 })).toEqual({
      allowed: false,
      projectedCostUsd: 0.11,
      remainingUsd: 0.02
    })
    expect(evaluateDataForSeoResearchBudget({ actualCostUsd: 0.08, nextEstimatedCostUsd: 0.02, maxUsd: 0.1 })).toEqual({
      allowed: true,
      projectedCostUsd: 0.1,
      remainingUsd: 0.02
    })
  })

  it('writes atomically and rejects tenant or plan drift on resume', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'dataforseo-checkpoint-'))
    const path = join(directory, 'research.json')
    const plan = { market: 'CL', seeds: ['seo'] }

    const checkpoint = createDataForSeoResearchCheckpoint({
      kind: 'keyword-research',
      plan,
      organizationId: 'EO-ORG-0007',
      now: new Date('2026-09-28T12:00:00.000Z')
    })

    await writeDataForSeoResearchCheckpoint(path, checkpoint, new Date('2026-09-28T12:01:00.000Z'))

    expect(JSON.parse(await readFile(path, 'utf8'))).toMatchObject({
      kind: 'keyword-research',
      updatedAt: '2026-09-28T12:01:00.000Z'
    })
    await expect(
      loadDataForSeoResearchCheckpoint({ path, kind: 'keyword-research', plan, organizationId: 'EO-ORG-0007' })
    ).resolves.toMatchObject({ planFingerprint: fingerprintDataForSeoResearch(plan) })
    await expect(
      loadDataForSeoResearchCheckpoint({ path, kind: 'keyword-research', plan, organizationId: 'other' })
    ).rejects.toThrow('otra organización')
    await expect(
      loadDataForSeoResearchCheckpoint({
        path,
        kind: 'keyword-research',
        plan: { ...plan, market: 'MX' },
        organizationId: 'EO-ORG-0007'
      })
    ).rejects.toThrow('no coincide')
  })

  it('reuses only matching, fresh steps and accumulates observed cost', () => {
    const checkpoint = createDataForSeoResearchCheckpoint({
      kind: 'keyword-research',
      plan: { market: 'CL' },
      organizationId: 'EO-ORG-0007'
    })

    const request = [{ keyword: 'seo', limit: 100 }]

    const updated = recordDataForSeoCheckpointStep(checkpoint, {
      key: 'suggestions:0',
      endpoint: '/suggestions',
      request,
      completedAt: '2026-09-28T12:00:00.000Z',
      expiresAt: '2026-09-29T12:00:00.000Z',
      costUsd: 0.012,
      cursor: { offsetToken: 'next' },
      taskIds: ['task-1'],
      tasks: []
    })

    expect(updated.actualCostUsd).toBe(0.012)
    expect(
      isReusableDataForSeoCheckpointStep(updated.steps['suggestions:0'], request, new Date('2026-09-28T13:00:00.000Z'))
    ).toBe(true)
    expect(
      isReusableDataForSeoCheckpointStep(updated.steps['suggestions:0'], request, new Date('2026-09-30T13:00:00.000Z'))
    ).toBe(false)
  })
})
