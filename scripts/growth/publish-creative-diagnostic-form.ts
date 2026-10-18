import 'server-only'

/**
 * Publica el Growth Form «Diagnóstico creativo · Agencia Creativa» de la landing
 * https://efeoncepro.com/agencia-creativa/ (página WordPress 249582) con los commands canónicos
 * (author → review → publish). Dry-run por defecto; `--apply` crea surface + draft y publica.
 *
 * La entrega HubSpot NO se configura acá: la v1 nace `greenhouse_only` y el destino `direct`
 * se adjunta después con `pnpm growth:forms:activate-hubspot-destinations -- --only=<slug>`
 * (registro `hubspot-destinations.registry.ts`), que clona esta versión y publica la siguiente.
 * La política publicitaria se publica aparte con `pnpm --silent growth:measurement`.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-creative-diagnostic-form.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-creative-diagnostic-form.ts --apply
 */

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-creative-diagnostic'
const SURFACE_ID = 'fhsf-efeonce-creative-diagnostic'

/** Versión publicada de la que se copia la política Turnstile (nunca de credenciales locales). */
const SECURITY_REFERENCE_SLUG = 'efeonce-seo-diagnostic'

const fieldSchema = [
  {
    key: 'firstName',
    type: 'text',
    label: 'Nombre',
    required: true,
    maxLength: 80,
    placeholder: 'Tu nombre',
    autocomplete: 'given-name',
    validator: 'text'
  },
  {
    key: 'lastName',
    type: 'text',
    label: 'Apellido',
    required: true,
    maxLength: 80,
    placeholder: 'Tu apellido',
    autocomplete: 'family-name',
    validator: 'text'
  },
  {
    key: 'email',
    type: 'email',
    label: 'Email de trabajo',
    required: true,
    maxLength: 200,
    placeholder: 'nombre@empresa.com',
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'corporate_email'
  },
  {
    key: 'phone',
    type: 'tel',
    label: 'Teléfono o WhatsApp',
    required: false,
    maxLength: 40,
    autocomplete: 'tel',
    validator: 'e164_phone',
    validatorParams: { country: 'CL' }
  },
  {
    key: 'companyName',
    type: 'text',
    label: 'Empresa o sitio web',
    required: true,
    maxLength: 160,
    placeholder: 'Nombre de tu empresa o tuempresa.com',
    autocomplete: 'organization',
    validator: 'text'
  },
  {
    key: 'role',
    type: 'select',
    label: 'Tu rol',
    required: true,
    placeholder: 'Selecciona tu rol',
    options: [
      { value: 'marketing-lead', label: 'Dirección o gerencia de marketing' },
      { value: 'brand-communications', label: 'Marca o comunicaciones' },
      { value: 'content-social', label: 'Contenido o social' },
      { value: 'in-house-creative', label: 'Equipo creativo in-house' },
      { value: 'general-management', label: 'Dirección general' },
      { value: 'other', label: 'Otro' }
    ]
  },
  {
    key: 'mainBlocker',
    type: 'select',
    label: '¿Qué te frena hoy?',
    required: true,
    placeholder: 'Elige lo que más pesa',
    options: [
      { value: 'demand-exceeds-capacity', label: 'Me piden más de lo que alcanzo' },
      { value: 'brand-out-of-date', label: 'Mi marca ya no cuenta lo que viene' },
      { value: 'content-not-seen', label: 'Publicamos, pero nadie lo mira' },
      { value: 'ai-without-losing-brand', label: 'Quiero usar IA sin perder la marca' }
    ]
  },
  {
    key: 'marketingTeamSize',
    type: 'select',
    label: 'Tamaño de tu equipo de marketing',
    required: true,
    placeholder: 'Selecciona un rango',
    options: [
      { value: '1-5', label: '1 a 5 personas' },
      { value: '6-20', label: '6 a 20 personas' },
      { value: '21-50', label: '21 a 50 personas' },
      { value: '50-plus', label: 'Más de 50 personas' }
    ]
  },
  {
    key: 'startTimeline',
    type: 'select',
    label: '¿Cuándo quieres partir?',
    required: true,
    placeholder: 'Selecciona un plazo',
    options: [
      { value: 'this-month', label: 'Este mes' },
      { value: '1-3-months', label: 'En 1 a 3 meses' },
      { value: 'exploring', label: 'Estoy explorando' }
    ]
  },
  {
    key: 'context',
    type: 'textarea',
    label: 'Cuéntanos en breve',
    required: false,
    maxLength: 500,
    placeholder: 'Qué lanzan este trimestre, qué formatos te piden, dónde se traba hoy.'
  }
] as const

