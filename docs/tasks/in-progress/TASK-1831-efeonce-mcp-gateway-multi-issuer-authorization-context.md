# TASK-1831 — Efeonce MCP Gateway Multi-Issuer Authorization Context

Mapa de construcción, pruebas y límites: [auditoría consolidada TASK-1836/1831](../../audits/2026-09-06-task-1836-1831-consolidated-evidence.md).


## Evidencia vigente compartida con TASK-1836 — 2026-09-06

Gateway `efeonce-mcp-gateway-00036-5wc` (`815df9b`) con ambos flags nativos ON: el canary
interno autenticado ya emitió tokens, permitió `get_seo_entitlement` propio y negó organización
ajena antes/después de una lectura propia. Refresh rotativo verificado; retiro de grant ≤11 s;
revocación final 6.633 s con access token no expirado. Gateway OFF negó en ≤20 s y los controles
se restauraron en 79 s. Piloto gv5, vencimiento original 2026-09-12T15:00Z; pruebas revocadas.

La evidencia y el release PR225/main08acfb2c6 están en
[el runbook compartido](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).
El arreglo directo de `/login` (21aa12608, auth rev30) ya está servido; PR226 y el retorno humano
directo siguen pendientes. Esa UI no modifica el contrato de autorización del gateway.
Los snapshots siguientes son historia: `access_tokens=0`, flag emisor OFF y ausencia de auditoría
del piloto dejaron de ser bloqueos vigentes tras canaries, migración y reconciliación canónica.
La matriz externa/multicontexto y el canary Entra completo no se declaran aprobados por inferencia.

## Snapshot histórico 2026-09-05 17:01 UTC — anterior al canary autenticado

Medido en runtime por la sesión `greenhouse-eo-8d`, contrastado con `greenhouse-eo-45` (TASK-1829/1835),
`greenhouse-eo-89` (TASK-1631), `greenhouse-eo-0f` (TASK-1828) y `greenhouse-eo-18` (TASK-1830/1836).
Ninguna de esas sesiones tenía trabajo en vuelo sobre `../efeonce-mcp`.

**Desplegado y activo (verificado):** `../efeonce-mcp` en `main` = `dd04f47` sin pendientes de push
(`93819fa` contextos nativos + autoridad por tool, `fa1ee2a` ledger del access token antes del dispatch,
`dd04f47` deploy por digest). Deploy Cloud Run run `33979635307` success 2026-09-05T17:01Z; revisión viva
`efeonce-mcp-gateway-00032-qm5`, imagen por digest `sha256:6f28046f…`. Env de esa revisión:
`MCP_NATIVE_AUTH_ENABLED=true`, `MCP_NATIVE_INTERNAL_AUTH_ENABLED=true`,
`MCP_NATIVE_ISSUER=https://auth.efeonce.org`, `MCP_IDENTITY_BINDING_URL=https://greenhouse.efeoncepro.com`
con token de máquina como secret-ref. Ambos flags registrados en `FEATURE_FLAG_STATE_LEDGER.md`.
Sondas: `/.well-known/oauth-protected-resource` 200, `POST /mcp` sin token 401 — **negativas**: prueban que
la puerta cierra, no que la llave abre.

**Grafo de acceso (verificado contra PG):** `external_identity_environments.efeonce-auth` = `active` desde
2026-09-05T00:50Z. Un binding `active` (`xob-139e3fe2…`) sobre `org-2df565fb…` = `EO-ORG-0007` "Efeonce"
(`organization_type: other`), `grants_version: 2`, razón "TASK-1836 authorized seven-day internal read-only
pilot"; grant `growth.seo.observation.read` `active` al perfil del operador, **vence 2026-09-12T15:00Z**.
Source link `external_idp:efeonce-auth` activo (`is_login_identity=true`). Los otros dos bindings son smoke
de TASK-1631, revocados.

