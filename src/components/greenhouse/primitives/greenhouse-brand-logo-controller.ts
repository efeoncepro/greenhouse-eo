export type GreenhouseBrandLogoVariant = 'isotype' | 'contained' | 'lockup'

export type GreenhouseBrandLogoFamily =
  | 'gemini'
  | 'adobe'
  | 'express'
  | 'firefly'
  | 'photoshop'
  | 'premiere'
  | 'illustrator'
  | 'afterEffects'
  | 'envato'
  | 'shutterstock'

export type GreenhouseBrandLogoKind =
  | 'geminiIsotype'
  | 'geminiOnBlue'
  | 'geminiOnNeutral'
  | 'geminiLogotype'
  | 'adobeIsotype'
  | 'adobeOnRed'
  | 'adobeOnNeutral'
  | 'adobeOnPink'
  | 'adobeLogotype'
  | 'expressIsotype'
  | 'expressOnBlack'
  | 'expressFullColorOnBlack'
  | 'expressOnNeutral'
  | 'expressLogotype'
  | 'fireflyIsotype'
  | 'fireflyOnRed'
  | 'fireflyOnNeutral'
  | 'fireflyOnPink'
  | 'fireflyLogotype'
  | 'photoshopIsotype'
  | 'photoshopOnDarkBlue'
  | 'photoshopOnNeutral'
  | 'photoshopOnLightBlue'
  | 'photoshopLogotype'
  | 'premiereIsotype'
  | 'premiereOnLightPurple'
  | 'premiereOnDarkPurple'
  | 'premiereOnNeutral'
  | 'premiereLogotype'
  | 'illustratorIsotype'
  | 'illustratorOnBrown'
  | 'illustratorOnNeutral'
  | 'illustratorOnYellow'
  | 'illustratorLogotype'
  | 'afterEffectsIsotype'
  | 'afterEffectsOnDarkPurple'
  | 'afterEffectsOnNeutral'
  | 'afterEffectsOnLightPurple'
  | 'afterEffectsLogotype'
  | 'envatoIsotype'
  | 'envatoOnGreen'
  | 'envatoOnNeutral'
  | 'envatoOnLightGreen'
  | 'envatoLogotype'
  | 'shutterstockIsotype'
  | 'shutterstockOnRed'
  | 'shutterstockOnNeutral'
  | 'shutterstockOnPink'
  | 'shutterstockLogotype'

export type GreenhouseBrandLogoSize = 'small' | 'medium' | 'large'

export interface GreenhouseBrandLogoKindConfig {
  family: GreenhouseBrandLogoFamily
  variant: GreenhouseBrandLogoVariant
  ariaLabel: string
  assetSrc: string
  assetAspectRatio?: number
  tone:
    | 'geminiBlue'
    | 'geminiFullColor'
    | 'geminiOnBlue'
    | 'geminiOnNeutral'
    | 'adobeRed'
    | 'adobeOnRed'
    | 'adobeOnNeutral'
    | 'adobeOnPink'
    | 'expressSpectrum'
    | 'expressOnBlack'
    | 'expressFullColorOnBlack'
    | 'expressOnNeutral'
    | 'fireflyRed'
    | 'fireflyOnRed'
    | 'fireflyOnNeutral'
    | 'fireflyOnPink'
    | 'photoshopBlue'
    | 'photoshopOnDarkBlue'
    | 'photoshopOnNeutral'
    | 'photoshopOnLightBlue'
    | 'premierePurple'
    | 'premiereOnLightPurple'
    | 'premiereOnDarkPurple'
    | 'premiereOnNeutral'
    | 'illustratorOrange'
    | 'illustratorOnBrown'
    | 'illustratorOnNeutral'
    | 'illustratorOnYellow'
    | 'afterEffectsPurple'
    | 'afterEffectsOnDarkPurple'
    | 'afterEffectsOnNeutral'
    | 'afterEffectsOnLightPurple'
    | 'envatoGreen'
    | 'envatoOnGreen'
    | 'envatoOnNeutral'
    | 'envatoOnLightGreen'
    | 'shutterstockRed'
    | 'shutterstockOnRed'
    | 'shutterstockOnNeutral'
    | 'shutterstockOnPink'
}

