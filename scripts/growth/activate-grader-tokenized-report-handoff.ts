import 'server-only'

/**
 * TASK-1336 — Publica una versión del form del lead magnet (`ai-visibility-grader`) que declara el
 * handoff `tokenized_report`: agrega `successBehavior.tokenizedReport.statusPathTemplate` para que,
 * al aceptar el submit, el `<greenhouse-form>` entregue al host (Think) un handle público + la URL
 * de status y arranque el poll SIN hardcodear la ruta ni conocer el grader (Full API Parity).
 *
 * DRY-RUN por defecto. Con `--apply`:
 * - clona la versión publicada vigente por slug (`ai-visibility-grader`)
 * - preserva fields, validation/namePolicy, Turnstile/security, destinations y policies
 * - cambia solo `success_behavior_json` para AÑADIR el `tokenizedReport` (kind sigue tokenized_report)
 * - bloquea si el runtime productivo aún no contiene el handoff en el renderer.
 *
 * NUNCA muta la versión publicada in-place (clone → publish → deprecate). No toca campos, consent,
 * Turnstile ni destino. Reversible: publicar la versión previa o quitar el `tokenizedReport`.
 */

import { execFileSync } from 'node:child_process'

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionById,
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
const PRODUCTION_RUNTIME_REF = process.env.GREENHOUSE_GRADER_HANDOFF_RUNTIME_REF?.trim() || 'origin/main'

const GRADER_SLUG = 'ai-visibility-grader'
/** Ruta pública canónica del status del run (TASK-1245); `{handle}` = submissionId del motor. */
const STATUS_PATH_TEMPLATE = '/api/public/growth/ai-visibility/run/{handle}'

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

const assertProductionRuntimeSupportsHandoff = (): void => {
  if (!APPLY) return

  const renderer = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/renderer.ts')
  const telemetry = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/telemetry.ts')

  const runtimeReady =
    renderer.includes('buildTokenizedReportHandoff') &&
    telemetry.includes("'run_handle'") &&
    telemetry.includes("'status_url'")

  if (runtimeReady) {
    console.log(`\nRuntime guard: ${PRODUCTION_RUNTIME_REF} already contains the tokenized_report handoff renderer.`)

    return
  }

  const message =
    `Tokenized-report handoff activation would publish successBehavior.tokenizedReport, but ${PRODUCTION_RUNTIME_REF} ` +
    'does not contain the renderer support. Release the code first, or pass --allow-runtime-pending only with an ' +
    'explicit rollout blocker/rollback plan.'

  if (!ALLOW_RUNTIME_PENDING) {
    console.error(`\nFAIL: ${message}`)
    process.exit(1)
  }

  console.warn(`\nWARNING: ${message}`)
}

const main = async (): Promise<void> => {
  console.log(`Activación tokenized_report handoff (${GRADER_SLUG}) — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  assertProductionRuntimeSupportsHandoff()

  const current = await getPublishedVersionBySlug(GRADER_SLUG)

  if (!current) {
    console.error(`\nFAIL: no hay versión publicada para "${GRADER_SLUG}". Abortando.`)
    process.exit(1)
  }

  const definition = await getFormDefinitionById(current.form_id)

  if (!definition || definition.status !== 'active') {
    console.error(`FAIL: definición ${current.form_id} inexistente o inactiva. Abortando.`)
    process.exit(1)
  }

  const surfaces = await listHostSurfaces()

  const relatedSurfaces = surfaces.filter(surface => {
    const allowed = Array.isArray(surface.allowed_form_slugs_json) ? (surface.allowed_form_slugs_json as string[]) : []

    return allowed.length === 0 || allowed.includes(definition.slug)
  })

  const target = {
    ...asObject(current.success_behavior_json),
    kind: 'tokenized_report',
    tokenizedReport: { statusPathTemplate: STATUS_PATH_TEMPLATE },
  }

  console.log('\nTarget resuelto por slug:')
  console.log(`  slug     : ${definition.slug}`)
  console.log(`  form_id  : ${definition.form_id}`)
  console.log(`  form_key : ${definition.form_key}`)
  console.log(`  name     : ${definition.name}`)
  console.log(`  surfaces : ${relatedSurfaces.map(surface => surface.surface_id).join(', ') || '(ninguna)'}`)

  const destinations = await listDestinationsForVersion(current.form_version_id)
  const alreadyHandoff = stableJson(current.success_behavior_json) === stableJson(target)

  console.log(`\nVersión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  success actual  : ${JSON.stringify(current.success_behavior_json)}`)
  console.log(`  success objetivo: ${JSON.stringify(target)}`)
  console.log(`  destinos        : ${destinations.length}`)

  if (alreadyHandoff) {
    console.log('\nIdempotente: la versión publicada vigente ya declara el handoff tokenized_report. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log('  - Añadir success_behavior_json.tokenizedReport.statusPathTemplate (kind sigue tokenized_report)')
  console.log('  - Preservar fields, validation, ui_policy.security.captcha, consent y policies')
  console.log(`  - Copiar ${destinations.length} destino(s) de la versión vigente`)
  console.log(`  - Publicar versión nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply cuando el renderer productivo tenga el handoff (TASK-1336) y TASK-1335 (CORS Think) esté listo.')

    return
  }

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: definition.form_kind as 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
    ...preserveFormVersionFields(current),
    fieldSchema: current.field_schema_json,
    successBehavior: target,
    createdBy: 'grader-tokenized-report-handoff-activation',
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
  console.log('\nAPPLY completo. El grader entrega el handoff tokenized_report al host en el próximo render.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
