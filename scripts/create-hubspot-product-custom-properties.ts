/* eslint-disable no-console */

const HUBSPOT_API = 'https://api.hubapi.com'
const HUBSPOT_OBJECT_PATH = 'products'
const HUBSPOT_GROUP_NAME = 'greenhouse_sync'
const HUBSPOT_GROUP_LABEL = 'Greenhouse Sync'

type HubSpotObjectType = 'product'
type HubSpotPropertyType = 'string' | 'datetime' | 'bool' | 'enumeration'
type HubSpotPropertyFieldType = 'text' | 'date' | 'booleancheckbox' | 'select'

interface HubSpotPropertyOption {
  label: string
  value: string
  displayOrder: number
}

export interface HubSpotCustomPropertyDefinition {
  objectType: HubSpotObjectType
  name: string
  label: string
  description: string
  groupName: string
  type: HubSpotPropertyType
  fieldType: HubSpotPropertyFieldType
  options?: HubSpotPropertyOption[]
  formField: boolean
  displayOrder: number
  readOnlyValue?: boolean
}

interface HubSpotPropertyGroup {
  name: string
  label?: string
}

export interface HubSpotPropertySnapshot {
  name: string
  label?: string
  description?: string
  groupName?: string
  type?: HubSpotPropertyType
  fieldType?: HubSpotPropertyFieldType
  options?: Array<{
    label?: string
    value?: string
    displayOrder?: number
    hidden?: boolean
    description?: string | null
  }>
  formField?: boolean
  displayOrder?: number
  readOnlyValue?: boolean
}

export interface HubSpotPropertyPlanItem {
  action: 'create' | 'update' | 'exists'
  definition: HubSpotCustomPropertyDefinition
  existing?: HubSpotPropertySnapshot
}

const PRODUCT_SOURCE_KIND_OPTIONS: HubSpotPropertyOption[] = [
  { label: 'Rol vendible', value: 'sellable_role', displayOrder: 0 },
  { label: 'Herramienta', value: 'tool', displayOrder: 1 },
  { label: 'Overhead adicional', value: 'overhead_addon', displayOrder: 2 },
  { label: 'Servicio', value: 'service', displayOrder: 3 },
  { label: 'Manual', value: 'manual', displayOrder: 4 },
  { label: 'Importado desde HubSpot', value: 'hubspot_imported', displayOrder: 5 }
]

export const PRODUCT_HUBSPOT_CUSTOM_PROPERTIES: HubSpotCustomPropertyDefinition[] = [
  {
    objectType: 'product',
    name: 'gh_product_code',
    label: 'Codigo de Producto Greenhouse',
    description:
      'SKU canonico del catalogo Greenhouse. Sirve para enlazar el producto de HubSpot con el catalogo oficial del portal. Este campo es de solo lectura para operadores.',
    groupName: HUBSPOT_GROUP_NAME,
    type: 'string',
    fieldType: 'text',
    formField: false,
    displayOrder: 1,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_source_kind',
    label: 'Origen del Producto en Greenhouse',
    description:
      'Indica desde que catalogo o flujo de Greenhouse se origino este producto. Este campo es de solo lectura para operadores.',
    groupName: HUBSPOT_GROUP_NAME,
    type: 'enumeration',
    fieldType: 'select',
    options: PRODUCT_SOURCE_KIND_OPTIONS,
    formField: false,
    displayOrder: 2,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_last_write_at',
    label: 'Ultima Sincronizacion desde Greenhouse',
    description:
      'Fecha y hora de la ultima sincronizacion saliente exitosa desde Greenhouse hacia HubSpot. Se usa para evitar rebotes de sync entre ambos sistemas.',
    groupName: HUBSPOT_GROUP_NAME,
    type: 'datetime',
    fieldType: 'date',
    formField: false,
    displayOrder: 3,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_archived_by_greenhouse',
    label: 'Archivado por Greenhouse',
    description:
      'Indica si el producto fue archivado automaticamente por una desactivacion en Greenhouse, y no por una accion manual dentro de HubSpot.',
    groupName: HUBSPOT_GROUP_NAME,
    type: 'bool',
    fieldType: 'booleancheckbox',
    formField: false,
    displayOrder: 4,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_business_line',
    label: 'Linea de Negocio Greenhouse',
    description:
      'Linea de negocio de Greenhouse responsable del producto. Se calcula desde el catalogo fuente y hoy se mantiene editable para soporte operativo controlado.',
    groupName: HUBSPOT_GROUP_NAME,
    type: 'string',
    fieldType: 'text',
    formField: true,
    displayOrder: 5,
    readOnlyValue: false
  }
]

