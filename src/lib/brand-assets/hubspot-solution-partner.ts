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
    /** Surface this variant reads on: the badge is named after its own plate, so it goes on the opposite surface. */
    recommendedSurface: 'light' | 'dark' | 'light-or-dark'
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
    recommendedSurface: 'dark'
  },
  orange: {
    src: '/branding/partners/hubspot/solution-partner/badge-orange-spp-hubspot.svg',
    label: 'HubSpot Solutions Partner · orange',
    recommendedSurface: 'light-or-dark'
  }
}

export const getHubSpotSolutionPartnerBadge = (variant: HubSpotSolutionPartnerBadgeVariant = 'orange') =>
  HUBSPOT_SOLUTION_PARTNER_BADGES[variant]

export type HubSpotSolutionPartnerBadgeSurface = 'light' | 'dark' | 'accent'

/**
 * The variant that contrasts with the surface it sits on. A cream plate on paper dissolves (operator, 2026-10-31):
 * light surfaces take `dark`, dark surfaces take `light`, and an orange/accent surface never takes `orange`.
 */
export const getHubSpotSolutionPartnerBadgeForSurface = (surface: HubSpotSolutionPartnerBadgeSurface) =>
  HUBSPOT_SOLUTION_PARTNER_BADGES[surface === 'dark' ? 'light' : 'dark']