const AXIS_BRAND_LOGO_ASSET_BASE = '/images/logos/axis'
const AXIS_BRAND_LOGO_ASSET_VERSION = '20260619-svg-fit-12'

const createAxisBrandLogoAssetSrc = (fileName: string) =>
  `${AXIS_BRAND_LOGO_ASSET_BASE}/${fileName}?v=${AXIS_BRAND_LOGO_ASSET_VERSION}`

export const GREENHOUSE_BRAND_LOGO_ASSET_COLORS = {
  // Third-party logo asset colors from the AXIS Figma specimen. These are not semantic UI tokens.
  geminiBlue: 'rgb(66 133 244)',
  geminiRed: 'rgb(234 67 53)',
  geminiYellow: 'rgb(251 188 4)',
  geminiGreen: 'rgb(52 168 83)',
  adobeRed: 'rgb(226 6 19)',
  adobePinkSurface: 'rgb(255 232 230)',
  expressNavy: 'rgb(0 11 29)',
  expressNeutralSurface: 'rgb(243 243 244)',
  fireflyRed: 'rgb(250 24 12)',
  fireflyRedDeep: 'rgb(210 26 24)',
  fireflyCoral: 'rgb(255 116 106)',
  fireflyPinkSurface: 'rgb(255 226 226)',
  photoshopBlue: 'rgb(49 168 255)',
  photoshopDarkBlue: 'rgb(0 30 54)',
  photoshopLightBlueSurface: 'rgb(214 241 255)',
  premierePurple: 'rgb(153 153 255)',
  premiereDarkPurple: 'rgb(0 0 91)',
  premiereLightPurpleSurface: 'rgb(214 214 255)',
  illustratorOrange: 'rgb(255 154 0)',
  illustratorBrown: 'rgb(51 0 0)',
  illustratorYellowSurface: 'rgb(255 241 204)',
  afterEffectsPurple: 'rgb(153 153 255)',
  afterEffectsDarkPurple: 'rgb(0 0 51)',
  afterEffectsLightPurpleSurface: 'rgb(230 230 255)',
  envatoGreen: 'rgb(135 230 75)',
  envatoLogotypeGreen: 'rgb(138 229 72)',
  envatoBlack: 'rgb(25 25 25)',
  envatoNeutralSurface: 'rgb(243 243 244)',
  envatoLightGreenSurface: 'rgb(221 245 228)',
  shutterstockRed: 'rgb(255 26 3)',
  shutterstockLogotypeRed: 'rgb(255 41 23)',
  shutterstockNeutralSurface: 'rgb(243 243 244)',
  shutterstockPinkSurface: 'rgb(255 232 230)'
} as const

