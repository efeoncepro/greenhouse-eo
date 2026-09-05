# EPIC-044 — Efeonce Identity, Native Authorization Server and MCP Federation

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `En progreso. 2026-09-05T01:01Z: U01 runtime sano; U02 OAuth y U03 personas activados en auth-server-00007-cxb, SHA 3f68e8875, 100% tráfico, workflow staging 33934410457 success sobre servicio compartido. U04 environment efeonce-auth active. Nueve canaries públicos/negativos passed. Operador indicó identidad interna; su acceso nativo requiere U11 TASK-1836. Sesión, tokens/refresh/revocación y passkeys siguen sin canary autenticado completado. Sin nueva promoción main: riesgo de volver a OFF con el árbol anterior. U05 gateway multi-issuer, U06 pantallas TASK-1835, U07 clientes reales, U08 aseguramiento y U09 convergencia siguen pendientes. Evidencia e historia: docs/audits/2026-09-04-epic-044-auth-rollout.md 2026-09-05 (sesion greenhouse-eo-18): el canary AUTENTICADO `pnpm auth-server:person-auth:canary` encontro que el correo del magic link estaba MUERTO en produccion (`RESEND_API_KEY is not configured`, `email_deliveries` en failed) — los nueve canaries publicos eran todos negativos/anonimos y por eso no lo vieron. Causa: el deploy.sh declaraba `RESEND_API_KEY_SECRET_REF` sin MONTAR el secreto y `sendEmail` usa el cliente sincrono. Arreglado (commit 38fbfaeeb) y verificado tras el redeploy: correo `status=sent` y canary VERDE 27 ok/0 fallidos sobre la revision viva. Quedan cubiertos consumo del enlace y uso unico, sesion, passkey con uv abriendo en step_up, TOTP con KMS, anti-replay, muerte de la sesion al revocar el link, que la senal session_without_link SE ENCIENDE al revocar, y el rechazo por origen ajeno del reto de passkey.`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops`
- Owner: `Efeonce Platform / Identity`
- Branch: `develop en Greenhouse; main en efeonce-mcp; checkout compartido; sin ramas ni worktrees por task`
- GitHub Issue: `none`

## Summary

Coordinar la construcción y operación del **authorization server propio de Efeonce** en `auth.efeonce.org`,
la identidad de personas externas sin contraseñas, el binding gobernado con Account 360 y la federación
multi-issuer del gateway `mcp.efeonce.org`, de modo que organizaciones cliente existentes se autentiquen en
Claude, Codex y ChatGPT con grants revocables por capability. Decisión de composición:
[`EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`](../../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md)
(nativo, no se compra a un tercero).

No se implementa directamente este epic. Cada unidad se ejecuta como task propia con plan, gates y cierre
operativo. Crear el epic no autoriza DNS, secretos, llaves KMS, deploys, registros de clientes ni acceso de
ningún cliente.

## Why This Epic Exists

La identidad cliente y el emisor de tokens son una fundación de plataforma con cuatro epics consumidores y
ninguna dueña: EPIC-011 (writes MCP de Hiring fail-closed hasta el grant revocable), EPIC-012 (clientes
externos del cotizador), EPIC-022 (dos tools de grounded queries devolviendo `aeo_forbidden`) y EPIC-043
(actor, scope y revocación para Payroll). `TASK-1626`, `TASK-1631` y `TASK-1813` viven con `Epic: none`.

Además, el gateway necesita un emisor propio aunque nunca hubiera clientes externos: la auditoría del
2026-09-02 mostró que CIMD sólo lo puede ofrecer el authorization server, que el `issuer` del shim de Entra
viola la revisión `2026-07-28` del MCP y que el cliente público compartido tiene un riesgo con forma de
confused deputy que sólo cierran identidades por cliente con consentimiento propio.

Con la decisión de construir el emisor aparecen piezas nuevas que no caben en `TASK-1631`: un deployable
Cloud Run con excepción de EPIC-027, la superficie OAuth completa (metadata, CIMD, DCR compat, refresh,
revocación, consentimiento), la autenticación de personas (passkeys, magic link, TOTP), la llave en Cloud
KMS, los canaries de cliente, el aseguramiento y la convergencia del login del portal.

## Outcome

- `auth.efeonce.org` opera como authorization server propio, aislado del portal y del gateway en runtime, IAM,
  cookies, secretos y audiencia (comparte sólo el front door del gateway), con llave de firma en Cloud KMS HSM,
  metadata conforme y CIMD como registro primario.
- Personas de organizaciones cliente existentes se autentican sin contraseñas y consienten por cliente y por
  scope; el operador las invita, liga y revoca por commands canónicos auditados sobre Account 360.
- `mcp.efeonce.org` valida dos issuers con `AuthContext` separado, tools calificadas por issuer y clase de
  autoridad, y rechequeo de `grants_version`; los writes federados de Hiring, SEO/AEO, Finance y Payroll
  dejan de estar bloqueados por falta de identidad delegada.
- Claude, Codex y ChatGPT completan OAuth/PKCE en loopback y HTTPS hospedado contra un cliente real, con
  allow, base-only deny, expiración y revocación probados.
- El login cliente de Greenhouse tiene un camino de convergencia gateado sobre el mismo emisor.

## Architecture Alignment

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` — composición aceptada
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` — invariantes, binding, contrato
  del gateway y convergencia (siguen vigentes)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` — gateway neutral, shim DCR, delta 2026-09-02
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` y `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` y
  `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md` — excepción documentada para el deployable
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`

