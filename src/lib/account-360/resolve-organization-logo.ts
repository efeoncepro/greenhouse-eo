import 'server-only'

import { buildPrivateAssetDownloadUrl } from '@/lib/storage/greenhouse-assets'

/**
 * Resolver CANÓNICO del logo de una organización (espejo de `resolveAvatarUrl` para usuarios,
 * TASK-1276 polish). Fuente única de la traducción `logo_asset_id → URL servible`:
 * el logo vive como private asset y se sirve SIEMPRE por `/api/assets/private/[id]?inline=1`.
 *
 * **NUNCA** componer esa URL inline en un reader/consumer — era exactamente la duplicación que
 * existía en organization-store / identity facet / brand-assets / party-search / grader store
 * (todas reemplazadas por este helper). Server-only: resolver en el server/reader y pasar la URL
 * ya resuelta al cliente como prop/campo del VM.
 */
export const resolveOrganizationLogoUrl = (logoAssetId: string | null | undefined): string | null =>
  logoAssetId ? `${buildPrivateAssetDownloadUrl(logoAssetId)}?inline=1` : null
