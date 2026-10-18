/** SDK-derived selectable metrics; catalog membership never promises provider availability. */
import { parseArgs } from 'node:util'

import type { MetaReadClient} from './client';
import { EFEONCE_META_PROFILE, MetaReadError } from './client'
import catalog from './metrics-catalog.json'

type Values = Record<string, string | boolean | undefined>
type Params = Record<string, string | number>
type Surface = 'ads' | 'pixel' | 'dataset' | 'page' | 'instagram' | 'instagram-media'
const surfaces: Surface[] = ['ads', 'pixel', 'dataset', 'page', 'instagram', 'instagram-media']

export const PIXEL_AGGREGATIONS: string[] = [...catalog.pixel.aggregations]
const DEFAULT_AD_FIELDS = 'account_id,account_currency,impressions,reach,clicks,spend,actions,action_values,date_start,date_stop'

function integer(value: unknown, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new MetaReadError('invalid_integer')
  const n = Number(value)

  if (!Number.isSafeInteger(n) || n < min || n > max) throw new MetaReadError('integer_out_of_range')

  return n
}

function choice(value: unknown, fallback: string, allowed: readonly string[]): string {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !allowed.includes(value)) throw new MetaReadError('invalid_choice')

  return value
}

function csv(value: unknown, allowed?: readonly string[], max = 30): string[] {
  if (typeof value !== 'string' || !value) throw new MetaReadError('metric_names_required')
  const names = value.split(',').map(v => v.trim())

  if (names.length > max || names.some(v => !/^[a-z0-9][a-z0-9_]{0,119}$/.test(v)) ||
    new Set(names).size !== names.length || (allowed && names.some(v => !allowed.includes(v))))
    throw new MetaReadError('metric_selection_invalid')

  return names
}

function calendar(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new MetaReadError('invalid_calendar_date')
  const date = new Date(value + 'T12:00:00Z')

  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
    throw new MetaReadError('invalid_calendar_date')

  return value
}

function dates(values: Values, now: Date, required = true): { since: string; until: string } | undefined {
  if (!Number.isFinite(now.getTime())) throw new MetaReadError('invalid_now')

  if (values.since !== undefined || values.until !== undefined) {
    if (values.since === undefined || values.until === undefined || values.days !== undefined)
      throw new MetaReadError('date_pair_required_without_days')
    const since = calendar(values.since), until = calendar(values.until)
    const span = (Date.parse(until + 'T12:00:00Z') - Date.parse(since + 'T12:00:00Z')) / 86400000 + 1

    if (span < 1 || span > 1095) throw new MetaReadError('date_range_out_of_bounds')

    return { since, until }
  }

  if (!required && values.days === undefined) return undefined
  const days = integer(values.days, 30, 1, 1095)
  const until = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const since = new Date(Date.parse(until + 'T12:00:00Z') - (days - 1) * 86400000).toISOString().slice(0, 10)

  return { since, until }
}

export function getMetricsCatalog(surface?: string) {
  if (surface === undefined || surface === 'all') return catalog
  if (!surfaces.includes(surface as Surface)) throw new MetaReadError('invalid_metrics_surface')

  return { catalogVersion: catalog.catalogVersion, apiVersion: catalog.apiVersion,
    provenance: catalog.provenance, availability: catalog.availability, surface,
    data: catalog[surface as Surface] }
}

export function buildAdInsightsParams(values: Values, now: Date): Params {
  const level = choice(values.level, 'account', catalog.ads.levels)
  const fields = csv(values.fields ?? DEFAULT_AD_FIELDS + (level === 'account' ? '' : `,${level}_id,${level}_name`), catalog.ads.fields)
  const params: Params = { level, fields: fields.join(','), time_range: JSON.stringify(dates(values, now)) }

  const selections: Array<[string, string, readonly string[]]> = [
    ['breakdowns', 'breakdowns', catalog.ads.breakdowns],
    ['action-breakdowns', 'action_breakdowns', catalog.ads.actionBreakdowns],
    ['attribution-windows', 'action_attribution_windows', catalog.ads.attributionWindows],
  ]

  for (const [flag, param, allowed] of selections) {
    if (values[flag] !== undefined) params[param] = JSON.stringify(csv(values[flag], allowed))
  }

  if (values['action-report-time'] !== undefined)
    params.action_report_time = choice(values['action-report-time'], 'impression', catalog.ads.actionReportTimes)
  const increment = values['time-increment']

  if (increment !== undefined) params.time_increment = typeof increment === 'string' && ['all_days', 'monthly'].includes(increment)
    ? increment : integer(increment, 1, 1, 90)

  return params
}

const options = {
  surface: { type: 'string' }, days: { type: 'string' }, since: { type: 'string' }, until: { type: 'string' },
  level: { type: 'string' }, fields: { type: 'string' }, breakdowns: { type: 'string' },
  'action-breakdowns': { type: 'string' }, 'attribution-windows': { type: 'string' },
  'action-report-time': { type: 'string' }, 'time-increment': { type: 'string' },
  'metric-limit': { type: 'string' }, 'metric-offset': { type: 'string' },
  metrics: { type: 'string' }, period: { type: 'string' }, 'media-id': { type: 'string' },
  'metric-type': { type: 'string' }, timeframe: { type: 'string' }, breakdown: { type: 'string' },
  pages: { type: 'string' }, limit: { type: 'string' }, cursor: { type: 'string' },
} as const

