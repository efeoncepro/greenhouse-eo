import 'server-only'

/**
 * Goberned HubSpot Forms field upsert.
 *
 * Dry-run by default. With `--apply`, this script can:
 * - read a HubSpot form definition,
 * - ensure referenced CRM properties exist (creating them when configured),
 * - optionally mark properties as `formField=true`,
 * - add missing fields to the form `fieldGroups` without rewriting unrelated form settings.
 *
 * Usage:
 *   pnpm hubspot:forms:upsert-fields -- --config ./tmp/hubspot-form-fields.json
 *   pnpm hubspot:forms:upsert-fields -- --config ./tmp/hubspot-form-fields.json --apply
 *
 * Config shape:
 * {
 *   "formId": "8649e76c-8b01-41f3-9b0c-5713d7b4dba6",
 *   "fields": [
 *     {
 *       "objectType": "companies",
 *       "name": "domain",
 *       "label": "Sitio web de la marca",
 *       "fieldType": "single_line_text",
 *       "after": "email"
 *     },
 *     {
 *       "objectType": "contacts",
 *       "name": "gh_example",
 *       "label": "Ejemplo",
 *       "createProperty": {
 *         "label": "Ejemplo",
 *         "description": "Campo creado por Greenhouse para formularios.",
 *         "type": "string",
 *         "fieldType": "text"
 *       }
 *     }
 *   ]
 * }
 */

import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { getHubSpotAccessToken } from '@/lib/hubspot/access-token'
import { loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'

loadGreenhouseToolEnv()

const HUBSPOT_TOKEN_SECRET = 'hubspot-access-token'

const HUBSPOT_API = 'https://api.hubapi.com'
const FORMS_API_VERSION = '2026-09-beta'
const DEFAULT_GROUP_TYPE = 'default_group'
const DEFAULT_RICH_TEXT_TYPE = 'text'

const OBJECT_TYPE_IDS = {
  contacts: '0-1',
  companies: '0-2',
  deals: '0-3',
  tickets: '0-5',
} as const

const DEFAULT_PROPERTY_GROUPS: Record<HubSpotObjectType, string> = {
  contacts: 'contactinformation',
  companies: 'companyinformation',
  deals: 'dealinformation',
  tickets: 'ticketinformation',
}

type HubSpotObjectType = keyof typeof OBJECT_TYPE_IDS

type HubSpotPropertyType = 'string' | 'number' | 'date' | 'datetime' | 'bool' | 'enumeration'

type HubSpotPropertyFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'booleancheckbox'
  | 'select'
  | 'checkbox'
  | 'radio'

type HubSpotFormFieldType =
  | 'email'
  | 'phone'
  | 'mobile_phone'
  | 'single_line_text'
  | 'multi_line_text'
  | 'number'
  | 'single_checkbox'
  | 'multiple_checkboxes'
  | 'dropdown'
  | 'radio'
  | 'datepicker'
  | 'file'

interface HubSpotOption {
  label: string
  value: string
  displayOrder?: number
  description?: string
  hidden?: boolean
}

interface HubSpotPropertySnapshot {
  name: string
  label?: string
  description?: string
  groupName?: string
  type?: HubSpotPropertyType
  fieldType?: HubSpotPropertyFieldType
  formField?: boolean
  options?: HubSpotOption[]
  modificationMetadata?: {
    readOnlyValue?: boolean
  }
}

interface HubSpotFormField {
  objectTypeId: string
  name: string
  label?: string
  required?: boolean
  hidden?: boolean
  fieldType: HubSpotFormFieldType
  description?: string
  placeholder?: string
  options?: HubSpotOption[]
  defaultValue?: string
  dependentFields?: unknown[]
  [key: string]: unknown
}

interface HubSpotFormFieldGroup {
  groupType?: string
  richTextType?: string
  fields?: HubSpotFormField[]
  [key: string]: unknown
}

interface HubSpotFormDefinition {
  id: string
  name?: string
  formType?: string
  fieldGroups?: HubSpotFormFieldGroup[]
  [key: string]: unknown
}

interface CreatePropertyConfig {
  label: string
  description?: string
  type: HubSpotPropertyType
  fieldType: HubSpotPropertyFieldType
  groupName?: string
  options?: HubSpotOption[]
  formField?: boolean
  displayOrder?: number
}

interface RequestedField {
  objectType: HubSpotObjectType
  name: string
  label?: string
  description?: string
  placeholder?: string
  fieldType?: HubSpotFormFieldType
  required?: boolean
  hidden?: boolean
  options?: HubSpotOption[]
  groupIndex?: number
  after?: string
  ensureFormField?: boolean
  createProperty?: CreatePropertyConfig
}

interface UpsertConfig {
  formId: string
  fields: RequestedField[]
}

interface PlannedAction {
  action: string
  objectType?: HubSpotObjectType
  propertyName?: string
  detail?: string
}

interface UpsertPlan {
  formId: string
  formName?: string
  apply: boolean
  actions: PlannedAction[]
  fieldsAdded: number
  propertyCreates: number
  propertyUpdates: number
}

const parseArgs = () => {
  const argv = process.argv.slice(2)
  const configIndex = argv.findIndex(arg => arg === '--config')
  const inlineConfig = argv.find(arg => arg.startsWith('--config='))

  const configPath =
    configIndex >= 0 ? argv[configIndex + 1] : inlineConfig ? inlineConfig.split('=', 2)[1] : undefined

  if (!configPath || configPath.startsWith('--')) {
    throw new Error('Missing --config <path>.')
  }

  return {
    apply: argv.includes('--apply'),
    json: argv.includes('--json'),
    configPath,
  }
}

const readJsonConfig = (configPath: string): UpsertConfig => {
  const absolutePath = path.resolve(process.cwd(), configPath)
  const raw = JSON.parse(fs.readFileSync(absolutePath, 'utf8')) as Partial<UpsertConfig>

  if (!raw.formId || typeof raw.formId !== 'string') {
    throw new Error('Config must include string formId.')
  }

  if (!Array.isArray(raw.fields) || raw.fields.length === 0) {
    throw new Error('Config must include at least one field.')
  }

  for (const field of raw.fields) {
    if (!field || typeof field !== 'object') throw new Error('Every field must be an object.')
    if (!field.name || typeof field.name !== 'string') throw new Error('Every field must include string name.')

    if (!field.objectType || !(field.objectType in OBJECT_TYPE_IDS)) {
      throw new Error(`Field "${field.name}" has unsupported objectType "${field.objectType}".`)
    }
  }

  return raw as UpsertConfig
}

const resolveHubSpotToken = async () => {
  try {
    return await getHubSpotAccessToken()
  } catch {
    const project = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'efeonce-group'

    try {
      return execFileSync(
        'gcloud',
        ['secrets', 'versions', 'access', 'latest', `--secret=${HUBSPOT_TOKEN_SECRET}`, `--project=${project}`],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
      ).trim()
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)

      throw new Error(
        `HubSpot token unavailable. Set HUBSPOT_ACCESS_TOKEN or refresh local GCP auth (` +
          `gcloud auth login && gcloud auth application-default login). gcloud fallback failed: ${detail}`
      )
    }
  }
}

