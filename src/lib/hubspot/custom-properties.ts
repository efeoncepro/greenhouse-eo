export const HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES = [
  'companies',
  'contacts',
  'deals',
  'products',
  'services'
] as const

export type HubSpotCustomPropertyObjectType =
  (typeof HUBSPOT_CUSTOM_PROPERTY_OBJECT_TYPES)[number]

export type HubSpotPropertyType =
  | 'string'
  | 'datetime'
  | 'date'
  | 'number'
  | 'bool'
  | 'enumeration'

export type HubSpotPropertyFieldType =
  | 'text'
  | 'date'
  | 'number'
  | 'booleancheckbox'
  | 'select'
  | 'checkbox'

export interface HubSpotPropertyOption {
  label: string
  value: string
  displayOrder: number
  hidden?: boolean
  description?: string | null
}

export interface HubSpotCustomPropertyTemplate {
  name: string
  label: string
  description: string
  type: HubSpotPropertyType
  fieldType: HubSpotPropertyFieldType
  options?: HubSpotPropertyOption[]
  formField: boolean
  displayOrder: number
  readOnlyValue?: boolean
}

export interface HubSpotCustomPropertyDefinition
  extends HubSpotCustomPropertyTemplate {
  objectType: HubSpotCustomPropertyObjectType
  groupName: string
}

export interface HubSpotPropertySnapshot {
  name: string
  label?: string
  description?: string
  groupName?: string
  type?: HubSpotPropertyType
  fieldType?: HubSpotPropertyFieldType
  options?: HubSpotPropertyOption[]
  formField?: boolean
  displayOrder?: number
  readOnlyValue?: boolean
  modificationMetadata?: {
    readOnlyValue?: boolean
  }
}

export interface HubSpotCustomPropertyPlanItem {
  action: 'create' | 'update' | 'exists'
  definition: HubSpotCustomPropertyDefinition
  existing?: HubSpotPropertySnapshot
}

export interface HubSpotCustomPropertySummary {
  create: number
  update: number
  exists: number
}

export interface HubSpotCustomPropertyGroupConfig {
  preferredGroupName: string
  groupLabel: string
  groupCandidates: string[]
}

const GREENHOUSE_SYNC_GROUP_LABEL = 'Greenhouse Sync'

const BUSINESS_LINE_OPTIONS: HubSpotPropertyOption[] = [
  { label: 'Efeonce Digital', value: 'efeonce_digital', displayOrder: 1 },
  { label: 'Globe', value: 'globe', displayOrder: 2 },
  { label: 'Wave', value: 'wave', displayOrder: 3 },
  { label: 'Reach', value: 'reach', displayOrder: 4 },
  { label: 'CRM Solutions', value: 'crm_solutions', displayOrder: 5 }
]

const SERVICE_SPECIFIC_OPTIONS: HubSpotPropertyOption[] = [
  { label: 'Licenciamiento HubSpot', value: 'licenciamiento_hubspot', displayOrder: 1 },
  { label: 'Implementación & Onboarding', value: 'implementacion_onboarding', displayOrder: 2 },
  { label: 'Consultoría CRM', value: 'consultoria_crm', displayOrder: 3 },
  { label: 'Desarrollo Web', value: 'desarrollo_web', displayOrder: 4 },
  { label: 'Diseño UX', value: 'diseno_ux', displayOrder: 5 },
  { label: 'Agencia Creativa', value: 'agencia_creativa', displayOrder: 6 },
  { label: 'Producción Audiovisual', value: 'produccion_audiovisual', displayOrder: 7 },
  { label: 'Social Media & Content', value: 'social_media_content', displayOrder: 8 },
  { label: 'Social Care / SAC', value: 'social_care_sac', displayOrder: 9 },
  { label: 'Performance & Paid Media', value: 'performance_paid_media', displayOrder: 10 },
  { label: 'SEO / AEO', value: 'seo_aeo', displayOrder: 11 },
  {
    label: 'Email Marketing & Automation',
    value: 'email_marketing_automation',
    displayOrder: 12
  },
  { label: 'Data & Analytics', value: 'data_analytics', displayOrder: 13 },
  { label: 'Research & Estrategia', value: 'research_estrategia', displayOrder: 14 }
]

const PRODUCT_SOURCE_KIND_OPTIONS: HubSpotPropertyOption[] = [
  { label: 'Rol vendible', value: 'sellable_role', displayOrder: 0 },
  { label: 'Herramienta', value: 'tool', displayOrder: 1 },
  { label: 'Overhead adicional', value: 'overhead_addon', displayOrder: 2 },
  { label: 'Servicio', value: 'service', displayOrder: 3 },
  { label: 'Manual', value: 'manual', displayOrder: 4 },
  { label: 'Importado desde HubSpot', value: 'hubspot_imported', displayOrder: 5 }
]

