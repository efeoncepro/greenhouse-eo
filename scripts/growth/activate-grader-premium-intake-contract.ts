import 'server-only'

/**
 * TASK-1327 — Publica una version premium/progresiva del form `ai-visibility-grader`.
 *
 * DRY-RUN por defecto. Con `--apply`:
 * - clona la version publicada vigente por `form_key`
 * - preserva validation/namePolicy/emailPolicy, consent, security, policies y destinations
 * - cambia solo el contrato browser-safe del form:
 *   - `style_variant=diagnostic_premium`
 *   - `ui_policy.composition=multi_step_light` con 3 pasos
 *   - labels/placeholders/help copy humanos para una experiencia enterprise
 *   - `successBehavior.tokenizedReport.statusPathTemplate` para el handoff Think
 * - publica una version nueva y depreca la anterior.
 *
 * NUNCA muta una version publicada in-place. Think sigue embebiendo `<greenhouse-form>` y no
 * crea inputs locales: el renderer gobierna campos, validacion, consentimiento y submit.
 */

import { execFileSync } from 'node:child_process'

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionByKey,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
  listHostSurfaces
} from '@/lib/growth/forms/store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const ALLOW_RUNTIME_PENDING = process.argv.includes('--allow-runtime-pending')
const PRODUCTION_RUNTIME_REF = process.env.GREENHOUSE_GRADER_PREMIUM_RUNTIME_REF?.trim() || 'origin/main'

const GRADER_FORM_KEY = '69cd5269-5f97-4d32-99c4-0b23f41aa2f5'
const STYLE_VARIANT = 'diagnostic_premium'
const STATUS_PATH_TEMPLATE = '/api/public/growth/ai-visibility/run/{handle}'

const STEPS = [
  {
    key: 'brand',
    label: 'Tu marca',
    fieldKeys: ['brandName', 'websiteUrl', 'market', 'locale', 'category']
  },
  {
    key: 'context',
    label: 'Contexto opcional',
    fieldKeys: ['competitorsDeclared', 'industry', 'persona', 'companySize', 'mainChallenge']
  },
  {
    key: 'contact',
    label: 'Envío del informe',
    fieldKeys: ['firstName', 'lastName', 'email', 'consent']
  }
] as const

const FIELD_UPDATES: Record<string, Record<string, unknown>> = {
  brandName: {
    label: 'Nombre de la marca',
    placeholder: 'ej. Efeonce',
    autocomplete: 'organization',
    maxLength: 120
  },
  websiteUrl: {
    label: 'Sitio web',
    placeholder: 'ej. https://tuempresa.com',
    autocomplete: 'url',
    inputMode: 'url'
  },
  market: {
    label: 'Mercado principal',
    placeholder: 'ej. Chile, Mexico, LatAm B2B',
    maxLength: 80
  },
  locale: {
    type: 'select',
    label: 'Idioma del analisis',
    placeholder: 'Selecciona idioma/region',
    options: [
      { value: 'es-CL', label: 'Espanol (Chile / LatAm)' },
      { value: 'en-US', label: 'Ingles (Estados Unidos)' }
    ]
  },
  category: {
    label: 'Categoria donde compites',
    placeholder: 'ej. banca, retail, educacion superior',
    maxLength: 140
  },
  competitorsDeclared: {
    type: 'textarea',
    label: 'Competidores de referencia',
    placeholder: 'ej. competidor regional, alternativa local, referente global',
    maxLength: 280
  },
  firstName: {
    label: 'Nombre',
    autocomplete: 'given-name',
    maxLength: 80
  },
  lastName: {
    label: 'Apellido',
    autocomplete: 'family-name',
    maxLength: 80
  },
  email: {
    label: 'Correo corporativo',
    placeholder: 'nombre@empresa.com',
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'corporate_email'
  },
  industry: {
    label: 'Industria',
    placeholder: 'ej. Servicios profesionales, tecnologia, retail',
    maxLength: 120
  },
  persona: {
    label: 'Rol o comprador principal',
    placeholder: 'ej. CMO, founder, gerente comercial',
    maxLength: 120
  },
  companySize: {
    label: 'Tamano de empresa',
    placeholder: 'ej. 51-200 personas',
    maxLength: 80
  },
  mainChallenge: {
    label: 'Que quieres entender o mejorar',
    placeholder: 'ej. Entender por que mi marca aparece poco en respuestas de IA.',
    maxLength: 500
  },
  consent: {
    label: 'Acepto que Efeonce use estos datos para generar y enviarme mi informe.'
  }
}

