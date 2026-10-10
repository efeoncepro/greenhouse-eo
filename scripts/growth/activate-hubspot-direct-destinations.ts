import 'server-only'

/**
 * Activación gobernada de la entrega directa a HubSpot para los Growth Forms del sitio público.
 *
 * Lee `hubspot-destinations.registry.ts` y, por cada formulario:
 *
 *   1. HubSpot (`--apply-hubspot`): asegura el grupo de properties, las properties custom (los
 *      `select` nacen con las opciones del `field_schema` publicado), el formulario HubSpot (lo
 *      crea si no existe, clonando la configuración del formulario de referencia) y sus campos.
 *      En formularios existentes sólo AGREGA campos/opciones y relaja `required` de lo que no es
 *      correo: Greenhouse es dueño de la validación, y un campo obligatorio en HubSpot que
 *      Greenhouse no garantiza termina en `REQUIRED_FIELD` → dead-letter.
 *   2. Contract check (siempre): cada property mapeada está en la definición del formulario,
 *      cada opción de Greenhouse existe en HubSpot y nada salvo el correo es obligatorio. Son
 *      las tres causas de 400 no reintentable de secure-submit.
 *   3. Smoke (`--smoke`): dos envíos reales por secure-submit con un contacto de prueba, usando
 *      el MISMO `buildSecureSubmitBody` del adapter (payload completo + payload mínimo).
 *   4. Greenhouse (`--apply-greenhouse`): clona la versión publicada, adjunta el destino en
 *      `direct` con el mapeo del registro, publica y depreca las versiones publicadas previas.
 *      Sólo vía commands canónicos; exige contract check limpio.
 *
 * DRY-RUN por defecto (sin flags no muta nada). Rollback de un formulario: republicar la versión
 * anterior o adjuntar el destino con `delivery_mode='disabled'`; nunca borrar attempts.
 *
 * Uso:
 *   pnpm growth:forms:activate-hubspot-destinations
 *   pnpm growth:forms:activate-hubspot-destinations -- --only=efeonce-contacto --apply-hubspot --smoke
 *   pnpm growth:forms:activate-hubspot-destinations -- --apply-hubspot --smoke --apply-greenhouse
 */

import { execFileSync } from 'node:child_process'

import { addDestination, authorDraftForm, deprecateForm, publishForm } from '@/lib/growth/forms/commands'
import {
  buildSecureSubmitBody,
  HUBSPOT_FORMS_ADAPTER_KIND,
  HUBSPOT_FORMS_ADAPTER_VERSION,
} from '@/lib/growth/forms/destinations/hubspot/adapter'
import { resolveNameNormalizationPolicy } from '@/lib/growth/forms/name-normalization'
import {
  type FormConsentSnapshotRow,
  type FormSubmissionRow,
  type FormVersionRow,
  getFormDefinitionByKey,
  getPublishedVersionBySlug,
  listDestinationsForVersion,
  listVersionsForForm,
} from '@/lib/growth/forms/store'
import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { closeGreenhousePostgres } from '@/lib/postgres/client'
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { preserveFormVersionFields } from '../lib/preserve-form-version-fields'
import {
  HUBSPOT_DESTINATION_SPECS,
  HUBSPOT_PORTAL_ID,
  HUBSPOT_PROPERTY_GROUP,
  HUBSPOT_REFERENCE_FORM_ID,
  type HubSpotDestinationFieldSpec,
  type HubSpotDestinationSpec,
} from './hubspot-destinations.registry'

loadGreenhouseToolEnv()
applyGreenhousePostgresProfile('ops')

const argv = process.argv.slice(2)
const APPLY_HUBSPOT = argv.includes('--apply-hubspot')
const SMOKE = argv.includes('--smoke')
const APPLY_GREENHOUSE = argv.includes('--apply-greenhouse')

const ONLY = (argv.find(arg => arg.startsWith('--only='))?.split('=', 2)[1] ?? '')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)

const HUBSPOT_API = 'https://api.hubapi.com'
const FORMS_API = '/marketing/forms/2026-09-beta'
const SECURE_SUBMIT_BASE = 'https://api.hsforms.com/submissions/v3/integration/secure/submit'
const CONTACT_OBJECT_TYPE_ID = '0-1'
const CREATED_BY = 'hubspot-direct-destinations-activation'
const RETRY_POLICY = { backoff: 'exponential_jitter', maxAttempts: 5 }

