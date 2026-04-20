import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { CostModel, ToolCategory } from '@/types/ai-tools'

export type CommercialProviderType = 'organization' | 'platform' | 'financial_vendor'

export const CANONICAL_BUSINESS_LINES = ['globe', 'efeonce_digital', 'reach', 'wave', 'crm_solutions', 'unknown'] as const
export type CanonicalBusinessLine = (typeof CANONICAL_BUSINESS_LINES)[number]

export const TOOL_APPLICABILITY_TAGS = ['all_business_lines', 'internal_ops', 'staff_augmentation'] as const
export type ToolApplicabilityTag = (typeof TOOL_APPLICABILITY_TAGS)[number]

export const PRORATING_UNITS = [
  'projects_per_month',
  'active_clients',
  'projects',
  'users_per_month',
  'automations'
] as const
export type ProratingUnit = (typeof PRORATING_UNITS)[number]

interface ToolMetadata {
  toolId: string
  providerId: string
  providerName: string
  providerType: CommercialProviderType
  vendor: string
  toolCategory: ToolCategory
  toolSubcategory: string
  websiteUrl: string | null
}

export interface ToolCatalogSeedRow {
  rowNumber: number
  toolSku: string
  toolId: string
  toolName: string
  providerId: string
  providerName: string
  providerType: CommercialProviderType
  vendor: string
  toolCategory: ToolCategory
  toolSubcategory: string
  costModel: CostModel
  subscriptionAmount: number | null
  subscriptionCurrency: string
  subscriptionBillingCycle: string | null
  subscriptionSeats: number | null
  proratingQty: number | null
  proratingUnit: ProratingUnit | null
  proratedCostUsd: number | null
  proratedPriceUsd: number | null
  applicableBusinessLines: CanonicalBusinessLine[]
  applicabilityTags: ToolApplicabilityTag[]
  includesInAddon: boolean
  notesForQuoting: string | null
  description: string | null
  websiteUrl: string | null
  iconUrl: string | null
  isActive: boolean
  sortOrder: number
  warnings: string[]
}

export interface ToolCatalogRejectedRow {
  rowNumber: number
  toolSku: string | null
  toolName: string | null
  reason: string
}

export interface ToolCatalogSeedSummary {
  totalRows: number
  activeRows: number
  skippedEmpty: number
  skippedPlaceholder: number
  rejected: number
}

export interface ToolCatalogSeedParseResult {
  rows: ToolCatalogSeedRow[]
  summary: ToolCatalogSeedSummary
  rejectedRows: ToolCatalogRejectedRow[]
}

const TOOL_CATALOG_CSV_PATH = path.join(process.cwd(), 'data/pricing/seed/tool-catalog.csv')