## Child Tasks

| Unidad | Task | Entregable y límite de ownership | Depende de |
|---|---|---|---|
| **U00** | [TASK-1626](../../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md) | Gateway neutral en `mcp.efeonce.org` y federación Globe (en curso). Conserva transporte, discovery, providers. No emite tokens. | — |
| **U01** | [TASK-1828](../../tasks/in-progress/TASK-1828-efeonce-auth-server-runtime-deployable.md) | Runtime `auth.efeonce.org`: `services/auth-server/` en Cloud Run publicado como segundo host del front door del gateway (mismo LB, IP y Cloud Armor; decisión 2026-09-03, ≈ USD 15/mes adicionales), llave KMS HSM + JWKS, schema `greenhouse_auth`, session store y cookie propios, excepción EPIC-027. Sin flujos OAuth visibles todavía. **Code complete 2026-09-04, staging vivo:** Cloud Run `auth-server` (us-east4, rev `00003-jtf`, desplegado por CI con `AUTH_SERVER_ENABLED=true`), llave `auth-server-es256` HSM (v2 `active`, v1 `retiring`), `/.well-known/jwks.json` con 2 `kid`, `readyz` 200 (`postgres`, `kms`, `activeKey`), schema `greenhouse_auth` (`signing_keys` ≤1 active, `signing_key_events` append-only), front door compartido con cert ACTIVE, CLI `pnpm auth-server:rotate-key`, señales `auth.issuer.jwks_unreachable` y `auth.signing_keys.lifecycle`, runbook `docs/operations/runbooks/auth-server.md`, workflow + gates de release. **En producción desde 2026-09-04** (release `9100bbd2765d`, run `33893120972`, rev `auth-server-00005-pk8`, `GIT_SHA f6db4255a`; `AUTH_SERVER_JWKS_URL` en Vercel Production+staging). Pendiente: retiro de la llave v1. | — |
| **U02** | [TASK-1829](../../tasks/in-progress/TASK-1829-efeonce-auth-server-oauth-protocol-surface.md) | Superficie OAuth/OIDC: metadata RFC 8414, CIMD, DCR compat, PKCE, access token ES256, refresh rotativo, revocación, introspección, consentimiento persistido. Extrae el broker sister-platform. **Code complete, rollout pendiente 2026-09-04** (`develop`, commits `263ee3a74`/`19d1658de`/`d31e6e913`): `issuer` idéntico al origen con `client_id_metadata_document_supported: true` y S256 único; CIMD (anti-SSRF, cache 24 h) primario, DCR sólo públicos, confidenciales por `pnpm auth-server:register-client` / `POST /api/admin/auth-server/oauth-clients`; JWT ES256 15 min con `sub/aud/azp/scope/gv/jti` firmado en KMS HSM; refresh opaco rotativo 30 d/90 d con revocación de familia por reuso; `revoke` RFC 7009, `introspect` RFC 7662 (confidenciales); consentimiento por `(subject, client, scope)` con revocación admin (`identity.auth_consent.revoke`); 7 tablas `greenhouse_auth` aplicadas; señales `auth.oauth.{code_reuse_detected,refresh_reuse_detected,cimd_rejected}`; loopback cualquier puerto para públicos, HTTPS exacto para confidenciales. Detrás de `AUTH_SERVER_OAUTH_ENABLED=false`; `authorize` responde `login_required` hasta U03. Contrato: `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`. Broker sister-platform del portal intacto. **Rollout al 2026-09-04:** el código está en producción en la revisión `auth-server-00005-pk8` (release `9100bbd2765d`) con el flag OFF (metadata → 404 verificada); environment `efeonce-auth` registrado en `draft` por `pnpm auth-server:register-issuer-environment` (command U04, nunca SQL); siguen pendientes flag ON en staging + environment `active` + validación de metadata + clientes CIMD/DCR (U07). | U01 |
| **U03** | [TASK-1830](../../tasks/in-progress/TASK-1830-efeonce-auth-external-person-authentication.md) | Autenticación de personas externas sin contraseña: passkeys, magic link, TOTP step-up, recuperación por re-invitación, anti-abuso. Sólo primitives y rutas; la UI es de U06. | U01 |
| **U04** | [TASK-1631](../../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md) | Re-alcance: binding Account 360, environments registry, invitaciones, grants, `grants_version`, eligibility reader, señales. Deja de poseer runtime y gateway. **Slice 1 code complete 2026-09-04:** schema aplicado, commands, `GET /api/platform/ecosystem/identity/binding` (contrato de U05), `acceptExternalInvitation` in-process (contrato de U03), 4 señales; rollout pendiente. | U02 en contrato; ejecutable en paralelo |
| **U05** | [TASK-1831](../../tasks/in-progress/TASK-1831-efeonce-mcp-gateway-multi-issuer-authorization-context.md) | Gateway multi-issuer en `efeonce-mcp`: `AuthContext` de seis campos, resolver por issuer, `allowedIssuers` + clase de autoridad por tool, recheck de `grants_version`, tres tests de regresión. | U02, U04 |
| **U06** | [TASK-1835](../../tasks/in-progress/TASK-1835-efeonce-id-login-consent-screens.md) | Login, consentimiento y recuperación en `auth.efeonce.org` («Efeonce ID»). Creada 2026-09-04 con wireframe, flow, motion y el flujo maestro `docs/ui/flows/EPIC-044-auth-server-login-consent-UI-FLOW.md`; shell HTML server-rendered con tokens del SSOT, consent honesto, harness local + GVC premium. Slice 1 (shell + consent) no bloqueado; Slices 2–3 (login, step-up, recuperación) esperan U03. Bloquea sólo U07. | U03 (Slices 2–3) |
| **U07** | [TASK-1832](../../tasks/to-do/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md) | Matriz de tokens live, canaries Claude/Codex/ChatGPT en loopback y HTTPS hospedado, primera organización allowlisted, allow/deny/expiración/revocación, verificación de producción. | U02–U06 |
| **U08** | [TASK-1833](../../tasks/to-do/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md) | Red-team agéntico cruzado, pentest externo, rotación de llaves, señales de reliability, runbooks, postura Ley 21.719, retención. Gate previo al primer cliente pagando. | U02, U03 |
| **U09** | [TASK-1834](../../tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md) | Portal Greenhouse agrega el emisor propio como provider OIDC de NextAuth sobre el mismo source link; rollback = retirar provider. Gate propio posterior a U07. | U07 |
| **U10** | [TASK-1813](../../tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md) | Interoperabilidad OAuth Codex/Claude del carril interno Entra (discovery, shim, scopes). Carril paralelo; no construye broker. | — |

