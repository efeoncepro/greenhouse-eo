# TASK-2003 — Marketing Studio: escritura por MCP con identidad delegada (núcleo)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-05 — TASK-2002 calendario de activaciones

- TASK-2002 dejó en producción de Studio la UI de escritura del calendario sobre las mismas operaciones del registro:
  cliente `apps/web/src/components/activations/write/client.ts` con un `fetch` literal por operación (paridad UI↔API
  exigida por `operations-parity.test.ts`), `Idempotency-Key` nueva por intento, `If-Match` con la revisión y vista previa
  con `dryRun`. Las escrituras MCP de esta task deben cubrir esas mismas operaciones (plan, edit, reprogramar, cancelar,
  vincular, crear desde ejecución).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
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
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-10-04 por decisión del operador: núcleo de escritura agent-friendly separado de TASK-1899 (retirada); la implementa Codex`
- Rank: `TBD — independiente: no bloquea TASK-1905/2001/2002; habilita sus escrituras por MCP cuando esté vivo`
- Domain: `platform`
- Blocked by: `none` (TASK-1894 Entregables A y B en producción desde 2026-10-02; las capabilities marketing_studio.asset.write y .campaign.write están en develop y salen a producción con el release de Greenhouse de esta task)
- Branch: `efeonce-marketing-studio main (actor delegado) · Greenhouse develop (canje, clientes, scope, manual servido) · efeonce-mcp rama + PR (carril de escritura); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Habilita que un agente **escriba** en Marketing Studio por Efeonce MCP con la identidad de la persona que lo usa, sin
pasos extra. Hoy por MCP sólo se lee: el gateway filtra las tools de escritura (`MARKETING_STUDIO_FEDERATED_TOOLS` =
lecturas). Esta task agrega las cuatro piezas mínimas: el scope de escritura en Entra; el canje de Greenhouse por
capability exacta; Studio registrando a la persona (vía MCP) como autora del cambio; y el gateway federando las tools
de escritura `T1`. Las **aprobaciones (`T2`) quedan fuera**: siguen por CLI o UI, y su confirmación con
`proposalDigest` sigue en TASK-1899, retirada. Las tasks de producto (TASK-1905, 2001, 2002…) avanzan en paralelo con sus tools en
el manifiesto; sus escrituras se federan en cuanto este carril esté vivo.

## Why This Task Exists

- Decisión del operador (2026-10-04): Efeonce es **agent-friendly**; todo lo de EPIC-049 nace Full API Parity y con
  sus tools en el MCP, escrituras incluidas. Ese mismo día retiró TASK-1899 porque su flujo de confirmación para
  aprobaciones frenaría a los agentes durante la construcción de Studio.
- Sin este núcleo, las tools de escritura existen en el manifiesto (44 tools desde API 1.4.0) pero el gateway las
  filtra, y si se federaran sin identidad delegada Studio registraría al **gateway** como autor (prohibido por el ADR de
  fuente única: el actor de una escritura es la persona).
- TASK-1905, TASK-2001 y TASK-2002 lo necesitan para que sus escrituras se operen por MCP, pero no lo esperan para avanzar.

## Goal

- Un agente MCP, actuando por una persona con la capability correspondiente, ejecuta cualquier tool de escritura `T1`
  de Studio (subir versión, crear y editar campaña, concepto, copy, anuncio, plan, posts…) sin confirmaciones extra.
- Studio audita «persona X vía MCP» con la capability que la autorizó; nunca al gateway ni al agente como actor.
- Los permisos del agente son los de la persona: quien no tiene la capability recibe `forbidden`.
- Las tools `T2` (aprobaciones y destructivas) no se federan todavía y responden como hoy por API.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (actor = persona; nunca el gateway)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (§4.1 paridad y ejecución por agentes; §15 regla de MCP obligatoria)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§4.1 agentes y MCP; §7.3/7.4 kernel y commands)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` y `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §22
- **Diseño de referencia:** TASK-1899 Slices 1–4 (`docs/tasks/to-do/TASK-1899-marketing-studio-mcp-writes-approvals.md`). Esta task reutiliza ese diseño **excepto** lo marcado como fuera de alcance; no lo rediseña.

