# Plan — TASK-584 PostgreSQL Migration Tooling Hardening

## Delta 2026-04-23

- Scope reducido tras validar en sesión live que el tooling actual funciona fin-a-fin cuando la red no bloquea TLS en 3307. Las 2 migraciones pendientes (`20260423190340145_*`, `20260423190546748_*`) se aplicaron con `pnpm pg:connect:migrate` sin modificar ningún script.
- Diagnóstico corregido: el `ECONNRESET` previo fue un PMTUD blackhole corporativo en puerto 3307 (reproducible con `ping -D -s 1200`), no un problema de tooling split. `pnpm pg:doctor` via Cloud SQL Connector nativo falló idéntico, lo que descarta que "Connector-first" hubiera prevenido el bloqueo.

## Discovery summary

- `src/lib/postgres/client.ts` usa Cloud SQL Connector + Secret Manager como runtime canónico. **No se toca en esta task.**
- `scripts/migrate.ts` construye `DATABASE_URL` desde `GREENHOUSE_POSTGRES_HOST` y hace shell-out a `node-pg-migrate`. Funciona vía proxy local. **Solo se agrega clasificación de errores.**
- `scripts/generate-db-types.ts` depende de URL-based (upstream `kysely-codegen` lo exige). **Fuera de scope.**
- `scripts/pg-connect.sh` es el único punto donde hay valor real de endurecer: `set -e` + proxy background sin `trap` + `sleep 3` fijo + mensajes de error indistinguibles. **Foco aquí.**

## Access model

No aplica capa de `views` o `entitlements`.

- `routeGroups`: no aplica
- `views` / `authorizedViews`: no aplica
- `entitlements`: no aplica
- `startup policy`: no aplica
- Decisión de diseño: task puramente de plataforma/tooling PostgreSQL

## Skills

- Implementación backend/tooling: `greenhouse-backend`

## Subagent strategy

`main-thread`

- Write-set pequeño y concentrado (2 scripts + 1 doc). No hay valor en dividir.

## Execution order

1. Agregar `trap EXIT` y poll de `ready for new connections` en `pg-connect.sh`
2. Agregar preflight de red (ping DF-1200) con skip env var
3. Agregar prefijos de error `[ADC|PROXY|NETWORK|SQL]` en `pg-connect.sh` y `scripts/migrate.ts`
4. Documentar tabla de prefijos en `GREENHOUSE_DATABASE_TOOLING_V1.md`
5. Verificación: happy path + fallo simulado con `GREENHOUSE_FORCE_PREFLIGHT_FAIL=true`

## Files to create

- ninguno

## Files to modify

- `scripts/pg-connect.sh` — `trap EXIT`, poll del ready message, preflight de red, prefijos de error
- `scripts/migrate.ts` — prefijos de error consistentes con `pg-connect.sh`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — tabla prefijos → triage
- `Handoff.md` / `changelog.md` — si el contrato operativo visible cambia

## Files to delete

- ninguno

## Risk flags

- `trap EXIT` en bash sobrescribe trap previos — asegurar que no hay otro trap registrado antes
- Preflight con `ping -D` puede fallar en redes donde ICMP está bloqueado pero TCP 3307 funciona (poco común para Cloud SQL via proxy, pero posible) — por eso el `GREENHOUSE_SKIP_PREFLIGHT=true` escape hatch
- Cambiar mensajes de error puede romper scripts/CI que parsean stdout — hoy no hay consumers conocidos; buscar con `grep` antes de shipping

## Open questions

- ninguna — scope cerrado
