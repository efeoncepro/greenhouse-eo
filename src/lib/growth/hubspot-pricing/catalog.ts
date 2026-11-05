// HubSpot pricebook (TASK-1405) — the source of truth of the HubSpot list price, as code.
//
// Every change of price goes through a pull request with its source: the git log of this file IS the price history.
// Seeded from the reading of the pricing pages inside the Efeonce portal (48713323) on 2026-11-05, recorded in
// docs/services/hubspot-as-a-service/HUBSPOT_PORTAL_PRICING_SNAPSHOT_2026-11-05.md. Never invent a figure here: a
// datum without a source is `not_published`, and a datum not reverified on `asOf` is `secondary`.
//
// Reverify every price at app.hubspot.com/pricing/<portal>/<slug> (and the onboarding fees at the legal catalog),
// then bump `asOf` and `version`. The freshness test fails the build 90 days after `asOf`.
import type { HubSpotHubEntry, HubSpotPricebook, HubSpotTierEntry, PriceFact } from './types'

const AS_OF = '2026-11-05'
const PORTAL = 'https://app.hubspot.com/pricing/48713323'
const LEGAL_CATALOG = 'https://legal.hubspot.com/hubspot-product-and-services-catalog'
const LEGAL_AS_OF = '2026-09-19'

const page = (slug: string) => `${PORTAL}/${slug}`

const primary = <T>(value: T, sourceUrl: string, note?: string): PriceFact<T> => ({
  value,
  evidence: 'primary',
  sourceUrl,
  asOf: AS_OF,
  ...(note ? { note } : {})
})

const secondary = <T>(value: T, sourceUrl: string | null, asOf: string, note: string): PriceFact<T> => ({
  value,
  evidence: 'secondary',
  sourceUrl,
  asOf,
  note
})

const notPublished = <T>(note: string, sourceUrl: string | null = null): PriceFact<T> => ({
  value: null,
  evidence: 'not_published',
  sourceUrl,
  asOf: AS_OF,
  note
})

const ONBOARDING_NOT_SHOWN = 'El portal no muestra el monto de la tarifa de incorporación de este producto.'

const legalOnboarding = (value: number) =>
  secondary(
    value,
    LEGAL_CATALOG,
    LEGAL_AS_OF,
    'Monto del catálogo legal de HubSpot, no reverificado el 05/11/2026: el portal sólo dice que el precio no la incluye.'
  )

/** Sales and Service share their grid (per licence) and their onboarding fees. */
const salesLikeTiers = (slug: string): HubSpotTierEntry[] => [
  {
    tier: 'starter',
    unit: 'per_seat',
    price: secondary(
      20,
      page(slug),
      AS_OF,
      'La página muestra «US$ 20/mes» sin decir si es por licencia; se modela por licencia hasta confirmarlo.'
    ),
    includedCredits: primary(500, page(slug)),
    onboardingFee: notPublished(ONBOARDING_NOT_SHOWN, page(slug))
  },
  {
    tier: 'pro',
    unit: 'per_seat',
    price: primary(
      100,
      page(slug),
      'Precio que el portal muestra a esta cuenta. Fuentes secundarias citan US$ 90 con compromiso anual.'
    ),
    includedCredits: primary(3000, page(slug)),
    onboardingFee: legalOnboarding(1500)
  },
  {
    tier: 'enterprise',
    unit: 'per_seat',
    price: primary(150, page(slug)),
    includedCredits: primary(5000, page(slug)),
    onboardingFee: legalOnboarding(3500)
  }
]

type AccountTier = {
  tier: HubSpotTierEntry['tier']
  price: number
  includedSeats: number | null
  additionalSeatFrom: number
  contacts?: number
  credits: number
}

const accountTiers = (slug: string, tiers: AccountTier[], onboarding?: Partial<Record<string, number>>) =>
  tiers.map(
    (tier): HubSpotTierEntry => ({
      tier: tier.tier,
      unit: 'per_account',
      price: primary(tier.price, page(slug)),
      includedSeats:
        tier.includedSeats === null
          ? notPublished('La página no dice cuántas licencias incluye este plan.', page(slug))
          : primary(tier.includedSeats, page(slug)),
      additionalSeatFrom: primary(tier.additionalSeatFrom, page(slug), 'Licencia principal adicional «a partir de».'),
      ...(tier.contacts !== undefined ? { includedMarketingContacts: primary(tier.contacts, page(slug)) } : {}),
      includedCredits: primary(tier.credits, page(slug)),
      onboardingFee:
        onboarding?.[tier.tier] !== undefined
          ? legalOnboarding(onboarding[tier.tier] as number)
          : notPublished(ONBOARDING_NOT_SHOWN, page(slug))
    })
  )

