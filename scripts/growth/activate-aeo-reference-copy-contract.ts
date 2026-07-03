import 'server-only'

/**
 * Publica una nueva versión del formulario AEO con el copy de la referencia
 * aprobada, sin tocar WordPress ni cambiar la variante visual.
 *
 * DRY-RUN por defecto. Con `--apply`:
 * - mantiene `style_variant = diagnostic_premium`
 * - actualiza labels/placeholders/CTA/trust copy
 * - preserva validation, Turnstile/security, destinations y policies
 */

import { execFileSync } from 'node:child_process'

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
const ALLOW_RUNTIME_PENDING = process.argv.includes('--allow-runtime-pending')
const PRODUCTION_RUNTIME_REF = process.env.GREENHOUSE_AEO_RUNTIME_REF?.trim() || 'origin/main'

const AEO_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'
const STYLE_VARIANT = 'diagnostic_premium'
const SUBMIT_COPY = 'Empezar con mi diagnóstico →'
const SUCCESS_MESSAGE = 'Solicitud recibida. En 24–48h tendrás una lectura inicial para saber en qué nivel estás y por dónde empezar.'

const FIELD_UPDATES: Record<string, Record<string, unknown>> = {
  fullName: {
    label: 'Nombre completo',
    autocomplete: 'name',
  },
  email: {
    label: 'Email corporativo',
    autocomplete: 'email',
    inputMode: 'email',
    placeholder: 'nombre@tuempresa.com',
    validator: 'corporate_email',
  },
  brandWebsite: {
    label: 'Marca / sitio web',
    placeholder: 'tuempresa.com',
    inputMode: 'url',
  },
  country: {
    label: 'País',
    placeholder: 'Selecciona tu país',
  },
  companySize: {
    label: 'Tamaño de empresa',
    placeholder: 'Selecciona un rango',
  },
  mainCompetitor: {
    label: 'Principal competidor',
    placeholder: 'marca de tu competencia',
  },
}

const COPY_UPDATES: Record<string, string> = {
  submit: SUBMIT_COPY,
  'email.help': 'Usa tu email corporativo para recibir el diagnóstico.',
  'brandWebsite.help': 'Usaremos este sitio para revisar señales públicas de visibilidad.',
  'mainCompetitor.help': 'Opcional: ayuda a comparar tu presencia en IA.',
  'fullName.error.required': 'Escribe tu nombre completo para personalizar el diagnóstico.',
  'email.error.required': 'Usa tu email corporativo para enviarte el diagnóstico.',
  'brandWebsite.error.required': 'Indica la marca o sitio web que quieres evaluar.',
}

