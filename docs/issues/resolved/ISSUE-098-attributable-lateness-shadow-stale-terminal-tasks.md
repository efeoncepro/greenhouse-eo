# ISSUE-098 — El cálculo por-tarea de atraso imputable (M2 shadow) queda congelado como "abierta" en tareas ya completadas → bloquea el writeback `[GH] OTD`

## Ambiente

production / staging (`greenhouse_delivery.task_attributable_lateness_shadow`, runtime de delivery). Detectado en data real de Sky Airline + Efeonce.

## Detectado

2026-06-19, durante el discovery de TASK-1169 (alineación del OTD imputable a la cohorte del bono). Verificado contra PG real vía proxy.

## Síntoma

El **75% de las filas** del shadow por-tarea (`task_attributable_lateness_shadow`) reporta un bucket **abierto** (`overdue` / `carry_over`) para tareas que **ya están completadas** (`Aprobado`, `completed_at IS NOT NULL`).

Evidencia (2026-06-19, 337 filas):

- `shadow_open_but_task_done = 252 / 337` (75%).
- De esas 252, **245 sí tienen** la transición `→ Aprobado` capturada en `task_status_transitions` → no es falta del evento.
- Caso testigo `37339c2f…`: transición `En curso → Aprobado @ 16:02`, `shadow.computed_at = 16:10` (8 min **después** de aprobarse), y aun así `bucket_attributable = carry_over`. `completed_at` actual de la tarea está poblado.

## Causa raíz

El compute de M2 (`notion_attributable_lateness_compute`, TASK-922) es **event-driven**: se dispara en cada `notion.task.status_transitioned`, re-lee la tarea de `greenhouse_delivery.tasks` y fotografía el bucket vía `calculateAttributableLateness` → `classifyOtdBucket`.

Hay una **carrera de sincronización + terminalidad sin recompute**:

1. La tarea transiciona a `Aprobado` → dispara el compute.
2. En ese microinstante, el `task_status` ya sincronizó a PG pero el **`completed_at` todavía NO** (Notion sincroniza el estado y la fecha de completado por caminos/tiempos distintos). `classifyOtdBucket` exige `completed_at IS NOT NULL` para tratar la tarea como completada → con `completed_at` nulo la clasifica **abierta** (`overdue`/`carry_over`).
3. `Aprobado` es **estado terminal** → no habrá otra transición → el consumer **nunca vuelve a recomputar** → el bucket equivocado queda **congelado permanentemente**, aun cuando `completed_at` llega minutos/horas después.

Es un bug distinto de [`ISSUE-081`](ISSUE-081-dias-retraso-freeze-roto-frozendays-cero-penaliza-otd-bonus.md) (ese es `frozenDays=0` / freeze que no descuenta): acá el problema es que el bucket por-tarea está **stale/abierto** para tareas terminales.

## Impacto

- **Bloquea TASK-927** (`[GH] OTD` writeback a Notion). TASK-927 escribe el bucket/“días de retraso” por-tarea **leyendo este shadow**. Con la data actual escribiría `overdue`/`carry_over` (“atrasada / no entregada”) sobre **3 de cada 4 tareas que en realidad están aprobadas y entregadas** → data falsa, **visible para el cliente** (Sky, Efeonce, etc.).
- Degrada cualquier consumer futuro que lea `task_attributable_lateness_shadow.bucket_attributable` como verdad del estado actual de la tarea.
- **NO** afecta el bono hoy (el bono no lee este shadow; sigue sobre legacy). **NO** afecta a TASK-1169: su harness auto-validante cruza contra la cohorte viva (que ve las tareas completadas) y **descarta** estos buckets stale en vez de propagarlos — por eso 1169 reporta `no_freeze_data`/0 movimiento honestamente.

## Solución

**RESUELTA por TASK-1174 (2026-06-19), sin migración.** Causa raíz refinada en el fix: no es sólo el lag de `completed_at` sino que **el `task_status` del row laggea** la transición terminal (el row sync de `tasks` es un pipeline distinto al de `task_status_transitions`, que es el que dispara el compute). El classifier nunca devuelve open para `Aprobado`, así que el bucket abierto sólo pudo computarse leyendo un `task_status` pre-terminal.

1. **`resolveEffectiveTaskState`** (`src/lib/sync/projections/notion-attributable-lateness-compute.ts`, pure SSOT): reconcilia el estado contra el **log de transiciones** (autoritativo). Terminal gana desde cualquiera de las dos fuentes; un reopen real (transición abierta capturada) no fuerza terminal; cuando es terminal sin `completed_at` en el row, el `transitioned_at` de la transición terminal ES el momento de completado (fallback honesto).
2. **`computeAttributableLatenessForTask`**: core canónico extraído reusado por el consumer y por el barrido.
3. **Barrido idempotente** `scripts/recompute-attributable-lateness-terminal-open.ts` (dry-run/`--apply`). Target preciso = **status terminal** (no `completed_at` como proxy: una tarea en revisión puede traer `completed_at` y su bucket abierto es correcto).
4. **Reliability signal** `delivery.attributable_lateness.shadow_terminal_open` (steady=0; warning 1-10 / error >10) — gate del writeback TASK-927.

## Verificación

- Backfill aplicado contra PG real (proxy): **250 filas corregidas → 0 terminal-open** restantes (objetivo cumplido). Las filas `Listo para revisión` con `completed_at` quedan excluidas (no son terminal por status; su bucket abierto es correcto).
- Signal `delivery.attributable_lateness.shadow_terminal_open` verificado live: `severity=ok`, `count=0`.
- 17 tests del consumer (6 nuevos del resolver: carrera, preserva `completed_at`, reopen, abierta, backstop) + 434 tests reliability verdes.
- TASK-927 puede levantar su gate de writeback ahora que el signal está en steady=0.

## Estado

resolved (2026-06-19, TASK-1174)

## Relacionado

- **TASK-1174** (fix de este issue).
- **TASK-927** (`[GH] OTD` writeback) — bloqueada por este issue.
- **TASK-922** (M2, origen del consumer event-driven) · **TASK-1169** (lo destapó; su harness protege contra esta data).
- [`ISSUE-081`](ISSUE-081-dias-retraso-freeze-roto-frozendays-cero-penaliza-otd-bonus.md) (freeze `frozenDays=0`, relacionado pero distinto).
- ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.9-16.11 · `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md`.