Reglas obligatorias:

- El actor de toda escritura por MCP es la persona (identidad revalidada en Greenhouse), con `authority.via = 'mcp'`; el token nunca se registra.
- Canje por **capability exacta** de cada tool (un cliente de canje por capability, `requireOnPrivilegedAction = true`).
- Una tool `writes` sin contrato de canje, transporte o scope de escritura no se registra (guard del gateway).
- Escrituras con timeout ⇒ `upstream_timeout_unknown_outcome`, nunca reintento automático.
- Errores `{ error (es-CL), code, actionable }`; `null` = ausente; versiones sólo en el `catalog:`; manifiestos regenerados, nunca a mano.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- Skills `efeonce-marketing-studio`, `efeonce-mcp-platform`, `mcp-craft`, `greenhouse-production-release`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` § Provider Marketing Studio

## Dependencies & Impact

### Depends on

- TASK-1894 Entregables A y B (en producción): kernel, commands `T1`, tools de escritura en el manifiesto, scopes de API `studio:assets:write` / `studio:write`, puerto de autoridad que niega por defecto.
- TASK-1891 (complete): provider `marketing-studio`, canje RFC 8693, cliente `efeonce-mcp-marketing-studio`.

### Blocks / Impacts

- **TASK-1905, TASK-2001, TASK-2002**: avanzan en paralelo; sus escrituras se federan sobre este carril cuando esté vivo (no lo esperan).
- **TASK-1899** (retirada): conserva sólo la confirmación de `T2` (`proposalDigest`), la capability `marketing_studio.campaign.approve` y la federación de aprobaciones, para cuando el operador la retome.
- **TASK-1895**: la UI y el MCP escriben por los mismos commands.

### Files owned

- Greenhouse: `src/lib/sister-platforms/mcp-token-exchange.ts`, `src/lib/sister-platforms/oauth-broker.ts`, `src/lib/auth-server/oauth/scopes.ts`, migración de clientes de canje, `docs/mcp/skills/marketing-studio/SKILL.md`, tests asociados
- Studio: `apps/web/src/server/delegated-actor.ts` (nuevo), `apps/web/src/server/runtime.ts`, `packages/domain/src/actor.ts`, `packages/contracts/src/errors.ts`
- Gateway: `src/providers/marketing-studio.ts`, `src/providers/marketing-studio-tool-parity.ts`, `src/providers/marketing-studio-exchange-contracts.ts` (nuevo), `src/auth/tool-policy.ts`, `src/config.ts`, `src/app.ts`, `src/mcp.ts`, `.github/workflows/deploy.yml`, `scripts/marketing-studio-write-session-canary.mjs` (nuevo)

## Current Repo State

### Already exists

- Gateway (`origin/main` `454d80eb6`, v1.10.0): `MARKETING_STUDIO_FEDERATED_TOOLS = manifest.tools.filter(t => !t.writes)` en `marketing-studio-tool-parity.ts`; `call()` rechaza `writes` y no-`GET` (`marketing-studio.ts:227`); canje con `scope = marketing_studio.campaign.read` y cliente `efeonce-mcp-marketing-studio`.
- Greenhouse: `authorizeMarketingStudio` = `can(persona, 'marketing_studio.campaign.read', 'read', 'tenant')`; capabilities `marketing_studio.asset.write` y `.campaign.write` sembradas y con grant en `develop` (`9d0d698d4`), sin release a producción.
- Studio: actores `anonymous_open | api_client | user | operator_cli`; el kernel niega a `user` (sesión) hasta TASK-1898; `api_client` escribe con scope; manifiesto 44 tools con `class: 'write' | 'approve'` y `riskTier`.
- TASK-1899: diseño completo de los Slices 1–4 (retirada el 2026-10-04; Codex revirtió su implementación local, sin rollout).

### Gap

- Sin scope de escritura en Entra, sin clientes de canje por capability de escritura, sin actor delegado en Studio, sin carril de escritura en el gateway.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: Greenhouse (canje y scope), `efeonce-marketing-studio` (actor delegado en la web), `efeonce-mcp` (provider)
- Future candidate home: `remain-shared`
- Boundary: contrato de canje por capability (Greenhouse) → cabecera `Efeonce-Delegated-Token` → adaptador de actor delegado de Studio; consumidores: provider `marketing-studio` del gateway
- Server/browser split: no hay navegador; tokens sólo entre servidores, nunca en logs
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (identidad, autorización y escrituras externas en producción)
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_core.sister_platform_oauth_clients` (clientes nuevos), scope en la app Entra «Efeonce MCP Resource», `studio.audit_event` (actor delegado)
- Consumidores afectados: agentes por Efeonce MCP (Claude, Codex, Nexa), Studio, gateway
- Runtime target: staging → production (Vercel Greenhouse, Vercel Studio, Cloud Run gateway, Entra)

