# TASK-2069 — Rooms Cloud Runtime and Controlled Pilot

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `Plan/ADR aceptados y hookPASS; adaptercloud en implementación. Readback SQL16.14 confirma100máximas/3reservadas/10actuales y Monitoring24h pico42. PG16aislado migraciones19tablasPASS, suite/restore en ejecución. Sin provisioningRooms ni canary; refsclientsecret/HMAC propiedadpeerAuth creadas por ella, otrasrefsRooms pendientes. FlagsOFF.`
- Rank: `Foundation cloud después de TASK-2065/2066; canary integrado condicionado a issuer TASK-1834/2067 y consumer TASK-2068`
- Domain: `platform|identity|data|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-rooms main; checkout compartido sin worktrees`

## Summary

Preparar PostgreSQL propio de Rooms y conexión Vercel por WIF/Cloud SQL Connector, con roles mínimos,
secretos separados y recuperación verificable. Coordinar el RP y resolver S2S con Auth y ejecutar un
piloto acotado sólo después de gates técnicos y autorización de activación aplicable.

## Why This Task Exists

El runtime sólo acepta PostgreSQL local. La demo publicada no puede probar identidad, persistencia ni
invitaciones reales. Reutilizar una credencial Greenhouse o copiar la URL local a Vercel rompería el
aislamiento y no resolvería configuración, capacidad o recuperación.

## Goal

- Conexión cloud server-only, sin SA key, migrator en runtime ni fallback local en Production.
- DB y roles Rooms con presupuesto real de conexiones y recovery verificado en engine objetivo.
- Canary con evidencia diferenciada de infraestructura, login, entrega y acceso; rollback controlado.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md` — Proposed; aceptar antes del cambio irreversible.
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`.
- `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md`.
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`.
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`.
- `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`.

## Normative Docs

- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
- `docs/operations/ROOMS_VERCEL_INVITATION_PERIMETER_V1.md`.
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`.
- `docs/manual-de-uso/identity/registrar-producto-first-party.md`.

## Dependencies & Impact

### Depends on

- TASK-2060/2062: persistencia y autoría existentes en `../efeonce-rooms/src/server/persistence` y `migrations`.
- TASK-2065/2066: contratos OIDC, sesiones e invitaciones Rooms.
- TASK-1834/2067: RP y OTP issuer; TASK-2068: consumer humano del canary.
- Aceptación del ADR propuesto y aprobación de recursos/coste/activación aplicable antes de writes cloud.

### Blocks / Impacts

- Piloto Rooms con usuarios reales; no bloquea desarrollo local ni certifica toda EPIC-052.
- Capacidad de instancia compartida y secretos de dos runtimes; coordinar con owners Auth/Platform.

### Files owned

- `../efeonce-rooms/src/server/persistence/config.ts`, `pool.ts` y futuro adapter cloud dedicado.
- `../efeonce-rooms/scripts/db-migrate.ts`, configuración server-only, tests cloud y manifiesto de despliegue.
- Esta task, `docs/tasks/plans/TASK-2069-plan.md` y ADR cloud Rooms; índices/Handoff coordinados por raíz.

## Current Repo State

### Already exists

- Commands/readers transaccionales, 19 tablas Rooms, roles locales mínimos y recovery local probado.
- Config auth/invitations por env; demo en `https://efeonce-rooms.vercel.app/demo`; Functions `gru1`.
- Precedente WIF/Connector en Greenhouse; no se importará su cliente privado ni su autoridad DB.

### Gap