**La membership del piloto existe, por el carril interno.** `resolveExternalAccess(efeonce-auth, <subject>)`
devuelve `unbound` / 0 memberships, pero `resolveInternalAuthority({environmentId, subject, profileId,
bindingId})` devuelve `population: internal`, `eligible: true`, `grantsVersion: 2`,
`capabilities: ['growth.seo.observation.read']` (ejercitado contra PG). Las 3 filas de
`external_member_invitations` están `revoked`, pero el piloto **no las necesita**: las invitaciones
pertenecen a la cohorte externa de TASK-1832.

**Lo que NO está verificado, y por qué:** `greenhouse_auth.access_tokens` = **0 filas**. El emisor nativo
nunca emitió un access token, así que el recheck de `grants_version` antes del dispatch — el corazón de esta
task — no ha visto tráfico real, y tampoco el rollback. Gate único restante: el emisor tiene
`AUTH_SERVER_INTERNAL_AUTH_ENABLED=false` en la revisión viva y por default en `main`. El gateway acepta hoy
un contexto interno nativo que el emisor no puede emitir: fail-closed, inofensivo mientras no exista token,
pero deja el rollout de TASK-1836 a medias. El reader del lane sí conoce la población interna (rama con
`authorizationContextId` + `jti` en `ecosystem-identity-binding.ts`) — leído en código, no ejercitado.

**El piloto no se mide por el carril Entra.** En `tool-policy.ts` de `dd04f47`, `evaluateToolAuthority` hace
`if (auth.issuerClass === 'entra') return policy.allowedPopulations.includes('entra') ? {allowed:true} : deny(...)`
**antes** de consultar binding y capabilities. La fila de `external_capability_grants` sólo se consume por el
carril nativo; por Entra las tools SEO se autorizan por scope. Las tools son alcanzables, pero el grant, el
scoping por organización y el `gv` quedan inertes hasta el primer token nativo — con la ventana del piloto
corriendo.

**Nota para TASK-1832:** `efeonce.gateway.status` es la única tool con `native-external`, y trae
`organizationPolicy: 'none'` y `requiredCapabilities: []`. Un canary externo exitoso probaría scopes, issuer,
binding con membership y población, pero **no** el grant ni el scoping por organización. No leer "el acceso
externo funciona" como "el modelo de autorización quedó probado".

**Deuda que arrastra este contrato (dominio de TASK-1836, escalada por `greenhouse-eo-89`):**
`src/lib/identity/internal-access/commands.ts` escribe directo en `external_organization_bindings` y
`external_capability_grants` (líneas ~180 y ~342) con auditoría y modelo de membership propios
(`internal_native_access_audit`, `internal_native_enrollments`), fuera de los commands canónicos. Publica
outbox y bumpea `grants_version`, así que no es estado suelto: la regla que rompe es la de **escritor único**
(`IDENTITY_WORKFORCE_AGENT_INVARIANTS.md` §External identity binding), sin excepción declarada en el ADR.
Costo demostrado: el resolver canónico devuelve un **falso negativo** sobre una persona enrolada y elegible
— hizo que una sesión dedicada al dominio concluyera lo contrario de lo que el runtime permite.
`external_identity_audit_log` no tiene ninguna fila sobre el binding ni el grant del piloto.


## Delta 2026-09-04 — acceso interno nativo (TASK-1836)

El slice interno nativo depende del contrato de TASK-1836 (U11). La policy actual que asocia toda autoridad interna exclusivamente con Entra debe revisarse mediante ADR antes de habilitar el emisor común. Validar población/autoridad procedentes del resolver confiable; aceptar el issuer nativo nunca basta para abrir herramientas internas. El slice externo puede avanzar sin esperar este slice interno.


## Delta 2026-09-04 (TASK-1829)

- `TASK-1829` quedó `code complete, rollout pendiente` en `develop` (commits `263ee3a74`, `19d1658de`,
  `d31e6e913`): el emisor ya **emite en código** el access token que esta task consume — JWT ES256 de 15 min
  firmado en KMS HSM con `iss` (`https://auth.efeonce.org`), `sub`, `aud` (`https://mcp.efeonce.org/mcp`),
  `azp`, `client_id`, `scope`, `gv`, `exp`, `iat`, `jti`, `auth_time`; contrato en
  `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` §4 — cerrado por trabajo en `TASK-1829`.