export const GREENHOUSE_BRAND_LOGO_KIND_CONFIG = {
  geminiIsotype: {
    family: 'gemini',
    variant: 'isotype',
    ariaLabel: 'Gemini',
    assetSrc: createAxisBrandLogoAssetSrc('gemini-isotype.svg'),
    tone: 'geminiFullColor'
  },
  geminiOnBlue: {
    family: 'gemini',
    variant: 'contained',
    ariaLabel: 'Gemini',
    assetSrc: createAxisBrandLogoAssetSrc('gemini-on-blue.svg'),
    tone: 'geminiOnBlue'
  },
  geminiOnNeutral: {
    family: 'gemini',
    variant: 'contained',
    ariaLabel: 'Gemini',
    assetSrc: createAxisBrandLogoAssetSrc('gemini-on-neutral.svg'),
    tone: 'geminiOnNeutral'
  },
  geminiLogotype: {
    family: 'gemini',
    variant: 'lockup',
    ariaLabel: 'Gemini',
    assetSrc: createAxisBrandLogoAssetSrc('gemini-logotype.svg'),
    assetAspectRatio: 301 / 63.016353607177734,
    tone: 'geminiFullColor'
  },
  adobeIsotype: {
    family: 'adobe',
    variant: 'isotype',
    ariaLabel: 'Adobe',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-isotype.svg'),
    assetAspectRatio: 50 / 42.9,
    tone: 'adobeRed'
  },
  adobeOnRed: {
    family: 'adobe',
    variant: 'contained',
    ariaLabel: 'Adobe',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-on-red.svg'),
    tone: 'adobeOnRed'
  },
  adobeOnNeutral: {
    family: 'adobe',
    variant: 'contained',
    ariaLabel: 'Adobe',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-on-neutral.svg'),
    tone: 'adobeOnNeutral'
  },
  adobeOnPink: {
    family: 'adobe',
    variant: 'contained',
    ariaLabel: 'Adobe',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-on-pink.svg'),
    tone: 'adobeOnPink'
  },
  adobeLogotype: {
    family: 'adobe',
    variant: 'lockup',
    ariaLabel: 'Adobe',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-logotype.svg'),
    assetAspectRatio: 207 / 46.1848,
    tone: 'adobeOnRed'
  },
  expressIsotype: {
    family: 'express',
    variant: 'isotype',
    ariaLabel: 'Adobe Express',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-express-isotype.svg'),
    assetAspectRatio: 50 / 46.75,
    tone: 'expressSpectrum'
  },
  expressOnBlack: {
    family: 'express',
    variant: 'contained',
    ariaLabel: 'Adobe Express',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-express-on-black.svg'),
    tone: 'expressOnBlack'
  },
  expressFullColorOnBlack: {
    family: 'express',
    variant: 'contained',
    ariaLabel: 'Adobe Express',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-express-full-color-on-black.svg'),
    tone: 'expressFullColorOnBlack'
  },
  expressOnNeutral: {
    family: 'express',
    variant: 'contained',
    ariaLabel: 'Adobe Express',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-express-on-neutral.svg'),
    tone: 'expressOnNeutral'
  },
  expressLogotype: {
    family: 'express',
    variant: 'lockup',
    ariaLabel: 'Adobe Express',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-express-logotype.svg'),
    assetAspectRatio: 265 / 50,
    tone: 'expressOnBlack'
  },
  fireflyIsotype: {
    family: 'firefly',
    variant: 'isotype',
    ariaLabel: 'Adobe Firefly',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-firefly-isotype.svg'),
    assetAspectRatio: 50 / 47,
    tone: 'fireflyRed'
  },
  fireflyOnRed: {
    family: 'firefly',
    variant: 'contained',
    ariaLabel: 'Adobe Firefly',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-firefly-on-red.svg'),
    tone: 'fireflyOnRed'
  },
  fireflyOnNeutral: {
    family: 'firefly',
    variant: 'contained',
    ariaLabel: 'Adobe Firefly',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-firefly-on-neutral.svg'),
    tone: 'fireflyOnNeutral'
  },
  fireflyOnPink: {
    family: 'firefly',
    variant: 'contained',
    ariaLabel: 'Adobe Firefly',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-firefly-on-pink.svg'),
    tone: 'fireflyOnPink'
  },
  fireflyLogotype: {
    family: 'firefly',
    variant: 'lockup',
    ariaLabel: 'Adobe Firefly',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-firefly-logotype.png'),
    assetAspectRatio: 252 / 50,
    tone: 'fireflyOnRed'
  },
  photoshopIsotype: {
    family: 'photoshop',
    variant: 'isotype',
    ariaLabel: 'Adobe Photoshop',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-photoshop-isotype.svg'),
    assetAspectRatio: 50 / 47,
    tone: 'photoshopBlue'
  },
  photoshopOnDarkBlue: {
    family: 'photoshop',
    variant: 'contained',
    ariaLabel: 'Adobe Photoshop',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-photoshop-on-dark-blue.svg'),
    tone: 'photoshopOnDarkBlue'
  },
  photoshopOnNeutral: {
    family: 'photoshop',
    variant: 'contained',
    ariaLabel: 'Adobe Photoshop',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-photoshop-on-neutral.svg'),
    tone: 'photoshopOnNeutral'
  },
  photoshopOnLightBlue: {
    family: 'photoshop',
    variant: 'contained',
    ariaLabel: 'Adobe Photoshop',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-photoshop-on-light-blue.svg'),
    tone: 'photoshopOnLightBlue'
  },
  photoshopLogotype: {
    family: 'photoshop',
    variant: 'lockup',
    ariaLabel: 'Adobe Photoshop',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-photoshop-logotype.png'),
    assetAspectRatio: 260 / 46,
    tone: 'photoshopOnDarkBlue'
  },
  premiereIsotype: {
    family: 'premiere',
    variant: 'isotype',
    ariaLabel: 'Adobe Premiere Pro',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-premiere-isotype.svg'),
    assetAspectRatio: 50 / 46.75,
    tone: 'premierePurple'
  },
  premiereOnLightPurple: {
    family: 'premiere',
    variant: 'contained',
    ariaLabel: 'Adobe Premiere Pro',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-premiere-on-light-purple.svg'),
    tone: 'premiereOnLightPurple'
  },
  premiereOnDarkPurple: {
    family: 'premiere',
    variant: 'contained',
    ariaLabel: 'Adobe Premiere Pro',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-premiere-on-dark-purple.svg'),
    tone: 'premiereOnDarkPurple'
  },
  premiereOnNeutral: {
    family: 'premiere',
    variant: 'contained',
    ariaLabel: 'Adobe Premiere Pro',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-premiere-on-neutral.svg'),
    tone: 'premiereOnNeutral'
  },
  premiereLogotype: {
    family: 'premiere',
    variant: 'lockup',
    ariaLabel: 'Adobe Premiere Pro',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-premiere-logotype.svg'),
    assetAspectRatio: 246 / 46.000003814697266,
    tone: 'premiereOnDarkPurple'
  },
  illustratorIsotype: {
    family: 'illustrator',
    variant: 'isotype',
    ariaLabel: 'Adobe Illustrator',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-illustrator-isotype.svg'),
    assetAspectRatio: 50 / 47,
    tone: 'illustratorOrange'
  },
  illustratorOnBrown: {
    family: 'illustrator',
    variant: 'contained',
    ariaLabel: 'Adobe Illustrator',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-illustrator-on-brown.svg'),
    tone: 'illustratorOnBrown'
  },
  illustratorOnNeutral: {
    family: 'illustrator',
    variant: 'contained',
    ariaLabel: 'Adobe Illustrator',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-illustrator-on-neutral.svg'),
    tone: 'illustratorOnNeutral'
  },
  illustratorOnYellow: {
    family: 'illustrator',
    variant: 'contained',
    ariaLabel: 'Adobe Illustrator',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-illustrator-on-yellow.svg'),
    tone: 'illustratorOnYellow'
  },
  illustratorLogotype: {
    family: 'illustrator',
    variant: 'lockup',
    ariaLabel: 'Adobe Illustrator',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-illustrator-logotype.png'),
    assetAspectRatio: 248 / 46,
    tone: 'illustratorOnBrown'
  },
  afterEffectsIsotype: {
    family: 'afterEffects',
    variant: 'isotype',
    ariaLabel: 'Adobe After Effects',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-after-effects-isotype.svg'),
    assetAspectRatio: 50 / 46.75,
    tone: 'afterEffectsPurple'
  },
  afterEffectsOnDarkPurple: {
    family: 'afterEffects',
    variant: 'contained',
    ariaLabel: 'Adobe After Effects',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-after-effects-on-dark-purple.svg'),
    tone: 'afterEffectsOnDarkPurple'
  },
  afterEffectsOnNeutral: {
    family: 'afterEffects',
    variant: 'contained',
    ariaLabel: 'Adobe After Effects',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-after-effects-on-neutral.svg'),
    tone: 'afterEffectsOnNeutral'
  },
  afterEffectsOnLightPurple: {
    family: 'afterEffects',
    variant: 'contained',
    ariaLabel: 'Adobe After Effects',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-after-effects-on-light-purple.svg'),
    tone: 'afterEffectsOnLightPurple'
  },
  afterEffectsLogotype: {
    family: 'afterEffects',
    variant: 'lockup',
    ariaLabel: 'Adobe After Effects',
    assetSrc: createAxisBrandLogoAssetSrc('adobe-after-effects-logotype.png'),
    assetAspectRatio: 283 / 46,
    tone: 'afterEffectsOnDarkPurple'
  },
  envatoIsotype: {
    family: 'envato',
    variant: 'isotype',
    ariaLabel: 'Envato',
    assetSrc: createAxisBrandLogoAssetSrc('envato-isotype.svg'),
    assetAspectRatio: 50 / 46.75,
    tone: 'envatoGreen'
  },
  envatoOnGreen: {
    family: 'envato',
    variant: 'contained',
    ariaLabel: 'Envato',
    assetSrc: createAxisBrandLogoAssetSrc('envato-on-green.svg'),
    tone: 'envatoOnGreen'
  },
  envatoOnNeutral: {
    family: 'envato',
    variant: 'contained',
    ariaLabel: 'Envato',
    assetSrc: createAxisBrandLogoAssetSrc('envato-on-neutral.svg'),
    tone: 'envatoOnNeutral'
  },
  envatoOnLightGreen: {
    family: 'envato',
    variant: 'contained',
    ariaLabel: 'Envato',
    assetSrc: createAxisBrandLogoAssetSrc('envato-on-light-green.svg'),
    tone: 'envatoOnLightGreen'
  },
  envatoLogotype: {
    family: 'envato',
    variant: 'lockup',
    ariaLabel: 'Envato',
    assetSrc: createAxisBrandLogoAssetSrc('envato-logotype.svg'),
    assetAspectRatio: 170.98574829101562 / 50,
    tone: 'envatoGreen'
  },
  shutterstockIsotype: {
    family: 'shutterstock',
    variant: 'isotype',
    ariaLabel: 'Shutterstock',
    assetSrc: createAxisBrandLogoAssetSrc('shutterstock-isotype.svg'),
    assetAspectRatio: 50 / 46.75,
    tone: 'shutterstockRed'
  },
  shutterstockOnRed: {
    family: 'shutterstock',
    variant: 'contained',
    ariaLabel: 'Shutterstock',
    assetSrc: createAxisBrandLogoAssetSrc('shutterstock-on-red.svg'),
    tone: 'shutterstockOnRed'
  },
  shutterstockOnNeutral: {
    family: 'shutterstock',
    variant: 'contained',
    ariaLabel: 'Shutterstock',
    assetSrc: createAxisBrandLogoAssetSrc('shutterstock-on-neutral.svg'),
    tone: 'shutterstockOnNeutral'
  },
  shutterstockOnPink: {
    family: 'shutterstock',
    variant: 'contained',
    ariaLabel: 'Shutterstock',
    assetSrc: createAxisBrandLogoAssetSrc('shutterstock-on-pink.svg'),
    tone: 'shutterstockOnPink'
  },
  shutterstockLogotype: {
    family: 'shutterstock',
    variant: 'lockup',
    ariaLabel: 'Shutterstock',
    assetSrc: createAxisBrandLogoAssetSrc('shutterstock-logotype.svg'),
    assetAspectRatio: 270 / 38,
    tone: 'shutterstockRed'
  }
} as const satisfies Record<GreenhouseBrandLogoKind, GreenhouseBrandLogoKindConfig>

export const GREENHOUSE_BRAND_LOGO_SIZE_CONFIG = {
  small: {
    mark: 28,
    badge: 36,
    lockupMark: 30,
    lockupGap: 10,
    lockupLabelFontSize: 22
  },
  medium: {
    mark: 48,
    badge: 50,
    lockupMark: 38,
    lockupGap: 12,
    lockupLabelFontSize: 30
  },
  large: {
    mark: 72,
    badge: 76,
    lockupMark: 50,
    lockupGap: 14,
    lockupLabelFontSize: 40
  }
} as const satisfies Record<GreenhouseBrandLogoSize, Record<string, number>>

export const resolveGreenhouseBrandLogoKind = (
  kind: GreenhouseBrandLogoKind = 'geminiIsotype'
): GreenhouseBrandLogoKindConfig => GREENHOUSE_BRAND_LOGO_KIND_CONFIG[kind]

export const resolveGreenhouseBrandLogoVariant = ({
  kind = 'geminiIsotype',
  variant
}: {
  kind?: GreenhouseBrandLogoKind
  variant?: GreenhouseBrandLogoVariant
}) => variant ?? resolveGreenhouseBrandLogoKind(kind).variant
