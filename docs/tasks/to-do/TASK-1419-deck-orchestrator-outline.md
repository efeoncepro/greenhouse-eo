# TASK-1419 — Orquestador del deck (§5-ter nodo 1): outline agéntico + fan-out determinista sobre chapter-authors

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
- Blocked by: `none` (recomendado tomar después de TASK-1417/1418 — con 2 authors el fan-out es trivial; con 4+ paga)
- Branch: `task/TASK-1419-deck-orchestrator-outline`

## Summary

El **primer nodo de juicio de §5-ter**: el orquestador que, dado el contexto de una `Proposal` (requisitos, evidencia permitida, catálogo de authors disponibles), **propone el outline del deck** — `[{ capítulo, contentTypes, brief, targetSlideIds }]` — como structured output (molde `intake-agent`), un humano lo confirma, y un **fan-out DETERMINISTA** (`Promise.all` en TS, sin framework de agentes) ejecuta los chapter-authors registrados capítulo por capítulo, con retry acotado por capítulo y **degradación honesta** (un capítulo que agota reintentos queda como FALTA marcada en el borrador, nunca como slide plausible autogenerada). El output agregado es el plan canónico de láminas listo para el verifier (TASK-1420) y el composer.

## Why This Task Exists

Con el nodo chapter-author probado (TASK-1415) y el fan-out de authors productivos en curso (1417/1418), falta quien decida **qué capítulos lleva este deck y en qué orden** — hoy esa decisión vive en el `deck-plan.json` del workspace (sesión ad-hoc). El ADR §5-ter (Accepted) ya fijó la forma exacta: outline agéntico → fan-out por CAPÍTULO (~6-8, nunca por slide) → cero LLM en selector/render. Esta task materializa el segundo de los 3 nodos, dejando el pipeline de autoría completo salvo verificación.

## Goal

- **Registry de chapter-authors**: mapa declarativo `chapterId → { author, buildSource }` (los authors se registran; el orquestador no conoce sus fuentes). Registrar los existentes (diagnóstico, credenciales) y los que estén shipped (económica, squad).
- **Nodo orquestador** (molde intake-agent): contexto allowlisted (proposal + requisitos + authors disponibles + evidencia permitida) → outline tipado validado fail-closed (capítulos ⊆ registry; contentTypes ⊆ taxonomía) → confirm humano.
- **Fan-out determinista**: `Promise.all` sobre los capítulos confirmados → propose de cada author (retry N=2 por capítulo, ya en el motor) → agregado `{ slides, faltas[] }` con degradación honesta.
- **Eval baseline** del outline (golden = el outline real del deck SKY: qué capítulos, en qué orden) + prueba integrada del fan-out con los authors reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` **§5-ter (Accepted)** — la topología es LEY acá: fan-out por capítulo, profundidad=1 dura, selector sin LLM, ~10 llamadas por deck, retry bounded, degradación honesta. + §5-bis (structured output, NO frameworks de agentes, eval obligatorio).
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md` §Chapter-author engine (el orquestador es CONSUMER del motor: no toca la interface).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el orquestador nace command-shaped (propose/confirm) para que Nexa/MCP lo operen (superficie = extensión de TASK-1416, follow-up).

Reglas obligatorias:

- **NUNCA** un framework de agentes (LangGraph/Agents SDK) ni recursión de subagentes (profundidad=1 dura) — el fan-out es `Promise.all` en TS (§5-ter, alternativas rechazadas).
- **NUNCA** el orquestador elige plantillas ni produce slots: propone capítulos/briefs; los authors producen slots; el selector del catálogo resuelve plantillas.
- **NUNCA** un capítulo fallido se rellena: queda como falta marcada (`faltas[]`), visible para el humano.
- El outline se confirma por un humano ANTES del fan-out (el fan-out gasta LLM de N authors — no corre sobre un outline no confirmado).

## Normative Docs

- `src/lib/commercial/tenders/proposals/intake-agent.ts` + `authoring/chapter-author.ts` — los moldes (contexto allowlisted + propose/confirm; el motor de authors).
- `src/lib/artifact-composer/catalogs/deck-axis/registry.json` → `contentTypeTaxonomy` — el vocabulario cerrado de contentTypes del outline.
- `docs/commercial/tenders/sky-blog-2026/deck-plan.json` — el outline real de SKY (28 láminas) como golden.

## Dependencies & Impact

### Depends on

- TASK-1415 (shipped): el motor + los 2 primeros authors.
- TASK-1417/1418 (recomendados primero, no bloqueantes): más capítulos productivos hacen el fan-out representativo.
- `buildProposalRenderProjection` / requisitos del aggregate como contexto allowlisted `[verificar shape exacto en Discovery]`.

### Blocks / Impacts

- Bloquea conceptualmente a TASK-1420 (el verifier consume el agregado del fan-out).
- Extiende la superficie de TASK-1416 (acción Nexa del orquestador = follow-up declarado).

### Files owned