| **U11** | [TASK-1836](../../tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md) | Acceso interno por Efeonce ID: autenticación corporativa, binding canónico y autoridad delegada. Backend; gateway/UI conservan U05/U06. Contrato ADR antes de código; implementación pendiente. | Contratos U02/U03/U04 |

Una sola task ejecutable posee cada unidad. `TASK-1836` es U11; `TASK-659` y `TASK-658` permanecen relacionadas (ver
*Existing Related Work*). El orden lo definen este epic y el `Rank`, no la antigüedad del ID.

## Execution Order

1. **Abrir la excepción EPIC-027 y el runtime (U01).** Es el único bloqueo de arquitectura; sin deployable no
   hay nada que probar. En paralelo, U04 aplica su migración aditiva (diseñada desde agosto) y U10 sigue su
   carril interno.
2. **U02 y U03 en paralelo sobre U01.** U02 extrae el broker y publica metadata/CIMD/tokens; U03 construye la
   autenticación de personas. Comparten `services/auth-server/**` y `src/lib/auth-server/**`: ownership por
   slice, edición secuencial de los archivos compartidos.
3. **U05 apenas U02 emite un token válido en staging.** El gateway no espera a la UI.
4. **U06 (ui-ux) desde que U03 fija el contrato de flujo.** Con skills de product design y GVC; nunca bloquea
   U01–U05.
