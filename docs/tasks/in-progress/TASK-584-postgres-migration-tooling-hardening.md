# TASK-584 — PostgreSQL Migration Tooling Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-584-postgres-migration-tooling-hardening`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Delta 2026-04-23

- Prioridad bajada P1 → P2, Impact Alto → Medio, Effort Medio → Bajo tras reevaluar: no hay feature bloqueada y el workaround inmediato cabe en una línea (`lsof -ti:15432 | xargs kill -9 && pnpm pg:connect:migrate`)
- Diagnóstico corregido: el `ECONNRESET` que bloqueó la sesión previa fue network-level (PMTUD blackhole corporativo en puerto 3307), confirmado porque `pnpm pg:doctor` — que usa Cloud SQL Connector nativo — falló idéntico con handshake TLS timeout. Ningún refactor Connector-first lo hubiera evitado
- Cambio de red (hotspot) destapó el path; `pnpm pg:connect:migrate` con el tooling ACTUAL aplicó las 2 migraciones limpias y regeneró `src/types/db.d.ts`
- Scope reducido: descartado el refactor de `kysely-codegen` Connector-first (upstream exige URL-based, poca ganancia, alto mantenimiento). Foco queda en robustecer `pg-connect.sh` + preflight de red + mensajes de error distinguidos

## Summary

Endurecer `scripts/pg-connect.sh` y `scripts/migrate.ts` para que (a) no dejen proxies zombie tras un fallo, (b) detecten temprano problemas de red y los reporten con claridad, y (c) distingan entre fallos de ADC, proxy, SQL y path de red en los mensajes. Objetivo: que un agente o dev nuevo no pierda tiempo diagnosticando handshakes TLS silenciosos cuando la causa es PMTUD, proxy muerto o ADC expirada.

## Why This Task Exists

Dos hallazgos concretos de la sesión de 2026-04-23:

1. **Shell residue**: `pg-connect.sh` corre con `set -e` y spawns proxy con `&` sin `trap EXIT`. Si `test_connection` falla, el script muere pero el proxy queda (o muere a medias), y el siguiente `pnpm migrate:up` hace `ECONNREFUSED 127.0.0.1:15432` porque no hay forma de saber que el proxy anterior quedó mal
2. **Errores opacos**: un handshake TLS que timeouts después de 30s se propaga como `ECONNRESET` en pg client, que es indistinguible de "proxy cayó" o "credencial mala". Sin clasificación, la cadena de diagnóstico real (red → puerto 3307 → TLS → MTU → middlebox corporativo) tomó 30+ minutos

Lo que **no** es problema de tooling (y por eso sale de scope):

- `scripts/migrate.ts` usa URL via proxy local — funciona y es compatible con `node-pg-migrate` CLI. El split con el runtime Connector-first es cosmético para un script que corre ~semanalmente
- `scripts/generate-db-types.ts` depende de URL porque `kysely-codegen` lo exige upstream — no es algo que el repo deba pelear

## Goal

- `pg-connect.sh` limpia sus propios proxies con `trap EXIT` (no deja zombies tras un fail)
- `pg-connect.sh` corre un preflight de red (`ping -D -s 1200` a la IP de Cloud SQL) antes de levantar proxy, y si falla da mensaje accionable ("tu red bloquea TLS fuera de 443; cambia red o usa Cloud Shell")
- Los errores de `pg-connect.sh` y `migrate.ts` distinguen: fallo ADC, fallo arranque proxy, fallo handshake/red, fallo SQL real

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

- `scripts/pg-connect.sh`
- `scripts/migrate.ts`
- `scripts/lib/load-greenhouse-tool-env.ts`

### Blocks / Impacts

- UX de agentes y devs nuevos al diagnosticar fallos de conectividad local
- No bloquea features ni deploys — el path happy-path ya funciona con el tooling actual

### Files owned

- `scripts/pg-connect.sh`
- `scripts/migrate.ts`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

## Current Repo State

### Already exists

- `src/lib/postgres/client.ts` usa Cloud SQL Connector + Secret Manager como runtime canónico — fuera de scope
- `scripts/migrate.ts` usa URL via proxy local y `node-pg-migrate` CLI — funcional, queda
- `scripts/generate-db-types.ts` usa `kysely-codegen` con URL-based — queda, upstream lo exige
- `scripts/pg-connect.sh` automatiza ADC + proxy + op, **sin `trap EXIT` ni preflight de red ni clasificación de errores**

### Gap

