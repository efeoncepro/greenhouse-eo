# TASK-1189 — PPM monthly position (F29 línea PPM) por entidad legal

## Delta 2026-06-20

- Precondición de período cerrada por TASK-1191 (ISSUE-103): los documentos de income sincronizados desde Nubox ya nacen con `period_year`/`period_month` (el sync los estampa desde la fecha del documento + backfill de los 165 históricos). Al materializar la posición PPM por período (que se calcula sobre ingresos del período), los docs Nubox ya tienen período poblado. Reusar el helper canónico `getOperationalFiscalPeriod()` (`src/lib/calendar/operational-calendar.ts`) si se necesita derivar período de una fecha.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `[verificar] child de la umbrella TASK-1186`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1189-ppm-monthly-position`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Child A de la umbrella TASK-1186 (decisión: single-RUT, prioritarias primero). Materializa la **posición mensual de PPM** (Pago Provisional Mensual, línea PPM del F29) por **entidad legal + período**, reusando el patrón canónico de TASK-725. Base = ingresos brutos/ventas netas del período × **tasa PPM vigente** (parámetro per-contribuyente fijado por el SII, versionado en una SSOT — nunca hardcode), con crédito/arrastre cuando aplique.

## Why This Task Exists

El F29 mensual incluye la línea **PPM** (pago a cuenta del impuesto a la renta anual). Hoy no vive como posición fiscal materializada en Greenhouse. Esta task la modela con el mismo rigor que el IVA (TASK-725) y las retenciones (TASK-1188): scope = entidad legal, posición por período, signal de drift, reader/endpoint gobernados. Junto con IVA + retenciones completa las 3 líneas mensuales del F29.

## Goal

- Posición mensual de PPM materializada por (entidad legal, período): base imponible (ventas netas), tasa PPM aplicada, PPM del período, crédito/arrastre.
- Tasa PPM desde una SSOT versionada/parametrizable (per-contribuyente, fijada por SII) — NUNCA hardcode.
- Reliability signal `finance.ppm.position_drift` (steady=0).
- Reader + endpoint gobernados, scope operating entity (no `space_id`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-06-20 VAT scope = entidad legal, TASK-725 — patrón a replicar)
- `docs/tasks/in-progress/TASK-1186-greenhouse-fiscal-positions-expansion.md` (umbrella padre)
- `docs/tasks/to-do/TASK-1188-retenciones-monthly-position.md` (hermana — misma forma)

Reglas obligatorias:

- **NUNCA** particionar la posición de PPM por `space_id`/`client_id` — scope = entidad legal (RUT).
- **NUNCA** hardcodear la tasa PPM: vive en una SSOT versionada/parametrizable (la tasa PPM la fija el SII por contribuyente y puede cambiar; modelarla como parámetro, no constante en código).
- **SIEMPRE** emitir `finance.ppm.position_drift` cuando la posición mute.
- Base imponible = ingresos brutos/ventas netas del período por entidad legal; reusar el reader de ventas canónico (no recomputar inline; respetar `no-untokenized-fx-math` / VIEWs CLP).
- Resolver de entidad legal: `getOperatingEntityIdentity()` (singleton hoy).

## Normative Docs

- `docs/tasks/complete/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (foundation + patrón).
- `docs/tasks/to-do/TASK-1185-vat-materializer-fiscal-robustness-hardening.md` (advisory lock + guard FX desde el inicio).
- Skill `greenhouse-finance-accounting-operator` (PPM Chile, F29).

## Dependencies & Impact

### Depends on

- TASK-725 (foundation) — complete.
- `getOperatingEntityIdentity()` (`src/lib/account-360/organization-identity.ts`).
- Reader canónico de ventas/ingresos por entidad legal/período (base imponible) — `[verificar]` el reader existente (income summary / VIEWs CLP).
- SSOT de tasa PPM — `[verificar]`: no existe hoy; esta task la introduce (config/tabla parametrizable per-contribuyente/período).

### Blocks / Impacts

- Hermana de TASK-1188 (Retenciones); ambas líneas del F29 mensual → coordinar para vista F29 consolidada (child E futura).
- Cierra parte del alcance de la umbrella TASK-1186.

### Files owned

