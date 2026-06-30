# TASK-1291 — AEO: gate de validación pre-run del operador + reabilitación segura del cross-sell

## Delta 2026-06-30 — CIERRE: cross-sell reabilitado en prod + staging, smoke verde

- **`OPERATOR_SEND_ENABLED` re-enable APLICADO** (cierra el AC que quedaba pendiente). El flag pasó a **ON en Production** (flip masivo Growth/AEO del release `056c2dde8`, redeploy `greenhouse-ic8cg4ery`, autorización explícita del operador / riesgo aceptado) **y en staging** (parity flip 2026-06-30 → redeploy `greenhouse-bt9fvga8d`). Verdad live: `vercel env ls`. El guard de esta task ya estaba en `main` ANTES del flip → la cross-sell NO se reabilitó a ciegas: el código de `assertSubjectGradeable` está deployado junto al flag.
- **Criterio de reabilitación cumplido:** eval TASK-1292 (Capa A determinista) **verde + complete**; sign-off = aceptación explícita del operador (es el decisor comercial; no hubo un sign-off legal separado — residual menor anotado abajo).
- **Smoke staging verde (2026-06-30, post-redeploy):** signal `growth.ai_visibility.operator_gate_blocking` en `/api/admin/reliability` de staging → `severity=ok`, **`operator_send_enabled=true`** (antes `false`), `prospect_ungradeable=0`, `org_linked=2` ("Todos los prospectos enlazados pasan el gate"). Reabilitar la cross-sell SEND **no expuso ningún sujeto propenso al falso-0**. El block-path (`unknown` → bloqueo) queda cubierto por los tests deterministas (subject-gradeable 8/8 + wiring run/send): no hay ningún perfil org-linked `unknown` en la PG compartida para ejercerlo vía org real (todos los org-linked están resueltos).
- **Residual menor (no bloqueante):** el re-enable se hizo bajo aceptación de riesgo del operador, no un sign-off legal formal documentado aparte; el smoke E2E del SEND con email real a un prospecto NO se disparó (evitar spam) — el guard + el signal steady son la evidencia. Si comercial/legal exige un sign-off formal del outbound a prospectos, queda como follow-up de TASK-1279, no de esta task.
- **Lifecycle → `complete`.** ISSUE-110 cerrado por el conjunto EPIC-021 (motor 1288/1289/1290 + guard 1291 + eval 1292). EPIC-021 movido a `complete/`.

## Delta 2026-06-29 — foundation (TASK-1288) shipped

- **El guard `unknown` YA EXISTE** (TASK-1288): `commands.ts buildExecuteInput` (chokepoint universal) bloquea con `aeo_category_unresolved` detrás del flag `GROWTH_AI_VISIBILITY_CATEGORY_GUARD_ENABLED` (OFF) + pre-check limpio en portal/operador (`category_unresolved` blocked). El signal `growth.ai_visibility.profile_category_unresolved` ya está cableado. Esta task agrega el **review/confirm unificado** del operador (categoría + modelo + prompts juntos, Adaptive Sidecar `reconciler`) + reabilita TASK-1279.
- El snapshot `grader_brand_intelligence` (con `confidence` + provenance) es el insumo del review. `category_source`/`category_confidence` ya en `grader_profiles`.
- `desbloqueada` (TASK-1288 complete).

## Delta 2026-06-29 — TASK-1289 shipped (eje `business_model` + signal de `unknown`)

- El **eje `business_model`** ya está persistido + override gobernado (`overrideProfileBusinessModel`, capability `growth.ai_visibility.profile.set_business_model`). El review/confirm del operador debe incluir el `business_model` junto a la categoría (ambos pueden quedar `unknown` y ambos deben confirmarse antes de correr sobre prospecto). Reusar el command de override existente (NO crear otro write path).
- Existe el signal `growth.ai_visibility.profile_business_model_unresolved` (org-linked sin resolver, steady 0) — el gate de TASK-1291 trata `business_model unknown` igual que `category unknown`: "no correr sobre prospecto sin confirmar".

## Delta 2026-06-29 — implementación (code complete, rollout pendiente)

