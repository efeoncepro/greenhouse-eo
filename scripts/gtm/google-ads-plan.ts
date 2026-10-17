/** Offline review artifact only. This module has no credentials, provider calls or apply/publish route. */
import { createHash } from 'node:crypto'
import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { z } from 'zod'

import webSnapshot from '../../docs/reference/measurement-gtm-ga4/container-snapshot.json'
import serverSnapshot from '../../docs/reference/measurement-gtm-ga4/server-container-snapshot.json'
import { buildMeasurementActionCreationPlans, GOOGLE_ADS_MEASUREMENT_ACTION_KEYS, parseMeasurementActionBinding } from '../../src/lib/growth/google-ads/measurement-actions'
import type { GoogleAdsMeasurementBinding } from '../../src/lib/growth/google-ads/measurement-actions'

export const ADS_BRIDGE_EVENT = 'gh_ads_conversion'
export const ADS_PLAN_OWNER = 'Efeonce Ads conversion bridge v1'
// Primary Google source maps native server types; parameter bodies were independently accepted/read back in isolated drafts.
// https://github.com/google/sgtm-migrator/blob/main/src/config.ts
export const GOOGLE_NATIVE_SERVER_TAG_SOURCE = 'https://github.com/google/sgtm-migrator/blob/main/src/config.ts'
const consentTypes = ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']
const transactionVariable = '{{Efeonce Ads - transaction_id}}'
const keyVariable = '{{Efeonce Ads - ads_conversion_key}}'
const triggerReference = '<created-web-bridge-trigger-id>'
const uuid = '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-8][a-fA-F0-9]{3}-[89aAbB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$'
const hash = (input: unknown) => createHash('sha256').update(JSON.stringify(input)).digest('hex')
const template = (key: string, value: string) => ({ type: 'template', key, value })
const condition = (type: string, arg0: string, arg1: string) => ({ type, parameter: [template('arg0', arg0), template('arg1', arg1)] })

const dlv = (name: string) => ({ name: `Efeonce Ads - ${name}`, type: 'v', parameter: [
  { type: 'integer', key: 'dataLayerVersion', value: '2' },
  { type: 'boolean', key: 'setDefaultValue', value: 'false' }, template('name', name),
] })

const inputSchema = z.object({ bindings: z.array(z.unknown()).max(2).default([]) }).strict()

/** Fixed source code; a caller cannot supply arbitrary scripts or GTM template parameters. */
export const GOOGLE_ADS_USER_DATA_GETTER = `function() {
  var id = ${transactionVariable};
  if (typeof id !== 'string' || !id.match('${uuid}')) return;
  if (typeof window.efeonceReadGoogleAdsUserData !== 'function') return;
  return window.efeonceReadGoogleAdsUserData(id);
}`

/** Additional defense: the CMP bridge publishes each choice explicitly, without fabricating Google internals. */
export const GOOGLE_ADS_CONSENT_GETTER = "function() { var d=document.documentElement; var names=['ad-storage','analytics-storage','ad-user-data','ad-personalization']; if(navigator.globalPrivacyControl===true || !/^(efeoncepro\\.com|think\\.efeoncepro\\.com)$/.test(location.hostname)) return '0'; if(d.getAttribute('data-efeonce-ads-consent')!=='granted' || d.getAttribute('data-efeonce-analytics-consent')!=='granted')return '0'; for(var i=0;i<names.length;i++){if(d.getAttribute('data-efeonce-google-'+names[i])!=='granted')return '0';} return '1'; }"

const baseline = (target: 'web' | 'server') => ({
  accountId: target === 'web' ? '6291647045' : '6068297031',
  containerId: target === 'web' ? '218104216' : '191286361',
  publicId: target === 'web' ? 'GTM-NGHPGRLZ' : 'GTM-K2X4ZTTK',
  // Read-only provider inventory obtained by the operator on 2026-10-17. Must recheck before draft writes.
  liveVersionId: target === 'web' ? '5' : '9',
  liveVersionFingerprint: target === 'web' ? '1791913373643' : '1791993298197',
  normalizedSnapshotSha256: hash(target === 'web' ? webSnapshot : serverSnapshot),
  comparisonRequiredBeforeDraft: true,
})

