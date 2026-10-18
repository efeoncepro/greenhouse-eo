import 'server-only'

/**
 * Publica el Growth Form «Diagnóstico de inbound marketing» de la landing
 * https://efeoncepro.com/agencia-inbound-marketing/ (rediseño 2026-10-18, canvas «La órbita») con los commands
 * canónicos (author → review → publish). Dry-run por defecto; `--apply` crea surface + draft y publica.
 *
 * Mismo patrón que `efeonce-performance-diagnostic`: `hubspot_pillar` + `multi_step_light`, dos pasos, nombre y
 * apellido en un solo campo partido en servidor, sólo la autorización obligatoria como consentimiento.
 * Paso 1 recoge la etapa del ciclo que más le duele (la sección «¿Dónde se te rompe?» de la landing) y su contexto;
 * esos mismos campos son los que TASK-2039 precargará desde la página.
 *
 * La entrega HubSpot NO se configura acá: nace `greenhouse_only` y el destino `direct` se adjunta con
 * `pnpm growth:forms:activate-hubspot-destinations -- --only=efeonce-inbound-diagnostic` después de sumar la fila al
 * registro `hubspot-destinations.registry.ts` con el `formKey` que devuelve este script.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-inbound-diagnostic-form.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-inbound-diagnostic-form.ts --apply
 */

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { fieldDefinitionSchema, renderStepSchema } from '@/lib/growth/forms/contracts'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-inbound-diagnostic'
const SURFACE_ID = 'fhsf-efeonce-inbound-diagnostic'
const STYLE_VARIANT = 'hubspot_pillar'
const ORIGINS = ['https://efeoncepro.com', 'https://www.efeoncepro.com']

/** Versión publicada de la que se copia la política Turnstile (nunca de credenciales locales). */
const SECURITY_REFERENCE_SLUG = 'efeonce-media-diagnostic'

const PRODUCTION_RENDERER_URL = 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js'

/** Marcadores que el bundle de producción debe traer para dibujar este contrato tal como se diseñó. */
const RENDERER_MARKERS = {
  pillarStepHeading: 'ghf-pillar-step-heading',
  conditionalFields: 'visibleWhen',
  conditionalRequired: 'requiredWhen',
  countrySelect: 'country_select',
  // Sólo informativo: íconos de etiqueta como SVG (commit ab622e958). Este contrato no declara íconos.
  svgLabelIcons: '.ghf-root:not([data-ghf-style-variant="hubspot_pillar"]) label.ghf-choice'
} as const

const STEP_CICLO = ['loopStage', 'crm', 'country']
const STEP_CONTACTO = ['fullName', 'companyName', 'email', 'website', 'role']

