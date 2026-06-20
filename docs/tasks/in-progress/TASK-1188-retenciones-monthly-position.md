# TASK-1188 — Retenciones monthly position (F29 línea retenciones) por entidad legal

## Delta 2026-06-20

- Precondición de período cerrada por TASK-1191 (ISSUE-103): los documentos con IVA/retenciones sincronizados desde Nubox ya nacen con `period_year`/`period_month` (el sync los estampa desde la fecha del documento + backfill de los 165 históricos). Al materializar las posiciones de retenciones por período, los docs Nubox ya tienen período poblado — no hace falta re-derivar acá. Reusar el helper canónico `getOperationalFiscalPeriod()` (`src/lib/calendar/operational-calendar.ts`) si se necesita derivar período de una fecha.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
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
- Branch: `task/TASK-1188-retenciones-monthly-position`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Child A/B de la umbrella TASK-1186 (decisión: single-RUT, prioritarias primero). Materializa la **posición mensual de retenciones** (línea retenciones del F29) por **entidad legal + período**, reusando el patrón canónico de TASK-725 (operating entity como dueño fiscal, posición por período, signal de drift, reader/endpoint gobernados). La fuente es la suma de retenciones que Efeonce **practicó** al pagar honorarios (boletas de honorarios / contractor payables retención SII) + retención de 2da categoría, con la tasa desde la SSOT versionada `SII_RETENTION_RATES` — nunca hardcode.

## Why This Task Exists

El F29 mensual tiene varias líneas; TASK-725 entregó la de IVA (`vat_monthly_positions`). La línea de **retenciones** (lo que Efeonce retiene al pagar honorarios, ~15.25% en 2026, escalonado a 17% en 2028) hoy no vive como posición fiscal materializada — el dato existe disperso en payroll/contractor pero no consolidado por entidad legal/período para el F29. Esta task lo materializa con el mismo rigor que el IVA: insumo fiscal correcto, observable (signal de drift), y consumible por UI/Nexa/CLI por construcción.

## Goal

- Posición mensual de retenciones materializada por (entidad legal, período): total retenido, conteo de documentos, desglose por tipo (honorarios / 2da categoría).
- Tasa de retención SIEMPRE desde `SII_RETENTION_RATES` (versionada por año), nunca hardcode.
- Reliability signal `finance.retention.position_drift` (steady=0): documentos con retención del período sin asiento en el ledger de retenciones.
- Reader + endpoint gobernados con degradación honesta, scopeados a la operating entity (no `space_id`).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (Delta 2026-06-20 VAT scope = entidad legal, TASK-725 — patrón a replicar 1:1)
- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` + invariantes payroll (retención honorarios SII)
- `docs/tasks/in-progress/TASK-1186-greenhouse-fiscal-positions-expansion.md` (umbrella padre)

Reglas obligatorias:

- **NUNCA** particionar la posición de retenciones por `space_id`/`client_id` — scope = entidad legal (RUT). Replicar TASK-725.
- **NUNCA** hardcodear la tasa de retención: usar `SII_RETENTION_RATES` / `getSiiRetentionRate(year)` (`src/types/hr-contracts.ts:75`).
- **SIEMPRE** emitir `finance.retention.position_drift` cuando la posición mute.
- **CUIDADO PII:** las retenciones tocan honorarios de personas; aplicar las reglas de PII/payroll (no loggear montos/identidades sensibles crudos).
- Resolver de entidad legal: `getOperatingEntityIdentity()` (singleton hoy; multi-entidad lo cubre la child D de la umbrella, no esta task).

## Normative Docs

- `docs/tasks/complete/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (foundation + patrón).
- `docs/tasks/to-do/TASK-1185-vat-materializer-fiscal-robustness-hardening.md` (hardening hermano: aplicar advisory lock + guard FX desde el inicio acá).
- Skill `greenhouse-finance-accounting-operator` (retención SII, F29).
- Skill `greenhouse-payroll-auditor` (retención honorarios, fuente del dato).

## Dependencies & Impact

### Depends on

- TASK-725 (foundation de scope fiscal por entidad legal) — complete.
- `SII_RETENTION_RATES` / `getSiiRetentionRate` (`src/types/hr-contracts.ts`).
- `getOperatingEntityIdentity()` (`src/lib/account-360/organization-identity.ts`).
- Fuente del dato de retención: `[verificar]` — boletas de honorarios / contractor payables con retención SII (revisar `src/lib/contractor-engagements/**`, `src/lib/payroll/**`, `greenhouse_finance.expenses` con `tax_recoverability`/retención).

### Blocks / Impacts

- Hermana de TASK-1189 (PPM) — ambas son líneas del F29 mensual; coordinar para una eventual vista F29 consolidada (child E futura de TASK-1186).
- Cierra parte del alcance de la umbrella TASK-1186.

### Files owned

