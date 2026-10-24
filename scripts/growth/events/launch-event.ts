import 'server-only'

/**
 * `pnpm events:launch` — lanza un evento o webinar completo desde UN brief JSON (2026-10-24). Pensado para que
 * cualquier agente lo haga sin desarrollar: formulario de reserva + destino HubSpot + evento en la portada del blog.
 *
 *   1. HubSpot (compartido por todos los eventos): la propiedad `ef_event_key` y el formulario «Reserva de eventos |
 *      Blog Efeonce» (correo + evento + id de envío). Se crean una sola vez; después sólo se verifican.
 *   2. Greenhouse: la superficie `fhsf-efeonce-blog-events` (creada o con el slug agregado) y el formulario
 *      `event_registration` del evento (píldora en línea, `event_key` fijo, cupo y lista de espera, datos del evento
 *      y enlace privado de la sala SÓLO en la política server-only), con su destino HubSpot. Publica por los commands
 *      canónicos; una versión publicada anterior del mismo evento queda deprecada.
 *   3. WordPress: el evento (`/eventos/<slug>/`) con su arte clave y el `form_key`, por `pnpm public-website:blog-home`.
 *   4. Verificación: contrato público (píldora, sin enlace privado), página del evento con `Event`, `.ics`, y la
 *      reserva real en `/blog/`.
 *
 * DRY-RUN por defecto (valida el brief, compila el formulario y muestra el plan; no escribe). `--apply` ejecuta todo.
 * Los correos los envía Greenhouse con `GROWTH_EVENT_EMAILS_ENABLED` (ops-worker). Manual:
 * docs/manual-de-uso/public-site/lanzar-evento-o-webinar.md
 *
 *   pnpm events:launch -- --brief scripts/growth/events/examples/webinar.example.json [--apply]
 */

import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import { z } from 'zod'

import { addDestination, authorDraftForm, deprecateForm, publishForm, reviewForm } from '@/lib/growth/forms/commands'
import { EVENT_MODALITIES } from '@/lib/growth/forms/contracts'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import {
  allowFormSlugOnSurface,
  getFormDefinitionById,
  getFormVersionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  insertHostSurface,
  listDestinationsForVersion,
  type FormDefinitionRow,
  type FormVersionRow
} from '@/lib/growth/forms/store'
import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { closeGreenhousePostgres } from '@/lib/postgres/client'

import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../../lib/load-greenhouse-tool-env'
import { buildEventRegistrationVersion, eventRegistrationFormConfigSchema } from '../forms/event-registration-form.config'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const ROOT = resolve(__dirname, '../../..')
const SITE = 'https://efeoncepro.com'
const GREENHOUSE = 'https://greenhouse.efeoncepro.com'
const SURFACE = 'fhsf-efeonce-blog-events'
const PORTAL = 48713323
const HUBSPOT_FORM_NAME = 'Reserva de eventos | Blog Efeonce'
const EVENT_KEY_PROPERTY = 'ef_event_key'
const SUBMISSION_ID_PROPERTY = 'ef_greenhouse_submission_id'
// Formulario HubSpot de referencia del que se clona la configuración base (mismo que la suscripción a Glitch).
const HUBSPOT_REFERENCE_FORM = '8bee8dca-27f2-4ca5-ac09-7606351c7e72'

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)