const fieldSchema = [
  // ─── Paso 1 · Cuéntanos de tu marketing ───
  {
    key: 'loopStage',
    type: 'select',
    label: '¿Dónde se te rompe el ciclo?',
    required: true,
    options: [
      { value: 'definir', label: 'No sabemos qué decir ni por qué nos elegirían' },
      { value: 'adaptar', label: 'Mandamos lo mismo a todos y no convierte' },
      { value: 'amplificar', label: 'Hacemos buen contenido, pero nadie nos encuentra' },
      { value: 'optimizar', label: 'No sabemos qué está funcionando' },
      { value: 'no-se', label: 'Todavía no lo tengo claro' }
    ]
  },
  {
    key: 'crm',
    type: 'select',
    label: '¿Qué CRM usan?',
    required: true,
    options: [
      { value: 'hubspot', label: 'HubSpot' },
      { value: 'salesforce', label: 'Salesforce' },
      { value: 'other-crm', label: 'Otro CRM' },
      { value: 'no-crm', label: 'Todavía ninguno' }
    ]
  },
  {
    key: 'country',
    type: 'select',
    label: 'Mercado principal',
    required: true,
    placeholder: 'Elige un mercado',
    autocomplete: 'country-name',
    presentation: { control: 'country_select' },
    options: [
      { value: 'Chile', label: 'Chile', countryCode: 'CL' },
      { value: 'México', label: 'México', countryCode: 'MX' },
      { value: 'Colombia', label: 'Colombia', countryCode: 'CO' },
      { value: 'Perú', label: 'Perú', countryCode: 'PE' },
      { value: 'Estados Unidos', label: 'Estados Unidos', countryCode: 'US' },
      { value: 'Otro país', label: 'Otro país' }
    ]
  },

  // ─── Paso 2 · ¿A quién le respondemos? ───
  {
    key: 'fullName',
    type: 'text',
    label: 'Nombre y apellido',
    required: true,
    maxLength: 120,
    autocomplete: 'name',
    validator: 'text'
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
    key: 'email',
    type: 'email',
    label: 'Correo de trabajo',
    required: true,
    maxLength: 200,
    placeholder: 'nombre@empresa.com',
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'corporate_email'
  },
  {
    key: 'website',
    type: 'url',
    label: 'Sitio web',
    required: true,
    maxLength: 200,
    placeholder: 'tuempresa.com',
    autocomplete: 'url',
    inputMode: 'url',
    validator: 'url'
  },
  {
    key: 'role',
    type: 'select',
    label: 'Tu cargo',
    required: true,
    placeholder: 'Elige una opción',
    options: [
      { value: 'marketing-leadership', label: 'Gerencia o dirección de marketing' },
      { value: 'marketing-growth-ecommerce', label: 'Marketing, growth o e-commerce' },
      { value: 'sales', label: 'Comercial o ventas' },
      { value: 'founder-or-general-management', label: 'Fundador o gerencia general' },
      { value: 'other', label: 'Otro' }
    ]
  }
]

const steps = [
  { key: 'ciclo', label: 'Cuéntanos de tu marketing', fieldKeys: STEP_CICLO },
  { key: 'contacto', label: '¿A quién le respondemos?', fieldKeys: STEP_CONTACTO }
]

/** Chequeo local del contrato: los mismos schemas que usa el compiler, sin tocar la base. */
const checkContractLocally = () => {
  const problems: string[] = []
  const keys = fieldSchema.map(field => field.key)

  for (const field of fieldSchema) {
    const parsed = fieldDefinitionSchema.safeParse(field)

    if (!parsed.success) problems.push(`field_invalid:${field.key}:${parsed.error.issues.map(issue => issue.path.join('.')).join(',')}`)
  }

  for (const step of steps) {
    if (!renderStepSchema.safeParse(step).success) problems.push(`step_invalid:${step.key}`)
  }

  const stepped = steps.flatMap(step => step.fieldKeys)

  for (const key of keys) {
    const count = stepped.filter(candidate => candidate === key).length

    if (count !== 1) problems.push(`field_in_${count}_steps:${key}`)
  }

  for (const key of stepped) if (!keys.includes(key)) problems.push(`step_unknown_field:${key}`)

  return { ok: problems.length === 0, problems }
}

const checkProductionRenderer = async () => {
  try {
    const response = await fetch(PRODUCTION_RENDERER_URL, { cache: 'no-store' })

    if (!response.ok) return { reachable: false, status: response.status }
    const source = await response.text()

    return {
      reachable: true,
      markers: Object.fromEntries(Object.entries(RENDERER_MARKERS).map(([name, marker]) => [name, source.includes(marker)]))
    }
  } catch (error) {
    return { reachable: false, error: error instanceof Error ? error.message : 'fetch_failed' }
  }
}

