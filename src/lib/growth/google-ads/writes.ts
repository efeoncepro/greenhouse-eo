import { createHash } from 'node:crypto'

/** Local plan compiler only. No credentials, HTTP, retries, approval persistence or provider execution. */
const CUSTOMER_ID = '6862539491' as const
const VERSION = 'google-ads-write.v1' as const
const PREFIX = `customers/${CUSTOMER_ID}/`
const INT64_MAX = 9223372036854775807n
const CATEGORIES = ['SUBMIT_LEAD_FORM', 'BOOK_APPOINTMENT', 'QUALIFIED_LEAD', 'CONVERTED_LEAD', 'PURCHASE'] as const

type JsonObject = Record<string, unknown>
type WriteSummary = { operation: string; resourceName?: string; fields: JsonObject }
export type GoogleAdsWritePlan = {
  contractVersion: typeof VERSION
  customerId: typeof CUSTOMER_ID
  endpoint: string
  body: { operations: unknown[]; partialFailure: false; validateOnly?: boolean }
  digest: string
  summary: WriteSummary
}

export class GoogleAdsWriteValidationError extends Error {
  constructor() {
    // Never echo rejected values: inputs can accidentally contain credentials or personal data.
    super('Invalid Google Ads write plan input')
    this.name = 'GoogleAdsWriteValidationError'
  }
}

function invalid(): never { throw new GoogleAdsWriteValidationError() }

function object(value: unknown): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return invalid()
  if (![Object.prototype, null].includes(Object.getPrototypeOf(value))) return invalid()
  // Reject accessors/symbols rather than executing arbitrary property getters during compilation.
  if (Object.getOwnPropertySymbols(value).length) return invalid()

  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))) {
    if (!('value' in descriptor) || !descriptor.enumerable) return invalid()
  }


return value as JsonObject
}

function closed(value: unknown, allowed: readonly string[], required: readonly string[] = []): JsonObject {
  const result = object(value)

  if (Object.keys(result).some(key => !allowed.includes(key))) return invalid()
  if (required.some(key => !Object.hasOwn(result, key) || result[key] === undefined)) return invalid()
  if (Object.values(result).some(item => item === undefined)) return invalid()

return result
}

function text(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 128 || value !== value.trim()) return invalid()
  if (/[\u0000-\u001f\u007f]/.test(value) || /(?:https?:\/\/|www\.|bearer\s|@)/i.test(value)) return invalid()
  if (/(?:GOCSPX-|ya29\.|1\/\/|AIza[A-Za-z0-9_-]|sk-[A-Za-z0-9_-])/i.test(value)) return invalid()

return value
}

function choice(value: unknown, choices: readonly string[]): string {
  if (typeof value !== 'string' || !choices.includes(value)) return invalid()

return value
}

function bool(value: unknown): boolean {
  if (typeof value !== 'boolean') return invalid()

return value
}

function micros(value: unknown): string {
  if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > INT64_MAX) return invalid()

return value
}

function amount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) return invalid()

return Object.is(value, -0) ? 0 : value
}

function days(value: unknown, max: number): string {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) return invalid()

return String(value)
}

function resource(value: unknown, collection: string): string {
  const expected = new RegExp(`^${PREFIX}${collection}/[1-9]\\d{0,18}$`)

  if (typeof value !== 'string' || !expected.test(value)) return invalid()
  const id = value.slice(value.lastIndexOf('/') + 1)

  if (BigInt(id) > INT64_MAX) return invalid()

return value
}

function goalResource(value: unknown, campaign: boolean): string {
  if (typeof value !== 'string') return invalid()
  const collection = campaign ? 'campaignConversionGoals/' : 'customerConversionGoals/'

  if (!value.startsWith(PREFIX + collection)) return invalid()
  const parts = value.slice((PREFIX + collection).length).split('~')

  if (parts.length !== (campaign ? 3 : 2)) return invalid()
  if (campaign) resource(`${PREFIX}campaigns/${parts.shift()}`, 'campaigns')
  choice(parts[0], CATEGORIES)
  choice(parts[1], ['WEBSITE'])

return value
}

