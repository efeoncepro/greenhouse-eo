# TASK-464d — Pricing Engine Full-Model Refactor

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-464a (sellable roles), TASK-464b (pricing governance), TASK-464c (tool catalog + overheads)`
- Branch: `task/TASK-464d-pricing-engine-full-model-refactor`
- Legacy ID: `parte de TASK-464 umbrella`
- GitHub Issue: `none`

## Summary

Refactorear el pricing engine (`src/lib/finance/pricing/costing-engine.ts`) para consumir el modelo completo de Efeonce: `sellable_roles` (TASK-464a) + tier governance + commercial model multipliers + country factors + FTE guide (TASK-464b) + tool catalog + overhead addons (TASK-464c). El output del engine debe retornar cost stack completo + suggested price multi-currency + tier compliance check + addons aplicables contextualmente.

## Why This Task Exists

Hoy `costing-engine.ts` soporta `lineType='person'` (lee member_capacity_economics) y `lineType='role'` (lee role_rate_cards simple). Pero NO aplica:

- Tier margin min/opt/max (guardrails)
- Commercial model multiplier (+0/+5/+10/+15%)
- Country factor (0.85-1.2)
- Multi-currency output (solo USD actualmente)
- FTE-to-hours conversion via guide
- Overhead addons contextuales (PM Fee, Setup Aug, Transactional fees, etc.)
- Tool catalog lookup (quantity × prorated_price_usd)

El meta-modelo completo está en el Excel de Efeonce. TASK-464a/b/c lo canonicalizó en DB. TASK-464d hace que el engine lo use.

## Goal

- Pricing engine acepta input extendido con `commercial_model`, `country_factor_code`, `currency_output`, `line_items[]` que pueden ser role/person/tool/overhead
- Output incluye:
  - Cost stack por línea (internal, gated en UI a finance)
  - Suggested bill rate per unit
  - Total USD + conversión a moneda de cliente
  - Margen efectivo por línea + agregado
  - Tier compliance check (`below_min / in_range / above_max` por línea)
  - Addons aplicables auto-sugeridos (con `visible_to_client` flag)
- Callers existentes (API routes, health check) siguen funcionando con adapter que mappea input viejo → nuevo

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Engine es pure function: input determinístico → output determinístico. No side effects (write en outbox queda fuera, lo llaman los orchestrators)
- Multi-currency output usa exchange rates canónicas en `greenhouse_finance.exchange_rates` (ya existente) cuando el CSV no tiene el precio pre-calculado, o fallback al precio pre-calculado del Excel
- Engine nunca escribe — solo computa y retorna
- Backward compat: adapter layer para los callers antiguos

## Normative Docs

- `src/lib/finance/pricing/costing-engine.ts` actual
- `src/lib/finance/pricing/contracts.ts`
- TASK-464a/b/c specs (foundation that this consumes)

## Dependencies & Impact

### Depends on

- TASK-464a — `sellable_roles`, `sellable_role_cost_components`, `sellable_role_pricing_currency` existen con seed
- TASK-464b — tier margins, commercial model multipliers, country factors, FTE guide existen con seed
- TASK-464c — `ai.tool_catalog` extendida + `overhead_addons` existe con seed

### Blocks / Impacts

- TASK-464e — UI consume el output refactored
- TASK-465 — service composition usa engine para calcular totales del service
- TASK-462 — MRR/ARR se recalcula con precios multi-currency correctos
- TASK-348 — approval policies puede leer tier compliance output del engine para gating

### Files owned

- `src/lib/finance/pricing/costing-engine.ts` (refactor mayor)
- `src/lib/finance/pricing/contracts.ts` (nuevos types)
- `src/lib/finance/pricing/tier-compliance.ts` (nuevo)
- `src/lib/finance/pricing/addon-resolver.ts` (nuevo)
- `src/lib/finance/pricing/currency-converter.ts` (nuevo)
- `src/lib/finance/pricing/pricing-engine-v2.ts` (nueva entrypoint versionada; vieja queda como v1 hasta deprecarla)
- `src/app/api/finance/quotes/pricing/config/route.ts` (extender para exponer nuevas lookup tables)

## Current Repo State

### Already exists

- `costing-engine.ts` — maneja `lineType=person/role/deliverable/direct_cost` con rate cards básicas
- `pricing-config-store.ts` — resolve rate card + margin target por BL
- `margin-health.ts` — classifier simple de health (>target, <target, <floor)
- `revenue-metrics.ts` — cálculo de MRR/ARR/TCV/ACV desde quote
- `quotation-pricing-orchestrator.ts` — persiste snapshot + emite event + outbox

### Gap

- No consume tier min/opt/max para tier compliance check
- No aplica commercial model multiplier
- No aplica country factor
- No hace currency conversion output
- No resuelve addons contextuales
- No soporta `lineType='tool'` con tool_sku (hoy `lineType='direct_cost'` es el catch-all manual)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — New types en contracts.ts

```typescript
export type PricingLineInput =
  | { lineType: 'role'; roleSku: string; hours?: number; fteFraction?: number; periods?: number; quantity?: number; overrideMarginPct?: number }
  | { lineType: 'person'; memberId: string; hours?: number; fteFraction?: number; periods?: number; overrideMarginPct?: number }
  | { lineType: 'tool'; toolSku: string; quantity: number; periods?: number }
  | { lineType: 'overhead_addon'; addonSku: string; basisSubtotal?: number }
  | { lineType: 'direct_cost'; label: string; amount: number; currency: string }

