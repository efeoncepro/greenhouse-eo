import { EFEONCE_URL_HTTPS } from '@/config/efeonce-brand'
import type { CareersCopy, Locale } from '@/lib/copy'
import type { CareersOpeningViewModel } from '@/lib/hiring/public-careers/view-model'
import type { RenderContract } from '@/growth-forms-renderer/contract'
import { RENDERER_CONTRACT_VERSION } from '@/growth-forms-renderer/version'
import {
  PUBLIC_CAREERS_CV_ACCEPTED_MIME_TYPES,
  PUBLIC_CAREERS_CV_MAX_BYTES,
} from './cv-upload-contract'

export const CAREERS_APPLICATION_FORM_SLUG = 'efeonce-careers-application'
export const CAREERS_APPLICATION_FORM_KEY = '9f7a8fc0-6fa7-4670-8e2d-efe0ce354001'
export const CAREERS_APPLICATION_FORM_ID = 'growth-form-careers-application'
export const CAREERS_APPLICATION_FORM_VERSION_ID = 'growth-form-careers-application-v1'
export const CAREERS_APPLICATION_SURFACE_ID = 'public-careers-nextjs'

/**
 * TASK-1372 — Careers apply exposes the Growth Forms browser contract as its UX,
 * consent, captcha, telemetry, and private CV upload schema. The authoritative
 * write path is the accepted Growth Forms submission, projected reactively into
 * Hiring ATS; no internal destination adapter or browser mapping is exposed.
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
  composition: 'static',
  fields: [
    {
      key: 'openingPublicId',
      type: 'hidden',
      label: 'Opening public id',
      required: true,
      dataClass: 'public',
    },
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