- No perfil cloud Rooms ni resolver de secret refs; SQL local18 no acredita candidatoSQL16.
- Raíz aportó configuración y Monitoring24h; falta comprobar límites SQL actuales, capacidad del piloto,
  región final, roles cloud, recovery remoto, RP desplegado y canary.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms` app/API Vercel existente; PostgreSQL cloud candidato y issuer independiente.
- Future candidate home: `remain-shared`
- Boundary: adapter de persistencia/secretos, commands/readers canónicos; Auth entrega identidad y OTP por HTTP.
- Server/browser split: WIF, Connector, secretos y stores sólo servidor; DTOs públicos existentes sin credenciales.
- Build impact: SDKs cloud server-only con versiones verificadas; excluir tooling/local config del artefacto Vercel.
- Extraction blocker: transacciones Rooms y autorización fresca permanecen juntas; no crear otro deployable.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: DB/schema Rooms propios; configuración cloud, secretos y realm de producción.
- Consumidores afectados: app/API Rooms y resolver S2S del issuer; tooling migrator separado.
- Runtime target: `production` gated; validación previa local/aislada y canary autorizado.

### Contract surface

- Contrato existente a respetar: commands/readers/can Rooms, snapshot V1/V2, OIDC/OTP y callbacks exactos.
- Contrato nuevo o modificado: perfiles local/cloud explícitos y resolución efectiva de secretos server-only.
- Backward compatibility: gated; local y /demo conservados; sin reinterpretar snapshots o grants existentes.
- Full API parity: N/A — no capability de negocio nueva; HTTP/CLI conservan primitives. Handles OIDC no habilitan bearer CLI.

### Data model and invariants

- Entidades/tablas/views afectadas: 19 tablas actuales en schema `rooms`; no tablas nuevas previstas.
- Invariantes que no se pueden romper: tenancy, autoridad fresca, inmutabilidad, expectedRevision, idempotencia, no secretos en auditoría.
- Write-target allowlist: mantener grants/boundary tests actuales; no destinos Greenhouse ni Auth desde Rooms.
- Tenant/space boundary: la sesión y la autoridad persistida limitan organization/room; compartir instancia no concede permisos.
- Idempotency/concurrency: preservar locks/transacciones; no reintentar callbacks de negocio ni COMMIT incierto.
- Audit/outbox/history: mismas tablas, correlación sanitizada; sin payload de credenciales o tokens.

### Migration, backfill and rollout

- Migration posture: bootstrap DB/roles propio; migraciones existentes en engine objetivo, sin down sobre DB viva.
- Default state: ambos flags OFF; habilitación temporal explícita sólo dentro del canary coordinado.
- Backfill plan: ninguno; fixtures locales no se copian a producción como autoridad real.
- Rollback path: flags OFF, revocar recursos run-owned, revertir deployment/config preservando datos y auditoría; restore selectivo ensayado.
- External coordination: Auth posee RP/OTP/entrega; Platform capacidad/WIF/IAM; TASK-2068 posee UI.

### Security and access

- Auth/access gate: RP `efeonce-rp-rooms-production`; origin `https://efeonce-rooms.vercel.app`; WIF Production-only.
- Sensitive data posture: seis secretos propuestos en ADR; migrator fuera de Vercel, sin SA key, sin secretos en build/browser/logs.
- Error contract: configuration/unavailable sanitizados, fail-closed y correlación; sin connection string o proveedor raw.
- Abuse/rate-limit posture: WAF antes de SQL y cuotas de dominio/issuer; no prueba de capacidad mediante carga no acotada.

### Runtime evidence

- Local checks: config/tests negativos, lint/typecheck/build y suites relevantes según cambios.
- DB/runtime checks: PG16 candidato frente local18, ACL/constraints/triggers, migración/restore aislado y sin dependencia de credencial amplia.
- Observability: conexiones, latencia/errorrate, saturación/rechazos de rol, WIF/secret-resolution, backup/PITR y coste, sin valores sensibles.
- Production verification sequence: capacidad → identidad/roles → migración → WIF/Connector/secrets → perímetro → RP/S2S → canary → rollback/readback.

<!-- ZONE 2 — PLAN MODE: plan aceptado bajo goal y autorización humana de infraestructura/piloto -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Cerrar ADR, capacidad y región con readback actual; verificar propuesta CONNECTION LIMIT8 runtime/1 migrator.
2. Implementar perfil cloud, secret refs y pool2/isolate; validar sin fallback local en Production.
3. Preparar/aplicar recursos autorizados con readback y recovery; migrator fuera del runtime.
4. Coordinar RP/S2S y gates WAF; probar canary y rollback con cohort/destinatario autorizados.