const SELECT_PLACEHOLDER_LABELS: Record<string, string> = {
  country: 'Selecciona tu país',
  companySize: 'Selecciona un rango',
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const withReferenceFields = (fieldSchema: unknown): unknown[] => {
  if (!Array.isArray(fieldSchema)) return []

  return fieldSchema.map(field => {
    const candidate = asObject(field)
    const currentKey = typeof candidate.key === 'string' ? candidate.key : null
    const key = currentKey === 'firstName' ? 'fullName' : currentKey
    const updates = key ? FIELD_UPDATES[key] : undefined

    if (!key || !updates) return field

    const next: Record<string, unknown> = { ...candidate, key, ...updates }
    const blankLabel = SELECT_PLACEHOLDER_LABELS[key]

    if (blankLabel && Array.isArray(candidate.options)) {
      next.options = candidate.options.map(option => {
        const opt = asObject(option)

        return opt.value === '' ? { ...opt, label: blankLabel } : option
      })
    }

    return next
  })
}

const withReferenceCopy = (copyRefs: unknown): Record<string, unknown> => {
  const refs = asObject(copyRefs)
  const copy = asObject(refs.copy)

  return { ...refs, copy: { ...copy, ...COPY_UPDATES } }
}

const withNamePolicy = (validationSchema: unknown): Record<string, unknown> => {
  const current = asObject(validationSchema)

  return {
    ...current,
    namePolicy: {
      mode: 'split_full_name',
      sourceField: 'fullName',
      firstNameField: 'firstName',
      lastNameField: 'lastName',
      confidenceField: 'nameParseConfidence',
    },
  }
}

const withFullNameDestinationMapping = (mapping: unknown): Record<string, unknown> => {
  const current = asObject(mapping)
  const fieldMapping = asObject(current.fieldMapping)
  const nextFieldMapping: Record<string, unknown> = { ...fieldMapping }

  delete nextFieldMapping.fullName
  nextFieldMapping.firstName = 'firstname'
  nextFieldMapping.lastName = 'lastname'

  return { ...current, fieldMapping: nextFieldMapping }
}

const withReferenceSuccess = (successBehavior: unknown): Record<string, unknown> => {
  const current = asObject(successBehavior)

  return {
    ...current,
    kind: typeof current.kind === 'string' ? current.kind : 'inline_message',
    message: SUCCESS_MESSAGE,
  }
}

const stableJson = (value: unknown): string => JSON.stringify(value)

const readFileAtRef = (ref: string, filePath: string): string => {
  try {
    return execFileSync('git', ['show', `${ref}:${filePath}`], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

const assertProductionRuntimeSupportsFullNameSplit = (): void => {
  if (!APPLY) return

  const normalizer = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/lib/growth/forms/name-normalization.ts')
  const commands = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/lib/growth/forms/commands.ts')

  const runtimeReady =
    normalizer.includes('applyNameNormalizationPolicy') &&
    normalizer.includes('split_full_name') &&
    commands.includes('applyNameNormalizationPolicy(version.validation_schema_json, normalizedFields)')

  if (runtimeReady) {
    console.log(`\nRuntime guard: ${PRODUCTION_RUNTIME_REF} already contains the Growth Forms full-name split runtime.`)

    return
  }

  const message =
    `AEO reference copy would publish namePolicy.split_full_name, but ${PRODUCTION_RUNTIME_REF} does not contain ` +
    'the server-side applyNameNormalizationPolicy runtime. Release the code first, or pass --allow-runtime-pending ' +
    'only with an explicit rollout blocker/rollback plan.'

  if (!ALLOW_RUNTIME_PENDING) {
    console.error(`\nFAIL: ${message}`)
    process.exit(1)
  }

  console.warn(`\nWARNING: ${message}`)
}

const main = async (): Promise<void> => {
  console.log(`Activación copy referencia AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  assertProductionRuntimeSupportsFullNameSplit()

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
  const nextFields = withReferenceFields(current.field_schema_json)
  const nextValidation = withNamePolicy(current.validation_schema_json)
  const nextCopyRefs = withReferenceCopy(current.copy_refs_json)
  const nextSuccess = withReferenceSuccess(current.success_behavior_json)
  const nextDestinationMappings = destinations.map(destination => withFullNameDestinationMapping(destination.mapping_json))
  const styleAlreadyPremium = current.style_variant === STYLE_VARIANT
  const fieldsAlreadyReference = stableJson(nextFields) === stableJson(current.field_schema_json)
  const validationAlreadyReference = stableJson(nextValidation) === stableJson(current.validation_schema_json)
  const copyAlreadyReference = stableJson(nextCopyRefs) === stableJson(current.copy_refs_json)
  const successAlreadyReference = stableJson(nextSuccess) === stableJson(current.success_behavior_json)

  const destinationsAlreadyReference = destinations.every(
    (destination, index) => stableJson(nextDestinationMappings[index]) === stableJson(destination.mapping_json),
  )

  console.log(`\nVersión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  style_variant actual : ${current.style_variant ?? '(sin definir)'}`)
  console.log(`  style_variant objetivo: ${STYLE_VARIANT}`)
  console.log(`  destinos a copiar    : ${destinations.length}`)

  for (const [key, updates] of Object.entries(FIELD_UPDATES)) {
    console.log(`  field ${key}: ${Object.keys(updates).join(', ')}`)
  }

  if (
    styleAlreadyPremium &&
    fieldsAlreadyReference &&
    validationAlreadyReference &&
    copyAlreadyReference &&
    successAlreadyReference &&
    destinationsAlreadyReference
  ) {
    console.log('\nIdempotente: la versión publicada vigente ya expone el copy de referencia AEO. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log(`  - Mantener style_variant = ${STYLE_VARIANT}`)
  console.log('  - Ajustar labels/placeholders/help/error copy al texto de referencia')
  console.log('  - Setear namePolicy.split_full_name para derivar firstName/lastName desde fullName')
  console.log('  - Actualizar mapping HubSpot server-side: firstName->firstname, lastName->lastname; fullName no se envía')
  console.log('  - Preservar validation, ui_policy.security.captcha, consent, data/destination/analytics/retention/commercial policies')
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
    validationSchema: nextValidation,
    copyRefs: nextCopyRefs,
    styleVariant: STYLE_VARIANT,
    successBehavior: nextSuccess,
    createdBy: 'aeo-reference-copy-activation',
  })

  console.log(`\nDraft creado: ${formVersionId}`)

  for (const [index, destination] of destinations.entries()) {
    const copied = await addDestination({
      formVersionId,
      provider: destination.provider,
      adapterKind: destination.adapter_kind,
      adapterVersion: destination.adapter_version,
      endpointStatus: destination.endpoint_status,
      deliveryMode: destination.delivery_mode,
      mapping: nextDestinationMappings[index],
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
  console.log('\nAPPLY completo. AEO queda listo para renderizar con el copy de referencia.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
