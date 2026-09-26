# TASK-1898 — Marketing Studio: login con Efeonce ID y cierre del modo abierto

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26

- TASK-1896 complete: Sentry, logs con `requestId` y la señal de salud de Studio ya están en producción; se quita de
  `Blocked by`. La descarga de originales (TASK-1893) hoy sólo la usa un `api_client`: al abrir el login, decidir si
  una persona puede pedirla desde la web.

## Delta 2026-09-25

- TASK-1899 comparte con esta task el reader de acceso a producto de Greenhouse y el verificador JWKS de Studio; quien llegue primero lo construye.
- (TASK-1890) Las imágenes se sirven por enlaces firmados HMAC `/api/v1/media/{token}` que **no llevan identidad**: quien tenga el enlace lo abre sin sesión durante una a dos semanas. Al cerrar el modo `open`, decidir explícitamente si ese radio es aceptable, si se acorta la vida o si el endpoint exige sesión (sin volver a una consulta de base por imagen: incidente `too many connections for role`). Rotar `STUDIO_MEDIA_URL_SECRET` invalida los enlaces vigentes. El bearer `api_client` ya existe: inválido = 401 aunque el modo sea `open`.

## Status

- Lifecycle: `to-do`
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
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno. Última task del programa por decisión del operador (2026-09-25): «construir primero todo y después lo cierro». El código de Studio ya modela el actor user y el modo efeonce_id, que hoy falla cerrado con 401.`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-1894, TASK-1895; además depende de la foundation OIDC first-party reusable de TASK-1834 (Slice 0–1).`
- Branch: `Greenhouse develop (reader de acceso, registro del RP, docs) · efeonce-marketing-studio main (código); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra el modo `open` de `studio.efeonce.org` y exige identidad: Studio pasa a ser un relying party
`first_party_sign_in` de `auth.efeonce.org`. La entrada redirige server-side al login contextual de Efeonce ID
(sin pantalla intermedia ni consentimiento delegado), el callback valida OIDC con PKCE, Studio crea su propia sesión
y decide acceso con la membership y las capabilities `marketing_studio.campaign.read|write` que lee de Greenhouse.
El bearer de `api_client` y la federación MCP siguen funcionando igual. El rollback vuelve a `open` en segundos.

## Why This Task Exists

Studio está en producción en modo `open` (lectura sin login, `noindex`) por decisión del operador: cualquiera con la
URL ve presupuestos propuestos, copys y audiencias. Ese riesgo se aceptó mientras se construía el resto del
programa, y el operador fijó que el login sea la última pieza y viva en una task dedicada.

Cuando `TASK-1894` agregue escrituras y `TASK-1895` la UI de edición, el modo abierto deja de ser sostenible: una
escritura necesita un autor real y un permiso verificable, y una auditoría con `anonymous_open` no sirve. El código ya
tiene el hueco preparado (`Actor.kind = 'user'`, `AccessMode = 'efeonce_id'`), pero `resolveActor()` lanza 401 porque
no existe relying party, sesión ni fuente de membership.

Hay además una restricción de plataforma: el ADR de entrada de relying parties prohíbe que cada producto invente su
login. Studio tiene que consumir el perfil OIDC first-party reusable de EPIC-044, no un branch propio en el emisor.

## Goal

- Una persona interna de Efeonce entra a `studio.efeonce.org`, llega directo al login contextual de Efeonce ID
  («Entra a Marketing Studio»), vuelve autenticada y ve sólo las organizaciones en las que tiene permiso.
- Studio tiene su propia sesión, sus propios secretos y su propia revocación. Nunca comparte cookie, `NEXTAUTH_SECRET`
  ni tokens con Greenhouse ni con el MCP.
- La API acepta sesión humana y bearer de `api_client` a la vez, con 401/403 canónicos, y la auditoría registra a la
  persona real.
- `STUDIO_ACCESS_MODE=efeonce_id` queda activo en producción y preview, con readback verificado y rollback a `open`
  ensayado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` (D1–D9, contrato mínimo del registro
  first-party, sesiones/cookies/tokens, quality scenarios)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (autenticación corporativa por Entra como
  upstream; revocación ≤ 60 s; sin caché positiva de autorización en el carril MCP)
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` §5 Acceso
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` (§Auth server propio, §Session access
  lifecycle)
- `.claude/rules/auth-server.md`

Reglas obligatorias:

- **Studio es relying party, no emisor.** Se registra con el command administrativo gobernado de la clase
  `first_party_sign_in`; la clase la deriva el registro confiable, nunca CIMD, DCR ni un parámetro del browser. Cero
  código Studio-específico dentro de `src/lib/auth-server/**` o `services/auth-server/**`.
- **Sin pantalla intermedia ni consentimiento delegado** (ADR D2 y D5): la entrada crea la transacción server-side y
  responde 3xx antes de renderizar. No existe CTA «Continuar con Efeonce ID». Si el request pide un scope o audiencia
  MCP, el emisor lo rechaza; Studio nunca lo pide.
- **Identidad ≠ acceso** (ADR D7): el `id_token` sólo prueba quién es la persona. Organizaciones y capabilities se
  leen de Greenhouse por su lane gobernado, nunca de claims del token, de email ni de dominio. Cero organizaciones ⇒
  deniega; nunca «primera organización».
- **Sesiones aisladas:** cookie `__Host-` propia de `studio.efeonce.org`, secreto propio en Secret Manager, TTL y
  revocación propios. **NUNCA** reutilizar `NEXTAUTH_SECRET`, la cookie de Greenhouse, `__Host-efeonce_auth` ni un
  access token MCP como sesión de Studio.
- **Studio nunca hace SQL contra Greenhouse**: la membership llega por `/api/platform/ecosystem/*` con credencial de
  consumer, igual que las métricas de `TASK-1892`.
- **El bearer de `api_client` (TASK-1890) no cambia**: tiene prioridad sobre la cookie y su semántica de
  organizaciones permitidas se conserva.
- Errores canónicos `{ error (es), code, actionable }`; nunca texto crudo del emisor, claims ni errores JOSE al
  cliente.

## Normative Docs

- `docs/operations/runbooks/auth-server.md` (§Registrar un cliente confidencial, §Rollback OAuth, §Qué no hacer).
- `docs/tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md` (Slice 0–1: perfil OIDC
  first-party reusable, conformance con un segundo RP).
- `docs/tasks/to-do/TASK-1840-efeonce-id-multiproduct-logout-session-revocation.md` (contrato de logout
  multiproducto y back-channel logout).
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (registrar `STUDIO_ACCESS_MODE`).
- `AGENTS.md` y `CLAUDE.md` del repo `efeonce-marketing-studio`.

## Dependencies & Impact

### Depends on

- `TASK-1894` (commands de escritura y capability `marketing_studio.campaign.write`): sin escrituras no hay autor
  real que auditar ni permiso que distinguir de la lectura.
- `TASK-1895` (UI de edición): la UI que recibe al usuario autenticado. Su contrato UI es el lugar donde se declara
  el control de cuenta/salir y el estado «sin acceso» (ver `## Hybrid Execution Justification`).
- `TASK-1890` (bearer `api_client`, capability `marketing_studio.campaign.read`, organización canónica
  `org-2df565fb-98aa-42f7-b324-ea9a2209017f`).
- `TASK-1834` Slice 0–1: perfil OIDC first-party reusable en el emisor (`openid`, `id_token` ES256 con `nonce`,
  audiencia del RP, clase `first_party_sign_in` tipada en el registro, perfil de presentación confiable). **Dependencia
  dura descubierta al planificar:** hoy el emisor no acepta `openid` ni emite `id_token`; si esa foundation no existe,
  esta task queda bloqueada y no la construye con atajos.
- `TASK-1836`: carril de autenticación corporativa (Entra como upstream). La población de Studio es interna.
- `TASK-1896` (recomendada antes): Sentry y señales para ver los 401/403 y los fallos de callback en producción.

### Blocks / Impacts

- `EPIC-049`: cierra el criterio «`studio.efeonce.org` sirve Studio con login Efeonce ID y sin modo `open`».
- `TASK-1891`: la federación MCP no debe cambiar; el canary de esta task lo verifica.
- `TASK-1840`: Studio se vuelve un consumidor más del contrato de logout multiproducto.
- `TASK-1834`: Studio actúa como segundo relying party real de la conformance del perfil reusable.

### Files owned

- Repo Studio: `apps/web/src/server/runtime.ts`, `apps/web/src/server/auth/**` (nuevo: cliente OIDC, sesión,
  resolución de acceso), `apps/web/src/app/auth/**` (nuevo: `login`, `callback`, `logout`), `apps/web/src/middleware.ts`
  `[verificar]`, `apps/web/src/components/Shell.tsx`, `packages/domain/src/actor.ts`,
  `packages/contracts/src/dto.ts`, `packages/database/migrations/*user-session*`, `README.md`, `AGENTS.md`.