export const eventBriefSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(200),
    excerpt: z.string().trim().min(1).max(400),
    content: z.string().trim().min(1),
    startUtc: z.string().datetime({ offset: true }),
    timezone: z.string().trim().default('America/Santiago'),
    durationMin: z.number().int().positive().max(1440).default(45),
    modality: z.enum(EVENT_MODALITIES).default('online'),
    venue: z.string().trim().max(200).optional(),
    territory: z.string().trim().max(40).default('aeo'),
    paid: z.boolean().default(false),
    capacity: z.number().int().positive().max(100_000).optional(),
    overCapacity: z.enum(['waitlist', 'reject']).default('waitlist'),
    speakers: z.array(z.object({ user_id: z.number().int().optional(), name: z.string().optional(), role: z.string().default(''), org: z.string().default('') })).min(1),
    takeaways: z.array(z.object({ t: z.string().min(1), d: z.string().default('') })).length(3),
    agenda: z.array(z.object({ h: z.string().regex(/^\d{2}:\d{2}$/), t: z.string().min(1) })).min(1),
    joinUrl: z.string().url().refine(url => url.startsWith('https://'), 'joinUrl debe ser https').optional(),
    reminderMinutesBefore: z.number().int().min(15).max(1440).default(120),
    keyArt: z.string().min(1),
    keyArtAlt: z.string().trim().min(1).max(300),
    labels: z.record(z.string(), z.string()).optional()
  })
  .strict()

export type EventBrief = z.infer<typeof eventBriefSchema>

