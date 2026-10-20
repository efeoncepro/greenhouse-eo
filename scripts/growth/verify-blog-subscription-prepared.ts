/** Read-only readiness audit. No command, submit, publish or dispatch is invoked. */
import 'server-only'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import {
  getFormDefinitionBySlug,
  listVersionsForForm,
  listDestinationsForVersion,
  getHostSurfaceById
} from '@/lib/growth/forms/store'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import { listMeasurementPolicies } from '@/lib/growth/measurement/policy-store'
import { resolveMeasurementSource } from '@/lib/growth/measurement/policy-source'
import { verifyBlogSubscriptionMeasurement } from '../gtm/verify-blog-subscription'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const out = '.captures/2026-10-20-blog-growth-form/'
const key = '6bc62588-a4a0-4214-9501-13b0c2948c81'
const versionId = 'fver-c6b28627-385c-43fc-995d-588bc0290fd0'
const surfaceId = 'fhsf-efeonce-blog-subscription'
const hubspotId = '8c7cf91b-a1c9-4cbe-9d8c-cac773692561'
const subscriptionType = 535702717

async function main() {
  assert.equal(process.argv.length, 2, 'Read-only verifier accepts no mutation flags')
  const definition = await getFormDefinitionBySlug('efeonce-blog-subscription')

  assert(definition && definition.form_key === key && definition.form_kind === 'subscribe')
  const versions = await listVersionsForForm(definition.form_id)
  const version = versions.find(v => v.form_version_id === versionId)

  assert(version && version.status === 'review')
  assert(!versions.some(v => v.status === 'published'), 'Form must remain unpublished')
  const destinations = await listDestinationsForVersion(versionId)

  assert.equal(destinations.length, 1)
  const destination = destinations[0]
  const mapping = destination.mapping_json as Record<string, any>

  assert(destination.enabled && destination.provider === 'hubspot' && destination.delivery_mode === 'direct')
  assert.equal(destination.adapter_kind, 'hubspot_forms_secure_submit')
  assert.equal(mapping.portalId, '48713323')
  assert.equal(mapping.formGuid, hubspotId)
  assert.deepEqual(mapping.fieldMapping, { email: 'email' })
  assert.equal(mapping.submissionIdProperty, 'ef_greenhouse_submission_id')

  const compiled = compileFormVersion(definition, version, destinations, { forPublication: true })

  assert(compiled.ok && compiled.renderContract, JSON.stringify(compiled.blockingReasons))
  const contract = compiled.renderContract
  const checkbox = contract.consent?.checkboxes?.[0]

  assert.equal(contract.fields.length, 1)
  assert.equal(contract.fields[0].key, 'email')
  assert.equal(contract.fields[0].type, 'email')
  assert.equal(contract.fields[0].validator, 'email_syntax')
  assert(contract.fields[0].required)
  assert.equal((version.validation_schema_json as any).emailPolicy.mode, 'off')
  assert.equal(contract.consent?.checkboxes.length, 1)
  assert(checkbox?.required && checkbox.key === 'newsletter_consent')
  assert.equal(contract.consent?.privacyUrl, 'https://efeoncepro.com/politica-de-privacidad/')
  assert.deepEqual(mapping.communications, [
    { checkboxKey: checkbox.key, subscriptionTypeId: subscriptionType, text: checkbox.label }
  ])
  assert(contract.security?.captcha?.required && contract.security.captcha.provider === 'turnstile')
  assert(
    contract.telemetryPolicy?.enabled &&
      contract.telemetryPolicy.gtmDataLayer &&
      contract.telemetryPolicy.fieldLevelAnalyticsDisabled
  )
  assert(contract.telemetryPolicy.allowedEvents.includes('submission_accepted'))

  const surface = await getHostSurfaceById(surfaceId)

  assert(surface?.status === 'active')
  assert.deepEqual(surface.allowed_form_slugs_json, [definition.slug])
  assert.deepEqual(surface.origin_allowlist_json, ['https://efeoncepro.com', 'https://www.efeoncepro.com'])
  contract.surfacePolicy = {
    surfaceId,
    allowedOrigins: surface.origin_allowlist_json as string[],
    rendererChannel: 'stable'
  }
  assert.deepEqual(
    JSON.parse(JSON.stringify(contract)),
    JSON.parse(readFileSync(out + 'render-contract.preview.json', 'utf8')),
    'Approved preview must match current saved contract'
  )

  const token = await getHubSpotAccessToken()

  const hs = async (path: string): Promise<any> => {
    const response = await fetch('https://api.hubapi.com' + path, { headers: { Authorization: `Bearer ${token}` } })

    assert(response.ok, `HubSpot GET ${path}: ${response.status}`)

    return response.json()
  }

  assert.equal((await hs('/account-info/v3/details')).portalId, 48713323)

  const [native, definitions, property] = await Promise.all([
    hs('/marketing/forms/2026-09-beta/' + hubspotId),
    hs('/communication-preferences/v3/definitions'),
    hs('/crm/v3/properties/contacts/ef_greenhouse_submission_id')
  ])

  assert(!native.archived && native.id === hubspotId)
  const fields = native.fieldGroups.flatMap((group: any) => group.fields ?? [])
  const email = fields.find((field: any) => field.name === 'email')
  const marker = fields.find((field: any) => field.name === mapping.submissionIdProperty)

  assert.equal(fields.length, 2)
  assert(email?.required && !email.hidden && email.validation.useDefaultBlockList === false)
  assert.deepEqual(email.validation.blockedEmailDomains ?? [], [])
  assert(marker?.hidden && !marker.required && property.formField && property.type === 'string')
  const nativeConsent = native.legalConsentOptions.communicationsCheckboxes

  assert.equal(nativeConsent.length, 1)
  assert(nativeConsent[0].required && nativeConsent[0].subscriptionTypeId === subscriptionType)
  assert.equal(nativeConsent[0].label, checkbox.label)
  assert.equal(native.legalConsentOptions.privacyText, mapping.consentText)
  assert(
    definitions.subscriptionDefinitions.some(
      (d: any) => d.id === String(subscriptionType) && d.isActive && !d.isInternal && d.communicationMethod === 'Email'
    )
  )
  assert.deepEqual(native.configuration.lifecycleStages, [
    { objectTypeId: '0-1', value: 'subscriber' },
    { objectTypeId: '0-2', value: 'subscriber' }
  ])

  const scope = { sourceKind: 'form_submission' as const, sourceKey: key, surfaceId }
  const source = await resolveMeasurementSource(scope)
  const policies = (await listMeasurementPolicies()).filter(policy => policy.scope.sourceKey === key)

  assert(source)
  assert(source.blockingReasons.includes('purpose_not_commercial'))
  assert.equal(source.googleAdsEligible, false)
  assert(
    !policies.some(policy => policy.state === 'published' && policy.publishedRevisionId === policy.revisionId),
    'Newsletter must have no published commercial matching policy'
  )

  const measurement = await verifyBlogSubscriptionMeasurement()

  const evidence = {
    checkedAt: new Date().toISOString(),
    mode: 'read_only',
    formKey: key,
    formVersionId: versionId,
    status: version.status,
    publishedVersions: 0,
    compilation: 'pass',
    previewMatchesSavedContract: true,
    email: { required: true, acceptsPersonalEmail: true },
    consent: { required: true, subscriptionType },
    captcha: 'turnstile_required',
    nativeHubSpotForm: hubspotId,
    hubspotContract: 'pass',
    nativeOccurrenceMarker: mapping.submissionIdProperty,
    commercialMeasurementEligible: false,
    activeCommercialPolicies: 0,
    externalWrites: 0,
    measurement,
    pending: [
      ...(measurement.correctionRequired ? ['gtm_newsletter_event_correction'] : []),
      'compatible_worker_release',
      'form_publication',
      'wordpress_cutover',
      'real_submission_and_hubspot_receipt',
      'real_ga4_newsletter_subscription_event'
    ]
  }

  writeFileSync(out + 'prepared-readback.json', JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence, null, 2))
}

main()
  .catch(error => {
    console.error(
      error instanceof assert.AssertionError
        ? error.message
        : 'Read-only verification failed; inspect local connectivity/auth without exposing credentials'
    )
    process.exitCode = 1
  })
  .finally(closeGreenhousePostgres)
