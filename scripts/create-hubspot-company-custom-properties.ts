/* eslint-disable no-console */

export interface HubSpotCompanyCustomPropertyDefinition {
  objectType: 'company'
  name: string
  label: string
  description: string
  groupName: string
  type: 'string' | 'datetime' | 'number' | 'enumeration'
  fieldType: 'text' | 'date' | 'number' | 'select'
  options?: Array<{ label: string; value: string; displayOrder: number }>
  formField: boolean
  displayOrder: number
  readOnlyValue?: boolean
}

export const COMPANY_HUBSPOT_CUSTOM_PROPERTIES: HubSpotCompanyCustomPropertyDefinition[] = [
  {
    objectType: 'company',
    name: 'gh_commercial_party_id',
    label: 'ID de Party Comercial Greenhouse',
    description:
      'Identificador canónico de la party comercial en Greenhouse. Read-only: sólo Greenhouse escribe este campo.',
    groupName: 'greenhouse_sync',
    type: 'string',
    fieldType: 'text',
    formField: false,
    displayOrder: 1,
    readOnlyValue: true
  },
  {
    objectType: 'company',
    name: 'gh_last_quote_at',
    label: 'Última Cotización Emitida en Greenhouse',
    description:
      'Timestamp ISO 8601 de la última cotización emitida por Greenhouse para esta organización.',
    groupName: 'greenhouse_sync',
    type: 'datetime',
    fieldType: 'date',
    formField: false,
    displayOrder: 2,
    readOnlyValue: true
  },
  {
    objectType: 'company',
    name: 'gh_last_contract_at',
    label: 'Último Contrato Registrado en Greenhouse',
    description:
      'Timestamp ISO 8601 del último contrato creado o activado en Greenhouse para esta organización.',
    groupName: 'greenhouse_sync',
    type: 'datetime',
    fieldType: 'date',
    formField: false,
    displayOrder: 3,
    readOnlyValue: true
  },
  {
    objectType: 'company',
    name: 'gh_active_contracts_count',
    label: 'Cantidad de Contratos Activos en Greenhouse',
    description:
      'Cantidad de contratos activos asociados a la organización en Greenhouse.',
    groupName: 'greenhouse_sync',
    type: 'number',
    fieldType: 'number',
    formField: false,
    displayOrder: 4,
    readOnlyValue: true
  },
  {
    objectType: 'company',
    name: 'gh_last_write_at',
    label: 'Última Sincronización Saliente de Greenhouse',
    description:
      'Timestamp ISO 8601 del último write outbound exitoso desde Greenhouse. Usado como anti-ping-pong guard.',
    groupName: 'greenhouse_sync',
    type: 'datetime',
    fieldType: 'date',
    formField: false,
    displayOrder: 5,
    readOnlyValue: true
  },
  {
    objectType: 'company',
    name: 'gh_mrr_tier',
    label: 'Tier de MRR Greenhouse',
    description:
      'Tier de MRR expuesto por Greenhouse cuando compliance no permite exportar el monto crudo. Valores iniciales mínimos para Fase F.',
    groupName: 'greenhouse_sync',
    type: 'enumeration',
    fieldType: 'select',
    options: [
      { label: 'Cliente Activo', value: 'active_client', displayOrder: 0 },
      { label: 'Pipeline', value: 'pipeline', displayOrder: 1 }
    ],
    formField: false,
    displayOrder: 6,
    readOnlyValue: true
  }
]

export const planCompanyCustomPropertyCreation = (
  existing: Array<{ name: string }>
): HubSpotCompanyCustomPropertyDefinition[] => {
  const existingNames = new Set(existing.map(property => property.name))

  return COMPANY_HUBSPOT_CUSTOM_PROPERTIES.filter(property => !existingNames.has(property.name))
}

const main = () => {
  console.log('TASK-540 HubSpot Company Custom Properties — plan:')
  console.log(JSON.stringify(COMPANY_HUBSPOT_CUSTOM_PROPERTIES, null, 2))
  console.log('')
  console.log(
    'Apply via the HubSpot ops/admin flow against sandbox first and production second.'
  )
}

if (require.main === module) {
  main()
}
