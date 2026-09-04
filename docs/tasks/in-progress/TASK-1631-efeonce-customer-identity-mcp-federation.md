# TASK-1631 — Efeonce Customer Identity and MCP Federation Foundation

## Delta 2026-09-03 — Composición decidida: authorization server PROPIO (EPIC-044, re-alcance)

El operador decidió construir y operar el emisor de Efeonce; no se compra WorkOS ni otro IdP. ADR aceptado:
`docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`. Esta task pasa a `EPIC-044` (U04) y
**re-alcanza sus slices**: conserva el registry de environments, el binding de organización, las invitaciones,
los grants por capability, `grants_version`, el eligibility reader y las cuatro señales (todo el diseño S0.4).
Pierde el runtime y el protocolo del emisor (→ `TASK-1828`, `TASK-1829`), la autenticación de personas
(→ `TASK-1830`), el gateway multi-issuer (→ `TASK-1831`, materializa S0.5), los canaries y la primera cohorte
(→ `TASK-1832`, absorbe S0.1) y la convergencia del login (→ `TASK-1834`, S0.6). El gate de subprocesador
(S0.3) deja de bloquear: con emisor propio no aparece un encargado nuevo; la postura de seguridad se audita en
`TASK-1833`. La task `ui-ux` de login/consentimiento nace al cerrar el contrato de flujo de `TASK-1830`.
El delta 2026-08-26 (grants `growth.ai_visibility.*`) se resuelve en el binding/gateway o en una task propia de
Growth, y el epic no cierra sin declararlo.

## Delta 2026-09-04 — Slice 1 (U04) entregado: schema aplicado, commands, API, resolver del gateway y señales

Ejecutado local-first sobre `develop` (commits `689b56044` y `cf8f15224`, sin push). Migraciones
`20260904104914802_task-1631-external-identity-binding-foundation.sql` y
`20260904110809060_task-1631-invitation-linked-check-one-directional.sql` **aplicadas** en `greenhouse-pg-dev`
(instancia única): `external_identity_environments`, `external_organization_bindings`, `external_capability_grants`,
`external_member_invitations`, `external_identity_audit_log` y `external_access_resolution_log` (append-only por
trigger), índice único parcial sobre `identity_profile_source_links` para subjects `external_idp:%` (un subject activo
→ un solo `identity_profile`), `canonical_source_system()` reconoce `external_idp`, y seed de las 6 capabilities. Sin
backfill, sin grants de clientes reales.

Dominio `src/lib/identity/external-access/**` (sin `server-only`, bundleable por el auth-server): commands
`upsertExternalIdentityEnvironment` · `bindExternalOrganization` · `grantExternalCapability` · `issueExternalInvitation`
· `acceptExternalInvitation` · `revokeExternalAccess` (idempotentes; una tx con audit + outbox; `grants_version` sube en
todo cambio de autoridad) y reader `resolveExternalAccess(environment, subject)` con outcomes
`bound|unbound|revoked|environment_inactive|profile_inactive` y log **sólo de denials** (subject hasheado). API:
`/api/admin/identity/external-access/{environments,eligibility,bindings,bindings/[id],bindings/[id]/grants,
bindings/[id]/invitations,revoke}` (capability dedicada por ruta, sólo `efeonce_admin`) y
`GET /api/platform/ecosystem/identity/binding?environment=&subject=` (lane ecosystem, binding `internal` del gateway,
404 anti-oráculo) — el contrato que consume `TASK-1831` (`grantsVersion` por igualdad, TTL 60 s). Señales
`identity.external_binding.{unbound_dispatch_attempt,revoked_still_dispatching,subject_collision,orphan_grant}` cableadas
en el overview y el registry `identity`. Smoke live `pnpm identity:external-access:smoke` (read-only) y `-- --apply`
(fixture `ZZZ Q2C Smoke Fixture`, environment `smoke-task-1631` hoy `retired`): ciclo completo verificado contra PG
real, gv 1→4; el primer apply atrapó el CHECK bidireccional de `linked_consistent` → forward-fix (segunda migración).

Decisiones tomadas en el slice (vigentes, detalle en el ADR de federación §"Slice 1 binding foundation — applied"):
membership de acceso externo = invitación `linked` bajo binding activo (no se escribe `person_memberships`); grants
per-persona vía `profile_id` en `external_capability_grants` (resuelve el modelo del delta 2026-08-26 sin migración
futura — el grant Growth concreto se emite en TASK-1831/Growth, no acá); revocar desactiva el source link si la persona
no conserva otra membership activa en el environment (así muere también la sesión del auth-server, TASK-1830) y el
resolver responde `revoked` leyendo el link inactivo; `issuer_class` inmutable por environment; elegibilidad estricta
`active_client`; sin feature flag nuevo en Greenhouse (los commands son admin-gated y el uso externo lo gatea el flag del
gateway en TASK-1831). Drift preexistente detectado por el test live de paridad registry↔catálogo (11 capabilities
ajenas sin seed) → task aparte; las 6 de esta task están en sync.

**Estado: `code complete, staging verificado, producción pendiente`** — push de `develop` (`02dc5d987`) coordinado con
TASK-1828; en staging las 4 señales responden por `/api/admin/reliability`, `GET …/external-access/environments` y
`/eligibility` devuelven datos reales y el lane ecosystem responde `401 missing_token` sin consumer. El release a `main`
espera a TASK-1828 (decisión del operador). La baja end-to-end con token vigente y los canaries de cliente son evidencia
de TASK-1831/1832.

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Status real: `Slice 1 (U04) code complete 2026-09-04: schema aditivo APLICADO en PG (2 migraciones), commands/readers/resolver, 6 capabilities, 7 rutas admin + reader ecosystem para el gateway, 4 señales cableadas, smoke live verde (bind → grant → invite → accept → resolve bound → revoke → resolve revoked). Staging verificado 2026-09-04 (develop 02dc5d987: 4 señales en /api/admin/reliability, rutas admin 200 con datos reales, lane ecosystem 401 sin consumer token); producción espera el release a main junto con TASK-1828; canaries y revocación end-to-end viven en TASK-1831/1832`
- Rank: `TBD`
- Domain: `platform|identity|integration|agentic`
- Blocked by: `none para el slice entregado; la verificación operativa exige deploy (release control plane) y la evidencia end-to-end (token vigente denegado tras revocación, canaries Claude/Codex/ChatGPT) depende de TASK-1829/1830/1831/1832 y de la task ui-ux de login`
- Branch: `Greenhouse develop; MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

**Split UI (regla de perfil híbrido):** esta task es la foundation `backend-data`. La superficie visible de login
en `auth.efeonce.org` (pantallas, estados, copy, accesibilidad) se entrega en una **task `ui-ux` dependiente**,
creada al cierre del Slice 0 cuando exista el contrato de diseño/flujo que ese slice produce — con su wireframe y
flow reales, nunca stubs. Esa task UI **corre en paralelo** a los Slices 1-2 y sólo bloquea el Slice 3 (canaries de
cliente) — ver el DAG en `Slice ordering hard rule`; esta task no declara `UI impact` porque no implementa
superficie visible por sí misma.

## Summary

Habilitar una identidad B2B de Efeonce para que organizaciones cliente existentes se autentiquen en clientes MCP
sin requerir una cuenta Entra de Efeonce. Account 360 conserva la organización comercial canónica; la identidad
externa sólo se enlaza explícitamente y cada provider (Globe primero; Wave, Kortex y capacidades Greenhouse
después) conserva su policy, entitlements y datos. El primer corte es por invitación y allowlist de clientes
existentes, nunca por signup público o dominio de correo. La superficie de autenticación tiene despliegue, cookies
y sesiones independientes de Greenhouse, pero converge en la misma persona, organización y membresía canónicas; no
crea una identidad o contraseña cliente paralela permanente.

## Why This Task Exists

El gateway MCP y el reader interno de Globe ya funcionan con un canary Entra, pero ese cliente recibe los scopes
delegados juntos y no representa un cliente externo ni prueba revocación por organización/capacidad. Sin una
identidad B2B y un binding canónico, abrir la misma URL a clientes permitiría derivar tenancy desde claims
insuficientes o duplicar Account 360 en el gateway. Además, el gateway ya expone un write interno gobernado
(`globe.credits.funding.ensure`): introducir un segundo issuer sin autoridad calificada por issuer dejaría que un
token externo con el mismo string de scope pareciera equivalente a uno interno.

## Goal

- Permitir OAuth 2.1 + PKCE para clientes MCP externos mediante `auth.efeonce.org`, sin cambiar el endpoint canónico
  `https://mcp.efeonce.org/mcp`.
