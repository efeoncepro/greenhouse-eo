import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn(), entitlement: vi.fn() }))

vi.mock('@/lib/ai/dataforseo', () => ({ requestDataForSeo: mocks.request }))
vi.mock('@/lib/growth/seo/entitlement', () => ({ enforceSeoRunEntitlement: mocks.entitlement }))
vi.mock('@/lib/growth/seo/register-provider-spend', () => ({}))
vi.mock('../../lib/load-greenhouse-tool-env', () => ({ loadGreenhouseToolEnv: vi.fn() }))

import { CLI_EXIT, parseArgs, run, runSiteKeywords } from '../cli'

const target = 'https://example.com/Article/?a=b&c=d'
let directory: string
let writes: string[]

const response = (
  input: {
    keywords?: string[]
    token?: string
    total?: number
    target?: string
    code?: number
    cost?: number | null
  } = {}
) => ({
  ok: true,
  httpStatus: 200,
  latencyMs: 1,
  cost: input.cost === undefined ? 0.01224 : input.cost,
  tasks: [
    {
      id: 'provider-task',
      status_code: input.code ?? 20000,
      result_count: 1,
      cost: input.cost ?? 0.01224,
      result: [
        {
          target: input.target ?? target,
          total_count: input.total ?? 2,
          offset_token: input.token ?? null,
          items: (input.keywords ?? ['Relevant first', 'Relevant second']).map(keyword => ({
            keyword,
            keyword_info: { search_volume: 0 }
          }))
        }
      ]
    }
  ]
})

const flags = () => ({
  target,
  'target-kind': 'url',
  market: 'MX',
  limit: '2',
  'max-pages': '3',
  org: 'test-org',
  'max-usd': '0.05',
  checkpoint: join(directory, 'checkpoint.json'),
  yes: true
})

const artifact = () => JSON.parse(writes.at(-1)!)

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'site-keywords-cli-'))
  writes = []
  mocks.request.mockReset().mockResolvedValue(response())
  mocks.entitlement.mockReset().mockResolvedValue({ allowed: true })
  vi.spyOn(process.stdout, 'write').mockImplementation(value => {
    writes.push(String(value))

    return true
  })
  vi.spyOn(console, 'error').mockImplementation(() => {})
  process.exitCode = 0
})

afterEach(async () => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  process.exitCode = 0
  await rm(directory, { recursive: true, force: true })
})

