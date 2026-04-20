export const PRICING_TIER_CODES = ['1', '2', '3', '4'] as const
export type PricingTierCode = (typeof PRICING_TIER_CODES)[number]

export const PRICING_TIER_LABELS: Record<PricingTierCode, string> = {
  '1': 'Commoditizado',
  '2': 'Especializado',
  '3': 'Estratégico',
  '4': 'IP Propietaria'
}

export const SERVICE_TIER_LABELS: Record<PricingTierCode, string> = {
  '1': 'Básicos o entrada',
  '2': 'Estándar recurrentes',
  '3': 'Consultoría o implementación media',
  '4': 'Estratégicos o premium'
}

export const COMMERCIAL_MODEL_CODES = [
  'on_going',
  'on_demand',
  'hybrid',
  'license_consulting'
] as const
export type CommercialModelCode = (typeof COMMERCIAL_MODEL_CODES)[number]

export const COMMERCIAL_MODEL_LABELS: Record<CommercialModelCode, string> = {
  on_going: 'On-Going',
  on_demand: 'On-Demand',
  hybrid: 'Híbrido',
  license_consulting: 'Licencia / Consultoría'
}

export const COUNTRY_PRICING_FACTOR_CODES = [
  'chile_corporate',
  'chile_pyme',
  'colombia_latam',
  'international_usd',
  'licitacion_publica',
  'cliente_estrategico'
] as const
export type CountryPricingFactorCode = (typeof COUNTRY_PRICING_FACTOR_CODES)[number]

export const COUNTRY_PRICING_FACTOR_LABELS: Record<CountryPricingFactorCode, string> = {
  chile_corporate: 'Chile Corporate',
  chile_pyme: 'Chile PYME',
  colombia_latam: 'Colombia / PYME LATAM',
  international_usd: 'Internacional USD',
  licitacion_publica: 'Licitación Pública',
  cliente_estrategico: 'Cliente Estratégico'
}
