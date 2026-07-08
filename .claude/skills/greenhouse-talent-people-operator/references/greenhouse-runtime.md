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
- Store: `src/lib/hiring/**` (SQL-crudo + `HiringValidationError` + transactional outbox). API: `/api/hiring/**` (dual-gate: internal tenant + `can()`).
- Capabilities: `hiring.{demand,opening,application}.*` (granted to internal roles only — NUNCA `client_*`).

## The assessment engine (EPIC-011 extension)

- `TASK-1360` Assessment Engine — competency catalog (category × level), question bank (**answer_key sensitive, separate, never candidate-facing**), templates (compose per role; Account Manager seed), instances, objective + human scoring, competency-result rollup into `hiring_application` (**advisory**).
- `TASK-1361` Assessment AI Assist — AI **proposes** questions + open-answer scores; **human confirms**; eval baseline; flag OFF default. (This is the AI-Act-safe pattern — see `assessment-interviewing.md`.)
- `TASK-1362` Candidate Document Capture — CV/portfolio on the **private assets platform** (reuse, don't build buckets); **identity docs reuse `person_identity_documents`** (masked/reveal + capability `person.legal_profile.reveal_sensitive` + audit), captured **post-decision**; quarantine/scan for public uploads.
- `TASK-1363` Assessment Taking + Review Surface — candidate takes the test via a **public tokenized Greenhouse link** (`/assessment/[token]`, single-use, time-limited); internal review in Application 360. `UI ready: no` until product-design loop.

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
- **Boundary**: hiring **never** writes `member` / `assignment` / `placement` / payroll truth / compensation. Handoff is explicit (TASK-356); collaborator activation is HRIS/People (TASK-770).
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