- Greenhouse: `src/lib/api-platform/resources/ecosystem-product-access.ts` (nombre a confirmar en Discovery),
  `src/app/api/platform/ecosystem/identity/product-access/route.ts` (idem), su registro en el route contract del lane
  ecosystem, `docs/architecture/marketing-studio/**`, `docs/documentation/**` y `docs/manual-de-uso/**` de Studio,
  `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.

## Current Repo State

### Already exists

- `apps/web/src/server/runtime.ts`: `AccessMode = 'open' | 'efeonce_id'`; `resolveActor()` devuelve
  `{ kind: 'anonymous_open' }` en `open` y lanza `unauthorized` en `efeonce_id`.
- `packages/domain/src/actor.ts`: `Actor` con `user { subject, organizationIds }`, `api_client`, `operator_cli` y
  `organizationVisibility()`; todos los readers ya reciben un `Actor`.
- `apps/web/src/components/Shell.tsx`: píldora «solo lectura» cuando el modo es `open`;
  `apps/web/next.config.ts` y `apps/web/src/app/robots.ts`: `X-Robots-Tag: noindex, nofollow` y disallow.
- `GET /api/v1/health` expone `accessMode`.
- Emisor `auth.efeonce.org` con OAuth, sesión de personas, carril corporativo interno, `pnpm auth-server:register-client`
  y `POST /api/admin/auth-server/oauth-clients` (capability `identity.auth_client.register`).
- Lane ecosystem de Greenhouse con `runEcosystemReadRoute` y el reader `identity/binding` (TASK-1631/1844), que
  resuelve personas **sólo en contexto MCP** y con capabilities acotadas a growth.

### Gap

- El emisor no ofrece OIDC first-party (`openid`, `id_token`, clase `first_party_sign_in`): lo entrega TASK-1834.
- Studio no está registrado como relying party ni tiene redirect URIs, secreto de cliente ni perfil de presentación.
- No existen rutas de login/callback/logout, sesión, cookie ni tabla de sesiones en Studio.
- No hay reader de Greenhouse que responda «qué organizaciones y qué capabilities de `marketing_studio` tiene este
  sujeto» fuera del contexto MCP.
- El actor `user` no lleva capabilities por organización, así que no puede distinguir leer de escribir.
- La auditoría no tiene autor humano; el modo `open` sigue en producción.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-marketing-studio (apps/web server, packages/domain, packages/database) + Greenhouse (reader ecosystem de acceso a producto) + registro de datos en auth.efeonce.org vía command gobernado`
- Future candidate home: `api`
- Boundary: `el emisor autentica (perfil OIDC first-party reusable); Greenhouse autoriza (reader ecosystem de acceso a producto, un primitive para cualquier relying party); Studio sólo construye el Actor y su sesión en apps/web/src/server/auth y los readers/commands siguen recibiendo Actor sin cambios`
- Server/browser split: `transacción OIDC, PKCE verifier, nonce, secreto de cliente, credencial de consumer ecosystem y sesión viven sólo server-side; el navegador sólo recibe la cookie __Host- opaca (HttpOnly, Secure, SameSite=Lax) y redirects`
- Build impact: `una dependencia OIDC server-only nueva en apps/web de Studio (hoy no tiene jose ni openid-client; elegir una sola); ninguna en greenhouse-eo salvo el reader nuevo`
- Extraction blocker: `none — Studio ya es deployable independiente; el reader de Greenhouse queda en el lane ecosystem`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (identity/auth, cambio de postura de acceso en producción)
- Impacto principal: `integration`
- Source of truth afectado: `auth.efeonce.org (registro del RP y emisión OIDC), Greenhouse (membership y capabilities vía lane ecosystem), studio.user_session (nueva), studio.audit_event (autor real)`
- Consumidores afectados: `web de Studio, API /api/v1, CLI, gateway Efeonce MCP (TASK-1891, no debe cambiar)`
- Runtime target: `production y preview de Vercel (proyecto efeonce-marketing-studio) + Greenhouse + emisor compartido`

### Contract surface