- `gv` = `max(grantsVersion)` de las memberships `bound` del sujeto en `external_organization_bindings`
  (`resolveExternalAccess`), re-resuelto en cada emisión (code y refresh); sin binding ⇒ `access_denied`. El
  gateway compara por **igualdad estricta** con el reader de `TASK-1631`; cualquier revoke bumpea la versión.
- **Decisión que fija el diseño:** el gateway verifica JWT + JWKS y re-chequea `gv` contra el reader de
  bindings; `POST /oauth/introspect` existe (RFC 7662, sólo clientes confidenciales) pero **no es el camino del
  gateway** (invariante del contrato §10).
- **Desbloqueo por el lado del token:** en cuanto `AUTH_SERVER_OAUTH_ENABLED` esté ON en staging (exige el
  environment `efeonce-auth` `active` en `external_identity_environments` vía el command de `TASK-1631` +
  validación de metadata + clientes CIMD/DCR de prueba), el Slice 3 puede apuntar `jwksUri`/`issuer` reales y
  verificar tokens emitidos por DCR/CIMD; el flujo con persona real espera `TASK-1830` (`authorize` responde
  `login_required` hasta entonces).
- `Blocked by` se actualiza: `TASK-1829` deja de ser "sin token" y pasa a "flag ON en staging"; `TASK-1631`
  sigue esperando producción.

## Delta 2026-09-04

- El issuer `https://auth.efeonce.org` ya publica un JWKS real en staging (`/.well-known/jwks.json`, llave
  KMS HSM `auth-server-es256`): `kid` v2 `active` `xjjMaYxidu3Vk57K5py6w6WGDN41T0WMeOtHMEyppKc` y `kid` v1
  `retiring` `VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8`; un token ES256 firmado por el HSM se verificó con
  `createRemoteJWKSet` contra ese JWKS. El Slice 3 puede apuntar `jwksUri` a esa URL sin mocks — cerrado por
  trabajo en `TASK-1828`.
- El host comparte el front door del gateway (`efeonce-mcp` `6a144a5`, `enable_auth_host=true`, mismo LB, IP y
  Cloud Armor; gateway intacto), así que no hay infraestructura nueva que coordinar en el repo hermano.
- `TASK-1631` Slice 1 dejó el reader `GET /api/platform/ecosystem/identity/binding` code complete y
  verificado en staging (lane 401 sin consumer token); la ruta ya no requiere el `[verificar]` de diseño.
- **Sigue bloqueada:** `TASK-1829` aún no emite un access token con claims `sub`/`azp`/`scope`/`gv` (el
  runtime sólo sirve `readyz` y JWKS) y el reader de `TASK-1631` espera su release a producción.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Gateway multi-issuer desplegado y canary interno autenticado verificado, revisión36-5wc SHA815df9b, flags nativo/interno ON. TASK-1836 prueba token, lectura propia, rechazo ajeno, refresh, retiro de grant ≤11 s, revocación OAuth 6.633 s y rollback de flags medido. Release PR225 certificado. Ya no aplica access_tokens=0 ni emisor OFF. Pendientes: matriz externa/multicontexto, discovery/challenges por cliente real y nueva comprobación Entra completa; providers sin delegación compatible siguen denegados.`
- Rank: `TBD`
- Domain: `platform|identity|integration`
- Blocked by: `none`
- Branch: `efeonce-mcp main; Greenhouse develop para el lane de bindings; checkout compartido de cada repo; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el verificador single-issuer del gateway (`../efeonce-mcp/src/auth/token-verifier.ts`, 40 líneas,
`clientId = azp ?? sub`, `scopes = scp ∪ scope ∪ roles`) en un resolver por issuer que produce el
`AuthContext` del ADR de federación, ampliado por el contrato de contexto de TASK-1836, califica cada tool por `allowedIssuers` y clase de
autoridad, resuelve la persona por `(issuer, subject)` a través del registry de environments y rechequea
`grants_version` antes del dispatch. Entra directo conserva compatibilidad; `auth.efeonce.org` entra inicialmente como
segundo issuer detrás de flag.

