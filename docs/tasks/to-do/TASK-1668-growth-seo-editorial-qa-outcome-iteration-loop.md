# TASK-1668 — Growth SEO: outcome e indexación de trabajo editorial de Marketing Studio

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
- Epic: `EPIC-022`
- Status real: `Diseno` — medición reconciliada 2026-10-04; QA/producción/publicación pertenecen a Studio.
- Rank: `TBD`
- Domain: `growth|seo|data`
- Blocked by: `TASK-1667` (receipt/version de publicación de Studio para el ciclo end-to-end)
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse mide el resultado SEO/AEO de una intervención editorial gobernada en Marketing Studio.
Recibe su evidencia de publicación por referencias opacas, observa indexación y produce outcomes por
ventana con baseline, cobertura, metodología y as-of. No administra drafts, QA editorial, aprobación,
publicación ni iteraciones de trabajo; ese ciclo vive en Studio (TASK-1667/TASK-1913).

## Why This Task Exists

La medición sigue teniendo dueño aunque la ejecución se traslade a Studio. Sin baseline y ventanas
consolidadas el equipo puede atribuir a una pieza una variación que sólo proviene de datos incompletos,
fórmulas incompatibles o muestreo AEO. Separar evidencia de ejecución de observación medible conserva
el aprendizaje sin duplicar la máquina editorial. La spec anterior está preservada en el historial.

## Goal

- Relacionar una publicación/version Studio con sujeto SEO y evidencias autorizadas sin SQL entre dueños.
- Exponer outcomes reproducibles de GSC/rank/AEO y, cuando exista conexión, señales GA4/HubSpot separadas.
- Distinguir publicado, indexado, observado y atribuido; recomendar una iteración que Studio decide/ejecuta.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §1.3, §7, §17, §18.
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` §14.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`.

SV360 posee medición; Studio posee el lifecycle editorial y sus evidencias; GSC/rank/AEO/GA4/HubSpot
conservan metodología y source of truth. Un reader no inventa QA, indexación, conversiones ni causalidad.

## Normative Docs

- `docs/tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md`.
- `docs/tasks/to-do/TASK-1908-marketing-studio-seo-aeo-plan-search-visibility-360.md`.
- `docs/tasks/to-do/TASK-1911-marketing-studio-experiments-learnings-unified-calendar.md`.
- `docs/tasks/to-do/TASK-1426-search-console-multi-property-discovery.md`.
- `docs/tasks/to-do/TASK-1311-growth-seo-aeo-citation-attribution-url-grounded-queries.md`.
- `src/lib/growth/seo/keyword-opportunities-reader.ts`, `rank-evolution-reader.ts`, `work-queue/reader.ts`.
- `docs/audits/seo/editorial-history/2026-10-04/README.md` — versiones superseded, no contratos activos.

## Dependencies & Impact

### Depends on

- TASK-1667/TASK-1913: publicación observada y work item Studio; el receipt es una evidencia, no un write de publish.
- TASK-1302/TASK-1303: GSC materializado/rank con cobertura y freshness; foundation de medición.
- TASK-1426: inspección de URL/indexación cuando esté disponible; su ausencia se declara, no bloquea toda observación.
- TASK-1311: trayectoria AEO por prompt/motor, opcional por eje; sin ella citabilidad queda unavailable.
- TASK-1284: conexión GA4 multiorganización para el eje de conversión; sin cobertura autorizada el loop de negocio
  queda explícitamente parcial (GSC/rank/AEO), no permanentemente vacío sin explicación.
- TASK-1700: cola y feedback canónicos, dependencia de contrato ya entregada.

### Blocks / Impacts

- TASK-1908 consume outcomes actuales con su snapshot histórico distinguido.
- TASK-1669 interpreta outcomes sin cambiar mediciones/atribución.
- TASK-1911 registra aprendizajes con referencias; TASK-1667/TASK-1913 abren iteraciones, no esta task.
- Efeonce Insights consume evidencia curada; no se crea un renderer o informe en el dominio SEO.