- Contrato existente a respetar: `ADR de relying parties (D1–D9); OpenAPI v1 de Studio; bearer api_client de TASK-1890; error { error, code, actionable }; tool-manifest de TASK-1890`
- Contrato nuevo o modificado: `GET /auth/login?returnTo=<ruta relativa> → 302 al emisor; GET /auth/callback; POST /auth/logout; reader ecosystem GET /api/platform/ecosystem/identity/product-access?subject=&product=marketing_studio (nombre a confirmar); Actor user extendido con grants por organización`
- Backward compatibility: `gated — con STUDIO_ACCESS_MODE=open el comportamiento no cambia; con efeonce_id, las lecturas anónimas pasan a 302 (páginas) o 401 (API)`
- Full API parity: `la API acepta el mismo Actor venga de cookie o de bearer; ningún permiso vive en la UI; el reader de acceso de Greenhouse es un primitive reutilizable por cualquier relying party first-party`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.user_session (nueva: id_hash, subject, identity_profile_id, created_at, last_seen_at, idle_expires_at, absolute_expires_at, revoked_at, revoked_reason, issuer_sid); studio.audit_event (actor user:<subject>); greenhouse_auth.oauth_clients (fila del RP, sólo por command)`
- Invariantes que no se pueden romper:
  - La sesión se crea sólo después de validar `iss`, firma (JWKS), `aud` = `client_id` de Studio, `nonce`, `state`,
    PKCE S256, `exp`/`iat` y consumo único de la transacción.
  - `returnTo` sólo acepta rutas relativas del propio origen; cualquier otro valor cae en `/`.
  - Organizaciones y capabilities salen del reader de Greenhouse; nunca del `id_token`, del email ni del dominio.
  - Cero organizaciones con `marketing_studio.campaign.read` ⇒ 403; nunca se elige una organización por defecto.
  - Escribir exige `marketing_studio.campaign.write` sobre la organización de la campaña; leer no la concede.
  - Revocar un permiso en Greenhouse se nota en Studio en ≤ 60 s (caché positiva de acceso con TTL ≤ 60 s).
  - La sesión se guarda sólo como hash; el valor claro vive únicamente en la cookie.
  - Un bearer `api_client` válido gana sobre la cookie; un bearer inválido es 401 aunque haya cookie.
  - Con `STUDIO_ACCESS_MODE=efeonce_id`, el actor `anonymous_open` es inalcanzable.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura; el reader de Greenhouse es de sólo lectura`
- Tenant/space boundary: `sujeto verificado → identity_profile → organizaciones con capability marketing_studio vigente (predicado de ciclo de vida de roles de TASK-987) → organizationVisibility del Actor`
- Idempotency/concurrency: `la transacción OIDC es de un solo uso (state + nonce guardados server-side con TTL ≤ 10 min); callback repetido ⇒ error recuperable sin crear segunda sesión; logout idempotente`
- Audit/outbox/history: `audit_event por login, logout, denegación por falta de membership y revocación de sesión; escrituras de TASK-1894 con actor user:<subject>; sin tokens, códigos ni claims crudos en el evento`

### Migration, backfill and rollout

- Migration posture: `additive (tabla studio.user_session en marketing_studio y marketing_studio_staging)`
- Default state: `STUDIO_ACCESS_MODE=open hasta pasar los canaries de staging; después efeonce_id`
- Backfill plan: `sin backfill — ninguna sesión previa existe`
- Rollback path: `Instant Rollback de Vercel al último deployment en open (segundos) + STUDIO_ACCESS_MODE=open y redeploy como estado durable; migración down de user_session sólo si se retira la task`
- External coordination: `registro del RP por command gobernado (capability identity.auth_client.register); secretos nuevos en Secret Manager; credencial de consumer ecosystem para Studio; release de Greenhouse con el reader`

### Security and access

- Auth/access gate: `cookie de sesión Studio (páginas y API) o bearer api_client (API); en Greenhouse, credencial de consumer ecosystem de Studio con binding acotado a product-access de marketing_studio`
- Sensitive data posture: `identidad de personas internas (subject opaco, identity_profile_id); presupuestos y copys comerciales; sin PII adicional persistida`
- Error contract: `401 unauthenticated (sin sesión ni bearer, o sesión vencida; API), 403 forbidden (autenticado sin capability u organización; actionable=false), 302 al emisor en páginas; errores del callback como códigos cerrados sin detalle JOSE`
- Abuse/rate-limit posture: `el emisor aplica sus límites; Studio limita reintentos de callback por state y aplica presupuesto anti-loop de redirects (ADR D8); CSRF en escrituras por cookie con verificación de Origin + SameSite=Lax + If-Match de TASK-1894`

### Runtime evidence

