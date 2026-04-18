# TASK-464d — Pricing Engine Full-Model Refactor

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Implementado y validado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-464a (sellable roles), TASK-464b (pricing governance), TASK-464c (tool catalog + overheads)`
- Branch: `develop`
- Legacy ID: `parte de TASK-464 umbrella`
- GitHub Issue: `none`

## Summary

Construir la capa v2 del pricing engine sobre el modelo canónico de Efeonce: `sellable_roles` (TASK-464a) + tier governance + commercial model multipliers + country factors + FTE guide (TASK-464b) + tool catalog + overhead addons (TASK-464c). El output v2 debe retornar cost stack completo + suggested price multi-currency + tier compliance check + addons aplicables contextualmente, sin romper los callers legacy que todavía dependen del contrato v1.

## Why This Task Exists

Hoy `costing-engine.ts` soporta `lineType='person'` (lee member_capacity_economics) y `lineType='role'` (lee role_rate_cards simple). Pero NO aplica:

- Tier margin min/opt/max (guardrails)
- Commercial model multiplier (+0/+5/+10/+15%)
- Country factor (0.85-1.2)
- Multi-currency output (solo USD actualmente)
- FTE-to-hours conversion via guide
- Overhead addons contextuales (PM Fee, Setup Aug, Transactional fees, etc.)
- Tool catalog lookup (quantity × prorated_price_usd)

El meta-modelo completo está en el Excel de Efeonce. TASK-464a/b/c lo canonicalizó en DB. TASK-464d hace que el engine lo use desde una entrypoint v2, manteniendo compatibilidad controlada con el flujo persistente actual de quotations.

## Goal

- Pricing engine v2 acepta input extendido con `commercial_model`, `country_factor_code`, `currency_output`, `line_items[]` que pueden ser role/person/tool/overhead
- Output incluye:
  - Cost stack por línea (internal, gated en UI a finance)
  - Suggested bill rate per unit
  - Total USD + conversión a moneda de cliente
  - Margen efectivo por línea + agregado
  - Tier compliance check (`below_min / in_range / above_max` por línea)
  - Addons aplicables auto-sugeridos (con `visible_to_client` flag)
- Callers existentes (API routes, orchestrator, health check) siguen funcionando mientras el adapter legacy convive con el engine v2

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El cálculo v2 debe separar IO de cálculo. Los readers de DB pueden vivir en una capa de resolución, pero el motor de pricing no debe escribir ni disparar side effects.
- Multi-currency output usa `greenhouse_finance.exchange_rates` como fuente primaria para conversiones runtime y puede usar `sellable_role_pricing_currency` como fallback para roles cuando exista pricing pre-calculado.
- Engine nunca escribe — solo computa y retorna
- Backward compat: adapter layer para los callers antiguos; el cutover completo de quotations queda desacoplado del primer merge de 464d
- **🛑 AISLAMIENTO PAYROLL**: engine LEE opcionalmente de `greenhouse_payroll.chile_afp_rates` + `chile_previred_indicators` para enriquecer cost stack cuando quote es CLP+indefinido (solo SELECT, nunca WRITE). NO modifica logic de `src/lib/payroll/*`. `lineType='person'` sigue consumiendo `member_capacity_economics` sin cambios. Antes de cerrar, `pnpm test src/lib/payroll/` (baseline: 194 tests / 29 files passing al 2026-04-18 — debe mantenerse intacto) debe pasar intacto.

## Discovery Corrections (2026-04-18)

- El runtime real de quotations sigue viviendo sobre `QuotationPricingInput` / `QuotationPricingSnapshot` en `quotation-pricing-orchestrator.ts`; no existe aún el contrato v2 descrito abajo.
- `QuotationPricingCurrency` del flujo persistente actual sigue limitado a `CLP | USD | CLF`. El soporte `COP | MXN | PEN` debe entrar primero como output v2 y no como ruptura inmediata del contrato persistente legacy.
- `overhead_addons` hoy no expone una DSL rica tipo `applies_when JSONB`; el resolver de addons debe construirse sobre el schema actual y reglas versionadas en código hasta que exista un contrato declarativo explícito.
- La fórmula normativa de margen para suggested bill rate es `price = cost / (1 - marginPct)`. El texto anterior que decía `cost × (1 + marginPct)` queda invalidado.
- `schema-snapshot-baseline.sql` sirve como referencia histórica, pero el source of truth operativo para esta task es el runtime actual (`greenhouse_commercial.quotations`, `quotation_line_items`, `quotation_versions` y `src/types/db.d.ts`).

## Implementation Closure (2026-04-18)

- Se creó `pricing-engine-v2.ts` como superficie aditiva backend-first para role/person/tool/overhead/direct_cost.
- Se agregaron `tier-compliance.ts`, `addon-resolver.ts` y `currency-converter.ts`.
- `contracts.ts` ahora expone el contrato v2 sin romper `QuotationPricingInput` ni `QuotationPricingCurrency` legacy.
- `GET /api/finance/quotes/pricing/config` ahora expone también el catálogo canónico (`sellableRoles`, `employmentTypes`, governance tables, tools y overhead addons) junto a la config legacy.
- Se mantuvo coexistencia explícita con `role_rate_cards`, `margin_targets` y el orchestrator legacy de quotations; el cutover de callers queda desacoplado para TASK-464e / TASK-463.
- Validación cerrada: `pnpm exec tsc --noEmit --incremental false`, tests focalizados del pricing v2, `pnpm lint`, `pnpm test src/lib/payroll/`, `pnpm test`, `pnpm build`, `pnpm pg:connect:status`.

## Normative Docs

- `src/lib/finance/pricing/costing-engine.ts` actual
- `src/lib/finance/pricing/contracts.ts`
- TASK-464a/b/c specs (foundation that this consumes)

## Dependencies & Impact

### Depends on

- TASK-464a — `sellable_roles`, `employment_types`, `sellable_role_cost_components` (multi-row por employment_type), `role_employment_compatibility`, `sellable_role_pricing_currency` existen con seed
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

## Engine Input Assumptions

- El engine v2 consume tablas canónicas ya normalizadas; no debe parsear labels crudos del CSV ni reimplementar reglas de limpieza de seeds.
- `roleSku`, `toolSku`, `addonSku`, `commercialModel`, `countryFactorCode` y `employmentTypeCode` deben llegar ya canonizados desde `TASK-464a`, `TASK-464b` y `TASK-464c`.
- Si una línea hace referencia a un código inexistente o no normalizado, el engine debe fallar de forma determinística con error explícito o warning estructurado; nunca intentar “adivinar” el código correcto.

## Dependency on Normalized Seeds

- `TASK-464d` depende del contrato de seeds definido en las tasks anteriores:
  - roles: catálogo + employment type inference conservadora
  - governance: diccionarios fijos y rangos normalizados
  - tools/addons: applicability y fórmulas ya resueltas
- El engine no debe introducir una segunda fuente de verdad para tiers, commercial models, country factors ni formulas de addons.
- Backward compatibility vive en el adapter de entrada/salida, no en relajar el contrato de datos canónicos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — New types en contracts.ts y contrato v2 aditivo

```typescript
export type PricingLineInput =
  | { lineType: 'role'; roleSku: string; employmentTypeCode?: string; hours?: number; fteFraction?: number; periods?: number; quantity?: number; overrideMarginPct?: number }
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
    employmentTypeCode?: string                // para líneas role/person, employment_type efectivo aplicado
    employmentTypeSource?: 'explicit_input' | 'role_default' | 'payroll_compensation_version'
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

Notas de implementación:

- Este contrato v2 es aditivo. No reemplaza de golpe `QuotationPricingInput`, `LineCostResolutionInput` ni `QuotationPricingCurrency` del flujo persistente actual.
- Si hace falta compatibilidad con quotations legacy, se agrega un adapter explícito v1 → v2; no se expande el contrato legacy a la fuerza en el mismo paso.

### Slice 2 — Engine refactor core logic

Orden de cálculo:
1. Para cada línea, resolver base cost según `lineType`:
   - `role`: resolve employment_type_code (input override → default de `role_employment_compatibility`). SELECT de `sellable_role_cost_components` via `(role_id, employment_type_code, latest effective_from)` → `hourly_cost_usd`. Si employment_type NO allowed para este rol → throw error / warning.
   - `person`: SELECT de `member_capacity_economics` → `cost_per_hour_target` (ya refleja el employment_type real del member via compensation_versions)
   - `tool`: SELECT de `ai.tool_catalog` via `tool_sku` → `prorated_cost_usd` × quantity × periods
   - `overhead_addon`: SELECT de `overhead_addons` via `addon_sku` → depende de `addon_type`
   - `direct_cost`: amount provisto manualmente
2. Calcular `suggestedBillRate`:
   - Role/person: `cost / (1 - marginOpt del tier del rol)` y luego aplicar `commercial_model_multiplier` + `country_factor`
   - Tool: `prorated_price_usd` (ya tiene margin 15% del Excel) × quantity × periods × country_factor
3. Tier compliance check usando `role_tier_margins` para roles/persons
4. Auto-resolve addons contextuales (si `autoResolveAddons=true`):
   - Si `commercialModel='on_demand'` → EFO-003 PM Fee aplicable
   - Si hay líneas `lineType='role'` con `can_sell_as_staff=true` → EFO-004 Recruiting + EFO-005 Renovación aplicables
   - Si hay líneas con currency≠CLP → EFO-006 Transactional fees aplicable
   - Si BL='wave' o 'efeonce' → EFO-007 AI & Data Infra aplicable
5. Currency conversion:
   - Si `outputCurrency='USD'`: no conversion
   - Para líneas de rol: priorizar `sellable_role_pricing_currency` cuando exista una fila vigente para el rol/moneda; si no, convertir desde USD usando `greenhouse_finance.exchange_rates`
   - Para tools/overheads/direct_cost: convertir via `greenhouse_finance.exchange_rates` latest
6. Aggregate totals + margin classification

### Slice 3 — Tier compliance + addon resolver helpers

- `tier-compliance.ts`:
  - `classifyTierCompliance({ effectiveMarginPct, tier })` → devuelve status + margin_min/opt/max del tier
- `addon-resolver.ts`:
  - `resolveApplicableAddons({ commercialModel, staffingModel, lines, businessLine, outputCurrency }) → AddonApplication[]`
  - Reglas centralizadas y versionadas. Mientras el schema actual no tenga una DSL explícita, las reglas viven en código apoyadas por `applicable_to`, `visible_to_client` y metadata vigente del addon.

### Slice 4 — Currency converter

- `currency-converter.ts`:
  - `convertUsdToCurrency({ amountUsd, currency, rateDate }) → number`
  - Usa `greenhouse_finance.exchange_rates` latest <= rateDate
  - Fallback: precio pre-calculado de `sellable_role_pricing_currency` si rate no disponible
  - Cache 5 min TTL

### Slice 5 — Backward compat adapter

- `pricing-engine-v2.ts` exporta nueva entrypoint
- `costing-engine.ts` v1 queda vivo y conserva su contrato actual; puede delegar selectivamente al v2 cuando el input sea representable sin romper behavior legacy
- `quotation-pricing-orchestrator.ts` y los routes actuales no se rompen en este merge; la migración de callers puede ser incremental
- TASK-464e / TASK-463 consumen la nueva surface v2 cuando la UI nueva esté lista

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
