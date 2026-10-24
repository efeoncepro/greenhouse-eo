/** Read only: inspect the live tag wiring. Never emits a synthetic conversion. */
import assert from 'node:assert/strict'
import { writeFileSync } from 'node:fs'

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GTM_API_BASE, GTM_SCOPES } from '@/lib/growth/gtm/contracts'

export async function verifyBlogSubscriptionMeasurement() {
  const sourceClient = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient()

  const auth = new Impersonated({
    sourceClient,
    targetPrincipal: 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',
    targetScopes: [GTM_SCOPES.readonly],
    lifetime: 300
  })

  const { token } = await auth.getAccessToken()

  assert(token)

  const response = await fetch(`${GTM_API_BASE}/accounts/6291647045/containers/218104216/versions:live`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  assert(response.ok, `GTM live read: ${response.status}`)
  const live = await response.json()
  const parameter = (items: any[], key: string) => items.find(item => item.key === key)?.value

  const targetEvent = 'gh_newsletter_subscription_accepted'
  const targetName = 'GA4 Event - newsletter subscription accepted'

  const tagFor = (name: string) => {
    const tags = live.tag.filter((tag: any) => tag.name === name)

    assert.equal(tags.length, 1, `Exactly one ${name} tag must exist`)
    assert(!tags[0].paused)
    assert.equal(parameter(tags[0].parameter, 'measurementIdOverride'), 'G-KYPPY57M14')
    assert.equal(tags[0].firingTriggerId.length, 1)

    return tags[0]
  }

  const subscription = tagFor(live.tag.some((tag: any) => tag.name === targetName) ? targetName : 'GA4 Event - sign_up')
  const liveEvent = parameter(subscription.parameter, 'eventName')

  assert(['sign_up', targetEvent].includes(liveEvent))
  const lead = tagFor('GA4 Event - generate_lead')

  assert.equal(parameter(lead.parameter, 'eventName'), 'generate_lead')

  const triggerFor = (tag: any) => {
    const trigger = live.trigger.find((item: any) => item.triggerId === tag.firingTriggerId[0])

    assert(trigger && trigger.type === 'customEvent')
    assert.deepEqual(trigger.customEventFilter, [
      {
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{_event}}' },
          { type: 'template', key: 'arg1', value: 'gh_form_submission_accepted' }
        ]
      }
    ])

    return trigger
  }

  const kindFilter = (negate: boolean) => [
    {
      type: 'equals',
      parameter: [
        { type: 'template', key: 'arg0', value: '{{DLV - form_kind}}' },
        { type: 'template', key: 'arg1', value: 'subscribe' },
        ...(negate ? [{ type: 'boolean', key: 'negate', value: 'true' }] : [])
      ]
    }
  ]

  assert.deepEqual(triggerFor(subscription).filter, kindFilter(false))
  assert.deepEqual(triggerFor(lead).filter, kindFilter(true))
  const settings = subscription.parameter.find((item: any) => item.key === 'eventSettingsTable').list

  const allowed = new Set([
    'form_slug',
    'form_kind',
    'surface_id',
    'event_id',
    'meta_ads_consent',
    'analytics_consent',
    'meta_only',
    'meta_capi_page_view'
  ])

  const parameters = settings.map((item: any) => parameter(item.map, 'parameter'))

  assert(
    parameters.every((name: string) => allowed.has(name)),
    'No PII or unreviewed event parameters'
  )

  for (const [name, variable] of Object.entries({
    form_slug: 'form_slug',
    form_kind: 'form_kind',
    surface_id: 'surface_id',
    event_id: 'correlation_id'
  })) {
    const row = settings.find((item: any) => parameter(item.map, 'parameter') === name)

    assert(row)
    assert.equal(parameter(row.map, 'parameterValue'), `{{DLV - ${variable}}}`)
  }

  // Prepare one in-place correction, never a second newsletter tag. Nothing is sent to GTM.
  const corrected = structuredClone(subscription)

  corrected.name = targetName
  corrected.parameter.find((item: any) => item.key === 'eventName').value = targetEvent
  for (const key of ['accountId', 'containerId', 'workspaceId', 'tagId', 'path', 'tagManagerUrl']) delete corrected[key]
  const correctionRequired = liveEvent !== targetEvent

  writeFileSync(
    '.captures/2026-10-20-blog-growth-form/measurement-correction.preview.json',
    JSON.stringify(
      {
        mode: 'local_proposal_only',
        baselineVersion: live.containerVersionId,
        sourceTagId: subscription.tagId,
        expectedFingerprint: subscription.fingerprint,
        changedFields: ['name', 'parameter[eventName]'],
        proposedTag: corrected,
        correctionRequired,
        readyToPublish: false,
        gates: [
          'operator_publish_authorization',
          'fresh_workspace_from_live',
          'tag_readback',
          'quick_preview',
          'isolated_browser_preview',
          'post_publish_snapshot'
        ]
      },
      null,
      2
    )
  )

  return {
    container: 'GTM-NGHPGRLZ',
    liveVersion: live.containerVersionId,
    measurementId: 'G-KYPPY57M14',
    liveEvent,
    preparedEvent: targetEvent,
    correctionRequired,
    excludedFromGenerateLead: true,
    onlyAcceptedEvent: true,
    eventParametersAllowlisted: true,
    eventEmitted: false,
    providerReceptionVerified: false
  }
}
