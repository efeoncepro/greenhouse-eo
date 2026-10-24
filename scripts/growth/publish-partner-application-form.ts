import 'server-only'

/**
 * Publica el Growth Form «Quiero ser partner» de la landing https://efeoncepro.com/partnership/ (rediseño
 * 2026-10-23, canvas «Partners — Efeonce» v17) con los commands canónicos (author → review → publish).
 * Dry-run por defecto; `--apply` crea la surface + el draft y publica.
 *
 * Es el primer formulario declarado con el kit de formularios diseñados (TASK-2044/2045): grilla 2×2 con
 * `presentation.width`, íconos de etiqueta, consentimiento `compact` con `{privacyLink}`, éxito `success_card`
 * con `icon: 'orbit'`, `steps: []` y acción `dismiss` («Cerrar»). Lo abre el Growth CTA `partners-become-partner`
 * en un diálogo (`publish-partners-become-partner-cta.ts`).
 *
 * ⚠️ Activación: el runtime publicado hoy (Greenhouse `main`) todavía no conoce estos campos y no puede servir
 * este contrato; nada lo embebe hasta que el release de los renderers (formularios 1.1.0, CTA 1.4.0) llegue a
 * `main`. Publicarlo antes sólo deja listo el contrato y el destino.
 *
 * La entrega HubSpot NO se configura acá: nace `greenhouse_only` y el destino `direct` se adjunta con
 * `pnpm growth:forms:activate-hubspot-destinations -- --only=efeonce-partner-application` (registro
 * `hubspot-destinations.registry.ts`, formulario HubSpot «Lead Gean - Partnership» de la página anterior).
 *
 * Uso:
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-partner-application-form.ts
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/publish-partner-application-form.ts --apply
 */

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import { fieldDefinitionSchema } from '@/lib/growth/forms/contracts'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const APPLY = process.argv.includes('--apply')
const SLUG = 'efeonce-partner-application'
const SURFACE_ID = 'fhsf-efeonce-partners'
const ORIGINS = ['https://efeoncepro.com', 'https://www.efeoncepro.com']

/** Versión publicada de la que se copia la política Turnstile (nunca de credenciales locales). */
const SECURITY_REFERENCE_SLUG = 'efeonce-media-diagnostic'

const PRODUCTION_RENDERER_URL = 'https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js'

/** Marcadores del renderer 1.1.0 (TASK-2045) que este contrato necesita para dibujarse como se diseñó. */
const RENDERER_MARKERS = {
  compactConsent: 'ghf-check--compact',
  dismissEvent: 'ghf:dismiss',
  orbitMark: 'ghf-orbit-mark'
} as const

const fieldSchema = [
  {
    key: 'fullName',
    type: 'text',
    label: 'Nombre y apellido',
    placeholder: 'Tu nombre',
    required: true,
    maxLength: 120,
    autocomplete: 'name',
    validator: 'text',
    presentation: { width: 'half', icon: 'user' }
  },
  {
    key: 'email',
    type: 'email',
    label: 'Correo de trabajo',
    placeholder: 'tu@empresa.com',
    required: true,
    maxLength: 200,
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'corporate_email',
    presentation: { width: 'half', icon: 'mail' }
  },
  {
    key: 'companyName',
    type: 'text',
    label: 'Empresa o plataforma',
    placeholder: 'Nombre de la plataforma',
    required: true,
    maxLength: 160,
    autocomplete: 'organization',
    validator: 'text',
    presentation: { width: 'half', icon: 'briefcase' }
  },
  {
    key: 'website',
    type: 'url',
    label: 'Sitio web',
    placeholder: 'https://',
    required: false,
    maxLength: 200,
    autocomplete: 'url',
    inputMode: 'url',
    validator: 'url',
    presentation: { width: 'half', icon: 'globe' }
  },
  {
    key: 'offer',
    type: 'textarea',
    label: '¿Qué ofreces y a quién le sirve?',
    placeholder: 'Tu tecnología, el problema que resuelve y el tipo de cliente',
    required: true,
    dataClass: 'free_text',
    presentation: { width: 'full', icon: 'message' }
  }
]

const copyRefs = {
  copy: {
    submit: 'Enviar propuesta →',
    'fullName.error.required': 'Escribe tu nombre y apellido.',
    'email.error.required': 'Necesitamos tu correo de trabajo para responderte.',
    'email.error.email_not_corporate': 'Usa un correo de empresa para continuar.',
    'companyName.error.required': 'Indica tu empresa o plataforma.',
    'website.error.url_format': 'Revisa el sitio web, por ejemplo tuplataforma.com.',
    'offer.error.required': 'Cuéntanos qué ofreces y a quién le sirve.',
    'privacy.error.required': 'Necesitamos tu autorización para responder tu propuesta.'
  },
  presentation: 'compact',
  privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/',
  privacyLinkLabel: 'política de privacidad',
  checkboxes: [
    {
      key: 'privacy',
      label: 'Acepto que Efeonce use estos datos para responder mi propuesta, según su {privacyLink}.',
      required: true
    }
  ]
}

