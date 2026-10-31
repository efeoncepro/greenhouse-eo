# TASK-2058 — Rooms: foundation ejecutable y permisos can

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
- Backend impact: `reader`
- Epic: `EPIC-052`
- Status real: `Foundation local verificada:17 tests, install frozen/lint/tipos/build y consumidor PASS; sin rollout por alcance`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop para docs; nuevo runtime efeonce-rooms main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Conciliación vigente — 2026-10-26

Cierre original: foundation local. La persistencia, identidad y medios posteriores no cambian su alcance: ver [estado actual de EPIC-052](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md). Permisos `can` siguen siendo autoridad del servidor; el nuevo diseño no crea permisos por rol nominal.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Crear el runtime independiente mínimo, contratos de sala/edición/evidencia y autorización can por acción y recurso. Verificar stack y AXIS antes del primer consumidor visual.
Primera entrega local autorizada por Julio («Vamos»), con muestras sintéticas; no equivale al producto V1 entero.

## Why This Task Exists

EPIC-052 tenía sólo definición. El operador autorizó base mínima seguida inmediatamente por UI y pidió can, jerarquías y vistas cliente/operador/administrador desde el arranque.

## Goal

- Instalación reproducible, contratos y permisos con pruebas allow/deny.
- Preservar la frontera Rooms/Greenhouse, La órbita y proyecciones privadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_STACK_BASELINE_V1.md`
- `docs/architecture/EFEONCE_SHARED_PRODUCT_UI_PLATFORM_DECISION_V1.md`

## Normative Docs

- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/tasks/complete/TASK-1591-efeonce-ui-adapters-pilot.md`

## Dependencies & Impact

### Depends on

- EPIC-052 y go del operador 2026-10-25. UI consume TASK-2058; foundation no espera toda la persistencia.

### Blocks / Impacts

- R01/R02 y el mínimo de R04; R03–R15 conservan su resto de alcance.

### Files owned

- Nuevo runtime `../efeonce-rooms/`, autorizado para creación; foundation posee contratos/config/tests, UI posee app/components/styles y tests visuales.
- Esta task, su plan, epic, dossier Rooms, índices y handoff de Greenhouse.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- `docs/architecture/rooms/README.md` y paquete oficial de marca AXIS.

### Gap

- Sin runtime Rooms al tomar la task. Marca existente no acredita UI implementada.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: nuevo repo hermano `../efeonce-rooms`, autorizado expresamente al confirmar esta primera entrega; documentación en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: contratos browser-safe propios Rooms, reader/can server-side y adapter HTTP/CLI/UI; AXIS sólo presentación.
- Server/browser split: fixtures, grants y notas internos nunca importados por componentes cliente; sólo DTO proyectado y permisos efectivos.
- Build impact: Next/React/TypeScript/Tailwind y paquetes privados AXIS fijados; build independiente de Greenhouse.
- Extraction blocker: none; producto propio aprobado, sin tablas ni sesiones compartidas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: contratos y fixtures sintéticas propias de Rooms en src/domain; sin tablas de otro producto.
- Consumidores afectados: reader HTTP, CLI local y UI de TASK-2059.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md.
- Contrato nuevo o modificado: Room/Edition/ContentBlock/Evidence y can(actor, capability, resource); manifest de operaciones.
- Backward compatibility: additive; primer consumidor.
- Full API parity: reader único consumido por HTTP/CLI/UI; writes y MCP real explícitamente pendientes en R03/R13.

### Data model and invariants

- Entidades/tablas/views afectadas: Room, Edition, Grant, Principal; ninguna tabla persistida.
- Invariantes: deny por defecto; cliente sólo edición publicada, notas internas fuera del DTO; organización+sala+edición+capacidad+vigencia se intersectan.
- Write-target allowlist: sin tablas ni writes externos en este corte.
- Tenant/space boundary: principal del servidor y grants; nunca rol u organización confiados desde el cliente.
- Idempotency/concurrency: readers puros sin mutaciones; revisión/edición explícita, sin prometer comandos durables.
- Audit/outbox/history: decisiones de permiso estructuradas sin PII; outbox durable corresponde a R03.

### Migration, backfill and rollout

- Migration posture: none; fixture sintética versionada.
- Default state: read-only; demo explícita y aislada; API real deniega hasta tener sesión validada.
- Backfill plan: sin backfill ni importación real.
- Rollback path: revert de archivos propios; entorno local sin estado externo.
- External coordination: ninguna para la demo; Efeonce ID, DB/storage, CI/hosting quedan en las unidades posteriores.

### Security and access

- Auth/access gate: can en servidor; roles cliente/operador/admin limitados por grants, caducidad y revocación. Ningún rol es bypass multitenant.
- Sensitive data posture: sólo contenido sintético. Secretos de instalación efímeros, nunca runtime/browser.
- Error contract: forbidden/not_found/invalid_input sin errores internos ni datos privados.
- Abuse/rate-limit posture: entorno loopback read-only, sin upload ni envío; API real cerrada.

