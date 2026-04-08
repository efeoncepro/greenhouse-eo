/**
 * Payment Instruments Provider Catalog — TASK-281
 * Static registry of known payment providers with logos, categories, and metadata.
 * Used by PaymentInstrumentChip, Admin Center, and payment drawers.
 */

export const INSTRUMENT_CATEGORIES = [
  'bank_account', 'credit_card', 'fintech', 'payment_platform', 'cash', 'payroll_processor'
] as const

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number]

export const INSTRUMENT_CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  bank_account: 'Cuenta bancaria',
  credit_card: 'Tarjeta de crédito',
  fintech: 'Fintech',
  payment_platform: 'Plataforma de pagos',
  cash: 'Caja / Efectivo',
  payroll_processor: 'Procesador de nómina'
}

export const INSTRUMENT_CATEGORY_COLORS: Record<InstrumentCategory, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  bank_account: 'primary',
  credit_card: 'info',
  fintech: 'success',
  payment_platform: 'warning',
  cash: 'secondary',
  payroll_processor: 'error'
}

export const INSTRUMENT_CATEGORY_ICONS: Record<InstrumentCategory, string> = {
  bank_account: 'tabler-building-bank',
  credit_card: 'tabler-credit-card',
  fintech: 'tabler-wallet',
  payment_platform: 'tabler-cloud-dollar',
  cash: 'tabler-cash',
  payroll_processor: 'tabler-file-invoice'
}

export interface ProviderDefinition {
  name: string
  category: InstrumentCategory
  logo: string | null
  country?: string
  currencies?: string[]
}

export const PROVIDER_CATALOG: Record<string, ProviderDefinition> = {
  // Chilean banks
  bci: { name: 'BCI', category: 'bank_account', logo: '/images/logos/payment/bci.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  'banco-chile': { name: 'Banco de Chile', category: 'bank_account', logo: '/images/logos/payment/banco-chile.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  'banco-estado': { name: 'BancoEstado', category: 'bank_account', logo: '/images/logos/payment/banco-estado.svg', country: 'CL', currencies: ['CLP'] },
  santander: { name: 'Santander', category: 'bank_account', logo: '/images/logos/payment/santander.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  scotiabank: { name: 'Scotiabank', category: 'bank_account', logo: '/images/logos/payment/scotiabank.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  itau: { name: 'Itaú', category: 'bank_account', logo: '/images/logos/payment/itau.svg', country: 'CL', currencies: ['CLP'] },
  bice: { name: 'BICE', category: 'bank_account', logo: '/images/logos/payment/bice.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  security: { name: 'Banco Security', category: 'bank_account', logo: '/images/logos/payment/security.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  falabella: { name: 'Banco Falabella', category: 'bank_account', logo: '/images/logos/payment/falabella.svg', country: 'CL', currencies: ['CLP'] },
  ripley: { name: 'Banco Ripley', category: 'bank_account', logo: '/images/logos/payment/ripley.svg', country: 'CL', currencies: ['CLP'] },

  // Card networks
  visa: { name: 'Visa', category: 'credit_card', logo: '/images/logos/payment/visa.svg' },
  mastercard: { name: 'Mastercard', category: 'credit_card', logo: '/images/logos/payment/mastercard.svg' },
  amex: { name: 'American Express', category: 'credit_card', logo: '/images/logos/payment/amex.svg' },

  // Fintechs
  paypal: { name: 'PayPal', category: 'fintech', logo: '/images/logos/payment/paypal.svg', currencies: ['USD', 'CLP'] },
  wise: { name: 'Wise', category: 'fintech', logo: '/images/logos/payment/wise.svg', currencies: ['USD', 'CLP'] },
  mercadopago: { name: 'MercadoPago', category: 'fintech', logo: '/images/logos/payment/mercadopago.svg', currencies: ['CLP'] },
  global66: { name: 'Global66', category: 'fintech', logo: '/images/logos/payment/global66.svg', currencies: ['USD', 'CLP'] },

  // Payment platforms
  deel: { name: 'Deel', category: 'payment_platform', logo: '/images/logos/payment/deel.svg', currencies: ['USD', 'CLP'] },
  stripe: { name: 'Stripe', category: 'payment_platform', logo: '/images/logos/payment/stripe.svg', currencies: ['USD'] },

  // Payroll processors
  previred: { name: 'Previred', category: 'payroll_processor', logo: '/images/logos/payment/previred.svg', country: 'CL', currencies: ['CLP'] }
} as const

export type ProviderSlug = keyof typeof PROVIDER_CATALOG

/** Get provider definition by slug, with null-safe fallback */
export const getProvider = (slug: string | null | undefined): ProviderDefinition | null =>
  slug && slug in PROVIDER_CATALOG ? PROVIDER_CATALOG[slug as ProviderSlug] : null

/** Get providers filtered by category */
export const getProvidersByCategory = (category: InstrumentCategory): Array<{ slug: string } & ProviderDefinition> =>
  Object.entries(PROVIDER_CATALOG)
    .filter(([, def]) => def.category === category)
    .map(([slug, def]) => ({ slug, ...def }))

/** Default-for tag options for instrument routing */
export const DEFAULT_FOR_OPTIONS = [
  { value: 'client_collection', label: 'Cobro a clientes' },
  { value: 'supplier_payment', label: 'Pago a proveedores' },
  { value: 'payroll', label: 'Nómina' },
  { value: 'tax', label: 'Impuestos' },
  { value: 'social_security', label: 'Previsión social' },
  { value: 'general', label: 'Uso general' }
] as const
