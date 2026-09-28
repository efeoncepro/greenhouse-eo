/** TASK-1863. Shared geography, independent of AEO/SEO commercial eligibility. Pure. */
export const GROWTH_LANGUAGE_IDS = ['es', 'en', 'pt-BR', 'fr'] as const
export type GrowthLanguage = (typeof GROWTH_LANGUAGE_IDS)[number]

const market = (
  code: string,
  locationCode: number | null,
  defaultLocale: string,
  labels: Record<Exclude<GrowthLanguage, 'fr'>, string> & { fr?: string },
  aliases: string[] = []
) => ({ code, locationCode, defaultLocale, labels: { ...labels, fr: labels.fr ?? labels.en }, aliases })

export const GROWTH_MARKET_REGISTRY = {
  BO: market('BO', 2068, 'es-BO', { es: 'Bolivia', en: 'Bolivia', 'pt-BR': 'Bolívia', fr: 'Bolivie' }),
  CR: market('CR', 2188, 'es-CR', { es: 'Costa Rica', en: 'Costa Rica', 'pt-BR': 'Costa Rica', fr: 'Costa Rica' }),
  CU: market('CU', null, 'es-CU', { es: 'Cuba', en: 'Cuba', 'pt-BR': 'Cuba', fr: 'Cuba' }),
  DO: market('DO', 2214, 'es-DO', {
    es: 'República Dominicana',
    en: 'Dominican Republic',
    'pt-BR': 'República Dominicana',
    fr: 'République dominicaine'
  }),
  EC: market('EC', 2218, 'es-EC', { es: 'Ecuador', en: 'Ecuador', 'pt-BR': 'Equador', fr: 'Équateur' }),
  SV: market('SV', 2222, 'es-SV', { es: 'El Salvador', en: 'El Salvador', 'pt-BR': 'El Salvador', fr: 'El Salvador' }),
  GT: market('GT', 2320, 'es-GT', { es: 'Guatemala', en: 'Guatemala', 'pt-BR': 'Guatemala', fr: 'Guatemala' }),
  HT: market('HT', 2332, 'fr-HT', { es: 'Haití', en: 'Haiti', 'pt-BR': 'Haiti', fr: 'Haïti' }),
  HN: market('HN', 2340, 'es-HN', { es: 'Honduras', en: 'Honduras', 'pt-BR': 'Honduras', fr: 'Honduras' }),
  NI: market('NI', 2558, 'es-NI', { es: 'Nicaragua', en: 'Nicaragua', 'pt-BR': 'Nicarágua', fr: 'Nicaragua' }),
  PA: market('PA', 2591, 'es-PA', { es: 'Panamá', en: 'Panama', 'pt-BR': 'Panamá', fr: 'Panama' }),
  PY: market('PY', 2600, 'es-PY', { es: 'Paraguay', en: 'Paraguay', 'pt-BR': 'Paraguai', fr: 'Paraguay' }),
  VE: market('VE', 2862, 'es-VE', { es: 'Venezuela', en: 'Venezuela', 'pt-BR': 'Venezuela', fr: 'Venezuela' }),
  PR: market('PR', 2630, 'es-PR', { es: 'Puerto Rico', en: 'Puerto Rico', 'pt-BR': 'Porto Rico', fr: 'Porto Rico' }),
  CL: market('CL', 2152, 'es-CL', { es: 'Chile', en: 'Chile', 'pt-BR': 'Chile', fr: 'Chili' }),
  PE: market('PE', 2604, 'es-PE', { es: 'Perú', en: 'Peru', 'pt-BR': 'Peru', fr: 'Pérou' }),
  AR: market('AR', 2032, 'es-AR', { es: 'Argentina', en: 'Argentina', 'pt-BR': 'Argentina', fr: 'Argentine' }),
  BR: market('BR', 2076, 'pt-BR', { es: 'Brasil', en: 'Brazil', 'pt-BR': 'Brasil', fr: 'Brésil' }),
  UY: market('UY', 2858, 'es-UY', { es: 'Uruguay', en: 'Uruguay', 'pt-BR': 'Uruguai' }),
  CO: market('CO', 2170, 'es-CO', { es: 'Colombia', en: 'Colombia', 'pt-BR': 'Colômbia', fr: 'Colombie' }),
  MX: market('MX', 2484, 'es-MX', { es: 'México', en: 'Mexico', 'pt-BR': 'México', fr: 'Mexique' }),
  ES: market('ES', 2724, 'es-ES', { es: 'España', en: 'Spain', 'pt-BR': 'Espanha', fr: 'Espagne' }),
  US: market(
    'US',
    2840,
    'en-US',
    { es: 'Estados Unidos', en: 'United States', 'pt-BR': 'Estados Unidos', fr: 'États-Unis' },
    ['USA', 'United States of America', 'EEUU', 'EE. UU.']
  )
} as const

export type GrowthMarketCode = keyof typeof GROWTH_MARKET_REGISTRY
export type GrowthMarketErrorCode = 'aeo_market_unknown' | 'aeo_locale_unsupported'

export class GrowthMarketError extends Error {
  readonly statusCode: number
  constructor(readonly code: GrowthMarketErrorCode) {
    super(code)
    this.name = 'GrowthMarketError'
    this.statusCode = code === 'aeo_market_unknown' ? 400 : 409
  }
}

const key = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase()

/** Explicit unknown values never select another country. Form defaults are a separate contract. */
export const resolveGrowthMarket = (value: string | number, locale?: string | null) => {
  const entry = Object.values(GROWTH_MARKET_REGISTRY).find(entry =>
    typeof value === 'number'
      ? entry.locationCode === value
      : [entry.code, ...Object.values(entry.labels), ...entry.aliases].some(alias => key(alias) === key(value))
  )

  if (!entry) throw new GrowthMarketError('aeo_market_unknown')

  let canonical: string

  try {
    canonical = Intl.getCanonicalLocales(locale?.trim() || entry.defaultLocale)[0]
  } catch {
    throw new GrowthMarketError('aeo_locale_unsupported')
  }

  const parsed = new Intl.Locale(canonical)

  // pt-PT is a different language variety. Do not silently replace it with pt-BR.
  const language: GrowthLanguage | null =
    parsed.language === 'es'
      ? 'es'
      : parsed.language === 'en'
        ? 'en'
        : parsed.language === 'fr'
          ? 'fr'
          : parsed.language === 'pt' && (!parsed.region || parsed.region === 'BR')
            ? 'pt-BR'
            : null

  if (!language || parsed.script || parsed.toString() !== parsed.baseName) {
    throw new GrowthMarketError('aeo_locale_unsupported')
  }

  if (!parsed.region) canonical = language === 'pt-BR' ? 'pt-BR' : `${language}-${entry.code}`

  return {
    code: entry.code as GrowthMarketCode,
    locale: canonical,
    language,
    label: entry.labels[language],
    locationCode: entry.locationCode,
    googleAiModeLanguageCode: language
  }
}

export type ResolvedGrowthMarket = ReturnType<typeof resolveGrowthMarket>

/** Public legacy form only: explicit, auditable default; never use for configured markets. */
export const resolveGrowthFormMarket = (value?: string | null) => {
  try {
    return { ...resolveGrowthMarket(value ?? ''), source: 'form_selected' as const }
  } catch {
    return { ...resolveGrowthMarket('CL'), source: 'form_default' as const }
  }
}
