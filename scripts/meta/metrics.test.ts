import { describe, expect, it, vi } from 'vitest'

import { EFEONCE_META_PROFILE, type MetaReadClient, MetaReadError } from './client'
import { buildAdInsightsParams, getMetricsCatalog, PIXEL_AGGREGATIONS, runMetricCommand } from './metrics'

const now = new Date('2026-10-18T01:30:00Z')
const complete = { pages: 1, hasMore: false, complete: true, limitReached: false }

const fake = () => {
  const calls = { list: vi.fn<MetaReadClient['list']>().mockImplementation(async (_path, params) => ({
    data: [{ [String(params.fields ?? 'impressions')]: '10' }], pagination: complete })),
    get: vi.fn(), verifyIdentity: vi.fn(), inspectInstagramMedia: vi.fn().mockResolvedValue({ id: '777' }) }

  return { calls, client: calls as unknown as MetaReadClient }
}

describe('Meta complete metrics catalog', () => {
  it('extracts all SDK25 enums with per-source provenance and declares provider availability', () => {
    const all = getMetricsCatalog() as any

    expect(all.ads.fields).toHaveLength(200)
    expect(all.ads.breakdowns).toHaveLength(81)
    expect(all.ads.actionBreakdowns).toHaveLength(16)
    expect(all.ads.attributionWindows).toHaveLength(19)
    expect(all.instagram.metrics).toHaveLength(27)
    expect(all['instagram-media'].metrics).toEqual(all.instagram.metrics)
    expect(PIXEL_AGGREGATIONS).toHaveLength(16)
    expect(PIXEL_AGGREGATIONS).toEqual(expect.arrayContaining(['had_pii', 'event_processing_results', 'match_keys', 'url_by_rule']))
    expect(all.provenance.sources).toHaveLength(8)

    for (const source of all.provenance.sources) {
      expect(source.url).toMatch(/^https:\/\/raw\.githubusercontent\.com\/facebook\/facebook-python-business-sdk\/25\.0\.0\//)
      expect(source.sha256).toMatch(/^[a-f0-9]{64}$/)
    }

    expect(all.page.catalogMode).toBe('provider_resolved')
    expect(all.page.metrics).toBeNull()
    expect(() => getMetricsCatalog('__proto__')).toThrow(MetaReadError)
  })

  it('discovers catalog without touching a client or credential', async () => {
    const { client, calls } = fake()
    const result = await runMetricCommand(['metrics', 'list', '--surface', 'pixel'], client, now)

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({ ok: true, data: { surface: 'pixel' } })
    expect(calls.list).not.toHaveBeenCalled()
    expect(calls.verifyIdentity).not.toHaveBeenCalled()
  })
})

describe('Meta Ads insight selection', () => {
  it.each(['campaign', 'adset', 'ad'])('keeps identifiers and names in default %s reports without modifying explicit fields', level => {
    const defaults = String(buildAdInsightsParams({ level }, now).fields).split(',')

    expect(defaults).toContain(`${level}_id`)
    expect(defaults).toContain(`${level}_name`)
    expect(buildAdInsightsParams({ level, fields: 'spend' }, now).fields).toBe('spend')
  })

  it.each(['campaign', 'adset', 'ad'])('keeps %s rows identifiable in all-field probes without counting identity as metric coverage', async level => {
    const { client, calls } = fake()
    const offset = (getMetricsCatalog() as any).ads.fields.indexOf('spend')

    calls.list.mockResolvedValueOnce({ data: [{ [`${level}_id`]: '123', spend: '5' }], pagination: complete })
      .mockResolvedValueOnce({ data: [{ [`${level}_id`]: '123' }], pagination: complete })
    const args = ['insights', 'all', '--level', level, '--metric-offset', String(offset), '--metric-limit', '1']
    const returned = await runMetricCommand(args, client, now)
    const omitted = await runMetricCommand(args, client, now)

    expect(calls.list.mock.calls[0][1].fields).toBe(`${level}_id,spend`)
    expect(returned.output).toMatchObject({ data: [{ field: 'spend', status: 'available', fieldCoverage: { returnedRows: 1, omittedRows: 0 } }] })
    expect(omitted.output).toMatchObject({ data: [{ field: 'spend', status: 'field_not_returned', fieldCoverage: { returnedRows: 0, omittedRows: 1 } }] })
  })

  it('selects catalog fields, breakdowns, attribution and inclusive Chile calendar dates', () => {
    const params = buildAdInsightsParams({ fields: 'spend,actions,video_p100_watched_actions', days: '1095',
      breakdowns: 'age,gender', 'action-breakdowns': 'action_type',
      'attribution-windows': '1d_click,7d_click', 'action-report-time': 'conversion', 'time-increment': 'monthly' }, now)

    expect(JSON.parse(String(params.time_range))).toEqual({ since: '2023-10-19', until: '2026-10-17' })
    expect(params.fields).toBe('spend,actions,video_p100_watched_actions')
    expect(JSON.parse(String(params.breakdowns))).toEqual(['age', 'gender'])
    expect(JSON.parse(String(params.action_attribution_windows))).toEqual(['1d_click', '7d_click'])
    expect(params.time_increment).toBe('monthly')
  })

  it('accepts explicit valid date pair and bounds calendar errors and simultaneous modes', () => {
    expect(JSON.parse(String(buildAdInsightsParams({ since: '2024-02-29', until: '2024-03-01' }, now).time_range)))
      .toEqual({ since: '2024-02-29', until: '2024-03-01' })
    for (const values of [{ since: '2025-02-29', until: '2025-03-01' }, { since: '2026-10-01' },
      { since: '2026-10-02', until: '2026-10-01' }, { since: '2026-10-01', until: '2026-10-02', days: '2' },
      { days: '1096' }, { days: true }, { 'time-increment': '91' }, { fields: 'all' },
      { fields: 'access_token' }, { fields: 'spend{access_token}' }, { fields: 'spend,spend' },
      { breakdowns: 'unknown' }, { 'attribution-windows': 'arbitrary' }])
      expect(() => buildAdInsightsParams(values, now)).toThrow(MetaReadError)
  })

  it('rejects more than 30 fields and invalid ranges without auth/network', () => {
    const all = getMetricsCatalog() as any

    expect(() => buildAdInsightsParams({ fields: all.ads.fields.slice(0, 31).join(',') }, now)).toThrow(MetaReadError)
    expect(() => buildAdInsightsParams({}, new Date('invalid'))).toThrow(MetaReadError)
  })

  it('makes all-field iteration bounded and reports each field availability separately', async () => {
    const { client, calls } = fake()

    calls.list.mockResolvedValueOnce({ data: [], pagination: complete })
      .mockRejectedValueOnce(new MetaReadError('META_API_ERROR', 5, { httpStatus: 400, metaCode: 100 }))
    const result = await runMetricCommand(['insights', 'all', '--metric-limit', '3', '--days', '7'], client, now)
    const out = result.output as any

    expect(result.exitCode).toBe(6)
    expect(calls.list).toHaveBeenCalledTimes(3)
    expect(calls.list.mock.calls.every(call => !String(call[1].fields).includes(',') && call[2].maxPages === 1)).toBe(true)
    expect(out.pagination).toMatchObject({ metricsAttempted: 3, nextMetricOffset: 3, complete: false, totalMetrics: 200 })
    expect(out.data.map((v: any) => v.status)).toEqual(['no_data', 'unavailable', 'available'])
    expect(out.data[1].error).toEqual({ code: 'META_API_ERROR', httpStatus: 400, metaCode: 100 })
    expect(out.data[0].data).toEqual([])
  })

  it('keeps a per-field data cursor distinct from the catalog offset', async () => {
    const { client, calls } = fake()

    calls.list.mockResolvedValue({ data: [{ spend: '1' }], pagination: { ...complete, complete: false, hasMore: true, nextCursor: 'provider-cursor' } })
    const result = await runMetricCommand(['insights', 'all', '--cursor', '198', '--metric-limit', '2'], client, now)
    const out = result.output as any

    expect(out.pagination.catalogTraversalComplete).toBe(true)
    expect(out.pagination.complete).toBe(false)
    expect(out.pagination.nextMetricOffset).toBeUndefined()
    expect(out.data[0].pagination.nextCursor).toBe('provider-cursor')
    expect(result.exitCode).toBe(6)
  })

  it('finishes the requested tail without inventing unsupported historical values', async () => {
    const { client } = fake()
    const result = await runMetricCommand(['insights', 'all', '--metric-offset', '199'], client, now)

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({ pagination: { metricsAttempted: 1, catalogTraversalComplete: true, complete: true } })
  })


  it('does not call an omitted Ads metric available merely because date rows were returned', async () => {
    const { client, calls } = fake()

    calls.list.mockResolvedValue({ data: [{ date_start: '2026-10-01', date_stop: '2026-10-17' }], pagination: complete })
    const result = await runMetricCommand(['insights', 'all', '--metric-offset', '199'], client, now)
    const out = result.output as any

    expect(result.exitCode).toBe(6)
    expect(out.data[0]).toMatchObject({ status: 'field_not_returned', fieldCoverage: { returnedRows: 0, omittedRows: 1 } })
    expect(out.pagination).toMatchObject({ complete: false, hasMore: false, catalogTraversalComplete: true })
  })

  it('stops all-field iteration on lost authority and preserves its failure exit code', async () => {
    const { client, calls } = fake()

    calls.list.mockRejectedValue(new MetaReadError('META_API_ERROR', 4, { httpStatus: 403, metaCode: 200 }))
    const result = await runMetricCommand(['insights', 'all'], client, now)

    expect(result.exitCode).toBe(4)
    expect(result.output).toMatchObject({ ok: false, error: { httpStatus: 403, metaCode: 200 } })
    expect(calls.list).toHaveBeenCalledTimes(1)
  })
})

describe('Meta social insight metrics', () => {
  it('passes provider-resolved Page names and period without inventing a fixed catalog', async () => {
    const { client, calls } = fake()
    const result = await runMetricCommand(['page', 'insights', '--metrics', 'page_views_total', '--period', 'day', '--since', '2026-10-01', '--until', '2026-10-17'], client, now)

    expect(result.exitCode).toBe(0)
    expect(calls.list).toHaveBeenCalledWith('/' + EFEONCE_META_PROFILE.pageId + '/insights', {
      metric: 'page_views_total', period: 'day', since: '2026-10-01', until: '2026-10-17',
    }, { maxPages: 1, pageSize: 25, credential: 'page' })
  })

  it('requires media ownership before requesting aggregate insights', async () => {
    const { client, calls } = fake()
    const result = await runMetricCommand(['instagram', 'media', 'insights', '--media-id', '777', '--metrics', 'reach,views'], client, now)

    expect(result.exitCode).toBe(0)
    expect(calls.inspectInstagramMedia).toHaveBeenCalledWith('777')
    expect(calls.inspectInstagramMedia.mock.invocationCallOrder[0]).toBeLessThan(calls.list.mock.invocationCallOrder[0])
    expect(calls.list).toHaveBeenCalledWith('/777/insights', { metric: 'reach,views' }, { maxPages: 1, pageSize: 25, credential: 'page' })
  })

  it('stops when media ownership or provider compatibility is denied, never returns fake zero', async () => {
    const { client, calls } = fake()

    calls.inspectInstagramMedia.mockRejectedValue(new MetaReadError('META_INSTAGRAM_MEDIA_OWNER_MISMATCH', 4))
    const denied = await runMetricCommand(['instagram', 'media', 'insights', '--media-id', '777', '--metrics', 'reach'], client, now)

    expect(denied.exitCode).toBe(4)
    expect(calls.list).not.toHaveBeenCalled()
    calls.list.mockRejectedValue(new MetaReadError('META_API_ERROR', 5, { metaCode: 100, httpStatus: 400 }))
    const unsupported = await runMetricCommand(['instagram', 'insights', '--metrics', 'reach', '--period', 'lifetime'], client, now)

    expect(unsupported.exitCode).toBe(5)
    expect(unsupported.output).toMatchObject({ ok: false, error: { metaCode: 100 } })
    expect(unsupported.output).not.toHaveProperty('data')
  })

  it.each([
    ['metrics', 'list', '--surface', '__proto__'], ['insights', 'all', '--metric-limit', '31'],
    ['insights', 'all', '--cursor', 'https://outside.test'], ['insights', 'all', '--metric-offset', '-1'],
    ['insights', 'all', '--cursor', '1', '--metric-offset', '1'],
    ['instagram', 'insights', '--metrics', 'unknown'], ['page', 'insights', '--metrics', 'all'],
    ['page', 'insights', '--metrics', 'reach{access_token}'], ['page', 'insights', '--metrics', 'a/b'],
    ['page', 'insights', '--metrics', 'reach', '--cursor', 'unsafe\ntext'],
    ['instagram', 'media', 'insights', '--media-id', '777/insights', '--metrics', 'reach'],
    ['instagram', 'media', 'insights', '--media-id', '777', '--metrics', 'reach', '--since', '2026-10-01'],
  ])('rejects unsafe or incompatible selections before any request: %j', async (...argv) => {
    const { client, calls } = fake()
    const result = await runMetricCommand(argv, client, now)

    expect(result.exitCode).toBe(2)
    expect(calls.list).not.toHaveBeenCalled()
    expect(calls.inspectInstagramMedia).not.toHaveBeenCalled()
  })

  it('probes all Instagram metrics independently and preserves incompatible metric errors', async () => {
    const { client, calls } = fake()

    calls.list.mockImplementation(async (_path, params) => ({ data: [{ name: String(params.metric), values: [{ value: 7 }] }], pagination: complete } as any))
    calls.list.mockRejectedValueOnce(new MetaReadError('META_API_ERROR', 5, { metaCode: 100, httpStatus: 400 }))
    const result = await runMetricCommand(['instagram', 'insights', '--metrics', 'all', '--metric-limit', '3', '--period', 'day'], client, now)
    const out = result.output as any

    expect(result.exitCode).toBe(6)
    expect(calls.list).toHaveBeenCalledTimes(3)
    expect(calls.list.mock.calls.every(call => !String(call[1].metric).includes(','))).toBe(true)
    expect(out.data.map((v: any) => v.status)).toEqual(['unavailable', 'available', 'available'])
    expect(out.pagination).toMatchObject({ totalMetrics: 27, nextMetricOffset: 3 })
    expect(calls.list.mock.calls[1][2]).toMatchObject({ maxPages: 1, credential: 'page' })
  })

  it('probes the Instagram media catalog tail only after ownership and recognizes named total_value rows', async () => {
    const { client, calls } = fake()

    calls.list.mockImplementation(async (_path, params) => ({ data: [{ name: String(params.metric), total_value: { value: 4 } }], pagination: complete } as any))
    const result = await runMetricCommand(['instagram', 'media', 'insights', '--media-id', '777', '--metrics', 'all', '--metric-offset', '26'], client, now)

    expect(result.exitCode).toBe(0)
    expect(result.output).toMatchObject({ pagination: { totalMetrics: 27, metricsAttempted: 1, complete: true } })
    expect(calls.inspectInstagramMedia).toHaveBeenCalledTimes(1)
    expect(calls.inspectInstagramMedia.mock.invocationCallOrder[0]).toBeLessThan(calls.list.mock.invocationCallOrder[0])
  })

  it('does not confuse an Instagram metric description or a different metric with returned values', async () => {
    const { client, calls } = fake()

    calls.list.mockResolvedValue({ data: [{ name: 'unrequested', values: [{ value: 8 }] }, { name: 'views' }], pagination: complete } as any)
    const result = await runMetricCommand(['instagram', 'insights', '--metrics', 'all', '--metric-offset', '26'], client, now)

    expect(result.exitCode).toBe(6)
    expect(result.output).toMatchObject({ data: [{ status: 'field_not_returned' }] })
  })

  it.each([
    ['instagram', 'insights', '--metrics', 'all', '--metric-limit', '31'],
    ['instagram', 'insights', '--metrics', 'all', '--pages', '2'],
    ['instagram', 'insights', '--metrics', 'all', '--cursor', 'unsafe-data-cursor'],
    ['instagram', 'insights', '--metrics', 'reach', '--metric-limit', '2'],
    ['instagram', 'media', 'insights', '--media-id', '777', '--metrics', 'all', '--metric-offset', '28'],
  ])('rejects invalid all-metric controls before ownership or network: %j', async (...argv) => {
    const { client, calls } = fake()
    const result = await runMetricCommand(argv, client, now)

    expect(result.exitCode).toBe(2)
    expect(calls.list).not.toHaveBeenCalled()
    expect(calls.inspectInstagramMedia).not.toHaveBeenCalled()
  })

  it('redacts unexpected raw exception messages at the metrics boundary', async () => {
    const { client, calls } = fake()

    calls.list.mockRejectedValue(new Error('private token secret-provider-body'))
    const result = await runMetricCommand(['page', 'insights', '--metrics', 'page_views_total'], client, now)

    expect(JSON.stringify(result)).not.toContain('secret-provider-body')
    expect(result.output).toMatchObject({ ok: false, error: { code: 'metric_operation_failed' } })
  })
})
