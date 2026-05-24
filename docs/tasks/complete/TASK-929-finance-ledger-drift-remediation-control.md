# TASK-929 — Finance ledger drift remediation control

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `optional`
- Status real: `Scope reducido entregado 2026-05-24 (VIEW fix + honest degradation + signal + inventory + docs). Queue/remediator → TASK-934. 4Q honesto-abierto hasta TASK-934 + TASK-714d.`
- Rank: `TBD`
- Domain: `finance|accounting|data|reliability`
- Blocked by: `none`
- Branch: `task/TASK-929-finance-ledger-drift-remediation-control`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Remediar `JAVASCRIPT-NEXTJS-4Q` como deuda contable real, no como ruido Sentry. La task separa settlement drift resoluble por reconciliacion canonica de gastos pagados sin anchor, que requieren evidencia supplier/tool/payroll/tax/loan/linked income o cola de revision humana.

## Implementación entregada (2026-05-24, directo en `develop`)

Scope reducido por decisión del operador (inventory + docs + flag; queue/remediator diferidos a **TASK-934**). 4 slices + docs, todo verde (full suite 5390 passed, build OK).

| Slice | Commit | Entrega |
|---|---|---|
| 1 | `f171a506` | Migración: `income_settlement_reconciliation` excluye superseded en `payments_total` (alinea con `fn_recompute_income_amount_paid`). Causa raíz de 2/4 settlement drifts. Drift settlement 4→0. Cero mutación de ledger. DO-block verifica. |
| 2 | `951497e5` | `getFinanceLedgerHealth` honest degradation: `tracked()` + `degradedChecks[]`; `healthy` exige sin check DECISION_CRITICAL degradado. Mata el false-healthy (bug descubierto en discovery). ops-worker propaga degradedChecks. 3 tests. |
| 3 | `851822f4` | Signal `finance.ledger.unresolved_drift_items` (tiered: settlement=error, unanchored=warning). Wire-up canónico. 4 tests. |
| 4 | `463fc958` | Inventory read-only `getLedgerDriftInventory()` + CLI `scripts/finance/ledger-drift-inventory.ts`. Routing por materialidad ($50k default, env-configurable). 3 tests. |
| 5 | (este) | Docs: CLAUDE.md invariantes + changelog + README + Handoff. Derivada TASK-934. |

### Hallazgo central (lente finance + arch)

Los 4 settlement drifts de 4Q NO eran deuda contable: **2 falsos positivos de la VIEW** (facturas factorizadas cuyo pago NUBOX superseded se contaba doble — la VIEW no filtraba supersede mientras el `fn` sí) + **2 transitorios stale** (ya consistentes vía sync). El fix canónico fue **alinear la VIEW al `fn`**, no mutar el ledger. Bonus: el discovery expuso que `getFinanceLedgerHealth` podía reportar `healthy=true` falso (swallowed errors) — arreglado en Slice 2.

### Residuales — 4Q NO cierra todavía (honesto-abierto)

1. **37 gastos pagados sin FK-anchor** ($8.2M; 21 material, 16 inmaterial; todos con `economic_category` → data-completeness, no integridad) → **TASK-934** (cola de revisión + anchoring + acknowledgedDebt + recompute remediator).
2. **3 internal_transfer imbalance** (`stlgrp-itx-20260306-amcg`, `-20260312-l45c`, `-20260406-9uwu`; ~$2.3M outgoing desde santander-clp sin pata incoming) → **OUT OF SCOPE, TASK-714d** (`createInternalTransferSettlement`). Necesita identificar las cuentas destino (conocimiento finance).

El cron `ops-finance-ledger-health` reporta `healthy=false` honestamente hasta resolver ambos. El signal `finance.ledger.unresolved_drift_items` (warning por los 37) + el cron son la visibilidad ongoing. **Cerrar `JAVASCRIPT-NEXTJS-4Q` en Sentry solo cuando TASK-934 + TASK-714d converjan a 0 sostenido 24-48h.**

## Why This Task Exists

El health check diario de finance ledger sigue detectando drift. En esta sesion se agrego dedupe/audit a la alerta para que Sentry avise cuando la firma cambia materialmente, pero no se debe ocultar el estado unhealthy ni autoclasificar contabilidad sin evidencia suficiente.