- Local checks: `pnpm check en Studio (tests de resolveActor, validación de callback con JWKS de prueba, returnTo, precedencia bearer/cookie); pnpm local:check y test focal del reader en Greenhouse`
- DB/runtime checks: `SELECT de studio.user_session tras login real (hash, expiraciones, revoked_at tras logout)`
- Integration checks: `login real contra auth.efeonce.org en preview y producción; reader product-access 200/403 con sujetos reales y sintéticos`
- Reliability signals/logs: `Sentry de Studio (TASK-1896) con captura de fallos de callback por código; logs con correlationId`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La decisión de acceso vive en `apps/web/src/server/auth` + readers del dominio, no en componentes.
- [ ] El reader de acceso a producto es un primitive de Greenhouse reutilizable por cualquier relying party
      first-party, no un endpoint hecho a la medida de una pantalla.
- [ ] Capabilities usadas: `marketing_studio.campaign.read` (TASK-1890) y `.write` (TASK-1894); esta task no crea
      capabilities nuevas. Si Discovery decide crear alguna, va con grant y coverage test en el mismo commit.
- [ ] Camino programático: API `/api/v1` con sesión o bearer; MCP vía TASK-1891 sin cambios.
- [ ] Un primitive, muchos consumers: web, API, CLI y MCP resuelven el mismo `Actor`.

## Hybrid Execution Justification

La task se mantiene `backend-data` con `UI impact: none`, sin partirse, por estas razones:

- Why not split: la superficie de login la posee el emisor (pantalla contextual de Efeonce ID, TASK-1834/1835) y el
  ADR prohíbe un vestíbulo de producto; Studio sólo responde redirects. Lo visible en Studio es mínimo y no introduce
  layout: retirar la píldora «solo lectura», un control de salir y un estado «sin acceso» que reutilizan primitives y
  copy existentes de la UI de TASK-1895.
- Primary execution profile: `backend-data`.
- Contract boundary: el control de cuenta/salir y el estado «sin acceso» se declaran como Delta del contrato UI de
  `TASK-1895` (wireframe y copy) antes de empezar esta task. Si esa Delta no existe, Slice 5 queda bloqueado y se abre
  una task `ui-ux` hija; esta task no inventa layout.
- Risk controls: todo lo visible depende de `STUDIO_ACCESS_MODE`; con `open` nada cambia. GVC desktop y 390 px del
  estado «sin acceso» y del shell autenticado se capturan como evidencia de cierre.

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

### Slice 1 — Registro de Studio como relying party first-party

- Registrar un cliente confidencial por entorno (producción y preview) con el command gobernado de la clase
  `first_party_sign_in` que entrega TASK-1834 (CLI o `POST /api/admin/auth-server/oauth-clients`), nunca por SQL.
- Redirect URIs exactas: `https://studio.efeonce.org/auth/callback` y la del alias estable de preview
  `[verificar]` (las URLs efímeras de preview no se registran).
- Scopes/claims sólo de identidad (`openid`); audiencia = `client_id` de Studio; política de assurance de la
  población interna; perfil de presentación «Marketing Studio» versionado.
- Secreto de cliente como scalar crudo en Secret Manager (`marketing-studio-oidc-client-secret[-staging]`), leído
  por WIF con las cuentas de servicio de runtime existentes (producción no puede leer el de staging y viceversa).
- Readback: la fila del cliente queda `active`, con la clase y el redirect esperados, y la metadata del emisor
  coincide con su origen.

### Slice 2 — Reader de acceso a producto en Greenhouse

- Reader ecosystem `product-access` (nombre a confirmar): recibe `subject` del emisor y `product=marketing_studio`,
  resuelve la identidad canónica por source link verificado y devuelve organizaciones con sus capabilities
  `marketing_studio.*` vigentes, `grantsVersion` y `cacheTtlSeconds`.
- Evalúa con `can()` y el predicado de ciclo de vida de roles; nunca por email, dominio ni primera fila.
- Credencial de consumer ecosystem para Studio (reutilizar la de TASK-1892 si su binding lo permite `[verificar]`)
  con scope acotado a este reader; denegación y errores canónicos.
- Tests: 0/1/N organizaciones, rol revocado o vencido, sujeto sin link, consumer sin scope.

### Slice 3 — Cliente OIDC, sesión y Actor en Studio

- `GET /auth/login`: valida `returnTo` relativo, crea `state`, `nonce` y PKCE S256 server-side (TTL ≤ 10 min) y
  responde 302 al emisor sin renderizar HTML.
- `GET /auth/callback`: valida la respuesta completa (ver invariantes), consume la transacción una sola vez, llama
  al reader de Slice 2 y crea la sesión o responde 403 «sin acceso».
