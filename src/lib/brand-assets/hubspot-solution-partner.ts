/**
 * Reusable HubSpot Solutions Partner badge primitive.
 *
 * The artwork lives under `public/branding/partners/` so it can be consumed
 * by documents, PDFs rendered by Chromium and web surfaces without coupling
 * the asset to the Artifact Composer deck catalog.
 */

export const HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS = ['dark', 'light', 'orange'] as const

export type HubSpotSolutionPartnerBadgeVariant = (typeof HUBSPOT_SOLUTION_PARTNER_BADGE_VARIANTS)[number]

export const HUBSPOT_SOLUTION_PARTNER_BADGES: Record<
  HubSpotSolutionPartnerBadgeVariant,
  {
    src: string
    label: string
    recommendedSurface: 'light' | 'accent'
  }
> = {
  dark: {
    src: '/branding/partners/hubspot/solution-partner/badge-dark-spp-hubspot.svg',
    label: 'HubSpot Solutions Partner · dark',
    recommendedSurface: 'light'
  },
  light: {
    src: '/branding/partners/hubspot/solution-partner/badge-light-spp-hubspot.svg',
    label: 'HubSpot Solutions Partner · light',
    recommendedSurface: 'light'
  },
  orange: {
    src: '/branding/partners/hubspot/solution-partner/badge-orange-spp-hubspot.svg',
    label: 'HubSpot Solutions Partner · orange',
    recommendedSurface: 'accent'
  }
}

export const getHubSpotSolutionPartnerBadge = (variant: HubSpotSolutionPartnerBadgeVariant = 'orange') =>
  HUBSPOT_SOLUTION_PARTNER_BADGES[variant]
