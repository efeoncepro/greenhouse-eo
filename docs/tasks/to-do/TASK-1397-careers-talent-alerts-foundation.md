# TASK-1397 — Talent Pool and Careers Vacancy Alerts Foundation

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
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command|reader|sync|integration`
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr|growth|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; shared checkout; sin worktrees ni ramas por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega la foundation gobernada para avisos de vacantes con dos audiencias: el **Banco de Talento es la audiencia primaria** y los visitantes anónimos de Careers son una audiencia secundaria de nurture. Ambos carriles reaccionan a la publicación de una vacante pública, pero conservan modelos de identidad, consentimiento y retiro distintos.

El formulario público nunca crea candidato, `Person`, `CandidateFacet`, `HiringApplication` ni membresía del Banco de Talento. La membresía existente solo recibe alertas si la persona tiene consentimiento vigente para `future_opportunities` y una preferencia explícita de `opening_alerts` activa.

## Why This Task Exists

El prototipo de Careers llama “Banco de talento” a una caja de email, pero el Banco de Talento ahora es un agregado person-first con consentimiento por finalidad, retiro y contacto gobernado. La caja actual sigue siendo local/falsa y no existe un consumer que avise a los miembros contactables del banco cuando aparece una vacante. Mantener ambos conceptos mezclados permitiría crear opt-in futuro desde un email anónimo o contactar a personas sin una preferencia clara.

## Goal

- Exponer en el self-service tokenizado del Banco una preferencia independiente `opening_alerts`, con estado auditable, idempotente y reversible.
- Reaccionar a `hiring.opening.published` y enviar avisos públicos a miembros `pool_eligible` con consentimiento futuro vigente y alertas activas.
- Aceptar una suscripción pública secundaria mediante un Growth Form `subscribe`, sin crear identidad ni membresía Hiring.
- Aplicar dedupe durable, unsubscribe y delivery auditable en ambos carriles, con el mismo payload público allowlisted.
- Habilitar el consumer UI de TASK-1398 para el carril público; la extensión visual del self-service de Talent Pool conserva su owner de TASK-1724 y es requisito del rollout del carril primario.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_TALENT_POOL_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_OUTBOX_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/tasks/complete/TASK-354-public-careers-landing-apply-intake.md` (N4 follow-up)
- `docs/tasks/to-do/TASK-1372-growth-forms-application-upload-ats-foundation.md` (reactive-projection boundary)
- `docs/tasks/complete/TASK-1723-talent-pool-canonical-foundation-full-api-parity.md`
- `docs/tasks/complete/TASK-1724-talent-pool-consent-self-service-ui.md`
- `docs/tasks/complete/TASK-1725-talent-pool-desk-governed-invitation-ui.md`

Reglas obligatorias:

- El submit público usa el renderer y endpoint genéricos de Growth Forms con `formKey`; no crear un POST Careers paralelo ni conservar PII en estado de cliente.
- `subscribe` requiere consent snapshot explícito, Turnstile/rate limiting, dedupe y resultado público genérico; no confirma si el email ya estaba suscrito.
- El subscribe no toca `Person`, `CandidateFacet`, `HiringApplication`, `talent_pool_membership` ni consentimiento `future_opportunities`.
- El carril Talent Pool solo incluye membresías con `pool_eligible`, `future_opportunities` vigente y `opening_alerts=true`; `active_process`, `needs_reconsent`, `paused`, `withdrawn` y `expired` quedan fuera.
- `future_opportunities` y `opening_alerts` son decisiones distintas: el primero autoriza contacto futuro; el segundo autoriza avisos automáticos de nuevas vacantes. Withdrawal gana siempre y el servidor reevalúa ambos en cada entrega.
- El consumer de publicación usa únicamente `PublicOpeningPayload` allowlisted; nunca budget, notas, rate, CV, scoring, razones internas ni datos de búsqueda.
- Entregas, preferencias, consentimientos y dedupe deben ser persistentes/auditables; ningún dedupe in-memory es válido.
- La UI pública será un consumer posterior (TASK-1398). La preferencia del self-service se expone mediante la extensión aditiva del contrato de TASK-1724; esta task no implementa JSX.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/context/00_INDEX.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `src/lib/email/subscriptions.ts`
- `src/lib/email/unsubscribe.ts`
- `src/lib/email/delivery.ts`
- `src/lib/hiring/talent-pool/**`

