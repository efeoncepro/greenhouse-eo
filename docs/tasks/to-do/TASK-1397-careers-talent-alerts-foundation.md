# TASK-1397 — Careers Talent Alerts Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
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
- Epic: `EPIC-011`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|hr|growth|data`
- Blocked by: `none`
- Branch: `task/TASK-1397-careers-talent-alerts-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Entrega la foundation gobernada para **Career Alerts**: un visitante se suscribe desde Careers y recibe una alerta real cuando se publica una vacante. Reutiliza Growth Forms para el ingreso y consentimiento, y el delivery/subscription layer existente para las preferencias, desuscripción y entregas.

No crea candidato, `Person`, `CandidateFacet` ni `HiringApplication`: una alerta de carrera es una suscripción de marketing/empleo, no una postulación.

## Why This Task Exists

El prototipo de Careers incluye la banda N4 “Banco de talento”, pero el portal no tiene todavía una instancia publicada, consumidor reactivo ni delivery auditable. Dejarla como formulario local prometería avisos sin un camino seguro, consentido e idempotente para cumplir la promesa.

## Goal

- Aceptar una suscripción pública a Career Alerts mediante un Growth Form publicado y con consentimiento explícito.
- Mantener preferencias y desuscripción en el primitive canónico de email, sin duplicar identidades de Hiring.
- Reaccionar a `hiring.opening.published` y enviar exactamente una alerta por vacante/destinatario elegible.
- Habilitar el consumer UI de TASK-1398 sobre el mismo contrato público.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_OUTBOX_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-354-public-careers-landing-apply-intake.md` (N4 follow-up)
- `docs/tasks/to-do/TASK-1372-growth-forms-application-upload-ats-foundation.md` (reactive-projection boundary)

Reglas obligatorias:

- El submit público usa el renderer y endpoint genéricos de Growth Forms con `formKey`; no crear un POST Careers paralelo ni conservar PII en estado de cliente.
- `subscribe` requiere consent snapshot explícito, Turnstile/rate limiting, dedupe y resultado público genérico.
- El subscribe no toca `Person`, `CandidateFacet`, `HiringApplication` ni datos internos de una vacante.
- El consumer de publicación usa únicamente `PublicOpeningPayload` allowlisted; nunca budget, notas, rate ni campos internos.
- Entregas, preferencias, consentimientos y dedupe deben ser persistentes/auditables; ningún dedupe in-memory es válido.
- La UI será un consumer posterior (TASK-1398); esta task no implementa JSX ni host Careers.

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

## Dependencies & Impact

### Depends on

- TASK-353 Hiring/ATS foundation and the published-opening event/payload.
- TASK-354 public Careers surface and its N4 product boundary.
- Existing Growth Forms public renderer, public submit route and consent snapshots.
- Existing subscription/unsubscribe/delivery primitives under `src/lib/email/`.

### Blocks / Impacts

- Blocks TASK-1398, the Careers Talent Alerts UI consumer.
- Completes the real-delivery prerequisite for Careers node N4.
- Adds an operational email consumer to the Hiring publication lifecycle.

### Files owned

- `src/lib/growth/forms/**` only where a generic published-form configuration/consumer contract must be extended.
- `src/lib/hiring/public-careers/**` for an allowlisted published-opening alert consumer only.
- `src/lib/email/**` only for an additive Careers alert email/dedupe primitive where the existing contract is insufficient.
- `src/lib/copy/**` for email/public outcome copy where it is reusable.
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- Careers public routes and the allowlisted `PublicOpeningPayload` in `src/lib/hiring/public-careers/**`.
- `hiring.opening.published` as the Hiring lifecycle seam.
- Growth Forms supports public forms, consent snapshots, async submission and portable `<greenhouse-form>` rendering.
- `src/lib/email/subscriptions.ts`, `unsubscribe.ts` and `delivery.ts` provide subscription, signed opt-out and delivery-ledger primitives.

### Gap

- No published Career Alerts form exists.
- No accepted-submission consumer maps the consented subscriber to the Careers alert email type.
- No published-opening consumer, durable per-opening/per-recipient dedupe, template or operational smoke exists.
- The tracking plan and flag ledger do not describe this capability.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/forms/**`, `src/lib/hiring/public-careers/**`, `src/lib/email/**` consumed by portal and ops-reactive runtime.
- Future candidate home: `domain-package`
- Boundary: public Growth Form ingress -> accepted-submission projection -> email subscription/delivery consumer; Hiring exposes only the public opening contract.
- Server/browser split: browser only renders/submits the generic form; consent, subscription mutation, event handling and delivery stay server-side.
- Build impact: `none` beyond existing portal/ops-worker entrypoints.
- Extraction blocker: shared DB-backed Growth Forms, email delivery and Hiring outbox contracts must remain co-located until their authorized modular extraction.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Growth form/version/submission/consent snapshot; email subscriptions and delivery ledger; published Hiring opening event.
- Consumidores afectados: Careers visitor, Growth renderer, reactive worker, email provider, future TASK-1398 UI.
- Runtime target: `local` -> `staging` -> `production`.

### Contract surface

- Form instance: publish a `subscribe` form with stable generated `formKey`; proposed admin slug `efeonce-careers-talent-alerts` is a locator, not the public submit authority.
- Public ingress: existing `/api/public/growth/forms/[formSlug]/**` contract and renderer; preserve generic validation, anti-abuse and accepted outcome.
- Accepted submission projection: `growth.forms.submission_accepted` creates/updates a subscription with email type `careers_talent_alerts`, retaining the canonical consent snapshot/provenance.
- Publication delivery: `hiring.opening.published` -> Careers alert consumer -> eligible subscribers -> email delivery with a signed generic unsubscribe URL.
- Full API parity: subscription and publication processing use governed commands/consumers; no action is UI-only.
- Backward compatibility: `compatible` and additive; no existing Career apply path changes.

### Data model and invariants

- `form_definition`, `form_version`, `form_submission` and `form_submission_consent_snapshot` remain the public-capture source of truth.
- The email subscription store remains canonical for opt-in status; upsert is idempotent by `(email_type, email)`.
- A durable uniqueness/claim is required for `{opening_id, email_type, recipient}` before provider delivery. Discovery must prove the current delivery ledger constraint is sufficient or add an additive ledger/constraint; retries must not duplicate delivery.
- Reuse the unsubscribe primitive; opt-out takes effect before the next published-opening delivery and must be observable in the ledger.
- No candidate/person record, hiring application, profile enrichment or matching score is written.
- Public result remains generic; do not expose whether an email is already subscribed.

### PII, policy and security

- Minimal fields are name (optional only if product-approved), email and explicit Career Alerts consent/preferences; do not capture CV, role history or sensitive categories.
- Consent copy/version, locale, timestamp and surface are persisted by the governed form contract.
- Public submission keeps captcha/rate-limit/origin/surface checks; no raw provider errors or recipient enumeration reach the browser.
- Email content uses only the public opening allowlist and includes working unsubscribe.
- Retention, lawful basis and copy require the relevant privacy/legal review before production flip.

### Migration / backfill / rollback

- Migration: additive only if a durable delivery claim constraint/ledger or subscription email type registration requires it.
- Backfill: none; do not infer subscribers from historical applicants, contacts or previous emails.
- Flag: add `CAREERS_TALENT_ALERTS_ENABLED=false` in every runtime that can consume the event, and register owner, scope, expiry/review and rollback in the feature-flag ledger.
- Rollback: disable the flag before retries are scheduled; published form can be unpublished while preserving consent/audit history; no destructive PII cleanup outside the retention workflow.

### Observability and runtime evidence

- Emit/record accepted submission, subscription upsert, skipped-unsubscribed, dedupe-claimed, delivered and failed delivery outcomes without PII in signal labels.
- Define a reliability signal for persistent delivery failures and one for event/delivery claim backlog if the worker is asynchronous.
- Staging smoke: submit one consented test address -> assert subscription/consent; publish an allowlisted test opening -> exactly one delivery; retry the same event -> no second delivery; unsubscribe -> publish another opening -> no delivery.

### Measurement

- Register the form/surface and `gh_form_submission_accepted` -> `generate_lead` semantics in `TRACKING-PLAN.md`; never send email/name values as analytics payloads.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (lo llena el agente que toma la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Published form and consent policy

- Author and publish the reusable `subscribe` form/surface with minimal Career Alerts fields, explicit consent and generic accepted outcome.
- Add server-side validation, anti-abuse configuration, tracking-plan entry and flag-ledger registration.

### Slice 2 — Accepted-submission subscription projection

- Consume `growth.forms.submission_accepted` idempotently and upsert the `careers_talent_alerts` subscription with consent provenance.
- Verify resubscribe, existing-subscriber privacy behavior and signed unsubscribe behavior.

### Slice 3 — Published-opening delivery consumer

- Consume `hiring.opening.published`, map only the public payload into the email template and implement durable claim/dedupe before delivery.
- Record outcomes, retries and unsubscribe skips; make provider execution asynchronous according to the existing delivery boundary.

### Slice 4 — Operational verification

- Run the full staging smoke sequence and document the exact flag/cutover/rollback evidence.

## Out of Scope

- A searchable internal Talent Pool, candidate matching/ranking, recruiter CRM or periodic digests.
- Creating applicants/candidates/people from subscribers.
- UI/host/CSS implementation of Careers N4 (TASK-1398).
- Changing the existing Careers application flow (TASK-1372/1373).

## Detailed Spec

The source UI from the Careers prototype establishes only the product promise: voluntary alerts when new opportunities are published. This task owns the durable server-side contract that makes that promise true. It must prefer existing generic primitives; any new code is a small consumer/adapter, not a second form engine or careers-specific email pipeline.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- Slice 3 MUST NOT deliver until consented subscription projection and durable delivery claim are proven.
- Production flag stays OFF until staging verifies the full subscribe -> publish -> dedupe -> unsubscribe sequence.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Duplicate alert from retry/replay | outbox/email | medium | Durable `{opening, recipient}` claim before provider call | `careers.talent_alerts.duplicate_claim` / delivery ledger |
| Alert without valid consent | Growth/PII | low | Consume canonical consent snapshot and subscription status only | rejected/skipped outcome audit |
| Internal opening data leaks | Hiring/email | low | Build template solely from `PublicOpeningPayload`; negative tests | template payload allowlist test |
| Provider failure loses notification | email/worker | medium | Existing async retry path plus persisted attempt outcome | `careers.talent_alerts.delivery_failed` |

### Feature flags / cutover

- `CAREERS_TALENT_ALERTS_ENABLED=false` is the delivery gate in portal/worker runtime. Form publication alone must not send alerts while OFF.
- Cutover: staging smoke -> privacy/legal sign-off -> production flag ON -> controlled test opening -> monitor outcomes.
- Revert: OFF + redeploy/reload configuration; subscriptions and audit history remain intact.

### Rollback plan per slice

- Slice 1: unpublish the form version; retain auditable historic submissions.
- Slice 2: disable the reactive consumer/flag; no destructive subscriber mutation.
- Slice 3: disable delivery flag; preserve claim/delivery records for investigation and prevent replay storms.
- Slice 4: no data rollback; report failed evidence and keep the capability disabled.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] A Careers Talent Alerts `subscribe` form is published through Growth Forms with consent, anti-abuse and a generic public outcome.
- [ ] One accepted submission creates/updates exactly one consented `careers_talent_alerts` subscription without exposing prior subscription state.
- [ ] A published public opening triggers one eligible delivery, and retry/replay cannot send it twice to the same recipient.
- [ ] A recipient who unsubscribes receives no later opening alert.
- [ ] The email includes only allowlisted public vacancy content and a signed unsubscribe URL.
- [ ] Tracking plan, feature flag ledger, signals and operational runbook evidence are recorded.
- [ ] TASK-1398 can render the published form using its stable form contract, with no Careers-specific submit endpoint.

## Verification

- [ ] Focused unit/integration tests for projection, consent gate, payload allowlist, durable dedupe and unsubscribe skip.
- [ ] Existing Growth Form and email delivery tests remain green.
- [ ] Staging smoke evidence covers subscribe -> publish -> exactly-one delivery -> retry -> unsubscribe -> no delivery.
- [ ] `pnpm ops:lint --changed`
- [ ] `pnpm docs:closure-check` at closure.

## Closing Protocol

- [ ] Lifecycle and task folder reflect the actual state; do not mark complete before the controlled runtime smoke.
- [ ] `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `Handoff.md`, `changelog.md` and the feature-flag ledger record the operational state and evidence.
- [ ] Privacy/legal decision, published form key, consumer runtime, flag values and any provider limitation are handed off explicitly.
- [ ] Run `pnpm qa:gates --changed --agent codex` and `pnpm docs:closure-check` before final closure.

## Definition of Done

- [ ] Code, migrations/configuration, tests, observability and flag ledger are merged locally under the task lifecycle.
- [ ] Runtime parity is verified in staging; production remains `code complete, rollout pending` until the controlled production smoke succeeds.
- [ ] Handoff records form key, event contract, flag states, privacy sign-off and any residual provider dependency.

## Follow-ups

- Global internal Talent Pool search/matching and recruiter workflows require a separately designed people/hiring capability; they are not implied by Career Alerts.
- TASK-1398 consumes this foundation for the visible Careers band and vacancy-list empty state.