const readResponseBody = async (response: Response) => {
  const text = await response.text()

  try {
    return JSON.stringify(JSON.parse(text))
  } catch {
    return text
  }
}

const hubspotRequest = async <T>(token: string, requestPath: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${HUBSPOT_API}${requestPath}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(
      `HubSpot API ${init?.method ?? 'GET'} ${requestPath} failed with ${response.status}: ${await readResponseBody(response)}`
    )
  }

  if (response.status === 204) return {} as T

  return (await response.json()) as T
}

const hubspotMaybe = async <T>(token: string, requestPath: string): Promise<T | null> => {
  const response = await fetch(`${HUBSPOT_API}${requestPath}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (response.status === 404) return null

  if (!response.ok) {
    throw new Error(`HubSpot API GET ${requestPath} failed with ${response.status}: ${await readResponseBody(response)}`)
  }

  return (await response.json()) as T
}

const getForm = (token: string, formId: string) =>
  hubspotRequest<HubSpotFormDefinition>(token, `/marketing/forms/${FORMS_API_VERSION}/${encodeURIComponent(formId)}`)

const getProperty = (token: string, objectType: HubSpotObjectType, name: string) =>
  hubspotMaybe<HubSpotPropertySnapshot>(token, `/crm/v3/properties/${objectType}/${encodeURIComponent(name)}`)

const createProperty = (token: string, objectType: HubSpotObjectType, field: RequestedField) => {
  if (!field.createProperty) {
    throw new Error(`Property ${objectType}.${field.name} does not exist and createProperty is not configured.`)
  }

  const groupName = field.createProperty.groupName ?? DEFAULT_PROPERTY_GROUPS[objectType]

  return hubspotRequest<HubSpotPropertySnapshot>(token, `/crm/v3/properties/${objectType}`, {
    method: 'POST',
    body: JSON.stringify({
      name: field.name,
      label: field.createProperty.label,
      description: field.createProperty.description ?? '',
      groupName,
      type: field.createProperty.type,
      fieldType: field.createProperty.fieldType,
      options: field.createProperty.options ?? [],
      formField: field.createProperty.formField ?? true,
      displayOrder: field.createProperty.displayOrder ?? -1,
    }),
  })
}

const markPropertyAsFormField = (token: string, objectType: HubSpotObjectType, name: string) =>
  hubspotRequest<HubSpotPropertySnapshot>(token, `/crm/v3/properties/${objectType}/${encodeURIComponent(name)}`, {
    method: 'PATCH',
    body: JSON.stringify({ formField: true }),
  })

const patchFormFieldGroups = (token: string, formId: string, fieldGroups: HubSpotFormFieldGroup[]) =>
  hubspotRequest<HubSpotFormDefinition>(token, `/marketing/forms/${FORMS_API_VERSION}/${encodeURIComponent(formId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ fieldGroups }),
  })