## Why This Task Exists

Hoy un token de cualquier issuer configurado con el scope string correcto alcanza cualquier tool, el `sub` se
descarta y `roles` se mezcla con scopes delegados. Con un segundo issuer para clientes externos, esa forma es
una brecha: un token externo con `efeonce.mcp.globe.credits.funding.ensure` como string despacharía una
escritura interna. El Slice 0 de `TASK-1631` diseñó el contrato y los tres tests de regresión; esta task
los materializa en el repo hermano.

## Goal

- `AuthContext { issuer, subject, clientId, audience, delegatedScopes, roles, expiresAt, grantsVersion }` sin
  fallback ni fusión; issuer desconocido denegado antes de tocar JWKS.
- Resolver por issuer con JWKS, audience y política propios; caché de JWKS con fallback a última copia buena.
- Cada tool declara `allowedIssuers` y `authorityClass` (`delegated` | `roles` | `both`); internal-only
  (incluido el write de fondeo) conserva Entra y sólo admite emisor nativo tras D1–D7 de TASK-1836,
  contexto interno verificado y gate interno activo; issuer permitido nunca basta por sí solo.
- Binding de persona por `(issuer, subject)` vía lane de Greenhouse (`external_identity_environments` +
  `identity_profile_source_links`); recheck de permisos y `grants_version` por contexto; cohorte nativa interna sin caché positiva.
  Cualquier caché posterior debe mantener revocación local efectiva ≤60 s (contrato TASK-1836).
- Tres tests de regresión obligatorios: (a) token externo + scope string internal-only → deny; (b) `roles`
  con string de escritura sin scope delegado → deny, también en Entra; (c) grant revocado con token vigente → deny.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (§Slice 0 gateway authorization-context contract)
- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/EFEONCE_MCP_AGENT_SKILL_ROUTER_V1.md`

Reglas obligatorias:

- El gateway sigue siendo adapter neutral: valida y delega; no accede a DB ni decide policy de dominio. El
  binding lo resuelve un reader del lane de Greenhouse por HTTP, nunca SQL en el gateway.
- NUNCA `clientId = azp ?? sub`; NUNCA fusionar `roles` en scopes.
- NUNCA despachar una tool sin `allowedIssuers` declarado; un registro sin el campo falla el arranque.
- El scope de escritura NUNCA se cablea al cliente público compartido (regla TASK-1308).
- Skills: `efeonce-mcp-platform` + `mcp-craft`; leer `../efeonce-mcp/AGENTS.md` antes de editar.

## Normative Docs

- `../efeonce-mcp/AGENTS.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md`
- `docs/tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md` (carril interno paralelo)

## Dependencies & Impact

### Depends on

- `TASK-1829`: issuer `https://auth.efeonce.org` emitiendo ES256 con claims `sub`, `azp`, `scope`, `gv`.
- `TASK-1631`: reader de binding `(environment, subject) → organization + grants + grants_version` expuesto en el lane `api/platform/ecosystem/*` `[verificar ruta final en TASK-1631]`.
- `../efeonce-mcp/src/config.ts` (`oauth.issuer` único hoy), `src/auth/token-verifier.ts`, `src/providers/types.ts`.

### Blocks / Impacts

- `TASK-1832` (canaries) y todos los writes federados gated por identidad delegada (EPIC-011 TASK-1720/1722, EPIC-022 grounded queries, EPIC-043 TASK-1824).
- `TASK-1813`: comparte `app.ts`/config; coordinar antes de editar; no absorber su discovery.
- Todos los providers: agregar `allowedIssuers` a cada tool registrada.

### Files owned