const adsFlags = ['days', 'since', 'until', 'level', 'breakdowns', 'action-breakdowns', 'attribution-windows', 'action-report-time', 'time-increment']
const socialFlags = ['metrics', 'period', 'pages', 'limit', 'cursor']

const flags: Record<string, string[]> = {
  'metrics list': ['surface'],
  'insights all': [...adsFlags, 'metric-limit', 'metric-offset', 'cursor', 'limit'],
  'page insights': [...socialFlags, 'since', 'until'],
  'instagram insights': [...socialFlags, 'since', 'until', 'metric-type', 'timeframe', 'breakdown', 'metric-limit', 'metric-offset'],
  'instagram media insights': [...socialFlags, 'media-id', 'breakdown', 'metric-limit', 'metric-offset'],
}

function safeError(error: unknown) {
  const safe = error instanceof MetaReadError ? error : new MetaReadError('metric_operation_failed', 5)

  return { code: safe.code, ...(safe.httpStatus !== undefined ? { httpStatus: safe.httpStatus } : {}),
    ...(safe.metaCode !== undefined ? { metaCode: safe.metaCode } : {}),
    ...(safe.metaSubcode !== undefined ? { metaSubcode: safe.metaSubcode } : {}) }
}

function listOptions(values: Values) {
  const cursor = values.cursor

  if (cursor !== undefined && (typeof cursor !== 'string' || !cursor || cursor.length > 4096 || /[\s\x00-\x1f]/.test(cursor)))
    throw new MetaReadError('invalid_cursor')

  return { maxPages: integer(values.pages, 1, 1, 10), pageSize: integer(values.limit, 25, 1, 100),
    ...(typeof cursor === 'string' ? { cursor } : {}), credential: 'page' as const }
}

/** Individual probes preserve errors, field omissions and cursor scopes without claiming zeros. */
async function fieldBatch(command: string, client: MetaReadClient, values: Values,
  input: { path: string; params: Params; names: readonly string[]; parameter: 'fields' | 'metric'; credential?: 'page'; surface: string }) {
  if (values.cursor !== undefined && values['metric-offset'] !== undefined) throw new MetaReadError('ambiguous_metric_offset')
  if (values.pages !== undefined) throw new MetaReadError('metric_batch_uses_one_page_per_field')
  const offset = integer(values['metric-offset'] ?? values.cursor, 0, 0, input.names.length)
  const metricLimit = integer(values['metric-limit'], 10, 1, 30)
  const pageSize = integer(values.limit, 25, 1, 100)
  const names = input.names.slice(offset, offset + metricLimit)
  const data: Array<Record<string, unknown>> = []
  let stoppedForAuthority = false

  for (const field of names) {
    try {
      const identityField = input.surface === 'ads' && input.params.level !== 'account' ? `${input.params.level}_id` : undefined
      const selection = identityField ? [...new Set([identityField, field])].join(',') : field

      const result = await client.list(input.path, { ...input.params, [input.parameter]: selection }, {
        maxPages: 1, pageSize, ...(input.credential ? { credential: input.credential } : {}) })

      const returnedRows = result.data.filter(row => row !== null && typeof row === 'object' &&
        (input.parameter === 'fields' ? Object.hasOwn(row, field) :
          (row as Record<string, unknown>).name === field && (Object.hasOwn(row, 'values') || Object.hasOwn(row, 'total_value')))).length

      const omittedRows = result.data.length - returnedRows

      const status = !result.pagination.complete ? 'partial' : result.data.length === 0 ? 'no_data' :
        returnedRows === 0 ? 'field_not_returned' : omittedRows ? 'partially_returned' : 'available'

      data.push({ field, status, data: result.data, fieldCoverage: { returnedRows, omittedRows }, pagination: result.pagination })
    } catch (error) {
      const denied = error instanceof MetaReadError && [3, 4].includes(error.exitCode)

      if (denied && data.length === 0) throw error
      data.push({ field, status: denied ? 'denied' : 'unavailable', error: safeError(error) })
      if (denied) { stoppedForAuthority = true; break }
    }
  }

  const nextOffset = offset + data.length
  const catalogHasMore = nextOffset < input.names.length
  const complete = !catalogHasMore && data.every(v => ['available', 'no_data'].includes(String(v.status)))

  return { exitCode: complete ? 0 : 6, output: { ok: true, command, surface: input.surface, mode: 'all', data,
    query: input.params,
    pagination: { complete, hasMore: catalogHasMore || data.some(v => v.status === 'partial'),
      totalMetrics: input.names.length, metricOffset: offset, metricsAttempted: data.length,
      catalogTraversalComplete: !catalogHasMore,
      ...(catalogHasMore && !stoppedForAuthority ? { nextMetricOffset: nextOffset } : {}),
      ...(stoppedForAuthority ? { error: { code: 'metric_batch_authority_lost' } } : {}) },
    notes: ['Each field is requested independently; SDK catalog membership does not guarantee provider support or compatible periods/breakdowns.',
      'One response page per field; per-field data cursors differ from nextMetricOffset. Continue with a single-field query and its same parameters.',
      'Rows without the requested field are field_not_returned/partially_returned, never evidence of availability or a numeric zero.',
      'Provider failures and no-data responses remain distinct; never sum overlapping pages from a restart.'] } }
}

