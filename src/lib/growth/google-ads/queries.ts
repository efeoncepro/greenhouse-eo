import { createHash } from 'node:crypto'

import { GoogleAdsError, GOOGLE_ADS_PROFILE, type ReadCommand, type ReadOptions } from './contracts'

const identity = ['customer.id', 'customer.descriptive_name', 'customer.manager', 'customer.test_account', 'customer.currency_code', 'customer.time_zone', 'customer.auto_tagging_enabled']
const tracking = ['conversion_tracking_id', 'cross_account_conversion_tracking_id', 'google_ads_conversion_customer', 'conversion_tracking_status', 'accepted_customer_data_terms', 'effective_enablement_setting'].map(x => `customer.conversion_tracking_setting.${x}`)
const campaigns = ['campaign.id', 'campaign.name', 'campaign.status', 'campaign.advertising_channel_type', 'campaign.campaign_budget']
const groups = ['campaign.id', 'ad_group.id', 'ad_group.name', 'ad_group.status', 'ad_group.type']
const ads = ['campaign.id', 'ad_group.id', 'ad_group_ad.ad.id', 'ad_group_ad.ad.type', 'ad_group_ad.status']
const metrics = ['impressions', 'clicks', 'cost_micros', 'conversions', 'conversions_value', 'all_conversions', 'all_conversions_value'].map(x => `metrics.${x}`)

export function integerOption(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined) return fallback
  const number = Number(value)

  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(number) || number < min || number > max) throw new GoogleAdsError('INVALID_INTEGER')

  return number
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value + 'T00:00:00Z')) && new Date(value + 'T00:00:00Z').toISOString().slice(0, 10) === value
}

export function reportRange(options: ReadOptions, now = new Date()) {
  if (options.since !== undefined && !validDate(options.since) || options.until !== undefined && !validDate(options.until)) throw new GoogleAdsError('INVALID_DATE_RANGE')
  if ((options.since === undefined) !== (options.until === undefined) || (options.since && options.days !== undefined)) throw new GoogleAdsError('INVALID_DATE_RANGE')
  let { since, until } = options

  if (!since || !until) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: GOOGLE_ADS_PROFILE.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
    const datePart = (type: string) => parts.find(x => x.type === type)!.value
    const today = Date.parse(`${datePart('year')}-${datePart('month')}-${datePart('day')}T00:00:00Z`)
    const days = integerOption(options.days, 7, 1, 90)

    until = new Date(today - 86400000).toISOString().slice(0, 10)
    since = new Date(today - days * 86400000).toISOString().slice(0, 10)
  }

  if (!validDate(since) || !validDate(until)) throw new GoogleAdsError('INVALID_DATE_RANGE')
  const duration = (Date.parse(until) - Date.parse(since)) / 86400000 + 1

  if (duration < 1 || duration > 90) throw new GoogleAdsError('DATE_RANGE_EXCEEDS_90_DAYS')

  return { since, until, inclusive: true, timeZone: GOOGLE_ADS_PROFILE.timeZone }
}

export function buildReadQuery(command: ReadCommand, options: ReadOptions = {}, now = new Date()) {
  let resource: string
  let fields: string[]
  let range: ReturnType<typeof reportRange> | undefined
  let suffix = ''

  switch (command) {
    case 'account get': resource = 'customer'; fields = [...identity, ...tracking]; break
    case 'budgets list': resource = 'campaign_budget'; fields = ['id', 'name', 'status', 'amount_micros', 'delivery_method', 'explicitly_shared'].map(x => `campaign_budget.${x}`); break
    case 'campaigns list': resource = 'campaign'; fields = campaigns; break
    case 'adgroups list': resource = 'ad_group'; fields = groups; break
    case 'ads list': resource = 'ad_group_ad'; fields = ads; break
    case 'conversions list':
      resource = 'conversion_action'
      fields = ['id', 'name', 'status', 'type', 'category', 'primary_for_goal', 'counting_type', 'click_through_lookback_window_days', 'view_through_lookback_window_days', 'value_settings.default_value', 'value_settings.default_currency_code'].map(x => `conversion_action.${x}`)
      break
    case 'goals account': resource = 'customer_conversion_goal'; fields = ['category', 'origin', 'biddable'].map(x => `${resource}.${x}`); break
    case 'goals campaigns': resource = 'campaign_conversion_goal'; fields = ['campaign', 'category', 'origin', 'biddable'].map(x => `${resource}.${x}`); break
    case 'goals config': resource = 'conversion_goal_campaign_config'; fields = ['campaign', 'goal_config_level', 'custom_conversion_goal'].map(x => `${resource}.${x}`); break
    case 'goals custom': resource = 'custom_conversion_goal'; fields = ['id', 'name', 'status', 'conversion_actions'].map(x => `${resource}.${x}`); break

    case 'report get': {
      const level = options.level ?? 'campaign'
      const dimensions = { account: ['customer.id'], campaign: ['campaign.id', 'campaign.name'], adgroup: ['campaign.id', 'ad_group.id', 'ad_group.name'], ad: ['campaign.id', 'ad_group.id', 'ad_group_ad.ad.id'] }
      const resources = { account: 'customer', campaign: 'campaign', adgroup: 'ad_group', ad: 'ad_group_ad' }

      if (!Object.hasOwn(dimensions, level)) throw new GoogleAdsError('INVALID_REPORT_LEVEL')
      resource = resources[level]
      fields = [...dimensions[level], ...metrics, ...(options.daily ? ['segments.date'] : [])]
      range = reportRange(options, now)
      suffix = ` WHERE segments.date BETWEEN '${range.since}' AND '${range.until}'`
      break
    }

    default: throw new GoogleAdsError('UNKNOWN_READ_COMMAND')
  }

  const query = `SELECT ${fields.join(', ')} FROM ${resource}${suffix}`
  const hash = createHash('sha256').update(JSON.stringify([GOOGLE_ADS_PROFILE, query])).digest('hex')

  return { query, fields, resource, hash, range }
}

/** Only selected GAQL fields escape the provider boundary; proto3 absent fields stay absent. */
export function projectRow(value: unknown, fields: string[], redact: (s: string) => string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
  const clean = (v: unknown): unknown => typeof v === 'string' ? redact(v) : Array.isArray(v) ? v.map(clean) : typeof v === 'number' || typeof v === 'boolean' || v === null ? v : undefined

  for (const field of fields) {
    const parts = field.split('.').map(camel)
    let source: unknown = value

    for (const part of parts) source = source && typeof source === 'object' ? (source as Record<string, unknown>)[part] : undefined
    if (source === undefined) continue
    let target = result

    for (const part of parts.slice(0, -1)) {
      target[part] ??= {}
      target = target[part] as Record<string, unknown>
    }

    target[parts.at(-1)!] = clean(source)
  }

  return result
}
