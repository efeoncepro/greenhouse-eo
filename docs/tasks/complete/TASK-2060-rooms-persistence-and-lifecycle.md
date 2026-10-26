# TASK-2060 — Rooms: persistencia y ciclo de salas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-052`
- Status real: `Entrega local verificada 2026-10-25: ciclo durable, autoridad persistida, API/CLI y recuperación; 39 pruebas conjuntas, incluidas 9 de dominio PostgreSQL. Identidad real y DB cloud fuera de alcance.`
- Rank: `TBD`
- Domain: `platform|data|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-rooms main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Conciliación vigente — 2026-10-26

Cierre original: persistencia local. La evolución cloud posterior ya acredita ocho migraciones/26 tablas y un piloto interno: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md) y [disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json). No interpretar el snapshot de cierre local como ausencia actual de DB cloud, ni su cierre como rollout general.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Persistir salas, borradores, ediciones y autoridad Rooms en PostgreSQL propio. Crear, guardar, publicar, reabrir y archivar por commands compartidos y transportes HTTP/CLI, con transacciones, permisos, idempotencia y auditoría. Entrega local; identidad federada y despliegue se certifican por separado.

## Why This Task Exists

La primera entrega sólo lee fixtures. R03/R04 requieren estado durable y no pueden depender de un selector demo para autorizar mutations. TASK-2058 está cerrada para foundation local; esta task posee el nuevo ciclo de escritura.

## Goal

- Ciclo durable de salas verificable en PostgreSQL real y reproducible tras reinicio.
- Aislamiento de organizaciones, revisión optimista y ediciones inmutables.
- Paridad por primitive y contrato público; sin lógica de negocio en transporte/UI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-2058-rooms-foundation-and-permissions.md`: contratos y can existentes.

### Blocks / Impacts

- R03/R04/R06/R08; autoría UI consumirá estos commands. Efeonce ID será adapter separado.

### Files owned

- Runtime `../efeonce-rooms/src/domain`, `src/server/persistence`, `src/server/commands`, `migrations`, scripts DB y tests de persistencia.
- Adapter HTTP/CLI en `../efeonce-rooms/src/app/api/v1`, `scripts/rooms.ts`; configuración de dependencias.
- Esta task y arquitectura/índices Rooms en Greenhouse.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- Runtime Next independiente, schemas/can, readers puros y fixture sintética bajo `../efeonce-rooms/src`.
- PostgreSQL18.6 instalado en `/opt/homebrew/opt/postgresql@18/bin`; sin listener Rooms iniciado.

### Gap

