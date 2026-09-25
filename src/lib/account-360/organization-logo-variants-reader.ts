import 'server-only'

/**
 * TASK-1888 — reader de las variantes del logo de una organización (account-360 es su dueño). Sólo lee: el logo por
 * defecto (`logo_asset_id`) y la variante apta para fondo oscuro (`logo_on_dark_asset_id`); ambas se escriben SÓLO por
 * `attachOrganizationLogoAsset` (`organization-brand-assets.ts`).
 *
 * Vive aparte de `organization-brand-assets.ts` a propósito: lo consume la generación de Efeonce Insights, que también
 * corre en el `ops-worker`, y aquel módulo arrastra storage, outbox y el cliente de assets. Este importa sólo el
 * cliente PostgreSQL canónico.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

export interface OrganizationLogoVariants {
  logoAssetId: string | null
  logoOnDarkAssetId: string | null
}

export const readOrganizationLogoVariants = async (organizationId: string): Promise<OrganizationLogoVariants | null> => {
  const rows = await runGreenhousePostgresQuery<{ logo_asset_id: string | null; logo_on_dark_asset_id: string | null }>(
    `SELECT logo_asset_id, logo_on_dark_asset_id FROM greenhouse_core.organizations WHERE organization_id = $1 LIMIT 1`,
    [organizationId]
  )

  const row = rows[0]

  return row ? { logoAssetId: row.logo_asset_id, logoOnDarkAssetId: row.logo_on_dark_asset_id } : null
}
