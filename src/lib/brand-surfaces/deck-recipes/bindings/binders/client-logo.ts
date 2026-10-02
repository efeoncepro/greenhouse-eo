/**
 * Binder `client-logo` (TASK-1930): el logo del cliente de la `Proposal` desde Account 360
 * (`readOrganizationLogoVariants`, escrito sólo por `attachOrganizationLogoAsset`).
 *
 * Una portada oscura exige la variante para fondo oscuro (`logo_on_dark_asset_id`): sin ella queda `no-on-dark-logo`.
 * El binder nunca recolorea, recorta ni cambia de variante un logo: entrega el asset tal cual y la normalización visual
 * es del compositor. Fuera de una `Proposal` no hay cliente (`no-proposal`): el logo de Efeonce es fijo de la receta.
 */

import { bound, textOf, unbound, type Binder } from './shared'

/** Texto alternativo cuando el plan todavía no trae el nombre del cliente. */
const DEFAULT_ALT = 'Logo del cliente'

export const clientLogoBinder: Binder = input => {
  if (!input.sources.proposal) return unbound('no-proposal')

  const logo = input.sources.clientLogo

  if (!logo || (!logo.logoAssetId && !logo.logoOnDarkAssetId)) return unbound('no-logo')

  const dark = input.recipe.surface === 'dark' || input.recipe.axis?.theme === 'dark'
  const assetId = dark ? logo.logoOnDarkAssetId : logo.logoAssetId

  if (!assetId) return unbound(dark ? 'no-on-dark-logo' : 'no-logo')

  return bound(
    { assetId, alt: textOf(input.slots.clientName) || DEFAULT_ALT, variant: dark ? 'on-dark' : 'default' },
    'account-360',
    [],
    undefined
  )
}
