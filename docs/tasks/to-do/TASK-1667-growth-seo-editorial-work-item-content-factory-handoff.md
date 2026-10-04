# TASK-1667 — Marketing Studio: flujo editorial SEO y handoff gobernado a CMS

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno` — ownership reconciliado 2026-10-04; sin implementación ni cierre runtime.
- Rank: `TBD`
- Domain: `growth|seo|content|data`
- Blocked by: `TASK-1908`, `TASK-1913` (foundation de referencias SEO y work items Studio)
- Branch: `Greenhouse develop; Studio main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El ciclo editorial vive en Marketing Studio: brief SEO, trabajo, borrador, QA, aprobación y evidencia
observada de publicación. Esta task especializa los work items de TASK-1913 y la conexión SV360 de
TASK-1908; añade el handoff gobernado al CMS/Content Factory existente. Greenhouse conserva datos,
prioridad, acceso y medición; no se crea otro lifecycle editorial dentro de `growth.seo`.

## Why This Task Exists

La spec anterior diseñaba tablas y commands editoriales en Greenhouse antes de existir Studio.
El operador ratificó el 2026-10-04 que el flujo se construirá en Marketing Studio. El cambio conserva
el trabajo técnico pendiente: referencias reproducibles, brief completo, idempotencia, draft privado,
QA y publicación verificada. Las primitivas actuales de brief/copy/calendario de Studio no completan
este circuito. El diseño previo está preservado byte-for-byte en el historial, sin vigencia ejecutable.

## Goal

- Una decisión SEO confirmada origina un trabajo editorial de Studio con evidencia fechada y brief.
- El handoff produce sólo un draft/private por intención idempotente; nunca publica como efecto secundario.
- QA, aprobación humana y publicación observada quedan registradas por la autoridad de Studio.
- Greenhouse recibe referencias y evidencia de publicación para TASK-1668; Studio lee los outcomes.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` §14.
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_HYBRID_AGENTS_DECISION_V1.md`.
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.3 y §18.
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` y Full API Parity.

Reglas: un work item genérico de TASK-1913, una autoridad de prioridad de TASK-1700, un dispatcher de
TASK-1915. Ningún adapter puede sustituir el command del dueño ni ampliar la autoridad de la persona.
Toda documentación de Studio permanece en Greenhouse; el código y lifecycle editorial viven en Studio.

## Normative Docs

- `docs/tasks/to-do/TASK-1908-marketing-studio-seo-aeo-plan-search-visibility-360.md`.
- `docs/tasks/to-do/TASK-1913-marketing-studio-work-items-assignments.md`.
- `docs/tasks/to-do/TASK-1668-growth-seo-editorial-qa-outcome-iteration-loop.md`.
- `src/lib/public-site/content-factory/contracts.ts`, `gutenberg-validator.ts`, `post-deep-inspection.ts`.
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`.
- `docs/audits/seo/editorial-history/2026-10-04/README.md` — historia, no spec activa.

## Dependencies & Impact

### Depends on

- TASK-1908: conexión autorizada SV360, referencias y snapshots fechados; no series paralelas.
- TASK-1913: entidad de trabajo, entregables, eventos, asignaciones y aceptación humana.
- TASK-1894/TASK-1899: commands, idempotencia, revisión y autoridad delegada/API/MCP.
- TASK-1700: cola priorizada canónica; dependencia de contrato ya entregada, no blocker nuevo.
- TASK-1659/TASK-1660: intención declarada y contexto de membresía; si el reader no expone un campo,
  exigir decisión explícita equivalente y señalar su ausencia, sin inferir `opportunity` de NULL.
- TASK-1702: recomendación anclada a URL cuando exista; refresh/fix sin URL dueña queda bloqueado.
- TASK-1664/TASK-1666/TASK-1311: procedencia discovery, grounded queries y citas, opcionales por fuente;
  un brief base no espera una captura AEO inexistente.
- TASK-1909: procedencia de borradores IA cuando se use IA; sin IA el handoff no requiere un proveedor.

### Blocks / Impacts

- TASK-1668 consume publicación observada por referencia para medir; no administra el trabajo.
- TASK-1669 recomienda próximos pasos; TASK-1912 pinta el flujo y TASK-1911 recibe aprendizajes/calendario.
- Greenhouse discovery puede abrir/referenciar el trabajo de Studio, sin tener formulario/lifecycle paralelo.

### Files owned

