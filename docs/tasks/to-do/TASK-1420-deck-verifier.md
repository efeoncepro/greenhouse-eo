# TASK-1420 — Verifier del deck (§5-ter nodo 3): veredicto estructurado de integridad, registro y coherencia

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-029`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `TASK-1419` (el verifier consume el agregado del fan-out; puede correr sobre un plan manual mientras tanto — ver Open Questions)
- Branch: `task/TASK-1420-deck-verifier`

## Summary

El **tercer nodo de juicio de §5-ter**: el verifier que recibe el plan de láminas ya autorado (slides + el rastro de hechos con `evidenceRef`) y emite un **veredicto estructurado** — findings de integridad de datos (¿cada cifra calza con su hecho?), registro institucional (¿es-CL formal de usted, sin tuteo al comité?) y coherencia narrativa cross-capítulo (¿el diagnóstico no contradice a la económica?). El veredicto NO bloquea mecánicamente por sí solo: **alimenta al humano que firma** (última defensa, la que el método ya exige). Es un nodo obligatorio del ADR — el daño de una fabricación sutil en una oferta contractual es desproporcionado al blast radius técnico.

## Why This Task Exists

Los guards mecánicos del motor (TASK-1415) atrapan la fabricación **estructural** (cifra/URL sin hecho); no atrapan la **sutil**: un hecho citado en contexto engañoso, un registro que se desliza al tuteo, dos capítulos que se contradicen ("0% citabilidad" en diagnóstico y "consolidar la citabilidad existente" en líneas). El ADR §5-ter declaró el VERIFIER como nodo obligatorio precisamente para esa capa — con su riesgo residual documentado (es un LLM: puede dejar pasar; la mitigación consciente es el humano que firma, NO un segundo verifier — sería teatro de defensa en profundidad sobre el mismo modo de falla).

## Goal

- `verifyDeckPlan(plan, factsTrail) → DeckVerdict` (structured output, molde del dominio): findings tipados `{ slideId, kind: integridad|registro|coherencia, severity, detail, evidencia }` + veredicto global.
- **Checks deterministas primero** (gratis, sin LLM): re-correr los guards del motor sobre el plan completo + verificación cruzada cifra↔hecho por slide — el LLM verifica lo que el código no puede (contexto, registro, coherencia).
- Eval baseline con **casos sembrados**: un plan limpio (golden SKY) debe salir sin findings falsos; planes con defectos inyectados (contexto engañoso, tuteo, contradicción cross-capítulo) deben producir el finding esperado.
- Integración al pipeline: el veredicto viaja con el plan hacia el confirm final del humano (findings visibles, nunca ocultos).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §5-ter (Safety: el VERIFIER es obligatorio; riesgo residual documentado; el humano firma) + §5-bis (eval obligatorio).
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` §Chapter-author engine + los 3 principios raíz + registro formal de usted en client-facing.

Reglas obligatorias:

- **NUNCA** el verifier corrige/reescribe contenido — emite findings; corregir es del author (re-propose) o del humano.
- **NUNCA** ocultar findings al humano que confirma (un veredicto "limpio" con findings suprimidos es peor que no verificar).
- **NUNCA** un segundo verifier como mitigación del riesgo residual (decisión explícita del ADR).
- Los checks deterministas corren SIEMPRE antes del LLM (y su fallo es rechazo duro, no finding).

## Normative Docs