- `pg-connect.sh` deja proxies zombie o mal-muertos cuando `test_connection` falla con `set -e` activo
- No hay preflight de red: un PMTUD blackhole se manifiesta como `ECONNRESET` opaco tras 30s
- Mensajes de error no distinguen ADC vs proxy vs handshake-red vs SQL, dificultando triage rápido

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

### Slice 1 — `pg-connect.sh` resiliente

- agregar `trap EXIT` que mata el proxy spawn si el script muere a medias (cualquier exit code) — elimina el `ECONNREFUSED 127.0.0.1:15432` que aparece tras un fallo previo
- reemplazar el `sleep 3` fijo por un poll que espera el mensaje `ready for new connections` del proxy (timeout 10s) — más rápido en happy path, más determinista en slow network
- si `test_connection` falla, imprimir tail del log del proxy antes de morir — hoy se pierde esa info

### Slice 2 — Preflight de red

- antes de levantar proxy, `ping -c 2 -D -s 1200` a la IP canónica de Cloud SQL (`34.86.135.144`)
- si el ping falla pero el ping pequeño (`-s 500`) pasa → mensaje accionable: *"Tu red bloquea paquetes DF > 1000 bytes. Cloud SQL usa puerto 3307 que no tiene MSS clamping en la mayoría de firewalls corporativos. Cambia de red (hotspot), aplica MSS clamp con sudo, o usa Cloud Shell."*
- si el ping entero falla → *"No hay ruta a Cloud SQL. Verifica VPN / conexión a internet."*
- preflight se puede saltar con `GREENHOUSE_SKIP_PREFLIGHT=true` para entornos donde ICMP está bloqueado pero TCP funciona

### Slice 3 — Clasificación de errores

- `pg-connect.sh` y `scripts/migrate.ts` etiquetan sus errores con prefijo: `[ADC]`, `[PROXY]`, `[NETWORK]`, `[SQL]`
- una tabla pequeña en `GREENHOUSE_DATABASE_TOOLING_V1.md` que mapea cada prefijo a primera acción de triage

## Out of Scope

- refactor de `scripts/migrate.ts` a API programática Connector-first (`node-pg-migrate` CLI con URL sigue siendo válido)
- refactor de `scripts/generate-db-types.ts` para Connector-first (`kysely-codegen` upstream exige URL)
- cambiar el runtime del portal fuera de `src/lib/postgres/client.ts`
- reabrir migraciones ya aplicadas o renombrar timestamps existentes

## Detailed Spec

La implementación debe converger sobre este contrato operativo:

- `pnpm pg:connect` no deja procesos huérfanos ante cualquier modo de fallo (probar con `SIGTERM`, `SIGINT`, `die()` desde test_connection, script incompleto)
- Un agente que corre `pnpm pg:connect:migrate` desde una red con PMTUD blackhole recibe en <5 segundos un mensaje con prefijo `[NETWORK]` y causa probable — no un cuelgue de 30s seguido de `ECONNRESET` opaco
- Los mensajes con prefijo `[ADC]` / `[PROXY]` / `[NETWORK]` / `[SQL]` son mutuamente excluyentes y cada uno apunta a un primer paso de triage distinto
- `pg-connect.sh` sigue siendo el **único** carril soportado para `:migrate` y `:status`; no hay un nuevo carril paralelo que mantener

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pg-connect.sh` monta un `trap EXIT` que mata proxies spawn ante cualquier exit code (verificable con `SIGTERM` sintético durante `test_connection`)
- [ ] Corriendo `pg-connect.sh` desde una red simulada con PMTUD blackhole (o con `GREENHOUSE_FORCE_PREFLIGHT_FAIL=true`) devuelve error con prefijo `[NETWORK]` en <5 segundos
- [ ] Los mensajes de error de `pg-connect.sh` y `scripts/migrate.ts` usan prefijos `[ADC]`, `[PROXY]`, `[NETWORK]`, `[SQL]` de forma consistente
- [ ] `GREENHOUSE_DATABASE_TOOLING_V1.md` incluye tabla de prefijos → triage

## Verification

- simular fallo: `GREENHOUSE_FORCE_PREFLIGHT_FAIL=true pnpm pg:connect` → debe fallar `[NETWORK]` rápido
- happy path: `pnpm pg:connect:status` funciona sin regresión
- `pnpm pg:connect:migrate` corre idempotente (0 migraciones pendientes)
- `pnpm lint`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible

## Follow-ups

- si después de esto los fallos de tooling vuelven a ser frecuentes, reevaluar refactor `migrate.ts` Connector-first (TASK-584b hipotética)
- considerar si `scripts/pg-doctor.ts` debe clasificar sus errores con los mismos prefijos

## Open Questions

- ninguna — scope cerrado y acotado
