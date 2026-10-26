# TASK-1834 — Efeonce Auth first-party OIDC; Rooms como primer consumidor

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
- Status real: `2026-10-26: foundation first-party y canary real con Microsoft/MFA comprobados; seis canjes Rooms durante renovaciones, autoridad de una sala y listado global denegado. Final Auth00168-vzb100%, SHA754a2a28 y misma imagen; first-party/OTP OFF. Migración Greenhouse2063, assurance1833, onboarding general de RPs y activación duradera separados. Corrección del control de despliegue PR263/264 retenida en PR, sin merge/deploy.`
- Rank: `TBD`
- Domain: `platform|identity|ui`
- Blocked by: `none para implementación local verificada; TASK-1833 antes de activación Production`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees. Runtime Rooms main bajo ownership TASK-2065`
- Legacy ID: `TASK-1834 conserva su ID; alcance específico Greenhouse transferido a TASK-2063`
- GitHub Issue: `none`

## Conciliación vigente — 2026-10-26

Canary de identidad y correo ya completado: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). [Auth retenido en PR](../../audits/rooms/2026-10-26-auth-deploy-control.md). No ampliar esa prueba a assurance completo, login Greenhouse, clientes o nueva activación. CI general y Vercel de ambos HEAD PR263/264 PASS según el [readback documental26Oct](../../audits/rooms/2026-10-26-docs-skills-state-readback.json); ambas PR siguen abiertas y retenidas. Los criterios aún abiertos abajo mantienen su razón y alcance.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Entregar el perfil OIDC first-party reusable de Efeonce Auth y certificarlo con Rooms como primer producto
consumidor. El issuer autentica una identidad humana; cada producto conserva su sesión y autorización.
TASK-2065 implementa Rooms y TASK-2064 adapta al issuer la pantalla V4 renovada de Greenhouse.
La convergencia del portal Greenhouse pasa a TASK-2063 sin pérdida de criterios.

## Why This Task Exists

El issuer productivo publica metadata OIDC, pero su protocolo de emisión sigue orientado a MCP: no acepta
openid ni entrega id_token para productos. Rooms ya tiene dominio y persistencia local con permisos, pero
resolvePrincipal devuelve null y su API real permanece cerrada. Esperar la migración NextAuth/session_360
completa de Greenhouse acoplaría el primer consumer liviano a deuda que pertenece al portal.

La instrucción del operador del 2026-10-25 cambia el orden y la pantalla, no las fronteras de identidad.
Un access token MCP nunca sustituye al ID token de un producto. El nuevo issuer no recibe contraseñas,
cookies o permisos de Greenhouse por reutilizar su dirección visual.

## Goal

- Registrar RPs first-party con clase, audience, redirect, assurance y presentación tipados y auditados.
- Emitir identidad OIDC mínima separada de scopes, grants, gv, consentimientos y familias MCP.
- Derivar el contexto Rooms del registro/transacción; permitir fast path sólo con sesión suficiente.
- Entregar un DTO confiable a TASK-2064; el único login visible adopta la dirección V4 aprobada.
- Certificar integración y no-transferencia de autoridad con TASK-2065, sin duplicar su runtime.
- Conservar la adopción Greenhouse en TASK-2063; Studio/Workbench consumen esta foundation después.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias: una identidad canónica, ningún linking por email/dominio; cada RP tiene audience,
redirect, transacción, secreto y sesión propios. La clase first_party_sign_in sólo nace del registro gobernado,
nunca de DCR, CIMD, query o metadata arbitraria. El callback no aprovisiona personas, principals ni grants.
El issuer autentica; Rooms revalida sus permisos persistidos y Greenhouse conserva sus permisos actuales.

## Normative Docs

- `docs/tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md`
- `docs/tasks/to-do/TASK-1840-efeonce-id-multiproduct-logout-session-revocation.md`
- `docs/tasks/to-do/TASK-1841-efeonce-id-first-consented-customer-pilot.md`
- `docs/tasks/to-do/TASK-2063-greenhouse-customer-login-convergence-native-issuer.md`
- `docs/tasks/in-progress/TASK-1964-login-v4-premium-access-transition.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- TASK-1829/TASK-1830: protocolo OAuth, sesión y métodos existentes del issuer; se extienden sin regresión.
- TASK-1631/TASK-1836: identidad canónica y autenticación externa/interna vigentes; no heredar grants MCP.
- TASK-2064: render V4 y GVC de Auth; contrato de presentación y estados de protocolo se acuerdan aquí.
- TASK-2065: consumer Rooms, transacción/callback/sesión y binding a principal local; entrega su evidencia E2E.
- TASK-1833 gatea activar en Production; TASK-1832/1841 conservan certificación sintética y piloto externo.