- `../efeonce-mcp/src/auth/token-verifier.ts` (reescritura a resolver por issuer)
- `../efeonce-mcp/src/auth/auth-context.ts` (nuevo)
- `../efeonce-mcp/src/auth/binding-resolver.ts` (nuevo, cliente HTTP del lane)
- `../efeonce-mcp/src/config.ts` (lista de issuers)
- `../efeonce-mcp/src/providers/types.ts` (`allowedIssuers`, `authorityClass`)
- `../efeonce-mcp/src/providers/*.ts` (declaración por tool)
- `../efeonce-mcp/test/auth-verifier.test.ts`, `test/authorized-tools.test.ts`, `test/binding-resolver.test.ts`
- `src/mcp/greenhouse/tool-manifest.ts` (campo `allowedIssuers` si el manifest generado lo transporta `[verificar]`)

## Current Repo State

### Already exists

- Verificador multi-issuer en `src/auth/token-verifier.ts`, contexto tipado y policies en `src/auth/tool-policy.ts`; la interfaz single-issuer de agosto es antecedente histórico.
- Gate HTTP de scopes por tool derivado de `GREENHOUSE_SEO_WRITE_TOOLS`; guard de paridad bidireccional.
- Shim DCR y cliente público compartido en el carril Entra (ADR gateway §Delta 2026-08-06/09-02).
- **Desde `TASK-1828` (2026-09-04):** JWKS real del issuer externo en `https://auth.efeonce.org/.well-known/jwks.json`
  (2 `kid`, ES256, KMS HSM) y host publicado en el mismo front door del gateway.
- **Desde `TASK-1631` Slice 1 (2026-09-04):** reader `GET /api/platform/ecosystem/identity/binding` en el lane
  ecosystem de Greenhouse, verificado en staging.

### Gap

