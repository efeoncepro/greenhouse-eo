# TASK-1416 — Chapter-author operable desde Nexa + MCP (la 3ª y 4ª pata de parity del motor)

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
- Blocked by: `none` (TASK-1415 shipped 2026-07-16)
- Branch: `task/TASK-1416-chapter-author-nexa-mcp-surface`

## Summary

Cablea el **motor de chapter-authors** (TASK-1415) a sus dos superficies de parity pendientes: una **acción gobernada de Nexa** (`author_chapter`: el operador pide "autora la lámina de diagnóstico de X" por chat → preview con el framing propuesto → confirmación humana → las láminas confirmadas quedan registradas en la `Proposal`) y el **tool MCP** del lane ecosystem. Cero lógica nueva de autoría: Nexa y MCP son **consumers del MISMO primitive** (`proposeChapter`/`confirmChapter`), igual que las 4 acciones de TASK-1399 lo son de los commands del aggregate. Cierra la deuda de Full API Parity declarada en el DoD de TASK-1415.

## Why This Task Exists

TASK-1415 dejó el motor probado end-to-end, pero **hoy se opera por script local** (`_sanity-diagnostico-chapter-author.ts`) — no hay camino gobernado para que el operador lo use conversando. La base del repo es Full API Parity: si el contrato existe, Nexa y MCP lo operan por construcción. El molde exacto ya existe y está verificado con LLM real (TASK-1399: acciones `register_proposal`/`attach_rfp`/`record_evidence`/`request_render` + tool `proposal_status`); esta task replica esa costura para la autoría, sin abrir un camino paralelo.

## Goal