- **S1 (guard):** `operator/subject-gradeable.ts` → `assertSubjectGradeable` (SoT puro, audience-aware): categoría vía `resolveRunCategory().resolved` (predicado TASK-1288), modelo confirmado (`!= unknown`) sólo para prospecto. Always-on en el surface operador (sin flag); wired en `requestGraderRunAsOperator` + `sendAeoReportAndCreateLead`. Error canónico `aeo_business_model_unconfirmed` + maps en las 3 routes. Tests: `subject-gradeable.test.ts` (8) + wiring run/send. Commit `87376c0c1`.
- **S2 (signal):** `growth.ai_visibility.operator_gate_blocking` (drift) — prospectos org-linked no graduables mientras `OPERATOR_SEND_ENABLED` ON; wired en `get-reliability-overview` (5 sitios). Test (5). SQL type-safe (COALESCE boolean, sin date-math). Commit `5b948b192`.
- **Estado live del flag (verificado `vercel env ls`, 2026-06-29):** `OPERATOR_SEND_ENABLED` está **ABSENT en todos los envs Vercel** → la cross-sell SEND está gateada OFF (confirma la premisa de ISSUE-110; **corrige el ledger** que decía "staging ON" — quedó stale desde el smoke de TASK-1279). El gate hace seguro un futuro re-enable (SKY resuelto pasaría, `unknown` bloquea). NO se introduce flag nuevo (gate always-on; el run-operador queda protegido aunque el send siga OFF). NO hay migración (sin columna `operator_confirmed`: SSOT de TASK-1289).
- **Gates verdes:** `pnpm test` full 8588/0 + `pnpm build` + lint + tsc.
- **Rollout staging APLICADO (2026-06-29):** push develop → deploy `greenhouse-m5zjc4uyf` Ready. Signal `growth.ai_visibility.operator_gate_blocking` **live** en `/api/admin/reliability`: severity `ok` (NO `unknown` → mi SQL corre OK contra la PG real de staging, cierra el gap que el ADC local bloqueaba), `prospect_ungradeable=0`, `org_linked=2`, `operator_send_enabled=false`.
- **Rollout pendiente:** flip prod gateado por eval TASK-1292 + sign-off comercial/legal. El re-enable de `OPERATOR_SEND_ENABLED` (la cross-sell SEND) también queda gateado por TASK-1292. Estado: **code complete, guard deployado a staging, re-enable del cross-sell pendiente** — no se mueve a `complete/`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
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
- Backend impact: `command`
- Epic: `EPIC-021`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `TASK-1290`
- Branch: `task/TASK-1291-aeo-operator-validation-gate-crosssell-reenable`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el loop de seguridad: el cross-sell operador (TASK-1279) **rechaza correr o enviar** un diagnóstico si la marca no tiene categoría canónica resuelta (`category_node_id != unknown`) ni modelo de negocio confirmado. Reabilita TASK-1279 con un gate que impide repetir el falso-0 de SKY. Incluye el contrato programático del "confirmar antes de correr sobre un prospecto" (la superficie visible de review queda como follow-up `ui-ux`). Último eslabón funcional de EPIC-021.

## Why This Task Exists

TASK-1279 (cross-sell) se **gateó OFF** porque podía enviar un diagnóstico falso (SKY 0). Una vez que el motor genera prompts correctos (TASK-1288/1289/1290), falta el **guard** que garantice que nadie corra/envíe sobre una marca sin categoría+arquetipo validados — especialmente prospectos, donde un informe falso destruye credibilidad. Es defense-in-depth: el motor mide bien, y el gate impide los casos sin resolver.

## Goal

- Guard en el chokepoint de run operador + en el command de envío (`sendAeoReportAndCreateLead`): bloquear si `category_node_id = unknown` o `business_model` no confirmado, con error canónico.
- Reabilitar `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (revertir el gate OFF de ISSUE-110) tras verificar el motor end-to-end.
- Contrato programático del **review unificado**: un solo momento donde el operador confirma/corrige **lo que entendimos de la marca** (categoría + modelo de negocio + preview de los prompts autorados) — todo junto, derivado del `brand_intelligence` snapshot (TASK-1288). Reader + command de confirmación; la superficie visible (Adaptive Sidecar `reconciler`) = follow-up `ui-ux` dentro de EPIC-021.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-1279-aeo-operator-send-report-open-opportunity.md` (el cross-sell que se reabilita)
- `docs/epics/to-do/EPIC-021-aeo-brand-aware-prompt-generation-engine.md`

Reglas obligatorias:

- El gate vive en el chokepoint canónico (`request-run` operador + `sendAeoReportAndCreateLead`), NO parcheado por-callsite.
- Reabilitar el flag SOLO tras evidencia end-to-end del motor (run SKY realista + eval verde).
- Para un **prospecto**, el gate exige categoría resuelta + arquetipo confirmado; para un cliente contratado, al menos categoría resuelta.

## Normative Docs

- `docs/issues/open/ISSUE-110-aeo-grader-false-zero-non-agency-brands-taxonomy-bypass.md`
- `docs/tasks/to-do/TASK-1288-aeo-canonical-category-resolution.md` (guard de categoría)
- `docs/tasks/to-do/TASK-1289-aeo-business-model-classification.md` (arquetipo)

