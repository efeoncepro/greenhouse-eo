# TASK-1169 — Alinear el OTD imputable a la cohorte del bono (ajustes pendientes, sin tocar el bono)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- Backend impact: `reader`
- Epic: `optional`
- Status real: `Ajustes pendientes del OTD imputable. NO incluye el cutover del bono (ese se movió a TASK-1170). Todo en shadow / flag OFF: nunca toca nómina. Reescrita 2026-06-19 tras discovery profundo verificado contra código + data real (decisión del CEO: separar el cutover y dejar esta task solo para lo pendiente).`
- Rank: `TBD`
- Domain: `delivery|ico|integrations|reliability`
- Blocked by: `Nada nuevo. M0 (TASK-921) + M1 (TASK-923) + M2 (TASK-922) shipped y activos en shadow. Esta task resuelve los ajustes que destrabarían el cutover, pero NO ejecuta el cutover.`
- Branch: `task/TASK-1169-otd-imputable-cohorte-bono-ajustes`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Cerrar los **ajustes pendientes** para que el OTD corregido por atraso imputable (M2, hoy en `task_attributable_lateness_shadow`, PG, **por-tarea / estado-actual**) quede **alineado a la cohorte mensual por-colaborador que usa el bono** (BigQuery `ico_engine.metrics_by_member`): atribuido, deduplicado, con scoping de período, y **reconciliado honestamente** contra el OTD legacy. **Todo en shadow / flag OFF — NUNCA toca el bono.**

El **cutover real** (el flip que cambia la fuente del `otd_pct` del bono y toca nómina) se **separó a TASK-1170** por decisión del CEO (2026-06-19): es un flujo crítico que no se hará hasta que estos ajustes estén verdes. Esta task es el prerequisito de aquella, pero por sí misma **no cambia ningún número del bono**.

## Why This Task Exists

Discovery profundo 2026-06-19 (verificado contra código + data real) estableció el ground truth:

- **El bono OTD funciona correcto hoy** y se computa en **BigQuery** (`metrics_by_member` → `calculateOtdBonus`), sobre **tareas con `due_date` en el mes**, atribuidas por `primary_owner_member_id`, con freshness guard (TASK-1163). Números reales y sanos (ej. Daniela 99.1%, Melkin 100%).
- **La corrección de freeze (M2) NO está conectable al bono tal cual.** Vive en PG, **por-tarea, estado-actual, sin columna de mes ni de colaborador**, poblada solo cuando una tarea transiciona estado. Es un universo distinto al de la cohorte mensual de completadas que usa el bono.
- Evidencia del mismatch (reconciliación member-level read-only 2026-06-19): el OTD leído del shadow da 0-50% mientras el de producción da 66-100% para los mismos colaboradores. **No son comparables** porque son cohortes distintas.

Por eso, **antes de cualquier cutover** hay que producir la corrección sobre la misma cohorte del bono y reconciliar de verdad. Eso es esta task. Cierra ISSUE-081 *en su parte de preparación*; el cierre productivo lo hace TASK-1170.

## Goal

