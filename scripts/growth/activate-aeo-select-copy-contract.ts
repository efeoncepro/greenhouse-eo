import 'server-only'

/**
 * TASK-1298 — Activación gobernada de microcopy de selects AEO para paridad visual.
 *
 * Publica una versión NUEVA de la definición AEO ajustando sólo los placeholders de
 * los selects del render contract:
 *   - country     → "Selecciona país"
 *   - companySize → "Selecciona tamaño"
 *
 * Mantiene fields, validation, `copy_refs_json.copy.submit`, Turnstile, success,
 * consent, destinations y demás policies de la versión publicada vigente. DRY-RUN
 * por defecto; `--apply` muta vía commands canónicos (clone → copy destinations →
 * publish → deprecate), nunca raw SQL. El target se resuelve por `form_key`.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-select-copy-contract.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-aeo-select-copy-contract.ts --apply
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionByKey,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
  listHostSurfaces,
} from '@/lib/growth/forms/store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')

const AEO_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'

const SELECT_PLACEHOLDERS: Record<string, string> = {
  country: 'Selecciona país',
  companySize: 'Selecciona tamaño',
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const resolveSelectPlaceholder = (field: unknown): string | null => {
  const candidate = asObject(field)

  return typeof candidate.placeholder === 'string' ? candidate.placeholder : null
}

const withSelectPlaceholders = (fieldSchema: unknown): unknown[] => {
  if (!Array.isArray(fieldSchema)) return []

  return fieldSchema.map(field => {
    const candidate = asObject(field)
    const key = typeof candidate.key === 'string' ? candidate.key : null
    const nextPlaceholder = key ? SELECT_PLACEHOLDERS[key] : undefined

    if (!nextPlaceholder) return field

    return {
      ...candidate,
      placeholder: nextPlaceholder,
    }
  })
}

const hasMatchingSelectPlaceholders = (fieldSchema: unknown): boolean => {
  if (!Array.isArray(fieldSchema)) return false

  return Object.entries(SELECT_PLACEHOLDERS).every(([key, expected]) => {
    const field = fieldSchema.find(candidate => asObject(candidate).key === key)

    return resolveSelectPlaceholder(field) === expected
  })
}

const main = async (): Promise<void> => {
  console.log(`Activación select copy contract AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const definition = await getFormDefinitionByKey(AEO_FORM_KEY)

  if (!definition) {
    console.error(`FAIL: no existe form_definition con form_key="${AEO_FORM_KEY}". Abortando.`)
    process.exit(1)
  }

  if (definition.status !== 'active') {
    console.error(`FAIL: la definición ${definition.form_id} no está activa (status=${definition.status}). Abortando.`)
    process.exit(1)
  }

  const surfaces = await listHostSurfaces()

  const relatedSurfaces = surfaces.filter(surface => {
    const allowed = Array.isArray(surface.allowed_form_slugs_json) ? (surface.allowed_form_slugs_json as string[]) : []

    return allowed.length === 0 || allowed.includes(definition.slug)
  })

  console.log('\nTarget resuelto por form_key:')
  console.log(`  form_key : ${AEO_FORM_KEY}`)
  console.log(`  slug     : ${definition.slug}`)
  console.log(`  form_id  : ${definition.form_id}`)
  console.log(`  name     : ${definition.name}`)
  console.log(`  surfaces : ${relatedSurfaces.map(surface => surface.surface_id).join(', ') || '(ninguna)'}`)

  const current = await getPublishedVersionBySlug(definition.slug)

  if (!current) {
    console.error(`\nFAIL: no hay versión publicada para "${definition.slug}". Abortando.`)
    process.exit(1)
  }

  const destinations = await listDestinationsForVersion(current.form_version_id)
  const currentFields = Array.isArray(current.field_schema_json) ? current.field_schema_json : []
  const nextFields = withSelectPlaceholders(current.field_schema_json)

  console.log(`\nVersión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  destinos a copiar: ${destinations.length}`)

  for (const key of Object.keys(SELECT_PLACEHOLDERS)) {
    const field = currentFields.find(candidate => asObject(candidate).key === key)

    console.log(`  ${key}.placeholder actual : ${resolveSelectPlaceholder(field) ?? '(sin definir)'}`)
    console.log(`  ${key}.placeholder objetivo: ${SELECT_PLACEHOLDERS[key]}`)
  }

  if (hasMatchingSelectPlaceholders(current.field_schema_json)) {
    console.log('\nIdempotente: la versión publicada vigente ya expone los placeholders aprobados. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log('  - Ajustar sólo placeholders de selects en field_schema_json')
  console.log('  - Preservar validation, copy_refs, ui_policy.security.captcha, success, consent y policies')
  console.log(`  - Copiar ${destinations.length} destino(s) de la versión vigente`)
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
    ...preserveFormVersionFields(current),
    fieldSchema: nextFields,
    createdBy: 'aeo-select-copy-contract-activation',
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

  console.log('\nAPPLY completo. El render contract AEO expone placeholders de selects aprobados.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