/** Canonical JSON binds the reviewed payload, endpoint, account and summary to one SHA-256. */
function canonical(value: unknown, ancestors = new Set<object>()): string {
  if (value !== null && typeof value === 'object') {
    if (ancestors.has(value)) return invalid()
    ancestors.add(value)
    let result: string

    if (Array.isArray(value)) {
      if (Object.getOwnPropertySymbols(value).length || Object.keys(value).length !== value.length) return invalid()

      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (key !== 'length' && (!('value' in descriptor) || !descriptor.enumerable)) return invalid()
      }

      result = `[${value.map(item => canonical(item, ancestors)).join(',')}]`
    } else {
      const record = object(value)

      result = `{${Object.keys(record).sort().map(key => `${JSON.stringify(key)}:${canonical(record[key], ancestors)}`).join(',')}}`
    }

    ancestors.delete(value)

return result
  }

  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value)

return invalid()
}

function copyFields(input: JsonObject, validators: Record<string, (value: unknown) => unknown>): JsonObject {
  const result: JsonObject = {}

  for (const key of Object.keys(input).sort()) result[key] = validators[key](input[key])

return result
}

const paused = (value: unknown) => choice(value, ['PAUSED'])

const valueSettings = (value: unknown): JsonObject => {
  const input = closed(value, ['defaultValue', 'defaultCurrencyCode', 'alwaysUseDefaultValue'], ['defaultValue', 'defaultCurrencyCode', 'alwaysUseDefaultValue'])


return {
    defaultValue: amount(input.defaultValue),
    defaultCurrencyCode: choice(input.defaultCurrencyCode, ['CLP']),
    alwaysUseDefaultValue: bool(input.alwaysUseDefaultValue)
  }
}

const MASKS: Record<string, string> = {
  name: 'name', status: 'status', campaignBudget: 'campaign_budget', amountMicros: 'amount_micros',
  cpcBidMicros: 'cpc_bid_micros', primaryForGoal: 'primary_for_goal', countingType: 'counting_type',
  category: 'category', clickThroughLookbackWindowDays: 'click_through_lookback_window_days',
  viewThroughLookbackWindowDays: 'view_through_lookback_window_days', biddable: 'biddable'
}

function updateMask(fields: JsonObject): string {
  const paths = Object.keys(fields).flatMap(key => key === 'valueSettings'
    ? ['value_settings.default_value', 'value_settings.default_currency_code', 'value_settings.always_use_default_value']
    : MASKS[key] ? [MASKS[key]] : invalid())


return paths.sort().join(',')
}

/**
 * Input: { operation, resourceName? (updates only), fields: { allowed camelCase fields } }.
 * One operation per plan. Campaign/ad group creation REQUIRES explicit PAUSED; enabling/removal is
 * deliberately unsupported. Conversion actions may explicitly change bidding eligibility; review
 * account/campaign/custom goals before approving. Goal resource suffixes are Google's enum composite IDs.
 */