const BOOLEAN_OPTIONS: HubSpotPropertyOption[] = [
  { label: 'Si', value: 'true', displayOrder: 0 },
  { label: 'No', value: 'false', displayOrder: 1 }
]

const DEAL_ORIGIN_OPTIONS: HubSpotPropertyOption[] = [
  {
    label: 'Quote Builder Greenhouse',
    value: 'greenhouse_quote_builder',
    displayOrder: 0
  }
]

export const HUBSPOT_CUSTOM_PROPERTY_GROUP_CONFIG: Record<
  HubSpotCustomPropertyObjectType,
  HubSpotCustomPropertyGroupConfig
> = {
  companies: {
    preferredGroupName: 'companyinformation',
    groupLabel: 'Company Information',
    groupCandidates: ['companyinformation', 'greenhouse_sync']
  },
  contacts: {
    preferredGroupName: 'contactinformation',
    groupLabel: 'Contact Information',
    groupCandidates: ['contactinformation', 'greenhouse_sync']
  },
  deals: {
    preferredGroupName: 'dealinformation',
    groupLabel: 'Deal Information',
    groupCandidates: ['dealinformation', 'greenhouse_sync']
  },
  products: {
    preferredGroupName: 'greenhouse_sync',
    groupLabel: GREENHOUSE_SYNC_GROUP_LABEL,
    groupCandidates: ['greenhouse_sync', 'productinformation']
  },
  services: {
    preferredGroupName: 'service_information',
    groupLabel: 'Service Information',
    groupCandidates: ['service_information', 'greenhouse_sync']
  }
}

const HUBSPOT_CUSTOM_PROPERTY_TEMPLATES: Record<
  HubSpotCustomPropertyObjectType,
  HubSpotCustomPropertyTemplate[]
