# TASK-1217 — OTD explainability: contrato gobernado del "por qué" (atraso imputable por persona/org)

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
- Blocked by: `TASK-1170`
- Branch: `task/TASK-1217-otd-explainability-governed-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy el OTD se expone como escalar (`otd_pct`), pero no hay forma — ni por API, ni por UI, ni por Nexa — de responder **por qué** una persona u organización tiene ese OTD (qué tareas atrasaron, cuántos días son atribuibles a la agencia vs cliente/freeze, por qué razón). La maquinaria de atribución (atraso imputable) **ya se computa y materializa**, pero vive shadow detrás de `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (default OFF), consumida sólo por la proyección reactiva y signals de reliability. Esta task expone esa atribución como **contrato gobernado** (reader + endpoint) consumible por UI y Nexa, una vez que el cutover del bono (TASK-1170) habilite el uso productivo.

## Why This Task Exists

El North Star de Full API Parity exige que toda capability tenga contrato gobernado a nivel capability para que cualquier consumer (incluida Nexa) la opere por construcción. El caso "¿por qué Daniela tiene ese OTD?" muestra el gap: el "por qué" **está calculado** (`task_attributable_lateness_shadow` por tarea; `otd_attributable_member_month_shadow` por member×mes — TASK-1169) pero **no tiene reader/endpoint/tool**; `grep "attributable"` sobre `src/app/`, `src/views/`, `src/components/` = cero matches. Sin contrato gobernado, ni la UI ni Nexa pueden dar una respuesta fundamentada del driver del OTD.

Está **bloqueada por TASK-1170** (cutover del bono): exponer la atribución corregida antes de que el bono haya cutoveado crearía dos verdades de OTD visibles (legacy vs corregida) y rompería la consistencia que TASK-1170 protege con sus 8 stop-gates + sign-off HR + ≥30d shadow verde.

## Goal

