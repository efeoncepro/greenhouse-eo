import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

import { buildGoogleAdsGtmPlan, GOOGLE_ADS_CONSENT_GETTER, GOOGLE_ADS_USER_DATA_GETTER, runGoogleAdsGtmPlan } from './google-ads-plan'

const binding = (actionKey = 'commercial_lead') => ({
  actionKey, resourceName: `customers/6862539491/conversionActions/${actionKey === 'commercial_lead' ? '123' : '124'}`,
  ownerCustomer: 'customers/6862539491', type: 'WEBPAGE', status: 'ENABLED',
  category: actionKey === 'commercial_lead' ? 'SUBMIT_LEAD_FORM' : 'BOOK_APPOINTMENT',
  countingType: 'ONE_PER_CLICK', primaryForGoal: false,
  tagSnippets: [{ type: 'WEBPAGE', pageFormat: 'HTML', eventSnippet: `{'send_to':'AW-18432951465/${actionKey}'}` }],
})

describe('Offline Google Ads GTM review plan', () => {
  it('preserves deployment blockers after API draft shape validation, without claiming delivery', () => {
    const plan = buildGoogleAdsGtmPlan({ bindings: [binding(), binding('meeting_booking')] })

    expect(plan).toMatchObject({ deployable: false, providerCalls: 0, mutations: 0, publishSupported: false })
    expect(plan.server.candidateBodies.actionTags).toHaveLength(2)
    expect(plan.blockers).not.toContain('native_server_ads_conversion_tracking_api_shape_not_verified')
    expect(plan.blockers).not.toContain('native_server_conversion_linker_api_shape_not_verified')
    expect(plan.blockers).toContain('server_preview_and_browser_pixel_protocol_not_verified')
    expect(plan.sourceEvidence.apiDraftReadback).toMatchObject({ webWorkspaceId: '8', serverWorkspaceId: '12', deliveryVerified: false, attributionVerified: false })
    expect(plan.sourceEvidence.apiDraftReadback.quickPreview).toMatchObject({ web: { compilerError: false }, server: { compilerError: false }, functionalDeliveryVerified: false })
    expect(plan.server.conversionLinker.nativeApiShapeVerified).toBe(true)
    expect(plan.blockers.some(item => item.startsWith('verified_action_binding_missing'))).toBe(false)
    expect(plan.server.semanticActions).toHaveLength(2)
  })

  it('pins both containers, observed version fingerprints and separately named normalized hashes', () => {
    const plan = buildGoogleAdsGtmPlan()

    expect(plan.sourceEvidence.web).toMatchObject({ publicId: 'GTM-NGHPGRLZ', liveVersionId: '6', liveVersionFingerprint: '1792355588730' })
    expect(plan.sourceEvidence.server).toMatchObject({ publicId: 'GTM-K2X4ZTTK', liveVersionId: '10', liveVersionFingerprint: '1792355562526' })
    expect(plan.sourceEvidence.web.normalizedSnapshotSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(plan.blockers).toContain('verified_action_binding_missing:commercial_lead')
  })

  it('transports only reserved user_data, transaction UUID and closed action key through a dedicated event', () => {
    const plan = buildGoogleAdsGtmPlan()
    const serialized = JSON.stringify(plan.web.candidateBodies)

    expect(serialized).toContain('gh_ads_conversion')
    expect(serialized).toContain('ads_conversion_key')
    expect(serialized).toContain('transaction_id')
    expect(serialized).toContain('user_data')
    expect(serialized).not.toContain('gclid')
    expect(plan.web.requiredConsentGate).toEqual(['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'])
    expect(plan.web.candidateBodies.tag.consentSettings).toEqual({ consentStatus: 'needed', consentType: { type: 'list', list: ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization'].map(value => ({ type: 'template', value })) } })
    expect(serialized).toContain('ads_conversion_allowed')
    expect(GOOGLE_ADS_USER_DATA_GETTER).toContain('window.efeonceReadGoogleAdsUserData(id)')
  })

  it('requires each server gate and excludes bridge events from GA4 without modifying Meta', () => {
    const plan = buildGoogleAdsGtmPlan({ bindings: [binding()] })

    expect(plan.server.semanticActions[0].allRequiredConditions).toMatchObject({ clientName: 'GA4', eventName: 'gh_ads_conversion', adsConversionKey: 'commercial_lead', nativeStorageConsent: 'G111' })
    expect(plan.server.ga4ForwardingException).toMatchObject({ existingTagName: 'GA4 - server forwarding', preserveAllExistingParametersAndTriggers: true })
    expect(plan.mutationPolicy.neverModify).toContain('Meta tags')
  })

  it('emits the API-validated native Ads shapes with numeric conversion ID and no invented value', () => {
    const plan = buildGoogleAdsGtmPlan({ bindings: [binding(), binding('meeting_booking')] })
    const first = plan.server.candidateBodies.actionTags[0]

    expect(first).toMatchObject({ type: 'sgtmadsct', firingTriggerId: ['<created-server-commercial_lead-trigger-id>'] })
    expect(first.parameter).toEqual([{ type: 'template', key: 'conversionId', value: '18432951465' }, { type: 'template', key: 'conversionLabel', value: 'commercial_lead' }])
    expect(plan.server.candidateBodies.linkerTag).toMatchObject({ type: 'sgtmadscl', parameter: [] })
    expect(plan.server.candidateBodies.actionTriggers[0].filter).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'equals', parameter: [{ type: 'template', key: 'arg0', value: '{{Efeonce Ads - allowed}}' }, { type: 'template', key: 'arg1', value: '1' }] }),
    ]))
    expect(plan.sourceEvidence.nativeTypesPrimarySource).toBe('https://github.com/google/sgtm-migrator/blob/main/src/config.ts')
  })

  it('requires all four explicit CMP grants, canonical host and no GPC in the fixed consent getter', () => {
    const attrs: Record<string, string> = {
      'data-efeonce-ads-consent': 'granted', 'data-efeonce-analytics-consent': 'granted',
      ...Object.fromEntries(['ad-storage', 'analytics-storage', 'ad-user-data', 'ad-personalization'].map(name => [`data-efeonce-google-${name}`, 'granted'])),
    }

    const evaluate = (attributes: Record<string, string>, hostname = 'efeoncepro.com', gpc = false) => runInNewContext(`(${GOOGLE_ADS_CONSENT_GETTER})()`, {
      document: { documentElement: { getAttribute: (key: string) => attributes[key] } }, location: { hostname }, navigator: { globalPrivacyControl: gpc },
    })

    expect(evaluate(attrs)).toBe('1')
    expect(evaluate(attrs, 'think.efeoncepro.com')).toBe('1')
    expect(evaluate(attrs, 'other.example')).toBe('0')
    expect(evaluate(attrs, 'efeoncepro.com', true)).toBe('0')

    for (const key of Object.keys(attrs)) {
      expect(evaluate({ ...attrs, [key]: 'denied' })).toBe('0')
      expect(evaluate({ ...attrs, [key]: '' })).toBe('0')
    }
  })

  it.each([
    { bindings: [binding(), binding()] },
    { bindings: [], customerId: '123' }, { bindings: [], javascript: 'fetch(secret)' },
    { bindings: [{ ...binding(), conversionLabel: 'callerOverride' }] },
  ])('rejects account/script expansion and duplicate bindings', input => {
    expect(() => buildGoogleAdsGtmPlan(input)).toThrow()
  })

  it.each([['--publish'], ['--apply'], ['--input'], ['--input', 'file', '--apply'], ['--script', 'file']].map(args => [args]))('has no apply or arbitrary script CLI route %j', args => {
    expect(() => runGoogleAdsGtmPlan(args)).toThrow('google_ads_gtm_plan_arguments_invalid')
  })
})