/** Parent CLI adds the common version/profile/observedAt envelope. No credential resolution here. */
export async function runMetricCommand(argv: string[], client: MetaReadClient, now: Date) {
  let command = ''

  try {
    let parsed: ReturnType<typeof parseArgs>

    try { parsed = parseArgs({ args: argv, allowPositionals: true, strict: true, options }) }
    catch { throw new MetaReadError('invalid_arguments') }

    command = parsed.positionals.join(' ')
    if (!Object.hasOwn(flags, command)) throw new MetaReadError('unknown_metric_command')
    const values = parsed.values as Values

    if (Object.keys(values).some(v => !flags[command].includes(v))) throw new MetaReadError('option_not_supported_for_command')
    if (command === 'metrics list') return { exitCode: 0, output: { ok: true, command, data: getMetricsCatalog(typeof values.surface === 'string' ? values.surface : undefined) } }

    if (command === 'insights all') {
      const params = buildAdInsightsParams(values, now)

      delete params.fields

      return await fieldBatch(command, client, values, { path: `/act_${EFEONCE_META_PROFILE.adAccountId}/insights`,
        params, names: catalog.ads.fields, parameter: 'fields', surface: 'ads' })
    }

    const surface: 'page' | 'instagram' | 'instagram-media' = command === 'page insights' ? 'page' : command === 'instagram insights' ? 'instagram' : 'instagram-media'
    const spec = catalog[surface]

    const metricNames = values.metrics === 'all' && surface !== 'page' ? [...catalog.instagram.metrics] : csv(values.metrics,
      surface === 'page' ? undefined : catalog.instagram.metrics)

    if (surface === 'page' && metricNames.some(v => v === 'all' || !/^[a-z][a-z0-9_]{0,119}$/.test(v)))
      throw new MetaReadError('page_metric_names_provider_resolved')
    const params: Params = { metric: metricNames.join(',') }

    if (values.period !== undefined) params.period = choice(values.period, 'day', spec.periods)

    if (surface !== 'instagram-media') {
      const range = dates(values, now, false)

      if (range) { params.since = range.since; params.until = range.until }
    }

    if (values.breakdown !== undefined) params.breakdown = JSON.stringify(csv(values.breakdown, catalog.instagram.breakdowns))
    if (values['metric-type'] !== undefined) params.metric_type = choice(values['metric-type'], 'total_value', catalog.instagram.metricTypes)
    if (values.timeframe !== undefined) params.timeframe = choice(values.timeframe, 'last_30_days', catalog.instagram.timeframes)
    const all = values.metrics === 'all' && surface !== 'page'

    if (!all && (values['metric-limit'] !== undefined || values['metric-offset'] !== undefined))
      throw new MetaReadError('metric_batch_options_require_all')

    // Validate metric-batch options before media ownership lookups.
    if (all) {
      if (values.pages !== undefined) throw new MetaReadError('metric_batch_uses_one_page_per_field')
      if (values.cursor !== undefined && values['metric-offset'] !== undefined) throw new MetaReadError('ambiguous_metric_offset')
      integer(values['metric-offset'] ?? values.cursor, 0, 0, catalog.instagram.metrics.length)
      integer(values['metric-limit'], 10, 1, 30)
    }

    const paging = listOptions(all ? { ...values, cursor: undefined } : values)
    let root = surface === 'page' ? EFEONCE_META_PROFILE.pageId : EFEONCE_META_PROFILE.instagramId

    if (surface === 'instagram-media') {
      if (typeof values['media-id'] !== 'string' || !/^\d{1,40}$/.test(values['media-id'])) throw new MetaReadError('instagram_media_id_required')
      root = values['media-id']
      await client.inspectInstagramMedia(root)
    }

    if (all) {
      delete params.metric

      return await fieldBatch(command, client, values, { path: `/${root}/insights`, params,
        names: catalog.instagram.metrics, parameter: 'metric', credential: 'page', surface })
    }

    const result = await client.list(`/${root}/insights`, params, paging)

    return { exitCode: result.pagination.complete ? 0 : 6, output: { ok: true, command, surface,
      data: result.data, pagination: result.pagination, query: params,
      notes: ['Only aggregate insights; no raw contacts, event payloads or private messages.',
        'Metric support and compatible periods/breakdowns are resolved by the provider. Missing is unavailable, never zero.'] } }
  } catch (error) {
    return { exitCode: error instanceof MetaReadError ? error.exitCode : 5,
      output: { ok: false, command, error: safeError(error) } }
  }
}