export function buildWritePlan(value: unknown): GoogleAdsWritePlan {
  const input = closed(value, ['operation', 'resourceName', 'fields'], ['operation', 'fields'])

  const operation = choice(input.operation, [
    'campaign.create', 'campaign.update', 'campaignBudget.create', 'campaignBudget.update',
    'adGroup.create', 'adGroup.update', 'conversionAction.create', 'conversionAction.update',
    'accountGoal.update', 'campaignGoal.update'
  ])

  const creating = operation.endsWith('.create')

  if (creating ? Object.hasOwn(input, 'resourceName') : !Object.hasOwn(input, 'resourceName')) return invalid()
  let endpoint: string
  let fields: JsonObject
  let resourceName: string | undefined

  if (operation.startsWith('campaignBudget.')) {
    endpoint = 'campaignBudgets:mutate'
    const rules = { name: text, amountMicros: micros }
    const raw = closed(input.fields, Object.keys(rules), creating ? ['name', 'amountMicros'] : [])

    fields = copyFields(raw, rules)
    if (creating) fields = { ...fields, deliveryMethod: 'STANDARD', explicitlyShared: false }
    else resourceName = resource(input.resourceName, 'campaignBudgets')
  } else if (operation.startsWith('campaign.')) {
    endpoint = 'campaigns:mutate'

    const rules: Record<string, (item: unknown) => unknown> = creating ? {
      name: text, status: paused, campaignBudget: (item: unknown) => resource(item, 'campaignBudgets'),
      advertisingChannelType: (item: unknown) => choice(item, ['SEARCH']),
      containsEuPoliticalAdvertising: (item: unknown) => choice(item, ['DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING', 'CONTAINS_EU_POLITICAL_ADVERTISING']),
      manualCpc: (item: unknown) => closed(item, [])
    } : { name: text, status: paused, campaignBudget: (item: unknown) => resource(item, 'campaignBudgets') }

    const required = creating ? ['name', 'status', 'campaignBudget', 'advertisingChannelType', 'containsEuPoliticalAdvertising', 'manualCpc'] : []

    fields = copyFields(closed(input.fields, Object.keys(rules), required), rules)
    if (creating) fields.networkSettings = { targetGoogleSearch: true, targetSearchNetwork: false, targetContentNetwork: false, targetPartnerSearchNetwork: false }
    else resourceName = resource(input.resourceName, 'campaigns')
  } else if (operation.startsWith('adGroup.')) {
    endpoint = 'adGroups:mutate'

    const rules: Record<string, (item: unknown) => unknown> = creating ? {
      name: text, status: paused, campaign: (item: unknown) => resource(item, 'campaigns'),
      type: (item: unknown) => choice(item, ['SEARCH_STANDARD']), cpcBidMicros: micros
    } : { name: text, status: paused, cpcBidMicros: micros }

    fields = copyFields(closed(input.fields, Object.keys(rules), creating ? Object.keys(rules) : []), rules)
    if (!creating) resourceName = resource(input.resourceName, 'adGroups')
  } else if (operation.startsWith('conversionAction.')) {
    endpoint = 'conversionActions:mutate'

    const rules: Record<string, (item: unknown) => unknown> = {
      name: text, category: item => choice(item, CATEGORIES), primaryForGoal: bool,
      countingType: item => choice(item, ['ONE_PER_CLICK', 'MANY_PER_CLICK']), valueSettings,
      clickThroughLookbackWindowDays: item => days(item, 90), viewThroughLookbackWindowDays: item => days(item, 30)
    }

    if (creating) rules.type = item => choice(item, ['WEBPAGE', 'UPLOAD_CLICKS'])
    fields = copyFields(closed(input.fields, Object.keys(rules), creating ? ['name', 'type', 'category', 'primaryForGoal', 'countingType', 'valueSettings'] : []), rules)
    if (!creating) resourceName = resource(input.resourceName, 'conversionActions')
  } else {
    const campaign = operation === 'campaignGoal.update'

    endpoint = campaign ? 'campaignConversionGoals:mutate' : 'customerConversionGoals:mutate'
    fields = copyFields(closed(input.fields, ['biddable'], ['biddable']), { biddable: bool })
    resourceName = goalResource(input.resourceName, campaign)
  }

  if (!Object.keys(fields).length) return invalid()
  const wireOperation = creating ? { create: fields } : { update: { resourceName, ...fields }, updateMask: updateMask(fields) }
  // Reconstruct summary from compiled fields, never retaining caller object references.
  const summary: WriteSummary = { operation, ...(resourceName ? { resourceName } : {}), fields: JSON.parse(JSON.stringify(input.fields)) }
  // Normalize input object key order for stable digests. Derived defaults are bound in body.
  const core = { contractVersion: VERSION, customerId: CUSTOMER_ID, endpoint, body: { operations: [wireOperation], partialFailure: false as const }, summary }
  const digest = createHash('sha256').update(canonical(core)).digest('hex')


return JSON.parse(canonical({ ...core, digest })) as GoogleAdsWritePlan
}

/** Recompile before validate/execute. A hash alone cannot attest an arbitrary caller-supplied body. */
export function verifyWritePlan(value: unknown): GoogleAdsWritePlan {
  const plan = closed(value, ['contractVersion', 'customerId', 'endpoint', 'body', 'digest', 'summary'], ['contractVersion', 'customerId', 'endpoint', 'body', 'digest', 'summary'])
  const rebuilt = buildWritePlan(plan.summary)

  if (canonical(rebuilt) !== canonical(plan)) return invalid()

return rebuilt
}

/** Google's goal mutate requests have no partialFailure field; keep plan semantics but omit it on wire. */
export function getWriteRequestBody(plan: unknown, validateOnly: boolean): {
  operations: unknown[]
  partialFailure?: false
  validateOnly: boolean
} {
  const verified = verifyWritePlan(plan)
  const validation = bool(validateOnly)
  const goal = verified.endpoint === 'customerConversionGoals:mutate' || verified.endpoint === 'campaignConversionGoals:mutate'

  return { operations: verified.body.operations, ...(!goal ? { partialFailure: false as const } : {}), validateOnly: validation }
}
