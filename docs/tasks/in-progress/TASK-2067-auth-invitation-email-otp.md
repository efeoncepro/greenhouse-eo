# TASK-2067 — Auth invitation email OTP

## Delta 2026-10-25 — estado al corte de Codex

- Código y migración en cloud; `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=false` en `auth-server-00166-p77` y HMAC/autoridad sin montar (sólo con ON). Ningún correo enviado. Pendiente: parity S2S, mailer/KMS/S2S integrados, consumo atómico en Rooms, canary único y closing protocol. Corte en [registro de estado](../../audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Core OTP, stores, correo gobernado y SQL local verificados; wiring root disponible con flag OFF. E2E Rooms/issuer con ambas PG y ES256 reales PASS; entrega sólo RAM, migración cloud aplicada con ACL verificadas, emailtypeFALSE; HMACv1 creado, sender sin tracking validado con keyproducción; deploy/KMS/canary pendientes, sin envíos reales.`
- Rank: `P1`
- Domain: `identity|platform|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`

## Summary

Auth genera y verifica el código de seis dígitos incluido en el mismo correo que el enlace a Rooms.
Entrega una prueba firmada limitada a la invitación/RP; Rooms crea su sesión guest mediante TASK-2066.

## Why This Task Exists

El issuer tiene magic links, pero carece de OTP con intento, revocación y binding por invitación.
Un código verificado no puede convertirse implícitamente en identidad global ni sesión SSO.

## Goal

- Proveer generación, entrega gobernada y verificación atómica sin exponer OTP.
- Emitir prueba ES256 de un uso downstream con audiencia y nonce exactos.
- Probar concurrencia, límites y persistencia SQL aislada antes de integrar Rooms.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-1834: registro first-party, autenticación S2S y signer KMS existente.
- TASK-2066: lector canónico de invitación y consumo atómico proof/sesión Rooms.
- `src/lib/email/delivery.ts`: envío gobernado mediante Resend.

### Blocks / Impacts

- TASK-2066: integración guest real. TASK-2064 no necesita poseer pantalla OTP de Rooms.

### Files owned

- `src/lib/auth-server/email-otp/`
- `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md`
- `migrations/20261025213415654_task-2067-invitation-email-otp.sql`.
- `src/lib/email/types.ts`, `src/lib/email/templates.ts`, `src/lib/email/delivery.ts`, `src/emails/RoomsInvitationOtpEmail.tsx` y copy del correo.
- `scripts/auth-server/email-otp-local-smoke.sh`, `scripts/auth-server/email-otp-preview.tsx`.

## Current Repo State

### Already exists

- `src/lib/auth-server/persons/magic-link.ts`, `src/lib/auth-server/keys/kms-signer.ts` y email delivery.

### Gap

- Falta challenge OTP de baja entropía protegido por HMAC y presupuesto durable entre reenvíos.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/auth-server/email-otp/` en issuer existente.
- Future candidate home: `remain-shared`
- Boundary: prepare/verify S2S con puertos authority, mailer, signer y store.
- Server/browser split: OTP, DB, secrets y proveedor sólo servidor; UI pertenece a Rooms.
- Build impact: node:crypto y PostgreSQL existentes; ningún SDK nuevo.
- Extraction blocker: registro RP, KMS y email gobernado del issuer.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: challenge/presupuestos greenhouse_auth; invitación sigue en Rooms.
- Consumidores afectados: TASK-2066 backend Rooms.
- Runtime target: `local` primero; promoción posterior con evidencia.

### Contract surface

- Contrato existente a respetar: ADR OTP y registro first-party.
- Contrato nuevo o modificado: prepare/verify issuer; proof firmado de invitación.
- Backward compatibility: `gated`; no cambia magic link, OIDC o MCP.
- Full API parity: primitive server-side con handler S2S; no lógica de negocio en UI.

### Data model and invariants

- Entidades/tablas/views afectadas: greenhouse_auth.email_otp_challenges, greenhouse_auth.email_otp_budgets.
- Invariantes: nunca persistir OTP/raw link; consumo atómico; reenvío no reinicia intentos; audience exacta.
- Write-target allowlist: agregar ambas tablas justificadas en boundary-domain.test.ts por coordinador.
- Tenant/space boundary: client autenticado y canonical invitation resolver, nunca email/URL arbitrarios.
- Idempotency/concurrency: requestId y locks de invitación/buckets en orden estable; CAS generación de entrega.
- Audit/outbox/history: puerto de auditoría con IDs y reason codes, sin PII ni secretos; email token_sensitive.

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `disabled`, sin wiring hasta adapters y gates completos.
- Backfill plan: no hay datos históricos que migrar.
- Rollback path: deshabilitar wiring y conservar tablas; códigos consumidos no reviven.
- External coordination: secreto HMAC, registro RP, template email y reader canónico Rooms.

### Security and access

- Auth/access gate: cliente confidencial activo y capability OTP allowlisted por adapter.
- Sensitive data posture: HMAC de código/bindings, mail/URL sólo memoria para entrega.
- Error contract: invalid_request, invalid_invitation, invalid_code, rate_limited, delivery_failed, unavailable.
- Abuse/rate-limit posture: TTL10min,5intentos/h/invitación,60s cooldown y presupuestos agregados ADR.

### Runtime evidence

- Local checks: vitest email-otp, ESLint y task lint.
- DB/runtime checks: PostgreSQL efímero local; no credenciales cloud.
- Integration checks: fake mailer y signer; Rooms E2E depende adapters reales y TASK-2066.
- Reliability signals/logs: auditoría sanitizada, receipts accepted/failed sin afirmar entrega.
- Production verification sequence: migración staging, wiring disabled, canary sintético, autorización release.

### Acceptance criteria additions

- [x] Tablas declaradas en allowlist de escritura y migración verificada localmente: boundary-domain.test.ts y SQL local3PASS.
- [x] Fuente, consumidores, invariantes, frontera y rollback SQL local comprobados en ADR/QA. Rollback operativo pendiente del canary.

## Capability Definition of Done — Full API Parity gate

- [ ] Prepare/verify comparten primitive canónica server-side y autorización S2S fina.
- [ ] Ruta programática y cliente autorizado probados con wiring real; no exposición MCP del secreto.

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

### Slice 1 — Contrato y núcleo

- Puertos canonical authority/mail/signer; HMAC, estados, intentos y challenge atómico.

### Slice 2 — Persistencia y pruebas

- Stores memoria/PostgreSQL y migración aditiva; fallos y concurrencia.

### Slice 3 — Integración coordinada

- Root integra email/router/auth/signing; peer integra canonical authority y proof consumer.

## Out of Scope

- Sesión SSO global, aprovisionamiento por email, código en URLs, envío real y deploy cloud.
- UI Rooms, owned por TASK-2066; migración Greenhouse owned por TASK-2063.

## Detailed Spec

ADR `docs/architecture/EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md` es contrato completo.
Un solo correo contiene enlace y OTP. La prueba ES256 typ rooms-invitation-proof+jwt expira en120s máximo.

## Rollout Plan & Risk Matrix

Cambio additive, inicialmente sin conexión al runtime público. Implementación local no acredita disponibilidad.

### Slice ordering hard rule

Contrato → núcleo/stores/tests → wiring/Rooms → canary → release autorizado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Replay | Auth/Rooms | medium | consume atómico y UNIQUE jti | invalid_code/replay |
| Flood correo | Resend | medium | budgets y cooldown | rate_limited |
| Invitación revocada | Rooms | medium | lector canónico antes/después OTP | invalid_invitation |
| Error después de consumo | Auth | medium | fail-closed y nueva emisión limitada | unavailable |

### Feature flags / cutover

Adapter público deshabilitado por defecto; no registrar rutas activas hasta wiring completo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Core/DB | quitar wiring; conservar datos efímeros | un deploy | sí |
| Integración | desactivar método OTP | un deploy | parcial, consumo no se revierte |

### Production verification sequence

1. SQL local y regresión issuer.
2. Adapters reales en staging, flag off y secreto configurado.
3. Canary Rooms autorizado con identidad sintética, un correo y replay/revoke.
4. Release autorizado y readback; no completar con mocks.

### Out-of-band coordination required

Peer Rooms posee contrato invitación y sesión; root posee email template, KMS, route wiring y release.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Contrato correo único, proof limitado y ownership acordado en ADR con root/peer.
- [x] Core rechaza replay, wrong code, expiry, cruce RP/version/recipient y revocación. Evidencia: QA local TASK-2067, 2026-10-25.
- [x] Reenvío invalida previo, idempotencia no duplica correo y límites sobreviven reenvío/versiones. Evidencia: QA local TASK-2067, 2026-10-25.
- [x] Código nunca sale por HTTP ni persiste; secreto corto/ausente falla cerrado. Evidencia: QA local TASK-2067, 2026-10-25.
- [x] SQL local prueba concurrencia; delivery/signing failure no permiten replay. Evidencia: QA local TASK-2067, 2026-10-25.
- [ ] Mailer token_sensitive, auth S2S, authority reader y KMS integrados con evidencia.
- [ ] Rooms consume jti/invitation/session atómicamente y revocación bloquea sesión guest. E2E TASK-2066 confirma consumo, replay denegado y revoke→401; cierre de atomicidad/concurrencia en QA backend de la sesión dueña.
- [ ] Rollout autorizado y canary end-to-end; estado runtime explícito.

## Verification

- [Preparación cloud](../../audits/identity/2026-10-25-auth-rooms-controlled-rollout.md): migración y secretos preparados; sin activación/email.

- Evidencia: `docs/audits/identity/TASK-2067-email-otp-local-qa-2026-10-25.md`.
- `bash scripts/auth-server/email-otp-local-smoke.sh` — 3 PASS PostgreSQL local efímero.
- `pnpm exec tsx scripts/auth-server/email-otp-preview.tsx` — preview sintético 1280/390 revisado.

- `pnpm exec vitest run src/lib/auth-server/email-otp`
- `pnpm exec eslint src/lib/auth-server/email-otp`
- `pnpm task:lint --task TASK-2067`
- SQL local efímero + E2E Rooms por owners respectivos.

## Closing Protocol

- [ ] Lifecycle y carpeta reflejan estado real.
- [ ] README, registry y Handoff actualizados por coordinador.
- [ ] Changelog y cross-impact check registrados cuando cambie runtime.
- [ ] Criterios pendientes conservan limitaciones y evidencia faltante.

## Follow-ups

TASK-2066 es dueña de UI/canonical resolver/guest session; TASK-2065 sigue OIDC interno.