## Dependencies & Impact

### Depende de

- **TASK-1290** (motor de prompts por arquetipo) — el gate solo tiene sentido cuando el motor mide bien. Bloqueante.
- TASK-1288 (categoría) + TASK-1289 (arquetipo) — el gate los consume.

### Impacta a

- **TASK-1279** (cross-sell) — se reabilita con el gate.
- Follow-up `ui-ux` de la superficie de review operador.

### Files owned

- `src/lib/growth/ai-visibility/request-run.ts` (guard operador) `[verificar]`
- `src/lib/growth/ai-visibility/operator/send-report-and-create-lead.ts` (guard de envío)
- `src/lib/growth/ai-visibility/operator/validate-subject.ts` (reader/command de confirmación) `[verificar naming]`
- `src/lib/api/canonical-error-response.ts` (códigos `aeo_category_unresolved`, `aeo_business_model_unconfirmed`)

## Current Repo State

### Already exists

- Cross-sell operador (TASK-1279) gateado OFF (ISSUE-110).
- (Tras TASK-1288/1289/1290) categoría canónica + arquetipo + motor de prompts correcto.

### Gap

- No hay guard de validación en el run/envío operador; el flag está OFF sin un criterio de reabilitación.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (outbound a prospectos reales + reabilita un flag gateado por incidente)
- Impacto principal: `command` (guard) (+ reader de validación)
- Source of truth afectado: el estado de validación del perfil (categoría resuelta + arquetipo confirmado) + el flag del cross-sell
- Consumidores afectados: cross-sell operador (TASK-1279) · vista operador (follow-up UI)
- Runtime target: `staging|production`

### Contract surface

- Contrato nuevo: `assertSubjectGradeable({ organizationId, audience: 'prospect'|'client' }) → ok | blocked(reason)`; command de confirmación de arquetipo (si needs-review).
- Backward compatibility: `gated` (el cross-sell vuelve a estar disponible, con guard).
- Full API parity: el guard es parte del chokepoint; UI/Nexa lo heredan por construcción.

### Data model and invariants

- Entidades: lee `grader_profiles.category_node_id`/`business_model` (TASK-1288/1289); sin tabla nueva (o una marca de "validado por operador" si se requiere).
- Invariantes:
  - Run/envío operador sobre prospecto: `category_node_id != unknown` **y** `business_model` confirmado, sino bloqueo.
  - El flag `OPERATOR_SEND_ENABLED` no se reabilita sin evidencia del motor (run realista + eval).
- Tenant/space boundary: capability operador (reuse).
- Idempotency/concurrency: guard puro (lectura) antes del write.
- Audit/outbox/history: el bloqueo se observa (signal); la confirmación de arquetipo se audita (TASK-1289).

### Migration, backfill and rollout

- Migration posture: `additive` (o repo-only si no hay columna nueva).
- Default state: guard ON por construcción; el flag del cross-sell se reabilita explícitamente tras verificación.
- Backfill plan: ninguno.
- Rollback path: flag OFF de nuevo (vuelve a gatear el cross-sell) + revert.
- External coordination: sign-off comercial/legal del cross-sell (heredado de TASK-1279).

### Security and access

- Auth/access gate: capability operador del grader (reuse).
- Sensitive data posture: sin PII nueva.
- Error contract: `aeo_category_unresolved` / `aeo_business_model_unconfirmed` canónicos es-CL.
- Abuse/rate-limit posture: heredado de TASK-1279.

### Runtime evidence

- Local checks: tests del guard (unknown → bloqueo; resuelto+confirmado → pasa; prospecto vs cliente).
- DB/runtime checks: smoke staging — run/envío sobre una marca `unknown` bloqueado; sobre SKY (resuelto + consumer_b2c) permitido.
- Integration checks: cross-sell reabilitado end-to-end con score realista.
- Reliability signals/logs: signal de runs/envíos bloqueados por validación.
- Production verification sequence: motor verde (TASK-1290 + eval TASK-1292) → flip flag staging → smoke → prod.

### Acceptance criteria additions

- [ ] Guard en chokepoint (no por-callsite); SoT de validación nombrado.
- [ ] Criterio de reabilitación del flag explícito (evidencia del motor).
- [ ] Errores canónicos; signal de bloqueos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Guard de validación

- `assertSubjectGradeable` + códigos canónicos + wiring en `request-run` operador y `sendAeoReportAndCreateLead`. Tests.

### Slice 2 — Reabilitación + signal

- Reabilitar `OPERATOR_SEND_ENABLED` (staging) tras evidencia del motor; reliability signal de bloqueos por validación.

