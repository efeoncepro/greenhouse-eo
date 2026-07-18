# TASK-1437 — Link Hub social-to-conversion measurement

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Epic: `EPIC-030`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|analytics|hubspot|data`
- Blocked by: `TASK-1433|TASK-1434`
- Branch: `task/TASK-1437-link-hub-social-conversion-measurement`
- Legacy ID: `none`
- GitHub Issue: `n/a`

## Summary

Define e implementa la medición de Link Hub desde visita/clic best-effort hasta conversión verificada en Growth Forms/HubSpot, con eventos GA4/GTM gobernados, rollups por marca/página/bloque/versión y límites explícitos de dark social/referrer. No convierte clicks públicos en revenue audit-grade ni almacena PII/fingerprinting.

## Why This Task Exists

Un Link Hub sin evidencia es sólo una página; uno con tracking ingenuo puede violar privacidad o atribuir ventas que no puede probar. Greenhouse debe separar señales browser-reported de submissions/deals autoritativos, normalizar ambos dominios bajo IDs estables y mostrar freshness/confidence sin inventar precisión.

## Goal

- Emitir y aceptar `view`/`outbound_click` con contrato mínimo, resilient y abuse-aware.
- Enviar eventos GA4/GTM sin PII y con naming documentado.
- Correlacionar Growth Form/HubSpot mediante IDs/UTMs gobernados.
- Entregar readers de analytics honestos para cockpit y piloto.

<!-- ZONE 1 -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_LINK_HUB_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_CTA_POPUP_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`

Reglas obligatorias:

- pageview/click = browser-reported, not audit-grade; conversion truth stays in Growth Forms/HubSpot.
- No PII in dataLayer/event payload; no raw IP/full UA/ad IDs/fingerprinting.
- Dark social/in-app referrer loss is reported as limitation, not filled by inference.
- Analytics failure never blocks public navigation/form.
- KPIs follow objective; no vanity-only cockpit or claims of perfect attribution.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/reference/measurement-gtm-ga4/02-gtm-and-datalayer.md`
- `.codex/skills/social-media-studio/modules/09_ANALYTICS_MEASUREMENT.md`

## Dependencies & Impact

### Depends on

- TASK-1433 stable page/version/block IDs.
- TASK-1434 event seam.
- Growth Forms submission truth and existing GTM/GA4 conventions.

### Blocks / Impacts

- Analytics facet in TASK-1435 and evidence gates in TASK-1438/1439.

### Files owned

- `src/lib/growth/link-hubs/analytics/**`
- `src/app/api/public/growth/link-hubs/events/**`
- GTM event registry/tracking plan docs
- migrations for aggregate rollups/ledger if justified by design
- reliability signals/tests

## Current Repo State

### Already exists

- Growth CTA browser event defense/tier model, Growth Forms accepted submission truth, GA4/GTM docs and HubSpot destinations.

### Gap

- No Link Hub event taxonomy, ingest, rollups, conversion join or cockpit reader.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/link-hubs/analytics/**` + public ingest/API adapters.
- Future candidate home: `domain-package`
- Boundary: event contract, ingest command and analytics readers; GA4/HubSpot adapters remain external.
- Server/browser split: browser emits allowlisted IDs/context; server derives tenant/page/version and stores/forwards.
- Build impact: `none`; reuse GTM/GA4 and Growth Forms adapters.
- Extraction blocker: consent/visitor context, public abuse controls and cross-domain conversion joins.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Link Hub event evidence/rollups; Growth Forms/HubSpot remain conversion truth.
- Consumidores afectados: public renderer, cockpit, GA4/GTM, HubSpot reporting, E2E.
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: CTA tiered evidence, Growth Forms ledger, GTM naming/dataLayer allowlist.
- Contrato nuevo o modificado: `link_hub_viewed`, `link_hub_outbound_clicked`, ingest command, rollup reader and conversion correlation DTO.
- Backward compatibility: `compatible`; analytics optional/fail-open for render.
- Full API parity: UI/Nexa/API read same analytics reader; public endpoint delegates ingest command.

### Data model and invariants

- Entidades/tablas/views afectadas: new Link Hub event/rollup tables under `greenhouse_growth` only if CTA shared evidence cannot be safely extended.
- Invariantes que no se pueden romper:
  - raw/browser event never labelled verified conversion;
  - aggregate keys use page/version/block IDs, not copy/URL;
  - no PII/fingerprint payload persisted;
  - conversion count originates from accepted submission/deal contract.
- Tenant/space boundary: server resolves from published page; analytics reader enforces authorized brand scope.
- Idempotency/concurrency: event ID/dedupe window; rollup atomic upsert; accepted conversion join idempotent.
- Audit/outbox/history: event evidence append/aggregate per architecture; conversion references authoritative ID, not copied payload.

### Migration, backfill and rollout

- Migration posture: `additive`.
- Default state: ingest/reporting shadow or OFF until staging validation.
- Backfill plan: none for pilot; no reconstruction from GA4.
- Rollback path: stop ingest/forwarding, keep public navigation; preserve evidence.
- External coordination: GTM/GA4 config/consent, HubSpot property/mapping only if existing contract lacks fields.

### Security and access

- Auth/access gate: public ingest origin/surface allowlist + rate limit; analytics read capability tenant-scoped.
- Sensitive data posture: no PII in browser events; HubSpot PII stays in destination/Forms truth.
- Error contract: `invalid_event|surface_unauthorized|rate_limited|event_rejected|analytics_unavailable`.
- Abuse/rate-limit posture: payload allowlist, size limit, origin/surface binding, rate caps and bot/noise labeling.

### Runtime evidence

- Local checks: schema/PII/forgery/dedupe/rollup tests.
- DB/runtime checks: synthetic view/click/accepted-form correlation and tenant anti-leak.
- Integration checks: GTM preview + GA4 DebugView/Realtime + HubSpot accepted submission readback.
- Reliability signals/logs: `growth.link_hub.event_ingest_backpressure`, `analytics_stale`, forwarding errors.
- Production verification sequence: staging synthetic -> GA4 -> form accepted -> reader -> prod pilot allowlist.

### Acceptance criteria additions

- [ ] Evidence tiers and sources of truth named.
- [ ] IDs/tenant/idempotency/no-PII invariants tested.
- [ ] Migration/rollback and external config documented.
- [ ] Staging DB+GA4+HubSpot evidence exists.
- [ ] Public errors/abuse controls/signals are sanitized.

## Capability Definition of Done — Full API Parity gate

- [ ] Ingest/reader logic lives in primitives and APIs are adapters.
- [ ] Analytics read available programmatically; no cockpit-only calculation.
- [ ] Capability/grant for analytics read and public ingest defenses ship.
- [ ] One event taxonomy serves renderer, GA4, Greenhouse and E2E.

<!-- ZONE 2 intentionally empty -->

<!-- ZONE 3 -->

## Scope

### Slice 1 — Taxonomy and ingest defense

- Define event/parameter allowlist, source/confidence, dedupe, consent and public ingest command.

### Slice 2 — Rollups and conversion correlation

- Materialize/query per page/version/block/time; join only verified Growth Forms/HubSpot outcomes.

### Slice 3 — GA4/GTM and cockpit contract

- Register dataLayer/GA4 events, validate no PII and deliver freshness/confidence readers.

## Out of Scope

- Cross-device identity, fingerprinting, multi-touch/incrementality, native Instagram/TikTok analytics ingestion or promises of revenue attribution.

## Detailed Spec

Primary V1 outcomes: unique-ish sessions only when consent/context permits, clicks by block/destination kind, click-through rate with denominator quality visible, accepted Growth Form submissions and linked HubSpot outcomes when authoritative. Likes/followers are out of scope.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Taxonomy/defense -> rollup/correlation -> external forwarding/cockpit.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| event forgery inflates metrics | analytics | high | best-effort label, rate/origin/dedupe | ingest anomaly |
| PII leaks to dataLayer | privacy | medium | allowlist + tests | PII scanner failure |
| false attribution | HubSpot | medium | verified IDs only + confidence | unmatched conversion |
| analytics blocks UX | public | low | fail-open navigation | latency/error budget |

### Feature flags / cutover

- `GROWTH_LINK_HUB_ANALYTICS_ENABLED` default OFF/shadow; render always works.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | disable ingest | <10 min | sí |
| 2 | stop rollup reader; retain evidence | <30 min | sí |
| 3 | disable forwarding/tags | <15 min | sí |

### Production verification sequence

1. Synthetic staging events/forgery/PII tests.
2. GA4 DebugView + accepted form + reader reconciliation.
3. Prod allowlist Efeonce only.
4. Observe 7d; client expansion in TASK-1439.

### Out-of-band coordination required

GTM/GA4 publish requires human authorization; HubSpot schema change only if necessary and documented.

<!-- ZONE 4 -->

## Acceptance Criteria

- [ ] Given forged/replayed events, When ingested, Then they are rejected/deduped or labelled best-effort and never become conversion truth.
- [ ] Given browser payload/dataLayer, When inspected, Then no PII/full UA/raw IP/ad identifier is present.
- [ ] Given an accepted Growth Form submission, When analytics is read, Then conversion references the authoritative submission and is not inferred from click.
- [ ] Given analytics/GA4 unavailable, When visitor taps, Then navigation/form remains functional.
- [ ] Cockpit/API expose freshness/confidence and dark-social limitation.

## Verification

- `pnpm task:lint --task TASK-1437`
- focused ingest/PII/dedupe/rollup/access tests
- GTM Preview + GA4 DebugView/Realtime
- Growth Forms/HubSpot accepted conversion readback
- `pnpm qa:gates --changed`

## Closing Protocol

- [ ] Lifecycle/index/Handoff/changelog/tracking plan synchronized.
- [ ] Consent/privacy review and reliability signals documented.
- [ ] `pnpm docs:closure-check` executed.

## Follow-ups

- `TASK-1438`, `TASK-1439`.

## Open Questions

- Whether Link Hub can extend CTA Tier B tables or needs bounded own tables is a Discovery decision based on real schemas; event semantics must not be conflated.
