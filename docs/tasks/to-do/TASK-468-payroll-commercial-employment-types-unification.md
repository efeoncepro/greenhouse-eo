# TASK-468 — Payroll ↔ Commercial Employment Types Unification

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-464a (commercial.employment_types existe)`
- Branch: `task/TASK-468-payroll-commercial-employment-types-unification`
- Legacy ID: `follow-up de TASK-464a`
- GitHub Issue: `none`

## Summary

Unificar el vocabulario de employment_types entre `greenhouse_commercial.employment_types` (nuevo, TASK-464a) y `greenhouse_payroll.compensation_versions.contract_type` (existente, string libre). Crea sinergia natural bidireccional: pricing engine consume rates vigentes de payroll (chile_afp_rates, previred_indicators) cuando corresponde; payroll puede validar que cada compensation_version tenga un contract_type existente en el catálogo commercial. **Non-breaking**: NO altera schemas de payroll ni lógica de cálculo — solo añade soft references + readers compartidos.

## Why This Task Exists

Post TASK-464a quedan 2 fuentes de "employment_type":

1. `greenhouse_payroll.compensation_versions.contract_type` — string libre per member ('indefinido', 'plazo_fijo', etc.). Source of truth de la realidad de cada persona.
2. `greenhouse_commercial.employment_types` — catálogo canónico con defaults fiscales. Source of truth del vocabulario + rates default.

Sin unificación:
- Drift potencial: el string `'indefinido'` de payroll puede no matchear al code `'indefinido_clp'` del catálogo
- Pricing engine no aprovecha rates vigentes de `chile_afp_rates` al cotizar en CLP
- Admin UI no puede mostrar "rates vigentes en payroll" como referencia al editar employment_types commercial
- Al cambiar tax rules Chile (AFP sube de 10% a 10.5%), admin commercial tiene que updatear manual — debería heredar de payroll

**Objetivo arquitectónico**: que ambos módulos operen sobre el mismo vocabulario + que pricing engine opcionalmente consuma rates vigentes de payroll sin duplicar lógica.

## Goal

- Vocabulario unificado: `compensation_versions.contract_type` queda alineado con `commercial.employment_types.employment_type_code` (soft reference)
- Pricing engine v2 consulta `chile_afp_rates` + `chile_previred_indicators` cuando employment_type tiene `source_of_truth='greenhouse_payroll_chile_rates'` y quote es CLP + indefinido
- Admin UI commercial muestra rates vigentes de payroll como referencia (solo display, no mutación)
- Migración de valores legacy en `compensation_versions.contract_type` a códigos canónicos
- **Zero breaking changes a payroll**: tests existentes pasan intactos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- **🛑 NO alterar schemas de payroll ni romper nada**: `compensation_versions.contract_type` sigue siendo `string Generated` sin restricciones. Se agrega soft reference como **constraint opcional NOT VALID** (documentación + validación futura, sin enforcement hard).
- **🛑 NO modificar lógica de cálculo payroll**: los previsional computations de `src/lib/payroll/*` quedan intactos. Solo se agregan readers nuevos en commercial que consultan payroll tables en modo SELECT.
- **🛑 Tests existentes de payroll deben pasar intactos**: suite `src/lib/payroll/**/*.test.ts` es regression gate hard.
- Sync unidireccional primero: commercial LEE de payroll (defaults fiscales chilenos). Payroll → commercial solo si se solicita explícitamente (follow-up).
- Migración es **idempotente + reversible**: si hay drift, queda documentado en audit, no silent.

## Normative Docs

- TASK-464a spec (employment_types schema)
- `src/lib/payroll/chile-previsional-helpers.ts` (lógica de rates actual — NO modificar)
- `greenhouse_payroll.chile_afp_rates` + `chile_previred_indicators` + `chile_tax_brackets` (reference data existente)

## Dependencies & Impact

### Depends on

- TASK-464a shipped — `greenhouse_commercial.employment_types` existe con seed inicial
- TASK-464d shipped (recomendado) — engine v2 para integrar rates lookup

### Blocks / Impacts

- **Sinergia natural**: pricing engine + payroll operan sobre vocabulario compartido
- **Reducción de duplicación**: un solo lugar para "cuánto es previsional chilena vigente"
- **Future-proof**: nuevos países (Argentina, España) se modelan en `employment_types` sin duplicar en payroll

### Files owned

- `migrations/[verificar]-task-468-payroll-commercial-employment-types-link.sql`
- `src/lib/commercial/payroll-rates-bridge.ts` (nuevo — reader SELECT-only de payroll reference tables)
- `src/lib/commercial/employment-types-store.ts` (extender con rate lookup cuando source_of_truth='payroll')
- `scripts/migrate-compensation-version-contract-types.ts` (migración de strings legacy a codes canónicos)

## Current Repo State

### Already exists (pre-TASK-468)

- `greenhouse_payroll.compensation_versions.contract_type` string libre con valores como 'indefinido', 'plazo_fijo'
- `greenhouse_payroll.chile_afp_rates` per AFP + période
- `greenhouse_payroll.chile_previred_indicators` (SIS, tope UF, etc.)
- `greenhouse_payroll.chile_tax_brackets`
- `src/lib/payroll/chile-previsional-helpers.ts` con logic de computation
- `greenhouse_commercial.employment_types` (post TASK-464a) con seed hardcoded de 7 tipos

### Gap

- No hay FK soft entre `compensation_versions.contract_type` y `commercial.employment_types.employment_type_code`
- Pricing engine commercial NO consulta rates vigentes de payroll (usa values de `employment_types.previsional_pct_default`)
- Admin UI commercial no puede "preview" rates vigentes de payroll como referencia
- Valores legacy de `compensation_versions.contract_type` pueden no matchear los codes canónicos

## Read-Only Bridge Policy

- Esta task NO modifica schemas ni lógica de `greenhouse_payroll.*`. El bridge se resuelve desde commercial mediante readers, alias mapping y consumo SELECT-only de tablas de referencia payroll.
- `greenhouse_payroll.compensation_versions.contract_type` sigue siendo string libre y source of truth factual del colaborador; la unificación comercial ocurre por resolución externa, no por FK o rewrite sobre payroll.
- Cualquier eventual hardening del lado payroll (constraint, migración de valores, enforcement de catálogo) queda explícitamente fuera de este corte y requeriría una decisión posterior separada.

## Payroll Isolation Guardrail

- El baseline de regresión es `pnpm test src/lib/payroll/` = `194` tests / `29` files passing. Debe mantenerse idéntico antes y después del trabajo.
- Esta task puede leer `greenhouse_payroll.chile_afp_rates`, `greenhouse_payroll.chile_previred_indicators` y `greenhouse_payroll.chile_tax_brackets`, pero no puede escribir sobre esas tablas ni cambiar `src/lib/payroll/**`.
- Si aparece una necesidad que implique tocar schema o runtime payroll, el trabajo se pausa y se re-plantea como follow-up separado; no se mezcla dentro de TASK-468.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## UI Plan

Esta task **no tiene superficie UI directa** — es bridge server-side entre payroll y commercial. Sin embargo impacta 2 surfaces del programa (documentados en **[TASK-469](TASK-469-commercial-pricing-ui-interface-plan.md)**):

- **Surface D — Employment Type selector**: el picker en `QuoteBuilderActions.tsx` (TASK-463) consume `greenhouse_commercial.employment_types` vía este bridge. Contract: SELECT-only, NUNCA lectura directa a `greenhouse_payroll.*` desde UI comercial.
- **Surface L — Employment Types admin**: tab en governance panel (TASK-467) CRUD sobre `greenhouse_commercial.employment_types`. Cambios aquí propagan a payroll SOLO vía bridge auditado con escritor explícito (no triggers).
- **🛑 AISLAMIENTO PAYROLL (obligatorio)**: ningún componente del programa pricing toca `src/views/greenhouse/hr/payroll/**` ni `src/components/hr/payroll/**`. Los 194 tests de payroll (29 archivos) son gate de regresión antes de merge.

## Scope

### Slice 1 — Audit de valores legacy + alias mapping comercial (read-only first)

- Auditoría de valores distintos en `compensation_versions.contract_type`:
  ```sql
  SELECT DISTINCT contract_type, COUNT(*) FROM greenhouse_payroll.compensation_versions GROUP BY 1;
  ```
- Map de valores legacy → codes canónicos resuelto del lado commercial:
  - `'indefinido'` → `'indefinido_clp'` (asume CLP por contexto chileno)
  - `'plazo_fijo'` → `'plazo_fijo_clp'`
  - `'honorarios'` → `'honorarios_clp'`
  - `'contractor'` o `'contrator'` → `'contractor_deel_usd'` (requiere verificación humana)
  - `'part-time'` → `'part_time_clp'`
  - Otros valores distintos → flag `needs_review` + reportar a admin

- Script `scripts/audit-payroll-contract-types.ts`:
  - Dry run mode: muestra diff sin ejecutar
  - Reporte final: cuántos resuelven por alias, cuántos necesitan review manual
  - Opcional: genera artifact local con alias no resueltos para limpieza posterior

### Slice 2 — Alias resolver canónico (commercial-side)

- `src/lib/commercial/employment-type-aliases.ts` define el diccionario de alias que mapea strings legacy de payroll a `employment_type_code` canónico.
- `resolveCommercialEmploymentTypeFromPayrollContractType(contractType)` encapsula esa traducción y retorna `{ employmentTypeCode | null, resolutionSource, warning? }`.
- La ausencia de alias no rompe payroll; solo deja el caso en `unknown` / `needs_review` del lado commercial.

### Slice 3 — Payroll rates bridge (reader SELECT-only)

`src/lib/commercial/payroll-rates-bridge.ts`:
```typescript
/**
 * TASK-468: Bridge READ-ONLY desde commercial hacia payroll reference tables.
 * Usado por pricing engine v2 cuando employment_type.source_of_truth='greenhouse_payroll_chile_rates'.
 * NO MUTA payroll bajo ninguna circunstancia.
 */

