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

Pendiente (su propia task: **TASK-1174**). Direcciones candidatas:

1. **Recompute robusto al estado final:** que el compute no fije un bucket terminal con `completed_at` nulo cuando el estado ya es terminal (`Aprobado`/`Archivado`) — esperar/re-leer `completed_at`, o degradar honesto (`data_status` que marque "pendiente de completed_at") en vez de persistir un bucket abierto definitivo.
2. **Barrido periódico (no solo event-driven):** un recálculo idempotente que pase sobre tareas terminales con shadow abierto y las corrija (cierra el gap de "estado terminal sin transición futura"). Reusar el patrón materializer/recovery canónico.
3. **Backfill** de las 252 filas ya congeladas tras aplicar el fix.
4. Reliability signal nuevo: `delivery.attributable_lateness.shadow_terminal_open` (steady=0; cuenta filas con tarea completada pero bucket abierto) como detector + gate del writeback.

## Verificación

- Tras el fix + backfill: `COUNT(*) FILTER (WHERE t.completed_at IS NOT NULL AND s.bucket_attributable IN ('overdue','carry_over'))` sobre `task_attributable_lateness_shadow ⋈ tasks` debe tender a 0.
- Smoke contra PG real (proxy) en data de Sky/Efeonce.
- TASK-927 solo puede levantar su gate de writeback cuando el signal `shadow_terminal_open` esté en steady=0.

## Estado

open

## Relacionado

- **TASK-1174** (fix de este issue).
- **TASK-927** (`[GH] OTD` writeback) — bloqueada por este issue.
- **TASK-922** (M2, origen del consumer event-driven) · **TASK-1169** (lo destapó; su harness protege contra esta data).
- [`ISSUE-081`](ISSUE-081-dias-retraso-freeze-roto-frozendays-cero-penaliza-otd-bonus.md) (freeze `frozenDays=0`, relacionado pero distinto).
- ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.9-16.11 · `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md`.