- `migrations/` (tabla `greenhouse_finance.ppm_monthly_positions` + SSOT de tasa PPM `[verificar]`)
- `src/lib/finance/ppm-ledger.ts` (nuevo — mirror de `vat-ledger.ts`)
- `src/lib/reliability/queries/ppm-position-drift.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wiring)
- `src/app/api/finance/ppm/monthly-position/route.ts` (nuevo)
- tests asociados

## Current Repo State

### Already exists

- Patrón completo en `vat-ledger.ts` (molde a copiar).
- Reader de ventas/ingresos por período (base imponible PPM) — `[verificar]` punto exacto (`income/summary`, VIEWs `*_normalized`).
- Signal pattern + wiring.

### Gap

- No existe posición de PPM ni SSOT de tasa PPM.
- No hay reader/endpoint/signal de PPM.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (insumo tributario F29; sign-off contable)
- Impacto principal: `migration` (tabla posición + SSOT tasa) + `command` (materializador) + `reader`
- Source of truth afectado: nueva `greenhouse_finance.ppm_monthly_positions`; base imponible leída del reader de ventas canónico; tasa PPM desde SSOT nueva
- Consumidores afectados: UI Finance, Nexa, CLI; ops-worker
- Runtime target: `worker` + `app`

### Contract surface

- Contrato existente a respetar: patrón TASK-725; reader de ventas canónico (no recomputar).
- Contrato nuevo o modificado: `materializePpmForPeriod(year, month, reason)`; readers `getPpmMonthlyPosition` / `listPpmMonthlyPositions`; endpoint `GET /api/finance/ppm/monthly-position`; signal `finance.ppm.position_drift`; SSOT de tasa PPM.
- Backward compatibility: `compatible` (additive).
- Full API parity: posición PPM como reader/endpoint gobernado.

### Data model and invariants

- Entidades/tablas afectadas: nueva `ppm_monthly_positions`; SSOT tasa PPM; reader de ventas (lectura).
- Invariantes:
  - Scope = entidad legal, NUNCA `space_id`/`client_id`.
  - Tasa PPM desde SSOT versionada/parametrizable, NUNCA hardcode.
  - Base imponible vía reader de ventas canónico (no recomputar; respetar VIEWs CLP / lint fx-math).
  - Posición única por (entidad, período); signal drift steady=0.
- Tenant/space boundary: PPM es de la entidad legal (interno).
- Idempotency/concurrency: DELETE+INSERT por (entidad, período) con advisory lock (TASK-1185).
- Audit/outbox/history: `materialized_at` + razón.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla posición + tabla/config de tasa PPM; markers + DO block + GRANTs).
- Default state: materializador gateado flag default OFF + shadow.
- Backfill plan: re-materializar períodos + validación contable vs F29 real.
- Rollback path: flag off / revert / reverse migration; redeploy ops-worker.
- External coordination: la tasa PPM la fija SII por contribuyente — capturarla con el contador; validación vs F29 real.

### Security and access

- Auth/access gate: `requireFinanceTenantContext`; scope operating entity.
- Sensitive data posture: `finance` (sin PII de terceros; PPM es agregado de ventas).
- Error contract: `canonicalErrorResponse` (`fiscal_entity_unavailable` si no hay operating entity); `captureWithDomain(err,'finance',...)`.
- Abuse/rate-limit posture: N/A (lectura interna).

### Runtime evidence

- Local checks: tests del materializador (base × tasa correcta) + signal.
- DB/runtime checks: query read-only vs PG; re-materializar dev + drift=0.
- Integration checks: `staging:request /api/finance/ppm/monthly-position` → 200 con `legalEntity`.
- Reliability signals/logs: `finance.ppm.position_drift`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Base imponible leída del reader de ventas canónico (no recompute inline).
- [ ] Tasa PPM desde SSOT versionada/parametrizable; sin hardcode (test).
- [ ] Migración/rollback proporcional (additive + flag).
- [ ] Evidencia DB/runtime (drift=0).

## Capability Definition of Done — Full API Parity gate

Lectura → reader canónico (sin capability). Acción (recálculo/ajuste de tasa) → capability fina + grant mismo PR. Consumible por Nexa por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — SSOT de tasa PPM + Discovery del reader de ventas

- Modelar la tasa PPM como SSOT versionada/parametrizable (per-contribuyente/período). Confirmar el reader canónico de ventas netas por entidad legal/período (base imponible). Ejercitar query vs PG real.

### Slice 2 — Migración: tabla de posición PPM (+ tasa)

- `ppm_monthly_positions` scope entidad legal, unique `(organization_id, period_year, period_month)`, markers + DO block + GRANTs; tabla/config de tasa.

### Slice 3 — Materializador

- `materializePpmForPeriod`: base (ventas netas vía reader canónico) × tasa PPM (SSOT), scope operating entity, advisory lock, crédito/arrastre.

### Slice 4 — Reader + endpoint

- Readers por operating entity + `GET /api/finance/ppm/monthly-position` (estado tipado, degradación honesta).

### Slice 5 — Signal + tests + docs

- `finance.ppm.position_drift` (steady=0) + test anti-regresión + Delta arch doc + closing.

## Out of Scope

- Retenciones (TASK-1188) y F22 (child futura).
- Multi-entidad (child D de TASK-1186) — usa singleton.
- Determinar la tasa PPM "correcta" del contribuyente (eso lo aporta el contador/SII); esta task la modela como parámetro y la aplica.
- Envío real del F29.

## Detailed Spec

Mirror del patrón TASK-725 (`vat-ledger.ts` → `ppm-ledger.ts`). PPM = base imponible (ventas netas del período, vía reader canónico) × tasa PPM (SSOT parametrizable). Sin gate de space; advisory lock + guard FX desde el inicio (TASK-1185). La base se lee del reader de ventas canónico para no violar `no-untokenized-fx-math`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (SSOT tasa + reader ventas) → Slice 2 (migración) → Slice 3 (materializador) → Slice 4 (endpoint) → Slice 5 (signal/docs). Slice 3+ requieren redeploy ops-worker.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Base imponible mal computada (recompute inline) | finance | medium | usar reader de ventas canónico / VIEWs CLP; test | `finance.ppm.position_drift` |
| Tasa PPM hardcodeada/incorrecta | finance | medium | SSOT parametrizable + captura con contador; test | drift signal |
| Cifra incorrecta sin validación contable | finance | high | sign-off contador vs F29 real | — |

### Feature flags / cutover

Materializador gateado con `PPM_POSITION_ENABLED` (default OFF) + shadow.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | reverse migration (DROP tablas) | <15 min | sí |
| Slice 3 | flag OFF / revert + redeploy ops-worker | <30 min | sí |
| Slice 4 | revert PR | <10 min | sí |
| Slice 5 | revert PR | <5 min | sí |

### Production verification sequence

1. Migración staging + verify. 2. Materializador shadow → re-materializar dev → drift=0. 3. Endpoint staging 200. 4. Validación contable vs F29 real. 5. Flip flag + redeploy ops-worker. 6. Monitor 7d.

### Out-of-band coordination required

Captura de la tasa PPM del contribuyente con el contador; validación de la posición vs F29 real; redeploy ops-worker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Posición mensual de PPM materializada por (entidad legal, período), scope operating entity.
- [ ] Tasa PPM desde SSOT versionada/parametrizable; test sin hardcode.
- [ ] Base imponible leída del reader de ventas canónico (no recompute).
- [ ] `finance.ppm.position_drift` existe, wired, steady=0.
- [ ] `GET /api/finance/ppm/monthly-position` responde 200 con `legalEntity`.
- [ ] Materializador con advisory lock; sin gate de space.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- `pnpm worker:runtime-deps-gate`
- `pnpm pg:connect:shell` — query read-only materializador + signal
- `pnpm staging:request /api/finance/ppm/monthly-position`

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta (línea PPM del F29)
- [ ] `RELIABILITY_CONTROL_PLANE` Delta (signal nuevo)
- [ ] chequeo de impacto cruzado: marcar en TASK-1186 (umbrella) la sub-capacidad A como complete

## Follow-ups

- Vista F29 consolidada (IVA + PPM + Retenciones) — child E futura de TASK-1186.

## Open Questions

- ¿Existe un reader canónico único de ventas netas por entidad legal/período para la base imponible, o hay que componerlo? Resolver en Slice 1.
- ¿La tasa PPM se modela per-período (cambia en el tiempo) y per-entidad? Confirmar con contador (el SII la recalcula anualmente).