- Acción gobernada `author_chapter` en el bloque de Proposal Studio de Nexa: schema Zod **sin ids de organización** (cliente por nombre, scope del entitlement), preview que ejercita los gates reales, confirm humano que ejecuta `confirmChapter` + el registro canónico del capítulo en la `Proposal`.
- Registro del capítulo confirmado como **artefacto del aggregate** (las láminas autoradas quedan trazables a su propuesta y a su run de origen — hoy el output del confirm se pierde si nadie lo pega en un `deck-plan.json`).
- Tool MCP del lane ecosystem que expone la misma capability (propose read-only; el confirm queda humano — el MCP NO confirma).
- Todo detrás de los flags existentes compuestos (`NEXA_PROPOSAL_ACTIONS_ENABLED` + `TENDER_CHAPTER_AUTHOR_ENABLED`), sin flag nuevo salvo que Discovery lo justifique.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §5-ter (Delta 2026-07-16: el motor existe) + §5-bis.
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` §Chapter-author engine + las 3 reglas de acciones gobernadas nacidas en TASK-1399 (scope de la sesión · preview que bloquea · gates del command, no copia).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` + `GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane ecosystem para MCP).
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (loop propose→confirm→execute; el LLM nunca escribe).

Reglas obligatorias:

- **NUNCA** un `ownerOrgId` (ni id de organización) en el `inputSchema` de la acción — scope del entitlement, cliente por nombre fail-closed (`resolveClientOrganizationByName`).
- **El preview ejercita los gates del command, no una copia**: si el flag del motor está OFF o la propuesta no es elegible, `NexaActionBlockedError` → gap `unavailable` (se explica, no se propone).
- **El agente NUNCA confirma**: el confirm de Nexa es la tarjeta humana; el MCP expone sólo propose/lectura.
- Registrar la acción en `NEXA_ACTION_REGISTRY` **y** en la descripción del tool `propose_action` (lista hardcodeada — si no se actualiza, el LLM no sabe que existe).

## Normative Docs

- `src/lib/nexa/actions/proposal-studio.ts` — el molde exacto de acción gobernada del dominio (4 acciones vivas).
- `src/lib/commercial/tenders/proposals/authoring/chapter-author.ts` — el primitive (`proposeChapter`/`confirmChapter`).
- `.claude/skills/greenhouse-public-private-tenders/proposal-studio-runtime.md` — costura "Una acción nueva operable desde Nexa".

## Dependencies & Impact

### Depends on

- TASK-1415 (shipped): `proposals/authoring/**`.
- TASK-1399 (shipped): molde de acciones + registry + gate `assertProposalStudioAccessForSubject`.
- Reader del Grader para armar el `DiagnosticoSource` server-side (lookup `public_id → run_id` del run + `readGraderReport` — el caller de Nexa lo resuelve, el modelo no elige ids).

### Blocks / Impacts

- Desbloquea el uso conversacional del motor (el norte de la plataforma agéntica de licitaciones).
- Impacta la decisión de rollout conjunto de los flags del Studio (EPIC-029).

### Files owned

- `src/lib/nexa/actions/proposal-studio.ts` (extender con `author_chapter`) `[verificar si conviene archivo hermano authoring-actions.ts]`
- `src/lib/commercial/tenders/proposals/authoring/*` (sólo si emerge un helper de registro del capítulo — el motor NO se toca)
- `src/lib/api-platform/**` (tool MCP lane ecosystem) `[verificar superficie exacta en Discovery]`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (si Discovery decide flag propio)

## Current Repo State

### Already exists

- El motor completo con evals (TASK-1415); el molde de acción gobernada verificado con LLM real (TASK-1399); la puerta única (`assertProposalStudioAccessForSubject`); `attachProposalAsset`/`recordProposalEvidence` como candidatos para persistir el capítulo confirmado.

### Gap

- No hay acción `author_chapter` ni tool MCP; el output del confirm (las `AuthoredSlide[]`) **no se persiste en ningún lado** — el registro canónico del capítulo en el aggregate es la decisión de diseño central de esta task (ver Open Questions).

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/nexa/actions/` (consumer) + `src/lib/commercial/tenders/proposals/authoring/` (primitive, no se toca)
- Future candidate home: `domain-package`
- Boundary: la acción/tool consumen `proposeChapter`/`confirmChapter` + los readers del caller; NUNCA reimplementan validación ni tocan la interface del motor.
- Server/browser split: **server-only** (la acción corre en el route handler de Nexa; el LLM y los readers del Grader son server-side; el browser sólo ve la tarjeta de preview/confirm).
- Build impact: `none`.
- Extraction blocker: mismo port cross-dominio ya documentado en TASK-1415 (reader del Grader).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: el primitive de authoring (input); `proposal_assets`/evidencia del aggregate como registro del capítulo confirmado (output — decidir shape en Discovery).
- Consumidores afectados: Nexa (chat), MCP (ecosystem), el orquestador futuro (TASK-1419).
- Runtime target: `local` + `staging` (flags OFF en prod).

### Contract surface

- Contrato existente a respetar: `proposeChapter`/`confirmChapter` (no se modifican), molde de acciones TASK-1399, `attachProposalAsset` si se usa para persistir.
- Contrato nuevo o modificado: acción `author_chapter` (preview/confirm) + registro canónico del capítulo + tool MCP de propose.
- Backward compatibility: aditivo; el script local de TASK-1415 sigue funcionando.
- Full API parity: esta task ES la parity (cierra las patas 3 y 4).

### Data model and invariants

- Entidades: ninguna tabla nueva esperada; si el registro del capítulo exige un `kind` nuevo de asset/evidencia, es migración aditiva con CHECK extendido `[verificar]`.
- Invariantes: los del motor (cifra/URL huérfana rechaza; confirm member-only) + los de acciones gobernadas (scope de sesión; preview bloquea).
- Tenant/space boundary: entitlement per-ORG `proposal_studio_v1` + capability `commercial.proposal.manage` vía la puerta única.
- Idempotency/concurrency: la del motor (idempotencyKey por hash de la propuesta confirmada).
- Audit/outbox/history: si el confirm persiste en el aggregate, reusa el audit/outbox del command elegido (no crear paralelo).

### Migration, backfill and rollout

- Migration posture: `none` esperada (aditiva sólo si emerge `kind` nuevo).
- Default state: OFF por composición de flags existentes.
- Backfill plan: N/A.
- Rollback path: flags OFF + revert PR.
- External coordination: ninguna.

### Security and access

- Auth/access gate: la puerta única del Studio + capability `manage` (el mapa `NEED_TO_CAPABILITY` decide el need del propose — precedente: `render_propose → render:read`).
- Sensitive data posture: el prompt no incluye secretos; el run del Grader es dato de negocio del ORG.
- Error contract: `NexaActionBlockedError` para bloqueos; `canonicalErrorResponse` si emerge route; `captureWithDomain(err, 'commercial', …)`.
- Abuse/rate-limit: interno; costo LLM acotado por `maxTokens` + retry N=2 del motor.

### Runtime evidence

- Local checks: suite `authoring/` intacta + tests de la acción (molde `proposal-studio.test.ts`).
- DB/runtime checks: si se persiste capítulo, verificar la fila real en PG.
- Integration checks: conversación real con Nexa en staging (flags ON) — pedir la lámina de diagnóstico de un cliente con run, confirmar, y verificar el registro; probar el gap `unavailable` con flag OFF.
- Reliability signals/logs: sin signal nuevo salvo que Discovery lo justifique.
- Production verification sequence: N/A (flags OFF en prod).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales post-Discovery.
- [ ] El registro del capítulo confirmado queda trazable (proposal + run + factsHash).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El registro canónico del capítulo confirmado

- Decidir (Open Question 1) y cablear dónde persiste el output del confirm en el aggregate `Proposal`, con audit/outbox del command reusado. Test de idempotencia (re-confirmar no duplica).

### Slice 2 — La acción gobernada `author_chapter`

- Molde TASK-1399 completo: schema Zod (cliente por nombre + código público del run + brief; SIN ids de org), `isEnabled` (composición de flags), `isPermitted` (capability), `buildPreview` (arma el source server-side → `proposeChapter` → tarjeta con el framing + hechos citados; bloqueos → `NexaActionBlockedError`), `execute` (confirm + registro del Slice 1). Registrar en `NEXA_ACTION_REGISTRY` + descripción del tool `propose_action`.

### Slice 3 — Tool MCP (lane ecosystem)

- Exponer el propose (read-only) por el lane ecosystem con el mismo gate; el confirm NO se expone (humano). `[verificar]` la superficie MCP vigente del api-platform en Discovery.

### Slice 4 — Evidencia conversacional real en staging

- Flags ON en staging → conversación real (propose + confirm + registro verificado + gap con flag OFF) documentada en el task/Handoff.

## Out of Scope

- Tocar el motor (`chapter-author.ts`/`eval-harness.ts`) o los authors existentes.
- UI del Studio (F5 write).
- Authors nuevos (TASK-1417/1418), orquestador (TASK-1419), verifier (TASK-1420).
- Prender flags en producción.

## Detailed Spec

La acción es un consumer delgado: **arma el source con readers server-side (scope de la sesión), delega en el primitive, y persiste vía command canónico**. Nada de lógica de autoría en la acción. El shape exacto de la tarjeta de preview (framing + hechos con evidenceRef visibles para el humano) se decide en Discovery mirando las tarjetas vivas de TASK-1399.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (registro) antes que Slice 2 (acción): el execute de la acción necesita un destino canónico — sin él, el confirm de Nexa sería un click-handler sin efecto trazable.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El LLM de Nexa propone ids/orgs fuera de scope | Nexa | low | schema sin ids + resolución por nombre fail-closed (molde 1399, ya probado) | test del schema + eval de la acción |
| El preview promete un authoring que el flag OFF bloquea | Nexa | low | `isEnabled` compuesto + preview que ejercita gates reales | gap `unavailable` visible |
| Registro del capítulo duplica ante re-confirm | proposals | medium | idempotencyKey del motor + command idempotente | test de idempotencia |

### Feature flags / cutover

- Composición de `NEXA_PROPOSAL_ACTIONS_ENABLED` + `TENDER_CHAPTER_AUTHOR_ENABLED` (ambos OFF en prod). Si Discovery decide flag propio, fila en el ledger mismo PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-3 | revert PR (aditivo) | <5 min | sí |
| 4 | flags OFF en staging | <5 min | sí |

### Production verification sequence

1. CI verde (suites nexa/actions + authoring intactas).
2. Staging: conversación real documentada (Slice 4).
3. Prod: flags OFF — el flip es decisión del operador (EPIC-029).

### Out-of-band coordination required

- N/A — repo-only change (staging flip lo ejecuta el implementador con los flags existentes).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La acción `author_chapter` existe con el molde completo de TASK-1399 (schema sin ids de org, preview que bloquea, execute que delega) y está registrada en `NEXA_ACTION_REGISTRY` + descripción de `propose_action`.
- [ ] El capítulo confirmado queda registrado en el aggregate vía command canónico, idempotente, con trazabilidad al run y al factsHash.
- [ ] El tool MCP expone el propose por el lane ecosystem con el mismo gate; el confirm no es operable por MCP.
- [ ] El motor de TASK-1415 no se modificó (diff vacío en `chapter-author.ts`/`eval-harness.ts`).
- [ ] Evidencia conversacional real en staging (propose + confirm + gap con flag OFF) en el task/Handoff.
- [ ] Suites `src/lib/nexa` + `src/lib/commercial/tenders/proposals/authoring` verdes.

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/nexa src/lib/commercial/tenders/proposals`
- Conversación real en staging con flags ON (evidencia en Handoff).
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle sincronizado + carpeta correcta + `docs/tasks/README.md` + registry.
- [ ] `Handoff.md` + `changelog.md`.
- [ ] Delta en el arch doc del Studio (§5-ter: parity del chapter-author cerrada) + companion `proposal-studio-runtime.md` (ambos espejos).
- [ ] Chequeo de impacto cruzado (EPIC-029, TASK-1419).

## Follow-ups

- La UI del Studio (F5 write) consumirá esta misma acción/preview — no antes del loop Nexa probado.

## Open Questions

- **¿Dónde persiste el capítulo confirmado?** Recomendación: como asset JSON del aggregate vía `attachProposalAsset` (kind nuevo `deck_plan_fragment` o reuso de `proposal_deliverable` — decidir en Discovery mirando el CHECK vigente de kinds `[verificar]`). La alternativa (evidencia vía `recordProposalEvidence`) mezclaría semántica de fuente con output.
- **¿Flag propio o composición?** Recomendación: composición de los 2 existentes (no hay superficie nueva que apagar por separado); crear flag propio sólo si el operador quiere granularidad.
