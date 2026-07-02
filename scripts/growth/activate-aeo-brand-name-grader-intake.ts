import 'server-only'

/**
 * TASK-1321 — Activación gobernada del campo `brandName` + `country` requerido en el form
 * público `/aeo-2/` (`efeonce-aeo-diagnostic`), prerequisito de datos para que el submit
 * pueda correr el AEO Grader (el único input que el grader NO puede derivar).
 *
 * Publica una versión NUEVA de la definición AEO:
 *   - AGREGA `brandName` (text, requerido) antes de `brandWebsite` — nombre de la marca.
 *   - Hace `country` **requerido** (hoy opcional) para derivar `market`/`locale` confiable.
 *   - Relabela `brandWebsite` → "Sitio web de tu marca" (no-redundante ahora que hay brandName).
 *   - Agrega copy es-CL de error required para ambos campos (validado con greenhouse-ux-writing).
 *
 * Preserva el resto de fields, validation (namePolicy split_full_name), copy, Turnstile,
 * success (success_card TASK-1320), consent, destinations (el `brandName` NO se agrega al
 * mapping HubSpot: queda Greenhouse-side para el grader; el handoff del grader ya escribe props
 * de company por dominio) y demás policies. DRY-RUN por defecto; `--apply` muta vía commands
 * canónicos (clone → copy destinations → publish → deprecate), nunca raw SQL. Target por `form_key`.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-brand-name-grader-intake.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-brand-name-grader-intake.ts --apply
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionByKey,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
} from '@/lib/growth/forms/store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')

const AEO_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'

// El único input que el grader no puede derivar (brand-intelligence lo exige como input).
const BRAND_NAME_FIELD = {
  key: 'brandName',
  type: 'text',
  label: 'Nombre de tu marca',
  required: true,
  maxLength: 120,
  placeholder: 'ej. Grupo Berel',
} as const

const BRAND_WEBSITE_LABEL = 'Sitio web de tu marca'

// Copy es-CL (tuteo, imperativo, dice cómo resolver) — espeja el estilo de fullName.error.required.
const NEW_COPY: Record<string, string> = {
  'brandName.error.required': 'Escribe el nombre de tu marca para personalizar tu diagnóstico.',
  'country.error.required': 'Selecciona tu país para ajustar el diagnóstico a tu mercado.',
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

/** Añade brandName (antes de brandWebsite), country required y relabel de brandWebsite. Idempotente. */
const withBrandFields = (fieldSchema: unknown): unknown[] => {
  const fields = Array.isArray(fieldSchema) ? [...fieldSchema] : []

  const remapped = fields.map(field => {
    const candidate = asObject(field)

    if (candidate.key === 'country') return { ...candidate, required: true }
    if (candidate.key === 'brandWebsite') return { ...candidate, label: BRAND_WEBSITE_LABEL }

    return field
  })

  const hasBrandName = remapped.some(field => asObject(field).key === 'brandName')

  if (hasBrandName) return remapped

  const insertAt = remapped.findIndex(field => asObject(field).key === 'brandWebsite')
  const at = insertAt >= 0 ? insertAt : remapped.length

  return [...remapped.slice(0, at), { ...BRAND_NAME_FIELD }, ...remapped.slice(at)]
}

const withNewCopy = (copyRefs: unknown): Record<string, unknown> => {
  const root = asObject(copyRefs)
  const copy = asObject(root.copy)

  return { ...root, copy: { ...copy, ...NEW_COPY } }
}

const alreadyApplied = (fieldSchema: unknown): boolean => {
  if (!Array.isArray(fieldSchema)) return false

  const brandName = fieldSchema.find(field => asObject(field).key === 'brandName')
  const country = fieldSchema.find(field => asObject(field).key === 'country')

  return Boolean(brandName) && asObject(country).required === true
}

const main = async (): Promise<void> => {
  console.log(`Activación brandName + country requerido AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const definition = await getFormDefinitionByKey(AEO_FORM_KEY)

  if (!definition) {
    console.error(`FAIL: no existe form_definition con form_key="${AEO_FORM_KEY}". Abortando.`)
    process.exit(1)
  }

  if (definition.status !== 'active') {
    console.error(`FAIL: la definición ${definition.form_id} no está activa (status=${definition.status}). Abortando.`)
    process.exit(1)
  }

  const current = await getPublishedVersionBySlug(definition.slug)

  if (!current) {
    console.error(`\nFAIL: no hay versión publicada para "${definition.slug}". Abortando.`)
    process.exit(1)
  }

  console.log('\nTarget resuelto por form_key:')
  console.log(`  form_key : ${AEO_FORM_KEY}`)
  console.log(`  slug     : ${definition.slug}`)
  console.log(`  form_id  : ${definition.form_id}`)
  console.log(`  versión publicada vigente: ${current.form_version_id} (v${current.version})`)

  if (alreadyApplied(current.field_schema_json)) {
    console.log('\nIdempotente: la versión publicada vigente ya expone brandName + country requerido. Nada que hacer.')

    return
  }

  const destinations = await listDestinationsForVersion(current.form_version_id)
  const nextFields = withBrandFields(current.field_schema_json)
  const nextCopy = withNewCopy(current.copy_refs_json)

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log(`  - Agregar campo brandName (requerido) antes de brandWebsite`)
  console.log(`  - country → requerido; brandWebsite label → "${BRAND_WEBSITE_LABEL}"`)
  console.log(`  - Agregar copy: ${Object.keys(NEW_COPY).join(', ')}`)
  console.log('  - Preservar validation (namePolicy), Turnstile, success (success_card), consent y policies')
  console.log(`  - Copiar ${destinations.length} destino(s) (brandName NO se agrega al mapping HubSpot)`)
  console.log(`  - Publicar versión nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply para publicar.')

    return
  }

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: definition.form_kind as 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'low',
    locale: current.locale,
    fieldSchema: nextFields,
    validationSchema: current.validation_schema_json,
    copyRefs: nextCopy,
    uiPolicy: current.ui_policy_json,
    successBehavior: current.success_behavior_json,
    consentPolicyVersion: current.consent_policy_version ?? 'efeonce-aeo-diagnostic-consent-v1',
    dataClassification: current.data_classification_json,
    destinationPolicy: current.destination_policy_json,
    analyticsPolicy: current.analytics_policy_json,
    retentionPolicy: current.retention_policy_json,
    commercialHandoffPolicy: current.commercial_handoff_policy_json,
    createdBy: 'aeo-brand-name-grader-intake-activation',
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
    console.error('FAIL: el compiler bloqueó la publicación:')
    published.blockingReasons.forEach(reason => console.error(`  - ${reason}`))
    process.exit(1)
  }

  console.log(`Publicada: ${formVersionId}`)

  await deprecateForm(current.form_version_id)
  console.log(`Deprecada: ${current.form_version_id}`)

  console.log('\nAPPLY completo. /aeo-2/ ahora captura brandName + country requerido → grader intake listo.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