5. **U07 cierra con clientes reales** y exige sesiones interactivas del operador (matriz de tokens con Claude,
   Codex y ChatGPT). U08 corre en paralelo desde el final de U02/U03 y su pentest externo es gate del primer
   cliente pagando.
6. **U09 al final**, con su propio gate y después de una cohorte MCP viva.

Subagentes sólo con alcance independiente; sin cambios de branch, worktrees ni despliegues como mecanismo de
coordinación. Todo release a producción pasa por el control plane, una sesión por release.

## Existing Related Work

- [TASK-659](../../tasks/to-do/TASK-659-mcp-oauth-hosted-auth-model.md): modelo OAuth para el MCP interno
  hosted de Greenhouse. Conserva su alcance histórico fuera del epic; el motor OAuth base lo cubre U02 y su
  supersesión formal sigue pendiente. El nuevo acceso interno nativo tiene identidad propia: TASK-1836 (U11).
- [TASK-658](../../tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md): bridge de autorización
  de resources API Platform; consumidor del `AuthContext` y de los grants, no hija.
- [TASK-1804](../../tasks/complete/TASK-1804-greenhouse-skills-mcp-provider.md) y la nota del shim DCR en el
  ADR del gateway: el cliente público compartido renombrado el 2026-09-02; su riesgo loopback se cierra en U02/U05.
- Auditoría [`EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`](../../audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md):
  insumo de U02 y U10.
- Delta 2026-08-26 de `TASK-1631`: `prepare_seo_grounded_queries` y `get_seo_grounded_query_draft` fail-closed
  por capability `growth.ai_visibility.prompt_set.manage`; el grant por persona se resuelve en U04/U05 o en una
  task propia de Growth, y el epic no se cierra sin declararlo.
  **Declarado por U04 (2026-09-04):** el modelo per-persona ya existe (`external_capability_grants.profile_id`);
  el grant concreto para sujetos internos se emite cuando U05 registre Entra como environment `internal` y ligue la
  organización propia de Efeonce, o en la task de Growth.
- Consumidores: EPIC-011 (TASK-1720/1722), EPIC-012, EPIC-022, EPIC-043 (TASK-1824).

## Exit Criteria

