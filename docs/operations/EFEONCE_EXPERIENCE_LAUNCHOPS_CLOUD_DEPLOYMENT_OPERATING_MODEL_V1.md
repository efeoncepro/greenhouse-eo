# Efeonce Experience LaunchOps — Cloud & Deployment Operating Model V1

> **Status:** Proposed / pilot gate
> **Date:** 2026-07-26
> **Owner:** Architecture + Cloud/Platform + Wave Operations

> **Placement decision:** [`EFEONCE_EXPERIENCE_LAUNCHOPS_CLOUD_PLACEMENT_DECISION_V1.md`](../architecture/EFEONCE_EXPERIENCE_LAUNCHOPS_CLOUD_PLACEMENT_DECISION_V1.md)

## 1. Principle

Cloud is an implementation rail, not the product promise. The deployment model must support client isolation,
approved data locations, controlled promotion, recovery and transparent cost attribution.

The default Efeonce/Wave placement is a dedicated GCP project. Azure and AWS are supported through the portable
Execution Runner and future client-controlled/private deployment modes; shared Greenhouse infrastructure is not the
commercial product baseline.

## 2. Environment model

- `local`: synthetic data and provider mocks where possible.
- `validation`: contract, security and adapter tests.
- `staging`: client-like integration, preview and release rehearsal.
- `production`: approved tenant scope, monitored and reversible.

Promotion is artifact-based and environment-specific configuration is resolved from approved secret/config stores.
No credentials or client data are committed to source or exposed to frontend code.

## 3. Deployment requirements

- IaC for infrastructure and policy; reviewed changes only.
- Immutable build artifacts and provenance.
- Separate service identities by environment and capability.
- Secret references, rotation owner and recovery procedure.
- Database migrations additive, reversible where feasible and backed up before risky change.
- Adapter contract and external API health checks.
- Feature flags default safe/off for new mutation paths.
- Release record with version, approver, target, evidence and rollback reference.

## 4. Resilience and recovery

The pilot must define service-specific RTO/RPO with the client. At minimum:

- exportable launch/evidence state;
- backup and restore verification;
- provider outage/manual fallback procedure;
- CMS rollback or remediation path;
- credential revocation and rotation;
- incident communication owner;
- recovery evidence, not merely a written intention.

## 5. FinOps

Meter infrastructure, model/provider calls, storage, external API usage, human review and support. Report cost per
launch and p50/p95 variance. Stop-loss applies to runaway retries, model calls, storage growth and failed releases.

## 6. Cloud acceptance gates

- Client residency and subprocessor requirements mapped.
- Environment and access matrix approved.
- Backup/restore and rollback rehearsal completed for pilot scope.
- Observability and alert ownership defined.
- Cost budget and anomaly threshold configured.
