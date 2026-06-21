import {
  listServiceCatalog,
  type ServiceCatalogEntry,
  type ServiceCommercialModel,
  type ServiceTier
} from './service-catalog-store'

/**
 * Resolver compartido nombre → serviceSku (TASK-1211).
 *
 * El cálculo de precio desde un `serviceSku` ya existe (from-service / recipe),
 * pero nada mapeaba texto libre ("servicio de diseño digital") a un SKU. Este es
 * el primitive canónico de discovery consumido por Nexa, MCP y la búsqueda de la
 * UI — un primitive, muchos consumers. Sin él, el simulate tool está a medias:
 * no se puede simular lo que no se puede encontrar.
 *
 * Formaliza el `lookupServices` in-memory que vivía suelto en el route handler
 * (`pricing/lookup`), reusando `listServiceCatalog` como SSOT del catálogo. El
 * catálogo de servicios es chico (decenas), así que filtrar + rankear en memoria
 * es correcto y evita duplicar el SQL del join/receta.
 *
 * Devuelve candidatos rankeados por relevancia para habilitar la elicitación del
 * agente ante ambigüedad ("¿te refieres a Diseño Digital Básico o Campaña Full?").
 */

export interface ServiceCatalogSearchResult {
  serviceSku: string
  /** displayName ?? moduleName — el nombre humano del servicio. */
  name: string
  serviceCategory: string | null
  tier: ServiceTier
  commercialModel: ServiceCommercialModel
  /** true si el servicio tiene receta (roles/tools) → priceable end-to-end. */
  priceable: boolean
}

export interface SearchServiceCatalogOptions {
  limit?: number
  /** Por defecto false: sólo servicios con receta (priceables). */
  includeUnpriceable?: boolean
}

const normalize = (value: string): string => value.trim().toLowerCase()

const scoreMatch = (query: string, haystacks: string[]): number => {
  let best = 0

  for (const raw of haystacks) {
    const hay = normalize(raw)

    if (!hay) continue

    if (hay === query) best = Math.max(best, 100)
    else if (hay.startsWith(query)) best = Math.max(best, 60)
    else if (hay.includes(query)) best = Math.max(best, 30)
  }

  return best
}

export const searchServiceCatalog = async (
  query: string,
  options: SearchServiceCatalogOptions = {}
): Promise<ServiceCatalogSearchResult[]> => {
  const normalizedQuery = normalize(query)

  if (!normalizedQuery) return []

  const limit = options.limit ?? 10
  const entries = await listServiceCatalog({ activeOnly: true })

  const isPriceable = (entry: ServiceCatalogEntry): boolean =>
    entry.roleRecipeCount + entry.toolRecipeCount > 0

  return entries
    .map(entry => {
      const name = entry.displayName ?? entry.moduleName

      const score = scoreMatch(normalizedQuery, [
        entry.serviceSku,
        name,
        entry.moduleName,
        entry.serviceCategory ?? '',
        entry.moduleCode
      ])

      return { entry, name, score }
    })
    .filter(item => item.score > 0)
    .filter(item => options.includeUnpriceable || isPriceable(item.entry))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ entry, name }) => ({
      serviceSku: entry.serviceSku,
      name,
      serviceCategory: entry.serviceCategory,
      tier: entry.tier,
      commercialModel: entry.commercialModel,
      priceable: isPriceable(entry)
    }))
}