// ─── Tipos HubSpot (subconjunto que este script lee/escribe) ──────────────────

interface HsOption {
  label: string
  value: string
  description?: string
  displayOrder?: number
  hidden?: boolean
}

interface HsProperty {
  name: string
  label?: string
  type?: string
  fieldType?: string
  formField?: boolean
  options?: HsOption[]
}

interface HsFormField {
  objectTypeId: string
  name: string
  label?: string
  required?: boolean
  hidden?: boolean
  fieldType: string
  options?: HsOption[]
  [key: string]: unknown
}

interface HsFieldGroup {
  groupType?: string
  richTextType?: string
  fields?: HsFormField[]
  [key: string]: unknown
}

interface HsForm {
  id: string
  name: string
  fieldGroups?: HsFieldGroup[]
  configuration?: Record<string, unknown>
  displayOptions?: Record<string, unknown>
  legalConsentOptions?: Record<string, unknown>
  formType?: string
}

interface GhOption {
  value: string
  label: string
}

interface GhField {
  key: string
  type: string
  required: boolean
  options: GhOption[]
}

// ─── HubSpot client mínimo (token canónico; sin SDK paralelo) ──────────────────

const resolveToken = async (): Promise<string> => {
  try {
    return await getHubSpotAccessToken()
  } catch {
    return execFileSync(
      'gcloud',
      ['secrets', 'versions', 'access', 'latest', '--secret=hubspot-access-token', '--project=efeonce-group'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    ).trim()
  }
}

let cachedToken: string | null = null

const hs = async <T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T | null }> => {
  cachedToken ??= await resolveToken()

  const response = await fetch(`${HUBSPOT_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${cachedToken}`, 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  const text = await response.text()
  let data: T | null = null

  try {
    data = text ? (JSON.parse(text) as T) : null
  } catch {
    data = null
  }

  return { status: response.status, data }
}

const hsOrThrow = async <T>(method: string, path: string, body?: unknown): Promise<T> => {
  const { status, data } = await hs<T>(method, path, body)

  if (status < 200 || status >= 300 || !data) {
    const message = (data as { message?: string } | null)?.message ?? '(sin detalle)'

    throw new Error(`HubSpot ${method} ${path} → ${status}: ${message}`)
  }

  return data
}

// ─── Lectura del contrato Greenhouse ───────────────────────────────────────────

const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}

const readGhFields = (version: FormVersionRow): GhField[] =>
  (Array.isArray(version.field_schema_json) ? version.field_schema_json : []).map(raw => {
    const field = asObject(raw)

    return {
      key: String(field.key ?? ''),
      type: String(field.type ?? ''),
      required: field.required === true,
      options: (Array.isArray(field.options) ? field.options : []).map(option => {
        const candidate = asObject(option)

        return { value: String(candidate.value ?? ''), label: String(candidate.label ?? candidate.value ?? '') }
      }),
    }
  })

const toHsOptions = (options: GhOption[]): HsOption[] =>
  options.map((option, index) => ({
    label: option.label,
    value: option.value,
    description: '',
    displayOrder: index,
    hidden: false,
  }))

const formFieldTypeFor = (property: HsProperty): string => {
  if (property.name === 'email') return 'email'
  if (property.name === 'phone') return 'phone'

  switch (property.fieldType) {
    case 'textarea':
      return 'multi_line_text'
    case 'select':
      return 'dropdown'
    case 'radio':
      return 'radio'
    case 'checkbox':
      return 'multiple_checkboxes'
    default:
      return 'single_line_text'
  }
}

const isChoiceFieldType = (fieldType: string): boolean => ['dropdown', 'radio', 'multiple_checkboxes'].includes(fieldType)

