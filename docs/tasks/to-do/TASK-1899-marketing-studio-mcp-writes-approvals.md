# TASK-1899 — Marketing Studio: escrituras y aprobaciones por MCP

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — reescrita sobre el ADR de fuente única e ingesta

- ADR gobernante: [`EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`](../../architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md)
  (`Accepted` 2026-09-26, commit `a8f43a01f`). La base de Studio + el bucket privado
  `efeonce-marketing-studio-originals` son la fuente única; OneDrive/SharePoint es taller; un final existe sólo cuando
  entró a Studio. **No hay espejo por Microsoft Graph.** Un command (`createAssetVersion`, tool
  `studio.asset.version.create`) y tres puertas (CLI, MCP, UI). §9 del ADR asigna a esta task: tools MCP de subida y
  aprobación, clase de scope de escritura, identidad delegada de la persona y el protocolo `dryRun` → confirmación.
- **Reemplaza el diseño anterior de esta task** (token delegado emitido por `auth.efeonce.org` con audiencia Studio y
  dos clases de scope `write`/`approve`). El diseño vigente reutiliza el canje RFC 8693 de Greenhouse que ya sirve las
  lecturas en producción (TASK-1891), ahora **pidiendo la capability exacta de cada tool**, y hace viajar a Studio la
  identidad de la persona como el token canjeado, que Studio revalida en Greenhouse. Razones: una sola ancla de
  autoridad ya en producción, revocación evaluada en el momento del uso, cero cambios en el emisor nativo compartido
  por staging y producción, y el ADR fija una sola clase de escritura. El emisor nativo sigue `unsupported` para Studio.
- Reparto con TASK-1894 (su tabla «Operaciones y tools»): 1894 entrega los commands, las tools en el manifiesto, los
  scopes de API y las capabilities `marketing_studio.asset.write` y `marketing_studio.campaign.write`; **esta task
  siembra `marketing_studio.campaign.approve`**, implementa el actor delegado en el puerto de autoridad de Studio y el
  `proposalDigest`, y federa todo por MCP.
- Se incorpora a esta task la federación de `studio.asset.download` (Follow-up de TASK-1893): la tool existe en el
  manifiesto de Studio (API 1.2.0) y el gateway aún sincroniza el manifiesto 1.1.0 (12 tools).
- Lecciones del 2026-09-26 que esta task aplica: la política de un cliente de canje se valida con
  `sisterPlatformOAuthPolicyV1Schema` y exige `revocation.requireOnPrivilegedAction = true` (con `false` el canje
  responde 503 y el gateway lo muestra como `upstream_unavailable`; forward fix `20260926071321910`); un secreto
  condicional se monta en el mismo paso que corre `gcloud run deploy` (`efeonce-mcp#20`); tras una promoción fallida,
  `spec.traffic` puede quedar fijado en la revisión rota (`efeonce-mcp#21`).

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-049`
- Status real: `Diseno. Contrato cerrado por el ADR de fuente única (2026-09-26) y la regla de paridad del operador (2026-09-25): todo lo de la UI se puede por API y por MCP, incluidas las aprobaciones, que decide siempre una persona.`
- Rank: `TBD`
- Domain: `platform|identity`
- Blocked by: `TASK-1894 (commands de escritura y aprobación con dryRun, requestAssetVersionUpload + createAssetVersion, tools de clase write/approve en el manifiesto con método, cabeceras y requiresPerson, scopes de API studio:assets:write y studio:write, puerto de autoridad de Studio que niega por defecto, capabilities marketing_studio.asset.write y marketing_studio.campaign.write sembradas con grant). Las dependencias de federación de lecturas y de almacén de originales ya están cerradas (ver Dependencies & Impact). NO depende de TASK-1898: la identidad llega por el canje de Greenhouse, no por la sesión web de Studio.`
- Branch: `Greenhouse develop (canje, clientes OAuth, paridad de scopes, userinfo, manual servido, docs) · efeonce-mcp rama + PR a main (deploy por dispatch manual de deploy.yml, nunca automático al merge) · efeonce-marketing-studio main (actor delegado, digest de confirmación; push a main = deploy de producción); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Federa en el provider `marketing-studio` de `efeonce-mcp` todas las tools de escritura del manifiesto de Studio
(subida de finales en dos pasos, creación de versión y aprobaciones) y la lectura `studio.asset.download`, con una
clase de scope nueva, `efeonce.mcp.marketing_studio.write`. En cada llamada el gateway canjea el token Entra de la
persona en Greenhouse pidiendo **la capability exacta de la tool** y reenvía el token canjeado a Studio en la cabecera
`Efeonce-Delegated-Token`; Studio lo revalida en el `userinfo` de Greenhouse y audita a la persona, nunca al gateway.
Los bytes van del agente directo a GCS por URL firmada; toda aprobación exige `dryRun` → confirmación explícita con el
digest de la propuesta.

## Why This Task Exists

- El ADR declara a Studio + GCS fuente única y abre tres puertas al mismo command. La puerta MCP no existe: el gateway
  federa sólo 12 lecturas y su guard marca toda tool `writes: true` como `write_tool_without_scope_class`, así que
  ninguna escritura se federa hoy.
- Hoy el provider pide **siempre** `marketing_studio.campaign.read` (`MARKETING_STUDIO_GREENHOUSE_SCOPE` en
  `src/providers/marketing-studio.ts`) y el cliente `efeonce-mcp-marketing-studio` sólo admite ese scope
  (`assertFederatedClient` exige exactamente uno). Con eso, una persona que puede leer podría escribir o aprobar: la
  autoridad tiene que evaluarse por tool.
- Studio no conoce personas: con el bearer de servicio del gateway, cualquier escritura quedaría auditada al
  `api_client` del gateway, lo que el ADR §8 prohíbe («NUNCA registrar al gateway o a un agente como actor»).
- `studio.asset.download` quedó sin federar al cerrar TASK-1893.

## Goal

- Un agente MCP, actuando por una persona con `marketing_studio.asset.write`, sube un final (URL firmada → GCS) y crea
  su versión pendiente de revisión, y el `audit_event` de Studio registra a la persona.
- Una persona con `marketing_studio.campaign.approve` aprueba desde un agente sólo tras `dryRun` y confirmación con el
  `proposalDigest`; sin la capability, o sin confirmación, no se escribe nada.
- `studio.asset.download` responde por MCP con la capability `marketing_studio.asset.download` de la persona.
- Toda tool `writes: true` del manifiesto sincronizado está federada con su contrato de canje, o el guard falla
  nombrándola.
- Canary de sesión MCP real en producción sobre una campaña sandbox: allow, deny, confirmación ausente y alterada,
  reintento idempotente y conflicto de revisión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (ADR gobernante:
  §4.2 un command, tres puertas; §4.3 inferencia; §4.4 aprobación humana; §8 invariantes; §9 mapa)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (paridad UI → API → MCP; registro único de operaciones)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§Agentes, §7 originales)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (§«El scope de escritura NO se cablea al cliente
  público compartido»; Delta 2026-09-10 TASK-1852: escritura con autoridad humana delegada por canje)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md` (§0 manifiesto, §5 federar es parte de listo,
  §9 versión y superficie, §11 status en el mismo PR; «Escritura con autoridad humana delegada por exchange»)
- `docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` (D9 v2 base-only, D10: sumar Studio al emisor
  nativo exige consentimiento nuevo; por eso Studio sigue `unsupported` para el emisor nativo)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` §5.3 (agentes: `propose → confirm`, nodo `MS-N7`)

Reglas obligatorias:

- **Una sola clase de scope nueva**, `efeonce.mcp.marketing_studio.write`, para toda escritura y aprobación de Studio
  (una por radio de daño, nunca por capability). La diferencia entre subir y aprobar la decide la **capability de la
  persona** en Greenhouse, no el scope. Studio no publica ni lanza pauta: aprobar registra una decisión, no mueve
  dinero ni gasta proveedor.
- **La clase nunca se cablea al cliente PKCE público compartido** (`32617b87-e7ef-493a-838f-1ff3f0213b93`): no entra
  en su `requiredResourceAccess`, ni en el PRM, ni en `scopes_supported`, ni en `PUBLISHED_SCOPES_SUPPORTED`. Se
  descubre sólo por el `403 insufficient_scope` de la tool y llega por consentimiento dinámico de la persona.
