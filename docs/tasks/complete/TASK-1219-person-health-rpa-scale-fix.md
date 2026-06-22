# TASK-1219 — Salud de persona: corregir la escala de RpA en computeHealth (reader canónico)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `reader`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico`
- Blocked by: `none`
- Branch: `task/TASK-1219-person-health-rpa-scale-fix`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`computeHealth` en el reader canónico `get-person-ico-profile.ts` clasifica la salud (🟢/🟡/🔴) de una persona usando `rpaAvg >= 70` para verde — asumiendo que RpA es un score 0-100 donde más alto es mejor. Pero el RpA materializado en `ico_member_metrics.rpa_avg` es **rondas de corrección promedio por pieza** (bajo = mejor; valores típicos ~1-3). Resultado: personas con excelente desempeño obtienen salud 🔴. Caso real (TASK-1216): Daniela Ferreira — OTD 96.2%, RpA 1.13 (excelente, casi todo a la primera), FTR 93.7% → salud **`red`**. El bug es del reader canónico, compartido por el endpoint People, la UI de persona y el tool de Nexa `get_member_performance`; corregirlo en el reader arregla los tres a la vez.

## Why This Task Exists

Detectado al verificar TASK-1216 con un caso real contra PG. La fórmula `computeHealth` ([get-person-ico-profile.ts](src/lib/person-360/get-person-ico-profile.ts)) hace:

```
if (rpa >= 70 && otd >= 80) return 'green'
if (rpa >= 40 && otd >= 50) return 'yellow'
return 'red'
```

`rpa` viene de `rpaAvg` (`ico_member_metrics.rpa_avg`), que es **rondas de corrección** (escala baja, bajo=bueno) — NO un score 0-100. Con `rpaAvg=1.13`, la condición `rpa >= 70` siempre falla → salud `red` aunque la persona entregue a tiempo y casi sin retrabajo. La salud es engañosa (un semáforo rojo con métricas verdes) y la ven internos en People/UI y vía Nexa. Es un defecto de **interpretación de escala**, no de los datos (los valores OTD/RpA/FTR materializados son correctos).

**Verificar antes de arreglar (Discovery obligatorio):** confirmar la definición canónica de `rpa_avg` (¿rondas? ¿hay alguna superficie que use una escala 0-100 distinta?) y la dirección correcta (bajo=bueno) contra la spec de RpA y el materializer, para fijar umbrales correctos — no asumir.

## Goal