export const getCurrentChileanPrevisionalRate = async (
  date: string
): Promise<{ afpAvgRate: number; sisRate: number; topeAfpUf: number } | null> => {
  // SELECT puro desde greenhouse_payroll.chile_afp_rates + chile_previred_indicators
  // Nunca INSERT/UPDATE/DELETE
}

export const getCurrentAfpRate = async (afpName: string, date: string): Promise<number | null>
export const getCurrentUnemploymentRate = async (contractType: string, date: string): Promise<number | null>
```

Tests: verifican que las lecturas funcionan sin tocar payroll writers.

### Slice 4 — Pricing engine integra rates opcionalmente

- `PricingEngineV2.computeRoleCost` acepta flag `useLiveRates: boolean` (default TRUE)
- Cuando `useLiveRates=TRUE` + `employment_type.source_of_truth='greenhouse_payroll_chile_rates'` + quote en CLP + employment_type es indefinido/plazo_fijo:
  - Consulta `getCurrentChileanPrevisionalRate(quote.date)` via bridge
  - Overrides `previsional_pct_default` del catálogo con rate vigente de payroll
  - Emite warning si drift > 1%: "Rate vigente en payroll 21.5% difiere del catálogo (20%). Usando payroll."
- Cuando `useLiveRates=FALSE` o source_of_truth='catalog_manual':
  - Usa valores del catálogo commercial sin consultar payroll

### Slice 5 — Admin UI commercial muestra payroll rates como referencia

- Tab "Modalidades de contrato" en `/admin/pricing-catalog/employment-types/[code]`:
  - Para employment_types con `source_of_truth='greenhouse_payroll_chile_rates'`:
    - Panel lateral "Rates vigentes en payroll":
      - AFP promedio actual
      - SIS rate actual
      - Tope AFP UF
      - Fecha de la última actualización de payroll
    - Comparación con `previsional_pct_default` del catálogo → chip "Alineado" / "Drift X%"
  - Botón "Actualizar catálogo desde payroll" (solo admin) → actualiza `previsional_pct_default` con valor vigente + audit log

### Slice 6 — Tests de regresión payroll

- Ejecutar `pnpm test src/lib/payroll/` antes y después de cada slice
- Toda suite de payroll debe pasar intacta sin modificación de test files
- Documentar en PR description: "Payroll tests: X passed, 0 failed, 0 modified"

## Out of Scope

- Migración completa de payroll a usar el catálogo commercial como source of truth (future architecture decision, no en este corte)
- Cualquier FK, constraint o rewrite sobre `greenhouse_payroll.compensation_versions`
- Modificación de lógica de cálculo payroll (Chilean previsional rules siguen embedded en `src/lib/payroll/chile-previsional-helpers.ts`)
- Bidirectional sync automático commercial → payroll (follow-up si se pide)
- Multi-country payroll (hoy solo Chile; future task)

## Detailed Spec

### Regla de no-rotura

Diagrama de aislamiento:

```
┌──────────────────────────────────────────────────┐
│ greenhouse_payroll                               │
│   compensation_versions.contract_type (string)   │ ← SIN cambios
│   chile_afp_rates                                │ ← SOLO SELECT desde commercial
│   chile_previred_indicators                      │ ← SOLO SELECT desde commercial
│   chile_tax_brackets                             │ ← SOLO SELECT desde commercial
│   src/lib/payroll/chile-previsional-helpers.ts   │ ← SIN cambios
│   src/lib/payroll/*.test.ts                      │ ← SIN cambios, son regression gate
└──────────────────────────────────────────────────┘
                    ↑ SELECT-only
                    │
┌──────────────────────────────────────────────────┐
│ greenhouse_commercial                            │
│   employment_types                               │ ← CATÁLOGO canónico (fuente TASK-464a)
│   payroll-rates-bridge.ts (TASK-468)             │ ← Reader SELECT-only hacia payroll
│   sellable_role_cost_components                  │ ← opcionalmente override con rates payroll
└──────────────────────────────────────────────────┘
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm test src/lib/payroll/` pasa **194 tests / 29 files** (baseline registrado 2026-04-18) sin modificar test files
- [ ] Dry run de migración muestra diff coherente
- [ ] Apply migration actualiza valores string + preserva backup
- [ ] Soft FK constraint queda declarada NOT VALID sin bloquear INSERTs
- [ ] `getCurrentChileanPrevisionalRate()` retorna valores correctos desde payroll sin side effects
- [ ] Pricing engine con `useLiveRates=TRUE` override previsional correctamente
- [ ] Admin UI muestra panel "Rates vigentes en payroll" funcional
- [ ] Zero modificación en archivos de `src/lib/payroll/` (verificable con git diff)
- [ ] Zero modificación en schemas de `greenhouse_payroll.*` (migration solo toca commercial + agrega constraint documentacional)

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test` completo
- `pnpm test src/lib/payroll/` explícito como gate
- `git diff --stat src/lib/payroll/` debe retornar vacío
- Manual staging: verificar que liquidación de payroll genera mismos resultados que antes

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con "commercial ↔ payroll bridge live, zero regression"
- [ ] Chequeo impacto cruzado con TASK-464a/d/e/467
- [ ] Actualizar arquitectura: `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` + `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` con delta del bridge
- [ ] Documentar en un ADR si se decide patterns similares para future cross-module bridges (ej. finance ↔ commercial)

## Follow-ups

- Migración bidireccional: payroll → commercial cuando cambia un AFP rate, notifica al admin commercial
- Extend a multi-country: cuando se abra Argentina, similar bridge entre `argentina_previsional_rates` y `employment_types` argentinos
- Deprecate `contract_type` string en payroll cuando FK constraint se pueda `VALIDATE` completamente

## Open Questions

- ¿Cambio rates en payroll debería trigger automático un event outbox que commercial escuche para actualizar sus defaults? Propuesta: **NO en V1** — commercial consulta on-demand. Sync automático queda como follow-up.
- ¿Admin commercial con permisos para triggerear re-sync de rates? Propuesta: sí, solo `efeonce_admin`. Finance manager solo ve, no triggeá.
- ¿Valores legacy en `compensation_versions.contract_type` que no matcheen ningún code canónico — qué hacer? Propuesta: dejarlos con backup + flag `needs_review=TRUE` + admin decide caso a caso.