- **La capability la elige la tool, nunca los argumentos.** El canje pide `tool.capability` del manifiesto; un argumento
  no puede cambiar la autoridad. Toda aprobación es una tool propia con `requiresPerson: true`.
- **Un cliente confidencial de canje por capability.** `assertFederatedClient` sigue exigiendo exactamente un scope por
  cliente; no se relaja esa guarda.
- **El actor auditado es la persona.** Studio acepta el token canjeado sólo desde el `api_client` del gateway, lo
  revalida en `userinfo` de Greenhouse en cada llamada (sin caché positiva) y escribe `actor = user`.
- **Ningún binario viaja por MCP ni por Vercel.** La tool entrega una URL firmada V4 de un solo objeto
  `originals/sha256/<2 primeros hex>/<sha256>`; el agente sube con su propio HTTP/CLI.
- El gateway sólo transporta: sin lógica de campañas, sin parsear nombres de archivo, sin decidir transiciones, sin
  generar `Idempotency-Key`, sin reintentar escrituras por su cuenta.
- Default OFF y fail-closed en Studio y en el gateway; un Studio o un canje degradado no rompe el discovery de otros
  providers.
- Bump minor del gateway + `pnpm surface:baseline` después de decidir el bump; `efeonce.gateway.status` reporta el
  carril de escritura en el mismo PR, probado por la puerta HTTP.

## Normative Docs

- Skills: `efeonce-marketing-studio` (contrato de mantenimiento obligatorio al cerrar), `efeonce-mcp-platform`,
  `mcp-craft` (anotaciones, descripciones de tools de escritura, errores), `greenhouse-backend`, `greenhouse-postgres`
  (migraciones de clientes OAuth), `greenhouse-secret-hygiene` (secreto del `api_client` rotado),
  `greenhouse-production-release` (release de Greenhouse), `greenhouse-qa-release-auditor`,
  `greenhouse-documentation-governor`.
- `.claude/skills/efeonce-marketing-studio/references/{program-ledger,architecture-map,contracts,operations,lessons}.md`
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md` §Provider Marketing Studio
- `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`
- `docs/operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md` (receta del canary de escritura con token humano)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `TASK-1894` (bloqueante): el manifiesto sincronizable de Studio trae las tools de su tabla «Operaciones y tools»
  con `writes: true`, `class` (`write` | `approve`), `requiresPerson`, `destructive`, `capability`, `apiScope`,
  método y cabeceras (`Idempotency-Key`, `If-Match`) — entre ellas `studio.asset.upload.request`,
  `studio.asset.version.create` (command `createAssetVersion`), `studio.asset.version.approve`,
  `studio.campaign.creative.approve`, `studio.campaign.media.authorize`, `studio.campaign.brief.approve` y
  `studio.media_plan.budget_line.approve`. Además: `dryRun` que devuelve diff y `revision` base sin escribir;
  `audit_event`; `API_SCOPES` con `studio:assets:write` y `studio:write`; el puerto de autoridad de personas que niega
  por defecto; capabilities `marketing_studio.asset.write` (grant: `efeonce_admin`, `efeonce_account`,
  `efeonce_operations`, `designer`) y `marketing_studio.campaign.write` sembradas con grant.
- `TASK-1891` (complete): provider `marketing-studio`, sync `pnpm studio:manifest:sync` con hash verificado al cargar,
  guard `marketing-studio-tool-parity.ts`, canje RFC 8693 y cliente `efeonce-mcp-marketing-studio`.
- `TASK-1893` (complete): bucket `efeonce-marketing-studio-originals`, `studio.media_object`, worker de derivados por
  `OBJECT_FINALIZE`, descarga firmada `issueOriginalDownload` y capability `marketing_studio.asset.download`.
- `TASK-1896` (complete): observabilidad y restauración; precondición de escrituras en producción cumplida.

### Blocks / Impacts

- `MS-N7` del flujo maestro deja de ser sólo lectura.
- `TASK-1895`: el diálogo de aprobación de la UI usa el mismo `dryRun` + `proposalDigest` que esta task pone en el
  kernel de Studio.
- `TASK-1898`: el actor `user` de sesión y el delegado comparten la forma `Actor` que esta task extiende con
  `authority`.
- Futuras escrituras de Studio (otras capabilities): se federan con la misma receta (cliente de canje por capability).

### Files owned

- Repo `efeonce-mcp`: `src/providers/marketing-studio.ts`, `src/providers/marketing-studio-tool-manifest.generated.ts` (sólo por sync), `src/providers/marketing-studio-tool-parity.ts`, `src/providers/marketing-studio-exchange-contracts.ts` [nuevo], `scripts/sync-marketing-studio-tool-manifest.mjs`, `src/auth/tool-policy.ts`, `src/app.ts` (challenge de scope por tool), `src/config.ts` (`MARKETING_STUDIO_WRITE_SCOPE`, flag de escrituras), `src/mcp.ts` (registro, mensajes de error y status), `src/surface.ts` [verificar si requiere cambio], `.github/workflows/deploy.yml`, `scripts/marketing-studio-canary.mjs`, `scripts/marketing-studio-write-session-canary.mjs` [nuevo], `surface-baseline.json`, `package.json` (`version`), `test/marketing-studio.test.ts`, `test/marketing-studio-mcp.test.ts`, `test/authorized-tools.test.ts`, `test/version.test.ts`.
- Greenhouse: `src/lib/sister-platforms/mcp-token-exchange.ts` + `mcp-token-exchange.test.ts`, `src/lib/sister-platforms/oauth-broker.ts` (revalidación de capability en `userinfo` para la familia `marketing_studio`) + su test, `src/lib/auth-server/oauth/scopes.ts` + `scopes.test.ts`, `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability `marketing_studio.campaign.approve` y su grant), `migrations/*task-1899-marketing-studio-campaign-approve-capability*` [nuevo], `migrations/*task-1899-mcp-marketing-studio-exchange-clients*` [nuevo], `docs/mcp/skills/marketing-studio/SKILL.md`, `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (Delta), `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`, `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§Agentes), `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`, `docs/operations/marketing-studio/MARKETING_STUDIO_RUNTIME_HANDOFF.md`, `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, skills `efeonce-marketing-studio` y `efeonce-mcp-platform` (ambos espejos).
- Repo `efeonce-marketing-studio`: `apps/web/src/server/delegated-actor.ts` [nuevo], `apps/web/src/server/runtime.ts` (`resolveRequestActor`), `apps/web/src/server/api.ts` (`handle()`), `packages/domain/src/actor.ts`, el adaptador delegado del puerto de autoridad de personas que deja TASK-1894 [verificar ruta en `packages/domain`], `packages/domain/src/commands/confirmation.ts` [nuevo; junto al kernel `runCommand` de TASK-1894], `packages/contracts/src/errors.ts`, tests asociados.

## Current Repo State

### Already exists

- Gateway `efeonce-mcp` `1.9.0` (verificar la vigente al tomar la task): provider `marketing-studio` con 12 tools de
  lectura del manifiesto `1.1.0`; flag `MARKETING_STUDIO_PROVIDER_ENABLED=true` en producción; secreto
  `marketing-studio-mcp-gateway-token` montado en el paso de deploy; policy `unsupported(BASE_READ_SCOPE,
  [tool.capability], 'marketing_studio_native_policy_missing')` por tool, derivada del manifiesto.
- `authorizePerson` del provider canjea con `scope=marketing_studio.campaign.read` fijo y descarta el token canjeado;
  `buildStudioUrl` sólo arma `GET` con query; `MarketingStudioManifestTool.method` es el literal `'GET'`.
- Guard `computeMarketingStudioParity`: bidireccional, con `write_tool_without_scope_class` para toda tool `writes`.
- Greenhouse `exchangeMcpGatewayToken`: verifica la identidad de workload del gateway (Google ID token de la SA),
  el token Entra de la persona (`tid`, `azp`, `scp` con el input scope), resuelve el usuario interno y ejecuta
  `can(persona, 'marketing_studio.campaign.read', 'read', 'tenant')`; emite un token opaco `gh_mcp_*` de 300 s en
  `greenhouse_core.sister_platform_oauth_access_tokens`. El `userinfo`
  (`/api/integrations/v1/sister-platforms/oauth/userinfo`) acepta ese token y devuelve `sub`
  (`greenhouse:user:<id>`), `identityProfileId`, `email`, `capabilities`; revalida estado y tipo de tenant, **no**
  vuelve a ejecutar `can()`.
- Cliente `efeonce-mcp-marketing-studio` (`allowed_scopes = [marketing_studio.campaign.read]`, política con
  `requireOnPrivilegedAction = true` tras el forward fix `20260926071321910`).
- `src/lib/auth-server/oauth/scopes.ts`: `EFEONCE_MCP_WRITE_SCOPES` con cinco clases y test de paridad con el gateway.
- Studio API `1.2.0`: 13 tools (incluye `studio.asset.download`, capability `marketing_studio.asset.download`,
  `apiScope` `studio:assets:download`) + 5 exclusiones; `API_SCOPES = ['studio:read', 'studio:health',
  'studio:assets:download']`; `Actor` con `anonymous_open | api_client | user | operator_cli`; `pnpm api-client:create`
  admite varios `--scope`; `pnpm api-client:revoke`.

### Gap

- Ninguna tool de escritura federada; `studio.asset.download` sin federar.
- El canje no sabe pedir otra capability que `campaign.read`; no hay clientes de canje para `asset.download`,
  `asset.write` ni `campaign.approve`.
- `userinfo` no revalida la capability: una revocación de rol entre el canje y el uso no se detecta.
- Studio no conoce un actor delegado, no verifica el token canjeado ni exige confirmación con digest; su puerto de
  autoridad de personas (TASK-1894) niega por defecto.
- `marketing_studio.campaign.approve` no existe en Greenhouse (TASK-1894 siembra sólo `asset.write` y `campaign.write`).
- El `api_client` del gateway no tiene `studio:assets:download`, `studio:assets:write` ni `studio:write`.
- La clase `efeonce.mcp.marketing_studio.write` no existe en el gateway, en `scopes.ts` ni en el recurso Entra.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-mcp (Cloud Run efeonce-mcp-gateway, southamerica-west1) + greenhouse-eo (src/lib/sister-platforms, route handlers del broker OAuth en Vercel, migraciones de greenhouse_core) + repo efeonce-marketing-studio (apps/web server y packages/domain, Vercel)`
- Future candidate home: `api`
- Boundary: `Greenhouse autoriza (canje RFC 8693 por capability exacta y userinfo con revalidación); el gateway transporta y aplica scope y policy por nombre de tool; Studio verifica la delegación, relee la autoridad en userinfo y ejecuta sólo por sus commands; GCS recibe los bytes directo del agente`
- Server/browser split: `sólo server-side; ningún token canjeado, digest de confirmación ni secreto llega a un navegador`
- Build impact: `none en el bundle del portal; en Studio, sin dependencias nuevas (fetch a userinfo)`
- Extraction blocker: `none — cada pieza vive en su runtime`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `superficie pública del gateway MCP; greenhouse_core.sister_platform_oauth_clients (clientes de canje) y sister_platform_oauth_access_tokens; capabilities marketing_studio.* en Greenhouse; studio.audit_event (autor real de cada escritura); bucket efeonce-marketing-studio-originals (bytes)`
- Consumidores afectados: `Claude, Codex, ChatGPT y agentes internos conectados a mcp.efeonce.org; UI de Studio (TASK-1895) por el digest de confirmación; CLI studio:upload (TASK-1894) por el mismo command`
- Runtime target: `production (Cloud Run efeonce-mcp-gateway, Vercel de Greenhouse, Vercel de studio.efeonce.org, Entra «Efeonce MCP Resource»)`