- Corregir `computeHealth` para interpretar RpA en su escala real (rondas de corrección, bajo=bueno) con umbrales validados contra la definición canónica.
- La corrección vive en el reader canónico → People endpoint + UI de persona + tool Nexa `get_member_performance` heredan la salud correcta por construcción (un primitive, muchos consumers).
- Revisar si la salud a nivel organización/space (`get-organization-operational-serving` u otros) tiene el mismo defecto de escala y corregir consistentemente si aplica.
- Test que fije el contrato (caso Daniela: OTD alto + RpA bajo → verde, no rojo) para prevenir regresión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/metrics/RPA_V1.md` — definición canónica de RpA (escala, dirección)
- `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md` — no tocar V1/bono durante la migración
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — fix en el primitive canónico, no por consumer

Reglas obligatorias:

- Corregir SOLO la clasificación de salud (display/derivado); NUNCA mutar `rpa_avg` materializado ni tocar V1/bono.
- La corrección va en el reader canónico (`computeHealth`), NO parchear en cada consumer.
- Validar la escala/dirección de RpA contra la spec + materializer ANTES de fijar umbrales (verify-before-fix).
- Si la salud a nivel org tiene el mismo bug, corregir en su reader canónico también (no dejar drift entre niveles).

## Normative Docs

- Skill `greenhouse-ico` (semántica de métricas ICO / RpA)
- Skill `greenhouse-payroll-auditor` (RpA alimenta KPI ICO; confirmar que health NO gatea bono — debe ser display-only)
- TASK-1216 (origen del hallazgo), TASK-1218 (explicabilidad RpA), TASK-1074 (microcopy de supresión RpA)

## Dependencies & Impact

### Depends on

- Reader `getPersonIcoProfile` / `computeHealth` ([src/lib/person-360/get-person-ico-profile.ts](src/lib/person-360/get-person-ico-profile.ts)) — existente
- Definición canónica de RpA (`RPA_V1.md` + materializer en `src/lib/notion-metrics/` / `ico-engine`)

### Blocks / Impacts

- Impacta la salud mostrada en: endpoint People (`/api/people/[memberId]/ico*`), UI de persona (Person 360), tool Nexa `get_member_performance` (TASK-1216). Todos heredan la corrección.
- NO impacta bono ni `rpa_avg` materializado.

### Files owned

- `src/lib/person-360/get-person-ico-profile.ts` (`computeHealth`)
- Posible: reader de salud a nivel org/space si tiene el mismo defecto (`[verificar en Discovery]`)
- Test acompañante (`*.test.ts`)

## Current Repo State

### Already exists

- `computeHealth` con la fórmula `rpa >= 70` (defecto de escala).
- `ico_member_metrics.rpa_avg` materializado (rondas de corrección).
- Consumers: People endpoint, Person 360 UI, tool Nexa `get_member_performance`.

### Gap

- La salud trata RpA como score 0-100; debe tratarlo como rondas (bajo=bueno).
- Umbrales correctos sin definir (dependen de la escala canónica — Discovery).
- Sin test que fije el contrato de salud para el caso "métricas buenas → verde".

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `computeHealth` (derivación de salud sobre `ico_member_metrics`)
- Consumidores afectados: `People endpoint, Person 360 UI, Nexa get_member_performance`
- Runtime target: `production`

### Contract surface

- Contrato existente: `PersonIcoProfile.health: 'green'|'yellow'|'red'|null`.
- Contrato modificado: la LÓGICA de derivación (no el shape) — la salud refleja la escala real de RpA.
- Backward compatibility: `compatible` en shape; cambia el VALOR de salud para personas con RpA bajo (de red→green/yellow). Es la corrección esperada.
- Full API parity: corrección en el primitive → todos los consumers la heredan; cero parche por consumer.

### Data model and invariants

- Entidades: ninguna nueva; lee `ico_member_metrics`. NO muta nada.
- Invariantes:
  - `rpa_avg` materializado intacto; V1/bono intactos.
  - Salud es display-only (confirmar que ningún flujo de decisión/bono la consume).
  - Misma escala/dirección de RpA en todos los niveles de salud (persona/org/space).
- Tenant/space boundary: sin cambio (deriva del reader).
- Idempotency/concurrency: N/A (pure function).
- Audit/outbox/history: N/A.

### Migration, backfill and rollout

- Migration posture: `none` (pure function fix; la salud se recomputa en cada read).
- Default state: `enabled` — additive corrección; no hay valor persistido que backfillear.
- Backfill plan: N/A (salud no se materializa, se deriva on-read).
- Rollback path: revert PR.
- External coordination: N/A — repo only.

### Security and access

- Auth/access gate: sin cambio (hereda del reader/consumers).
- Sensitive data posture: salud de desempeño individual; sin nuevo campo expuesto.
- Error contract: sin cambio.
- Abuse/rate-limit posture: N/A.

### Runtime evidence

- Local checks: test de `computeHealth` (matriz OTD×RpA, incl. caso Daniela) + `pnpm vitest run src/lib/person-360`.
- DB/runtime checks: smoke contra PG real — recomputar salud de varios members reales y confirmar que ya no hay "rojo con métricas buenas".
- Integration checks: verificar que People endpoint + tool Nexa devuelven la salud corregida.
- Reliability signals/logs: N/A.
- Production verification sequence: deploy → spot-check de salud de algunos members en People/UI.

### Acceptance criteria additions

- [ ] La escala/dirección de RpA está confirmada contra la spec canónica antes de fijar umbrales.
- [ ] La corrección vive en el reader canónico; cero parche por consumer.
- [ ] Confirmado que `health` no gatea bono ni decisiones (display-only).
- [ ] Test fija el contrato (métricas buenas → no rojo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Confirmar escala canónica de RpA + corregir computeHealth

- Discovery: confirmar en `RPA_V1.md` + materializer la escala/dirección de `rpa_avg` (rondas, bajo=bueno) y los umbrales razonables (verde/amarillo/rojo).
- Corregir `computeHealth` para usar la escala correcta de RpA (y OTD/FTR como corresponda).
- Test con matriz OTD×RpA, incluyendo el caso real (OTD 96 / RpA 1.13 → verde).

### Slice 2 — Consistencia de salud entre niveles (si aplica)

- Verificar si la salud a nivel org/space usa la misma fórmula defectuosa; corregir en su reader canónico para no dejar drift.

## Out of Scope

- Migración RpA V2 / cutover del bono (strangler TASK-901/908/912/916).
- Explicabilidad de RpA (TASK-1218).
- Microcopy de supresión de RpA (TASK-1074).
- Cambiar el valor materializado `rpa_avg` o cualquier cálculo de métrica.
- Rediseño de la UI del badge de salud (solo cambia el valor derivado, no el componente).

## Detailed Spec

Los umbrales exactos se fijan en Discovery con `greenhouse-ico` según la escala canónica de RpA. El patrón: corregir la función pura `computeHealth` en el reader canónico para que la condición de RpA sea direccional-correcta (bajo=bueno), preservando el contrato `health: 'green'|'yellow'|'red'|null`. Caso de referencia para el test: Daniela Ferreira (OTD 96.2, RpA 1.13, FTR 93.7) debe dar salud no-roja.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (confirmar escala + fix + test) primero. Slice 2 (consistencia org) solo si Discovery confirma el mismo defecto a nivel org.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fijar umbrales sin confirmar la escala real de RpA | ico | medium | Verify-before-fix contra RPA_V1.md + materializer | salud sigue incoherente con métricas |
| `health` gatea algo más que display (ej. bono/decisión) | ico / payroll | low | Confirmar en Discovery que health es display-only antes de cambiarlo | cambio de bono/decisión tras el fix |
| Drift de salud entre niveles (persona corregida, org no) | ico | medium | Slice 2: revisar y alinear el reader org | semáforos distintos para el mismo estado |
| Flip masivo de semáforos confunde a usuarios | ux | low | Es la corrección esperada; documentar en changelog/manual | feedback de usuarios |

### Feature flags / cutover

- Sin flag — corrección de función pura, cutover inmediato al deploy. Revert = revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (vuelve a la fórmula previa) | <10 min | sí |
| Slice 2 | revert PR | <10 min | sí |

### Production verification sequence

1. Deploy → spot-check de salud de members reales en People/UI (los de RpA bajo + OTD alto ya no salen rojo).
2. Confirmar tool Nexa `get_member_performance` devuelve la salud corregida.

### Out-of-band coordination required

- N/A — repo only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `computeHealth` interpreta RpA en su escala real (rondas, bajo=bueno) con umbrales validados contra la spec canónica.
- [ ] El caso real (OTD 96 / RpA 1.13) da salud no-roja; cubierto por test.
- [ ] La corrección vive en el reader canónico; People endpoint + UI + tool Nexa heredan la salud correcta.
- [ ] Confirmado que `health` es display-only (no gatea bono ni decisiones).
- [ ] Salud a nivel org/space alineada (o documentado que no tenía el defecto).
- [ ] `pnpm vitest run src/lib/person-360` (+ ico si aplica) verde.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Smoke contra PG real (recomputar salud de members reales)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado (cambio de comportamiento visible: salud)
- [ ] chequeo de impacto cruzado (TASK-1216, TASK-1218)
- [ ] `greenhouse-documentation-governor` + `pnpm docs:closure-check`
- [ ] `greenhouse-qa-release-auditor` + `pnpm qa:gates --changed`

## Follow-ups

- Si la escala de RpA cambia con RpA V2 (strangler), revisar que `computeHealth` siga direccional-correcto tras el cutover.

## Open Questions

- ¿Umbrales exactos de RpA (rondas) para verde/amarillo/rojo? Resolver en Discovery con `greenhouse-ico`.
- ¿La salud a nivel org/space usa la misma fórmula? `[verificar]`.
- ¿Algún consumer usa `health` para algo más que mostrar el badge? `[verificar]` (debe ser display-only).

## Delta 2026-06-22 — COMPLETE (fix verificado contra PG real, local-first sin push)

**1 slice.** `computeHealth` ([get-person-ico-profile.ts](../../../src/lib/person-360/get-person-ico-profile.ts)) corregido: RpA interpretado en su escala real (Rounds per Asset, bajo=mejor) con bands canónicos alineados al semáforo (`GH_AGENCY.rpa_semaphore` / `agency/space-health`): **RpA ≤1.5 óptimo · ≤2.5 atención · >2.5 alerta**, OTD ≥80/≥50; **RpA null = neutral** (no penaliza, la salud la decide OTD). `computeHealth` exportada para test. Display-only confirmado (consumers: `get-person-runtime` passthrough, tool Nexa `get_member_performance`, `PersonIntelligenceTab`; el bono usa `rpaAvg` directo en `bonus-proration.ts`, NO `health`).

**Verify-before-fix:** escala confirmada en `RPA_V1.md` (RpA=0 = aprobado a la primera; bajo=mejor). Bug **aislado a person-360**: org/space health usa un score 0-100 legítimo (`organization-projects.ts` `computeHealthScore`), sin el defecto → Slice 2 = verificado, sin cambio.

**Acceptance:**
- [x] `computeHealth` interpreta RpA en su escala real con umbrales validados (1.5/2.5).
- [x] Caso real (OTD 96 / RpA 1.13) → green, cubierto por test.
- [x] Corrección en el reader canónico; People endpoint + UI + tool Nexa heredan la salud correcta.
- [x] `health` es display-only (no gatea bono ni decisiones) — confirmado.
- [x] Salud org/space sin el defecto (score 0-100 legítimo) — verificado, sin cambio.
- [x] 7 tests de matriz (incl. Daniela) + 2 existentes recalibrados a RpA realista; suite full 7697 verde + build prod OK + tsc + lint (en la sesión del fix).
- [x] **Verificado contra PG real:** Daniela ahora `green` (antes `red`), mismos datos (OTD 96.2 / RpA 1.13 / FTR 93.7).

**Rollout:** sin migración, sin flag, función pura — cutover inmediato al deploy (decisión operador, local-first sin push). Sin pasos de rollout pendientes.

**Nota de recuperación (incidente de worktree compartido):** el commit del fix se perdió una vez por un `git reset` de un agente concurrente (Codex) sincronizando `develop`; recuperado vía `git branch task1219-fix-recovery` + cherry-pick (`e229a27a3`). Verificado de nuevo verde sobre el HEAD mergeado. Lección: agentes concurrentes deben usar worktrees/branches separados.