const TOOL_METADATA_BY_NAME: Record<string, ToolMetadata> = {
  'Adobe Creative Cloud': {
    toolId: 'adobe-creative-cloud',
    providerId: 'adobe',
    providerName: 'Adobe',
    providerType: 'organization',
    vendor: 'Adobe',
    toolCategory: 'creative_production',
    toolSubcategory: 'design_suite',
    websiteUrl: 'https://www.adobe.com/creativecloud.html'
  },
  'Envato Elements': {
    toolId: 'envato-elements',
    providerId: 'envato',
    providerName: 'Envato',
    providerType: 'platform',
    vendor: 'Envato',
    toolCategory: 'creative_production',
    toolSubcategory: 'asset_library',
    websiteUrl: 'https://elements.envato.com'
  },
  Metricool: {
    toolId: 'metricool',
    providerId: 'metricool',
    providerName: 'Metricool',
    providerType: 'platform',
    vendor: 'Metricool',
    toolCategory: 'analytics',
    toolSubcategory: 'social_media_analytics',
    websiteUrl: 'https://metricool.com'
  },
  SEMrush: {
    toolId: 'semrush',
    providerId: 'semrush',
    providerName: 'SEMrush',
    providerType: 'organization',
    vendor: 'SEMrush',
    toolCategory: 'analytics',
    toolSubcategory: 'seo_analytics',
    websiteUrl: 'https://www.semrush.com'
  },
  HubSpot: {
    toolId: 'hubspot',
    providerId: 'hubspot',
    providerName: 'HubSpot',
    providerType: 'financial_vendor',
    vendor: 'HubSpot',
    toolCategory: 'crm',
    toolSubcategory: 'crm_suite',
    websiteUrl: 'https://www.hubspot.com'
  },
  Zapier: {
    toolId: 'zapier',
    providerId: 'zapier',
    providerName: 'Zapier',
    providerType: 'platform',
    vendor: 'Zapier',
    toolCategory: 'infrastructure',
    toolSubcategory: 'automation',
    websiteUrl: 'https://zapier.com'
  },
  'ChatGPT Plus': {
    toolId: 'chatgpt-plus',
    providerId: 'openai',
    providerName: 'OpenAI',
    providerType: 'organization',
    vendor: 'OpenAI',
    toolCategory: 'gen_text',
    toolSubcategory: 'llm',
    websiteUrl: 'https://openai.com/chatgpt'
  },
  Midjourney: {
    toolId: 'midjourney',
    providerId: 'midjourney',
    providerName: 'Midjourney',
    providerType: 'platform',
    vendor: 'Midjourney',
    toolCategory: 'gen_visual',
    toolSubcategory: 'image_generation',
    websiteUrl: 'https://www.midjourney.com'
  },
  'Cloudways VPS': {
    toolId: 'cloudways-vps',
    providerId: 'cloudways',
    providerName: 'Cloudways',
    providerType: 'platform',
    vendor: 'Cloudways',
    toolCategory: 'infrastructure',
    toolSubcategory: 'managed_hosting',
    websiteUrl: 'https://www.cloudways.com'
  },
  'Elementor Pro': {
    toolId: 'elementor-pro',
    providerId: 'elementor',
    providerName: 'Elementor',
    providerType: 'platform',
    vendor: 'Elementor',
    toolCategory: 'creative_production',
    toolSubcategory: 'wordpress_builder',
    websiteUrl: 'https://elementor.com'
  },
  'WP Rocket': {
    toolId: 'wp-rocket',
    providerId: 'wp-rocket',
    providerName: 'WP Rocket',
    providerType: 'platform',
    vendor: 'WP Rocket',
    toolCategory: 'infrastructure',
    toolSubcategory: 'wordpress_performance',
    websiteUrl: 'https://wp-rocket.me'
  },
  'Crocoblock Suite': {
    toolId: 'crocoblock-suite',
    providerId: 'crocoblock',
    providerName: 'Crocoblock',
    providerType: 'platform',
    vendor: 'Crocoblock',
    toolCategory: 'creative_production',
    toolSubcategory: 'wordpress_plugins',
    websiteUrl: 'https://crocoblock.com'
  },
  'GTM Server-side': {
    toolId: 'gtm-server-side',
    providerId: 'google-cloud',
    providerName: 'Google Cloud',
    providerType: 'organization',
    vendor: 'Google',
    toolCategory: 'analytics',
    toolSubcategory: 'tracking_infrastructure',
    websiteUrl: 'https://cloud.google.com/tag-manager'
  },
  BigQuery: {
    toolId: 'bigquery',
    providerId: 'google-cloud',
    providerName: 'Google Cloud',
    providerType: 'organization',
    vendor: 'Google Cloud',
    toolCategory: 'analytics',
    toolSubcategory: 'data_warehouse',
    websiteUrl: 'https://cloud.google.com/bigquery'
  },
  Notion: {
    toolId: 'notion',
    providerId: 'notion',
    providerName: 'Notion',
    providerType: 'financial_vendor',
    vendor: 'Notion',
    toolCategory: 'collaboration',
    toolSubcategory: 'workspace',
    websiteUrl: 'https://www.notion.so'
  },
  'Microsoft 365': {
    toolId: 'microsoft-365',
    providerId: 'microsoft',
    providerName: 'Microsoft',
    providerType: 'financial_vendor',
    vendor: 'Microsoft',
    toolCategory: 'collaboration',
    toolSubcategory: 'office_suite',
    websiteUrl: 'https://www.microsoft.com/microsoft-365'
  },
  Deel: {
    toolId: 'deel',
    providerId: 'deel',
    providerName: 'Deel',
    providerType: 'organization',
    vendor: 'Deel',
    toolCategory: 'infrastructure',
    toolSubcategory: 'global_payroll',
    websiteUrl: 'https://www.deel.com'
  },
  Gemini: {
    toolId: 'gemini',
    providerId: 'google-deepmind',
    providerName: 'Google DeepMind',
    providerType: 'organization',
    vendor: 'Google',
    toolCategory: 'gen_text',
    toolSubcategory: 'llm',
    websiteUrl: 'https://gemini.google.com'
  },
  Figma: {
    toolId: 'figma',
    providerId: 'figma',
    providerName: 'Figma',
    providerType: 'platform',
    vendor: 'Figma',
    toolCategory: 'collaboration',
    toolSubcategory: 'design_collaboration',
    websiteUrl: 'https://www.figma.com'
  },
  Shutterstock: {
    toolId: 'shutterstock',
    providerId: 'shutterstock',
    providerName: 'Shutterstock',
    providerType: 'platform',
    vendor: 'Shutterstock',
    toolCategory: 'creative_production',
    toolSubcategory: 'asset_library',
    websiteUrl: 'https://www.shutterstock.com'
  },
  Freepik: {
    toolId: 'freepik-premium',
    providerId: 'freepik',
    providerName: 'Freepik',
    providerType: 'financial_vendor',
    vendor: 'Freepik',
    toolCategory: 'creative_production',
    toolSubcategory: 'asset_library',
    websiteUrl: 'https://www.freepik.com'
  },
  'Frame.io': {
    toolId: 'frame-io',
    providerId: 'frame-io',
    providerName: 'Frame.io',
    providerType: 'platform',
    vendor: 'Frame.io',
    toolCategory: 'collaboration',
    toolSubcategory: 'review_workflow',
    websiteUrl: 'https://frame.io'
  },
  'Eleven Labs': {
    toolId: 'elevenlabs',
    providerId: 'elevenlabs',
    providerName: 'ElevenLabs',
    providerType: 'organization',
    vendor: 'ElevenLabs',
    toolCategory: 'gen_audio',
    toolSubcategory: 'voice_generation',
    websiteUrl: 'https://elevenlabs.io'
  },
  'Github Copilot': {
    toolId: 'github-copilot',
    providerId: 'github',
    providerName: 'GitHub',
    providerType: 'organization',
    vendor: 'GitHub',
    toolCategory: 'ai_suite',
    toolSubcategory: 'developer_assistant',
    websiteUrl: 'https://github.com/features/copilot'
  },
  'Adobe Express': {
    toolId: 'adobe-express',
    providerId: 'adobe',
    providerName: 'Adobe',
    providerType: 'organization',
    vendor: 'Adobe',
    toolCategory: 'creative_production',
    toolSubcategory: 'quick_design',
    websiteUrl: 'https://www.adobe.com/express'
  },
  Favikon: {
    toolId: 'favikon',
    providerId: 'favikon',
    providerName: 'Favikon',
    providerType: 'platform',
    vendor: 'Favikon',
    toolCategory: 'analytics',
    toolSubcategory: 'influencer_analytics',
    websiteUrl: 'https://www.favikon.com'
  }
}

