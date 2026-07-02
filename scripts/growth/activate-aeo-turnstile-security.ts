import 'server-only'

/**
 * Activacion gobernada del contrato Turnstile en el form AEO publico.
 *
 * Publica una version NUEVA de `efeonce-aeo-diagnostic` con:
 *  - ui_policy_json.security.captcha = Turnstile invisible + site key publica
 *
 * Mantiene fields, validation, destinations y demas policies de la version vigente.
 * DRY-RUN por defecto; `--apply` muta via commands canonicos, nunca raw SQL.
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getPublishedVersionBySlug, listDestinationsForVersion } from '@/lib/growth/forms/store'

const APPLY = process.argv.includes('--apply')

const FORM_SLUG = 'efeonce-aeo-diagnostic'
const TURNSTILE_SITE_KEY = '0x4AAAAAADqwX2R7v-k9pItv'

const CAPTCHA_CONFIG = {
  provider: 'turnstile',
  required: true,
  mode: 'invisible',
  siteKey: TURNSTILE_SITE_KEY,
  execution: 'submit',
} as const

const asObject = (value: unknown): Record<string, unknown> => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {})

const hasMatchingCaptcha = (uiPolicy: unknown): boolean => {
  const security = asObject(asObject(uiPolicy).security)
  const captcha = asObject(security.captcha)

  return (
    captcha.provider === CAPTCHA_CONFIG.provider &&
    captcha.required === CAPTCHA_CONFIG.required &&
    captcha.mode === CAPTCHA_CONFIG.mode &&
    captcha.siteKey === CAPTCHA_CONFIG.siteKey &&
    captcha.execution === CAPTCHA_CONFIG.execution
  )
}

const withCaptchaSecurity = (uiPolicy: unknown): Record<string, unknown> => {
  const policy = asObject(uiPolicy)
  const security = asObject(policy.security)

  return {
    ...policy,
    security: {
      ...security,
      captcha: CAPTCHA_CONFIG,
    },
  }
}

const main = async (): Promise<void> => {
  console.log(`Activacion Turnstile AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const current = await getPublishedVersionBySlug(FORM_SLUG)

  if (!current) {
    console.error(`FAIL: no hay version publicada para el slug "${FORM_SLUG}". Abortando.`)
    process.exit(1)
  }

  const definition = await getFormDefinitionById(current.form_id)
  const destinations = await listDestinationsForVersion(current.form_version_id)
  const currentUiPolicy = asObject(current.ui_policy_json)
  const nextUiPolicy = withCaptchaSecurity(currentUiPolicy)

  console.log(`Version publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`Turnstile actual: ${hasMatchingCaptcha(currentUiPolicy) ? 'matching' : 'missing_or_different'}`)
  console.log(`Site key publica: ${TURNSTILE_SITE_KEY}`)
  console.log(`Destinos a copiar: ${destinations.length}`)

  if (hasMatchingCaptcha(currentUiPolicy)) {
    console.log('\nIdempotente: la version publicada vigente ya declara security.captcha Turnstile. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log('  - Preservar fields, validation, success, consent, data/destination/analytics/retention/commercial policies')
  console.log(`  - Setear ui_policy_json.security.captcha = ${JSON.stringify(CAPTCHA_CONFIG)}`)
  console.log(`  - Copiar ${destinations.length} destino(s) de la version vigente`)
  console.log(`  - Publicar version nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply para publicar.')

    return
  }

  const { formVersionId } = await authorDraftForm({
    slug: FORM_SLUG,
    name: definition?.name ?? 'AEO Diagnostic',
    formKind: 'diagnostic_intake',
    purpose:
      definition?.purpose ??
      'Formulario publico de diagnostico AEO para capturar leads y derivarlos al motor Growth Forms.',
    riskProfile: (definition?.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'low',
    locale: current.locale,
    // Preservar styleVariant (columna de la versión, NO viaja en field_schema) — sin esto el
    // renderer pierde el premium y los selects se vuelven nativos (regresión TASK-1321).
    styleVariant: current.style_variant,
    copyRefs: current.copy_refs_json,
    fieldSchema: current.field_schema_json,
    successBehavior: current.success_behavior_json,
    consentPolicyVersion: current.consent_policy_version ?? 'efeonce-aeo-diagnostic-consent-v1',
    validationSchema: current.validation_schema_json,
    uiPolicy: nextUiPolicy,
    dataClassification: current.data_classification_json,
    destinationPolicy: current.destination_policy_json,
    analyticsPolicy: current.analytics_policy_json,
    retentionPolicy: current.retention_policy_json,
    commercialHandoffPolicy: current.commercial_handoff_policy_json,
    createdBy: 'aeo-turnstile-security-activation',
  })

  console.log(`\nDraft creado: ${formVersionId}`)

  for (const destination of destinations) {
    const copied = await addDestination({
      formVersionId,
      provider: destination.provider,
      adapterKind: destination.adapter_kind,
      adapterVersion: destination.adapter_version,
      endpointStatus: destination.endpoint_status,
      deliveryMode: destination.delivery_mode,
      mapping: destination.mapping_json,
      consentRequirements: destination.consent_requirements_json,
      retryPolicy: destination.retry_policy_json,
    })

    console.log(`Destino copiado: ${destination.destination_id} -> ${copied.destination_id}`)
  }

  const published = await publishForm(formVersionId)

  if (!published.ok) {
    console.error('FAIL: el compiler bloqueo la publicacion:')
    published.blockingReasons.forEach(reason => console.error(`  - ${reason}`))
    process.exit(1)
  }

  console.log(`Publicada: ${formVersionId}`)

  await deprecateForm(current.form_version_id)
  console.log(`Deprecada: ${current.form_version_id}`)

  console.log('\nAPPLY completo. La version publicada vigente del form AEO declara Turnstile en el render contract.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
