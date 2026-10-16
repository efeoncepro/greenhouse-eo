import 'server-only'

/**
 * Publica el Growth Form «Diagnóstico de medios · Agencia de Medios» de la landing
 * https://efeoncepro.com/servicios/agencia-de-medios/ con los commands canónicos
 * (author → review → publish). Dry-run por defecto; `--apply` crea surface + draft y publica.
 *
 * Diseño aprobado por el operador (canvas `Main.dc.html` de la landing, 2026-10-16). Decisiones de
 * mapeo al renderer:
 *   - `styleVariant=hubspot_pillar`: es la única variante cuyo renderer en producción dibuja la
 *     selección múltiple «Dónde pautas hoy» como chips con casillas (como el diseño). Con
 *     `diagnostic_premium` un `multiselect` cae a un `<select multiple>` nativo. En pillar los
 *     `select` simples se ven como chips de selección única; «País» usa `country_select` (lista
 *     desplegable con banderas).
 *   - Consentimiento: el motor exige un consentimiento de procesamiento obligatorio para aceptar el
 *     envío (`contact_permission`); las novedades van como casilla opcional (`marketing_updates`),
 *     el mismo patrón de Contacto.
 *   - Los `value` de las opciones son estables: si más adelante cambia la variante o el tipo de
 *     control, HubSpot y la medición siguen recibiendo lo mismo.
 *
 * La entrega HubSpot NO se configura acá: la v1 nace `greenhouse_only` y el destino `direct` se
 * adjunta con `pnpm growth:forms:activate-hubspot-destinations -- --only=efeonce-media-diagnostic`
 * (registro `hubspot-destinations.registry.ts`), que clona esta versión y publica la siguiente.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-media-diagnostic-form.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-media-diagnostic-form.ts --apply
 */

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-media-diagnostic'
const SURFACE_ID = 'fhsf-efeonce-media-diagnostic'
const STYLE_VARIANT = 'hubspot_pillar'

/** Versión publicada de la que se copia la política Turnstile (nunca de credenciales locales). */
const SECURITY_REFERENCE_SLUG = 'efeonce-creative-diagnostic'

