# EPIC-044 — Efeonce Identity, Native Authorization Server and MCP Federation

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `ADR nativo aceptado 2026-09-03; TASK-1626 y TASK-1631 en curso (gateway vivo, Slice 0 de identidad cerrado en diseño); siete tasks nuevas TASK-1828–TASK-1834 registradas; excepción EPIC-027 para TASK-1828 aprobada 2026-09-03 (task lista, sin iniciar por instrucción del operador); task ui-ux de login por crear al cerrar el contrato de diseño`
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
| **U01** | [TASK-1828](../../tasks/to-do/TASK-1828-efeonce-auth-server-runtime-deployable.md) | Runtime `auth.efeonce.org`: `services/auth-server/` en Cloud Run publicado como segundo host del front door del gateway (mismo LB, IP y Cloud Armor; decisión 2026-09-03, ≈ USD 15/mes adicionales), llave KMS HSM + JWKS, schema `greenhouse_auth`, session store y cookie propios, excepción EPIC-027. Sin flujos OAuth visibles todavía. | — |
| **U02** | [TASK-1829](../../tasks/to-do/TASK-1829-efeonce-auth-server-oauth-protocol-surface.md) | Superficie OAuth/OIDC: metadata RFC 8414, CIMD, DCR compat, PKCE, access token ES256, refresh rotativo, revocación, introspección, consentimiento persistido. Extrae el broker sister-platform. | U01 |
| **U03** | [TASK-1830](../../tasks/to-do/TASK-1830-efeonce-auth-external-person-authentication.md) | Autenticación de personas externas sin contraseña: passkeys, magic link, TOTP step-up, recuperación por re-invitación, anti-abuso. Sólo primitives y rutas; la UI es de U06. | U01 |
| **U04** | [TASK-1631](../../tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md) | Re-alcance: binding Account 360, environments registry, invitaciones, grants, `grants_version`, eligibility reader, señales. Deja de poseer runtime y gateway. | U02 en contrato; ejecutable en paralelo |
| **U05** | [TASK-1831](../../tasks/to-do/TASK-1831-efeonce-mcp-gateway-multi-issuer-authorization-context.md) | Gateway multi-issuer en `efeonce-mcp`: `AuthContext` de seis campos, resolver por issuer, `allowedIssuers` + clase de autoridad por tool, recheck de `grants_version`, tres tests de regresión. | U02, U04 |
| **U06** | task `ui-ux` por crear | Login, consentimiento y recuperación en `auth.efeonce.org`. Nace al cerrar el contrato de diseño de U03 con wireframe y flow reales (nunca stubs). Bloquea sólo U07. | U03 |
| **U07** | [TASK-1832](../../tasks/to-do/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md) | Matriz de tokens live, canaries Claude/Codex/ChatGPT en loopback y HTTPS hospedado, primera organización allowlisted, allow/deny/expiración/revocación, verificación de producción. | U02–U06 |
| **U08** | [TASK-1833](../../tasks/to-do/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md) | Red-team agéntico cruzado, pentest externo, rotación de llaves, señales de reliability, runbooks, postura Ley 21.719, retención. Gate previo al primer cliente pagando. | U02, U03 |
| **U09** | [TASK-1834](../../tasks/to-do/TASK-1834-greenhouse-customer-login-convergence-native-issuer.md) | Portal Greenhouse agrega el emisor propio como provider OIDC de NextAuth sobre el mismo source link; rollback = retirar provider. Gate propio posterior a U07. | U07 |
| **U10** | [TASK-1813](../../tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md) | Interoperabilidad OAuth Codex/Claude del carril interno Entra (discovery, shim, scopes). Carril paralelo; no construye broker. | — |

Una sola task ejecutable posee cada unidad. `TASK-659` y `TASK-658` se relacionan, no se absorben (ver
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
  hosted de Greenhouse. El emisor propio lo cubre en diseño; su cierre por supersesión o re-alcance como
  consumidor interno se decide con el operador al cerrar U02. No se duplica.
- [TASK-658](../../tasks/to-do/TASK-658-api-platform-resource-authorization-bridge.md): bridge de autorización
  de resources API Platform; consumidor del `AuthContext` y de los grants, no hija.
- [TASK-1804](../../tasks/complete/TASK-1804-greenhouse-skills-mcp-provider.md) y la nota del shim DCR en el
  ADR del gateway: el cliente público compartido renombrado el 2026-09-02; su riesgo loopback se cierra en U02/U05.
- Auditoría [`EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`](../../audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md):
  insumo de U02 y U10.
- Delta 2026-08-26 de `TASK-1631`: `prepare_seo_grounded_queries` y `get_seo_grounded_query_draft` fail-closed
  por capability `growth.ai_visibility.prompt_set.manage`; el grant por persona se resuelve en U04/U05 o en una
  task propia de Growth, y el epic no se cierra sin declararlo.
- Consumidores: EPIC-011 (TASK-1720/1722), EPIC-012, EPIC-022, EPIC-043 (TASK-1824).

## Exit Criteria

- [ ] `auth.efeonce.org` responde metadata RFC 8414 con `issuer` idéntico al origen y `client_id_metadata_document_supported: true`, firmando con una llave KMS HSM cuyo JWKS publica `kid` y rotación probada.
- [ ] Una persona de una organización cliente existente se autentica con passkey y con magic link, consiente un cliente y un scope, y ese consentimiento es revocable por el operador con efecto en menos de cinco minutos.
- [ ] El gateway despacha una tool read-only con token del issuer propio y niega: token externo sobre tool internal-only, token con roles sin scope delegado, grant revocado con token vigente, issuer desconocido.
- [ ] Claude Code, Codex y ChatGPT completan OAuth/PKCE (loopback y HTTPS hospedado donde aplique) contra un cliente real allowlisted, con evidencia redactada de la matriz de tokens.
- [ ] Pentest externo cerrado sin hallazgos críticos abiertos y runbooks de rotación, incidente y revocación masiva publicados.
- [ ] Los writes federados de EPIC-011, EPIC-022 y EPIC-043 tienen grant delegado revocable disponible o una task propia declarada para su grant.
- [ ] El login cliente de Greenhouse tiene el provider OIDC del emisor propio detrás de gate, con rollback probado.
- [ ] `TASK-659` cerrada por supersesión o re-alcanzada, con decisión registrada.

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
