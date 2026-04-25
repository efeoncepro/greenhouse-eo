# TASK-529 — Chile Tax Code Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Complete — 2026-04-21`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-529-chile-tax-code-foundation`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Crear la capa canonica de codigos tributarios y snapshots de impuesto para Chile dentro de `greenhouse_finance`. Esta es la foundation que necesita el resto del portal para dejar de usar `tax_rate` como campo suelto o default implicito.

## Why This Task Exists

Hoy el repo tiene columnas tributarias dispersas, pero no una semantica unica para responder preguntas basicas: cual impuesto aplica, si es recuperable, cual era la tasa al momento de emitir, o que parte del monto es base imponible. Sin ese contrato, cada modulo inventa una version distinta del IVA.

## Goal

- Crear un catalogo canonico de tax codes Chile-first y snapshots efectivos.
- Exponer helpers reutilizables para resolver impuesto, base imponible, monto tributario y recuperabilidad.
- Preparar el schema para que quotes, income y expenses persistan snapshots, no solo tasas sueltas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- Los nuevos modulos backend deben usar `getDb()` / Kysely y `withTransaction` sobre la infraestructura oficial del repo.
- `tax_rate` deja de ser el contrato primario; pasa a ser snapshot derivado de `tax_code`.
- La resolucion tributaria siempre debe aceptar contexto tenant (`space_id`) para soportar overrides o efectividad futura sin romper aislamiento.
- El primer corte soporta Chile; no se inventa un framework multi-pais innecesario antes de cerrar IVA CL.

## Normative Docs

- `Handoff.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-528-chile-tax-iva-program.md`
- `docs/architecture/schema-snapshot-baseline.sql`
- `scripts/`
- `src/lib/db.ts`

### Blocks / Impacts

- `TASK-530`
- `TASK-531`
- `TASK-532`
- `TASK-533`

### Files owned

- `migrations/*`
- `src/lib/tax/chile/*`
- `src/types/db.d.ts`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `src/app/api/finance/income/route.ts` calcula `taxRate` y `taxAmount` al crear ingresos.
- `src/app/api/finance/expenses/route.ts` y `src/app/api/finance/expenses/[id]/route.ts` ya manejan tax fields y tax metadata.
- `src/lib/finance/quotation-canonical-store.ts` tiene campos `tax_rate`, `tax_amount` y `legacy_tax_amount`.

### Gap

- No existe `tax_code` canonico.
- No existe tabla/catalogo para codigos tributarios Chile.
- No existe helper comun para saber si el impuesto es cobrable, exento o recuperable.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema foundation

- Crear migracion con tablas y/o sidecars canonicos en `greenhouse_finance` para tax codes y snapshots efectivos.
- Versionar la migracion junto con `src/types/db.d.ts`.
- Evaluar `space_id NULL` como default global Chile y `space_id` poblado para overrides tenant-specific futuros.

### Slice 2 — Resolver and helpers

- Crear helpers tipo `resolveChileTaxCode`, `computeChileTaxSnapshot`, `computeChileTaxAmounts`.
- Exponer contrato reusable para:
  - `taxCode`
  - `taxLabel`
  - `taxRateSnapshot`
  - `taxableAmount`
  - `taxAmount`
  - `totalAmount`
  - `recoverability`

### Slice 3 — Seed v1 Chile

- Sembrar codigos minimos:
  - `cl_vat_19`
  - `cl_vat_exempt`
  - `cl_vat_non_billable`
  - `cl_input_vat_credit_19`
  - `cl_input_vat_non_recoverable_19`
- Dejar effective dating y versionado preparados para cambios regulatorios futuros.

### Slice 4 — Tests and docs

- Agregar tests unitarios y de persistencia.
- Actualizar arquitectura financiera con el contrato de tax layer.

## Out of Scope

- UI tributaria final.
- Reglas avanzadas de retenciones, boletas de honorarios o regimens fuera de IVA Chile v1.
- Multi-country tax engine.

## Detailed Spec

Contrato objetivo minimo:

1. Todo documento financiero que soporte impuestos debe poder persistir `tax_code`.
2. `tax_rate` y `tax_amount` quedan como snapshots/materializaciones derivadas.
3. La semantica de recuperabilidad debe ser first-class, no inferida solo por signo o tipo de documento.
4. El helper debe poder resolver montos desde base neta y tambien validar snapshots preexistentes.

Decision de escalabilidad:

- El catalogo tributario debe quedar desacoplado de quotations, income y expenses para soportar nuevas jurisdicciones sin rediseñar esos aggregates.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Existe foundation canonica de `tax_code` y snapshots tributarios en `greenhouse_finance` — tabla `tax_codes` + JSONB snapshot shape versionado (`ChileTaxSnapshot` v1).
- [x] El repo tiene helpers reutilizables para resolver IVA Chile sin defaults hardcodeados por modulo — `src/lib/tax/chile/` expone `loadChileTaxCodes`, `resolveChileTaxCode`, `tryResolveChileTaxCode`, `computeChileTaxAmounts`, `computeChileTaxSnapshot`, `validateChileTaxSnapshot`.
- [x] Los tax codes semilla de Chile quedan testeados y documentados — 5 seeds aplicados y verificados via pg client; tests `compute.test.ts` (15) + `resolver.test.ts` (6) = 21 pass; doc delta en `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`.

## Verification

