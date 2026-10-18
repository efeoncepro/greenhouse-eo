import 'server-only'

/**
 * Agencia Creativa — diagnóstico creativo en dos pasos (diseño aprobado por el operador el 2026-10-15,
 * canvas «Formulario.dc.html» del artifact de la landing).
 *
 * Clona la versión publicada vigente (destinos HubSpot, seguridad, políticas y copy se preservan) y cambia sólo:
 *   - composición `multi_step_light` con dos pasos: «Tu operación» (qué te frena, equipo, plazo) y «Tus datos»;
 *   - las tres preguntas del paso 1 pasan de `select` a `radio` (opciones visibles; mismos `value`, así que
 *     HubSpot y la medición reciben lo mismo);
 *   - íconos de etiqueta y placeholders de teléfono y empresa.
 *
 * Guardas (cada `--apply` las vuelve a medir; si el estado se movió, aborta):
 *   1. la versión publicada es la esperada (`EXPECTED_CURRENT_VERSION_ID`) y sus campos son los conocidos;
 *   2. el renderer de PRODUCCIÓN ya trae el commit ab622e958 (radio como tarjetas en cualquier estilo). Sin él,
 *      un `radio` con `diagnostic_premium` se dibuja como una caja de texto vacía.
 *
 * Después de publicar: la política publicitaria está atada a la versión exacta (`sourceVersion`), así que hay que
 * revincularla con `pnpm --silent growth:measurement` (runbook docs/reference/measurement-gtm-ga4/
 * 10-growth-lead-matching-runtime.md) y luego verificar en vivo las dos landings.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-creative-diagnostic-two-step.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-creative-diagnostic-two-step.ts --apply
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getPublishedVersionBySlug, listDestinationsForVersion } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-creative-diagnostic'
const EXPECTED_CURRENT_VERSION_ID = 'fver-79bbb3b4-a66e-4e23-9465-5344e6454b6d'
const PRODUCTION_RENDERER_URL = 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js'

/** CSS that only exists in a renderer built from ab622e958 or later. */
const RENDERER_RELEASE_MARKER = '.ghf-root:not([data-ghf-style-variant="hubspot_pillar"]) label.ghf-choice'

const STEP_ONE = ['mainBlocker', 'marketingTeamSize', 'startTimeline']
const STEP_TWO = ['firstName', 'lastName', 'email', 'phone', 'companyName', 'role', 'context']
const KNOWN_KEYS = [...STEP_ONE, ...STEP_TWO].sort().join('|')

const ICONS: Record<string, string> = {
  firstName: 'user',
  lastName: 'user',
  email: 'mail',
  phone: 'phone',
  companyName: 'briefcase',
  role: 'user',
  context: 'message'
}

type Field = Record<string, unknown> & { key: string; type: string }

const nextFieldSchema = (current: Field[]): Field[] => {
  const byKey = new Map(current.map(field => [field.key, field]))

  return [...STEP_ONE, ...STEP_TWO].map(key => {
    const field = { ...(byKey.get(key) as Field) }

    if (STEP_ONE.includes(key)) {
      field.type = 'radio'
      delete field.placeholder
    }

    if (ICONS[key]) field.presentation = { ...((field.presentation as object | undefined) ?? {}), icon: ICONS[key] }
    if (key === 'phone') field.placeholder = '9 1234 5678'
    if (key === 'companyName') field.placeholder = 'Tu empresa o tuempresa.com'

    return field
  })
}

const productionRendererReady = async () => {
  const response = await fetch(PRODUCTION_RENDERER_URL, { cache: 'no-store' })

  if (!response.ok) throw new Error(`renderer_unavailable:${response.status}`)

  return (await response.text()).includes(RENDERER_RELEASE_MARKER)
}

const main = async () => {
  const current = await getPublishedVersionBySlug(SLUG)

  if (!current) throw new Error(`No existe una versión publicada para ${SLUG}`)
  const definition = await getFormDefinitionById(current.form_id)

  if (!definition || definition.status !== 'active') throw new Error(`La definición activa de ${SLUG} no está disponible`)

  const uiPolicy = (current.ui_policy_json ?? {}) as Record<string, unknown>

  if (uiPolicy.composition === 'multi_step_light') {
    console.log(JSON.stringify({ status: 'already_applied', slug: SLUG, formVersionId: current.form_version_id }))

    return
  }

  const fields = (Array.isArray(current.field_schema_json) ? current.field_schema_json : []) as Field[]
  const keys = fields.map(field => field.key).sort().join('|')
  const rendererReady = await productionRendererReady()

  const plan = {
    status: APPLY ? 'ready_to_apply' : 'dry_run',
    slug: SLUG,
    formKey: definition.form_key,
    currentVersionId: current.form_version_id,
    expectedVersionId: EXPECTED_CURRENT_VERSION_ID,
    fieldsMatch: keys === KNOWN_KEYS,
    productionRendererReady: rendererReady,
    steps: { operacion: STEP_ONE, datos: STEP_TWO }
  }

  console.log(JSON.stringify(plan, null, 2))

  if (current.form_version_id !== EXPECTED_CURRENT_VERSION_ID) throw new Error('version_drift: inspect the published version before retrying')
  if (keys !== KNOWN_KEYS) throw new Error(`field_drift: ${keys}`)

  if (!APPLY) return
  if (!rendererReady) throw new Error('renderer_not_released: publish after the Greenhouse release that ships ab622e958')

  const destinations = await listDestinationsForVersion(current.form_version_id)

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
    ...preserveFormVersionFields(current),
    fieldSchema: nextFieldSchema(fields),
    uiPolicy: {
      ...uiPolicy,
      composition: 'multi_step_light',
      steps: [
        { key: 'operacion', label: 'Tu operación', fieldKeys: STEP_ONE },
        { key: 'datos', label: 'Tus datos', fieldKeys: STEP_TWO }
      ]
    },
    createdBy: 'operator-approved-creative-diagnostic-two-step-20261015'
  })

  for (const destination of destinations) {
    await addDestination({
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
  }

  const review = await reviewForm(formVersionId)

  if (!review.ok) throw new Error(`review_blocked:${review.blockingReasons.join('|')}`)
  const published = await publishForm(formVersionId)

  if (!published.ok) throw new Error(`publish_blocked:${published.blockingReasons.join('|')}`)
  await deprecateForm(current.form_version_id)

  console.log(
    JSON.stringify(
      {
        status: 'published',
        formVersionId,
        deprecatedVersionId: current.form_version_id,
        copiedDestinations: destinations.length,
        next: 'rebind the measurement policy to this formVersionId (pnpm --silent growth:measurement), then verify both landings live'
      },
      null,
      2
    )
  )
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Activation failed')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
