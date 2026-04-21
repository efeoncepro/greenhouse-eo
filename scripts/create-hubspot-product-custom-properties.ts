/* eslint-disable no-console */

// TASK-547 Fase C — HubSpot custom property definitions for the Product
// Catalog outbound bridge.
//
// This script is a SPECIFICATION. It does NOT call the HubSpot API directly
// from the Greenhouse EO runtime because this repo does not hold HubSpot
// admin credentials — all HubSpot writes go through the Cloud Run service
// (`hubspot-greenhouse-integration`). Property creation is an admin task
// done offline via the `hubspot-ops` CLI skill.
//
// How to apply:
//   1. Pull HubSpot admin credentials into the `hubspot-ops` CLI environment
//      (sandbox first, then production).
//   2. From the Greenhouse repo root, run:
//        pnpm tsx scripts/create-hubspot-product-custom-properties.ts
//   3. The script prints the property definitions and the idempotent
//      create-or-skip plan. Apply via `hubspot-ops create-property` from the
//      skill directly, or forward the JSON to the integration service.
//
// Properties live under the HubSpot `product` object type. All are namespaced
// with `gh_` so they never collide with native HubSpot fields and are easy to
// grep in CRM exports.

export interface HubSpotCustomPropertyDefinition {
  objectType: 'product'
  name: string
  label: string
  description: string
  groupName: string
  type: 'string' | 'datetime' | 'bool' | 'enumeration'
  fieldType: 'text' | 'date' | 'booleancheckbox' | 'select'
  options?: Array<{ label: string; value: string; displayOrder: number }>
  formField: boolean
  displayOrder: number
  readOnlyValue?: boolean
}

export const PRODUCT_HUBSPOT_CUSTOM_PROPERTIES: HubSpotCustomPropertyDefinition[] = [
  {
    objectType: 'product',
    name: 'gh_product_code',
    label: 'Greenhouse Product Code',
    description:
      'SKU canónico del catálogo Greenhouse (ECG-xxx, ETG-xxx, EFO-xxx, EFG-xxx). Clave de join entre product_catalog y HubSpot. Read-only: solo Greenhouse escribe este campo.',
    groupName: 'greenhouse_sync',
    type: 'string',
    fieldType: 'text',
    formField: false,
    displayOrder: 1,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_source_kind',
    label: 'Greenhouse Source Kind',
    description:
      'Catálogo fuente del producto dentro de Greenhouse: sellable_role, tool, overhead_addon, service, manual, hubspot_imported. Read-only.',
    groupName: 'greenhouse_sync',
    type: 'enumeration',
    fieldType: 'select',
    options: [
      { label: 'Sellable Role', value: 'sellable_role', displayOrder: 0 },
      { label: 'Tool', value: 'tool', displayOrder: 1 },
      { label: 'Overhead Addon', value: 'overhead_addon', displayOrder: 2 },
      { label: 'Service', value: 'service', displayOrder: 3 },
      { label: 'Manual (Admin Center)', value: 'manual', displayOrder: 4 },
      { label: 'HubSpot Imported', value: 'hubspot_imported', displayOrder: 5 }
    ],
    formField: false,
    displayOrder: 2,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_last_write_at',
    label: 'Last Greenhouse Outbound Write',
    description:
      'Timestamp ISO 8601 del último push exitoso desde Greenhouse. Usado por la sync inbound de HubSpot como anti-ping-pong guard: si HubSpot recibe un change event dentro de 60s de gh_last_write_at, el cambio se atribuye a Greenhouse y el inbound lo skippea.',
    groupName: 'greenhouse_sync',
    type: 'datetime',
    fieldType: 'date',
    formField: false,
    displayOrder: 3,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_archived_by_greenhouse',
    label: 'Archived By Greenhouse',
    description:
      'TRUE cuando el producto quedó archivado porque su fuente Greenhouse se desactivó (sellable_role.active=false, tool.is_active=false, addon.visible_to_client=false, etc). Sirve para distinguir archivos operativos de Greenhouse vs. archival manual en HubSpot.',
    groupName: 'greenhouse_sync',
    type: 'bool',
    fieldType: 'booleancheckbox',
    formField: false,
    displayOrder: 4,
    readOnlyValue: true
  },
  {
    objectType: 'product',
    name: 'gh_business_line',
    label: 'Greenhouse Business Line',
    description:
      'Unidad de negocio (globe, efeonce_digital, reach, wave, crm_solutions) que posee el producto. Greenhouse lo calcula desde sellable_roles/tools/services. Permite segmentación CRM por BU sin depender del SKU prefix.',
    groupName: 'greenhouse_sync',
    type: 'string',
    fieldType: 'text',
    formField: true,
    displayOrder: 5,
    readOnlyValue: false
  }
]

// ── Idempotent apply planner ──
// Given a list of properties already present on HubSpot (fetched via the
// integration service), returns the set that still needs to be created.
// Kept in this file so the `hubspot-ops` skill can import it without a
// separate compile step.

export const planCustomPropertyCreation = (
  existing: Array<{ name: string }>
): HubSpotCustomPropertyDefinition[] => {
  const existingNames = new Set(existing.map(p => p.name))

  return PRODUCT_HUBSPOT_CUSTOM_PROPERTIES.filter(def => !existingNames.has(def.name))
}

// ── CLI entrypoint ──
// Prints the plan to stdout so the operator can forward to the skill. Does
// NOT mutate HubSpot from this runtime.

const main = () => {
  console.log('TASK-547 HubSpot Product Custom Properties — plan:')
  console.log(JSON.stringify(PRODUCT_HUBSPOT_CUSTOM_PROPERTIES, null, 2))
  console.log('')
  console.log(
    'Apply via `hubspot-ops create-property` (sandbox first, then production). See docs/operations/hubspot-custom-properties-products.md for the full runbook.'
  )
}

if (require.main === module) {
  main()
}
