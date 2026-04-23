# TASK-584 — PostgreSQL Migration Tooling Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-584-postgres-migration-tooling-hardening`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Endurecer el carril de migraciones PostgreSQL para que `pnpm migrate:up`, `pnpm migrate:status` y `pnpm db:generate-types` no dependan de un proxy global frágil en `127.0.0.1:15432` ni de un estado residual del shell. La task debe alinear el tooling con el runtime canónico de Greenhouse y cerrar el bloqueo operativo que dejó migraciones creadas pero no aplicadas.

## Why This Task Exists

La arquitectura vigente declara Cloud SQL Connector como camino preferido para entornos Node.js, pero el repo todavía mantiene un split operativo:

- `scripts/migrate.ts` depende de `DATABASE_URL` construido desde `GREENHOUSE_POSTGRES_HOST`
- `scripts/generate-db-types.ts` depende de conexión URL-based manual
- `scripts/pg-connect.sh` asume un proxy global externo y puerto fijo `15432`

Ese desalineamiento ya produjo fallos reales:

- `pnpm pg:connect:migrate` cayó con `FAIL:read ECONNRESET`
- `pnpm migrate:up` luego cayó con `ECONNREFUSED 127.0.0.1:15432`
- quedaron migraciones creadas pero no aplicadas y `src/types/db.d.ts` sin regenerar

## Goal

- Hacer que las migraciones sean autosuficientes y connector-first
- Hacer que la generación de tipos use un carril autocontenido sin proxy global residual
- Aplicar las migraciones pendientes y dejar `src/types/db.d.ts` sincronizado con la base real

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- El runtime canónico de Greenhouse sigue siendo `src/lib/postgres/client.ts`; no crear un carril paralelo de conexión ad hoc
- Las migraciones siguen siendo SQL-first vía `node-pg-migrate`; nunca crear archivos a mano ni renombrar timestamps

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `AGENTS.md`

## Dependencies & Impact

### Depends on

- `scripts/migrate.ts`
- `scripts/generate-db-types.ts`
- `scripts/pg-connect.sh`
- `scripts/lib/load-greenhouse-tool-env.ts`
- `src/lib/postgres/client.ts`
- `migrations/20260423190340145_service-attribution-runtime-writer-hardening.sql`
- `migrations/20260423190546748_reactive-error-classification-observability.sql`

### Blocks / Impacts

- todas las tasks que requieran `pnpm migrate:up` o regenerar `src/types/db.d.ts`
- el cierre operativo del hardening de `service_attribution`
- la confiabilidad de `pnpm pg:doctor`, `pnpm pg:connect:*` y tooling DB local/agent

### Files owned

- `scripts/migrate.ts`
- `scripts/generate-db-types.ts`
- `scripts/pg-connect.sh`
- `scripts/lib/load-greenhouse-tool-env.ts`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

## Current Repo State

### Already exists

- `src/lib/postgres/client.ts` ya usa Cloud SQL Connector + Secret Manager como carril runtime canónico
- `scripts/migrate.ts` ya centraliza `node-pg-migrate`, pero todavía shell-out a CLI con `DATABASE_URL`
- `scripts/generate-db-types.ts` ya encapsula `kysely-codegen`, pero depende de host/puerto URL-based
- `scripts/pg-connect.sh` ya automatiza ADC + proxy + operación interactiva

### Gap

- las migraciones no son autosuficientes: dependen de `GREENHOUSE_POSTGRES_HOST` y de un proxy global sano
- el codegen no se autoprovisiona conectividad ni limpia su túnel
- el repo documenta Connector-first, pero el tooling de DB todavía opera proxy-first

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Migration runner connector-first

- refactorizar `scripts/migrate.ts` para que `up`, `down` y `status` corran sin depender de `127.0.0.1:15432`
- reutilizar el modelo de credenciales/perfiles existente y conectividad Cloud SQL segura sin abrir un `Pool` nuevo en app code
- preservar `create` vía `pnpm migrate:create <nombre>` sin cambiar el contrato de timestamps SQL-first

### Slice 2 — Codegen autocontenido

- endurecer `scripts/generate-db-types.ts` para que resuelva su propia conectividad efímera y no requiera un proxy previamente levantado
- evitar puerto fijo global para el carril automático de codegen
- garantizar cleanup explícito del túnel/proxy temporal aunque falle `kysely-codegen`

### Slice 3 — Operación, docs y cierre del bloqueo

- convertir `scripts/pg-connect.sh` en un carril interactivo coherente con el tooling nuevo, sin seguir siendo precondición oculta de migraciones automáticas
- actualizar la documentación arquitectónica y operativa afectada
- aplicar las migraciones pendientes y regenerar `src/types/db.d.ts`

## Out of Scope

- cambiar el runtime del portal fuera de `src/lib/postgres/client.ts`
- reemplazar `kysely-codegen` por otra herramienta
- reabrir migraciones ya aplicadas o renombrar timestamps existentes

## Detailed Spec

La implementación debe converger sobre este contrato operativo:

- `pnpm migrate:up`, `pnpm migrate:down` y `pnpm migrate:status` funcionan sin depender de un proxy global preexistente
- `pnpm db:generate-types` funciona con conectividad efímera autocontenida y cleanup garantizado
- `pnpm pg:connect`, `pnpm pg:connect:status` y `pnpm pg:connect:shell` quedan como carriles interactivos/manuales, no como dependencia obligatoria del path automático
- si el entorno local tiene tanto `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` como `GREENHOUSE_POSTGRES_HOST`, el tooling no debe mezclar silenciosamente dos posturas incompatibles
- la salida de error debe distinguir fallos de ADC/Connector, fallos de proxy y fallos SQL reales

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pnpm migrate:status` y `pnpm migrate:up` funcionan sin depender de un proxy global residual en `127.0.0.1:15432`
- [ ] `pnpm db:generate-types` corre con conectividad autocontenida y deja `src/types/db.d.ts` sincronizado con la base real
- [ ] las migraciones `20260423190340145_service-attribution-runtime-writer-hardening.sql` y `20260423190546748_reactive-error-classification-observability.sql` quedan aplicadas
- [ ] la documentación deja explícita la separación entre carril automático y carril interactivo

## Verification

- `pnpm pg:doctor`
- `pnpm migrate:status`
- `pnpm migrate:up`
- `pnpm db:generate-types`
- `pnpm lint`
- `pnpm build`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `src/types/db.d.ts` se comitea junto con las migraciones aplicadas si el schema cambió

## Follow-ups

- revisar si `scripts/pg-doctor.ts` debe endurecer sus mensajes cuando detecta mezcla `instanceConnectionName + host/proxy`
- evaluar si otros scripts de backfill/setup deben converger sobre el mismo helper de conectividad efímera

## Open Questions

- confirmar en discovery si `node-pg-migrate` debe converger sobre API programática directa con `dbClient` o sobre `databaseUrl` construido desde un helper connector-aware
