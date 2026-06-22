# TASK-1218 — RpA explainability: contrato gobernado del "por qué" (desglose por pieza + rondas de corrección)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico`
- Blocked by: `none`
- Branch: `task/TASK-1218-rpa-explainability-governed-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hermana de RpA de TASK-1217. Hoy el RpA (rondas de corrección por pieza) se expone sólo como escalar (`rpa_avg`/`rpa_median`) + una razón de supresión parcial; el **"por qué" por pieza** — qué piezas tuvieron retrabajo, cuántas rondas cada una, quién pidió cambios, cuándo — **se computa pero se descarta antes de persistir** (`countCorrectionTransitions.transitions[]` se calcula y se tira; el snapshot `task_rpa_snapshots` guarda sólo el escalar + el *count*). Los Nexa Insights de RpA explican con narrativa LLM sobre el escalar + heurística de dimensión, **no fundada** en ese desglose. Esta task conserva y expone el desglose per-pieza como contrato gobernado (reader + endpoint, persona/org) consumible por UI y Nexa, y funda la generación de Insights de RpA en esa data.

## Why This Task Exists

El North Star de Full API Parity exige contrato gobernado a nivel capability para que cualquier consumer (incl. Nexa) opere por construcción. Para RpA, el caso "¿por qué Daniela tiene ese RpA?" muestra un gap más profundo que el de OTD (TASK-1217):

- El material crudo del "por qué" **existe en cómputo** (`countCorrectionTransitions.transitions[]` — rondas `Listo para revisión → Cambios solicitados` por tarea, con timestamp + autor; doc-comment del propio helper dice que sirve para "forensic / audit / UI per-task drawer"), pero la proyección reactiva `notion-rpa-compute.ts` **descarta el array** antes de persistir: `task_rpa_snapshots` (TASK-916) guarda sólo `rpa_value`, `rpa_data_status`, `source_mode`, `correction_transitions_count` (el conteo, no el detalle).
- `task_rpa_snapshots` lo leen sólo 2 consumers ops-internos (signals de reliability + writeback). **No hay API/UI** que lo consuma. `grep` por consumers productivos del desglose = cero.
- El único endpoint RpA (`GET /api/ico-engine/trends/rpa`) devuelve agregados por space/período, sin desglose.
- Los Nexa Insights de RpA (`metricName='rpa_avg'`) dan narrativa LLM **no fundada** en el desglose (mismo pipeline que OTD: z-score + ranking de dimensión + prosa; `grep attributable/correction-transitions` en `ico-engine/ai/**` = 0).
- RpA V2 (el motor que tiene el dato de transitions) está en **shadow** (strangler TASK-901/908/912/916), pre-cutover; la microcopy honesta de supresión (TASK-1074) sigue `to-do`.

Resultado: el "por qué" fundado de RpA no existe como contrato y, peor que OTD, el material per-pieza se pierde antes de guardarse.

## Goal

- Conservar el desglose per-pieza de retrabajo (no descartarlo): persistir el detalle de `countCorrectionTransitions.transitions[]` (rondas, autor, timestamp, razón) de forma gobernada.
- Reader canónico que devuelve el "por qué" del RpA a nivel persona y org: piezas con retrabajo + rondas por pieza + (cuando exista) razón/quién pidió cambios.
- Endpoint gobernado (People scope persona; account-360 scope org) con autorización fina anti-IDOR + errores canónicos.
- Fundar la generación de Insights de RpA en ese desglose (un solo primitive para drill-down + generador), reemplazando la heurística-sobre-escalar.
- Coordinar con el strangler de RpA V2 (no exponer la verdad V2 productiva antes de su cutover).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/metrics/RPA_V1.md` — definición RpA + fases del strangler
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — 8 stop-gates, shadow→cutover, V1 intocable durante la migración
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — §North Star
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`

Reglas obligatorias:

- NO tocar V1 (`metrics_by_member.rpa_avg` → bono) durante la migración; la exposición fundada productiva sigue los stop-gates de RpA V2.
- Append-only en las tablas de eventos/snapshots de RpA; NUNCA `DELETE` (leer VIEWs `*_current` si aplica).
- Reader/derivado: NO mutar el bono ni escribir a Notion desde este contrato; writeback `[GH] <métrica>` read-only.
- Person scope anti-IDOR idéntico a People; org scope idéntico a account-360.
- Errores canónicos (`canonicalErrorResponse`), sin PII cruda; encuadre honesto de retrabajo (no señalar culpa de forma injusta; `non_positive_rpa_values_only` se lee neutral/positivo, NUNCA error — alineado a TASK-1074).
- NO inyectar sentinels ni hardcodear literales de status (usar el vocabulario canónico de status de tareas).

## Normative Docs

- Skill obligatoria: `greenhouse-ico`
- Skill: `greenhouse-nexa-conversational` (si se cablea/funda la tool/insight de Nexa)
- TASK-916 (`task_rpa_snapshots`), TASK-901/908/912 (RpA V2 compute/capture), TASK-1074 (microcopy honesta de supresión, `to-do`), TASK-1217 (hermana OTD — patrón de exposición + ground de Insights)

## Dependencies & Impact

### Depends on

- `src/lib/notion-metrics/count-correction-transitions.ts` — helper que produce `transitions[]` (existente; el material crudo).
- `src/lib/notion-metrics/calculate-rpa-v2.ts` — `RpaV2Result` per-tarea (existente).
- `src/lib/sync/projections/notion-rpa-compute.ts` — proyección que hoy descarta el array (a extender para conservar el detalle).
- `greenhouse_delivery.task_rpa_snapshots` (TASK-916) — snapshot escalar actual.
- Reader RpA escalar `getPersonIcoProfile` / `read-metrics.ts` (coherencia del valor).
- Pipeline de Insights: `src/lib/ico-engine/ai/{anomaly-detector,root-cause-analyzer,llm-provider}.ts` (a fundar).

### Blocks / Impacts

- Habilita el drill-down "por qué" del RpA en UI y la respuesta fundada de Nexa.
- Complementa TASK-1216 (lectura del valor de RpA por persona) con la explicación.
- Hermana de TASK-1217 (mismo patrón para OTD); idealmente comparten la forma del contrato de explicabilidad.

### Files owned

- `src/lib/sync/projections/notion-rpa-compute.ts` (conservar el detalle de transitions)
- Migración: tabla/columna nueva para el desglose per-pieza (`task_rpa_correction_rounds` o JSON en snapshot) `[verificar shape]`
- `src/lib/ico-engine/**` o `src/lib/notion-metrics/**` — reader canónico (`getRpaExplanationForMember`, `getRpaExplanationForOrganization`) `[verificar ubicación]`
- `src/app/api/people/[memberId]/rpa-explanation/route.ts` (o equivalente) + endpoint org
- `src/lib/ico-engine/ai/*` — ground de la generación de Insights de RpA en el desglose
- Tool de Nexa (opcional) + tests + signals

## Current Repo State

### Already exists

- `countCorrectionTransitions` produce el desglose per-pieza (rondas + autor + timestamp) — pero el array se descarta.
- `task_rpa_snapshots` (TASK-916): escalar + `correction_transitions_count` (sólo el conteo), consumido por signals de reliability + writeback (ops-internos).
- RpA escalar expuesto por persona (`getPersonIcoProfile`, `/api/people/[id]/ico*`) — ver TASK-1216.
- `rpa-policy.ts` `classifyRpaMetric`: 4 razones de supresión (`no_completed_tasks`, `missing_rpa_values_only`, `non_positive_rpa_values_only`, `mixed_…`).
- Nexa Insights de RpA: narrativa LLM no fundada (mismo pipeline que OTD).

### Gap

- El desglose per-pieza se descarta antes de persistir → no hay material consultable.
- Cero reader/endpoint/tool que exponga el "por qué" del RpA a un consumer (UI/Nexa).
- Insights de RpA desacoplados de la data dura de rondas de corrección.
- RpA V2 shadow (pre-cutover); microcopy honesta de supresión (TASK-1074) `to-do`.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader` (+ extensión de proyección para conservar detalle)
- Source of truth afectado: `task_rpa_snapshots` + nuevo desglose per-pieza (vía reader canónico)
- Consumidores afectados: `UI (drill-down), Nexa, generador de Insights, E2E`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: snapshots RpA, helper de transitions, stop-gates de RpA V2, autorización People/account-360.
- Contrato nuevo: persistencia del desglose per-pieza + reader(s) de explicación de RpA + endpoint(s) gobernado(s) persona/org; ground de Insights; opcional tool de Nexa.
- Backward compatibility: `gated` — la exposición fundada productiva se habilita con el cutover de RpA V2; antes, shadow/flag-gated. V1/bono intocado.
- Full API parity: UI, Nexa y el generador de Insights consumen el MISMO reader; cero lógica por consumer.

### Data model and invariants

- Entidades/tablas: extender persistencia para el desglose per-pieza (append-only); leer vía reader. `[verificar]` si columna JSON en `task_rpa_snapshots` o tabla hija `task_rpa_correction_rounds`.
- Invariantes:
  - Escalar `rpa_avg` y desglose deben ser coherentes (mismo motor, mismas piezas elegibles).
  - No exponer V2 fundado productivo antes del cutover (stop-gates).
  - Append-only; nunca DELETE.
  - Read/derivado: no muta bono ni Notion.
  - Anti-IDOR persona/org.
  - `non_positive_rpa_values_only` (0 rondas = mejor calidad) jamás se presenta como error.
- Tenant/space boundary: persona vía People scope; org vía account-360.
- Idempotency/concurrency: la proyección RpA ya es idempotente (MERGE/UPSERT); el desglose hereda esa semántica.
- Audit/outbox/history: el desglose es append-only en su materialización; reads sin outbox.

### Migration, backfill and rollout

- Migration posture: `additive` (nueva columna JSON o tabla hija para el desglose) — markers correctos + bloque DO de verificación.
- Default state: `flag OFF / shadow` hasta cutover RpA V2; luego `enabled`.
- Backfill plan: re-materializar el desglose desde el log de transiciones para períodos en ventana (dry-run → apply); evaluar costo.
- Rollback path: flag OFF (oculta el contrato) + revert PR + reverse migration (additive).
- External coordination: alineación con stop-gates de RpA V2 + sign-off (HR/delivery).

### Security and access

- Auth/access gate: `capability` (People `canViewActivity` persona; capability account-360 org).
- Sensitive data posture: desempeño individual + quién pidió cambios — exponer sólo dentro de scope; encuadre honesto (retrabajo ≠ culpa).
- Error contract: `canonicalErrorResponse`, sin PII.
- Abuse/rate-limit posture: estándar; sin enumeración fuera de scope.

### Runtime evidence

- Local checks: tests del reader (desglose coherente con el escalar) + autorización + caso supresión positiva.
- DB/runtime checks: smoke contra PG (proxy) del desglose persistido con una tarea real.
- Integration checks: E2E — drill-down de RpA de un member visible; denegado fuera de scope; Insight de RpA fundado en el desglose.
- Reliability signals/logs: reusar/extender signals de RpA (`notion-metrics-rpa-signals.ts`); signal de coherencia escalar↔desglose + parity de persistencia.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] El desglose per-pieza se persiste (no se descarta) de forma append-only.
- [ ] Reader único consumido por UI, Nexa y generador de Insights.
- [ ] Coherencia escalar↔desglose verificada.
- [ ] Exposición fundada productiva gated por el cutover de RpA V2; V1/bono intocado.
- [ ] Anti-IDOR persona/org verificado; supresión positiva nunca como error.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Conservar el desglose per-pieza

- Extender `notion-rpa-compute.ts` para persistir el detalle de `transitions[]` (rondas + autor + timestamp + razón), append-only, en lugar de descartarlo.
- Migración additive (columna JSON en `task_rpa_snapshots` o tabla hija) + bloque DO de verificación + backfill en ventana.

### Slice 2 — Reader + endpoint del "por qué"

- `getRpaExplanationForMember` / `…ForOrganization` sobre el desglose persistido, coherente con el escalar.
- `GET /api/people/[memberId]/rpa-explanation` (People scope) + endpoint org (account-360 scope), autorización fina + `canonicalErrorResponse`, flag-gated.

### Slice 3 — Ground de Insights de RpA + (opcional) tool de Nexa

- Alimentar `analyzeAiRootCauses`/`enrichSignalPayload` de RpA con el desglose (deja de ser heurística-sobre-escalar).
- Tool/affordance de Nexa que, dado un member en scope, devuelve el "por qué" del RpA reusando el reader (coordinable con TASK-1216).

## Out of Scope

- El cutover del bono / flip de RpA V2 (strangler TASK-901/908/912/916).
- La microcopy honesta de supresión en la card (TASK-1074 — UI-only).
- La lectura del valor escalar de RpA por persona/Nexa (TASK-1216).
- Explicabilidad de OTD (atraso imputable) — TASK-1217.
- Cambiar el cálculo de RpA o el motor V2.
- Escritura a Notion / mutación del bono.

## Detailed Spec

El shape de persistencia del desglose (JSON en snapshot vs tabla hija), los campos exactos del drill-down (rondas, autor, timestamp, razón, encuadre honesto), y la coordinación con los stop-gates de RpA V2 se afinan en Discovery con `greenhouse-ico`. Patrón (espejo de TASK-1217 para OTD): conservar el material crudo → reader canónico → endpoint gobernado scoped → consumers (UI drill-down + Nexa + generador de Insights) sobre el mismo reader. La activación fundada productiva sigue el calendario del strangler de RpA V2.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (conservar desglose) → Slice 2 (reader + endpoint) → Slice 3 (ground Insights + Nexa). Sin el material persistido no hay reader; sin reader no hay endpoint ni ground.
- La exposición fundada productiva **MUST** seguir los stop-gates de RpA V2 (no preceder al cutover); antes, todo shadow/flag OFF.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Exponer RpA V2 fundado antes del cutover → dos verdades de RpA | ico / delivery | high | Gate por stop-gates V2; exposición flag OFF; signal de coherencia escalar↔desglose | discrepancia card vs drill-down |
| Persistir el desglose dispara costo/volumen alto | data / cost | medium | Evaluar volumen en Discovery; persistir compacto; backfill por batch | crecimiento de tabla / costo BQ |
| Desglose expone desempeño/quién-pidió-cambios fuera de scope | identity / privacy | medium | Anti-IDOR idéntico a People; E2E negativo | acceso fuera de scope en logs |
| Encuadre de retrabajo como culpa injusta | ico / UX | medium | Encuadre honesto (revisión con UX writing); supresión positiva neutral | feedback usuario / HR |
| Tocar V1/bono por error durante el cambio | ico / payroll-bono | low | V1 intocable (regla dura); tests de no-regresión del bono | cambio en `rpa_avg` legacy / bono |

### Feature flags / cutover

- Exposición detrás de flag (nuevo o reusar el del strangler V2) default OFF, alineado al cutover de RpA V2. Revert = flag OFF + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | reverse migration (additive) + revert PR; el desglose deja de persistirse | <15 min | sí |
| Slice 2 | flag OFF + revert PR | <10 min | sí |
| Slice 3 | flag OFF (Insights vuelve a narrativa previa; quita tool) | <10 min | sí |

### Production verification sequence

1. Staging shadow: Slice 1 persiste el desglose → smoke verifica que `transitions` quedan guardados y coherentes con el `count`.
2. Smoke del reader → desglose coherente con el escalar `rpa_avg`.
3. E2E drill-down con member visible → piezas + rondas; member fuera de scope → denegado; supresión positiva → neutral.
4. Insight de RpA fundado en el desglose (narrativa cita piezas reales).
5. Coherencia escalar↔desglose (signal verde) ≥ período acordado.
6. Coordinar con stop-gates de RpA V2; flip productivo sólo tras sign-off. Prod + monitor 7-30d.

### Out-of-band coordination required

- Sign-off (HR/delivery) + alineación con el calendario del strangler de RpA V2. Revisión de encuadre con UX writing.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El desglose per-pieza de retrabajo se persiste de forma append-only (deja de descartarse).
- [ ] Existe un reader canónico de explicación de RpA a nivel persona y org sobre ese desglose.
- [ ] Endpoint(s) gobernado(s) con autorización fina + anti-IDOR + `canonicalErrorResponse`, flag-gated hasta el cutover de RpA V2.
- [ ] El desglose es coherente con el escalar `rpa_avg` (signal verde).
- [ ] UI, Nexa y el generador de Insights consumen el MISMO reader (cero duplicación); el Insight de RpA cita el desglose real.
- [ ] V1/bono intocado; supresión positiva (`non_positive_rpa_values_only`) nunca presentada como error.
- [ ] Tests + E2E (positivo + negativo de scope) verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm vitest run src/lib/notion-metrics src/lib/ico-engine` (no regresión RpA)
- Smoke del reader + del desglose contra PG (proxy)
- E2E drill-down (positivo + negativo de scope)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1216, TASK-1217, TASK-1074, strangler RpA V2)
- [ ] flag registrado/actualizado en `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] gap ledger de Full API Parity / Nexa actualizado (explicabilidad RpA)
- [ ] `greenhouse-documentation-governor` + `pnpm docs:closure-check`
- [ ] `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`

## Follow-ups

- UI de drill-down "por qué" del RpA (consumer ui-ux de este contrato).
- Unificar la forma del contrato de explicabilidad con TASK-1217 (OTD) si emerge un patrón común de "metric explanation".

## Open Questions

- ¿Persistir el desglose como columna JSON en `task_rpa_snapshots` o tabla hija `task_rpa_correction_rounds`? Resolver en Discovery (considerar volumen/costo).
- ¿El ground de Insights (Slice 3) entra aquí o se separa? Preferible un solo primitive consumido por drill-down + generador.
- ¿Esta task debe esperar a un hito específico del strangler de RpA V2, o puede avanzar en shadow hasta el flip? Definir con `greenhouse-ico`.
