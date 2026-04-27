/**
 * Payment Instruments Provider Catalog — TASK-281
 * Static registry of known payment providers with logos, categories, and metadata.
 * Used by PaymentInstrumentChip, Admin Center, and payment drawers.
 */

export const INSTRUMENT_CATEGORIES = [
  'bank_account', 'credit_card', 'fintech', 'payment_platform', 'cash', 'payroll_processor', 'shareholder_account'
] as const

export type InstrumentCategory = (typeof INSTRUMENT_CATEGORIES)[number]

export const INSTRUMENT_CATEGORY_LABELS: Record<InstrumentCategory, string> = {
  bank_account: 'Cuenta bancaria',
  credit_card: 'Tarjeta de crédito',
  fintech: 'Fintech',
  payment_platform: 'Plataforma de pagos',
  cash: 'Caja / Efectivo',
  payroll_processor: 'Procesador de nómina',
  shareholder_account: 'Cuenta corriente accionista'
}

export const INSTRUMENT_CATEGORY_COLORS: Record<InstrumentCategory, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'secondary'> = {
  bank_account: 'primary',
  credit_card: 'info',
  fintech: 'success',
  payment_platform: 'warning',
  cash: 'secondary',
  payroll_processor: 'error',
  shareholder_account: 'success'
}

export const INSTRUMENT_CATEGORY_ICONS: Record<InstrumentCategory, string> = {
  bank_account: 'tabler-building-bank',
  credit_card: 'tabler-credit-card',
  fintech: 'tabler-wallet',
  payment_platform: 'tabler-cloud-dollar',
  cash: 'tabler-cash',
  payroll_processor: 'tabler-file-invoice',
  shareholder_account: 'tabler-users-group'
}

export interface ProviderDefinition {
  name: string
  category: InstrumentCategory
  logo: string | null
  compactLogo?: string | null
  country?: string
  currencies?: string[]
}

export const PROVIDER_CATALOG: Record<string, ProviderDefinition> = {
  // Chilean banks
  bci: { name: 'BCI', category: 'bank_account', logo: '/images/logos/payment/bci.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  'banco-chile': { name: 'Banco de Chile', category: 'bank_account', logo: '/images/logos/payment/banco-chile.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  'banco-estado': { name: 'BancoEstado', category: 'bank_account', logo: '/images/logos/payment/banco-estado.svg', country: 'CL', currencies: ['CLP'] },
  santander: {
    name: 'Santander',
    category: 'bank_account',
    logo: '/images/logos/payment/Banco_Santander_Logotipo.svg',
    compactLogo: '/images/logos/payment/BSAC.svg',
    country: 'CL',
    currencies: ['CLP', 'USD']
  },
  scotiabank: { name: 'Scotiabank', category: 'bank_account', logo: '/images/logos/payment/scotiabank-full-positive.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  itau: { name: 'Itaú', category: 'bank_account', logo: '/images/logos/payment/itau.svg', country: 'CL', currencies: ['CLP'] },
  bice: { name: 'BICE', category: 'bank_account', logo: '/images/logos/payment/bice.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  security: { name: 'Banco Security', category: 'bank_account', logo: '/images/logos/payment/security.svg', country: 'CL', currencies: ['CLP', 'USD'] },
  falabella: { name: 'Banco Falabella', category: 'bank_account', logo: '/images/logos/payment/falabella-full-positive.svg', country: 'CL', currencies: ['CLP'] },
  ripley: { name: 'Banco Ripley', category: 'bank_account', logo: '/images/logos/payment/ripley-full-positive.svg', country: 'CL', currencies: ['CLP'] },

  // Card networks
  visa: {
    name: 'Visa',
    category: 'credit_card',
    logo: '/images/logos/payment/visa.svg',
    compactLogo: '/images/logos/payment/visa-mark-positive.svg'
  },
  mastercard: {
    name: 'Mastercard',
    category: 'credit_card',
    logo: '/images/logos/payment/Mastercard-logo.svg.png',
    compactLogo: '/images/logos/payment/Mastercard-Logo.wine.svg'
  },
  amex: {
    name: 'American Express',
    category: 'credit_card',
    logo: '/images/logos/payment/amex.svg',
    compactLogo: '/images/logos/payment/amex-mark-positive.svg'
  },

  // Fintechs
  paypal: {
    name: 'PayPal',
    category: 'fintech',
    logo: '/images/logos/payment/paypal.svg',
    compactLogo: '/images/logos/payment/paypal-mark-positive.svg',
    currencies: ['USD', 'CLP']
  },
  wise: {
    name: 'Wise',
    category: 'fintech',
    logo: '/images/logos/payment/wise.svg',
    compactLogo: '/images/logos/payment/wise-mark-positive.svg',
    currencies: ['USD', 'CLP']
  },
  mercadopago: {
    name: 'MercadoPago',
    category: 'fintech',
    logo: '/images/logos/payment/mercadopago.svg',
    compactLogo: '/images/logos/payment/mercadopago-mark-positive.svg',
    currencies: ['CLP']
  },
  global66: {
    name: 'Global66',
    category: 'fintech',
    logo: '/images/logos/payment/global66.svg',
    compactLogo: '/images/logos/payment/global66-mark-positive.svg',
    currencies: ['USD', 'CLP']
  },

  // Payment platforms
  deel: { name: 'Deel', category: 'payment_platform', logo: '/images/logos/payment/deel-full-positive.svg', currencies: ['USD', 'CLP'] },
  stripe: {
    name: 'Stripe',
    category: 'payment_platform',
    logo: '/images/logos/payment/stripe.svg',
    compactLogo: '/images/logos/payment/stripe-mark-positive.svg',
    currencies: ['USD']
  },

  // Payroll processors
  previred: { name: 'Previred', category: 'payroll_processor', logo: '/images/logos/payment/previred-full-positive.svg', country: 'CL', currencies: ['CLP'] },

  // Platform operator — Greenhouse itself operates internal ledgers (CCA today,
  // wallets/loans/factoring tomorrow). TASK-701 promotes this to a first-class
  // provider so the admin UI no longer special-cases shareholder_account.
  greenhouse: {
    name: 'Greenhouse',
    category: 'shareholder_account',
    logo: '/images/greenhouse/SVG/greenhouse-blue.svg',
    // Self-contained favicon (rounded blue square + white isotipo) — works on
    // both light and dark backgrounds without context-dependent variants.
    compactLogo: '/images/greenhouse/SVG/favicon-blue-negative.svg',
    currencies: ['CLP', 'USD']
  }
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
