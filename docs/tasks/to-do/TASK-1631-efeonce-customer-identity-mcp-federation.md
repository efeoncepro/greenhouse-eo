# TASK-1631 — Efeonce Customer Identity and MCP Federation Foundation

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Epic: `none`
- Status real: `arquitectura propuesta; runtime pre-auditado 2026-08-02; pendiente aceptación del proveedor de identidad y su plan comercial antes de provisionar`
- Rank: `TBD`
- Domain: `platform|identity|integration|agentic`
- Blocked by: `aceptación explícita de EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md y aprobación del proveedor/plan de identidad externo`
- Branch: `Greenhouse develop; MCP main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

**Split UI (regla de perfil híbrido):** esta task es la foundation `backend-data`. La superficie visible de login
en `auth.efeonce.org` (pantallas, estados, copy, accesibilidad) se entrega en una **task `ui-ux` dependiente**,
creada al cierre del Slice 0 cuando exista el contrato de diseño/flujo que ese slice produce — con su wireframe y
flow reales, nunca stubs. Esa task UI bloquea el Slice 3 (canaries de cliente); esta task no declara `UI impact`
porque no implementa superficie visible por sí misma.

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
- Entregar el servicio de autenticación propio en `auth.efeonce.org`, aislado del gateway y de Greenhouse;
  WorkOS/AuthKit opera autenticación mediante APIs server-side y WorkOS Connect sigue emitiendo OAuth para MCP. La
  superficie visible de login se entrega en la task `ui-ux` dependiente declarada arriba.
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
- **Dynamic client registration autentica software, nunca autoriza.** Un cliente MCP registrado dinámicamente
  contra el issuer externo no recibe nada sin binding persona+organización y grant explícito; la política de
  emisión de scopes vive en la configuración del plano de identidad y en los grants, no en el registro del client.
- Entra sigue siendo exclusivamente el canary interno durante la transición. No se deshabilita
  `globe.producer.fleet.list` ni se usa ese cliente como evidencia de acceso cliente.
- La configuración de WorkOS staging y discovery MCP no constituye acceso cliente. No crear producción, DNS,
  secretos, bindings ni desplegar la ruta pública de login mientras el ADR propuesto no tenga aceptación explícita.

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

### Files owned

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md`
- `docs/tasks/to-do/TASK-1631-efeonce-customer-identity-mcp-federation.md`
- `../efeonce-mcp/**`
- migraciones y primitives canónicos de identidad/Account 360 identificados durante el plan aprobado
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
- Existen **tres scopes**, no dos: base `efeonce.mcp.read`, reader `efeonce.mcp.globe.read` y el write interno
  `efeonce.mcp.globe.credits.funding.ensure` (gateado por `globeCreditFunding.enabled`, sólo aparece en
  `scopes_supported` con el flag ON). El write ejecuta token-exchange Entra→Greenhouse mapeado por
  `(microsoft_tenant_id, microsoft_oid)` y llama el endpoint canónico Greenhouse; su canary interno real pasó el
  2026-08-01 con resultado terminal y sin segundo delta económico.
- Globe ya hace policy downstream sobre su workspace y capability para el reader habilitado.

### Gap

- Existe una configuración WorkOS de staging para discovery MCP; no existe un issuer B2B activo para clientes,
  binding canónico de organización externa a Account 360, servicio propio de login ni una prueba real
  base-only/allow/revoke por capacidad.
- El gateway no soporta dual-issuer: agregar el issuer externo requiere validación gateada por issuer, con
  autoridad calificada por issuer para cada tool (hoy la comprobación de scopes es por string, suficiente con un
  solo issuer, insuficiente con dos).
- El cliente Entra interno actual recibe los scopes delegados juntos y por ello no demuestra denial por persona ni
  por cliente; la prueba base-only real sigue pendiente.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `Greenhouse para Account 360/identity binding; ../efeonce-mcp para OAuth validation y dispatch; ../efeonce-globe para provider policy`