- [ ] `auth.efeonce.org` responde metadata RFC 8414 con `issuer` idéntico al origen y `client_id_metadata_document_supported: true`, firmando con una llave KMS HSM cuyo JWKS publica `kid` y rotación probada. *Parcial 2026-09-04: la llave KMS HSM, el JWKS con `kid` y la rotación (v1 → v2, v1 en `retiring`) ya existen en staging (U01); la metadata RFC 8414/OIDC y CIMD están en código (U02, `TASK-1829` code complete) y probadas in-process, pero siguen detrás de `AUTH_SERVER_OAUTH_ENABLED=false` — se tilda cuando la metadata responda en staging con el flag ON.*
- [ ] Una persona de una organización cliente existente se autentica con passkey y con magic link, consiente un cliente y un scope, y ese consentimiento es revocable por el operador con efecto en menos de cinco minutos.
- [ ] El gateway despacha una tool read-only con token del issuer propio y niega: token externo sobre tool internal-only, token con roles sin scope delegado, grant revocado con token vigente, issuer desconocido.
- [ ] Claude Code, Codex y ChatGPT completan OAuth/PKCE (loopback y HTTPS hospedado donde aplique) contra un cliente real allowlisted, con evidencia redactada de la matriz de tokens.
- [ ] Pentest externo cerrado sin hallazgos críticos abiertos y runbooks de rotación, incidente y revocación masiva publicados.
- [ ] Los writes federados de EPIC-011, EPIC-022 y EPIC-043 tienen grant delegado revocable disponible o una task propia declarada para su grant.
- [ ] El login cliente de Greenhouse tiene el provider OIDC del emisor propio detrás de gate, con rollback probado.
- [ ] `TASK-659` resuelta por supersesión formal de su diseño original; conserva alcance histórico, no es U11.
- [x] Nueva `TASK-1836` registrada como U11 por solicitud explícita del operador; consumers y dependencias actualizados.
- [ ] Personal Efeonce completa acceso MCP nativo con identidad canónica y grants revocables; externos del mismo issuer no acceden a tools internas (U11 -> U05/U06 -> U07).

## Non-goals

- Comprar o integrar un proveedor de identidad SaaS (WorkOS, Auth0, Stytch u otro) como emisor; sólo se
  reabre como híbrido de federación enterprise si un cliente exige su propio IdP.
- Signup público, inferencia de membership por dominio de correo, backfill automático de clientes o
  autoadministración de clientes (SCIM/self-service) en esta primera versión.
- Reemplazar a Entra para personas internas en MCP o en el portal.
- Escrituras Globe, gasto de créditos, aprobaciones o tools con derechos sensibles: cada una exige su propio
  gate en su epic dueño.
- Mover el gateway `efeonce-mcp` a Greenhouse o convertirlo en authorization server.

## Delta 2026-09-03

Creación del epic. `TASK-1631` cambia `Epic: none` → `EPIC-044` y re-alcanza sus slices (pierde runtime y
gateway, que pasan a `TASK-1828`/`TASK-1829` y `TASK-1831`). `TASK-1626` y `TASK-1813` declaran `EPIC-044`.
El ADR nativo supersede la recomendación WorkOS del 2026-08-05; los invariantes y el diseño de binding del ADR
de federación siguen vigentes.

## Delta 2026-09-04

- **U01 (`TASK-1828`) code complete con staging vivo.** `services/auth-server/` corre en Cloud Run (us-east4,
  revisión `auth-server-00003-jtf`, GIT_SHA `02dc5d987`, desplegada por `.github/workflows/auth-server-deploy.yml`);
  `https://auth.efeonce.org/readyz` responde 200 con `postgres`, `kms` y `activeKey` ok; el JWKS publica dos `kid`
  (v2 `active`, v1 `retiring`) y un token ES256 firmado por el HSM se verificó con `createRemoteJWKSet` contra el
  JWKS remoto. El host se publicó como segundo host del front door del gateway (`efeonce-mcp` `6a144a5`,
  `enable_auth_host=true`, cert ACTIVE, gateway intacto; ≈ USD 15/mes).
- **Piezas reutilizables ya en el repo:** `src/lib/auth-server/keys/` (`signWithActiveKey`, `signCompactJws`,
  `registerSigningKeyVersion`, `retireSigningKey`, 15 tests), migración `greenhouse_auth` (`signing_keys`,
  `signing_key_events`), CLI `pnpm auth-server:rotate-key`, señales `auth.issuer.jwks_unreachable` (queda
  `not_configured` hasta declarar `AUTH_SERVER_JWKS_URL` en Vercel) y `auth.signing_keys.lifecycle`, runbook
  `docs/operations/runbooks/auth-server.md`, `deploy-auth-server` en `production-release.yml` + `RELEASE_DEPLOY_WORKFLOWS`.