### Files owned

- Greenhouse: contratos/evaluator/readers de outcome en `src/lib/growth/seo/` y serving lanes app/ecosystem/MCP;
  migración aditiva de hechos/outcomes en `greenhouse_growth` sólo si se necesita materialización durable.
- Studio: reader adapter de outcomes pertenece a TASK-1908; ningún command editorial, QA o CMS se posee aquí.
- Runtime worker bounded sólo si el diseño demuestra necesidad; no introducir un cron para cada lectura.
- Docs de medición técnica/funcional/manual en Greenhouse; exact paths se cierran durante Discovery.

## Current Repo State

### Already exists

GSC y rank tienen readers/materialización; la cola y sus decisiones tienen una autoridad canónica.
Studio cuenta con primitives de catálogo, pero su flujo editorial especializado y el outcome completo siguen pendientes.

### Gap

No hay evidencia de implementación de esta task. No se verificó una publicación, outcome o conexión nueva
el 2026-10-04. La reconciliación cambia alcance documental, no runtime ni lifecycle.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse `src/lib/growth/seo/` measurement primitives; Studio reads through authorized lanes.
- Future candidate home: `remain-shared`
- Boundary: publication evidence reference in; canonical SEO/AEO outcome out; no editorial commands in Greenhouse.
- Server/browser split: evaluator/readers server-side; redacted DTOs to consumers, no provider fetch from render.
- Build impact: `none`
- Extraction blocker: authorized scoped refs and canonical source methodology, never cross-owner SQL joins.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: canonical SEO outcome observations; Studio publication evidence remains external reference.
- Consumidores afectados: Studio plans/work items/learnings, API/MCP, Insights.
- Runtime target: Greenhouse staging/production; worker only if justified by bounded materialization.

### Contract surface

- Contrato existente a respetar: authorized GSC/rank/AEO/GA4/HubSpot readers and immutable source methodology.
- Contrato nuevo o modificado: versioned measurement input/evaluator/outcome reader, with opaque Studio publication refs.
- Backward compatibility: `gated` — additive outcome model, no reinterpretation of historical measurement.
- Full API parity: one domain primitive, app/ecosystem/MCP lanes; Studio consumers do not recompute outcomes.

### Data model and invariants

- Input: organization/target/URL, durable subject, Studio work/version/publication ref/fingerprint/as-of,
  baseline/window and authorized source refs. Resolve scope server-side, no client tenant expansion.
- Outcomes/evidence append-only; revisions retain inputs and previous as-of. Idempotence derives from
  scope+work/version+window+methodology+source as-of/hash; refreshed source adds/converges a valid observation.
- GSC window closes D-3. Touching D-1/D-2 yields `pending_data_consolidation`, distinct from `insufficient_data`.
  An ok response with zero rows is not a measured zero; coverage determines whether data is absent or valid zero.
- Aggregated position is impression-weighted; no `AVG(position)` fallback. Without impressions, position is null.
- AEO is trajectory `(prompt,motor)` from TASK-1311; aggregate grader score is context, never sufficient outcome evidence.
- Preserve GSC/rank measured, Labs estimated, AEO sampled and GA4/HubSpot observed signals separately; one causal
  score combining them is forbidden without a separate explicit methodology contract.
- ETV method identity persists; unlike methodologies cannot be compared as if identical.
- HTTP 200/live page ≠ indexed. TASK-1426 or equivalent authorized evidence, otherwise `indexation_evidence_unavailable`.
- Causal attribution `not_claimed|operator_assessed|evidence_supported` requires actor, rationale and supporting evidence;
  trend correlation never auto-promotes confidence. NULL/absent/stale ≠ zero or failure.
- Tenant/space boundary: check every publication/source ref against scoped org; anti-oracle cross-tenant rejection.
- Idempotency/concurrency: bounded evaluate/replay, unique logical observation identity, no duplicate scheduling.
- Audit/outbox/history: append-only measurement events, source health and sanitized failure; no duplicate work ledger.
- Write-target allowlist: add outcome destinations if the domain has boundary checks in the implementation PR.