const buildFormField = (spec: HubSpotDestinationFieldSpec, property: HsProperty, objectTypeId: string): HsFormField => {
  const fieldType = formFieldTypeFor(property)

  return {
    objectTypeId,
    name: spec.property,
    label: spec.label,
    required: spec.property === 'email',
    hidden: false,
    fieldType,
    ...(spec.property === 'email' ? { validation: { blockedEmailDomains: [], useDefaultBlockList: false } } : {}),
    ...(isChoiceFieldType(fieldType)
      ? { options: (property.options ?? []).map((option, index) => ({ label: option.label, value: option.value, description: '', displayOrder: index })) }
      : {}),
  }
}

const allFormFields = (form: HsForm): HsFormField[] => (form.fieldGroups ?? []).flatMap(group => group.fields ?? [])

// ─── Fase 1 — HubSpot ─────────────────────────────────────────────────────────

interface Plan {
  actions: string[]
}

let propertyGroupEnsured = false

const ensurePropertyGroup = async (plan: Plan): Promise<void> => {
  if (propertyGroupEnsured) return
  propertyGroupEnsured = true

  const existing = await hs<{ name: string }>('GET', `/crm/v3/properties/contacts/groups/${HUBSPOT_PROPERTY_GROUP.name}`)

  if (existing.status === 200) return

  plan.actions.push(`${APPLY_HUBSPOT ? 'create' : 'would_create'} property group ${HUBSPOT_PROPERTY_GROUP.name}`)

  if (APPLY_HUBSPOT) {
    await hsOrThrow('POST', '/crm/v3/properties/contacts/groups', {
      name: HUBSPOT_PROPERTY_GROUP.name,
      label: HUBSPOT_PROPERTY_GROUP.label,
      displayOrder: -1,
    })
  }
}

/** Devuelve la property (real o proyectada en dry-run) y el objectTypeId donde vive. */
const ensureProperty = async (
  spec: HubSpotDestinationFieldSpec,
  ghField: GhField | undefined,
  plan: Plan,
): Promise<{ property: HsProperty; objectTypeId: string } | null> => {
  const found = await hs<HsProperty>('GET', `/crm/v3/properties/contacts/${encodeURIComponent(spec.property)}`)

  if (spec.kind === 'existing') {
    if (found.status === 200 && found.data) return { property: found.data, objectTypeId: CONTACT_OBJECT_TYPE_ID }

    // Property previa que vive en el objeto empresa (p. ej. `marca_de_competencia`).
    const company = await hs<HsProperty>('GET', `/crm/v3/properties/companies/${encodeURIComponent(spec.property)}`)

    if (company.status === 200 && company.data) return { property: company.data, objectTypeId: '0-2' }

    plan.actions.push(`BLOCK property ${spec.property} declarada "existing" no existe en contactos ni empresas`)

    return null
  }

  const wantedOptions = spec.kind === 'select' ? toHsOptions(ghField?.options ?? []) : []

  if (spec.kind === 'select' && wantedOptions.length === 0) {
    plan.actions.push(`BLOCK ${spec.ghKey}: es "select" pero el field_schema no trae opciones`)

    return null
  }

  if (found.status !== 200 || !found.data) {
    await ensurePropertyGroup(plan)
    plan.actions.push(
      `${APPLY_HUBSPOT ? 'create' : 'would_create'} property contacts.${spec.property} (${spec.kind}${spec.kind === 'select' ? `, ${wantedOptions.length} opciones` : ''})`,
    )

    const definition = {
      name: spec.property,
      label: spec.label,
      description: spec.description ?? '',
      groupName: HUBSPOT_PROPERTY_GROUP.name,
      type: spec.kind === 'select' ? 'enumeration' : 'string',
      fieldType: spec.kind === 'select' ? 'select' : 'text',
      options: wantedOptions,
      formField: true,
    }

    if (!APPLY_HUBSPOT) return { property: definition, objectTypeId: CONTACT_OBJECT_TYPE_ID }

    return {
      property: await hsOrThrow<HsProperty>('POST', '/crm/v3/properties/contacts', definition),
      objectTypeId: CONTACT_OBJECT_TYPE_ID,
    }
  }

  let property = found.data

  if (spec.kind === 'select') {
    const have = new Set((property.options ?? []).map(option => option.value))
    const missing = wantedOptions.filter(option => !have.has(option.value))

    if (missing.length > 0) {
      plan.actions.push(
        `${APPLY_HUBSPOT ? 'add' : 'would_add'} ${missing.length} opción(es) a contacts.${spec.property}: ${missing.map(option => option.value).join(' | ')}`,
      )

      const merged = [...(property.options ?? []), ...missing].map((option, index) => ({ ...option, displayOrder: index }))

      property = APPLY_HUBSPOT
        ? await hsOrThrow<HsProperty>('PATCH', `/crm/v3/properties/contacts/${encodeURIComponent(spec.property)}`, { options: merged })
        : { ...property, options: merged }
    }
  }

  if (property.formField === false) {
    plan.actions.push(`${APPLY_HUBSPOT ? 'set' : 'would_set'} formField=true en contacts.${spec.property}`)

    if (APPLY_HUBSPOT) {
      property = await hsOrThrow<HsProperty>('PATCH', `/crm/v3/properties/contacts/${encodeURIComponent(spec.property)}`, { formField: true })
    }
  }

  return { property, objectTypeId: CONTACT_OBJECT_TYPE_ID }
}

