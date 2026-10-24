/**
 * Suscripción a Glitch como píldora en línea (portada del blog v3, TASK-2051/2053/2054).
 *
 * Nueva versión del formulario `efeonce-blog-subscription` (misma clave pública) con presentación `inline_pill`: un
 * campo de correo, el aviso bajo la píldora y confirmación en el mismo lugar. La suscripción a Glitch en HubSpot nace
 * del acto de suscribirse bajo ese aviso (`consentBy: 'submission'`, aprobado por el operador el 2026-10-24): el
 * servidor guarda el hash del aviso en el snapshot de consentimiento y el adaptador sólo suscribe si lo encuentra.
 *
 * DRY-RUN por defecto (compila y reporta). `--apply` crea el borrador, su destino y lo deja en revisión.
 * `--publish` además publica, y sólo si `origin/main` ya sirve el código que lo hace funcionar (hash del aviso y
 * `consentBy` en el adaptador): publicar antes dejaría suscriptores sin suscripción.
 *
 *   pnpm growth:forms:publish-glitch-pill [--apply] [--publish]
 */
import 'server-only'

import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'

import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { addDestination, authorDraftForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { CONSENT_PRIVACY_LINK_MARKER } from '@/lib/growth/forms/contracts'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import {
  getFormDefinitionBySlug,
  getFormVersionById,
  getHostSurfaceById,
  listDestinationsForVersion,
  listVersionsForForm
} from '@/lib/growth/forms/store'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const SLUG = 'efeonce-blog-subscription'
const KEY = '6bc62588-a4a0-4214-9501-13b0c2948c81'
const SURFACE = 'fhsf-efeonce-blog-subscription'
const POLICY = 'efeonce-blog-glitch-subscription-pill-v1'
const BASE_VERSION = 'fver-c6b28627-385c-43fc-995d-588bc0290fd0'
const HUBSPOT_FORM = '8c7cf91b-a1c9-4cbe-9d8c-cac773692561'
const GLITCH_SUBSCRIPTION = 535702717

// Canvas aprobado (portada del blog v3). El aviso lleva el enlace a la política de privacidad.
const NOTE = `Al suscribirte aceptas la ${CONSENT_PRIVACY_LINK_MARKER}. Te das de baja cuando quieras.`
const NOTE_AS_SEEN = 'Al suscribirte aceptas la política de privacidad. Te das de baja cuando quieras.'

const LABELS = {
  openLabel: 'Suscríbete a Glitch',
  submitLabel: 'Suscribirme',
  successLabel: '¡Listo!',
  doneLabel: 'Ya estás suscrito a Glitch',
  note: NOTE
}

const apply = process.argv.includes('--apply') || process.argv.includes('--publish')
const publish = process.argv.includes('--publish')

/** Producción sirve `main`: el flag de publicación exige el código lector ahí, no en esta rama. */
const mainServesConsentBySubmission = () => {
  execFileSync('git', ['fetch', '-q', 'origin', 'main'])
  const read = (path: string) => execFileSync('git', ['show', `origin/main:${path}`], { encoding: 'utf8' })

  return (
    read('src/lib/growth/forms/hash.ts').includes('inlinePillNoticeHash') &&
    read('src/lib/growth/forms/commands.ts').includes('inlinePillNoticeHash(version.ui_policy_json)') &&
    read('src/lib/growth/forms/destinations/hubspot/adapter.ts').includes("consentBy === 'submission'") &&
    read('src/growth-forms-renderer/inline-pill.ts').length > 0
  )
}

async function main() {
  const def = await getFormDefinitionBySlug(SLUG)

  assert(def?.form_key === KEY && def.form_kind === 'subscribe', 'Formulario base inesperado')
  const base = await getFormVersionById(BASE_VERSION)

  assert(base, 'Versión base no encontrada')
  const copy = { ...(base.copy_refs_json as Record<string, unknown>) }

  delete copy.checkboxes
  const copyRefs = { ...copy, copy: { ...(copy.copy as Record<string, string>), submit: LABELS.submitLabel } }

  delete (copyRefs.copy as Record<string, string>)['newsletter_consent.error.required']
  const uiPolicy = { ...(base.ui_policy_json as Record<string, unknown>), composition: 'static', presentation: 'inline_pill', inlinePill: LABELS }

  let version = (await listVersionsForForm(def.form_id)).find(v => v.consent_policy_version === POLICY)

  if (!version && !apply) {
    // Compila en memoria con el mismo compiler de la publicación: el veredicto real, sin tocar la base.
    const draft = { ...base, ui_policy_json: uiPolicy, copy_refs_json: copyRefs, consent_policy_version: POLICY, success_behavior_json: { kind: 'inline_message', message: LABELS.doneLabel } }
    const mapping = { portalId: '48713323', formGuid: HUBSPOT_FORM, fieldMapping: { email: 'email' }, consentText: NOTE_AS_SEEN, communications: [{ consentBy: 'submission', subscriptionTypeId: GLITCH_SUBSCRIPTION, text: NOTE_AS_SEEN }] }
    const [baseDest] = await listDestinationsForVersion(BASE_VERSION)
    const dry = compileFormVersion(def, draft as typeof base, [{ ...baseDest, mapping_json: mapping } as typeof baseDest], { forPublication: true })

    console.log(JSON.stringify({ mode: 'dry_run', slug: SLUG, policy: POLICY, ok: dry.ok, blocking: dry.blockingReasons, presentation: dry.renderContract?.presentation, inlinePill: dry.renderContract?.inlinePill, uiPolicy, copyRefs }, null, 2))

    return
  }

  if (!version) {
    const authored = await authorDraftForm({
      slug: SLUG,
      formKey: KEY,
      name: 'Suscripción - Glitch | Blog Efeonce (píldora)',
      formKind: 'subscribe',
      purpose: 'Recibir Glitch cada lunes desde la portada del blog',
      locale: 'es-CL',
      fieldSchema: base.field_schema_json,
      validationSchema: base.validation_schema_json,
      uiPolicy,
      copyRefs,
      successBehavior: { kind: 'inline_message', message: LABELS.doneLabel },
      consentPolicyVersion: POLICY,
      dataClassification: base.data_classification_json,
      destinationPolicy: {},
      analyticsPolicy: base.analytics_policy_json,
      retentionPolicy: base.retention_policy_json,
      commercialHandoffPolicy: base.commercial_handoff_policy_json,
      createdBy: 'operator-blog-home-glitch-pill-20261024'
    })

    version = (await getFormVersionById(authored.formVersionId))!
  }

  let dests = await listDestinationsForVersion(version.form_version_id)

  if (!dests.length) {
    await addDestination({
      formVersionId: version.form_version_id,
      provider: 'hubspot',
      adapterKind: 'hubspot_forms_secure_submit',
      adapterVersion: 'hsforms-v3-secure-submit',
      endpointStatus: 'legacy_supported',
      deliveryMode: 'direct',
      mapping: {
        portalId: '48713323',
        formGuid: HUBSPOT_FORM,
        fieldMapping: { email: 'email' },
        submissionIdProperty: 'ef_greenhouse_submission_id',
        consentText: NOTE_AS_SEEN,
        communications: [{ consentBy: 'submission', subscriptionTypeId: GLITCH_SUBSCRIPTION, text: NOTE_AS_SEEN }]
      },
      consentRequirements: { required: true },
      retryPolicy: { backoff: 'exponential_jitter', maxAttempts: 5 }
    })
    dests = await listDestinationsForVersion(version.form_version_id)
  }

  assert.equal(dests.length, 1)
  assert(await getHostSurfaceById(SURFACE), 'Superficie del blog no encontrada')
  if (version.status === 'draft') await reviewForm(version.form_version_id)
  const compiled = compileFormVersion(def, (await getFormVersionById(version.form_version_id))!, dests, { forPublication: true })

  assert(compiled.ok, JSON.stringify(compiled.blockingReasons))
  assert.equal(compiled.renderContract?.presentation, 'inline_pill')

  if (publish) {
    assert(mainServesConsentBySubmission(), 'origin/main todavía no sirve consentBy submission: primero el release de Greenhouse')
    const current = await getFormVersionById(version.form_version_id)

    if (current?.status !== 'published') {
      const published = await publishForm(version.form_version_id)

      assert(published.ok, JSON.stringify(published.blockingReasons))
    }
  }

  const readback = await getFormVersionById(version.form_version_id)

  console.log(
    JSON.stringify(
      { slug: SLUG, formKey: KEY, surface: SURFACE, formVersionId: readback?.form_version_id, status: readback?.status, presentation: compiled.renderContract?.presentation, warnings: compiled.warnings?.map(w => w.code) },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(closeGreenhousePostgres)