- **Producción pendiente del próximo release a `main`** (estado: code complete, rollout pendiente), junto con
  el Slice 1 de U04 (`TASK-1631`, staging verificado el mismo día).
- **Desbloquea:** `TASK-1829` (U02) y `TASK-1830` (U03) pueden arrancar sobre el runtime y el schema
  (`Blocked by` de 1829 queda en `none`; 1830 sigue dependiendo sólo de `TASK-1631` para invitaciones y source
  links). `TASK-1831` (U05) sigue esperando el token real con claims `sub`/`azp`/`scope`/`gv` de U02.
- **Pendiente para U08 (`TASK-1833`):** retiro programado de la versión 1 (hoy `retiring`, mínimo 1 h de
  solapamiento), scheduler de rotación, retención, red-team, pentest y privacidad V2.

## Delta 2026-09-04 (U02 — TASK-1829)

- **U02 (`TASK-1829`) code complete, rollout pendiente** en `develop` (commits `263ee3a74`, `19d1658de`,
  `d31e6e913`). El emisor tiene, detrás de `AUTH_SERVER_OAUTH_ENABLED` (default `false` en
  `services/auth-server/deploy.sh`): metadata RFC 8414 + OIDC discovery (`issuer` idéntico al origen,
  `client_id_metadata_document_supported: true`, S256 único, `subject_types_supported: public`); CIMD como
  registro primario (URL `client_id`, validado con guard anti-SSRF, cache 24 h); DCR RFC 7591 sólo para públicos;
  clientes confidenciales por command (`POST /api/admin/auth-server/oauth-clients`, capability
  `identity.auth_client.register`, o `pnpm auth-server:register-client`); `authorize` (code + PKCE S256,
  consentimiento por cliente y scope, step-up para escritura); `token` (JWT ES256 15 min con
  `iss/sub/aud/azp/scope/gv/exp/iat/jti` firmado en KMS HSM; refresh opaco rotativo 30 d deslizante / 90 d
  absoluto; reuso de code o refresh revoca la familia); `revoke` RFC 7009; `introspect` RFC 7662 (sólo
  confidenciales); commands `grantClientConsent`/`revokeClientConsent` (`POST /api/admin/auth-server/consents/revoke`,
  capability `identity.auth_consent.revoke`, mata todas las familias vivas de `(subject, client)`). Siete tablas
  `greenhouse_auth` (`oauth_clients`, `cimd_cache`, `authorization_codes`, `refresh_tokens`, `access_tokens`,
  `client_consents`, `oauth_audit_events` append-only) aplicadas en Cloud SQL; capabilities seeded (módulo
  `organization`, grant `efeonce_admin`); señales `auth.oauth.code_reuse_detected`,
  `auth.oauth.refresh_reuse_detected`, `auth.oauth.cimd_rejected` (steady 0). Contrato canónico:
  `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`.
- **Política de redirect (decisión del operador 2026-09-04):** públicos = loopback `127.0.0.1`/`[::1]`/alias
  `localhost` en cualquier puerto (Claude Code) o HTTPS exacto; confidenciales/hospedados = HTTPS exacto,
  `localhost` por nombre rechazado.
- **Personas:** el emisor **no** autentica personas todavía. `authorize` responde `login_required` (ningún code)
  hasta que U03 (`TASK-1830`) implemente `SubjectSessionPort` (`src/lib/auth-server/oauth/subject.ts`) con la
  sesión propia (`__Host-efeonce_auth`) y el step-up; U03 además declara sus cinco tablas en
  `src/lib/auth-server/boundary-domain.test.ts` (creado por U02). La pantalla de consentimiento es una página
  mínima server-side; U06 la reemplaza sin cambiar el contrato.
- **`gv`** = `max(grantsVersion)` de las memberships `bound` del sujeto (U04); sin binding ⇒ `access_denied`. El
  gateway (U05) verifica JWT + JWKS y re-chequea `gv`; `introspect` no es su camino.