const COPY_UPDATES: Record<string, string> = {
  submit: 'Generar mi informe',
  'brandName.help': 'Usamos este nombre para buscar menciones y variaciones de tu marca.',
  'websiteUrl.help': 'Opcional, pero ayuda a leer citabilidad y operabilidad del sitio correcto.',
  'market.help': 'Define el territorio donde la IA deberia entender, citar y comparar tu marca.',
  'locale.help': 'Ajusta el idioma base de lectura del reporte.',
  'category.help': 'Ayuda a interpretar la categoria correcta sin forzar un resultado.',
  'competitorsDeclared.help': 'Opcional: escribe 1 a 3 marcas. Si no las tienes claras, puedes omitir este paso.',
  'email.help': 'Usa tu correo corporativo para recibir y recuperar el informe.',
  'mainChallenge.help': 'Opcional: una frase basta. Evita informacion sensible.',
  'brandName.error.required': 'Escribe el nombre de la marca para iniciar el analisis.',
  'market.error.required': 'Indica el mercado donde quieres evaluar la visibilidad.',
  'locale.error.required': 'Elige el idioma base del informe.',
  'category.error.required': 'Describe la categoria donde compite tu marca.',
  'firstName.error.required': 'Escribe tu nombre para identificar la solicitud.',
  'lastName.error.required': 'Escribe tu apellido para completar tus datos.',
  'email.error.required': 'Escribe tu correo corporativo para recibir y recuperar el informe.',
  'consent.error.required': 'Acepta el uso de datos para generar tu informe.'
}

const SUCCESS_MESSAGE =
  'Solicitud recibida. Estamos consultando motores, citabilidad y contexto competitivo para preparar tu informe en pantalla.'

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const stableJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>

    return `{${Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`
  }

  return JSON.stringify(value)
}

