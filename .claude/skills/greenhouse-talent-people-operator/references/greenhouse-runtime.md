# Greenhouse runtime binding (domain, code paths, invariants)

Load whenever the work happens *inside* the Greenhouse repo (not pure advisory). This is what makes the skill an operator, not a consultant. Read the current specs before acting — the domain is young and moving.

## The Hiring / ATS domain (canonical)

- Architecture: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` (+ its 2026-07-08 assessment delta).
- Program: `EPIC-011` (`docs/epics/to-do/EPIC-011-hiring-ats-end-to-end-program.md`).
- Schema `greenhouse_hiring` (TASK-353, ✓ complete): 4 person-first aggregates —
  - `talent_demand` — the root (stakeholder internal/client × engagement on_demand/on_going × fulfillment_mode). **Workforce planning produces this** (see `workforce-planning.md`).
  - `hiring_opening` — derived from demand; internal truth vs **public allowlist payload** (`buildPublicOpeningPayload` — never leak internal fields).
  - `candidate_facet` — the recruiting facet on a **Person** (`greenhouse_core.identity_profiles`), UNIQUE per person. **No parallel `candidate` identity.**
  - `hiring_application` — the pipeline unit; carries decision + handoff snapshots; `score`/`match_score`/`explainability_json` (the assessment rollup target).
  - `hiring_handoff` (TASK-356, ✓ complete) — the explicit boundary object decision→downstream. UNIQUE per application, anchored to `decision_id` (supersede), state-machine `pending→approved→[in_setup]→completed` + `blocked`/`cancelled`, append-only `hiring_handoff_audit`.
- Store: `src/lib/hiring/**` (SQL-crudo + `HiringValidationError` + transactional outbox). API: `/api/hiring/**` (dual-gate: internal tenant + `can()`).
- Capabilities: `hiring.{demand,opening,application}.*` (granted to internal roles only — NUNCA `client_*`).

## The assessment engine (EPIC-011 extension)

- `TASK-1360` Assessment Engine — competency catalog (category × level), question bank (**answer_key sensitive, separate, never candidate-facing**), templates (compose per role; Account Manager seed), instances, objective + human scoring, competency-result rollup into `hiring_application` (**advisory**).
- `TASK-1361` Assessment AI Assist — AI **proposes** questions + open-answer scores; **human confirms**; eval baseline; flag OFF default. (This is the AI-Act-safe pattern — see `assessment-interviewing.md`.)
- `TASK-1362` Candidate Document Capture — CV/portfolio on the **private assets platform** (reuse, don't build buckets); **identity docs reuse `person_identity_documents`** (masked/reveal + capability `person.legal_profile.reveal_sensitive` + audit), captured **post-decision**; quarantine/scan for public uploads.
- `TASK-1363` Assessment Taking + Review Surface — candidate takes the test via a **public tokenized Greenhouse link** (`/assessment/[token]`, single-use, time-limited); internal review in Application 360. `UI ready: no` until product-design loop.

## The handoff (decision → downstream runtime, TASK-356 ✓ complete)

- **Trigger**: `hiring.application.decided` with `decision='selected'` materializes a `HiringHandoff` via the reactive consumer `hiring_handoff_materialize` (domain `people`, runs in ops-worker; **no flag** — a no-op would be terminal in `outbox_reactive_log`). Rejections/backups/holds NEVER create a handoff; a re-decision that revokes a selection cancels a pending handoff or blocks an approved one (`decision_revoked`).
- **Supersede**: a new `selected` decision updates a `pending` handoff (audited `decision_superseded`); on an `approved|in_setup|completed` handoff it BLOCKS (`decision_superseded_after_approval`) — never silent overwrite. Blocked-post-approval is sticky: a human resolves via cancel.
- **Supported destinations V1**: `internal_hire` (→ HRIS queue, TASK-770) + `staff_augmentation` (owner calls `createStaffAugPlacement` explicitly). `contractor`/`partner`/`internal_reassignment` are born `blocked:destination_not_supported`.
- **Command**: `transitionHiringHandoff` / `POST /api/hiring/handoffs/[id]/(approve|setup|complete|cancel)` — capability `hiring.handoff.approve` (governance tier, same as decide). `complete` REQUIRES `downstreamRef` (evidence: member/placement id) — never by inference.
- **Readers (flag `HIRING_HANDOFF_BRIDGES_ENABLED`, default OFF, `enabled:false` explicit)**: `listInternalHireReadyForOnboarding()` (queue for 770), `listStaffAugmentationHandoffIntents()`; `getHiringJourneyForPerson()` (Person 360 journey, unflagged).
- **Copy contract**: `src/lib/copy/hiring.ts` (`GH_HIRING_HANDOFF`) — UI renders stable codes via helpers, never raw codes/improvised prose.
- **Reliability**: module `hiring` — `hiring.handoff_blocked_stale` (48h) + `hiring.internal_hire_awaiting_onboarding` (72h SLA, "don't lose a hire").
- **Ops aids**: backfill `scripts/hiring/backfill-handoffs.ts` (dry-run→apply); live smoke `scripts/hiring/_sanity-handoff-reactive.ts`.
- Manual: `docs/manual-de-uso/hr/operar-hiring-handoff.md`. Functional doc: `docs/documentation/hr/hiring-desk.md` §Handoff downstream.

## The activation bridge (handoff → collaborator, TASK-770 ✓ complete; UI TASK-1368 code-complete local)

- **Home**: `src/lib/workforce/hiring-activation/**` (NOT hr-core). Mapping `greenhouse_hr.hiring_activation_request` (UNIQUE per handoff) + append-only events. Commands `review → create-member → open-onboarding → complete` + `cancel` via `POST /api/hr/hiring-activation/[id]/[action]`. Resolver `resolve-blocker` (TASK-1400) retries governed actions (`retry-create-member`, `retry-open-onboarding`) or returns `not_resolvable` with surface alternativa. Flag `HIRING_ACTIVATION_ENABLED` stacks on 356's bridges flag.
- **Member core source-neutral** (`member-core.ts`): sibling of the SCIM D-2 cascade — resolve by `identity_profile_id` → legacy email without profile → reactivate inactive → INSERT mirroring SCIM (**`active=TRUE` + `workforce_intake_status='pending_intake'`** — the payroll/capacity gate is the intake status, NOT the active column; `members.active` is NOT a generated column, that was a misread of kysely's `Generated<>`). Identity conflicts → request `blocked` (`ambiguous_identity|member_conflict|member_already_active`), NEVER auto-merge. D-2 discoverability by construction (profile populated → SCIM backfills `azure_oid` later, no dup).
- **REUSES, never rebuilds**: checklist via `createOnboardingInstance` (TASK-030; no template → `blocked:onboarding_template_missing`); activation ONLY via `completeWorkforceMemberIntake` + readiness (the bridge never writes `workforce_intake_status='completed'` — static test enforces); `ready_to_activate` computed live, never persisted.
- **Capabilities**: `hiring.activation.review` (new, execute) for queue/review/complete/cancel; `workforce.member.intake.update` for create-member; `hr.onboarding_instance` for open-onboarding.
- **Signal**: `workforce.hiring_activation_stuck` (member created, intake pending >7d, steady=0) — complements 356's `hiring.internal_hire_awaiting_onboarding` (approved without member).
- **UI / master flow seam**: TASK-1368 lives at `/hr/onboarding?lane=hiring-activation`. Application 360 (`/agency/hiring/applications/[applicationId]`) is the N10→N11 entry point: selected/internal_hire shows the real handoff, can approve pending handoff with `hiring.handoff.approve`, and deep-links with `applicationId`/`handoffId`. The lane must select the target case or show "not in queue yet"; never fall back to a random first item.
- **Ops aids**: live smoke `scripts/hiring/_sanity-hiring-activation.ts`. Manual: `docs/manual-de-uso/hr/activar-colaborador-desde-hiring.md`.

## Public careers / vacancy publication contract

When the work is "create/open/publish a vacancy" inside Greenhouse, operate the
Hiring domain, not the database:

1. `createTalentDemand` creates the demand root.
2. `createHiringOpening` derives the opening from that demand.
3. `updateHiringOpening` fills role copy, requirements, skills, process,
   visibility and publication metadata.
4. `publishOpening` makes it public-listed and produces the public `opening_id`.

Record in the response and handoff: demand `public_id`, opening `public_id`,
production detail URL and apply URL. Example from the 2026-07-09 Account Manager
release: demand `EO-TDM-0012`, opening `EO-OPN-0009`,
`/public/careers/EO-OPN-0009`, `/public/careers/EO-OPN-0009/apply`.

Listing/detail must consume `PublicOpeningPayload` only. Apply must use the
Growth Forms compatible contract (`efeonce-careers-application`) but the
authoritative write remains Hiring (`POST /api/public/hiring/applications`).

Full API Parity is already present for the current vacancy workflow:

- `POST /api/hiring/demands` -> `createTalentDemand`.
- `POST /api/hiring/openings` -> `createHiringOpening`.
- `PATCH /api/hiring/openings/{openingId}` -> `updateHiringOpening`.
- `POST /api/hiring/openings/{openingId}/publish` -> `publishOpening`.
- `DELETE /api/hiring/openings/{openingId}/publish?mode=paused|closed` ->
  `unpublishOpening`.
- `POST /api/public/hiring/applications` -> `submitPublicHiringApplication`
  (public, Turnstile-gated in production, JSON or multipart with `cvFile`).

Do not answer that a new release is required just because an agent wants to
publish a vacancy. If the runtime is already live, use the API/commands above.
Preferred operator path after TASK-1371 is the governed wrapper over those same
commands: `publishHiringVacancyFromBrief`, `POST /api/hiring/vacancy-publications`
and `pnpm hiring:publish-vacancy`. This replaces one-off SQL scripts, ad-hoc
payloads and production releases as the normal vacancy publication path.

Location/modality rule for public offers: agents must not author a single free
text string such as "remote / hybrid by agreement". Vacancy creation must carry
structured fields (`workMode`, `hiringRegion`, `officeLocation/cityCountry`).
Remote roles publish a hiring region (`LATAM`, `Global`, `Chile`, etc.) as
location; hybrid/onsite roles require a real city/country/office. Any legacy
`publicLocationMode` string must be derived from those fields, not invented as
candidate-facing copy.

Talent Pool / Banco de Talento rule: if the surface only illustrates employer
brand, mark it explicitly as decorative. If it captures emails/CVs/interest, it
must be a real Growth Form or Hiring command with consent, captcha/rate-limit,
generic success/dedupe state and a documented owner.

Do not turn vacancy creation into release recovery. After the careers runtime is
live and flags/Turnstile are configured, publishing a new vacancy is a Hiring
business-data operation and **does not require a production release**. Compose
with `greenhouse-production-release` only when the request changes code,
schema/migrations, flags/env vars, infrastructure, public renderer, apply
contract, or initial cutover smoke.

## Person model (never duplicate a human)

- Root: `greenhouse_core.identity_profiles` (`profile_id`). A candidate is a **Person with a `candidate_facet`**, not a separate record. Reconcile with `resolvePersonIdentifier`.
- The same Person becomes a `member` (employee) via HRIS/People (TASK-770), on the *same* `identity_profile_id`. Candidate → colaborador is a facet promotion, not a new identity.

## Contract types (the global/national fork)

`src/types/hr-contracts.ts`: `indefinido`, `plazo_fijo`, `honorarios`, `contractor`, `eor`, `international_internal`. Talent recommends the model (see `global-hiring.md`); payroll/legal validate + execute. **Misclassification is a legal red flag — escalate.**

## Hard invariants (do not violate)

- **Assessment score is advisory** and **orthogonal to payroll/ICO** — it never feeds pay/bonus and **never auto-rejects/hires**. Human decides. (Also EU AI-Act human-oversight.)
- **answer_key / rubric never in the candidate-facing payload** (allowlist discipline, like `buildPublicOpeningPayload`).
- **AI proposes, human confirms** (`propose → confirm → execute`) with an eval baseline; no emotion/biometric/personality inference.
- **Candidate PII** = same rigor as an employee: masked/reveal + capability + audit; never log `value_full`; identity docs captured post-decision, never at public apply.
- **Anchor candidate assets by** `identity_profile_id` / `candidate_facet_id` / `application_id` — never `member_id` (candidates have no member).
- **Boundary**: hiring **never** writes `member` / `assignment` / `placement` / payroll truth / compensation / `contractor_engagements` / `providers` / `expenses`. The handoff (TASK-356, live) is the explicit exit contract — it carries `selected_destination` (CHECK'd enum) and NEVER a field readable as `contractType`; `expected_legal_entity` is a non-binding proposal. Collaborator activation is HRIS/People (TASK-770). Guarded by `src/lib/hiring/handoff/boundary.test.ts`.
- **Capabilities → grant coverage**: any new capability is granted to ≥1 real role in the same PR (guard `capability-grant-coverage.test.ts`); real roles only (`src/config/role-codes.ts`), never `client_*`.
- Observability: `captureWithDomain(err, 'hiring', …)`.

## Adjacent domains + who owns what

- **Payroll / comp / tax** → `greenhouse-payroll-auditor` (this skill hands over the hire).
- **Offer letters / contracts** → Workforce Contracting Studio + legal.
- **Cost/margin of a hire** → `greenhouse-finance-accounting-operator`.
- **Capacity gap / delivery load / burnout signal** → `greenhouse-ico`.
- **Careers + assessment UI** → product-design skills.
- **Person legal profile / identity docs** → identity/workforce invariants (`docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`).

## First reads inside the repo

`CLAUDE.md` · `AGENTS.md` · `project_context.md` · `Handoff.md` · `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` · `EPIC-011` + `TASK-1360..1363` · `docs/context/` (agency roles, ICO, voice).
