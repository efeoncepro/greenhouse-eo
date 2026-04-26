 

import {
  HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES,
  type HubSpotCustomPropertyDefinition,
  type HubSpotCustomPropertyObjectType,
  type HubSpotCustomPropertyPlanItem,
  type HubSpotPropertySnapshot,
  diffHubSpotCustomProperties,
  getHubSpotCustomPropertyDefinitions,
  getHubSpotCustomPropertyGroupConfig,
  summarizeHubSpotCustomPropertyPlan
} from '@/lib/hubspot/custom-properties'

const HUBSPOT_API = 'https://api.hubapi.com'

interface HubSpotPropertyGroup {
  name: string
  label?: string
}

interface ObjectPlanResult {
  objectType: HubSpotCustomPropertyObjectType
  groupName: string
  definitions: HubSpotCustomPropertyDefinition[]
  plan: HubSpotCustomPropertyPlanItem[]
}

const parseObjects = (argv: string[], defaultObjects?: HubSpotCustomPropertyObjectType[]) => {
  const explicitObjects = new Set<HubSpotCustomPropertyObjectType>()
  const positionalObjects: string[] = []

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--object' || argument === '--objects') {
      const value = argv[index + 1] ?? ''

      value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .forEach(item => {
          if (HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES.includes(item as HubSpotCustomPropertyObjectType)) {
            explicitObjects.add(item as HubSpotCustomPropertyObjectType)
          }
        })
      index += 1
      continue
    }

    if (argument.startsWith('--object=') || argument.startsWith('--objects=')) {
      const value = argument.split('=', 2)[1] ?? ''

      value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean)
        .forEach(item => {
          if (HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES.includes(item as HubSpotCustomPropertyObjectType)) {
            explicitObjects.add(item as HubSpotCustomPropertyObjectType)
          }
        })
      continue
    }

    if (!argument.startsWith('--')) {
      positionalObjects.push(argument)
    }
  }

  for (const candidate of positionalObjects) {
    if (HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES.includes(candidate as HubSpotCustomPropertyObjectType)) {
      explicitObjects.add(candidate as HubSpotCustomPropertyObjectType)
    }
  }

  if (explicitObjects.size > 0) {
    return [...explicitObjects]
  }

  if (defaultObjects && defaultObjects.length > 0) {
    return defaultObjects
  }

  return [...HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES]
}

const parseArgs = (argv: string[], defaultObjects?: HubSpotCustomPropertyObjectType[]) => ({
  apply: argv.includes('--apply'),
  json: argv.includes('--json'),
  objects: parseObjects(argv, defaultObjects)
})

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

  if (response.status === 204) {
    return {} as T
  }

  return (await response.json()) as T
}

const listPropertyGroups = async (token: string, objectType: HubSpotCustomPropertyObjectType) =>
  hubspotRequest<{ results?: HubSpotPropertyGroup[] }>(token, `/crm/v3/properties/${objectType}/groups`)

const listExistingProperties = async (
  token: string,
  objectType: HubSpotCustomPropertyObjectType
) => {
  const payload = await hubspotRequest<{ results?: HubSpotPropertySnapshot[] }>(
    token,
    `/crm/v3/properties/${objectType}`
  )

  return payload.results ?? []
}

const resolveGroupName = async (
  token: string,
  objectType: HubSpotCustomPropertyObjectType
) => {
  const config = getHubSpotCustomPropertyGroupConfig(objectType)
  const groups = await listPropertyGroups(token, objectType)
  const availableGroups = new Map((groups.results ?? []).map(group => [group.name, group]))

  for (const candidate of config.groupCandidates) {
    if (availableGroups.has(candidate)) {
      return candidate
    }
  }

  await hubspotRequest(token, `/crm/v3/properties/${objectType}/groups`, {
    method: 'POST',
    body: JSON.stringify({
      name: config.preferredGroupName,
      label: config.groupLabel,
      displayOrder: -1
    })
  })

  return config.preferredGroupName
}

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

const createProperty = async (token: string, definition: HubSpotCustomPropertyDefinition) =>
  hubspotRequest(token, `/crm/v3/properties/${definition.objectType}`, {
    method: 'POST',
    body: JSON.stringify(buildHubSpotPropertyPayload(definition))
  })

