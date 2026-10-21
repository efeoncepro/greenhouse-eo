import 'server-only'

/**
 * Agencia de Medios — «¿Cómo vendes?» e «Inversión mensual en medios» como listas desplegables premium
 * (diseño aprobado, canvas `Main.dc.html` de la landing, 2026-10-16).
 *
 * El formulario usa `hubspot_pillar` porque es la única variante que dibuja «Dónde pautas hoy»
 * (`multiselect`) como chips. En pillar un `select` sin control también sale como chips; el renderer
 * nuevo acepta `presentation.control: 'premium_select'` para pedir el listbox premium en un `select`
 * de cualquier variante. Este script clona la versión publicada vigente (destinos HubSpot, seguridad,
 * políticas, copy y variante se preservan) y sólo agrega ese control a `salesModel` y
 * `monthlyMediaBudget`. Los `value` no cambian, así que HubSpot y la medición reciben lo mismo.
 *
 * Guardas (cada `--apply` las vuelve a medir; si el estado se movió, aborta):
 *   1. la versión publicada es la esperada (`EXPECTED_CURRENT_VERSION_ID`), sus campos son los conocidos y
 *      los dos campos objetivo siguen siendo `select` con los mismos valores de opción;
 *   2. el renderer de PRODUCCIÓN ya trae el soporte de `premium_select`. Sin él, el control se ignora y los
 *      campos siguen como chips (no rompe, pero publicar sería prometer un diseño que no se ve).
 *
 * Después de publicar: si existe una política de medición atada a la versión (`sourceVersion`), revincularla
 * con `pnpm --silent growth:measurement`; luego verificar en vivo la landing a 1440 y 390 sin enviar.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-media-diagnostic-premium-select.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-media-diagnostic-premium-select.ts --apply
 */

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getPublishedVersionBySlug, listDestinationsForVersion } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-media-diagnostic'
const EXPECTED_CURRENT_VERSION_ID = 'fver-d448c02d-9fda-4612-9ba8-5bebd4a5139f'
const PRODUCTION_RENDERER_URL = 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js'

/** String literal that only exists in a renderer built with `presentation.control: 'premium_select'` support. */
const RENDERER_RELEASE_MARKER = '"premium_select"'

const CONTROL = 'premium_select'

const KNOWN_KEYS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'companyName',
  'jobTitle',
  'country',
  'salesModel',
  'mediaChannels',
  'monthlyMediaBudget',
  'context'
]
  .sort()
  .join('|')

/** Campos objetivo y sus valores de opción esperados (estables: HubSpot ya los mapea). */
const TARGETS: Record<string, string[]> = {
  salesModel: ['online-or-stores', 'b2b', 'both', 'not-sure'],
  monthlyMediaBudget: ['under-3k-usd', '3k-10k-usd', '10k-50k-usd', 'over-50k-usd', 'to-be-defined']
}

type Field = Record<string, unknown> & {
  key: string
  type: string
  options?: Array<{ value: string }>
  presentation?: Record<string, unknown>
}

const optionValues = (field?: Field) => (field?.options ?? []).map(option => option.value).join('|')

const targetsMatch = (fields: Field[]) =>
  Object.entries(TARGETS).every(([key, values]) => {
    const field = fields.find(candidate => candidate.key === key)

    return field?.type === 'select' && optionValues(field) === values.join('|')
  })

const alreadyApplied = (fields: Field[]) =>
  Object.keys(TARGETS).every(key => fields.find(field => field.key === key)?.presentation?.control === CONTROL)

const nextFieldSchema = (current: Field[]): Field[] =>
  current.map(field =>
    TARGETS[field.key] ? { ...field, presentation: { ...(field.presentation ?? {}), control: CONTROL } } : { ...field }
  )

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

  const fields = (Array.isArray(current.field_schema_json) ? current.field_schema_json : []) as Field[]

  if (alreadyApplied(fields)) {
    console.log(JSON.stringify({ status: 'already_applied', slug: SLUG, formVersionId: current.form_version_id }))

    return
  }

  const keys = fields.map(field => field.key).sort().join('|')
  const rendererReady = await productionRendererReady()

  const plan = {
    status: APPLY ? 'ready_to_apply' : 'dry_run',
    slug: SLUG,
    formKey: definition.form_key,
    styleVariant: current.style_variant,
    currentVersionId: current.form_version_id,
    expectedVersionId: EXPECTED_CURRENT_VERSION_ID,
    fieldsMatch: keys === KNOWN_KEYS,
    targetsMatch: targetsMatch(fields),
    productionRendererReady: rendererReady,
    change: Object.keys(TARGETS).map(key => `${key}: presentation.control=${CONTROL}`)
  }

  console.log(JSON.stringify(plan, null, 2))

  if (current.form_version_id !== EXPECTED_CURRENT_VERSION_ID) throw new Error('version_drift: inspect the published version before retrying')
  if (keys !== KNOWN_KEYS) throw new Error(`field_drift: ${keys}`)
  if (!plan.targetsMatch) throw new Error('target_field_drift: salesModel/monthlyMediaBudget changed type or option values')

  if (!APPLY) return
  if (!rendererReady) throw new Error('renderer_not_released: publish after the Greenhouse release that ships premium_select')

  const destinations = await listDestinationsForVersion(current.form_version_id)

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: 'diagnostic_intake',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
    ...preserveFormVersionFields(current),
    fieldSchema: nextFieldSchema(fields),
    createdBy: 'operator-approved-media-diagnostic-premium-select-20261018'
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
        next: 'if a measurement policy is bound to the previous version, rebind it (pnpm --silent growth:measurement); then verify the landing live at 1440 and 390 without submitting'
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