- Future candidate home: `remain-shared`
- Boundary: `binding server-side identity_profile/Account 360 ↔ external subject/organization, entitlement resolver provider-neutral y provider policy revalidation; runtimes y sesiones permanecen independientes`
- Server/browser split: `la UI browser de auth está aislada en auth.efeonce.org y se entrega en la task ui-ux dependiente; sólo su adapter server accede a AuthKit APIs. Tokens, binding stores, admin APIs del IDP, provider clients y secretos nunca llegan a código browser`
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
- Reliability signals/logs: `mismatch redactado de issuer/client/binding, denial de entitlement, propagación de revocación y señales de dispatch por provider`
- Production verification sequence: `una organización allowlisted, un reader Globe read-only, después base-only deny y revoke con rollback documentado antes de ampliar onboarding`

### Acceptance criteria additions

- [ ] Account 360, binding y provider sources of truth quedan nombrados y no existe un segundo modelo de
      organización cliente.
- [ ] Existing-person linking, colisión/revisión manual, recovery, desactivación y revocación mapean un subject
      externo a un único `identity_profile` canónico; el matching sólo-por-email se rechaza.
- [ ] La coexistencia del login cliente actual de Greenhouse y la delegación futura al plano de identidad externo
      aceptado quedan documentadas, con cookies/audiencias separadas y cutover gateado por separado.
- [ ] Gateway y provider fallan cerrado de forma independiente ante binding o capability ausente/revocada.
- [ ] Un token del issuer externo que porte un scope string internal-only (p.ej. el write de fondeo) se deniega en
      dispatch sin llegar al provider.
- [ ] Migración, audit, revocación y rollback quedan verificados antes de acceso de clientes.
- [ ] Canaries OAuth reales de Claude, Codex y ChatGPT cubren allow, base-only deny y revocación.
- [ ] Ningún token, code, secret o respuesta cruda de provider aparece en logs o respuestas de error.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 0 — Decision, cohort policy and schema discovery

- Obtener aceptación explícita del ADR y del plan del proveedor de identidad antes de provisionar nada externo.
- Inventariar la organización Account 360, persona/membership canónica y contratos de workspace de Globe; proponer
  el schema aditivo mínimo de binding, command/reader/audit y contrato de invalidación — provider-neutral.
- Inventariar los contratos actuales de Greenhouse NextAuth, `client_users`, `identity_profiles`,
  `identity_profile_source_links` y `session_360` (verificados como existentes 2026-08-02). Definir account
  linking de cuentas existentes, conflictos/revisión manual, recovery, desactivación y revocación sin exportar ni
  compartir el secret/cookie de sesión de Greenhouse.
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

### Slice 1 — External identity and Account 360 binding

- Provisionar el issuer de identidad cliente aceptado y su custom domain con configuración/secretos fuera del
  source.
- Implementar el servicio aislado de auth/sesión de Efeonce (server adapter de AuthKit); no convierte el gateway
  MCP en host de browser/sesión. La superficie visible se implementa en la task `ui-ux` dependiente.
- Implementar primitives auditados e idempotentes de binding organización/persona/grant con migración aditiva, sin
  backfill automático de clientes, e invitación sólo después de revisión allowlist explícita de cliente existente.
- Cuando la persona invitada ya existe, enlazar el subject externo verificado a ese `identity_profile`; no crear
  una segunda persona ni una segunda contraseña Greenhouse. Ejercitar rutas de conflicto y recovery antes de
  acceso de clientes.

### Slice 2 — Gateway/provider enforcement

- Agregar validación dual-issuer gateada al gateway sin cambiar el canary interno Entra: el verificador
  single-issuer actual (`src/auth/token-verifier.ts`) pasa a un resolver por issuer con JWKS y audience propios.