- Reader canónico que devuelve la atribución del OTD a nivel persona y org: lista de tareas que atrasaron + días imputables (agencia vs cliente/freeze) + razón + bucket corregido.
- Endpoint gobernado (People scope para persona; org scope para organización) con autorización fina, anti-IDOR y errores canónicos.
- Consumible por UI (drill-down "por qué") y por Nexa (read; complementa TASK-1216) desde el MISMO primitive — cero lógica por consumer.
- Activación coordinada con el cutover de TASK-1170 (no exponer la verdad corregida antes del flip del bono).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/metrics/ATTRIBUTABLE_LATENESS_V1.md` — definición de atraso imputable, granularidad per-task + member×mes
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` (patrón strangler/stop-gates, análogo)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — §North Star
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`

Reglas obligatorias:

- NO exponer la atribución corregida de forma productiva antes del cutover de TASK-1170 (gate de consistencia OTD legacy vs corregida). Hasta entonces, shadow/flag-gated.
- Leer las tablas `*_shadow` vía reader canónico; NUNCA queryear shadow directo desde un route handler.
- Atribución es read/derivado: NO mutar el bono ni escribir a Notion desde este contrato.
- Person scope anti-IDOR idéntico al de People; org scope idéntico al de account-360.
- Errores canónicos (`canonicalErrorResponse`), sin PII cruda.

## Normative Docs

- Skill obligatoria: `greenhouse-ico`
- Skill: `greenhouse-nexa-conversational` (si se cablea la tool de Nexa)
- TASK-1169 (rollup member×mes shadow), TASK-1170 (cutover del bono), TASK-1174/ISSUE-098 (recompute terminal del shadow per-task)

## Dependencies & Impact

### Depends on

- **TASK-1170** — cutover del bono (bloqueante duro: define cuándo la verdad corregida puede ser productiva).
- `greenhouse_delivery.task_attributable_lateness_shadow` (per-task) — existente, shadow.
- `greenhouse_delivery.otd_attributable_member_month_shadow` (member×mes, TASK-1169) — existente, shadow.
- `src/lib/notion-metrics/calculate-attributable-lateness.ts` — helper puro existente.
- Reader OTD escalar `getPersonIcoProfile` / `read-metrics.ts` (para coherencia del valor).

### Blocks / Impacts

- Habilita el drill-down "por qué" del OTD en UI y la respuesta fundamentada de Nexa.
- Complementa TASK-1216 (lectura del valor por persona) con la explicación.

### Files owned

- `src/lib/ico-engine/**` o `src/lib/notion-metrics/**` — reader canónico de atribución (`getOtdAttributionForMember`, `getOtdAttributionForOrganization`) `[verificar ubicación]`
- `src/app/api/people/[memberId]/otd-attribution/route.ts` (o equivalente) y endpoint org
- Tool de Nexa (opcional, si entra en scope) en `src/lib/nexa/nexa-tools.ts`
- Tests + signals

## Current Repo State

### Already exists

- Atribución per-task computada y materializada: `task_attributable_lateness_shadow` (días imputables + bucket reason-aware), gated por `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (OFF).
- Rollup member×mes shadow (TASK-1169): `otd_attributable_member_month_shadow`.
- Helper puro `calculate-attributable-lateness.ts`; recompute terminal corregido (TASK-1174).
- Signals de reliability (`attributable-lateness-signals.ts`, parity member-month) en `/admin/operations`.
- OTD escalar expuesto (`otd_pct`) por reader/endpoints.

### Gap

- Cero reader/endpoint/tool que exponga la atribución (per-task o per-persona) a un consumer.
- `grep "attributable"` en `src/app/`, `src/views/`, `src/components/` = cero matches.
- No hay UI de drill-down "por qué" del OTD.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
- Source of truth afectado: `task_attributable_lateness_shadow` / `otd_attributable_member_month_shadow` (vía reader canónico)
- Consumidores afectados: `UI (drill-down), Nexa, E2E`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: tablas shadow de atribución, helper de cálculo, gate de cutover TASK-1170, autorización People/account-360.
- Contrato nuevo: reader(s) de atribución de OTD + endpoint(s) gobernado(s) persona/org; opcional tool de Nexa.
- Backward compatibility: `gated` — la exposición productiva se habilita con el cutover de TASK-1170; antes, flag-gated/shadow.
- Full API parity: UI y Nexa consumen el MISMO reader de atribución; cero lógica por consumer.

### Data model and invariants

- Entidades/tablas: lee `*_shadow` (per-task + member×mes). Evaluar si la exposición requiere una vista/proyección estable adicional (`[verificar]`).
- Invariantes:
  - El valor escalar de OTD y su atribución deben ser coherentes (misma definición de `fecha_justa`, mismos buckets) — no dos verdades.
  - No exponer atribución corregida productiva antes del cutover (TASK-1170).
  - Read/derivado: no muta bono ni Notion.
  - Anti-IDOR persona/org.
- Tenant/space boundary: persona vía People scope; org vía account-360 scope.
- Idempotency/concurrency: N/A (read).
- Audit/outbox/history: N/A (read); la atribución ya es append-only en su materialización.

### Migration, backfill and rollout

- Migration posture: `view refresh` posible (vista estable sobre shadow) — `[verificar]`; o reader directo.
- Default state: `flag OFF / shadow` hasta cutover TASK-1170; luego `enabled`.
- Backfill plan: la materialización shadow ya corre; no requiere backfill nuevo (verificar cobertura histórica para el drill-down).
- Rollback path: flag OFF (oculta el contrato) + revert PR.
- External coordination: alineación con el calendario de cutover de TASK-1170 + sign-off HR.

### Security and access

- Auth/access gate: `capability` (People `canViewActivity` para persona; capability de account-360 para org).
- Sensitive data posture: desempeño individual + razones de atraso — exponer sólo dentro de scope; cuidado con atribuir culpa de forma cruda (encuadre honesto: agencia vs cliente vs freeze).
- Error contract: `canonicalErrorResponse`, sin PII.
- Abuse/rate-limit posture: rate-limit estándar; sin enumeración fuera de scope.

### Runtime evidence

- Local checks: tests del reader (atribución coherente con el escalar) + autorización.
- DB/runtime checks: smoke contra PG (proxy) de las tablas shadow con un member real.
- Integration checks: E2E — drill-down de OTD de un member visible; denegado fuera de scope.
- Reliability signals/logs: reusar/extender los signals de atribución existentes; signal de coherencia escalar↔atribución.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Reader único consumido por UI y Nexa (sin duplicación).
- [ ] Coherencia escalar↔atribución verificada.
- [ ] Exposición productiva gated por el cutover de TASK-1170.
- [ ] Anti-IDOR persona/org verificado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Reader canónico de atribución de OTD

- `getOtdAttributionForMember(memberId, period, …)` y `getOtdAttributionForOrganization(orgId, period, …)` sobre las tablas shadow, vía helper canónico; output: tareas que atrasaron + días imputables (agencia/cliente/freeze) + razón + bucket.
- Garantizar coherencia con el escalar `otd_pct`.

### Slice 2 — Endpoint(s) gobernado(s)

- `GET /api/people/[memberId]/otd-attribution` (People scope) + endpoint org equivalente (account-360 scope), autorización fina + `canonicalErrorResponse`.
- Flag-gated hasta cutover de TASK-1170.

### Slice 3 — Consumo por Nexa (opcional, coordinable con TASK-1216)

- Tool/affordance de Nexa que, dado un member en scope, devuelve el "por qué" del OTD reusando el reader.

## Out of Scope

- El cutover del bono / flip de la verdad corregida (TASK-1170).
- Cambiar el cálculo de atribución (`calculate-attributable-lateness.ts` ya existe).
- La lectura del valor escalar por persona/Nexa (TASK-1216).
- Explicabilidad de RpA (es maquinaria distinta — rondas de corrección por pieza; tratar en task separada).
- Escritura a Notion / mutación del bono.

## Detailed Spec

La definición exacta del shape del drill-down (campos por tarea, encuadre honesto agencia/cliente/freeze), si se expone vía vista estable sobre shadow o reader directo, y la coordinación temporal con TASK-1170 se afinan en Discovery con `greenhouse-ico`. Patrón: reader canónico sobre la materialización shadow → endpoint gobernado scoped → consumers (UI drill-down + Nexa) sobre el mismo reader. La activación productiva sigue el calendario del cutover de TASK-1170.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (reader) → Slice 2 (endpoint) → Slice 3 (Nexa). El reader es el primitive; sin él no hay contrato.
- TASK-1170 **MUST** haber cutoveado (o estar en su ventana aprobada) antes de exponer la atribución corregida de forma productiva; antes de eso, todo flag OFF/shadow.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Dos verdades de OTD visibles (legacy vs corregida) antes del cutover | ico / delivery | high | Gate por TASK-1170; exposición flag OFF hasta el flip; signal de coherencia escalar↔atribución | discrepancia OTD card vs drill-down |
| Atribución expone desempeño de persona fuera de scope | identity / privacy | medium | Anti-IDOR idéntico a People; E2E negativo | acceso fuera de scope en logs |
| Encuadre de culpa crudo/injusto al usuario | ico / UX | medium | Encuadre honesto (agencia/cliente/freeze) revisado con UX writing; razones neutrales | feedback de usuario / HR |
| Lectura de shadow inconsistente (terminal staleness) | delivery | low | Reusar fix de TASK-1174 (resolveEffectiveTaskState); signal steady=0 | `shadow_terminal_open` > 0 |

### Feature flags / cutover

- La exposición se mantiene detrás de flag (reusar/extender `ATTRIBUTABLE_LATENESS_OTD_ENABLED` o uno nuevo de "exposición") default OFF, alineado al cutover de TASK-1170. Revert = flag OFF + redeploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (reader inerte sin consumer) | <10 min | sí |
| Slice 2 | flag OFF + revert PR | <10 min | sí |
| Slice 3 | flag OFF (quita la tool) | <5 min | sí |

### Production verification sequence

1. Staging shadow: smoke del reader → atribución coherente con el escalar para members con datos.
2. E2E drill-down con member visible → lista de tareas + días imputables; member fuera de scope → denegado.
3. Verificar coherencia escalar↔atribución (signal verde) ≥ período acordado.
4. Coordinar con el cutover de TASK-1170; flip de exposición productiva sólo tras su sign-off.
5. Prod + monitor de coherencia + acceso 7-30d.

### Out-of-band coordination required

- Sign-off HR + alineación con el calendario de cutover de TASK-1170 (es el gate de consistencia del bono/OTD). Revisión de encuadre con UX writing.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un reader canónico de atribución de OTD a nivel persona y org sobre la materialización shadow.
- [ ] Endpoint(s) gobernado(s) con autorización fina + anti-IDOR + `canonicalErrorResponse`, flag-gated hasta TASK-1170.
- [ ] La atribución es coherente con el escalar `otd_pct` (signal verde).
- [ ] UI y Nexa consumen el MISMO reader (cero duplicación).
- [ ] No se expone la verdad corregida productiva antes del cutover de TASK-1170.
- [ ] Tests + E2E (positivo + negativo de scope) verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Smoke del reader contra PG (proxy)
- E2E drill-down (positivo + negativo de scope)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1170, TASK-1216, TASK-1169)
- [ ] flag registrado/actualizado en `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] gap ledger de Full API Parity / Nexa actualizado (explicabilidad OTD)
- [ ] `greenhouse-documentation-governor` + `pnpm docs:closure-check`
- [ ] `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`

## Follow-ups

- Explicabilidad de RpA (rondas de corrección por pieza): maquinaria distinta; el desglose per-pieza (`countCorrectionTransitions.transitions[]`) se computa pero se descarta antes de persistir y RpA V2 está en shadow — task separada.
- UI de drill-down "por qué" del OTD (consumer ui-ux de este contrato).

## Delta 2026-06-22

Reconciliación con Nexa Insights / ICO Signals (observación del operador): Nexa **sí** explica hoy OTD/RpA caído vía `get_insight`/`list_insights` (root cause narrative + recommended action), pero esa explicación es **narrativa LLM sobre el escalar + z-score + una heurística coarse de contribución por dimensión** (`(deviation × task-count)` en `root-cause-analyzer.ts`), **NO está fundada en la data dura de atribución**. Verificado: `grep` por `attributable_lateness`/`task_attributable_lateness_shadow`/`count-correction-transitions`/`task_rpa_snapshots` bajo `src/lib/ico-engine/ai/**` = **cero referencias**. La generación es:

1. `detectAiAnomalies` ([anomaly-detector.ts](src/lib/ico-engine/ai/anomaly-detector.ts)) — z-score sobre `metric_snapshots_monthly` (sólo el escalar `otd_pct`/`rpa_avg`).
2. `analyzeAiRootCauses` ([root-cause-analyzer.ts](src/lib/ico-engine/ai/root-cause-analyzer.ts)) — ranking de dimensiones por impacto = `(deviation × completed_tasks)`, **agregado por dimensión, NO atraso imputable por tarea ni rondas por pieza**.
3. `generateAiSignalEnrichment` ([llm-provider.ts](src/lib/ico-engine/ai/llm-provider.ts)) — prosa Gemini sobre ese snapshot escalar (prompt: "usa sólo la evidencia visible"), que NO incluye el desglose por tarea/pieza.

Y es **pre-materializada por período** (crons `ico-materialize-daily` 03:15 + `ico-llm-enrich-daily` 03:45 en `ico-batch-worker`), no person-addressable on demand: un member sólo recibe insight si su dimensión gana el ranking de impacto del período; las superficies persona leen read-only (`readMemberAiLlmSummary` filtra por `member_id` + período, sin generación). Internal-only (`efeonce_internal`).

**Implicación para esta task (refina el scope, no lo invalida):** el gap NO es "no hay explicabilidad" — es que **la explicabilidad que existe (Insights) está desacoplada de la data dura de atribución que SÍ se computa (shadow)**. Por lo tanto esta task debe, además del reader/endpoint del drill-down:

- **Fundar (ground) la generación de Insights en la atribución**: alimentar `analyzeAiRootCauses`/`enrichSignalPayload` con el atraso imputable por tarea (y, para RpA, las rondas por pieza) para que el root cause narrative deje de ser heurística-sobre-escalar y pase a ser causal fundado.
- **Un solo primitive, dos consumers**: el reader de atribución del drill-down y el input del generador de Insights deben ser el MISMO, no dos cálculos paralelos.

Esto sube el `Effort` efectivo (ya `Alto`) y refuerza la dependencia de TASK-1170 (la atribución fundada productiva no puede preceder al cutover del bono).

## Open Questions

- ¿Vista estable sobre shadow o reader directo sobre las tablas `*_shadow`? Resolver en Discovery.
- ¿Fundar Insights en la atribución entra en esta task o se separa en una task hermana (generación) vs ésta (exposición/reader)? Evaluar en Discovery; preferible un solo primitive consumido por ambos.
- ¿La tool de Nexa (Slice 3) entra en esta task o se difiere como follow-up tras TASK-1216? Resolver según secuencia de cutover.
- Encuadre exacto de "culpa" (agencia/cliente/freeze) para no exponer atribución injusta — coordinar con UX writing + HR.