const apply = process.argv.includes('--apply')

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`)

  return i >= 0 ? process.argv[i + 1] : undefined
}

const step = (label: string) => console.log(`\n▸ ${label}`)
const ok = (message: string) => console.log(`  ✓ ${message}`)
const plan = (message: string) => console.log(`  · ${message}`)

const dateLabel = (brief: EventBrief) =>
  new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', timeZone: brief.timezone }).format(new Date(brief.startUtc))

/** La configuración del formulario del evento a partir del brief (misma forma que el publicador de TASK-2053). */
export const formConfigFromBrief = (brief: EventBrief) =>
  eventRegistrationFormConfigSchema.parse({
    slug: brief.slug,
    name: `Evento · ${brief.title}`,
    eventKey: brief.slug,
    eventDateLabel: dateLabel(brief),
    ...(brief.capacity !== undefined ? { capacity: brief.capacity } : {}),
    overCapacity: brief.overCapacity,
    showRegistrationsCount: false,
    surfaceId: SURFACE,
    surfaceName: 'Portada del blog · Eventos (efeoncepro.com/blog/)',
    origins: [SITE, 'https://www.efeoncepro.com'],
    privacyUrl: `${SITE}/politica-de-privacidad/`,
    consentPolicyVersion: 'efeonce-events-2026-10',
    event: {
      title: brief.title,
      startUtc: brief.startUtc,
      timezone: brief.timezone,
      durationMin: brief.durationMin,
      modality: brief.modality,
      ...(brief.venue ? { venue: brief.venue } : {}),
      pageUrl: `${SITE}/eventos/${brief.slug}/`
    },
    ...(brief.joinUrl ? { joinUrl: brief.joinUrl } : {}),
    reminderMinutesBefore: brief.reminderMinutesBefore,
    ...(brief.labels ? { labels: brief.labels } : {})
  })

const hubspotMapping = (hubspotFormId: string, note: string) => ({
  portalId: String(PORTAL),
  formGuid: hubspotFormId,
  fieldMapping: { email: 'email', event_key: EVENT_KEY_PROPERTY },
  submissionIdProperty: SUBMISSION_ID_PROPERTY,
  consentText: note
})

// ── 1. HubSpot ───────────────────────────────────────────────────────────────────────────────────────────────────

const hubspot = async () => {
  const token = await getHubSpotAccessToken()

  const hs = async (path: string, method = 'GET', body?: unknown): Promise<any> => {
    const r = await fetch('https://api.hubapi.com' + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    })

    if (r.status === 404) return null
    if (!r.ok) throw new Error(`HubSpot ${method} ${path} ${r.status}: ${await r.text()}`)

    return r.status === 204 ? {} : r.json()
  }

  if ((await hs('/account-info/v3/details')).portalId !== PORTAL) throw new Error('El token de HubSpot no es del portal de Efeonce')

  let property = await hs(`/crm/v3/properties/contacts/${EVENT_KEY_PROPERTY}`)

  if (!property) {
    if (!apply) plan(`crearía la propiedad de contacto ${EVENT_KEY_PROPERTY} («Último Evento Reservado»)`)
    else {
      property = await hs('/crm/v3/properties/contacts', 'POST', {
        name: EVENT_KEY_PROPERTY,
        label: 'Último Evento Reservado',
        description: 'Clave del último evento o webinar de Efeonce que el contacto reservó (Greenhouse, portada del blog).',
        groupName: 'contactinformation',
        type: 'string',
        fieldType: 'text',
        formField: true
      })
      ok(`propiedad ${EVENT_KEY_PROPERTY} creada`)
    }
  } else ok(`propiedad ${EVENT_KEY_PROPERTY} existe`)

  const forms: any[] = []
  let after = ''

  do {
    const page = await hs('/marketing/v3/forms?limit=100' + (after ? '&after=' + encodeURIComponent(after) : ''))

    forms.push(...page.results)
    after = page.paging?.next?.after ?? ''
  } while (after)

  const matches = forms.filter(f => f.name === HUBSPOT_FORM_NAME)

  if (matches.length > 1) throw new Error(`Hay ${matches.length} formularios HubSpot «${HUBSPOT_FORM_NAME}»: deja uno`)

  if (matches[0]) {
    ok(`formulario HubSpot «${HUBSPOT_FORM_NAME}» existe (${matches[0].id})`)

    return matches[0].id as string
  }

  if (!apply) {
    plan(`crearía el formulario HubSpot «${HUBSPOT_FORM_NAME}» (correo, ${EVENT_KEY_PROPERTY}, ${SUBMISSION_ID_PROPERTY})`)

    return 'hubspot-form-pending'
  }

  const ref = await hs(`/marketing/forms/2026-09-beta/${HUBSPOT_REFERENCE_FORM}`)

  const field = (name: string, label: string, hidden: boolean, fieldType: string, required = false) => ({
    groupType: 'default_group',
    richTextType: 'text',
    fields: [{ objectTypeId: '0-1', name, label, required, hidden, fieldType, ...(fieldType === 'email' ? { validation: { blockedEmailDomains: [], useDefaultBlockList: false } } : {}) }]
  })

  const created = await hs('/marketing/forms/2026-09-beta', 'POST', {
    formType: 'hubspot',
    name: HUBSPOT_FORM_NAME,
    createdAt: new Date().toISOString(),
    archived: false,
    fieldGroups: [
      field('email', 'Correo electrónico', false, 'email', true),
      field(EVENT_KEY_PROPERTY, 'Último Evento Reservado', true, 'single_line_text'),
      field(SUBMISSION_ID_PROPERTY, 'Greenhouse submission ID', true, 'single_line_text')
    ],
    configuration: { ...ref.configuration, notifyRecipients: [], notifyContactOwner: false, prePopulateKnownValues: false, postSubmitAction: { type: 'thank_you', value: 'Recibimos tu reserva.' } },
    displayOptions: { ...ref.displayOptions, submitButtonText: 'Reservar' },
    legalConsentOptions: { type: 'implicit_consent_to_process', privacyText: 'Usamos tu correo para gestionar tu reserva.', communicationConsentText: '', communicationsCheckboxes: [] }
  })

  ok(`formulario HubSpot «${HUBSPOT_FORM_NAME}» creado (${created.id})`)

  return created.id as string
}

// ── 2. Greenhouse ────────────────────────────────────────────────────────────────────────────────────────────────

const preflight = (draft: ReturnType<typeof buildEventRegistrationVersion>, mapping: Record<string, unknown>) => {
  const now = new Date()
  const definition = { form_id: 'fdef-preflight', form_key: '00000000-0000-4000-8000-000000000000', slug: draft.slug, name: draft.name, form_kind: draft.formKind, purpose: draft.purpose, risk_profile: draft.riskProfile, owner_team: null, status: 'active', default_locale: draft.locale, created_by: null, created_at: now, updated_at: now } as FormDefinitionRow
  const version = { form_version_id: 'fver-preflight', form_id: definition.form_id, version: 1, status: 'review', locale: draft.locale, field_schema_json: draft.fieldSchema, validation_schema_json: draft.validationSchema, copy_refs_json: draft.copyRefs, style_variant: null, ui_policy_json: draft.uiPolicy, success_behavior_json: draft.successBehavior, consent_policy_version: draft.consentPolicyVersion, data_classification_json: {}, destination_policy_json: draft.destinationPolicy, analytics_policy_json: {}, retention_policy_json: draft.retentionPolicy, commercial_handoff_policy_json: {}, published_at: null, created_at: now } as FormVersionRow
  const destination = { destination_id: 'fdst-preflight', form_version_id: 'fver-preflight', provider: 'hubspot', mapping_json: mapping } as never

  return compileFormVersion(definition, version, [destination], { forPublication: true })
}

const greenhouse = async (brief: EventBrief, hubspotFormId: string) => {
  const config = formConfigFromBrief(brief)
  const draft = buildEventRegistrationVersion(config)
  const mapping = hubspotMapping(hubspotFormId, config.labels.note)
  const compiled = preflight(draft, mapping)

  if (!compiled.ok) throw new Error(`El formulario no compila: ${compiled.blockingReasons.join('; ')}`)
  if (JSON.stringify(compiled.renderContract).includes(brief.joinUrl ?? '\u0000')) throw new Error('El enlace privado se filtraría al contrato público')
  ok(`formulario compila: ${compiled.renderContract?.presentation}, sin enlace privado en el contrato público`)

  const current = await getPublishedVersionBySlug(config.slug)
  const surface = await getHostSurfaceById(SURFACE)

  if (!apply) {
    plan(surface ? `superficie ${SURFACE} existe; agregaría el slug ${config.slug}` : `crearía la superficie ${SURFACE}`)
    plan(`publicaría ${config.slug}${current ? ` y deprecaría ${current.form_version_id}` : ''} con destino HubSpot`)

    return { formKey: '(se asigna al publicar)' }
  }

  if (!surface) {
    await insertHostSurface({ surfaceId: SURFACE, surfaceKind: 'wordpress', surfaceName: config.surfaceName, originAllowlist: config.origins, allowedFormSlugs: [config.slug], status: 'active' })
    ok(`superficie ${SURFACE} creada`)
  } else {
    await allowFormSlugOnSurface(SURFACE, config.slug)
    ok(`superficie ${SURFACE} permite ${config.slug}`)
  }

  const { formId, formVersionId } = await authorDraftForm(draft)

  await addDestination({
    formVersionId,
    provider: 'hubspot',
    adapterKind: 'hubspot_forms_secure_submit',
    adapterVersion: 'hsforms-v3-secure-submit',
    endpointStatus: 'legacy_supported',
    deliveryMode: 'direct',
    mapping,
    consentRequirements: { required: true },
    retryPolicy: { backoff: 'exponential_jitter', maxAttempts: 5 }
  })

  const fresh = await getFormVersionById(formVersionId)

  if (fresh?.status === 'draft') await reviewForm(formVersionId)
  const published = await publishForm(formVersionId)

  if (!published.ok) throw new Error(`No se pudo publicar: ${published.blockingReasons.join('; ')}`)
  if (current && current.form_version_id !== formVersionId) await deprecateForm(current.form_version_id)

  const def = await getFormDefinitionById(formId)
  const dests = await listDestinationsForVersion(formVersionId)

  ok(`formulario publicado: ${config.slug} (${formVersionId}), form_key ${def?.form_key}, ${dests.length} destino`)

  return { formKey: def!.form_key }
}

// ── 3. WordPress ─────────────────────────────────────────────────────────────────────────────────────────────────

const wordpress = (brief: EventBrief, formKey: string) => {
  const data = {
    title: brief.title,
    slug: brief.slug,
    status: 'publish',
    excerpt: brief.excerpt,
    content: brief.content,
    meta: {
      start_utc: brief.startUtc,
      tz: brief.timezone,
      duration_min: brief.durationMin,
      modality: brief.modality,
      venue: brief.venue ?? '',
      territory: brief.territory,
      form_key: formKey,
      status: 'scheduled',
      paid: brief.paid,
      limited_seats: brief.capacity !== undefined,
      speakers: brief.speakers,
      takeaways: brief.takeaways,
      agenda: brief.agenda
    }
  }

  const dir = join(ROOT, 'tmp/events')

  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${brief.slug}.event.json`)

  writeFileSync(file, JSON.stringify(data, null, 2))
  const args = ['-s', 'public-website:blog-home', 'event', file, '--image', resolve(brief.keyArt), '--alt', brief.keyArtAlt, ...(apply ? ['--apply'] : [])]

  console.log(execFileSync('pnpm', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).split('\n').slice(0, 14).join('\n'))
}