const findFormByName = async (name: string): Promise<HsForm | null> => {
  let after: string | undefined

  do {
    const page = await hsOrThrow<{ results: HsForm[]; paging?: { next?: { after?: string } } }>(
      'GET',
      `/marketing/v3/forms?limit=100${after ? `&after=${after}` : ''}`,
    )

    const match = page.results.find(form => form.name === name)

    if (match) return hsOrThrow<HsForm>('GET', `${FORMS_API}/${match.id}`)
    after = page.paging?.next?.after
  } while (after)

  return null
}

/** Asegura el formulario HubSpot y sus campos. En dry-run devuelve la forma proyectada. */
const ensureHubSpotForm = async (
  spec: HubSpotDestinationSpec,
  resolved: { spec: HubSpotDestinationFieldSpec; property: HsProperty; objectTypeId: string }[],
  plan: Plan,
): Promise<HsForm> => {
  const current = spec.hubspotForm.id
    ? await hsOrThrow<HsForm>('GET', `${FORMS_API}/${spec.hubspotForm.id}`)
    : await findFormByName(spec.hubspotForm.name)

  // Una property mapeada dos veces (p. ej. `message`) entra una sola vez al formulario.
  const uniqueByProperty = resolved.filter(
    (entry, index) => resolved.findIndex(candidate => candidate.spec.property === entry.spec.property) === index,
  )

  if (!current) {
    const reference = await hsOrThrow<HsForm>('GET', `${FORMS_API}/${HUBSPOT_REFERENCE_FORM_ID}`)

    const definition = {
      formType: 'hubspot',
      name: spec.hubspotForm.name,
      createdAt: new Date().toISOString(),
      archived: false,
      fieldGroups: uniqueByProperty.map(entry => ({
        groupType: 'default_group',
        richTextType: 'text',
        fields: [buildFormField(entry.spec, entry.property, entry.objectTypeId)],
      })),
      configuration: { ...asObject(reference.configuration), postSubmitAction: { type: 'thank_you', value: '' } },
      displayOptions: reference.displayOptions ?? {},
      legalConsentOptions: { type: 'none' },
    }

    plan.actions.push(
      `${APPLY_HUBSPOT ? 'create' : 'would_create'} formulario HubSpot "${spec.hubspotForm.name}" con ${uniqueByProperty.length} campos`,
    )

    if (!APPLY_HUBSPOT) return { id: '(por crear)', name: spec.hubspotForm.name, fieldGroups: definition.fieldGroups }

    return hsOrThrow<HsForm>('POST', FORMS_API, definition)
  }

  const fieldGroups = JSON.parse(JSON.stringify(current.fieldGroups ?? [])) as HsFieldGroup[]
  let changed = false

  for (const entry of uniqueByProperty) {
    const existingField = fieldGroups.flatMap(group => group.fields ?? []).find(field => field.name === entry.spec.property)

    if (!existingField) {
      fieldGroups.push({
        groupType: 'default_group',
        richTextType: 'text',
        fields: [buildFormField(entry.spec, entry.property, entry.objectTypeId)],
      })
      plan.actions.push(`${APPLY_HUBSPOT ? 'add' : 'would_add'} campo ${entry.spec.property} a "${current.name}"`)
      changed = true
      continue
    }

    if (isChoiceFieldType(existingField.fieldType)) {
      const have = new Set((existingField.options ?? []).map(option => option.value))
      const missing = (entry.property.options ?? []).filter(option => !have.has(option.value))

      if (missing.length > 0) {
        existingField.options = [
          ...(existingField.options ?? []),
          ...missing.map(option => ({ label: option.label, value: option.value, description: '' })),
        ].map((option, index) => ({ ...option, displayOrder: index }))
        plan.actions.push(`${APPLY_HUBSPOT ? 'add' : 'would_add'} ${missing.length} opción(es) al campo ${entry.spec.property} de "${current.name}"`)
        changed = true
      }
    }
  }

  for (const field of fieldGroups.flatMap(group => group.fields ?? [])) {
    if (field.required && field.name !== 'email') {
      field.required = false
      plan.actions.push(`${APPLY_HUBSPOT ? 'relax' : 'would_relax'} required=false en ${field.name} de "${current.name}"`)
      changed = true
    }
  }

  if (!changed) return current
  if (!APPLY_HUBSPOT) return { ...current, fieldGroups }

  return hsOrThrow<HsForm>('PATCH', `${FORMS_API}/${current.id}`, { fieldGroups })
}