export interface PricingEngineInputV2 {
  businessLineCode: string
  commercialModel: 'on_going' | 'on_demand' | 'hybrid' | 'license_consulting'
  countryFactorCode: string                  // 'chile_corporate' | 'chile_pyme' | etc.
  outputCurrency: 'USD' | 'CLP' | 'CLF' | 'COP' | 'MXN' | 'PEN'
  quoteDate: string                          // ISO date
  lines: PricingLineInput[]
  autoResolveAddons?: boolean                // default true, engine sugiere addons contextuales
}

export interface PricingLineOutput {
  lineInput: PricingLineInput
  // Internal cost detail (gated)
  costStack: {
    hourlyCostUsd?: number
    totalCostUsd: number
    breakdown: Record<string, number>         // base salary, bonuses, overhead, etc.
  }
  // Client-facing price
  suggestedBillRate: {
    unitPriceUsd: number
    unitPriceOutputCurrency: number
    totalBillUsd: number
    totalBillOutputCurrency: number
  }
  effectiveMarginPct: number
  tierCompliance: {
    tier?: string                             // del rol
    status: 'below_min' | 'in_range' | 'at_optimum' | 'above_max' | 'unknown'
    marginMin?: number
    marginOpt?: number
    marginMax?: number
  }
}

export interface PricingEngineOutputV2 {
  lines: PricingLineOutput[]
  addons: {
    sku: string
    appliedReason: string                     // 'commercial_model=on_demand' | 'staffing_named_resources' | etc.
    amountUsd: number
    amountOutputCurrency: number
    visibleToClient: boolean
  }[]
  totals: {
    subtotalUsd: number
    overheadUsd: number
    totalUsd: number
    totalOutputCurrency: number
    commercialMultiplierApplied: number
    countryFactorApplied: number
    exchangeRateUsed: number
  }
  aggregateMargin: {
    marginPct: number
    classification: 'healthy' | 'warning' | 'critical'
  }
  warnings: string[]                          // ej. "3 lines below tier min margin"
}
```

### Slice 2 — Engine refactor core logic

Orden de cálculo:
1. Para cada línea, resolver base cost según `lineType`:
   - `role`: SELECT de `sellable_role_cost_components` via `roleSku` → `hourly_cost_usd`
   - `person`: SELECT de `member_capacity_economics` → `cost_per_hour_target`
   - `tool`: SELECT de `ai.tool_catalog` via `tool_sku` → `prorated_cost_usd` × quantity × periods
   - `overhead_addon`: SELECT de `overhead_addons` via `addon_sku` → depende de `addon_type`
   - `direct_cost`: amount provisto manualmente
2. Calcular `suggestedBillRate`:
   - Role/person: `cost × (1 + marginOpt del tier del rol)` × commercial_model_multiplier × country_factor
   - Tool: `prorated_price_usd` (ya tiene margin 15% del Excel) × quantity × periods × country_factor
3. Tier compliance check usando `role_tier_margins` para roles/persons
4. Auto-resolve addons contextuales (si `autoResolveAddons=true`):
   - Si `commercialModel='on_demand'` → EFO-003 PM Fee aplicable
   - Si hay líneas `lineType='role'` con `can_sell_as_staff=true` → EFO-004 Recruiting + EFO-005 Renovación aplicables
   - Si hay líneas con currency≠CLP → EFO-006 Transactional fees aplicable
   - Si BL='wave' o 'efeonce' → EFO-007 AI & Data Infra aplicable
5. Currency conversion:
   - Si `outputCurrency='USD'`: no conversion
   - Else: usar precio pre-calculado del Excel (sellable_role_pricing_currency) para líneas de rol
   - Para tools/overheads/direct_cost: convertir via `greenhouse_finance.exchange_rates` latest
6. Aggregate totals + margin classification

### Slice 3 — Tier compliance + addon resolver helpers

- `tier-compliance.ts`:
  - `classifyTierCompliance({ effectiveMarginPct, tier })` → devuelve status + margin_min/opt/max del tier
- `addon-resolver.ts`:
  - `resolveApplicableAddons({ commercialModel, staffingModel, lines, businessLine, outputCurrency }) → AddonApplication[]`
  - Reglas declarativas en data (no hardcoded): cada addon tiene `applies_when` JSONB con expresión serializable

### Slice 4 — Currency converter

- `currency-converter.ts`:
  - `convertUsdToCurrency({ amountUsd, currency, rateDate }) → number`
  - Usa `greenhouse_finance.exchange_rates` latest <= rateDate
  - Fallback: precio pre-calculado de `sellable_role_pricing_currency` si rate no disponible
  - Cache 5 min TTL

### Slice 5 — Backward compat adapter

- `pricing-engine-v2.ts` exporta nueva entrypoint
- `costing-engine.ts` v1 queda vivo; pasa a ser thin wrapper que construye `PricingEngineInputV2` default (on_demand, chile_corporate, USD) y llama v2
- Callers existentes (`quotation-pricing-orchestrator.ts`, `/api/finance/quotes/[id]/health/route.ts`) no necesitan cambiar aún
- TASK-464e migra los callers cuando la UI nueva esté lista

### Slice 6 — Tests

- Unit tests para cada branch de `lineType`
- Tests de tier compliance (below_min, in_range, above_max)
- Tests de currency conversion vs pre-calculated
- Tests de addon auto-resolve
- Test end-to-end: input realista de cotización con 3 roles + 2 tools + 2 addons → output verificado contra cálculo manual del Excel

## Out of Scope

- UI changes (TASK-464e)
- Migración de quotes históricas con el nuevo engine (re-pricing masivo) — se decide follow-up
- Approval policies que usen tier compliance — extensión de TASK-348
- Service composition pricing (TASK-465 — aunque consume este engine)

## Detailed Spec

### Example end-to-end

Input:
```json
{
  "businessLineCode": "globe",
  "commercialModel": "on_going",
  "countryFactorCode": "chile_corporate",
  "outputCurrency": "CLP",
  "quoteDate": "2026-04-18",
  "lines": [
    { "lineType": "role", "roleSku": "ECG-002", "fteFraction": 1.0, "periods": 6 },
    { "lineType": "role", "roleSku": "ECG-016", "fteFraction": 0.5, "periods": 6 },
    { "lineType": "tool", "toolSku": "ETG-001", "quantity": 1, "periods": 6 },
    { "lineType": "tool", "toolSku": "ETG-019", "quantity": 1, "periods": 6 }
  ]
}
```

Engine computes:
- ECG-002 Senior Visual Designer: cost $7.55/h × 180h × 6 months = $8,154 USD
  - Tier 2 margin opt 0.40 → bill rate $12.58/h → total bill $13,590 USD
  - commercial_model=on_going multiplier 0 → no ajuste
  - country_factor=chile_corporate 1.0 → no ajuste
  - CLP conversion desde sellable_role_pricing_currency: $1,359,000/mes × 6 = $8,154,000 CLP total
- ECG-016 PM/AM: cost $12.07/h × 90h × 6 months (0.5 FTE × 180h) = $6,520 USD
  - Tier 3 margin opt 0.50 → bill rate $18.12/h → total bill $9,782 USD
- ETG-001 Adobe CC: prorated $20/month × 6 = $120 cost / $138 bill
- ETG-019 Figma: prorated $20/month × 6 = $120 cost / $138 bill
- Auto-resolve addons: ninguno aplica explícitamente (on_going retainer, chile_corporate, globe BL)

Output:
```json
{
  "totals": {
    "totalUsd": 23648,
    "totalOutputCurrency": 23648000,
    "subtotalUsd": 23372,
    "overheadUsd": 276,
    "commercialMultiplierApplied": 0,
    "countryFactorApplied": 1.0,
    "exchangeRateUsed": 1000
  },
  "aggregateMargin": { "marginPct": 0.42, "classification": "healthy" },
  "warnings": []
}
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Engine v2 computa correctamente para los 4 lineTypes (role/person/tool/overhead)
- [ ] Tier compliance classifier devuelve status correcto en los 5 casos (below_min/in_range/at_optimum/above_max/unknown)
- [ ] Currency conversion devuelve el mismo valor que el Excel (±1 CLP tolerance) para los 6 currencies
- [ ] Auto-resolve addons funciona para 5+ escenarios tipicos (on_demand → PM Fee, staff_aug → Recruiting, etc.)
- [ ] Backward compat adapter: callers viejos siguen funcionando sin modificación
- [ ] Tests cubren ≥80% líneas del engine
- [ ] Output structure estable documentado en contracts.ts

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test` (con nuevos tests)
- `pnpm build`
- Smoke manual: input realista coincide con output esperado del Excel

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] Chequeo impacto cruzado con TASK-464e (UI), TASK-465 (service comp), TASK-462 (MRR/ARR), TASK-348 (governance)
- [ ] Actualizar `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` con delta del engine v2

## Follow-ups

- Migrar callers v1 a v2 cuando UI esté lista (TASK-464e)
- Deprecar v1 entrypoint + `role_rate_cards` legacy después de ventana de coexistencia
- Engine endpoint API público (`POST /api/finance/quotes/pricing/simulate`) para que UI pueda simular pricing sin persistir
- Cache de computation (bust en update de rate/margin tables)

## Open Questions

- ¿`sellable_role_pricing_currency` ya trae precios pre-calculados del Excel — ¿el engine usa eso directo, o siempre recomputa desde cost + margin + factor? Propuesta: **usa pre-calculado** para líneas sin `overrideMarginPct`; **recomputa** cuando hay override manual o el output_currency no está en los 6 precalculados. Alinea lo que ve el usuario con el Excel de Efeonce.