// ── 4. Verificación ──────────────────────────────────────────────────────────────────────────────────────────────

const verify = async (brief: EventBrief, formKey: string) => {
  const contract = await fetch(`${GREENHOUSE}/api/public/growth/forms/${formKey}?surfaceId=${SURFACE}`, { headers: { Origin: SITE } })
  const text = await contract.text()

  if (!contract.ok || !text.includes('"presentation":"inline_pill"')) throw new Error(`Contrato público no disponible (${contract.status})`)
  if (brief.joinUrl && text.includes(brief.joinUrl)) throw new Error('El enlace privado aparece en el contrato público')
  ok('contrato público: píldora, sin enlace privado')

  const page = await (await fetch(`${SITE}/eventos/${brief.slug}/?v=${Date.now()}`)).text()

  if (!page.includes('"@type":"Event"')) throw new Error('La página del evento no publica Event')
  if (brief.joinUrl && page.includes(brief.joinUrl)) throw new Error('El enlace privado aparece en la página del evento')
  ok(`página del evento con Event: ${SITE}/eventos/${brief.slug}/`)

  console.log(execFileSync('pnpm', ['-s', 'public-website:blog-home', 'purge', '--apply'], { cwd: ROOT, encoding: 'utf8' }).includes('"applied": true') ? '  ✓ /blog/ purgada' : '  ! purga no confirmada')
}

