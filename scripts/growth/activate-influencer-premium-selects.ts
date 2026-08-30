import 'server-only'

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionById,
  getPublishedVersionBySlug,
  listDestinationsForVersion
} from '@/lib/growth/forms/store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-creator-influence-brief'
const STYLE_VARIANT = 'diagnostic_premium'

const main = async () => {
  const current = await getPublishedVersionBySlug(SLUG)

  if (!current) throw new Error(`No existe una versión publicada para ${SLUG}`)
  const definition = await getFormDefinitionById(current.form_id)

  if (!definition || definition.status !== 'active') {
    throw new Error(`La definición activa de ${SLUG} no está disponible`)
  }

  const fields = Array.isArray(current.field_schema_json) ? current.field_schema_json : []

  const selectKeys = fields
    .filter(field => field && typeof field === 'object' && (field as Record<string, unknown>).type === 'select')
    .map(field => (field as Record<string, unknown>).key)

  if (selectKeys.join('|') !== 'market|activationType') {
    throw new Error(`El contrato de selects cambió: ${selectKeys.join(', ') || '(ninguno)'}`)
  }

  console.log(
    JSON.stringify(
      {
        status: current.style_variant === STYLE_VARIANT ? 'already_applied' : APPLY ? 'ready_to_apply' : 'dry_run',
        slug: SLUG,
        formKey: definition.form_key,
        currentVersionId: current.form_version_id,
        currentVersion: current.version,
        currentStyleVariant: current.style_variant,
        targetStyleVariant: STYLE_VARIANT,
        selectKeys
      },
      null,
      2
    )
  )

  if (current.style_variant === STYLE_VARIANT || !APPLY) return
  const destinations = await listDestinationsForVersion(current.form_version_id)

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: 'quote_request',
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'medium',
    ...preserveFormVersionFields(current),
    fieldSchema: current.field_schema_json,
    styleVariant: STYLE_VARIANT,
    createdBy: 'task-1598-influencer-premium-selects'
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

  if (!review.ok) throw new Error(`Revisión bloqueada: ${review.blockingReasons.join('|')}`)
  const published = await publishForm(formVersionId)

  if (!published.ok) throw new Error(`Publicación bloqueada: ${published.blockingReasons.join('|')}`)
  await deprecateForm(current.form_version_id)

  console.log(
    JSON.stringify(
      {
        status: 'published',
        formVersionId,
        deprecatedVersionId: current.form_version_id,
        styleVariant: STYLE_VARIANT,
        copiedDestinations: destinations.length
      },
      null,
      2
    )
  )
}

void main().then(
  () => process.exit(0),
  error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
)