> = {
  companies: [
    {
      name: 'gh_commercial_party_id',
      label: 'ID de Party Comercial Greenhouse',
      description:
        'Identificador canónico de la party comercial en Greenhouse.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'gh_last_quote_at',
      label: 'Última Cotización Emitida en Greenhouse',
      description:
        'Fecha y hora de la última cotización emitida por Greenhouse para esta organización.',
      type: 'datetime',
      fieldType: 'date',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'gh_last_contract_at',
      label: 'Último Contrato Registrado en Greenhouse',
      description:
        'Fecha y hora del último contrato creado o activado en Greenhouse para esta organización.',
      type: 'datetime',
      fieldType: 'date',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'gh_active_contracts_count',
      label: 'Cantidad de Contratos Activos en Greenhouse',
      description:
        'Cantidad actual de contratos activos asociados a esta organización en Greenhouse.',
      type: 'number',
      fieldType: 'number',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'gh_last_write_at',
      label: 'Última Sincronización Saliente de Greenhouse',
      description:
        'Fecha y hora del último write outbound exitoso desde Greenhouse hacia HubSpot.',
      type: 'datetime',
      fieldType: 'date',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'gh_mrr_tier',
      label: 'Tier de MRR Greenhouse',
      description:
        'Tier comercial expuesto por Greenhouse cuando no se comparte el monto bruto de MRR.',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { label: 'Cliente Activo', value: 'active_client', displayOrder: 1 },
        { label: 'Pipeline', value: 'pipeline', displayOrder: 2 }
      ],
      formField: false,
      displayOrder: -1
    }
  ],
  contacts: [],
  deals: [
    {
      name: 'gh_deal_origin',
      label: 'Origen del Deal en Greenhouse',
      description:
        'Marca tecnica para distinguir deals creados desde flujos Greenhouse, como el Quote Builder.',
      type: 'enumeration',
      fieldType: 'select',
      options: DEAL_ORIGIN_OPTIONS,
      formField: false,
      displayOrder: 1
    },
    {
      name: 'gh_idempotency_key',
      label: 'Llave de Idempotencia Greenhouse',
      description:
        'Clave tecnica usada por Greenhouse para deduplicar retries al crear deals desde flujos automatizados o interactivos.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: 2
    }
  ],
  products: [
    {
      name: 'gh_product_code',
      label: 'Codigo de Producto Greenhouse',
      description:
        'SKU canonico del catalogo Greenhouse. Sirve para enlazar el producto de HubSpot con el catalogo oficial del portal. Este campo es de solo lectura para operadores.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: 1
    },
    {
      name: 'gh_source_kind',
      label: 'Origen del Producto en Greenhouse',
      description:
        'Indica desde que catalogo o flujo de Greenhouse se origino este producto. Este campo es de solo lectura para operadores.',
      type: 'enumeration',
      fieldType: 'select',
      options: PRODUCT_SOURCE_KIND_OPTIONS,
      formField: false,
      displayOrder: 2
    },
    {
      name: 'gh_last_write_at',
      label: 'Ultima Sincronizacion desde Greenhouse',
      description:
        'Fecha y hora de la ultima sincronizacion saliente exitosa desde Greenhouse hacia HubSpot. Se usa para evitar rebotes de sync entre ambos sistemas.',
      type: 'datetime',
      fieldType: 'date',
      formField: false,
      displayOrder: 3
    },
    {
      name: 'gh_archived_by_greenhouse',
      label: 'Archivado por Greenhouse',
      description:
        'Indica si el producto fue archivado automaticamente por una desactivacion en Greenhouse, y no por una accion manual dentro de HubSpot.',
      type: 'bool',
      fieldType: 'booleancheckbox',
      options: BOOLEAN_OPTIONS,
      formField: false,
      displayOrder: 4
    },
    {
      name: 'gh_business_line',
      label: 'Linea de Negocio Greenhouse',
      description:
        'Linea de negocio de Greenhouse responsable del producto. Se calcula desde el catalogo fuente y hoy se mantiene editable para soporte operativo controlado.',
      type: 'string',
      fieldType: 'text',
      formField: true,
      displayOrder: 5,
      readOnlyValue: false
    }
  ],
  services: [
    {
      name: 'ef_space_id',
      label: 'Greenhouse Space ID',
      description: 'ID del Space en Greenhouse EO vinculado a este servicio.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_organization_id',
      label: 'Greenhouse Organization ID',
      description: 'ID de la organización en Greenhouse EO.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_pipeline_stage',
      label: 'Pipeline Stage (Greenhouse)',
      description: 'Etapa del pipeline sincronizada desde Greenhouse.',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { label: 'Onboarding', value: 'onboarding', displayOrder: 1 },
        { label: 'Activo', value: 'active', displayOrder: 2 },
        { label: 'En renovación', value: 'renewal_pending', displayOrder: 3 },
        { label: 'Renovado', value: 'renewed', displayOrder: 4 },
        { label: 'Cerrado', value: 'closed', displayOrder: 5 },
        { label: 'Pausado', value: 'paused', displayOrder: 6 }
      ],
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_linea_de_servicio',
      label: 'Línea de Servicio',
      description: 'Línea de negocio de Efeonce que entrega este servicio.',
      type: 'enumeration',
      fieldType: 'select',
      options: BUSINESS_LINE_OPTIONS,
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_servicio_especifico',
      label: 'Servicio Específico',
      description: 'Código del servicio específico del catálogo Greenhouse.',
      type: 'enumeration',
      fieldType: 'select',
      options: SERVICE_SPECIFIC_OPTIONS,
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_start_date',
      label: 'Fecha de Inicio',
      description: 'Fecha de inicio contractual del servicio.',
      type: 'date',
      fieldType: 'date',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_target_end_date',
      label: 'Fecha de Fin',
      description: 'Fecha de fin contractual del servicio.',
      type: 'date',
      fieldType: 'date',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_total_cost',
      label: 'Costo Total',
      description: 'Monto total del servicio en la moneda indicada.',
      type: 'number',
      fieldType: 'number',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_amount_paid',
      label: 'Monto Pagado',
      description: 'Monto pagado a la fecha.',
      type: 'number',
      fieldType: 'number',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_currency',
      label: 'Moneda',
      description: 'Moneda del servicio.',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { label: 'CLP', value: 'CLP', displayOrder: 1 },
        { label: 'USD', value: 'USD', displayOrder: 2 }
      ],
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_modalidad',
      label: 'Modalidad',
      description: 'Modalidad de entrega del servicio.',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { label: 'Continua', value: 'continua', displayOrder: 1 },
        { label: 'Sprint', value: 'sprint', displayOrder: 2 },
        { label: 'Proyecto', value: 'proyecto', displayOrder: 3 }
      ],
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_billing_frequency',
      label: 'Frecuencia de Facturación',
      description: 'Frecuencia con que se factura este servicio.',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { label: 'Mensual', value: 'monthly', displayOrder: 1 },
        { label: 'Trimestral', value: 'quarterly', displayOrder: 2 },
        { label: 'Por proyecto', value: 'project', displayOrder: 3 }
      ],
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_country',
      label: 'País',
      description: 'País donde se entrega el servicio.',
      type: 'enumeration',
      fieldType: 'select',
      options: [
        { label: 'Chile', value: 'CL', displayOrder: 1 },
        { label: 'Colombia', value: 'CO', displayOrder: 2 },
        { label: 'México', value: 'MX', displayOrder: 3 },
        { label: 'Perú', value: 'PE', displayOrder: 4 }
      ],
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_deal_id',
      label: 'HubSpot Deal ID',
      description: 'ID del deal de HubSpot asociado a este servicio.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_notion_project_id',
      label: 'Notion Project ID',
      description: 'ID del proyecto en Notion vinculado a este servicio.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: -1
    },
    {
      name: 'ef_greenhouse_service_id',
      label: 'Greenhouse Service ID',
      description:
        'UUID del service en Greenhouse (greenhouse_core.services.service_id). Idempotency key para outbound projection (TASK-837). NO editar manualmente.',
      type: 'string',
      fieldType: 'text',
      formField: false,
      displayOrder: -1
    }
  ]
}