const main = async () => {
  const brief = eventBriefSchema.parse(JSON.parse(readFileSync(resolve(arg('brief') ?? fail('Pasa --brief <archivo.json>')), 'utf8')))

  console.log(`Lanzar evento «${brief.title}» (${brief.slug}) — ${apply ? 'APPLY' : 'DRY-RUN'}`)
  if (new Date(brief.startUtc).getTime() <= Date.now()) throw new Error('El inicio del evento ya pasó')
  if (!brief.joinUrl) console.log('  ! sin joinUrl: la confirmación dirá que el enlace llega antes del evento; agrégalo y relanza para incluirlo')

  step('1. HubSpot')
  const hubspotFormId = await hubspot()

  step('2. Greenhouse')
  const { formKey } = await greenhouse(brief, hubspotFormId)

  step('3. WordPress')
  wordpress(brief, formKey)

  if (!apply) return console.log('\n→ Plan. Re-ejecuta con --apply para lanzar (necesita el visto bueno del operador).')

  step('4. Verificación')
  await verify(brief, formKey)
  console.log(`\nListo. Revisa en vivo: pnpm public-website:blog-home verify --browser`)
}

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

if (process.argv[1]?.endsWith('launch-event.ts')) {
  main()
    .catch(error => {
      console.error(`✗ ${error instanceof Error ? error.message : error}`)
      process.exitCode = 1
    })
    .finally(closeGreenhousePostgres)
}
