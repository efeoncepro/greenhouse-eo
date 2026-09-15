/**
 * Contacto public page conversion contracts.
 *
 * Dry-run by default. `--apply` creates the dedicated Growth Form + host surface,
 * copies the live HubSpot adapter policy while targeting the current Contact Form,
 * and publishes a Growth CTA that opens the already-active native scheduler.
 */
import { chmod, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import {
  addDestination,
  authorDraftForm,
  createHostSurface,
  publishForm,
  reviewForm,
  setSurfaceEmbedKey,
} from '@/lib/growth/forms/commands'
import {
  getFormDefinitionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
} from '@/lib/growth/forms/store'
import {
  authorDraftCta,
  publishCtaVersion,
  registerCtaSurface,
  rotateCtaSurfaceEmbedKey,
  submitCtaReview,
} from '@/lib/growth/ctas/commands'
import { getArbitratedRenderContracts } from '@/lib/growth/ctas/readers'
import { getCtaDefinitionBySlug, listSurfaceBindings, listVersionsForCta } from '@/lib/growth/ctas/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const FORM_SLUG = 'efeonce-contacto'
const FORM_SURFACE_ID = 'fhsf-efeonce-contacto'
const CTA_SLUG = 'contacto-discovery-meeting'
const CTA_SURFACE_NAME = 'Efeonce contacto (WordPress)'
const CURRENT_HUBSPOT_FORM_GUID = '8bee8dca-27f2-4ca5-ac09-7606351c7e72'
const SECRET_PATH = path.resolve('.auth/task1801-contacto-surfaces.json')

const fields = [
  {
    key: 'contactReason',
    type: 'radio',
    label: 'Motivo de contacto',
    required: true,
    options: [
      { value: 'Quiero una solución para mi empresa', label: 'Quiero una solución para mi empresa' },
      { value: 'Quiero ser parte del equipo', label: 'Quiero ser parte del equipo' },
      { value: 'Tengo una consulta técnica', label: 'Tengo una consulta técnica' },
      { value: 'Quiero una alianza o colaboración', label: 'Quiero una alianza o colaboración' },
      { value: 'Medios de comunicación', label: 'Medios de comunicación' },
      { value: 'Otro motivo', label: 'Otro motivo' },
    ],
  },
  {
    key: 'subject',
    type: 'text',
    label: 'Asunto',
    required: true,
    maxLength: 180,
    placeholder: 'Resume tu mensaje en pocas palabras',
  },
  {
    key: 'message',
    type: 'textarea',
    label: 'Mensaje',
    required: true,
    maxLength: 2400,
    placeholder: 'Cuéntanos los detalles. ¿En qué podemos ayudarte?',
  },
  {
    key: 'fullName',
    type: 'text',
    label: 'Tu nombre',
    required: true,
    maxLength: 120,
    validator: 'text',
    autocomplete: 'name',
    placeholder: 'Nombre y apellido',
  },
  {
    key: 'email',
    type: 'email',
    label: 'Tu correo electrónico',
    required: true,
    maxLength: 200,
    validator: 'email_syntax',
    autocomplete: 'email',
    placeholder: 'tu@empresa.cl',
  },
  {
    key: 'phone',
    type: 'tel',
    label: 'Teléfono',
    required: true,
    maxLength: 40,
    validator: 'e164_phone',
    autocomplete: 'tel',
    validatorParams: { country: 'CL' },
  },
  {
    key: 'country',
    type: 'text',
    label: 'País',
    maxLength: 100,
    autocomplete: 'country-name',
    placeholder: 'Chile',
  },
  {
    key: 'companyName',
    type: 'text',
    label: 'Empresa u organización',
    maxLength: 180,
    autocomplete: 'organization',
    placeholder: 'Nombre de tu empresa u organización',
  },
]

async function writeSecrets(payload: Record<string, string>) {
  await mkdir(path.dirname(SECRET_PATH), { recursive: true, mode: 0o700 })
  await writeFile(SECRET_PATH, `${JSON.stringify(payload)}\n`, { mode: 0o600 })
  await chmod(SECRET_PATH, 0o600)
}

async function publishContactForm() {
  const existing = await getPublishedVersionBySlug(FORM_SLUG)

  if (existing) {
    const definition = await getFormDefinitionById(existing.form_id)

    
return { formKey: definition?.form_key ?? '', version: existing.form_version_id, status: 'already_published' }
  }

  const source = await getPublishedVersionBySlug('efeonce-lead-gen-web')

  if (!source) throw new Error('Source lead-gen Growth Form is not published')
  const sourceDestinations = await listDestinationsForVersion(source.form_version_id)
  const hubspot = sourceDestinations.find(destination => destination.provider === 'hubspot' && destination.enabled)

  if (!hubspot) throw new Error('Source HubSpot destination is not enabled')

  const authored = await authorDraftForm({
    slug: FORM_SLUG,
    name: 'Contacto Efeonce',
    formKind: 'contact',
    purpose: 'Recibir y orientar mensajes enviados desde la página pública de contacto de Efeonce.',
    locale: 'es-CL',
    riskProfile: 'medium',
    fieldSchema: fields,
    styleVariant: 'hubspot_pillar',
    validationSchema: {
      emailPolicy: { mode: 'allow_all', field: 'email' },
      namePolicy: {
        mode: 'split_full_name',
        sourceField: 'fullName',
        firstNameField: 'firstName',
        lastNameField: 'lastName',
        confidenceField: 'nameParseConfidence',
      },
    },
    uiPolicy: {
      composition: 'static',
      security: {
        captcha: {
          provider: 'turnstile',
          required: true,
          mode: 'invisible',
          siteKey: '0x4AAAAAADqwX2R7v-k9pItv',
          execution: 'submit',
        },
      },
    },
    copyRefs: {
      copy: { submit: 'Enviar mensaje →' },
      checkboxes: [
        {
          key: 'contact_permission',
          label: 'Autorizo a Efeonce a contactarme para responder esta solicitud.',
          required: true,
        },
        {
          key: 'marketing_updates',
          label: 'Quiero recibir novedades de Efeonce.',
          required: false,
        },
      ],
      noticeText: 'Usamos tus datos para responder esta solicitud.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      title: 'Mensaje recibido.',
      body: 'Gracias por escribirnos. Revisaremos tu mensaje y lo conectaremos con la persona o el equipo adecuado.',
      supportingNote: 'Conserva el comprobante que aparece a continuación.',
      steps: [],
      actions: [],
    },
    consentPolicyVersion: 'efeonce-contacto-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'],
      persistenceMode: 'normalized_only',
    },
    destinationPolicy: {
      mode: 'hubspot_direct',
      note: 'HubSpot Contact Form - EO remains the external CRM destination; Greenhouse owns validation and receipts.',
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'public_contact', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'contacto-publico' },
    createdBy: 'contacto-public-page-20260915',
  })

  const sourceMapping = (hubspot.mapping_json ?? {}) as Record<string, unknown>

  await addDestination({
    formVersionId: authored.formVersionId,
    provider: hubspot.provider,
    adapterKind: hubspot.adapter_kind,
    adapterVersion: hubspot.adapter_version,
    endpointStatus: hubspot.endpoint_status,
    deliveryMode: hubspot.delivery_mode,
    mapping: {
      ...sourceMapping,
      formGuid: CURRENT_HUBSPOT_FORM_GUID,
      fieldMapping: {
        firstName: 'firstname',
        lastName: 'lastname',
        email: 'email',
        phone: 'phone',
        companyName: 'company',
        contactReason: 'motivo_del_contacto',
        message: 'message',
      },
    },
    consentRequirements: hubspot.consent_requirements_json,
    retryPolicy: hubspot.retry_policy_json,
  })

  const review = await reviewForm(authored.formVersionId)

  if (!review.ok) throw new Error(`Form review blocked: ${review.blockingReasons.join('; ')}`)
  const published = await publishForm(authored.formVersionId)

  if (!published.ok) throw new Error(`Form publication blocked: ${published.blockingReasons.join('; ')}`)
  const definition = await getFormDefinitionById(authored.formId)

  