- Resolver, contexto tipado, policies por tool y reader de bindings ya están implementados y publicados.
- El carril nativo interno tiene canary real; falta completar la matriz externa, clientes y concurrencia.
- Providers sin adapter delegado permanecen fail-closed; aceptar el issuer no amplía su compatibilidad.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-mcp/src/auth/**` (gateway) + lane ecosystem de Greenhouse (reader de binding)
- Future candidate home: `remain-shared`
- Boundary: el gateway consume el reader por HTTP con su identidad workload; ningún provider recibe el token crudo; los providers reciben `AuthContext`
- Server/browser split: n/a (servicios)
- Build impact: none
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `../efeonce-mcp/src/config.ts` (issuers) y la declaración por tool; lectura del binding de `TASK-1631`
- Consumidores afectados: todos los providers del gateway; clientes MCP internos (Entra) y externos
- Runtime target: `worker` (Cloud Run `efeonce-mcp-gateway`, staging y production)

### Contract surface

- Contrato existente a respetar: `AuthInfo` actual mientras el flag esté OFF; scopes de `config.ts`; manifest generado
- Contrato nuevo o modificado: `AuthContext` (ADR federación), `ToolRegistration.allowedIssuers` + `authorityClass`, endpoint reader `GET …/ecosystem/identity/binding?environment=…&subject=…` `[verificar en TASK-1631]`
- Backward compatibility: `gated` (`MCP_NATIVE_AUTH_ENABLED`); con OFF el comportamiento Entra es byte-idéntico salvo la eliminación del fallback `azp ?? sub`, que se prueba como no-regresión
- Full API parity: n/a (transporte/autorización); la capability de grants es de `TASK-1631`

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna en el gateway (sin DB); lectura de `external_*` y `identity_profile_source_links` vía lane
- Invariantes que no se pueden romper:
  - `Una tool sin allowedIssuers no arranca el gateway.`
  - `Un token cuyo issuer no está configurado se rechaza antes de cualquier fetch.`
  - `roles nunca satisface un requisito de scope delegado y viceversa.`
  - `Un grants_version menor al vigente en el reader deniega aunque el token sea válido.`
- Write-target allowlist: `N/A — sin escrituras`
- Tenant/space boundary: organización derivada del binding, nunca de un claim autoafirmado
- Idempotency/concurrency: lectura; reader fresco por request, sin caché positiva; igualdad de `gv` y ledger `jti` antes de dispatch
- Audit/outbox/history: señales redactadas `mcp.auth.external_token_on_internal_tool`, `mcp.auth.revoked_still_dispatching`, `mcp.auth.unknown_issuer`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `MCP_NATIVE_AUTH_ENABLED=false`
- Backfill plan: none
- Rollback path: flag OFF + revisión anterior de Cloud Run (< 5 min)
- External coordination: env vars del gateway en `deploy.yml`; URL del reader y credencial workload

### Security and access

- Auth/access gate: JWKS por issuer + audience + exp + `allowedIssuers` + clase de autoridad + binding + `gv`
- Sensitive data posture: sin PII en el gateway; `subject` opaco; logs redactados
- Error contract: errores MCP/OAuth estándar; nunca el motivo detallado al cliente
- Abuse/rate-limit posture: Cloud Armor existente; caché de JWKS con límite de refetch

### Runtime evidence

- Local checks: `pnpm test` en `efeonce-mcp` con los tres tests de regresión
- DB/runtime checks: n/a en gateway; reader de binding verificado en Greenhouse
- Integration checks: token Entra sigue despachando `globe.producer.fleet.list`; token externo despacha una tool read-only allowlisted y es denegado en una internal-only
- Reliability signals/logs: las tres señales nuevas steady = 0 salvo tests
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio — N/A, sin tablas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — AuthContext y resolver por issuer (Entra only)

- Nuevo verificador que produce `AuthContext`; issuer único configurado; tests de no-regresión del canary interno; eliminación del fallback `azp ?? sub` y de la fusión de `roles`.

### Slice 2 — Calificación por tool

- `allowedIssuers` + `authorityClass` en `ToolRegistration`; arranque falla sin ellos; providers actualizados; test (a) y (b).

### Slice 3 — Segundo issuer y binding

- Issuer `auth.efeonce.org` detrás de flag; `binding-resolver` contra el lane; recheck de `gv`; test (c); señales.

## Out of Scope

- Emitir tokens (`TASK-1829`); discovery interno Entra (`TASK-1813`); grants y commands (`TASK-1631`).
- Escrituras Globe u otras tools nuevas.

## Detailed Spec

- Configuración por issuer conserva issuer/JWKS/audience/environmentId y perfil de verificación. La clase
  de población interna/externa se resuelve por contexto; no derivarla del issuer nativo común ni redefinir
  silenciosamente `issuer_class` persistido. Propuesta D3/D4 de TASK-1836, sujeta al mismo ADR.
- Verificación: leer `iss` no confiable sólo para seleccionar una configuración allowlisted, sin fetch
  arbitrario → verificar firma/issuer/audiencia/tiempos → construir contexto tipado. Tokens nativos
  internos requieren referencia de contexto firmada y `gv`; resolver y cotejar persona/cliente/recurso
  con el reader antes de dispatch. Tokens legacy sin contexto nunca se promueven a internos.
- Dispatch nativo: issuer permitido ∧ scope delegado requerido ∧ clase de autoridad válida ∧ contexto
  resuelto para persona/cliente/recurso ∧ relación elegible ∧ versión válida ∧ capability vigente del
  provider. Para contexto interno, gate interno activo. Roles ni `gv` aislado sustituyen esta conjunción.
  Carril Entra directo conserva su policy explícita sin mezclar roles con scopes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. Slice 3 no se habilita en producción hasta que `TASK-1829` esté en producción y `TASK-1631` tenga el reader vivo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión del canary interno Entra | MCP interno | medium | Slice 1 con flag OFF byte-idéntico salvo fallback; canary `globe.producer.fleet.list` antes y después | canary rojo |
| Token externo alcanza tool internal-only | MCP / Globe | low | `allowedIssuers` + test (a) bloqueante en CI | `mcp.auth.external_token_on_internal_tool` |
| Reader de binding caído deja pasar | MCP | low | fail-closed: sin binding no hay dispatch externo | `mcp.auth.binding_resolver_unavailable` |
| Caché de `gv` retrasa revocación | identity | medium | TTL ≤ 60 s + invalidación push opcional | `mcp.auth.revoked_still_dispatching` |
| Colisión de edición con `TASK-1813` | repo hermano | medium | coordinar por sesión; ownership por archivo | conflictos en `app.ts` |

### Feature flags / cutover

- `MCP_NATIVE_AUTH_ENABLED` y `MCP_NATIVE_INTERNAL_AUTH_ENABLED` (ambos default `false`) declarados en `../efeonce-mcp/.github/workflows/deploy.yml`. El segundo requiere el primero; OFF interno deniega tokens internos ya emitidos, conservando el carril externo permitido por su propia policy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revisión anterior de Cloud Run | < 5 min | sí |
| Slice 2 | revisión anterior | < 5 min | sí |
| Slice 3 | flag OFF + revisión anterior | < 5 min | sí |

### Production verification sequence

1. Staging: canary interno verde con Slice 1 y 2.
2. Staging: flag ON; token de `auth.efeonce.org` de una persona de prueba despacha una tool read-only allowlisted; tests (a)(b)(c) contra runtime real.
3. Producción: Slice 1 y 2 con cooldown 24 h; flag ON sólo al iniciar `TASK-1832`.

### Out-of-band coordination required

- Env vars y credencial workload del gateway hacia el lane de Greenhouse; coordinación con `TASK-1813`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Auditoría MCP de TASK-1836 §12/14: verificar discovery root/path y 401 hacia issuer correcto, scopes mínimos/challenge 403, aislamiento concurrente de listado/dispatch/handles y rechazo del contexto nuevo por verifier viejo antes de activar.

- [ ] Contexto interno nativo de TASK-1836 permite sólo tools autorizadas; un sujeto externo del mismo issuer queda denegado, y Entra directo mantiene compatibilidad.

- [x] `AuthContext` expone `issuer`, `subject`, `clientId`, `audience`, `delegatedScopes`, `roles`, `expiresAt`, `grantsVersion` sin fallback `azp ?? sub` ni fusión de `roles`. Evidencia: `auth-verifier.test.ts` + `authorized-tools.test.ts`, repetición 2026-09-06: 9 passed/0 skipped.
- [x] Un token con issuer no configurado se rechaza sin ningún fetch de JWKS (test). Evidencia: `auth-verifier.test.ts` + `authorized-tools.test.ts`, repetición 2026-09-06: 9 passed/0 skipped.
- [x] Todas las tools registradas declaran `allowedIssuers` y `authorityClass`; el arranque falla si falta. Evidencia: `auth-verifier.test.ts` + `authorized-tools.test.ts`, repetición 2026-09-06: 9 passed/0 skipped.
- [ ] Test (a): token externo con scope string internal-only → deny en dispatch con señal redactada.
- [ ] Test (b): `roles` con string de escritura y sin scope delegado → deny, también en el issuer Entra.
- [x] Test (c): grant revocado con token vigente → deny por `grants_version` en ≤60 s. Canary interno TASK-1836: retiro selectivo del grant ≤11 s, restituido con vencimiento original; ver runbook.
- [ ] El canary interno `globe.producer.fleet.list` con Entra no cambia de comportamiento.
- [ ] Persona externa resuelta sólo por `(issuer, subject)` vía registry; ninguna búsqueda por `client_id` ni email.

## Verification

- `pnpm test` y `pnpm build` en `../efeonce-mcp`
- canary interno + flujo externo en staging
- `pnpm mcp:manifest:check` en Greenhouse si el manifest cambia

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1626`, `TASK-1813`, `TASK-1720`, `TASK-1722`, `TASK-1824`
- [ ] `EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` con la sección multi-issuer

## Follow-ups

- Mantener reader fresco sin caché positiva. Cualquier futura caché exige demostrar revocación ≤60 s; no está habilitada como optimización por defecto.

## Open Questions

- Si el manifest generado transporta `allowedIssuers` o si se declara sólo en el gateway.

## Correction 2026-09-05 — contrato interno coherente

El slice interno consume D1–D7 de TASK-1836: referencia firmada de contexto, reader con permisos efectivos,
`gv` por contexto y gate de dispatch propio. No inferir población desde el issuer. La activación espera ADR
común, emisor/reader/verifier/UI compatibles y readback; preservar el slice externo y el carril Entra directo.


## Readback de dependencias — 2026-09-05

El hook de ejecución detectó el blocker histórico de flags OFF. Se contrastó con runtime: `/readyz`
200, `oauth:true`, postgres/kms/activeKey ok; Cloud Run declara OAuth/personas `true` en revisión
`auth-server-00007-cxb`. El reader canónico PG devuelve `efeonce-auth`, `active`, issuer
`https://auth.efeonce.org`, audiencia `https://mcp.efeonce.org/mcp`. Esos blockers ya no describen
la preparación del backend; se conservan los deltas históricos como historia.

Readback inicial del gateway, anterior a la implementación local descrita en Status real: `src/auth/token-verifier.ts` mezcla `scp`, `scope` y `roles`,
y usa `azp ?? sub`. Discovery público mantiene endpoints de Entra. El contrato nativo no está integrado.
Ese readback inicial no acredita el estado del código posterior ni su promoción.


### Dependencias de rollout (no bloquean implementación local)

El rollout interno exige desplegar reader/emisor TASK-1836, integración UI TASK-1835, credencial workload del reader y canaries TASK-1832; no habilitar emisión nativa antes del consumer compatible.


## Evidencia local de integración — 2026-09-05

`pnpm check`: 109 passed, cero skipped, formato/typecheck/tests/build exitosos. Prueba HTTP MCP con JWT
ES256 firmado y reader simulado verifica aislamiento concurrente, organización ajena denegada, revocación
de B sin afectar A y OFF con token vigente. La paridad introspecta las 37 tools registradas. Build Docker
`efeonce-mcp:task1831-local` exitoso; smoke local health/discovery 200 y MCP sin token/token inválido 401. No hubo push ni deploy.

Pruebas adicionales JWKS: 112 tests totales passed, typecheck/build correctos. Refresh a 5 minutos,
última copia válida hasta 10 minutos desde descarga sólo ante red/timeout/5xx; sin extensión del TTL
por fallos. Rotación exitosa reemplaza snapshot y no recupera claves retiradas desde snapshots previos.

Pendientes: señales operativas de denegación, compatibilidad de providers
que aún rechazan población nativa, reader/emisor desplegados, credencial workload gobernada, UI y
canaries reales. La validación local no acredita la latencia de revocación en producción.

Smoke repetido después del cambio JWKS sobre imagen reconstruida: health y protected-resource 200,
MCP sin token/token inválido 401, issuer nativo primero y shim conservado con flags nativos ON en
configuración sintética local. La prueba de metadata AS con tenant sintético devolvió 500 sanitizado
porque no existe upstream OIDC; no se acredita como éxito de discovery AS. Esa separación de scopes
sí está probada con upstream simulado en la prueba HTTP. Contenedor eliminado y Colima detenido al
final, restaurando su estado inicial. `pnpm check` final: 112 passed, cero skipped, exit 0.

Verificación posterior: 114 passed, cero skipped, formato/typecheck/build correctos. Discovery SEO
ahora envía `market` en query además del body, conforme al reader de Greenhouse. Un test HTTP local
usa JWT ES256 y adapters reales para consultar entitlement propio con `hasModule=false` y rechazar
organización ajena antes del provider. Binding y respuesta de Greenhouse son simulados: no acredita
login, PG ni canary live; no compra datos. El contenedor anterior requiere rebuild con estos cambios.

## Ajuste pre-cohorte: revocación por token — 2026-09-05

El contexto vigente no basta: el gateway interno exige también `jti` firmado (base64url22 del emisor)
y lo transmite al reader existente, que verifica ledger OAuth y dimensiones. No usa introspección ni
cache positiva. Revocar familia/consent debe denegar dispatch, además de refresh, sin invalidar otra
familia que comparte contexto. Pruebas HTTP locales verifican deny antes del provider; el canary real
sigue pendiente y ambos flags se conservan OFF durante el despliegue de compatibilidad.
