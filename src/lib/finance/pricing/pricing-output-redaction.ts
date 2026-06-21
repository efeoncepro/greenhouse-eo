import type {
  PricingCostStackV2,
  PricingEngineOutputV2,
  PricingLineOutputV2,
  TierComplianceV2
} from './contracts'

/**
 * Redacción canónica del output del pricing engine por audiencia (TASK-1211).
 *
 * El cotizador hoy sólo exponía una redacción binaria y SHALLOW (`stripCostStack`
 * local al route de simulate) que borraba únicamente el `costStack` por línea y
 * dejaba expuestos margen, tierCompliance, multiplicadores y warnings con costo.
 * Este es el redactor PROFUNDO y único (SSOT) que todos los consumers consumen
 * (UI, Nexa, MCP, API Platform), modelando las TRES audiencias reales:
 *
 * - `internal` + `costStackVisible`  → todo (cost stack + margen). Para roles
 *   finance (`canViewCostStack`).
 * - `internal` + `!costStackVisible` → margen y bill rates visibles, SIN cost
 *   stack. Es el comportamiento histórico (TASK-464e): el comercial interno ve
 *   el margen para negociar, pero no el desglose de costo. Cero regresión.
 * - `client` / `public` → SOLO bill rate + totales + IVA. NUNCA cost stack,
 *   role rates, margen, multiplicadores de markup ni warnings con costo. El
 *   margen es poder de negociación + inteligencia competitiva: jamás cruza al
 *   comprador.
 *
 * Regla dura: el perfil lo decide el caller server-side por su auth context,
 * NUNCA por default. Esta función NO decide la audiencia; la recibe.
 */

export type PricingAudience = 'internal' | 'client' | 'public'

export interface PricingRedactionContext {
  audience: PricingAudience
  /** Sólo aplica a `audience='internal'`. Para client/public se ignora (siempre false efectivo). */
  costStackVisible: boolean
}

export type RedactedPricingLineOutput = Omit<
  PricingLineOutputV2,
  'costStack' | 'effectiveMarginPct' | 'tierCompliance'
> & {
  costStack?: PricingCostStackV2
  effectiveMarginPct?: number
  tierCompliance?: TierComplianceV2
}

export type RedactedPricingEngineOutput = Omit<
  PricingEngineOutputV2,
  'lines' | 'totals' | 'aggregateMargin'
> & {
  lines: RedactedPricingLineOutput[]
  totals: Omit<
    PricingEngineOutputV2['totals'],
    'commercialMultiplierApplied' | 'countryFactorApplied'
  > & {
    commercialMultiplierApplied?: number
    countryFactorApplied?: number
  }
  aggregateMargin?: PricingEngineOutputV2['aggregateMargin']
}

/**
 * Redacta un `PricingEngineOutputV2` según la audiencia. Pura, sin side effects.
 * Las superficies sensibles son CINCO (no una): per-line `costStack`,
 * per-line `effectiveMarginPct` + `tierCompliance` + `resolutionNotes`,
 * top-level `aggregateMargin`, `totals.commercialMultiplierApplied` +
 * `countryFactorApplied`, y `warnings` + `structuredWarnings` (su prosa/`context`
 * filtra costo y markup).
 */
export const redactPricingOutputForProfile = (
  output: PricingEngineOutputV2,
  context: PricingRedactionContext
): RedactedPricingEngineOutput => {
  const isInternal = context.audience === 'internal'
  const showCostStack = isInternal && context.costStackVisible
  // El margen es visible a TODO interno (finance o comercial), nunca al comprador.
  const showMargin = isInternal

  const lines: RedactedPricingLineOutput[] = output.lines.map(line => {
    const { costStack, effectiveMarginPct, tierCompliance, resolutionNotes, ...rest } = line

    return {
      ...rest,
      ...(showCostStack ? { costStack } : {}),
      ...(showMargin ? { effectiveMarginPct, tierCompliance } : {}),
      // resolutionNotes pueden filtrar la fuente de costo ("Costo base desde
      // role_blended…") — sólo internos.
      resolutionNotes: showMargin ? resolutionNotes : []
    }
  })

  const { commercialMultiplierApplied, countryFactorApplied, ...totalsRest } = output.totals

  return {
    ...output,
    lines,
    totals: {
      ...totalsRest,
      // Los multiplicadores revelan el markup → sólo internos.
      ...(showMargin ? { commercialMultiplierApplied, countryFactorApplied } : {})
    },
    // aggregateMargin: sólo internos. Para client/public queda undefined (JSON lo omite).
    aggregateMargin: showMargin ? output.aggregateMargin : undefined,
    // warnings del engine pueden mencionar costo/markup en prosa o en `context`.
    warnings: showMargin ? output.warnings : [],
    structuredWarnings: showMargin ? output.structuredWarnings : []
  }
}