## Out of Scope

- DNS definitivo, UI nueva, bucket/medios/worker, migración Greenhouse, SA keys, mailer propio o ampliación de cohort.
- Aprovisionar por la sola existencia de esta task/ADR; activar preview contra datos productivos.

## Detailed Spec

El [plan de implementación](../plans/TASK-2069-plan.md) fija fases, owners y evidencia. La topología y los seis
secretos viven en el [ADR cloud](../../architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md).
No confundir preparación de documentos con aprobación del plan o implementación.

## Rollout Plan & Risk Matrix

Preparación con flags OFF → validación aislada del adapter/SQL → recursos autorizados y readback →
WIF/Connector/secrets → WAF/RP/S2S → canary temporal explícito → activación estable sólo tras gates.

| Riesgo | Control y respuesta |
| --- | --- |
| Saturación compartida | Pool2/isolate, propuesta CONNECTION LIMIT8 runtime/1 migrator tras comprobar límites SQL; no cambiar globales |
| Privilegios cruzados | Roles y SA exclusivos, WIF Production-only, negativas cross-DB/DDL/Preview |
| Configuración o secret ref inefectiva | Resolver real antes de construir servicios, fail-closed y evidencia de consumo sin valores |
| Diferencia PG18/16 | Migración/suite y restore en engine objetivo; no down sobre producción |
| Pérdida de ciphertext al rotar | Claves versionadas/recuperables y procedimiento ensayado antes del cutover |
| Falla Auth/OTP/canary | Flags OFF, revocar sólo recursos run-owned, preservar auditoría; no afirmar correo recibido por accepted |

Rollback por deployment/config y desactivación controlada; datos se recuperan mediante restore probado,
no borrando DB ni revirtiendo migraciones vivas. Owners Platform/Rooms/Auth conservan sus fronteras.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] ADR aceptado, capacidad actual/coste/región y CONNECTION LIMIT registrados con owner.
- [ ] Cloud config/secret refs efectivos; Production sin fallback local/ADC/SA key; pool máximo2 por isolate.
- [ ] WIF permite sólo Rooms Production; preview/proyecto ajeno denegados; migrator fuera del deployment.
- [ ] DB/roles propios sin CREATEDB/CREATEROLE/SUPERUSER/BYPASSRLS ni membresías Greenhouse; negativas de DDL/cross-DB.
- [ ] PG objetivo, migraciones y recovery de19 tablas/ACL/constraints/triggers verificados; claves recuperables.
- [ ] RP, redirect, origin y authority audience/token alineados; ninguna autoridad desde email-match o demo.
- [ ] WAF/rate limits y fallback seguro verificados antes de exposición; sin challenge en S2S.
- [ ] Canary autorizado distingue aceptación del proveedor, recepción y acceso; revocación/cross-tenant/expiry/OFF negativos.
- [ ] Rollback/deployment/config readback y observabilidad/coste documentados; sin secretos en evidencia.

## Verification

Esta creación sólo verifica documentación. Ejecutar `pnpm task:lint --task TASK-2069`; durante ejecución,
usar la secuencia del plan y guardar pruebas sanitizadas. Ningún resultado cloud está acreditado aquí.

## Closing Protocol

- [ ] Status real, criterios y carpeta reflejan evidencia efectiva, sin cerrar rollout por un build.
- [ ] Raíz sincroniza registry/README/EPIC/Handoff/changelog y enlaza el ADR aceptado.
- [ ] Retirar recursos de canary, conservar auditoría y pendientes con owner; no revocar recursos ajenos.

## Follow-ups

- Medios/storage/worker y DNS propio permanecen en EPIC-052; nueva cohorte exige gate explícito.
