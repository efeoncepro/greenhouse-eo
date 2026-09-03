# TASK-1831 — Efeonce MCP Gateway Multi-Issuer Authorization Context

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Status real: `Especificación; contrato AuthContext diseñado en TASK-1631 Slice 0 (2026-08-05), sin código`
- Rank: `TBD`
- Domain: `platform|identity|integration`
- Blocked by: `TASK-1829 (token ES256 real en staging); TASK-1631 (resolver de bindings y grants_version)`
- Branch: `efeonce-mcp main; Greenhouse develop para el lane de bindings; checkout compartido de cada repo; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convertir el verificador single-issuer del gateway (`../efeonce-mcp/src/auth/token-verifier.ts`, 40 líneas,
`clientId = azp ?? sub`, `scopes = scp ∪ scope ∪ roles`) en un resolver por issuer que produce el
`AuthContext` de seis campos del ADR de federación, califica cada tool por `allowedIssuers` y clase de
autoridad, resuelve la persona por `(issuer, subject)` a través del registry de environments y rechequea
`grants_version` antes del dispatch. Entra sigue como issuer interno intacto; `auth.efeonce.org` entra como
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
  (incluido el write de fondeo) declara sólo Entra.
- Binding de persona por `(issuer, subject)` vía lane de Greenhouse (`external_identity_environments` +
  `identity_profile_source_links`); recheck de `grants_version` con caché ≤ 60 s; revocación efectiva < 5 min.
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
- `../efeonce-mcp/test/auth/**` (nuevo)
- `src/mcp/greenhouse/tool-manifest.ts` (campo `allowedIssuers` si el manifest generado lo transporta `[verificar]`)

## Current Repo State

### Already exists

- Verificador single-issuer y `AuthInfo = { token, clientId, scopes, expiresAt }` (verificado 2026-08-05).
- Gate HTTP de scopes por tool derivado de `GREENHOUSE_SEO_WRITE_TOOLS`; guard de paridad bidireccional.
- Shim DCR y cliente público compartido en el carril Entra (ADR gateway §Delta 2026-08-06/09-02).

### Gap

- Sin resolver por issuer, sin `AuthContext`, sin `allowedIssuers`, sin recheck de grants.
- Sin reader de binding en el lane de Greenhouse (lo entrega `TASK-1631`).

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
- Backward compatibility: `gated` (`OAUTH_EXTERNAL_ISSUER_ENABLED`); con OFF el comportamiento Entra es byte-idéntico salvo la eliminación del fallback `azp ?? sub`, que se prueba como no-regresión
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
- Idempotency/concurrency: lectura; caché de binding por `(issuer, subject)` con TTL 60 s y invalidación por `gv`
- Audit/outbox/history: señales redactadas `mcp.auth.external_token_on_internal_tool`, `mcp.auth.revoked_still_dispatching`, `mcp.auth.unknown_issuer`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `OAUTH_EXTERNAL_ISSUER_ENABLED=false`
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

- `config.issuers: Array<{ issuer, jwksUri, audience, environmentId, kind: 'internal'|'external' }>`.
- Verificación: decodificar header → `iss` → buscar issuer → JWKS (`jose.createRemoteJWKSet` con caché) → `jwtVerify` con `audience` → construir `AuthContext`. Para `kind: external`, `gv` obligatorio.
- Dispatch: `tool.allowedIssuers.includes(ctx.issuer)` ∧ autoridad según `authorityClass` ∧ (external ⇒ binding active ∧ `ctx.grantsVersion === binding.grantsVersion` ∧ capability de la tool ∈ grants).

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

- `OAUTH_EXTERNAL_ISSUER_ENABLED` (default `false`) declarado en `../efeonce-mcp/.github/workflows/deploy.yml`; fila en el ledger de Greenhouse con runtime `efeonce-mcp-gateway`.

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

- [ ] `AuthContext` expone `issuer`, `subject`, `clientId`, `audience`, `delegatedScopes`, `roles`, `expiresAt`, `grantsVersion` sin fallback `azp ?? sub` ni fusión de `roles`.
- [ ] Un token con issuer no configurado se rechaza sin ningún fetch de JWKS (test).
- [ ] Todas las tools registradas declaran `allowedIssuers` y `authorityClass`; el arranque falla si falta.
- [ ] Test (a): token externo con scope string internal-only → deny en dispatch con señal redactada.
- [ ] Test (b): `roles` con string de escritura y sin scope delegado → deny, también en el issuer Entra.
- [ ] Test (c): grant revocado con token vigente → deny por `grants_version` en ≤ 60 s.
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

- Invalidación push de `gv` (evento outbox → gateway) si el TTL de 60 s resulta insuficiente.

## Open Questions

- Si el manifest generado transporta `allowedIssuers` o si se declara sólo en el gateway.