- Decidir e implementar **cómo la corrección de freeze cubre la cohorte mensual/por-colaborador del bono** (opciones B′ / A / B″ en §Detailed Spec), con `arch-architect`.
- Atribución correcta (`primary_owner_member_id` / `notion_task_id`), **dedup por tarea** y **scoping de período** alineados al path del bono.
- **Reconciliación member-level confiable** legacy vs corregido (el blast radius real, bien hecho) — read-only, no toca el bono.
- Signals de paridad **member-month** + empezar a acumular el reloj de ≥30 días de shadow verde sobre data comparable.
- Propagar el hallazgo de cohorte al **ADR §16 + `ATTRIBUTABLE_LATENESS_V1.md`** (hoy describen el modelo simplificado "flip de fuente", que el discovery invalidó).
- **NUNCA tocar el bono** (eso es TASK-1170).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` §16 (M0-M3) + §9 (PG vs BQ) — esta task corrige el supuesto §16 de que M3 es "solo flip de fuente".
- `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md` — Delta con el hallazgo de cohorte.
- `docs/architecture/metrics/OTD_V1.md` — cohorte/semántica canónica del OTD del bono.
- `src/lib/ico-engine/shared.ts` / `read-metrics.ts` / `materialize.ts` — el path real del `otd_pct` del bono (cohorte = `due_date` en período, atribución `primary_owner_member_id`).
- Skills al tomar: `greenhouse-ico`, `arch-architect`, `greenhouse-postgres`. (NO `greenhouse-payroll-auditor` como bloqueante: esta task no toca el bono — sí conviene su revisión del contrato de comparación.)

Reglas obligatorias:

- **NUNCA** esta task cambia un número que el bono lee. Todo en shadow / flag OFF. El flip es TASK-1170.
- **NUNCA** reconciliar leyendo el shadow crudo como si fuera el OTD mensual (error fuente 2026-06-19): aplicar dedup + período + atribución alineados al path BQ del bono.
- **SIEMPRE harness auto-validante (anti-repetición del error 2026-06-19):** la reconciliación DEBE primero **reproducir el OTD legacy** por colaborador-mes y matchear `metrics_by_member` (baseline conocido-bueno) ANTES de confiar el número corregido. Si la reconstrucción del legacy no matchea, el harness está mal → abortar, no reportar. Es el contrato eval-driven del repo (baseline + regresión).
- **SIEMPRE degradación honesta:** donde falte data o no sea comparable, retornar `null` + `dataStatus`, **NUNCA 0** ni vacío (regla ICO "honest degradation always"; el 0% del 2026-06-19 fue exactamente esta violación).
- **SIEMPRE reusar el materializador/patrón ICO canónico** (`runIcoMaterializerCycle` / shape `metrics_by_member`; patrón `calculateCycleTime` = helper-TS-SSOT + mirror + paridad). **NUNCA** inventar una tabla mensual paralela que duplique `metrics_by_member` (viola SSOT).
- **NUNCA** `Sentry.captureException` directo — `captureWithDomain(err, 'delivery'|'integrations.notion', ...)`.
- **SIEMPRE** comparar contra la cohorte real del bono (`metrics_by_member` / `v_tasks_enriched`), no contra el snapshot event-driven de PG.

## Normative Docs

- `metrics/ATTRIBUTABLE_LATENESS_V1.md` — Delta cohorte.
- `metrics/OTD_V1.md` — cohorte canónica.

## Dependencies & Impact

### Depends on

- **M0 (TASK-921) ✅** captura de reprogramación + motivo.
- **M1 (TASK-923) ✅** `gh_otd_bucket` (BQ, member-atribuido vía `v_tasks_enriched`, **freeze-OFF / paridad**).
- **M2 (TASK-922) ✅** `calculateAttributableLateness` + shadow PG por-tarea (freeze-ON).

### Blocks / Impacts

- **Bloquea TASK-1170 (el cutover).** Sin estos ajustes, el flip es inseguro/imposible.
- No impacta el bono ni `otd_pct` (shadow / flag OFF).

### Files owned

> Estimado — `[verificar]` cada path durante Discovery al tomar la task.

- `docs/architecture/GREENHOUSE_ATTRIBUTABLE_LATENESS_V1.md` / `metrics/ATTRIBUTABLE_LATENESS_V1.md` — MODIFY (Delta cohorte)
- `src/lib/notion-metrics/` — la materialización corregida alineada a cohorte (según ruta elegida) — NEW/MODIFY
- `migrations/` — si ruta B″ (tabla mensual member-aware) — NEW
- `src/lib/ico-engine/schema.ts` / `materialize.ts` — si ruta B′ (corrección en el path BQ mensual) — MODIFY
- `src/lib/reliability/queries/` — signal de paridad member-month — NEW
- `scripts/` — script de reconciliación member-level (read-only) — NEW

## Current Repo State

### Already exists (verificado en código 2026-06-19)

- **Bono OTD productivo:** `metrics_by_member` (BQ) → `fetch-kpis-for-period.ts` → `calculateOtdBonus`. Cohorte = `due_date` en período (`REPORT_PERIOD_SCOPE_SQL`), atribución `primary_owner_member_id`, freshness guard TASK-1163.
- **M1 `gh_otd_bucket`** (BQ, member-atribuido, freeze-OFF) en `v_tasks_enriched` + snapshots.
- **M2 shadow** (PG, por-tarea, freeze-ON) `task_attributable_lateness_shadow`, PK `task_source_id`, sin mes ni miembro.
- Atribución recuperable: `greenhouse_delivery.tasks.assignee_member_id` (join `notion_task_id`, ~51% directo + reconstruible).

### Gap (verificado)

- La corrección freeze-ON **no existe** sobre la cohorte mensual/miembro del bono — solo por-tarea en PG.
- No hay reconciliación member-level confiable legacy vs corregido.
- El ADR/metric spec aún describen el modelo "flip de fuente" (no contemplan el mismatch de cohorte).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard` (additive, shadow/analysis; NO toca el bono — el cutover crítico es TASK-1170)
- Impacto principal: `reader` (alinear + reconciliar la corrección; según ruta puede sumar `migration`)
- Source of truth afectado: ninguno productivo — produce una representación corregida paralela para comparar
- Consumidores afectados: ninguno productivo en esta task (TASK-1170 la consumirá al cutover)
- Runtime target: `staging` / `shadow` (flag OFF)

