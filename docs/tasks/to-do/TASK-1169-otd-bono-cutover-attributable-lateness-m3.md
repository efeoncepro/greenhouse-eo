# TASK-1169 — M3: cutover del bono OTD a atraso imputable (flip gateado, post-nómina)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- Backend impact: `reader`
- Epic: `optional`
- Status real: `Planeación del cutover (M3 del ADR Attributable Lateness V1). Flujo crítico y delicado: toca el bono / nómina. NO listo para tomar hasta cerrar los prerequisitos de §Prerequisitos. Documentada a pedido del CEO (2026-06-19) para planear el flip con calma.`
- Rank: `TBD`
- Domain: `delivery|ico|payroll|integrations|reliability`
- Blocked by: `TASK-922 (M2 shadow) ✅ + TASK-923 (M1) ✅ + TASK-921 (M0) ✅ shipped y ACTIVOS en prod, PERO con 3 prerequisitos abiertos antes del flip: (1) cablear la atribución por miembro/período del bucket corregido — la fuente EXISTE (greenhouse_delivery.tasks.assignee_member_id, ~51% join directo + reconstruible desde los logs de eventos), solo falta llevarla al agregado de otd_pct (ver §Prerequisitos / Corrección 2026-06-19); (2) motivos operator_confirmed fluyendo — hoy 0/735 (TASK-921); (3) ≥30d shadow verde member-level + 8 stop-gates. TASK-927 (writeback [GH] OTD) es UNA de las rutas de atribución (A), NO un prerequisito duro — la ruta B (PG-native) es viable.`
- Branch: `task/TASK-1169-otd-bono-cutover-attributable-lateness-m3`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Ejecutar el **cutover del bono OTD** (M3 del ADR `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16): cambiar la fuente de `otd_pct` que alimenta `calculateOtdBonus` desde el bucket legacy synced de Notion (`performance_indicator_code`) hacia el **bucket corregido por atraso imputable** (freeze-aware + reason-aware) que Greenhouse computa en M2. Es el **único movimiento que toca el bono / la nómina** y el que cierra ISSUE-081 en producción.

Por seguridad es un **flip gateado, per-cliente (Efeonce primero), default OFF**, detrás de los 8 stop-gates canónicos del estrangulador + sign-off del CEO. La costura técnica es quirúrgica (un punto: las constantes de bucket en [src/lib/ico-engine/shared.ts](../../src/lib/ico-engine/shared.ts)), pero **el prerequisito real no es el flip sino la atribución** del bucket corregido a colaborador y mes (hoy inexistente). Esta task documenta el plan completo; el flip productivo lo autoriza el CEO cuando los prerequisitos estén verdes.

## Why This Task Exists

M0/M1/M2 construyeron y prendieron en shadow todo el motor de atraso imputable (verificado live 2026-06-19: shadow con 334 filas frescas, el freeze ya flipea 29 `overdue`→`carry_over`). Pero ese cómputo corregido **no llega al bono**: vive en una columna shadow que nadie lee. M3 es el paso que conecta la corrección con `otd_pct → calculateOtdBonus`, dejando de penalizar al colaborador por demoras de cliente/bloqueos/pausas (la causa raíz de ISSUE-081, activa en producción).

Se documenta ahora —antes de implementar— porque es un flujo crítico y delicado (toca nómina) que el CEO quiere planear con cuidado, y porque la auditoría 2026-06-19 destapó un blocker de atribución que no estaba en el plan original del ADR y que reordena los prerequisitos.

## Goal

- Cambiar la fuente del bucket OTD que computa `otd_pct` desde `performance_indicator_code` (legacy synced) hacia el bucket corregido member-atribuido, **sin tocar** `calculateOtdBonus` ni el agregado `otd_pct` (solo cambia el origen del bucket por tarea).
- Flag de cutover **per-cliente** (`OTD_BONUS_CUTOVER_ENABLED` global + `_EFEONCE`/`_SKY`), default OFF, mirror del patrón `isNotionRpaWritebackEnabled`.
- Resolver la **atribución por miembro/período** del bucket corregido (decisión ruta A vs B — ver §Detailed Spec).
- Backward-compat: la fórmula Notion legacy `Indicador de Performance` + `performance_indicator_code` synced se preservan ≥90 días post-flip (rollback trivial = flag OFF).
- Reconciliación HR pre-flip con diff bono legacy vs corregido <1% (o explicación documentada de cada delta), firmada por el CEO.
- Kill switch <5 min verificado en staging + runbook publicado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 — M3 es el 4º movimiento; §16.1 garantía de nómina, §16.3 dual-column, §16.6 hard rules.
- `docs/architecture/GREENHOUSE_ICO_METRICS_PROGRESSIVE_MIGRATION_V1.md` §3 — los **8 stop-gates** obligatorios (no judgment call ad-hoc).
- `docs/architecture/metrics/OTD_V1.md` + `metrics/ATTRIBUTABLE_LATENESS_V1.md` — spec de la métrica (Delta al cutover; spec y cómputo se mueven juntos).
- `docs/architecture/GREENHOUSE_PAYROLL_BONUS_CALCULATION_V1.md` — `calculateOtdBonus` (consumer; NO se modifica).
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` — Notion = OS / Greenhouse = motor.
- Skills obligatorias al tomar: `greenhouse-ico`, `greenhouse-payroll-auditor`, `greenhouse-production-release` (si el flip se hace vía promoción), `notion-platform` (si ruta A).

Reglas obligatorias:

- **NUNCA** ejecutar el flip dentro de los 7 días de ventana de nómina (ADR §16.6).
- **NUNCA** flipear sin los 8 stop-gates + reconciliación HR <1% + sign-off CEO documentado en `Handoff.md`.
- **NUNCA** flipear ambos clientes (Efeonce + Sky) simultáneamente — Efeonce primero, Sky ≥30d después con reconciliación propia.
- **NUNCA** borrar/sobrescribir `performance_indicator_code` synced ni la fórmula Notion legacy (backward-compat ≥90d).
- **NUNCA** modificar `calculateOtdBonus` ni el agregado `otd_pct` — el cutover cambia solo la **fuente del bucket por tarea**.
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`.
- **SIEMPRE** correr como gate de cierre `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + suite ICO en verde (toca el bono).

## Normative Docs

- `metrics/ATTRIBUTABLE_LATENESS_V1.md` — Delta §cutover cuando ship.
- `metrics/OTD_V1.md` — Delta §fuente del bucket.
- `docs/operations/runbooks/` — runbook de cutover OTD (a crear en Slice de runbook).

## Dependencies & Impact

### Depends on

- **TASK-922 (M2) ✅ SHIPPED + ACTIVO** — `task_attributable_lateness_shadow.bucket_attributable` (fuente del valor corregido).
- **TASK-923 (M1) ✅ SHIPPED** — `classifyOtdBucket` + `gh_otd_bucket` (clasificador base; freeze-OFF, member-atribuido en BQ pero sin corrección).
- **TASK-921 (M0) ✅ SHIPPED + ACTIVO** — log de reprogramación + motivo (necesario para la `fairDeadline`).
- **Atribución por miembro/período del bucket corregido** — **NO existe hoy** (ver §Prerequisitos). Posible dependencia de **TASK-927** (ruta A).
- **Motivos `operator_confirmed` fluyendo** — hoy 0 (ver §Prerequisitos).

### Blocks / Impacts

- Cierra **ISSUE-081** en producción (junto con M0/M1/M2 ya shipped).
- Impacta `otd_pct` → `calculateOtdBonus` → `payroll_entries` (el bono mensual). Blast radius medido en §Detailed Spec.
- Surfaces que leen OTD (Person/Account 360, Agency, SLA, Nexa) empiezan a ver el número corregido al cutover.

### Files owned

> Estimado — `[verificar]` cada path durante Discovery al tomar la task.

- `src/lib/ico-engine/shared.ts` — la costura: `CANONICAL_ON_TIME_SQL` / `CANONICAL_LATE_DROP_SQL` / `CANONICAL_OVERDUE_SQL` / `OTD_DENOMINATOR_SQL` (~líneas 315-401) — MODIFY (fuente del bucket detrás de flag).
- `src/lib/notion-metrics/otd-classifier-flags.ts` — flag de cutover per-cliente — MODIFY/NEW.
- `src/lib/payroll/fetch-kpis-for-period.ts` — verificar que `getMetricValue(snapshot,'otd_pct')` toma la fuente nueva post-flip (sin cambio de firma).
- `src/lib/ico-engine/schema.ts` / `materialize.ts` — si ruta A: ingestión de `[GH] OTD` synced en `v_tasks_enriched`.
- `migrations/` — si ruta B: `assignee_member_id` + período en el shadow / proyección member-aware.
- `scripts/notion-metrics/restore-snapshot-otd.ts` — script de snapshot pre-flip restorable (stop-gate 3.6) — NEW.
- `docs/operations/runbooks/otd-bono-cutover.md` — runbook + kill switch (stop-gates 3.7/3.8) — NEW.
- `docs/architecture/metrics/{OTD_V1,ATTRIBUTABLE_LATENESS_V1}.md` — Deltas.

## Current Repo State

### Already exists

- Motor M0/M1/M2 completo y ACTIVO en prod (shadow): captura, clasificador, compute corregido. Verificado live 2026-06-19.
- La costura única del cutover ya identificada: [shared.ts](../../src/lib/ico-engine/shared.ts) constantes de bucket; `calculateOtdBonus` ([src/lib/payroll/bonus-proration.ts](../../src/lib/payroll/bonus-proration.ts)) es pura y NO requiere cambios.
- Patrón de flag per-cliente canónico: `isNotionRpaWritebackEnabled` / `isNotionFtrWritebackEnabled` (`_EFEONCE`/`_SKY` override → global).
- TASK-927 (writeback `[GH] OTD`) especificada en `to-do/` (candidato a ruta A de atribución).

### Gap

- **Atribución:** el bucket corregido (`bucket_attributable`, PG) no tiene `assignee_member_id` ni período; `task_status_transitions.assignee_member_id` = 0% poblado. La corrección no está en el agregado BQ member-atribuido que consume el bono. **Blocker duro.**
- **Motivos:** 0/735 reprogramaciones `operator_confirmed` → `fairDeadline` no se extiende → corrección solo por freeze.
- No existe flag de cutover, snapshot restorable, runbook ni reconciliación HR.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (toca el bono / nómina + switch de source of truth)
- Impacto principal: `reader` (cambia la fuente del bucket que computa `otd_pct`; secundariamente `migration` si ruta B)
- Source of truth afectado: bucket OTD por tarea → `otd_pct` (BQ `v_tasks_enriched` / `metrics_by_member`) consumido por `calculateOtdBonus`
- Consumidores afectados: `payroll` (bono), Person/Account 360, Agency, SLA, Nexa (lectura OTD)
- Runtime target: `production` (flip gateado per-cliente)

### Contract surface

- Contrato existente a respetar: `calculateOtdBonus` ([src/lib/payroll/bonus-proration.ts](../../src/lib/payroll/bonus-proration.ts)) — NO se modifica; agregado `otd_pct` en [shared.ts](../../src/lib/ico-engine/shared.ts) — NO cambia su firma
- Contrato nuevo o modificado: fuente del bucket por tarea (`CANONICAL_*_SQL`) detrás de flag; si ruta A, columna `[GH] OTD` ingerida en `v_tasks_enriched`
- Backward compatibility: `gated` (flag default OFF; legacy `performance_indicator_code` + fórmula Notion preservados ≥90d)
- Full API parity: el bono lee el primitive canónico `otd_pct`; no hay lógica ad hoc en UI — el cutover es server-side puro

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_delivery.task_attributable_lateness_shadow`, `v_tasks_enriched`, `metrics_by_member`
- Invariantes que no se pueden romper:
  - `otd_pct` con flag OFF debe ser byte-idéntico al legacy (test de paridad)
  - el cutover cambia solo el origen del bucket por tarea, nunca el agregado ni `calculateOtdBonus`
  - partición disjunta freeze vs extensión de fecha justa (anti-doble-descuento, ADR §5)
- Tenant/space boundary: per-cliente (`efeonce`/`sky`) vía workspace; flag per-cliente, Efeonce primero
- Idempotency/concurrency: el flip es un cambio de fuente de lectura (no write nuevo); la materialización ICO ya es idempotente (MERGE + freshness gate)
- Audit/outbox/history: dual-column ≥90d + signals `shadow_paridad_otd_*` + snapshot pre-flip restorable

### Migration, backfill and rollout

- Migration posture: `additive` (ruta A: columna synced; ruta B: `assignee_member_id`+período en shadow)
- Default state: `flag OFF` (cero impacto en bono hasta el flip)
- Backfill plan: reconciliación member-level dry-run pre-flip; sin mutación destructiva
- Rollback path: flag `_EFEONCE` OFF (<5 min) + restore snapshot (<1h) si ya corrió nómina
- External coordination: sign-off CEO + (ruta A) propiedad `[GH] OTD` + ingestión en sync + comms Delivery

### Security and access

- Auth/access gate: el cutover no expone superficie nueva; lectura ICO ya gateada por capability/role
- Sensitive data posture: `payroll` (impacta el bono — crítico)
- Error contract: `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`; sin raw errors al cliente
- Abuse/rate-limit posture: N/A (lectura interna); si ruta A, Cloud Tasks throttling lo maneja TASK-927

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + suite ICO + test de paridad flag-OFF
- DB/runtime checks: reconciliación member-level contra PG/BQ real vía proxy; snapshot restore verificado
- Integration checks: (ruta A) smoke `[GH] OTD` synced llega a `v_tasks_enriched`
- Reliability signals/logs: `shadow_paridad_otd_*`, `reschedule.pending_reason_confirmation`
- Production verification sequence: ver §Rollout Plan → Production verification sequence

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumidores nombrados con paths reales (hecho arriba).
- [ ] Invariantes de data, tenant/access boundary e idempotencia explícitos (hecho arriba).
- [ ] Migration/backfill/rollback posture explícito y proporcional al riesgo (hecho arriba).
- [ ] Evidencia runtime/DB listada para todo cambio más allá de docs/tooling (hecho arriba).
- [ ] Dominio sensible (payroll) con errores canónicos, audit/signal posture y sin fugas de data cruda.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Prerequisitos (gate de entrada — NO tomar la task hasta resolverlos)

Estos 3 prerequisitos son anteriores a cualquier slice de implementación del flip. Sin ellos, el cutover es imposible o corrige a medias:

1. **Cablear la atribución por miembro/período del bucket corregido.** Decidir e implementar ruta A o B (ver §Detailed Spec). La atribución **ya existe en PG** (`greenhouse_delivery.tasks.assignee_member_id`, join por `notion_task_id` — ~51% de las filas shadow matchean hoy + el resto es reconstruible desde los logs append-only); lo que falta es **llevarla al agregado que computa `otd_pct`** (hoy el shadow no denormaliza el assignee). No es un blocker de data perdida — es trabajo de plumbing de atribución. Sin él, el flip no puede atribuir el número corregido por colaborador.
2. **Motivos `operator_confirmed` fluyendo.** Habilitar el writeback-de-sugerencia de motivo (follow-up de TASK-921) y/o adopción operativa, de modo que `fairDeadline` empiece a reflejar extensiones de cliente/scope. Sin esto, M3 corrige solo por freeze (sigue siendo mejor que legacy, pero incompleto — decisión del CEO si se acepta lanzar "freeze-only" en V1).
3. **≥30 días de shadow verde + 8 stop-gates.** El shadow arrancó ~2026-05-24; el reloj de 30d se cuenta desde que la atribución (prereq 1) esté lista y midiéndose member-level, no desde hoy.

## Scope

> Los slices asumen prereq 1 resuelto. El primero formaliza la decisión de atribución porque condiciona todo lo demás.

### Slice 0 — Decisión de atribución (ADR chico) + reconciliación member-level real

- Decidir ruta A (round-trip Notion vía TASK-927 + ingestión `[GH] OTD` en `v_tasks_enriched`) vs ruta B (PG-native: `assignee_member_id`+período en shadow + agregación member-aware). Score 5-pilar ICO.
- Implementar la atribución elegida (shadow → member/período legible por el path de `otd_pct`).
- Correr la **reconciliación member-level real**: bono legacy vs bono corregido por colaborador-mes sobre data viva → diff. Output a `output-templates` HR.

### Slice 1 — Flag de cutover per-cliente

- `isOtdBonusCutoverEnabled(workspaceId)` — global `OTD_BONUS_CUTOVER_ENABLED` + `_EFEONCE`/`_SKY` (default OFF), mirror `isNotionRpaWritebackEnabled`.

### Slice 2 — Costura de fuente del bucket (detrás de flag)

- En [shared.ts](../../src/lib/ico-engine/shared.ts), las constantes `CANONICAL_*_SQL` leen el bucket corregido member-atribuido cuando el flag está ON para el workspace, y `performance_indicator_code` cuando OFF. `otd_pct` (agregado) y `calculateOtdBonus` NO cambian.
- Test de paridad: con flag OFF, `otd_pct` byte-idéntico al actual.

### Slice 3 — Snapshot pre-flip restorable (stop-gate 3.6)

- `scripts/notion-metrics/restore-snapshot-otd.ts` + snapshot BQ `ico_engine_backup.metrics_by_member_otd_<date>` (incluye `payroll_entries` proyectado). Restore <1h verificado.

### Slice 4 — Kill switch + runbook (stop-gates 3.7/3.8)

- Verificar en staging: flag ON→OFF restaura legacy <5 min sin redeploy de código. Runbook `otd-bono-cutover.md` (verificar paridad post-flip, rollback verbatim, escalación HR, qué reportar al cliente).

### Slice 5 — Docs + canonización

- Deltas `OTD_V1.md` / `ATTRIBUTABLE_LATENESS_V1.md` (§cutover); CLAUDE.md (mover M3 de "futura" a shipped al cierre); `Handoff.md` con sign-off CEO + allowlist de miembros impactados.

### Slice 6 — Flip Efeonce (gateado) + monitor

- Fuera de ventana de nómina, con 8 stop-gates verdes + sign-off CEO: flip `_EFEONCE` ON. Monitor 30d (signals + reconciliación mes 1). Sky NO se toca aquí.

## Out of Scope

- **Flip de Sky** — task/slice posterior, ≥30d después de Efeonce verde + reconciliación Sky propia.
- **Eliminar la fórmula Notion legacy** — se preserva ≥90d post-flip.
- **Cambios a `calculateOtdBonus`** (thresholds, proración) — fuera de scope; el cutover solo cambia el origen del bucket.
- **Severidad/tiers retro** del atraso (ADR §8) — follow-up.

## Detailed Spec

### La costura (confirmada por auditoría 2026-06-19)

`calculateOtdBonus` recibe un escalar `otdPercent`; no sabe de dónde sale. La cadena es:
`bucket por tarea` → `otd_pct = on_time / (on_time+late_drop+overdue)` (agregado en [shared.ts](../../src/lib/ico-engine/shared.ts)) → `getMetricValue(snapshot,'otd_pct')` → `calculateOtdBonus`. **El único punto a cambiar es la fuente del bucket por tarea** (las constantes `CANONICAL_*_SQL`). Todo aguas abajo queda byte-idéntico.

### Decisión de atribución (el verdadero trabajo de M3)

El bucket corregido (freeze-aware) vive **solo en PG** (`bucket_attributable`) por decisión deliberada del spec §9 (el freeze multi-ciclo no es un CASE BQ mantenible). El `otd_pct` por miembro se computa en **BQ** vía el bridge assignee Notion→member en `v_tasks_enriched`. Dos rutas para cerrar la brecha:

- **Ruta A — round-trip Notion (reusa atribución BQ existente).** TASK-927 escribe `bucket_attributable` a la propiedad Notion `[GH] OTD` → el sync Notion→BQ la ingiere como columna de `v_tasks_enriched` (ya member-atribuida) → el cutover swapea `performance_indicator_code` → `[GH] OTD` synced. **Pro:** reusa la atribución existente, cero duplicación. **Con:** depende de TASK-927 + un slice nuevo de ingestión en el sync + latencia del round-trip + la dependencia del now()-batch de OTD.
- **Ruta B — PG-native.** Agregar `assignee_member_id` + período al shadow (resolviendo assignee, hoy 0% en transitions) + agregación member-aware en PG que alimente `otd_pct`. **Pro:** sin round-trip, fuente única PG. **Con:** duplica la lógica de atribución + agregación que hoy vive en BQ; hay que arreglar la resolución de assignee.

Recomendación inicial (a validar en Slice 0 con `arch-architect`), **actualizada por la Corrección 2026-06-19**: la ruta B se ve más barata de lo que parecía — la atribución ya está en PG (`greenhouse_delivery.tasks.assignee_member_id`, join por `notion_task_id`), así que no hace falta el round-trip a Notion solo para atribuir. **Ruta B** si querés desacoplar el bono de Notion y reusar la atribución PG existente; **Ruta A** si TASK-927 se hará igual y preferís un solo origen (Notion=OS) + el agregado BQ legacy intacto. Decisión del CEO + arquitectura, con el blast-radius member-level en mano.

### Blast radius — método y hallazgo preliminar

Método: misma cohorte de tareas, misma fórmula `otd_pct`, solo cambia el bucket (`bucket_legacy` vs `bucket_attributable`), por colaborador-mes; aplicar thresholds de `calculateOtdBonus` (full ≥89%, proración lineal ≥70%, 0 bajo 70%). **Hallazgo 2026-06-19 (corregido):** el primer intento de reconciliación cruzó contra la tabla equivocada (`task_status_transitions`, assignee 0%) y dio todo `UNASSIGNED` — fue un **error de análisis**, no falta de data. Con la llave correcta (`notion_task_id → greenhouse_delivery.tasks.assignee_member_id`), **172/334 (~51%) de las filas shadow son atribuibles hoy**, y el resto es investigable (demo / sin asignar / sin proyectar a `tasks`) + reconstruible desde los logs de eventos. El blast-radius member-level real se corre en Slice 0 con esta llave. A nivel tarea, el freeze mueve 29/334 buckets (`overdue`→`carry_over`), dirección que **mejora** el OTD del colaborador (descuenta atraso no imputable).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Prereqs (atribución + motivos + 30d/stop-gates) → Slice 0 (decisión atribución + reconciliación) → 1 (flag) → 2 (costura, paridad OFF) → 3 (snapshot) → 4 (kill switch + runbook) → 5 (docs + sign-off) → 6 (flip Efeonce). **El flip (Slice 6) no ocurre sin 0-5 verdes + 8 stop-gates + sign-off CEO + fuera de ventana de nómina.**

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Bono cambia mal por bucket mal atribuido | payroll | media | reconciliación member-level <1% pre-flip + snapshot restorable | reconciliación mes 1 |
| Corrección "freeze-only" (motivos en 0) subcorrige | delivery/payroll | alta hoy | prereq 2 (motivos fluyendo) o decisión CEO de aceptar freeze-only V1 | `reschedule.pending_reason_confirmation` |
| Flip dentro de ventana de nómina | payroll | baja | hard rule + checklist; flip solo fuera de los 7 días | calendario nómina |
| Round-trip Notion stale (ruta A) | integrations | media | now()-batch de TASK-927 + freshness gate | `writeback_lag_otd` |
| Drift paridad post-flip | delivery | media | signal `shadow_paridad` + dual-column ≥90d | `shadow_paridad_otd_*` |
| Sky flipea junto con Efeonce | payroll | baja | per-cliente flag + hard rule Efeonce-primero | flag audit |

### Feature flags / cutover

- `OTD_BONUS_CUTOVER_ENABLED` (global, default OFF) + `OTD_BONUS_CUTOVER_ENABLED_EFEONCE` / `_SKY` (per-cliente, ganan sobre global). Revert = flag a false (sin redeploy de código si se lee en runtime). <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 (atribución) | revert PR (additive: columna/ingestión nueva) | <15 min | sí |
| 1 (flag) | revert PR | <10 min | sí |
| 2 (costura) | flag OFF → lee legacy | <5 min | sí |
| 3 (snapshot) | revert PR (script + tabla backup) | <10 min | sí |
| 4 (runbook) | revert doc | inmediato | sí |
| 5 (docs) | revert doc | inmediato | sí |
| 6 (flip Efeonce) | flag `_EFEONCE` OFF → legacy + restore snapshot si ya corrió nómina | <5 min flag / <1h restore | sí |

### Production verification sequence

1. Slice 2 con flag OFF en staging+prod → verificar `otd_pct` byte-idéntico (paridad).
2. Reconciliación member-level en staging con data real → diff <1% (o deltas explicados).
3. Snapshot pre-flip persistido + restore probado <1h en staging.
4. Kill switch ON→OFF verificado <5 min en staging.
5. Flip `_EFEONCE` en prod fuera de ventana de nómina → monitor signals + reconciliación mes 1.
6. Sky: repetir ciclo completo ≥30d después.

### Out-of-band coordination required

- **Sign-off CEO** (cubre el stop-gate 3.5 HR/Finance — confirmado 2026-06-19: "soy el CEO, no se necesita más firma que la mía"): documentar en `Handoff.md` la allowlist explícita de miembros impactados + diff bono pre/post antes del flip.
- Comms a Delivery/colaboradores: el OTD ahora descuenta tiempo no imputable (revisión cliente / bloqueo / pausa).
- Si ruta A: crear propiedad `[GH] OTD` en Notion + configurar ingestión en el sync (coordinar con TASK-927).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Prereq atribución resuelto: `bucket_attributable` legible por `(member, período)` en la fuente de `otd_pct` (ruta A o B documentada en ADR chico).
- [ ] Reconciliación member-level legacy vs corregido <1% (o cada delta explicado) — firmada por el CEO en `Handoff.md`.
- [ ] Flag `OTD_BONUS_CUTOVER_ENABLED` global + per-cliente, default OFF; con OFF `otd_pct` byte-idéntico al legacy (test de paridad).
- [ ] Snapshot pre-flip restorable <1h (script + tabla backup verificados).
- [ ] Kill switch ON→OFF <5 min verificado en staging + runbook publicado.
- [ ] 8 stop-gates verdes documentados; flip ejecutado fuera de ventana de nómina; solo Efeonce.
- [ ] `performance_indicator_code` synced + fórmula Notion legacy intactos (backward-compat ≥90d).
- [ ] `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` + suite ICO verdes; `pnpm build` verde.
- [ ] Deltas `OTD_V1.md` / `ATTRIBUTABLE_LATENESS_V1.md` + CLAUDE.md (M3 shipped) + changelog.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/payroll src/lib/workforce/offboarding` (gate de bono/finiquito)
- Reconciliación member-level contra PG/BQ real vía proxy (no solo mocks).
- Monitor post-flip: signals `shadow_paridad_otd_*` + reconciliación mes 1.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (carpeta + markdown)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado (sign-off CEO + allowlist + diff)
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-921/922/923/927 + ISSUE-081 cerrado)
- [ ] CLAUDE.md: mover M3 de "futura gated" a shipped + cerrar ISSUE-081

## Follow-ups

- **Flip de Sky** (≥30d post-Efeonce verde, reconciliación propia).
- Retiro de la fórmula Notion legacy (≥90d post-flip).
- Severidad/tiers retro del atraso (ADR §8).

## Open Questions

- **¿Ruta A o B de atribución?** Decisión de arquitectura + CEO en Slice 0.
- **¿Se acepta lanzar "freeze-only" en V1** (sin esperar motivos confirmados), o el prereq 2 es bloqueante duro? Hoy 0/735 confirmados.
- **¿El flip se hace por flag runtime o vía promoción/release control plane?** (define si se invoca `greenhouse-production-release`).
- **Desde cuándo cuenta el reloj de ≥30d shadow verde** — propuesta: desde que la atribución member-level está midiéndose, no desde 2026-05-24 (que es shadow sin atribución).
