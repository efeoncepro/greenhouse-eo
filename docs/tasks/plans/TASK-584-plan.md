# Plan — TASK-584 PostgreSQL Migration Tooling Hardening

## Discovery summary

- El runtime canónico ya existe en `src/lib/postgres/client.ts` y usa Cloud SQL Connector con prioridad sobre `GREENHOUSE_POSTGRES_HOST`.
- `scripts/migrate.ts` todavía shell-out a `node-pg-migrate` CLI con `DATABASE_URL`, por lo que depende de `GREENHOUSE_POSTGRES_HOST` aunque el runtime del repo no lo haga.
- `scripts/generate-db-types.ts` también depende de `DATABASE_URL` y hoy asume un host/puerto listos; no autoprovisiona conectividad.
- `scripts/pg-connect.sh` levanta un proxy global en `127.0.0.1:15432`, mata procesos previos y luego delega; ese patrón explica que después de `ECONNRESET` el siguiente comando caiga en `ECONNREFUSED`.
- En este entorno coexistían `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` y `GREENHOUSE_POSTGRES_HOST=127.0.0.1`, lo que parte el repo entre carril Connector-first y carril proxy-first.
- `pnpm pg:doctor` y una prueba directa con Connector también expiraron por timeout; no basta con “volver a correr migraciones”, hay que sanear el tooling y luego revalidar la conectividad real.

## Access model

No aplica capa de `views` o `entitlements`.

- `routeGroups`: no aplica
- `views` / `authorizedViews`: no aplica
- `entitlements`: no aplica
- `startup policy`: no aplica
- Decision de diseño: task puramente de plataforma/tooling PostgreSQL

## Skills

- Task creation: `greenhouse-task-planner`
- Implementación backend/tooling: `greenhouse-agent`

## Subagent strategy

`fork`

- Subagente exploró el carril actual de migraciones y confirmó el split entre runtime Connector-first y tooling proxy-first.
- El hilo principal ejecuta los cambios porque el write-set está concentrado en `scripts/` y `docs/`.

## Execution order

1. Crear helper compartido de conectividad para tooling DB
2. Refactorizar `scripts/migrate.ts` a carril autosuficiente sin proxy global residual
3. Refactorizar `scripts/generate-db-types.ts` para codegen con conectividad efímera autocontenida
4. Simplificar `scripts/pg-connect.sh` a carril interactivo coherente
5. Actualizar docs y handoff
6. Aplicar migraciones pendientes y regenerar `src/types/db.d.ts`
7. Correr validaciones técnicas

## Files to create

- `scripts/lib/[verificar]-postgres-tooling-connection.ts`

## Files to modify

- `scripts/migrate.ts` — eliminar dependencia rígida de `DATABASE_URL` + proxy global
- `scripts/generate-db-types.ts` — autoprovisionar conectividad efímera
- `scripts/pg-connect.sh` — dejarlo como carril interactivo/manual coherente
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — actualizar contrato
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — alinear postura operativa
- `Handoff.md` — registrar hallazgos y validación
- `changelog.md` / `project_context.md` — si el contrato operativo visible cambia

## Files to delete

- ninguno previsto

## Risk flags

- `node-pg-migrate` sigue siendo SQL-first y no se debe romper `migrate:create`
- `kysely-codegen` todavía exige URL-based connection, así que el carril de codegen probablemente necesite un helper diferente al de migraciones
- el entorno local también mostró fallos de conectividad reales; puede ser necesario corregir ADC/proxy/Connector además del código

## Open questions

- si la API programática instalada de `node-pg-migrate@8.0.4` soporta el flujo exacto con `dbClient` y migrations SQL tal como el repo las usa
- si conviene usar un socket local efímero vía Connector o un proxy TCP efímero para `kysely-codegen` en este entorno