const sanitizeOptions = (options?: HubSpotPropertySnapshot['options'] | HubSpotPropertyOption[]) =>
  (options ?? []).map(option => ({
    label: option.label ?? '',
    value: option.value ?? '',
    displayOrder: option.displayOrder ?? 0
  }))

const normalizeDefinitionForCompare = (
  definition: HubSpotCustomPropertyDefinition | HubSpotPropertySnapshot
) => ({
  label: definition.label ?? '',
  description: definition.description ?? '',
  type: definition.type ?? '',
  fieldType: definition.fieldType ?? '',
  groupName: definition.groupName ?? '',
  formField: definition.formField ?? false,
  displayOrder: definition.displayOrder ?? 0,
  readOnlyValue: definition.readOnlyValue ?? false,
  options: sanitizeOptions(definition.options)
})

const buildHubSpotPropertyPayload = (definition: HubSpotCustomPropertyDefinition) => ({
  name: definition.name,
  label: definition.label,
  description: definition.description,
  groupName: definition.groupName,
  type: definition.type,
  fieldType: definition.fieldType,
  options: definition.options,
  formField: definition.formField,
  displayOrder: definition.displayOrder,
  readOnlyValue: definition.readOnlyValue ?? false
})

const propertiesMatch = (
  existing: HubSpotPropertySnapshot | undefined,
  definition: HubSpotCustomPropertyDefinition
) => {
  if (!existing) return false

  return (
    JSON.stringify(normalizeDefinitionForCompare(existing)) ===
    JSON.stringify(normalizeDefinitionForCompare(definition))
  )
}

export const planCustomPropertyCreation = (
  existing: Array<{ name: string }>
): HubSpotCustomPropertyDefinition[] => {
  const existingNames = new Set(existing.map(property => property.name))

  return PRODUCT_HUBSPOT_CUSTOM_PROPERTIES.filter(definition => !existingNames.has(definition.name))
}

export const diffHubSpotProductCustomProperties = (
  existing: HubSpotPropertySnapshot[]
): HubSpotPropertyPlanItem[] => {
  const byName = new Map(existing.map(property => [property.name, property]))

  return PRODUCT_HUBSPOT_CUSTOM_PROPERTIES.map(definition => {
    const current = byName.get(definition.name)

    if (!current) {
      return { action: 'create', definition }
    }

    if (propertiesMatch(current, definition)) {
      return { action: 'exists', definition, existing: current }
    }

    return { action: 'update', definition, existing: current }
  })
}

const getRequiredToken = () => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim()

  if (!token) {
    throw new Error('HUBSPOT_ACCESS_TOKEN is required for live HubSpot dry-runs and apply mode.')
  }

  return token
}

const readResponseBody = async (response: Response) => {
  try {
    return JSON.stringify(await response.json())
  } catch {
    return await response.text()
  }
}