## Delta 2026-05-24 — Revision dual de skills (finance + arquitectura)

Revision con `greenhouse-finance-accounting-operator` (lente contable) y `arch-architect` (lente de arquitectura). La task estaba bien encuadrada (separa drift resoluble por ecuacion de gastos sin ancla; prohibe autoclasificar sin evidencia). Se incorporan 6 refinamientos vinculantes antes de pasar a `in-progress`. Encajan en la estructura de slices existente — no es reescritura.

### Clasificacion contable de los 3 drifts en scope

Cada drift es un problema contable distinto con tratamiento distinto. No tratarlos como una sola clase:

| Drift | Naturaleza contable | Tratamiento correcto | Fuente runtime |
|---|---|---|---|
| **Settlement drift** | Integridad de ledger AR. La ecuacion `amount_paid = cash + factoring_fee + withholding` es conocida → es reconciliacion, NO write-off. | Asiento de reclasificacion / ajuste de conciliacion. Nunca perdida. | VIEW `income_settlement_reconciliation` (TASK-571) |
| **Phantom payments** | Cash no identificado: Nubox movio plata sin anclar a cuenta. Rompe bank rec + `account_balances`. | Cuenta puente / clearing hasta identificar la cuenta origen. | `*_payments.payment_account_id IS NULL AND NOT superseded` |
| **Unanchored paid expense** | Gasto reconocido sin centro de costo ni proveedor → no mapea a `economic_category`/`expense_type` → contamina P&L y cost attribution (TASK-709/ICO). | **Cuenta de suspenso** hasta que llegue evidencia. NUNCA fabricar vendor. | `expenses.payment_status='paid'` con todos los anchors NULL ([ledger-health.ts:603](../../../src/lib/finance/ledger-health.ts)) |

### Refinamiento 1 — Materialidad (contable, GAP duro)

La task no tenia umbral de materialidad. Un auditor no revisa manualmente cada $1 de drift; el remediator FX ya usa tolerancia $1 CLP anti-ruido (TASK-871). Definir **performance materiality** por tipo: settlement drift con tolerancia $X CLP; unanchored expenses bucketizados por monto (alto → revision humana, inmaterial → batch-accept con politica documentada). Sin esto la cola de revision se llena de ruido inmaterial y la deuda nunca cierra. Va en Slice 1 (bucketizar) + Slice 3 (politica de aceptacion).

### Refinamiento 2 — Capability granular (arquitectura, GAP duro de Safety)

Faltaba la capa de autorizacion least-privilege. Defense-in-depth para un write-path financiero exige capability dedicada, no rol generico. Patron fuente: `finance.payments.repair_clp` / `finance.payment_orders.recover`. Crear:

- `finance.ledger.remediate_settlement` (FINANCE_ADMIN + EFEONCE_ADMIN).
- `finance.ledger.resolve_unanchored` (clasificar/anclar).
- Write-off de unanchored expense → **segundo actor distinto** del que clasifica (FINANCE_ADMIN).

Seed en `capabilities_registry` + TS catalog + runtime grant en el mismo PR del slice (regla TASK-873).

### Refinamiento 3 — Identidad estable del drift item (arquitectura, open question critica)

Los drifts se **recomputan** en cada corrida (son derivados, samples LIMIT 20). La cola de revision necesita clave natural estable o duplica items entre corridas. Reusar el concepto `driftSignature` ya construido ([server.ts:1317](../../../services/ops-worker/server.ts)): clave determinista = `hash(drift_type + source_row_id)`. Es el problema de identidad de entidad derivada — sin esto la idempotencia de la cola no se sostiene.

### Refinamiento 4 — Extender el remediator FX existente (arquitectura, regla canonica #4)

NO inventar framework de remediacion nuevo. Extender el primitivo canonico [`account-balances-fx-drift-remediation.ts`](../../../src/lib/finance/account-balances-fx-drift-remediation.ts) que ya tiene la forma exacta: `policy` enum, `dryRun` default, `decision` kinds (`auto_remediable`/`needs_human_review`/`blocked_out_of_policy`/`skipped`), `evidenceGuard` modes (`block_on_reconciled_drift`/`warn_only`/`off`), plan/result shape. Settlement reconciliation reusa `evidenceGuard: 'block_on_reconciled_drift'` para NO restatear sobre periodos conciliados (TASK-721).