describe('site-keywords command integration', () => {
  it('preserves every equals sign in inline URL arguments', () => {
    expect(parseArgs([`--target=${target}`]).flags.target).toBe(target)
  })

  it('previews without provider, database or checkpoint writes', async () => {
    await runSiteKeywords({ ...flags(), 'dry-run': true })
    expect(artifact().plan.task.target).toBe(target)
    expect(mocks.request).not.toHaveBeenCalled()
    expect(mocks.entitlement).not.toHaveBeenCalled()
    await expect(readFile(flags().checkpoint)).rejects.toThrow()
  })

  it('buys only Keywords for Site, preserves relevance, and stops at total_count', async () => {
    await runSiteKeywords(flags())
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(mocks.request).toHaveBeenCalledWith(
      expect.objectContaining({
        family: 'labs',
        consumer: 'seo',
        organizationId: 'test-org',
        endpoint: '/v3/dataforseo_labs/google/keywords_for_site/live',
        tasks: [expect.objectContaining({ target, location_code: 2484, language_code: 'es' })]
      })
    )
    expect(artifact().result.keywords.map((row: { keyword: string }) => row.keyword)).toEqual([
      'Relevant first',
      'Relevant second'
    ])
    expect(artifact().result.coverage).toMatchObject({ pagesFetched: 1, hasMore: false, exhausted: true })
  })

  it('sends only limit and cursor for subsequent pages and resumes without repurchase', async () => {
    mocks.request
      .mockResolvedValueOnce(response({ total: 3, token: 'page-two' }))
      .mockResolvedValueOnce(response({ keywords: ['Third'], total: 3 }))
    await runSiteKeywords(flags())
    expect(mocks.request).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ tasks: [{ limit: 2, offset_token: 'page-two' }] })
    )
    expect(artifact().result.coverage.exhausted).toBe(true)
    expect(artifact().result.actualCostUsd).toBe(0.02448)
    const existing = flags()

    await runSiteKeywords({ ...existing, resume: existing.checkpoint })
    expect(mocks.request).toHaveBeenCalledTimes(2)
    expect(artifact().result.incrementalCostUsd).toBe(0)
    expect(artifact().result.actualCostUsd).toBe(0.02448)
  })

  it('keeps an empty successful page as no_data and does not buy maxPages', async () => {
    mocks.request.mockResolvedValue(response({ keywords: [], total: 0 }))
    await runSiteKeywords(flags())
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(artifact().outcome).toBe('no_data')
    expect(artifact().result.coverage.exhausted).toBe(true)
    expect(process.exitCode).toBe(CLI_EXIT.noData)
  })

  it('reports incomplete coverage when an empty page contradicts total_count', async () => {
    mocks.request.mockResolvedValue(response({ keywords: [], total: 5 }))
    await runSiteKeywords(flags())
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(artifact().outcome).toBe('pagination_inconsistent')
    expect(artifact().result.coverage).toMatchObject({ hasMore: true, exhausted: false })
  })

  it('preserves transport failures with their outcome and never retries the POST', async () => {
    mocks.request.mockResolvedValue({ ok: false, httpStatus: 503, cost: null, latencyMs: 1, tasks: [] })
    await runSiteKeywords(flags())
    expect(artifact().outcome).toBe('transport_error')
    expect(artifact().result.actualCostUsd).toBeNull()
    expect(process.exitCode).toBe(CLI_EXIT.transportError)
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(artifact().outcome).toBe('transport_error')
    expect(process.exitCode).toBe(CLI_EXIT.transportError)
    expect(mocks.request).toHaveBeenCalledOnce()
  })

  it('rejects multiple result blocks rather than mixing reported and unreported scope', async () => {
    const invalid = response()

    invalid.tasks[0].result.push({ ...invalid.tasks[0].result[0], target: '' })
    mocks.request.mockResolvedValue(invalid)
    await runSiteKeywords(flags())
    expect(artifact().outcome).toBe('provider_task_error')
    expect(artifact().result.keywords).toEqual([])
    expect(artifact().result.coverage.exhausted).toBe(false)
  })

  it('reports bounded coverage when maxPages stops before all rows', async () => {
    mocks.request.mockResolvedValue(response({ total: 30, token: 'next' }))
    await runSiteKeywords({ ...flags(), 'max-pages': '1' })
    expect(artifact().result.coverage).toMatchObject({ hasMore: true, exhausted: false })
  })

  it('stops on a repeated provider token rather than buying the same page again', async () => {
    mocks.request.mockResolvedValue(response({ total: 30, token: 'repeated' }))
    await runSiteKeywords(flags())
    expect(mocks.request).toHaveBeenCalledTimes(2)
    expect(artifact().outcome).toBe('pagination_stalled')
    expect(process.exitCode).toBe(CLI_EXIT.providerError)
  })

  it('refuses scope mismatch, keeps raw, and emits no keywords', async () => {
    mocks.request.mockResolvedValue(response({ target: 'example.com', total: 30 }))
    await runSiteKeywords(flags())
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(artifact().ok).toBe(false)
    expect(artifact().result.scope.status).toBe('mismatch')
    expect(artifact().result.keywords).toEqual([])
    expect(artifact().steps[0].tasks[0].result[0].target).toBe('example.com')
  })

  it('preserves failed paid tasks and avoids their silent resubmission on resume', async () => {
    mocks.request.mockResolvedValue(response({ code: 40501, total: 30 }))
    await runSiteKeywords(flags())
    expect(artifact().outcome).toBe('provider_task_error')
    expect(artifact().result.keywords).toEqual([])
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(mocks.request).toHaveBeenCalledOnce()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.now() + 25 * 60 * 60 * 1000)
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(artifact().outcome).toBe('provider_task_error')
    expect(mocks.request).toHaveBeenCalledOnce()
  })

  it('keeps an unexpected Live pending response pending during resume', async () => {
    mocks.request.mockResolvedValue(response({ code: 40602 }))
    await runSiteKeywords(flags())
    expect(artifact().outcome).toBe('pending')
    expect(process.exitCode).toBe(CLI_EXIT.pending)
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(artifact().outcome).toBe('pending')
    expect(process.exitCode).toBe(CLI_EXIT.pending)
    expect(mocks.request).toHaveBeenCalledOnce()
  })

  it('does not treat unknown cost as zero or proceed to another page', async () => {
    mocks.request.mockResolvedValue(response({ cost: null, total: 30, token: 'next' }))
    await runSiteKeywords(flags())
    expect(artifact().outcome).toBe('cost_unavailable')
    expect(artifact().result.actualCostUsd).toBeNull()
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(artifact().result.actualCostUsd).toBeNull()
    expect(mocks.request).toHaveBeenCalledOnce()
  })

  it('blocks an unknown-cost checkpoint before repurchasing even expired earlier pages', async () => {
    mocks.request
      .mockResolvedValueOnce(response({ total: 4, token: 'page-two' }))
      .mockResolvedValueOnce(response({ keywords: ['Third'], cost: null, total: 4 }))
    await runSiteKeywords(flags())
    const checkpoint = JSON.parse(await readFile(flags().checkpoint, 'utf8'))

    for (const step of Object.values(checkpoint.steps) as Array<{ expiresAt: string }>)
      step.expiresAt = '2000-01-01T00:00:00Z'
    await writeFile(flags().checkpoint, JSON.stringify(checkpoint))
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(artifact().outcome).toBe('cost_unavailable')
    expect(artifact().result.actualCostUsd).toBeNull()
    expect(mocks.request).toHaveBeenCalledTimes(2)
  })

  it('checks actual accumulated cost before buying the next page', async () => {
    mocks.request.mockResolvedValue(response({ cost: 0.03, total: 30, token: 'next' }))
    await runSiteKeywords({ ...flags(), 'max-usd': '0.04' })
    expect(mocks.request).toHaveBeenCalledOnce()
    expect(artifact().outcome).toBe('stopped')
    expect(artifact().result.coverage.hasMore).toBe(true)
    expect(process.exitCode).toBe(CLI_EXIT.blocked)
  })

  it('blocks entitlement before provider spend', async () => {
    mocks.entitlement.mockResolvedValue({ allowed: false, blockedReason: 'no_entitlement' })
    await runSiteKeywords(flags())
    expect(mocks.request).not.toHaveBeenCalled()
    expect(artifact().outcome).toBe('stopped')
  })

  it('rejects wrong tenant, changed URL and reduced cost estimate before fetching', async () => {
    await runSiteKeywords(flags())

    const overrides: Array<Record<string, string>> = [
      { org: 'other-org' },
      { target: 'https://example.com/other' },
      { 'estimated-usd': '0.001' }
    ]

    for (const override of overrides) {
      await expect(runSiteKeywords({ ...flags(), resume: flags().checkpoint, ...override })).rejects.toThrow()
    }

    expect(mocks.request).toHaveBeenCalledOnce()
  })

  it('blocks terminal page failures before repurchasing expired earlier pages', async () => {
    mocks.request
      .mockResolvedValueOnce(response({ total: 4, token: 'page-two' }))
      .mockResolvedValueOnce(response({ code: 40501, total: 4 }))
    await runSiteKeywords(flags())
    const checkpoint = JSON.parse(await readFile(flags().checkpoint, 'utf8'))

    checkpoint.steps['site-keywords:0'].expiresAt = '2000-01-01T00:00:00Z'
    await writeFile(flags().checkpoint, JSON.stringify(checkpoint))
    await runSiteKeywords({ ...flags(), resume: flags().checkpoint })
    expect(artifact().outcome).toBe('provider_task_error')
    expect(mocks.request).toHaveBeenCalledTimes(2)
  })

  it('exports CSV together with JSON scope and raw provenance', async () => {
    const out = join(directory, 'result.json')
    const csv = join(directory, 'result.csv')

    await runSiteKeywords({ ...flags(), out, csv })
    expect(JSON.parse(await readFile(out, 'utf8')).result.scope.status).toBe('matched')
    expect(await readFile(csv, 'utf8')).toContain('Relevant first,0,value')
  })

  it('makes quick available with automatic estimate and shared normalized output', async () => {
    await run(['quick', 'keywords-for-site', '--target-kind', 'url', `--target=${target}`, '--limit', '2', '--dry-run'])
    expect(artifact().estimatedCostUsd).toBe(0.01224)
    expect(artifact().tasks[0].target).toBe(target)
    expect(mocks.request).not.toHaveBeenCalled()
    await run([
      'quick',
      'keywords-for-site',
      '--target-kind',
      'url',
      '--target',
      target,
      '--limit',
      '2',
      '--org',
      'test-org',
      '--max-usd',
      '0.02',
      '--yes'
    ])
    expect(artifact().result.keywords).toHaveLength(2)
    expect(mocks.request).toHaveBeenCalledOnce()
  })

  it('quick refuses underestimation and consumer reassignment before transport', async () => {
    const args = ['quick', 'keywords-for-site', '--target-kind', 'url', '--target', target, '--limit', '2']

    await expect(run([...args, '--estimated-usd', '0.001'])).rejects.toThrow('no puede reducir')
    await expect(run([...args, '--consumer', 'aeo'])).rejects.toThrow('consumer=seo')
    expect(mocks.request).not.toHaveBeenCalled()
  })

  it('quick marks an empty result container as no_data', async () => {
    mocks.request.mockResolvedValue(response({ keywords: [], total: 0 }))
    await run([
      'quick',
      'keywords-for-site',
      '--target-kind',
      'url',
      '--target',
      target,
      '--org',
      'test-org',
      '--max-usd',
      '0.024',
      '--yes'
    ])
    expect(artifact().outcome).toBe('no_data')
    expect(process.exitCode).toBe(CLI_EXIT.noData)
  })
})