- Migración `studio.user_session` (con bloque `DO … RAISE EXCEPTION`), cookie `__Host-studio_session` (HttpOnly,
  Secure, SameSite=Lax), expiración por inactividad y absoluta `[decidir en Discovery; no mayor que la sesión del
  emisor]`, secreto propio `STUDIO_SESSION_SECRET` desde Secret Manager.
- `resolveActor(request)`: bearer `api_client` → sesión → en `open`, `anonymous_open`; en `efeonce_id`, 401 (API) o
  302 a `/auth/login` (páginas). `Actor.user` gana `grants: { organizationId, capabilities[] }[]`; los readers siguen
  usando `organizationVisibility()`.
- Re-validación de acceso contra el reader con caché positiva ≤ 60 s.

### Slice 4 — Autorización de escritura y autoría real

- Los commands de TASK-1894 exigen `marketing_studio.campaign.write` sobre la organización de la campaña; lectura sin
  escritura ⇒ 403.
- Verificación de `Origin` en toda escritura autenticada por cookie.
- `audit_event.actor = user:<subject>` con `identity_profile_id`; eventos de login, logout, denegación y revocación.

### Slice 5 — Logout, expiración y superficie mínima

- `POST /auth/logout`: revoca la sesión local, borra la cookie y, cuando el contrato de TASK-1840 esté disponible,
  inicia el RP-Initiated Logout; si TASK-1840 entrega back-channel logout, Studio lo adopta y revoca por `sid`. Sin
  TASK-1840, el límite es la expiración de la sesión más la re-validación ≤ 60 s.
- Retirar la píldora «solo lectura» cuando el modo es `efeonce_id`; control de salir y estado «sin acceso» según la
  Delta del contrato UI de TASK-1895. `noindex` y `robots.txt` se mantienen: es una herramienta interna.
- `GET /api/v1/health` sigue público y sólo expone `accessMode`.

### Slice 6 — Cambio de modo, canaries y documentación

- Canaries en preview con `STUDIO_ACCESS_MODE=efeonce_id` (ver Production verification sequence).
- `STUDIO_ACCESS_MODE=efeonce_id` en producción y preview de Vercel (`--scope efeonce-7670142f`), redeploy y readback
  en el deployment activo (`/api/v1/health` reporta `efeonce_id`).
- Ensayo de rollback a `open` y vuelta a `efeonce_id`, con tiempos medidos.
- Arquitectura de Studio §5, runbook de acceso, documentación funcional, manual de uso, fila en el ledger de flags,
  Handoff y changelog.

## Out of Scope

- Construir el perfil OIDC first-party del emisor, `id_token`, la clase `first_party_sign_in` o el renderer
  contextual: son de TASK-1834 (y TASK-1835 para las pantallas).
- Logout multiproducto, `sid` y back-channel logout del emisor: TASK-1840.
- Acceso de personas de clientes externos a Studio (población externa, TASK-1833 y piloto consentido): esta task
  cubre la población interna de Efeonce. Abrir Studio a clientes requiere su propia decisión.
- Crear capabilities, roles o memberships nuevos; gestionar personas desde Studio.
- Cambios al bearer `api_client`, al manifiesto de tools o a la federación MCP.
- Quitar `noindex`.

## Detailed Spec

Flujo de entrada (ADR, «Entrada first-party habilitada»):

1. La persona abre cualquier ruta de `studio.efeonce.org` sin sesión.
2. El middleware/servidor redirige a `/auth/login?returnTo=<ruta>`, que crea la transacción y responde 302 a
   `https://auth.efeonce.org/oauth/authorize` con `client_id`, `redirect_uri` exacto, `scope=openid`, `state`,
   `nonce`, `code_challenge` S256.
3. Si la sesión de Efeonce ID satisface la política, el emisor vuelve sin mostrar login; si no, muestra «Entra a
   Marketing Studio» con los métodos de la población interna (Microsoft corporativo). No hay consentimiento.
4. `/auth/callback` canjea el código con el secreto de cliente, valida el `id_token` y llama al reader de acceso.
5. 0 organizaciones ⇒ 403 «sin acceso» sin crear sesión; ≥ 1 ⇒ sesión y redirect a `returnTo`. Studio no necesita
   selector de contexto: el actor ve la unión de las organizaciones permitidas y cada campaña se autoriza por la suya
   (distinto de Greenhouse, cuya sesión es de un solo contexto).

Precedencia en `/api/v1`:

| Entrada | Modo `open` | Modo `efeonce_id` |
|---|---|---|
| Bearer válido | `api_client` | `api_client` |
| Bearer inválido | 401 | 401 |
| Cookie válida, sin bearer | `user` | `user` |
| Nada | `anonymous_open` (sólo lectura) | 401 (API) / 302 (páginas) |

