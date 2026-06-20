# TASK-1196 — Posición de Renta Anual (F22) por entidad legal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `migration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-1196-renta-anual-f22-position`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Child C de la umbrella TASK-1186. Materializa la **posición de Renta Anual (F22)** por entidad legal y año tributario: Renta Líquida Imponible (RLI) anual, tasa IDPC según régimen tributario, IDPC determinado, créditos (PPM pagados del año, otros créditos), y resultado a pagar/devolver. Reusa el patrón canónico de TASK-725 (operating entity, posición por período, signal de drift, reader/endpoint gobernados) llevado al grano **anual**. A diferencia de las líneas mensuales del F29, el F22 es la declaración anual del impuesto a la renta de primera categoría.

## Why This Task Exists

Con IVA + Retenciones + PPM (TASK-725/1188/1189) las 3 líneas mensuales del F29 están materializadas. Falta la **renta anual (F22)**: el impuesto de primera categoría (IDPC) sobre la utilidad tributaria del año, contra el cual los PPM mensuales son pagos a cuenta. Hoy no vive como posición fiscal en Greenhouse. Esta task la modela con el mismo rigor, cerrando el ciclo fiscal (mensual F29 + anual F22). Es P3 (anual, no urgente; el ciclo mensual es la prioridad operativa) pero Alto impacto y Alto effort por la complejidad del régimen tributario.

## Goal