const main = async () => {
  const local = checkContractLocally()
  const renderer = await checkProductionRenderer()
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

  const surface = await getHostSurfaceById(SURFACE_ID)
  const reference = await getPublishedVersionBySlug(SECURITY_REFERENCE_SLUG)
  const security = (reference?.ui_policy_json as { security?: unknown } | null)?.security

  const rendererReady =
    'markers' in renderer &&
    renderer.markers !== undefined &&
    renderer.markers.pillarStepHeading === true &&
    renderer.markers.countrySelect === true

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          status: 'dry_run',
          slug: SLUG,
          surface: { surfaceId: SURFACE_ID, exists: Boolean(surface), origins: ORIGINS },
          styleVariant: STYLE_VARIANT,
          composition: 'multi_step_light',
          steps: steps.map(step => ({ key: step.key, label: step.label, fields: step.fieldKeys })),
          fields: fieldSchema.map(
            field => `${field.key}:${field.type}${field.required ? '*' : ''}`
          ),
          localContractCheck: local,
          securityReference: { slug: SECURITY_REFERENCE_SLUG, captchaPolicyFound: Boolean(security) },
          productionRenderer: { ...renderer, readyForThisContract: rendererReady },
          delivery: 'greenhouse_only (destino HubSpot vía activate-hubspot-destinations)'
        },
        null,
        2
      )
    )

    return
  }

  if (!local.ok) throw new Error(`contract_invalid:${local.problems.join('|')}`)
  if (!rendererReady) throw new Error('renderer_not_ready: el bundle de producción no trae pillar multi-paso o country_select')
  if (!security) throw new Error('Published reference captcha policy missing')

  if (!surface) {
    await createHostSurface({
      surfaceId: SURFACE_ID,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público — Inbound Marketing',
      originAllowlist: ORIGINS,
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG,
    name: 'Diagnóstico de inbound · Inbound Marketing',
    formKind: 'diagnostic_intake',
    purpose:
      'Recibir solicitudes de diagnóstico de inbound marketing (estrategia, contenido, búsqueda, medios y datos operando en ciclo) desde la landing Inbound Marketing.',
    riskProfile: 'medium',
    locale: 'es-CL',
    fieldSchema,
    styleVariant: STYLE_VARIANT,
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
    uiPolicy: { composition: 'multi_step_light', steps, security },
    copyRefs: {
      copy: {
        submit: 'Pide tu diagnóstico',
        'loopStage.help': 'Si no lo tienes claro, elige la última opción: lo vemos en el diagnóstico.',
        'loopStage.error.required': 'Elige dónde se te rompe el ciclo.',
        'crm.error.required': 'Elige qué CRM usan.',
        'country.error.required': 'Elige tu mercado principal.',
        'fullName.error.required': 'Escribe tu nombre y apellido.',
        'email.error.required': 'Necesitamos tu correo de trabajo para responderte.',
        'email.error.email_not_corporate': 'Usa un correo de empresa para continuar.',
        'companyName.error.required': 'Indica tu empresa.',
        'website.error.required': 'Indica el sitio web de tu empresa.',
        'website.error.url_format': 'Revisa el sitio web, por ejemplo tuempresa.com.',
        'role.error.required': 'Elige tu cargo.',
        'contact_permission.error.required': 'Necesitamos tu autorización para responder esta solicitud.'
      },
      checkboxes: [
        { key: 'contact_permission', label: 'Autorizo a Efeonce a contactarme sobre esta solicitud.', required: true }
      ],
      noticeText: 'Usamos tus datos sólo para responder esta solicitud. Más detalle en la política de privacidad.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      message:
        'Recibimos tu solicitud. Te escribimos al correo que dejaste para coordinar el diagnóstico.',
      title: 'Recibimos tu solicitud',
      body: 'Te escribimos al correo que dejaste para coordinar el diagnóstico de tu ciclo.',
      supportingNote: 'Si prefieres, puedes elegir un horario ahora en nuestra agenda.',
      steps: [],
      actions: [
        {
          kind: 'external_link',
          label: 'Elegir un horario',
          href: 'https://efeoncepro.com/agenda/',
          target: '_self',
          telemetryKey: 'inbound_diagnostic_agenda'
        }
      ]
    },
    consentPolicyVersion: 'efeonce-inbound-diagnostic-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      note: 'v1 sin destino; la entrega directa HubSpot se adjunta con activate-hubspot-destinations.'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_inbound_diagnostic', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'inbound-marketing', sla: '1 día hábil' },
    createdBy: 'operator-approved-inbound-marketing-20261018'
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
      reviewWarnings: review.warnings.map(warning => warning.code),
      next: 'agregar la fila al registro hubspot-destinations con este formKey y correr activate-hubspot-destinations'
    })
  )
}

main()
  .catch(error => {
    console.error(error instanceof Error ? error.message : 'Publication failed')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
