# TASK-1174 — Recompute robusto del atraso imputable por-tarea en tareas terminales (fix ISSUE-098, desbloquea writeback `[GH] OTD`)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `optional`
- Status real: `Diseño — creada 2026-06-19 desde ISSUE-098 (destapado en TASK-1169). Fix + backfill + signal; todo shadow / no toca el bono.`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1174-attributable-lateness-shadow-terminal-recompute`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

El cálculo por-tarea de atraso imputable (M2, `task_attributable_lateness_shadow`) deja un bucket **abierto** (`overdue`/`carry_over`) congelado en el **75% de las tareas que ya están completadas** (`Aprobado`), porque el compute event-driven corre en la transición `→Aprobado` cuando `completed_at` aún no sincronizó, y `Aprobado` es terminal → nunca se recomputa. Esta task lo corrige (compute robusto a estado terminal + barrido periódico + backfill + signal), **sin tocar el bono**. Desbloquea TASK-927 (`[GH] OTD` writeback): hoy escribiría “atrasada” sobre tareas entregadas, visible para el cliente.

## Why This Task Exists

Detectado en data real (Sky Airline + Efeonce) durante TASK-1169: 252/337 filas del shadow reportan bucket abierto para tareas completadas; 245 de ellas **sí** tienen la transición `→Aprobado` capturada y el compute corrió **después** de aprobarse, pero clasificó "abierta" porque el `completed_at` llegó después en el sync (carrera estado↔fecha). Sin recompute terminal, el bucket queda mal para siempre. Detalle, evidencia y causa raíz: **`docs/issues/open/ISSUE-098-attributable-lateness-shadow-stale-terminal-tasks.md`**.

## Goal

- Que el compute por-tarea **nunca persista** un bucket abierto definitivo para una tarea en estado terminal (`Aprobado`/`Archivado`).
- Un **barrido idempotente** (no solo event-driven) que corrija tareas terminales con shadow abierto.
- **Backfill** de las filas ya congeladas.
- **Reliability signal** que detecte la regresión (steady=0) y sirva de gate del writeback.
- **NUNCA** tocar el bono (sigue sobre legacy; este shadow no lo lee).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16.9-16.11 (M2 + cohorte) y `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md`.
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` (consumer reactivo + recovery/barrido).
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md` (degradación honesta, materializer/recovery, reliability-signal-upstream).
- Skills al tomar: `greenhouse-ico`, `greenhouse-postgres`, `greenhouse-cron-sync-ops`.

Reglas obligatorias:

- **NUNCA** persistir un bucket abierto (`overdue`/`carry_over`) definitivo para una tarea cuyo `task_status` ya es terminal. Si `completed_at` aún no está, degradar honesto (no fijar bucket terminal) o re-leer; nunca congelar abierto.
- **SIEMPRE** degradación honesta (`data_status`), nunca un bucket falso.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`.
- **NUNCA** tocar el bono ni `otd_pct` (el bono no lee este shadow; sigue legacy hasta el cutover gateado TASK-1170).
- **SIEMPRE** reusar el helper canónico `calculateAttributableLateness` (SSOT del freeze) — no reimplementar la clasificación.

## Normative Docs

- `docs/issues/open/ISSUE-098-attributable-lateness-shadow-stale-terminal-tasks.md` — causa raíz + evidencia.

## Dependencies & Impact

### Depends on

- **M0 (TASK-921)** captura `task_due_date_changes` · **M1 (TASK-923)** clasificador GH · **M2 (TASK-922)** `calculateAttributableLateness` + consumer + shadow table.

### Blocks / Impacts

- **Desbloquea TASK-927** (`[GH] OTD` writeback) — su gate de escritura depende de que el shadow refleje el estado final.
- Mejora la cobertura del shadow consumida por **TASK-1169** (su materializador member×month leerá flips reales en vez de stale-descartados).
- No impacta el bono (`otd_pct`).

### Files owned

> Estimado — `[verificar]` cada path durante Discovery.

- `src/lib/sync/projections/notion-attributable-lateness-compute.ts` — compute robusto a estado terminal — MODIFY
- `src/lib/notion-metrics/calculate-attributable-lateness.ts` / `classify-otd-bucket.ts` — `[verificar]` si la degradación honesta vive en el helper — MODIFY
- `scripts/` — barrido/backfill idempotente de tareas terminales con shadow abierto — NEW
- `src/lib/reliability/queries/` — signal `delivery.attributable_lateness.shadow_terminal_open` — NEW
- `src/lib/reliability/get-reliability-overview.ts` — wiring del signal — MODIFY

## Current Repo State

### Already exists

- `task_attributable_lateness_shadow` (migration `20260524104127717`) + consumer reactivo `notion_attributable_lateness_compute` (trigger `notion.task.status_transitioned`, flag `ATTRIBUTABLE_LATENESS_OTD_ENABLED`).
- Helper `calculateAttributableLateness` + `classifyOtdBucket` (`applyMonthGate?`). `data_status` ya soporta `valid|unavailable|legacy_unknown`.

### Gap