- Gap inicial resuelto: schema `rooms`, commands, concurrencia, recibos, auditoría y outbox durables. R04 conserva identidad federada pendiente; este corte acepta únicamente contenido sintético.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms`; documentación en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Rooms posee datos/commands; API, CLI y futuro MCP son adapters.
- Server/browser split: pg/config/pool y secretos sólo server-only, schemas browser-safe sin dependencias Next.
- Build impact: pg8.23.1; node-pg-migrate9.0.0 tooling, PostgreSQL18.6 local independiente.
- Extraction blocker: none; ninguna tabla ni sesión Greenhouse compartida.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: schema `rooms` en cluster local Rooms propio.
- Consumidores afectados: HTTP/CLI; UI y MCP por mismo registro y primitive.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- Contrato nuevo o modificado: rooms.create/updateDraft/archive, editions.publish/reopen/get/list, grants manage/revoke; schemas versionados.
- Backward compatibility: additive; demo conserva su separación.
- Full API parity: registro gobernado y command canónico; HTTP/CLI adapter. Transporte MCP federado se certifica en R13, deuda explícita owner Platform, retirada al registrar relying party/provider.

### Data model and invariants

- Entidades/tablas/views afectadas: rooms.rooms/drafts/editions/principals/memberships/grants/internal_notes/command_receipts/audit/outbox.
- Invariantes: snapshot publicado inmutable; draft revision compare-and-swap; ninguna nota interna en edición cliente.
- Write-target allowlist: únicamente schema rooms y tabla de migraciones propia; pruebas de frontera explícitas.
- Tenant/space boundary: principal validado del servidor y autoridad Rooms persistida; organizationId intersecta.
- Idempotency/concurrency: transacción por command, clave actor+org+operación+key con hash payload; conflictos no pisan datos.
- Audit/outbox/history: hechos mínimos append-only atómicos al command, sin contenido privado ni secretos.

### Migration, backfill and rollout

- Migration posture: additive; migración creada por CLI node-pg-migrate del runtime independiente.
- Default state: API real deniega sin sesión verificada/configuración; sólo entorno local sintético.
- Backfill plan: ninguno; seed sólo en DB dedicada local con guardas de host/nombre.
- Rollback path: migración down/up y restore probados en DB descartable propia; nunca borrar datos ajenos.
- External coordination: registro Efeonce ID, cloud y credenciales runtime permanecen explícitamente pendientes.

### Security and access

- Auth/access gate: can y autoridad persistida; sin header rol, query persona ni bearer inventado como identidad real.
- Sensitive data posture: pruebas sintéticas; configuración local ignorada, no volcar cadenas de conexión.
- Error contract: invalid_input/unauthenticated/not_found/conflict/configuration sanitizados; recursos ajenos no revelan existencia.
- Abuse/rate-limit posture: payloads y límites paginación acotados, retries idempotentes; API aún cerrada hasta sesión.

### Runtime evidence

- Local checks: lint, typecheck, tests de dominio, build.
- DB/runtime checks: migración real, restart/readback, replay, conflicto concurrente, aislamiento, revocación y snapshot inmutable.
- Integration checks: HTTP/CLI negativos y ciclo programático con autoridad de prueba sólo en harness aislado.
- Reliability signals/logs: códigos sanitizados y correlationId; auditoría/outbox contables.
- Production verification sequence: no production runtime impact; no certificación remota inferida de pruebas locales.

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

### Slice 1 — DB y contratos

- Cluster propio loopback55432, roles migrator/runtime y pool canónico único Rooms.
- Migraciones, schemas lifecycle y capacidades rooms.create/editions.reopen con ceilings explícitos.

### Slice 2 — Commands/readers

- Create/update/publish/reopen/archive y grants transaccionales; persistir autoridad local y audit/outbox.
- Readers proyectados, paginados y aislados; API/CLI del mismo contrato.

### Slice 3 — Evidencia

- Pruebas PostgreSQL real y contratos de transporte; documentar límites e integración pendiente.

## Out of Scope

- Despliegue, provisión remota, envío de invitaciones, medios y editor visual completos.
- Sustituir identidad real por fixtures; escribir esquemas de otros productos.

## Detailed Spec

Publication fija snapshot+hash+sequence y conserva ediciones previas. Reopen crea borrador nuevo con revision. Grants y memberships se vuelven a consultar en cada command; revocar vence sobre replay. Commands usan expectedRevision y receipts con hash del payload. Auditoría y outbox se escriben en la misma transacción. Puerto55432 y base propia permiten pruebas sin reactivar bases hibernadas.

## Rollout Plan & Risk Matrix

Additive local-first, no production runtime impact. Construcción autorizada en goal 2026-10-25; ningún provisioning externo implícito.

### Slice ordering hard rule

Schema/contratos → commands/readers → adapters → pruebas. UI refinamiento2059 puede correr independiente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga multitenant | PostgreSQL/API | medium | can+scope fresco y negativos | deny/test failure |
| Doble publicación | Commands | medium | receipt+revision+transacción | conflict |
| Migración equivocada | DB | low | loopback/base allowlist | preflight deny |

### Feature flags / cutover

Sin cutover remoto; config DB explícita y API cerrada hasta autenticación federada. Demo separada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Schema | Down/up probado antes de cargar fixtures; restore en base temporal propia verificado | duración no instrumentada; no se declara RTO | sí, sin datos reales |
| Commands/adapters | Revert archivos propios, conservar DB y snapshots | duración no instrumentada | sí |

### Production verification sequence

No aplica ejecución remota en esta task local. Antes de rollout: identidad real, migración staging, ciclo autenticado, restore y permiso de despliegue.

### Out-of-band coordination required

Registro Rooms en Efeonce ID y configuración de producción fuera de esta entrega; no bloquean SQL/commands locales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Source of truth, contratos y consumers implementados con frontera server/browser verificada: `src/domain/persistence-contracts.ts`, adapters `server-only` en `src/server/persistence` y `src/server/commands`; build optimizado y tests de transporte.
- [x] Migración up/down/up y readback PostgreSQL18 propio, sin tocar otros productos: `1792962301842_rooms-foundation.sql`, generada por CLI `node-pg-migrate`; PostgreSQL18.6, loopback55432, base `rooms_local`, roles propios. Down/up verificado antes de cargar fixtures.
- [x] Create/update/publish/reopen/archive durables; snapshot inmutable y retorno tras reinicio: prueba de ciclo completo, rechazo SQL de UPDATE al snapshot y `pnpm db:recovery --restart` con readback de hashes y conteos.
- [x] Dos organizaciones, rol/ámbito/expiry/revocación y notas privadas probados con allow/deny: `tests/domain-persistence.test.ts`, `tests/domain.test.ts` y `tests/transport-persistence.test.ts`; principal/membership/grants persistidos prevalecen sobre autoridad declarada; sin notas/grants en DTO cliente.
- [x] Replay idéntico no duplica; misma key payload distinto y revisión concurrente devuelven conflict: pruebas de dos creates simultáneos, revisión con un solo ganador y replay denegado después de revocar al actor.
- [x] Audit/outbox/receipt atómicos; fallo rollback no deja estado parcial: fault injection en INSERT de auditoría revierte snapshot, borrador, revisión, recibo y outbox; conteos reconciliados.
- [x] HTTP/CLI consumen mismo primitive, errores sanitizados y real API sin bypass demo: `src/server/http/api.ts`, rutas `/api/v1`, `scripts/rooms.ts`; harness HTTP→dominio→PG con autoridad sintética sólo inyectada en pruebas. Rutas reales conservan401 sin sesión Efeonce ID.
- [x] Lint/tipos/tests/build pasan y documentación registra evidencia local y límites remotos: `pnpm verify` PASS, 39 pruebas conjuntas, manual y superficie funcional actualizados; sin equivalencia con identidad federada, DB cloud ni piloto real.

## Verification

- Runtime: `pnpm verify` PASS; 39 pruebas conjuntas de dominio/transporte, incluidas 9 de dominio contra PostgreSQL real, sin skips; ESLint sin warnings, negativos de lint, Next/TypeScript y build optimizado.
- Migración: up/down/up PASS en cluster exclusivo; no acceso ni mutación a bases de otros productos.
- Recuperación: `pnpm db:recovery --restart` PASS. Antes/después coinciden 25 salas, 18 borradores, 11 ediciones, hash agregado de ediciones `20c6a6ae5a12083dcec981ba7915219b`, 64 recibos, 64 auditorías y 64 eventos outbox. Son los conteos de esa corrida, no un inventario fijo. Base temporal de restore y dump eliminados al terminar.
- Configuración: `.local/db-config.json`0600; directorios local/socket0700. Config, datos y backups ignorados; readers y commands acceden al pool sólo después de identidad.
- Runtime: commit `e938350`, reportado por el coordinador como publicado en repositorio privado. GitHub/Vercel se verifican en TASK-2061; el preview no acredita persistencia cloud.
- Greenhouse: ejecutar `pnpm task:lint --task TASK-2060` antes del move y al cierre; `pnpm ops:lint --changed` y closure/context los coordina el agente padre sobre el conjunto documental.
- Gate previo al move: `pnpm task:lint --task TASK-2060` PASS, 0 errores/0 warnings, con Status real y ocho criterios de aceptación actualizados. Cierre limitado al alcance local de esta task.
- [Manual](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) · [Superficie funcional](../../documentation/rooms/primera-experiencia-local.md) · [ADR](../../architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md).

## Closing Protocol

- [x] Lifecycle/carpeta/README/registry sincronizados; task lint final 0 errores/0 warnings.
- [x] Handoff/changelog/epic y arquitectura actualizados; closure del conjunto 0 warnings. Auditoría `docs/audits/rooms/2026-10-25-persistence-motion-release.md`.
- [x] Chequeo de impacto cruzado y rollback local documentados: DB/pool/roles propios, restore sintético probado y auth real cerrada; sin recursos remotos en este corte.

## Follow-ups

- R04 federación Efeonce ID; R05 medios; R06/R08 autoría; R13 MCP y rollout/piloto R15.

Readback final del coordinador: 40 pruebas PASS sin skips tras añadir harness CLI/HTTP; lint y tres negativos PASS. La verificación previa de39 y recovery conserva su evidencia fechada.
