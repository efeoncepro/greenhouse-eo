/** Publish the approved three-step HubSpot intake through the existing author/review/publish commands. */
import { writeFileSync } from 'node:fs'

import { authorDraftForm, createHostSurface, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { getFormDefinitionById, getHostSurfaceById, getPublishedVersionBySlug } from '@/lib/growth/forms/store'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import options from './hubspot-scope-options.json'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')
const SLUG = 'efeonce-hubspot-scope'
const SURFACE = 'fhsf-efeonce-hubspot-scope'

const fieldSchema = [
  { key: 'scenario', type: 'radio', label: '¿En qué punto estás con HubSpot?', required: true, options: options.optEscenario.map((option, index) => ({ ...option, value: ['evaluating', 'existing_underperform', 'existing_scaling'][index] })) },
  { key: 'currentHubs', type: 'multiselect', label: '¿Qué usas hoy?', options: options.chipsHoy, visibleWhen: [{ field: 'scenario', includes: 'existing_' }] },
  { key: 'interests', type: 'multiselect', label: '¿Qué necesitas habilitar?', required: true, options: options.chipsInteres },
  { key: 'teamSize', type: 'select', label: '¿Cuántas personas van a usar el CRM?', required: true, options: options.optEquipo },
  { key: 'timeline', type: 'select', label: '¿Cuándo querrías empezar?', required: true, options: options.optPlazo },
  { key: 'budgetStatus', type: 'select', label: '¿Hay presupuesto para esto?', options: options.optPresupuesto },
  { key: 'fullName', type: 'text', label: 'Nombre y apellido', required: true, maxLength: 120, autocomplete: 'name', validator: 'text' },
  { key: 'jobTitle', type: 'text', label: 'Cargo', required: true, maxLength: 120, placeholder: 'ej. Gerente comercial', autocomplete: 'organization-title' },
  { key: 'email', type: 'email', label: 'Email corporativo', required: true, placeholder: 'nombre@empresa.com', autocomplete: 'email', validator: 'corporate_email' },
  { key: 'companyName', type: 'text', label: 'Empresa', required: true, maxLength: 140, autocomplete: 'organization' },
  { key: 'phone', type: 'tel', label: 'Teléfono', autocomplete: 'tel' },
  { key: 'context', type: 'textarea', label: 'Algo más que debamos saber', maxLength: 2000 }
]

async function main() {
  const current = await getPublishedVersionBySlug(SLUG)

  if (current && !process.argv.includes('--revise')) {
    const definition = await getFormDefinitionById(current.form_id)
    const result = { status: 'already_published', formKey: definition?.form_key, surfaceId: SURFACE, version: current.form_version_id }

    writeFileSync('tmp/hubspot-source/form-published.json', JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result))

    return
  }

  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ status: 'dry_run', slug: SLUG, fields: fieldSchema.map(f => f.key), composition: 'multi_step_light', delivery: 'greenhouse_only' }))

    return
  }

  // Security is copied from the published canonical intake, never from local credentials or a mock.
  const reference = await getPublishedVersionBySlug('efeonce-creator-influence-brief')
  const security = (reference?.ui_policy_json as { security?: unknown })?.security

  if (!security) throw new Error('Published reference captcha policy missing')
  if (!(await getHostSurfaceById(SURFACE))) await createHostSurface({ surfaceId: SURFACE, surfaceKind: 'wordpress', surfaceName: 'Efeonce público · HubSpot', originAllowlist: ['https://efeoncepro.com', 'https://www.efeoncepro.com'], allowedFormSlugs: [SLUG], rendererChannel: 'stable', status: 'active' })

  const { formId, formVersionId } = await authorDraftForm({
    slug: SLUG, name: 'Reunión de alcance HubSpot', formKind: 'quote_request', purpose: 'Recibir solicitudes de alcance para implementar y operar HubSpot.', locale: 'es-CL', riskProfile: 'medium', fieldSchema,
    styleVariant: 'hubspot_pillar',
    validationSchema: { emailPolicy: { mode: 'block_field', field: 'email' }, namePolicy: { mode: 'split_full_name', sourceField: 'fullName', firstNameField: 'firstName', lastNameField: 'lastName', confidenceField: 'nameParseConfidence' } },
    uiPolicy: { composition: 'multi_step_light', steps: [
      { key: 'situation', label: 'Tu situación', fieldKeys: ['scenario', 'currentHubs'] },
      { key: 'needs', label: 'Qué necesitas', fieldKeys: ['interests', 'teamSize', 'timeline', 'budgetStatus'] },
      { key: 'contact', label: 'Tus datos', fieldKeys: ['fullName', 'jobTitle', 'email', 'companyName', 'phone', 'context'] }
    ], security },
    copyRefs: { copy: { submit: 'Solicitar la reunión', 'scenario.help': 'Define qué revisamos en la reunión.', 'currentHubs.help': 'Marca todo lo que ya tengas contratado.', 'interests.help': 'Marca lo que te interese, aunque no estés seguro.', 'budgetStatus.help': 'No pedimos el monto. Solo si existe.' }, checkboxes: [{ key: 'contact_permission', label: 'Autorizo a Efeonce a contactarme sobre esta solicitud.', required: true }], noticeText: 'Usamos tus datos para revisar y responder esta solicitud.', privacyUrl: 'https://efeoncepro.com/politica-de-privacidad/' },
    successBehavior: { kind: 'inline_message', presentation: 'success_card', title: 'Listo, la tenemos.', body: 'Recibimos tu solicitud de reunión de alcance. Te contactaremos en el correo que dejaste para coordinar el siguiente paso.', steps: [], actions: [{ kind: 'external_link', label: 'Ver la agenda', href: 'https://efeoncepro.com/agenda/' }] },
    consentPolicyVersion: 'efeonce-hubspot-scope-v1',
    dataClassification: { dataClasses: ['contact_pii', 'company', 'free_text', 'consent_evidence'], persistenceMode: 'normalized_only' },
    destinationPolicy: { mode: 'greenhouse_only', note: 'Captura gobernada y atención comercial desde Growth Forms. No modifica el gate de entrega directa HubSpot de otras landings.' },
    analyticsPolicy: { enabled: true, gtmDataLayer: true, fieldLevelAnalyticsDisabled: true },
    retentionPolicy: { scope: 'prospect_hubspot_scope', legalBasis: 'consent', leadPiiRetentionDays: 730 },
    commercialHandoffPolicy: { owner: 'efeonce-growth', source: 'hubspot-services', sla: '1 día hábil' }, createdBy: 'operator-approved-hubspot-landing-20260830'
  })

  const review = await reviewForm(formVersionId)

  if (!review.ok) throw new Error('Review blocked: ' + review.blockingReasons.join('; '))
  const published = await publishForm(formVersionId)

  if (!published.ok) throw new Error('Publish blocked: ' + published.blockingReasons.join('; '))
  const definition = await getFormDefinitionById(formId)
  const result = { status: 'published', formKey: definition?.form_key, surfaceId: SURFACE, version: formVersionId }

  writeFileSync('tmp/hubspot-source/form-published.json', JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Publication failed'); process.exitCode = 1 }).finally(() => closeGreenhousePostgres())