const readFileAtRef = (ref: string, filePath: string): string => {
  try {
    return execFileSync('git', ['show', `${ref}:${filePath}`], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

const assertProductionRuntimeSupportsPremiumIntake = (): void => {
  if (!APPLY) return

  const renderer = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/renderer.ts')
  const styles = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/styles.ts')

  const runtimeReady =
    renderer.includes("composition !== 'multi_step_light'") &&
    renderer.includes('buildTokenizedReportHandoff') &&
    styles.includes('[data-ghf-style-variant="diagnostic_premium"]')

  if (runtimeReady) {
    console.log(`\nRuntime guard: ${PRODUCTION_RUNTIME_REF} supports multi_step_light + premium + tokenized handoff.`)

    return
  }

  const message =
    `Premium grader activation would publish multi_step_light/diagnostic_premium/tokenizedReport, but ${PRODUCTION_RUNTIME_REF} ` +
    'does not contain the renderer support. Release the code first, or pass --allow-runtime-pending only with an explicit rollback plan.'

  if (!ALLOW_RUNTIME_PENDING) {
    console.error(`\nFAIL: ${message}`)
    process.exit(1)
  }

  console.warn(`\nWARNING: ${message}`)
}

const withPremiumFields = (fieldSchema: unknown): unknown[] => {
  if (!Array.isArray(fieldSchema)) return []

  return fieldSchema.map(field => {
    const candidate = asObject(field)
    const key = typeof candidate.key === 'string' ? candidate.key : null
    const updates = key ? FIELD_UPDATES[key] : undefined

    if (!key || !updates) return field

    return { ...candidate, ...updates }
  })
}

const withPremiumCopy = (copyRefs: unknown): Record<string, unknown> => {
  const refs = asObject(copyRefs)
  const copy = asObject(refs.copy)

  return { ...refs, copy: { ...copy, ...COPY_UPDATES } }
}

const withPremiumUiPolicy = (uiPolicy: unknown): Record<string, unknown> => ({
  ...asObject(uiPolicy),
  composition: 'multi_step_light',
  steps: STEPS
})

const withTokenizedSuccess = (successBehavior: unknown): Record<string, unknown> => ({
  ...asObject(successBehavior),
  kind: 'tokenized_report',
  message: SUCCESS_MESSAGE,
  tokenizedReport: { statusPathTemplate: STATUS_PATH_TEMPLATE }
})

const main = async (): Promise<void> => {
  console.log(`Activacion premium intake grader — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  assertProductionRuntimeSupportsPremiumIntake()

  const definition = await getFormDefinitionByKey(GRADER_FORM_KEY)

  if (!definition) {
    console.error(`FAIL: no existe form_definition con form_key="${GRADER_FORM_KEY}". Abortando.`)
    process.exit(1)
  }

  if (definition.status !== 'active') {
    console.error(`FAIL: la definicion ${definition.form_id} no esta activa (status=${definition.status}). Abortando.`)
    process.exit(1)
  }

  const current = await getPublishedVersionBySlug(definition.slug)

  if (!current) {
    console.error(`\nFAIL: no hay version publicada para "${definition.slug}". Abortando.`)
    process.exit(1)
  }

  const surfaces = await listHostSurfaces()

  const relatedSurfaces = surfaces.filter(surface => {
    const allowed = Array.isArray(surface.allowed_form_slugs_json) ? (surface.allowed_form_slugs_json as string[]) : []

    return allowed.length === 0 || allowed.includes(definition.slug)
  })

  const destinations = await listDestinationsForVersion(current.form_version_id)
  const nextFields = withPremiumFields(current.field_schema_json)
  const nextCopyRefs = withPremiumCopy(current.copy_refs_json)
  const nextUiPolicy = withPremiumUiPolicy(current.ui_policy_json)
  const nextSuccess = withTokenizedSuccess(current.success_behavior_json)

  const alreadyPremium =
    current.style_variant === STYLE_VARIANT &&
    stableJson(nextFields) === stableJson(current.field_schema_json) &&
    stableJson(nextCopyRefs) === stableJson(current.copy_refs_json) &&
    stableJson(nextUiPolicy) === stableJson(current.ui_policy_json) &&
    stableJson(nextSuccess) === stableJson(current.success_behavior_json)

  console.log('\nTarget resuelto por form_key:')
  console.log(`  form_key : ${definition.form_key}`)
  console.log(`  slug     : ${definition.slug}`)
  console.log(`  form_id  : ${definition.form_id}`)
  console.log(`  name     : ${definition.name}`)
  console.log(`  surfaces : ${relatedSurfaces.map(surface => surface.surface_id).join(', ') || '(ninguna)'}`)

  console.log(`\nVersion publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  style_variant actual  : ${current.style_variant ?? '(sin definir)'}`)
  console.log(`  style_variant objetivo: ${STYLE_VARIANT}`)
  console.log(`  composition actual    : ${asObject(current.ui_policy_json).composition ?? 'static'}`)
  console.log('  composition objetivo  : multi_step_light')
  console.log(
    `  campos                : ${Array.isArray(current.field_schema_json) ? current.field_schema_json.length : 0}`
  )
  console.log(`  destinos              : ${destinations.length}`)

  if (alreadyPremium) {
    console.log(
      '\nIdempotente: la version publicada vigente ya expone el contrato premium/progresivo del grader. Nada que hacer.'
    )

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log(`  - Setear style_variant = ${STYLE_VARIANT}`)
  console.log('  - Setear ui_policy.composition = multi_step_light con 3 pasos')
  console.log('  - Humanizar labels/placeholders/help copy de los campos del grader')
  console.log('  - Cambiar competitorsDeclared de multiselect sin opciones a textarea opcional')
  console.log('  - Añadir successBehavior.tokenizedReport.statusPathTemplate')
  console.log('  - Preservar validation/emailPolicy, ui_policy.security.captcha, consent y policies')
  console.log(`  - Copiar ${destinations.length} destino(s) de la version vigente`)
  console.log(`  - Publicar version nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply para publicar.')

    return
  }

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: definition.form_kind as 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
    ...preserveFormVersionFields(current),
    fieldSchema: nextFields,
    copyRefs: nextCopyRefs,
    uiPolicy: nextUiPolicy,
    styleVariant: STYLE_VARIANT,
    successBehavior: nextSuccess,
    createdBy: 'task-1327-grader-premium-intake-activation'
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
      retryPolicy: destination.retry_policy_json
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
  console.log('\nAPPLY completo. El grader queda listo para renderizar como intake premium/progresivo en Think.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
