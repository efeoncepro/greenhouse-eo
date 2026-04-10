export type GhIconToken =
  | 'skill'
  | 'certification'
  | 'verified'
  | 'review'
  | 'expired'
  | 'professional-profile'
  | 'professional-link'
  | 'portfolio'
  | 'linkedin'
  | 'github'
  | 'behance'
  | 'dribbble'
  | 'twitter'
  | 'x'
  | 'threads'

export type GhIconName = GhIconToken | string

export type GhIconDefinition = {
  className: string
  label?: string
}

const GH_ICON_REGISTRY: Record<GhIconToken, GhIconDefinition> = {
  skill: {
    className: 'fi-rr-user-skill-gear',
    label: 'Skill'
  },
  certification: {
    className: 'fi-rr-badge-check',
    label: 'Certificacion'
  },
  verified: {
    className: 'fi-rr-badge-check',
    label: 'Verificado'
  },
  review: {
    className: 'tabler-eye-search',
    label: 'Pendiente de revision'
  },
  expired: {
    className: 'tabler-clock-x',
    label: 'Expirado'
  },
  'professional-profile': {
    className: 'fi-rr-address-card',
    label: 'Perfil profesional'
  },
  'professional-link': {
    className: 'tabler-link',
    label: 'Enlace profesional'
  },
  portfolio: {
    className: 'fi-rr-briefcase',
    label: 'Portafolio'
  },
  linkedin: {
    className: 'fi-brands-linkedin',
    label: 'LinkedIn'
  },
  github: {
    className: 'fi-brands-github',
    label: 'GitHub'
  },
  behance: {
    className: 'fi-brands-behance',
    label: 'Behance'
  },
  dribbble: {
    className: 'fi-brands-dribbble',
    label: 'Dribbble'
  },
  twitter: {
    className: 'fi-brands-twitter-alt',
    label: 'Twitter'
  },
  x: {
    className: 'tabler-brand-x',
    label: 'X'
  },
  threads: {
    className: 'tabler-brand-threads',
    label: 'Threads'
  }
}

export const isGhIconToken = (icon: string): icon is GhIconToken => icon in GH_ICON_REGISTRY

export const resolveGhIcon = (icon: GhIconName): GhIconDefinition =>
  isGhIconToken(icon)
    ? GH_ICON_REGISTRY[icon]
    : {
        className: icon
      }