const successBehavior = {
  kind: 'inline_message',
  presentation: 'success_card',
  icon: 'orbit',
  // El punto final del título lo pone la piel de la landing (punto turquesa de La órbita).
  title: 'Recibido',
  body: 'Gracias por escribirnos. Revisamos tu propuesta y te contactamos por correo.',
  message: 'Gracias por escribirnos. Revisamos tu propuesta y te contactamos por correo.',
  steps: [],
  actions: [{ kind: 'dismiss', label: 'Cerrar', telemetryKey: 'partner_application_close' }]
}

/** Chequeo local: los mismos schemas y el mismo compilador que la publicación, sin tocar la base. */
const checkContractLocally = (security: unknown) => {
  const problems: string[] = []

  for (const field of fieldSchema) {
    const parsed = fieldDefinitionSchema.safeParse(field)

    if (!parsed.success) problems.push(`field_invalid:${field.key}:${parsed.error.issues.map(issue => issue.path.join('.')).join(',')}`)
  }

  const now = new Date()

  const compiled = compileFormVersion(
    {
      form_id: 'fdef-local-check',
      form_key: '00000000-0000-4000-8000-000000000000',
      slug: SLUG,
      name: 'local',
      form_kind: 'contact',
      purpose: 'local',
      risk_profile: 'medium',
      owner_team: null,
      status: 'active',
      default_locale: 'es-CL',
      created_by: null,
      created_at: now,
      updated_at: now
    },
    {
      form_version_id: 'fver-local-check',
      form_id: 'fdef-local-check',
      version: 1,
      status: 'review',
      locale: 'es-CL',
      field_schema_json: fieldSchema,
      validation_schema_json: {},
      copy_refs_json: copyRefs,
      style_variant: null,
      ui_policy_json: { composition: 'static', ...(security ? { security } : {}) },
      success_behavior_json: successBehavior,
      consent_policy_version: 'efeonce-partner-application-v1',
      data_classification_json: {},
      destination_policy_json: { mode: 'greenhouse_only' },
      analytics_policy_json: { enabled: true },
      retention_policy_json: { days: 730 },
      commercial_handoff_policy_json: {},
      published_at: null,
      created_at: now
    },
    [],
    { forPublication: true }
  )

  if (!compiled.ok) problems.push(...compiled.blockingReasons.map(reason => `compile:${reason}`))

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
  const current = await getPublishedVersionBySlug(SLUG)

  if (current) {
    const definition = await getFormDefinitionById(current.form_id)

    console.log(JSON.stringify({ status: 'already_published', slug: SLUG, formKey: definition?.form_key, formVersionId: current.form_version_id, surfaceId: SURFACE_ID }))

    return
  }

  const surface = await getHostSurfaceById(SURFACE_ID)
  const reference = await getPublishedVersionBySlug(SECURITY_REFERENCE_SLUG)
  const security = (reference?.ui_policy_json as { security?: unknown } | null)?.security
  const local = checkContractLocally(security)
  const renderer = await checkProductionRenderer()

  const productionRendererReady =
    'markers' in renderer && renderer.markers !== undefined && Object.values(renderer.markers).every(Boolean)

  if (!APPLY) {
    console.log(
      JSON.stringify(
        {
          status: 'dry_run',
          slug: SLUG,
          surface: { surfaceId: SURFACE_ID, exists: Boolean(surface), origins: ORIGINS },
          fields: fieldSchema.map(field => `${field.key}:${field.type}${field.required ? '*' : ''}:${field.presentation.width}`),
          localContractCheck: local,
          securityReference: { slug: SECURITY_REFERENCE_SLUG, captchaPolicyFound: Boolean(security) },
          productionRenderer: { ...renderer, readyForThisContract: productionRendererReady },
          activation: productionRendererReady
            ? 'el renderer de producción ya dibuja este contrato'
            : 'publicable; no se embebe hasta el release de los renderers a main',
          delivery: 'greenhouse_only (destino HubSpot vía activate-hubspot-destinations)'
        },
        null,
        2
      )
    )

    return
  }

  if (!local.ok) throw new Error(`contract_invalid:${local.problems.join('|')}`)
  if (!security) throw new Error('Published reference captcha policy missing')

  if (!surface) {
    await createHostSurface({
      surfaceId: SURFACE_ID,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público — Partners',
      originAllowlist: ORIGINS,
      allowedFormSlugs: [SLUG],
      rendererChannel: 'stable',
      status: 'active'
    })
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG,
    name: 'Quiero ser partner · Partners',
    formKind: 'contact',
    purpose:
      'Recibir propuestas de plataformas tecnológicas que quieren ser partners de Efeonce, desde el popup «Quiero ser partner» de la landing Partners. No es un lead comercial de cliente.',
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
    uiPolicy: { composition: 'static', security },
    copyRefs,
    successBehavior,
    consentPolicyVersion: 'efeonce-partner-application-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      note: 'v1 sin destino; la entrega directa HubSpot se adjunta con activate-hubspot-destinations.'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'partner_application', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-partnerships', source: 'partners-landing', sla: '5 días hábiles' },
    createdBy: 'operator-approved-partners-landing-20261023'
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
      productionRendererReady,
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