const updateProperty = async (token: string, definition: HubSpotCustomPropertyDefinition) =>
  hubspotRequest(
    token,
    `/crm/v3/properties/${definition.objectType}/${encodeURIComponent(definition.name)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(buildHubSpotPropertyPayload(definition))
    }
  )

const printDefinitions = (
  objectType: HubSpotCustomPropertyObjectType,
  definitions: HubSpotCustomPropertyDefinition[]
) => {
  console.log(`HubSpot custom properties — ${objectType}`)
  console.log(JSON.stringify(definitions, null, 2))
  console.log('')
}

const printPlan = (results: ObjectPlanResult[], jsonMode: boolean) => {
  if (jsonMode) {
    console.log(JSON.stringify(results, null, 2))

    return
  }

  for (const result of results) {
    const summary = summarizeHubSpotCustomPropertyPlan(result.plan)

    console.log(
      `${result.objectType} (group=${result.groupName}) -> create=${summary.create}, update=${summary.update}, exists=${summary.exists}`
    )

    for (const item of result.plan) {
      console.log(`  ${item.action.toUpperCase()} ${item.definition.name}`)
    }
  }
}

const applyPlan = async (token: string, results: ObjectPlanResult[]) => {
  const applied: Array<{
    objectType: HubSpotCustomPropertyObjectType
    name: string
    action: HubSpotCustomPropertyPlanItem['action']
  }> = []

  for (const result of results) {
    for (const item of result.plan) {
      if (item.action === 'exists') {
        continue
      }

      if (item.action === 'create') {
        await createProperty(token, item.definition)
      } else {
        await updateProperty(token, item.definition)
      }

      applied.push({
        objectType: result.objectType,
        name: item.definition.name,
        action: item.action
      })
    }
  }

  return applied
}

export const loadHubSpotCustomPropertyPlan = async (
  token: string,
  objectType: HubSpotCustomPropertyObjectType
): Promise<ObjectPlanResult> => {
  const definitionsWithoutGroup = getHubSpotCustomPropertyDefinitions(objectType)

  if (definitionsWithoutGroup.length === 0) {
    return {
      objectType,
      groupName: getHubSpotCustomPropertyGroupConfig(objectType).preferredGroupName,
      definitions: [],
      plan: []
    }
  }

  const groupName = await resolveGroupName(token, objectType)
  const definitions = getHubSpotCustomPropertyDefinitions(objectType, groupName)
  const existing = await listExistingProperties(token, objectType)
  const plan = diffHubSpotCustomProperties(objectType, existing, groupName)

  return {
    objectType,
    groupName,
    definitions,
    plan
  }
}

export const runHubSpotCustomPropertiesCli = async (options?: {
  defaultObjects?: HubSpotCustomPropertyObjectType[]
  title?: string
}) => {
  const args = parseArgs(process.argv.slice(2), options?.defaultObjects)
  const hasToken = Boolean(process.env.HUBSPOT_ACCESS_TOKEN?.trim())

  if (options?.title) {
    console.log(options.title)
    console.log('')
  }

  if (!hasToken) {
    for (const objectType of args.objects) {
      printDefinitions(objectType, getHubSpotCustomPropertyDefinitions(objectType))
    }

    console.log(
      'Set HUBSPOT_ACCESS_TOKEN to run a live dry-run against HubSpot, or add --apply to mutate after reviewing the plan.'
    )

    if (args.apply) {
      throw new Error('Cannot use --apply without HUBSPOT_ACCESS_TOKEN.')
    }

    return
  }

  const token = getRequiredToken()
  const results: ObjectPlanResult[] = []

  for (const objectType of args.objects) {
    results.push(await loadHubSpotCustomPropertyPlan(token, objectType))
  }

  printPlan(results, args.json)

  if (!args.apply) {
    console.log('')
    console.log('Dry-run only. Re-run with --apply to create/update the missing or drifted properties.')

    return
  }

  const applied = await applyPlan(token, results)

  console.log('')
  console.log(JSON.stringify({ applied }, null, 2))
}

if (require.main === module) {
  void runHubSpotCustomPropertiesCli().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  })
}