### Contract surface

- Contrato existente a respetar: el path del bono (`metrics_by_member`, `shared.ts`, `calculateOtdBonus`) — NO se modifica acá
- Contrato nuevo o modificado: la materialización corregida alineada a cohorte (ruta B′/A/B″) + el reader de reconciliación
- Backward compatibility: `compatible` (todo additive / shadow)
- Full API parity: la corrección se expone como reader/contrato, no como lógica ad hoc de pantalla

### Data model and invariants

- Entidades afectadas: `task_attributable_lateness_shadow`, `v_tasks_enriched` / `metrics_by_member`, `greenhouse_delivery.tasks`
- Invariantes:
  - la reconciliación usa la **misma cohorte** del bono (due_date en período, completadas según bucket) + dedup por tarea + atribución `primary_owner_member_id`
  - partición disjunta freeze vs extensión de fecha justa (anti-doble-descuento, ADR §5)
  - nada de esta task altera `otd_pct` ni el bono
- Tenant/space boundary: per-cliente (efeonce/sky) coherente con el path del bono
- Idempotency/concurrency: materialización idempotente (MERGE / UPSERT por clave canónica)
- Audit/outbox/history: signals de paridad member-month; sin mutación productiva

### Migration, backfill and rollout

- Migration posture: `additive` (o `none` si ruta B′ es solo expresión BQ)
- Default state: `shadow` / flag OFF
- Backfill plan: recompute sobre la cohorte mensual de meses recientes para la reconciliación
- Rollback path: revert PR (additive)
- External coordination: ninguna que toque nómina; (si ruta A) coordinación con TASK-927

### Security and access

- Auth/access gate: lectura interna ya gateada por capability/role; sin superficie nueva
- Sensitive data posture: `no sensitive data` directo (es métrica; el bono no se toca acá)
- Error contract: `captureWithDomain`; sin raw errors
- Abuse/rate-limit posture: N/A (interno)

### Runtime evidence

- Local checks: tests del helper de cohorte/reconciliación + reconciliación read-only contra PG/BQ real
- DB/runtime checks: comparar OTD corregido vs `metrics_by_member` real por colaborador-mes (dedup+período)
- Integration checks: (ruta A) `[GH] OTD` synced llega a `v_tasks_enriched`
- Reliability signals/logs: signal paridad member-month
- Production verification sequence: N/A productivo (shadow); la verificación es la reconciliación member-level

### Acceptance criteria additions

- [ ] Cohorte, atribución y dedup de la reconciliación alineados al path real del bono (paths nombrados).
- [ ] Reconciliación member-level confiable (no el shadow crudo) con resultados por colaborador-mes.
- [ ] Invariantes anti-doble-descuento explícitos y testeados.
- [ ] Nada de esta task altera el bono (verificado: flag OFF / shadow).