- `src/lib/commercial/tenders/proposals/authoring/chapter-author.ts` — los guards a reusar como pre-checks.
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json` — el plan limpio del eval.
- `.claude/skills/greenhouse-public-private-tenders/deck-visual-system.md` — registro/reglas del molde que el verifier debe conocer en su prompt.

## Dependencies & Impact

### Depends on

- TASK-1415 (shipped): guards + hechos con `evidenceRef` (el factsTrail que el verifier cruza).
- TASK-1419: el agregado `{slides, faltas}` como input canónico (bloqueante para la integración al pipeline; el nodo en sí puede desarrollarse contra un plan manual).

### Blocks / Impacts

- Completa los 3 nodos de §5-ter → habilita el Exit Criteria del EPIC-029 (pipeline agéntico completo).

### Files owned

- `src/lib/commercial/tenders/proposals/authoring/verifier.ts` (nuevo)
- `src/lib/commercial/tenders/proposals/authoring/__tests__/verifier-*.test.ts` + fixtures (nuevos)
- `scripts/commercial/_sanity-deck-verifier.ts` (nuevo)

## Current Repo State

### Already exists

- Los guards mecánicos reusables (`assertQuantifiedClaimsAreEvidenced`/`assertLinksAreEvidenced` exportados). El plan SKY real como caso limpio. `generateStructuredAnthropic` + el patrón de findings tipados (los evals del grader usan shapes similares).

### Gap

- No existe el nodo verifier ni el shape `DeckVerdict`. No existe un "factsTrail" agregado plan-completo (los hechos viven por capítulo) — diseñar cómo viaja el rastro de hechos junto al plan `[verificar con el shape del agregado de TASK-1419]`.

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/proposals/authoring/`
- Future candidate home: `domain-package`
- Boundary: el verifier consume el plan agregado + el factsTrail; reusa los guards del motor como funciones exportadas; no importa internals de authors ni del composer.
- Server/browser split: **server-only** (el LLM y el plan corren server-side; el humano ve findings vía la superficie que corresponda).
- Build impact: `none`.
- Extraction blocker: ninguno nuevo (opera sobre shapes del propio dominio).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: el plan agregado + factsTrail (input read-only); `DeckVerdict` (output que viaja con el plan).
- Consumidores afectados: el confirm final humano, Nexa (tarjeta de findings, follow-up), el registro de TASK-1416.
- Runtime target: `local` + `staging` (flag OFF en prod).

### Contract surface

- Contrato existente a respetar: guards del motor (reuso, sin cambios); molde structured output del dominio.
- Contrato nuevo: `verifyDeckPlan(plan, factsTrail) → DeckVerdict` + el shape `DeckVerdict`/`VerifierFinding`.
- Backward compatibility: aditivo.
- Full API parity: función server-side command-shaped; superficie conversacional = follow-up de TASK-1416.

### Data model and invariants

- Entidades: ninguna nueva.
- Invariantes: findings nunca se suprimen; checks deterministas antes del LLM; el verifier no muta el plan; degradación honesta (si el LLM falla, el veredicto es `no_verificado` explícito — NUNCA un "limpio" por defecto).
- Tenant/space boundary: hereda el scope del pipeline (caller con sesión).
- Idempotency/concurrency: mismo plan + mismos hechos → mismos checks deterministas; el veredicto LLM lleva trace (model + hash del plan).
- Audit/outbox/history: N/A en esta task (el veredicto viaja con el plan; persistencia con el registro de TASK-1416).

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `TENDER_CHAPTER_AUTHOR_ENABLED` OFF gatea el pipeline.
- Backfill plan: N/A.
- Rollback path: revert PR.
- External coordination: ninguna.

### Security and access

- Auth/access gate: el del pipeline (puerta única del Studio).
- Sensitive data posture: el verifier ve el plan client-facing + hechos; nada interno adicional entra a su prompt.
- Error contract: `captureWithDomain`; fallo del LLM → veredicto `no_verificado` explícito.
- Abuse/rate-limit: 1 llamada por deck (cota §5-ter).

### Runtime evidence

- Local checks: suite authoring verde + eval del verifier.
- DB/runtime checks: N/A (opera sobre shapes en memoria).
- Integration checks: corrida real sobre el plan SKY (limpio → sin findings falsos) + sobre un plan con defectos sembrados (findings esperados) — con LLM real, documentada.
- Reliability signals/logs: sin signal nuevo.
- Production verification sequence: N/A (flag OFF).

### Acceptance criteria additions

- [ ] El veredicto distingue `limpio` / `con_findings` / `no_verificado` (el fallo del LLM nunca se ve como limpio).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Pre-checks deterministas + el shape del veredicto

- `DeckVerdict`/`VerifierFinding` tipados; runner que re-corre los guards del motor sobre el plan completo + cruce cifra↔hecho por slide. Sin LLM. Tests puros.