- `src/lib/commercial/tenders/proposals/authoring/author-registry.ts` (nuevo)
- `src/lib/commercial/tenders/proposals/authoring/orchestrator.ts` (nuevo — nodo + fan-out)
- `src/lib/commercial/tenders/proposals/authoring/__tests__/orchestrator-*.test.ts` + fixture golden (nuevos)
- `scripts/commercial/_sanity-deck-orchestrator.ts` (nuevo)

## Current Repo State

### Already exists

- El motor con propose/confirm + retry por capítulo (el retry del orquestador ES el del motor — no duplicar). 2 authors reales + los que 1417/1418 sumen. La taxonomía cerrada de contentTypes en el registry del catálogo. El patrón contexto-allowlisted (intake/render agents).

### Gap

- No existe registry de authors, nodo orquestador ni runner de fan-out. No existe representación de "falta marcada" en un plan parcial (diseñarla acá: `{ slides, faltas: [{chapterId, motivo}] }`).

## Modular Placement Contract

- Topology impact: `domain-package`
- Current home: `src/lib/commercial/tenders/proposals/authoring/`
- Future candidate home: `domain-package`
- Boundary: el orquestador consume la interface `ChapterAuthor` vía el registry (nunca los internals de un author); los `buildSource` de cada author encapsulan sus ports cross-dominio (Grader/pricing/roster).
- Server/browser split: **server-only** (outline, fan-out y LLM corren server-side; el browser sólo verá tarjetas vía la futura superficie Nexa).
- Build impact: `none`.
- Extraction blocker: los mismos ports por-author ya declarados (Grader, pricing, roster) — el orquestador no agrega nuevos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: contexto del aggregate `Proposal` (input read-only); el plan agregado `{slides, faltas}` (output efímero hasta el registro de TASK-1416).
- Consumidores afectados: verifier (TASK-1420), Nexa/MCP (follow-up), composer.
- Runtime target: `local` + `staging` (flag OFF en prod).

### Contract surface

- Contrato existente a respetar: interface `ChapterAuthor` + `proposeChapter`/`confirmChapter` (sin cambios); molde propose/confirm del dominio.
- Contrato nuevo: `AUTHOR_REGISTRY` declarativo · `proposeDeckOutline(context) → DeckOutlineProposal` · `confirmDeckOutline(...)` · `runChapterFanout(outline, actor) → { slides, faltas }`.
- Backward compatibility: aditivo; cada author sigue operable en aislamiento.
- Full API parity: command-shaped desde el día 1; la superficie conversacional es follow-up explícito.

### Data model and invariants

- Entidades: ninguna tabla nueva (el plan agregado es output; persistencia via el registro de capítulos de TASK-1416).
- Invariantes: capítulos del outline ⊆ registry; contentTypes ⊆ taxonomía del catálogo; profundidad=1; un capítulo fallido NUNCA se rellena; el fan-out sólo corre sobre outline confirmado por member.
- Tenant/space boundary: el contexto se arma por el caller con scope de sesión (entitlement per-ORG del Studio).
- Idempotency/concurrency: outline idempotente por hash de contexto (molde); el fan-out es read-only+LLM (re-correr es seguro; los confirm de capítulos conservan su idempotencia propia).
- Audit/outbox/history: N/A en esta task (persistencia/audit del resultado = registro canónico de TASK-1416).

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: `TENDER_CHAPTER_AUTHOR_ENABLED` OFF gatea todo el pipeline (el orquestador llama proposes del motor).
- Backfill plan: N/A.
- Rollback path: revert PR.
- External coordination: ninguna.

### Security and access

- Auth/access gate: la puerta única del Studio + capability `manage`; el fan-out corre server-side con el actor humano que confirmó el outline.
- Sensitive data posture: el contexto del outline es allowlisted (nunca RFP crudo completo ni costos internos); cada author mantiene su propia postura (p. ej. anti-leak de margen del económico).
- Error contract: `captureWithDomain`; fallos por capítulo van a `faltas[]` con motivo, no a excepción global (salvo 0 capítulos exitosos).
- Abuse/rate-limit: costo acotado por diseño (~1 outline + N capítulos ≈ ≤10 llamadas/deck, §5-ter).

### Runtime evidence

- Local checks: suite authoring verde (motor + authors intactos) + tests del orquestador (outline eval + fan-out con authors stub/reales).
- DB/runtime checks: contexto armado desde una `Proposal` real vía proxy PG.
- Integration checks: corrida real — proposal SKY-like → outline propuesto → confirm → fan-out sobre los authors shipped → plan agregado → `composeArtifact` renderiza los capítulos exitosos; `faltas[]` visible si alguno degrada.
- Reliability signals/logs: sin signal nuevo (flag OFF); evaluar en Discovery si `faltas>0` merece log estructurado.
- Production verification sequence: N/A (flag OFF).

### Acceptance criteria additions

- [ ] El agregado `{slides, faltas}` es honesto: capítulo fallido = falta con motivo, nunca contenido de relleno.
- [ ] Cotas de §5-ter respetadas: 1 llamada de outline + 1 propose por capítulo (+retries del motor), profundidad 1.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — El author registry declarativo

- `AUTHOR_REGISTRY: Record<chapterId, { author, buildSource }>` con los authors shipped; test de que cada entry cumple la interface (el registry es dato, el orquestador no conoce internals).