### Contract surface

- Contrato existente a respetar: canje RFC 8693 de TASK-1891, `sisterPlatformOAuthPolicyV1Schema`, kernel de commands de TASK-1894, manifiesto `studio-tool-manifest.v1`.
- Contrato nuevo o modificado (de TASK-1899 Slices 1–4, **sin** lo marcado fuera de alcance):
  - **Conexión real (revisión de Codex, 2026-10-04):** el carril se prueba desde la conexión que el operador usa a diario (conector de Efeonce MCP en Claude y en Codex), no sólo agregando el scope al servidor. El Slice 0 determina qué cliente y qué identidad usa esa conexión: si es el cliente público Entra (PKCE), su consentimiento debe poder obtener `efeonce.mcp.marketing_studio.write`; si es la identidad nativa de Efeonce ID, hoy la política del gateway la excluye para Studio (`marketing_studio_native_policy_missing`) y el grant nativo debe delegar las capabilities de Studio (nuevo consentimiento, decisión D10 del ADR de autoridad nativa). Sin esa ruta probada, la task no está completa.
  - Scope Entra `efeonce.mcp.marketing_studio.write` (consentimiento de administrador) en la app «Efeonce MCP Resource».
  - Greenhouse: contratos de canje `asset.write` y `campaign.write` con input scope de **escritura**, y `asset.download` con input scope de **lectura** (`efeonce.mcp.read`, como en el diseño de TASK-1899: descargar no es escribir); uno por capability, cliente propio; `authorizeMarketingStudio(tenant, capability, action)`; revalidación en `userinfo` para clientes `resourceFamily = 'marketing_studio'`.
  - Studio: `issueOriginalDownload` (`packages/domain/src/media/download.ts`, hoy sólo acepta `actor.kind === 'api_client'`) acepta también al actor delegado `user` con `authority.capabilities` que incluya `marketing_studio.asset.download`, manteniendo el scope del `api_client` del gateway; sin esto, las descargas por MCP se pierden.
  - Studio: cabecera `Efeonce-Delegated-Token` aceptada sólo desde `api_client` confiable (`STUDIO_DELEGATION_TRUSTED_API_CLIENT_IDS`) con `STUDIO_DELEGATED_ACTOR_ENABLED`; actor `user` con `authority { kind: 'delegated_oauth', via: 'mcp', capabilities }`; errores `delegation_required`, `delegation_invalid`, `delegation_insufficient`, `delegation_unavailable`.
  - Gateway: tabla `capability → { clientId, inputScope, forwardDelegatedToken }`; transporte de escritura (`Idempotency-Key`, `If-Match`, `dryRun`, cuerpo); federación de tools `writes` con `riskTier = T1`; flag `MARKETING_STUDIO_MCP_WRITES_ENABLED`.