### Refinamiento 5 — `acknowledgedDebt` separado de `healthy` (arquitectura + contable)

Equivale al **SUM (Summary of Unadjusted Misstatements)** de auditoria. Mantener `healthy` honesto (sigue siendo el AND de las ~10 dimensiones — [ledger-health.ts:795](../../../src/lib/finance/ledger-health.ts)). Anadir dimension **separada** `acknowledgedDebt` (append-only: monto + razon + quien acepto + fecha) para que el dashboard muestre "unhealthy pero reconocido". NUNCA colapsar ambas ni flip silencioso a `healthy=true` (anti-pattern Pillar 3: deshonestidad de degradacion).

### Refinamiento 6 — Alcance real del cierre de `JAVASCRIPT-NEXTJS-4Q` (arquitectura, gap de scope)

`4Q` dispara sobre `healthy=false`, que es el AND de ~10 dimensiones: settlement, phantoms, freshness, unanchored **+ task708, task708d, task714d, task720, task721**. Esta task aborda solo 3. Para cerrar `4Q` de verdad las otras ~6 dimensiones deben estar en 0 o aceptadas. Slice 1 debe incluir un **snapshot preflight del estado actual de las 6 dimensiones fuera de scope** para determinar si `4Q` cierra solo con esta task o requiere tasks adicionales. No prometer cierre Sentry sin esa verificacion.

### Cola de revision = flujo de cuenta de suspenso (state machine + CHECK + audit)

Modelar la cola (Slice 3) como suspense account con el trio canonico:

- `drift_type` enum cerrado: `settlement_reconciliation | phantom_payment | unanchored_paid_expense`. NO string libre.
- Estados: `pending → classified → resolved | written_off | dismissed`. CHECK en DB + trigger anti-transicion ilegal.
- **No mezclar dimensiones ortogonales en una columna**: drift_type (que es) vs estado del lifecycle vs candidate_anchor (supplier/tool/payroll/tax/loan/linked_income) = tres columnas separadas.
- Append-only audit (anti-UPDATE/anti-DELETE), owner + reason, idempotency key = clave del Refinamiento 3.

### Escalamiento contable

- Settlement drift sobre periodo conciliado/cerrado → **restatement** (materialidad cualitativa siempre). Escalar a controller + auditor externo antes de restatear.
- Write-off de unanchored expense → segundo actor.
- Drift agregado > materialidad de revenue (~0.5-1%) → no es ruido Sentry, es hallazgo material.

## Goal