return { formKey: definition?.form_key ?? '', version: authored.formVersionId, status: 'published' }
}

async function ensureFormSurface() {
  let surface = await getHostSurfaceById(FORM_SURFACE_ID)

  if (!surface) {
    surface = await createHostSurface({
      surfaceId: FORM_SURFACE_ID,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público · Contacto',
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedFormSlugs: [FORM_SLUG],
      rendererChannel: 'stable',
      status: 'active',
    })
  }

  const key = await setSurfaceEmbedKey(FORM_SURFACE_ID)

  if (!key.ok) throw new Error('Could not mint Contacto form surface key')
  
return { surfaceId: FORM_SURFACE_ID, embedKeyId: key.embedKeyId, embedKey: key.secret }
}

async function publishMeetingCta() {
  const definition = await getCtaDefinitionBySlug(CTA_SLUG)
  const versions = definition ? await listVersionsForCta(definition.cta_id) : []

  if (!versions.some(version => version.status === 'published')) {
    const authored = await authorDraftCta({
      slug: CTA_SLUG,
      name: 'Agenda nativa — Contacto',
      purpose: 'Abrir el scheduler nativo desde la página pública de contacto sin exponer al proveedor.',
      ownerTeam: 'growth',
      campaignSlug: 'contacto',
      placement: 'embedded',
      styleVariant: 'spotlight',
      content: {
        eyebrow: 'Reuniones',
        headline: 'Avancemos juntos',
        body: 'Elige un horario y conversemos sobre tu proyecto, idea o desafío.',
        ctaLabel: 'Ver horarios →',
        dismissLabel: 'Cerrar',
        footnote: 'Agenda según disponibilidad del equipo.',
      },
      actionPolicy: {
        kind: 'open_meeting_scheduler',
        meetingSurfaceId: 'fhsf-efeonce-lead-gen-web',
        schedulerKey: 'discovery',
      },
      targetingPolicy: { routes: ['/contacto/'], excludeRoutes: [] },
      priorityPolicy: { score: 200 },
      createdBy: 'contacto-public-page-20260915',
    })

    if (!authored.ok) throw new Error(`CTA authoring failed: ${authored.details.join(', ')}`)
    const review = await submitCtaReview(authored.ctaVersionId)

    if (!review.ok) throw new Error(`CTA review failed: ${review.reason}`)
    const published = await publishCtaVersion(authored.ctaVersionId)

    if (!published.ok) throw new Error(`CTA publication failed: ${published.reason}`)
  }

  const bindings = await listSurfaceBindings()
  const existing = bindings.find(binding => binding.surface_name === CTA_SURFACE_NAME)

  if (existing) {
    const rotated = await rotateCtaSurfaceEmbedKey(existing.surface_id)

    if (!rotated.ok) throw new Error('Could not rotate Contacto CTA surface key')
    
return { surfaceId: existing.surface_id, embedKeyId: rotated.embedKeyId, embedKey: rotated.embedKeySecret }
  }

  const registered = await registerCtaSurface({
    surfaceKind: 'wordpress',
    surfaceName: CTA_SURFACE_NAME,
    originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
    allowedCtaSlugs: [CTA_SLUG],
  })

  
return { surfaceId: registered.surfaceId, embedKeyId: registered.embedKeyId, embedKey: registered.embedKeySecret }
}

