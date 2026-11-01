# TASK-2078 — Rooms: adapter MCP stdio local por sesión existente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api, integration`
- Epic: `EPIC-052`
- Status real: `2026-10-29: Adapter MCPstdio local completo:9tests focales SDK/HTTP/PG,9tools explícitas y lectura default,337tests0skip y lint/types/build PASS. Sesión existente0600; sin OAuth nuevo, federación remota, binarios por MCP ni producción.`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `efeonce-rooms codex/rooms-design-integration; gobernanza Greenhouse develop; sin worktrees`

## Summary

Construir R13 parcial: MCP stdio local con SDKoficial sobre HTTP de Rooms y sesión existente. Toolset read por defecto (1tool); all tiene9tools que separan read/write; schemas canónicos y exclusiones explícitas sin lógica de negocio duplicada.

## Why This Task Exists

La API/CLI existen, pero falta adapter MCP verificable. El gateway remoto no se modifica ni se infiere federación.

## Goal

- Adapter local canónico sin credenciales en output.
- Cobertura de operaciones y exclusiones con razón, sin bypass de autoridad.
- SDKclient tools/list/call, HTTP/PG real y revocación verificados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_LOCAL_STDIO_MCP_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`, `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `.codex/skills/efeonce-rooms/references/program-ledger.md`.

## Dependencies & Impact

### Depends on

TASK-2060/2062/2065 y runtime `../efeonce-rooms/src/server/persistence/{pool,authority,store}.ts`.

### Blocks / Impacts

EPIC-052 R13/R15; no depende de UI y no cierra federación remota.

### Files owned

- `../efeonce-rooms/src/server/mcp/**`.
- `../efeonce-rooms/scripts/rooms-mcp.ts`.
- `../efeonce-rooms/package.json` y `pnpm-lock.yaml`.
- `../efeonce-rooms/tests/mcp*.test.ts`.
- Este documento y ADR; integración HTTP/CLI/client por root.

## Current Repo State

> Snapshot del discovery inicial; el resultado vigente y los límites están en Status real y el cierre29Oct.

### Already exists

Autoridad persistida, edición inmutable, receipts/audit/outbox, adaptadores API/CLI y presenter SSR de identidad/contenido.

### Gap