## Dependencies & Impact

### Depends on

- TASK-353 Hiring/ATS foundation and the published-opening event/payload.
- TASK-354 public Careers surface and its N4 product boundary.
- TASK-1723 Talent Pool canonical membership, consent, policy and Full API Parity.
- TASK-1724 tokenized Talent Pool self-service; its existing surface must consume the new alert preference contract before the primary lane rolls out.
- Existing Growth Forms public renderer, public submit route and consent snapshots.
- Existing subscription/unsubscribe/delivery primitives under `src/lib/email/`.

### Blocks / Impacts

- Blocks TASK-1398, the public Careers Vacancy Alerts UI consumer.
- Blocks production activation of Talent Pool opening alerts until TASK-1724 consumes the preference contract.
- Completes the real-delivery prerequisite for the Careers nurture node and the Talent Pool recontact notification lane.
- Adds an operational email consumer to the Hiring publication lifecycle without changing invitation, stage or assessment behavior.

### Files owned

- `src/lib/growth/forms/**` only where a generic published-form configuration/consumer contract must be extended.
- `src/lib/hiring/public-careers/**` for the public Careers form/allowlist boundary only.
- `src/lib/hiring/talent-pool/**` for the alert preference reader/command and eligibility projection.
- `src/lib/sync/projections/**` for the `hiring.opening.published` fan-out consumer.
- `src/lib/email/**` only for an additive Careers alert email/dedupe primitive where the existing contract is insufficient.
- `src/lib/copy/**` for email/public outcome copy where it is reusable.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Careers public routes and the allowlisted `PublicOpeningPayload` in `src/lib/hiring/public-careers/**`.
- `hiring.opening.published` as the Hiring lifecycle seam.
- Growth Forms supports public forms, consent snapshots, async submission and portable `<greenhouse-form>` rendering.
- Talent Pool membership, purpose-scoped consent, contactability policy, tokenized self-service and invitation commands under `src/lib/hiring/talent-pool/**`.
- `src/lib/email/subscriptions.ts`, `unsubscribe.ts` and `delivery.ts` provide subscription, signed opt-out and delivery-ledger primitives.

### Gap