- Ligar cada tool a sus issuers permitidos: las tools internal-only (write de fondeo incluido) rechazan tokens del
  issuer externo aunque porten el scope string; test de regresión de esa denegación.
- Resolver el binding verificado server-side y exigir revalidación del provider (organización, workspace y
  capability en Globe) antes del dispatch.

### Slice 3 — Client canary and first customer rollout

- Probar OAuth/PKCE, compatibilidad de registro y MCP initialize con Claude, Codex y ChatGPT.
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

`Slice 0 -> task ui-ux dependiente -> Slice 1 -> Slice 2 -> Slice 3`. Slice 2 MUST preserve the Entra internal
issuer and fleet reader; Slice 3 MUST prove base-only denial and revocation before it allows a second organization
or capability.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| External ID becomes a second tenant source of truth | identity / Account 360 | medium | explicit binding only; architecture review and migration tests | unbound or conflicting organization binding |
| Valid token reaches wrong Globe workspace | MCP / Globe | medium | gateway binding plus provider revalidation, fail-closed deny test | tenant/workspace mismatch denial |
| External-issuer token satisfies an internal-only tool | MCP / issuer authority | medium | tool↔issuer allowlist, regression test, downstream token-exchange defense | external token dispatch attempt on internal tool |
| Revocation lags and leaks access | identity / MCP / Globe | medium | short-lived token, grant version/invalidation and revoke canary | revoked principal dispatch attempt |
| External issuer disrupts current reader | gateway | low | dual issuer gated; retain Entra internal path and provider flag | internal canary regression |
| OAuth client incompatibility | external MCP clients | medium | metadata/registration and PKCE canary for each target client | per-client auth compatibility result |
| Existing Greenhouse customer receives a duplicate identity or credential | identity / customer experience | medium | deterministic `identity_profile` source-linking, conflict review and one-authentication target | duplicate profile, competing recovery path or unmatched subject |

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
   dispatch.
6. Verify Globe workspace/capability revalidation and redacted telemetry.
7. Observe signals before adding another organization or capability; stop and roll back on any mismatch.

### Out-of-band coordination required

Explicit operator approval for the identity-provider account and commercial plan, `auth.efeonce.org` DNS/TLS,
production secrets, client registrations and the first customer onboarding consent.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] The ADR is accepted and the selected provider/plan is explicitly approved before external provisioning.
- [ ] An Account 360 organization is the sole customer anchor and has an audited external identity binding.
- [ ] An existing customer authenticating through the external plane resolves to the same canonical
      `identity_profile`; Greenhouse/auth/MCP sessions remain audience-separated.
- [ ] The customer-facing Greenhouse login convergence contract is approved, even though its runtime cutover is a
      later rollout gate.
- [ ] Gateway and Globe both deny unknown, base-only, expired or revoked access.
- [ ] Tool authority is issuer-qualified: an external-issuer token never satisfies an internal-only tool,
      regardless of scope strings.
- [ ] The binding/grant model is provider-neutral and a second provider can register capabilities without schema
      migration of the binding.
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

## Follow-ups

- La task `ui-ux` dependiente de la superficie de login `auth.efeonce.org` nace al cierre del Slice 0 con
  wireframe y flow reales derivados del contrato de diseño; bloquea el Slice 3 de esta task.
- Customer self-service administration and SCIM/enterprise SSO require separate discovery and task/ADR scope.
- Customer-facing Greenhouse login cutover follows the convergence contract from this task and requires a separate
  implementation/rollout unit; it must not introduce a second customer identity store.
- Each additional provider or write-capable Globe tool requires its own capability, entitlement and rollout gate.

## Open Questions

- Confirm the selected external identity provider and commercial plan after explicit operator review.
- Select the exact canonical Greenhouse membership primitive and additive binding schema during Slice 0 discovery.
- Decide the cutover sequence for customer-facing Greenhouse authentication after the shared identity-link contract
  is proven, without changing the internal Entra path.