- Posición F22 anual materializada por (entidad legal, año tributario): RLI, tasa IDPC, IDPC determinado, PPM acreditables del año, otros créditos, resultado a pagar/devolver.
- Tasa IDPC y régimen tributario desde una SSOT parametrizable/versionada (régimen ProPyme 14D N°3 / 14D N°8 transparente / 14A general; tasa transitoria 12.5% 2025-2026 vs 25%/27%) — NUNCA hardcode.
- Reusar las posiciones mensuales ya materializadas como insumo donde aplique (PPM anual = suma de los PPM mensuales acreditables).
- Reliability signal `finance.f22.position_drift` (steady=0).
- Reader + endpoint gobernados, scope operating entity.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` (patrón de posiciones fiscales por entidad legal: TASK-725/1188/1189)
- `docs/tasks/in-progress/TASK-1186-greenhouse-fiscal-positions-expansion.md` (umbrella)
- `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` `[verificar]` (el resultado tributario anual depende del P&L / utilidad del giro)

Reglas obligatorias:

- **NUNCA** particionar la posición F22 por `space_id`/`client_id` — scope = entidad legal (RUT).
- **NUNCA** hardcodear la tasa IDPC ni el régimen tributario: viven en una SSOT parametrizable/versionada (la tasa la fija la ley y cambia — 12.5% transitorio 2025-2026, 25% ProPyme general, 27% 14A; el régimen es per-contribuyente). Mismo patrón que `ppm_rate_config` de TASK-1189.
- **NUNCA** computar la RLI inline desde income/expenses crudos sin pasar por el reader de resultado canónico (respetar `no-untokenized-fx-math` / VIEWs CLP). La RLI tributaria ≠ utilidad contable: requiere ajustes (gastos rechazados Art 21, etc.) — esta task modela la estructura; el detalle de ajustes se valida con el contador.
- **SIEMPRE** emitir `finance.f22.position_drift` cuando la posición mute.
- Resolver de entidad legal: `getOperatingEntityIdentity()` (singleton; multi-entidad = child D).

## Normative Docs

- `docs/tasks/complete/TASK-725-finance-fiscal-scope-legal-entity-foundation.md` (foundation + patrón).
- `docs/tasks/complete/TASK-1189-ppm-monthly-position.md` (PPM = crédito contra IDPC; patrón de SSOT de tasa parametrizable).
- Skill `greenhouse-finance-accounting-operator` (Chile SII: F22, IDPC, regímenes 14D/14A, RLI, créditos).

## Dependencies & Impact

### Depends on

- TASK-725 (foundation de scope fiscal por entidad legal) — complete.
- `getOperatingEntityIdentity()` (`src/lib/account-360/organization-identity.ts`).
- PPM mensual (TASK-1189) — los PPM del año son crédito acreditable contra el IDPC; reusar `listPpmMonthlyPositions` / `ppm_monthly_positions`.
- Reader de resultado/utilidad anual por entidad legal (base de la RLI) — `[verificar]`: `operational_pl` / management accounting / income+expenses agregados por año.
- SSOT de tasa IDPC + régimen tributario — `[verificar]`: no existe hoy; esta task la introduce (config/tabla parametrizable per-contribuyente/año, mirror de `ppm_rate_config`).

### Blocks / Impacts

- Cierra el ciclo fiscal anual sobre las posiciones mensuales (cierra parte de la umbrella TASK-1186).
- Se relaciona con TASK-394 (`management-accounting-scope-expansion-bu-legal-entity-intercompany`) `[verificar]` para el cómputo de utilidad por entidad legal.

### Files owned

- `migrations/` (tabla `greenhouse_finance.f22_annual_positions` + SSOT de tasa/régimen IDPC `[verificar]`)
- `src/lib/finance/f22-ledger.ts` (nuevo — mirror de `ppm-ledger.ts` al grano anual)
- `src/lib/reliability/queries/f22-position-drift.ts` (nuevo)
- `src/lib/reliability/get-reliability-overview.ts` (wiring)
- `src/app/api/finance/f22/annual-position/route.ts` (nuevo)
- tests asociados

## Current Repo State

### Already exists

- Patrón completo de posición fiscal por entidad legal (`vat-ledger.ts` / `retention-ledger.ts` / `ppm-ledger.ts`) — molde a copiar.
- PPM mensual materializado (crédito acreditable).
- SSOT de tasa parametrizable (`ppm_rate_config`) como patrón a replicar para la tasa IDPC.
- Régimenes tributarios Chile documentados en la skill `greenhouse-finance-accounting-operator` (14D N°3 25%/12.5% transitorio, 14D N°8 transparente, 14A 27%).

### Gap

- No existe posición F22 ni SSOT de tasa/régimen IDPC.
- No hay reader canónico confirmado de RLI/utilidad tributaria anual por entidad legal (la RLI ≠ utilidad contable; requiere ajustes Art 21/31).
- No hay reader/endpoint/signal de F22.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (materializa el impuesto a la renta anual; régimen tributario complejo; sign-off contable obligatorio)
- Impacto principal: `migration` (tabla posición + SSOT tasa/régimen) + `command` (materializador) + `reader` (signal + endpoint)
- Source of truth afectado: nueva `greenhouse_finance.f22_annual_positions`; RLI leída del reader de resultado anual; PPM acreditable de `ppm_monthly_positions`; tasa/régimen de SSOT nueva
- Consumidores afectados: UI Finance, Nexa, CLI/contador; ops-worker (materializador)
- Runtime target: `worker` + `app`

### Contract surface

- Contrato existente a respetar: patrón TASK-725/1189; reader de resultado anual (no recomputar inline).
- Contrato nuevo o modificado: `materializeF22ForYear(taxYear, reason)`; readers `getF22AnnualPosition` / `listF22AnnualPositions`; endpoint `GET /api/finance/f22/annual-position`; signal `finance.f22.position_drift`; SSOT de tasa/régimen IDPC.
- Backward compatibility: `compatible` (additive).
- Full API parity: posición F22 como reader/endpoint gobernado, consumible por Nexa por construcción.

### Data model and invariants

- Entidades/tablas afectadas: nueva `f22_annual_positions`; SSOT tasa/régimen IDPC; readers de resultado anual + PPM (lectura).
- Invariantes:
  - Scope = entidad legal (operating entity), NUNCA `space_id`/`client_id`.
  - Tasa IDPC + régimen desde SSOT versionada/parametrizable, NUNCA hardcode.
  - PPM acreditable = suma de los PPM mensuales del año (vía `ppm_monthly_positions`), no recomputar.
  - Posición única por (entidad, año tributario); signal drift steady=0.
- Tenant/space boundary: F22 es de la entidad legal (interno).
- Idempotency/concurrency: DELETE+INSERT por (entidad, año) con advisory lock (lección TASK-1185).
- Audit/outbox/history: `materialized_at` + razón; régimen + tasa aplicada quedan como evidencia en la fila.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla posición + tabla/config de tasa/régimen IDPC; markers + DO block + GRANTs).
- Default state: materializador gateado con flag default OFF + shadow (patrón TASK-1189).
- Backfill plan: re-materializar años con data + validación contable vs F22 real del contribuyente.
- Rollback path: flag off / revert PR / reverse migration; redeploy ops-worker.
- External coordination: **fuerte dependencia del contador** — régimen tributario del contribuyente, ajustes RLI (Art 21/31), tasa vigente, créditos. La cifra NO es declarable sin sign-off contable.

### Security and access

- Auth/access gate: `requireFinanceTenantContext`; scope operating entity.
- Sensitive data posture: `finance` (cifras tributarias; sin PII de terceros — F22 es agregado anual de la entidad).
- Error contract: `canonicalErrorResponse('fiscal_entity_unavailable')`; `captureWithDomain(err,'finance',...)`.
- Abuse/rate-limit posture: N/A (lectura interna).

### Runtime evidence

- Local checks: tests del materializador (RLI × tasa − créditos, tasa por año/régimen desde SSOT).
- DB/runtime checks: query read-only vs PG (gate TASK-893); re-materializar dev + drift=0.
- Integration checks: `staging:request /api/finance/f22/annual-position` → 200 con `legalEntity`.
- Reliability signals/logs: `finance.f22.position_drift`.
- Production verification sequence: ver Rollout.

### Acceptance criteria additions

- [ ] Source of truth de la RLI/utilidad anual nombrado con path real (resuelto en Discovery).
- [ ] Tasa IDPC + régimen desde SSOT parametrizable; sin hardcode (test por año/régimen).
- [ ] PPM acreditable leído de `ppm_monthly_positions` (no recomputar).
- [ ] Migración/rollback proporcional (additive + flag).
- [ ] Evidencia DB/runtime (drift=0) + sign-off contable declarado como gate de baseline.

## Capability Definition of Done — Full API Parity gate

Lectura → reader canónico (sin capability nueva). Si se expone una acción (recálculo/ajuste de régimen) → capability fina + grant en el mismo PR (TASK-873/935). Consumible por Nexa por construcción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — SSOT de tasa/régimen IDPC + Discovery del resultado anual

- Modelar la tasa IDPC + régimen tributario como SSOT versionada/parametrizable (per-contribuyente/año; mirror de `ppm_rate_config`). Confirmar el reader canónico de resultado/utilidad anual por entidad legal (base de la RLI) y la regla de ajustes mínima a modelar. Validar la regla con el contador. Ejercitar query vs PG real.

### Slice 2 — Migración: tabla de posición F22 (+ tasa/régimen)

- `f22_annual_positions` scope entidad legal, unique `(organization_id, tax_year)`, markers + DO block + GRANTs; tabla/config de tasa/régimen IDPC con seed placeholder flagged `pending_contador`.

### Slice 3 — Materializador

- `materializeF22ForYear`: RLI (vía reader de resultado anual) × tasa IDPC (SSOT por régimen) = IDPC determinado; − PPM acreditable del año (suma de `ppm_monthly_positions`) − otros créditos = resultado a pagar/devolver. Scope operating entity, advisory lock.

### Slice 4 — Reader + endpoint

- Readers por operating entity + `GET /api/finance/f22/annual-position` (estado tipado, degradación honesta).

### Slice 5 — Signal + tests + docs

- `finance.f22.position_drift` (steady=0) + test anti-regresión + Delta arch doc + closing.

## Out of Scope

- Líneas mensuales del F29 (IVA/retenciones/PPM ya hechas) y vista consolidada mensual (TASK-1195).
- Multi-entidad (child D de TASK-1186) — usa singleton.
- El cómputo fino de la RLI tributaria con TODOS los ajustes legales (Art 21/31, RAI/REX/SAC, gastos rechazados): esta task modela la estructura + los ajustes principales que valide el contador; el detalle exhaustivo es iterativo con el contador, no se hardcodea.
- Determinar el régimen "correcto" del contribuyente (lo aporta el contador).
- Envío real del F22 a SII.

## Detailed Spec

Mirror del patrón TASK-1189 al grano anual. F22 = RLI anual × tasa IDPC (según régimen, desde SSOT) − créditos (PPM del año + otros). La RLI se lee del reader de resultado anual canónico `[verificar]` (no se recomputa inline). La tasa/régimen vive en una tabla config parametrizable (mirror de `ppm_rate_config`), con seed placeholder pendiente de contador. Advisory lock desde el inicio. La complejidad real (ajustes RLI, regímenes, créditos) se itera con el contador — esta task entrega la estructura materializada + observable, no la verdad fiscal definitiva sin sign-off.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (SSOT tasa/régimen + reader resultado) → Slice 2 (migración) → Slice 3 (materializador) → Slice 4 (endpoint) → Slice 5 (signal/docs). Slice 3+ requieren redeploy ops-worker. La validación contable es gate de baseline productivo (no de la materialización shadow).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| RLI mal computada (ajustes tributarios faltantes) | finance | high | modelar estructura + ajustes con contador; shadow + sign-off antes de baseline | `finance.f22.position_drift` |
| Tasa/régimen IDPC incorrecto o desactualizado | finance | medium | SSOT parametrizable + captura con contador; test por año/régimen | drift signal |
| PPM acreditable doble-contado o mal sumado | finance | medium | leer de `ppm_monthly_positions` (no recomputar); test | drift signal |
| Cifra declarada sin validación contable | finance | high | sign-off contador vs F22 real; flag OFF hasta entonces | — |

### Feature flags / cutover

Materializador gateado con `F22_POSITION_ENABLED` (default OFF) + shadow, igual que TASK-1189. Flip post-validación contable. Revert: env var a `false` + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 2 | reverse migration (DROP tablas nuevas) | <15 min | sí |
| Slice 3 | flag OFF / revert PR + redeploy ops-worker | <30 min | sí |
| Slice 4 | revert PR | <10 min | sí |
| Slice 5 | revert PR | <5 min | sí |

### Production verification sequence

1. Migración a staging + verify tablas/seed. 2. Materializador shadow (flag OFF) → re-materializar dev → drift=0. 3. Endpoint staging 200. 4. **Validación contable vs F22 real** (régimen, RLI, tasa, créditos). 5. Flip flag. 6. Redeploy ops-worker. 7. Monitor signal.

### Out-of-band coordination required

**Fuerte coordinación con el contador**: régimen tributario del contribuyente, ajustes RLI, tasa IDPC vigente, créditos acreditables, y validación de la cifra resultante vs el F22 real antes de cualquier baseline productivo. Redeploy ops-worker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Posición F22 anual materializada por (entidad legal, año tributario), scope operating entity (no `space_id`).
- [ ] Tasa IDPC + régimen desde SSOT parametrizable; test verifica la tasa por año/régimen sin hardcode.
- [ ] RLI leída del reader de resultado anual canónico (no recompute inline).
- [ ] PPM acreditable leído de `ppm_monthly_positions` (no recomputar).
- [ ] `finance.f22.position_drift` existe, wired, steady=0 post re-materialización.
- [ ] `GET /api/finance/f22/annual-position` responde 200 con `legalEntity`.
- [ ] Materializador con advisory lock; sin gate de space.
- [ ] Validación contable declarada como gate de baseline (flag OFF hasta sign-off).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test`
- `pnpm worker:runtime-deps-gate` (toca worker-bundled)
- `pnpm pg:connect:shell` — query read-only del materializador + signal
- `pnpm staging:request /api/finance/f22/annual-position`