### Slice 2 — El nodo LLM (integridad contextual · registro · coherencia)

- `verifyDeckPlan`: structured output (findings tipados con evidencia citada), prompt con las reglas del molde/registro del dominio, trace con hash del plan. Fallo del LLM → `no_verificado`.

### Slice 3 — Eval baseline con defectos sembrados

- Casos: plan SKY limpio (cero findings falsos tolerados en integridad; registro/coherencia con criterio documentado) + ≥3 planes con defectos inyectados (contexto engañoso de una cifra real · tuteo al comité · contradicción cross-capítulo) → el finding esperado aparece. El prompt shipea sólo con eval verde.

### Slice 4 — Integración + corrida real

- El veredicto viaja con el agregado del fan-out (TASK-1419) hacia el confirm humano; corrida real documentada con LLM real sobre el plan SKY.

## Out of Scope

- Corregir/reescribir contenido (el verifier no muta). Un segundo verifier. Bloqueo mecánico del render por findings (el humano decide — el render ya tiene sus propios gates fail-closed). Superficie Nexa del veredicto (follow-up de TASK-1416).

## Detailed Spec

Capas: (1) **determinista** — los mismos guards del motor, ahora sobre el plan completo (atrapa drift entre confirm y ensamble); (2) **agéntica** — lo que el código no puede: ¿la cifra real está usada en un contexto que engaña?, ¿el registro es institucional de usted?, ¿los capítulos se contradicen? El eval de Slice 3 es la vara: el criterio de "finding esperado" queda documentado en los fixtures, no en la memoria del implementador.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 3 → 2 → 4: los pre-checks y el eval existen antes de que el prompt del verifier shipee (§5-bis).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El verifier deja pasar una fabricación sutil | commercial | medium | riesgo residual DOCUMENTADO del ADR; humano firma (última defensa); eval con defectos sembrados | eval rojo / revisión humana |
| Findings falsos que entrenan al humano a ignorarlos | commercial | medium | eval exige cero falsos en integridad sobre el plan limpio; criterio documentado para registro/coherencia | eval rojo |
| Fallo del LLM leído como "limpio" | pipeline | low | estado `no_verificado` explícito + test | test |

### Feature flags / cutover

- Reusa `TENDER_CHAPTER_AUTHOR_ENABLED` (OFF). Sin flag nuevo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-4 | revert PR (aditivo puro) | <5 min | sí |

### Production verification sequence

1. CI: eval verifier + suite authoring verdes.
2. Local: corrida real (plan limpio + plan con defectos) documentada.
3. Prod: flag OFF (decisión EPIC-029).

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Pre-checks deterministas reusan los guards del motor (sin duplicar lógica) y corren antes del LLM.
- [ ] `verifyDeckPlan` emite findings tipados con evidencia citada y veredicto `limpio|con_findings|no_verificado`.
- [ ] Eval verde: plan SKY limpio sin findings falsos de integridad; los 3+ defectos sembrados producen su finding.
- [ ] El verifier no muta el plan (test) y los findings llegan íntegros al confirm humano.
- [ ] Motor/authors/orquestador sin modificar (diff vacío fuera de `verifier.ts` y tests).
- [ ] Corrida real con LLM documentada.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/commercial/tenders/proposals/authoring`
- Corrida real documentada + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle + carpeta + README/registry sincronizados.
- [ ] `Handoff.md` + `changelog.md`.
- [ ] Delta en el arch doc (§5-ter: los 3 nodos completos) + companion (ambos espejos).
- [ ] Impacto cruzado: EPIC-029 (Exit Criteria de nodos), TASK-1416 (tarjeta de findings como follow-up).

## Follow-ups

- Tarjeta de findings en Nexa (extensión de TASK-1416).
- Persistir veredictos junto al registro del capítulo/plan (auditoría longitudinal de calidad de autoría).

## Open Questions

- **¿Desarrollarlo contra el agregado de TASK-1419 o contra un plan manual?** Recomendación: Slices 1-3 contra el plan SKY manual (no dependen del orquestador); Slice 4 exige TASK-1419. Si el orden de ejecución se invierte, re-declarar el blocked-by.
