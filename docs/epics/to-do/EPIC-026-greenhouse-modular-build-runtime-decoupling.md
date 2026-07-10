# EPIC-026 — Greenhouse Modular Build & Runtime Decoupling

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Evidence gate conditional-go — Roadmap projection experiment pendiente`
- Rank: `TBD`
- Domain: `platform|ops|cross-domain`
- Owner: `unassigned`
- Branch: `epic/EPIC-026-greenhouse-modular-build-runtime-decoupling`
- GitHub Issue: `none`

## Summary

Coordinar la evolución incremental de Greenhouse desde una única gran aplicación Next.js hacia un modular monorepo con unidades desplegables medibles, conservando un modular monolith de dominio/datos y todos los contratos de seguridad, Full API Parity y operación vigentes.

## Why This Epic Exists

El grafo actual concentra aproximadamente 1.225 entrypoints y requiere mitigaciones de memoria cercanas al techo estándar de Vercel. El costo y la lentitud local ya no se resuelven responsablemente con una sola optimización ni con una reorganización de carpetas. El programa cruza build tooling, arquitectura, auth, routing, release, observabilidad y developer experience; por eso no cabe en una task aislada.

## Outcome

- Baseline reproducible de costo, duración, memoria y fanout del build actual.
- Dependency graph gobernado y fronteras de aplicación sustentadas por evidencia.
- Primera extracción piloto reversible con reducción demostrada de build/TCO.
- Local DX con checks afectados y un camino full-stack explícito.
- Release, observabilidad y rollback compatibles con múltiples unidades desplegables.
- Decisión explícita de continuar, pausar o detener el desacople tras el piloto.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_MODULAR_BUILD_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Child Tasks

- `TASK-1376` ✅ evidence complete — baseline cuantitativo, dependency graph y veredicto `conditional-go`; cierre documental en curso.
- `TASK-1377` ✅ — enforcement extraction-ready completado en templates, skills Codex/Claude repo/equipo/globales, hooks y task/ops lint; matriz de cobertura auditada.
- `TASK-1379` propuesto, no registrado — experimento A/B de materialización del índice Roadmap; requiere confirmación del operador.
- `TBD` — workspace foundation + dependency-boundary enforcement.
- `TBD` — extracción piloto seleccionada por `TASK-1376`.
- `TBD` — routing/auth/release/observability multi-app.
- `TBD` — rebaseline post-piloto y decisión continue/pause/stop.

## Existing Related Work

- `next.config.ts` — heap/workers/Sentry y output tracing vigentes.
- `scripts/run-next-build.mjs` — build aislado y heap ceiling.
- `scripts/ci/vercel-ignore-build.mjs` — skip docs-only vigente.
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md` — flujo local-first.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — topología Vercel/Cloud Run/Cloud SQL.
- `docs/tasks/complete/TASK-241-batch-processes-cloud-run-migration.md` — precedente de workload placement.
- `docs/tasks/complete/TASK-931-github-actions-cost-signal-preserving-ci-optimization.md` — guardrails de costo CI.

## Exit Criteria

- [ ] Existe baseline before/after reproducible para costo, tiempo, memoria y output de build.
- [ ] El ADR modular está `Accepted`, `Rejected` o `Deprecated` con evidencia; no queda indefinidamente `Proposed`.
- [ ] Las fronteras de paquetes y aplicaciones están mecanizadas y no dependen solo de convenciones escritas.
- [ ] Al menos una unidad piloto fue extraída y verificada, o existe un `no-go` documentado que demuestra que no conviene.
- [ ] Auth, routing, contracts, version skew, observabilidad, release y rollback están cerrados para cualquier unidad extraída.
- [ ] El costo total post-cambio, incluido overhead operacional, mejora frente al baseline o el programa se detiene.
- [ ] La experiencia local permite checks afectados y conserva un gate integral reproducible.
- [ ] El contrato transicional para construir features nuevas fue reemplazado por ownership real o retirado explícitamente al cerrar el epic.

## Non-goals

- Reescritura big-bang.
- Microservicios, microfrontends o multirepo por dominio.
- Split de Cloud SQL/PostgreSQL.
- Migración del portal fuera de Vercel.
- Cambio de framework, design system o modelo multi-tenant.
- Extraer unidades solo para alcanzar una topología simétrica.

## Delta 2026-07-10

Epic creado junto con ADR, arquitectura objetivo y `TASK-1376`. El primer gate es evidencia; ninguna reorganización de workspace queda autorizada todavía.

TASK-1376 emitió `conditional-go`: local clean p50 138 s; warm p50/p95 102/124 s y RSS p95 7,51 GB; Vercel Ready p50/p95 4/7 min en ventana corta; Billing FOCUS unavailable. El hotspot probado es Roadmap: tres traces con 2.493 Markdown y artifacts analyzer de 8,83–9,61 MB. Primer experimento propuesto: TASK-1379; `apps/*`, `packages/*` y nuevos deployables siguen bloqueados.
