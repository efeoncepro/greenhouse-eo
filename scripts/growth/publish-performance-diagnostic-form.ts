import 'server-only'

/**
 * Publica el Growth Form «Diagnóstico de pauta · Performance Marketing» de la landing
 * https://efeoncepro.com/servicios/performance-marketing/ (TASK-1865) con los commands canónicos
 * (author → review → publish). Dry-run por defecto; `--apply` crea surface + draft y publica.
 *
 * Diseño aprobado por el operador (canvas de la landing, 2026-10-17): dos pasos, «Cuéntanos de tu pauta» y
 * «¿A quién le respondemos?», con el CRM como pregunta condicional cuando se vende a empresas.
 * Decisiones de mapeo al renderer (detalle en el informe de preparación):
 *   - `styleVariant=hubspot_pillar` + `composition=multi_step_light`: es la combinación que el renderer de
 *     PRODUCCIÓN ya dibuja (encabezado de paso con barra de progreso, `select` como chips de selección única,
 *     `multiselect` como chips con casilla). Mismo patrón que `efeonce-hubspot-scope` y `efeonce-media-diagnostic`.
 *   - Campo condicional: `visibleWhen`/`requiredWhen` sólo combinan condiciones con AND y comparan `equals` o
 *     `includes`. «A empresas» o «A ambos» se resuelve con valores que comparten el prefijo `b2b`
 *     (`b2b`, `b2b-b2c`) y la condición `includes: 'b2b'` (precedente: `currentHubs` de HubSpot scope).
 *   - Sin íconos: el renderer no tiene íconos por opción (ni isotipos de plataformas) y el bundle de producción
 *     todavía dibuja los íconos de etiqueta como glifos de texto que el CSS de Ohio convierte en palabras
 *     (el arreglo `ab622e958` no está en `main`).
 *   - «Todavía no invertimos» queda como una opción más: el renderer no tiene opción excluyente.
 *   - Los desplegables del canvas se ven como chips de selección única (pillar); «País» usa `country_select`.
 *   - Nombre y apellido en un solo campo, partido en servidor por `namePolicy.split_full_name`.
 *   - Consentimiento: sólo la autorización obligatoria (`contact_permission`). No hay casilla de novedades
 *     porque el adapter HubSpot envía `communications: []` y quedaría guardada sin efecto.
 *   - Los `value` de las opciones son estables: cambiar después la variante o el control no toca HubSpot ni la
 *     medición.
 *
 * La entrega HubSpot NO se configura acá: la v1 nace `greenhouse_only` y el destino `direct` se adjunta con
 * `pnpm growth:forms:activate-hubspot-destinations -- --only=efeonce-performance-diagnostic` después de sumar la
 * fila al registro `hubspot-destinations.registry.ts` con el `formKey` que devuelve este script.
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-performance-diagnostic-form.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-performance-diagnostic-form.ts --apply
 */

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { fieldDefinitionSchema, renderStepSchema } from '@/lib/growth/forms/contracts'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-performance-diagnostic'
const SURFACE_ID = 'fhsf-efeonce-performance-diagnostic'
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

const STEP_PAUTA = ['salesAudience', 'mediaChannels', 'monthlyMediaBudget', 'paidMediaGoal', 'firstNeed', 'crm']
const STEP_CONTACTO = ['fullName', 'companyName', 'email', 'website', 'country', 'role']

