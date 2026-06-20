# TASK-927 — OTD bucket writeback a Notion (`[GH] OTD`, display, shadow→flip gateado)

## Delta 2026-06-19 — desbloqueada por TASK-1174 (ISSUE-098 resuelto)

Esta task escribe el bucket/“días de retraso” por-tarea leyendo el M2 shadow `task_attributable_lateness_shadow`. Se había detectado (TASK-1169) que ese shadow estaba **stale en el 75% de las tareas completadas** (bucket abierto congelado en tareas `Aprobado`) — escribirlo habría puesto "atrasada/no entregada" sobre tareas entregadas, **visible al cliente**. Eso era **`ISSUE-098`**, ahora **resuelto por TASK-1174**:

- El compute M2 ahora reconcilia el estado contra el log de transiciones (`resolveEffectiveTaskState`) → no congela buckets abiertos en tareas terminales; backfill aplicó 250→0 terminal-open.
- **Gate de escritura obligatorio:** antes de habilitar el writeback, verificar que el signal **`delivery.attributable_lateness.shadow_terminal_open`** esté en **steady=0** (hoy `ok`/count=0). Si > 0, NO escribir (la fuente volvió a tener buckets stale → correr `scripts/recompute-attributable-lateness-terminal-open.ts`).
- Recordatorio: el bucket es `now()`-dependiente para tareas abiertas → el writeback sigue siendo batch diario (no event-driven), y debe re-leer la fuente fresca, no confiar un snapshot viejo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno (writeback display del bucket OTD GH-owned por TASK-923 M1)`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `TASK-922 (M2 — bucket_attributable freeze-aware en task_attributable_lateness_shadow) ✅ SHIPPED 2026-05-24, shadow compute ACTIVO en prod (ATTRIBUTABLE_LATENESS_OTD_ENABLED=true). TASK-923 (M1) ✅ SHIPPED es el clasificador base que M2 reusa. Soft-dep: TASK-912 captura de transiciones ACTIVA en prod (alimenta el shadow event-driven); el batch recomputa los buckets now()-dependientes.`
- Branch: `task/TASK-927-otd-bucket-notion-writeback`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Escribir de vuelta a Notion el bucket OTD **reason-aware corregido por freeze** (`on_time`/`late_drop`/`overdue`/`carry_over`/`na`) que Greenhouse computa en M2 — fuente canónica `greenhouse_delivery.task_attributable_lateness_shadow.bucket_attributable` (PG, TASK-922), **NO** `gh_otd_bucket` (BQ, que es M1 crudo SIN freeze — ver Delta 2026-05-27) — en una propiedad **nueva read-only** `[GH] OTD` de la DB Tareas de Efeonce/Sky. **Display-only**: coexiste con la fórmula Notion legacy `Indicador de Performance` y NO toca el bono (`otd_pct` sigue intacto). Gated por flag `NOTION_OTD_WRITEBACK_ENABLED` (default OFF). Sibling del patrón writeback de RpA V2 (TASK-916), con una diferencia clave de diseño: el bucket OTD tiene componente `now()`-dependiente → **daily batch** que recomputa el shadow de tareas abiertas antes de escribir, no solo event-driven.

## Why This Task Exists

TASK-923 M1 hizo a Greenhouse el clasificador autoritativo del bucket OTD, pero el valor vive solo en BigQuery (`gh_otd_bucket`) — el operador en Notion sigue viendo únicamente la fórmula legacy `Indicador de Performance`. Falta cerrar el loop del boundary canónico (Notion = OS / Greenhouse = motor): el motor computa, el OS muestra. Sin este writeback, el bucket GH-owned es invisible al operador y no hay forma de validar visualmente la paridad/divergencia en la propia UI de Notion (como sí existe para RpA V2 vía `[GH] RpA v2`).

## Goal

- Propiedad Notion **read-only** `[GH] OTD` (select) en la DB Tareas de Efeonce + Sky, escrita exclusivamente por la integración Greenhouse.
- Writeback **daily batch** que recomputa `bucket_attributable` (freeze-aware) per-tarea abierta del período activo y lo PATCHea a Notion vía Cloud Tasks throttled (≤3 req/s), idempotente. Fuente: `task_attributable_lateness_shadow` (PG), NO `gh_otd_bucket` (BQ M1 crudo).
- Tabla de snapshot/log de writeback (sibling de `task_rpa_snapshots`) + 2 reliability signals (`writeback_dead_letter_otd`, `writeback_lag_otd`).
- Flag global `NOTION_OTD_WRITEBACK_ENABLED` (default OFF) + per-cliente `NOTION_OTD_WRITEBACK_ENABLED_<EFEONCE|SKY>` (mirror TASK-919). Cero impacto en bono.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion = OS / Greenhouse = motor; el writeback escribe propiedad `[GH] …` read-only, NUNCA fórmula.
- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 — descomposición OTD. **Este task NO es ninguno de M0–M3**; es un movimiento de display paralelo (análogo a RpA V2 Flip A), no toca el bono ni la fuente de `otd_pct`.
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — patrón writeback canónico (compute/writeback siblings, snapshot, flag, Cloud Tasks, echo-loop, dead-letter).
- CLAUDE.md "OTD Bucket Classifier Ownership invariants (TASK-923)" + "RpA V2 productive compute + writeback invariants (TASK-916)" + "Notion Status Transition Capture (TASK-912)".

Reglas obligatorias:

- **NUNCA** crear fórmula Notion para el bucket OTD — el bucket canónico es `classifyOtdBucket` / `gh_otd_bucket`. La propiedad `[GH] OTD` es el destino read-only del writeback.
- **NUNCA** que este writeback toque `otd_pct` ni el bono. Display-only. El cutover del bono es M3 (TASK futura gateada, post-nómina).
- **NUNCA** confiar el payload del webhook como source of truth (no aplica aquí porque es batch-driven, pero si emerge componente event-driven: re-fetch). Re-read del source canónico (`v_tasks_enriched.gh_otd_bucket`).
- **SIEMPRE** Cloud Tasks throttling (≤3 req/s) + idempotency (skip si el valor escrito == último snapshot) + echo-loop safe (escribir un select dispara webhook → captura re-fetchea STATUS, unchanged → noop).
- **SIEMPRE** `captureWithDomain(err, 'integrations.notion', { tags: { source: 'otd_writeback', stage } })` — Sentry directo prohibido.

## Normative Docs

- `metrics/OTD_V1.md` — spec de la métrica OTD (agregar §writeback Delta cuando este task ship).

## Dependencies & Impact

### Depends on

- **TASK-922 M2 ✅ SHIPPED** — `task_attributable_lateness_shadow.bucket_attributable` (freeze-aware) + helper `calculateAttributableLateness`. **Fuente canónica del valor a escribir.**
- **TASK-923 M1 ✅ SHIPPED** — `classifyOtdBucket` + `buildOtdBucketSql` (clasificador base que M2 reusa con freeze ON). `gh_otd_bucket` (BQ) NO se usa como fuente (es M1 crudo).
- Propiedad Notion `[GH] OTD` creada en Efeonce + Sky (out-of-band, operador-side — NO existe aún).
- Infra Cloud Tasks + ops-worker reactive/batch (ya existe para RpA writeback).

### Blocks / Impacts

- No bloquea M2 (TASK-922) ni M3 — es display paralelo, ortogonal a la cadena de freeze/cutover.
- Habilita validación visual de paridad/divergencia del bucket GH-owned directamente en Notion (útil cuando M2 introduzca freeze: el operador verá `[GH] OTD` con freeze vs `Indicador de Performance` legacy).

### Files owned

- `src/lib/notion-metrics/` (writeback projection + helper de batch select)
- `src/lib/sync/projections/notion-otd-writeback*.ts`
- `src/lib/reliability/queries/notion-metrics-otd-writeback-*.ts`
- `migrations/` (snapshot/log table)
- `services/ops-worker/` (Cloud Scheduler job daily si se usa batch dedicado)
- `docs/architecture/metrics/OTD_V1.md` (Delta writeback)

## Current Repo State

### Already exists

- `gh_otd_bucket` materializado (TASK-923 M1) — la fuente del writeback.
- Patrón writeback completo en `notion-rpa-writeback.ts` + `task_rpa_snapshots` + signals + Cloud Tasks + flag (TASK-916) — clonar/adaptar.
- Captura de transiciones live en prod (TASK-912) — disponible si se quiere componente event-driven para completion.
- `patchNotionPage(pageId, properties)` en `src/lib/space-notion/notion-client.ts` (NOTION_TOKEN productivo).

### Gap

- No hay propiedad `[GH] OTD` en Notion ni writeback que la pueble.
- El bucket OTD es invisible al operador en Notion (solo BQ).
- A diferencia de RpA, OTD tiene buckets `now()`-dependientes (overdue/carry_over de tareas abiertas vencidas) que NO se disparan por ningún evento → requieren recompute periódico.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que la toma -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Propiedad Notion + token mapping

- Documentar/crear `[GH] OTD` (select: `on_time`/`late_drop`/`overdue`/`carry_over`/`na`, o labels es-CL a definir en spec) en DB Tareas Efeonce + Sky, read-only para operadores.
- Constante canónica `NOTION_PROPERTY_OTD_BUCKET` + mapping bucket→option_name.

### Slice 2 — Snapshot/log table + flag

- Tabla `task_otd_writeback_snapshots` (sibling `task_rpa_snapshots`): `(task_source_id, workspace_id, bucket, formula_version, written_to_notion_at, attempt_count, last_error, ...)`. CHECK `workspace_id IN ('efeonce','sky')`, append-only con columnas writeback mutables (idempotency).
- Flag `isOtdWritebackEnabled(workspaceId)` — global `NOTION_OTD_WRITEBACK_ENABLED` + per-cliente `_<EFEONCE|SKY>` (default OFF).

### Slice 3 — Daily batch writeback projection

- Job batch (Cloud Run + Cloud Scheduler diario, o rides ops-reactive-delivery) que: **recomputa** `calculateAttributableLateness` per-tarea abierta del período activo (porque el shadow se materializa por evento y los buckets `overdue`/`carry_over` dependen de `now()` sin disparar evento Notion) → UPSERT `task_attributable_lateness_shadow` → lee `bucket_attributable` → diff vs último escrito → enqueue Cloud Tasks (≤3 req/s) → `patchNotionPage` `[GH] OTD` → marca `written_to_notion_at`. Idempotente. Gated por flag. **Si `data_status` ≠ `valid`** (legacy_unknown/unavailable), NO escribe (degraded honesto).

### Slice 4 — Reliability signals

- `notion.metrics.writeback_dead_letter_otd` (drift, error si attempt_count ≥ N + sin write) + `notion.metrics.writeback_lag_otd` (lag, snapshots pendientes overdue). Wire en `get-reliability-overview.ts`.

### Slice 5 — Docs + canonización

- Delta `OTD_V1.md` §writeback + CLAUDE.md (extender sección TASK-923 con el writeback) + ADR Strangler nota.

## Out of Scope

- **NO** cutover del bono (eso es M3 — TASK futura gateada). Este task es display-only.
- **NO** el bucket M1 crudo de BQ (`gh_otd_bucket`). Esta task escribe el bucket **freeze-aware** de M2 (`bucket_attributable`, PG). **Corrección 2026-05-27**: el supuesto original de esta task ("el writeback reflejará freeze automáticamente leyendo `gh_otd_bucket`") era **falso** — M2 (spec §9) deliberadamente NO espeja el freeze a BQ; `gh_otd_bucket` es M1 crudo para siempre. La fuente freeze-corregida vive solo en PG. Ver Delta 2026-05-27.
- **NO** componente event-driven obligatorio en V1 — el daily batch cubre todos los buckets (incluido completion). Event-driven (PATCH inmediato al completar) puede ser follow-up si se necesita latencia <24h.

## Detailed Spec

**Diferencia clave vs TASK-916 (RpA writeback)** — RpA solo cambia en correcciones (eventos), así que su writeback es puramente event-driven. El bucket OTD cambia también por **paso del tiempo**: una tarea abierta que cruza su `due_date` pasa de `na`/`on_time-pending` a `overdue`/`carry_over` sin ningún evento Notion. Por eso el mecanismo canónico V1 es **daily batch** (recompute + writeback de todas las tareas del período activo), que es además más simple que forzar el modelo event-driven. El batch lee `gh_otd_bucket` (recomputado live en la VIEW), garantizando que el valor escrito refleje el `now()` del día.

**Echo-loop safety**: el writeback escribe un `select` (`[GH] OTD`), NO el `Estado`. El webhook que dispara → captura prod (TASK-912) re-fetchea STATUS → unchanged → no `status_transitioned` → no recompute. Sin loop (idéntico al razonamiento de RpA writeback que escribe un number).

**Fuente del valor (CORREGIDA 2026-05-27)**: `task_attributable_lateness_shadow.bucket_attributable` (PG, freeze-corregido por M2/TASK-922). **NO** `v_tasks_enriched.gh_otd_bucket` (BQ) — ese es el clasificador **M1 crudo sin freeze** y, por decisión de M2 (spec §9 "NO mirror BQ del freeze"), nunca reflejará el freeze. Como el shadow se materializa por evento y los buckets `overdue`/`carry_over` dependen de `now()`, el batch **recomputa** `calculateAttributableLateness` para las tareas abiertas del período antes de leer/escribir (no basta leer la fila persistida, puede estar stale). Plan decide: recompute inline en el batch vs un trigger de recompute periódico previo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (propiedad + mapping) → Slice 2 (table + flag) → Slice 3 (batch writeback) → Slice 4 (signals) → Slice 5 (docs).
- Slice 3 NO puede escribir sin Slice 1 (propiedad inexistente = PATCH 400) ni Slice 2 (flag + snapshot para idempotency).
- La propiedad `[GH] OTD` debe existir en Notion (out-of-band) ANTES de flipear el flag.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Loop webhook→writeback→webhook | integrations (Notion) | low | escribe select, no status; captura re-fetchea status unchanged → noop | `writeback_dead_letter_otd` |
| Exceder rate limit Notion | integrations | medium | Cloud Tasks throttling ≤3 req/s | logs 429 + `writeback_lag_otd` |
| Operador edita `[GH] OTD` a mano | integrations | low | propiedad read-only via permisos Notion; batch sobreescribe | paridad visual |
| Escribir bucket stale (M1 flag OFF) | delivery | low | batch degrada honesto si flag M1 OFF, no escribe | `writeback_lag_otd` |
| Confusión operador display vs bono | UI/proceso | medium | doc clara: `[GH] OTD` es display GH; el bono sigue en legacy hasta M3 | N/A — comms |

### Feature flags / cutover

- `NOTION_OTD_WRITEBACK_ENABLED` (global, default OFF) + `NOTION_OTD_WRITEBACK_ENABLED_EFEONCE` / `_SKY` (per-cliente, ganan sobre global — patrón TASK-919). Revert: flag a false + redeploy ops-worker. <5 min.
- Activación gateada per ICO stop-gates: shadow/demo first recomendado; el operador puede override (precedente RpA Flip A) tras invocar skills ICO/Notion/producción — el riesgo es exposición al cliente (columna nueva escasa al principio), no técnico ni de bono.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | propiedad Notion queda vacía (nadie escribe sin flag) | inmediato | sí |
| Slice 2 | revert PR (migration additive, tabla nueva) | <10 min | sí |
| Slice 3 | flag a false + redeploy | <5 min | sí |
| Slice 4 | revert PR (signal additive) | <10 min | sí |
| Slice 5 | revert doc | inmediato | sí |

### Production verification sequence

1. Crear `[GH] OTD` en Notion staging/demo + verify select options.
2. Deploy con flag OFF + verify cero escrituras + legacy intacto.
3. Flip flag per-cliente (Efeonce primero) en staging/demo + correr batch + verify `[GH] OTD` poblado + paridad visual vs `Indicador de Performance`.
4. Verify signals dead_letter/lag = 0.
5. Repetir en prod con cooldown + monitor 7d.

### Out-of-band coordination required

- Crear propiedad `[GH] OTD` (select, read-only) en DB Tareas Efeonce + Sky vía Notion API/UI con el token integración Greenhouse. Comms a Delivery: `[GH] OTD` es display del motor; el bono no cambia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Propiedad `[GH] OTD` existe en Efeonce + Sky, read-only para operadores.
- [ ] Daily batch escribe el bucket GH-owned per-tarea del período activo, idempotente, vía Cloud Tasks throttled.
- [ ] Flag global + per-cliente, default OFF → cero escrituras hasta activación.
- [ ] `otd_pct` + bono + fórmula legacy `Indicador de Performance` INTACTOS (verificado).
- [ ] 2 reliability signals visibles en `/admin/operations`, steady = 0.
- [ ] Echo-loop verificado: escribir `[GH] OTD` no dispara recompute de transición.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Smoke en demo/staging: flip flag → batch → `[GH] OTD` poblado + paridad visual.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-922 M2, TASK-923 M1, OTD_V1.md)
- [ ] CLAUDE.md extendido (writeback OTD)

## Follow-ups

- Componente event-driven (PATCH inmediato al completar) si se necesita latencia <24h.
- M3 (cutover bono OTD): TASK futura gateada (≥30d shadow + sign-off HR) — ortogonal a este display writeback.

## Delta 2026-05-27 — fuente corregida a M2 freeze-aware (PG), no M1 crudo (BQ)

Reconciliación a pedido del operador (sesión de verificación ICO 2026-05-27). El diseño original de esta task escribía el bucket **M1 crudo** (`gh_otd_bucket`, BQ) y asumía que el freeze de M2 fluiría a esa misma columna BQ automáticamente. **Ese supuesto es falso**: el spec de M2 (`ATTRIBUTABLE_LATENESS_V1.md` §9) decidió explícitamente **NO** espejar el freeze a BQ (el cómputo multi-ciclo no es un CASE BQ mantenible; el helper TS es source of truth). El bucket freeze-corregido vive **solo en PG** (`task_attributable_lateness_shadow.bucket_attributable`).

Cambios aplicados: fuente del writeback = PG shadow `bucket_attributable` (M2, TASK-922) en vez de `gh_otd_bucket` (BQ, M1); el daily batch **recomputa** el shadow de tareas abiertas antes de escribir (el shadow es event-materializado, no una VIEW viva, y los buckets `overdue`/`carry_over` dependen de `now()`); Blocked-by repointeado a TASK-922; escribe solo `data_status='valid'` (degraded honesto). Se preserva el diseño daily-batch + flag + signals + echo-loop safety.

**Verificación empírica del shadow live 2026-05-27** (relevante para decidir el flip): el freeze SÍ descuenta días reales (ej. Efeonce 41.6 días en una tarea) pero **no está flipeando ningún bucket** (`freeze_changed_bucket=0`: las tareas `overdue` lo están por márgenes mayores al freeze), y la fecha justa **no se extiende** porque hay **0 reprogramaciones `operator_confirmed`** (TASK-921 capturó 105 cambios, todos `inferred`). O sea: hoy `[GH] OTD` mostraría un bucket casi idéntico al legacy en la mayoría de casos. El plumbing vale igual (transparencia + de-risk, patrón RpA Flip A), pero la divergencia visible llegará recién cuando los operadores empiecen a confirmar motivos en Notion.

## Open Questions

- **¿Activar el display ya o esperar divergencia?** Con freeze sin flipear buckets + 0 motivos confirmados (ver Delta 2026-05-27), `[GH] OTD` ≈ legacy hoy. Recomendación: shippear plumbing con flag OFF; decidir el flip per-cliente con datos acumulados y/o tras empujar la confirmación de motivos (follow-up de TASK-921).
- Nombre/labels de la propiedad: `[GH] OTD` con codes `on_time/...` vs labels es-CL ("A tiempo", "Tardío", "Vencido", "Arrastre", "N/A"). Definir en plan con `greenhouse-ux-writing`.
- Tipo de propiedad: `select` (recomendado, enum cerrado) vs `status` vs `rich_text`. Plan decide.
- Batch dedicado (Cloud Scheduler nuevo) vs rides en `ops-reactive-delivery` existente.

## Delta 2026-06-19 — reposicionamiento: de "display ortogonal" a **puente del camino crítico de M3**

Auditoría read-only a pedido del CEO (revisar runtime + planear el cutover). **No se tocó código ni runtime.** Dos cambios de contexto que reposicionan esta task:

**1. El freeze ya genera divergencia visible (vs el supuesto del Delta 2026-05-27).** Aquel Delta observó `freeze_changed_bucket=0` y concluyó "`[GH] OTD` ≈ legacy hoy". **Ya no es cierto:** al 2026-06-18 el shadow tiene 334 filas y el freeze **flipea 29 tareas `overdue`→`carry_over`**. O sea el writeback YA mostraría divergencia real (el motor rescatando tareas cuyo atraso bruto era tiempo en revisión/bloqueo/pausa). El argumento de valor de display subió.

**2. ⚠️ Esta task (o un equivalente de atribución) es PREREQUISITO DURO de M3, no ortogonal.** El Out-of-Scope y el Blocks/Impacts dicen "no bloquea M3 — display paralelo". La auditoría mostró que eso **subestima su rol**: el bucket freeze-corregido vive solo en PG (`task_attributable_lateness_shadow.bucket_attributable`) **sin `assignee_member_id` ni período**, y `task_status_transitions.assignee_member_id` está 0% poblado. El `otd_pct` por miembro que consume el bono se computa en **BigQuery** vía el bridge assignee Notion→member (`v_tasks_enriched`). Por lo tanto, para que la corrección llegue al bono por colaborador hace falta re-meterla en ese agregado BQ atribuido — y el round-trip **`[GH] OTD` → sync Notion→BQ → columna atribuida** que construye esta task es justamente ese puente. M3 (TASK-1169) lista esto como su prerequisito de atribución **ruta A**. (Ruta B alternativa: agregar `assignee_member_id`+período al shadow + agregación member-aware en PG, evitando el round-trip — decisión abierta en TASK-1169.)

**Consecuencia operativa:** si se elige la ruta A para el cutover, esta task gana prioridad (es bloqueante de M3) y requiere un paso extra no listado hoy: **configurar el sync Notion→BQ para ingerir `[GH] OTD`** como columna de `v_tasks_enriched` (sin eso, escribir a Notion no alcanza al agregado del bono). Agregar ese slice si M3 confirma ruta A.

**3. Motivos confirmados siguen en 0** (735 capturas, 100% inferred — ver TASK-921 Delta 2026-06-19). Mientras siga así, el `bucket_attributable` corrige solo por freeze (no por extensión de fecha justa), así que `[GH] OTD` reflejará exactamente eso. No cambia el diseño de esta task; sí es contexto para la comms al operador.

### Corrección 2026-06-19 — esta task NO es prerequisito duro de M3 (es una de dos rutas)

El punto 2 de arriba afirmó que esta task (o su equivalente) es "prerequisito duro de M3" porque la corrección no podía atribuirse por miembro sin el round-trip a Notion. **Sobreestimé el rol por un error de análisis** (crucé la tabla equivocada para medir atribución). Verificado: la atribución ya existe en `greenhouse_delivery.tasks.assignee_member_id` (join `notion_task_id`, ~51% directo + reconstruible desde logs). Por lo tanto el cutover M3 puede atribuir **sin** este writeback, vía **ruta B (PG-native)**. Esta task sigue siendo valiosa (transparencia del bucket corregido en Notion + ruta A de atribución si se prefiere reusar el agregado BQ legacy), pero **no bloquea M3**. La decisión ruta A vs B vive en TASK-1169 §Detailed Spec.