const sanitizeOptions = (options?: HubSpotPropertyOption[]) =>
  [...(options ?? [])]
    .map(option => ({
      label: option.label ?? '',
      value: option.value ?? '',
      displayOrder: option.displayOrder ?? 0
    }))
    .sort((left, right) => {
      if (left.displayOrder !== right.displayOrder) {
        return left.displayOrder - right.displayOrder
      }

      return left.value.localeCompare(right.value)
    })

const normalizeDefinitionForCompare = (
  definition: HubSpotCustomPropertyDefinition | HubSpotPropertySnapshot
) => {
  const readOnlyValue =
    definition.readOnlyValue ??
    ('modificationMetadata' in definition
      ? definition.modificationMetadata?.readOnlyValue
      : undefined) ??
    false

  return {
  label: definition.label ?? '',
  description: definition.description ?? '',
  type: definition.type ?? '',
  fieldType: definition.fieldType ?? '',
  groupName: definition.groupName ?? '',
  formField: definition.formField ?? false,
  displayOrder: definition.displayOrder ?? 0,
  readOnlyValue,
  options: sanitizeOptions(definition.options)
  }
}

const propertiesMatch = (
  existing: HubSpotPropertySnapshot | undefined,
  definition: HubSpotCustomPropertyDefinition
) => {
  if (!existing) {
    return false
  }

  return (
    JSON.stringify(normalizeDefinitionForCompare(existing)) ===
    JSON.stringify(normalizeDefinitionForCompare(definition))
  )
}

export const getHubSpotCustomPropertyGroupConfig = (
  objectType: HubSpotCustomPropertyObjectType
) => HUBSPOT_CUSTOM_PROPERTY_GROUP_CONFIG[objectType]

export const getHubSpotCustomPropertyTemplates = (
  objectType: HubSpotCustomPropertyObjectType
) => HUBSPOT_CUSTOM_PROPERTY_TEMPLATES[objectType]

export const getHubSpotCustomPropertyDefinitions = (
  objectType: HubSpotCustomPropertyObjectType,
  groupName = getHubSpotCustomPropertyGroupConfig(objectType).preferredGroupName
): HubSpotCustomPropertyDefinition[] =>
  getHubSpotCustomPropertyTemplates(objectType).map(definition => ({
    ...definition,
    objectType,
    groupName
  }))

export const planHubSpotCustomPropertyCreation = (
  objectType: HubSpotCustomPropertyObjectType,
  existing: Array<{ name: string }>,
  groupName?: string
) => {
  const existingNames = new Set(existing.map(property => property.name))

  return getHubSpotCustomPropertyDefinitions(objectType, groupName).filter(
    definition => !existingNames.has(definition.name)
  )
}

export const diffHubSpotCustomProperties = (
  objectType: HubSpotCustomPropertyObjectType,
  existing: HubSpotPropertySnapshot[],
  groupName?: string
): HubSpotCustomPropertyPlanItem[] => {
  const byName = new Map(existing.map(property => [property.name, property]))

  return getHubSpotCustomPropertyDefinitions(objectType, groupName).map(definition => {
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

export const summarizeHubSpotCustomPropertyPlan = (
  plan: HubSpotCustomPropertyPlanItem[]
): HubSpotCustomPropertySummary =>
  plan.reduce<HubSpotCustomPropertySummary>(
    (summary, item) => {
      summary[item.action] += 1

      return summary
    },
    { create: 0, update: 0, exists: 0 }
  )