- **Fuera de alcance (queda en TASK-1899):** capability `marketing_studio.campaign.approve` y su cliente de canje; `proposalDigest` y la confirmación de `T2`; federación de tools `class: 'approve'` o `riskTier = T2` (siguen fuera del filtro del gateway).
- Backward compatibility: `gated` — con los flags OFF, todo sigue como hoy; las lecturas no cambian.
- Full API parity: las escrituras por MCP usan los mismos commands que la API y la CLI; ninguna lógica nueva en el gateway.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.sister_platform_oauth_clients` (3 filas), `studio.api_client` (cliente del gateway con scopes de escritura), `studio.audit_event` (actor delegado).
- Invariantes que no se pueden romper:
  - El actor de una escritura por MCP es la persona; el gateway sólo aparece como canal.
  - Cada tool canjea su capability exacta; una capability distinta en la respuesta del canje ⇒ rechazo.
  - Una persona sin la capability no escribe por MCP (403), aunque el gateway tenga scope.
  - Las tools `T2` no se federan en esta task.
  - Ningún token, cuerpo de respuesta ni URL firmada en logs.
- Write-target allowlist: `N/A`.
- Tenant/space boundary: organización del `api_client` del gateway ∩ campañas visibles; `organizationId` nunca amplía.
- Idempotency/concurrency: `Idempotency-Key` y `If-Match` del kernel; el gateway no reintenta escrituras.
- Audit/outbox/history: `audit_event` de Studio con persona y `authority.kind`; audit de canje en Greenhouse (`userinfo_reject` cuando corresponde).

### Migration, backfill and rollout

- Migration posture: `additive` (filas de clientes de canje; nuevo `api_client` del gateway).
- Default state: flags OFF — `STUDIO_DELEGATED_ACTOR_ENABLED` (Studio) y `MARKETING_STUDIO_MCP_WRITES_ENABLED` (gateway).
- Backfill plan: `N/A`.
- Rollback path: flag del gateway OFF + dispatch (las escrituras dejan de federarse) → flag de Studio OFF; revocar el `api_client` nuevo; las filas de canje quedan inertes.
- External coordination: cambio de Entra (scope nuevo); release de Greenhouse; allowlist `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS`; secreto `marketing-studio-mcp-gateway-token` con versión nueva; deploy manual del gateway.

### Security and access

- Auth/access gate: token Entra de la persona con `efeonce.mcp.marketing_studio.write` → canje por capability → `userinfo` revalidado por Studio.
- Sensitive data posture: tokens de identidad (nunca registrados); sin PII nueva.
- Error contract: los cuatro códigos `delegation_*` en el `ERROR_CATALOG` (es-CL); mapa de errores del gateway de TASK-1899 §Mapa de errores.
- Abuse/rate-limit posture: canje por llamada (TTL 300 s, sin caché); sin reintento en escrituras.

### Runtime evidence

- Local checks: tests de Greenhouse (canje por capability, cliente con dos scopes rechazado, persona sin capability 403, `userinfo` con revocación), de Studio (actor delegado: 200/401/403/5xx/timeout, cliente no confiable, capability ausente, redacción del token) y del gateway (guard, transporte, flag OFF, `authorized-tools`).
- DB/runtime checks: filas de canje parseadas por `sisterPlatformOAuthPolicyV1Schema` en staging y producción.
- Integration checks: sesión MCP real con token Entra humano en staging y producción.
- Reliability signals/logs: `studio_request` con `apiClientId` del gateway y actor delegado; audit de Greenhouse.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist del dominio donde exista: `N/A`.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Ninguna lógica de negocio nueva: las escrituras por MCP llaman los commands existentes de Studio.
- [ ] Autorización fina por capability exacta en el canje; nunca admin-coarse.
- [ ] Camino programático: Efeonce MCP, además de API y CLI ya existentes.
- [ ] Un primitive, muchos consumers: UI, API, CLI y MCP escriben por el mismo kernel.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Conexión real del operador

- Identificar el cliente y la identidad del conector de Efeonce MCP que el operador usa en Claude y en Codex (Entra
  PKCE o identidad nativa de Efeonce ID) y cómo obtendrá el scope de escritura (consentimiento). Si es la identidad
  nativa, agregar el alcance necesario para que su grant delegue las capabilities de Studio (y dejar
  `marketing_studio_native_policy_missing` sólo para lo no delegado). Documentar el resultado antes del Slice 1.

### Slice 1 — Greenhouse: canje por capability y manual

- TASK-1899 Slice 1 **sin** `campaign.approve`: tres contratos de canje (`asset.download` con input scope de lectura; `asset.write` y `campaign.write` con input scope de escritura), tres clientes por migración (patrón `efeonce-mcp-marketing-studio`, `requireOnPrivilegedAction = true`, `taskId = 'TASK-2003'`), `authorizeMarketingStudio(tenant, capability, action)`, revalidación en `userinfo`, scope en `EFEONCE_MCP_WRITE_SCOPES` (no publicado en `PUBLISHED_SCOPES_SUPPORTED`).
- Manual servido: flujo de escritura por MCP (subida en dos pasos, `Idempotency-Key`, `If-Match`, `dryRun`, qué hacer ante 412/428/409/`upstream_timeout_unknown_outcome`), y que **aprobar** sigue siendo por CLI/UI; `pnpm mcp:skills:generate` + `check`.
- Release de Greenhouse por el control plane (incluye las capabilities de escritura hoy en `develop`) y allowlist de los tres clientes.

### Slice 2 — Entra: scope de escritura

- TASK-1899 Slice 2 tal cual (leer arreglo vigente, agregar uno, releer y comprobar conteo; no tocar clientes).

### Slice 3 — Studio: actor delegado

- TASK-1899 Slice 3 **sin** la confirmación (`proposalDigest`, `confirmation_*`): `delegated-actor.ts`, `authority` en el actor, errores `delegation_*`, nuevo `api_client` del gateway con `studio:read`, `studio:assets:download`, `studio:assets:write`, `studio:write` (versión nueva del secreto), env vars con el flag OFF, push.
- El kernel acepta al actor `user` con `authority.via = 'mcp'` para `T1`; `T2` sigue respondiendo `confirmation_required` (hasta TASK-1899).
- `issueOriginalDownload` acepta al actor delegado con la capability de descarga (test: delegado con capability 200; sin capability 403; anónimo sigue 403 `download_disabled`).

### Slice 4 — Gateway: carril de escritura

- TASK-1899 Slice 4 con el filtro nuevo: `MARKETING_STUDIO_FEDERATED_TOOLS` = lecturas + escrituras `riskTier = T1`; tools `approve`/`T2` fuera. Tabla de contratos de canje, transporte, flag `MARKETING_STUDIO_MCP_WRITES_ENABLED` en el mismo paso del deploy, canary de sesión real, bump minor, PR.

### Slice 5 — Rollout y cierre

- Staging → producción en orden; sesión MCP real; documentación; skill.

## Out of Scope

- Aprobaciones por MCP (`T2`), `proposalDigest`, capability `marketing_studio.campaign.approve`: TASK-1899 (retirada).
- Identidad propia de agentes por rol y corridas programadas: TASK-1914/1915/1917.
- Login web de Studio (TASK-1898).
- Tools nuevas de catálogo, activaciones o calendario: nacen federadas en TASK-1905/2001/2002 sobre este carril.

## Detailed Spec

El diseño de detalle (contratos de canje, transporte, mapa de errores, canary) es el de TASK-1899 §Detailed Spec, con
estas diferencias: tres capabilities en vez de cuatro (sin `campaign.approve`); filtro del gateway por `riskTier = T1`
en vez de federar todo `writes`; sin `proposalDigest` ni errores `confirmation_*` nuevos (el kernel ya responde
`confirmation_required` a `T2` por API).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (release de Greenhouse + allowlist) → Slice 2 (Entra) → Slice 3 (Studio, flag OFF) → Slice 4 (gateway, flag OFF) → Slice 5.
- Flags: se prenden Studio → gateway; se apagan gateway → Studio.
- El `api_client` anterior del gateway se revoca sólo después de verificar la revisión nueva con el secreto nuevo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Escritura auditada como el gateway | Studio | low | cabecera obligatoria para escribir; sin ella `delegation_required` | test + revisión de `audit_event` en el canary |
| Cambio de Entra borra scopes existentes | Entra | medium | leer → agregar → releer con conteo; escalar si no cuadra | conteo antes/después |
| Persona sin capability escribe | identidad | low | canje por capability exacta + `userinfo` revalidado | caso de denegación en el canary |
| Escritura duplicada por reintento | Studio | low | `Idempotency-Key`; gateway sin reintento | `idempotency_key_reused` |
| Release de Greenhouse lleva cambios ajenos | release | medium | control plane + preflight; release acotado | preflight |

### Feature flags / cutover

- `STUDIO_DELEGATED_ACTOR_ENABLED` (Vercel de Studio) y `MARKETING_STUDIO_MCP_WRITES_ENABLED` (variable de GitHub del gateway, mismo paso del deploy), OFF por defecto; filas en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | quitar los clientes de la allowlist + redeploy; `migrate down` de las filas | 15 min | sí |
| Slice 2 | quitar el scope de la app Entra (mismo procedimiento leer/escribir/releer) | 10 min | sí |
| Slice 3 | flag OFF; revocar el `api_client` nuevo | 5 min | sí |
| Slice 4 | flag OFF + dispatch; o `update-traffic` a la revisión anterior | 10 min | sí |

### Production verification sequence

1. Staging: canje de prueba por cada capability; Studio con flag ON en preview; gateway en staging si existe, si no, prueba de contrato.
2. Producción: release de Greenhouse → allowlist → Entra → Studio (flag OFF) → gateway (flag OFF) → flag Studio ON → flag gateway ON.
3. Sesión MCP real **desde el conector que usa el operador** (Claude o Codex): crear concepto y copy en la sandbox de producción gobernada por Studio (o una campaña creada por `createCampaign`), subir una versión a una pieza, editar con `If-Match`; verificar `audit_event` con la persona y `via: mcp`; persona sin capability ⇒ `forbidden`; tool `T2` ausente.
4. Revocar el `api_client` anterior.

### Out-of-band coordination required

- Autorización explícita del operador para: release de Greenhouse, cambio en Entra, push de Studio, merge y deploy del gateway.
- Token Entra humano para el canary (sesión PKCE; ver `operations.md` de la skill).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un agente por Efeonce MCP ejecuta tools de escritura `T1` de Studio en nombre de una persona con la capability, y `studio.audit_event` registra a la persona con `authority.via = 'mcp'`.
- [ ] Una persona sin la capability recibe `forbidden` por MCP; un token canjeado para otra capability se rechaza.
- [ ] Sin `Efeonce-Delegated-Token`, el gateway no puede escribir (`delegation_required`); el token nunca aparece en logs.
- [ ] Las tools `approve`/`T2` no están federadas; por API siguen respondiendo `confirmation_required`.
- [ ] La sesión MCP de verificación sale de la conexión que el operador usa habitualmente (conector de Claude o Codex), no de un token armado aparte.
- [ ] `studio.asset.download` sigue funcionando por MCP con el actor delegado (canje de lectura).
- [ ] Con los flags OFF, el comportamiento es idéntico al de hoy.
- [ ] Tests de Greenhouse, Studio y gateway verdes; `pnpm check`/`pnpm build` de Studio, `pnpm check` del gateway y gates de Greenhouse verdes.
- [ ] Sesión MCP real en producción con evidencia registrada; manual servido y skill actualizados.

## Verification

- Greenhouse: `pnpm test` focal (`mcp-token-exchange`, `oauth-broker`, `scopes`), `pnpm mcp:skills:check`, `pnpm local:check`
- Studio: `pnpm check`, `pnpm build`
- Gateway: `pnpm check`, `pnpm surface:baseline`
- Canary de sesión MCP real

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] Skill `efeonce-marketing-studio` (+ espejo Codex), runbook del MCP y `FEATURE_FLAG_STATE_LEDGER.md` actualizados

## Follow-ups

- Aprobaciones por MCP con confirmación (TASK-1899, cuando el operador la retome).
- Federación de `studio.asset.download` queda incluida aquí (capability `asset.download`); verificar que el follow-up de TASK-1893 se cierre con esta task.
