# Greenhouse EO — Cloud Governance Operating Model

> **Version:** 1.0
> **Created:** 2026-03-29
> **Audience:** platform engineers, admin operators, on-call maintainers
> **Companion docs:** `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`, `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
> **Task anchor:** `TASK-122`

---

## 1. Purpose

This document institutionalizes `Cloud` as an internal Greenhouse governance domain.

Its role is to define:

- what belongs to the Cloud domain
- how `Cloud & Integrations` and `Ops Health` relate to that domain
- which parts of the domain must live in UI, code, scripts, env management, and runbooks
- how the hardening track (`TASK-096`, `TASK-098` to `TASK-103`) should be interpreted and executed

This is not a resource inventory and not a task checklist. It is the operating model that turns a scattered hardening track into a coherent platform capability.

---

## 2. Domain Definition

### 2.1 What `Cloud` means in Greenhouse

`Cloud` is the internal platform governance layer responsible for the runtime posture of Greenhouse across:

- Vercel
- Google Cloud
- cross-system integrations that sustain product runtime
- operational controls required to keep the platform safe, observable, resilient, and cost-bounded

This includes:

- CI and deployment validation
- cron posture and auth
- runtime health checks
- cloud secrets and access posture
- Cloud SQL resilience
- BigQuery cost guards
- incident-facing operational signals

This does **not** mean “another product module” for clients.

### 2.2 What `Cloud` is not

`Cloud` is not:

- a client-facing analytics product
- a replacement for module-specific admin surfaces
- a catch-all bucket for every infra-ish idea
- a justification to move implementation-only details into UI without code or runbook backing

---

## 3. Institutional Boundary

### 3.1 Relationship to `Admin Center`

`Admin Center` is the governance shell.

`Cloud` is one governance domain within that shell.

The shell organizes domains.
The Cloud domain defines the operating contracts, controls, and surfaces for platform posture.

### 3.2 Relationship to `Cloud & Integrations`

`Cloud & Integrations` is the visible operational surface for:

- external system health and freshness
- integration ownership
- secret-ref governance
- sync status
- provider posture summaries

It should index cloud-adjacent runtime state, but it is not the whole Cloud domain.

### 3.3 Relationship to `Ops Health`

`Ops Health` is the surface for:

- active failures
- degraded handlers
- queue pressure
- dispatch and projection health
- incidents requiring attention

It is the incident-facing window into the Cloud domain, not the domain itself.

### 3.4 Relationship to Specialist Surfaces

Specialist modules keep owning their own business runtime.

Examples:

- Payroll owns payroll business logic and operational semantics
- Finance owns financial correctness and domain workflows
- Delivery owns delivery-specific read models and operational UX

The Cloud domain owns the platform controls those modules rely on:

- whether cron auth is safe
- whether health checks exist
- whether Cloud SQL can recover
- whether BigQuery scans are bounded
- whether alerts fire

---

## 4. Surface Model

The Cloud domain should be understood in four slices.

### 4.1 Governance Slice

Primary surface:

- `/admin/cloud-integrations`

Responsibilities:

- inventory of integrations and providers
- secret-ref governance
- freshness and sync state
- ownership and authentication mode

### 4.2 Incident Slice

Primary surface:

- `/admin/ops-health`

Responsibilities:

- degraded runtime signals
- failed handlers
- queue lag or dispatch pressure
- operational alert summaries

### 4.3 Control Contract Slice

Primary home:

- code, helpers, config, env contracts, versioned scripts

Responsibilities:

- cron auth helpers
- health check helpers
- query cost guards
- Cloud SQL access posture
- CI validation contracts

This slice must live in repo-native artifacts, not only in UI.

### 4.4 Runbook Slice

Primary home:

- architecture and operations docs

Responsibilities:

- posture decisions
- restore/incident steps
- rollout gating
- environment expectations
- fallback rules

---

## 5. Implementation Contract by Artifact Type

Each Cloud concern must have a canonical home.

| Concern | Canonical home | Optional mirror |
|---|---|---|
| Control logic | code/helper/script | UI status surface |
| Secret posture | architecture + env/runbook | admin summary |
| Health state | route/helper + alerting | Ops Health |
| Cost guard | shared library/config | admin summary |
| Infra inventory | architecture reference | admin summary |
| Restore procedure | runbook / task verification | Ops note |

### 5.1 Must live in code or scripts

- CI test gating
- cron auth enforcement
- health endpoint behavior
- `maximumBytesBilled` defaults
- Cloud SQL connection posture that the app can express

### 5.2 Must live in env/config/runbooks

- Sentry DSN and alert webhooks
- budget thresholds
- Cloud SQL PITR and flags
- secret storage decisions
- deploy validation expectations
- preview baseline ownership and cleanup rules for branch overrides

### 5.2.2 Secret Manager payload hygiene rule

For scalar secrets consumed by Greenhouse runtime (`tokens`, `passwords`, `client secrets`, `NEXTAUTH_SECRET`, webhook signing secrets):

- the payload in GCP Secret Manager must be the raw scalar only
- do not wrap the value in quotes
- do not append literal `\n` / `\r`
- do not leave leading/trailing whitespace

Recommended publication pattern:

```bash
printf %s "$VALOR" | gcloud secrets versions add <secret-id> --data-file=-
```

Operational guardrails:

- a defensive runtime sanitizer is allowed as defense in depth, but does not make dirty payloads acceptable at source
- every rotation of a `*_SECRET_REF` consumer requires a smoke check of the real dependent flow
- auth secret rotations are not neutral infra changes:
  - rotating `NEXTAUTH_SECRET` can invalidate sessions and force re-login
- webhook secret rotations require signature/HMAC verification against the live consumer
- PostgreSQL password rotations require `pnpm pg:doctor` or equivalent real connection verification

### 5.2.1 Preview baseline rule

For Vercel in Greenhouse:

- `Preview` is the generic non-`develop`, non-`main` runtime baseline
- `Staging` is the `develop` baseline
- `Production` is the `main` baseline

This means:

- branch previews must inherit a usable baseline without relying on `Preview (develop)` or another branch override
- branch-specific preview vars are temporary exceptions, not the canonical contract
- if a value is required for normal preview runtime across working branches, it belongs in generic `Preview`

Operational guardrail:

- when investigating new preview failures, check the effective env for an arbitrary branch before assuming code regression
- if a key only exists in `Preview (develop)` or `Preview (<branch>)` but is needed by ordinary previews, promote it to generic `Preview` and document the cleanup

### 5.3 May live in UI as a mirror

- current integration freshness
- current ops degradation
- “requires attention” summaries
- ownership and posture summaries

UI is an index, not the source of truth.

---

## 6. Control Families

The Cloud domain in Greenhouse is organized around six control families.

### 6.1 Delivery Validation

Goal:

- prevent unhealthy merges and deploys from being normalized

Primary task:

- `TASK-100`

### 6.2 Request/Runtime Protection

Goal:

- ensure cross-cutting platform protections are applied consistently

Primary tasks:

- `TASK-099`
- `TASK-101`

### 6.3 Observability and Incident Detection

Goal:

- detect failures within minutes and expose them in a stable ops surface

Primary task:

- `TASK-098`

### 6.4 Access and Secret Posture

Goal:

- keep credentials, trust boundaries and platform identity safe

Primary task:

- `TASK-096`

### 6.5 Data Runtime Resilience

Goal:

- ensure Cloud SQL can recover and can sustain serverless runtime pressure

Primary task:

- `TASK-102`

### 6.6 Cost and Capacity Guardrails

Goal:

- avoid accidental infrastructure cost explosions

Primary task:

- `TASK-103`

---

## 7. Mapping for TASK-100 to TASK-103

### 7.1 TASK-100 — CI Pipeline: Add Test Step

Institutional role:

- Cloud delivery validation baseline

What it hardens:

- merge gate quality before Vercel and cloud runtime are affected

Canonical output:

- `.github/workflows/ci.yml`

### 7.2 TASK-101 — Cron Auth Standardization

Institutional role:

- platform control-plane auth contract for scheduled execution

What it hardens:

- trust boundary around Vercel cron and internal scheduler-driven mutations

Canonical output:

- `src/lib/cron/require-cron-auth.ts`
- refactored cron routes

### 7.3 TASK-102 — Database Resilience Baseline

Institutional role:

- Cloud SQL resilience contract

What it hardens:

- recovery point, slow-query visibility, pool posture, restore confidence

Canonical output:

- Cloud SQL settings
- env posture
- restore verification notes

### 7.4 TASK-103 — GCP Budget Alerts & BigQuery Cost Guards

Institutional role:

- FinOps baseline for Greenhouse platform runtime

What it hardens:

- budget visibility
- accidental BigQuery cost spikes

Canonical output:

- billing budgets
- `src/lib/bigquery.ts` default guards
- explicit override conventions for heavy scripts

---

## 8. Recommended Execution Order for 100–103

If the goal is to build the base of the Cloud domain before deeper posture work:

1. `TASK-100`
2. `TASK-101`
3. `TASK-102`
4. `TASK-103`

Rationale:

- `TASK-100` turns quality checks into a real merge gate
- `TASK-101` secures the control plane used by cron-triggered runtime work
- `TASK-102` hardens the transactional backbone
- `TASK-103` closes cost visibility and guardrails

`TASK-098` and `TASK-099` remain critical to the full hardening track, but the base requested here for `100–103` is specifically:

- delivery validation
- scheduler trust
- data resilience
- FinOps guardrails

---

## 9. Ownership Rule

When a future task touches any of these themes, it should first decide whether the change belongs to:

- `Cloud` domain
- specialist module domain
- or both, with Cloud owning the platform contract and the specialist module owning the business behavior

Rule of thumb:

- if the concern is cross-cutting, posture-related, scheduler-related, deploy-related, resilience-related, or cost-related, it belongs to the Cloud domain
- if the concern changes business semantics inside a single module, it belongs to that specialist module

---

## 10. Success Criteria for TASK-122

`TASK-122` is considered successful when:

- the Cloud domain is explicitly institutionalized in documentation
- `Cloud & Integrations` and `Ops Health` are framed as surfaces of that domain
- `TASK-100` to `TASK-103` can be implemented without re-deciding ownership or scope boundaries
- future hardening work can point to this operating model instead of inventing a new framing every time

---

## 11. Revision History

| Date | Version | Author | Changes |
|---|---|---|---|
| 2026-03-29 | 1.0 | Codex | Initial operating model for Cloud as internal governance domain |