const fieldSchema = [
  // ─── Paso 1 · Cuéntanos de tu pauta ───
  {
    key: 'salesAudience',
    type: 'select',
    label: '¿A quién le vendes?',
    required: true,
    // `b2b` y `b2b-b2c` comparten prefijo: la condición del CRM usa `includes: 'b2b'` (OR por construcción).
    options: [
      { value: 'b2c', label: 'A consumidores' },
      { value: 'b2b', label: 'A empresas' },
      { value: 'b2b-b2c', label: 'A ambos' }
    ]
  },
  {
    key: 'mediaChannels',
    type: 'multiselect',
    label: '¿Dónde inviertes hoy?',
    required: true,
    // Valores legibles: HubSpot recibe la selección como texto separado por comas.
    options: [
      { value: 'Google Ads', label: 'Google Ads' },
      { value: 'Meta Ads', label: 'Meta Ads' },
      { value: 'TikTok Ads', label: 'TikTok Ads' },
      { value: 'LinkedIn Ads', label: 'LinkedIn Ads' },
      { value: 'Microsoft Ads', label: 'Microsoft Ads' },
      { value: 'Otro canal', label: 'Otro canal' },
      { value: 'Todavía no invertimos', label: 'Todavía no invertimos' }
    ]
  },
  {
    key: 'monthlyMediaBudget',
    type: 'select',
    label: 'Inversión mensual en medios',
    required: true,
    placeholder: 'Elige un rango',
    options: [
      { value: 'under-5k-usd', label: 'Menos de USD 5.000' },
      { value: '5k-20k-usd', label: 'USD 5.000 a 20.000' },
      { value: '20k-80k-usd', label: 'USD 20.000 a 80.000' },
      { value: 'over-80k-usd', label: 'Más de USD 80.000' },
      { value: 'prefer-not-to-say', label: 'Prefiero no decirlo' }
    ]
  },
  {
    key: 'paidMediaGoal',
    type: 'select',
    label: '¿Qué quieres que traiga tu pauta?',
    required: true,
    placeholder: 'Elige una opción',
    options: [
      { value: 'online-sales', label: 'Ventas en línea' },
      { value: 'b2b-opportunities', label: 'Oportunidades de venta B2B' },
      { value: 'store-visits-or-messages', label: 'Visitas a tienda o mensajes' },
      { value: 'not-sure-yet', label: 'Todavía no lo tengo claro' }
    ]
  },
  {
    key: 'firstNeed',
    type: 'select',
    label: '¿Qué necesitas resolver primero?',
    required: true,
    placeholder: 'Elige una opción',
    options: [
      { value: 'audit-current-spend', label: 'Revisar lo que ya invierto' },
      { value: 'measurement-and-conversions', label: 'Ordenar la medición y las conversiones' },
      { value: 'monthly-campaign-management', label: 'Que alguien opere mis campañas cada mes' },
      { value: 'connect-ads-with-crm', label: 'Conectar la pauta con mi CRM' },
      { value: 'add-new-channel', label: 'Sumar un canal nuevo' },
      { value: 'more-creatives-to-test', label: 'Producir más creatividades para probar' }
    ]
  },
  {
    key: 'crm',
    type: 'select',
    label: '¿Qué CRM usan?',
    required: false,
    options: [
      { value: 'hubspot', label: 'HubSpot' },
      { value: 'salesforce', label: 'Salesforce' },
      { value: 'other-crm', label: 'Otro CRM' },
      { value: 'no-crm', label: 'No usamos CRM' }
    ],
    visibleWhen: [{ field: 'salesAudience', includes: 'b2b' }],
    requiredWhen: [{ field: 'salesAudience', includes: 'b2b' }]
  },

  // ─── Paso 2 · ¿A quién le respondemos? ───
  // Orden ajustado a la grilla de pillar (dos columnas; correo y chips ocupan la fila completa).
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
    required: false,
    maxLength: 200,
    placeholder: 'tuempresa.com',
    autocomplete: 'url',
    inputMode: 'url',
    validator: 'url'
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
      { value: 'México', label: 'México', countryCode: 'MX' },
      { value: 'Colombia', label: 'Colombia', countryCode: 'CO' },
      { value: 'Perú', label: 'Perú', countryCode: 'PE' },
      { value: 'Estados Unidos', label: 'Estados Unidos', countryCode: 'US' },
      { value: 'Otro país', label: 'Otro país' }
    ]
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
  { key: 'pauta', label: 'Cuéntanos de tu pauta', fieldKeys: STEP_PAUTA },
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

  for (const field of fieldSchema) {
    for (const condition of [...(field.visibleWhen ?? []), ...(field.requiredWhen ?? [])]) {
      const target = fieldSchema.find(candidate => candidate.key === condition.field)

      if (!target) problems.push(`condition_unknown_field:${field.key}->${condition.field}`)

      const matching = (target?.options ?? []).filter(option => option.value.includes(condition.includes ?? '')).map(option => option.value)

      if (field.key === 'crm' && matching.join('|') !== 'b2b|b2b-b2c') problems.push(`crm_condition_matches:${matching.join('|')}`)
    }
  }

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
    renderer.markers.conditionalFields === true &&
    renderer.markers.conditionalRequired === true &&
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
            field => `${field.key}:${field.type}${field.required ? '*' : ''}${field.visibleWhen ? ' (condicional)' : ''}`
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
  if (!rendererReady) throw new Error('renderer_not_ready: el bundle de producción no trae pillar multi-paso o campos condicionales')
  if (!security) throw new Error('Published reference captcha policy missing')

  if (!surface) {
    await createHostSurface({
      surfaceId: SURFACE_ID,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público — Performance Marketing',
      originAllowlist: ORIGINS,
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG,
    name: 'Diagnóstico de pauta · Performance Marketing',
    formKind: 'diagnostic_intake',
    purpose:
      'Recibir solicitudes de diagnóstico de pauta digital de empresas que invierten o quieren invertir en medios pagados, desde la landing Performance Marketing.',
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
        'monthlyMediaBudget.help': 'Una estimación basta.',
        'salesAudience.error.required': 'Elige a quién le vendes.',
        'mediaChannels.error.required': 'Marca al menos una opción.',
        'monthlyMediaBudget.error.required': 'Elige un rango o «Prefiero no decirlo».',
        'paidMediaGoal.error.required': 'Elige qué quieres que traiga tu pauta.',
        'firstNeed.error.required': 'Elige qué necesitas resolver primero.',
        'crm.error.required': 'Elige qué CRM usan.',
        'fullName.error.required': 'Escribe tu nombre y apellido.',
        'email.error.required': 'Necesitamos tu correo de trabajo para responderte.',
        'email.error.email_not_corporate': 'Usa un correo de empresa para continuar.',
        'companyName.error.required': 'Indica tu empresa.',
        'website.error.url_format': 'Revisa el sitio web, por ejemplo tuempresa.com.',
        'role.error.required': 'Elige tu cargo.',
        'country.error.required': 'Elige tu país.',
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
          telemetryKey: 'performance_diagnostic_agenda'
        }
      ]
    },
    consentPolicyVersion: 'efeonce-performance-diagnostic-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      note: 'v1 sin destino; la entrega directa HubSpot se adjunta con activate-hubspot-destinations.'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_performance_diagnostic', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'performance-marketing', sla: '1 día hábil' },
    createdBy: 'operator-approved-performance-marketing-20261017'
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