- [x] `pnpm lint` — 0 errores (solo warning pre-existente en `BulkEditDrawer.tsx`).
- [x] `npx tsc --noEmit` — 0 errores.
- [x] `pnpm test` — 1593/1593 pass + 2 skipped (21 nuevos tests sumados al baseline de 1572).
- [x] `pnpm migrate:up` — aplicó `20260421011323497_task-466` (con hotfix idempotente) + `20260421105127894_task-529` secuencial; Kysely types regenerados automáticamente.

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado con el estado real (`complete`).
- [x] Archivo vive en `docs/tasks/complete/`.
- [ ] `docs/tasks/README.md` sincronizado con el cierre — TASK-511..550 no están registradas en el índice; omitido por consistencia con las otras del roadmap Ola 2/3.
- [x] `Handoff.md` actualizado con la sesión TASK-529.
- [ ] `changelog.md` — no existe `changelog.md` en el repo; la spec hace referencia pero el artefacto no fue creado aún. Deferred.
- [x] Chequeo de impacto cruzado ejecutado: TASK-466 migration tenía bug bloqueante (tabla/columna inexistentes); hotfix shipped + ISSUE-056 abierta. TASK-530/531/532/533 quedan desbloqueadas (este era su gate).
- [x] Migración y `src/types/db.d.ts` commiteados juntos.

## Implementation Notes — 2026-04-21 (Claude Opus 4.7)

**Archivos creados:**

- `migrations/20260421105127894_task-529-chile-tax-code-foundation.sql` — tabla `greenhouse_finance.tax_codes` (18 columnas, 4 CHECK constraints, 4 índices, 5 seeds Chile v1).
- `src/lib/tax/chile/types.ts` — shape canónico: `ChileTaxCodeId`, `TaxCodeKind`, `TaxRecoverability`, `TaxCodeRecord`, `ChileTaxSnapshot` v1, `ChileTaxAmounts`.
- `src/lib/tax/chile/catalog.ts` — `loadChileTaxCodes` con Kysely + cache in-memory 5min + dedup tenant-override > global.
- `src/lib/tax/chile/resolver.ts` — `resolveChileTaxCode` (hard) / `tryResolveChileTaxCode` (soft) + `ChileTaxCodeNotFoundError`.
- `src/lib/tax/chile/compute.ts` — `computeChileTaxAmounts` / `computeChileTaxSnapshot` / `validateChileTaxSnapshot` + rounding CLP 2 decimales + `ChileTaxComputeError`.
- `src/lib/tax/chile/index.ts` — barrel export.
- `src/lib/tax/chile/compute.test.ts` (15 tests) + `src/lib/tax/chile/resolver.test.ts` (6 tests) = 21 unit tests verdes.
- `docs/issues/open/ISSUE-056-missing-quotation-defaults-ddl-task-466.md` — incidente encontrado durante descubrimiento.

**Archivos modificados:**

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — delta 2026-04-21 con runtime nuevo + helpers + contrato downstream + out-of-scope.
- `docs/issues/README.md` — registro de ISSUE-056 + next ID 057.
- `migrations/20260421011323497_task-466-expand-quotation-currency-constraint.sql` — hotfix `ALTER TABLE IF EXISTS` + DO block con chequeo `information_schema.columns` para desbloquear pipeline.
- `src/types/db.d.ts` — regenerado automáticamente por `pnpm migrate:up` (incluye `GreenhouseFinanceTaxCodes`).
- `Handoff.md` — sesión TASK-529 agregada al tope.

**Sinergia con ecosistema:**

- **TASK-530/531/532/533 desbloqueadas:** todas pueden ahora adoptar `ChileTaxSnapshot` como shape canónico + `resolveChileTaxCode` + `computeChileTaxAmounts`. No hay más razones para que cada módulo calcule IVA inline con default hardcoded 19%.
- **TASK-466:** desbloqueada. La migración que llevaba días sin aplicarse a DB ahora corre idempotente.
- **Patrón reutilizado:** el diseño sigue el mismo patrón que `src/lib/finance/quotation-fx-snapshot.ts` (FX snapshot versión 1 con `frozenAt`, immutable post-issuance). Consistencia cross-domain.
- **No emite eventos outbox, no toca DDL downstream, no calcula métricas.** Es foundation pura; el valor es el contrato compartido.

**Decisiones no-obvias:**

1. **Tabla jurisdiction-agnostic (no `chile_tax_codes`):** shape soporta múltiples jurisdicciones desde el día 1 pero sólo Chile está seedeada. Evita rediseño cuando se agregue jurisdicción nueva. El spec mismo lo mandataba ("desacoplado para soportar nuevas jurisdicciones sin rediseñar aggregates").
2. **`space_id` nullable con partial unique indexes:** global (`NULL`) vs tenant-scoped conviven sin colisión usando `WHERE space_id IS NULL` / `WHERE space_id IS NOT NULL`. Evita el approach feo de `COALESCE(space_id, uuid_nil)`.
3. **`recoverability` como enum explícito (no derivado de `kind`):** TASK-532 quiere separar `partial` recoverability (vehículos uso mixto) en el futuro; inferir por kind ahora obligaría a mudar el contrato después. Cost bajo, optionalidad alta.
4. **`ChileTaxComputeError` + `ChileTaxCodeNotFoundError` son hard errors:** no hay fallback silencioso a 19%. La spec dice "sin defaults hardcodeados por módulo" — consumers deben fallar temprano si el tax_code no aplica.
5. **Resolver usa `query()` ni `Kysely`?** Kysely, usando `sql` literal para cast de fechas. DB types regenerados correctamente. Cero uso de `new Pool`.

## Follow-ups

- `TASK-530`
- `TASK-531`
- `TASK-532`
- `TASK-533`

