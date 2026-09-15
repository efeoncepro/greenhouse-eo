import 'server-only'

/**
 * Revisión editorial + UX writing de Contacto.
 *
 * Dry-run por defecto. El apply conserva identidad, valores enviados, validación,
 * seguridad, destinos y policies; publica una versión nueva y depreca la anterior.
 */
import assert from 'node:assert/strict'

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getPublishedRenderContractByRef } from '@/lib/growth/forms/readers'
import {
  getFormDefinitionBySlug,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  listDestinationsForVersion
} from '@/lib/growth/forms/store'
import { authorDraftCta, publishCtaVersion, submitCtaReview } from '@/lib/growth/ctas/commands'
import { getCtaDefinitionBySlug, listVersionsForCta } from '@/lib/growth/ctas/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const FORM_SLUG = 'efeonce-contacto'
const FORM_SURFACE_ID = 'fhsf-efeonce-contacto'
const CTA_SLUG = 'contacto-discovery-meeting'

const fieldCopy: Record<string, { label?: string; placeholder?: string }> = {
  contactReason: { label: 'Motivo de tu mensaje' },
  subject: { label: 'Asunto', placeholder: 'Resume el tema de tu consulta' },
  message: { label: 'Mensaje', placeholder: 'Cuéntanos el contexto, qué necesitas y cómo podemos ayudarte.' },
  fullName: { label: 'Nombre y apellido', placeholder: 'Escribe tu nombre completo' },
  email: { label: 'Correo electrónico', placeholder: 'nombre@empresa.cl' },
  phone: { label: 'Teléfono de contacto' },
  country: { label: 'País', placeholder: 'Chile' },
  companyName: { label: 'Empresa u organización', placeholder: 'Nombre de tu empresa u organización' }
}

const optionLabels: Record<string, string> = {
  'Quiero una solución para mi empresa': 'Necesito una solución para mi empresa',
  'Quiero ser parte del equipo': 'Quiero trabajar en Efeonce',
  'Tengo una consulta técnica': 'Necesito soporte técnico',
  'Quiero una alianza o colaboración': 'Quiero proponer una alianza',
  'Medios de comunicación': 'Tengo una consulta de prensa o medios',
  'Otro motivo': 'Tengo otro motivo'
}

const meetingContent = {
  eyebrow: 'Reuniones',
  headline: 'Conversemos sobre tu próximo desafío',
  body: 'Elige el tipo de reunión y un horario disponible para conversar con nuestro equipo.',
  ctaLabel: 'Agendar una reunión →',
  dismissLabel: 'Cerrar',
  footnote: 'Horarios sujetos a disponibilidad del equipo.'
}

