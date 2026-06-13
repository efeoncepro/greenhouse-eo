export type GreenhouseNexaBrandKind = 'askNexaBadge' | 'badgeIcon' | 'inlineMark' | 'inlineMarkOnDark' | 'monoMark'
export type GreenhouseNexaBrandSize = 'small' | 'medium'

export type GreenhouseNexaBrandKindConfig = {
  asset: string
  label?: string
  ariaLabel: string
  chrome: 'navyPill' | 'iconBadge' | 'inline'
}

export const GREENHOUSE_NEXA_BRAND_ASSETS = {
  mark: '/images/nexa-mark/nexa-mark.svg',
  // On-dark: misma geometría, spark en blanco (arco teal) para contraste sobre superficies oscuras (CTAs navy).
  markOnDark: '/images/nexa-mark/nexa-mark-on-dark.svg',
  monoMark: '/images/nexa-mark/nexa-mark-mono.svg',
  badge: '/images/nexa-mark/nexa-badge.svg'
} as const

export const GREENHOUSE_NEXA_BRAND_COLORS = {
  electricTeal: '#00D4AA',
  coreBlue: '#0375DB',
  midnightNavy: '#022A4E'
} as const

export const GREENHOUSE_NEXA_BRAND_KIND_CONFIG: Record<GreenhouseNexaBrandKind, GreenhouseNexaBrandKindConfig> = {
  askNexaBadge: {
    asset: GREENHOUSE_NEXA_BRAND_ASSETS.badge,
    label: 'Pregúntale a Nexa',
    ariaLabel: 'Pregúntale a Nexa',
    chrome: 'navyPill'
  },
  badgeIcon: {
    asset: GREENHOUSE_NEXA_BRAND_ASSETS.badge,
    ariaLabel: 'Nexa',
    chrome: 'iconBadge'
  },
  inlineMark: {
    asset: GREENHOUSE_NEXA_BRAND_ASSETS.mark,
    ariaLabel: 'Nexa',
    chrome: 'inline'
  },
  // Glyph inline para superficies OSCURAS (arco teal + spark blanco). Para CTAs navy / shiny / sobre dark.
  inlineMarkOnDark: {
    asset: GREENHOUSE_NEXA_BRAND_ASSETS.markOnDark,
    ariaLabel: 'Nexa',
    chrome: 'inline'
  },
  monoMark: {
    asset: GREENHOUSE_NEXA_BRAND_ASSETS.monoMark,
    ariaLabel: 'Nexa',
    chrome: 'inline'
  }
}

export const GREENHOUSE_NEXA_BRAND_SIZE_CONFIG = {
  small: {
    minHeight: 30,
    paddingInline: 10,
    paddingBlock: 5,
    gap: 7,
    iconSize: 22,
    iconOnlySize: 32,
    textVariant: 'button' as const,
    borderRadius: 999
  },
  medium: {
    minHeight: 36,
    paddingInline: 12,
    paddingBlock: 6,
    gap: 8,
    iconSize: 24,
    iconOnlySize: 38,
    textVariant: 'button' as const,
    borderRadius: 999
  }
} as const

export const resolveGreenhouseNexaBrandKind = (kind?: GreenhouseNexaBrandKind) =>
  GREENHOUSE_NEXA_BRAND_KIND_CONFIG[kind ?? 'askNexaBadge']