## Closing Protocol

- [ ] `Lifecycle: complete` + mover a `complete/`
- [ ] `README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` Delta (renta anual F22)
- [ ] `RELIABILITY_CONTROL_PLANE` Delta (signal nuevo)
- [ ] `FEATURE_FLAG_STATE_LEDGER` fila `F22_POSITION_ENABLED`
- [ ] chequeo de impacto cruzado: marcar en TASK-1186 (umbrella) la child C como complete

## Follow-ups

- Cómputo fino de la RLI con ajustes legales completos (Art 21/31, RAI/REX/SAC) — iterativo con el contador, posible task derivada.
- Multi-entidad (child D de TASK-1186) — varios RUT con regímenes distintos.
- Vista consolidada anual (F22 + resumen del F29 mensual del año).

## Open Questions

- ¿Existe un reader canónico de resultado/utilidad anual por entidad legal del cual derivar la RLI, o hay que componerlo desde income+expenses + management accounting? Resolver en Slice 1.
- ¿Qué régimen tributario aplica a Efeonce (14D N°3 ProPyme general, 14D N°8 transparente, o 14A)? Define la tasa (12.5% transitorio 2025-2026 vs 25% vs 27%) y el tratamiento de créditos. Validar con contador.
- ¿Qué nivel de ajustes RLI se modela en V1 (estructura + principales) vs se difiere al contador? Resolver en Slice 1.
