# TASK-1890 — Marketing Studio listo para agentes: manifiesto de tools, semántica y autoridad de servicio

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `api`
- Epic: `EPIC-049`
- Status real: `Implementación`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `Greenhouse develop (docs, capability, manual servido) · efeonce-marketing-studio main (código); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Prepara a Efeonce Marketing Studio para que cualquier agente autorizado lo opere completo por Efeonce MCP y lo
entienda sin adivinar. Studio publica un **manifiesto canónico de tools**, derivado de sus contratos, que cubre
todas sus capacidades o declara la exclusión con su razón. Además agrega descripciones semánticas por campo,
autenticación de servicio para su API, la organización canónica de Greenhouse, un reader de detalle de pieza y un
manual de operación para agentes servido por `get_greenhouse_skill`. La federación en el gateway es `TASK-1891`.

## Why This Task Exists

El operador pidió (2026-09-25) que **absolutamente todo Studio** sea accesible por MCP para agentes autorizados, y
que estos lo interpreten de forma semántica. Hoy la API `/api/v1` es sólo de lectura, abierta y pensada para la web:

- No existe una lista autoritativa de «qué capacidades tiene Studio». Sin ella, la federación se desincroniza sin
  aviso: Greenhouse sufrió 8 tools federadas a la deriva con el guard en verde, hasta que `TASK-1780` derivó el
  inventario de un manifiesto.
- Los DTOs no explican lo que un agente malinterpreta primero: los tres estados independientes, propuesto ≠
  aprobado ≠ gasto, programado ≠ publicado, copy literal y `null` = ausente.
- Un agente no tiene cómo autenticarse en la API. El gateway necesita una identidad de servicio con alcance por
  organización (el `api_client` existe en el schema, pero ningún camino HTTP lo usa).
- `campaign.organization_id` guarda `EO-ORG-0007` (id público), pero el gateway resuelve organizaciones por el id
  canónico de Greenhouse (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`). Sin alinearlos, la política de membership no
  puede aplicarse.
- Ninguna capability de Greenhouse representa «leer Studio», así que el gateway no tiene qué verificar para la persona.

## Goal

- Studio declara en un manifiesto versionado con hash todas sus operaciones: cada una tiene su tool o una exclusión con razón, y un test lo exige.
- Cada tool y cada campo de salida llevan la semántica que un agente necesita para no inventar.
- La API acepta un bearer de servicio con organizaciones permitidas, sin romper la web en modo `open`.
- Greenhouse tiene la capability de lectura de Studio con grant a roles reales y sirve un manual de operación para agentes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (§Futuro consumer Efeonce MCP; §Contrato obligatorio)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md` §22
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El manifiesto se **deriva** de `packages/contracts` (schemas zod y rutas del OpenAPI). Nunca es una lista mantenida a mano en paralelo.
- Nunca federar «todo» envolviendo cada endpoint en automático (ADR §Futuro consumer): cada tool se decide por intención, con respuesta acotada, schema explícito y errores accionables. Lo que no se federa va en `exclusions` con razón.
- Una organización enviada por el cliente nunca concede acceso: Studio intersecta con las organizaciones permitidas del `api_client`.
- Nunca incrustar contenido del manual en Studio ni en el gateway: vive en Greenhouse (`docs/mcp/skills/marketing-studio/SKILL.md`) y se sirve por `get_greenhouse_skill`.
- Capability nueva ⇒ grant a ≥1 rol real en `src/lib/entitlements/runtime.ts` en el mismo commit (`capability-grant-coverage.test.ts`).

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` y la skill `mcp-craft` (granularidad, nombres, descripciones, forma de respuesta, errores, drift gates).
- `docs/mcp/skills/` y `src/mcp/greenhouse/skill-manifest.ts` (mecanismo de manuales servidos, TASK-1804).
- `src/mcp/greenhouse/tool-manifest.ts` (patrón de manifiesto + artefacto generado con hash, TASK-1780).

## Dependencies & Impact

### Depends on

- `TASK-1887` (complete): Studio en producción con API v1.
- Organización Greenhouse `org-2df565fb-98aa-42f7-b324-ea9a2209017f` (`EO-ORG-0007`, Efeonce).