## Out of Scope

- La superficie visible de review operador (follow-up `ui-ux` dentro de EPIC-021).
- El motor de prompts (TASK-1288/1289/1290).
- La eval (TASK-1292).

## Detailed Spec

Defense-in-depth: aunque el motor genere prompts correctos, el gate garantiza que no se corra/envíe sobre una marca sin categoría+arquetipo resueltos (el caso que produjo el falso-0). El flag del cross-sell se reabilita solo cuando el motor está verde end-to-end. La UI de review (confirmar categoría/arquetipo + preview de prompts antes de un prospecto) es follow-up `ui-ux` con su propio wireframe robusto.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- S1 (guard) → S2 (reabilitación + signal). Bloqueada por TASK-1290 (+1288/1289). El flag NO se reabilita hasta TASK-1292 verde.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reabilitar el cross-sell antes de que el motor mida bien | growth/commercial | medium | criterio duro de evidencia (run realista + eval) antes del flip | falso-0 reaparece |
| Guard demasiado estricto bloquea casos válidos | growth | low | distinguir prospecto (estricto) vs cliente (categoría basta) + override | bloqueos legítimos altos |

### Feature flags / cutover

- Reusa `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` (hoy OFF por ISSUE-110). Reabilitar staging tras evidencia; prod con sign-off.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <10 min | sí |
| Slice 2 | flag OFF | <5 min | sí |

### Production verification sequence

1. Motor verde (TASK-1290 + eval TASK-1292).
2. Guard ON: run/envío sobre marca `unknown` bloqueado; sobre SKY permitido + score realista.
3. Flip `OPERATOR_SEND_ENABLED` staging → smoke E2E con score realista.
4. prod con sign-off comercial/legal.

### Out-of-band coordination required

- Sign-off comercial/legal del cross-sell (heredado de TASK-1279).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `assertSubjectGradeable` bloquea run/envío operador si `category_node_id = unknown` o `business_model` no confirmado (prospecto); cliente exige al menos categoría resuelta. Wired en el chokepoint (`requestGraderRunAsOperator` + `sendAeoReportAndCreateLead`), errores canónicos (`aeo_category_unresolved` + `aeo_business_model_unconfirmed`). Tests verdes (subject-gradeable 8/8 + wiring run/send).
- [x] `GROWTH_AI_VISIBILITY_OPERATOR_SEND_ENABLED` — **re-enable APLICADO (2026-06-30).** ON en Production (release `056c2dde8` / redeploy `greenhouse-ic8cg4ery`) **y** en staging (parity flip → redeploy `greenhouse-bt9fvga8d`). Criterio cumplido: eval TASK-1292 verde + aceptación explícita del operador. El guard de esta task estaba en `main` antes del flip → re-enable NO a ciegas. Verdad live: `vercel env ls`.
- [x] Reliability signal `growth.ai_visibility.operator_gate_blocking` (drift); test 5/5 + **live en staging** (`/api/admin/reliability`, severity `ok`, `prospect_ungradeable=0`/`org_linked=2` → SQL validado contra PG real). Smoke del guard cubierto por unit/wiring tests; el smoke del SEND requiere re-enable (gateado por TASK-1292).

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- smoke staging del guard + reabilitación del cross-sell con score realista

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado — **deferred por coordinación**: Codex tiene WIP uncommitted en `Handoff.md` (Public Site AEO `/aeo-2/`); no se toca para no clobberear su sesión activa (misma razón que TASK-1292).
- [ ] `changelog.md` actualizado — **deferred por coordinación** (misma razón).
- [x] chequeo de impacto cruzado (EPIC-021 → `complete/`, TASK-1279 reabilitado con guard, ISSUE-110 → `resolved/`)
- [x] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`

## Follow-ups

- **UI de review operador** (`ui-ux`): confirmar categoría/arquetipo + preview de prompts antes de correr sobre un prospecto (wireframe robusto, dentro de EPIC-021).

## Open Questions

- ~~¿El "arquetipo confirmado" requiere una marca explícita en DB (operator-confirmed) o basta `business_model != unknown`?~~ **RESUELTO (2026-06-29):** basta `business_model != unknown`, **sin columna `operator_confirmed` paralela**. Rationale: TASK-1289 ya codifica la provenance (`business_model_source ∈ {brand_intelligence, category_heuristic, operator_override, unknown}` + confianza); "confirmado por operador" = `source='operator_override'` (conf 1.0) vía el override gobernado existente (`overrideProfileBusinessModel`). Una columna booleana nueva sería un SSOT paralelo y violaría la instrucción de la spec ("reusar el override, NO crear otro write path"). Decisión arch SSOT.