// ─── Fase 2 — contract check ──────────────────────────────────────────────────

const checkContract = (spec: HubSpotDestinationSpec, ghFields: GhField[], form: HsForm): string[] => {
  const violations: string[] = []
  const formFields = allFormFields(form)

  for (const fieldSpec of spec.fields) {
    const formField = formFields.find(field => field.name === fieldSpec.property)

    if (!formField) {
      violations.push(`FIELD_NOT_IN_FORM_DEFINITION: ${fieldSpec.property} (← ${fieldSpec.ghKey})`)
      continue
    }

    if (!isChoiceFieldType(formField.fieldType)) continue

    const ghField = ghFields.find(field => field.key === fieldSpec.ghKey)
    const allowed = new Set((formField.options ?? []).map(option => option.value))

    for (const option of ghField?.options ?? []) {
      if (!allowed.has(option.value)) {
        violations.push(`VALUE_NOT_IN_FIELD_DEFINITION: ${fieldSpec.property} no acepta "${option.value}" (← ${fieldSpec.ghKey})`)
      }
    }
  }

  for (const field of formFields) {
    if (field.required && field.name !== 'email') violations.push(`REQUIRED_FIELD: ${field.name} es obligatorio en HubSpot`)
  }

  return violations
}

// ─── Fase 3 — smoke por secure-submit ─────────────────────────────────────────

const smokeEmail = `greenhouse-smoke+forms-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}@efeonce.org`

const sampleValueFor = (spec: HubSpotDestinationFieldSpec, ghField: GhField | undefined): unknown => {
  if (spec.ghKey === 'firstName') return 'Greenhouse'
  if (spec.ghKey === 'lastName') return 'Smoke Test'
  if (spec.property === 'email') return smokeEmail
  if (spec.property === 'phone') return '+56912345678'
  if (spec.property === 'website') return 'https://efeoncepro.com'
  if (spec.property === 'company') return 'Efeonce (smoke test)'

  if (ghField?.type === 'multiselect') return ghField.options.slice(0, 2).map(option => option.value)
  if (ghField && ghField.options.length > 0) return ghField.options[0].value

  return 'Smoke test del destino HubSpot. Ignorar.'
}

const sampleSubmission = (spec: HubSpotDestinationSpec, formVersionId: string, fields: Record<string, unknown>): FormSubmissionRow => ({
  submission_id: 'fsub-hubspot-destination-smoke',
  form_id: `fdef-${spec.slug}`,
  form_version_id: formVersionId,
  surface_id: null,
  page_uri: spec.pageUrl,
  page_name: 'Smoke test Greenhouse',
  lead_email_hash: 'smoke',
  normalized_fields_json: fields,
  encrypted_fields_json: {},
  status: 'accepted',
  rejection_reason_class: null,
  dedupe_fingerprint: 'smoke',
  request_id: null,
  ip_hash: null,
  delivery_attempts: 0,
  next_attempt_at: null,
  created_at: new Date(0),
  updated_at: new Date(0),
})