### Contract surface

- Contrato existente a respetar: `manifiesto studio-tool-manifest de Studio y su hash; OpenAPI v1; errores { error, code, actionable } de Studio; policy por tool del gateway; contrato del canje RFC 8693 de Greenhouse (grant, input scope por clase, cliente confidencial); userinfo del broker; ADR de fuente única`
- Contrato nuevo o modificado: `clase efeonce.mcp.marketing_studio.write; canje con scope = capability de la tool y cuatro clientes nuevos; capability marketing_studio.campaign.approve; userinfo con revalidación de capability para la familia marketing_studio; cabecera Efeonce-Delegated-Token hacia Studio; actor user delegado con authority; campo confirmation.proposalDigest en tools requiresPerson; errores Studio delegation_required, delegation_invalid, delegation_insufficient, delegation_unavailable, confirmation_required, confirmation_mismatch; errores gateway conflict, confirmation_required, upstream_timeout_unknown_outcome`
- Backward compatibility: `compatible — minor del gateway (agrega tools); las lecturas campaign.read conservan su camino (sin reenvío de token); userinfo agrega una revalidación sólo para clientes marketing_studio`
- Full API parity: `CLI, MCP y UI invocan createAssetVersion y los commands de aprobación de Studio; la tool no agrega lógica; el guard del gateway impide una tool writes sin contrato de canje`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.sister_platform_oauth_clients (4 filas nuevas); greenhouse_core.capabilities_registry (+marketing_studio.campaign.approve); greenhouse_core.sister_platform_oauth_access_tokens (sin cambio de forma); studio.audit_event (actor user delegado; columnas según TASK-1894 [verificar nombres]); studio.api_client (cliente del gateway rotado); sin tablas nuevas`
- Invariantes que no se pueden romper:
  - Cada tool `writes: true` del manifiesto sincronizado está registrada en el gateway, exige la clase `efeonce.mcp.marketing_studio.write` y su `capability` tiene contrato de canje; si falta cualquiera de las tres cosas, el guard falla nombrando la tool.
  - El canje pide exactamente `tool.capability`; la respuesta se acepta sólo si su `scope` es idéntico. Una tool nunca canjea con la capability de otra.
  - Cada cliente de canje admite exactamente un scope (`allowed_scopes`, `requiredScopes` y `capabilityScopes` de un elemento) y su política valida con `sisterPlatformOAuthPolicyV1Schema` con `revocation.requireOnPrivilegedAction = true`.
  - `userinfo` de un token de la familia `marketing_studio` vuelve a ejecutar `can(persona, capability, acción, 'tenant')` y responde 403 si ya no la tiene.
  - Studio acepta `Efeonce-Delegated-Token` sólo si el bearer de servicio es un `api_client` listado en `STUDIO_DELEGATION_TRUSTED_API_CLIENT_IDS`; la capability requerida por la operación está en `capabilities` del `userinfo`; y el `userinfo` respondió 200 en esa misma llamada.
  - Un `api_client` confiable sin `Efeonce-Delegated-Token` en una operación de escritura recibe `403 delegation_required` antes de abrir transacción: el gateway nunca queda como actor.
  - Con `userinfo` inaccesible o con timeout, Studio responde `503 delegation_unavailable` sin escribir (fail-closed, sin caché).
  - El token canjeado nunca se registra en logs, `audit_event`, respuestas ni errores; el `audit_event` guarda `actor = user:<sub>`, `authority.kind = delegated_oauth`, `via = mcp`, la capability y el `correlationId` del canje.
  - Las lecturas `marketing_studio.campaign.read` no reenvían el token (camino de TASK-1891 intacto); `studio.asset.download` y toda escritura sí.
  - Una tool `requiresPerson` o `destructive` sin `confirmation.proposalDigest` responde `428 confirmation_required`; con un digest distinto del recalculado sobre el estado vigente, `409 confirmation_mismatch`; ambas sin escribir. Vale para toda puerta (CLI, UI, MCP).
  - `dryRun` no escribe filas (ni entidad, ni `idempotency_record`, ni `audit_event`) y devuelve `diff`, `baseRevision` y `proposalDigest`.
  - El gateway nunca genera `Idempotency-Key` ni reintenta una escritura; ante timeout responde `upstream_timeout_unknown_outcome`.
  - La URL firmada de subida es de vida corta y apunta a un solo objeto que define TASK-1894 conforme al ADR (`originals/sha256/<2 primeros hex>/<sha256>` con `ifGenerationMatch=0`); el gateway no la interpreta ni la modifica y sólo aparece en la respuesta de la tool, nunca en logs.
- Write-target allowlist: `N/A — el gateway no escribe en tablas; Greenhouse sólo inserta filas de clientes OAuth por migración; Studio conserva su domain-boundary-gate (sólo commands e import escriben en studio.*)`
- Tenant/space boundary: `persona Entra interna (tenantType efeonce_internal) → canje con la capability de la tool → Studio revalida en userinfo → Studio intersecta con organization_ids del api_client del gateway y con campaign.organization_id; organización ajena = 404 anti-oráculo`
- Idempotency/concurrency: `Idempotency-Key obligatorio en ejecuciones (input idempotencyKey que el agente reutiliza en reintentos); If-Match desde expectedRevision; createAssetVersion además idempotente por sha256; 412 obliga a releer y volver a proponer; el canje no se cachea entre llamadas`
- Audit/outbox/history: `studio.audit_event append-only con la persona; audit del broker en Greenhouse (token_success del canje + userinfo_success/userinfo_reject de Studio) enlazado por correlationId; logs del gateway con correlationId y sujeto hasheado; sin outbox`

### Migration, backfill and rollout

- Migration posture: `additive — dos migraciones de Greenhouse: capability marketing_studio.campaign.approve (INSERT … ON CONFLICT + bloque DO) y cuatro clientes de canje (INSERT … ON CONFLICT DO NOTHING + bloque DO que valida el contrato exacto); sin DROP; ninguna migración en Studio`
- Default state: `MARKETING_STUDIO_MCP_WRITES_ENABLED=false (gateway) y STUDIO_DELEGATED_ACTOR_ENABLED=false (Studio); los clientes nuevos inertes hasta que GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS los liste; ningún token de persona porta la clase hasta que la persona la consienta`
- Backfill plan: `N/A — sin datos que migrar`
- Rollback path: `gateway: MARKETING_STUDIO_MCP_WRITES_ENABLED=false + dispatch (tools de escritura responden policy_blocked sin canje); Studio: STUDIO_DELEGATED_ACTOR_ENABLED=false (rechaza el token delegado); Greenhouse: quitar los cuatro clientes de GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS + redeploy (el canje responde invalid_client); revert de PR en cada repo`
- External coordination: `release de Greenhouse por el control plane; env de Vercel Production de Greenhouse (allowlist) + redeploy; scope nuevo en la app Entra «Efeonce MCP Resource» con round-trip verificado; nuevo api_client del gateway en Studio y nueva versión del secreto marketing-studio-mcp-gateway-token; variables de GitHub de efeonce-mcp; una persona para el consentimiento y el canary`

### Security and access

- Auth/access gate: `gateway: issuer Entra + scope base + clase efeonce.mcp.marketing_studio.write (403 insufficient_scope con challenge que la nombra) + flag; Greenhouse: identidad de workload de la SA del gateway + cliente confidencial por capability + can(persona, capability) en el canje y en userinfo; Studio: api_client confiable + token delegado revalidado + organización`
- Sensitive data posture: `copys, presupuestos, estados de aprobación, URLs firmadas de subida y descarga (credenciales efímeras de un objeto); email de la persona en userinfo (no se persiste en Studio más allá del actor); tokens y URLs firmadas nunca en logs`
- Error contract: `ver Detailed Spec §Mapa de errores`
- Abuse/rate-limit posture: `canje por llamada sin caché; token canjeado de 300 s; URLs firmadas de vida corta y de un solo objeto; límites de tamaño y mime los aplica createAssetVersion (TASK-1894); el gateway no reintenta escrituras`

### Runtime evidence

- Local checks: `efeonce-mcp: pnpm check (guard, policy, canje por capability, transporte, errores, versión, surface); efeonce-marketing-studio: pnpm check (actor delegado con userinfo simulado, delegation_required, digest, errores); Greenhouse: pnpm local:check + pnpm test src/lib/sister-platforms src/lib/auth-server src/lib/entitlements`
- DB/runtime checks: `capability marketing_studio.campaign.approve en capabilities_registry; cuatro clientes activos con el contrato exacto (SELECT de verificación en la migración y readback por pg:connect); studio.audit_event del canary con actor user y authority delegated_oauth (proxy de Studio en 15433); audit del broker con token_success y userinfo_success por cada escritura del canary`
- Integration checks: `sesión MCP real contra https://mcp.efeonce.org/mcp con token humano (PKCE): tools/list, subida completa, dryRun + confirmación de aprobación, descarga, casos negativos; ver Verification`
- Reliability signals/logs: `efeonce.gateway.status con el carril de escritura; logs del broker (token_success, userinfo_success/userinfo_reject); logs de Studio con correlationId; señales de TASK-1896`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] La regla de negocio vive en los commands de Studio; el gateway y Greenhouse no deciden nada de campañas.
- [ ] Toda escritura y aprobación federada es un command con autorización por persona, idempotencia, auditoría y errores canónicos.
- [ ] `marketing_studio.campaign.approve` sembrada por esta task en catálogo TS + `capabilities_registry` + grant en `runtime.ts` a `efeonce_admin`, `efeonce_account` y `efeonce_operations`, con `capability-grant-coverage.test.ts` verde en el mismo PR; las demás (`asset.write`, `campaign.write` de TASK-1894 y `asset.download` de TASK-1893) verificadas.
- [ ] Camino programático completo: CLI → `/api/v1` → tool MCP sobre el mismo command.
- [ ] Aprobaciones aptas para `propose → confirm → execute` (`dryRun` + `proposalDigest` + confirmación humana).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente ejecuta estos slices en orden, respetando el plan
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Greenhouse: canje por capability, clientes, userinfo, paridad de scope y manual

