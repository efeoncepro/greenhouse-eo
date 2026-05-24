# TASK-928 — Reliability/Admin N+1 batching and request cache

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Diseno derivado de auditoria Sentry semanal 2026-05-24`
- Rank: `TBD`
- Domain: `platform|reliability|performance|payroll`
- Blocked by: `none`
- Branch: `task/TASK-928-reliability-admin-n-plus-one-batching`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Eliminar los N+1 reales reportados por Sentry en `/admin/ops-health`, `/admin/integrations`, `/admin/views`, `/hr/payroll*` y synthetic cron. El objetivo no es mutear performance issues, sino reducir las consultas repetidas con batching, cache request-scoped y readers agregados medibles.

## Why This Task Exists

El reporte semanal Sentry `2026-05-15` a `2026-05-22` mostro issues N+1 ongoing/escalating. En esta sesion se corrigio solo el N+1 mas acotado del synthetic cron (`recordProbeResults()` bulk insert). Quedan rutas admin/payroll compartidas donde silenciar Sentry esconderia latencia y carga innecesaria sobre Postgres.

## Goal

- Agrupar consultas repetidas de health signals, locale, table presence y view metadata.
- Introducir cache request-scoped para lecturas comunes dentro de una misma request.
- Mantener Sentry performance activo hasta verificar caida real post-deploy.
- Agregar tests que prueben conteo de queries o readers agregados, no solo snapshots.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/audits/sentry/SENTRY_WEEKLY_REMEDIATION_AUDIT_2026-05-24.md`

Reglas obligatorias:

- No bajar sampling ni cambiar fingerprints Sentry para esconder N+1.
- No crear pools nuevos ni readers paralelos fuera del access model canonico.
- No meter cache global cross-request sin invalidacion clara; V1 es request-scoped.
- Medir antes/despues con Sentry y/o tests de query count.

## Normative Docs

- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- Bulk insert synthetic ya implementado localmente en `src/lib/reliability/synthetic/persist.ts`.

### Blocks / Impacts

- Reduce ruido y carga de `/admin/operations`.
- Mejora latencia de rutas admin y payroll sin cambiar UX.

### Files owned

- `src/app/(dashboard)/admin/**`
- `src/app/api/admin/**`
- `src/lib/reliability/**`
- `src/lib/platform-health/**`
- `src/lib/payroll/**`
- `tests/**`

## Current Repo State

### Already exists

- Readers de reliability overview y admin health.
- Sentry performance issues detectando N+1.
- Synthetic cron bulk insert implementado como primer slice acotado.

### Gap

- Admin/integrations/views y payroll siguen haciendo lecturas repetidas por request.
- No hay request cache canonica para health/locale/table-presence compartidos.

## Scope

### Slice 1 — Query inventory and baseline

- Mapear cada issue Sentry N+1 a route, reader y query repetida.
- Registrar baseline antes de cambios con issue IDs y conteo aproximado.

### Slice 2 — Request-scoped cache primitive

- Crear una primitiva liviana request-scoped para lecturas idempotentes dentro de server requests.
- No usar cache global salvo TTL e invalidacion justificados por dominio.

### Slice 3 — Admin health/integrations/views batching

- Reemplazar loops con readers agregados para health signals, integration status y view metadata.
- Preservar degradacion honesta si una lectura falla.

### Slice 4 — Payroll locale/read batching

- Agrupar lecturas repetidas en `/hr/payroll*`, especialmente locale/config comun.
- Asegurar que cambios de calendario/payroll no queden cacheados fuera de request.

### Slice 5 — Verification and Sentry closeout

- Tests focales de query count o mocks de reader.
- Post-deploy: validar caida en Sentry por 24-48h antes de resolver issues.

## Out of Scope

- Cambios visuales en dashboards admin/payroll.
- Cambios de schema salvo que el baseline demuestre que un indice additive es necesario.
- Cerrar issues Sentry antes de evidencia runtime.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 -> Slice 2 -> Slice 3/4 -> Slice 5. No cerrar Sentry antes de Slice 5 post-deploy.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cache stale dentro de request larga | admin/payroll | low | cache request-scoped solamente | tests + Sentry perf |
| Reader agregado cambia semantica parcial | reliability | medium | preservar estados degraded por item | unit tests por reader |
| Aumento accidental de blast radius | platform | medium | PR pequeno por ruta si discovery lo exige | `pnpm test` focal + Sentry |

### Feature flags / cutover

Sin flag para refactors internos request-scoped y readers agregados. Si aparece un cambio de serving compartido o cache cross-request, agregar flag explicitamente antes de implementarlo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | doc-only | inmediato | si |
| 2 | revert PR | <10 min | si |
| 3 | revert PR o route-level reader fallback | <15 min | si |
| 4 | revert PR | <15 min | si |
| 5 | no runtime | inmediato | si |

### Production verification sequence

1. `pnpm pg:doctor`.
2. Tests focales de reliability/admin/payroll.
3. `pnpm lint`.
4. `pnpm build`.
5. Deploy.
6. Revisar Sentry performance 24-48h; solo entonces resolver issues que no recurran.

## Verification

- `pnpm exec vitest run <tests focales>`
- `pnpm lint`
- `pnpm build`
- Sentry performance post-deploy.