- No published Career Alerts form exists.
- No `opening_alerts` preference contract or self-service consumer exists for Talent Pool members.
- No accepted-submission consumer maps the consented anonymous subscriber to the Careers alert email type.
- No published-opening fan-out consumer, durable per-opening/per-recipient dedupe, template or two-lane operational smoke exists.
- The tracking plan and flag ledger do not describe this capability.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/forms/**`, `src/lib/hiring/public-careers/**`, `src/lib/hiring/talent-pool/**`, `src/lib/email/**` and `src/lib/sync/projections/**` consumed by portal and ops-worker.
- Future candidate home: `domain-package`
- Boundary: public Growth Form ingress -> anonymous alert subscription projection; Talent Pool consent/preference reader -> contactability policy; `hiring.opening.published` -> public-payload fan-out -> email delivery. Hiring owns bank eligibility; Growth owns anonymous subscription ingress.
- Server/browser split: browser only renders/submits the generic form; consent, subscription mutation, event handling and delivery stay server-side.
- Build impact: `none` beyond existing portal/ops-worker entrypoints.
- Extraction blocker: shared DB-backed Growth Forms, email delivery and Hiring outbox contracts must remain co-located until their authorized modular extraction.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command|reader|sync|integration`
- Source of truth afectado: Talent Pool consent/preference projection; Growth form/version/submission/consent snapshot; email subscriptions and delivery ledger; published Hiring opening event.
- Consumidores afectados: Talent Pool self-service, Hiring Desk policy, Careers visitor, Growth renderer, ops-worker, email provider and TASK-1398 UI.
- Runtime target: `local` -> `staging` -> `production`.

### Contract surface

- Form instance: publish a `subscribe` form with stable generated `formKey`; proposed admin slug `efeonce-careers-talent-alerts` is a locator, not the public submit authority.
- Public ingress: existing `/api/public/growth/forms/[formSlug]/**` contract and renderer; preserve generic validation, anti-abuse and accepted outcome.
- Accepted submission projection: `growth.forms.submission_accepted` creates/updates the anonymous `careers_talent_alerts` subscription, retaining the canonical consent snapshot/provenance.
- Talent Pool preference contract: add a canonical server-side command/reader for `opening_alerts`, with append-only preference history and a current projection. The tokenized self-service of TASK-1724 consumes this contract; no client-side boolean is authoritative.
- Publication delivery: `hiring.opening.published` -> alert fan-out -> (a) eligible Talent Pool members and (b) eligible anonymous Careers subscribers -> email delivery with a signed unsubscribe URL.
- Full API parity: subscription and publication processing use governed commands/consumers; no action is UI-only.
- Backward compatibility: `compatible` and additive; no existing Career apply path changes.

### Data model and invariants

- `form_definition`, `form_version`, `form_submission` and `form_submission_consent_snapshot` remain the public-capture source of truth.
- The Growth Forms consent snapshot remains canonical evidence for anonymous subscribers; the email subscription store is only an operational projection, idempotent by `(email_type, email)`.
- Talent Pool consent remains canonical evidence for `future_opportunities`; the alert preference is a separate append-only communication decision with a rebuildable current projection.
- A durable uniqueness/claim is required for `{recipient_source, recipient_key, opening_id, email_type}` before provider delivery. Discovery must prove the current delivery ledger constraint is sufficient or add an additive ledger/constraint; retries must not duplicate delivery.
- Reuse the unsubscribe primitive for anonymous subscribers. For Talent Pool members, disabling `opening_alerts` must stop future alert delivery without withdrawing `future_opportunities`; withdrawal/expiry must stop both alert delivery and future contact.
- No candidate/person record, hiring application, profile enrichment, matching score, automated shortlist or invitation is written by the alert consumer.
- Public result remains generic; do not expose whether an email is already subscribed.

### PII, policy and security

- Minimal public fields are name (optional only if product-approved), email and explicit Career Alerts consent/preferences; do not capture CV, role history or sensitive categories.
- Consent copy/version, locale, timestamp and surface are persisted by the governed form contract.
- Talent Pool alert preference copy must state that alerts are informational, do not guarantee contact or selection, and are independent from the permission to be considered for future opportunities.
- Public submission keeps captcha/rate-limit/origin/surface checks; no raw provider errors or recipient enumeration reach the browser.
- Email content uses only the public opening allowlist and includes working unsubscribe.
- Retention, lawful basis and copy require the relevant privacy/legal review before production flip.

### Migration / backfill / rollback

- Migration: additive only for the Talent Pool preference history/projection, durable delivery claim constraint/ledger or subscription email type registration.
- Backfill: none; existing memberships default to `opening_alerts=false`; do not infer alert preference from historical applicants, contacts, prior emails or existing `future_opportunities` evidence.
- Flags: add independent `HIRING_TALENT_POOL_OPENING_ALERTS_ENABLED=false` and `CAREERS_TALENT_ALERTS_ENABLED=false` in every runtime that can consume the event, and register owner, scope, expiry/review and rollback in the feature-flag ledger.
- Rollback: disable the flag before retries are scheduled; published form can be unpublished while preserving consent/audit history; no destructive PII cleanup outside the retention workflow.

### Observability and runtime evidence

- Emit/record accepted submission, subscription upsert, preference change, skipped-ineligible, skipped-unsubscribed, dedupe-claimed, delivered and failed delivery outcomes without PII in signal labels.
- Define reliability signals for persistent delivery failures, eligibility/consent violations and event/delivery claim backlog if the worker is asynchronous.
- Staging smoke: create a synthetic Talent Pool membership with explicit future consent and alerts enabled; submit one anonymous test subscription; publish an allowlisted test opening; assert one delivery per eligible lane; replay the event; disable bank alerts; withdraw future consent; unsubscribe the public address; publish again and assert no prohibited delivery.

### Measurement

- Register the form/surface and `gh_form_submission_accepted` -> `generate_lead` semantics in `TRACKING-PLAN.md`; never send email/name values as analytics payloads.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Notification policy and Talent Pool preference contract

- Propose/accept the ADR delta for the distinction `future_opportunities` vs `opening_alerts` before changing the shared Talent Pool source of truth.
- Add the canonical Talent Pool preference command/reader, append-only history, current projection, API/tokenized self-service contract and explicit default-off behavior for existing memberships.
- Add policy copy, feature flags and operational ownership without changing the existing invite command.

### Slice 2 — Public Careers subscription projection

- Author and publish the reusable `subscribe` form/surface with minimal fields, explicit consent and generic accepted outcome.
- Consume `growth.forms.submission_accepted` idempotently and upsert the anonymous `careers_talent_alerts` subscription with consent provenance.
- Verify resubscribe, existing-subscriber privacy behavior, rate limits and signed unsubscribe behavior.

### Slice 3 — Dual-recipient published-opening consumer

- Consume `hiring.opening.published`, resolve eligible Talent Pool members and anonymous subscribers, map only the public payload into the email template and implement durable claim/dedupe before delivery.
- Re-evaluate consent, alert preference, expiry, withdrawal and unsubscribe immediately before delivery.
- Record outcomes, retries and skips; keep provider execution asynchronous according to the existing delivery boundary.

### Slice 4 — Operational verification

- Run the full two-lane staging smoke sequence and document the exact flag/cutover/rollback evidence, including the TASK-1724 self-service preference consumer.

## Out of Scope

- A searchable internal Talent Pool, candidate matching/ranking, recruiter CRM or periodic digests.
- Creating applicants/candidates/people from subscribers.
- UI/host/CSS implementation of the public Careers band (TASK-1398).
- Rebuilding TASK-1724 self-service; this task owns its server contract and requires the existing self-service owner to consume it.
- Changing the existing Careers application flow (TASK-1372/1373).

## Detailed Spec

The source UI from the Careers prototype establishes only the product promise: voluntary alerts when new opportunities are published. In the current product, the primary audience is the governed Talent Pool; the public Careers form is a secondary anonymous nurture lane. This task owns the durable server-side contract that makes both promises true. It must prefer existing generic primitives; any new code is a small preference/consumer adapter, not a second form engine, matching engine or careers-specific email pipeline.

The consumer does not decide who is a “best candidate”. It distributes a public opportunity notice to people who explicitly enabled alerts; People retains the human responsibility to search evidence and invite the right person through `inviteTalentToOpening`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Slice 3 MUST NOT deliver to Talent Pool until consent, `opening_alerts` preference, eligibility projection and durable delivery claim are proven.
- Production bank-alert flag stays OFF until TASK-1724 consumes the preference contract and staging verifies the full bank-consent -> preference -> publish -> dedupe -> withdrawal sequence.
- Production public-alert flag stays OFF until staging verifies subscribe -> publish -> dedupe -> unsubscribe.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicate alert from retry/replay | outbox/email | medium | Durable `{recipient_source, recipient, opening}` claim before provider call | `hiring.talent_pool_alerts.duplicate_claim` / delivery ledger |
| Alert without valid Talent Pool consent/preference | Hiring/PII | medium | Re-read contactability and `opening_alerts` immediately before delivery; withdrawal wins | `hiring.talent_pool_alerts.consent_violation` |
| Anonymous subscriber mistaken for bank member | Growth/Identity | medium | Separate projections and no `candidate_facet` write from public form | boundary test / projection audit |
| Internal opening data leaks | Hiring/email | low | Build template solely from `PublicOpeningPayload`; negative tests | template payload allowlist test |
| Provider failure loses notification | email/worker | medium | Existing async retry path plus persisted attempt outcome | `hiring.talent_pool_alerts.delivery_failed` |

### Feature flags / cutover

- `HIRING_TALENT_POOL_OPENING_ALERTS_ENABLED=false` gates the primary bank lane; `CAREERS_TALENT_ALERTS_ENABLED=false` gates the secondary anonymous lane. Form publication alone must not send alerts while the relevant flag is OFF.
- Cutover: ADR/policy delta -> TASK-1724 preference consumer -> staging bank smoke -> staging public smoke -> privacy/legal sign-off -> enable bank lane -> controlled test opening -> enable public lane -> monitor outcomes.
- Revert: disable one or both flags and stop retries; memberships, preferences, subscriptions and audit history remain intact.

### Rollback plan per slice

- Slice 1: disable the preference command/reader or revert only the additive projection; preserve append-only consent/preference history.
- Slice 2: unpublish the form version; retain auditable historic submissions and disable only the public lane.
- Slice 3: disable the affected delivery flag; preserve claim/delivery records for investigation and prevent replay storms.
- Slice 4: no data rollback; report failed evidence and keep the affected capability disabled.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Talent Pool exposes a canonical, idempotent and auditable `opening_alerts` preference through the existing tokenized self-service/API boundary, defaulting OFF for existing memberships.
- [ ] A member receives an alert only when `pool_eligible`, `future_opportunities` is current, `opening_alerts=true` and no withdrawal/expiry/pause supersedes it.
- [ ] Existing `active_process`, `needs_reconsent`, `paused`, `withdrawn` and `expired` memberships receive no alert.
- [ ] A Careers `subscribe` form is published through Growth Forms with consent, anti-abuse and a generic public outcome, without creating a Hiring identity or membership.
- [ ] One accepted public submission creates/updates exactly one consented `careers_talent_alerts` subscription without exposing prior subscription state.
- [ ] A published public opening triggers at most one delivery per eligible Talent Pool member and anonymous subscriber; retry/replay cannot duplicate it.
- [ ] Disabling `opening_alerts`, withdrawing future consent or unsubscribing the public address prevents later alerts while preserving audit history.
- [ ] The email includes only allowlisted public vacancy content and a signed unsubscribe URL; it never includes CV, score, notes, matching rationale or internal identifiers.
- [ ] Tracking plan, feature flag ledger, signals, ADR delta and operational runbook evidence are recorded.
- [ ] TASK-1398 can render the published public form using its stable form contract, with no Careers-specific submit endpoint.

## Verification

- [ ] Focused unit/integration tests for preference projection, contactability gate, public subscription projection, payload allowlist, durable dedupe and unsubscribe/withdrawal skips.
- [ ] Existing Growth Form and email delivery tests remain green.
- [ ] Staging smoke evidence covers bank consent + alert preference and public subscribe -> publish -> exactly-one delivery per lane -> retry -> preference off/withdrawal/unsubscribe -> no prohibited delivery.
- [ ] `pnpm ops:lint --changed`
- [ ] `pnpm docs:closure-check` at closure.

## Closing Protocol

- [ ] Lifecycle and task folder reflect the actual state; do not mark complete before the controlled two-lane runtime smoke and TASK-1724 preference consumer evidence.
- [ ] `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md` and the feature-flag ledger record the operational state and evidence.
- [ ] Privacy/legal decision for automatic Talent Pool alerts, preference semantics, published form key, consumer runtime, flag values and any provider limitation are handed off explicitly.
- [ ] Run `pnpm qa:gates --changed --agent codex` and `pnpm docs:closure-check` before final closure.

## Definition of Done

- [ ] Code, migrations/configuration, tests, observability and flag ledger are merged locally under the task lifecycle.
- [ ] Runtime parity is verified in staging for both audiences; production remains `code complete, rollout pending` until the controlled production smoke succeeds.
- [ ] Handoff records the preference contract, form key, event contract, recipient lanes, flag states, privacy sign-off and any residual provider dependency.

## Follow-ups

- Global internal Talent Pool search/matching and recruiter workflows remain governed by TASK-1723–1725; alerts do not rank or invite candidates.
- TASK-1724 must consume the new `opening_alerts` preference contract in its existing tokenized self-service surface before the primary lane can roll out.
- TASK-1398 consumes this foundation for the secondary public Careers band and vacancy-list empty state.