- `src/lib/sister-platforms/mcp-token-exchange.ts`:
  - Constantes nuevas: `MCP_MARKETING_STUDIO_WRITE_INPUT_SCOPE = 'efeonce.mcp.marketing_studio.write'` y los cuatro
    client ids de la tabla de Detailed Spec §Contratos de canje.
  - `resolveScopeContract` agrega cuatro contratos (`asset.download`, `asset.write`, `campaign.write`,
    `campaign.approve`) con `resourceFamily: 'marketing_studio'`, `requireWorkspaceBinding: false`, su input scope y su
    client id; el tipo `McpTokenExchangeResult['scope']` suma las cuatro capabilities.
  - `authorizeMarketingStudio(tenant, capability, action)` reemplaza la versión fija: ejecuta
    `can(persona, capability, action, 'tenant')` con la acción de la tabla (misma forma del sujeto que hoy).
  - `assertFederatedClient` **no cambia** (sigue exigiendo un scope por cliente).
- `src/lib/sister-platforms/oauth-broker.ts`: en `resolveSisterPlatformOAuthUserinfo`, si el cliente tiene
  `metadata.resourceFamily = 'marketing_studio'`, volver a ejecutar `can()` con la capability del token y su acción;
  si ya no la tiene, `403 user_not_eligible` y `userinfo_reject` en el audit. Los demás clientes no cambian.
- Capability `marketing_studio.campaign.approve`: `pnpm migrate:create task-1899-marketing-studio-campaign-approve-capability`
  (INSERT en `greenhouse_core.capabilities_registry`, módulo `marketing_studio`, acción de aprobación, scopes
  `organization`/`tenant`, descripción es-CL que diga que aprobar registra una decisión y no publica; bloque DO; Down =
  `deprecated_at`), entrada en `src/config/entitlements-catalog.ts` y grant en `src/lib/entitlements/runtime.ts` a
  `efeonce_admin`, `efeonce_account` y `efeonce_operations` (nunca `designer`), con `capability-grant-coverage.test.ts`
  verde. Patrón: `20260926075619118_task-1893-marketing-studio-asset-download-capability.sql`.
- Migración `pnpm migrate:create task-1899-mcp-marketing-studio-exchange-clients`: cuatro filas en
  `greenhouse_core.sister_platform_oauth_clients` copiadas de la forma de `efeonce-mcp-marketing-studio`
  (consumer `spc-efeonce-mcp-gateway`, `confidential`, `require_human_session = FALSE`, TTL 300 s,
  `redirect_uris = ['https://mcp.efeonce.org/mcp']`), cada una con un solo scope, política con
  `revocation = {mode: userinfo_revalidation, revalidateAfterSeconds: 60, requireOnPrivilegedAction: true}` y
  `metadata_json.resourceFamily = 'marketing_studio'`, `taskId = 'TASK-1899'`. Bloque DO que aborta si alguna fila no
  quedó con el contrato exacto. Down: `DELETE` de las cuatro filas.