const formFieldTypeFromProperty = (property: HubSpotPropertySnapshot, requested?: HubSpotFormFieldType): HubSpotFormFieldType => {
  if (requested) return requested
  if (property.name === 'email') return 'email'

  switch (property.fieldType) {
    case 'textarea':
      return 'multi_line_text'
    case 'number':
      return 'number'
    case 'date':
      return 'datepicker'
    case 'booleancheckbox':
      return 'single_checkbox'
    case 'select':
      return 'dropdown'
    case 'checkbox':
      return 'multiple_checkboxes'
    case 'radio':
      return 'radio'
    case 'text':
    default:
      return 'single_line_text'
  }
}

const normalizeOptions = (options: HubSpotOption[] | undefined) =>
  (options ?? []).map((option, index) => ({
    label: option.label,
    value: option.value,
    description: option.description ?? '',
    displayOrder: option.displayOrder ?? index,
    ...(option.hidden === undefined ? {} : { hidden: option.hidden }),
  }))

const buildFormField = (field: RequestedField, property: HubSpotPropertySnapshot): HubSpotFormField => {
  const fieldType = formFieldTypeFromProperty(property, field.fieldType)
  const options = normalizeOptions(field.options ?? property.options)

  return {
    objectTypeId: OBJECT_TYPE_IDS[field.objectType],
    name: field.name,
    label: field.label ?? property.label ?? field.name,
    required: field.required ?? false,
    hidden: field.hidden ?? false,
    fieldType,
    ...(field.description ? { description: field.description } : {}),
    ...(field.placeholder ? { placeholder: field.placeholder } : {}),
    ...(['dropdown', 'multiple_checkboxes', 'radio'].includes(fieldType) ? { options } : {}),
  }
}

const cloneFieldGroups = (fieldGroups: HubSpotFormFieldGroup[] | undefined): HubSpotFormFieldGroup[] => {
  const groups = JSON.parse(JSON.stringify(fieldGroups ?? [])) as HubSpotFormFieldGroup[]

  if (groups.length === 0) {
    groups.push({ groupType: DEFAULT_GROUP_TYPE, richTextType: DEFAULT_RICH_TEXT_TYPE, fields: [] })
  }

  for (const group of groups) {
    if (!Array.isArray(group.fields)) group.fields = []
  }

  return groups
}

const formAlreadyHasField = (fieldGroups: HubSpotFormFieldGroup[], field: RequestedField) =>
  fieldGroups.some(group =>
    (group.fields ?? []).some(existing => existing.name === field.name && existing.objectTypeId === OBJECT_TYPE_IDS[field.objectType])
  )

const insertFormField = (fieldGroups: HubSpotFormFieldGroup[], requested: RequestedField, field: HubSpotFormField) => {
  const groupIndex = requested.groupIndex ?? 0
  const group = fieldGroups[groupIndex]

  if (!group) {
    throw new Error(`Cannot insert ${requested.objectType}.${requested.name}: groupIndex ${groupIndex} does not exist.`)
  }

  if (!requested.after) {
    group.fields?.push(field)

    return
  }

  const afterIndex = group.fields?.findIndex(existing => existing.name === requested.after) ?? -1

  if (afterIndex < 0) {
    throw new Error(`Cannot insert ${requested.objectType}.${requested.name}: after="${requested.after}" not found in group ${groupIndex}.`)
  }

  group.fields?.splice(afterIndex + 1, 0, field)
}