<!-- ZONE 2 — PLAN MODE: lo llena el agente que tome la task -->

## Plan (2026-06-19, ejecución develop local-first)

**Slice 0 — DONE.** ADR chico = `GREENHOUSE_ATTRIBUTABLE_LATENESS_V1` §16.10: decisión **B′-PG** (helper TS SSOT + tabla shadow PG enfocada member×month, reusa patrón ICO, sin round-trip Notion) + score 5-pilar + hallazgo de cohorte que invalida "M3 = solo flip". Delta también en `metrics/ATTRIBUTABLE_LATENESS_V1.md`. Confirmado por CEO (AskUserQuestion 2026-06-19).

**Slice 1** — migration additive `greenhouse_delivery.otd_attributable_member_month_shadow` (PK member_id+period+workspace; otd legacy-reproducido + corregido + counts + data_status) + helper TS agregador (cohorte del bono desde PG, freeze-OFF legacy via `classifyOtdBucket` + freeze-ON corregido via `calculateAttributableLateness`, atribución `assignee_member_id`, dedup por tarea) + materializer idempotente (UPSERT). Flag OFF.

**Slice 2** — reconciliación member-level read-only con harness auto-validante: lee `metrics_by_member` (BQ, baseline) + reproduce legacy desde Slice 1, exige match por colaborador-mes ANTES de reportar corregido; degradación honesta (null+dataStatus). Script `scripts/`.

**Slice 3** — reliability signal member-month (divergencia legacy↔corregido + comparabilidad de cohorte), wire 5 touchpoints en `get-reliability-overview.ts`, inicia reloj ≥30d.

**Slice 4** — docs Delta (ADR §16 + metric spec ya hechos en Slice 0; cross-ref TASK-1170) + closing protocol.

Regla dura transversal: nada toca el bono (shadow / flag OFF). El flip es TASK-1170.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Decisión de enfoque (ADR chico, con `arch-architect`)

Decidir cómo producir la corrección de freeze sobre la **cohorte mensual/por-colaborador del bono**:

- **B′ (BQ-native, ≈ hint original ADR §16):** aplicar la corrección dentro del path que materializa `metrics_by_member` / `v_tasks_enriched`. Lo más alineado con el bono; reto: el freeze multi-ciclo no era un CASE BQ mantenible (razón por la que M2 fue a PG) → evaluar un helper TS que materialice a una tabla mensual member-aware.
- **A (round-trip Notion vía TASK-927):** escribir el bucket corregido a `[GH] OTD` → sync → BQ (ya atribuido + mensual). Resuelve cohorte + atribución de un golpe; costo: round-trip + dependencia de TASK-927 + slice de ingestión en el sync.
- **B″ (PG mensual nuevo):** materialización mensual de completadas con corrección + atribución en PG. Evita el round-trip; duplica lo que BQ ya hace.

**Recomendación de la revisión arquitectónica (a confirmar en Slice 0):** **B′ implementada como helper TS canónico que materializa una tabla/columna mensual member-atribuida corregida** (patrón `calculateCycleTime`: helper TS = SSOT + mirror + test de paridad + signal), **NO** como CASE en BQ (M2 ya lo rechazó por inmantenible). **A** queda como fallback (mete Notion en el camino del bono = acoplamiento frágil + latencia; solo si la atribución no se pudiera hacer PG/BQ-side, que sí se puede). **B″** rechazada como default (duplicaría `metrics_by_member` → viola SSOT). Entrega: ADR chico con la decisión + score 5-pilar.

### Slice 1 — Materialización corregida alineada a cohorte (shadow, flag OFF)

Implementar la ruta elegida: el bucket corregido disponible **por colaborador-mes**, misma cohorte que el bono, en shadow. No lo lee ningún consumer productivo.

### Slice 2 — Reconciliación member-level confiable

Reader/script read-only que compara, por colaborador-mes, el OTD legacy (`metrics_by_member`) vs el OTD corregido (Slice 1), con **dedup por tarea + scoping de período + atribución `primary_owner_member_id`**. Entrega el blast radius real (cuántos colaboradores mueven, cuánto, quién cruza umbral de bono).