- Test nuevo que carga las filas sembradas (o sus literales) y las parsea con `sisterPlatformOAuthPolicyV1Schema`.
- `src/lib/auth-server/oauth/scopes.ts`: agregar `efeonce.mcp.marketing_studio.write` a `EFEONCE_MCP_WRITE_SCOPES`
  con su comentario de clase; `scopes.test.ts` verifica que no aparece en `PUBLISHED_SCOPES_SUPPORTED`.
- Manual servido `docs/mcp/skills/marketing-studio/SKILL.md`: flujo de subida en dos pasos con ejemplo de `curl`,
  inferencia por nombre canónico (`CMP001-02 - <título> - 4x5.png`) y preguntar sólo lo que falte, tipo de licencia
  obligatorio, estado `verifying` (esperar `retryAfterSeconds` y repetir con la misma `idempotencyKey`, o consultar
  `studio.asset.get`; nunca volver a subir ni cambiar la llave),
  protocolo `dryRun` → confirmación, qué hacer ante 412/428/409/`upstream_timeout_unknown_outcome`, que aprobar es de la
  persona, `appliesTo` con las tools nuevas. `pnpm mcp:skills:generate` + `pnpm mcp:skills:check` (leak test: sin ids,
  rutas, org ids ni secretos).
- Tests: `mcp-token-exchange.test.ts` (cada capability con su cliente e input scope; capability de otra tool rechazada;
  persona sin capability 403; cliente con dos scopes rechazado), test de `userinfo` (revocación entre canje y uso ⇒ 403).
- Release de Greenhouse por el control plane (`greenhouse-production-release`) y, después, agregar
  `efeonce-mcp-marketing-studio-asset-download,efeonce-mcp-marketing-studio-asset-write,efeonce-mcp-marketing-studio-campaign-write,efeonce-mcp-marketing-studio-campaign-approve` a
  `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` en Vercel Production (y staging), conservando los valores
  actuales, + redeploy. Verificar con `vercel env ls` y un canje de prueba.

### Slice 2 — Entra: exponer la clase en el recurso

- Agregar el scope delegado `efeonce.mcp.marketing_studio.write` (consentimiento de administrador, descripción es-CL) a
  la app Entra «Efeonce MCP Resource». `az ad app update` **reemplaza** el arreglo completo: leer el arreglo vigente,
  agregar uno, escribir, releer y comprobar que están todos los anteriores más el nuevo (conteo antes → después).
- **No** tocar el `requiredResourceAccess` del cliente público `32617b87-e7ef-493a-838f-1ff3f0213b93` ni de ningún
  otro cliente.
- Si el recurso Entra no admite el cambio sin afectar otros scopes, detener y escalar al operador.

### Slice 3 — Studio: actor delegado y confirmación

- `apps/web/src/server/delegated-actor.ts` + adaptador delegado del puerto de autoridad de personas de TASK-1894 (que
  hoy niega por defecto): con `STUDIO_DELEGATED_ACTOR_ENABLED=true` y un bearer `api_client` cuyo id
  está en `STUDIO_DELEGATION_TRUSTED_API_CLIENT_IDS`, si llega `Efeonce-Delegated-Token`:
  1. `GET STUDIO_GREENHOUSE_USERINFO_URL` con `Authorization: Bearer <token>` (timeout 5 s; en staging, cabecera
     `x-vercel-protection-bypass` sólo hacia esa URL exacta).
  2. 200 ⇒ `Actor { kind: 'user', subject: <sub>, identityProfileId, organizationIds: <del api_client>, authority:
     { kind: 'delegated_oauth', via: 'mcp', capabilities, correlationId: <x-correlation-id de userinfo> } }`.
     401 ⇒ `401 delegation_invalid`; 403 ⇒ `403 delegation_insufficient`; 5xx, red o timeout ⇒
     `503 delegation_unavailable`. Nunca caché.
  3. La operación exige que su `capability` (la del registro de operaciones) esté en `authority.capabilities`; si no,
     `403 delegation_insufficient`.
- Sin cabecera, un `api_client` confiable que llama una operación de escritura recibe `403 delegation_required`; sus
  lecturas siguen como hoy. Con el flag OFF, la cabecera se rechaza con `401 delegation_invalid`.
- `packages/domain/src/actor.ts`: `user` suma `authority` opcional; `audit_event` registra la persona y
  `authority.kind`, sin el token.
- Confirmación (dueña esta task, ADR §9 y TASK-1894 §Out of Scope): función de dominio que calcula `proposalDigest` =
  SHA-256 hex del JSON canónico (claves ordenadas) de `{ operationId, entityId, baseRevision, payload normalizado,
  actor.subject }`; `dryRun` de toda operación `requiresPerson` o `destructive` lo devuelve; la ejecución lo exige
  (428/409). Aplica a toda puerta (CLI, UI, MCP).
- Errores nuevos en `packages/contracts/src/errors.ts` con copy es-CL y `actionable`: `delegation_required`,
  `delegation_invalid`, `delegation_insufficient`, `delegation_unavailable`, `confirmation_required`,
  `confirmation_mismatch`.
- Nuevo `api_client` del gateway: `pnpm api-client:create --label "Efeonce MCP gateway" --org
  org-2df565fb-98aa-42f7-b324-ea9a2209017f --scope studio:read --scope studio:assets:download --scope studio:assets:write
  --scope studio:write --token-only | gcloud secrets versions add marketing-studio-mcp-gateway-token
  --data-file=-` contra la base de producción (proxy 15433). Anotar el id (no el token) en
  `STUDIO_DELEGATION_TRUSTED_API_CLIENT_IDS`. El cliente anterior se revoca en Slice 5, paso 8.
- Env en Vercel de Studio (Production y Preview): `STUDIO_DELEGATED_ACTOR_ENABLED=false`,
  `STUDIO_DELEGATION_TRUSTED_API_CLIENT_IDS`, `STUDIO_GREENHOUSE_USERINFO_URL`; push a `main`.
- Tests: `userinfo` simulado (200, 401, 403, 5xx, timeout), cliente no confiable con cabecera, capability ausente,
  `delegation_required`, digest (ausente, alterado, revisión movida), `dryRun` sin filas, redacción del token.

### Slice 4 — Gateway: carril de escritura del provider

- `pnpm studio:manifest:sync` con el manifiesto que dejó TASK-1894; el script y el tipo
  `MarketingStudioManifestTool` aceptan `method: 'GET' | 'POST' | 'PATCH'`, `requiresPerson` y el bloque `transport`.
- `src/providers/marketing-studio-exchange-contracts.ts`: tabla cerrada `capability → { clientId, inputScope, forwardDelegatedToken }`
  (Detailed Spec §Contratos de canje). El guard suma `capability_without_exchange_contract` y
  `write_tool_without_transport`, y reemplaza `write_tool_without_scope_class` por la comprobación real: toda tool
  `writes` exige `MARKETING_STUDIO_WRITE_SCOPE`.
- `src/providers/marketing-studio.ts`:
  - `authorizePerson` canjea con `scope = tool.capability` y `client_id` del contrato, y devuelve el token canjeado
    sólo si `forwardDelegatedToken`; valida `scope` idéntico en la respuesta.
  - Construcción de la petición desde `transport`: parámetros de ruta, `idempotencyKey` → `Idempotency-Key`,
    `expectedRevision` → `If-Match`, `dryRun` a la query, resto al cuerpo JSON; `Efeonce-Delegated-Token` cuando
    corresponde; `x-correlation-id` siempre.
  - `202` de `studio.asset.version.create` (`status: 'verifying'`) se devuelve como resultado, no como error, con
    `uploadId` y `retryAfterSeconds` tomado de `Retry-After`.
  - Escrituras con timeout ⇒ `upstream_timeout_unknown_outcome` (sin reintento). Mapa de errores de §Mapa de errores.
  - Nunca registrar cuerpo de respuesta, token ni URL firmada.
- `src/config.ts`: `MARKETING_STUDIO_WRITE_SCOPE`, `MARKETING_STUDIO_MCP_WRITES_ENABLED`. Con el flag OFF, las tools
  `writes` se registran y responden `policy_blocked: writes_disabled` sin canje (visibles para descubrir, inertes).