export const buildGoogleAdsGtmPlan = (input: unknown = { bindings: [] }) => {
  const result = inputSchema.safeParse(input)

  if (!result.success) throw new Error('google_ads_gtm_plan_input_invalid')
  const bindings = result.data.bindings.map(parseMeasurementActionBinding)

  if (new Set(bindings.map(binding => binding.actionKey)).size !== bindings.length ||
      new Set(bindings.map(binding => binding.resourceName)).size !== bindings.length ||
      new Set(bindings.map(binding => `${binding.conversionId}/${binding.conversionLabel}`)).size !== bindings.length)
    throw new Error('google_ads_gtm_plan_duplicate_binding')

  const blockers = [
    'live_baseline_and_isolated_workspace_readback_required',
    'server_preview_and_browser_pixel_protocol_not_verified',
    'enhanced_conversions_terms_and_effective_account_enablement_not_verified',
    ...GOOGLE_ADS_MEASUREMENT_ACTION_KEYS.filter(key => !bindings.some(binding => binding.actionKey === key)).map(key => `verified_action_binding_missing:${key}`),
  ]

  const webTrigger = {
    name: 'Efeonce Ads - confirmed conversion bridge', type: 'customEvent',
    customEventFilter: [condition('equals', '{{_event}}', ADS_BRIDGE_EVENT)],
    filter: [condition('matchRegex', transactionVariable, uuid), condition('matchRegex', keyVariable, '^(commercial_lead|meeting_booking)$'),
      condition('equals', '{{Efeonce Ads - consent allowed}}', '1')],
  }

  const eventParameters = [
    ['transaction_id', transactionVariable], ['ads_conversion_key', keyVariable],
    // Reserved Google user_data channel, never a custom dimension or user property.
    ['user_data', '{{Efeonce Ads - reserved user_data}}'],
    ['ads_conversion_allowed', '{{Efeonce Ads - consent allowed}}'],
  ]

  const webTag = {
    name: 'Efeonce Ads - confirmed conversion transport', type: 'gaawe',
    parameter: [template('eventName', ADS_BRIDGE_EVENT), template('measurementIdOverride', 'G-KYPPY57M14'),
      { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
      { type: 'list', key: 'eventSettingsTable', list: eventParameters.map(([key, value]) => ({
        type: 'map', map: [template('parameter', key), template('parameterValue', value)],
      })) }],
    firingTriggerId: [triggerReference],
    consentSettings: { consentStatus: 'needed', consentType: { type: 'list', list: consentTypes.map(value => ({ type: 'template', value })) } },
    notes: 'Ads-only reserved user_data transport; excluded from GA4 forwarding in paired Server workspace. Requires coordinated release and explicit publish approval.',
  }

  const semanticServerAction = (binding: GoogleAdsMeasurementBinding) => ({
    actionKey: binding.actionKey, providerBinding: binding,
    tag: { name: `Efeonce Ads - ${binding.actionKey}`, type: 'sgtmadsct',
      conversionId: binding.conversionId, conversionLabel: binding.conversionLabel, transactionId: 'event.transaction_id',
      userData: 'event.user_data', value: 'omitted; action has explicit nonrevenue zero default', currency: 'omitted' },
    allRequiredConditions: {
      clientName: 'GA4', eventName: ADS_BRIDGE_EVENT, adsConversionKey: binding.actionKey,
      transactionIdRegex: uuid, nativeStorageConsent: 'G111',
      googleNativeConsent: { ad_storage: 'granted', analytics_storage: 'granted', ad_user_data: 'granted', ad_personalization: 'granted' },
      allowedPageHosts: ['efeoncepro.com', 'think.efeoncepro.com'],
    },
  })

  const bridgeConditions = [condition('equals', '{{Client Name}}', 'GA4'), condition('equals', '{{Event Name}}', ADS_BRIDGE_EVENT)]
  const canonicalHost = condition('matchRegex', '{{ED - page_location}}', '^https://(efeoncepro\\.com|think\\.efeoncepro\\.com)(/|$)')
  const nativeConsent = condition('equals', '{{ED - native GA4 consent}}', 'G111')

  const actionTriggers = bindings.map(binding => ({
    name: `Efeonce Ads - ${binding.actionKey}`, type: 'always', filter: [...bridgeConditions,
      condition('equals', '{{Efeonce Ads - key}}', binding.actionKey), condition('equals', '{{Efeonce Ads - allowed}}', '1'),
      condition('matchRegex', '{{Efeonce Ads - transaction}}', uuid), nativeConsent, canonicalHost],
  }))

  const actionTags = bindings.map(binding => ({
    name: `Efeonce Ads - ${binding.actionKey}`, type: 'sgtmadsct',
    parameter: [template('conversionId', binding.conversionId.slice(3)), template('conversionLabel', binding.conversionLabel)],
    firingTriggerId: [`<created-server-${binding.actionKey}-trigger-id>`],
    notes: `Verified owner 6862539491/action ${binding.resourceName}; secondary/ONE/zero measurement default. Native tag reads transaction_id and reserved user_data. No synthetic conversions.`,
  }))

  const linkerTrigger = {
    name: 'Efeonce Ads - consented GA4 page views', type: 'always',
    filter: [condition('equals', '{{Client Name}}', 'GA4'), condition('equals', '{{Event Name}}', 'page_view'), nativeConsent, canonicalHost],
  }

  return {
    contractVersion: 'efeonce-google-ads-gtm-plan.v1', customerId: '6862539491', owner: ADS_PLAN_OWNER,
    mode: 'offline_candidate_review', deployable: false, providerCalls: 0, mutations: 0, publishSupported: false,
    sourceEvidence: { web: baseline('web'), server: baseline('server'),
      nativeTypesPrimarySource: GOOGLE_NATIVE_SERVER_TAG_SOURCE,
      apiDraftReadback: { date: '2026-10-17', webWorkspaceId: '8', serverWorkspaceId: '12',
        verifiedShapes: ['web_gaawe_four_additional_consent_types', 'web_consent_jsm', 'server_ed', 'server_always_event_name', 'server_sgtmadsct_conversionId_conversionLabel', 'server_sgtmadscl', 'server_forwarder_blockingTriggerId'],
        conversionLinkerApiVerified: true, forwarderExceptionReadbackVerified: true,
        quickPreview: {
          web: { compilerError: false, versionId: '0', at: '2026-10-17T23:16:56.985Z' },
          server: { compilerError: false, versionId: '0', at: '2026-10-17T23:16:58.729Z' },
          functionalDeliveryVerified: false,
        },
        deliveryVerified: false, attributionVerified: false },
    }, blockers,
    creationPlans: buildMeasurementActionCreationPlans(),
    web: {
      candidateBodies: { variables: [dlv('transaction_id'), dlv('ads_conversion_key'),
        { name: 'Efeonce Ads - reserved user_data', type: 'jsm', parameter: [template('javascript', GOOGLE_ADS_USER_DATA_GETTER)] },
        { name: 'Efeonce Ads - consent allowed', type: 'jsm', parameter: [template('javascript', GOOGLE_ADS_CONSENT_GETTER)] }], trigger: webTrigger, tag: webTag },
      requiredConsentGate: consentTypes,
      nativeConsentGeneratedBy: 'Existing browser CMP + Google tag; never synthesize gcs/gcd in application code',
      arbitraryScriptInputSupported: false,
    },
    server: {
      semanticActions: bindings.map(semanticServerAction),
      conversionLinker: { required: true, nativeApiShapeVerified: true, scope: 'GA4 client page events on canonical hosts, honoring native consent' },
      ga4ForwardingException: {
        existingTagName: 'GA4 - server forwarding', operation: 'append one blockingTriggerId after fresh fingerprint read',
        condition: { clientName: 'GA4', eventName: ADS_BRIDGE_EVENT },
        reason: 'Ads-only bridge with reserved user_data must not produce a second GA4 event',
        preserveAllExistingParametersAndTriggers: true,
      },
      candidateBodies: {
        variables: [['Efeonce Ads - key', 'ads_conversion_key'], ['Efeonce Ads - transaction', 'transaction_id'], ['Efeonce Ads - allowed', 'ads_conversion_allowed']].map(([name, key]) => ({ name, type: 'ed', parameter: [template('keyPath', key)] })),
        exceptionTrigger: { name: 'Efeonce Ads - exclude bridge from GA4', type: 'always', filter: bridgeConditions },
        actionTriggers, actionTags, linkerTrigger,
        linkerTag: { name: 'Efeonce Ads - Conversion Linker', type: 'sgtmadscl', parameter: [], firingTriggerId: ['<created-server-linker-trigger-id>'] },
      },
      inheritedVariablesRequired: ['Client Name', 'Event Name', 'ED - native GA4 consent', 'ED - page_location'],
      referenceHydration: 'Created trigger IDs replace explicit placeholders only; never reuse IDs from unrelated workspaces',
    },
    mutationPolicy: {
      createOrUpdateOnlyOwnedNames: 'Efeonce Ads - ',
      soleExistingEntityException: 'GA4 - server forwarding: append bridge exception; preserve unknown fields and fresh fingerprint',
      neverModify: ['Meta tags', 'Meta clients', 'Meta transformations', 'existing GA4 events', 'campaigns', 'goals', 'OAuth clients', 'consent defaults'],
      driftOrNameCollision: 'fail_closed',
    },
    acceptance: [
      'Compile isolated drafts only after native wire shapes and all blockers resolved',
      'No synthetic remote conversions: inspect denied/malformed local fixtures without destination dispatch',
      'Preview valid real conversion through browser Google tag and GA4 client, with consent and matching transaction ID',
      'Verify Google Ads destination requests separately from tag success and later attribution diagnostics',
      'Verify bridge excluded from GA4 forwarding; existing GA4 and Meta behavior preserved',
    ],
  }
}

/** Bindings are public provider metadata. Read regular local JSON only; never execute its contents. */
const readInput = (path: string): unknown => {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)

  try {
    const stat = fstatSync(fd)

    if (!stat.isFile() || stat.size > 131_072) throw new Error('google_ads_gtm_plan_input_invalid')

    return JSON.parse(readFileSync(fd, 'utf8'))
  } finally { closeSync(fd) }
}

export const runGoogleAdsGtmPlan = (args: string[]) => {
  if (args.length !== 0 && (args.length !== 2 || args[0] !== '--input')) throw new Error('google_ads_gtm_plan_arguments_invalid')

  return buildGoogleAdsGtmPlan(args.length ? readInput(args[1]) : { bindings: [] })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try { process.stdout.write(`${JSON.stringify(runGoogleAdsGtmPlan(process.argv.slice(2)), null, 2)}\n`) }
  catch { process.stderr.write('google_ads_gtm_plan_invalid\n'); process.exitCode = 2 }
}