- `migrations/` (nueva tabla `greenhouse_finance.retention_monthly_positions` + ledger `[verificar]`)
- `src/lib/finance/retention-ledger.ts` (nuevo — mirror de `vat-ledger.ts`)
- `src/lib/reliability/queries/retention-position-drift.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wiring)
- `src/app/api/finance/retention/monthly-position/route.ts` (nuevo — mirror del VAT route)
- tests asociados

## Current Repo State

### Already exists

- Patrón completo en `vat-ledger.ts` (materializador + readers + posición por entidad legal) — molde a copiar.
- `SII_RETENTION_RATES` (2024-2028) + `getSiiRetentionRate(year)`.
- Lógica de retención de honorarios en payroll/contractor (`[verificar]` el punto exacto donde se calcula/persiste la retención practicada).
- Signal pattern + wiring en `get-reliability-overview.ts`.

### Gap

- No existe tabla/posición de retenciones consolidada por entidad legal/período.
- No hay reader/endpoint/signal de retenciones.
- El dato de retención practicada puede estar disperso (payroll honorarios + contractor payables) y requiere un reader unificado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (materializa un insumo tributario F29; sign-off contable; toca datos de honorarios → PII)
- Impacto principal: `migration` (tabla nueva) + `command` (materializador) + `reader` (signal + endpoint)
- Source of truth afectado: nueva `greenhouse_finance.retention_monthly_positions` (+ ledger de asientos), materializada desde la fuente de retención practicada
- Consumidores afectados: UI Finance (card retenciones), Nexa, CLI; ops-worker (materializador reactivo)
- Runtime target: `worker` (materializador) + `app` (reader/signal)

### Contract surface

- Contrato existente a respetar: patrón TASK-725 (`materialize*ForPeriod`, readers por entidad legal, signal de drift, `canonicalErrorResponse`).
- Contrato nuevo o modificado: `materializeRetentionLedgerForPeriod(year, month, reason)`; readers `getRetentionMonthlyPosition` / `listRetentionMonthlyPositions` / `listRetentionLedgerEntries`; endpoint `GET /api/finance/retention/monthly-position`; signal `finance.retention.position_drift`.
- Backward compatibility: `compatible` (additive; no toca IVA ni payroll).
- Full API parity: posición de retenciones como reader/endpoint gobernado, consumible por Nexa por construcción.

### Data model and invariants

- Entidades/tablas afectadas: nuevas `retention_monthly_positions` + `retention_ledger_entries` (`[verificar]` nombres); fuente de retención practicada (lectura).
- Invariantes:
  - Scope = entidad legal (operating entity), NUNCA `space_id`/`client_id`.
  - Tasa desde `SII_RETENTION_RATES`, NUNCA hardcode.
  - Posición por (entidad, período) única (unique constraint como TASK-725).
  - Signal `finance.retention.position_drift` steady=0.
- Tenant/space boundary: retenciones son de la entidad legal (internas); jamás client-facing.
- Idempotency/concurrency: materializador DELETE+INSERT por (entidad, período) con **advisory lock** (`pg_advisory_xact_lock`) desde el inicio (lección TASK-1185).
- Audit/outbox/history: `materialized_at` + razón; outbox event `finance.retention_position.period_materialized` si aplica reactivo.

### Migration, backfill and rollout

- Migration posture: `additive` (tablas nuevas con markers correctos + DO block anti pre-up-marker + GRANTs runtime).
- Default state: materializador gateado con flag default OFF + shadow (patrón TASK-725).
- Backfill plan: re-materializar períodos con retención + validación contable vs F29 real.
- Rollback path: flag off / revert PR / reverse migration; redeploy ops-worker si toca materializador.
- External coordination: validación contable de la cifra de retenciones vs F29 real; redeploy ops-worker.

### Security and access

- Auth/access gate: `requireFinanceTenantContext`; endpoint scopeado a operating entity.
- Sensitive data posture: `finance` + **PII (honorarios de personas)** — aplicar reglas payroll, no exponer identidades/montos sensibles crudos.
- Error contract: `canonicalErrorResponse` (reusar `fiscal_entity_unavailable` si no hay operating entity); `captureWithDomain(err,'finance',...)`.
- Abuse/rate-limit posture: N/A (lectura interna).

### Runtime evidence

- Local checks: tests del materializador (incluye retención correcta por tasa versionada) + signal.
- DB/runtime checks: query read-only vs PG (gate TASK-893) de los CTEs; re-materializar dev + drift=0.
- Integration checks: `staging:request /api/finance/retention/monthly-position` → 200 con `legalEntity`.
- Reliability signals/logs: `finance.retention.position_drift` en `/admin/operations`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Source of truth de la retención practicada nombrado con path real (resuelto en Discovery).
- [ ] Tasa desde `SII_RETENTION_RATES`; sin hardcode (test que verifica la tasa por año).
- [ ] Migración/rollback proporcional (additive + flag).
- [ ] Evidencia DB/runtime (drift=0) listada.
- [ ] PII de honorarios protegida (sin leaks).

## Capability Definition of Done — Full API Parity gate

Si el endpoint expone solo lectura → reader canónico (sin capability nueva). Si expone acción (recálculo/cierre de período) → capability fina + grant en el mismo PR (TASK-873/935). Consumible por Nexa por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery del source-of-truth de retención practicada

- Confirmar dónde vive el dato de retención que Efeonce practicó (honorarios payroll + contractor payables + `expenses`) y cómo unificarlo por período. Ejercitar la query vs PG real (gate TASK-893).

### Slice 2 — Migración: tablas de posición + ledger de retenciones

- `retention_monthly_positions` + `retention_ledger_entries` (mirror de las VAT), scope = entidad legal, unique `(organization_id, period_year, period_month)`, markers + DO block + GRANTs.

### Slice 3 — Materializador

- `materializeRetentionLedgerForPeriod` (mirror de `materializeVatLedgerForPeriod`): scope operating entity, tasa desde `SII_RETENTION_RATES`, advisory lock, sin gate de space.

### Slice 4 — Reader + endpoint + card

- Readers por operating entity + `GET /api/finance/retention/monthly-position` (estado tipado, degradación honesta) + (opcional) card en el dashboard Finance.

### Slice 5 — Signal + tests + docs

- `finance.retention.position_drift` (steady=0) + test anti-regresión + Delta en arch doc + closing.

## Out of Scope

- PPM (TASK-1189) y F22 (child futura de TASK-1186).
- Multi-entidad (child D de TASK-1186) — esta task usa el singleton.
- Cálculo de la retención en sí (eso vive en payroll/contractor); esta task **consolida** lo ya retenido en una posición fiscal.
- Envío real del F29 a SII.

## Detailed Spec

Mirror 1:1 del patrón TASK-725 (`vat-ledger.ts` → `retention-ledger.ts`). Diferencias: la fuente es la retención practicada (no IVA), la tasa viene de `SII_RETENTION_RATES`, y los buckets son por tipo de retención (honorarios / 2da categoría) en vez de débito/crédito. Aplicar desde el inicio las lecciones de TASK-1185 (advisory lock, guard FX si hubiera no-CLP — honorarios suelen ser CLP).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (discovery del source) → Slice 2 (migración) → Slice 3 (materializador) → Slice 4 (reader/endpoint) → Slice 5 (signal/docs). Slice 3+ requieren redeploy ops-worker (mismo patrón TASK-725 B).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Doble conteo de retención (payroll + contractor) | finance | medium | unificar source en Slice 1; dedupe por documento; test | `finance.retention.position_drift` |
| Tasa hardcodeada/desactualizada | finance/payroll | low | `SII_RETENTION_RATES` versionada + test por año | drift signal |
| PII de honorarios expuesta | finance/identity | medium | reglas payroll; no loggear identidades/montos crudos | revisión + captureWithDomain |
| Cifra incorrecta sin validación contable | finance | high | sign-off contador vs F29 real antes de baseline | — |

### Feature flags / cutover

Materializador gateado con `RETENTION_POSITION_ENABLED` (default OFF) + shadow, igual que TASK-725. Flip post-validación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | reverse migration (DROP tablas nuevas) | <15 min | sí |
| Slice 3 | flag OFF / revert PR + redeploy ops-worker | <30 min | sí |
| Slice 4 | revert PR | <10 min | sí |
| Slice 5 | revert PR | <5 min | sí |

### Production verification sequence

1. Migración a staging + verify tablas. 2. Materializador shadow (flag OFF) → re-materializar dev → drift=0. 3. Endpoint staging 200. 4. Validación contable vs F29 real. 5. Flip flag. 6. Redeploy ops-worker. 7. Monitor signal 7d.

### Out-of-band coordination required

Validación contable de la posición de retenciones vs F29 real; redeploy ops-worker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Posición mensual de retenciones materializada por (entidad legal, período), scope operating entity (no `space_id`).
- [ ] Tasa desde `SII_RETENTION_RATES`; test verifica la tasa por año.
- [ ] `finance.retention.position_drift` existe, wired, steady=0 post re-materialización.
- [ ] `GET /api/finance/retention/monthly-position` responde 200 con `legalEntity` (sesión admin interno).
- [ ] Materializador con advisory lock; sin gate de space.
- [ ] PII de honorarios protegida (sin leaks en logs/response).

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- `pnpm worker:runtime-deps-gate` (toca worker-bundled)
- `pnpm pg:connect:shell` — query read-only del materializador + signal
- `pnpm staging:request /api/finance/retention/monthly-position`

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta (línea retenciones del F29)
- [ ] `RELIABILITY_CONTROL_PLANE` Delta (signal nuevo)
- [ ] chequeo de impacto cruzado: marcar en TASK-1186 (umbrella) la sub-capacidad B como complete

## Follow-ups

- Vista F29 consolidada (IVA + PPM + Retenciones) — child E futura de TASK-1186.

## Open Questions

- ¿La fuente única de retención practicada es payroll (honorarios) + contractor payables, o hay otra? Resolver en Slice 1 Discovery.
- ¿La retención de 2da categoría aplica hoy a Efeonce, o solo honorarios? Verificar con contador.