const printPlan = (plan: UpsertPlan, json: boolean) => {
  if (json) {
    console.log(JSON.stringify(plan, null, 2))

    return
  }

  console.log(`HubSpot form field upsert — ${plan.apply ? 'APPLY' : 'DRY-RUN'}`)
  console.log(`Form: ${plan.formName ?? '(sin nombre)'} (${plan.formId})`)
  console.log(`Actions: ${plan.actions.length}`)

  for (const action of plan.actions) {
    const target = action.propertyName ? `${action.objectType}.${action.propertyName}` : ''

    console.log(`  - ${action.action}${target ? ` ${target}` : ''}${action.detail ? ` — ${action.detail}` : ''}`)
  }

  console.log(`Summary: propertyCreates=${plan.propertyCreates}, propertyUpdates=${plan.propertyUpdates}, fieldsAdded=${plan.fieldsAdded}`)
  if (!plan.apply) console.log('DRY-RUN: re-run with --apply to mutate HubSpot.')
}

const main = async () => {
  const args = parseArgs()
  const config = readJsonConfig(args.configPath)
  const token = await resolveHubSpotToken()
  const form = await getForm(token, config.formId)
  const fieldGroups = cloneFieldGroups(form.fieldGroups)
  const actions: PlannedAction[] = []
  let fieldsAdded = 0
  let propertyCreates = 0
  let propertyUpdates = 0

  for (const field of config.fields) {
    let property = await getProperty(token, field.objectType, field.name)

    if (!property) {
      actions.push({
        action: args.apply ? 'create_property' : 'would_create_property',
        objectType: field.objectType,
        propertyName: field.name,
      })
      propertyCreates += 1

      if (args.apply) {
        property = await createProperty(token, field.objectType, field)
      } else if (field.createProperty) {
        property = {
          name: field.name,
          label: field.createProperty.label,
          description: field.createProperty.description,
          groupName: field.createProperty.groupName ?? DEFAULT_PROPERTY_GROUPS[field.objectType],
          type: field.createProperty.type,
          fieldType: field.createProperty.fieldType,
          formField: field.createProperty.formField ?? true,
          options: field.createProperty.options,
        }
      } else {
        throw new Error(`Property ${field.objectType}.${field.name} does not exist and createProperty is not configured.`)
      }
    }

    const shouldEnsureFormField = field.ensureFormField ?? true

    if (shouldEnsureFormField && property.formField === false && !property.modificationMetadata?.readOnlyValue) {
      actions.push({
        action: args.apply ? 'update_property_form_field' : 'would_update_property_form_field',
        objectType: field.objectType,
        propertyName: field.name,
        detail: 'set formField=true',
      })
      propertyUpdates += 1
      if (args.apply) property = await markPropertyAsFormField(token, field.objectType, field.name)
    }

    if (formAlreadyHasField(fieldGroups, field)) {
      actions.push({
        action: 'form_field_exists',
        objectType: field.objectType,
        propertyName: field.name,
      })
      continue
    }

    insertFormField(fieldGroups, field, buildFormField(field, property))
    fieldsAdded += 1
    actions.push({
      action: args.apply ? 'add_form_field' : 'would_add_form_field',
      objectType: field.objectType,
      propertyName: field.name,
      detail: `fieldType=${formFieldTypeFromProperty(property, field.fieldType)}`,
    })
  }

  if (fieldsAdded > 0 && args.apply) {
    await patchFormFieldGroups(token, config.formId, fieldGroups)
  }

  if (fieldsAdded > 0 && !args.apply) {
    actions.push({
      action: 'would_patch_form_field_groups',
      detail: `PATCH /marketing/forms/${FORMS_API_VERSION}/${config.formId}`,
    })
  }

  printPlan(
    {
      formId: config.formId,
      formName: form.name,
      apply: args.apply,
      actions,
      fieldsAdded,
      propertyCreates,
      propertyUpdates,
    },
    args.json
  )
}

main().catch(error => {
  console.error('FAIL:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