Sujetos del canary:

- Operador interno real con `marketing_studio.campaign.read` y `.write` sobre `EO-ORG-0007`.
- Identidad interna sintética sin capability de Studio (debe recibir 403 y ninguna sesión).
- `api_client` del gateway de TASK-1890/1891.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 y Slice 2 pueden correr en paralelo, y ambos deben cerrar antes del Slice 3.
- Slice 3 → Slice 4 → Slice 5.
- Slice 6 sólo con Slices 1–5 verdes en preview. El cambio de modo en producción es el último paso de la task y
  requiere autorización explícita del operador en el momento.
- Nada de esta task se ejecuta si la foundation OIDC first-party de TASK-1834 no está disponible en el emisor.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El operador queda fuera de Studio tras el cambio de modo | identity | medium | canary con operador real en preview antes de producción; rollback a `open` ensayado | 401/403 en Sentry de Studio; readback de `/api/v1/health` |
| Loop de redirects entre Studio y el emisor | identity | medium | presupuesto anti-loop por `state` e intento (ADR D8); error recuperable sin re-redirect | pico de `/auth/login` por sesión en logs |
| Aceptar un `id_token` de otra audiencia o reusado | identity | low | validación de `aud`, `nonce`, `state`, PKCE y consumo único con tests negativos | test de dominio; código de error de callback en Sentry |
| Acceso concedido por email o por primera organización | identity | low | reader por source link verificado, 0 ⇒ 403, tests 0/1/N | test del reader |
| Permiso revocado sigue vigente en Studio | identity | medium | caché positiva ≤ 60 s y re-validación; revocación de sesión | prueba de revocación en canary |
| Bearer `api_client` o federación MCP se rompen al cambiar el modo | MCP | medium | precedencia bearer > cookie; canary MCP de TASK-1891 tras el cambio | fallo del canary MCP; 401 del gateway |
| Rollback a `open` re-expone presupuestos y copys | data | low | riesgo ya aceptado por el operador para `open`; rollback por el menor tiempo posible y con aviso | `/api/v1/health` reporta `open` |
| Secreto de producción legible desde preview | cloud | low | secretos separados por entorno con cuentas de servicio distintas (patrón existente) | prueba negativa de acceso al secreto |

### Feature flags / cutover

- `STUDIO_ACCESS_MODE` (env var de Vercel, valores `open` | `efeonce_id`, default `open`): se lee en
  `apps/web/src/server/runtime.ts`, sólo en el proyecto `efeonce-marketing-studio` de Vercel (no hay workers que la
  lean `[verificar]` con grep en Studio al empezar). Cutover: preview primero, producción al final con autorización
  del operador. Se registra en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime.
- Revert inmediato: Instant Rollback de Vercel al último deployment construido con `open` (segundos). Estado durable:
  `STUDIO_ACCESS_MODE=open` + redeploy (minutos).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | deshabilitar el cliente por el command gobernado; borrar los secretos de cliente | minutos | sí |
| Slice 2 | revert del reader en Greenhouse (sin consumidores activos con modo `open`) | minutos | sí |
| Slice 3 | revert del deploy de Studio; migración down de `user_session` sólo si se retira la task | minutos | sí |
| Slice 4 | revert; las escrituras vuelven al gate de TASK-1894 | minutos | sí |
| Slice 5 | revert; la píldora vuelve con el modo `open` | minutos | sí |
| Slice 6 | Instant Rollback de Vercel al deployment en `open`, luego env var + redeploy | segundos (instant) / minutos (durable) | sí |

### Production verification sequence

1. Readback del emisor: cliente Studio `active`, clase `first_party_sign_in`, redirect exacto, flags del emisor
   (`AUTH_SERVER_OAUTH_ENABLED`, `AUTH_SERVER_INTERNAL_AUTH_ENABLED`) verificados en la revisión activa.
2. Release de Greenhouse con el reader; llamada con la credencial de Studio: 200 para el operador, 403 para el
   sujeto sintético sin capability.
3. Preview con `STUDIO_ACCESS_MODE=efeonce_id`: (a) operador interno entra sin pantalla intermedia ni consentimiento
   y ve `EO-ORG-0007`; (b) identidad sin capability recibe 403 y ninguna fila en `user_session`; (c) `curl` con bearer
   `api_client` sigue en 200 y sin bearer da 401; (d) canary MCP de TASK-1891 sigue verde; (e) logout revoca la
   sesión (`revoked_at` poblado) y la siguiente visita vuelve al emisor; (f) revocar el permiso en Greenhouse corta el
   acceso en ≤ 60 s.