- `src/auth/tool-policy.ts`: tools `writes` ⇒ `unsupported(MARKETING_STUDIO_WRITE_SCOPE, [tool.capability],
  'marketing_studio_native_policy_missing')`; lecturas sin cambio.
- `src/app.ts`: el challenge `403 insufficient_scope` nombra `efeonce.mcp.marketing_studio.write` para toda tool
  `writes` (conjunto derivado del manifiesto).
- `src/mcp.ts`: mensajes de error por código (sin prosa que diga «read capability» a una escritura); `annotations` del
  manifiesto emitidas tal cual; `efeonce.gateway.status` reporta `marketing-studio` con `writes: enabled|disabled`.
- `.github/workflows/deploy.yml`: `MARKETING_STUDIO_MCP_WRITES_ENABLED` desde variable de GitHub, en el **mismo paso**
  que arma `env_vars` y corre `gcloud run deploy`, con default `false`.
- `scripts/marketing-studio-write-session-canary.mjs` [nuevo]: lee el token humano de `MCP_CANARY_TOKEN_FILE`
  (permisos `0600`, nunca lo imprime), habla JSON-RPC con `https://mcp.efeonce.org/mcp` y ejecuta los casos de
  Verification sobre la campaña sandbox.
- Tests: guard (tool `writes` sin contrato/transporte/scope ⇒ hallazgo nombrado), canje por capability, reenvío sólo
  cuando corresponde, transporte, errores, flag OFF, status por la puerta HTTP, `authorized-tools`.
- `pnpm surface:baseline` tras decidir bump minor; `version` minor sobre la vigente; PR con CI verde.

### Slice 5 — Rollout en producción

1. Release de Greenhouse (Slice 1) aplicado y allowlist en Vercel con redeploy; canje de prueba de cada cliente
   desde el gateway (o su log) sin errores de política.
2. Scope en Entra (Slice 2) con readback.
3. Studio desplegado con `STUDIO_DELEGATED_ACTOR_ENABLED=false`; nuevo `api_client` activo y secreto con versión nueva.
4. Merge del PR del gateway + dispatch de `deploy.yml` (`exposure=public-oauth`) con `MARKETING_STUDIO_MCP_WRITES_ENABLED=false`.
   Verificar: revisión nueva `Ready` al 100 % (`gcloud run services describe efeonce-mcp-gateway --region
   southamerica-west1 --format='value(status.traffic)'`); si `spec.traffic` quedó fijado en otra revisión, aplicar la
   receta de `efeonce-mcp#21`; lecturas `studio.*` verdes; una tool de escritura responde `policy_blocked`;
   `studio.asset.download` responde con la capability de descarga.
5. `STUDIO_DELEGATED_ACTOR_ENABLED=true` en Studio Production + redeploy.
6. `MARKETING_STUDIO_MCP_WRITES_ENABLED=true` + dispatch; readback de la revisión activa (env y secretos presentes).
7. Canary de sesión real (Verification) sobre la campaña sandbox de producción, creada antes con la CLI de operador de
   TASK-1894 (nunca por SQL) y rotulada como sandbox.
8. Revocar el `api_client` anterior del gateway (`pnpm api-client:revoke --id … --reason "rotado por TASK-1899"`) y
   verificar que lecturas y escrituras siguen verdes.

### Slice 6 — Documentación y cierre

- Delta en `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` (novena clase y por qué una sola) y en
  `MCP_TOOL_SURFACE_INVARIANTS.md` (canje por capability de la tool, reenvío del token canjeado sólo a Studio,
  aprobación = tool propia con digest).
- Arquitectura de Studio §Agentes; runbook del gateway §Provider Marketing Studio (carril de escritura, rotación del
  `api_client`, receta del canary); `MARKETING_STUDIO_RUNTIME_HANDOFF.md`; `FEATURE_FLAG_STATE_LEDGER.md` (los dos
  flags con su runtime y estado real).
- Contrato de mantenimiento de `efeonce-marketing-studio` (ledger, architecture-map, contracts, operations, lessons) y
  skill `efeonce-mcp-platform`; espejos `.codex/` + `pnpm skills:mirrors`.
- Handoff, changelog, EPIC-049 y `MS-N7` del flujo maestro.

## Out of Scope

- Los commands de escritura, su semántica, límites de tamaño/mime, dónde se recalcula el sha256, el corte por campaña,
  la CLI `studio:upload` y la señal «pieza aprobada sin original en Studio» (TASK-1894).
- UI de subida, revisión y aprobación (TASK-1895); login web y cierre del modo `open` (TASK-1898).
- Emisor nativo `auth.efeonce.org`: las tools de Studio siguen `unsupported` para él (D10); no se agrega grant de
  token exchange al emisor.
- Personas externas o clientes: requieren grant en `external_capability_grants`, consentimiento y piloto propios.
- Espejo o lectura programada de SharePoint/OneDrive por Microsoft Graph (ADR §4.6).
- Publicar posts o lanzar pauta en proveedores (Studio no publica).
- Operaciones sólo de operador (`import:catalog`, `media:ingest`, `api-client:*`, cortes): siguen como exclusiones.

## Detailed Spec

### Contratos de canje (Greenhouse ↔ gateway)

| Capability de la tool | Cliente de canje | Input scope en el token Entra | Acción en `can()` | Reenvía token a Studio |
|---|---|---|---|---|
| `marketing_studio.campaign.read` | `efeonce-mcp-marketing-studio` (existe) | `efeonce.mcp.read` | `read` | no |
| `marketing_studio.asset.download` | `efeonce-mcp-marketing-studio-asset-download` | `efeonce.mcp.read` | `read` | sí |
| `marketing_studio.asset.write` | `efeonce-mcp-marketing-studio-asset-write` | `efeonce.mcp.marketing_studio.write` | la de `allowed_actions` que siembre TASK-1894 [verificar] | sí |
| `marketing_studio.campaign.write` | `efeonce-mcp-marketing-studio-campaign-write` | `efeonce.mcp.marketing_studio.write` | la de `allowed_actions` que siembre TASK-1894 [verificar] | sí |
| `marketing_studio.campaign.approve` | `efeonce-mcp-marketing-studio-campaign-approve` | `efeonce.mcp.marketing_studio.write` | la que siembre esta task (Slice 1) | sí |

La tabla vive en dos lugares con paridad por test: `resolveScopeContract` (Greenhouse) y
`marketing-studio-exchange-contracts.ts` (gateway). Si el manifiesto sincronizado trae una tool `writes` con una
capability fuera de la tabla, esta task le agrega su fila, su cliente y su contrato con la misma receta; el guard
falla hasta que exista.

Por qué un cliente por capability: `assertFederatedClient` exige hoy un scope por cliente y esa guarda es la que
impide que un token canjeado para una capability sirva para otra; se revoca y se audita por cliente. Precedente:
`efeonce-mcp-hiring` y `efeonce-mcp-hiring-review`.

### Flujo de una escritura

1. El cliente MCP llama la tool; la capa HTTP del gateway exige la clase (`403 insufficient_scope` con challenge).
2. Policy: issuer Entra; flag de escrituras ON; si no, `policy_blocked`.
3. Canje en Greenhouse con la identidad de workload de la SA del gateway, el token Entra de la persona,
   `scope = tool.capability` y el cliente de la tabla. Greenhouse ejecuta `can()` y emite `gh_mcp_*` (300 s).
4. Petición a Studio: `Authorization: Bearer <api_client del gateway>`, `Efeonce-Delegated-Token: <gh_mcp_*>`,
   `Idempotency-Key`, `If-Match`, `x-correlation-id`, cuerpo JSON.
5. Studio revalida en `userinfo` (Greenhouse vuelve a ejecutar `can()`), construye el actor persona y ejecuta el command.
6. El gateway devuelve el cuerpo de Studio tal cual (sin transformar), o el error mapeado.

### Subida de un final (ADR §4.2)

1. `studio.asset.upload.request` (`POST /api/v1/campaigns/{campaignId}/uploads`) con `campaignId`, `filename`,
   `sha256`, `byteSize`, `mimeType` (el schema exacto lo declara el manifiesto). Respuesta: `alreadyStored` o
   `upload { method, url, headers, expiresAt, resumable }` hacia un solo objeto que define TASK-1894 conforme al ADR
   (`originals/sha256/<2 primeros hex>/<sha256>`, `ifGenerationMatch=0`), más lo inferido del nombre canónico y lo que
   falta preguntar.