- Vincular cada organización externa a la organización ya creada en `greenhouse_core.organizations`, con audit y
  revocación, sin crear una segunda entidad comercial.
- Hacer que gateway y provider denieguen por defecto y revaliden organización, membership y capability antes de
  exponer la primera herramienta Globe read-only a un cliente.
- Iniciar la cohorte externa sólo desde organizaciones cliente ya existentes en Account 360: selección explícita,
  administrador designado, invitación auditable y grant read-only antes de OAuth. Ningún email o dominio crea
  membership, organización o acceso.
- Entregar el servicio de autenticación propio en `auth.efeonce.org`, aislado del gateway y del deployable de
  Greenhouse. Slice 0 debe comparar tres composiciones: WorkOS/AuthKit + Connect, el broker OAuth de Greenhouse
  extraído/operado como runtime independiente reutilizando identidad/Account 360, o el híbrido native + WorkOS para
  federación enterprise. La superficie visible de login se entrega en la task `ui-ux` dependiente declarada arriba.
- Mantener sesiones y audiencias separadas por aplicación, enlazadas a un único `identity_profile`; definir en
  esta task la transición para que el login externo de Greenhouse pueda delegar posteriormente en el mismo plano
  de identidad aceptado, sin hacer que Greenhouse sea el issuer OAuth del MCP.
- Diseñar el binding organización→capability **provider-neutral**: Globe es el primer provider, no el modelo. Un
  provider nuevo (Wave, cotización, capacidades Greenhouse) reutiliza el mismo binding y grant sin migración.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/creative-studio/README.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Account 360 y `greenhouse_core.organizations` son el único ancla comercial/customer; un ID WorkOS u otro IDP es
  un binding externo, no un tenant paralelo.
- `auth.efeonce.org` está aislado como runtime y sesión, no como identidad: una persona existente se enlaza al
  mismo `greenhouse_core.identity_profiles` y membresía canónica. Greenhouse, auth y MCP no comparten cookies,
  secretos de sesión ni tokens entre audiencias.
- La coexistencia inicial entre el login cliente actual de Greenhouse y WorkOS/IDP para MCP es transitoria. Esta
  task debe entregar el contrato de convergencia, account linking, recovery y revocación; el cutover del login de
  Greenhouse requiere su propio gate de rollout.
- La primera cohorte usa exclusivamente clientes existentes y allowlisted de Account 360. No hay signup público,
  import automático masivo ni admisión basada en el dominio de correo.
- El gateway valida autenticación/transport y delega. Cada provider conserva su policy: Globe conserva workspace,
  creative policy, credits y entitlement de la capacidad; ningún claim libre de organización/workspace autoriza
  una tool.
- **La autoridad es calificada por issuer, nunca por el string del scope.** Un scope emitido por el issuer externo
  no equivale al mismo string emitido por Entra. Toda tool internal-only —hoy el write
  `globe.credits.funding.ensure` y cualquier write futuro— queda ligada explícitamente al issuer interno; un token
  del issuer externo que traiga ese string se deniega en dispatch, fail-closed, además de las defensas downstream
  (token-exchange Entra→Greenhouse por `(microsoft_tenant_id, microsoft_oid)`).