async function reviseForm() {
  const definition = await getFormDefinitionBySlug(FORM_SLUG)
  const surface = await getHostSurfaceById(FORM_SURFACE_ID)
  const current = await getPublishedVersionBySlug(FORM_SLUG)

  assert(definition?.status === 'active', 'La definición de Contacto no está activa')
  assert(surface?.status === 'active', 'La surface de Contacto no está activa')
  assert(current, 'Contacto no tiene versión publicada')

  const fields = structuredClone(current.field_schema_json) as Array<Record<string, unknown>>

  for (const field of fields) {
    const key = String(field.key)

    if (fieldCopy[key]) Object.assign(field, fieldCopy[key])

    if (key === 'contactReason' && Array.isArray(field.options)) {
      field.options = field.options.map(option => {
        const item = option as Record<string, unknown>
        const value = String(item.value)

        return { ...item, label: optionLabels[value] ?? item.label }
      })
    }
  }

  const copyRefs = {
    ...(current.copy_refs_json as Record<string, unknown>),
    copy: { submit: 'Enviar mi mensaje →' },
    checkboxes: [
      {
        key: 'contact_permission',
        label: 'Acepto que Efeonce use mis datos para responder este mensaje.',
        required: true
      },
      {
        key: 'marketing_updates',
        label: 'Quiero recibir novedades y contenidos de Efeonce.',
        required: false
      }
    ],
    noticeText: 'Usaremos tus datos para responder este mensaje.',
    privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
  }

  const successBehavior = {
    ...(current.success_behavior_json as Record<string, unknown>),
    kind: 'inline_message',
    presentation: 'success_card',
    title: 'Recibimos tu mensaje',
    body: 'Gracias por escribirnos. Lo revisaremos y lo dirigiremos al equipo adecuado.',
    supportingNote: 'Guarda el comprobante que aparece a continuación.'
  }

  const destinations = await listDestinationsForVersion(current.form_version_id)

  const formAlreadyMatches =
    JSON.stringify(current.field_schema_json) === JSON.stringify(fields) &&
    JSON.stringify(current.copy_refs_json) === JSON.stringify(copyRefs) &&
    JSON.stringify(current.success_behavior_json) === JSON.stringify(successBehavior)

  if (formAlreadyMatches) {
    return {
      status: 'already_published',
      formKey: definition.form_key,
      version: current.form_version_id,
      submit: 'Enviar mi mensaje →'
    }
  }

  if (!APPLY) {
    return {
      status: 'dry_run_verified',
      formKey: definition.form_key,
      previous: current.form_version_id,
      nextFields: fields.map(field => ({ key: field.key, label: field.label, placeholder: field.placeholder })),
      optionLabels,
      submit: 'Enviar mi mensaje →',
      destinations: destinations.length
    }
  }

  const authored = await authorDraftForm({
    slug: definition.slug,
    formKey: definition.form_key,
    name: definition.name,
    formKind: definition.form_kind as Parameters<typeof authorDraftForm>[0]['formKind'],
    purpose: definition.purpose,
    riskProfile: definition.risk_profile as Parameters<typeof authorDraftForm>[0]['riskProfile'],
    ...preserveFormVersionFields(current),
    fieldSchema: fields,
    copyRefs,
    successBehavior,
    createdBy: 'contacto-copy-review-20260915'
  })

  for (const destination of destinations) {
    await addDestination({
      formVersionId: authored.formVersionId,
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

  const review = await reviewForm(authored.formVersionId)

  assert(review.ok, `Revisión bloqueada: ${review.blockingReasons.join('; ')}`)
  assert.equal(
    (await getPublishedVersionBySlug(FORM_SLUG))?.form_version_id,
    current.form_version_id,
    'La versión publicada cambió durante el apply'
  )
  const published = await publishForm(authored.formVersionId)

  assert(published.ok, `Publicación bloqueada: ${published.blockingReasons.join('; ')}`)
  await deprecateForm(current.form_version_id)

  const contract = await getPublishedRenderContractByRef(definition.form_key, {
    surfaceId: FORM_SURFACE_ID,
    origin: 'https://efeoncepro.com'
  })

  assert(contract, 'No hubo readback del contrato público')
  assert.equal(contract.copy?.submit, 'Enviar mi mensaje →')

  return {
    status: 'published_verified',
    formKey: definition.form_key,
    previous: current.form_version_id,
    version: authored.formVersionId,
    submit: contract.copy?.submit
  }
}

async function reviseMeetingCta() {
  const definition = await getCtaDefinitionBySlug(CTA_SLUG)

  assert(definition?.status === 'active', 'El CTA de agenda no está activo')
  const versions = await listVersionsForCta(definition.cta_id)
  const current = versions.find(version => version.status === 'published')

  assert(current, 'El CTA de agenda no tiene versión publicada')

  if (!APPLY) {
    return { status: 'dry_run_verified', previous: current.cta_version_id, content: meetingContent }
  }

  const matchingDraft = versions.find(
    version => version.status === 'draft' && JSON.stringify(version.content_json) === JSON.stringify(meetingContent)
  )

  let ctaVersionId = matchingDraft?.cta_version_id

  if (!ctaVersionId) {
    const authored = await authorDraftCta({
      slug: definition.slug,
      name: definition.name,
      purpose: definition.purpose,
      ownerTeam: definition.owner_team,
      campaignSlug: definition.campaign_slug,
      locale: current.locale,
      placement: current.placement as Parameters<typeof authorDraftCta>[0]['placement'],
      styleVariant: current.style_variant,
      content: meetingContent,
      visualAssetRef: current.visual_asset_ref,
      actionPolicy: current.action_policy_json as Record<string, unknown>,
      targetingPolicy: current.targeting_policy_json as Record<string, unknown>,
      suppressionPolicy: current.suppression_policy_json as Record<string, unknown>,
      priorityPolicy: current.priority_policy_json as Record<string, unknown>,
      createdBy: 'contacto-copy-review-20260915'
    })

    if (!authored.ok) throw new Error(`No se pudo autorar el CTA: ${authored.details.join(', ')}`)
    ctaVersionId = authored.ctaVersionId
  }

  const review = await submitCtaReview(ctaVersionId)

  assert(review.ok, 'La revisión del CTA fue bloqueada')
  const published = await publishCtaVersion(ctaVersionId)

  if (!published.ok) throw new Error(`La publicación del CTA fue bloqueada: ${published.reason}`)

  return { status: 'published_verified', previous: current.cta_version_id, version: ctaVersionId }
}

async function main() {
  const form = await reviseForm()
  const cta = await reviseMeetingCta()

  console.log(JSON.stringify({ apply: APPLY, form, cta }, null, 2))
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'La revisión de copy se detuvo')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