### Migration, backfill and rollout

- Migration posture: `additive` only if outcome materialization is selected; no editorial lifecycle migration.
- Default state: `shadow`/disabled evaluator until scoped baseline/coverage fixtures and staging readbacks pass.
- Backfill plan: none automatically; bounded explicit replay by scoped publication/window, read-only sources.
- Rollback path: disable evaluator and preserve facts/outcomes; no CMS rollback performed by this task.
- External coordination: Studio owner confirms immutable publication evidence and SV360 adapter consumption.

### Security and access

- Auth/access gate: fine-grained SEO capability and tenant authorization for measurement; Studio delegated caller
  consumes scoped lanes; capability/grant/test in the same PR for any new operation.
- Sensitive data posture: redacted outcomes; no raw provider bodies/prompts/full HTML/signed links in public DTO/logs.
- Error contract: canonical unavailable/coverage/methodology/scope errors; partial reader failure is visible.
- Abuse/rate-limit posture: bounded source reads, replay limit and worker claim if materialized; no live paid capture.

### Runtime evidence

- Local checks: weighted-position, D-3, missing baseline, differing methods, partial source and tenant tests.
- DB/runtime checks: scoped append-only observations/input hashes and reader parity, migration verify if applicable.
- Integration checks: Studio publication ref → authorized outcome → Studio follow-up, no CMS/paid provider write.
- Reliability signals/logs: measurement partial/unavailable/replay/latency and attribution not claimed.
- Production verification sequence: shadow deployment and staged readback before one allowlisted production observation.

## ADR Gate

Existing Studio strategy ADR §14 governs the 2026-10-04 ownership split. Measurement remains SEO; no
new source of truth for editorial QA or CMS writes is introduced. A new causal metric needs its own methodology decision.

<!-- ZONE 2 — PLANNING -->

## Scope

Versioned measurement input/evaluator/readers; publication-to-SEO scoped reference; indexation evidence,
baseline/window/coverage; optional source states; recommendations and programmatic parity.

## Out of Scope

Drafting, editorial QA machine, approval/publish receipt commands, CMS writes/containment, assignment,
iteration commands, dispatcher and content production (TASK-1667/TASK-1913). No provider capture, new
conversion ledger or Insights renderer/delivery.

<!-- ZONE 3 — IMPLEMENTATION -->

## Detailed Spec

Outcome DTO carries `workRef`, `publicationRef`, `subjectRef`, baseline/window, source health/freshness,
coverage, input hash/methodology/as-of and per-source observed deltas. `publicationStatus` is a read-only
projection of Studio evidence; `indexationStatus` is a separately sourced SEO observation. Before verified
publication, show unavailable/pending reason rather than declare a successful published intervention.

A valid observation can exist without a causal conclusion. Missing baseline/capture is `insufficient_data`;
recent GSC window is `pending_data_consolidation`; partial readers report mixed/unavailable by source.
Business conversion unavailable explicitly labels the loop partial with TASK-1284 dependency.
Recommendation to iterate contains parent/ref/reason/evidence only; Studio creates a new linked work item
through its commands after authorization. Work completion feeds the existing queue command for the specific
origin/keyword, without inferring a blanket retirement or creating another queue/decision ledger.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Measurement contract + scoped publication reference → evaluator → lanes/consumer → shadow staging → gated readback.
Read/evaluation foundation can be developed against fixtures before Studio receipts exist; end-to-end closure cannot.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| GSC incomplete window treated as zero | measurement | high | D-3 consolidation and coverage guard | pending_data_consolidation |
| Weighted position or ETV identity lost | methodology | high | canonical readers + method-aware tests | methodology_mismatch |
| Publication mistaken for indexing/causality | measurement | high | separate states/source proofs | indexation_evidence_unavailable |
| Cross-tenant receipt or failed source | auth/integration | medium | scoped ref resolution and partial state | scope_denied/partial_read |

