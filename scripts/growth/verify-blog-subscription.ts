import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'

import { getHubSpotAccessToken } from '../../src/lib/hubspot/access-token'
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../../scripts/lib/load-greenhouse-tool-env'
import { getSubmissionById, listAttemptsForSubmission, getConsentSnapshot } from '../../src/lib/growth/forms/store'
import { closeGreenhousePostgres } from '../../src/lib/postgres/client'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

async function main() {
  const out = '.captures/2026-10-20-blog-growth-form/'
  const source = JSON.parse(readFileSync(out + 'browser-submit.json', 'utf8'))
  const id = source.responses.find((r: any) => r.submissionId)?.submissionId

  assert(id)
  const submission = await getSubmissionById(id)

  assert(submission)
  const attempts = await listAttemptsForSubmission(id)
  const consent = await getConsentSnapshot(id)
  const token = await getHubSpotAccessToken()

  const hs = async (path: string) => {
    const r = await fetch('https://api.hubapi.com' + path, { headers: { Authorization: `Bearer ${token}` } })

    if (!r.ok) throw Error(`HubSpot readback ${r.status}`)

    return r.json() as Promise<any>
  }

  const email = (submission.normalized_fields_json as any).email

  assert(typeof email === 'string')
  const prefs = await hs('/communication-preferences/v3/status/email/' + encodeURIComponent(email))

  const contact = await hs(
    '/crm/v3/objects/contacts/' + encodeURIComponent(email) + '?idProperty=email&properties=lifecyclestage'
  )

  const subscriptions = prefs.subscriptionStatuses?.map((s: any) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    legalBasis: s.legalBasis
  }))

  const form = JSON.parse(readFileSync(out + 'activation.json', 'utf8')).hubspotFormId
  let cursor = ''
  let complete = false
  const matches: any[] = []

  for (let n = 0; n < 3; n++) {
    const page = await hs(
      '/form-integrations/v1/submissions/forms/' +
        form +
        '?limit=50' +
        (cursor ? '&after=' + encodeURIComponent(cursor) : '')
    )

    for (const r of page.results ?? [])
      if (r.values?.some((v: any) => v.name === 'ef_greenhouse_submission_id' && v.value === id))
        matches.push({ conversionId: r.conversionId, submittedAt: r.submittedAt, pageUrl: r.pageUrl })
    cursor = page.paging?.next?.after ?? ''

    if (!cursor) {
      complete = true
      break
    }
  }

  const result = {
    submissionId: id,
    status: submission.status,
    lifecycleStage: contact.properties?.lifecyclestage,
    consentPolicy: consent?.consent_policy_version,
    checked: consent?.checkboxes_json,
    attempts: attempts.map((a: any) => ({
      destinationId: a.destination_id,
      status: a.status,
      httpStatus: a.http_status,
      errorClass: a.error_class
    })),
    subscriptions,
    nativeOccurrences: matches,
    historyComplete: complete,
    verifiedAt: new Date().toISOString()
  }

  writeFileSync(out + 'subscription-readback.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
  assert.equal(submission.status, 'delivered', 'Worker delivery not complete')
  assert(attempts.some(a => a.provider === 'hubspot' && a.status === 'succeeded' && a.http_status === 200))
  assert.equal(consent?.consent_policy_version, 'efeonce-blog-glitch-subscription-v1')
  assert(
    subscriptions?.some((s: any) => s.id === '535702717' && s.status === 'SUBSCRIBED'),
    'Subscription not confirmed'
  )
  assert.equal(matches.length, 1)
  assert(complete)
  assert(matches[0].conversionId)
}

main()
  .catch(e => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(closeGreenhousePostgres)
