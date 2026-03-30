# TASK-166 — Finance BigQuery Write Cutover

## Status

| Campo | Valor |
|-------|-------|
| Lifecycle | `complete` |
| Priority | `P1` |
| Impact | `Alto` |
| Effort | `Medio` |
| Status real | `Cerrada` |
| Rank | — |
| Domain | Finance / Data Platform / Runtime |
| Sequence | Follow-on directo post `TASK-139` |

## Summary

Cerrar el lifecycle real de `FINANCE_BIGQUERY_WRITE_ENABLED` y empezar a retirar el write path legacy hacia BigQuery en Finance sin big bang. La lane debe mover a Finance desde “flag documentado” a “flag operativo”, empezando por los write paths más sensibles y visibles.

## Why This Task Exists

Aunque Finance ya es Postgres-first, el write fallback a BigQuery sigue vivo en múltiples rutas y el flag `FINANCE_BIGQUERY_WRITE_ENABLED` estaba solo documentado, no aplicado de forma consistente. Eso deja dos riesgos:

- el repo parece listo para apagar writes legacy, pero el runtime no lo hace realmente
- un fallo de PostgreSQL todavía puede reabrir mutaciones contra `fin_*` sin una policy explícita por endpoint

## Goal

- Convertir `FINANCE_BIGQUERY_WRITE_ENABLED` en un guard operativo real.
- Cortar progresivamente writes legacy a BigQuery por slice verificable.
- Dejar explícito qué rutas siguen con fallback y cuáles ya fallan cerrado cuando Postgres no está disponible.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Finance sigue siendo Postgres-first para writes.
- El cutover debe ser gradual por endpoint, no un apagado global ciego.
- Si el fallback se desactiva para una ruta, debe fallar cerrado y observable.

## Dependencies & Impact

### Depends on

- `TASK-139` — baseline de hardening ya cerrada
- `FINANCE_BIGQUERY_WRITE_ENABLED` documentado en `.env.example`
- stores Postgres `postgres-store-slice2.ts`

### Impacts to

- rutas `POST` / `PATCH` de Finance con fallback BigQuery
- operación de staging y production cuando se empiece a apagar el flag
- follow-ons de cleanup BigQuery legacy

### Files owned

- `src/lib/finance/bigquery-write-flag.ts`
- `src/app/api/finance/**`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-166-finance-bigquery-write-cutover.md`

## Current Repo State

### Ya existe

- Finance es Postgres-first para buena parte del runtime.
- El flag `FINANCE_BIGQUERY_WRITE_ENABLED` existe en `.env.example`.
- `TASK-139` ya documentó el plan de cutover por fases.

### Gap actual

- el flag no estaba cableado de forma consistente en rutas write
- varios endpoints todavía conservan fallback BigQuery sin policy explícita de fail-closed

## Delta 2026-03-30 — slice 1 implementado

- Nuevo helper:
  - `src/lib/finance/bigquery-write-flag.ts`
- Primer wiring real del flag:
  - `POST /api/finance/income`
  - `POST /api/finance/expenses`
- Regla de este slice:
  - si el write Postgres falla y `FINANCE_BIGQUERY_WRITE_ENABLED=false`, la ruta responde `503` con `FINANCE_BQ_WRITE_DISABLED`
  - si el flag sigue activo, se conserva el fallback legacy actual

## Delta 2026-03-30 — slice 2 + cierre operativo

- Nuevas rutas cubiertas por el guard operativo:
  - `POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `POST /api/finance/exchange-rates`
  - `POST /api/finance/suppliers`
  - `PUT /api/finance/suppliers/[id]`
  - `POST /api/finance/expenses/bulk`
- `suppliers` dejó de depender de BigQuery como write path principal:
  - `POST` y `PUT` ahora son Postgres-first vía `seedFinanceSupplierInPostgres()`
- Regla operativa cerrada:
  - cuando Postgres falla y `FINANCE_BIGQUERY_WRITE_ENABLED=false`, las rutas write cubiertas responden `503` con `FINANCE_BQ_WRITE_DISABLED`
  - BigQuery queda solo como fallback transicional cuando el flag sigue activo

## Delta 2026-03-30 — inventario clasificado del remanente

### Write paths ya cubiertos por TASK-166

- `POST /api/finance/income`
- `POST /api/finance/expenses`
- `POST /api/finance/expenses/bulk`
- `POST /api/finance/accounts`
- `PUT /api/finance/accounts/[id]`
- `POST /api/finance/exchange-rates`
- `POST /api/finance/suppliers`
- `PUT /api/finance/suppliers/[id]`

### Write paths residuales clasificados, no bloqueadores del cierre

- siguen con fallback BigQuery porque pertenecen a carriles más especializados o follow-ons ya existentes:
  - `PUT /api/finance/income/[id]`
  - `PUT /api/finance/expenses/[id]`
  - `POST /api/finance/income/[id]/payment`
  - rutas `reconciliation/**`
  - `economic-indicators` sync/upsert
- criterio de cierre:
  - `TASK-166` cierra el lifecycle real del flag y el cutover del bloque core/master-data
  - el remanente se trata como deuda localizada por dominio, no como bloqueo del flag operativo

## Scope

### Slice 1 — Fail-closed inicial en writes core

- cablear `FINANCE_BIGQUERY_WRITE_ENABLED` en `income` y `expenses`
- introducir helper shared para evitar checks ad hoc por ruta
- cubrir el helper con tests

### Slice 2 — Expandir guard a writes secundarios

- revisar `accounts`, `suppliers`, `exchange-rates`, `expenses/bulk`
- decidir por endpoint si:
  - se mantiene fallback transicional
  - o ya puede fallar cerrado

### Slice 3 — Observabilidad + rollout

- agregar señal clara en docs/runtime para staging
- documentar qué entornos deben correr con flag `false`
- preparar retiro definitivo de código BigQuery write residual

## Out of Scope

- eliminar todos los reads BigQuery legacy
- migrar el runtime de clientes Finance (`TASK-050`)
- reabrir `TASK-139`

## Acceptance Criteria

- [x] Existe helper shared para resolver el estado efectivo de `FINANCE_BIGQUERY_WRITE_ENABLED`
- [x] `POST /api/finance/income` respeta el flag cuando Postgres falla
- [x] `POST /api/finance/expenses` respeta el flag cuando Postgres falla
- [x] Existe inventario explícito de rutas write que aún conservan fallback BigQuery
- [x] Al menos un segundo bloque de rutas write queda cortado o clasificado
- [x] La estrategia de rollout por entorno queda documentada

## Verification

- `pnpm exec vitest run src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec vitest run src/lib/finance/bigquery-write-flag.test.ts src/app/api/finance/bigquery-write-cutover.test.ts`
- `pnpm exec eslint src/lib/finance/bigquery-write-flag.ts src/lib/finance/bigquery-write-flag.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/accounts/route.ts src/app/api/finance/accounts/[id]/route.ts src/app/api/finance/exchange-rates/route.ts src/app/api/finance/suppliers/route.ts src/app/api/finance/suppliers/[id]/route.ts src/app/api/finance/expenses/bulk/route.ts src/app/api/finance/income/route.ts src/app/api/finance/expenses/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- validación automatizada fail-closed con `FINANCE_BIGQUERY_WRITE_ENABLED=false` vía route handlers