### Blocks / Impacts

- TASK-2065 consume foundation; su código puede avanzar con fixtures de contrato, no declarar identidad live.
- TASK-2063, TASK-1898 y TASK-1952 consumen perfil OIDC reusable; no necesitan otra foundation específica.
- TASK-1840 conserva logout multiproducto. El logout local no acredita cierre global de sesiones.
- TASK-1842 conserva su puerta Greenhouse dependiente de TASK-2063, no queda desbloqueada por Rooms.

### Files owned

- `src/lib/auth-server/oauth/**`, `src/lib/auth-server/persons/**` sólo protocolo/contexto confiable; renderer V4 de TASK-2064.
- `services/auth-server/**`, scripts de registro y migraciones aditivas del dominio greenhouse_auth.
- Contrato OAuth/ADR, tests focales y conformance; no archivos del runtime Rooms ni provider NextAuth Greenhouse.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- Issuer Cloud Run, KMS/JWKS, OAuth MCP, sesión propia, Microsoft interno, magic link/passkey/TOTP.
- Login renovado Greenhouse en TASK-1964 y anuncios gobernados de TASK-1963 como fuente de TASK-2064.
- Rooms tiene principals/memberships/grants persistidos y loadAuthority por transacción; resolvePrincipal es null.

### Gap restante después de implementación local