const perSeatTiers = (slug: string, pro: [number, number], enterprise: [number, number]): HubSpotTierEntry[] => [
  {
    tier: 'starter',
    unit: 'per_seat',
    price: notPublished('La lectura del 05/11/2026 no capturó un precio Starter para este producto.', page(slug)),
    includedCredits: notPublished('Sin lectura de Starter.', page(slug)),
    onboardingFee: notPublished(ONBOARDING_NOT_SHOWN, page(slug))
  },
  {
    tier: 'pro',
    unit: 'per_seat',
    price: primary(pro[0], page(slug)),
    includedCredits: primary(pro[1], page(slug)),
    onboardingFee: notPublished(ONBOARDING_NOT_SHOWN, page(slug))
  },
  {
    tier: 'enterprise',
    unit: 'per_seat',
    price: primary(enterprise[0], page(slug)),
    includedCredits: primary(enterprise[1], page(slug)),
    onboardingFee: notPublished(ONBOARDING_NOT_SHOWN, page(slug))
  }
]

const notOffered = (slug: string): HubSpotTierEntry => ({
  tier: 'starter',
  unit: 'per_account',
  price: notPublished('La página no muestra un plan Starter para este producto.', page(slug)),
  includedCredits: notPublished('Sin plan Starter en la página.', page(slug)),
  onboardingFee: notPublished(ONBOARDING_NOT_SHOWN, page(slug))
})

const hubs: HubSpotHubEntry[] = [
  { hubId: 'sales', label: 'Sales Hub', kind: 'hub', sourceUrl: page('sales'), tiers: salesLikeTiers('sales') },
  {
    hubId: 'service',
    label: 'Service Hub',
    kind: 'hub',
    sourceUrl: page('service'),
    tiers: salesLikeTiers('service')
  },
  {
    hubId: 'smart_crm',
    label: 'Smart CRM de HubSpot',
    kind: 'hub',
    sourceUrl: page('smart-crm'),
    tiers: perSeatTiers('smart-crm', [50, 3000], [75, 5000]),
    note: 'Enterprise incluye un entorno de pruebas estándar.'
  },
  {
    hubId: 'revenue',
    label: 'Revenue Hub',
    kind: 'hub',
    sourceUrl: page('revenue'),
    tiers: perSeatTiers('revenue', [95, 3000], [140, 5000]),
    note: 'Cotizaciones en Pro y Enterprise; facturación y pagos en todos los planes.'
  },
  {
    hubId: 'marketing',
    label: 'Marketing Hub',
    kind: 'hub',
    sourceUrl: page('marketing'),
    tiers: accountTiers(
      'marketing',
      [
        { tier: 'starter', price: 20, includedSeats: null, additionalSeatFrom: 50, contacts: 1000, credits: 500 },
        { tier: 'pro', price: 890, includedSeats: 3, additionalSeatFrom: 50, contacts: 2000, credits: 3000 },
        { tier: 'enterprise', price: 3600, includedSeats: 5, additionalSeatFrom: 75, contacts: 10000, credits: 5000 }
      ],
      { pro: 3000, enterprise: 7000 }
    )
  },
  {
    hubId: 'content',
    label: 'Content Hub',
    kind: 'hub',
    sourceUrl: page('content'),
    tiers: accountTiers('content', [
      { tier: 'starter', price: 20, includedSeats: 1, additionalSeatFrom: 50, credits: 500 },
      { tier: 'pro', price: 500, includedSeats: 3, additionalSeatFrom: 50, credits: 3000 },
      { tier: 'enterprise', price: 1500, includedSeats: 5, additionalSeatFrom: 75, credits: 5000 }
    ])
  },
  {
    hubId: 'data',
    label: 'Data Hub',
    kind: 'hub',
    sourceUrl: page('data'),
    tiers: accountTiers('data', [
      { tier: 'starter', price: 20, includedSeats: null, additionalSeatFrom: 50, credits: 500 },
      { tier: 'pro', price: 800, includedSeats: 1, additionalSeatFrom: 50, credits: 5000 },
      { tier: 'enterprise', price: 2000, includedSeats: 1, additionalSeatFrom: 75, credits: 10000 }
    ])
  },
  {
    hubId: 'marketing_plus',
    label: 'HubSpot para marketers (Marketing Hub + Content Hub)',
    kind: 'bundle',
    sourceUrl: page('marketing-plus'),
    tiers: [
      notOffered('marketing-plus'),
      ...accountTiers('marketing-plus', [
        { tier: 'pro', price: 1000, includedSeats: 3, additionalSeatFrom: 50, contacts: 2000, credits: 3000 },
        { tier: 'enterprise', price: 3800, includedSeats: 5, additionalSeatFrom: 75, contacts: 10000, credits: 5000 }
      ])
    ]
  },
  {
    hubId: 'customer_platform',
    label: 'Plataforma de Clientes',
    kind: 'bundle',
    sourceUrl: page('suite'),
    tiers: accountTiers('suite', [
      { tier: 'starter', price: 20, includedSeats: 1, additionalSeatFrom: 50, contacts: 1000, credits: 500 },
      { tier: 'pro', price: 1450, includedSeats: 6, additionalSeatFrom: 50, contacts: 2000, credits: 5000 },
      { tier: 'enterprise', price: 4700, includedSeats: 8, additionalSeatFrom: 75, contacts: 10000, credits: 10000 }
    ]),
    note: 'La página dice: «Descuentos disponibles solo para clientes nuevos. Oferta por tiempo limitado». HubSpot no publica la tarifa de incorporación del bundle.'
  }
]