const splitLines = (csv: string): string[] =>
  csv
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(line => line.trim().length > 0)

const splitCsvLine = (line: string): string[] => {
  const fields: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current)
      current = ''
    } else {
      current += char
    }
  }

  fields.push(current)

  return fields.map(field => field.trim())
}

const parseCsvDocument = (csv: string): Array<Record<string, string>> => {
  const lines = splitLines(csv)
  const header = splitCsvLine(lines[0] ?? '')

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    header.forEach((key, index) => {
      row[key] = values[index] ?? ''
    })

    return row
  })
}

const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')

const normalizeNullableString = (value: string | undefined) => {
  const trimmed = (value || '').trim()

  return trimmed ? trimmed : null
}

const parseNullableNumber = (value: string | undefined): number | null => {
  const trimmed = (value || '').trim()

  if (!trimmed || /^n\/a$/i.test(trimmed)) {
    return null
  }

  const parsed = Number(trimmed.replace(/\s+/g, ''))

  return Number.isFinite(parsed) ? parsed : null
}

const parseBillingCycle = (value: string | undefined): string | null => {
  const normalized = slugify(value || '')

  switch (normalized) {
    case 'mensual':
    case 'monthly':
      return 'monthly'
    case 'anual':
    case 'annual':
      return 'annual'
    default:
      return null
  }
}

const parseProratingUnit = (value: string | undefined): ProratingUnit | null => {
  const normalized = slugify(value || '')

  switch (normalized) {
    case 'proyectos-mes':
      return 'projects_per_month'
    case 'clientes-activos':
      return 'active_clients'
    case 'proyectos':
      return 'projects'
    case 'usuarios-mes':
      return 'users_per_month'
    case 'automatizaciones':
      return 'automations'
    default:
      return null
  }
}

const parseIncludesInAddon = (value: string | undefined) => /^(si|sí|true|1|✅)$/i.test((value || '').trim())