- El compute fija un bucket abierto definitivo cuando `completed_at` no está al instante de la transición terminal, y no hay recompute posterior (terminal sin transición futura).
- No hay barrido/recovery que corrija filas terminales congeladas.
- No hay signal que detecte "tarea completada pero shadow abierto".

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (additive/recovery sobre tabla shadow; ningún consumer productivo la lee aún; no toca el bono)
- Impacto principal: `command` (+ `cron`/recovery + `reader` para el signal)
- Source of truth afectado: `greenhouse_delivery.task_attributable_lateness_shadow` (shadow, no productivo)
- Consumidores afectados: TASK-927 (futuro), TASK-1169 materializer (shadow)
- Runtime target: `staging` / `worker`/`cron` (shadow)

### Contract surface

- Contrato existente a respetar: helper `calculateAttributableLateness` (SSOT freeze), consumer reactivo, shape del shadow table
- Contrato nuevo o modificado: regla de no-congelar-abierto en estado terminal + barrido idempotente + signal nuevo
- Backward compatibility: `compatible` (additive / corrige data shadow)
- Full API parity: el recompute es un command/recovery canónico reutilizable (consumer + barrido + el reader del signal), no lógica de pantalla

### Data model and invariants

- Entidades afectadas: `task_attributable_lateness_shadow`, `greenhouse_delivery.tasks`, `task_status_transitions`
- Invariantes:
  - una tarea con `task_status` terminal **nunca** tiene `bucket_attributable ∈ {overdue, carry_over}` definitivo
  - el recompute reusa `calculateAttributableLateness` (SSOT), no reimplementa
  - nada altera `otd_pct` ni el bono
- Tenant/space boundary: per-cliente (efeonce/sky) coherente con el path existente; data-driven, no hardcodear
- Idempotency/concurrency: barrido idempotente (UPSERT por `task_source_id`, last-compute-wins); seguro de re-correr
- Audit/outbox/history: signal de reliability; sin mutación productiva

### Migration, backfill and rollout

- Migration posture: `none` (o `additive` si el fix necesita una columna de `data_status` nueva — evaluar)
- Default state: `shadow` (ningún consumer productivo lee la tabla)
- Backfill plan: dry-run (contar filas terminales con shadow abierto) → apply (recompute idempotente) → verify (count → 0)
- Rollback path: revert PR; el backfill es idempotente y additive (no destruye, recomputa)
- External coordination: ninguna que toque nómina

### Security and access

- Auth/access gate: runtime interno / worker; sin superficie nueva de usuario
- Sensitive data posture: `no sensitive data` (métrica de entrega; el bono no se toca)
- Error contract: `captureWithDomain`; sin raw errors
- Abuse/rate-limit posture: N/A (interno)

### Runtime evidence

- Local checks: tests focales del compute (caso: transición terminal con `completed_at` nulo no congela abierto) + del helper
- DB/runtime checks: contra PG real (proxy) — `shadow_open_but_task_done` antes/después del backfill
- Integration checks: re-disparar el consumer sobre tareas terminales y confirmar bucket cerrado
- Reliability signals/logs: `delivery.attributable_lateness.shadow_terminal_open` (steady=0)
- Production verification sequence: ver Rollout (shadow; verificación = el count tiende a 0)

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariante "terminal nunca tiene bucket abierto definitivo" explícito y testeado.
- [ ] Backfill con dry-run/apply/verify idempotente.
- [ ] Signal nuevo wired con steady=0.
- [ ] Verificado: nada altera el bono.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Compute robusto a estado terminal

Modificar el compute (`notion_attributable_lateness_compute` y/o el helper) para que, cuando `task_status` sea terminal (`Aprobado`/`Archivado`) y `completed_at` no esté disponible al instante, **no congele** un bucket abierto definitivo: re-leer/esperar `completed_at`, o degradar honesto vía `data_status` (marcar "pendiente de completed_at") en vez de persistir `overdue`/`carry_over`. Tests focales del caso.

### Slice 2 — Barrido idempotente de tareas terminales

Script/recovery (`scripts/`) que recorre tareas con `task_status` terminal + `completed_at IS NOT NULL` + shadow abierto y las recomputa vía `calculateAttributableLateness` (UPSERT idempotente). Dry-run (cuenta) → apply (corrige). Reusar el patrón de recovery/materializer canónico. Decidir en Plan si además se programa periódico (Cloud Scheduler/ops-worker) o queda como recovery on-demand.

### Slice 3 — Reliability signal + backfill apply

Signal `delivery.attributable_lateness.shadow_terminal_open` (steady=0; cuenta filas con tarea completada pero bucket abierto), wired en `getReliabilityOverview`. Ejecutar el backfill (Slice 2 apply) sobre la data real y verificar que el count tiende a 0.

### Slice 4 — Propagar docs + cerrar ISSUE-098

Delta a `ATTRIBUTABLE_LATENESS_V1.md` / ADR §16 + RELIABILITY control plane (signal nuevo). Mover ISSUE-098 a `resolved/`. Nota de desbloqueo a TASK-927.

