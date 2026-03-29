# TASK-122 - Cloud Governance Layer Institutionalization

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `48`
- Domain: `platform / cloud`

## Summary

Institucionalizar `Cloud` como una capa interna de governance y platform operations dentro de Greenhouse, con ownership explícito, contratos técnicos compartidos y surfaces coherentes en `Admin Center`, para que el track de hardening (`TASK-096`, `TASK-098` a `TASK-103`) deje de vivir como fixes sueltos y pase a un dominio operativo reconocible.

## Why This Task Exists

El repo ya tiene una realidad de plataforma que no es marginal:

- Vercel con cron jobs y deployment environments
- Google Cloud con Cloud SQL, BigQuery, Cloud Run, Cloud Scheduler y Storage
- secrets, cron auth, health checks, budgets, pool sizing y resiliencia de base

Ese dominio ya existe técnicamente, pero hoy está fragmentado entre:

- tasks de hardening (`TASK-096`, `TASK-098` a `TASK-103`)
- surfaces parciales (`/admin/cloud-integrations`, `/admin/ops-health`)
- helpers dispersos (`cron`, `postgres`, `bigquery`, health checks)
- runbooks y arquitectura sin una lane institucional única de producto interno

Si no se institucionaliza, el trabajo de hardening se ejecuta como deuda puntual y vuelve a dispersarse. Si se institucionaliza, Greenhouse gana una capa explícita de `platform governance` para cloud posture, integrations health, runtime resilience y cost controls.

## Goal

- Definir `Cloud` como dominio interno explícito de plataforma y governance
- Alinear `Cloud & Integrations` y `Ops Health` bajo un framing operativo común
- Traducir el track `TASK-096`, `TASK-098` a `TASK-103` a una capability institucional y no solo a hardening ad hoc
- Dejar contratos, ownership y surfaces claros para futuras tasks de posture, observabilidad y FinOps

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- `Cloud` se institucionaliza como capa interna de platform governance, no como módulo client-facing
- La capa no debe duplicar módulos especialistas; debe indexarlos, gobernarlos y exponer health/posture/costos compartidos
- Los cambios de posture real deben seguir expresados en código, env vars versionadas, scripts o runbooks verificables; no depender de consola opaca sin reflejo documental
- `Cloud & Integrations` y `Ops Health` pueden convivir como surfaces separadas, pero deben responder a un mismo dominio institucional

## Dependencies & Impact

### Depends on

- `TASK-108` - Admin Center Governance Shell
- `TASK-111` - Admin Center Secret Ref Governance UI
- `TASK-112` - Admin Center Integration Health and Freshness UI
- `TASK-113` - Admin Center Ops Audit Trail UI
- `TASK-096` - GCP Secret Management & Security Hardening
- `TASK-098` - Observability MVP
- `TASK-099` - Security Headers & Next.js Middleware
- `TASK-100` - CI Pipeline: Add Test Step
- `TASK-101` - Cron Auth Standardization
- `TASK-102` - Database Resilience Baseline
- `TASK-103` - GCP Budget Alerts & BigQuery Cost Guards

### Impacts to

- `Admin Center`
- `/admin/cloud-integrations`
- `/admin/ops-health`
- framing del backlog de hardening cloud
- ownership de secrets, cron, health, Cloud SQL, BigQuery, budgets y alerting

### Files owned

- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/tasks/to-do/TASK-096-gcp-secret-management-security-hardening.md`
- `docs/tasks/to-do/TASK-098-observability-mvp.md`
- `docs/tasks/to-do/TASK-099-security-headers-middleware.md`
- `docs/tasks/to-do/TASK-100-ci-pipeline-test-step.md`
- `docs/tasks/to-do/TASK-101-cron-auth-standardization.md`
- `docs/tasks/to-do/TASK-102-database-resilience-baseline.md`
- `docs/tasks/to-do/TASK-103-gcp-budget-alerts-bigquery-guards.md`
- `src/views/greenhouse/admin/**`

## Current Repo State

### Ya existe

- `Admin Center` ya reconoce `Cloud & Integrations` y `Ops Health` como surfaces de governance
- existe arquitectura canónica para cloud posture en `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- el track `TASK-096`, `TASK-098` a `TASK-103` ya describe un cuerpo coherente de trabajo sobre secrets, auth, observability, DB resilience y costos

### Gap actual

- no existe una task umbrella que institucionalice `Cloud` como capability interna
- el backlog de posture sigue viéndose como fixes aislados y no como una capa operativa única
- no está definido del todo qué pertenece a `Cloud & Integrations`, qué pertenece a `Ops Health` y qué debe quedar como library/runbook/platform contract

## Scope

### Slice 1 - Domain framing

- definir el dominio `Cloud` como capability interna de platform governance
- documentar su boundary frente a `Admin Center`, `Cloud & Integrations`, `Ops Health` y módulos especialistas
- dejar explícito el ownership del track `TASK-096`, `TASK-098` a `TASK-103`

### Slice 2 - Surface model

- proponer taxonomía estable para surfaces internas:
  - `Cloud & Integrations`
  - `Ops Health`
  - posture / security
  - resilience / data runtime
  - cost / FinOps
- decidir qué señales viven en UI y cuáles quedan como runbook o config

### Slice 3 - Technical contracts

- definir helpers/capas compartidas esperadas para cron auth, health, budgets, BigQuery guards y Cloud SQL posture
- dejar claro qué capacidades deben materializarse en código, env management y scripts versionados
- documentar cómo las mini-tasks `096`, `098` a `103` se agrupan bajo este dominio

### Slice 4 - Backlog reframe

- actualizar las tasks relacionadas para que referencien la capa Cloud institucional
- ajustar el índice para reflejar que el hardening cloud responde a una misma capability
- dejar follow-ups claros si aparece una futura lane de UI/admin adicional

## Out of Scope

- implementar en esta task todos los slices técnicos de `TASK-096` a `TASK-103`
- crear un módulo client-facing nuevo
- reescribir completamente `Admin Center`
- hacer observabilidad enterprise pesada tipo Datadog/New Relic/OpenTelemetry como baseline obligatoria

## Acceptance Criteria

- [ ] Existe una task canónica que institucionaliza `Cloud` como dominio interno de governance/plataforma
- [ ] El boundary entre `Cloud & Integrations`, `Ops Health` y el resto de `Admin Center` queda explícito
- [ ] `TASK-096`, `TASK-098`, `TASK-099`, `TASK-100`, `TASK-101`, `TASK-102` y `TASK-103` quedan referenciadas como slices del dominio Cloud
- [ ] Queda documentado qué parte de la capa Cloud vive en UI, qué parte vive en contracts/helpers y qué parte en runbooks/config
- [ ] El índice de tasks y el registry reflejan la nueva lane sin pisar tasks activas existentes

## Verification

- Revisión documental cruzada de:
  - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Validación de coherencia de backlog:
  - `TASK-096`, `TASK-098` a `TASK-103` siguen existiendo como lanes ejecutables
  - `TASK-122` funciona como umbrella institucional y no duplica implementación