const parseApplicableTo = (value: string | undefined) => {
  const businessLines = new Set<CanonicalBusinessLine>()
  const tags = new Set<ToolApplicabilityTag>()

  for (const token of String(value || '').split(/[\/,]/)) {
    const normalized = slugify(token)

    switch (normalized) {
      case 'globe':
        businessLines.add('globe')
        break
      case 'efeonce-digital':
        businessLines.add('efeonce_digital')
        break
      case 'reach':
        businessLines.add('reach')
        break
      case 'wave':
        businessLines.add('wave')
        break
      case 'crm-solutions':
        businessLines.add('crm_solutions')
        break
      case 'todos':
      case 'todas':
        tags.add('all_business_lines')
        break
      case 'staff-augmentation':
        tags.add('staff_augmentation')
        break
      case 'efeonce':
        tags.add('internal_ops')
        break
      default:
        break
    }
  }

  return {
    applicableBusinessLines: Array.from(businessLines),
    applicabilityTags: Array.from(tags)
  }
}

const inferCostModel = (toolName: string, costValue: number | null): CostModel => {
  if (toolName === 'HubSpot' || costValue == null) {
    return 'included'
  }

  return 'subscription'
}

const resolveToolMetadata = (toolName: string): ToolMetadata | null => TOOL_METADATA_BY_NAME[toolName] ?? null

export const normalizeToolCatalogCsv = (csv: string): ToolCatalogSeedParseResult => {
  const rows = parseCsvDocument(csv)
  const normalizedRows: ToolCatalogSeedRow[] = []
  const rejectedRows: ToolCatalogRejectedRow[] = []

  let skippedEmpty = 0
  let skippedPlaceholder = 0

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const toolSku = normalizeNullableString(row.SKU)
    const toolName = normalizeNullableString(row['Nombre de la Herramienta'])
    const category = normalizeNullableString(row.Categoría)

    if (!toolSku && !toolName && !category) {
      skippedEmpty += 1
      
return
    }

    if (toolSku && !toolName) {
      skippedPlaceholder += 1
      
return
    }

    if (!toolSku || !toolName || !category) {
      rejectedRows.push({
        rowNumber,
        toolSku,
        toolName,
        reason: 'tool_sku, nombre y categoría son obligatorios.'
      })
      
return
    }

    const metadata = resolveToolMetadata(toolName)

    if (!metadata) {
      rejectedRows.push({
        rowNumber,
        toolSku,
        toolName,
        reason: 'No existe metadata determinística para resolver provider/tool identity.'
      })
      
return
    }

    const costValue = parseNullableNumber(row['Costo Total (USD)'])
    const { applicableBusinessLines, applicabilityTags } = parseApplicableTo(row['Aplicable a'])
    const warnings: string[] = []

    if (costValue == null) {
      warnings.push('Costo Total (USD) vacío o N/A.')
    }

    if (!row['Aplicable a']?.trim()) {
      warnings.push('Aplicable a vacío; se asume sin business line ni tags.')
    }

    normalizedRows.push({
      rowNumber,
      toolSku,
      toolId: metadata.toolId,
      toolName,
      providerId: metadata.providerId,
      providerName: metadata.providerName,
      providerType: metadata.providerType,
      vendor: metadata.vendor,
      toolCategory: metadata.toolCategory,
      toolSubcategory: metadata.toolSubcategory,
      costModel: inferCostModel(toolName, costValue),
      subscriptionAmount: costValue,
      subscriptionCurrency: 'USD',
      subscriptionBillingCycle: parseBillingCycle(row.Frecuencia),
      subscriptionSeats: slugify(row.Unidad || '') === 'usuario' ? 1 : null,
      proratingQty: parseNullableNumber(row['Prorrateo Estimado']),
      proratingUnit: parseProratingUnit(row['Tipo de prorrateo']),
      proratedCostUsd: parseNullableNumber(row['Costo Prorrateado (USD)']),
      proratedPriceUsd: parseNullableNumber(row['Precio Prorrateado']),
      applicableBusinessLines,
      applicabilityTags,
      includesInAddon: parseIncludesInAddon(row['Incluye en Add-on']),
      notesForQuoting: normalizeNullableString(row.Comentarios),
      description: normalizeNullableString(row.Comentarios),
      websiteUrl: metadata.websiteUrl,
      iconUrl: null,
      isActive: true,
      sortOrder: Number(toolSku.replace(/^ETG-/, '')),
      warnings
    })
  })

  return {
    rows: normalizedRows,
    summary: {
      totalRows: rows.length,
      activeRows: normalizedRows.length,
      skippedEmpty,
      skippedPlaceholder,
      rejected: rejectedRows.length
    },
    rejectedRows
  }
}

export const loadToolCatalogSeedFile = async () => readFile(TOOL_CATALOG_CSV_PATH, 'utf8')