- **Rollout pendiente:** release de producción del runtime por el control plane; prender el flag en staging
  exige la fila del emisor en `greenhouse_core.external_identity_environments` (`environment_id` `efeonce-auth`,
  command de U04) + validación de metadata + clientes CIMD/DCR de prueba; el flujo con persona real espera U03. El
  broker sister-platform del portal sigue intacto (sólo se extrajeron helpers puros).
- **Impacto cruzado:** U05 (`TASK-1831`) queda desbloqueada por el lado del token en cuanto el flag esté ON en
  staging; U07 (`TASK-1832`) puede planificar canaries con CIMD, DCR y un confidencial por CLI; `TASK-659`
  queda superseded en diseño por este epic (el emisor nativo cubre el OAuth hosted para clientes MCP) — la
  decisión final de lifecycle la registra la sesión principal al cerrar `TASK-1829`.

## Delta 2026-09-04 (producción — release `9100bbd2765d`)

- **U01 (`TASK-1828`) en producción.** El release `9100bbd2765d` (orquestador `production-release.yml`, run
  `33893120972`, manifest `released` 16:39:40Z) ejecutó por primera vez `deploy-auth-server`: revisión
  `auth-server-00005-pk8` (`GIT_SHA f6db4255a`, árbol byte-idéntico al target; deploy change-gated por rutas), un
  solo servicio Cloud Run para staging y producción. Verificado en vivo: `/healthz` `{enabled:true, oauth:false}`,
  `/readyz` 200 (`postgres`/`kms`/`activeKey` ok), JWKS con 2 `kid` (v2 `active`, v1 `retiring`),
  `/.well-known/oauth-authorization-server` → 404 (flag OAuth OFF). Retiro de la llave v1 sigue pendiente (dueño:
  sesión de `TASK-1828`).
- **`AUTH_SERVER_JWKS_URL`** declarada en Vercel Production y staging el mismo día, con redeploy de ambos; la señal
  `auth.issuer.jwks_unreachable` deja `not_configured`. Lectura en producción con sesión humana pendiente (el agent
  auth está deshabilitado en producción por diseño).
- **U02 (`TASK-1829`) sigue `code complete, rollout pendiente`**, ahora con el código en la revisión de
  producción y el flag OFF. Precondición cumplida a medias: el environment del emisor `efeonce-auth` se registró
  en `greenhouse_core.external_identity_environments` en **`draft`** por el command canónico de U04
  (`upsertExternalIdentityEnvironment`, audit + outbox; nunca SQL) a través del CLI nuevo
  `pnpm auth-server:register-issuer-environment` (`issuerUrl https://auth.efeonce.org`, `jwksUri` del JWKS,
  `audience https://mcp.efeonce.org/mcp`, `issuerClass external` inmutable, `subjectType public`, actor
  `cli:jreye`). En `draft` el resolver responde `environment_inactive` (verificado en producción por el lane
  ecosystem `GET /api/platform/ecosystem/identity/binding?environment=efeonce-auth&subject=…` → 200). Pasa a
  `active` con `--status active` exactamente cuando se prenda `AUTH_SERVER_OAUTH_ENABLED` en staging (default en
  `deploy.sh` + `auth-server-deploy.yml`). Después: validar metadata, clientes CIMD + DCR de prueba (U07); flujo con
  persona real exige U03.
- **Scripts del dominio** (`scripts/auth-server/`): `register-issuer-environment.ts`, `register-oauth-client.ts`,
  `oauth-store-smoke.ts` (los tres con `.env.local` + proxy PG), `generate-brand-assets.ts`.

## Delta 2026-09-04 — U11 acceso interno nativo

TASK-1836 es la nueva dueña del gap interno por solicitud del operador. Se retira la propuesta anterior
de reasignar TASK-659, que conserva su historia fuera del epic. Orden: contrato/ADR U11 -> backend interno
U11 -> integración interna U05/U06 -> canaries U07. El slice externo mantiene su secuencia. No se interpreta
el issuer común como autoridad interna ni se cambia la clasificación comercial de Efeonce. Esta decisión
es planificación; no acredita implementación ni login interno nativo operativo.