### Runtime evidence

- Local checks: instalación limpia, lint con caso negativo, TS7 typecheck, build Next y tests de contratos/permisos.
- DB/runtime checks: smoke localhost y tests deny entre tenants/salas/ediciones; no hay DB.
- Integration checks: consumo real de AXIS desde registry; SSR/hidratación en TASK-2059.
- Reliability signals/logs: fallos reproducibles de validación y decisiones de autorización con razón estable.
- Production verification sequence: no production runtime impact; no rollout en este corte.

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

### Slice 1 — Contrato y foundation

- Registrar decisión de arranque y permisos can; instalación y contratos con fixtures propias.

### Slice 2 — Consumidor y evidencia

- Implementar el alcance del perfil de esta task y producir evidencia reproducible local.

## Out of Scope

- Despliegue, DNS, CRM, datos reales, invitaciones, upload, DB y comandos durables completos.
- Reemplazar la identidad Efeonce ID por credenciales o roles enviados por navegador.

## Detailed Spec

Contrato de datos de Rooms versionado; capacidades por acción, roles con techo de autoridad y grants específicos. Primera implementación local con demo sintética y proyecciones allowlist. La interfaz consume el reader y los permisos efectivos; fixture no equivale a identidad o persistencia productiva. Alcance detallado en los contratos de Zone 1.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contratos/permisos → consumo de AXIS → interfaz → pruebas y revisión. Go/plan aprobado en la conversación 2026-10-25; la ampliación can forma parte de la misma base.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Fuga de notas entre roles | Rooms | medium | Proyección allowlist y tests negativos | Fallo de policy/projection test |
| Stack sin compatibilidad | Build | medium | Peers estrictos, caso negativo lint, typecheck y build | Instalación o gates fallidos |
| Muestra confundida con operación | UX | medium | Etiqueta demostración y API real cerrada | Revisión de copy y rutas |

### Feature flags / cutover

Demo explícita de fixtures sintéticas, acceso local. Sin cutover ni production runtime impact. No configurar servicios externos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revert de archivos propios del runtime nuevo | local | sí |
| 2 | Revert de componentes y contratos del consumidor | local | sí |

### Production verification sequence

Sin producción en esta entrega. Verificar localhost con build de producción; hosting/identidad real requieren evidencia posterior.

### Out-of-band coordination required

Ninguna para contenido sintético local. Aceptación visual de Julio al entregar; hosting y credenciales de despliegue posteriores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Contratos y límites de esta task implementados en el runtime propio, sin imports de implementación Greenhouse.
- [x] Permisos can, jerarquías cliente/operador/admin, ámbito tenant/sala/edición y denegación por defecto verificados; notas internas ausentes del DTO cliente.
- [x] Dependencias exactas y AXIS de registry con instalación limpia, lint (incluido negativo), typecheck y build verificados.
- [x] Evidencia local del consumidor documentada; rollout y Efeonce ID real declarados pendientes.
- [x] Source of truth, superficie API/CLI y manifest de operaciones ejecutables coinciden; no se anuncia paridad de operaciones pendientes.
- [x] Schema y errores canónicos, grant expirado/revocado, permisos de edición, actor externo con rol interno y cruce de tenants/salas cubiertos por tests.
- [x] Sin migraciones/backfill; rollback local, exposición real fail-closed y secretos fuera de código/logs/artefactos verificados.

## Verification

- `pnpm task:lint --task TASK-2058`
- Consumidor: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- UI: Playwright/axe y capturas del consumidor; API: smoke y negativos de acceso.

## Closing Protocol

- [x] Lifecycle y ubicación reflejan evidencia real.
- [x] Índices, epic, Handoff y changelog sincronizados.
- [x] Impacto cruzado revisado; pendientes de R01/R02/R04 no se cierran por inferencia.

## Follow-ups

R03 persistencia; resto de R04 Efeonce ID e invitaciones; R05 medios; R13 MCP/CLI completos; R15 rollout.


## Evidence — 2026-10-25

- [Auditoría y límites](../../audits/rooms/2026-10-25-first-local-delivery.md), [manual local](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [revisión Product Design](../../ui/reviews/TASK-2059-rooms-first-experience/product-design-audit.md).
- `pnpm verify` PASS: lint0warnings,3 casos negativos, TS7,17 tests de contratos/can, build optimizado. Install limpio379paquetes y frozen-lockfile verificados.
- Consumidor:25 pruebas E2E pass/3skip por API repetida entre viewports; GVC premium4variantes/68frames exit0, enterprise pass,0quality findings y sin errores runtime. Source artifact/source dimensions, teclado, fuente,200%texto, reduced motion y gates negativos incluidos.
- API real401 aun con headers/query forjados; workspace cliente403, persona desconocida400, POST405; CLI exit1 ante deny y exige demo explícita.
- No DB/migración/backfill/rollout; adapter Efeonce ID null. No se afirma producción ni aceptación visual humana.