- Registro/policy, emisión id_token y contexto/fast path están implementados detrás de flag OFF; falta promoción y readback de entorno autorizado.
- Falta certificar el recorrido completo con Rooms y la pantalla V4 bajo los gates propios de sus tasks.
- Rooms necesita binding identidad/principal y sesión propia; TASK-2065 posee esa integración.
- Migraciones cloud1834/2067 y registroRP verificados; browserE2E local pasó. Código servido, activación y canary productivos siguen pendientes.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/auth-server/**` + `services/auth-server/**`; consumer Rooms independiente bajo TASK-2065
- Future candidate home: `remain-shared`
- Boundary: issuer OIDC reusable; DTO de presentación confiable; producto autoriza sin access token MCP
- Server/browser split: registro, códigos, llaves, PKCE, tokens y sesiones server-side; browser sólo redirects y formularios sanitizados
- Build impact: inputs del auth-server deben pasar gates worker; no introducir runtime Next/MUI dentro del issuer
- Extraction blocker: no compartir store de sesión ni DB de producto; no nuevo deployable por esta task

## Consumer experience contracts

TASK-1834 entrega protocolo y DTO confiable, sin ownership de pantalla o navegación de producto.
TASK-2064 posee la pantalla V4 de Auth y sus artefactos/readiness/GVC; TASK-2065 posee entry, callback,
recovery y sesión Rooms. Ambos consumen registro RP, clase first_party_sign_in y presentación validados.
La aceptación integrada exige evidencia de sus recorridos, sin convertir esta foundation en task híbrida.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: greenhouse_auth registro y transacciones; identidad canónica existente
- Consumidores afectados: Auth UI, Rooms, futuros Greenhouse/Studio/Workbench; OAuth MCP como regresión
- Runtime target: local/staging primero; Production bajo gates específicos

### Contract surface

- Contrato existente a respetar: oauth/store/port.ts, metadata/authorize/token, sesión persons y KMS
- Contrato nuevo o modificado: RP first-party tipado, emisión OIDC, contexto confiable y conformance
- Backward compatibility: `gated` y aditiva
- Full API parity: registro por command gobernado y adapters existentes; sin SQL manual ni UI-only config

### Data model and invariants

- Entidades nuevas: `greenhouse_auth.first_party_clients`, `first_party_login_transactions`, `first_party_codes`, `first_party_access_handles`. El registro MCP `oauth_clients` no cambia. Migración `migrations/20261025212915003_task-1834-first-party-oidc.sql`.
- Invariantes: openid no entra al catálogo MCP; id_token sólo identidad/assurance, aud=client_id, nonce validado.
- Clase, presentación, redirect y assurance derivan de registro, nunca de metadatos arbitrarios del navegador.
- No scopes/grants/gv MCP como requisito para login; no roles/org/capabilities como autoridad del producto.
- Write-target allowlist: toda tabla nueva se declara en boundary-domain.test.ts en el mismo cambio.
- Tenant/space boundary: issuer autentica sujeto; Rooms resuelve identidad/principal/grants en TASK-2065.
- Idempotency/concurrency: transacciones y códigos de un uso, replay denegado, PKCE ligado al cliente/redirect.
- Audit/outbox/history: eventos sanitizados de RP/autorización/denegación; no inventar consentimientos MCP.

### Migration, backfill and rollout

- Migration posture: `additive`; sin backfill de personas, principals, memberships o grants.
- Default state: flag OIDC first-party OFF; registro de RP por command gobernado.
- Backfill plan: ninguno; consumidores usan binding explícito existente o deniegan.
- Rollback path: deshabilitar first-party/RP afectado y transacciones; conservar OAuth MCP operativo.
- External coordination: migración, secreto cliente por entorno, registro redirect exacto y deploy del issuer.

### Security and access

- Auth/access gate: registro gobernado + issuer/audience/firma/expiry/state/nonce/PKCE + sesión vigente.
- Sensitive data posture: claims mínimos; secretos sólo server-side; auditoría sin tokens/códigos/PII.
- Error contract: errores protocolarios cerrados y copy anti-enumeración; detalles sólo sanitizados.
- Abuse/rate-limit posture: límites existentes, replay guard y anti-loop; sin bypass por ser first-party.

### Runtime evidence

- Local checks: tests auth-server/OIDC/registro, metadata y regresión MCP.
- DB/runtime checks: migración real, constraints, consumo único concurrente y readback de RP.
- Integration checks: Rooms + segundo RP sintético; audiencia cruzada, sin vínculo, revocado, fast path y recovery.
- Reliability signals/logs: causas de denegación, replay, mismatch y latencia de revocación sanitizadas.
- Production verification sequence: dark deploy → staging → assurance → cohorte aprobada → readback/rollback.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects. Evidencia local: tests de protocolo y PostgreSQL enlazados en Verification; no acredita cloud.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit. Evidencia local: tests de protocolo y PostgreSQL enlazados en Verification; no acredita cloud.
- [x] Toda tabla nueva queda declarada en el allowlist de escritura del dominio con justificación. Evidencia local: tests de protocolo y PostgreSQL enlazados en Verification; no acredita cloud.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk. Evidencia local: tests de protocolo y PostgreSQL enlazados en Verification; no acredita cloud.
- [x] Runtime/DB evidence acredita migración y protocolo, sin provisión implícita. Evidencia local: tests de protocolo y PostgreSQL enlazados en Verification; no acredita cloud.
- [x] Errores/audit/señales no filtran secretos, raw subjects ni datos personales. Evidencia local: tests de protocolo y PostgreSQL enlazados en Verification; no acredita cloud.

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

### Slice 0 — Contrato común y ownership

- Fijar estrategia de subject, claims mínimos, assurance/freshness, registro RP y respuesta token coherente.
- Fijar DTO seguro para login TASK-2064 y contrato consumer TASK-2065; Greenhouse pasa a TASK-2063.
- Declarar semántica de revocación de identidad/sesión y límites del logout local frente a TASK-1840.

### Slice 1 — Registro y OIDC first-party

- Migración aditiva/port tipado, registro por command y metadata veraz.
- Authorize/code/token separados de MCP, ID token ES256 aud=RP, nonce/state/PKCE y consumo único.
- Rechazar recurso/scope MCP en cliente first-party y elevación de DCR/CIMD a esa clase.

### Slice 2 — Sesión y contexto confiable

- Obtener RP y presentación de transacción validada; login directo neutral.
- Fast path sólo con sesión, assurance y frescura suficientes; demás casos reautentican o deniegan.
- No pantalla ni fila de consentimiento delegado first-party; preservar MCP/terceros.

### Slice 3 — Conformance con Rooms

- TASK-2065 entrega entry/callback/sesión/binding local y TASK-2064 render V4.
- Verificar segundo RP sintético, rechazo de tokens cruzados, permisos Rooms y recovery sin loops.
- Registrar evidencia de revocación, expiración, rollback y cero provisión implícita.

### Slice 4 — Operación y cierre proporcional

- Tests/build/gates, flags/migraciones/readback y runbook de onboarding RP.
- Sin gates Production, estado code complete/rollout pendiente; no cerrar por tests solamente.

## Out of Scope

- Runtime consumer Rooms (TASK-2065), contenido/editor/medios Rooms (EPIC-052) y UI V4 (TASK-2064).
- Migrar provider, NextAuth, session_360 o login Greenhouse (TASK-2063).
- Password store, copiar cookies/tokens, signup, merge por email, provisión desde callback.
- Cambiar grants/capabilities/scopes MCP, habilitar clientes externos o retirar métodos clásicos por inferencia.
- Logout multiproducto (TASK-1840), credenciales (TASK-1842), Google/Microsoft cliente como upstream nuevos.

## Detailed Spec

La persona abre Rooms y TASK-2065 crea transacción propia con destino relativo permitido. Auth resuelve el
RP registrado, autentica en V4 sólo si hace falta y entrega código de un uso sin consentimiento delegado.
Rooms valida issuer/firma/audience/nonce/state/PKCE, resuelve binding explícito y revalida sus grants. Cero
contextos deniega; uno abre; varios exigen selección autoritativa. No se elige por email ni se mezclan roles.
La misma sesión Auth puede facilitar otro producto, pero jamás copia la cookie ni la autoridad de Rooms.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Contrato 0 → registro/protocolo 1 → sesión/contexto 2 → conformance 3 → cierre 4.
Consumers pueden desarrollar con fixtures de contrato congelado; no acreditan runtime real por ese motivo.
TASK-1833 es gate de activación Production; TASK-1832/1841 se mantienen para externos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| First-party hereda grants MCP | auth | medium | policy separada y negativos de no-transferencia | token/scope mismatch |
| Contexto/marca/retorno forjado | auth/UI | medium | RP/transacción tipados; ignore/reject input libre | invalid RP context |
| ID token de otro RP aceptado | identity | medium | audience/nonce/PKCE/client/redirect exactos | cross-audience deny |
| Callback fabrica acceso | Rooms | medium | binding previo + autoridad persistida por2065 | unlinked/unauthorized |
| Logout local se presenta global | UX/session | medium | alcance explícito; TASK-1840 separada | sesión restante observada |
| Login V4 copia métodos inexistentes | UI/auth | medium | métodos elegibles del issuer;2064 | método no configurado |

### Feature flags / cutover

`AUTH_SERVER_FIRST_PARTY_ENABLED=false` por default en config y deploy. El runtime además exige OAuth/person-auth activos. IDs reservados `efeonce-rp-`; con flag OFF se deniega esa familia sin consultar tablas nuevas y sin fallback MCP.
UI/contexto y consumer Rooms tienen gates separados; no modificar métodos ni cohortes Greenhouse.

### Rollback plan per slice

| Slice | Rollback | Tiempo objetivo | Reversible? |
|---|---|---|---|
| 0 | revert documental sin afectar runtime | inmediato | sí |
| 1–2 | flag first-party OFF, deshabilitar RP y transacciones; mantener OAuth MCP | <10 min | sí; schema aditivo queda |
| 3 | consumer Rooms OFF/sesiones invalidadas según2065; UI rollback según2064 | <15 min | sí |
| 4 | retirar cohorte, preservar evidencia y auditoría | <15 min | sí |

### Production verification sequence

1. Flags OFF: metadata/MCP sin regresión; login Greenhouse intacto.
2. Migración staging y pruebas reales de código/token/nonce/replay con dos RPs.
3. Consumer Rooms y V4 en entorno de prueba; permisos/expiración/revocación/rollback medidos.
4. Assurance TASK-1833 aplicable antes de activación; cohorte interna nominada con permiso propio.
5. Cliente externo sólo mediante TASK-1841 y evidencia TASK-1832; observación y soporte.

### Out-of-band coordination required

Registro de RP por entorno, secrets/config/deploy y coordinación con peer Rooms. La demo publicada no es
identidad productiva ni DB cloud. La autorización de implementación no acredita pruebas ni gates cumplidos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria


- [x] Canary interno real de identidad, un correo y una imagen: acceso válido, denegaciones y revocación, con flags restaurados OFF. Evidencia: [canary2026-10-26](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). No acredita UI ni activación general.
- [x] Operador aprobó el2026-10-25 Rooms primero y login V4 Greenhouse como pantalla del issuer; re-scope documental asigna consumer Rooms a2065, UI a2064 y Greenhouse a2063.
- [ ] Registro RP tipado/auditado exige redirect exacto, clase first-party, audience, scopes mínimos y assurance. Registro, redirect, audience y scope verificados localmente; v1 limita frescura por `sessionMaxAgeSeconds`/`prompt`/`max_age`, sin declarar ACR/AMR o step-up assurance completo (TASK-1833).
- [x] Metadata y token endpoint concuerdan: openid emite id_token ES256 con nonce/aud propios sin gv/grants MCP. Evidencia: `protocol.test.ts` valida firma y conjunto exacto de claims; HTTP local verifica canje real.
- [ ] DCR/CIMD/browser no pueden elevar clase ni elegir marca, modo, audiencia o retorno confiable.
- [x] Código/token/nonce/redirect/secret de un RP son rechazados por otro; replay y consumo concurrente fallan cerrado. Evidencia: Negativos de audience/credenciales/binding y replay durante firma; PG prueba locks, invalidación y rechazo de inserción tardía. Intento de RP B no consume código de A.
- [x] Sesión suficiente vuelve sin UI ni consent; insuficiente/vencida/revocada reautentica o deniega. Evidencia: Protocol tests fast path, prompt=none/login y max_age; incluso mismo segundo exige sesión nueva. PG revalida profile/link/entorno/sesión/provenance corporativa.
- [x] MCP/terceros siguen requiriendo consentimiento/step-up; first-party no crea consent falso. Evidencia: Regresión `oauth-flow.test.ts` y store assertion cero consents/AT MCP en first-party; suite auth+service 530 PASS/15 skip reportada por coordinador.
- [x] TASK-2064 muestra V4 fiel con Rooms contextual y variante neutral, sólo métodos reales; GVC/readiness/foco/mobile sin overflow. Evidencia: `docs/ui/reviews/TASK-2064-efeonce-id-login-v4-rooms/README.md` (6 variantes/42 frames, revisión independiente desktop/móvil).
- [x] TASK-2065 completa entry → issuer → callback → sesión Rooms con binding explícito, sin crear identidad/principal/grant. E2E browser/PG reales confirmado por sesión dueña TASK-2065, `../efeonce-rooms/scripts/auth-integration.ts`.
- [ ] Rooms permite sólo recursos autorizados; organización ajena, principal inactivo y grants revocados/vencidos deniegan URL/API.
- [x] Identidad 0/1/N no usa primer match ni unión de permisos; sesión/cookie/token propios de Rooms. E2E2065: 0→403, 1→auto, 2→selección, admin/operator no se fusionan.
- [ ] Recovery no reinicia redirects; expiración, revocación y rollback tienen evidencia y alcance declarado.
- [ ] Login Greenhouse y OAuth MCP mantienen comportamiento con gates first-party ON/OFF.
- [ ] Migración real, tests/focales/build, ledger/config y runtime evidence sincronizados; sin cierre por mocks.
- [ ] TASK-1833 y gates de población aplicables preceden la activación; no presentar canary como cliente real.
- [ ] Runbook permite registrar otro RP sin branch específico del producto ni cambio a catálogo MCP.

## Verification

- [Preparación cloud y readback independiente](../../audits/identity/2026-10-25-auth-rooms-controlled-rollout.md): seis tablas, dosGC, markers, ACL, registroRP y secretosv1; gatesOFF, sin email.

- `pnpm task:lint --task TASK-1834`
- Gates UI de TASK-2064/TASK-2065 enlazados como evidencia de consumers, sin UI propia en esta foundation.
- Tests focales auth-server/registro/OIDC, SQL real y regresión OAuth MCP; gates de build worker.
- Evidencia browser/GVC y conformance de TASK-2064/TASK-2065, con segundo RP negativo.
- Readback de flags/RP/migraciones y rollback; producción sólo con gates aplicables.

### Evidencia local del 2026-10-25

- [Protocolo y negativos](../../../src/lib/auth-server/first-party/protocol.test.ts), [regresión MCP](../../../src/lib/auth-server/oauth/oauth-flow.test.ts), boundary e internal login/transport: 5 archivos, **156 tests PASS**. Pruebas: ID token ES256 mínimo, client/audience/PKCE, contexto confiable, sesión/frescura, cross-RP, replay concurrente e invalidación antes de insertar handle.
- [PostgreSQL real](../../../src/lib/auth-server/first-party/local-pg.test.ts), [fixture mínima](../../../scripts/auth-server/first-party-local-fixture.sql) y [runner aislado](../../../scripts/qa/verify-auth-first-party-local-pg.py): **6 tests PASS** con rol `greenhouse_app`, migración Up real, audit append-only, constraints, locks, GC bounds/NULL/dry-run/apply y resolución viva profile/link/sesión/enrollment corporativo. DB temporal eliminada al terminar; ninguna conexión cloud.
- [Harness HTTP](../../../scripts/auth-server/first-party-local-server.ts): `python3 scripts/qa/verify-auth-first-party-local-pg.py --serve` conserva PG efímero y escucha sólo `127.0.0.1:19334`; callback local por defecto `http://127.0.0.1:19335/auth/callback`. Config de fixtures y secreto se escriben en archivo temporal `0600`, nunca stdout. Protocolo/store/identity reales, firma ES256/JWKS local; audit/rate-limit en memoria. Controles de fixture existen únicamente en este script, no en runtime deployable.
- Smoke HTTP contra ese issuer: authorize → code exchange → introspection activa → revoke → introspection inactiva **PASS**; la sesión dueña ejecutó además E2E TASK-2065 con Chrome y PG de ambos runtimes: entry/callback/context, 0/1/N, permisos separados, cross-org404, logout401 y revocación issuer→business/session401 PASS. Se corrigió y probó `iss` exacto del callback (RFC9207).
- ESLint y `git diff --check` del backend focal **PASS**. `pnpm exec tsc --noEmit --pretty false` global **PASS** al cierre de esta verificación. Suite completa auth+service reportada por coordinador: **571 PASS/16 skip**; los skip no se cuentan como evidencia ejecutada.
- Los handles y códigos tienen TTL máximo **300 s**; ID token `aud=client_id`, claims `iss/sub/aud/iat/exp/auth_time/nonce`, sin refresh ni userinfo. Introspection revalida autoridad del issuer en cada consulta; no acredita logout global TASK-1840. GC first-party y OTP se integran al runner existente `maintenance/gc.ts` dentro de la misma transacción/lock global; funciones ausentes o retención mayor a 30 días se omiten explícitamente. Diez tests focales de mantenimiento PASS; no se creó cron nuevo. Readback operativo y assurance permanecen como gate antes del rollout.
- No se agregó FK de códigos/handles a sesiones existentes: evita cambiar el grafo de borrado/GC de sesiones; el port vivo deniega una sesión eliminada/revocada. FK compuesta código/cliente y consumo bloqueado conservan el aislamiento de RP.
- Login announcements conserva DTO opcional y fallback visual oficial; no se importó el reader PostgreSQL del portal dentro del issuer. Feed editorial live separado y pendiente, sin bloquear protocolo.

## Closing Protocol

- [ ] Lifecycle, Status real, carpeta y criterios coinciden con evidencia.
- [ ] Task/epic/ADR/registry/manuales/flags actualizados y con ownership sin duplicación.
- [ ] Gates task/UI/backend/build y QA proporcional pasan; consumer E2E enlazado.
- [ ] No se afirma migración Greenhouse, logout global, cliente externo ni rollout sin evidencia propia.

## Decision log and continuity

La versión Greenhouse de TASK-1834 se preserva en TASK-2063 con su cuerpo y criterios. Se trasladan allí los
contratos TenantAccessRecord, NextAuth, session_360, módulos/vetos, deep links y recovery clásica. Los artefactos
UI separados conservan la dirección original y registran el nuevo consumer. TASK-1898/1952 siguen dependiendo
de la foundation de esta task. TASK-1842 conserva explícitamente la dependencia de adopción Greenhouse.
