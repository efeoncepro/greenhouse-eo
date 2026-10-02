import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { DATAFORSEO_FAMILIES, type DataForSeoFamily } from './dataforseo-families'

export type DataForSeoHttpMethod = 'GET' | 'POST'
export type DataForSeoEndpointMode = 'live' | 'task_post' | 'task_get' | 'tasks_ready' | 'status' | 'catalog' | 'other'
export type DataForSeoExecutionStatus = 'executable' | 'catalog_only'

export interface DataForSeoCatalogField {
  name: string
  type: string | null
  required: boolean
  description: string
}

export interface DataForSeoCatalogEndpoint {
  id: string
  method: DataForSeoHttpMethod
  path: string
  pathTemplate: string
  family: string
  title: string
  description: string
  mode: DataForSeoEndpointMode
  batchLimit: number | null
  free: boolean
  requestFields: DataForSeoCatalogField[]
  example: unknown | null
  documentationUrl: string
  sourcePageId: number
  sourceModifiedAt: string
  execution: {
    status: DataForSeoExecutionStatus
    internalFamily: DataForSeoFamily | null
    reason: string | null
    enablement: string | null
  }
}

export interface DataForSeoCatalogSnapshot {
  schemaVersion: 1
  providerApiVersion: 'v3'
  source: {
    type: 'official-wordpress-rest'
    url: string
    pageCount: number
    documentationPageCount: number
    latestModifiedAt: string
    contentDigest: string
  }
  generatedAt: string
  endpoints: DataForSeoCatalogEndpoint[]
}

const catalogPath = fileURLToPath(new URL('../../../data/dataforseo/endpoints.v3.json', import.meta.url))

export const DATAFORSEO_CATALOG = JSON.parse(readFileSync(catalogPath, 'utf8')) as DataForSeoCatalogSnapshot

const FAMILY_ALIASES: Record<string, DataForSeoFamily | undefined> = {
  serp: 'serp',
  dataforseo_labs: 'labs',
  backlinks: 'backlinks',
  on_page: 'onpage',
  domain_analytics: 'domain',
  ai_optimization: 'ai_optimization'
}

export const resolveCatalogExecution = (path: string): DataForSeoCatalogEndpoint['execution'] => {
  const providerFamily = path.split('/').filter(Boolean)[1] ?? ''
  const internalFamily = FAMILY_ALIASES[providerFamily] ?? null

  if (!internalFamily) {
    return {
      status: 'catalog_only',
      internalFamily: null,
      reason: `La familia oficial "${providerFamily || 'unknown'}" no pertenece al allowlist cerrado de Greenhouse.`,
      enablement:
        'Abrir una decisión gobernada: familia + CHECK del spend ledger + entitlement + recorder + consumer + pruebas.'
    }
  }

  const definition = DATAFORSEO_FAMILIES[internalFamily]

  if (!path.startsWith(definition.prefix)) {
    return {
      status: 'catalog_only',
      internalFamily,
      reason: `El endpoint no coincide con el prefijo canónico ${definition.prefix}.`,
      enablement: 'Corregir el catálogo o ampliar explícitamente el contrato de la familia.'
    }
  }

  return { status: 'executable', internalFamily, reason: null, enablement: null }
}

export const findDataForSeoEndpoint = (selector: string): DataForSeoCatalogEndpoint | null => {
  const normalized = selector.trim().toLowerCase()

  return (
    DATAFORSEO_CATALOG.endpoints.find(endpoint => endpoint.id.toLowerCase() === normalized) ??
    DATAFORSEO_CATALOG.endpoints.find(endpoint => endpoint.path.toLowerCase() === normalized) ??
    null
  )
}

export const searchDataForSeoCatalog = (query: string): DataForSeoCatalogEndpoint[] => {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)

  if (terms.length === 0) return DATAFORSEO_CATALOG.endpoints

  return DATAFORSEO_CATALOG.endpoints.filter(endpoint => {
    const haystack = [endpoint.id, endpoint.path, endpoint.family, endpoint.title, endpoint.description]
      .join(' ')
      .toLowerCase()

    return terms.every(term => haystack.includes(term))
  })
}