4. Ensayo de rollback en preview: Instant Rollback a `open`, medición del tiempo, vuelta a `efeonce_id`.
5. Con autorización del operador: `STUDIO_ACCESS_MODE=efeonce_id` en producción, redeploy, readback de
   `/api/v1/health`, repetición de 3(a)–3(e) en producción.
6. Observación de 72 h: 401/403 y fallos de callback en Sentry; ningún `anonymous_open` en logs.

### Out-of-band coordination required

- Registro del cliente en el emisor por una persona con `identity.auth_client.register` (`EFEONCE_ADMIN`).
- Secretos nuevos en Secret Manager (cliente OIDC por entorno, `STUDIO_SESSION_SECRET`, credencial de consumer
  ecosystem) con bindings a las cuentas de servicio de runtime de Studio.
- Release de Greenhouse por el control plane para el reader.
- Autorización explícita del operador para cambiar el modo en producción y aviso al equipo interno que usa Studio.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Studio está registrado en `auth.efeonce.org` como cliente `first_party_sign_in` (producción y preview) mediante
      el command gobernado, con redirect exacto y sin ningún cambio de código Studio-específico en el emisor.
- [ ] Con `efeonce_id`, abrir `studio.efeonce.org` sin sesión responde 3xx al emisor sin HTML intermedio, y el
      emisor muestra el login contextual de Marketing Studio sin pantalla de consentimiento.
- [ ] El callback rechaza `state`, `nonce`, audiencia, firma o PKCE inválidos y un código reusado (tests negativos
      verdes) y nunca crea sesión en esos casos.
- [ ] La sesión usa la cookie `__Host-studio_session` y un secreto propio; ningún archivo de Studio referencia
      `NEXTAUTH_SECRET` ni la cookie de Greenhouse o del emisor.
- [ ] El reader de Greenhouse devuelve organizaciones y capabilities `marketing_studio.*` por sujeto verificado; 0
      organizaciones produce 403 sin sesión.
- [ ] Un usuario con lectura y sin escritura recibe 403 en un command de escritura; con escritura, el `audit_event`
      registra `user:<subject>`.
- [ ] Revocar la capability en Greenhouse corta el acceso en Studio en ≤ 60 s (medido).
- [ ] Con `efeonce_id`: bearer `api_client` válido 200, inválido 401, sin nada 401 en `/api/v1`; el canary MCP de
      TASK-1891 sigue verde.
- [ ] Logout revoca la sesión en `studio.user_session` y borra la cookie.
- [ ] `STUDIO_ACCESS_MODE=efeonce_id` en producción y preview, con readback de `/api/v1/health` en el deployment
      activo, y fila en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Rollback a `open` ensayado en preview con tiempo medido y documentado.
- [ ] La píldora «solo lectura» no aparece con `efeonce_id`; `noindex` sigue presente.
- [ ] Arquitectura de Studio §5, runbook, documentación funcional y manual de uso actualizados.

## Verification

- `pnpm check` en Studio
- `pnpm local:check` y test focal del reader en Greenhouse (`pnpm vitest run src/lib/api-platform`)
- `pnpm vitest run src/lib/auth-server` si el registro del cliente toca el dominio del emisor
- Login real con navegador en preview y producción; `curl` con y sin bearer; canary MCP de TASK-1891
- GVC desktop y 390 px del shell autenticado y del estado «sin acceso»

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] EPIC-049 actualizado y su criterio de login tildado sólo con evidencia de producción
- [ ] TASK-1834 y TASK-1840 reciben un Delta con Studio como relying party consumidor

## Follow-ups

- Adoptar back-channel logout cuando TASK-1840 lo entregue, si no estaba disponible al cerrar.
- Decisión aparte si Studio se abre a personas de clientes (población externa).
- Retirar el código del modo `open` cuando el operador confirme que no se usará más como rollback.

## Open Questions

- Alias estable de preview para el redirect exacto: ¿dominio `studio-staging.efeonce.org` o alias de rama de
  Vercel? Resolver en Discovery.
- Nombre y ubicación final del reader de acceso a producto: ¿recurso nuevo en `identity/` o extensión gobernada de
  `identity/binding` sin contexto MCP? Resolver con `arch-architect` antes del Slice 2.
- TTL exacto de inactividad y absoluto de la sesión de Studio, acotado por la política de la sesión del emisor.