2. El agente sube los bytes directo a GCS (`curl -X PUT --upload-file … -H` con las cabeceras devueltas; sesión
   reanudable para video grande). Nunca por MCP.
3. `studio.asset.version.create` (`POST /api/v1/campaigns/{campaignId}/asset-versions`) con la referencia de la
   subida, metadata inferida o confirmada, el tipo de licencia (obligatorio), `idempotencyKey` y `expectedRevision`.
   Resultados: `created` (versión **pendiente de revisión**), `duplicate` (el sha256 ya es una versión de esa pieza; sin
   fila nueva) o `verifying` (`202`: el worker aún recalcula el sha256). Con `verifying`, el agente informa el estado,
   espera `retryAfterSeconds` y repite **la misma llamada con la misma `idempotencyKey`**, o consulta
   `studio.asset.get`; nunca vuelve a subir ni cambia la llave. `upload_rejected` (sha256, tamaño o tipo no
   coinciden) y `upload_expired` exigen pedir una subida nueva.
4. Si `alreadyStored`, se salta el paso 2.

### Aprobación (ADR §4.4)

1. La tool de aprobación con `dryRun=true` devuelve `diff`, `baseRevision` y `proposalDigest` sin escribir.
2. El agente muestra el diff y pide aceptación explícita de la persona en la conversación.
3. Con la aceptación, repite sin `dryRun`, con la misma `idempotencyKey`, el mismo `expectedRevision` y
   `confirmation.proposalDigest`.
4. `412` ⇒ releer y volver al paso 1; nunca reintentar con la revisión nueva sin mostrar el diff otra vez.

El digest prueba que lo ejecutado es lo propuesto sobre esa revisión y para esa persona; no prueba que la persona lo
haya visto. Esa parte la sostienen el consentimiento de la clase, las descripciones de las tools, la capability de
aprobación y la auditoría. La confirmación por elicitation no se usa (ver `mcp-craft/protocol-radar.md`).

Tools de aprobación (tabla de TASK-1894; manda el manifiesto sincronizado y el gateway las deriva de
`requiresPerson: true`, nunca de una lista a mano): `studio.asset.version.approve`, `studio.campaign.creative.approve`,
`studio.campaign.media.authorize`, `studio.campaign.brief.approve` y `studio.media_plan.budget_line.approve`. Las
destructivas (`studio.media_plan.budget_line.remove`, `studio.calendar.post.cancel`) exigen el mismo `dryRun` + digest
aunque no requieran la capability de aprobación.

### Mapa de errores

| Origen | Respuesta | Código del gateway | Qué hace el agente |
|---|---|---|---|
| Canje | 400 `invalid_grant`, 403 `user_not_eligible`/`scope_not_allowed` | `forbidden` | Informar que la persona no tiene esa autoridad |
| Canje | 401 `invalid_client`, 404 `exchange_disabled`, 5xx | `upstream_unavailable` | No reintentar; avisar |
| Studio | 400/422 (incluye `upload_rejected`), 410 `upload_expired` | `invalid_request` | Corregir según el schema; con `upload_*` pedir una subida nueva |
| Studio | 202 `verifying` de `createAssetVersion` | resultado, no error | Esperar `retryAfterSeconds` y repetir con la misma llave |
| Studio | 401 (bearer de servicio o `delegation_invalid`), 403 `delegation_required`, 503 `delegation_unavailable` | `upstream_unavailable` | No reintentar; avisar |
| Studio | 403 `delegation_insufficient`, `approval_requires_person`, `forbidden` | `forbidden` | Informar |
| Studio | 404 | `not_found` | Verificar ids y organización |
| Studio | 409 `confirmation_mismatch` u otro conflicto, 412 `revision_conflict` | `conflict` | Releer y volver a proponer |
| Studio | 428 `confirmation_required`/`precondition_required` | `confirmation_required` | Hacer `dryRun` y pedir confirmación |
| Studio | 429 | `rate_limited` | Esperar |
| Red/timeout en escritura | — | `upstream_timeout_unknown_outcome` | Reintentar con la **misma** `idempotencyKey` |

El `upstreamCode` de Studio se conserva en logs saneados, nunca el cuerpo.

### Deltas a otras tasks

- **TASK-1894** (registrar allí al tomar esta task si no está): (1) el manifiesto generado exporta, por tool de
  escritura, `method`, `class`, `requiresPerson`, `destructive` y el transporte (`pathParams`, cabeceras
  `Idempotency-Key`/`If-Match` desde `idempotencyKey`/`expectedRevision`, `dryRun` en query, resto en cuerpo); (2)
  `dryRun` de las operaciones `requiresPerson` o `destructive` deja un punto de extensión para el `proposalDigest` que
  implementa esta task; (3) la respuesta de `studio.asset.upload.request` expone lo inferido del nombre canónico y lo
  que falta preguntar. `marketing_studio.campaign.approve` la siembra esta task, no TASK-1894.
- **TASK-1895**: el diálogo de aprobación llama `dryRun`, muestra el diff y envía `confirmation.proposalDigest`.
- **TASK-1898**: el actor `user` de sesión reutiliza `authority` con `kind: 'session'`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1894 complete en producción → Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → Slice 6.
- El release de Greenhouse (Slice 1) y la allowlist salen **antes** del deploy del gateway: sin clientes ni canje por
  capability, las tools responderían `upstream_unavailable` contra producción.
- Los flags se prenden Studio → gateway y se apagan gateway → Studio.
- El `api_client` anterior del gateway se revoca sólo después de verificar la revisión nueva con el secreto nuevo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La clase de escritura llega al cliente público compartido | identity | low | regla dura; `scopes.test.ts` falla si aparece en `PUBLISHED_SCOPES_SUPPORTED`; Slice 2 no toca clientes | PRM con más de un scope; `requiredResourceAccess` del cliente cambiado |
| Una persona que sólo lee escribe o aprueba | MCP / Greenhouse | medium | canje con `tool.capability` + validación del `scope` devuelto + `userinfo` con `can()` + capability por operación en Studio | canary deny; `userinfo_reject` |
| Studio audita al gateway en vez de a la persona | Studio | medium | `delegation_required` para escrituras del cliente confiable sin token; test de actor | `audit_event` con actor `api_client` en una escritura |
| Política de un cliente nuevo inválida (503 del canje) | Greenhouse | medium | `requireOnPrivilegedAction: true` + test con `sisterPlatformOAuthPolicyV1Schema` + bloque DO | `upstream_unavailable` en todas las escrituras |
| Secreto o variable borrados por `--set-*` destructivo | Cloud Run | medium | flag y secreto en el mismo paso de `gcloud run deploy`; readback de la revisión | status sin carril de escritura; `readyz` |
| `spec.traffic` fijado en una revisión rota | Cloud Run | medium | receta de `efeonce-mcp#21`; verificar tráfico tras cada dispatch | deploy siguiente falla |
| Rotación del `api_client` corta las lecturas | Studio / MCP | low | el nuevo cliente es superconjunto; revocar el viejo al final | lecturas `upstream_unavailable` |
| Timeout deja una escritura incierta | MCP | medium | `upstream_timeout_unknown_outcome` + idempotencia | canary de reintento |
| Agente reintenta a ciegas una versión en verificación | MCP | medium | manual servido + descripción de la tool + idempotencia por sha256 | versiones duplicadas (debe ser cero) |
| Cambio en `az ad app update` borra scopes vigentes | Entra | low | round-trip leído-escrito-releído con conteo | tools de otros providers con `insufficient_scope` |
| Deriva manifiesto ↔ gateway o superficie sin bump | MCP | medium | guard + `surface.ts` + `test/version.test.ts` | CI rojo |

### Feature flags / cutover

- Gateway `MARKETING_STUDIO_MCP_WRITES_ENABLED` (variable de GitHub → `deploy.yml`, default `false`): OFF ⇒ tools de
  escritura registradas que responden `policy_blocked: writes_disabled` sin canje. Runtime: Cloud Run
  `efeonce-mcp-gateway`.
- Studio `STUDIO_DELEGATED_ACTOR_ENABLED` (Vercel de Studio, default `false`): OFF ⇒ `Efeonce-Delegated-Token` se
  rechaza con `401 delegation_invalid` y las escrituras del gateway no pueden ejecutarse.