async function main() {
  const plan = {
    apply: APPLY,
    formSlug: FORM_SLUG,
    formSurfaceId: FORM_SURFACE_ID,
    hubspotForm: 'Contact Form - EO',
    fields: fields.map(field => field.key),
    ctaSlug: CTA_SLUG,
    meetingBinding: { surfaceId: 'fhsf-efeonce-lead-gen-web', schedulerKey: 'discovery' },
  }

  if (!APPLY) {
    console.log(JSON.stringify({ status: 'dry_run', ...plan }, null, 2))
    
return
  }

  const form = await publishContactForm()
  const formSurface = await ensureFormSurface()
  const ctaSurface = await publishMeetingCta()

  await writeSecrets({
    formSurfaceId: formSurface.surfaceId,
    formEmbedKeyId: formSurface.embedKeyId,
    formEmbedKey: formSurface.embedKey,
    ctaSurfaceId: ctaSurface.surfaceId,
    ctaEmbedKeyId: ctaSurface.embedKeyId,
    ctaEmbedKey: ctaSurface.embedKey,
  })

  process.env.GROWTH_CTA_ENGINE_ENABLED = 'true'

  const ctaReadback = await getArbitratedRenderContracts({
    surfaceId: ctaSurface.surfaceId,
    embedKey: ctaSurface.embedKey,
    origin: 'https://efeoncepro.com',
    route: '/contacto/',
  })

  if (ctaReadback.outcome !== 'ok') throw new Error(`CTA readback failed: ${ctaReadback.outcome}`)
  const meeting = ctaReadback.result.nonInterruptive.find(item => item.cta.slug === CTA_SLUG)

  if (!meeting || meeting.action.kind !== 'open_meeting_scheduler') throw new Error('CTA did not resolve native scheduler')

  console.log(
    JSON.stringify({
      status: 'published_verified',
      formSlug: FORM_SLUG,
      formKey: form.formKey,
      formVersion: form.version,
      formSurfaceId: formSurface.surfaceId,
      ctaSlug: CTA_SLUG,
      ctaSurfaceId: ctaSurface.surfaceId,
      actionKind: meeting.action.kind,
      schedulerKey: meeting.action.schedulerKey,
      secretsStored: SECRET_PATH,
    }, null, 2),
  )
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Contacto conversion contract failed')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
