# Efeonce Native Authorization Server Decision V1

> **Status:** `Accepted` (decisión del operador 2026-09-03; sin runtime autorizado hasta que cada task hija abra su gate)
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
   Cloud SQL y que las llaves KMS), detrás de un global load balancer con certificado managed y Cloud Armor,
   replicando el Terraform del front door de `efeonce-mcp` (`infra/terraform/front_door.tf`). Cookie propia
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
| Runtime público, TLS, anti-abuso | Cloud Run + global LB + certificado managed + Cloud Armor | patrón vivo en `efeonce-mcp` |
| DNS `auth.efeonce.org` | zona `efeonce.org` en HostGator | registro manual del operador |
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
| 1 | `TASK-1828` | Runtime `auth.efeonce.org`: deployable, front door, KMS, JWKS, session store, excepción EPIC-027 | 3 a 4 días |
| 2 | `TASK-1829` | Superficie OAuth: metadata, CIMD, DCR compat, PKCE, tokens ES256, refresh, revocación, consentimiento | 3 a 4 días |
| 3 | `TASK-1830` | Autenticación de personas externas: passkeys, magic link, TOTP, recuperación, anti-abuso | 5 a 7 días |
| 4 | `TASK-1631` | Binding Account 360, invitaciones, grants, `grants_version`, eligibility reader (re-alcance) | 3 a 4 días |
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
  (delta 2026-08-26 de `TASK-1631`): pertenece al binding, pero el sujeto interno hoy viene de Entra.
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