- **CIMD es el mecanismo primario de registro; DCR queda como compatibilidad hacia atrás.** Verificado contra la
  spec MCP vigente (revalidado 2026-09-02 sobre la revisión Current `2026-07-28`): *"Dynamic Client Registration is
  deprecated. New implementations should use Client ID Metadata Documents instead"*, con orden normativo
  pre-registro → **CIMD** (`client_id_metadata_document_supported`) → DCR (`registration_endpoint`) → entrada
  manual, y `SHOULD` para CIMD contra `MAY` para DCR. El proveedor elegido debe soportar **ambos**: ChatGPT admite
  DCR y CIMD; Claude admite DCR y además permite configurar client id/secret a mano. Un proveedor con excelente DCR
  y sin CIMD **no cumple** el requisito primario.
  **Delta 2026-09-02 — DCR pasó de "preferencia en contra" a `Deprecated` formal, y esta task es la ÚNICA dueña de
  cerrarlo.** El [registro de deprecados](https://modelcontextprotocol.io/specification/2026-07-28/deprecated) lista
  DCR como `Deprecated` desde `2026-07-28` ([PR #2858](https://github.com/modelcontextprotocol/modelcontextprotocol/pull/2858)),
  migration path CIMD, **earliest removal = primera revisión publicada en o después de 2027-07-28**. La evaluación
  de impacto sobre `mcp.efeonce.org` (gateway ADR, §"Delta 2026-09-02") concluye que **CIMD no es implementable en
  la capa del shim DCR**: CIMD es una capacidad del *authorization server*, el AS ahí es Entra —que no soporta ni
  CIMD ni RFC 7591— y el gateway espeja `authorize`/`token` en vez de proxearlos. Soportar CIMD exige **emitir los
  tokens**, o sea el broker que esta task está eligiendo. Consecuencia dura para el Slice 0: **el soporte CIMD del
  proveedor deja de ser un criterio de comparación "deseable" y pasa a ser el mecanismo de cumplimiento de la spec
  para todo el acceso MCP de Efeonce, interno incluido** — el shim sostiene hoy a los clientes internos, pero su
  horizonte es de cliente, no de calendario. No se abre task paralela de migración del shim.
- **Ni DCR ni CIMD autentican a la persona ni autorizan organización o capabilities; sólo identifican una
  aplicación.** Son mecanismos distintos y no se conflacionan: en DCR (RFC 7591) el `client_id` lo **emite el
  authorization server**; en CIMD el `client_id` es una **URL que el propio cliente controla** y desde la que se
  resuelve su metadata. En los dos casos, para un cliente público con PKCE **no hay client secret ni prueba de
  posesión**, así que el identificador es observable y presentable por cualquiera, nunca una credencial. La
  política de emisión de scopes vive en la configuración del plano de identidad y en los grants, no en el registro
  del client.
- **El binding de persona se resuelve por `(issuer, subject)`, JAMÁS por `client_id`.** Es el corolario directo de
  la regla anterior: el `client_id` de un cliente público no prueba posesión de nada, así que atarle autoridad es
  confiar en un dato que cualquiera puede presentar. El contexto de autorización debe conservar `issuer`,
  `subject`, `clientId`, `audience`, `delegatedScopes` y `roles` como campos **separados**; ninguno se deriva del
  otro por fallback.
- **`delegatedScopes` y `roles` son CLASES DE AUTORIDAD distintas y no se fusionan.** Los scopes delegados
  (`scp`/`scope`) representan consentimiento en contexto de usuario; los app roles (`roles`) representan asignación
  administrativa. Hoy el verificador los une en un solo array, así que **un app role con el mismo string que un
  scope satisface la comprobación sin que nadie haya consentido ese scope** — y eso es cierto **dentro de un mismo
  issuer**, no sólo entre dos. Cada tool declara qué clase de autoridad acepta.
- Entra sigue siendo exclusivamente el canary interno durante la transición. No se deshabilita
  `globe.producer.fleet.list` ni se usa ese cliente como evidencia de acceso cliente.
- La configuración de WorkOS staging y discovery MCP no constituye acceso cliente. No crear producción, DNS,
  secretos, bindings ni desplegar la ruta pública de login mientras el ADR propuesto no tenga aceptación explícita.
- El broker existente de `src/lib/sister-platforms/oauth-broker.ts` es una base reutilizable, no evidencia de que
  exista ya un authorization server MCP público. Antes de elegir la ruta native se deben cerrar metadata de OAuth,
  CIMD/DCR, callbacks HTTPS para clientes hospedados, consentimiento/grants y el contrato de verificación de sus
  tokens opacos. Nunca compartir cookie o `NEXTAUTH_SECRET` ni hacer que un release de Greenhouse sea el rollback del
  OAuth externo.

## Normative Docs

- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/in-progress/TASK-1473-globe-contract-packaging-parity-certification.md`

## Dependencies & Impact

### Depends on

- La decisión propuesta y aprobación del proveedor/plan para identidad cliente.
- `TASK-1626` para el gateway, protected-resource metadata, runtime y canary interno existente.
- `TASK-1473` para el contrato Globe/provider y su revalidación de policy.
- La organización comercial existente de Account 360 antes de cualquier binding externo.

### Blocks / Impacts

- Acceso MCP de organizaciones cliente a Globe y futuras capacidades de Efeonce (Wave, Kortex, cotización,
  capacidades Greenhouse: todas heredan el mismo binding/grant provider-neutral).
- Onboarding B2B, revocación y auditoría por organización/capacidad.
- Compatibilidad verificada de clientes Claude, Codex y ChatGPT.
- La task `ui-ux` dependiente de la superficie de login `auth.efeonce.org` (nace al cierre del Slice 0).
- Growth SEO/AEO: `prepare_seo_grounded_queries` y `get_seo_grounded_query_draft` están fail-closed
  (`aeo_forbidden`) esperando grants por persona. **Declarado 2026-09-04:** el modelo de grant per-persona ya existe
  (`external_capability_grants.profile_id`); el grant concreto `growth.ai_visibility.prompt_set.manage` para sujetos
  internos (Entra) se emite cuando TASK-1831 registre el issuer interno como environment `internal` y ligue la
  organización propia de Efeonce, o en una task propia de Growth — no queda en silencio.

### Files owned

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/tasks/in-progress/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `../efeonce-mcp/**`
- `src/lib/sister-platforms/**` (broker/allowlist de redirect URIs y su primitive canónica; ya existente)
- `src/lib/identity/external-access/**` · `src/app/api/admin/identity/external-access/**` ·
  `src/app/api/platform/ecosystem/identity/**` · `src/lib/api-platform/resources/ecosystem-identity-binding.ts` ·
  `src/lib/reliability/queries/external-identity-binding-signals.ts` · `scripts/identity/external-access-smoke.ts` ·
  `migrations/20260904104914802_*.sql` + `migrations/20260904110809060_*.sql` (fijados en el Slice 1, 2026-09-04)
- contratos/provider policy de `../efeonce-globe/**` sólo para revalidación, sin mover ownership de Globe

## Current Repo State

### Already exists

- `greenhouse_core.organizations` y Account Complete 360 modelan la organización y su graph comercial.
- Los primitives de identidad que el Slice 0 debe inventariar **existen y están verificados** (2026-08-02):
  `greenhouse_core.identity_profiles`, `greenhouse_core.client_users`,
  `greenhouse_core.identity_profile_source_links` y `greenhouse_serving.session_360`.
- `https://mcp.efeonce.org/mcp` está live: DNS propagado, certificado `ACTIVE`, health/metadata `200`, `401` con
  challenge sin token, canary Entra PKCE y `globe.producer.fleet.list` por el hostname canónico. Cloud Armor
  limita ~600 req/min por IP; la revisión activa restringe host/origin y `maxScale=5` (TASK-1626 §Estado de
  rollout 2026-08-01).
- El verificador de tokens del gateway es **single-issuer**: `../efeonce-mcp/src/config.ts` construye un único
  `oauth.issuer` desde `OAUTH_ISSUER` y `src/auth/token-verifier.ts` valida issuer/audience/exp/sub contra ese
  único JWKS; `authorization_servers` publica exactamente un issuer.
- El gateway **declara tres scopes**, no dos: base `efeonce.mcp.read`, reader `efeonce.mcp.globe.read` y el write
  interno `efeonce.mcp.globe.credits.funding.ensure` (gateado por `globeCreditFunding.enabled`, sólo aparece en
  `scopes_supported` con el flag ON). El write ejecuta token-exchange Entra→Greenhouse mapeado por
  `(microsoft_tenant_id, microsoft_oid)` y llama el endpoint canónico Greenhouse; su canary interno real pasó el
  2026-08-01 con resultado terminal y sin segundo delta económico. **Lo verificado sobre la co-emisión de Entra es
  únicamente base + reader** (TASK-1626 §Estado de rollout: "recibe base + reader … incluso cuando solicita sólo
  el base"); que el mismo cliente reciba además el scope de write **no está verificado** y su consentimiento/asignación
  es un flujo separado — medirlo contra un token live es entregable del Slice 0, no una cautela redaccional.
- El verificador **descarta el `subject`**: `AuthInfo` sale como `{ token, clientId, scopes, expiresAt }` y
  `clientId = azp ?? sub` (`src/auth/token-verifier.ts:34`). Con `azp` presente el `sub` no llega al contexto de
  autorización; sin `azp` el `clientId` **ES** el `sub`, o sea los dos ejes quedan conflacionados. Hoy el defecto es
  invisible porque `clientId` no tiene ningún consumer en el gateway y el write de fondeo reenvía el **token crudo**
  al exchange (Greenhouse hace el mapeo por su cuenta), así que nada lo ejercita.
- El verificador además **fusiona `roles` dentro de `scopes`** (`scp` ∪ `scope` ∪ `roles`). Con un solo issuer es
  una conveniencia para app roles de Entra; con dos issuers, cualquier claim `roles` del issuer externo se convierte
  en un scope string y amplía la superficie del problema de equivalencia por string.
- Globe ya hace policy downstream sobre su workspace y capability para el reader habilitado.

### Gap

- Existe una configuración WorkOS de staging para discovery MCP; no existe un issuer B2B activo para clientes,
  binding canónico de organización externa a Account 360, servicio propio de login ni una prueba real
  base-only/allow/revoke por capacidad.
- Greenhouse ya tiene NextAuth y un broker OAuth sister-platform con PKCE, allowlists de redirect, clientes
  públicos/confidenciales, tokens opacos hasheados, expiración/revocación, audit y userinfo. Sigue acoplado al
  deployable Greenhouse y le faltan metadata MCP pública, CIMD/DCR, callbacks HTTPS hospedados, consentimiento/grants
  de cliente y un contrato de verificación compatible con el gateway; por eso se registra como foundation, no como
  autorización MCP externa lista.
- El gateway no soporta dual-issuer: agregar el issuer externo requiere validación gateada por issuer, con
  autoridad calificada por issuer para cada tool (hoy la comprobación de scopes es por string, suficiente con un
  solo issuer, insuficiente con dos).
- El contexto de autorización **no puede resolver un binding de persona hoy**: no propaga `issuer` ni `subject`
  como campos propios. Es precondición dura de esta task, no un refactor cosmético — sin `(issuer, subject)` el
  binding sólo podría apoyarse en `clientId`, que bajo PKCE público es auto-declarado.
- El cliente Entra interno actual co-emite base + reader y por ello no demuestra denial por persona ni por
  cliente; la prueba base-only real sigue pendiente desde TASK-1626. Esa medición es también el insumo que
  determina cómo se diseña el test de calificación por issuer.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse para Account 360/identity binding; ../efeonce-mcp para OAuth validation y dispatch; ../efeonce-globe para provider policy`
- Future candidate home: `remain-shared`
- Boundary: `binding server-side identity_profile/Account 360 ↔ external subject/organization, entitlement resolver provider-neutral y provider policy revalidation; runtimes y sesiones permanecen independientes`
- Server/browser split: `la UI browser de auth está aislada en auth.efeonce.org y se entrega en la task ui-ux dependiente; sólo su adapter server accede a las APIs del proveedor/composición seleccionada. Tokens, binding stores, admin APIs del IDP, provider clients y secretos nunca llegan a código browser`
- Build impact: `deployment de auth UI/session independiente del gateway MCP; SDK/configuración del IDP queda detrás de su adapter server`
- Extraction blocker: `authentication/session y el binding Account 360 son contratos cross-runtime; la implementación comienza sólo después de topología aprobada, contrato UI y plan de identidad aceptado`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_core.organizations, primitives canónicos de identidad/membership, configuración auth del gateway y policy de cada provider`
- Consumidores afectados: `MCP gateway, provider Globe, clientes MCP de organizaciones y onboarding auditado por operador`
- Runtime target: `staging|production|external`

### Contract surface

- Contrato existente a respetar: `Account Complete 360, MCP protected-resource contract, contrato del gateway TASK-1626 y provider contracts de Globe`
- Contrato nuevo o modificado: `binding explícito de organización de identidad externa, validación issuer/client, revalidación de entitlement por provider y revocación auditable`
- Backward compatibility: `gated; el issuer interno Entra y el fleet reader permanecen sin cambios hasta que pasen los canaries externos`
- Full API parity: `bindings y grants operados vía primitives canónicos server-side; MCP es un consumer y nunca escribe tablas o policy ad hoc`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.organizations más la superficie canónica de identidad/membership seleccionada en discovery (identity_profiles, client_users, identity_profile_source_links, session_360 verificadas como existentes); ninguna tabla duplicada de organización cliente`
- Capabilities: cada command de operador nace con **capability dedicada y granular** (nunca `identity.admin` como
  cajón de sastre) — mínimo binding de organización, emisión de invitación y revocación como capabilities
  separadas, porque revocar y otorgar no son la misma autoridad. Los nombres exactos se fijan en el Slice 0. Regla
  dura del repo: toda capability nueva se seedea en `capabilities_registry` **y** en el catálogo TS **y** se
  granteea a ≥1 rol real de `src/config/role-codes.ts` **en el mismo PR** — el guard
  `capability-grant-coverage.test.ts` rompe el build si falta el grant.
- Reliability signals (nombres canónicos, `steady = 0`, registrados en `src/lib/reliability/queries/` y visibles en
  `/admin/operations`): `identity.external_binding.unbound_dispatch_attempt` (token válido sin binding intentando
  dispatch), `identity.external_binding.revoked_still_dispatching` (revocación que no propagó),
  `identity.external_binding.subject_collision` (un subject externo resolviendo a más de un `identity_profile`, o
  una persona con subjects divergentes entre clientes — es la señal que detecta en vivo el problema de `sub`
  pairwise) y `identity.external_binding.orphan_grant` (grant activo sobre un binding inexistente o desactivado).
- Invariantes que no se pueden romper:
  - `La organización de Account 360 permanece como source of truth comercial/customer.`
  - `Una persona cliente existente permanece como un único identity_profile canónico; un subject de IDP externo es un source link, no una persona paralela ni una autoridad de credenciales dentro de Greenhouse.`
  - `Greenhouse, auth.efeonce.org y MCP mantienen cookies, secretos de sesión y audiencias separadas; la convergencia de identidad nunca significa compartir sesión de browser.`
  - `El journey objetivo usa una única relación de autenticación externa para MCP y el Greenhouse customer-facing, con sesiones de aplicación separadas; la coexistencia inicial documenta su convergencia y rollback.`
  - `Sólo un cliente existente de Account 360, allowlisted explícitamente por un command auditado de operador, puede recibir un binding de identidad externa o una invitación.`
  - `Un email, dominio de correo u organización WorkOS sin ese binding nunca crea membership de cliente, grant de capability ni derecho de workspace en un provider.`
  - `Una organización de identidad externa sólo es usable a través de un binding explícito y auditado hacia una organización canónica.`
  - `El binding y el grant son provider-neutral: relacionan organización canónica ↔ capability namespaceada; no llevan columnas específicas de Globe ni de ningún provider.`
  - `Los scopes del gateway no reemplazan el enforcement de workspace/capability/credits/rights de cada provider.`
  - `El binding de persona se resuelve por (issuer, subject). Nunca por client_id: un cliente público con PKCE no tiene prueba de posesión, así que su identificador es observable y presentable por cualquiera.`
  - `El contexto de autorización conserva issuer, subject, clientId, audience, delegatedScopes y roles como campos separados; ningún campo se deriva de otro por fallback.`
  - `delegatedScopes (scp/scope) y roles son clases de autoridad distintas y nunca se fusionan en un array único; cada tool declara qué clase acepta.`
  - `El subject usado como clave de binding debe ser estable para la misma persona a través de clientes y registros distintos; se confirma leyendo subject_types_supported del proveedor aprobado antes de fijarlo como clave.`
  - `El proveedor de identidad debe soportar CIMD como mecanismo primario de registro y DCR como compatibilidad; DCR-only no cumple la spec MCP vigente.`
  - `La autoridad de una tool se resuelve por (issuer, scope, binding, grant); un scope string del issuer externo jamás satisface una tool ligada al issuer interno.`
  - `La revocación falla cerrada tanto en el dispatch del gateway como en la policy del provider.`
- Tenant/space boundary: `derivado server-side desde issuer/subject/client verificados y el binding explícito de Account 360; cada provider resuelve independientemente su workspace autorizado`
- Idempotency/concurrency: `commands de binding/grant/revocación con idempotencia y semántica de audit atómica; validación de token y dispatch de lectura stateless`
- Audit/outbox/history: `audit append-only de binding/grant/revocación y postura de invalidación/señales elegida junto al primitive canónico de identidad`

### Migration, backfill and rollout

- Migration posture: `additive tras schema discovery; sin backfill automático ni grant de clientes`
- Default state: `issuer externo y toda capability externa de provider OFF; canary interno Entra ON`
- Backfill plan: `inventario dry-run de organizaciones cliente existentes solamente; sin enrolamiento masivo. Un allowlist de operador crea cada primer binding, administrador designado e invitación después de revisión`
- Rollback path: `deshabilitar flag de issuer/provider externo, revocar binding/grant, conservar audit append-only; el canary Entra y el fleet reader de Globe siguen disponibles`
- External coordination: `aprobación explícita del operador, tenant/plan del IDP, DNS/TLS de auth.efeonce.org, secretos, registros de clients, configuración de provider y consentimiento del cliente por etapas`

### Security and access

- Auth/access gate: `OAuth 2.1 authorization code + PKCE, issuer/audience/client verificados, binding explícito de Account 360 y entitlement downstream del provider`
- Sensitive data posture: `sólo metadata de identidad; ningún bearer token, authorization code, client secret, raw error ni prompt de cliente en logs`
- Error contract: `códigos canónicos de autorización y denial de provider; errores sanitizados con domain capture`
- Abuse/rate-limit posture: `rate limit del gateway por client/principal (Cloud Armor edge ya limita ~600 req/min/IP), validación PKCE/state, defensa de replay y circuit breaker de provider`

### Runtime evidence

- Local checks: `tests de contrato/auth-negative del gateway, tests del primitive de binding, tests de policy del provider y gates de task/docs`
- DB/runtime checks: `dry-run de migración, readback auditado de binding/grant/revoke y aserción no-unbound-dispatch`
- Integration checks: `metadata OAuth/PKCE y flujo de registro con Claude, Codex y ChatGPT; canaries allow/base-only/revoke; canary de denial issuer-calificado (token externo con scope string interno)`
- Reliability signals/logs: las cuatro signals canónicas declaradas arriba (`unbound_dispatch_attempt`,
  `revoked_still_dispatching`, `subject_collision`, `orphan_grant`) más mismatch redactado de issuer/client/binding,
  denial de entitlement y señales de dispatch por provider
- Production verification sequence: `una organización allowlisted, un reader Globe read-only, después base-only deny y revoke con rollback documentado antes de ampliar onboarding`

### Acceptance criteria additions

- [x] Account 360, binding y provider sources of truth quedan nombrados y no existe un segundo modelo de
      organización cliente. _Evidencia 2026-09-04: `external_organization_bindings.organization_id` FK a
      `greenhouse_core.organizations`; elegibilidad sólo sobre organizaciones existentes; sin columnas de provider._
- [x] Existing-person linking, colisión/revisión manual, recovery, desactivación y revocación mapean un subject
      externo a un único `identity_profile` canónico; el matching sólo-por-email se rechaza. _Evidencia:
      `acceptExternalInvitation` (profile_id → link (environment, subject) → email exacto único bajo invitación
      auditada; >1 ⇒ `identity_collision`), índice único parcial de subjects, `revokeExternalAccess`, `reissue`;
      tests `commands.test.ts` + smoke live. El email nunca resuelve un token: el resolver sólo usa (environment,
      subject)._
- [ ] La coexistencia del login cliente actual de Greenhouse y la delegación futura al plano de identidad externo
      aceptado quedan documentadas, con cookies/audiencias separadas y cutover gateado por separado.
- [ ] Gateway y provider fallan cerrado de forma independiente ante binding o capability ausente/revocada.
      _Lado Greenhouse listo (resolver deniega y registra); el dispatch del gateway es TASK-1831._
- [ ] El contexto de autorización expone `issuer`, `subject`, `clientId`, `audience`, `delegatedScopes` y `roles`
      como campos separados, y el binding de persona se resuelve por `(issuer, subject)`; ningún camino lo resuelve
      por `client_id` ni deriva un campo de otro por fallback.
- [ ] Un token del issuer externo que porte un scope string internal-only (p.ej. el write de fondeo) se deniega en
      dispatch sin llegar al provider.
- [ ] Un token que porte `roles: ["efeonce.mcp.globe.credits.funding.ensure"]` **sin** el scope delegado
      correspondiente se deniega en dispatch — verificado también dentro del issuer interno, no sólo entre issuers.
- [ ] La matriz de tokens live está ejecutada y registrada redactada (`iss`, `aud`, `sub`, `azp`/`client_id`,
      `scp`, `scope`, `roles`, claim organizacional, `exp`) para cada cliente objetivo, y el diseño de calificación
      por issuer se apoya en esa medición, no en el supuesto.
- [ ] La estabilidad del `subject` está resuelta contra el proveedor aprobado: `subject_types_supported` leído y
      registrado; si resultara `pairwise`, la clave de binding usa un identificador estable verificado del
      proveedor en vez de `sub`.
- [ ] El proveedor aprobado soporta **CIMD** (mecanismo primario de la spec MCP vigente) y DCR como
      compatibilidad, verificado contra su discovery y su documentación.
- [x] Migración, audit, revocación y rollback quedan verificados antes de acceso de clientes. _Evidencia: 2
      migraciones aplicadas con DO checks; audit append-only; smoke `-- --apply` revocó member y binding (gv 3→4) y
      retiró el environment; rollback = `revokeExternalAccess` + environment `suspended|retired`._
- [ ] Canaries OAuth reales de Claude, Codex y ChatGPT cubren allow, base-only deny y revocación.
- [ ] Ningún token, code, secret o respuesta cruda de provider aparece en logs o respuestas de error.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->

## Execution Plan (intake 2026-08-05)

### Auditoría de supuestos (re-verificados contra runtime 2026-08-05)

- **Verificado exacto:** `../efeonce-mcp/src/auth/token-verifier.ts` sigue single-issuer con
  `clientId = azp ?? sub` (línea 34), `AuthInfo = { token, clientId, scopes, expiresAt }` (el `sub` se descarta)
  y fusión `scp ∪ scope ∪ roles` en `scopes` (líneas 11-18). `src/config.ts` construye un único `oauth.issuer`
  desde `OAUTH_ISSUER` y declara los tres scopes (base, reader, write de fondeo gateado por
  `globeCreditFunding.enabled`). La spec no tiene drift respecto del runtime.
- **Verificado:** el broker sister-platform existe con la superficie declarada
  (`src/lib/sister-platforms/oauth-broker.ts` + policy, redirect allowlists, TTLs, workspace bindings, token
  exchange y sus tests).
- **Bloqueo vigente:** el ADR `EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` sigue en `Proposed`;
  no hay aceptación de composición, plan comercial ni revisión de privacidad cerrada. La prueba base-only de
  TASK-1626 sigue pendiente (su §Estado de rollout 2026-08-01 lo declara).
- **Consecuencia:** los Slices 1-3 permanecen bloqueados. El único trabajo ejecutable ahora es el Slice 0
  (material de decisión + contratos + mediciones), que por definición no provisiona nada externo.

### Plan de ejecución del Slice 0 (orden interno)

1. **S0.1 — Matriz de tokens live + prueba base-only** (cierra el pendiente de TASK-1626): capturar redactado
   `iss`, `aud`, `sub`, `azp`/`client_id`, `scp`, `scope`, `roles`, claim organizacional y `exp` por cliente
   objetivo, cubriendo redirect loopback y HTTPS hospedado donde el cliente lo permita.
2. **S0.2 — Estimación de costo operativo del broker native/hybrid** — **HECHO 2026-08-05.** Comparación
   costeada registrada en el ADR §`Slice 0 measurement — build vs buy vs hybrid (2026-08-05)`: native =
   7–10.5 semanas senior + operación permanente (medido contra el código real: el broker no tiene capa propia
   de autenticación de personas — depende de la sesión NextAuth del portal); WorkOS = USD 99/mes planos con
   curva SSO USD 125/conexión/mes y trigger de revisita a ≥5 conexiones enterprise; exit cerrado por diseño
   (subjects = source links re-enlazables, sin migración de credenciales). Recomendación del Slice 0: WorkOS
   con binding provider-neutral + contrato de salida — **pendiente de aprobación del operador**. Checklist
   pre-firma bloqueante: CIMD en discovery live de WorkOS, `subject_types_supported: public` en el tenant
   real, DPA + lista de subprocesadores vigente, **y términos del free tier (límites MAU, branding, CIMD/DCR
   igual que el plan pago)**.

   **Delta 2026-08-05 — recomendación ajustada y APROBADA por el operador (staging de gasto cero):** WorkOS
   **sin dominio propio y sin plan pago**, por etapas de demanda: (1) hoy USD 0 y nada provisionado — solo
   diseño; (2) primer cliente interesado → free tier con dominio default de WorkOS + AuthKit hosteado (logo/
   colores Efeonce, "Powered by WorkOS" aceptado para cohorte invitada); (3) USD 99/mes por `auth.efeonce.org`
   sólo cuando clientes pagando lo justifiquen, idealmente trasladado a contrato. Requisito duro derivado: el
   binding NUNCA se llavea por el issuer string crudo — referencia un registry de environment estable, así el
   cutover de dominio es un UPDATE auditado + re-login forzado, no un re-onboarding. Registrado en el ADR
   §`Slice 0 measurement`. El trigger de revisita native/hybrid (≥5 conexiones SSO enterprise) se mantiene.
3. **S0.3 — Revisión de privacidad/subprocesador** — **HECHO 2026-08-05** (memo, no cierre legal). Entregable:
   `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md` (roles controller/processor, datos
   enviados vs retenidos con minimización, checklist DPA/subprocesadores/región/retención/ARCO/notificación
   contractual por país, comparación de riesgo por ruta). La firma del DPA y la validación con abogado
   habilitado quedan con el operador; el gate sigue ABIERTO hasta ese cierre — pero al diferir la provisión
   (staging de gasto cero) este gate sólo bloquea la etapa (2), no el diseño.
4. **S0.4 — Schema aditivo de binding provider-neutral** — **HECHO 2026-08-05** (propuesta, sin migración
   aplicada). Registrado en ADR §`Slice 0 binding design proposal`. Hallazgo: el binding de PERSONA no
   necesita tabla nueva — `identity_profile_source_links` ya modela la relación; la llave durable es
   `(environment, subject)` vía registry `external_identity_environments` (absorbe rotación de issuer). Nuevas
   tablas propuestas: `external_organization_bindings`, `external_capability_grants`,
   `external_member_invitations`; commands `bindExternalOrganization`/`issueExternalInvitation`/
   `revokeExternalAccess` con capability dedicada cada uno y `grants_version` para invalidación fail-closed.
5. **S0.5 — Contratos de gateway** — **HECHO 2026-08-05** (spec, sin código). Registrado en ADR §`Slice 0
   gateway authorization-context contract`: `AuthContext` con los 6 campos separados sin fallback, resolver
   por issuer (JWKS/audience/policy propios), tools con `allowedIssuers` + clase de autoridad, y los 3 tests
   de regresión obligatorios antes del segundo issuer (denial por issuer, denial roles-sin-scope intra-issuer,
   denial por `grants_version` con token vigente).
6. **S0.6 — Contrato de diseño/flujo/deployment de `auth.efeonce.org`** + task `ui-ux` dependiente + contrato
   de convergencia del login Greenhouse. **Delta 2026-08-05:** con AuthKit hosteado (etapa 2 del staging), la
   superficie custom de login desaparece del primer corte — la task `ui-ux` dependiente se reduce a branding
   config + superficie de invitación, y su creación formal se difiere al momento en que la etapa (2) se
   desbloquee (crearla hoy produciría wireframes stub, prohibido). El contrato de convergencia del login
   customer-facing de Greenhouse quedó **HECHO 2026-08-05** en ADR §`Slice 0 convergence contract`: el plano
   externo entra como provider OIDC adicional de NextAuth, resuelve el MISMO source link `(environment,
   subject)`, cada app conserva su sesión/audiencia, y el rollback del cutover es retirar el provider sin
   tocar bindings.
7. **S0.7 — Paquete de decisión**: la composición y el staging de gasto cero quedaron aprobados por el
   operador el 2026-08-05 (registrado en el ADR). Para abrir la etapa (2)/(3) y los Slices 1-3 restan: cierre
   del gate legal (DPA + abogado), checklist pre-provisión (CIMD/subject/free-tier) y aceptación formal del
   ADR completo con el binding design.

### Checkpoint humano (P0)

El intake, la auditoría y este plan se registran antes de ejecutar S0.1-S0.7. La aprobación del operador sobre
este plan habilita el Slice 0; la aprobación del paquete de decisión (S0.7) habilita los Slices 1-3.

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Decision, cohort policy and schema discovery

- Obtener aceptación explícita del ADR y de la composición seleccionada antes de provisionar nada externo.
- **Revisión de privacidad y subprocesador antes de cualquier provisión.** Este es el primer flujo que rutea datos
  personales de personas de organizaciones **cliente** a un procesador externo nuevo. Invocar
  `legal-privacy-ip-operator` y resolver: qué datos personales se envían y cuáles no, DPA/acuerdo de
  encargado firmado, lista de subprocesadores, región de almacenamiento y tratamiento, retención, derechos ARCO/
  supresión, y notificación a clientes si un contrato vigente lo exige (marco CL + CO/MX/PE según cartera). Sin
  esta revisión cerrada no se provisiona el tenant productivo, aunque el plan comercial ya esté aprobado — son
  dos gates distintos, no uno.
- **Comparar y presentar costo/operación antes de pedir aprobación.** El benchmark ejecutado 2026-08-02 sobre once
  proveedores con precios de páginas oficiales dejó **WorkOS como candidato técnico a USD 99/mes planos**
  en los tres escenarios (1 org/5 usuarios, 5 orgs/25 usuarios, 20 orgs/100 usuarios), porque su costo lo determina
  el **custom domain**, no el volumen — las organizaciones B2B no tienen línea de cobro ni tope. Runner-up:
  **Stytch B2B** (USD 0 de base, orgs ilimitadas, pero precio de custom domain **no público**). Descartados por no
  soportar DCR: **Logto** (en backlog) y **FusionAuth** (issue abierto desde 2021). El Slice 0 sólo debe cerrar
  dos incógnitas antes de firmar: la **curva de SSO/SAML de WorkOS a USD 125 por conexión/mes**, que es el costo
  que escala cuando los clientes pidan federación propia, y la portabilidad del binding si algún día se cambia de
  proveedor. Ese benchmark no mide el costo operativo del broker Greenhouse extraído: Slice 0 debe estimar
  hardening, MFA/recovery, metadata/CIMD/DCR, callbacks HTTPS, verificación de tokens, observabilidad, soporte y
  operación independiente. Debe comparar WorkOS, native y hybrid en costo total, seguridad, compatibilidad, privacidad,
  migración y salida; no aprobar WorkOS sólo por su precio publicado.
- Inventariar la organización Account 360, persona/membership canónica y contratos de workspace de Globe; proponer
  el schema aditivo mínimo de binding, command/reader/audit y contrato de invalidación — provider-neutral.
- Inventariar los contratos actuales de Greenhouse NextAuth, `client_users`, `identity_profiles`,
  `identity_profile_source_links` y `session_360` (verificados como existentes 2026-08-02). Definir account
  linking de cuentas existentes, conflictos/revisión manual, recovery, desactivación y revocación sin exportar ni
  compartir el secret/cookie de sesión de Greenhouse.
- Evaluar el broker existente de sister-platforms contra el contrato de authorization server MCP: metadata pública,
  CIMD/DCR, callbacks loopback y HTTPS hospedados, consentimiento/grants, refresh/revocation y verificación de
  tokens opacos. Si native o hybrid gana, definir su extracción a `auth.efeonce.org` con despliegue, secretos,
  cookies, audiencia, escalado y rollback independientes de Greenhouse.
- Definir el primer read de elegibilidad de clientes existentes, el command allowlist de operador, el input de
  administrador designado y el audit de invitación/revocación. Prohibir explícitamente signup público, inferencia
  por dominio de correo y enrolamiento automático.
- Producir el contrato de diseño/flujo y deployment de la superficie `auth.efeonce.org` antes de cualquier código
  browser, y **crear la task `ui-ux` dependiente** (wireframe + flow reales derivados de ese contrato) que
  entregará la superficie visible de login.
- Producir el contrato objetivo de convergencia por el cual el Greenhouse customer-facing podrá delegar después su
  autenticación al mismo plano de identidad externo aceptado, conservando su propia sesión y audiencia.
- Especificar la calificación por issuer de la autoridad de tools en el gateway (tool ↔ issuers permitidos) y su
  test de regresión, antes de introducir el segundo issuer.
- Especificar el contrato ampliado del contexto de autorización (`issuer`, `subject`, `clientId`, `audience`,
  `delegatedScopes` y `roles` separados) y que el binding de persona se resuelve por `(issuer, subject)`.
- **Ejecutar la matriz de tokens live** y registrarla redactada: por cada cliente objetivo (Claude, Codex,
  ChatGPT) capturar `iss`, `aud`, `sub`, `azp`/`client_id`, `scp`, `scope`, `roles`, claim organizacional y `exp`.
  Cierra de paso la prueba base-only pendiente de TASK-1626 y es el insumo del diseño de calificación por issuer.
- **Confirmar la estabilidad del `subject` leyendo `subject_types_supported` del proveedor elegido** (metadata OIDC
  obligatoria; responde sin emitir un token). **Medición 2026-08-02: todos los candidatos SaaS viables emiten
  `public`** — WorkOS, Stytch, Clerk, Zitadel, Descope, Auth0, Scalekit y Ory —, así que con cualquiera de ellos
  `(issuer, subject)` es clave estable y el riesgo no se materializa. El único `pairwise` del grupo es **Microsoft
  Entra**, o sea el carril interno, y su mecanismo **no** es el sector identifier del estándar: Entra particiona el
  `sub` **por App ID**, así que dos App Registrations distintas dan `sub` distintos aunque compartan redirect, y
  una misma App Registration da el mismo `sub` desde desktop y desde web. El identificador estable cross-app de
  Entra es `oid` + `tid` — que es exactamente lo que el write de fondeo ya usa. La verificación sigue siendo
  obligatoria contra el proveedor que finalmente se apruebe: es una consulta y cierra la pregunta.

### Slice 1 — External identity and Account 360 binding

- Provisionar el issuer de identidad cliente aceptado y su custom domain con configuración/secretos fuera del
  source.
- Si Slice 0 selecciona native o hybrid, extraer el broker sister-platform a un runtime independiente en
  `auth.efeonce.org`: NextAuth/Greenhouse queda como upstream de identidad y sesión del portal, no como issuer MCP;
  el adapter conserva Account 360 como source of truth y añade metadata/CIMD/DCR, callbacks públicos compatibles,
  consentimiento/grants y verificación de token acordada con el gateway.
- Implementar el servicio aislado de auth/sesión de Efeonce (server adapter del proveedor/composición seleccionada);
  no convierte el gateway MCP en host de browser/sesión. La superficie visible se implementa en la task `ui-ux`
  dependiente.
- Implementar primitives auditados e idempotentes de binding organización/persona/grant con migración aditiva, sin
  backfill automático de clientes, e invitación sólo después de revisión allowlist explícita de cliente existente.
- Cuando la persona invitada ya existe, enlazar el subject externo verificado a ese `identity_profile`; no crear
  una segunda persona ni una segunda contraseña Greenhouse. Ejercitar rutas de conflicto y recovery antes de
  acceso de clientes.

### Slice 2 — Gateway/provider enforcement

- Agregar validación dual-issuer gateada al gateway sin cambiar el canary interno Entra: el verificador
  single-issuer actual (`src/auth/token-verifier.ts`) pasa a un resolver por issuer con JWKS y audience propios.
- Ampliar el contexto de autorización a `issuer` + `subject` + `clientId` + `audience` + `delegatedScopes` +
  `roles` separados, eliminando el fallback `clientId = azp ?? sub` y la fusión `scp ∪ scope ∪ roles`, y resolver
  el binding de persona por `(issuer, subject)` con la clave estable que fijó el Slice 0.
- Ligar cada tool a su clase de autoridad (`delegatedScopes` y/o `roles`) además de a sus issuers permitidos.
- Ligar cada tool a sus issuers permitidos: las tools internal-only (write de fondeo incluido) rechazan tokens del
  issuer externo aunque porten el scope string; test de regresión de esa denegación.
- Resolver el binding verificado server-side y exigir revalidación del provider (organización, workspace y
  capability en Globe) antes del dispatch.

### Slice 3 — Client canary and first customer rollout

- Probar OAuth/PKCE, compatibilidad de registro y MCP initialize con Claude, Codex y ChatGPT, cubriendo **las dos
  formas de redirect**: loopback (cliente nativo, puerto efímero, literal `127.0.0.1`) y HTTPS en dominio propio
  (cliente hospedado). Confirmar que el authorization server admite cualquier puerto en loopback y que el `sub` de
  la misma persona coincide entre ambas formas.
- Allowlist de una capability Globe read-only para una organización; probar allow, base-only deny, expiración y
  revocación antes de habilitar cualquier acceso de cliente más amplio.
- Requiere la superficie de login entregada por la task `ui-ux` dependiente.

## Out of Scope

- Customer public signup, enrolamiento automático por dominio de correo, UI de administración para clientes, SCIM,
  rollout amplio de SSO o self-service de entitlements.
- Migrar el runtime del login customer-facing de Greenhouse en el primer slice MCP. Esta task define y valida el
  contrato de convergencia; un rollout gateado posterior ejecuta ese cutover.
- Writes de Globe para clientes, crédito/gasto, aprobaciones, tooling rights-sensitive o cualquier capability no
  aprobada por separado. El write interno de fondeo existente permanece internal-only y ligado al issuer interno.
- Reemplazar Account 360, mover policy de Globe al gateway o deshabilitar el reader/canary interno Entra.
- Provisionar producción de WorkOS u otro proveedor antes de la aceptación del ADR y la aprobación comercial.
- Implementar la superficie visible de login (pantallas/copy/estados): pertenece a la task `ui-ux` dependiente.

## Detailed Spec

La ejecución comienza con `pnpm codex:task-hook TASK-1631 --develop` cuando el operador apruebe el goal, y sólo
después de la aceptación explícita del ADR (`Blocked by`). El orden interno es estricto: nada externo se provisiona
en Slice 0; nada de browser se implementa antes del contrato de diseño del Slice 0 y su task `ui-ux`.

Restricciones de forma verificadas contra el runtime que el diseño debe honrar:

- **El gateway es hoy single-issuer por construcción** (`OAUTH_ISSUER` único, un JWKS, un
  `authorization_servers`). El dual-issuer del Slice 2 es un cambio de verificador, no de configuración: requiere
  resolver issuer→JWKS/audience por token y propagar el issuer al contexto de autorización de cada tool.
- **El contexto de autorización pierde el `subject` hoy y hay que ampliarlo antes de poder bindear a nadie.**
  `AuthInfo` sale como `{ token, clientId, scopes, expiresAt }` con `clientId = azp ?? sub`: con `azp` presente el
  `sub` se descarta, y sin `azp` los dos ejes se conflacionan en un solo campo. El contrato nuevo conserva
  `issuer`, `subject`, `clientId`, `audience` y `scopes` por separado. Que hoy no rompa nada **no es evidencia de
  que esté bien**: `clientId` no tiene consumers en el gateway y el write de fondeo reenvía el token crudo al
  exchange, así que ningún camino ejercita el campo. La primera vez que se ejercite será justamente resolviendo el
  binding de una persona cliente — el peor momento para descubrirlo.
- **`roles` se fusiona dentro de `scopes`.** El verificador arma los scopes como `scp ∪ scope ∪ roles`, así que un
  claim `roles` de cualquier issuer se vuelve un scope string. Es otra razón por la que la equivalencia por string
  no puede ser la última capa de autoridad — y aplica **dentro** de un issuer: un app role de Entra con el mismo
  string que un scope satisface la comprobación sin consentimiento delegado.
- **Hay DOS formas de cliente MCP y hoy sólo se ejercita una.** Los clientes nativos/desktop (Claude Desktop,
  Codex CLI) usan redirect **loopback**, que es el patrón correcto y estándar para apps nativas (RFC 8252) — no es
  un atajo del canary. Los clientes hospedados/web usan un redirect **HTTPS en su propio dominio**. El plano de
  identidad debe admitir ambas formas, y toda medición de claims debe cubrir las dos: es justamente el eje donde un
  `sub` pairwise cambia de valor. Dos detalles del canary vigente que **no se propagan al producto**:
  `scripts/oauth-canary.mjs` usa el hostname `localhost` en vez del literal `127.0.0.1` que RFC 8252 recomienda
  (`localhost` se resuelve por DNS/hosts y es redirigible) — el CLI de Greenhouse ya registra la forma correcta,
  así que hay inconsistencia entre repos —, y fija el puerto `8765`, aceptable para un canary de una máquina pero
  inválido como contrato de producto: un cliente real toma puerto efímero y el authorization server debe admitir
  cualquier puerto en loopback.
- **Los scopes hoy son strings sin dueño.** `efeonce.mcp.read`, `efeonce.mcp.globe.read` y
  `efeonce.mcp.globe.credits.funding.ensure` se comprueban por `includes` sobre los scopes del token. Con un solo
  issuer eso es suficiente; con dos, la tupla de autoridad pasa a ser `(issuer, scope, binding, grant)` y la
  comprobación por string queda como primera capa solamente.
- **El write de fondeo tiene defensa en profundidad downstream** (token-exchange Entra→Greenhouse por
  `(microsoft_tenant_id, microsoft_oid)`, authority one-shot, endpoint canónico Greenhouse), así que un token
  externo fallaría igualmente aguas abajo — pero la denegación debe ocurrir en dispatch, con señal, no como
  side-effect de un exchange fallido.
- **El binding es provider-neutral por diseño.** El grafo es
  `organización canónica → binding IDP externo → membership/grant por capability namespaceada`; Globe consume ese
  grafo como primer provider y revalida su workspace/policy internamente. Un provider nuevo (la capability de
  cotización del Delta 2026-08-02 de TASK-1626, Wave, Kortex) se suma registrando capabilities, no ampliando el
  schema del binding.
- **La cohorte es un command, no un import.** El enrolamiento registra organización Account 360, administrador
  designado, operador autorizante, subject/organización externos, capability permitida, timestamps y estado de
  revocación — idempotente y append-only.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

El orden es un **DAG, no una cadena** — serializar la task UI antes del Slice 1 bloquearía el backend sin motivo:

```text
Slice 0 (ADR aceptado + contrato de binding/diseño + task ui-ux creada)
  ├─ Slice 1 (issuer + auth/session service + binding primitives) ─→ Slice 2 (dual-issuer + issuer-qualified tools) ─┐
  └─ task ui-ux (diseño/autoría en paralelo desde el cierre del Slice 0;                                             ├─→ Slice 3
     integra contra el session service que entrega el Slice 1) ───────────────────────────────────────────────────────┘
```

La task UI **nunca bloquea Slice 1 ni Slice 2**, pero debe estar terminada antes del Slice 3 (los canaries de
cliente atraviesan la superficie real de login). Slice 2 MUST preserve the Entra internal issuer and fleet reader;
Slice 3 MUST prove base-only denial and revocation before it allows a second organization or capability.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| External ID becomes a second tenant source of truth | identity / Account 360 | medium | explicit binding only; architecture review and migration tests | unbound or conflicting organization binding |
| Valid token reaches wrong Globe workspace | MCP / Globe | medium | gateway binding plus provider revalidation, fail-closed deny test | tenant/workspace mismatch denial |
| External-issuer token satisfies an internal-only tool | MCP / issuer authority | medium | tool↔issuer allowlist, regression test, downstream token-exchange defense | external token dispatch attempt on internal tool |
| Person binding resolved from a self-asserted `client_id` | MCP / identity | medium | separate issuer/subject/clientId in auth context; bind by `(issuer, subject)`; remove `azp ?? sub` fallback | binding lookup keyed on clientId, or subject absent from context |
| Revocation lags and leaks access | identity / MCP / Globe | medium | short-lived token, grant version/invalidation and revoke canary | revoked principal dispatch attempt |
| External issuer disrupts current reader | gateway | low | dual issuer gated; retain Entra internal path and provider flag | internal canary regression |
| OAuth client incompatibility | external MCP clients | medium | metadata/registration and PKCE canary for each target client | per-client auth compatibility result |
| Existing Greenhouse customer receives a duplicate identity or credential | identity / customer experience | medium | deterministic `identity_profile` source-linking, conflict review and one-authentication target | duplicate profile, competing recovery path or unmatched subject |
| Pairwise `sub` breaks the binding for a client shape never tested | identity / MCP clients | medium | read `subject_types_supported` first; pin `sector_identifier_uri` or use a provider-stable person id; test loopback AND hosted redirect shapes | same person resolves to different subjects across clients |

### Feature flags / cutover

- External issuer validation and every external provider capability default to OFF.
- Keep the existing Entra issuer/internal `globe.producer.fleet.list` path ON and independent.
- El flag del write interno de fondeo (`globeCreditFunding.enabled`) es independiente de este rollout y nunca se
  expone al issuer externo.
- Revert: disable the external issuer/capability flag, revoke binding/grant, then redeploy gateway/provider policy
  if necessary; target recovery is under five minutes for access denial.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| Slice 1 | disable issuer, revoke operator-created binding/grant, retain audit | < 5 min | yes |
| Slice 2 | flag external issuer/provider OFF and redeploy prior revision if needed | < 5 min | yes |
| Slice 3 | remove organization allowlist and verify denial; keep internal Entra canary | < 5 min | yes |

### Production verification sequence

1. Verify no behavior changes with external issuer and capabilities OFF.
2. Select one existing Account 360 client organization and create one reviewed, audited binding, designated
   administrator and invitation; do not use a synthetic customer or a domain-only match.
3. Complete OAuth/PKCE and MCP initialize from each target client.
4. Prove permitted reader access, base-only denial, expired token denial and revoked-grant denial.
5. Prove issuer-qualified denial: an external-issuer token carrying an internal-only scope string is denied at
   dispatch, and confirm the person binding resolved from `(issuer, subject)` — never from `client_id`.
6. Verify Globe workspace/capability revalidation and redacted telemetry.
7. Observe signals before adding another organization or capability; stop and roll back on any mismatch.

### Out-of-band coordination required

Explicit operator approval for the identity-provider account and commercial plan, `auth.efeonce.org` DNS/TLS,
production secrets, client registrations and the first customer onboarding consent.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] The ADR is accepted and the selected provider/plan is explicitly approved before external provisioning, with
      its cost presented for the initial cohort and a 12-month projection. The decision record includes the measured
      WorkOS vs native Greenhouse broker vs hybrid comparison; the existing broker is not treated as MCP-ready
      without closing its metadata, client-compatibility and verification gaps.
- [ ] La revisión de privacidad/subprocesador está cerrada (DPA, subprocesadores, región, retención, derechos de
      titular y notificación contractual cuando aplique) antes de provisionar el tenant productivo.
- [x] Cada command de operador tiene capability dedicada y granular, seedeada en registry + catálogo TS y
      granteada a ≥1 rol real en el mismo PR; `capability-grant-coverage.test.ts` pasa. _Evidencia 2026-09-04: 6
      capabilities `identity.external_*` (seed migración 20260904104914802 + catálogo + `efeonce_admin`)._
- [x] Las cuatro reliability signals están registradas, visibles en `/admin/operations` y en `steady = 0`.
      _Evidencia staging 2026-09-04 (deploy `greenhouse-extzoqo80`, develop `02dc5d987`): `/api/admin/reliability`
      devuelve las 4 señales bajo `identity` — 3 en `ok`, `unbound_dispatch_attempt` en `warning` por los 4 denials del
      smoke `--apply` (decae en 24h; steady 0 sin tráfico). Producción: pendiente del release con TASK-1828._
- [ ] La baja de una persona en la organización cliente revoca su acceso MCP end-to-end, verificado en vivo: el
      binding queda desactivado, el grant deja de resolver y un token vigente emitido antes de la baja se deniega
      en dispatch sin esperar a su expiración.
- [x] El camino de soporte está documentado en el runbook MCP: qué ve un cliente que no puede entrar, qué
      diagnostica el operador y con qué evidencia redactada, sin exponer tokens ni claims de terceros. _Evidencia
      2026-09-04: sección de soporte en el runbook MCP + manual `operar-binding-identidad-externa.md`._
- [x] An Account 360 organization is the sole customer anchor and has an audited external identity binding.
      _Evidencia: FK + `external_identity_audit_log` (`organization_bound`); smoke live sobre el fixture._
- [ ] An existing customer authenticating through the external plane resolves to the same canonical
      `identity_profile`; Greenhouse/auth/MCP sessions remain audience-separated.
- [ ] The customer-facing Greenhouse login convergence contract is approved, even though its runtime cutover is a
      later rollout gate.
- [ ] If native or hybrid is selected, the extracted broker runs at `auth.efeonce.org` with independent deployment,
      cookie/session secrets, audience, scaling and rollback, while resolving the same canonical identity and Account
      360 membership. A Greenhouse release or browser cookie is never required to validate an MCP token.
- [ ] Gateway and Globe both deny unknown, base-only, expired or revoked access.
- [ ] Tool authority is issuer-qualified: an external-issuer token never satisfies an internal-only tool,
      regardless of scope strings.
- [x] The binding/grant model is provider-neutral and a second provider can register capabilities without schema
      migration of the binding. _Evidencia: `capability` es un string namespaceado validado por CHECK; ninguna
      columna de Globe/Wave/Kortex; el resolver devuelve `grants[]` sin interpretar el namespace._
- [ ] The Entra internal canary and `globe.producer.fleet.list` remain available through the transition.
- [ ] Claude, Codex and ChatGPT canaries pass OAuth/PKCE plus MCP initialize for the allowlisted organization.
- [ ] No write, spend, approval or rights-sensitive Globe capability is exposed by this task.

## Verification

- `pnpm task:lint --task TASK-1631`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`
- `cd ../efeonce-mcp && pnpm check && pnpm test && pnpm build`
- Gateway/provider contract and auth-negative tests in `../efeonce-mcp` and `../efeonce-globe`
- Staging and production allow/base-only/revoke evidence, redacted and attached to the task before rollout

## Closing Protocol

- [ ] Lifecycle and file location match the real state.
- [ ] Task registry, README, ADR, MCP runbook and skill mirrors are synchronized.
- [ ] Handoff and changelog record the accepted implementation and live evidence.
- [ ] Access, revocation, error redaction and rollback evidence are retained.

## Delta 2026-08-26 — Growth SEO/AEO depende de esta task y ella no lo declara

Barrido verificado: esta task **no menciona «seo» ni «aeo» ni una sola vez**. El dominio SEO sí declara
la dependencia hacia afuera —en `src/mcp/greenhouse/server.ts`, en el cliente HTTP del lane, en el
recurso ecosystem y en la entrada de paridad del gateway— pero acá no aparece como consumer ni en
criterios de aceptación.

**El riesgo concreto:** `prepare_seo_grounded_queries` y `get_seo_grounded_query_draft` están
*fail-closed* con la identidad máquina compartida, devolviendo `aeo_forbidden` (403). El bloqueo real
no es un scope de Entra sino una **capability**: `growth.ai_visibility.prompt_set.manage`, que la
identidad de máquina no tiene. Como la regla de esta task es que *la autoridad la califica el issuer*,
**esta task podría cerrarse completa y dejar esas dos tools igual de bloqueadas**, porque el grant fino
no vendría con ella.

Línea a agregar en `Blocks / Impacts`:

> Growth SEO/AEO: `prepare_seo_grounded_queries` y `get_seo_grounded_query_draft` están fail-closed
> (`aeo_forbidden`) esperando grants por usuario. El cierre de esta task debe declarar si las habilita
> o si requiere una task propia de grants `growth.ai_visibility.*` — el silencio dejaría dos tools
> vivas y permanentemente bloqueadas.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §7.3.

## Follow-ups

- La task `ui-ux` dependiente de la superficie de login `auth.efeonce.org` nace al cierre del Slice 0 con
  wireframe y flow reales derivados del contrato de diseño; bloquea el Slice 3 de esta task.
- Customer self-service administration and SCIM/enterprise SSO require separate discovery and task/ADR scope.
- Customer-facing Greenhouse login cutover follows the convergence contract from this task and requires a separate
  implementation/rollout unit; it must not introduce a second customer identity store.
- Each additional provider or write-capable Globe tool requires its own capability, entitlement and rollout gate.

## Open Questions

- Confirm the selected composition (WorkOS, native Greenhouse broker extracted to `auth.efeonce.org`, or hybrid)
  and any commercial plan after explicit operator review; the native broker's operating cost and security ownership
  must be estimated alongside SaaS pricing.
- Select the exact canonical Greenhouse membership primitive and additive binding schema during Slice 0 discovery.
- Decide the cutover sequence for customer-facing Greenhouse authentication after the shared identity-link contract
  is proven, without changing the internal Entra path.
