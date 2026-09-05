# Efeonce Native Authorization Server Decision V1

> **Status:** `Accepted` (decisión del operador 2026-09-03; sin runtime autorizado hasta que cada task hija abra su gate — `TASK-1828` abrió el suyo el 2026-09-04: runtime, llaves y front door vivos en staging y, ese mismo día, **en producción** por el release `9100bbd2765d` (revisión `auth-server-00005-pk8`), con `AUTH_SERVER_JWKS_URL` declarada en Vercel; `TASK-1829` quedó `code complete, rollout pendiente` detrás de `AUTH_SERVER_OAUTH_ENABLED=false`, con el environment del emisor `efeonce-auth` registrado en `draft`; ver §Delta 2026-09-04, §Delta 2026-09-04 — TASK-1829 y §Delta 2026-09-04 — producción)
> **Date:** 2026-09-03
> **Owner:** Efeonce Platform / Identity
> **Scope:** authorization server propio en `auth.efeonce.org`, autenticación de personas externas, emisión y verificación de tokens para `mcp.efeonce.org`, binding con Account 360, convergencia del login cliente de Greenhouse
> **Reversibility:** `one-way-but-bounded` — el binding provider-neutral de `TASK-1631` deja abierta la vuelta a un proveedor SaaS re-enlazando subjects; lo que no se revierte barato es la responsabilidad operativa asumida
> **Confidence:** `high` en la composición; `medium` en el calendario
> **Supersedes:** la sección `Proposed decision` + `Slice 0 recommendation` (WorkOS staging de gasto cero) de [`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md). **Siguen vigentes** de ese ADR: `Invariants`, `Required binding design`, `Slice 0 binding design proposal`, `Slice 0 gateway authorization-context contract`, `Slice 0 convergence contract`.
> **Program:** [`EPIC-044`](../epics/in-progress/EPIC-044-efeonce-identity-authorization-server-and-mcp-federation.md)

## Context

El ADR de federación (2026-08-01) dejó la composición en tres vías —WorkOS, broker nativo extraído, híbrido— y
el Slice 0 de `TASK-1631` midió el costo: nativo = 7 a 10,5 semanas senior más operación permanente; WorkOS =
USD 99/mes planos con curva SSO de USD 125 por conexión. El 2026-08-05 el operador aprobó WorkOS en staging de
gasto cero, con trigger de revisita en ≥5 conexiones SSO enterprise.

Tres hechos cambiaron desde entonces:

1. **La capacidad de ejecución cambió de escala.** Con Fable 5.1 y GPT 5.6 High operando sobre el broker
   existente (6.917 líneas en `src/lib/sister-platforms/**` con PKCE, allowlists exactas de redirect, tokens
   opacos hasheados, TTLs, revocación, audit y workspace bindings) y sobre los contratos ya diseñados en el
   Slice 0 (schema de binding, registry de environments, `AuthContext` del gateway, contrato de convergencia),
   el build nativo se estima en 3 a 4 semanas calendario code-complete, no en 7 a 10,5 semanas senior.
2. **El gateway necesita un emisor propio de todos modos.** La auditoría del 2026-09-02
   ([`EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`](../audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md))
   estableció que CIMD es capacidad del *authorization server* y que el shim DCR sobre Entra no puede ofrecerlo;
   que la revisión `2026-07-28` del MCP exige `issuer` idéntico al origen del well-known, cosa que el espejo de
   Entra viola por construcción; y que el cliente público compartido con `http://localhost` sin puerto es un
   riesgo con forma de confused deputy que sólo cierran identidades por cliente con grants revocables. Las tres
   apuntan al mismo lugar: emitir los tokens.
3. **Nativo elimina el gate de subprocesador.** Con WorkOS, `TASK-1631` quedaba bloqueada por DPA y lista de
   subprocesadores ([`EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`](../operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md)).
   Con emisor propio, Efeonce ya es responsable del tratamiento de esas personas en Greenhouse y no aparece un
   encargado nuevo. La Ley 21.719 (plena vigencia 2026-12-01) sigue exigiendo postura de seguridad; deja de
   exigir contrato con un tercero.

El operador decidió el 2026-09-03: **Efeonce construye y opera su propio authorization server. No se compra
a nadie.**

## Decision

**Efeonce opera un authorization server propio en `auth.efeonce.org`, extraído del broker sister-platform,
desplegado como Cloud Run independiente, que autentica personas externas sin contraseñas y emite tokens
firmados con llave en Cloud KMS HSM para la audiencia `https://mcp.efeonce.org/mcp`.** Account 360 sigue siendo
el único ancla de organización; el binding y los grants son los ya diseñados en el Slice 0 de `TASK-1631`.

Partes de la decisión:

1. **Runtime.** `services/auth-server/` en `greenhouse-eo`, Cloud Run service en `us-east4` (misma región que
   Cloud SQL y que las llaves KMS), publicado como **segundo host del front door existente del gateway MCP**
   (decisión del operador 2026-09-03, «un escritorio más en la misma oficina»): el mismo global load balancer,
   la misma IP `34.111.78.237` y la misma policy de Cloud Armor, con una host rule `auth.efeonce.org` → backend
   service propio (serverless NEG en `us-east4`) y un certificado managed adicional en el target HTTPS proxy.
   No se crea un segundo LB ni una segunda policy; el Terraform vive en `efeonce-mcp/infra/terraform/`. Cookie propia
   `__Host-` en namespace separado, session store propio, secretos propios en Secret Manager, deploy por
   workflow con `--set-env-vars` declarado en `deploy.sh` como los cuatro workers existentes. Nunca comparte
   `NEXTAUTH_SECRET` ni acepta una cookie del portal. Es una **excepción documentada de EPIC-027** del mismo
   tipo que `artifact-worker`: no toca el grafo del portal Next.js, no crea `apps/*` ni `packages/*`.
2. **Protocolo.** Authorization code + PKCE obligatorio; metadata RFC 8414 con `issuer` idéntico al origen;
   **CIMD como mecanismo primario** de registro de clientes (`client_id` con forma de URL, documento validado
   y cacheado); DCR RFC 7591 como compatibilidad mientras los clientes la usen; clientes confidenciales
   pre-registrados para hosts (ChatGPT y similares); loopback `127.0.0.1`/`[::1]` en cualquier puerto para
   clientes públicos nativos y HTTPS exacto para clientes hospedados; refresh tokens opacos rotativos y
   revocación RFC 7009; consentimiento por cliente y por scope, persistido y revocable.
3. **Tokens.** Access tokens JWT **ES256** de 15 minutos firmados con una llave asimétrica en **Cloud KMS con
   protección HSM** (la privada nunca sale del hardware; JWKS público con `kid` y rotación con solapamiento);
   claims `iss`, `sub` (subject opaco y estable por persona dentro de este issuer, `subject_types_supported:
   public`), `aud`, `azp`, `scope`, `gv` (`grants_version`) y `exp`. El gateway verifica firma y audience con
   el JWKS y rechequea `grants_version` contra el resolver de bindings con caché corta: un grant revocado
   deja de despachar en menos de cinco minutos aunque el token siga vigente.
4. **Autenticación de personas: sin contraseñas.** Passkeys (WebAuthn) como método primario, magic link por
   Resend como alternativa, TOTP como step-up para clases de autoridad de escritura, recuperación por
   re-invitación auditada del operador. No existe password store propio; no hay credential stuffing que
   defender. Rate limiting en el borde (Cloud Armor) y en Postgres por sujeto e IP, con el patrón ya usado en
   `magic-link.ts` y en `party-endpoint-rate-limit.ts`.
5. **Identidad y binding.** Sin cambios respecto del Slice 0: `identity_profile_source_links` con
   `source_system = 'external_idp:<environment_id>'` y la llave `(environment, subject)`; tablas
   `external_identity_environments`, `external_organization_bindings`, `external_capability_grants` y
   `external_member_invitations`; commands `bindExternalOrganization`, `issueExternalInvitation` y
   `revokeExternalAccess`, cada uno con capability dedicada. El registry de environments absorbe la
   rotación de issuer (por ejemplo, un dominio de staging a `auth.efeonce.org`).
6. **Gateway.** `AuthContext` con seis campos separados, resolver por issuer, `allowedIssuers` y clase de
   autoridad por tool, sin fallback `clientId = azp ?? sub`, sin fusión `scp ∪ scope ∪ roles`. Entra sigue
   como issuer interno; el servidor propio es el segundo issuer y el único para clientes externos.
7. **Superficie visible.** Login, consentimiento y recuperación son una task `ui-ux` dependiente que nace con
   wireframe y flow reales al cerrar el contrato de diseño; bloquea sólo los canaries de cliente.
8. **Convergencia del login cliente de Greenhouse.** Se conserva el contrato del Slice 0: el portal agrega el
   emisor propio como provider OIDC de NextAuth y resuelve el mismo source link; rollback = retirar el
   provider. Gate separado y posterior a la primera cohorte MCP.

Tabla de las tecnologías (todas ya presentes o de costo marginal):

| Necesidad | Solución | Estado |
| --- | --- | --- |
| Runtime público, TLS, anti-abuso | Cloud Run + host rule en el global LB del gateway + certificado managed adicional + la misma policy Cloud Armor | reutiliza el front door de `efeonce-mcp` |
| DNS `auth.efeonce.org` | registro A a la IP global existente del gateway, zona `efeonce.org` en HostGator | registro manual del operador |
| Estado (sesiones, refresh tokens, consents, passkeys, TOTP, clientes) | Cloud SQL `greenhouse-pg-dev`, schema nuevo `greenhouse_auth` | migración aditiva |
| Binding, invitaciones, grants | `greenhouse_core` (diseño Slice 0) | migración aditiva |
| Firma de tokens | Cloud KMS HSM, ES256, ~USD 5/mes por dos versiones activas | por crear |
| Correo (magic link, invitaciones) | Resend | integrado |
| Passkeys y TOTP | `@simplewebauthn/server`, `otplib` | dependencias nuevas |
| Observabilidad e incidentes | Sentry por dominio + Reliability Control Plane | integrado |
| CI/CD | GitHub Actions + release control plane, carril de workers Cloud Run | integrado |

## Alternatives considered

- **WorkOS AuthKit + Connect (recomendación anterior).** Barato en dinero (USD 0 hoy, USD 99/mes con
  dominio) y sin operación propia. Rechazada por decisión del operador: dependencia de un tercero en la puerta
  de entrada de los clientes, gate de subprocesador abierto, "Powered by WorkOS" en la cohorte y curva de USD
  125 por conexión SSO. La portabilidad del binding diseñado hace que esta alternativa siga disponible como
  salida de emergencia, no como plan.
- **Híbrido: nativo + WorkOS para SAML/SCIM enterprise.** Compra federación enterprise cuando aparezca.
  Rechazada ahora por duplicar adapters y modos de falla sin demanda medida; se reabre si un cliente exige su
  propio IdP (ver *Revisit when*).
- **Entra como identity provider de clientes.** Rechazada en el ADR de federación y confirmada: no modela
  organización cliente, administrador, miembro ni revocación, y Entra no soporta CIMD ni DCR.
- **Seguir con el shim DCR y no emitir tokens (no hacer nada).** Mantiene el desajuste de `issuer` que la
  revisión `2026-07-28` prohíbe, el cliente público compartido y la imposibilidad de acceso B2B. Rechazada:
  el bloqueo ya alcanza a EPIC-011, EPIC-012, EPIC-022 y EPIC-043.
- **Llave de firma como secreto crudo en Secret Manager en vez de KMS HSM.** Ahorra USD 5/mes. Rechazada:
  una llave privada exportable en un servicio de autenticación público es una diferencia de clase, no de grado.

## 4-pillar scoring

| Pilar | Evaluación | Verificación |
| --- | --- | --- |
| **Safety** | Sin contraseñas (elimina la clase de ataque más común); llave privada no exportable en HSM; consentimiento por cliente cierra el confused deputy del cliente compartido; tools calificadas por issuer y clase de autoridad; grants revocables con `grants_version`; PKCE obligatorio; redirect exacto para hospedados. Blast radius de un token robado: 15 minutos, scope consentido, organización ligada. | tests de denegación por issuer, por roles-sin-scope y por grant revocado con token vigente; red-team cruzado Fable/GPT; pentest externo antes del primer cliente |
| **Robustness** | Commands idempotentes y auditados; state machines con `CHECK`; códigos de autorización de un solo uso con `SELECT FOR UPDATE`; refresh rotativo con detección de reuso (revoca la familia); CIMD validado contra esquema y cacheado con TTL; rechazo de issuer desconocido antes de tocar JWKS | tests de concurrencia en `token`; suite del broker existente + nuevas; smoke contra PG real |
| **Resilience** | Rotación de llave con dos versiones activas y `kid`; JWKS cacheado en el gateway con fallback a la última copia buena; scale-to-zero con mínimo 1 instancia en producción; rollback por revisión Cloud Run < 5 min; cuatro señales de reliability (`unbound_dispatch_attempt`, `revoked_still_dispatching`, `subject_collision`, `orphan_grant`) + salud del issuer (`auth.issuer.jwks_unreachable`, `auth.kms.sign_failures`) | runbooks de rotación, incidente y revocación masiva; watchdog del front door |
| **Scalability** | Emisión limitada por KMS (~10-30 ms por firma; miles por minuto sin cambio); verificación en el gateway sin llamadas a KMS; tablas keyeadas por `(environment, subject)` y `binding_id`; 20 organizaciones o 2.000 no cambian el diseño; SSO enterprise por cliente es el único vector que exigiría SAML | cost model: KMS ≈ USD 8/mes a 1M firmas; Cloud Run ≈ costo de un worker más |

## Consequences

### Positive

- Un solo stack de identidad para MCP y, después, para el login cliente del portal.
- CIMD, `issuer` conforme y consentimiento por cliente pasan a ser posibles; el shim DCR de Entra queda
  acotado al carril interno hasta que el issuer propio lo reemplace también ahí.
- Desaparece el gate de subprocesador; la revisión de privacidad se reduce a postura de seguridad y retención.
- Exit barato hacia un SaaS si alguna vez conviene: re-enlazar subjects, nunca migrar credenciales.

### Negative

- Efeonce asume patching, rotación de llaves, respuesta a incidentes y responsabilidad 24/7 por un servicio
  de autenticación público, justo cuando la Ley 21.719 entra en vigencia.
- El calendario real lo mandan gates humanos, no el código: matriz de tokens con clientes reales, pentest,
  cadencia del release control plane y la excepción de EPIC-027.
- Federación enterprise (SAML/SCIM) no viene incluida; si un cliente la exige, se compra o se construye aparte.

### Neutral / structural

- El broker sister-platform deja de ser "foundation" y pasa a ser el núcleo del servicio; sus rutas en el
  portal quedan como consumidores internos hasta que la extracción las reemplace.
- `TASK-659` (auth hosted del MCP interno de Greenhouse) queda cubierta en diseño por este emisor; su cierre o
  supersesión se decide en `EPIC-044`, no aquí.

## Hard rules implied

- **NUNCA** operar el authorization server dentro del deployable de Greenhouse en Vercel ni dentro del gateway
  MCP: runtime propio, cookie propia, secretos propios, audiencia propia.
- **NUNCA** almacenar contraseñas de personas externas; la autenticación es passkey, magic link o TOTP.
- **NUNCA** firmar tokens con una llave exportable; la privada vive en Cloud KMS HSM y se rota con solapamiento.
- **NUNCA** llavear filas durables por el `issuer` crudo; siempre por `environment_id` del registry.
- **NUNCA** resolver la persona por `client_id` ni por email; sólo por `(issuer, subject)` verificado.
- **NUNCA** conceder un scope de escritura a un cliente público sin consentimiento por cliente y step-up.
- **NUNCA** dejar que un token del issuer externo alcance una tool declarada internal-only, aunque porte el
  mismo scope string.
- **NUNCA** abrir signup público, inferir membership por dominio de correo ni hacer backfill automático de
  clientes; la cohorte entra por allowlist + invitación auditada.
- **SIEMPRE** publicar `issuer` idéntico al origen del well-known y `client_id_metadata_document_supported`.
- **SIEMPRE** que se agregue un issuer o una tool, declarar `allowedIssuers` y clase de autoridad antes del
  primer deploy.

## Roadmap (tasks del programa EPIC-044)

| Orden | Task | Alcance | Estimación agéntica |
| --- | --- | --- | --- |
| 1 | `TASK-1828` ✅ | Runtime `auth.efeonce.org`: deployable, host en el front door del gateway, KMS, JWKS, session store, excepción EPIC-027. **Ejecutada 2026-09-04**: Cloud Run `auth-server` desplegado por CI (revisión `auth-server-00003-jtf`), llave ES256 en KMS HSM con rotación probada, schema `greenhouse_auth`, host publicado en el LB del gateway y `https://auth.efeonce.org/readyz` 200; producción entra con el próximo release (ver §Delta 2026-09-04) | 3 a 4 días (real: 2 días) |
| 2 | `TASK-1829` ✅ | Superficie OAuth: metadata, CIMD, DCR compat, PKCE, tokens ES256, refresh, revocación, consentimiento. **Code complete en `develop` 2026-09-04, rollout pendiente**: flag `AUTH_SERVER_OAUTH_ENABLED=false`, 7 tablas `greenhouse_auth` aplicadas, 68 tests + smoke PG real; contrato [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md) (ver §Delta 2026-09-04 — TASK-1829) | 3 a 4 días (real: 1 día) |
| 3 | `TASK-1830` | Autenticación de personas externas: passkeys, magic link, TOTP, recuperación, anti-abuso | 5 a 7 días |
| 4 | `TASK-1631` | Binding Account 360, invitaciones, grants, `grants_version`, eligibility reader (re-alcance). **Slice 1 entregado 2026-09-04** (schema, commands, reader del gateway, 4 señales; migraciones aplicadas); rollout pendiente: sin environment real, sin binding de cliente real, sin UI | 3 a 4 días |
| 5 | `TASK-1831` | Gateway multi-issuer: `AuthContext`, resolver por issuer, tools calificadas, recheck de grants | 2 a 3 días |
| 6 | task `ui-ux` | Login, consentimiento y recuperación (nace con wireframe y flow reales) | 3 a 5 días, en paralelo |
| 7 | `TASK-1832` | Canaries Claude/Codex/ChatGPT, matriz de tokens, primera cohorte de clientes | 3 a 5 días + sesiones interactivas |
| 8 | `TASK-1833` | Aseguramiento y operación: red-team, pentest, rotación, señales, runbooks, Ley 21.719 | 3 a 4 días + pentest externo |
| 9 | `TASK-1834` | Convergencia del login cliente de Greenhouse sobre el emisor propio | 2 a 3 días, gate propio |

Code complete estimado: 3 a 4 semanas calendario con dos agentes en paralelo y un operador. Operativo para el
primer cliente: 5 a 7 semanas por los gates humanos.

## Revisit when

- Un cliente exige SSO/SAML con su propio IdP: decidir híbrido (proveedor upstream sólo para federación) o
  SAML nativo, con costo medido.
- Un cliente MCP objetivo deja de soportar CIMD y DCR simultáneamente, o la revisión del MCP cambia el
  contrato de discovery.
- El pentest externo encuentra una clase de vulnerabilidad que no se cierra en un ciclo.
- La operación del servicio consume más de un día-persona por semana durante dos meses seguidos.

## Open questions (deliberadamente no decididas aquí)

- Si el issuer propio reemplaza también a Entra para personas internas en MCP (hoy: no; Entra sigue interno).
- Si `TASK-659` se cierra por supersesión o se re-alcanza como consumidor interno del emisor.
- Modelo de grants por persona para capabilities internas como `growth.ai_visibility.prompt_set.manage`
  (delta 2026-08-26 de `TASK-1631`): el binding ya lo resuelve con `external_capability_grants.profile_id`
  (NULL = todos los miembros ligados; set = solo esa persona) (actualizado 2026-09-04, TASK-1631). Queda registrar Entra como
  environment `internal` + binding de la organización propia de Efeonce (EO-ORG-0007) en `TASK-1831` o en una
  task de Growth si se quiere usar este grafo también para personas internas.
- Región definitiva del runtime si el tráfico de clientes se concentra en Chile (`southamerica-west1` como
  el gateway) frente a la latencia hacia Cloud SQL en `us-east4`.

## References

- [`EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`](EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md)
- [`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) §Delta 2026-09-02
- [`EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`](../audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md)
- [`EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`](../operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md)
- [`GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`](GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md) §Delta 2026-07-12 (patrón de excepción)
- [`GREENHOUSE_360_OBJECT_MODEL_V1.md`](GREENHOUSE_360_OBJECT_MODEL_V1.md) · [`GREENHOUSE_IDENTITY_ACCESS_V2.md`](GREENHOUSE_IDENTITY_ACCESS_V2.md)
- [`TASK-1631`](../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md) · [`TASK-1626`](../tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md) · [`TASK-1813`](../tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md)
- Cloud KMS pricing (vigente 2025-03-17): https://cloud.google.com/kms/pricing

## Delta 2026-09-03 — costo en Google Cloud y front door compartido

Medido en el billing export (30 días, USD): el front door del gateway cuesta 36,84 en forwarding rules y 6,95 en
Cloud Armor con tráfico casi nulo; el Cloud Run del gateway 0,39. Un front door propio para el emisor habría
sumado ≈ USD 58/mes; compartir el del gateway deja el adicional en **≈ USD 15/mes** (Cloud Run con una instancia
mínima ≈ 8, KMS HSM ≈ 5, Secret Manager/Scheduler/Artifact Registry ≈ 1, Cloud SQL 0 por ser la misma
instancia). El operador eligió compartir. Consecuencia: la task `TASK-1828` edita el Terraform del repo
`efeonce-mcp` (host rule, backend service, NEG, certificado) y el aislamiento entre emisor y gateway queda en
Cloud Run, IAM, cookies, secretos y audiencia, no en el LB.

## Delta 2026-09-04 — TASK-1828 ejecutada (runtime, llaves, front door)

Estado implementado y verificado en vivo el 2026-09-04. Cubre sólo la capa de runtime y llaves; los endpoints
OAuth, la autenticación de personas y el gateway multi-issuer siguen en sus tasks (ver *Fuera de alcance*).
Producción: **code complete, rollout pendiente** — el servicio entra con el próximo release por el orquestador.

**Llaves (Cloud KMS).** Cloud KMS habilitada en `efeonce-group`; key ring `us-east4/auth-server`; llave
`auth-server-es256` (`ASYMMETRIC_SIGN`, `EC_SIGN_P256_SHA256`, protección **HSM**). La rotación ya se ejercitó:
versión 2 `ACTIVE` (kid `xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc`) es la que firma; versión 1 quedó en
`retiring` (kid `VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8`) y su retiro está pendiente tras la ventana mínima
de solapamiento (≥ 1 h) más `gcloud kms keys versions disable 1`. La llave privada nunca sale del HSM.

**IAM.** SA de runtime `auth-server@efeonce-group`: `roles/cloudkms.signerVerifier` **sólo sobre la llave** +
`roles/cloudsql.client`. Deployer de CI `github-actions-deployer@`: `roles/iam.serviceAccountUser` sobre
`auth-server@` + `roles/cloudkms.viewer` sobre la llave — sin este último el preflight de `deploy.sh` falla con
«KMS key not found» (ocurrió en el run `33870746218` y se corrigió; el rerun terminó `success`).

**Schema `greenhouse_auth`** (migración `20260904111156246_task-1828-greenhouse-auth-schema.sql`): tabla
`signing_keys` (`kid` PK, `kms_key_version` UNIQUE, `public_jwk` JSONB sin `d`, `state` `active|retiring|retired`
con CHECK y timestamps coherentes, índice parcial único = máximo 1 `active`) y `signing_key_events` (append-only
por trigger). Owner `greenhouse_ops`; grants SELECT/INSERT/UPDATE a `greenhouse_app` y `greenhouse_runtime`. **Sin
material privado en PG.**

**Código.** `src/lib/auth-server/keys/{kms-signer.ts,signing-keys-store.ts,index.ts}`: adapter KMS
(`asymmetricSign` sobre digest SHA-256 con CRC32C del digest y de la firma, DER→JOSE, `kid` = thumbprint RFC 7638,
verificación local obligatoria antes de devolver un JWS) y store con `registerSigningKeyVersion` /
`retireSigningKey` / `signWithActiveKey` (advisory lock, ventana mínima de solapamiento 1 h, audit). 15 tests.
CLI `pnpm auth-server:rotate-key` (`scripts/auth-server/rotate-signing-key.ts`) con `--status`, `--register`,
`--retire`, `--force`.

**Servicio.** `services/auth-server/{server.ts,Dockerfile,deploy.sh,README.md}` sobre `node:http`. Rutas:
`GET /healthz` (200 siempre), `GET /readyz` (503 con `AUTH_SERVER_ENABLED=false`; 200 sólo con PG + KMS + llave
`active`), `GET /.well-known/jwks.json` (`active` + `retiring`, `Cache-Control: max-age=300`; 404 con flag OFF).
Allowlist de `Host` por `AUTH_SERVER_ALLOWED_HOSTS` (421 si no coincide); errores sanitizados +
`captureWithDomain('identity', component=auth-server)`. Cloud Run `auth-server` en `us-east4`, 1 vCPU / 512 Mi,
concurrency 80, timeout 30 s, min 1 instancia en production / 0 en staging, ingress
`internal-and-cloud-load-balancing` + `allow-unauthenticated` (el ALB no emite IAM hacia un serverless NEG).
Servicio **único compartido por staging y production**, como `ops-worker`. Revisión activa `auth-server-00003-jtf`
con `GIT_SHA=02dc5d987`, desplegada por CI vía WIF (run `33870746218`, rerun `success`).

**Env vars** (SoT `deploy.sh`; `--set-env-vars` es destructivo): `AUTH_SERVER_ENABLED` (default `true` desde
2026-09-04; fila en `FEATURE_FLAG_STATE_LEDGER.md` actualizada), `AUTH_SERVER_ISSUER=https://auth.efeonce.org`,
`AUTH_SERVER_ALLOWED_HOSTS=auth.efeonce.org`, `AUTH_SERVER_KMS_KEY=<nombre completo de la llave>`,
`GREENHOUSE_POSTGRES_*` (Connector), `SENTRY_ENVIRONMENT`; secretos `GREENHOUSE_POSTGRES_PASSWORD` y `SENTRY_DSN`.

**Front door.** `auth.efeonce.org` es el **segundo host** del LB global del gateway MCP
(`efeonce-mcp/infra/terraform`, commit `6a144a5`, variable `enable_auth_host` default `true`): host rule + path
matcher → backend `efeonce-auth-server-backend` (NEG serverless `us-east4`) con la **misma** policy Cloud Armor;
certificado managed adicional `efeonce-auth-server-cert` (`ACTIVE`) en el proxy HTTPS existente; misma IP
`34.111.78.237`; sin forwarding rules nuevos. Apply: 3 add / 2 change in-place / 0 destroy; `mcp.efeonce.org`
respondió 200 antes y después. DNS A `auth.efeonce.org` → `34.111.78.237` (HostGator).

**Verificado en vivo.** `https://auth.efeonce.org/readyz` → 200 `{postgres, kms, activeKey: ok}`; el JWKS publica
los dos `kid`; un token ES256 firmado por el HSM verifica con `jose` `createRemoteJWKSet` contra ese JWKS —
exactamente lo que hará el gateway en `TASK-1831`.

**Release.** Workflow `.github/workflows/auth-server-deploy.yml` (`workflow_call`, drift check
`WORKER_RUNTIME_PATHS`, verificación de `GIT_SHA`); registrado en `RELEASE_DEPLOY_WORKFLOWS` (`'Auth Server Deploy'`,
`cloudRunService: auth-server`, `us-east4`), en `production-release.yml` (job `deploy-auth-server`) y en los tres
gates de workers (build-contract, runtime-deps, deploy-path-coverage).

**Reliability.** `auth.issuer.jwks_unreachable` (`runtime`; `not_configured` mientras Vercel no tenga
`AUTH_SERVER_JWKS_URL` — declarada en Production y staging el 2026-09-04, ver §Delta producción; `error` si el JWKS difiere del registry) y `auth.signing_keys.lifecycle` (`data_quality`;
`error` sin `active` o con más de una; `warning` si una `retiring` supera 7 días) en
`src/lib/reliability/queries/auth-server-signals.ts`, cableadas en `get-reliability-overview.ts` y en el registry
`identity`. `auth.kms.sign_failures` se observa por incidentes Sentry con tag `component=auth-server` /
`check=kms`, no como contador propio.

**Costo.** Adicional en GCP ≈ USD 15/mes (Cloud Run min 1 ≈ 8, KMS HSM ≈ 5 por versión activa, resto ≈ 1); sin LB
ni Cloud Armor nuevos, como se midió en el delta anterior.

**Fuera de alcance de TASK-1828** (queda en sus tasks): endpoints OAuth/CIMD/tokens (`TASK-1829`), passkeys /
magic link / TOTP (`TASK-1830`), gateway multi-issuer (`TASK-1831`), canaries (`TASK-1832`), pentest y rotación
programada (`TASK-1833`), convergencia del login (`TASK-1834`). **El login de Greenhouse no cambia.** Runbook:
[`docs/operations/runbooks/auth-server.md`](../operations/runbooks/auth-server.md).

## Delta 2026-09-04 — TASK-1829 code complete (superficie OAuth, rollout pendiente)

Entregado en `develop` el mismo día (commits `263ee3a74` Slice 1, `19d1658de` Slices 2–3, `d31e6e913` Slice 4),
estado **`code complete, rollout pendiente`**: el runtime en staging sigue sirviendo sólo `/readyz` + JWKS porque
`AUTH_SERVER_OAUTH_ENABLED` nace en `false` en `deploy.sh`. Contrato técnico completo (endpoints, claims, tablas,
invariantes): [`EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`](EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md).

**Qué existe.** Dominio `src/lib/auth-server/oauth/**` (primitives extraídas de
`src/lib/sister-platforms/oauth-broker.ts` sin cambio de contrato; la suite sister-platforms sigue verde), handler
testeable en `services/auth-server/app.ts`, cableado PG/KMS/ports en `server.ts`. Rutas en `auth.efeonce.org`:
metadata RFC 8414 + OIDC (`issuer` idéntico al origen), `POST /oauth/register` (DCR compat, sólo públicos, 10/min
por IP), `GET /oauth/authorize` + `POST /oauth/consent` (PKCE `S256` obligatorio, consentimiento por scope),
`POST /oauth/token` (`authorization_code` + `refresh_token`; `none` / `client_secret_basic` / `client_secret_post`;
60/min por IP · 120/min por cliente), `POST /oauth/revoke` (RFC 7009), `POST /oauth/introspect` (RFC 7662, sólo
confidenciales); todo 404 con el flag OFF, y `/healthz` + `/readyz` reportan `oauth: <bool>`. **CIMD** es el
registro primario (`client_id` = URL https con path; anti-SSRF con DNS resuelto y rangos privados rechazados, sin
redirects, 3 s, 64 KB; cache 24 h + `etag`, rechazo cacheado 15 min); confidenciales pre-registrados por
`registerConfidentialClient` ← `POST /api/admin/auth-server/oauth-clients` (capability
`identity.auth_client.register`) y `pnpm auth-server:register-client`; revocación de consentimiento ←
`POST /api/admin/auth-server/consents/revoke` (`identity.auth_consent.revoke`); ambas capabilities módulo
`organization`, grant `EFEONCE_ADMIN`, seeds aplicados (`20260904132753267` + forward-fix `20260904133148469`).
Access token JWT ES256 de 15 min firmado por `signWithActiveKey` (KMS HSM) con `iss/sub/aud/azp/client_id/scope/
gv/iat/exp/jti/auth_time`; refresh opaco `efr_` (sha256 persistido, familia = `grant_id`, 30 d deslizante / 90 d
absoluto, rotación en cada uso, reuso revoca la familia); code `efc_` de un solo uso bajo `FOR UPDATE`.

**Decisión `localhost` (operador, 2026-09-04).** Clientes **públicos**: loopback `127.0.0.1` / `[::1]` y el alias
`localhost` por nombre, puerto libre, path exacto (RFC 8252 §7.3; Claude Code lo necesita) — o HTTPS exacto para
públicos hospedados. Clientes **confidenciales**: HTTPS exacto; `localhost` por nombre **rechazado**. Nunca
wildcards. Con esto la regla «no estrechar `http://localhost` a secas» del gateway queda satisfecha sin abrir la
puerta a un confidencial escuchando en loopback.

**Siete tablas, no cinco.** El plan contaba `oauth_clients`, `cimd_cache`, `authorization_codes`, `refresh_tokens` y
`client_consents`. Se agregaron dos: `access_tokens` (registro de `jti`) porque revocación RFC 7009 e introspección
RFC 7662 necesitan saber qué access tokens vivos pertenecen a una familia, y sin registro «revocar la familia» sólo
podría alcanzar a los refresh; y `oauth_audit_events` propia (append-only por trigger) porque el audit legacy de
identidad tiene FK/CHECK hacia sujetos internos y no admite sujetos externos ni clientes CIMD — además de que el
rate limit cuenta sobre ella (patrón `party-endpoint-rate-limit`), lo que evita una tabla de contadores aparte.
Migration `20260904130826694_task-1829-auth-oauth-tables.sql`, aplicada en Cloud SQL.

**`gv`.** El claim es `max(grantsVersion)` de las memberships **`bound`** del sujeto, resuelto en cada emisión
(code y refresh) vía `resolveExternalAccess({ environmentId: AUTH_SERVER_ENVIRONMENT_ID, subject })`; sin
membership `bound` el emisor responde `access_denied` (fail-closed). Cualquier revoke de TASK-1631 bumpea la
versión y el gateway (TASK-1831) compara por igualdad estricta sin llamar a introspección.

**Persona.** Hasta TASK-1830 el runtime inyecta `unauthenticatedSubjectPort`: `authorize` responde
`login_required` (401; `prompt=none` ⇒ redirect con error). La pantalla de consentimiento es una página mínima
server-side (isotipo Efeonce del SSOT bundleado por `pnpm auth-server:brand-assets:generate` + test de drift; copy
en `src/lib/copy/auth-server.ts`); la task ui-ux reemplaza la vista conservando el contrato de campos
(`client_id`, `scope`, `return_to`, `decision`).

**Observabilidad y verificación.** Señales `auth.oauth.code_reuse_detected` (`error`),
`auth.oauth.refresh_reuse_detected` (`error`), `auth.oauth.cimd_rejected` (`warning`) en el mismo reader de
TASK-1828 (módulo `identity`, kind `incident`, 24 h sobre `oauth_audit_events`, steady 0). Gates:
`pnpm vitest run src/lib/auth-server` (68 tests, flujo completo in-process) · `pnpm auth-server:oauth-store:smoke`
(PG real, OK 2026-09-04) · typecheck · gates de workers (runtime-deps, build-contract, deploy-path).

**Rollout pendiente.** (1) ~~Release de producción del runtime~~ — **hecho** el 2026-09-04 con el release
`9100bbd2765d` (el runtime corre en producción con el flag OFF; ver §Delta 2026-09-04 — producción); (2) prender
`AUTH_SERVER_OAUTH_ENABLED` en staging **sólo** después de pasar a `active` el environment del emisor en
`greenhouse_core.external_identity_environments` (`environment_id=efeonce-auth`, `issuer_url=https://auth.efeonce.org`,
`issuer_class=external`; **registrado en `draft` el 2026-09-04** por el command de TASK-1631 vía
`pnpm auth-server:register-issuer-environment`; `--status active` en el mismo momento del flip) y validar la
metadata; (3) flujo con persona real exige TASK-1830. Nunca
`gcloud run services update --update-env-vars` a mano. Follow-ups: `private_key_jwt`, migración de los
sister-platform consumers internos, command `oauth-gc` + scheduler para filas expiradas, decisión `TASK-659` al
cierre. Runbook: [`docs/operations/runbooks/auth-server.md`](../operations/runbooks/auth-server.md) §`OAuth`.

## Delta 2026-09-04 — producción (release `9100bbd2765d`)

**Runtime en producción.** El release `9100bbd2765d` (orquestador `production-release.yml`, run `33893120972`,
manifest `released` a las 16:39:40Z) ejecutó por primera vez el job `deploy-auth-server`: revisión activa
`auth-server-00005-pk8` con `GIT_SHA f6db4255a` (árbol byte-idéntico al target del release; el deploy es
change-gated por rutas, así que la revisión sólo cambia cuando cambia `services/auth-server/**` o el código que
bundlea). Servicio Cloud Run único compartido por staging y producción, como `ops-worker`. Verificado en vivo en
`https://auth.efeonce.org`: `/healthz` `{enabled:true, oauth:false}`, `/readyz` 200 con `postgres`, `kms` y
`activeKey` en `ok`, `/.well-known/jwks.json` con los dos `kid` (v2 `active`
`xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc`, v1 `retiring` `VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8`) y
`/.well-known/oauth-authorization-server` → 404 porque `AUTH_SERVER_OAUTH_ENABLED=false` (TASK-1829 sigue
`code complete, rollout pendiente`). El retiro de la versión 1 de la llave sigue pendiente (dueño: la sesión de
TASK-1828).

**`AUTH_SERVER_JWKS_URL` en Vercel.** `https://auth.efeonce.org/.well-known/jwks.json` declarada en Production y
en staging el 2026-09-04, con redeploy de ambos (Production `greenhouse-or66smmd7…` READY, staging
`greenhouse-a55noth42…` READY): el reader de `auth.issuer.jwks_unreachable` deja de responder `not_configured`.
Nadie ha leído todavía esa señal en producción con una sesión humana (el agent auth está deshabilitado en
producción por diseño): **verificación pendiente**, no evidencia.

**Environment del emisor registrado en `draft`.** La fila `efeonce-auth` de
`greenhouse_core.external_identity_environments` se creó el 2026-09-04 por el command canónico de TASK-1631
(`upsertExternalIdentityEnvironment`: transacción + audit + outbox; nunca SQL) a través del CLI nuevo
`pnpm auth-server:register-issuer-environment` (`scripts/auth-server/register-issuer-environment.ts`; lee
`.env.local`, perfil ops, proxy `127.0.0.1:15432`; flags `--status draft|active`, `--environment-id`): `displayName`
«Efeonce Auth», provider `efeonce_auth`, `issuerUrl https://auth.efeonce.org`, `jwksUri
https://auth.efeonce.org/.well-known/jwks.json`, `audience https://mcp.efeonce.org/mcp`, `issuerClass external`
(inmutable después), `subjectType public`, **status `draft`**, actor `cli:jreye`, `created=true`. En `draft` el
resolver responde `environment_inactive` — verificado en producción por el lane ecosystem
`GET /api/platform/ecosystem/identity/binding?environment=efeonce-auth&subject=…` con el token consumer del
gateway → 200 `outcome: environment_inactive` (400 sin parámetros, 401 sin token). Pasarla a `active` = el mismo
CLI con `--status active`, exactamente cuando se prenda `AUTH_SERVER_OAUTH_ENABLED` en staging (precondición
registrada en el ledger de flags). Scripts hermanos del mismo día bajo `scripts/auth-server/`:
`register-oauth-client.ts` (`pnpm auth-server:register-client`), `oauth-store-smoke.ts`
(`pnpm auth-server:oauth-store:smoke`), `generate-brand-assets.ts` (`pnpm auth-server:brand-assets:generate`);
todos salvo el de brand assets exigen `.env.local` + proxy PG.

**Próximos pasos de TASK-1829 (sin cambio de estado).** Flag ON en staging (default en
`services/auth-server/deploy.sh` + workflow `auth-server-deploy.yml`), environment a `active`, validación de la
metadata, clientes CIMD + DCR de prueba (TASK-1832); el flujo con persona real exige TASK-1830.

## Delta 2026-09-05 — U03 viva, y el correo que estaba muerto detrás de nueve canaries verdes

**U03 (`TASK-1830`) activada.** La revisión `auth-server-00007-cxb` (SHA `3f68e8875`, 100% del tráfico,
workflow de staging `33934410457` en `success`) sirve la superficie de personas y la OAuth con **ambos
flags ON** (`AUTH_SERVER_PERSON_AUTH_ENABLED`, `AUTH_SERVER_OAUTH_ENABLED`), y el environment del emisor
`efeonce-auth` pasó de `draft` a **`active`** por el command de U04. Esto supersede, para ambos flags, el
`rollout pendiente` que declaran el encabezado y el §Delta 2026-09-04 — TASK-1829.

**El defecto que la activación no vio.** El correo del magic link estaba **muerto en producción**:
`RESEND_API_KEY is not configured`, con la fila de `greenhouse_notifications.email_deliveries` en
`status=failed`. `services/auth-server/deploy.sh` declaraba `RESEND_API_KEY_SECRET_REF` como env var y
concedía su binding IAM con `ensure_secret_accessor_binding`, pero **nunca montaba** `RESEND_API_KEY` con
`--update-secrets`; el consumidor (`sendEmail` → `getResendClient()` síncrono) lee una caché que sólo
puebla el resolvedor asíncrono, que en este runtime nadie precalienta. El `ops-worker` no lo sufre porque
sí lo monta (`services/ops-worker/deploy.sh:1004`). Corregido en `38fbfaeeb`. Tres lecciones que quedan
como invariantes del dominio (`agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`, reglas 13-17):
declarar un `*_SECRET_REF` no monta nada y el binding IAM sólo autoriza a leer algo que nadie lee; una
superficie cuya respuesta es deliberadamente indistinguible —el 202 anti-enumeración— renunció por diseño
a reportar su efecto y **necesita verificación externa**; y un canary de casos negativos y anónimos no
toca el carril autenticado: la activación pasó **9/9 canaries públicos con el correo roto**. El gate real
es `pnpm auth-server:person-auth:canary` (persona real, contrato HTTP contra el host desplegado, `exit 2`
= incompleto), hermano —no reemplazo— de `pnpm auth-server:person-auth:smoke`, que ejercita el SQL.

**Riesgo vigente: un solo servicio para dos ramas.** El `auth-server` es **un único** servicio Cloud Run
compartido por staging y producción. Hoy sirve `develop` con ambos flags ON, pero `main` todavía trae
`AUTH_SERVER_OAUTH_ENABLED=false` y **cero apariciones** de `AUTH_SERVER_PERSON_AUTH_ENABLED`: cualquier
deploy disparado desde `main` antes de promover **apagaría la superficie viva**, sin que nada lo distinga
de un despliegue sano. Mitigación mientras dure: promover antes de cualquier deploy de `main`, o tratar la
promoción como parte de la activación y no como un paso posterior.

**Pendiente conocido, no resuelto.** `POST /auth/passkeys/authenticate/start` es anónimo, sin límite de
tasa, y cada llamada inserta una fila en `greenhouse_auth.passkey_challenges` sin recolección: crecimiento
no acotado disparable por un tercero anónimo. El GC (`pnpm auth:gc`) se construye aparte; hasta que exista
y quede agendado, el endpoint **no** está cubierto por el anti-abuso de `auth_rate_limits`. Entra al
alcance de aseguramiento de U08 (`TASK-1833`).