- Clasificar cada drift por tipo contable y fuente de verdad, con umbral de materialidad por tipo.
- Remediar settlement drift extendiendo el remediator canonico FX (`account-balances-fx-drift-remediation.ts`) con `evidenceGuard: 'block_on_reconciled_drift'`.
- Enviar expenses pagados sin anchor a una cola de revision modelada como cuenta de suspenso (state machine + CHECK + audit) si no hay evidencia contable suficiente.
- Mantener una senal visible de deuda conocida (`acknowledgedDebt` separado de `healthy`, estilo SUM de auditoria) hasta que el ledger quede reconciliado.
- Gobernar todo write-path con capability granular least-privilege + clave de idempotencia estable por drift item.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/audits/sentry/SENTRY_WEEKLY_REMEDIATION_AUDIT_2026-05-24.md`

Primitivo canonico a extender (NO inventar nuevo):

- `src/lib/finance/account-balances-fx-drift-remediation.ts` — `policy` enum, `dryRun` default, `decision` kinds, `evidenceGuard` modes, plan/result shape. Es la forma de remediation a reusar (regla canonica #4).
- VIEW `income_settlement_reconciliation` (TASK-571) — fuente del settlement drift.
- Helpers `dismissIncomePhantom` / `dismissExpensePhantom` (TASK-708b) — para phantoms.
- `services/ops-worker/server.ts:1317` `buildFinanceLedgerDriftSignature` — base de la clave de idempotencia.

Reglas obligatorias:

- No mutar ledger sin `pnpm pg:doctor` y dry-run previo.
- No clasificar expenses sin anchor si falta evidencia contable. NUNCA fabricar un vendor/anchor para vaciar la cola (fraude documental).
- No esconder `JAVASCRIPT-NEXTJS-4Q`; solo resolver cuando el drift sea cero o aceptado con decision contable documentada. `healthy` se mantiene honesto (AND de las ~10 dimensiones); la deuda aceptada vive en `acknowledgedDebt` separado, nunca flip silencioso.
- Todo write path debe pasar por capability granular least-privilege, dejar audit trail append-only, idempotency key estable por drift item y rollback/compensation plan.
- Settlement reconciliation NO restatea sobre periodos conciliados/cerrados sin escalamiento a controller + auditor externo (`evidenceGuard: 'block_on_reconciled_drift'`).
- Write-off de unanchored expense requiere segundo actor distinto del que clasifica.
- Auto-apply de cualquier mutacion requiere flag/env explicito + allowlist de drift IDs o periodos; default dry-run.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `services/ops-worker/server.ts` registra health runs `finance_ledger_health` con `driftSignature`.
- `src/lib/finance/ledger-health.ts` (`getFinanceLedgerHealth`) — fuente de las dimensiones de drift.
- `src/lib/finance/account-balances-fx-drift-remediation.ts` — primitivo de remediation a extender.
- VIEW `income_settlement_reconciliation` (TASK-571); helpers `dismissIncomePhantom`/`dismissExpensePhantom` (TASK-708b).
- `capabilities_registry` + TS catalog + runtime grant (para las 2 capabilities nuevas).

### Blocks / Impacts

- Cierre real de `JAVASCRIPT-NEXTJS-4Q` (condicionado al preflight de Slice 1 sobre las 6 dimensiones fuera de scope).
- Menos ruido Sentry sin perder visibilidad contable.
- Mayor confianza en dashboards de caja, settlements y P&L.
- **Blast radius alto**: settlement reconciliation muta `income`/`settlement_legs`/`account_balances` → toca OTB cascade (TASK-703), reconciliation snapshots (TASK-721), cash dashboards, P&L. Unanchored expense classification muta `expenses` anchors/`economic_category` → toca cost attribution (TASK-709), ICO, Member Loaded Cost. Ambos one-way doors gateados con dry-run + allowlist + flag.

### Files owned

- `src/lib/finance/**`
- `services/ops-worker/**`
- `scripts/finance/**`
- `migrations/**` (tabla cola de revision + capabilities seed)
- `docs/audits/finance/**`
- `docs/documentation/finance/**`

## Current Repo State

### Already exists

- Health check diario detecta drift.
- Dedupe/audit de alertas por firma deterministica implementado localmente.
- Remediadores financieros previos existen para FX/account balances y patrones de evidence guard.

### Gap

- No existe inventario contable accionable por sample.
- Settlement drift y unanchored paid expenses no estan separados en flujos de remediation.
- No hay cola de revision humana para casos sin anchor evidente.

## Scope

### Slice 1 — Drift ledger inventory (read-only)

- Crear reporte read-only por drift type: settlement, phantom/stale balance, unanchored paid expense.
- Incluir source rows, amounts, dates, linked documents y evidencia disponible.
- Bucketizar por monto contra umbral de materialidad por tipo (Refinamiento 1). No dump completo: agrupar inmaterial vs material.
- Asignar clave de idempotencia estable por drift item = `hash(drift_type + source_row_id)`, reusando `buildFinanceLedgerDriftSignature` (Refinamiento 3).
- **Preflight de cierre 4Q**: snapshot del estado actual de las 6 dimensiones fuera de scope (task708, task708d, task714d, task720, task721) para determinar si `4Q` puede cerrar solo con esta task o requiere tasks adicionales (Refinamiento 6).

### Slice 2 — Canonical settlement reconciliation

- Extender el remediator FX canonico (`account-balances-fx-drift-remediation.ts`): reusar `policy`/`dryRun`/`decision`/`evidenceGuard` shape (Refinamiento 4). NO framework nuevo.
- Para settlement drift con source canonico claro y monto > tolerancia de materialidad, ejecutar dry-run y remediation idempotente en una sola transaccion (`withGreenhousePostgresTransaction`) con audit antes/despues.
- `evidenceGuard: 'block_on_reconciled_drift'`: no restatear periodos conciliados; escalar a controller + auditor externo.
- Gated por capability `finance.ledger.remediate_settlement` (Refinamiento 2).

### Slice 3 — Unanchored expense decision queue (cuenta de suspenso)

- Modelar la cola como suspense account con trio canonico state machine + CHECK + audit append-only.
- `drift_type` enum cerrado; estados `pending → classified → resolved | written_off | dismissed`; columnas ortogonales separadas (drift_type / estado / candidate_anchor).
- Clasificar expense pagado por anchors posibles: supplier, tool, payroll, tax, loan, linked income.
- Si falta evidencia, item queda `pending` con owner + razon; NO autoclasificar.
- Inmateriales → politica de batch-accept documentada (van a `acknowledgedDebt`). Materiales → revision humana.
- Gated por capability `finance.ledger.resolve_unanchored`; write-off requiere segundo actor (Refinamiento 2).

### Slice 4 — Health signal semantics

- Ajustar finance ledger health para distinguir known debt, new drift y materially changed drift (parte ya existe via `driftSignature`).
- Anadir dimension `acknowledgedDebt` (append-only: monto + razon + actor + fecha, estilo SUM de auditoria) **separada de `healthy`** (Refinamiento 5). `healthy` permanece honesto.
- Reliability signal nuevo `finance.ledger.unresolved_drift_items` (kind=drift, severity warning si > 0, steady=0).
- Mantener estado visible hasta cierre contable; nunca flip silencioso a healthy.

### Slice 5 — Documentation and closeout

- Auditoria finance versionada con resultado de remediation + schedule SUM de deuda aceptada.
- Runbook para futuras corridas y Sentry closeout (solo si preflight Slice 1 confirma que las 6 dimensiones fuera de scope estan en 0 o aceptadas).

## Out of Scope

- Cambios cosmeticos en dashboards finance.
- Reescribir el ledger completo.
- Borrar o sobrescribir movimientos historicos sin compensating entry y audit.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 read-only -> Slice 2/3 remediation controlada -> Slice 4 signals -> Slice 5 closeout. Ninguna mutacion antes de inventario y dry-run.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Clasificacion contable incorrecta | finance/accounting | medium | evidence guard + revision humana + materialidad | finance ledger health |
| Doble remediation | finance/data | low | idempotency key estable (hash drift_type+source_row_id) + audit trail | driftSignature cambia inesperadamente |
| Ocultar deuda conocida | reliability | medium | `healthy` honesto + `acknowledgedDebt` separado append-only | Sentry + source_sync_runs |
| Mutacion irreversible | finance/data | medium | dry-run default + compensating entry plan + allowlist | post-run reconciliation |
| Restatement de periodo conciliado/cerrado | finance/accounting | medium | `evidenceGuard: 'block_on_reconciled_drift'` + escalamiento controller/auditor | reconciliation snapshots TASK-721 |
| Revision de ruido inmaterial (cola no cierra) | finance/ops | medium | umbral de materialidad por tipo + batch-accept documentado | tamano de cola unresolved |
| Fabricacion de anchor para vaciar cola | finance/accounting | low | regla dura: no autoclasificar sin evidencia + JE manual con descripcion especifica | audit log de resoluciones |
| Write-path sin autorizacion | finance/security | low | capability granular + segundo actor en write-off | capability denials |

### Feature flags / cutover

Remediation mutante debe ser dry-run por defecto. Cualquier auto-apply requiere flag/env explicito y allowlist de drift IDs o periodos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | doc/report only | inmediato | si |
| 2 | compensating entries segun runbook | variable | parcial |
| 3 | cerrar/reabrir items de revision | inmediato | si |
| 4 | revert PR | <15 min | si |
| 5 | doc correction | inmediato | si |

### Production verification sequence

1. `pnpm pg:doctor`.
2. Read-only inventory.
3. Dry-run remediation con diff esperado.
4. Approval humano para casos no triviales.
5. Apply acotado por allowlist.
6. Re-run health; Sentry se resuelve solo si no hay recurrencia 24-48h y el cierre contable esta documentado.

## Verification

- `pnpm pg:doctor`
- Tests focales finance/remediation.
- Dry-run + diff contable.
- Health check finance ledger post-apply.
- Preflight: snapshot de las 6 dimensiones fuera de scope antes de prometer cierre 4Q.

## 4-Pillar Score (diseño propuesto post-refinamiento)

### Safety

- **What can go wrong**: mutacion incorrecta del ledger (restatement, clasificacion sin evidencia) o write sin autorizacion.
- **Gates**: capabilities granulares `finance.ledger.remediate_settlement` / `finance.ledger.resolve_unanchored`; write-off con segundo actor; dry-run default; allowlist; `evidenceGuard: 'block_on_reconciled_drift'`.
- **Blast radius si wrong**: alto — cross-cuts P&L, OTB cascade (TASK-703), snapshots (TASK-721), cost attribution (TASK-709), ICO.
- **Residual risk**: settlement reconciliation sobre periodo abierto reciente puede tocar cash dashboards antes de re-materializar; mitigado con re-run de health post-apply.

### Robustness

- **Idempotency**: key estable `hash(drift_type + source_row_id)` (Refinamiento 3); resolucion de cola idempotente por item.
- **Atomicity**: settlement remediation en `withGreenhousePostgresTransaction` con audit en misma tx.
- **Race protection**: state machine de la cola + CHECK en DB + trigger anti-transicion ilegal.
- **Constraint coverage**: `drift_type` enum CHECK, estados CHECK, append-only triggers.

### Resilience

- **Retry/recovery**: dry-run + diff antes de apply; compensating entries documentadas por slice.
- **Dead letter**: la cola de revision ES el dead-letter contable (items sin evidencia quedan visibles con owner).
- **Reliability signal**: `finance.ledger.unresolved_drift_items` (nuevo) + `finance_ledger_health` existente; `acknowledgedDebt` append-only.
- **Audit trail**: append-only en la cola + diff antes/despues en settlement remediation.

### Scalability

- **Hot path**: read-only inventory sobre finance ledger (cardinalidad baja); samples bucketizados, no dump.
- **Async**: health check ya corre en cron Cloud Scheduler (`ops-finance-ledger-health`), fuera del request path.
- **Cost at 10x**: sub-lineal; finance ledger no crece como delivery/eventos. Sin preocupacion a 10x.

## Open Questions — Resueltas pre-execution (2026-05-24)

Resueltas con la opcion mas robusta/segura/resiliente antes de FASE 5. Ninguna resulto bloqueante.

### OQ1 — Umbral de materialidad por tipo de drift → RESUELTA

**Decision**: la materialidad gobierna **routing** (auto-remediable vs revision humana vs batch-accept), NUNCA **deteccion**. La VIEW `income_settlement_reconciliation` mantiene `has_drift = |drift| > 0.01` intacta (detecta todo). El umbral vive como constante de config en el reader de inventory/remediation, no en la VIEW (mirror del patron FX TASK-871 que mantiene la tolerancia $1 CLP en el reader, no en la fuente).

- Settlement drift: tolerancia de routing = $1 CLP (anti FP-noise). Todo drift real (>$1) se rutea.
- Unanchored expense: bucket de revision humana default = $50.000 CLP (configurable); inmaterial → batch-accept documentado a `acknowledgedDebt`.

**Rationale**: separar deteccion de routing evita esconder deuda (detecta todo) y a la vez evita ahogar la cola con ruido inmaterial. Valores finales de unanchored se calibran con sign-off finance, pero el default conservador no bloquea el build (apply gated por flag+allowlist). Lente contable: es performance materiality sobre un SUM, no bajar el umbral de deteccion.

### OQ2 / OQ6 — ¿Las 6 dimensiones fuera de scope estan en 0? → CORREGIDA (2026-05-24, post-hardening)

**⚠️ CORRECCION**: la afirmacion original ("6 dims en 0, 4Q cierra con esta task") era **falsa** — se baso en un probe que estaba **corrupto por el mismo bug `.catch(()=>[])`** que Slice 2 arreglo (varias queries devolvieron `[]` por un blip transitorio del proxy → falso 0). El probe limpio post-hardening (`degradedChecks=[]`, confiable) revela el estado REAL:

| Dimension | Estado real | Scope |
|---|---:|---|
| settlement drift | **0** (Slice 1 lo arreglo) | in-scope ✓ resuelto |
| income/expense phantoms | 0 | — |
| stale balances | 0 | — |
| **unanchored paid expenses** | **20 (cap LIMIT 20; 28 en 60d, 37 total)** | **in-scope** → cola de revision (Slice 3 NO es para set vacio) |
| task708 / task708d | 0 | — |
| **task714d (internal_transfer imbalance)** | **3** | **OUT OF SCOPE** (territorio TASK-714d) |
| task720 / task721 | 0 | — |

**Conclusion corregida**: 4Q **NO cierra solo con esta task**. Para `healthy=true` se requiere ademas: (a) los 37 unanchored ruteados/aceptados via la cola de revision (in-scope, Slice 3), y (b) los **3 internal_transfer groups con par faltante resueltos via TASK-714d** (`createInternalTransferSettlement` o backfill TASK-714d — fuera de scope de TASK-929). Mientras task714d>0, el cron seguira reportando `healthy=false` honestamente.

**Leccion meta**: este es el caso de uso exacto del Slice 2 — sin honest degradation, el probe corrupto hubiera llevado a cerrar 4Q prematuramente declarando "todo en 0". El hardening expuso la realidad.

### OQ3 — ¿Cola de revision necesita UI propia? → RESUELTA

**Decision**: V1 = admin endpoint + CLI report. NO pagina `/finance/...` dedicada. La visibilidad de la cola es via reliability signal `finance.ledger.unresolved_drift_items` + el inventory report. UI dedicada se difiere a task derivada cuando el volumen lo justifique (YAGNI).

## Discovery findings vinculantes (2026-05-24)

### Hallazgo nuevo (no estaba en la spec) — `getFinanceLedgerHealth` puede reportar `healthy=true` falso

`getFinanceLedgerHealth` ([ledger-health.ts:648](../../../src/lib/finance/ledger-health.ts)) envuelve cada una de sus ~19 queries en `.catch(() => [])`. Un error transitorio (ej. blip de conexion) en la query de settlement degrada silenciosamente a "0 drift" → `healthy=true` falso, ocultando deuda real. Verificado live: un probe local devolvio `healthy=true` mientras la VIEW devolvia 4 drift rows (staging reporto correctamente `healthy=false`). Es la bug class ISSUE-071 / anti-pattern Pillar 3 (deshonestidad de degradacion). **Slice 4 debe distinguir `query failed (unknown)` de `0 drift (healthy)`** — no colapsar ambos. Refuerza el Refinamiento 5.

### Clasificacion contable de los 4 settlement drifts reales (lente finance)

Los 4 drifts se parten limpio en 2 sub-clases con tratamiento distinto:

| Income | total | amount_paid | payments_total | factoring_fee | expected | drift | Sub-clase | Decision kind |
|---|---:|---:|---:|---:|---:|---:|---|---|
| `INC-NB-26004360` | 752.730 | **0** | 752.730 | 0 | 752.730 | -752.730 | A: `amount_paid` cache stale | `auto_remediable` |
| `INC-202602-001` | 752.000 | 2.609 | 754.609 | 0 | 754.609 | -752.000 | A: `amount_paid` cache stale | `auto_remediable` |
| `INC-NB-25302941` | 6.902.000 | 6.902.000 | **13.688.146** | 115.854 | 13.804.000 | -6.902.000 | B: factura factorizada con pago ~2x | `needs_human_review` |
| `INC-NB-26639047` | 6.902.000 | 6.902.000 | **13.678.453** | 125.547 | 13.804.000 | -6.902.000 | B: factura factorizada con pago ~2x | `needs_human_review` |

- **Sub-clase A (recompute)**: los `income_payments` existen pero el campo denormalizado `amount_paid` no se recomputo. Fix canonico = `fn_recompute_income_amount_paid(incomeId)` (mismo helper que invoca `dismissIncomePhantom`). Evidencia = las propias filas de pago. **Auto-remediable**, cero juicio contable, idempotente.
- **Sub-clase B (duplicado en factoring)**: `payments_total` ≈ 2x el invoice en facturas factorizadas. Una pata de pago es duplicada (anticipo de factoring contabilizado dos veces, o anticipo + settlement del cliente ambos booked). Fix = identificar la pata espuria y superseder via `dismissIncomePhantom`. **Requiere evidencia/clasificacion humana** → `needs_human_review`. NO es write-off; es de-duplicacion de reconciliacion.

Esto valida el diseno: settlement drift NO es monolitico — se rutea por decision kind igual que el remediator FX. Sub-clase A = caso auto; Sub-clase B = caso que va a la cola de revision con evidencia.