const sampleConsent = (policyVersion: string): FormConsentSnapshotRow => ({
  submission_id: 'fsub-hubspot-destination-smoke',
  consent_policy_version: policyVersion,
  legal_basis: 'consent',
  checkboxes_json: ['privacy'],
  notice_text_hash: 'smoke',
  privacy_url: 'https://efeoncepro.com/privacy',
  created_at: new Date(0),
})

const secureSubmit = async (formGuid: string, body: Record<string, unknown>): Promise<{ status: number; errors: string[] }> => {
  cachedToken ??= await resolveToken()

  const response = await fetch(`${SECURE_SUBMIT_BASE}/${HUBSPOT_PORTAL_ID}/${formGuid}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cachedToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (response.ok) return { status: response.status, errors: [] }

  const payload = asObject(await response.json().catch(() => ({})))
  const errors = (Array.isArray(payload.errors) ? payload.errors : []).map(error => String(asObject(error).errorType ?? 'UNKNOWN'))

  return { status: response.status, errors: errors.length > 0 ? errors : [String(payload.message ?? 'sin detalle')] }
}

// ─── Fase 4 — Greenhouse ──────────────────────────────────────────────────────

const buildFieldMapping = (spec: HubSpotDestinationSpec): Record<string, string> =>
  Object.fromEntries(spec.fields.map(field => [field.ghKey, field.property]))

const sameMapping = (a: unknown, b: Record<string, string>): boolean => {
  const left = asObject(a)
  const keys = Object.keys(b)

  return Object.keys(left).length === keys.length && keys.every(key => left[key] === b[key])
}

const resolveConsentText = (current: FormVersionRow, previousMapping: Record<string, unknown>): string => {
  if (typeof previousMapping.consentText === 'string' && previousMapping.consentText.trim()) return previousMapping.consentText

  // El aviso visible al visitante vive en `copy_refs_json.noticeText` (consent display).
  const copy = asObject(current.copy_refs_json)

  if (typeof copy.noticeText === 'string' && copy.noticeText.trim()) return copy.noticeText

  return `Consentimiento otorgado (policy ${current.consent_policy_version ?? 'sin versión'}).`
}

// ─── Orquestación por formulario ──────────────────────────────────────────────

interface Outcome {
  slug: string
  blocked: string[]
  violations: string[]
  smoke: string
  greenhouse: string
}

const processSpec = async (spec: HubSpotDestinationSpec): Promise<Outcome> => {
  const outcome: Outcome = { slug: spec.slug, blocked: [], violations: [], smoke: 'no corrido', greenhouse: 'sin cambios' }
  const plan: Plan = { actions: [] }

  console.log(`\n━━ ${spec.slug} → HubSpot "${spec.hubspotForm.name}"`)

  const definition = await getFormDefinitionByKey(spec.formKey)

  if (!definition || definition.status !== 'active' || definition.slug !== spec.slug) {
    outcome.blocked.push(`form_key ${spec.formKey} no resuelve a una definición activa con slug ${spec.slug}`)

    return outcome
  }

  const current = await getPublishedVersionBySlug(spec.slug)

  if (!current) {
    outcome.blocked.push('sin versión publicada')

    return outcome
  }

  const ghFields = readGhFields(current)
  const namePolicy = resolveNameNormalizationPolicy(current.validation_schema_json)
  const derivedKeys = namePolicy.mode === 'split_full_name' ? [namePolicy.firstNameField, namePolicy.lastNameField] : []
  const knownKeys = new Set([...ghFields.map(field => field.key), ...derivedKeys])

  for (const field of spec.fields) {
    if (!knownKeys.has(field.ghKey)) outcome.blocked.push(`el registro mapea "${field.ghKey}", que no existe en el field_schema v${current.version}`)
  }

  const mappedKeys = new Set(spec.fields.map(field => field.ghKey))

  const unmapped = ghFields
    .map(field => field.key)
    .filter(key => !mappedKeys.has(key) && !(namePolicy.mode === 'split_full_name' && key === namePolicy.sourceField))

  console.log(`  Greenhouse v${current.version} (${current.form_version_id}) · campos sin mapear: ${unmapped.join(', ') || 'ninguno'}`)

  if (outcome.blocked.length > 0) return outcome

  // Fase 1
  const resolved: { spec: HubSpotDestinationFieldSpec; property: HsProperty; objectTypeId: string }[] = []

  for (const field of spec.fields) {
    const ensured = await ensureProperty(field, ghFields.find(candidate => candidate.key === field.ghKey), plan)

    if (ensured) resolved.push({ spec: field, ...ensured })
  }

  outcome.blocked.push(...plan.actions.filter(action => action.startsWith('BLOCK')))

  if (outcome.blocked.length > 0) return outcome

  const form = await ensureHubSpotForm(spec, resolved, plan)

  for (const action of plan.actions) console.log(`  · ${action}`)
  if (plan.actions.length === 0) console.log('  · HubSpot ya está alineado con el registro')

  // Fase 2
  outcome.violations = checkContract(spec, ghFields, form)
  console.log(`  Contract check: ${outcome.violations.length === 0 ? 'OK' : `${outcome.violations.length} violación(es)`}`)
  for (const violation of outcome.violations) console.log(`    ✗ ${violation}`)

  const formIsLive = form.id !== '(por crear)'
  const fieldMapping = buildFieldMapping(spec)

  // Fase 3
  if (SMOKE) {
    if (!formIsLive || outcome.violations.length > 0) {
      outcome.smoke = 'omitido (el formulario HubSpot no existe aún o el contract check falló)'
    } else {
      const mapping = { portalId: HUBSPOT_PORTAL_ID, formGuid: form.id, fieldMapping, consentText: 'Smoke test de entrega Greenhouse → HubSpot.' }
      const consent = sampleConsent(current.consent_policy_version ?? 'smoke')

      const full: Record<string, unknown> = {}

      for (const field of spec.fields) full[field.ghKey] = sampleValueFor(field, ghFields.find(candidate => candidate.key === field.ghKey))

      const minimal: Record<string, unknown> = { firstName: 'Greenhouse' }

      for (const field of spec.fields) {
        const ghField = ghFields.find(candidate => candidate.key === field.ghKey)

        if (ghField?.required) minimal[field.ghKey] = sampleValueFor(field, ghField)
      }

      const fullResult = await secureSubmit(form.id, buildSecureSubmitBody(sampleSubmission(spec, current.form_version_id, full), consent, mapping))
      const minimalResult = await secureSubmit(form.id, buildSecureSubmitBody(sampleSubmission(spec, current.form_version_id, minimal), consent, mapping))

      outcome.smoke =
        `completo=${fullResult.status}${fullResult.errors.length ? ` [${fullResult.errors.join(', ')}]` : ''} · ` +
        `mínimo=${minimalResult.status}${minimalResult.errors.length ? ` [${minimalResult.errors.join(', ')}]` : ''}`

      if (fullResult.status !== 200 || minimalResult.status !== 200) outcome.violations.push(`smoke secure-submit falló: ${outcome.smoke}`)
    }

    console.log(`  Smoke: ${outcome.smoke}`)
  }

  // Fase 4
  const destinations = await listDestinationsForVersion(current.form_version_id)
  const publishedVersions = (await listVersionsForForm(current.form_id)).filter(version => version.status === 'published')
  const live = destinations.filter(destination => destination.enabled)

  const alreadyDirect =
    formIsLive &&
    live.length === 1 &&
    live[0].delivery_mode === 'direct' &&
    asObject(live[0].mapping_json).formGuid === form.id &&
    sameMapping(asObject(live[0].mapping_json).fieldMapping, fieldMapping) &&
    publishedVersions.length === 1

  if (alreadyDirect) {
    outcome.greenhouse = `idempotente: v${current.version} ya entrega en direct con este mapeo`
    console.log(`  Greenhouse: ${outcome.greenhouse}`)

    return outcome
  }

  const plannedGreenhouse =
    `clonar v${current.version} → destino direct (${Object.keys(fieldMapping).length} campos) → publicar → ` +
    `deprecar ${publishedVersions.map(version => `v${version.version}`).join(', ')}`

  if (!APPLY_GREENHOUSE) {
    outcome.greenhouse = `pendiente: ${plannedGreenhouse}`
    console.log(`  Greenhouse (dry-run): ${plannedGreenhouse}`)

    return outcome
  }

  if (!formIsLive || outcome.violations.length > 0) {
    outcome.greenhouse = 'BLOQUEADO: no se activa direct sin formulario HubSpot real y contract check limpio'
    console.log(`  Greenhouse: ${outcome.greenhouse}`)

    return outcome
  }

  const previousMapping = asObject(live[0]?.mapping_json ?? destinations[0]?.mapping_json)

  const { formVersionId } = await authorDraftForm({
    slug: definition.slug,
    name: definition.name,
    formKind: definition.form_kind as Parameters<typeof authorDraftForm>[0]['formKind'],
    purpose: definition.purpose,
    riskProfile: (definition.risk_profile as 'low' | 'medium' | 'high' | undefined) ?? 'low',
    ...preserveFormVersionFields(current),
    fieldSchema: current.field_schema_json,
    destinationPolicy: {
      mode: HUBSPOT_FORMS_ADAPTER_KIND,
      delivery: 'async',
      provider: 'hubspot',
      rationale: `Entrega server-side al formulario HubSpot "${form.name}" (registro hubspot-destinations).`,
    },
    createdBy: CREATED_BY,
  })

  await addDestination({
    formVersionId,
    provider: 'hubspot',
    adapterKind: HUBSPOT_FORMS_ADAPTER_KIND,
    adapterVersion: HUBSPOT_FORMS_ADAPTER_VERSION,
    endpointStatus: 'supported',
    deliveryMode: 'direct',
    mapping: {
      portalId: HUBSPOT_PORTAL_ID,
      formGuid: form.id,
      fieldMapping,
      consentText: resolveConsentText(current, previousMapping),
    },
    consentRequirements: { policyVersion: current.consent_policy_version, requiresConsent: true },
    retryPolicy: RETRY_POLICY,
  })

  const published = await publishForm(formVersionId)

  if (!published.ok) {
    outcome.greenhouse = `BLOQUEADO por el compiler: ${published.blockingReasons.join(' · ')} (draft ${formVersionId} sin publicar)`
    console.log(`  Greenhouse: ${outcome.greenhouse}`)

    return outcome
  }

  for (const version of publishedVersions) await deprecateForm(version.form_version_id)

  outcome.greenhouse = `publicada ${formVersionId}; deprecadas ${publishedVersions.map(version => `v${version.version}`).join(', ')}`
  console.log(`  Greenhouse: ${outcome.greenhouse}`)

  return outcome
}

const main = async (): Promise<void> => {
  const specs = HUBSPOT_DESTINATION_SPECS.filter(spec => ONLY.length === 0 || ONLY.includes(spec.slug))

  if (specs.length === 0) throw new Error(`--only no calza con ningún slug del registro: ${ONLY.join(', ')}`)

  console.log(
    `Destinos HubSpot de Growth Forms — hubspot=${APPLY_HUBSPOT ? 'APPLY' : 'dry-run'} · smoke=${SMOKE ? `ON (${smokeEmail})` : 'off'} · ` +
      `greenhouse=${APPLY_GREENHOUSE ? 'APPLY' : 'dry-run'} · ${specs.length} formulario(s)`,
  )

  const outcomes: Outcome[] = []

  for (const spec of specs) outcomes.push(await processSpec(spec))

  console.log('\n━━ Resumen')

  for (const outcome of outcomes) {
    const status = outcome.blocked.length > 0 ? 'BLOQUEADO' : outcome.violations.length > 0 ? 'CON VIOLACIONES' : 'OK'

    console.log(`  ${outcome.slug}: ${status} · smoke: ${outcome.smoke} · greenhouse: ${outcome.greenhouse}`)
    for (const reason of outcome.blocked) console.log(`      ✗ ${reason}`)
  }

  if (outcomes.some(outcome => outcome.blocked.length > 0 || outcome.violations.length > 0)) process.exitCode = 1
}

main()
  .catch(error => {
    console.error('FAIL:', error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
  .finally(closeGreenhousePostgres)
