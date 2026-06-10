export type EfeonceOrbitalLogoVariant = 'static' | 'orbitalSignature' | 'ambient'
export type EfeonceOrbitalLogoKind = 'institutionalWordmark' | 'motionSpecimen'

export interface EfeonceOrbitalLogoKindConfig {
  variant: EfeonceOrbitalLogoVariant
  ariaLabel: string
}

export const EFEONCE_ORBITAL_LOGO_COLOR = 'rgb(2 60 112)'

export const EFEONCE_ORBITAL_LOGO_KIND_CONFIG = {
  institutionalWordmark: {
    variant: 'orbitalSignature',
    ariaLabel: 'Efeonce'
  },
  motionSpecimen: {
    variant: 'ambient',
    ariaLabel: 'Efeonce orbital signature'
  }
} as const satisfies Record<EfeonceOrbitalLogoKind, EfeonceOrbitalLogoKindConfig>

export const resolveEfeonceOrbitalLogoVariant = ({
  kind = 'institutionalWordmark',
  variant
}: {
  kind?: EfeonceOrbitalLogoKind
  variant?: EfeonceOrbitalLogoVariant
}): EfeonceOrbitalLogoVariant => variant ?? EFEONCE_ORBITAL_LOGO_KIND_CONFIG[kind].variant

export const resolveEfeonceOrbitalLogoAriaLabel = ({
  kind = 'institutionalWordmark',
  ariaLabel
}: {
  kind?: EfeonceOrbitalLogoKind
  ariaLabel?: string
}): string => ariaLabel ?? EFEONCE_ORBITAL_LOGO_KIND_CONFIG[kind].ariaLabel