const fieldSchema = [
  {
    key: 'firstName',
    type: 'text',
    label: 'Nombre',
    required: true,
    maxLength: 80,
    autocomplete: 'given-name',
    validator: 'text'
  },
  {
    key: 'lastName',
    type: 'text',
    label: 'Apellido',
    required: false,
    maxLength: 80,
    autocomplete: 'family-name',
    validator: 'text'
  },
  {
    key: 'email',
    type: 'email',
    label: 'Correo',
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
    label: 'Teléfono',
    required: false,
    maxLength: 40,
    // El control ya muestra el prefijo (+56) en su propio selector; el placeholder es sólo el número.
    placeholder: '9 1234 5678',
    autocomplete: 'tel',
    validator: 'e164_phone',
    validatorParams: { country: 'CL' }
  },
  {
    key: 'companyName',
    type: 'text',
    label: 'Empresa',
    required: true,
    maxLength: 160,
    autocomplete: 'organization',
    validator: 'text'
  },
  {
    key: 'jobTitle',
    type: 'text',
    label: 'Cargo',
    required: false,
    maxLength: 120,
    autocomplete: 'organization-title',
    validator: 'text'
  },
  {
    key: 'country',
    type: 'select',
    label: 'País',
    required: true,
    placeholder: 'Elige un país',
    autocomplete: 'country-name',
    presentation: { control: 'country_select' },
    options: [
      { value: 'Chile', label: 'Chile', countryCode: 'CL' },
      { value: 'Colombia', label: 'Colombia', countryCode: 'CO' },
      { value: 'México', label: 'México', countryCode: 'MX' },
      { value: 'Perú', label: 'Perú', countryCode: 'PE' },
      { value: 'Estados Unidos', label: 'Estados Unidos', countryCode: 'US' },
      { value: 'Otro país', label: 'Otro país' }
    ]
  },
  {
    key: 'salesModel',
    type: 'select',
    label: '¿Cómo vendes?',
    required: false,
    placeholder: 'Elige una opción',
    options: [
      { value: 'online-or-stores', label: 'Online o en tiendas' },
      { value: 'b2b', label: 'A empresas' },
      { value: 'both', label: 'Ambas' },
      { value: 'not-sure', label: 'Aún no lo sé' }
    ]
  },
  {
    key: 'mediaChannels',
    type: 'multiselect',
    label: 'Dónde pautas hoy',
    required: false,
    // Valores legibles: HubSpot recibe la selección como texto separado por comas.
    options: [
      { value: 'Google', label: 'Google' },
      { value: 'Meta', label: 'Meta' },
      { value: 'TikTok', label: 'TikTok' },
      { value: 'LinkedIn', label: 'LinkedIn' },
      { value: 'Programática', label: 'Programática' },
      { value: 'Aún ninguno', label: 'Aún ninguno' }
    ]
  },
  {
    key: 'monthlyMediaBudget',
    type: 'select',
    label: 'Inversión mensual en medios',
    required: false,
    placeholder: 'Elige un rango',
    options: [
      { value: 'under-3k-usd', label: 'Menos de USD 3.000' },
      { value: '3k-10k-usd', label: 'USD 3.000 a 10.000' },
      { value: '10k-50k-usd', label: 'USD 10.000 a 50.000' },
      { value: 'over-50k-usd', label: 'Más de USD 50.000' },
      { value: 'to-be-defined', label: 'Por definir' }
    ]
  },
  {
    key: 'context',
    type: 'textarea',
    label: '¿Qué quieres resolver?',
    required: false,
    maxLength: 1000,
    placeholder: 'Por ejemplo: no sabemos qué canal trae ventas, o queremos sumar programática.'
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
        styleVariant: STYLE_VARIANT,
        fields: fieldSchema.map(field => `${field.key}:${field.type}`),
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
      surfaceName: 'Efeonce público — Agencia de Medios',
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG,
    name: 'Diagnóstico de medios · Agencia de Medios',
    formKind: 'diagnostic_intake',
    purpose:
      'Recibir solicitudes de diagnóstico de pauta de empresas que invierten o quieren invertir en medios, desde la landing Agencia de Medios.',
    riskProfile: 'medium',
    locale: 'es-CL',
    fieldSchema,
    styleVariant: STYLE_VARIANT,
    validationSchema: { emailPolicy: { mode: 'block_field', field: 'email' } },
    uiPolicy: { composition: 'static', security },
    copyRefs: {
      copy: {
        submit: 'Enviar y coordinar la reunión',
        'email.help': 'Usa tu correo de trabajo para responderte con contexto real.',
        'firstName.error.required': 'Escribe tu nombre.',
        'email.error.required': 'Necesitamos tu correo de trabajo para responderte.',
        'email.error.email_not_corporate': 'Usa un correo de empresa para continuar.',
        'companyName.error.required': 'Indica tu empresa.',
        'country.error.required': 'Elige tu país.',
        'contact_permission.error.required': 'Necesitamos tu autorización para responder esta solicitud.'
      },
      checkboxes: [
        { key: 'contact_permission', label: 'Autorizo a Efeonce a contactarme sobre esta solicitud.', required: true },
        {
          key: 'marketing_updates',
          label: 'Quiero recibir novedades y contenidos de Efeonce. Puedes darte de baja cuando quieras.',
          required: false
        }
      ],
      noticeText: 'Usamos tus datos sólo para responder esta solicitud. Más detalle en la política de privacidad.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      message:
        'Recibimos tu solicitud. Te escribimos al correo que dejaste para coordinar la reunión de inicio del diagnóstico.',
      title: 'Recibimos tu solicitud',
      body: 'Te escribimos al correo que dejaste para coordinar la reunión de inicio del diagnóstico.',
      supportingNote: 'Si prefieres, puedes elegir un horario ahora en nuestra agenda.',
      steps: [],
      actions: [
        {
          kind: 'external_link',
          label: 'Elegir un horario',
          href: 'https://efeoncepro.com/agenda/',
          target: '_self',
          telemetryKey: 'media_diagnostic_agenda'
        }
      ]
    },
    consentPolicyVersion: 'efeonce-media-diagnostic-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      note: 'v1 sin destino; la entrega directa HubSpot se adjunta con activate-hubspot-destinations.'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_media_diagnostic', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'agencia-de-medios', sla: '1 día hábil' },
    createdBy: 'operator-approved-agencia-de-medios-20261016'
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