- Allowlist `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` (Vercel de Greenhouse): corte inmediato del canje.
- Los dos flags van a `FEATURE_FLAG_STATE_LEDGER.md` con runtime y estado real.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | quitar los cuatro clientes de la allowlist + redeploy; revert del PR (la migración queda inerte) | < 15 min | sí |
| Slice 2 | quitar el scope del recurso con round-trip | < 15 min | sí |
| Slice 3 | `STUDIO_DELEGATED_ACTOR_ENABLED=false` o rollback del deploy de Vercel | < 5 min | sí |
| Slice 4 | flag OFF + dispatch, o tráfico a la revisión anterior al 100 % | < 10 min | sí |
| Slice 5 | los dos flags OFF; si se revocó el `api_client` viejo, las lecturas siguen con el nuevo | < 15 min | sí; lo escrito en la campaña sandbox queda auditado |
| Slice 6 | revert de docs | minutos | sí |

### Production verification sequence

1. Greenhouse en producción: la capability de aprobación y los cuatro clientes con el contrato exacto; `vercel env ls` muestra la allowlist.
2. Entra: scope nuevo presente y los anteriores intactos (conteo).
3. Gateway con flag OFF: lecturas verdes, `studio.asset.download` verde, escritura `policy_blocked`, status con
   `writes: disabled`, tráfico al 100 % en la revisión nueva.
4. Studio flag ON; gateway flag ON; status `writes: enabled`.
5. Canary de sesión (Verification) y readback de `studio.audit_event` y del audit del broker por `correlationId`.
6. Revocación del `api_client` anterior y repetición de una lectura y una descarga.

### Out-of-band coordination required

- Una persona interna con `marketing_studio.asset.write` y `marketing_studio.campaign.approve` (rol `efeonce_admin`,
  `efeonce_account` o `efeonce_operations`) para consentir la clase
  (PKCE interactivo con el cliente público, callback `http://localhost:8765/callback`, scopes
  `https://mcp.efeonce.org/mcp/efeonce.mcp.read` y `https://mcp.efeonce.org/mcp/efeonce.mcp.marketing_studio.write`)
  y ejecutar el canary. El token vive en un archivo `0600`, nunca en el chat, y se borra al terminar.
- Una segunda persona interna **con** `marketing_studio.asset.write` y **sin** `marketing_studio.campaign.approve` (rol
  `designer`) para el deny de aprobación en vivo. Requisito de cierre: el operador la designa.
- Autorización explícita del operador para: release de Greenhouse, cambio en Entra, variables de Vercel y de GitHub,
  dispatch del gateway y rotación del `api_client`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El guard del gateway falla nombrando la tool cuando una tool `writes` del manifiesto no tiene contrato de canje, transporte o clase de scope (verificado agregando una de prueba).
- [ ] `efeonce.mcp.marketing_studio.write` existe en la policy del gateway, en `EFEONCE_MCP_WRITE_SCOPES` con test de paridad verde y en el recurso Entra, y no aparece en el PRM, en `PUBLISHED_SCOPES_SUPPORTED` ni en el `requiredResourceAccess` del cliente público compartido.
- [ ] `marketing_studio.campaign.approve` existe en catálogo, registry y grant (tres roles, sin `designer`) con `capability-grant-coverage.test.ts` verde.
- [ ] Los cuatro clientes de canje existen activos, con un solo scope cada uno y política que valida con `sisterPlatformOAuthPolicyV1Schema` (`requireOnPrivilegedAction = true`).
- [ ] El canje de cada tool pide su `capability` y el gateway rechaza una respuesta con otro `scope`.
- [ ] `userinfo` de un token `marketing_studio` responde 403 cuando la persona perdió la capability después del canje (test).
- [ ] Una tool de escritura sin la clase en el token responde `403 insufficient_scope` con challenge que nombra `efeonce.mcp.marketing_studio.write`.
- [ ] Con `MARKETING_STUDIO_MCP_WRITES_ENABLED=false`, toda tool de escritura responde `policy_blocked: writes_disabled` sin canje.
- [ ] En producción, una persona con `marketing_studio.asset.write` sube un archivo de prueba por la URL firmada al objeto `originals/sha256/<2>/<sha256>` y `studio.asset.version.create` devuelve `created` con la versión pendiente de revisión (si antes devolvió `verifying`, la misma llamada con la misma llave termina en `created` sin fila duplicada).
- [ ] El `audit_event` de esa versión registra a la persona (`actor = user`, `authority.kind = delegated_oauth`) y no al `api_client` del gateway.
- [ ] Un `api_client` confiable sin `Efeonce-Delegated-Token` que intenta escribir recibe `403 delegation_required` sin escribir.
- [ ] Una aprobación sin `confirmation.proposalDigest` responde `confirmation_required` y con digest alterado `conflict` (`409 confirmation_mismatch` en Studio), ambas sin escribir.
- [ ] Con `dryRun` + digest correcto, la persona aprueba la versión de prueba desde la sesión MCP.
- [ ] La persona `designer` recibe `forbidden` al aprobar, sin escritura.
- [ ] Una organización ajena responde `not_found` sin escritura.
- [ ] Repetir una ejecución con la misma `idempotencyKey` devuelve la misma respuesta y un solo `audit_event`.
- [ ] Una ejecución con `expectedRevision` vieja devuelve `conflict` sin escribir.
- [ ] `studio.asset.download` devuelve una URL de descarga de la versión aprobada con la capability `marketing_studio.asset.download`, y la emisión queda auditada a la persona.
- [ ] Las 12 lecturas previas siguen verdes tras la rotación del `api_client` y la revocación del anterior.
- [ ] `efeonce.gateway.status` reporta `marketing-studio` con `writes: enabled` en la revisión activa, y el tráfico está al 100 % en ella.
- [ ] La versión del gateway subió un minor y `surface-baseline.json` quedó actualizado.
- [ ] Ningún log del gateway, de Studio ni de Greenhouse contiene el token canjeado, el bearer de servicio ni una URL firmada (búsqueda en los logs del canary).
- [ ] Manual servido, ADR del gateway (Delta), invariantes MCP, runbooks, handoff de runtime, ledger de flags, skills (ambos espejos), Handoff, changelog y EPIC-049 actualizados.

## Verification

- `pnpm check` en `efeonce-mcp`; `pnpm check` en `efeonce-marketing-studio`.
- `pnpm local:check` y `pnpm test src/lib/sister-platforms src/lib/auth-server src/lib/entitlements` en Greenhouse;
  `pnpm mcp:skills:check`.
- Readback SQL de la capability y de los cuatro clientes (`pnpm pg:connect:shell`).
- `MCP_CANARY_TOKEN_FILE=… node scripts/marketing-studio-write-session-canary.mjs` contra producción: `tools/list`
  con las tools nuevas; subida completa; `dryRun` + aprobación; aprobación sin digest y con digest alterado; reintento
  idempotente; revisión vieja; organización ajena; descarga. Deny de aprobación con el token de la persona `designer`.
- Readback de `studio.audit_event` por `correlationId` (proxy 15433) y del audit del broker en Greenhouse.
- `pnpm docs:closure-check`, `pnpm flags:audit --strict --no-vercel`, `pnpm skills:mirrors`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Contrato de mantenimiento de la skill `efeonce-marketing-studio` cumplido en el mismo commit del cierre
- [ ] EPIC-049 actualizado y `MS-N7` del flujo maestro marcado con escritura
- [ ] Deltas registrados en TASK-1894, TASK-1895 y TASK-1898

## Follow-ups

- Federar al emisor nativo `auth.efeonce.org` cuando exista la policy nativa de Studio (D10, consentimiento nuevo).
- Escrituras de Studio para personas externas (grant, consentimiento, piloto).
- Confirmación por elicitation cuando los clientes certificados la soporten.
- Si el volumen crece, medir la latencia agregada por `userinfo` y evaluar un verificador de tokens sin ida y vuelta,
  sin caché positiva de autoridad.

## Open Questions

- Acción de `can()` para `marketing_studio.asset.write` y `marketing_studio.campaign.write`: se toma de
  `allowed_actions` que siembre TASK-1894; confirmar en Discovery y fijarla en ambas tablas de contratos (la de
  `campaign.approve` la decide esta task al sembrarla).