### Slice 3 — Signal de paridad member-month (detector upstream) + reloj ≥30d

Signal canónico a nivel **member-month** (no por-tarea) que mide: (a) la divergencia legacy↔corregido y (b) la **comparabilidad de cohorte** — que la población del corregido matchee la del bono. El bug class de 2026-06-19 (shadow ≠ cohorte del bono) se encontró a mano; debe tener signal antes de que lo encuentre una UI/decisión rota (regla ICO "reliability signal upstream"). Inicia el conteo de ≥30 días verdes sobre data comparable (prerequisito del cutover en TASK-1170).

### Slice 4 — Propagar docs

Delta a `ATTRIBUTABLE_LATENESS_V1.md` + ADR §16 con el hallazgo de cohorte (hoy describen el modelo simplificado). Cross-ref a TASK-1170.

## Out of Scope

- **El cutover del bono / el flip** → **TASK-1170** (toca nómina; 8 stop-gates + sign-off CEO).
- Snapshot pre-flip / kill-switch / runbook del flip → TASK-1170.
- Flag de cutover per-cliente + costura SQL en `shared.ts` → TASK-1170.
- Motivos `operator_confirmed` / writeback de sugerencia → follow-up de TASK-921.

## Detailed Spec

Ver §Why + §Scope. El corazón es Slice 0 (decisión B′/A/B″) y Slice 2 (reconciliación bien hecha). El ground truth verificado 2026-06-19:

- Bono: `metrics_by_member` (BQ), cohorte `due_date` en período, atribución `primary_owner_member_id`, denominador `on_time+late_drop+overdue` (excluye carry_over).
- M2 shadow: PG, por-tarea, estado-actual, sin mes/miembro, solo tareas que transicionan con flag ON, clasificado por `now()` vs fecha justa.
- Mismatch confirmado: OTD shadow 0-50% vs OTD bono 66-100% (mismos colaboradores) → cohortes distintas.

## Revisión arquitectónica (skills `greenhouse-ico` + `arch-architect`, 2026-06-19)

Revisión profunda contra los contratos canónicos. Decisión recomendada: **ruta B′ como helper TS canónico** (ver §Scope Slice 0). Scoring 5-pilar (ICO) / 4-pilar (arch):

- **Safety:** flag OFF + shadow → no toca el bono. El riesgo real NO es el flip (no ocurre acá) sino **medir mal** (ya pasó el 2026-06-19) → mitigado por el harness auto-validante (reproducir legacy antes de confiar el corregido) + degradación honesta.
- **Robustness:** dedup por tarea + scoping de período + atribución `primary_owner_member_id` alineados al path del bono; partición disjunta freeze/fecha-justa (anti-doble-descuento); `null`+`dataStatus` donde no compare (nunca 0).
- **Resilience:** signal member-month como **detector upstream** del bug class de cohorte (hoy hallado a mano); reconciliación reproducible desde snapshot.
- **Scalability:** reusar el materializador ICO (`runIcoMaterializerCycle`, MERGE + freshness) → absorbe N colaboradores/meses sin rediseño; sin tabla paralela (SSOT).
- **Auditability (ICO):** cada bucket corregido trazable a su fecha justa + motivo, y la reconciliación reproducible desde snapshot — sin esto no es evidencia válida para el cutover (TASK-1170).

Patrones canónicos reusados: VIEW/helper/signal canónico · helper-TS-SSOT + mirror BQ + test de paridad (`calculateCycleTime`) · eval-driven (baseline legacy + regresión) · honest degradation · reliability-signal-upstream. Anti-patrón evitado: tabla paralela que duplique `metrics_by_member`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 0 (decisión) → 1 (materialización corregida shadow) → 2 (reconciliación) → 3 (signal + reloj) → 4 (docs). Ningún slice toca el bono; el flip es TASK-1170.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Reconciliar de nuevo contra cohorte equivocada | delivery | media | regla dura: comparar contra metrics_by_member real + dedup + período | revisión arch + paridad member-month |
| Ruta B′ inviable (freeze multi-ciclo en BQ) | delivery | media | Slice 0 evalúa antes de construir; fallback A/B″ | ADR chico |
| Creer que esto "ya es el cutover" | proceso | media | esta task es shadow/flag OFF por diseño; el flip vive en TASK-1170 | — |

