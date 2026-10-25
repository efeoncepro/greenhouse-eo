# TASK-2065 — Rooms Efeonce ID Consumer

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
- Backend impact: `integration`
- Epic: `EPIC-052`
- Status real: `Consumer local completo:95testsPASS0skip, tipos/lint/build, Chrome con issuer1834 y PostgreSQL reales, rollback/restore14tablas PASS. API/OIDC OFF por defecto, sin DBcloud ni UIcontext/recovery. Evidencia docs/audits/rooms/2026-10-25-efeonce-id-consumer.md.`
- Rank: `Después de TASK-1834 foundation; integración antes de TASK-2066`
- Domain: `identity|platform|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-rooms main; checkout compartido sin worktrees`

## Summary

Construir el consumidor first-party Efeonce ID en Rooms: transacción OIDC, callback validado, binding explícito, sesión durable y revalidación por introspection. El issuer autentica; Rooms conserva sus principals, memberships, roles y grants en PostgreSQL. Foundation backend OFF por defecto, con integración local real antes de cualquier rollout.

## Why This Task Exists

`../efeonce-rooms/src/server/session.ts` devuelve null y la API real deniega401. Rooms ya tiene autoridad persistida, pero no tablas de transacción/sesión/binding ni consumidor OIDC. Copiar una sesión Greenhouse o aceptar tokens MCP rompería la separación de productos. Una cookie válida sin revalidación del issuer permitiría sobrevivir a una revocación.

## Goal

- Resolver identidad por issuer/sub verificados y asociación administrada, sin provisión por correo.
- Mantener permisos actuales en PG y sesiones separadas por producto/entorno.
- Demostrar entrada, callback, expiración, introspection, logout local y denegación en integración real aislada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md` — Accepted; contrato de integración inicial.
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`.