Falta adapter MCP local y test contra cliente SDK. No hay integración pública implícita.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `efeonce-rooms/src/server/mcp` y `scripts/rooms-mcp.ts`.
- Future candidate home: `remain-shared`
- Boundary: commands/readers HTTP existentes; adapter MCP sólo transporte y manifest.
- Server/browser split: MCP/SDK/archivo de sesión exclusivamente Node local; browser no cambia.
- Build impact: SDKoficialserver2/client2 exactos; sin deployable adicional.
- Extraction blocker: transacción/lock/autoridad del dominio Rooms.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api, integration`
- Source of truth afectado: inventarios canónicos de operaciones y HTTP Rooms.
- Consumidores afectados: API/CLI/client y UI posterior.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: autoridad/edición/inmutabilidad Rooms y Full API Parity.
- Contrato nuevo o modificado: `buildRoomsMcpServer` y CLIstdio; sin primitive alternativo.
- Backward compatibility: `compatible`; API/SQL/Auth no cambian.
- Full API parity: primitive server compartido, adapter MCP usa los mismos commands/readers HTTP.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva.
- Invariantes: cookies sólo origen fijo; sin URLs firmadas ni filesystem arbitrario; replay/CAS permanecen en el servidor.
- Write-target allowlist: N/A; runtime Rooms sin boundary-test de tablas; allowlist SQL explícito en ADR.
- Tenant/space boundary: org sólo selecciona ámbito dentro de la sesión; API valida grants.
- Idempotency/concurrency: idempotencyKey y expectedRevision/secuencia del schema original; ninguna repetición automática de writes.
- Audit/outbox/history: auditoría/outbox del primitive existente; no secretos en logs del adapter.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: rama local sin push; acceso humano productivo conserva OFF.
- Backfill plan: ninguno, ninguna concesión automática.
- Rollback path: retirar proceso/config local; preservar receipts de operaciones ya realizadas.
- External coordination: autorización posterior antes de producción; Auth retenido.

### Security and access

- Auth/access gate: archivo privado de sesión existente + autoridad/can de la API; no caps ni grants nuevos.
- Sensitive data posture: archivo de sesión privado y DTOs autorizados; descriptores omitidos explícitamente.
- Error contract: isError true con códigos propios/allowlisted, sin error upstream crudo.
- Abuse/rate-limit posture: schemas estrictos, request1MiB/response256KiB/timeout15s, sin redirects.

### Runtime evidence

- Local checks: tests/mcp.test.ts y tests/mcp-persistence.test.ts, lint/types y suite integradora.
- DB/runtime checks: HTTP backed PG efímero; sin nuevas migraciones.
- Integration checks: MCPclient SDKreal tools/list/call/readback, sin UI.
- Reliability signals/logs: correlationId del HTTP; stderr propio mínimo.
- Production verification sequence: fuera de este corte local; sin deploy ni flags.

### Acceptance criteria additions

- [x] Source of truth, consumers y contrato con paths reales. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Tenant/ownership/CAS y replay revalidados. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Migración/backfill/down N/A: este adapter no cambia SQL ni autoridad.
- [x] Evidencia local sin atribuir cloud/UI. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

## Capability Definition of Done — Full API Parity gate

- [x] Primitive canónico con read/write, autoridad fina, receipts, errores y audit. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Capability registry y techos de rol sin grants automáticos. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] HTTP/CLI/client consumen el mismo primitive. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Writes modelados como intents explícitos, no click-handlers. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

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

### Slice 1 — SDK y manifest

SDKexacto, manifest derivado y exclusiones. ADR fija frontera local y sesión existente.

### Slice 2 — Primitive e integración

stdio sobre HTTPcanónico; reusar readCliSession; annotations/output/error y límites.

### Slice 3 — Verificación

Client SDK real, HTTP/PG, readback/replay/revoke, schemas/inventario/redacción y stdio.

## Out of Scope

UI, OAuth/login nuevo, gateway/remoto, producción, envío de correo de prueba, bytes víaMCP y lecturas arbitrarias de archivos.

## Detailed Spec

El ADR dueño define adapter stdio y límites de respuesta/sesión. Nueve tools con schemas canónicos y cobertura/exclusiones; autorización sólo en la API.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

ADR/SDK -> manifest -> transport -> pruebas SDK/HTTP/PG -> evidencia. No producción por esta task.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Credencial expuesta | API | medium | redacción/failclosed y tests negativos | test audiencia/otroowner |
| Intento duplicado | protocolo | medium | CAS/idempotency del primitive | conflict canónico |
| Cookie tras revoke | acceso | medium | reload de autoridad en API | not_found |
| Redirect roba cookie | SQL | low | origen fijo y redirect error | test transport |

### Feature flags / cutover

Sin flag adicional local: código no publicado, grants explícitos. Flags humanos actuales conservan OFF. Ningún nuevo runtime cloud.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| SDK/manifest | Revert local sin borrar datos | local medido | parcial |
| Adapter/transports | Revert exacto sin borrar filas | local | sí |
| Verificación | Retirar PG efímero y temporales | al terminar | sí |

### Production verification sequence

No autorizado. La federación remota requerirá contrato de provider/OAuth/gateway, autorización y readback separados; no reutilizar canary de correo.

### Out-of-band coordination required

N/A repo-only local; Claude Design recibe contrato estable después del QA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Tools derivan schemas y manifest cubre todas las operaciones/exclusiones.
- [x] No credenciales/descriptores/bytes en output, ni acceso filesystem arbitrario.
- [x] Archivo sesión0600 exactorigin y redirects bloqueados.
- [x] SDK tools/list serializa cuatro annotations y presupuesto medido.
- [x] SDKclient toolcall write/readback/replay/revoke contra HTTP/PG real.
- [x] Tests SDK/stdin/negativas y lint/types PASS.
- [x] MCP local documentado; federación remota sigue pendiente.

## Verification

- `pnpm exec eslint src/server/mcp scripts/rooms-mcp.ts tests/mcp*.test.ts --max-warnings=0`.
- `pnpm exec tsc --noEmit`.
- `node --conditions=react-server --import tsx --test tests/mcp*.test.ts`.
- `pnpm task:lint --task TASK-2078`.


## Closing Protocol

- [x] Lifecycle y carpeta sincronizados con evidencia real.
- [x] README/registro de tasks sincronizados por root.
- [x] Handoff/changelog/ledger espejo actualizados por root.
- [x] Impacto cruzado R13/R15 registrado; R09 conserva primitive dueño.

## Follow-ups

Claude Design implementa consumer visual; release/rollout requiere autorización posterior.


## Delta 2026-10-29 — evidencia local

9testsPASS0skip: SDK tools/list/call, stdio real, readback igual a HTTP contra PG18 efímero, replay sin duplicación y revoke deniega read/replay. LintfocalPASS. Inventario73operaciones cubiertas/excluidas; all9tools168242B≈42061tokens (estimación4bytes/token); defaultread1tool13227B≈3307; presentation2tools22219B≈5555. Configuración `pnpm --silent rooms:mcp --base-url http://127.0.0.1:3216 --session-file /ruta/privada/session.json --toolset read`; archivo debe contener sesión existente, no lo crea este adapter. Transfiere bytes por CLI/UI, no MCP. Tipos globales se verifican al estabilizar WIPmultimedia por root.

## Cierre backend local — 2026-10-29

[Corte consolidado](../../audits/rooms/2026-10-29-backend-local-completion.md):337/337tests,0fallos/0skip;
lint/negativo/types/build,13migraciones/43tablas, restore mixtoPG16/18 y cinco guards poblados PASS.
[Contrato Claude Design](../../documentation/rooms/backend-api-for-claude-design.md), manual y skill espejo
registran lo construido y los gates externos. El cierre sólo cubre el alcance local declarado; no UI,
release, conectores reales ni activación productiva. Los deltas anteriores conservan evidencia por fecha.