- Repo Studio: `packages/contracts/src/operations.ts` y contratos editoriales especializados;
  `packages/domain/src/work-items/**` (foundation TASK-1913), adapter CMS en el dominio y rutas `/api/v1`.
  Nombres nuevos exactos se fijan al tomar Slice 1, junto al inventario real del repo.
- Greenhouse: adapter autorizado de evidence/brief hacia el dueño existente de Content Factory si se
  necesita un lane; contract/readers SEO existentes. No tablas `seo_editorial_work_items` ni endpoints
  `/growth/seo/editorial` para gobernar producción.
- Docs técnicas, funcionales y manual Studio en `greenhouse-eo`; manifiesto gateway regenerado desde Studio.

## Current Repo State

### Already exists

- TASK-1700 y sus readers/decisiones de cola; discovery y grounded query bridge.
- Studio registra brief, copy, aprobación y calendario mediante commands de catálogo.
- Content Factory tiene `ContentFactoryBrief.v1`, validadores y runbook de draft/private.

### Gap

- Work items especializados, brief SEO, adapter CMS, QA/approval packet y publicación observada no
  están implementados por esta task. TASK-1908 y TASK-1913 siguen en to-do.
- No se verificó runtime nuevo ni publicación en esta reconciliación documental.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` contracts/domain/API; adapter dueño de Content Factory en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: Studio owns editorial work/brief/QA; SV360 supplies evidence/priority; CMS owns external draft/publication.
- Server/browser split: adapters, authority, providers and secrets server-side; UI only consumes DTOs/commands.
- Build impact: `none` — reuse owner adapter, no CMS SDK in browser or SEO.
- Extraction blocker: actor delegation and explicit versioned evidence envelopes across owners.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: Studio work item/inputs/deliverables/events (TASK-1913), editorial brief/evidence extension.
- Consumidores afectados: Studio API/UI/MCP, agent dispatcher, Greenhouse outcome readers.
- Runtime target: Studio staging/production; Content Factory owner staging; Greenhouse serving lanes.

### Contract surface

- Contrato existente a respetar: Studio command kernel, work items, operations registry; authorized SV360 lanes;
  `ContentFactoryBrief.v1` and owner validation/readback.
- Contrato nuevo o modificado: Studio editorial specialization and CMS handoff/QA/publication evidence envelope.
- Backward compatibility: `gated` — additive Studio types, no reinterpretation of historical SEO state.
- Full API parity: domain command/reader → API `/api/v1` → operations registry → MCP; UI and agents same primitive.

### Data model and invariants

- Reuse `studio.work_item*` and append-only events; no second editorial work table or provider memory as authority.
- Preserve durable subject `(seoTargetId, origin, normalizedKeyword)` plus decision `snapshotId/itemId`;
  evidence hash includes `inputSnapshotHash`, `priorityScoreVersion`, `computedAt` and source as-of.
- Preserve `alsoSurfacedBy`, membership intent version/author, candidateIds/provenance and separate estimated search intent.
- Envelope carries `fanOutSubQuestions`, `serpFormat`, `categoryAnswerPages`, `targetUrl`, `requiredEntities`,
  each with source/as-of/signal `measured|estimated|declared|derived`; missing fields are null/[] with reason.
- `create|refresh|fix|consolidate` are explicit, with matching decision/work kind and distinct consolidation outcome;
  never silently turn consolidation into fix or a grounded question into an exact keyword.
- Tenant/space boundary: delegated person and organization intersected server-side; resolve ownership for every ref;
  cross-tenant refs fail anti-oracle. Competitive snapshots retain internal classification.
- Idempotency/concurrency: Studio kernel key/revision + unique external handoff fingerprint; timeout/replay must not
  create another draft. Read back ambiguous state before retry; never auto-retry a possibly published mutation.
- Audit/outbox/history: reuse Studio audit/work events and durable handoff intent, redacted metadata; no raw draft payload.
- Write-target allowlist: extend the domain boundary allowlist if present in the implementation PR.

### Migration, backfill and rollout

- Migration posture: `additive` extension of Studio work types/inputs/events, not Greenhouse editorial tables.
- Default state: `disabled` until staged tenant/idempotency/unsafe-state tests and owner adapter smoke.
- Backfill plan: none; imported work requires explicit source refs and verified external state, never fabricated history.
- Rollback path: disable specialization/adapter and preserve work/evidence/drafts; inspect external ambiguities manually.
- External coordination: CMS owner validates draft/private lane and containment; no new secret/provider assumed.

### Security and access

- Auth/access gate: Studio fine-grained capability + grant/test, API caller plus RFC 8693 delegated person;
  reads use authorized SV360 bindings. T1 drafting; T2 approval/publication; `requiresPerson` enforced.
- Sensitive data posture: redacted DTOs; no secrets, raw provider bodies, HTML, prompts or signed URLs in consumers/logs.
- Error contract: canonical validation/ownership/unsafe-state/partial codes, never raw provider errors.
- Abuse/rate-limit posture: bounded retry, org limits, external circuit and replay guard on the command.

### Runtime evidence

- Local checks: contract, ownership, state transitions, idempotency, CMS unsafe state and parity tests.
- DB/runtime checks: additive migration verify and Studio audit/work rows for one scoped work item.
- Integration checks: staged create/refresh, retry, timeout, ambiguous/publish rejection and independent readback.
- Reliability signals/logs: created/handoff/replay/failure/latency/stuck/unsafe-state metadata, without sensitive content.
- Production verification sequence: disabled deploy → gated tenant smoke → readbacks → operator-approved promotion.

## ADR Gate

ADR de estrategia Studio §14: precisión aceptada 2026-10-04 por el operador. La decisión cambia el
ownership documental, no afirma que exista implementación. No hace falta otro ADR para repetir la
frontera; cualquier mecanismo de publish automático o nueva credencial exige decisión separada.

<!-- ZONE 2 — PLANNING -->

## Scope

1. Bind a specialized editorial work type to the existing Studio work item and SV360 refs.
2. Validate complete SEO brief and human-confirmed intent; map to `ContentFactoryBrief.v1` without lowering owner guards.
3. Add the CMS owner adapter for draft/private with durable idempotent handoff and independent readback.
4. Record QA, human approval and observed publication; expose evidence to TASK-1668 and UI/task consumers.

## Out of Scope

- A new Greenhouse editorial lifecycle, tables, Nexa runtime or agent dispatcher.
- Automatic publish, direct WordPress/Think fetches from SEO, automatic keyword tracking or grounded query creation.
- SEO methodology/priority recomputation, business attribution and document rendering/delivery (Insights).

<!-- ZONE 3 — IMPLEMENTATION -->

## Detailed Spec

Brief includes audience/offer/locale/tone/CTA/author/URLs plus the five inputs and dated refs. A refresh/fix
requires owner URL/post and inspection; missing fields block executable handoff, not qualitative planning.
The only CMS bridge maps a validated envelope to the owner contract, accepts `draft/private` and checks the
external ref/fingerprint/status. A `publish` result or ambiguous timeout is an unsafe/unknown state, not success.

Studio distinguishes `qa_blocked`, `publish_unknown`, `published_unverified`, `published_verified` as editorial
specialization states/evidence attached to TASK-1913; do not redefine its generic work state machine. QA covers
validator/deep inspection, canonical/robots/schema/author/CTA/links/media/mobile with info/warning/block findings.
A block cannot reach approval. Human approval stores actor/version/evidence digest. In V1 publication is performed
by the authorized CMS operator; this capability records the receipt, it does not execute external publish.
The receipt requires human actor, external ref, fingerprint and status. Independent live readback+QA are required
for `published_verified`; HTTP 200 does not mean indexed. Indexation is the separate TASK-1426/1668 signal.

Iteration opens a linked Studio work item through TASK-1913 with parent, reason and outcome refs; no automatic
content edits, captures or provider spending. `recordSeoWorkQueueDecision` remains the sole feedback ledger;
`accepted` does not execute. Completion records the appropriate authorized `done` decision using the durable
origin/keyword subject so the work does not reappear; it does not mark every origin retired implicitly.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Foundation 1908/1913 → specialized brief+commands → CMS adapter → QA/observed receipt → staged end-to-end.
UI consumption belongs to TASK-1912. Agent execution, if used, belongs to TASK-1915.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Another tenant's ref | auth/data | medium | server resolution and anti-oracle negatives | authorization_denied |
| Retry creates extra draft | CMS | high | unique handoff fingerprint and readback before retry | replay/unknown |
| Draft unexpectedly public | CMS | high | draft/private validation, blocked state, containment runbook | unsafe_external_state |
| QA or approval bypassed | Studio | high | domain transition gates and requiresPerson | transition_rejected |
| Duplicate lifecycle | domain | medium | reuse TASK-1913; no SEO editorial tables | boundary tests |

### Feature flags / cutover

Future Studio specialization/adapter gate defaults OFF and is recorded in the ledger when implemented;
no `GROWTH_SEO_EDITORIAL_HANDOFF_ENABLED` is introduced for a Greenhouse workflow. No flag/env was changed now.
One allowlisted organization after staged evidence; no global publish enabled by this task.

### Rollback plan per slice

Disable commands/adapter and preserve additive Studio data. Ambiguous/public external state requires CMS owner
containment (private/noindex/cache/readback as applicable), verified in staging before any promotion.

### Production verification sequence

1. Local tests and staged migrations/negative authority checks.
2. Disabled deploy verifies reads remain available and commands do not call CMS.
3. One create/refresh on a test organization, retry same key, verify a single private draft and audit chain.
4. Exercise timeout/publish response, blocking QA, human receipt and independent readback/containment.
5. Compare API/UI/MCP DTOs and outcome reference; only then promote with operator authorization.

### Out-of-band coordination required

CMS/Content Factory owner confirms supported lane and containment; auth owner confirms scoped grants.
No secret write, deploy or publishing is authorized by this documentation update.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Specialized Studio work type reuses TASK-1913 lifecycle/events; no Greenhouse editorial work table.
- [ ] Durable subject, queue snapshot/item/version/hash and `alsoSurfacedBy` survive into the brief.
- [ ] Declared membership intent and estimated search intent remain separate; NULL is unclassified, not opportunity.
- [ ] create/refresh/fix/consolidate decision and work kinds are coherent; consolidation has its own success criterion.
- [ ] The five editorial inputs have source/as-of; absent is null/[]+reason, never placeholder text.
- [ ] Complete `ContentFactoryBrief.v1` validated before adapter; refresh/fix without owner URL/post/inspection blocks.
- [ ] Source refs retain signal kind, classification and as-of; no competitive client exposure or SQL cross-owner joins.
- [ ] All refs are tenant-bound with anti-oracle negative tests; capability+grant covered in the same PR.
- [ ] Only the owner CMS adapter performs draft/private handoff; unsafe or ambiguous states block and signal.
- [ ] Same idempotency key creates no extra work item/event effect/draft; revisions and external retries are bounded.
- [ ] No implicit trackKeywords, grounded query creation, prompt activation or publish.
- [ ] QA covers validator/readback/canonical/robots/schema/author/CTA/links/media/mobile; block prevents approval.
- [ ] Human approval and publish receipt include version/digest/actor/external ref/fingerprint/status, without external publish write.
- [ ] States distinguish qa_blocked/publish_unknown/published_unverified/published_verified; verified requires independent readback.
- [ ] Incorrect/ambiguous external publication containment is documented and tested in staging by the CMS owner.
- [ ] TASK-1668 receives authorized immutable publication evidence; opening an iteration reuses Studio work item commands.
- [ ] Queue completion writes the authorized `done` decision for the appropriate durable origin/keyword; no second feedback ledger.
- [ ] App/UI/API/MCP/Nexa consume the same primitives through authorized lanes; no Nexa-specific logic.
- [ ] Browser/logs receive no secrets/raw provider bodies/prompts/full HTML/signed URLs; observability covers retries and stuck handoffs.
- [ ] Studio gate is OFF before smoke with explicit cutover/rollback; staged create/refresh/retry/adapter-failure cases pass.
- [ ] Technical docs, functional docs and operator manual cover Studio → CMS → verified publication → SV360 outcome.

## Verification

- `pnpm task:lint --task TASK-1667` and `git diff --check` for documentary consistency.
- At implementation: focal contract/transition/tenant/idempotency/adapter/parity tests and staged migration/readbacks.
- `pnpm docs:closure-check` and final `pnpm docs:context-check:strict`; runtime closure requires staged/live evidence.

## Closing Protocol

Keep lifecycle to-do until implementation and acceptance evidence exist. Record evidence beside each verified
criterion; update EPIC-049/task indexes, skills, technical/functional/manual docs and runtime handoff at actual closure.
Reconciliation alone checks no implementation criterion and authorizes no deploy or CMS publication.

## Follow-ups

TASK-1668 measurement, TASK-1669 advisory plan, TASK-1912 UI and TASK-1911 learnings are separate consumers.

## Open Questions

Exact CMS adapter and lane capabilities are implementation discovery with the owner. Content Factory is reused
where its contract fits; another CMS gets an explicitly governed adapter, never an inferred direct publish path.
