# TASK-468 — Payroll ↔ Commercial Employment Types Unification

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-468-payroll-commercial-employment-types-unification`
- Legacy ID: `follow-up de TASK-464a`
- GitHub Issue: `none`

## Summary

Materializar un bridge **commercial-side, read-only y auditable** entre `greenhouse_commercial.employment_types` y el vocabulario factual que hoy vive en `greenhouse_payroll.compensation_versions.contract_type`. El objetivo de este corte es resolver aliases, exponer readers determinísticos de tasas payroll hacia commercial y dejar listo el contrato backend para consumers futuros (`TASK-464d`, `TASK-467`, `TASK-463`) **sin** mutar schemas ni runtime payroll.

## Why This Task Exists

Post TASK-464a quedan 2 planos de "employment_type":

1. `greenhouse_payroll.compensation_versions.contract_type` — snapshot factual en payroll con vocabulario corto (`indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`).
2. `greenhouse_commercial.employment_types` — catálogo canónico con defaults fiscales. Source of truth del vocabulario + rates default.

Sin unificación:
- Commercial no tiene una capa persistente para resolver `indefinido` -> `indefinido_clp` o `contractor` -> `contractor_deel_usd` sin hardcodes dispersos
- Pricing backend no puede leer tasas vigentes de payroll desde un helper aislado del dominio commercial
- Las futuras surfaces admin/UI de pricing no tienen un contrato backend estable para mostrar drift entre catálogo y payroll

**Objetivo arquitectónico**: resolver el vocabulario y el read path desde commercial, manteniendo payroll como fuente factual y aislada.

## Goal

- Resolver aliases payroll -> commercial mediante tabla/versionado en `greenhouse_commercial`
- Exponer `payroll-rates-bridge` SELECT-only desde commercial
- Dejar un script de auditoría para detectar drift real entre payroll y catálogo
- Mantener `greenhouse_payroll.*` y `src/lib/payroll/**` intactos
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

- **🛑 NO alterar schemas de payroll ni romper nada**: `compensation_versions.contract_type` ya está restringido por `CHECK` a cinco valores y así se queda. Esta task no agrega FK, NOT VALID constraints, rewrites ni migraciones sobre `greenhouse_payroll.*`.
- **🛑 NO modificar lógica de cálculo payroll**: los previsional computations de `src/lib/payroll/*` quedan intactos. Solo se agregan readers nuevos en commercial que consultan payroll tables en modo SELECT.
- **🛑 Tests existentes de payroll deben pasar intactos**: suite `src/lib/payroll/**/*.test.ts` es regression gate hard.
- Sync unidireccional primero: commercial LEE de payroll. No hay writeback payroll -> commercial ni commercial -> payroll en este corte.
- La migración nueva vive solo en `greenhouse_commercial` y debe incluir GRANTS explícitos a `greenhouse_runtime`.

## Normative Docs

- TASK-464a spec (employment_types schema)
- `src/lib/payroll/chile-previsional-helpers.ts` (lógica de rates actual — NO modificar)
- `greenhouse_payroll.chile_afp_rates` + `chile_previred_indicators` + `chile_tax_brackets` (reference data existente)

## Dependencies & Impact

### Depends on

- TASK-464a shipped — `greenhouse_commercial.employment_types` existe con seed inicial

### Blocks / Impacts

- **Sinergia natural**: `TASK-464d` puede enchufarse al bridge sin tocar payroll
- **Reducción de duplicación**: alias + tasas payroll quedan resueltos en un solo boundary commercial
- **Future-proof**: nuevos orígenes y países pueden agregarse como aliases sin reescribir payroll

### Files owned

- `migrations/[verificar]-task-468-commercial-employment-type-aliases.sql`
- `src/lib/commercial/payroll-rates-bridge.ts` (nuevo — reader SELECT-only de payroll reference tables)
- `src/lib/commercial/employment-type-alias-store.ts` (nuevo — resolver de aliases payroll -> commercial)
- `scripts/audit-payroll-contract-types.ts` (nuevo — auditoría read-only)

## Current Repo State

### Already exists (pre-TASK-468)

- `greenhouse_payroll.compensation_versions.contract_type` con `CHECK` hard a `indefinido | plazo_fijo | honorarios | contractor | eor`
- `greenhouse_payroll.chile_afp_rates` per AFP + période
- `greenhouse_payroll.chile_previred_indicators` (SIS, tope UF, etc.)
- `greenhouse_payroll.chile_tax_brackets`
- `src/lib/payroll/chile-previsional-helpers.ts` con logic de computation
- `greenhouse_commercial.employment_types` (post TASK-464a) con seed hardcoded de 7 tipos

### Gap

- No existe una tabla commercial de aliases persistente y auditable
- No existe `payroll-rates-bridge.ts`
- No existe script de auditoría de `contract_type`
- El engine comercial todavía no consume este bridge porque eso corresponde a `TASK-464d`

## Read-Only Bridge Policy

- Esta task NO modifica schemas ni lógica de `greenhouse_payroll.*`. El bridge se resuelve desde commercial mediante readers, alias mapping y consumo SELECT-only de tablas de referencia payroll.
- `greenhouse_payroll.compensation_versions.contract_type` sigue siendo snapshot factual del colaborador; la unificación comercial ocurre por resolución externa, no por FK o rewrite sobre payroll.
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
- **Surface L — Employment Types admin**: tab en governance panel (TASK-467) podrá leer drift y alias coverage desde este bridge. No hay propagación a payroll en este corte.
- **🛑 AISLAMIENTO PAYROLL (obligatorio)**: ningún componente del programa pricing toca `src/views/greenhouse/hr/payroll/**` ni `src/components/hr/payroll/**`. Los 194 tests de payroll (29 archivos) son gate de regresión antes de merge.

## Scope

### Slice 1 — Audit de valores payroll + alias mapping comercial

- Auditoría de valores distintos en `compensation_versions.contract_type`:
  ```sql
  SELECT DISTINCT contract_type, COUNT(*) FROM greenhouse_payroll.compensation_versions GROUP BY 1;
  ```
- Map de valores payroll -> codes canónicos resuelto del lado commercial:
  - `'indefinido'` → `'indefinido_clp'` (asume CLP por contexto chileno)
  - `'plazo_fijo'` → `'plazo_fijo_clp'`
  - `'honorarios'` → `'honorarios_clp'`
  - `'contractor'` → `'contractor_deel_usd'` por default inicial versionado en commercial
  - `'eor'` → `'contractor_eor_usd'`
  - aliases no payroll como `'contrator'` o `'part-time'` se aceptan solo como aliases explicitados en la tabla, no por fallback silencioso
  - Otros valores distintos → flag `needs_review` + reportar a admin

- Script `scripts/audit-payroll-contract-types.ts`:
  - Dry run mode: muestra cobertura del mapping sin mutar nada
  - Reporte final: cuántos resuelven por alias, cuántos necesitan review manual
  - Genera artifact local con alias no resueltos para limpieza posterior

### Slice 2 — Tabla de aliases + resolver canónico (commercial-side)

- Nueva tabla `greenhouse_commercial.employment_type_aliases` como source of truth persistente para mappings por `source_system`.
- `src/lib/commercial/employment-type-alias-store.ts` encapsula esa traducción y retorna `{ employmentTypeCode | null, resolutionSource, warning? }`.
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

### Slice 4 — Tests de regresión payroll + contract tests del bridge

- Ejecutar `pnpm test src/lib/payroll/` antes y después de cada slice
- Toda suite de payroll debe pasar intacta sin modificación de test files
- Agregar tests unitarios del alias resolver y del payroll rates bridge

## Out of Scope

- Migración completa de payroll a usar el catálogo commercial como source of truth
- Cualquier FK, constraint o rewrite sobre `greenhouse_payroll.compensation_versions`
- Modificación de lógica de cálculo payroll
- Integración del pricing engine con live rates dentro de esta misma task
- UI admin o quote builder; eso queda para `TASK-467` / `TASK-463`
- Bidirectional sync automático commercial -> payroll

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
│   employment_type_aliases                        │ ← Bridge canónico payroll -> commercial
└──────────────────────────────────────────────────┘
```

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm test src/lib/payroll/` pasa **194 tests / 29 files** (baseline registrado 2026-04-18) sin modificar test files
- [ ] Migración nueva vive solo en `greenhouse_commercial` y no toca `greenhouse_payroll.*`
- [ ] Tabla de aliases resuelve los valores payroll actuales (`indefinido`, `contractor`, `honorarios`) hacia códigos commercial
- [ ] Script de auditoría reporta alias cubiertos y `needs_review` sin side effects
- [ ] `getCurrentChileanPrevisionalRate()` retorna valores correctos desde payroll sin side effects
- [ ] Tests unitarios nuevos del bridge pasan
- [ ] Zero modificación en archivos de `src/lib/payroll/` (verificable con git diff)
- [ ] Zero modificación en schemas de `greenhouse_payroll.*` (migration solo toca commercial)

## Verification

- `pnpm migrate:up`
- `pnpm lint`
- `pnpm exec tsc --noEmit --incremental false`
- `pnpm test` completo
- `pnpm test src/lib/payroll/` explícito como gate
- `git diff --stat src/lib/payroll/` debe retornar vacío
- Validación manual de DB: alias table sembrada + readers devuelven datos coherentes para el último período payroll disponible

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] Archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con "commercial ↔ payroll bridge live, zero regression"
- [ ] Chequeo impacto cruzado con TASK-464a/d/e/467
- [ ] Actualizar arquitectura: `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` + `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` con delta del bridge
- [ ] Documentar en un ADR si se decide patterns similares para future cross-module bridges (ej. finance ↔ commercial)

## Follow-ups

- Exponer alias coverage y drift en `TASK-467` / `TASK-463`
- Extend a multi-country: cuando se abra Argentina, similar bridge entre `argentina_previsional_rates` y `employment_types` argentinos
- Evaluar un patrón reusable de bridges cross-schema si aparecen más casos commercial ↔ finance / payroll

## Open Questions

- ¿Cambio rates en payroll debería trigger automático un event outbox que commercial escuche para actualizar sus defaults? Propuesta: **NO en V1** — commercial consulta on-demand. Sync automático queda como follow-up.
- ¿Admin commercial con permisos para modificar aliases manualmente después? Propuesta: sí, pero en `TASK-467`, no aquí.
- ¿Valores no cubiertos por alias table qué hacen? Propuesta: quedan en `needs_review`, se reportan, y no generan fallback silencioso a `indefinido`.