### Slice 2 — El nodo orquestador (outline propose/confirm)

- Contexto allowlisted → `proposeDeckOutline` (structured output, molde intake-agent) → validador fail-closed (capítulos ⊆ registry, contentTypes ⊆ taxonomía, orden declarado) → `confirmDeckOutline` (member-only, idempotente por hash).

### Slice 3 — Eval baseline del outline

- Golden = el outline del deck SKY real (capítulos + orden extraídos del deck-plan). Adversariales: capítulo fuera de registry, contentType fuera de taxonomía, outline vacío. El prompt shipea sólo con eval verde.

### Slice 4 — El fan-out determinista + degradación honesta

- `runChapterFanout`: `Promise.all` sobre capítulos confirmados → propose de cada author; agregado `{slides, faltas}`; test con un author stub que falla siempre (la falta queda marcada, el resto compone).

### Slice 5 — Corrida real integrada

- Sanity script contra una proposal real: outline → confirm → fan-out (authors reales) → render de los capítulos exitosos; frames revisados; evidencia en Handoff.

## Out of Scope

- El verifier (TASK-1420). La acción Nexa del orquestador (follow-up sobre TASK-1416). Authors nuevos. Persistencia del plan agregado (registro de TASK-1416). Cualquier `agent-runtime`/tool-loop (§5-ter lo rechaza; si un día hace falta, es extracción del loop de Nexa con task propia).

## Detailed Spec

La forma exacta ya está decidida en el ADR (§5-ter, diagrama del pipeline): esta task lo implementa sin re-litigarlo. Lo único nuevo de diseño es el shape del agregado parcial (`faltas[]` con motivo) y el registry declarativo — ambos deben quedar en el Delta del arch doc al cerrar.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 → 4 → 5. El eval (Slice 3) DEBE existir antes de que el prompt del outline shipee (§5-bis). El fan-out (4) sólo después del confirm humano implementado (2) — nunca fan-out sobre outline no confirmado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El outline propone capítulos/contentTypes inexistentes | N/A (flag OFF) | medium | validador fail-closed contra registry + taxonomía | eval rojo |
| Fan-out gasta LLM sobre outline no confirmado | costo | low | confirm member-only como precondición dura del runner | test |
| Deck silenciosamente incompleto | commercial | medium | `faltas[]` con motivo + el verifier (1420) + humano | test de degradación |
| Explosión de costo (fan-out por slide) | costo | low | fan-out por CAPÍTULO (§5-ter) + cota de llamadas testeada | test de cotas |

### Feature flags / cutover

- Reusa `TENDER_CHAPTER_AUTHOR_ENABLED` (OFF) — el orquestador es consumer del motor. Sin flag nuevo salvo que Discovery justifique granularidad.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-5 | revert PR (aditivo puro, flag OFF) | <5 min | sí |

### Production verification sequence

1. CI: evals (outline + authors) + suite authoring verdes.
2. Local: corrida real integrada (Slice 5) con frames revisados.
3. Prod: flag OFF (decisión EPIC-029).

### Out-of-band coordination required

- N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `AUTHOR_REGISTRY` declarativo con los authors shipped; el orquestador no importa internals de ningún author (sólo la interface).
- [ ] `proposeDeckOutline`/`confirmDeckOutline` siguen el molde (contexto allowlisted, validador puro fail-closed, confirm member-only, hash idempotente).
- [ ] Eval del outline verde contra el golden SKY + adversariales.
- [ ] `runChapterFanout` es `Promise.all` (sin framework, profundidad 1) y degrada honesto (`faltas[]` con motivo; test con author que falla).
- [ ] Cota de llamadas respetada (test): 1 outline + N proposes (+ retries del motor).
- [ ] Corrida real integrada con render de capítulos exitosos y frames revisados.
- [ ] Motor y authors existentes sin modificar (diff vacío en sus archivos).

## Verification

- `pnpm lint` · `pnpm typecheck` · `pnpm test` (full) · `pnpm build`
- `pnpm vitest run src/lib/commercial/tenders/proposals/authoring`
- Corrida real documentada + `pnpm docs:closure-check`

## Closing Protocol

- [ ] Lifecycle + carpeta + README/registry sincronizados.
- [ ] `Handoff.md` + `changelog.md`.
- [ ] Delta en el arch doc (§5-ter: nodo orquestador materializado; shape de `faltas[]` y registry canonizados) + companion (ambos espejos).
- [ ] Impacto cruzado: EPIC-029, TASK-1420 (el verifier ya tiene input), TASK-1416 (acción Nexa del orquestador como follow-up).

## Follow-ups

- Acción gobernada Nexa del orquestador ("ármame el deck de X") — extensión de TASK-1416.
- Registro/persistencia del plan agregado completo en el aggregate (si TASK-1416 sólo registró capítulos sueltos).

## Open Questions

- **¿El outline golden de SKY (28 láminas) es el target del eval, o un subset de capítulos con authors shipped?** Recomendación: el eval valida ESTRUCTURA (capítulos ⊆ registry, orden coherente) sobre el subset autorable; el outline completo de 28 se vuelve golden a medida que existan authors.
