import 'server-only'

/**
 * Publica una versión AEO con success-card metadata browser-safe.
 *
 * DRY-RUN por defecto. Con `--apply`:
 * - clona la versión publicada vigente por `form_key`
 * - preserva fields, validation/namePolicy, Turnstile/security, destinations y policies
 * - cambia solo `success_behavior_json` hacia presentation=`success_card`
 * - bloquea si el runtime objetivo aún no contiene soporte del renderer.
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
const PRODUCTION_RUNTIME_REF = process.env.GREENHOUSE_AEO_SUCCESS_CARD_RUNTIME_REF?.trim() || 'origin/main'

const AEO_FORM_KEY = 'b120566a-dd1a-43c8-956a-4e0121e805b8'

const SUCCESS_CARD_BEHAVIOR = {
  kind: 'inline_message',
  presentation: 'success_card',
  title: 'Tu informe de visibilidad en IA va en camino',
  body: 'Recibimos tu solicitud. Lo estamos preparando y te llegará por correo apenas esté listo.',
  supportingNote: '¿No lo ves en tu bandeja? Revisa tu spam o escríbenos.',
  actions: [
    {
      kind: 'schedule',
      label: 'Agenda una conversación',
      href: 'https://meetings.hubspot.com/efeoncepro/agenda-discovery',
      target: '_blank',
    },
  ],
} as const

const stableJson = (value: unknown): string => JSON.stringify(value)

const readFileAtRef = (ref: string, filePath: string): string => {
  try {
    return execFileSync('git', ['show', `${ref}:${filePath}`], { encoding: 'utf8' })
  } catch {
    return ''
  }
}

const assertProductionRuntimeSupportsSuccessCard = (): void => {
  if (!APPLY) return

  const renderer = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/renderer.ts')
  const styles = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/styles.ts')
  const copy = readFileAtRef(PRODUCTION_RUNTIME_REF, 'src/growth-forms-renderer/copy.ts')

  const runtimeReady =
    renderer.includes("behavior.presentation === 'success_card'") &&
    renderer.includes('buildSuccessCard') &&
    styles.includes('ghf-success-card') &&
    copy.includes('successCardTitle')

  if (runtimeReady) {
    console.log(`\nRuntime guard: ${PRODUCTION_RUNTIME_REF} already contains the Growth Forms success-card renderer.`)

    return
  }

  const message =
    `AEO success-card activation would publish presentation=success_card, but ${PRODUCTION_RUNTIME_REF} does not contain ` +
    'the renderer support. Release the code first, or pass --allow-runtime-pending only with an explicit rollout blocker/rollback plan.'

  if (!ALLOW_RUNTIME_PENDING) {
    console.error(`\nFAIL: ${message}`)
    process.exit(1)
  }

  console.warn(`\nWARNING: ${message}`)
}

const main = async (): Promise<void> => {
  console.log(`Activación Success Card AEO — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}`)
  assertProductionRuntimeSupportsSuccessCard()

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
  const successAlreadyCard = stableJson(current.success_behavior_json) === stableJson(SUCCESS_CARD_BEHAVIOR)

  console.log(`\nVersión publicada vigente: ${current.form_version_id} (v${current.version})`)
  console.log(`  style_variant actual : ${current.style_variant ?? '(sin definir)'}`)
  console.log(`  destinos a copiar    : ${destinations.length}`)
  console.log(`  success objetivo     : ${JSON.stringify(SUCCESS_CARD_BEHAVIOR)}`)

  if (successAlreadyCard) {
    console.log('\nIdempotente: la versión publicada vigente ya expone la Success Card AEO. Nada que hacer.')

    return
  }

  console.log('\nPlan:')
  console.log(`  - Clonar v${current.version}`)
  console.log('  - Cambiar solo success_behavior_json a presentation=success_card')
  console.log('  - Preservar fields, validation/namePolicy, ui_policy.security.captcha, consent y policies')
  console.log(`  - Copiar ${destinations.length} destino(s) de la versión vigente`)
  console.log(`  - Publicar versión nueva + deprecar ${current.form_version_id}`)

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply después de que el runtime productivo tenga el renderer success-card.')

    return
  }

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: definition.form_kind as 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'low',
    ...preserveFormVersionFields(current),
    fieldSchema: current.field_schema_json,
    successBehavior: SUCCESS_CARD_BEHAVIOR,
    createdBy: 'aeo-success-card-activation',
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
  console.log('\nAPPLY completo. AEO queda listo para renderizar la Success Card en el runtime productivo.')
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
