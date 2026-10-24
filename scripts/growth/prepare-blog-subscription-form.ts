import 'server-only'

import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { authorDraftForm, reviewForm } from '@/lib/growth/forms/commands'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import { getFormDefinitionBySlug, getFormVersionById, getPublishedVersionBySlug, listVersionsForForm } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

/** Preparation only. --apply-draft creates a reviewable draft, never publishes or changes WordPress. */
const SLUG = 'efeonce-blog-subscription'
const SURFACE = 'fhsf-efeonce-blog-subscription'
const CONSENT = 'Quiero recibir guías, ideas y novedades de Efeonce por correo. Puedo darme de baja cuando quiera.'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

async function main() {
  const reference = await getPublishedVersionBySlug('efeonce-contacto')
  const security = (reference?.ui_policy_json as { security?: unknown } | null)?.security

  if (!security) throw new Error('Published captcha policy missing')
  const existing = await getFormDefinitionBySlug(SLUG)
  const versions = existing ? await listVersionsForForm(existing.form_id) : []

  if (versions.some(v => v.status === 'published')) throw new Error('Already published: inspect the live version before changing it')

  if (!process.argv.includes('--apply-draft') && !existing) {
    console.log(JSON.stringify({ mode: 'dry_run', slug: SLUG, fields: ['email'], kind: 'subscribe', consent: CONSENT,
      blockers: ['HubSpot communications worker release', 'Dedicated HubSpot subscription destination', 'GA4 subscription routing before cutover'],
      wordpress: { pageId: 18456, widgetId: '4246f0d', previousFormId: 17852 } }, null, 2))

return
  }

  // Reuse the prepared version. Do not duplicate drafts on retries or change another author's version.
  if (existing && (existing.created_by !== 'operator-blog-subscription-20261020' || versions.length !== 1)) {
    throw new Error('Unexpected existing definition/version: inspect before proceeding')
  }

  const prepared = existing ? { formId: existing.form_id, formVersionId: versions[0].form_version_id } : await authorDraftForm({
    slug: SLUG,
    name: 'Suscripción a contenidos · Blog Efeonce',
    formKind: 'subscribe',
    purpose: 'Recibir guías, ideas y novedades editoriales de Efeonce por correo desde el blog.',
    riskProfile: 'low', locale: 'es-CL',
    fieldSchema: [{ key: 'email', type: 'email', label: 'Correo electrónico', placeholder: 'Tu correo electrónico', required: true,
      maxLength: 200, autocomplete: 'email', inputMode: 'email', validator: 'email_syntax' }],
    validationSchema: { emailPolicy: { mode: 'off', field: 'email' } },
    uiPolicy: { composition: 'static', security },
    copyRefs: {
      copy: { submit: 'Suscribirme', 'email.error.required': 'Escribe tu correo electrónico.',
        'email.error.email_format': 'Revisa el correo. Por ejemplo: nombre@correo.com.',
        'newsletter_consent.error.required': 'Confirma que quieres recibir nuestros contenidos.' },
      checkboxes: [{ key: 'newsletter_consent', label: CONSENT, required: true }],
      noticeText: 'Usamos tu correo para gestionar esta suscripción.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    },
    successBehavior: { kind: 'inline_message', message: 'Recibimos tu solicitud de suscripción. Gracias por acompañarnos.' },
    consentPolicyVersion: 'efeonce-blog-subscription-v1',
    dataClassification: { dataClasses: ['contact_pii', 'consent_evidence'], persistenceMode: 'normalized_only' },
    // Deliberately no operational destination until the compatible worker and native form are verified.
    destinationPolicy: {},
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'editorial_subscription', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-editorial', source: 'blog', commercialLead: false },
    createdBy: 'operator-blog-subscription-20261020'
  })

  if (process.argv.includes('--apply-draft')) await reviewForm(prepared.formVersionId)
  const definition = await getFormDefinitionBySlug(SLUG)
  const version = await getFormVersionById(prepared.formVersionId)

  if (!definition || !version) throw new Error('Independent readback failed')
  const publicationCheck = compileFormVersion(definition, version, [], { forPublication: true })

  if (publicationCheck.ok) throw new Error('Preparation must remain blocked without a destination')
  const review = { ok: publicationCheck.ok, blockingReasons: publicationCheck.blockingReasons }
  const compiled = compileFormVersion(definition, version, [], { forPublication: false })

  if (!compiled.renderContract) throw new Error('Preview contract unavailable')
  compiled.renderContract.surfacePolicy = { surfaceId: SURFACE, allowedOrigins: ['https://efeoncepro.com', 'https://www.efeoncepro.com'], rendererChannel: 'stable' }
  const output = resolve('.captures/2026-10-20-blog-growth-form')

  await mkdir(output, { recursive: true })
  await writeFile(resolve(output, 'render-contract.preview.json'), JSON.stringify(compiled.renderContract, null, 2))

  const result = { status: version.status, formKey: definition.form_key, formVersionId: version.form_version_id,
    surfaceId: SURFACE, review, published: false, wordpressChanged: false }

  await writeFile(resolve(output, 'draft-readback.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Preparation failed'); process.exitCode = 1 }).finally(closeGreenhousePostgres)
