import { describe, expect, it } from 'vitest'

import { buildWritePlan, getWriteRequestBody, GoogleAdsWriteValidationError, verifyWritePlan } from './writes'

const prefix = 'customers/6862539491/'
const valueSettings = { defaultValue: 1000, defaultCurrencyCode: 'CLP', alwaysUseDefaultValue: true }

const campaign = {
  operation: 'campaign.create', fields: {
    name: 'Search Efeonce', status: 'PAUSED', campaignBudget: `${prefix}campaignBudgets/12`,
    advertisingChannelType: 'SEARCH', containsEuPoliticalAdvertising: 'DOES_NOT_CONTAIN_EU_POLITICAL_ADVERTISING', manualCpc: {}
  }
}

describe('Google Ads closed write plan compiler', () => {
  it('compiles Search campaigns paused with explicit declaration, budget and one operation', () => {
    const plan = buildWritePlan(campaign)

    expect(plan).toMatchObject({ contractVersion: 'google-ads-write.v1', customerId: '6862539491', endpoint: 'campaigns:mutate', body: { partialFailure: false } })
    expect(plan.body.operations).toHaveLength(1)
    expect(plan.body.operations[0]).toMatchObject({ create: { status: 'PAUSED', manualCpc: {}, networkSettings: { targetContentNetwork: false, targetSearchNetwork: false } } })
    expect(plan.digest).toMatch(/^[a-f0-9]{64}$/)
    expect(verifyWritePlan(plan)).toEqual(plan)
  })

  it.each([
    ['campaignBudget.create', { name: 'Daily CLP', amountMicros: '100000000' }, 'campaignBudgets:mutate'],
    ['adGroup.create', { name: 'HubSpot', campaign: `${prefix}campaigns/1`, status: 'PAUSED', type: 'SEARCH_STANDARD', cpcBidMicros: '1000000' }, 'adGroups:mutate'],
    ['conversionAction.create', { name: 'Solicitud comercial', type: 'WEBPAGE', category: 'SUBMIT_LEAD_FORM', primaryForGoal: false, countingType: 'ONE_PER_CLICK', valueSettings }, 'conversionActions:mutate']
  ])('compiles supported create %s', (operation, fields, endpoint) => {
    const plan = buildWritePlan({ operation, fields })

    expect(plan.endpoint).toBe(endpoint)
    expect(verifyWritePlan(plan)).toEqual(plan)
  })

  it.each([
    ['campaign.update', 'campaigns/1', { name: 'Renamed', status: 'PAUSED' }, 'name,status'],
    ['campaign.update', 'campaigns/1', { campaignBudget: `${prefix}campaignBudgets/2` }, 'campaign_budget'],
    ['campaignBudget.update', 'campaignBudgets/1', { amountMicros: '12345678901234567' }, 'amount_micros'],
    ['adGroup.update', 'adGroups/1', { cpcBidMicros: '42' }, 'cpc_bid_micros'],
    ['conversionAction.update', 'conversionActions/1', { primaryForGoal: true, valueSettings }, 'primary_for_goal,value_settings.always_use_default_value,value_settings.default_currency_code,value_settings.default_value'],
    ['accountGoal.update', 'customerConversionGoals/SUBMIT_LEAD_FORM~WEBSITE', { biddable: false }, 'biddable'],
    ['campaignGoal.update', 'campaignConversionGoals/12~QUALIFIED_LEAD~WEBSITE', { biddable: true }, 'biddable']
  ])('generates exact mask for %s', (operation, path, fields, updateMask) => {
    const plan = buildWritePlan({ operation, resourceName: prefix + path, fields })

    expect(plan.body.operations[0]).toEqual({ update: { resourceName: prefix + path, ...fields }, updateMask })
    expect(verifyWritePlan(plan)).toEqual(plan)
  })

  it('is deterministic across key ordering and detaches caller objects', () => {
    const input = { operation: 'campaignBudget.update', resourceName: `${prefix}campaignBudgets/2`, fields: { amountMicros: '100', name: 'Budget' } }
    const first = buildWritePlan(input)

    expect(buildWritePlan({ fields: { name: 'Budget', amountMicros: '100' }, resourceName: input.resourceName, operation: input.operation }).digest).toBe(first.digest)
    input.fields.name = 'Changed'
    expect(first.summary.fields.name).toBe('Budget')
    expect(buildWritePlan(input).digest).not.toBe(first.digest)
  })

  it.each(['0', '-1', '1.2', '1e6', ' 1', '01', '9223372036854775808', 1000000, NaN, Infinity])('rejects noncanonical/overflow micros %s', amountMicros => {
    expect(() => buildWritePlan({ operation: 'campaignBudget.create', fields: { name: 'Budget', amountMicros } })).toThrow(GoogleAdsWriteValidationError)
  })

  it.each([
    { ...campaign, scopes: ['adwords'] },
    { ...campaign, endpoint: 'https://example.com/mutate' },
    { ...campaign, customerId: '1234567890' },
    { ...campaign, partialFailure: true },
    { ...campaign, validateOnly: true },
    { ...campaign, operations: [{ remove: `${prefix}campaigns/1` }] },
    { ...campaign, resourceName: `${prefix}campaigns/1` },
    { operation: 'campaign.remove', resourceName: `${prefix}campaigns/1`, fields: {} },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: {} },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: { status: 'REMOVED' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: { status: 'ENABLED' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, updateMask: '*', fields: { name: 'x' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: { updateMask: '*', name: 'x' } },
    { operation: 'campaign.update', resourceName: 'customers/1234567890/campaigns/1', fields: { name: 'x' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/../1`, fields: { name: 'x' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/-1`, fields: { name: 'x' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1?key=secret`, fields: { name: 'x' } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: { finalUrls: ['https://example.com'] } },
    { operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: { name: 'user@example.com' } },
    { operation: 'campaignGoal.update', resourceName: `${prefix}campaignConversionGoals/1~DEFAULT~WEBSITE`, fields: { biddable: true } },
    { operation: 'accountGoal.update', resourceName: `${prefix}customerConversionGoals/PURCHASE~APP`, fields: { biddable: true } },
    { operation: 'conversionAction.update', resourceName: `${prefix}conversionActions/1`, fields: { status: 'REMOVED' } },
    { operation: 'conversionAction.update', resourceName: `${prefix}conversionActions/1`, fields: { type: 'UPLOAD_CLICKS' } },
    { operation: 'conversionAction.update', resourceName: `${prefix}conversionActions/1`, fields: { valueSettings: { ...valueSettings, defaultCurrencyCode: 'USD' } } },
    { operation: 'conversionAction.update', resourceName: `${prefix}conversionActions/1`, fields: { valueSettings: { ...valueSettings, defaultValue: Infinity } } },
    { operation: 'adGroup.create', fields: { name: 'x', campaign: `${prefix}campaigns/1`, type: 'SEARCH_STANDARD', cpcBidMicros: '1' } },
    { ...campaign, fields: { ...campaign.fields, status: 'ENABLED' } },
    { ...campaign, fields: { ...campaign.fields, manualCpc: { enhancedCpcEnabled: true } } }
  ])('rejects unsafe/unsupported input %# before any provider call', input => {
    expect(() => buildWritePlan(input)).toThrow(GoogleAdsWriteValidationError)
  })

  it('rejects accessor inputs without executing them or echoing secrets', () => {
    let calls = 0
    const fields = Object.defineProperty({}, 'name', { enumerable: true, get: () => { calls++; throw new Error('secret') } })

    expect(() => buildWritePlan({ operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields })).toThrow('Invalid Google Ads write plan input')
    expect(calls).toBe(0)
  })

  it('rejects unsafe nested objects in persisted plans without running accessors', () => {
    const plan = buildWritePlan({ operation: 'campaignBudget.create', fields: { name: 'Budget', amountMicros: '100' } })
    let reads = 0

    Object.defineProperty(plan.body, 'operations', { enumerable: true, get: () => { reads++; throw new Error('secret') } })
    expect(() => verifyWritePlan(plan)).toThrow(GoogleAdsWriteValidationError)
    expect(reads).toBe(0)
  })

  it('rejects circular persisted bodies instead of recursing indefinitely', () => {
    const plan = buildWritePlan({ operation: 'campaignBudget.create', fields: { name: 'Budget', amountMicros: '100' } })

    plan.body.operations.push(plan.body)
    expect(() => verifyWritePlan(plan)).toThrow(GoogleAdsWriteValidationError)
  })

  it('maps supported conversion windows to int64 wire strings and rejects fractional windows', () => {
    const plan = buildWritePlan({ operation: 'conversionAction.update', resourceName: `${prefix}conversionActions/1`, fields: { clickThroughLookbackWindowDays: 90, viewThroughLookbackWindowDays: 30 } })

    expect(plan.body.operations[0]).toMatchObject({ update: { clickThroughLookbackWindowDays: '90', viewThroughLookbackWindowDays: '30' } })
    expect(verifyWritePlan(plan)).toEqual(plan)
    expect(() => buildWritePlan({ ...plan.summary, fields: { clickThroughLookbackWindowDays: 2.5 } })).toThrow(GoogleAdsWriteValidationError)
  })

  it.each(['accountGoal.update', 'campaignGoal.update'])('omits unsupported partialFailure on %s wire only', operation => {
    const resourceName = operation === 'accountGoal.update'
      ? `${prefix}customerConversionGoals/PURCHASE~WEBSITE`
      : `${prefix}campaignConversionGoals/1~PURCHASE~WEBSITE`

    const plan = buildWritePlan({ operation, resourceName, fields: { biddable: false } })
    const before = JSON.stringify(plan)

    expect(getWriteRequestBody(plan, true)).toEqual({ operations: plan.body.operations, validateOnly: true })
    expect(getWriteRequestBody(plan, false)).toEqual({ operations: plan.body.operations, validateOnly: false })
    expect(plan.body.partialFailure).toBe(false)
    expect(JSON.stringify(plan)).toBe(before)
  })

  it('keeps atomic request semantics for supported non-goal endpoints', () => {
    const plan = buildWritePlan(campaign)

    expect(getWriteRequestBody(plan, true)).toEqual({ operations: plan.body.operations, partialFailure: false, validateOnly: true })
    expect(() => getWriteRequestBody({ ...plan, digest: 'invalid' }, false)).toThrow(GoogleAdsWriteValidationError)
    expect(() => getWriteRequestBody(plan, 'false' as unknown as boolean)).toThrow(GoogleAdsWriteValidationError)
  })

  it.each(['endpoint', 'customer', 'mask', 'operation', 'digest', 'validateOnly'])('rejects a tampered reviewed plan: %s', mutation => {
    const plan = buildWritePlan({ operation: 'campaign.update', resourceName: `${prefix}campaigns/1`, fields: { name: 'New name' } })

    if (mutation === 'endpoint') plan.endpoint = 'campaigns:remove'
    if (mutation === 'customer') (plan as unknown as Record<string, unknown>).customerId = '1234567890'
    if (mutation === 'mask') (plan.body.operations[0] as Record<string, unknown>).updateMask = '*'
    if (mutation === 'operation') plan.body.operations.push({ remove: `${prefix}campaigns/1` })
    if (mutation === 'digest') plan.digest = 'a'.repeat(64)
    if (mutation === 'validateOnly') plan.body.validateOnly = true
    expect(() => verifyWritePlan(plan)).toThrow(GoogleAdsWriteValidationError)
  })
})
