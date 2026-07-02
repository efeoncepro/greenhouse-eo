import 'server-only'

/**
 * Activa el contrato visual/copy premium del form AEO sin tocar WordPress.
 *
 * DRY-RUN por defecto. Con `--apply` publica una versión NUEVA del form AEO:
 * - `style_variant = diagnostic_premium`
 * - field labels/placeholders/help/error copy premium
 * - success message sobrio
 *
 * Preserva validation, Turnstile/security, destinations y policies. El target se
 * resuelve por `form_key` estable, no por slug ni por página.
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
const STYLE_VARIANT = 'diagnostic_premium'
const SUBMIT_COPY = 'Solicitar diagnóstico gratis →'
const SUCCESS_MESSAGE = 'Solicitud recibida. Prepararemos tu lectura inicial y te contactaremos pronto.'

const FIELD_UPDATES: Record<string, Record<string, unknown>> = {
  firstName: {
    label: 'Nombre',
    autocomplete: 'given-name',
  },
  email: {
    label: 'Correo corporativo',
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'corporate_email',
  },
  brandWebsite: {
    label: 'Sitio web principal',
    placeholder: 'ej. tuempresa.com',
    inputMode: 'url',
  },
  country: {
    label: 'País principal',
    placeholder: 'Selecciona país',
  },
  companySize: {
    label: 'Tamaño de empresa',
    placeholder: 'Selecciona tamaño',
  },
  mainCompetitor: {
    label: 'Competidor a comparar',
    placeholder: 'ej. marca competidora',
  },
}

const COPY_UPDATES: Record<string, string> = {
  submit: SUBMIT_COPY,
  'email.help': 'Usa tu correo corporativo para recibir el diagnóstico.',
  'brandWebsite.help': 'Usaremos este sitio para revisar señales públicas de visibilidad.',
  'mainCompetitor.help': 'Opcional: ayuda a comparar tu presencia en IA.',
  'firstName.error.required': 'Escribe tu nombre para personalizar el diagnóstico.',
  'email.error.required': 'Usa tu correo corporativo para enviarte el diagnóstico.',
  'brandWebsite.error.required': 'Indica el sitio principal de tu marca para evaluarla.',
}

const SELECT_PLACEHOLDER_LABELS: Record<string, string> = {
  country: 'Selecciona país',
  companySize: 'Selecciona tamaño',
}

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const withPremiumFields = (fieldSchema: unknown): unknown[] => {
  if (!Array.isArray(fieldSchema)) return []

  return fieldSchema.map(field => {
    const candidate = asObject(field)
    const key = typeof candidate.key === 'string' ? candidate.key : null
    const updates = key ? FIELD_UPDATES[key] : undefined

    if (!key || !updates) return field

    const next: Record<string, unknown> = { ...candidate, ...updates }
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

const withPremiumCopy = (copyRefs: unknown): Record<string, unknown> => {
  const refs = asObject(copyRefs)
  const copy = asObject(refs.copy)

  return { ...refs, copy: { ...copy, ...COPY_UPDATES } }
}

const withPremiumSuccess = (successBehavior: unknown): Record<string, unknown> => {
  const current = asObject(successBehavior)

  return {
    ...current,
    kind: typeof current.kind === 'string' ? current.kind : 'inline_message',
    message: SUCCESS_MESSAGE,
  }
}

const stableJson = (value: unknown): string => JSON.stringify(value)

const main = async (): Promise<void> => {
  console.log(`Activación contrato premium AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)

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
  const nextFields = withPremiumFields(current.field_schema_json)
  const nextCopyRefs = withPremiumCopy(current.copy_refs_json)
  const nextSuccess = withPremiumSuccess(current.success_behavior_json)
  const styleAlreadyPremium = current.style_variant === STYLE_VARIANT
  const fieldsAlreadyPremium = stableJson(nextFields) === stableJson(current.field_schema_json)
  const copyAlreadyPremium = stableJson(nextCopyRefs) === stableJson(current.copy_refs_json)
  const successAlreadyPremium = stableJson(nextSuccess) === stableJson(current.success_behavior_json)

  console.log(`\nVersión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  style_variant actual : ${current.style_variant ?? '(sin definir)'}`)
  console.log(`  style_variant objetivo: ${STYLE_VARIANT}`)
  console.log(`  destinos a copiar    : ${destinations.length}`)

  for (const [key, updates] of Object.entries(FIELD_UPDATES)) {
    console.log(`  field ${key}: ${Object.keys(updates).join(', ')}`)
  }

  if (styleAlreadyPremium && fieldsAlreadyPremium && copyAlreadyPremium && successAlreadyPremium) {
    console.log('\nIdempotente: la versión publicada vigente ya expone contrato premium AEO. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log(`  - Setear style_variant = ${STYLE_VARIANT}`)
  console.log('  - Ajustar labels/placeholders/help/error copy premium de campos AEO')
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
    copyRefs: nextCopyRefs,
    styleVariant: STYLE_VARIANT,
    successBehavior: nextSuccess,
    createdBy: 'aeo-premium-contract-activation',
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
  console.log('\nAPPLY completo. AEO queda listo para renderizar con diagnostic_premium cuando el embed/cutover use el renderer.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
