import 'server-only'

/**
 * Activacion gobernada del gate de correo corporativo en el form AEO publico.
 *
 * Publica una version NUEVA de `efeonce-aeo-diagnostic` con:
 *  - field_schema.email.validator = `corporate_email`
 *  - validation_schema.emailPolicy = { mode: 'block_field', field: 'email' }
 *
 * Mantiene el destino HubSpot de la version vigente copiandolo a la nueva version.
 * DRY-RUN por defecto; `--apply` muta via commands canonicos, nunca raw SQL.
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import { resolveEmailPolicy } from '@/lib/growth/forms/contracts'
import { getFormDefinitionById, getPublishedVersionBySlug, listDestinationsForVersion } from '@/lib/growth/forms/store'

const APPLY = process.argv.includes('--apply')

const FORM_SLUG = 'efeonce-aeo-diagnostic'
const VALIDATION_SCHEMA = { emailPolicy: { mode: 'block_field', field: 'email' } as const }

const normalizeFields = (fieldSchema: unknown): unknown[] => {
  if (!Array.isArray(fieldSchema)) return []

  return fieldSchema.map(field => {
    if (!field || typeof field !== 'object') return field
    const f = field as Record<string, unknown>

    if (f.key !== 'email') return f

    return { ...f, validator: 'corporate_email' }
  })
}

const main = async (): Promise<void> => {
  console.log(`Activacion gate email AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const current = await getPublishedVersionBySlug(FORM_SLUG)

  if (!current) {
    console.error(`FAIL: no hay version publicada para el slug "${FORM_SLUG}". Abortando.`)
    process.exit(1)
  }

  const definition = await getFormDefinitionById(current.form_id)
  const destinations = await listDestinationsForVersion(current.form_version_id)
  const currentPolicy = resolveEmailPolicy(current.validation_schema_json)
  const fields = normalizeFields(current.field_schema_json)

  const currentEmailField = Array.isArray(current.field_schema_json)
    ? current.field_schema_json.find((field: unknown) => field && typeof field === 'object' && (field as Record<string, unknown>).key === 'email')
    : null

  console.log(`Version publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`email.validator actual: ${currentEmailField && typeof currentEmailField === 'object' ? String((currentEmailField as Record<string, unknown>).validator ?? 'none') : 'missing'}`)
  console.log(`emailPolicy actual: mode=${currentPolicy.mode} field=${currentPolicy.field}`)
  console.log(`Destinos a copiar: ${destinations.length}`)

  if (currentPolicy.mode === 'block_field' && currentEmailField && typeof currentEmailField === 'object' && (currentEmailField as Record<string, unknown>).validator === 'corporate_email') {
    console.log('\nIdempotente: la version publicada vigente ya tiene corporate_email + emailPolicy.block_field. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version} (${Array.isArray(fields) ? fields.length : 0} campos)`)
  console.log('  - Cambiar email.validator -> corporate_email')
  console.log(`  - Setear validation_schema.emailPolicy = ${JSON.stringify(VALIDATION_SCHEMA.emailPolicy)}`)
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
    fieldSchema: fields,
    successBehavior: current.success_behavior_json,
    consentPolicyVersion: current.consent_policy_version ?? 'efeonce-aeo-diagnostic-consent-v1',
    validationSchema: VALIDATION_SCHEMA,
    uiPolicy: current.ui_policy_json,
    dataClassification: current.data_classification_json,
    destinationPolicy: current.destination_policy_json,
    analyticsPolicy: current.analytics_policy_json,
    retentionPolicy: current.retention_policy_json,
    commercialHandoffPolicy: current.commercial_handoff_policy_json,
    createdBy: 'aeo-email-gate-activation',
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

  console.log('\nAPPLY completo. La version publicada vigente del form AEO exige correo corporativo.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