### Feature flags / cutover

`GROWTH_SEO_EDITORIAL_OUTCOMES_ENABLED` remains a proposed measurement evaluator gate, default OFF at
implementation. It is not a deployed flag certified by this documentary adjustment; no flag/env was mutated.
Enable shadow first, then one scoped organization with baseline, window and source coverage verified.

### Rollback plan per slice

Disable evaluator/claims and retain additive observations/readers. Incorrect editorial publication containment
is owned and tested by TASK-1667/CMS, not duplicated in SEO outcomes.

### Production verification sequence

1. Local tests, scoped fixture receipts, canonical reader parity and optional migration verify.
2. Shadow staged outcome over consolidated window; inspect hashes, methodology, weighted position and nulls.
3. Cross-tenant/failure/D-1-D-2/no-indexation/no-conversion negatives and repeated input idempotency.
4. Authorized Studio readback with historic planning snapshot and current observation clearly separated.
5. Allowlisted production observation after release authorization; preserve source-specific partial disclosure.

### Out-of-band coordination required

Studio receipt contract and source access must be confirmed by their owners; no new OAuth, captures or publish here.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Only SEO outcome/indexation is owned here; Studio production/QA/approval/publication lifecycle is referenced.
- [ ] Scoped Studio publication/version/fingerprint refs and SEO durable subject resolve anti-oracle without SQL joins.
- [ ] Baseline/window/coverage/freshness/source refs are explicit; absent baseline is insufficient_data, never zero/success.
- [ ] D-3 is enforced; D-1/D-2 are pending_data_consolidation and zero-row ok responses do not fabricate zero.
- [ ] Recapture is convergent/idempotent with source as-of in input hash and append-only historical observations.
- [ ] Position is impression-weighted; no AVG(position), and no aggregate position without impressions.
- [ ] AEO outcome uses prompt/motor trajectories, not aggregate grader score; absent TASK-1311 is disclosed.
- [ ] GA4/HubSpot axis has authorized source coverage or explicit partial-business-loop disclosure citing TASK-1284.
- [ ] GSC/rank/Labs/AEO/GA4/HubSpot signals remain separate and methodology/as-of travels into the DTO.
- [ ] HTTP 200 is never indexing proof; TASK-1426/equivalent evidence or indexation_evidence_unavailable.
- [ ] Causality never inferred automatically; assessment records actor/reason/evidence and not_claimed by default.
- [ ] Evaluator bounded, tenant-scoped, idempotent, no paid provider live calls or CMS write from render.
- [ ] Partial reader failures degrade honestly and signal; all missing/stale states visible to consumers.
- [ ] Iteration recommendation keeps parent/evidence but mutation happens in Studio commands, not SEO.
- [ ] Completion uses authorized canonical queue feedback for the correct durable subject, no second decision ledger.
- [ ] App/ecosystem/MCP/Studio consume same outcome primitive with capability+grant/parity negatives.
- [ ] Rollout/rollback and shadow gate are documented; no existing editorial data or receipt is overwritten.
- [ ] TASK-1669 can only read/recommend, never mark QA, publication, observed outcome or attribution.
- [ ] Technical/functional/manual docs describe measurement loop and its source-specific degraded states.

## Verification

`pnpm task:lint --task TASK-1668`, `git diff --check`, documentation closure/context gates.
At implementation: focal evaluation/tenant/parity/coverage tests; staged/live readbacks with source-specific proof.

## Closing Protocol

Keep to-do and all implementation criteria unchecked until evidence is registered. Update EPIC-022 and
Studio dependencies/skills/docs at closure; this reconciliation performs no evaluation or runtime mutation.

## Follow-ups

Studio TASK-1911 consumes outcomes for learnings; TASK-1667/TASK-1913 own the next editorial work item.

## Open Questions

Materialization versus bounded on-demand evaluation and the final scoped receipt lane are implementation
Discovery choices; neither authorizes copying editorial state into Greenhouse.
