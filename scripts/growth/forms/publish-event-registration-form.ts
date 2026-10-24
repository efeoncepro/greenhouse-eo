import 'server-only'

/**
 * TASK-2053 — Publicador gobernado de formularios de reserva por evento.
 *
 * Un evento = un formulario (`event_registration`) con presentación `inline_pill`, identificación
 * estática (`event_key`, campo oculto que el servidor impone), cupo y lista de espera. Lee un JSON
 * de configuración (forma en `event-registration-form.config.ts`) y publica por los commands
 * canónicos (`authorDraftForm` → `publishForm` → `deprecateForm` de la versión anterior).
 *
 * DRY-RUN por defecto: compila la versión con el MISMO policy compiler de la publicación y reporta
 * el veredicto sin tocar la base. `--apply` muta; `--force` republica aunque ya exista versión.
 * Nunca toca destinos HubSpot: el destino de cada evento se agrega con
 * `pnpm growth:forms:activate-hubspot-destinations` (registry de destinos).
 *
 *   set -a && source .env.local && set +a
 *   pnpm growth:forms:publish-event-registration -- --config <ruta.json> [--apply] [--force]
 */

import { readFileSync } from 'node:fs'

import { authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import { compileFormVersion } from '@/lib/growth/forms/policy-compiler'
import type { FormDefinitionRow, FormVersionRow } from '@/lib/growth/forms/store'
import {
  allowFormSlugOnSurface,
  getFormDefinitionById,
  getHostSurfaceById,
  getPublishedVersionBySlug,
  insertHostSurface
} from '@/lib/growth/forms/store'

import {
  buildEventRegistrationVersion,
  eventRegistrationFormConfigSchema,
  type EventRegistrationFormConfig
} from './event-registration-form.config'

const APPLY = process.argv.includes('--apply')
const FORCE = process.argv.includes('--force')

const argValue = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag)

  return idx >= 0 ? process.argv[idx + 1] : undefined
}

const loadConfig = (path: string): EventRegistrationFormConfig => {
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'))
  const parsed = eventRegistrationFormConfigSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(`config inválida: ${parsed.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`)
  }

  return parsed.data
}

/** Compila la versión en memoria con el gate de publicación (no escribe nada). */
const preflight = (draft: ReturnType<typeof buildEventRegistrationVersion>) => {
  const now = new Date()

  const definition: FormDefinitionRow = {
    form_id: 'fdef-preflight',
    form_key: '00000000-0000-4000-8000-000000000000',
    slug: draft.slug,
    name: draft.name,
    form_kind: draft.formKind,
    purpose: draft.purpose,
    risk_profile: draft.riskProfile,
    owner_team: null,
    status: 'active',
    default_locale: draft.locale,
    created_by: null,
    created_at: now,
    updated_at: now
  }

  const version: FormVersionRow = {
    form_version_id: 'fver-preflight',
    form_id: definition.form_id,
    version: 1,
    status: 'review',
    locale: draft.locale,
    field_schema_json: draft.fieldSchema,
    validation_schema_json: draft.validationSchema,
    copy_refs_json: draft.copyRefs,
    style_variant: null,
    ui_policy_json: draft.uiPolicy,
    success_behavior_json: draft.successBehavior,
    consent_policy_version: draft.consentPolicyVersion,
    data_classification_json: {},
    destination_policy_json: draft.destinationPolicy,
    analytics_policy_json: {},
    retention_policy_json: draft.retentionPolicy,
    commercial_handoff_policy_json: {},
    published_at: null,
    created_at: now
  }

  return compileFormVersion(definition, version, [], { forPublication: true })
}

const main = async (): Promise<void> => {
  const configPath = argValue('--config')

  if (!configPath) {
    console.error('Uso: --config <ruta.json> [--apply] [--force]')
    process.exit(1)
  }

  const config = loadConfig(configPath)
  const draft = buildEventRegistrationVersion(config)
  const compiled = preflight(draft)

  console.log(`Publicar reserva de evento — modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}${FORCE ? ' (force)' : ''}`)
  console.log(`  slug=${config.slug} evento=${config.eventKey} cupo=${config.capacity ?? 'sin cupo'} política=${config.overCapacity}`)

  if (!compiled.ok) {
    console.error(`  FAIL preflight — ${compiled.blockingReasons.join('; ')}`)
    process.exit(1)
  }

  console.log(`  preflight OK — presentación=${compiled.renderContract?.presentation} conteo=${config.showRegistrationsCount ? 'visible' : 'oculto'}`)

  const current = await getPublishedVersionBySlug(config.slug)

  if (current && !FORCE) {
    const def = await getFormDefinitionById(current.form_id)

    console.log(`  ya publicado (${current.form_version_id}); usa --force para republicar. form_key=${def?.form_key}`)

    return
  }

  if (!APPLY) {
    console.log(`  DRY-RUN: publicaría una versión nueva${current ? ` y deprecaría ${current.form_version_id}` : ''}; surface=${config.surfaceId}`)

    return
  }

  const surface = await getHostSurfaceById(config.surfaceId)

  if (!surface) {
    await insertHostSurface({
      surfaceId: config.surfaceId,
      surfaceKind: 'wordpress',
      surfaceName: config.surfaceName,
      originAllowlist: config.origins,
      allowedFormSlugs: [config.slug],
      status: 'active'
    })
    console.log(`  surface creada: ${config.surfaceId}`)
  } else {
    // Una superficie sirve a varios eventos: sin el slug en su lista, el formulario de este evento no carga.
    await allowFormSlugOnSurface(config.surfaceId, config.slug)
    console.log(`  surface existente: ${config.surfaceId} (permite ${config.slug})`)
  }

  const { formId, formVersionId } = await authorDraftForm(draft)
  const published = await publishForm(formVersionId)

  if (!published.ok) {
    console.error(`  FAIL publish — ${published.blockingReasons.join('; ')}`)
    process.exit(1)
  }

  if (current && current.form_version_id !== formVersionId) {
    await deprecateForm(current.form_version_id)
    console.log(`  deprecada la versión anterior: ${current.form_version_id}`)
  }

  const def = await getFormDefinitionById(formId)

  console.log(`  PUBLICADO — form_key=${def?.form_key} surface=${config.surfaceId}`)
}

main().catch(error => {
  console.error('FAIL:', error instanceof Error ? error.message : error)
  process.exit(1)
})