### Blocks / Impacts

- `TASK-1891` (federación en el gateway) consume el manifiesto, el bearer de servicio, la capability y el manual.
- Toda task futura de EPIC-049 que agregue una capacidad (commands de escritura, métricas, worker) debe extender el manifiesto en el mismo PR.

### Files owned

- Repo Studio: `packages/contracts/src/tool-manifest.ts`, `packages/contracts/src/semantics.ts`, `packages/contracts/generated/**`, `packages/domain/src/auth/**`, `packages/domain/src/readers/asset.ts`, `packages/database/migrations/*organization-canonical*`, `apps/web/src/server/runtime.ts`, `apps/web/src/app/api/v1/assets/**`, `scripts/seeds/campaign-registry.json`, `scripts/api-client.ts`
- Greenhouse: `docs/mcp/skills/marketing-studio/SKILL.md`, `src/mcp/greenhouse/skill-manifest.ts`, `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, `migrations/*marketing-studio-capability*`, `docs/architecture/marketing-studio/**`

## Current Repo State

### Already exists

- API `/api/v1` con 12 rutas en OpenAPI 3.1 (`packages/contracts/src/openapi.ts`), readers en `packages/domain`.
- Tipo `Actor` con `api_client` y visibilidad por organización (`packages/domain/src/actor.ts`); tabla `studio.api_client` (hash sha256, scopes, organization_ids, revocación).
- Modo de acceso `open` que resuelve un actor anónimo (`apps/web/src/server/runtime.ts`).
- Mecanismo de manuales MCP en Greenhouse (`get_greenhouse_skill`, TASK-1804) y patrón de manifiesto de tools con artefacto hash-verificado (TASK-1780).

### Gap

- Ningún manifiesto de tools ni guard de paridad en Studio.
- DTOs sin semántica por campo; las descripciones del OpenAPI son mínimas.
- La API no acepta bearer; el `api_client` no tiene alta ni verificación.
- Organización guardada como id público, no canónico.
- Sin reader de detalle de pieza (versiones, anuncios que la usan, copys de su concepto, renditions).
- Sin capability Greenhouse ni manual servido.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-marketing-studio (packages/contracts, packages/domain, apps/web) + Greenhouse (capability y manual servido)`
- Future candidate home: `api`
- Boundary: `el manifiesto en packages/contracts es la única fuente del inventario de capacidades para agentes; el gateway consume su artefacto generado; la web, la CLI y el MCP usan los mismos readers`
- Server/browser split: `bearer y manifiesto sólo server-side; nada nuevo llega al navegador`
- Build impact: `none sobre greenhouse-eo salvo el manual y la capability; Studio agrega un artefacto generado versionado`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `packages/contracts (manifiesto + semántica), studio.campaign.organization_id, studio.api_client, capabilities_registry de Greenhouse`
- Consumidores afectados: `gateway Efeonce MCP (TASK-1891), web de Studio, CLI, futuros agentes`
- Runtime target: `production (Vercel Studio) + Greenhouse`

### Contract surface

- Contrato existente a respetar: `OpenAPI v1 de Studio; ADR API-first §Contrato obligatorio; MCP_TOOL_SURFACE_INVARIANTS`
- Contrato nuevo o modificado: `tool-manifest.v1 (artefacto generado con manifestHash); GET /api/v1/assets/{assetId}; GET /api/v1/tool-manifest; bearer de servicio (Authorization: Bearer) en todas las rutas /api/v1; descripciones semánticas en schemas`
- Backward compatibility: `compatible (campos nuevos, rutas nuevas; el cambio de organization_id es interno y sólo cambia el valor expuesto en campaigns.organizationId)`
- Full API parity: `el manifiesto exige que cada operación del OpenAPI tenga tool o exclusión; la web sigue usando los mismos readers`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.campaign.organization_id (valor canónico), studio.api_client (alta y verificación), greenhouse_core.capabilities_registry (nueva capability)`
- Invariantes que no se pueden romper:
  - Toda operación de `/api/v1` aparece en el manifiesto como tool o como exclusión con razón; un test falla nombrando la operación si no.
  - El manifiesto es determinista: mismo código ⇒ mismo `manifestHash`; editar el artefacto a mano rompe la verificación.
  - Descripciones de tools y campos en español neutro, sin ids internos, rutas de repo, nombres de secretos ni proyectos GCP (leak test).
  - Una organización enviada por el cliente sólo filtra dentro de las permitidas por el `api_client`; fuera de ellas, 404 anti-oráculo.
  - El token del `api_client` se guarda sólo como sha256; el valor claro se muestra una vez al darlo de alta y nunca se loggea.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura`
- Tenant/space boundary: `organización canónica de Greenhouse en campaign.organization_id; actor api_client ∩ organizationId solicitado`
- Idempotency/concurrency: `N/A — solo lecturas y alta de cliente por CLI (una fila por alta)`
- Audit/outbox/history: `audit_event por alta y revocación de api_client; lecturas por bearer con correlationId en logs (sin cuerpo)`

### Migration, backfill and rollout

- Migration posture: `additive + backfill (organization_id público → canónico)`
- Default state: `bearer aceptado en paralelo al modo open; sin tools publicadas hasta TASK-1891`
- Backfill plan: `migración idempotente EO-ORG-0007 → org-2df565fb-98aa-42f7-b324-ea9a2209017f en staging y luego producción; registro semilla actualizado para que el reimport no revierta`
- Rollback path: `migración down (vuelve al id público); revert del deploy`
- External coordination: `secreto nuevo del token del cliente del gateway en Secret Manager (lo consume TASK-1891); release de Greenhouse para capability y manual`

### Security and access

- Auth/access gate: `bearer de api_client (sha256, scopes, organization_ids, revocable); en Greenhouse, capability marketing_studio.campaign.read verificada por el gateway`
- Sensitive data posture: `presupuestos propuestos y copys (sensibilidad comercial interna); sin PII personal`
- Error contract: `{ error (es), code, actionable }` existente; 401 unauthorized sin bearer válido cuando se envía uno inválido; 404 anti-oráculo fuera de las organizaciones permitidas`
- Abuse/rate-limit posture: `sin rate limit propio en V1; el gateway aplica el suyo`

### Runtime evidence

- Local checks: `pnpm check en Studio (incluye paridad del manifiesto y leak test); pnpm local:check, mcp:skills:check y capability-grant-coverage en Greenhouse`
- DB/runtime checks: `SELECT organization_id FROM studio.campaign en ambas bases tras la migración`
- Integration checks: `curl con bearer al deployment de producción: 200 dentro de la org permitida, 404 fuera, 401 con token inválido`
- Reliability signals/logs: `logs de Vercel con correlationId por request con bearer`
- Production verification sequence: `ver Rollout Plan`

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en readers del dominio, no en handlers.
- [ ] Reads expuestos como readers canónicos con contrato; el alta de `api_client` como comando de CLI con auditoría.
- [ ] Capability + grant en el mismo commit (`marketing_studio.campaign.read`).
- [ ] Camino programático declarado: `/api/v1` + manifiesto para MCP (TASK-1891).
- [ ] Un primitive, muchos consumers: web, CLI y MCP usan los mismos readers.

<!-- ZONE 2 — PLAN MODE: lo llena el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Organización canónica

- Migración Studio: `campaign.organization_id` de `EO-ORG-0007` al id canónico `org-2df565fb-98aa-42f7-b324-ea9a2209017f`, con `CHECK (organization_id ~ '^org-[0-9a-f-]{36}$')` NOT VALID + VALIDATE.
- Registro semilla con el id canónico; aplicado en staging y producción.

### Slice 2 — Autoridad de servicio en la API

- `resolveActor(request)` acepta `Authorization: Bearer <token>`: sha256 → `api_client` activo → actor `api_client` con scopes y organizaciones. Token inválido ⇒ 401; sin bearer ⇒ comportamiento del modo vigente (`open`).
- CLI `pnpm api-client:create --label --org … --scope studio:read` (muestra el token una vez) y `api-client:revoke`, con `audit_event`.
- Parámetro `organizationId` en lecturas de colección (`campaigns`, `attention`, `calendar`, `search`), intersectado con la visibilidad del actor.
- `X-Correlation-Id` aceptado y devuelto; logs sin cuerpo.

### Slice 3 — Semántica y reader de pieza

- `packages/contracts/src/semantics.ts`: glosario canónico (estados, `kind` de presupuesto, `observation`, `null` = ausente, copy literal) reutilizado en `.meta({ description })` de cada campo relevante.
- Reader `getAsset` + `GET /api/v1/assets/{assetId}`: pieza, versiones, renditions, anuncios que la usan, copys de su concepto y campaña.
- Descripciones del OpenAPI reescritas desde la semántica (sin transcribir a mano).

### Slice 4 — Manifiesto de tools y guard de paridad

- `packages/contracts/src/tool-manifest.ts`: por operación → nombre de tool, descripción para agentes (cuándo usarla, qué no significa), `inputSchema` / `outputSchema` (JSON Schema desde zod), clase `read|write`, `annotations`, capability de Greenhouse requerida; `exclusions` con razón (p. ej. `health` = operacional; `openapi.json` = metadato).
- `pnpm mcp:manifest:generate|check` → artefacto `generated/tool-manifest.json` con `manifestHash`; `GET /api/v1/tool-manifest` lo sirve.
- Tests: paridad OpenAPI ↔ manifiesto (bidireccional, nombra la operación), leak test de descripciones y determinismo del hash. `pnpm check` los incluye.
- `AGENTS.md` de Studio: toda capacidad nueva extiende el manifiesto en el mismo PR.

### Slice 5 — Greenhouse: capability y manual servido

- Capability `marketing_studio.campaign.read` en `entitlements-catalog.ts` + migración seed en `capabilities_registry` + grant a roles internos reales (p. ej. `efeonce_admin`, `efeonce_operations`, `efeonce_account`), verificados contra `src/config/role-codes.ts`.
- Manual `docs/mcp/skills/marketing-studio/SKILL.md` (audiencia `internal`): qué es Studio, flujo recomendado (atención → campaña → pieza), cómo leer estados y presupuestos, qué nunca afirmar; entrada en `skill-manifest.ts`; `pnpm mcp:skills:generate`.

### Slice 6 — Rollout y documentación

- Staging → producción de Studio; release de Greenhouse con capability y manual.
- Secreto `marketing-studio-mcp-gateway-token` (valor del `api_client` del gateway, scalar crudo) para TASK-1891.
- Arquitectura de Studio (§4 contrato, §5 acceso, nueva §Agentes), runbook, Handoff y changelog.

## Out of Scope

- Registrar tools en el gateway, deploy del gateway y canary MCP (TASK-1891).
- Escrituras y sus tools (task de commands de EPIC-049; nacerán en el manifiesto).
- Login de personas en la web (`auth.efeonce.org`), último del programa por decisión del operador.
- Métricas de marketing desde Greenhouse (task hija propia).

## Detailed Spec

Nombres de tools propuestos (confirmar con `mcp-craft` al implementar; espacio de nombres `studio.*`, estilo de `identity.*` / `hiring.*`):

| Operación | Tool |
|---|---|
| `GET /api/v1/attention` | `studio.attention.get` |
| `GET /api/v1/campaigns` | `studio.campaigns.list` |
| `GET /api/v1/campaigns/{id}` | `studio.campaign.get` |
| `GET /api/v1/campaigns/{id}/assets` | `studio.campaign.assets.list` |
| `GET /api/v1/assets/{assetId}` | `studio.asset.get` |
| `GET /api/v1/campaigns/{id}/copies` | `studio.campaign.copies.list` |
| `GET /api/v1/campaigns/{id}/ads` | `studio.campaign.ads.list` |
| `GET /api/v1/campaigns/{id}/plan` | `studio.campaign.media_plan.get` |
| `GET /api/v1/campaigns/{id}/posts` | `studio.campaign.posts.list` |
| `GET /api/v1/calendar` | `studio.calendar.get` |
| `GET /api/v1/search` | `studio.search` |
| `GET /api/v1/renditions/{id}` | `studio.asset.preview` (el gateway devuelve contenido de imagen MCP) |
| `GET /api/v1/health`, `GET /api/v1/openapi.json`, `GET /api/v1/tool-manifest` | exclusiones (operacional / metadato) |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 (la intersección por organización necesita el id canónico).
- Slice 3 → Slice 4 (el manifiesto toma descripciones de la semántica).
- Slice 5 puede correr en paralelo desde el inicio.
- Slice 6 al final; TASK-1891 no empieza su deploy sin el artefacto y el secreto.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reimport revierte el id canónico | data | medium | registro semilla actualizado en el mismo commit; CHECK de formato | CHECK falla en el apply |
| Bearer de servicio da acceso a otras organizaciones | identity | low | intersección obligatoria + test de denegación 404 | test de dominio |
| Manifiesto se desalinea del OpenAPI | MCP | medium | test bidireccional en `pnpm check` | CI rojo nombrando la operación |
| Descripciones filtran ids internos o rutas | MCP | low | leak test | CI rojo |
| Capability sin grant | entitlements | low | `capability-grant-coverage.test.ts` | CI rojo |

### Feature flags / cutover

- Sin flag: bearer aditivo al modo `open`; sin tools publicadas hasta TASK-1891.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate down` + registro anterior | minutos | sí |
| Slice 2 | revert + revocar `api_client` | minutos | sí |
| Slice 3–4 | revert | minutos | sí |
| Slice 5 | revert (capability sin uso) | minutos | sí |
| Slice 6 | revert de docs / borrar secreto | minutos | sí |

### Production verification sequence

1. Migración + reimport en staging; `organization_id` canónico en las 5 campañas.
2. Deploy preview de Studio: bearer 200 / 404 / 401; web sin cambios.
3. Producción de Studio con el mismo set de pruebas.
4. Release de Greenhouse: capability visible en `capabilities_registry`, manual servido por `/api/platform/ecosystem/mcp/skills/marketing-studio`.

### Out-of-band coordination required

- Release de Greenhouse por el control plane (capability + manual).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 5 campañas tienen `organization_id` canónico en staging y producción, y un reimport no lo revierte.
- [ ] Con bearer válido de un `api_client` de la org Efeonce: `/api/v1/campaigns` 200; con `organizationId` ajeno, 404; con token inválido, 401; sin bearer, la web sigue funcionando en modo `open`.
- [ ] `GET /api/v1/assets/{assetId}` devuelve pieza, versiones, renditions, anuncios y copys del concepto.
- [ ] El manifiesto cubre las 13 operaciones de `/api/v1` (tool o exclusión con razón) y el test de paridad falla nombrando la operación cuando se agrega una ruta sin entrada.
- [ ] `manifestHash` es determinista y `mcp:manifest:check` falla si el artefacto se edita a mano.
- [ ] Leak test verde sobre todas las descripciones.
- [ ] `marketing_studio.campaign.read` existe en catálogo TS y `capabilities_registry`, con grant a ≥1 rol real (coverage test verde).
- [ ] El manual `marketing-studio` se sirve por el lane de skills de Greenhouse en producción.
- [ ] Secreto del token del gateway creado como scalar crudo.
- [ ] Arquitectura, runbook, Handoff y changelog actualizados.

## Verification

- `pnpm check` en Studio
- `pnpm local:check`, `pnpm mcp:skills:check`, `pnpm test src/lib/entitlements` en Greenhouse
- `curl` con bearer contra el deployment de producción de Studio

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] EPIC-049 actualizado; TASK-1891 desbloqueada

## Follow-ups

- TASK-1891 (federación en el gateway).
- Las escrituras de Studio nacen con su tool en el manifiesto y su scope de clase de escritura (task de commands).

## Open Questions

- Estilo final de nombres de tools (`studio.*` punteado vs `get_studio_*`): resolver con `mcp-craft` y el estilo vigente del gateway antes del Slice 4.
