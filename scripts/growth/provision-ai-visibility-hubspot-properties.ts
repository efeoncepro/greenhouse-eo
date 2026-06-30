/**
 * TASK-1242 — Provisión idempotente de las HubSpot custom properties `ai_visibility_*`
 * + grupo "AEO" (out-of-band, portal 48713323).
 *
 * Lee el contrato declarativo de `src/lib/growth/ai-visibility/hubspot/properties.ts`
 * (SSOT internal name + label legible + tipo + grupo) y crea, si faltan, el property group
 * "AEO" (en companies y contacts) + cada custom property. Idempotente: GET antes de POST;
 * lo ya existente se reporta `exists`, no se re-crea ni muta.
 *
 * Uso (token NUNCA en el script ni en logs):
 *   HUBSPOT_ACCESS_TOKEN="$(gcloud secrets versions access latest \
 *     --secret=hubspot-access-token --project=efeonce-group)" \
 *     pnpm tsx scripts/growth/provision-ai-visibility-hubspot-properties.ts [--dry-run]
 */

import {
  AEO_PROPERTY_GROUP_LABEL,
  AEO_PROPERTY_GROUP_NAME,
  AI_VISIBILITY_PROPERTY_DEFINITIONS,
  type HubSpotPropertyDefinition,
} from '../../src/lib/growth/ai-visibility/hubspot/properties'

const HUBSPOT_API = 'https://api.hubapi.com'
const DRY_RUN = process.argv.includes('--dry-run')

const token = process.env.HUBSPOT_ACCESS_TOKEN?.trim()

if (!token) {
  console.error('FALTA HUBSPOT_ACCESS_TOKEN. Corré con: HUBSPOT_ACCESS_TOKEN="$(gcloud secrets versions access latest --secret=hubspot-access-token --project=efeonce-group)" pnpm tsx ...')
  process.exit(1)
}

type ObjectType = HubSpotPropertyDefinition['objectType']

const FIELD_TYPE_MAP: Record<HubSpotPropertyDefinition['type'], { type: string; fieldType: string }> = {
  number: { type: 'number', fieldType: 'number' },
  string: { type: 'string', fieldType: 'text' },
  datetime: { type: 'datetime', fieldType: 'date' },
  enumeration: { type: 'enumeration', fieldType: 'select' },
}

const api = async (path: string, method: 'GET' | 'POST', body?: unknown) => {
  const res = await fetch(`${HUBSPOT_API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  return { status: res.status, json: await res.json().catch(() => null) }
}

const ensureGroup = async (objectType: ObjectType): Promise<void> => {
  const existing = await api(`/crm/v3/properties/${objectType}/groups/${AEO_PROPERTY_GROUP_NAME}`, 'GET')

  if (existing.status === 200) {
    console.log(`  group "${AEO_PROPERTY_GROUP_NAME}" en ${objectType}: exists`)

    return
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] crearía group "${AEO_PROPERTY_GROUP_NAME}" (${AEO_PROPERTY_GROUP_LABEL}) en ${objectType}`)

    return
  }

  const created = await api(`/crm/v3/properties/${objectType}/groups`, 'POST', {
    name: AEO_PROPERTY_GROUP_NAME,
    label: AEO_PROPERTY_GROUP_LABEL,
  })

  console.log(`  group "${AEO_PROPERTY_GROUP_NAME}" en ${objectType}: ${created.status === 201 || created.status === 200 ? 'created' : `ERROR ${created.status} ${JSON.stringify(created.json)}`}`)
}

const ensureProperty = async (def: HubSpotPropertyDefinition): Promise<void> => {
  const existing = await api(`/crm/v3/properties/${def.objectType}/${def.name}`, 'GET')

  if (existing.status === 200) {
    console.log(`  ${def.objectType}.${def.name} ("${def.label}"): exists`)

    return
  }

  if (DRY_RUN) {
    console.log(`  [dry-run] crearía ${def.objectType}.${def.name} ("${def.label}") [${def.type}]`)

    return
  }

  const mapped = FIELD_TYPE_MAP[def.type]

  const created = await api(`/crm/v3/properties/${def.objectType}`, 'POST', {
    name: def.name,
    label: def.label,
    type: mapped.type,
    fieldType: mapped.fieldType,
    groupName: def.groupName,
  })

  console.log(`  ${def.objectType}.${def.name} ("${def.label}"): ${created.status === 201 || created.status === 200 ? 'created' : `ERROR ${created.status} ${JSON.stringify(created.json)}`}`)
}

const main = async () => {
  console.log(`AI Visibility HubSpot properties — provisión${DRY_RUN ? ' (DRY-RUN)' : ''}`)

  const objectTypes = [...new Set(AI_VISIBILITY_PROPERTY_DEFINITIONS.map(d => d.objectType))]

  for (const objectType of objectTypes) {
    console.log(`\n[${objectType}]`)
    await ensureGroup(objectType)
  }

  console.log('\n[properties]')

  for (const def of AI_VISIBILITY_PROPERTY_DEFINITIONS) {
    await ensureProperty(def)
  }

  console.log('\nDone.')
}

main().catch(error => {
  console.error('FAIL:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
