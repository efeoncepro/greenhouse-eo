# Plan — TASK-810 Engagement Anti-Zombie DB Guard

## Discovery Summary

- TASK-801, TASK-803 y TASK-809 estan cerradas en `develop`.
- Runtime real confirma `greenhouse_core.services.engagement_kind`, `greenhouse_commercial.engagement_outcomes` y la UI/API `/agency/sample-sprints`.
- `pg:doctor` esta sano y el preflight live 120d retorna `0` violations.
- Drift material: el SQL original usa `EXISTS` dentro de un `CHECK`, lo que PostgreSQL no permite. El guard correcto es trigger `BEFORE INSERT OR UPDATE` con `ERRCODE check_violation`.
- Drift menor: `services` no tiene `client_id`; reportes deben usar `space_id` y `organization_id`.

## Access Model

- `routeGroups`: sin cambios.
- `views` / `authorizedViews`: sin cambios.
- `entitlements`: sin cambios.
- `startup policy`: sin cambios.
- Decision: el enforcement vive en DB; la resolucion operativa vive en la UI existente `/agency/sample-sprints/[serviceId]/outcome` y sus entitlements TASK-809.

## Skills

- `greenhouse-agent`: backend Greenhouse, migraciones y docs vivas.
- `greenhouse-task-planner`: lifecycle y plan TASK-###.

## Subagent Strategy

Sequential. La task es pequena, DDL-centric y acoplada al runtime real de Postgres.

## Execution Order

1. Sincronizar lifecycle a `in-progress` en task, README, registry y handoff.
2. Crear migracion con `pnpm migrate:create`.
3. Implementar function + trigger anti-zombie en `greenhouse_core.services`.
4. Crear `scripts/commercial/preflight-zombie-check.ts`.
5. Agregar tests focales para el preflight script y SQL smoke runtime.
6. Actualizar reliability signal, arquitectura, runbook, docs funcionales/manuales si cambia la operacion.
7. Ejecutar migracion y verificacion.
8. Cerrar lifecycle a `complete`, actualizar docs vivas, commit y push.

## Files To Create

- `migrations/*_task-810-engagement-anti-zombie-trigger.sql`
- `scripts/commercial/preflight-zombie-check.ts`
- `scripts/__tests__/preflight-zombie-check.test.ts`
- `docs/operations/runbooks/engagement-zombie-handling.md`

## Files To Modify

- `src/lib/reliability/queries/engagement-zombie.ts` — evidencia/runbook actualizado.
- `docs/architecture/GREENHOUSE_PILOT_ENGAGEMENT_ARCHITECTURE_V1.md` — delta TASK-810 corrigiendo CHECK -> trigger.
- `docs/tasks/in-progress/TASK-810-engagement-anti-zombie-check-constraint.md` — drift y lifecycle.
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md`, `project_context.md`, `changelog.md`.
- `docs/documentation/comercial/sample-sprints.md`, `docs/manual-de-uso/comercial/sample-sprints.md` — nota operacional anti-zombie.

## Risk Flags

- DDL sobre `greenhouse_core.services`.
- Trigger puede bloquear updates operativos si el predicado no alinea con el health signal.
- La task original hablaba de CHECK; el mecanismo cambia por limitacion real de Postgres, preservando el objetivo funcional.

## Open Questions

- Ninguna bloqueante. La decision CHECK -> trigger queda resuelta por runtime/PostgreSQL.
