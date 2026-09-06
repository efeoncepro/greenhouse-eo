# TASK-1840 — Efeonce ID: logout multiproducto y revocación coordinada de sesiones

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Diseño exhaustivo; sin implementación, migración, flag, registro de RP ni rollout`
- Rank: `TBD`
- Domain: `identity|auth|platform|security|ecosystem`
- Blocked by: `TASK-1829, TASK-1830, TASK-1836`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el protocolo común de cierre de sesión de **Efeonce ID** para Greenhouse, Globe y futuros productos,
sin convertir una sesión compartida en autorización compartida. La capacidad distingue tres acciones con blast
radius deliberadamente diferente: salir sólo del producto, cerrar Efeonce ID en la sesión actual del navegador y cerrar
todas las sesiones de la persona.

La task agrega correlación opaca por `sid`, RP-Initiated Logout, notificación Back-Channel Logout durable,
revocación transaccional de sesiones y familias OAuth ligadas a la sesión, readback, auditoría, señales y un
contrato de adopción por producto. **No revoca roles, entitlements, memberships, contextos, consentimientos ni
credenciales** por el mero hecho de cerrar sesión.

## Why This Task Exists

Hoy existen piezas correctas pero aisladas:

- `POST /auth/session/logout` revoca sólo la sesión central presentada por la cookie
  `__Host-efeonce_auth` y limpia esa cookie;
- RFC 7009 y el store OAuth pueden revocar una familia de refresh/access tokens, pero los grants no están ligados
  de forma explícita a la sesión humana que los originó;
- Greenhouse ejecuta `signOut({ callbackUrl: '/login' })`, que cierra la sesión NextAuth local sin pedir cierre
  del emisor;
- cada producto conserva su cookie, sesión, audiencia y autorización propias, por diseño;
- no existe `end_session_endpoint`, `sid` OIDC, registro de `backchannel_logout_uri`, fan-out durable ni readback
  que permita demostrar que un cierre central invalidó las sesiones locales correspondientes.

Sin una unidad propia, “cerrar sesión” puede terminar significando cosas incompatibles: cerrar demasiado y
desconectar todos los productos inesperadamente; cerrar poco y reabrir una sesión por SSO silencioso; o usar la
revocación de entitlements/`gv` como sustituto de lifecycle de sesión. El problema es transversal al emisor y no
debe quedar enterrado dentro de TASK-1834, que sólo adopta Efeonce ID en Greenhouse.

## Goal

- Establecer tres operaciones de logout inequívocas, con alcance, confirmación, SLA y readback propios.
- Correlacionar sesión del emisor, grants OAuth y sesiones de cada RP mediante un `sid` opaco, no bearer y
  específico del issuer, sin compartir cookies ni tokens entre productos.
- Implementar RP-Initiated Logout y Back-Channel Logout sobre los estándares OpenID Connect finales, con firma
  ES256 en Cloud KMS HSM, validación estricta, replay guard y entrega durable.
- Revocar exactamente las sesiones y familias de tokens incluidas en la operación, sin tocar autorización,
  consentimiento, identidad, relaciones, factores o datos de negocio.
- Entregar un contrato reusable que Greenhouse, Globe y futuros productos puedan adoptar sin lógica
  product-specific en `auth.efeonce.org`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/REPOSITORY_SHARED_WORKSPACE_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

1. **Identidad común no significa autorización común.** Efeonce ID autentica a la persona; cada producto resuelve
   su contexto y autorización local después del login.
2. Cada RP conserva `client_id`, audiencia, redirect URIs, cookie, sesión local, familia de tokens, rollout y
   rollback propios. Nunca se comparte una cookie entre `auth.efeonce.org`, Greenhouse y Globe.
3. Logout, revocación OAuth, revocación de consentimiento, baja de membresía, cambio de entitlements y
   desactivación de credenciales son operaciones distintas. Una no implica otra salvo contrato explícito.
4. `gv`, roles, vistas, módulos, workspaces, capacidades, créditos y derechos no versionan sesiones. No se
   incrementan ni revocan para simular logout.
5. Un cierre nunca une permisos de relaciones internas, externas o multiorganización. El `sid` identifica una
   sesión, no una población ni un contexto autorizado.
6. El emisor no conoce ni decide `TenantAccessRecord`, entitlements Greenhouse, workspace/capabilities Globe ni
   scopes de datos de los productos.
7. Toda mutación es idempotente, auditada y fail-closed; el token/cookie crudo nunca se persiste ni se loggea.
8. La indisponibilidad de un RP no impide revocar la sesión del emisor ni sus tokens; queda como delivery pendiente
   y observable hasta converger o escalar.

## Normative Docs

- [OpenID Connect RP-Initiated Logout 1.0 — Final](https://openid.net/specs/openid-connect-rpinitiated-1_0-final.html)
- [OpenID Connect Back-Channel Logout 1.0 — Final](https://openid.net/specs/openid-connect-backchannel-1_0-final.html)
- [RFC 7009 — OAuth 2.0 Token Revocation](https://www.rfc-editor.org/rfc/rfc7009)
- `docs/operations/runbooks/auth-server.md`
- `docs/tasks/in-progress/TASK-1829-efeonce-auth-server-oauth-protocol-surface.md`
- `docs/tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md`
- `docs/tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md`
- `docs/tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md`

## Dependencies & Impact

### Depends on

- `TASK-1829`: metadata OAuth, registro CIMD/DCR/confidencial, access/refresh tokens, RFC 7009, store y auditoría.
- `TASK-1830`: sesión humana del emisor, cookie `__Host-efeonce_auth`, resolución viva y revocación por sujeto.
- `TASK-1836`: población interna sobre la misma identidad canónica y reglas de revocación multicontexto.
- Cloud KMS HSM y `signWithActiveKey` de `src/lib/auth-server/keys/`.
- Registro vivo de `greenhouse_auth.oauth_clients`; sólo RPs registrados y activos reciben callbacks.

### Blocks / Impacts

- `TASK-1834` consume el contrato para distinguir “Salir de Greenhouse” de “Cerrar Efeonce ID”. Esta task no
  implementa ni modifica TASK-1834.
- La adopción futura de Globe debe implementar su receiver y persistir el `sid`, sin retirar su sesión/cookie
  actual hasta canary y rollback propios.
- `TASK-1833` debe ampliar assurance, incident response y revocación masiva con los nuevos endpoints, tokens y
  deliveries.
- `TASK-1835` o una task UI posterior puede exponer administración de sesiones; esta foundation no construye
  pantallas.
- Todo producto nuevo de Efeonce debe registrar metadata de logout y demostrar conformance antes de activar SSO.

### Files owned

- `src/lib/auth-server/logout/**`
- `src/lib/auth-server/persons/sessions.ts`
- `src/lib/auth-server/persons/types.ts`
- `src/lib/auth-server/persons/store/port.ts`
- `src/lib/auth-server/persons/store/memory-store.ts`
- `src/lib/auth-server/persons/store/postgres-store.ts`
- `src/lib/auth-server/oauth/metadata.ts`
- `src/lib/auth-server/oauth/tokens.ts`
- `src/lib/auth-server/oauth/store/port.ts`
- `src/lib/auth-server/oauth/store/memory-store.ts`
- `src/lib/auth-server/oauth/store/postgres-store.ts`
- `services/auth-server/app.ts`
- `services/auth-server/server.ts`
- `services/auth-server/README.md`
- `migrations/*_task-1840-efeonce-id-logout.sql`
- `src/lib/reliability/queries/auth-server-signals.ts`
- `docs/operations/runbooks/auth-server.md`

Los receivers product-specific, cookies locales y adaptadores de sesión de Greenhouse/Globe **no** son archivos
owned de TASK-1840. Cada consumer los declara en su propia task y sólo consume el protocolo publicado aquí.

## Current Repo State

### Already exists

- `src/lib/auth-server/persons/routes.ts` sirve `POST /auth/session/logout`; revoca por hash con razón `logout`,
  limpia la cookie y responde HTML o JSON.
- `src/lib/auth-server/persons/sessions.ts` crea una sesión con 32 bytes aleatorios, persiste sólo SHA-256,
  revalida el source link en cada request y revoca por expiración/link inválido.
- `PersonAuthStorePort` ofrece `revokeSession` y `revokeSessionsForSubject`.
- `OAuthStorePort` ofrece `revokeGrant` y `revokeGrantsForSubjectClient`; access/refresh tokens conocen
  `grantId`, `clientId`, `subject` y `environmentId`.
- `src/lib/auth-server/keys/` firma ES256 con la llave activa de Cloud KMS HSM.
- Greenhouse cierra hoy su sesión local con NextAuth desde `UserDropdown.tsx` y
  `GlobalCommandPalette.tsx`.

### Gap

- La sesión no posee un `sid` público opaco separado del secreto de cookie/hash persistido.
- Authorization code, refresh/access token y sesión del emisor no comparten una referencia de sesión que permita
  revocar exactamente las familias nacidas de una sesión del navegador/user-agent.
- La metadata no anuncia `end_session_endpoint`, `backchannel_logout_supported` ni
  `backchannel_logout_session_supported`.
- El registro de clientes no valida `post_logout_redirect_uris`, `backchannel_logout_uri` ni
  `backchannel_logout_session_required`.
- No existe Logout Token firmado, replay ledger, fan-out durable, retries, DLQ lógica, readback ni señales.
- No existe una operación global protegida por step-up que alcance todas las sesiones del perfil canónico.
- No existe evidencia E2E con dos RPs que pruebe tanto propagación como aislamiento.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/auth-server/** y services/auth-server; los adapters de cada RP permanecen en su runtime`
- Future candidate home: `domain-package`
- Boundary: `protocolo OIDC de logout + commands/readers del emisor + contrato receiver; consumers autorizados Greenhouse, Globe y futuros RPs registrados`
- Server/browser split: `firma, stores, revocación, fan-out, validation y readback sólo server-side; browser transporta cookie, hint y state sin autoridad`
- Build impact: `el bundle del auth-server incorpora el dominio logout; sin SDK pesado nuevo ni asset browser`
- Extraction blocker: `transacción PostgreSQL, firma KMS, registro OAuth y delivery cross-runtime impiden extracción hasta estabilizar el contrato y dos adopciones reales`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_auth.sessions, grants/tokens OAuth y ledger durable de operaciones/deliveries de logout`
- Consumidores afectados: `auth-server, RPs OIDC Greenhouse/Globe/futuros, operaciones y reliability`
- Runtime target: `Cloud Run auth-server + receivers server-side de cada producto`

### Contract surface

- Contrato existente a respetar: `POST /auth/session/logout`, RFC 7009, metadata RFC 8414/OIDC y stores de TASK-1829/1830.
- Contrato nuevo o modificado: `sid`; `end_session_endpoint`; metadata/registro de RP; Logout Token; commands de
  cierre por sesión actual/global; reader de sesiones/operaciones; entrega back-channel.
- Backward compatibility: `gated y aditiva; clientes sin metadata de logout siguen autenticando y sólo carecen de propagación hasta adoptar el contrato`.
- Full API parity: `las futuras UI llaman commands/readers server-side; ningún botón revoca tablas ni cookies por lógica client-side`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_auth.sessions`, `greenhouse_auth.authorization_codes`,
  `greenhouse_auth.refresh_tokens`, `greenhouse_auth.access_tokens`, `greenhouse_auth.oauth_clients` y tablas
  additive de operación/delivery/replay definidas por la migración de TASK-1840.
- Invariantes que no se pueden romper:
  - `sid` es aleatorio, opaco, no bearer, único dentro del issuer y distinto del cookie id/hash.
  - una familia OAuth se liga a exactamente un `sid` cuando nació de una sesión humana; los registros legacy sin
    `sid` no se adscriben por email, subject ni proximidad temporal.
  - el cierre local de un RP no toca sesiones/grants de otros RPs ni la cookie del emisor.
  - el cierre de la sesión actual revoca una sesión del emisor y sólo los grants session-bound de ese `sid`.
  - el cierre global selecciona todas las sesiones activas del mismo `identity_profile_id` resuelto server-side;
    nunca agrega por email ni por `sub` aportado por el navegador.
  - consentimientos, memberships, bindings, roles, entitlements, `grants_version`, passkeys, TOTP y upstream
    Microsoft/Google permanecen intactos.
  - ningún Logout Token contiene `nonce`, cookie, token de acceso/refresh, email, roles, entitlements o PII.
- Write-target allowlist: `actualizar src/lib/auth-server/boundary-domain.test.ts en el mismo PR si la migración agrega destinos; justificar cada tabla como lifecycle de sesión, no autorización`.
- Tenant/space boundary: `el issuer resuelve profile/sid; cada RP resuelve su tenant/contexto después y jamás lo recibe como autoridad desde el Logout Token`.
- Idempotency/concurrency: `operation_id/idempotency key únicos; revocación monotónica; un sid ya revocado es éxito;
  una delivery por operation+client+sid; claim con SKIP LOCKED o equivalente; jti de Logout Token single-use`.
- Audit/outbox/history: `operación y cambios append-only; delivery durable con attempts y outcome sanitizado;
  nunca borrar historia al completar o agotar retries`.

### Migration, backfill and rollout

- Migration posture: `additive: sid/foreign keys nullable para legado + tablas/índices/constraints nuevos; constraints validadas por fases`.
- Default state: `flags OFF; metadata no anuncia soporte hasta que emisor, worker de entrega y primer receiver pasen conformance`.
- Backfill plan: `no inferir sid para sesiones/grants legacy; sólo sesiones nuevas reciben sid. Las legacy expiran por TTL vigente o se revocan por comandos existentes durante cutover`.
- Rollback path: `flags OFF retiran endpoints/metadata/fan-out; columnas/tablas additive permanecen; RPs conservan logout local y sesiones tradicionales`.
- External coordination: `registrar callbacks exactos por RP, secretos/config server-side, deploy del emisor y deploy/flag independiente de cada consumer`.

### Security and access

- Auth/access gate: `cookie de sesión + CSRF para self-service; step-up reciente para cierre global; cliente registrado/id_token_hint válido para RP-Initiated; capability fina para revocación administrativa`.
- Sensitive data posture: `PII indirecta y metadata de seguridad; hashes y referencias opacas, sin tokens/cookies/email crudos en DB, audit, señales o docs`.
- Error contract: `invalid_request, invalid_client, invalid_logout_hint, post_logout_redirect_uri_mismatch,
  session_not_found, step_up_required, rate_limited y delivery_unavailable; respuestas sanitizadas y anti-oráculo`.
- Abuse/rate-limit posture: `CSRF, state, confirmación sin hint válido, exact redirect matching, rate limits por IP/sid/profile/cliente, anti-SSRF en backchannel URI, jti replay cache y bounded fan-out`.

### Runtime evidence

- Local checks: `tests de matriz de alcance, KMS Logout Token, replay, redirect, CSRF, concurrencia, retries y no-transferencia de autorización`.
- DB/runtime checks: `migración/smoke PG real, constraints/índices/readback, idempotencia concurrente y GC/retención`.
- Integration checks: `dos RPs sintéticos con client_id/aud/cookie distintos; receiver sano, lento, caído, 4xx y replay`.
- Reliability signals/logs: `auth.logout.delivery_lag`, `auth.logout.delivery_failed`,
  `auth.logout.session_still_active` y `auth.logout.replay_detected`.
- Production verification sequence: `dark deploy -> metadata OFF -> staging RP sintético -> Greenhouse opt-in ->
  rollback -> segunda adopción -> activación gradual; nunca inferir éxito desde HTTP 200 del emisor solamente`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio, en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime and DB evidence covers any change beyond docs/tooling.
- [ ] Canonical errors, audit, abuse controls and reliability signals are implemented and tested.

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

### Slice 0 — Delta ADR, vocabulario y matriz de alcance

- Actualizar el ADR de Efeonce ID para aceptar explícitamente el modelo de tres niveles y la separación entre
  sesión, tokens, consentimientos, factores y autorización. En V1 “esta sesión” significa la sesión actual del
  navegador/user-agent: no se presenta como identidad del hardware ni como device registry.
- Definir comandos/readers canónicos, actor, confirmación, SLA y resultado idempotente para cada nivel.
- Publicar la matriz “qué se revoca / qué permanece” y el contrato de adopción de un RP.
- Congelar threat model: login CSRF/logout CSRF, open redirect, token substitution, replay, SSRF, receiver spoofing,
  fan-out amplification, session fixation, cross-RP/cross-tenant invalidation y partial failure.

### Slice 1 — Identidad de sesión y vínculo OAuth

- Agregar `sid` público opaco a sesiones nuevas, sin exponer el cookie id ni su hash.
- Propagar `sid` server-side a authorization code, refresh/access family y, cuando exista ID Token OIDC, al
  claim `sid` exigido para back-channel session logout.
- Mantener filas legacy en `sid IS NULL`; prohibir backfill heurístico.
- Implementar queries atómicas para revocar por un `sid` o por todas las sesiones de un profile, con conteos
  separados de sesiones, refresh y access tokens.
- Garantizar que tokens MCP o client-credentials sin sesión humana no se atribuyen a una sesión del navegador.

### Slice 2 — RP-Initiated Logout y metadata

- Registrar/validar `post_logout_redirect_uris`, `backchannel_logout_uri` y
  `backchannel_logout_session_required` por cliente.
- Publicar `end_session_endpoint` sólo detrás del flag de protocolo y anunciar soporte back-channel únicamente
  después del gate completo.
- Validar `id_token_hint` cuando esté disponible, issuer/audience/client/session, `state` opaco y redirect exacto.
- Si falta hint válido, exigir sesión viva + confirmación explícita; nunca aceptar un logout GET ciego como
  mutación silenciosa ni redirigir a un URI no registrado.
- El resultado del cierre no revela si otra persona/sesión existe.

### Slice 3 — Logout Token y receiver conformance contract

- Emitir JWT ES256 con `iss`, `aud`, `iat`, `exp`, `jti`, `events` y `sid`/`sub` según alcance; prohibir `nonce`.
- Firmar con `signWithActiveKey`; verificar localmente antes de encolar y no persistir el JWT completo.
- Definir algoritmo receiver: validar firma/JWKS, `iss`, `aud`, tiempo, events, ausencia de nonce, `sid|sub`,
  replay `jti`; después invalidar la sesión local correspondiente de forma idempotente.
- Exigir a cada RP un ledger/tombstone revocable indexado por `iss+client_id+sid`; una cookie o JWT local que siga
  físicamente presente debe fallar por server-side readback después de la invalidación.
- Entregar fixtures interoperables positivos/negativos y conformance harness consumible por cada producto.

### Slice 4 — Operación durable y fan-out

- Persistir operación, targets y deliveries dentro de la misma frontera transaccional que la revocación.
- Resolver targets desde grants/clientes ligados al `sid`, nunca desde una lista hardcodeada de productos.
- Despachar en paralelo con concurrencia acotada, timeouts, retry con backoff/jitter y terminalización
  `delivered|not_required|permanent_failure|exhausted`.
- Tratar 2xx y “ya no existe” según contrato como éxito idempotente; distinguir 4xx permanente, 429/5xx temporal,
  timeout y DNS/TLS inválido.
- Anti-SSRF: HTTPS exacto registrado, sin redirects, resolución/egress pública conforme al primitive CIMD y sin
  permitir metadata endpoints, loopback o redes privadas.
- Agregar una revalidación pull autenticada como safety net para deliveries perdidas; no reemplaza el back-channel
  ni permite consultar sesiones de otro cliente/persona.

### Slice 5 — Los tres comandos y readback

- **Logout local de producto:** contrato consumer; invalida cookie/sesión local y la familia del cliente elegida
  cuando corresponda, mantiene la sesión Efeonce ID y los demás productos.
- **Cerrar Efeonce ID en esta sesión del navegador:** revoca el `sid` actual, sus familias session-bound y notifica sólo los
  RPs visitados por esa sesión.
- **Cerrar todas mis sesiones:** step-up + confirmación; resuelve el profile server-side, revoca todos sus `sid`
  activos y familias session-bound, y crea fan-out por cada par RP/sid.
- Agregar reader de sesiones del navegador y estado de la operación con labels derivados/redactados, no IP/UA
  crudos; soportar “esta sesión” y última actividad sin convertir fingerprint en identidad.
- Agregar comando administrativo separado con capability fina, razón obligatoria y el mismo motor; no bypass SQL.

### Slice 6 — Reliability, retención y recuperación

- Implementar las cuatro señales, métricas de P50/P95/P99 y alertas por lag/falla/replay/sesión superviviente.
- Definir SLA: revocación central transaccional inmediata; receiver local P95 objetivo <= 60 s y límite máximo
  aprobado antes del rollout; una brecha queda visible, nunca se reporta como logout completo.
- Agregar GC para replay ids, operations y delivery attempts con retención aprobada; conservar el audit mínimo
  append-only exigido por seguridad/privacidad.
- Runbook: inspeccionar, reintentar, cancelar target inválido, revocar masivamente, recuperar de outage, rollback
  del flag y demostrar que entitlements/consents no cambiaron.

### Slice 7 — Conformance multiproducto y rollout

- RP A y RP B sintéticos: abrir sesiones independientes; probar logout local A, device logout y global logout.
- Greenhouse adopta después en TASK-1834; Globe adopta en su unidad propia. Ninguna adopción se hace dentro de
  TASK-1840.
- Probar persona interna, cliente, múltiple relación y multi-organización con el mismo perfil, sin unión de
  permisos ni invalidación de otra persona/contexto.
- Probar receiver caído durante cierre, retry posterior, replay, duplicate delivery, clock skew y rotación KMS.
- Ejercitar rollback con sesiones vivas: flags OFF, logout local intacto, metadata honesta y columnas additive.

## Out of Scope

- Implementar o modificar TASK-1834, el login Greenhouse o sus componentes.
- Construir UI de gestión de sesiones, copy, wireframes, flow, motion o navegación.
- Implementar el receiver product-specific de Globe o retirar su broker/sesión actual.
- Revocar consentimientos OAuth, memberships, roles, entitlements, contextos, bindings, `gv`, créditos o derechos.
- Revocar passkeys/TOTP, desvincular Microsoft/Google, cerrar la sesión global de esos upstream o recuperar una
  cuenta comprometida. Esas son operaciones de seguridad distintas.
- Introducir `front-channel logout` basado en iframes; back-channel es el mecanismo primario por confiabilidad y
  aislamiento del navegador.
- Dar tratamiento especial a Greenhouse/Globe dentro del emisor; todo RP entra por metadata/registro.
- Garantizar logout de refresh tokens `offline_access` futuros. Efeonce ID hoy no emite ese alcance; cualquier
  introducción requiere policy explícita y pruebas separadas.

## Detailed Spec

### 1. Semántica normativa de las operaciones

| Acción humana o administrativa | Sesión local del producto actual | Sesión Efeonce ID | Grants/tokens | Otros productos | Consents | Acceso/entitlements | Factores/upstream |
|---|---|---|---|---|---|---|---|
| Salir de Greenhouse/Globe | revoca y limpia | permanece | sólo familia local seleccionada, si el producto la posee | permanecen | permanecen | permanecen | permanecen |
| Cerrar Efeonce ID en esta sesión del navegador | revoca por back-channel | revoca `sid` actual | todas las familias session-bound de ese `sid` | sólo sesiones ligadas al mismo `sid` | permanecen | permanecen | permanecen |
| Cerrar todas mis sesiones | revoca por cada `sid` | revoca todos los `sid` del profile | todas las familias session-bound alcanzadas | todas las sesiones notificables del profile | permanecen | permanecen | permanecen |
| Revocación administrativa de sesiones | según scope explícito | según scope explícito | según scope explícito | según scope explícito | permanecen | permanecen | permanecen |
| Revocar consentimiento | fuera de esta task | permanece | familias del subject+client según RFC 7009 vigente | sólo cliente afectado | se revoca | permanece | permanecen |
| Desactivar acceso/relación | fuera de esta task | resolver vivo deniega/revoca según ADR | denegación por authority/version contract | products revalidan autoridad | no determina | se retira según su SoT | no se borran por defecto |

### 2. `sid` y privacidad

- 128 bits de entropía efectiva como mínimo, generado con CSPRNG y codificado base64url.
- Único por sesión del emisor; una reautenticación crea otro `sid` aunque sea el mismo navegador.
- Se puede exponer como claim porque no concede acceso. Nunca acepta operaciones por `sid` sin autenticar actor y
  resolver ownership server-side.
- DB conserva el `sid` o su representación apropiada para lookup/index; la cookie secreta sigue hasheada por
  separado. El diseño documenta por qué la forma elegida permite Back-Channel Logout sin convertir el `sid` en
  bearer.
- Labels de dispositivo salen de UA normalizado y actividad; IP sólo hasheada/abreviada según policy. Ningún label
  afirma identidad física ni ubicación exacta. La UI futura debe decir “sesión” o “navegador”; sólo puede decir
  “dispositivo” después de que otra decisión introduzca una identidad de device verificable.

### 3. Logout Token

```json
{
  "iss": "https://auth.efeonce.org",
  "aud": "<client_id exacto>",
  "iat": 0,
  "exp": 0,
  "jti": "<único>",
  "events": {
    "http://schemas.openid.net/event/backchannel-logout": {}
  },
  "sid": "<opaco>"
}
```

- Para logout global puede emitirse por cada `sid`; usar `sub` sin `sid` sólo si el RP declara y demuestra que
  puede eliminar todas las sesiones del subject sin afectar otro issuer o tenant.
- `aud` es exactamente el `client_id` receptor; un token de Greenhouse no sirve en Globe.
- TTL corto y skew acotado/configurado. `alg=none` prohibido. `typ`/media type se fijan en el contrato final y el
  receiver no confunde Logout Token con ID/access token.
- El receiver guarda `iss+aud+jti` hasta después de `exp+skew`; un replay responde idempotentemente sin repetir
  efectos y alimenta la señal correspondiente.

### 4. Estados de operación y delivery

- Operación: `pending -> dispatching -> converged|partially_converged|failed` y `cancelled` sólo antes de dispatch.
- Target: `pending -> claimed -> delivered|not_required|permanent_failure|exhausted`; lease vencido vuelve a
  `pending` sin duplicar efectos.
- “Converged” exige revocación local central confirmada y todos los targets terminales exitosos/not-required.
  `HTTP 200` del endpoint inicial no basta si quedan targets pendientes.
- El endpoint browser puede terminar rápido después del commit local; el readback muestra convergencia. La UI
  futura no promete “todas cerradas” hasta que el reader lo confirme.

### 5. Registro de RP

- `post_logout_redirect_uris`: match exacto, mismo criterio de loopback/HTTPS definido para el tipo de cliente;
  jamás wildcard, substring, suffix ni URL derivada de request headers.
- `backchannel_logout_uri`: HTTPS exacto y server-to-server; no fragment; no credenciales embebidas; no redirect;
  host/IP validados con el primitive anti-SSRF vigente.
- `backchannel_logout_session_required=true` para productos Efeonce, porque la invalidación por `sid` reduce el
  blast radius. Excepciones requieren ADR/assurance.
- Cambiar URI es una mutación administrativa auditada y no reescribe deliveries ya materializadas.

### 6. Separación de autorización

- Los Logout Tokens sólo identifican issuer, RP, operación temporal y sesión/subject; no llevan rol, entitlement,
  organización, workspace, `gv`, scope ni claims de negocio.
- Un receiver local ubica su sesión por `iss+aud+sid`; no ejecuta resolución de acceso para decidir si obedece un
  token criptográficamente válido.
- Invalidar sesión no borra snapshots/audit del contexto; una nueva autenticación vuelve a resolver identidad,
  contexto y autorización desde sus fuentes vivas.
- Si una persona tiene dos sesiones del mismo RP en dos navegadores, el cierre de sesión actual sólo alcanza el `sid` actual;
  global logout alcanza ambos. Si tiene dos organizaciones, ninguna se usa para ampliar/reducir el selector.

### 7. Matriz mínima de pruebas

| Caso | Resultado requerido |
|---|---|
| Logout local RP A con A y B activos | A inválido; B y cookie Efeonce ID válidos |
| Device logout desde A | sid actual revocado; grants A/B del sid revocados; sesiones A/B del sid convergen |
| Global logout con dos sid | ambos sid y todas sus familias session-bound revocados; consent/entitlements intactos |
| Token de logout A enviado a B | 400; cero invalidación |
| `post_logout_redirect_uri` parecido/no exacto | no redirect; operación no usa el valor |
| request sin hint y sin cookie | confirmación/login; nunca logout de tercero |
| replay del mismo jti | efecto único, outcome idempotente y señal |
| dos requests globales concurrentes | una revocación monotónica, deliveries sin duplicados |
| receiver 500/timeout | central revocado, delivery retry pendiente, readback no dice converged |
| receiver 400 permanente | target terminal visible y alerta; no retry infinito |
| sid legacy null | no asociación heurística; expiración/revocación vigente |
| token client-credentials/MCP sin sid | fuera del fan-out por sesión actual |
| persona interna y cliente mismo profile | mismas reglas de sesión, cero unión de autorización |
| dos perfiles con mismo email | sólo profile autenticado; cero cross-profile revoke |
| membership/entitlement revocado | logout no lo restaura ni lo modifica |
| consentimiento existente | logout no lo elimina; nuevo login puede reutilizarlo según policy OAuth vigente |
| passkey/TOTP existente | logout no lo borra ni lo revoca |
| upstream Microsoft/Google activo | logout Efeonce no promete cerrarlo |
| rotación KMS durante delivery | kid active/retiring valida conforme JWKS y ventana aprobada |
| flag OFF tras rollout | metadata honesta, logout local vigente, endpoints nuevos no utilizables |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 -> Slice 1 -> Slice 2 -> Slice 3 -> Slice 4 -> Slice 5 -> Slice 6 -> Slice 7.
- La migración additive y el código reader-compatible deben desplegarse antes de emitir el primer `sid`.
- Ningún `sid` entra en tokens antes de que stores, constraints y rollback estén verificados.
- `end_session_endpoint` puede publicarse tras Slice 2, pero `backchannel_logout_supported=true` sólo después de
  Slices 3–6 y un receiver sintético verde.
- Ningún RP real activa back-channel antes de persistir `sid`, verificar firma/replay y demostrar rollback local.
- Greenhouse y Globe se activan por separado; el éxito de uno no autoriza al otro.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Logout central no alcanza sesión local | identity/RP | high | outbox durable, retry, readback y SLA | `auth.logout.session_still_active` |
| Fan-out cruza clientes o personas | auth | low/critical | keys `issuer+client+sid`, FK y matriz negativa | incident + conformance deny |
| Redirect abierto post-logout | auth/browser | medium/high | allowlist exacta, hint/client binding, no fallback header | invalid redirect audit |
| Logout CSRF/DoS de tercero | auth/browser | medium/high | POST+CSRF; hint válido o confirmación; rate limit | rate-limit/audit spike |
| SSRF por backchannel URI | auth/network | medium/critical | registro gobernado, HTTPS, DNS/IP guards, no redirects | CIMD/SSRF rejection |
| Replay Logout Token | RP | medium/high | jti ledger + exp/skew + idempotencia | `auth.logout.replay_detected` |
| Revocar consentimiento/entitlement por accidente | OAuth/access | low/critical | stores y comandos separados + invariance snapshots | authorization diff gate |
| Grants legacy atribuidos al sid equivocado | OAuth | medium/high | no backfill heurístico, nullable explícito | legacy linkage reject |
| Receiver caído bloquea respuesta humana | UX/runtime | medium | commit central primero, async delivery | delivery lag |
| Retry infinito o tormenta de fan-out | worker | medium/high | bounded concurrency, max attempts, jitter, terminal states | queue depth/attempts |
| Logout global sin step-up | identity | low/critical | factor fuerte reciente + confirmación + audit | step_up_required/incident |
| `sid` tratado como bearer | security | low/critical | ownership server-side; pruebas de petición sólo con sid | unauthorized sid attempt |
| Metadata anuncia soporte antes del receiver | ecosystem | medium/high | flag + conformance gate | metadata/readiness drift |
| Rollback deja productos sin salida | product | low/critical | logout local nunca depende del flag central | local logout canary |

### Feature flags / cutover

- `AUTH_SERVER_LOGOUT_PROTOCOL_ENABLED=false`: habilita endpoints/readers/commands nuevos; no cambia logout actual.
- `AUTH_SERVER_BACKCHANNEL_LOGOUT_ENABLED=false`: habilita creación/dispatch de deliveries y metadata support.
- Allowlist/estado por `client_id`: `disabled|shadow|active`; no usar un único flip global para todos los RPs.
- Cada RP tiene flags separados para aceptar Logout Tokens y para hacer enforcement de su ledger. Aceptar tokens
  precede enforcement; después de recibir tombstones, un rollback no puede volver a aceptar esas sesiones.
- Los nombres finales se registran en el ledger antes del primer deploy. Los flags nacen OFF en código,
  `deploy.sh`, staging y Production.
- Shadow genera plan/targets y valida metadata sin enviar Logout Token; no puede marcar converged.

### Rollback plan per slice

| Slice | Rollback | Tiempo objetivo | Reversible? |
|---|---|---|---|
| 0 | revert documental antes de aprobación | < 1 día | sí |
| 1 | dejar de emitir sid; columnas nullable permanecen | < 15 min + redeploy | sí |
| 2 | protocolo OFF; retirar metadata por flag | < 10 min | sí |
| 3 | backchannel OFF; conservar firma/JWKS y fixtures | < 10 min | sí |
| 4 | detener dispatcher; leases expiran; no borrar cola | < 10 min | sí |
| 5 | ocultar commands centrales; logout local sigue | < 10 min | sí |
| 6 | mantener señales/readers; desactivar sólo alert ruidosa con incidente | < 30 min | parcial |
| 7 | retirar un client_id de active y revocar sus deliveries pendientes | < 10 min | sí |

La revocación ya confirmada es monotónica y no se “desrevoca” durante rollback. El usuario vuelve a autenticarse;
restaurar una sesión revocada está prohibido.

### Production verification sequence

1. Aplicar migración en staging; verificar columnas nullable, constraints, índices y grants DB.
2. Deploy con ambos flags OFF; `/readyz`, OAuth, login y `POST /auth/session/logout` vigente sin regresión.
3. Habilitar protocolo con backchannel OFF; emitir `sid` sólo a clientes sintéticos y verificar aislamiento.
4. Registrar dos RPs sintéticos; ejecutar matriz completa y fault injection del receiver.
5. Habilitar backchannel en staging; medir lag/retry/replay y rollback con sesiones vivas.
6. Dark deploy Production con flags OFF; verificar metadata honesta y schema/readers.
7. Activar un RP interno en shadow, luego active; medir al menos una operación local/device/global real autorizada.
8. TASK-1833 ejecuta assurance incremental; corregir hallazgos antes de clientes externos.
9. TASK-1834 adopta Greenhouse con flag propio. La adopción Globe requiere task, canary y rollback propios.
10. Ampliar por client_id; observar señales y deliveries durante la ventana definida. Stop inmediato ante
    cross-session/cross-RP revoke o cualquier cambio de autorización. Los RPs siguen aceptando Logout Tokens y
    respetando tombstones ya emitidos durante la ventana de rollback; nunca “desrevocan” una sesión.

### Out-of-band coordination required

- Aprobación del Delta ADR y del significado visible de las tres acciones.
- Registro exacto de redirect/backchannel URIs por producto y owners de sus receivers.
- Despliegue coordinado de emisor y primer receiver; no activar callback hacia un runtime todavía no listo.
- Revisión de seguridad/privacidad de retención y pentest incremental mediante TASK-1833.
- Comunicación a soporte: cerrar Efeonce ID no cierra Microsoft/Google ni elimina acceso/consentimiento.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Delta ADR aprobado define los tres niveles, actores, alcance, confirmación, SLA, readback y rollback.
- [ ] La matriz normativa demuestra que logout no revoca consentimiento, identidad, membresías, roles,
  entitlements, `gv`, factores, upstream, créditos ni derechos.
- [ ] Sesiones nuevas tienen `sid` opaco y no bearer, distinto de cookie/hash; legacy queda explícitamente null.
- [ ] Authorization codes y familias session-bound conservan el `sid` exacto; no existe linking por email/tiempo.
- [ ] Grants de máquina/client-credentials y tokens MCP sin sesión humana quedan fuera del logout por sesión actual.
- [ ] Revocar un `sid` revoca transaccionalmente la sesión central y todas sus familias session-bound, una vez.
- [ ] Cierre global resuelve profile server-side, exige step-up y revoca todos sus `sid` sin alcanzar otro profile.
- [ ] `end_session_endpoint` y metadata back-channel son exactos y sólo se anuncian bajo flags/gates verdes.
- [ ] `post_logout_redirect_uri` exige registro y match exacto; pruebas de open redirect fallan cerrado.
- [ ] Request sin hint válido nunca cierra una sesión ajena y exige sesión/confirmación apropiada.
- [ ] Logout Token cumple claims/validaciones OIDC, está firmado ES256 por KMS y nunca contiene `nonce` o PII.
- [ ] Token para RP A falla en RP B por `aud`; sid de otra sesión/persona no produce invalidación.
- [ ] Receiver contract valida firma, issuer, audience, tiempo, events, sid/sub y replay antes de mutar.
- [ ] Cada RP demuestra un ledger/tombstone server-side por `iss+client_id+sid`; una cookie/JWT antigua no
  recupera acceso después del back-channel ni después de reiniciar una instancia.
- [ ] Registry valida backchannel URI con anti-SSRF, HTTPS exacto y cero redirects/wildcards.
- [ ] Operación y deliveries son durables, idempotentes, lease-safe y auditadas; no se persiste el Logout Token.
- [ ] Fan-out sale de grants/session bindings reales y nunca de una lista hardcodeada de productos.
- [ ] Caída/timeout/429/5xx del RP deja central revocado, retry observable y estado no-converged.
- [ ] La revalidación pull autenticada converge una delivery perdida sin permitir enumeración ni cross-client lookup.
- [ ] 4xx permanente termina el target, alerta y no crea un retry infinito.
- [ ] Logout local de RP A conserva sesión Efeonce ID, RP B y autorización en ambos.
- [ ] Device logout alcanza sólo el sid actual; global logout alcanza todos los sid del profile.
- [ ] Dos requests concurrentes/replay producen un efecto monotónico y deliveries sin duplicados.
- [ ] Una nueva autenticación después del logout vuelve a resolver contexto/autorización viva, sin restaurar
  claims/entitlements previos desde la operación de logout.
- [ ] Persona interna, cliente y multiorganización pasan la misma semántica de sesión sin unión de privilegios.
- [ ] Consents, bindings, memberships, roles, entitlements, passkeys y TOTP son byte/row-equivalent antes/después
  en fixtures y readback de integración, salvo timestamps de lectura legítimos documentados.
- [ ] Cerrar Efeonce ID no afirma ni intenta cerrar la sesión global de Microsoft o Google.
- [ ] Señales `delivery_lag`, `delivery_failed`, `session_still_active` y `replay_detected` tienen steady state,
  thresholds, owner, runbook y fault injection.
- [ ] P95 de invalidación local cumple el objetivo <= 60 s o la task permanece abierta con evidencia del gap.
- [ ] GC/retención preserva audit mínimo y elimina material de replay/delivery según política aprobada.
- [ ] Conformance harness prueba dos RPs y publica fixtures positivos/negativos sin secretos.
- [ ] Rollback con sesiones vivas deja logout local operativo, metadata honesta y ningún acceso ampliado.
- [ ] Greenhouse y Globe permanecen consumers separados; TASK-1840 no modifica sus cookies ni autorización.
- [ ] TASK-1833 cubre threat model/pentest incremental antes de cohorte externa.
- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con justificación en el allowlist de escritura del dominio.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime/DB/integration evidence y canaries reales quedan registrados; HTTP 200 aislado no cierra la task.
- [ ] Docs funcionales, manuales, ADR, flags, runbook, EPIC/task y evidencia quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1840`
- `pnpm vitest run src/lib/auth-server`
- tests focales de `src/lib/auth-server/logout/**`
- `pnpm auth-server:oauth-store:smoke`
- `pnpm auth-server:person-auth:smoke`
- smoke PG real específico de TASK-1840 para sid/revocation/delivery/replay
- `pnpm test:live` para las suites live registradas y serializadas
- `pnpm type-check`
- `pnpm lint`
- `pnpm local:check`
- gates build/runtime/deploy del auth-server
- conformance E2E con dos RPs sintéticos, fault injection, rotación KMS y rollback
- canary Production por client_id + readback de operación/deliveries/señales
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental

## Closing Protocol

- [ ] `Lifecycle`, carpeta y `Status real` coinciden con la evidencia.
- [ ] Criterios completados están tildados con evidencia; pendientes conservan razón y owner.
- [ ] `docs/tasks/README.md`, TASK/EPIC/ADR, manual, runbook y ledger de flags están sincronizados.
- [ ] `Handoff.md` registra rollout, RPs activos, señales, riesgos y siguiente paso.
- [ ] `changelog.md` registra el cambio de protocolo cuando exista comportamiento real.
- [ ] Se revisaron TASK-1829/1830/1833/1834/1836 y la task de adopción Globe sin absorber sus alcances.
- [ ] Se ejecutaron QA/docs/context gates en el orden obligatorio y se preservó WIP ajeno.
- [ ] No se afirma logout multiproducto completo hasta verificar receiver/readback; commit, push, deploy y flag no
  son evidencia equivalente.

## Follow-ups

- Consumer Greenhouse: TASK-1834 adopta logout local, persistencia `sid` y receiver bajo sus flags/sesión.
- Consumer Globe: registrar una task propia en `efeonce-globe`, coordinada con TASK-1480/TASK-1511 y su runtime
  handoff; no usar TASK-1840 para modificar Globe desde Greenhouse.
- UI de sesiones: task `ui-ux` separada sobre readers/commands de Slice 5, con wireframe/flow/GVC.
- Account compromise: task separada para revocar credenciales, factores, consents y sesiones con un blast radius
  superior y recovery probado.
- `offline_access`: policy separada antes de emitir refresh tokens no ligados a una sesión interactiva.

## Open Questions

- Definir en Slice 0 si el endpoint estándar acepta GET sólo para renderizar confirmación y POST para mutar, o si
  implementa el redirect GET estándar con `id_token_hint` válido; nunca permitir mutación GET sin mitigación CSRF.
- Aprobar el límite máximo además del P95 <= 60 s para declarar convergencia multi-RP.
- Fijar retención exacta de operation/delivery/replay audit bajo la revisión de privacidad de TASK-1833.
- Decidir si el readback de sesiones se sirve en `auth.efeonce.org` o mediante API interna antes de crear su
  consumer UI; la source of truth permanece server-side en ambos casos.