Reglas obligatorias: una identidad verificable no concede membership ni capability; sin tokens MCP, cookie compartida, claims de rol fabricados ni selección arbitraria de tenant. Identificar en el plan el delta ADR consumidor para stores/binding/introspection y su relación con el ADR aceptado; esta task no inventa contrato del issuer.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/architecture/rooms/README.md`.
- Skills `software-architect-2026` y `greenhouse-secret-hygiene`.

## Dependencies & Impact

### Depends on

- `docs/tasks/in-progress/TASK-1834-efeonce-auth-first-party-oidc-rooms.md`: issuer reusable, registro confidencial, code/token/introspection/revoke.
- `../efeonce-rooms/src/server/persistence/{authority,pool,config}.ts`: autoridad y PostgreSQL local existentes de TASK-2060.
- `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`: contrato exacto; verificar implementación, no asumirla por documento.

### Blocks / Impacts

- TASK-2066 consume esta sesión/binding para aceptar invitaciones; el OTP pertenece a TASK-2067 issuer.
- UI de entrada/recovery/contexto Rooms se implementará en unidad ui-ux posterior antes de rollout humano; aquí sólo contrato y transporte sin pantalla nueva.
- TASK-2062 conserva manifests/HTTP de contenido; coordinar el único punto `session.ts` sin reescribir sus adapters.

### Files owned

- Runtime `../efeonce-rooms/src/server/session.ts`; nuevos `src/server/auth/**` y contrato browser-safe `src/domain/auth-contracts.ts`.
- Nuevos route handlers de transporte `src/app/login/route.ts`, `src/app/auth/callback/route.ts`, `src/app/auth/logout/route.ts`, `src/app/api/auth/session/route.ts`; paths propuestos a confirmar en plan, no páginas visuales.
- Migración additive nueva en `../efeonce-rooms/migrations/`; tests dedicados `tests/*auth*.test.ts`; script local de integración auth propio.
- Wiring mínimo en `src/server/http/runtime.ts`, configuración/ejemplo env, dependencias estrictamente necesarias; coordinar con dueño TASK-2062.
- Documentación de task, plan, ADR delta consumidor y manual Rooms; no archivos del issuer.

## Current Repo State

### Already exists

- `session.ts` fail-closed; `src/server/http/api.ts` recibe resolver(Request); `runtime.ts` es composición real sin fallback demo.
- `loadAuthority` relee principal/membership/grants, usa clock_timestamp y limita expiración al menor plazo.
- `src/domain/permissions.ts`: role ceiling + grant + scope + vigencia; externos cliente, sin grants de organización.
- PG admite sólo loopback55432/rooms_local con roles runtime/migrator separados; no DB cloud ni sesión durable.

### Gap

- Falta binding canónico issuer/sub, transacción consumible una vez y sesión opaca con handle sólo servidor.
- No existe una política implementada de introspection/revocación/recovery para Rooms.
- Header Authorization o cookie arbitraria nunca deben ser interpretados como principal de negocio.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms/src/server/auth` como módulo server-only dentro del runtime existente; issuer separado en Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: consumidor OIDC + resolver de sesión; commands/readers Rooms mantienen autorización de negocio.
- Server/browser split: firma, secrets, tokens, store y DB sólo servidor; browser recibe cookie opaca y DTO mínimo.
- Build impact: dependencia OIDC/JWKS auditada si necesaria; sin importar runtime auth-server ni Greenhouse al bundle Rooms.
- Extraction blocker: registro RP y transacciones del issuer, sesión durable y autoridad PG local; sin repos/packages nuevos.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: issuer para identidad; stores locales Rooms para sesión/binding; PG Rooms para autoridad.
- Consumidores afectados: API Rooms, futuros entry/recovery UI y TASK-2066.
- Runtime target: `local` integrado con issuer real aislado; dark deploy separado de activación.

### Contract surface

- Contrato existente a respetar: ADR Rooms-first, Principal/can/loadAuthority y composición API fail-closed.
- Contrato nuevo o modificado: beginAuthorization, consumeCallback, resolveSession, revokeLocalSession y reader mínimo; schema transacción/sesión/binding.
- Backward compatibility: gated y additive; /demo y V1/V2 de contenido intactos.
- Full API parity: primitives server-side compartidos por adapters; redirección/cookie son transporte de sesión, no nueva capability comercial ni token CLI. Catálogo distingue autenticación de capacidades de negocio.

### Data model and invariants

- Entidades/tablas/views afectadas: propuestas rooms.auth_transactions, rooms.identity_bindings, rooms.sessions; nombres finales congelados en plan antes de migrar. Principals/memberships/grants existentes conservan ownership.
- Invariantes que no se pueden romper:
  - Identidad por issuer/sub opacos verificados, no email/domain match; binding explícito hacia principal previamente autorizado.
  - Code/state/nonce/PKCE y transacción vinculados a RP/entorno/destino exactos; consumo único incluso con callbacks concurrentes.
  - Sesión no sobrevive a introspection inactiva, expiry ni revocación local; fallo del issuer deniega temporalmente, sin permisos cacheados por comodidad.
- Write-target allowlist: migración declara grants SQL mínimos para nuevas tablas y tests verifican destinos; no ampliar permisos runtime sobre principals/memberships.
- Tenant/space boundary: contexto elegible desde binding + memberships actuales; 0 deniega,1 continúa, varios requieren selección validada sin LIMIT1. organizationId solicitado sólo intersecta.
- Idempotency/concurrency: consumo atómico de transaction/state; nonce/code no replay; logout idempotente; carreras session/revoke probadas.
- Audit/outbox/history: eventos auth acotados y sanitizados separados de outbox comercial; incluir correlación, resultado, RP, sin codes/tokens/email.

### Migration, backfill and rollout

- Migration posture: additive; SQL local real y privilegios verificados.
- Default state: flag consumidor OFF; flag del issuer independiente.
- Backfill plan: no import masivo; binding seed sólo para sujetos de integración controlados mediante command gobernado, jamás fallback runtime.
- Rollback path: apagar entrada + invalidar sesiones run-owned; conservar auditoría, no DROP compartido; down sólo DB aislada vacía.
- External coordination: peer TASK-1834, registro RP por entorno, secretos y callback exactos; DB cloud permanece fuera de alcance.

### Security and access

- Auth/access gate: OIDC validado + introspection client-auth + binding vigente; loadAuthority/can por cada operación de negocio.
- Sensitive data posture: handle y client secret sólo servidor protegidos en reposo; cookie HttpOnly/Secure; sin valores en logs/query/localStorage. Destino relativo allowlisted.
- Error contract: tipado y sanitizado; expired/revoked/invalid_transaction/identity_unbound/context_required/unavailable internos; transporte no revela recursos ajenos.
- Abuse/rate-limit posture: transacciones con TTL y cuotas; anti-loop; timeout de red; callback one-use; no redirects o issuer URL suministrados por usuario.

### Runtime evidence

- Local checks: lint/typecheck/test/build y tests auth específicos.
- DB/runtime checks: migración+rollback en DB aislada, binding no elegible, sesión concurrente/replay/revoke.
- Integration checks: issuer local real con registro RP controlado; firma/JWKS, code/token/introspection/revoke HTTP, sin sustituirlo por mocks para el gate integrado.
- Reliability signals/logs: rooms.auth.callback_denied, rooms.auth.introspection_unavailable, rooms.auth.session_revoked, rooms.auth.binding_missing; sin secretos.
- Production verification sequence: protocolo más abajo; no se afirma producción lista por integración local.

### Acceptance criteria additions

- [x] Source of truth y consumers quedan separados y documentados en contrato final.
- [x] Tenant/access/idempotency invariants tienen pruebas negativas y concurrentes.
- [x] Migración/rollback y privilegios se verifican en PostgreSQL real aislado.
- [x] Errores, auditoría y señales sanitizados no filtran tokens ni claims sensibles.

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

### Slice 1 — Contrato y stores

- Congelar contrato del issuer implementado y delta ADR consumidor; definir binding administrado, transacción, retención/GC y sesiones.
- Migración additive, permisos mínimos y pruebas de integridad/rollback.

### Slice 2 — Consumidor OIDC y resolver

- Entry/callback server-side, verificación estricta, handle cifrado/aislado y cookie opaca.
- Introspection por sesión autenticada, resolución de contextos, autoridad PG y logout local.
- OFF default, anti-loop/recovery tipado y preservación de /demo.

### Slice 3 — Integración y runbook

- Integración local real end-to-end protocolo, replays, tenants, revocación y fallos de dependencia.
- Registrar configuración y canary de activación futura; no activar cloud sin unidad/recibo de release correspondiente.

## Out of Scope

- Implementar issuer/OTP/loginV4, Greenhouse consumer, tokens MCP o consentimiento delegado.
- UI de login/contexto/recovery y mejoras de editor; invitaciones TASK-2066.
- Provisionar DB cloud, registrar RP productivo o desplegar/activar por inferencia de la demo.
- UserInfo, refresh first-party, logout global, emails o roles/org claims no entregados por issuer.

## Detailed Spec

Contrato aceptado inicial de TASK-1834: issuer `https://auth.efeonce.org` (local explícito aislado); cliente confidencial por entorno; `/oauth/authorize` con code, scope=openid, PKCE S256/state/nonce; `/oauth/token` client-auth y redirect exacto. ID token ES256 con iss/sub/aud/iat/exp/auth_time/nonce, aud=client_id, TTL300s. Access handle opaco300s sólo introspection/revoke propios: NO bearer de negocio. Sin refresh, userinfo, email, roles, organización, capabilities o gv. Verificar estos detalles contra la implementación antes de congelar consumidores.

Introspection `/oauth/introspect` revalida identidad/sesión y sólo permite handle del mismo cliente; `/oauth/revoke` no cierra todos los productos. Cada sesión autenticada exige introspection válida antes de autoridad local; sin caché positiva inicial. Expiry conduce a nueva autorización bounded, no renueva la edad de autenticación por iniciativa de Rooms. No usar auth_time <= iat como validación adicional inventada: validar frescura/assurance conforme contrato firmado y presente.

El plan declara almacenamiento seguro de handle y transacción, expiración, GC, origin/CSRF, cookie host-only, rotación al autenticar y revocación. El browser no recibe secretos. 0/1/múltiples contextos tienen DTO/resultado tipados; la pantalla de selección/recovery queda a la task UI posterior, por lo que esta foundation no habilita tráfico humano en producción.

## Rollout Plan & Risk Matrix

Cambio additive, aislado y OFF. La demo existente no acredita autorización para activar identidad real ni cloud.

### Slice ordering hard rule

Contrato issuer verificado → stores/pruebas PG → consumidor OFF → integración local real → revisión de evidencia → preparación release. UI/DB cloud/cohorte productiva son gates posteriores.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Cross-audience/replay | identidad | medium | cliente/nonce/PKCE/transacción exactos y dos RPs de prueba | callback_denied |
| Identidad válida obtiene tenant ajeno | Rooms | medium | binding explícito + memberships/grants actuales | binding_missing |
| Sesión vive tras revocación issuer | identidad | medium | introspection sin caché positiva y tests revoke | session_revoked |
| Introspection caída causa permisos stale | API | medium | fail-closed temporal y errores sanitizados | introspection_unavailable |
| Token/secret en log o browser | privacidad | medium | store servidor + redacción y pruebas de no exposición | canary de redacción |

### Feature flags / cutover

Flag propuesto ROOMS_FIRST_PARTY_AUTH_ENABLED default false; nombre final documentado en plan. OFF mantiene API anónima denegada y no cambia demo. No sobreescribir flag issuer ni MCP. No activar productivo en esta foundation local.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | deshabilitar nuevo consumidor; down sólo DB de integración vacía | medido en smoke | sí local |
| 2 | flag OFF y revocar sesiones/handles run-owned; no revocar otros RPs | medido en smoke | sí |
| 3 | retirar registro/secret de RP de prueba y conservar evidencia sanitizada | medido en integración | sí |

### Production verification sequence

1. Integración local con DB/issuer reales aislados y dos RPs; fallos y revoke comprobados.
2. Preparar recibo de cliente/redirect/config/secret y DB cloud en unidad autorizada; sin copiar credenciales locales.
3. Dark deploy OFF; verificar demo y401; consumidor UI/recovery listo antes de activar entrada humana.
4. Canary de cohorte explícita: login→binding→lectura autorizada→deny cross-tenant→revocar→deny con cookie vigente.
5. Verificar rollback OFF y registrar SHA/estado real; ampliar sólo tras evidencia.

### Out-of-band coordination required

Peer TASK-1834 y dueño de RP/secrets/DB. TASK-1840 conserva logout global; TASK-2067 método OTP. No registrar ni enviar nada por el solo diseño.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Contrato issuer implementado y delta consumidor documentados; dos RPs demuestran aislamiento.
- [x] Transacción/state/nonce/PKCE/code se validan y consumen una vez; callback concurrente/replay denegado.
- [x] ID token sólo algoritmo/issuer/audience/tiempos/claims permitidos; token MCP o handle de otro RP no crea sesión.
- [x] Binding issuer/sub explícito; sin email-provisioning, sin first-tenant, sin elevación por rol.
- [x] Introspection propia precede a sesión autorizada; expired/revoked/unavailable no permiten negocio; PG relee permisos actuales.
- [x] Cookie y stores durables protegidos, expiración/GC/CSRF/rotación/logout probados; tokens ausentes de browser/logs.
- [x] OFF default conserva demo y401; no configura cloud ni activa público de forma implícita.
- [x] Migración/privilegios/rollback PG y ciclo real issuer local pasan; mocks no sustituyen integración.
- [x] Evidencia diferencia foundation local, dark deploy y activación; el pendiente UI/DB cloud queda visible.

## Verification

- En Rooms: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Suite auth e integración SQL/HTTP dedicada creada por esta task; registrar comandos exactos en plan/evidencia.
- Revisión de diff para secretos y regresión /demo, APIs de contenido V1/V2.
- En Greenhouse: `pnpm task:lint --task TASK-2065`.

## Closing Protocol

- [x] Lifecycle, carpeta y Status real sincronizados con evidencia y sin afirmar rollout no ejecutado.
- [x] README/registry/Handoff/changelog y dependencias actualizados por dueño coordinador.
- [x] Acceptance Criteria tildados con evidencia proporcional; checks no realizados permanecen abiertos.
- [x] Chequeo cruzado TASK-1834/2062/2066/2067 y unidad UI/rollout posterior.
- [x] Secretos/handles de integración retirados según propiedad; artefactos sólo sanitizados.

## Follow-ups

- Consumer UI Rooms entry/contexto/recovery, separado backend-first; condición de retiro: contratos y pruebas de esta task disponibles.
- Activación cloud/RP/cohorte con canary y autorización de release; no parte de esta foundation.
- TASK-2066 invitaciones; TASK-1840 logout multiproducto.

## Evidencia de cierre 2026-10-25

[Auditoría2065](../../audits/rooms/2026-10-25-efeonce-id-consumer.md):95tests,Chromeissuerreal,rollback/restauraciónyOFFsmoke. Aislamiento2RP acreditado porconformanceissuer, harnessbrowser1RPexplicitado. Sin rollout productivo. UI/context y bootstrapproductivo siguenfuera deestefoundation.
