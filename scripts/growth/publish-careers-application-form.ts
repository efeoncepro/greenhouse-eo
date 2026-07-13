import 'server-only'

/**
 * TASK-1373 — Publica el Growth Form real de Careers Applications.
 *
 * DRY-RUN por defecto; `--apply` muta vía commands canónicos.
 */

import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import { getMicrocopy } from '@/lib/copy'
import { authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import {
  getFormDefinitionById,
  getFormDefinitionByKey,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  insertHostSurface,
} from '@/lib/growth/forms/store'
import {
  PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES,
  PUBLIC_CAREERS_CV_MAX_BYTES,
} from '@/lib/hiring/public-careers/cv-upload-contract'
import {
  CAREERS_APPLICATION_FORM_KEY,
  CAREERS_APPLICATION_FORM_SLUG,
  CAREERS_APPLICATION_SURFACE_ID,
} from '@/lib/hiring/public-careers/growth-form-contract'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

if (process.env.GREENHOUSE_POSTGRES_HOST?.trim()) {
  delete process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME
}

const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim()

if (credentialsJson) {
  try {
    JSON.parse(credentialsJson)
  } catch {
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  }
}

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')
const CONSENT_POLICY_VERSION = 'efeonce-careers-2026-07'
const STYLE_VARIANT = 'careers-html-fidelity'

const copy = getMicrocopy('es-CL').careers
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? process.env.TURNSTILE_SITE_KEY

const ORIGINS = [
  'http://localhost:3000',
  'https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app',
  'https://dev-greenhouse.efeoncepro.com',
  'https://greenhouse.efeoncepro.com',
]

const FIELD_SCHEMA = [
  { key: 'openingPublicId', type: 'hidden', label: 'Opening public id', required: true, dataClass: 'public' },
  {
    key: 'firstName',
    type: 'text',
    label: copy.apply.fields.firstName,
    required: true,
    dataClass: 'contact_pii',
    presentation: { icon: 'user' },
    autocomplete: 'given-name',
    validator: 'text',
    maxLength: 200,
  },
  {
    key: 'lastName',
    type: 'text',
    label: copy.apply.fields.lastName,
    required: true,
    dataClass: 'contact_pii',
    presentation: { icon: 'user' },
    autocomplete: 'family-name',
    validator: 'text',
    maxLength: 200,
  },
  {
    key: 'email',
    type: 'email',
    label: copy.apply.fields.email,
    placeholder: copy.apply.placeholders.email,
    required: true,
    dataClass: 'contact_pii',
    presentation: { icon: 'mail' },
    autocomplete: 'email',
    inputMode: 'email',
    validator: 'email_syntax',
    maxLength: 200,
  },
  {
    key: 'phone',
    type: 'tel',
    label: copy.apply.fields.phone,
    placeholder: copy.apply.placeholders.phone,
    dataClass: 'contact_pii',
    presentation: { icon: 'phone' },
    autocomplete: 'tel',
    inputMode: 'tel',
    validator: 'e164_phone',
    validatorParams: { country: 'CL' },
    maxLength: 200,
  },
  {
    key: 'portfolioUrl',
    type: 'url',
    label: copy.apply.fields.portfolio,
    placeholder: copy.apply.placeholders.portfolio,
    dataClass: 'public',
    presentation: { icon: 'link' },
    autocomplete: 'url',
    inputMode: 'url',
    validator: 'url',
    maxLength: 2000,
  },
  {
    key: 'linkedinUrl',
    type: 'url',
    label: copy.apply.fields.linkedin,
    placeholder: copy.apply.placeholders.linkedin,
    dataClass: 'public',
    presentation: { icon: 'linkedin' },
    autocomplete: 'url',
    inputMode: 'url',
    validator: 'url',
    maxLength: 2000,
  },
  {
    key: 'availability',
    type: 'select',
    label: copy.apply.fields.availability,
    placeholder: copy.apply.placeholders.availability,
    dataClass: 'company',
    presentation: { icon: 'calendar' },
    options: copy.apply.availabilityOptions.map(option => ({ value: option, label: option })),
    maxLength: 200,
  },
  {
    key: 'cvFile',
    type: 'file',
    label: copy.apply.cv.label,
    required: false,
    dataClass: 'uploaded_file',
    presentation: { icon: 'file' },
    uploadPolicy: {
      acceptedMimeTypes: [...PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES],
      maxBytes: PUBLIC_CAREERS_CV_MAX_BYTES,
      multiple: false,
      storageContext: 'hiring_application_cv_draft',
      scanPolicy: 'scan_required',
    },
  },
  {
    key: 'message',
    type: 'textarea',
    label: copy.apply.fields.message,
    placeholder: copy.apply.placeholders.message,
    dataClass: 'free_text',
    presentation: { icon: 'message' },
    validator: 'text',
    maxLength: 4000,
  },
]

const buildUiPolicy = () => ({
  composition: 'static' as const,
  security: {
    captcha: {
      provider: 'turnstile' as const,
      required: true,
      mode: 'invisible' as const,
      siteKey: turnstileSiteKey,
      execution: 'submit' as const,
    },
  },
})

const COPY_REFS = {
  copy: {
    submit: copy.apply.submit,
    'cvFile.help': `${copy.apply.cv.body} ${copy.apply.cv.hint}`,
    'consent.error.required': copy.apply.errors.consent,
  },
  noticeText: `${copy.apply.consent.bodyPrefix} ${copy.apply.consent.link} ${copy.apply.consent.bodySuffix}`,
  privacyUrl: `${EFEONCE_URL_HTTPS}/privacy`,
  checkboxes: [{ key: 'careers_data_processing', label: copy.apply.consent.title, required: true }],
}

const SUCCESS_BEHAVIOR = {
  kind: 'review_pending' as const,
  presentation: 'success_card' as const,
  title: copy.apply.successTitle,
  body: copy.apply.successBody,
  actions: [
    {
      kind: 'external_link' as const,
      label: copy.apply.moreJobs,
      href: '/public/careers#gh-listing',
      target: '_self' as const,
    },
  ],
}

const main = async (): Promise<void> => {
  console.log(`Careers application Growth Form — mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}${FORCE ? ' (force)' : ''}`)

  const existingByKey = await getFormDefinitionByKey(CAREERS_APPLICATION_FORM_KEY)

  if (existingByKey && existingByKey.slug !== CAREERS_APPLICATION_FORM_SLUG) {
    throw new Error(`form_key ${CAREERS_APPLICATION_FORM_KEY} ya pertenece a slug ${existingByKey.slug}`)
  }

  const current = await getPublishedVersionBySlug(CAREERS_APPLICATION_FORM_SLUG)
  const surface = await getHostSurfaceById(CAREERS_APPLICATION_SURFACE_ID)

  console.log(`  slug      : ${CAREERS_APPLICATION_FORM_SLUG}`)
  console.log(`  form_key  : ${CAREERS_APPLICATION_FORM_KEY}`)
  console.log(`  surface   : ${CAREERS_APPLICATION_SURFACE_ID}${surface ? ' (existe)' : ' (crear)'}`)
  console.log(`  published : ${current ? `${current.form_version_id} v${current.version}` : '(ninguna)'}`)
  console.log(`  captcha   : ${turnstileSiteKey ? 'turnstile site key presente' : 'FALTA site key'}`)

  if (!turnstileSiteKey) {
    throw new Error('NEXT_PUBLIC_TURNSTILE_SITE_KEY o TURNSTILE_SITE_KEY requerido para publicar fail-closed captcha')
  }

  if (!APPLY) {
    console.log('\nDRY-RUN: sin cambios. Re-correr con --apply para publicar.')

    return
  }

  if (!surface) {
    await insertHostSurface({
      surfaceId: CAREERS_APPLICATION_SURFACE_ID,
      surfaceKind: 'nextjs',
      surfaceName: 'Greenhouse Careers public apply',
      originAllowlist: ORIGINS,
      allowedFormSlugs: [CAREERS_APPLICATION_FORM_SLUG],
      status: 'active',
    })
    console.log(`  surface creado: ${CAREERS_APPLICATION_SURFACE_ID}`)
  } else {
    const allowed = Array.isArray(surface.allowed_form_slugs_json) ? (surface.allowed_form_slugs_json as string[]) : []

    if (surface.status !== 'active') throw new Error(`surface ${surface.surface_id} no está active (${surface.status})`)

    if (allowed.length > 0 && !allowed.includes(CAREERS_APPLICATION_FORM_SLUG)) {
      throw new Error(`surface ${surface.surface_id} no permite slug ${CAREERS_APPLICATION_FORM_SLUG}`)
    }

    console.log(`  surface ok: ${CAREERS_APPLICATION_SURFACE_ID}`)
  }

  if (current && !FORCE) {
    const definition = await getFormDefinitionById(current.form_id)

    console.log(`  ya publicado; form_key=${definition?.form_key} (usa --force para republicar)`)

    return
  }

  const { formId, formVersionId } = await authorDraftForm({
    slug: CAREERS_APPLICATION_FORM_SLUG,
    formKey: CAREERS_APPLICATION_FORM_KEY,
    name: 'Efeonce Careers Application',
    formKind: 'application',
    purpose: 'Public careers application intake with private CV upload and ATS projection.',
    riskProfile: 'medium',
    locale: 'es-CL',
    fieldSchema: FIELD_SCHEMA,
    validationSchema: {},
    copyRefs: COPY_REFS,
    styleVariant: STYLE_VARIANT,
    uiPolicy: buildUiPolicy(),
    successBehavior: SUCCESS_BEHAVIOR,
    consentPolicyVersion: CONSENT_POLICY_VERSION,
    dataClassification: {
      persistenceMode: 'normalized_only',
      containsContactPii: true,
      containsUploadedFile: true,
      fileFields: ['cvFile'],
      privateAssetOnly: true,
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      reactiveProjection: 'growth_hiring_application_from_submission',
      browserDestinationMapping: false,
    },
    analyticsPolicy: {
      enabled: true,
      allowedEvents: [
        'form_viewed',
        'form_started',
        'field_validation_failed',
        'form_submitted',
        'submission_accepted',
        'submission_rejected',
      ],
      gtmDataLayer: true,
      fieldLevelAnalyticsDisabled: true,
    },
    retentionPolicy: {
      scope: 'hiring_application_pii',
      leadPiiRetentionDays: 730,
      fileRetentionDays: 365,
      legalBasis: 'consent',
      consentPolicyVersion: CONSENT_POLICY_VERSION,
    },
    createdBy: 'task-1373-careers-native-growth-form',
  })

  console.log(`  draft creado: ${formVersionId}`)

  const review = await reviewForm(formVersionId)

  if (!review.ok) {
    throw new Error(`review bloqueado: ${review.blockingReasons.join('; ')}`)
  }

  const published = await publishForm(formVersionId)

  if (!published.ok) {
    throw new Error(`publish bloqueado: ${published.blockingReasons.join('; ')}`)
  }

  console.log(`  publicado: ${formVersionId}`)

  if (current && current.form_version_id !== formVersionId) {
    await deprecateForm(current.form_version_id)
    console.log(`  versión anterior deprecada: ${current.form_version_id}`)
  }

  const definition = await getFormDefinitionById(formId)

  console.log(`\nAPPLY completo. Embed: form-key=${definition?.form_key} surface=${CAREERS_APPLICATION_SURFACE_ID}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : error)
    process.exit(1)
  })
