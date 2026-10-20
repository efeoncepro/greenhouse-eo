import 'server-only'
import assert from 'node:assert/strict'
import { writeFileSync, readFileSync, existsSync } from 'node:fs'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import {
  authorDraftForm,
  addDestination,
  createHostSurface,
  reviewForm,
  publishForm
} from '@/lib/growth/forms/commands'
import {
  getFormDefinitionBySlug,
  getFormVersionById,
  getHostSurfaceById,
  listVersionsForForm,
  listDestinationsForVersion
} from '@/lib/growth/forms/store'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import { closeGreenhousePostgres } from '@/lib/postgres/client'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const SLUG = 'efeonce-blog-subscription',
  KEY = '6bc62588-a4a0-4214-9501-13b0c2948c81',
  SURFACE = 'fhsf-efeonce-blog-subscription'

const CONSENT = 'Quiero recibir Glitch, el newsletter de Efeonce, cada lunes. Puedo darme de baja cuando quiera.'
const NOTICE = 'Usamos tu correo para gestionar esta suscripción.'

const NAME = 'Suscripción - Glitch | Blog Efeonce',
  SUB = 535702717

const statePath = '.captures/2026-10-20-blog-growth-form/activation.json'

async function main() {
  const token = await getHubSpotAccessToken()

  const hs = async (path: string, method = 'GET', body?: unknown): Promise<any> => {
    const r = await fetch('https://api.hubapi.com' + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    })

    if (!r.ok) throw Error(`HubSpot ${method} ${r.status}: ${await r.text()}`)

    return r.json()
  }

  assert.equal((await hs('/account-info/v3/details')).portalId, 48713323)
  const defs = await hs('/communication-preferences/v3/definitions')

  assert(
    defs.subscriptionDefinitions.some(
      (s: any) => s.id === String(SUB) && s.isActive && !s.isInternal && s.communicationMethod === 'Email'
    )
  )
  const property = await hs('/crm/v3/properties/contacts/ef_greenhouse_submission_id')

  assert(property.formField && property.type === 'string')
  const forms: any[] = []
  let after = ''

  do {
    const page = await hs('/marketing/v3/forms?limit=100' + (after ? '&after=' + encodeURIComponent(after) : ''))

    forms.push(...page.results)
    after = page.paging?.next?.after ?? ''
  } while (after)

  const matches = forms.filter(f => f.name === NAME)

  assert(matches.length <= 1)
  let form = matches[0]

  const fieldGroups = [
    {
      groupType: 'default_group',
      richTextType: 'text',
      fields: [
        {
          objectTypeId: '0-1',
          name: 'email',
          label: 'Correo electrónico',
          required: true,
          hidden: false,
          fieldType: 'email',
          validation: { blockedEmailDomains: [], useDefaultBlockList: false }
        }
      ]
    },
    {
      groupType: 'default_group',
      richTextType: 'text',
      fields: [
        {
          objectTypeId: '0-1',
          name: 'ef_greenhouse_submission_id',
          label: 'Greenhouse submission ID',
          required: false,
          hidden: true,
          fieldType: 'single_line_text'
        }
      ]
    }
  ]

  const legalConsentOptions = {
    type: 'implicit_consent_to_process',
    privacyText: NOTICE,
    communicationConsentText: '',
    communicationsCheckboxes: [{ required: true, subscriptionTypeId: SUB, label: CONSENT }]
  }

  const state: any = existsSync(statePath) ? JSON.parse(readFileSync(statePath, 'utf8')) : {}
  const save = () => writeFileSync(statePath, JSON.stringify(state, null, 2))

  const lifecycleStages = [
    { objectTypeId: '0-1', value: 'subscriber' },
    { objectTypeId: '0-2', value: 'subscriber' }
  ]

  for (const object of ['contacts', 'companies']) {
    const lifecycle = await hs(`/crm/v3/properties/${object}/lifecyclestage`)

    assert(lifecycle.options.some((option: any) => option.value === 'subscriber'))
  }

  if (!form && process.argv.includes('--apply-hubspot')) {
    const ref = await hs('/marketing/forms/2026-09-beta/8bee8dca-27f2-4ca5-ac09-7606351c7e72')

    form = await hs('/marketing/forms/2026-09-beta', 'POST', {
      formType: 'hubspot',
      name: NAME,
      createdAt: new Date().toISOString(),
      archived: false,
      fieldGroups,
      configuration: {
        ...ref.configuration,
        lifecycleStages,
        notifyRecipients: [],
        notifyContactOwner: false,
        prePopulateKnownValues: false,
        postSubmitAction: { type: 'thank_you', value: 'Recibimos tu solicitud de suscripción a Glitch.' }
      },
      displayOptions: { ...ref.displayOptions, submitButtonText: 'Suscribirme' },
      legalConsentOptions
    })
    state.hubspotFormId = form.id
    state.createdAt = new Date().toISOString()
    save()
  }

  if (!form) {
    console.log(JSON.stringify({ mode: 'dry_run', name: NAME, fieldGroups, legalConsentOptions }))

    return
  }

  form = await hs('/marketing/forms/2026-09-beta/' + form.id)

  if (process.argv.includes('--apply-hubspot')) {
    assert.equal(form.id, state.hubspotFormId, 'Only the subscription form created by this operation may be updated')
    await hs('/marketing/forms/2026-09-beta/' + form.id, 'PATCH', {
      configuration: { ...form.configuration, lifecycleStages }
    })
    form = await hs('/marketing/forms/2026-09-beta/' + form.id)
  }

  assert.deepEqual(form.configuration.lifecycleStages, lifecycleStages)
  state.lifecycleStages = lifecycleStages
  const fields = form.fieldGroups.flatMap((g: any) => g.fields ?? [])

  assert.equal(fields.length, 2)
  assert(fields.find((f: any) => f.name === 'email')?.required)
  assert.equal(fields.find((f: any) => f.name === 'email')?.validation?.useDefaultBlockList, false)
  assert(fields.find((f: any) => f.name === 'ef_greenhouse_submission_id')?.hidden)
  assert.equal(form.legalConsentOptions.communicationsCheckboxes[0].subscriptionTypeId, SUB)
  assert.equal(form.legalConsentOptions.communicationsCheckboxes[0].label, CONSENT)
  state.hubspotFormId = form.id
  state.hubspotContractVerifiedAt = new Date().toISOString()
  save()
  console.log(
    JSON.stringify({
      hubspotFormId: form.id,
      name: form.name,
      fields: fields.map((f: any) => ({ name: f.name, required: f.required, hidden: f.hidden })),
      subscriptionType: SUB,
      acceptsPersonalEmail: true
    })
  )
  if (!process.argv.includes('--prepare') && !process.argv.includes('--publish')) return
  const def = await getFormDefinitionBySlug(SLUG)

  assert(def?.form_key === KEY && def.form_kind === 'subscribe')
  const versions = await listVersionsForForm(def.form_id)
  let v = versions.find(v => v.consent_policy_version === 'efeonce-blog-glitch-subscription-v1')

  if (!v) {
    const previous = await getFormVersionById('fver-eb219d21-2683-466b-8aaf-dd9280b1b82a')

    assert(previous && previous.status === 'review')

    const authored = await authorDraftForm({
      slug: SLUG,
      formKey: KEY,
      name: NAME,
      formKind: 'subscribe',
      purpose: 'Recibir Glitch cada lunes',
      locale: 'es-CL',
      fieldSchema: previous.field_schema_json,
      validationSchema: previous.validation_schema_json,
      uiPolicy: previous.ui_policy_json,
      copyRefs: {
        ...(previous.copy_refs_json as any),
        checkboxes: [{ key: 'newsletter_consent', label: CONSENT, required: true }]
      },
      successBehavior: {
        kind: 'inline_message',
        message: 'Recibimos tu solicitud de suscripción a Glitch. Gracias por acompañarnos.'
      },
      consentPolicyVersion: 'efeonce-blog-glitch-subscription-v1',
      dataClassification: previous.data_classification_json,
      destinationPolicy: {},
      analyticsPolicy: previous.analytics_policy_json,
      retentionPolicy: previous.retention_policy_json,
      commercialHandoffPolicy: previous.commercial_handoff_policy_json,
      createdBy: 'operator-blog-subscription-20261020'
    })

    v = (await getFormVersionById(authored.formVersionId))!
    state.formVersionId = v.form_version_id
    save()
  }

  let dests = await listDestinationsForVersion(v.form_version_id)

  if (!dests.length) {
    await addDestination({
      formVersionId: v.form_version_id,
      provider: 'hubspot',
      adapterKind: 'hubspot_forms_secure_submit',
      adapterVersion: 'hsforms-v3-secure-submit',
      endpointStatus: 'legacy_supported',
      deliveryMode: 'direct',
      mapping: {
        portalId: '48713323',
        formGuid: form.id,
        fieldMapping: { email: 'email' },
        submissionIdProperty: 'ef_greenhouse_submission_id',
        consentText: NOTICE,
        communications: [{ checkboxKey: 'newsletter_consent', subscriptionTypeId: SUB, text: CONSENT }]
      },
      consentRequirements: { required: true },
      retryPolicy: { backoff: 'exponential_jitter', maxAttempts: 5 }
    })
    dests = await listDestinationsForVersion(v.form_version_id)
  }

  assert.equal(dests.length, 1)
  assert.equal((dests[0].mapping_json as any).formGuid, form.id)
  if (!(await getHostSurfaceById(SURFACE)))
    await createHostSurface({
      surfaceId: SURFACE,
      surfaceKind: 'wordpress',
      surfaceName: 'Blog Efeonce · Glitch',
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  if (v.status !== 'published') await reviewForm(v.form_version_id)
  const compiled = compileFormVersion(def, v, dests, { forPublication: true })

  assert(compiled.ok, JSON.stringify(compiled.blockingReasons))

  if (process.argv.includes('--publish')) {
    // Required explicit served revision evidence; local tests are not proof of a compatible worker.
    const evidence = JSON.parse(readFileSync('.captures/2026-10-20-blog-growth-form/release-readback.json', 'utf8'))

    assert(evidence.released && evidence.workerCompatible && evidence.targetSha && evidence.workerRevision)

    if (v.status !== 'published') {
      const published = await publishForm(v.form_version_id)

      assert(published.ok, JSON.stringify(published.blockingReasons))
    }
  }

  const readback = await getFormVersionById(v.form_version_id)

  state.formVersionId = v.form_version_id
  state.status = readback?.status
  state.surfaceId = SURFACE
  save()
  console.log(JSON.stringify(state))

  if (compiled.renderContract) {
    compiled.renderContract.surfacePolicy = {
      surfaceId: SURFACE,
      allowedOrigins: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      rendererChannel: 'stable'
    }
    writeFileSync(
      '.captures/2026-10-20-blog-growth-form/render-contract.preview.json',
      JSON.stringify(compiled.renderContract, null, 2)
    )
  }
}

main()
  .catch(e => {
    console.error(e.message)
    process.exitCode = 1
  })
  .finally(closeGreenhousePostgres)
