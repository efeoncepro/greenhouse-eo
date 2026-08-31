/** Operator-approved Content Marketing intake: configuration of the existing Growth Forms engine. */
import { writeFileSync } from 'node:fs'

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const slug = 'efeonce-content-marketing',
  surfaceId = 'fhsf-efeonce-content-marketing'

const fields = [
  {
    key: 'fullName',
    type: 'text',
    label: 'Nombre',
    required: true,
    maxLength: 120,
    autocomplete: 'name',
    validator: 'text'
  },
  {
    key: 'email',
    type: 'email',
    label: 'Email laboral',
    required: true,
    placeholder: 'nombre@empresa.com',
    autocomplete: 'email',
    validator: 'corporate_email'
  },
  { key: 'companyName', type: 'text', label: 'Empresa', required: true, maxLength: 140, autocomplete: 'organization' },
  {
    key: 'mode',
    type: 'select',
    label: 'Modo que te interesa',
    placeholder: 'Aún no lo sé',
    options: [
      { value: 'Operado por Efeonce', label: 'Operado por Efeonce' },
      { value: 'Co-operado', label: 'Co-operado' },
      { value: 'Content Engine', label: 'Content Engine' }
    ]
  },
  {
    key: 'challenge',
    type: 'textarea',
    label: '¿Qué está pasando hoy con tus contenidos?',
    maxLength: 2000,
    placeholder: 'Producimos, pero cada pieza se negocia de cero y nadie sabe en qué va.'
  }
]

async function main() {
  const current = await getPublishedVersionBySlug(slug)

  if (current && !process.argv.includes('--revise')) {
    const d = await getFormDefinitionById(current.form_id)
    const result = { status: 'already_published', formKey: d?.form_key, surfaceId, version: current.form_version_id }

    writeFileSync('tmp/content-marketing-build/form-published.json', JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))

return
  }

  if (!process.argv.includes('--apply')) {
    console.log(
      JSON.stringify({
        status: 'dry_run',
        slug,
        surfaceId,
        fields: fields.map(f => f.key),
        composition: 'multi_step_light'
      })
    )

return
  }

  const reference = await getPublishedVersionBySlug('efeonce-creator-influence-brief')
  const security = (reference?.ui_policy_json as { security?: unknown })?.security

  if (!security) throw Error('Reference security policy missing')
  if (!(await getHostSurfaceById(surfaceId)))
    await createHostSurface({
      surfaceId,
      surfaceKind: 'wordpress',
      surfaceName: 'Efeonce público · Content Marketing',
      originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'],
      allowedFormSlugs: [slug],
      rendererChannel: 'stable',
      status: 'active'
    })

  const { formId, formVersionId } = await authorDraftForm({
    slug,
    name: 'Conversación sobre operación de contenidos',
    formKind: 'quote_request',
    purpose: 'Recibir solicitudes comerciales para Content Marketing y Content Ops.',
    locale: 'es-CL',
    riskProfile: 'medium',
    fieldSchema: fields,
    styleVariant: 'content_marketing',
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
    uiPolicy: {
      composition: 'multi_step_light',
      steps: [
        { key: 'identity', label: 'Quién nos escribe', fieldKeys: ['fullName', 'email', 'companyName'] },
        { key: 'context', label: 'Tu contexto', fieldKeys: ['mode', 'challenge'] }
      ],
      security
    },
    copyRefs: {
      copy: {
        submit: 'Enviar solicitud',
        'step.identity.help': 'Tres datos y seguimos.',
        'step.context.help': 'Opcional, pero prepara mejor la conversación.',
        'mode.help': 'Puedes cambiarlo. Lo revisamos juntos.'
      },
      checkboxes: [
        { key: 'contact_permission', label: 'Autorizo a Efeonce a contactarme sobre esta solicitud.', required: true }
      ],
      noticeText: 'Usamos tus datos solo para responder esta solicitud.',
      privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/'
    },
    successBehavior: {
      kind: 'inline_message',
      presentation: 'success_card',
      title: 'Solicitud recibida.',
      body: 'Recibimos tu solicitud. Revisaremos el contexto que compartiste para preparar la conversación sobre tu operación de contenidos.',
      steps: [],
      actions: [{ kind: 'external_link', label: 'Ver la agenda', href: 'https://efeoncepro.com/agenda/' }]
    },
    consentPolicyVersion: 'efeonce-content-marketing-v1',
    dataClassification: {
      dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'],
      persistenceMode: 'normalized_only'
    },
    destinationPolicy: {
      mode: 'greenhouse_only',
      note: 'Atención comercial desde Growth Forms. No habilita envíos directos a HubSpot ni modifica otras landings.'
    },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_content_marketing', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'content-marketing' },
    createdBy: 'operator-approved-content-marketing-20260831'
  })

  const review = await reviewForm(formVersionId)

  if (!review.ok) throw Error('Review blocked: ' + review.blockingReasons.join('; '))
  const published = await publishForm(formVersionId)

  if (!published.ok) throw Error('Publish blocked: ' + published.blockingReasons.join('; '))
  const d = await getFormDefinitionById(formId)
  const result = { status: 'published', formKey: d?.form_key, surfaceId, version: formVersionId }

  writeFileSync('tmp/content-marketing-build/form-published.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}

main()
  .catch(() => {
    console.error('Content Marketing form publication failed; inspect governed review without exposing private data.')
    process.exitCode = 1
  })
  .finally(() => closeGreenhousePostgres())