const addOn = (addOnId: string, label: string, price: number, unitNote?: string) => ({
  addOnId,
  label,
  price: primary(price, page('add-ons')),
  ...(unitNote ? { unitNote } : {})
})

export const HUBSPOT_PRICEBOOK: HubSpotPricebook = {
  pricebookId: 'hubspot-list-price',
  version: '1.0.0',
  asOf: AS_OF,
  currency: 'USD',
  taxNote: 'El precio se muestra en USD y está sujeto a los impuestos aplicables.',
  hubs,
  addOns: [
    addOn(
      'credits_1000',
      'Créditos de HubSpot adicionales',
      10,
      'US$ 10 por 1.000 créditos; se renuevan mensualmente.'
    ),
    addOn('whatsapp_limit', 'Aumento del límite de WhatsApp (+1.000 mensajes/mes)', 70),
    addOn('ads_limit', 'Aumento en el límite de anuncios', 100),
    addOn('custom_ssl', 'SSL personalizado', 100),
    addOn('conversational_context_limit', 'Aumento del límite de contexto conversacional', 50),
    addOn('phone_numbers_limit', 'Aumento del límite de números de teléfono', 25),
    addOn('videos_limit', 'Aumento del límite de videos', 50),
    addOn('users_limit', 'Aumento del límite de usuarios', 200),
    addOn('workflows_limit', 'Aumento del límite de workflows', 200),
    addOn('lists_limit', 'Aumento del límite de listas', 200),
    addOn('teams_limit', 'Aumento del límite de equipos', 200),
    addOn('call_minutes_limit', 'Aumento del límite de minutos de llamadas', 50),
    addOn('api_limit', 'Aumento en el límite de API', 500),
    addOn('reports_limit', 'Aumento del límite de informes', 200),
    addOn('sms_sales_service', 'SMS para ventas y servicio al cliente', 75),
    addOn('esignature_limit', 'Aumento del límite de firmas electrónicas', 60),
    addOn('custom_properties_limit', 'Aumento del límite de propiedades personalizadas', 220)
  ],
  seatRules: [
    {
      seatType: 'view_only',
      free: secondary(
        true,
        LEGAL_CATALOG,
        LEGAL_AS_OF,
        'Las licencias de solo lectura no se cobran (skill hubspot-solutions-partner, módulo 11).'
      )
    }
  ],
  onboardingWaiver: secondary(
    true,
    null,
    '2026-07-13',
    'Un Solutions Partner certificado que implementa elimina la tarifa de incorporación obligatoria. Confirmado por el operador el 13/07/2026; confirmarlo por escrito con HubSpot en cada negocio.'
  ),
  contactBands: notPublished(
    'Los contactos de marketing sobre los incluidos se cobran por bandas escalonadas; las fuentes públicas discrepan en el monto.'
  )
}

/** The canonical reader. Consumers read the pricebook through it, never by importing the constant from a view. */
export const getHubSpotPricebook = (): HubSpotPricebook => HUBSPOT_PRICEBOOK
