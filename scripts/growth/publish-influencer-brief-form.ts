import 'server-only'

import {
  addDestination,
  authorDraftForm,
  createHostSurface,
  publishForm,
  reviewForm
} from '@/lib/growth/forms/commands'
import {
  getFormDefinitionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  listDestinationsForVersion
} from '@/lib/growth/forms/store'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-creator-influence-brief'
const SURFACE_ID = 'fhsf-efeonce-creator-influence'

const fieldSchema = [
  {
    key: 'fullName',
    type: 'text',
    label: 'Nombre completo',
    required: true,
    maxLength: 120,
    placeholder: 'Tu nombre',
    autocomplete: 'name',
    validator: 'text'
  },
  {
    key: 'email',
    type: 'email',
    label: 'Correo de trabajo',
    required: true,
    inputMode: 'email',
    validator: 'corporate_email',
    placeholder: 'nombre@empresa.com',
    autocomplete: 'email'
  },
  {
    key: 'companyName',
    type: 'text',
    label: 'Empresa',
    required: true,
    maxLength: 140,
    placeholder: 'Nombre de tu empresa',
    autocomplete: 'organization',
    validator: 'text'
  },
  {
    key: 'market',
    type: 'select',
    label: 'Mercado principal',
    required: true,
    placeholder: 'Selecciona un mercado',
    options: [
      { value: 'cl', label: 'Chile' },
      { value: 'co', label: 'Colombia' },
      { value: 'mx', label: 'México' },
      { value: 'pe', label: 'Perú' },
      { value: 'regional', label: 'Regional / varios mercados' },
      { value: 'otro', label: 'Otro mercado' }
    ]
  },
  {
    key: 'activationType',
    type: 'select',
    label: '¿Qué quieres activar?',
    required: true,
    placeholder: 'Selecciona una opción',
    options: [
      { value: 'influencer-marketing', label: 'Campaña con influencers' },
      { value: 'ugc', label: 'Contenido UGC para la marca' },
      { value: 'creator-partnership', label: 'Partnership con creators' },
      { value: 'paid-whitelisting', label: 'Paid usage o whitelisting' },
      { value: 'estrategia', label: 'Necesito definir la estrategia' }
    ]
  },
  {
    key: 'objective',
    type: 'textarea',
    label: 'Cuéntanos el objetivo y el contexto',
    required: true,
    maxLength: 700,
    placeholder: 'Qué quieres lograr, plazo aproximado y cualquier restricción importante.'
  }
] as const

const main = async () => {
  const current = await getPublishedVersionBySlug(SLUG)

  if (current) {
    const definition = await getFormDefinitionById(current.form_id)

    console.log(
      JSON.stringify({ status: 'already_published', slug: SLUG, formKey: definition?.form_key, surfaceId: SURFACE_ID })
    )

    return
  }

  if (!APPLY) {
    console.log(
      JSON.stringify({
        status: 'dry_run',
        slug: SLUG,
        surfaceId: SURFACE_ID,
        fields: fieldSchema.map(field => field.key)
      })
    )

    return
  }

  if (!(await getHostSurfaceById(SURFACE_ID))) {
    await createHostSurface({
      surfaceId: SURFACE_ID,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público — Influencer Marketing, Creators y UGC',
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG,
    name: 'Brief de Influencer Marketing, Creators y UGC',
    formKind: 'quote_request',
    purpose:
      'Calificar solicitudes de campañas con influencers, UGC, creators, paid usage y whitelisting en Chile, Colombia, México y Perú.',
    riskProfile: 'medium',
    locale: 'es-CL',
    fieldSchema,
    validationSchema: {
      emailPolicy: { mode: 'block_field', field: 'email' },
      namePolicy: {
        mode: 'split_full_name',
        sourceField: 'fullName',
        firstNameField: 'firstName',
        lastNameField: 'lastName',
        confidenceField: 'nameParseConfidence'
      }
    },
    copyRefs: {
      copy: {
        submit: 'Enviar mi brief →',
        'email.help': 'Usa tu correo de trabajo para responderte con contexto real.',
        'market.help': 'Si son varios países, elige la opción regional.',
        'activationType.help': 'No necesitas conocer la solución exacta; puedes pedirnos que definamos la estrategia.',
        'objective.help': 'Una síntesis clara basta. Evita datos sensibles o confidenciales.',
        'fullName.error.required': 'Escribe tu nombre para personalizar la respuesta.',
        'email.error.required': 'Necesitamos tu correo de trabajo para responder el brief.',
        'email.error.email_not_corporate': 'Usa un correo de empresa para continuar.',
        'companyName.error.required': 'Indica la empresa para contextualizar la solicitud.',
        'market.error.required': 'Selecciona el mercado principal.',
        'activationType.error.required': 'Selecciona qué quieres activar.',
        'objective.error.required': 'Cuéntanos el objetivo principal de la campaña.'
      },
      checkboxes: [
        { key: 'contact_permission', label: 'Autorizo a Efeonce a contactarme sobre esta solicitud.', required: true }
      ],
      noticeText:
        'Usaremos estos datos para revisar tu brief y responder la solicitud. No vendemos ni exponemos tu información.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    },
    uiPolicy: {
      composition: 'static',
      security: {
        captcha: {
          provider: 'turnstile',
          required: true,
          mode: 'invisible',
          siteKey: '0x4AAAAAADqwX2R7v-k9pItv',
          execution: 'submit'
        }
      }
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      title: 'Recibimos tu brief',
      body: 'Lo revisaremos y te responderemos con el siguiente paso adecuado para tu objetivo.',
      supportingNote:
        'Si tu proyecto requiere una conversación inmediata, también puedes abrir la agenda de Efeonce en esta página.',
      steps: [],
      actions: []
    },
    consentPolicyVersion: 'efeonce-creator-influence-brief-consent-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'hubspot_shadow_until_cutover',
      note: 'La submission queda aceptada en Greenhouse; entrega directa HubSpot conserva el gate vigente del sitio público.',
      source: 'efeonce-social-audit',
      deliveryMode: 'disabled'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_creator_influence_brief', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { sla: '1 día hábil', owner: 'efeonce-growth', source: 'influencer-marketing' },
    createdBy: 'task-1598-publish-influencer-brief'
  })

  const source = await getPublishedVersionBySlug('efeonce-social-audit')

  if (source) {
    const destinations = await listDestinationsForVersion(source.form_version_id)

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
  }

  const review = await reviewForm(formVersionId)

  if (!review.ok) throw new Error(`review_blocked:${review.blockingReasons.join('|')}`)
  const published = await publishForm(formVersionId)

  if (!published.ok) throw new Error(`publish_blocked:${published.blockingReasons.join('|')}`)
  const definition = await getFormDefinitionById(formId)

  console.log(
    JSON.stringify({
      status: 'published',
      slug: SLUG,
      formKey: definition?.form_key,
      formVersionId,
      surfaceId: SURFACE_ID
    })
  )
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