## Out of Scope

- **El writeback `[GH] OTD` a Notion** → **TASK-927** (esta task solo deja el shadow confiable + el gate-signal).
- **El cutover del bono** → **TASK-1170**.
- El bug de freeze `frozenDays=0` (ISSUE-081) — relacionado pero distinto.

## Detailed Spec

Ver §Why + ISSUE-098. El corazón es Slice 1 (no congelar abierto en terminal) + Slice 2 (barrido que cierra el gap "terminal sin transición futura"). Ground truth verificado 2026-06-19: caso testigo `37339c2f…` (transición `→Aprobado @16:02`, compute `@16:10`, bucket `carry_over`); 252/337 filas afectadas, 245 con transición `→Aprobado` capturada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 (compute robusto) → Slice 2 (barrido) → Slice 3 (signal + backfill apply) → Slice 4 (docs + cerrar ISSUE-098). El backfill apply (Slice 3) corre **después** de que el compute robusto (Slice 1) esté mergeado, para no re-congelar. Ningún slice toca el bono.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El barrido re-congela abierto si Slice 1 no está | delivery | media | ordering hard rule (Slice 1 antes que el apply); barrido reusa el helper ya corregido | `shadow_terminal_open` |
| Carrera estado↔`completed_at` persiste en casos borde | integrations.notion | media | degradación honesta (no fijar bucket terminal sin `completed_at`) + barrido periódico que reintenta | `shadow_terminal_open` steady=0 |
| Alguien cree que esto ya habilita el writeback | proceso | baja | Out of Scope explícito: el writeback es TASK-927, gateado por el signal | — |

### Feature flags / cutover

Sin flag nuevo de cutover. El compute sigue gateado por `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (M2, existente). El barrido/backfill es additive sobre tabla shadow (ningún consumer productivo la lee). Sin impacto en el bono.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | revert PR (compute) | <10 min | sí |
| 2 | revert PR (script) — no muta productivo | <10 min | sí |
| 3 | revert PR (signal); el backfill es idempotente/additive (recomputa, no destruye) | <10 min | sí (parcial: data recomputada queda) |
| 4 | revert doc / mover ISSUE de vuelta a open | inmediato | sí |

### Production verification sequence

N/A productivo directo (shadow). Verificación = contra PG real: `COUNT(*) FILTER (WHERE t.completed_at IS NOT NULL AND s.bucket_attributable IN ('overdue','carry_over'))` antes (≈252) → después del fix+backfill (→0) + signal `shadow_terminal_open` en steady=0.

### Out-of-band coordination required

N/A — repo-only change (shadow / runtime interno). Ninguna coordinación que toque nómina.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El compute nunca persiste bucket abierto definitivo para una tarea en estado terminal (testeado).
- [ ] Barrido idempotente recompone las filas terminales con shadow abierto; dry-run + apply + verify.
- [ ] `shadow_open_but_task_done` (PG real) tiende a 0 post-backfill.
- [ ] Signal `delivery.attributable_lateness.shadow_terminal_open` wired, steady=0.
- [ ] Verificado: nada de esta task altera `otd_pct` ni el bono.
- [ ] ISSUE-098 movido a `resolved/` con verificación documentada.
- [ ] `pnpm test` (focales) + `pnpm build` verdes.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- Smoke contra PG real (proxy): count terminal-open antes/después + re-disparo del consumer.
- Confirmar shadow / flag: el bono no cambia.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo de impacto cruzado (TASK-921/922/927/1169/1170 + ISSUE-098/081)
- [ ] ADR + metric spec + RELIABILITY control plane actualizados
- [ ] ISSUE-098 movido a `resolved/`

## Follow-ups

- **TASK-927** (`[GH] OTD` writeback) — levantable una vez que el signal `shadow_terminal_open` esté en steady=0.
- Evaluar si el mismo patrón de "terminal sin recompute" afecta otros shadows event-driven (RpA/FTR).

## Open Questions

- ¿El barrido se programa periódico o queda recovery on-demand? — **RESUELTA: on-demand (script)** por ahora. El fix de Slice 1 (estado/completed_at efectivo desde la última transición) elimina la carrera en el compute event-driven para transiciones capturadas, así que el barrido es para (a) backfill de las 252 filas ya congeladas y (b) backstop de capture-gaps raros. Programar periódico se difiere salvo que el signal `shadow_terminal_open` muestre recurrencia (follow-up).
- ¿La degradación honesta requiere un `data_status` nuevo / migración? — **RESUELTA: NO, sin migración.** La causa raíz exacta (confirmada en código 2026-06-19) es que el consumer lee `tasks.task_status`/`completed_at` (pipeline de row sync que laggea), mientras `task_status_transitions` (que dispara el compute) ya tiene la transición terminal. Fix sin migración: derivar el estado efectivo de la **última transición** (event log autoritativo) y usar su `transitioned_at` como `completed_at` de respaldo (la transición `→Aprobado` ES el momento de completado). El classifier produce un bucket terminal correcto → no se necesita un `data_status` nuevo.
