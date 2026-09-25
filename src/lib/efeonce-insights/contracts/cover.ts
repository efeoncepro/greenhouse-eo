/**
 * TASK-1888 — portada de los informes de Insights (browser-safe). Dos preferencias con la misma forma:
 *
 *   - por ORGANIZACIÓN (`insight_cover_preferences`, command `setInsightCoverPreference`);
 *   - por ENCARGO (`InsightRequestV1.brand.coverTheme`), que viaja por los tres carriles igual que el resto del encargo.
 *
 * `resolveInsightCover` es la ÚNICA regla (arquitectura §6): encargo (si ≠ auto) > organización (si ≠ auto) > auto;
 * auto = navy sólo si la organización tiene un logo apto para fondo oscuro, si no blanca. El resultado se sella en el
 * plan de la edición al generarla: re-renderizar da la misma portada y el render nunca la decide con datos vivos.
 */

import type { InsightCoverSource, PlanCoverV1 } from './plan'

export const INSIGHT_COVER_PREFERENCES = ['auto', 'dark', 'light'] as const
export type InsightCoverPreference = (typeof INSIGHT_COVER_PREFERENCES)[number]

export const isInsightCoverPreference = (value: unknown): value is InsightCoverPreference =>
  typeof value === 'string' && (INSIGHT_COVER_PREFERENCES as readonly string[]).includes(value)

/** Lo que lee el portal, las lanes y MCP. `isDefault` = la organización no fijó nada (se lee `auto`). */
export interface InsightCoverPreferenceDto {
  organizationId: string
  coverTheme: InsightCoverPreference
  isDefault: boolean
  updatedAt: string | null
  updatedByActorKind: string | null
}

export interface InsightCoverLogos {
  logoAssetId: string | null
  logoOnDarkAssetId: string | null
}

export interface ResolveInsightCoverInput {
  requested?: InsightCoverPreference | null
  organization: InsightCoverPreference
  logos: InsightCoverLogos | null
}

export const resolveInsightCover = (input: ResolveInsightCoverInput): PlanCoverV1 => {
  const logos = input.logos ?? { logoAssetId: null, logoOnDarkAssetId: null }

  const [theme, source]: ['dark' | 'light', InsightCoverSource] =
    input.requested && input.requested !== 'auto'
      ? [input.requested, 'request']
      : input.organization !== 'auto'
        ? [input.organization, 'organization']
        : [logos.logoOnDarkAssetId ? 'dark' : 'light', 'auto']

  // Una portada navy nunca lleva el logo por defecto (puede ser invisible sobre navy): sólo la variante oscura o nada.
  if (theme === 'dark') {
    return { theme, source, logoAssetId: logos.logoOnDarkAssetId, logoVariant: logos.logoOnDarkAssetId ? 'on_dark' : null }
  }

  return { theme, source, logoAssetId: logos.logoAssetId, logoVariant: logos.logoAssetId ? 'default' : null }
}