const hubspotRequest = async <T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(`${HUBSPOT_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {})
    }
  })

  if (!response.ok) {
    throw new Error(
      `HubSpot API ${init?.method ?? 'GET'} ${path} failed with ${response.status}: ${await readResponseBody(response)}`
    )
  }

  return (await response.json()) as T
}

const listPropertyGroups = async (token: string) =>
  hubspotRequest<{ results?: HubSpotPropertyGroup[] }>(
    token,
    `/crm/v3/properties/${HUBSPOT_OBJECT_PATH}/groups`
  )

const ensurePropertyGroup = async (token: string) => {
  const groups = await listPropertyGroups(token)
  const exists = (groups.results ?? []).some(group => group.name === HUBSPOT_GROUP_NAME)

  if (exists) {
    return HUBSPOT_GROUP_NAME
  }

  await hubspotRequest(
    token,
    `/crm/v3/properties/${HUBSPOT_OBJECT_PATH}/groups`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: HUBSPOT_GROUP_NAME,
        label: HUBSPOT_GROUP_LABEL,
        displayOrder: -1
      })
    }
  )

  return HUBSPOT_GROUP_NAME
}

const listExistingProperties = async (token: string) => {
  const payload = await hubspotRequest<{ results?: HubSpotPropertySnapshot[] }>(
    token,
    `/crm/v3/properties/${HUBSPOT_OBJECT_PATH}`
  )

  return payload.results ?? []
}

const createProperty = async (token: string, definition: HubSpotCustomPropertyDefinition) =>
  hubspotRequest(
    token,
    `/crm/v3/properties/${HUBSPOT_OBJECT_PATH}`,
    {
      method: 'POST',
      body: JSON.stringify(buildHubSpotPropertyPayload(definition))
    }
  )

const updateProperty = async (token: string, definition: HubSpotCustomPropertyDefinition) =>
  hubspotRequest(
    token,
    `/crm/v3/properties/${HUBSPOT_OBJECT_PATH}/${encodeURIComponent(definition.name)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(buildHubSpotPropertyPayload(definition))
    }
  )

const parseArgs = (argv: string[]) => ({
  apply: argv.includes('--apply'),
  json: argv.includes('--json')
})

const summarizePlan = (plan: HubSpotPropertyPlanItem[]) => {
  const summary = {
    create: 0,
    update: 0,
    exists: 0
  }

  for (const item of plan) {
    summary[item.action] += 1
  }

  return summary
}

const printDefinitions = () => {
  console.log('TASK-563 HubSpot Product Custom Properties')
  console.log(JSON.stringify(PRODUCT_HUBSPOT_CUSTOM_PROPERTIES, null, 2))
  console.log('')
}

const printPlan = (plan: HubSpotPropertyPlanItem[], jsonMode: boolean) => {
  if (jsonMode) {
    console.log(JSON.stringify(plan, null, 2))

    return
  }

  const summary = summarizePlan(plan)

  console.log(
    `Plan -> create=${summary.create}, update=${summary.update}, exists=${summary.exists}`
  )

  for (const item of plan) {
    console.log(`${item.action.toUpperCase()} ${item.definition.name}`)
  }
}

const applyPlan = async (token: string, plan: HubSpotPropertyPlanItem[]) => {
  const actions: Array<{ name: string; action: HubSpotPropertyPlanItem['action'] }> = []

  for (const item of plan) {
    if (item.action === 'exists') continue

    if (item.action === 'create') {
      await createProperty(token, item.definition)
    } else {
      await updateProperty(token, item.definition)
    }

    actions.push({ name: item.definition.name, action: item.action })
  }

  return actions
}

const main = async () => {
  const args = parseArgs(process.argv.slice(2))
  const hasToken = Boolean(process.env.HUBSPOT_ACCESS_TOKEN?.trim())

  printDefinitions()

  if (!hasToken) {
    console.log(
      'Set HUBSPOT_ACCESS_TOKEN to run a live dry-run against HubSpot, or add --apply to mutate after reviewing the plan.'
    )

    if (args.apply) {
      throw new Error('Cannot use --apply without HUBSPOT_ACCESS_TOKEN.')
    }

    return
  }

  const token = getRequiredToken()

  await ensurePropertyGroup(token)
  const existing = await listExistingProperties(token)
  const plan = diffHubSpotProductCustomProperties(existing)

  printPlan(plan, args.json)

  if (!args.apply) {
    console.log('')
    console.log('Dry-run only. Re-run with --apply to create/update the missing or drifted properties.')

    return
  }

  const actions = await applyPlan(token, plan)

  console.log('')
  console.log(JSON.stringify({ applied: actions }, null, 2))
}

if (require.main === module) {
  void main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
