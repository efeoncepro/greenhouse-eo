import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { CareersCopy, Locale } from '@/lib/copy'
import type { CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'
import type { RenderContract } from '@/growth-forms-renderer/contract'
import { RENDERER_CONTRACT_VERSION } from '@/growth-forms-renderer/version'

export const CAREERS_APPLICATION_FORM_SLUG = 'efeonce-careers-application'
export const CAREERS_APPLICATION_FORM_KEY = '9f7a8fc0-6fa7-4670-8e2d-efe0ce354001'
export const CAREERS_APPLICATION_FORM_ID = 'growth-form-careers-application'
export const CAREERS_APPLICATION_FORM_VERSION_ID = 'growth-form-careers-application-v1'
export const CAREERS_APPLICATION_SURFACE_ID = 'public-careers-nextjs'

/**
 * TASK-354 — Careers apply uses the Growth Forms browser contract as its UX,
 * consent, captcha, and telemetry schema, while the authoritative submit command
 * remains the Hiring intake endpoint from TASK-1367. A future backend-data slice
 * can add a Growth Forms destination adapter for Hiring if the submission ledger
 * itself must become the write path.
 */
export const buildCareersApplicationFormContract = ({
  copy,
  locale,
  opening,
  turnstileSiteKey,
}: {
  copy: CareersCopy
  locale: Locale
  opening: CareersOpeningViewModel
  turnstileSiteKey: string | null
}): RenderContract => ({
  contractVersion: RENDERER_CONTRACT_VERSION,
  form: {
    formId: CAREERS_APPLICATION_FORM_ID,
    formKey: CAREERS_APPLICATION_FORM_KEY,
    slug: CAREERS_APPLICATION_FORM_SLUG,
    formVersionId: CAREERS_APPLICATION_FORM_VERSION_ID,
    version: 1,
    locale,
    formKind: 'application',
  },
  composition: 'multi_step_light',
  fields: [
    {
      key: 'openingPublicId',
      type: 'hidden',
      label: 'Opening public id',
      required: true,
    },
    {
      key: 'firstName',
      type: 'text',
      label: copy.apply.fields.firstName,
      required: true,
      autocomplete: 'given-name',
      validator: 'text',
      maxLength: 200,
    },
    {
      key: 'lastName',
      type: 'text',
      label: copy.apply.fields.lastName,
      required: true,
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
      options: copy.apply.availabilityOptions.map(option => ({ value: option, label: option })),
      maxLength: 200,
    },
    {
      key: 'message',
      type: 'textarea',
      label: copy.apply.fields.message,
      placeholder: copy.apply.placeholders.message,
      validator: 'text',
      maxLength: 4000,
    },
  ],
  steps: [
    { key: 'personal', label: copy.apply.sections.personal, fieldKeys: ['firstName', 'lastName', 'email', 'phone'] },
    {
      key: 'profile',
      label: copy.apply.sections.profile,
      fieldKeys: ['portfolioUrl', 'linkedinUrl', 'availability'],
    },
    { key: 'message', label: copy.apply.sections.message, fieldKeys: ['message'] },
  ],
  copy: {
    title: copy.apply.titleTemplate.replace('{role}', opening.title),
    submit: copy.apply.submit,
    successTitle: copy.apply.successTitle,
    successBody: copy.apply.successBody,
  },
  consent: {
    consentPolicyVersion: 'efeonce-careers-2026-07',
    privacyUrl: `${EFEONCE_URL_HTTPS}/privacy`,
    checkboxes: [
      {
        key: 'careers_data_processing',
        label: copy.apply.consent.title,
        required: true,
      },
    ],
  },
  successBehavior: {
    kind: 'review_pending',
    presentation: 'success_card',
    title: copy.apply.successTitle,
    body: copy.apply.successBody,
    actions: [{ kind: 'external_link', label: copy.apply.moreJobs, href: '/public/careers#gh-listing', target: '_self' }],
  },
  styleVariant: 'careers-html-fidelity',
  surfacePolicy: {
    surfaceId: CAREERS_APPLICATION_SURFACE_ID,
    allowedOrigins: [],
    rendererChannel: 'stable',
  },
  security: turnstileSiteKey
    ? {
        captcha: {
          provider: 'turnstile',
          required: true,
          mode: 'invisible',
          siteKey: turnstileSiteKey,
          execution: 'submit',
        },
      }
    : undefined,
  telemetryPolicy: {
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
})