### Feature flags / cutover

- Todo en shadow / flag OFF. No hay flip acá. El flag de cutover del bono vive en TASK-1170.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | descartar ADR chico | inmediato | sí |
| 1 | revert PR (additive shadow) | <15 min | sí |
| 2 | revert PR (reader/script) | <10 min | sí |
| 3 | revert PR (signal) | <10 min | sí |
| 4 | revert doc | inmediato | sí |

### Production verification sequence

N/A productivo (shadow). La verificación es la reconciliación member-level read-only contra data real.

### Out-of-band coordination required

- (Ruta A) coordinación con TASK-927 + ingestión `[GH] OTD` en el sync.
- Ninguna que toque nómina.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] ADR chico Slice 0 con la decisión B′/A/B″ + score 5-pilar. → §16.10, B′-PG confirmada por CEO.
- [x] Corrección freeze-ON disponible por colaborador-mes, misma cohorte que el bono, en shadow (flag OFF), reusando el patrón del materializador ICO (sin tabla paralela). → `otd_attributable_member_month_shadow` + helper SSOT (enfocada, no duplica `metrics_by_member`).
- [x] **Harness auto-validante:** la reconciliación reproduce el OTD legacy y matchea `metrics_by_member` por colaborador-mes (baseline) ANTES de reportar el corregido. Documentado el match. → `cohort_reproduced`; legacy = recompute live del reader del bono (el materializado de períodos cerrados está stale). 2026-04/05/06: cohorte reproducida=20, cohort_mismatch=0.
- [x] Reconciliación member-level confiable (dedup + período + atribución) con blast radius por colaborador-mes; degradación honesta (null+dataStatus, nunca 0 donde no compare). → `scripts/reconcile-otd-attributable-member-month.ts`.
- [x] Signal member-month (divergencia + comparabilidad de cohorte) wired como detector upstream. → `delivery.attributable_lateness.member_month_paridad` (severity=ok live). Reloj ≥30d: requiere correr el materializador periódicamente (rollout pendiente, no bloquea — gateado a TASK-1170).
- [x] ADR §16 + `ATTRIBUTABLE_LATENESS_V1.md` actualizados con el hallazgo de cohorte. → §16.10-16.11 + metric spec Delta.
- [x] Verificado: nada de esta task altera `otd_pct` ni el bono. → todo shadow / sin consumer productivo / 0 cambios de tier de bono.
- [x] `pnpm test` (focales) + `pnpm build` verdes. → focales verdes; full gate en cierre.

## Verification

- `pnpm lint` · `pnpm tsc --noEmit` · `pnpm test`
- Reconciliación member-level contra PG/BQ real vía proxy (no solo mocks).
- Confirmar flag OFF / shadow: el bono no cambia.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] chequeo de impacto cruzado (TASK-921/922/923/927/1170)
- [ ] ADR + metric spec actualizados

## Follow-ups

- **TASK-1170 — el cutover del bono** (flip gateado, post-nómina). Consume el resultado de esta task.
- Motivos `operator_confirmed` (follow-up TASK-921) para que la fecha justa refleje demoras de cliente.

## Open Questions

- **¿Ruta B′, A o B″?** — **RESUELTA: B′-PG** (Slice 0, `arch-architect` + `greenhouse-ico` + confirmación CEO 2026-06-19). ADR §16.10.
- ¿divergencia material a nivel member-month, o el freeze casi no mueve el bono? — **RESUELTA: el freeze NO mueve la cohorte productiva del bono hoy.** Reconciliación 2026-04/05/06: 0 member-months cambian tier de bono; los 29 divergence del M2 shadow caen fuera de la cohorte (NULL-atribuidos en BQ / no-overdue por la clasificación canónica). → **TASK-1170 sin urgencia material por ahora.**