const main = async () => {
  const current = await getPublishedVersionBySlug(SLUG)

  if (current) {
    const definition = await getFormDefinitionById(current.form_id)

    console.log(
      JSON.stringify({
        status: 'already_published',
        slug: SLUG,
        formKey: definition?.form_key,
        formVersionId: current.form_version_id,
        surfaceId: SURFACE_ID
      })
    )

    return
  }

  if (!APPLY) {
    console.log(
      JSON.stringify({
        status: 'dry_run',
        slug: SLUG,
        surfaceId: SURFACE_ID,
        styleVariant: 'diagnostic_premium',
        fields: fieldSchema.map(field => field.key),
        delivery: 'greenhouse_only (destino HubSpot vía activate-hubspot-destinations)'
      })
    )

    return
  }

  const reference = await getPublishedVersionBySlug(SECURITY_REFERENCE_SLUG)
  const security = (reference?.ui_policy_json as { security?: unknown } | null)?.security

  if (!security) throw new Error('Published reference captcha policy missing')

  if (!(await getHostSurfaceById(SURFACE_ID))) {
    await createHostSurface({
      surfaceId: SURFACE_ID,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público — Agencia Creativa',
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG,
    name: 'Diagnóstico creativo · Agencia Creativa',
    formKind: 'diagnostic_intake',
    purpose:
      'Recibir solicitudes de diagnóstico creativo de equipos de marketing y marca desde la landing Agencia Creativa.',
    riskProfile: 'medium',
    locale: 'es-CL',
    fieldSchema,
    styleVariant: 'diagnostic_premium',
    validationSchema: { emailPolicy: { mode: 'block_field', field: 'email' } },
    uiPolicy: { composition: 'static', security },
    copyRefs: {
      copy: {
        submit: 'Agenda tu diagnóstico',
        'email.help': 'Usa tu email de trabajo para responderte con contexto real.',
        'phone.help': 'Opcional. Si prefieres coordinar por WhatsApp.',
        'context.help': 'Con esto preparamos la reunión.',
        'firstName.error.required': 'Escribe tu nombre.',
        'lastName.error.required': 'Escribe tu apellido.',
        'email.error.required': 'Necesitamos tu email de trabajo para responderte.',
        'email.error.email_not_corporate': 'Usa un email de empresa para continuar.',
        'companyName.error.required': 'Indica tu empresa o su sitio web.',
        'role.error.required': 'Selecciona tu rol.',
        'mainBlocker.error.required': 'Elige qué te frena hoy.',
        'marketingTeamSize.error.required': 'Selecciona el tamaño de tu equipo.',
        'startTimeline.error.required': 'Selecciona cuándo quieres partir.'
      },
      checkboxes: [
        { key: 'contact_permission', label: 'Autorizo a Efeonce a contactarme sobre esta solicitud.', required: true }
      ],
      noticeText: 'Usaremos estos datos solo para preparar y responder tu solicitud de diagnóstico.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      message: 'Recibimos tu solicitud. Una persona del equipo te escribirá para agendar tu diagnóstico.',
      title: 'Recibimos tu solicitud',
      body: 'Una persona del equipo te escribirá para agendar tu diagnóstico.',
      supportingNote: 'Si prefieres, puedes elegir un horario ahora en nuestra agenda.',
      steps: [],
      actions: [
        {
          kind: 'external_link',
          label: 'Elegir un horario',
          href: 'https://efeoncepro.com/agenda/',
          target: '_self',
          telemetryKey: 'creative_diagnostic_agenda'
        }
      ]
    },
    consentPolicyVersion: 'efeonce-creative-diagnostic-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      note: 'v1 sin destino; la entrega directa HubSpot se adjunta con activate-hubspot-destinations.'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_creative_diagnostic', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'agencia-creativa', sla: '1 día hábil' },
    createdBy: 'operator-approved-agencia-creativa-20261015'
  })

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
      surfaceId: SURFACE_ID,
      reviewWarnings: review.warnings.map(warning => warning.code)
    })
  )
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Publication failed')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
