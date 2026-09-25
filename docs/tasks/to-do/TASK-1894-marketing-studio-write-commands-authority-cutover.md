# TASK-1894 — Marketing Studio: commands de escritura y corte de autoridad desde OneDrive

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-25

- TASK-1899 pide: cada aprobación como command y tool propios con `requiresPerson` (`brief.approve`, `creative.approve`, `media_authorization.authorize`, `budget_line.approve`); las tools genéricas rechazan destinos aprobatorios; `dryRun` devuelve `proposalDigest` y las aprobaciones y acciones destructivas exigen repetirlo (sin él 428, alterado 409) por cualquier vía, UI incluida. Capability `marketing_studio.campaign.approve` separada de `write`.
- La URL firmada de subida es de esta task (`requestAssetUpload` + `registerAssetVersion`); TASK-1893 sólo entrega el almacén y la descarga.
- Regla del operador: todo lo de la UI se puede por API y por MCP, **incluidas las aprobaciones**. Toda aprobación (brief, presupuesto `approved`, Creatividad `→ approved`, Autorización `→ authorized`) exige un actor **persona** (sesión o identidad delegada verificable); un `api_client` de máquina sin persona recibe `approval_requires_person` (403). Las tools de aprobación se marcan en el manifiesto como clase `write` con `requiresPerson: true`; su federación es TASK-1899.
- Decisiones del operador: escriben `efeonce_admin`, `efeonce_operations`, `efeonce_account` y `designer`; el brief es entidad estructurada propia (sección «Brief como entidad»).
- TASK-1895 (UI consumidora) pide dos cosas a esta task: (1) una proyección de permisos en el reader de campaña — `writable`, `lockReason` (`open_mode` | `missing_capability` | `authority_onedrive`), transiciones permitidas por estado y `revision`; (2) un actor de prueba local y una campaña sandbox en staging para ejercitar escrituras antes del login (TASK-1898). Sin ellas, TASK-1895 se detiene en su Slice 1.
- TASK-1896 (observabilidad) debe cerrar antes de que estas escrituras lleguen a producción.

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
- Backend impact: `command`
- Epic: `EPIC-049`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1890`
- Branch: `Greenhouse develop (capability, docs) · efeonce-marketing-studio main (código y migraciones); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Convierte a Marketing Studio en la fuente de verdad escribible del catálogo de campañas. Agrega los commands
canónicos de escritura en `packages/domain` (campaña, brief, concepto, pieza y versión, copys, configuración de
anuncio, líneas del plan de medios, posts programados y transiciones de los tres estados), cada uno con
idempotencia, concurrencia optimista, actor atribuido y auditoría append-only, expuestos como `POST`/`PATCH`
`/api/v1/...` y como tools de clase escritura en el manifiesto. Luego corta la autoridad campaña por campaña desde
OneDrive con un flag `source_of_truth`, export inverso para rollback y, al final, retira OneDrive como fuente.

## Why This Task Exists

Studio (TASK-1887) sólo lee. El catálogo real sigue viviendo en `CATALOGO-DATOS.json` de OneDrive y entra por el
importador idempotente (`packages/domain/src/import/catalog.ts`). Mientras sea así:

- Nadie (persona, CLI ni agente) puede corregir un copy, registrar una versión nueva o mover un estado desde Studio;
  todo cambio se hace a mano en OneDrive y se reimporta, sin actor ni auditoría por cambio.
- Si alguien escribiera directo en `studio.*`, el siguiente reimport lo pisaría en silencio: no existe una noción de
  «esta campaña ya la gobierna Studio».
- Los invariantes del dominio (tres estados independientes; propuesto ≠ aprobado ≠ real, nunca sumados; copy
  literal; programado ≠ publicado; `null` = ausente) hoy sólo los protege el importador. Un camino de escritura
  sin commands canónicos los rompería desde el primer handler.
- TASK-1890 deja el manifiesto y la identidad de servicio, pero sin escrituras un agente autorizado no puede operar
  Studio (Full API Parity): la federación de escritura y el login dependen de que estos commands existan primero.

El login de personas (TASK-1898) es la última task del programa por decisión del operador. Hasta entonces, las
escrituras sólo deben ser posibles para `operator_cli` y para `api_client` con grant explícito de escritura, nunca
para `anonymous_open`.

## Goal

- Cada entidad escribible de `studio.*` tiene un command canónico en `packages/domain` con idempotencia, `If-Match`/revisión, actor, auditoría y errores canónicos; la API, la CLI y el MCP lo consumen sin lógica paralela.
- Los tres estados de campaña transicionan sólo por su matriz legal propia, y las líneas de presupuesto respetan la regla de `kind`.
- Una campaña pasa de OneDrive a Studio con un comando reversible, el importador se niega a pisarla y existe export inverso a `CATALOGO-DATOS.json`.
- Cuando todas las campañas activas están cortadas, OneDrive deja de ser fuente del catálogo (queda sólo como procedencia histórica de archivos).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (§Contrato obligatorio; §Futuro consumer Efeonce MCP)
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`
- `docs/campaigns/` (CDRs: qué es una campaña, sus estados y su registro)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (loop `propose → confirm → execute`)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Toda escritura pasa por un command de `packages/domain`. Los route handlers validan transporte y actor, y delegan; nunca escriben tablas.
- Tres estados independientes (`creative_state`, `media_authorization_state`, `launch_state`): cada uno tiene su propia matriz de transiciones legales y su propio command. Un command nunca mueve dos estados a la vez ni deriva uno del otro.
- `budget_line.kind ∈ {proposed, approved, actual}`: ningún command, reader ni export suma líneas de `kind` distinto. `actual` sólo entra por fuente observada (nunca por el mismo command que propone).
- Copy literal: el command guarda el texto tal cual (sin trim, sin normalizar comillas, sin corregir), y rechaza en vez de «arreglar».
- `scheduled_post` programado ≠ publicado: ningún command marca un post como publicado; eso llega sólo desde el proveedor.
- `null` = ausente: un `PATCH` distingue «campo omitido» (no tocar) de «campo en `null`» (borrar el dato), y nunca rellena con defaults.
- `anonymous_open` nunca escribe, aunque `STUDIO_ACCESS_MODE=open`. Sólo `operator_cli` y `api_client` con scope `studio:write` + organización permitida.
- El LLM nunca escribe directo: las tools de escritura se publican con clase `write` para que la federación exija scope de escritura y el patrón `propose → confirm`. La federación de escritura en el gateway no es de esta task.
- Capability nueva ⇒ grant a ≥1 rol real en `src/lib/entitlements/runtime.ts` en el mismo commit (`capability-grant-coverage.test.ts`).
- El importador nunca pisa una campaña con `source_of_truth = 'studio'`.

## Normative Docs

- `.claude/skills/efeonce-mcp-platform/SKILL.md` y la skill `mcp-craft` (nombres, descripciones y anotaciones de tools de escritura).
- `.claude/skills/greenhouse-backend/` (command semantics, errores canónicos, idempotencia).
- `AGENTS.md` y `CLAUDE.md` del repo `efeonce-marketing-studio` (comandos vigentes, gates `absolute-path-gate` y `domain-boundary-gate`).
- `docs/tasks/to-do/TASK-1890-marketing-studio-agent-ready-contract.md` (manifiesto, bearer, semántica: esta task los extiende, no los redefine).

## Dependencies & Impact

### Depends on

- `TASK-1890`: manifiesto de tools con guard de paridad, bearer de `api_client`, organización canónica en `campaign.organization_id`, semántica por campo y capability `marketing_studio.campaign.read`.
- `TASK-1887` (complete): Studio en producción, schema `studio` con 13 tablas y trigger append-only de `audit_event`.
- `TASK-1893`: almacén GCS de originales (`media_object`, descarga firmada, worker). **Decisión 2026-09-25: la URL firmada de subida y la versión creada desde Studio viven en esta task** (`requestAssetUpload` → PUT directo a GCS → `registerAssetVersion`, que verifica existencia, `sha256` y `byte_size` del objeto), reutilizando el primitive de almacenamiento de TASK-1893.

### Blocks / Impacts

- Federación MCP de escritura (follow-up de `TASK-1891`): consume las tools de clase `write` y la capability `marketing_studio.campaign.write`.
- `TASK-1898` (login de personas): el actor `user` hereda estos mismos commands; no se reescribe nada al activarlo.
- Toda UI futura de edición en Studio es consumidora de estos commands.
- Operación de campañas vigentes (`CMP-001…`): tras el corte, los cambios dejan de hacerse en OneDrive.

### Files owned

- Repo Studio: `packages/domain/src/commands/**`, `packages/domain/src/state-machines/**`, `packages/domain/src/idempotency.ts`, `packages/domain/src/import/catalog.ts` (guarda de autoridad), `packages/domain/src/export/catalog-export.ts`, `packages/contracts/src/commands.ts`, `packages/contracts/src/openapi.ts`, `packages/contracts/src/tool-manifest.ts`, `packages/contracts/generated/**`, `packages/database/migrations/*write-commands*`, `packages/database/migrations/*source-of-truth*`, `packages/database/src/schema.ts`, `apps/web/src/app/api/v1/**` (rutas `POST`/`PATCH`), `apps/web/src/server/api.ts`, `apps/web/src/server/runtime.ts`, `scripts/studio-write.ts` [verificar nombre], `scripts/cutover-campaign.ts`, `scripts/export-catalog.ts`, `scripts/import-catalog.ts`
- Greenhouse: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`, `migrations/*marketing-studio-write-capability*`, `docs/architecture/marketing-studio/**`, `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`, `docs/manual-de-uso/marketing-studio/**` [verificar carpeta], `docs/mcp/skills/marketing-studio/SKILL.md`

## Current Repo State

### Already exists

- Schema `studio` (`packages/database/migrations/1758800000000_studio-foundation.sql` y `1758830000000_asset-renditions.sql`): `campaign` con los tres estados con `CHECK`, `revision` y `updated_at`; `concept`; `asset` + `asset_version` (`storage_provider ∈ {onedrive_provenance, gcs}`, `UNIQUE (asset_id, version_no)`, unique parcial por `sha256`); `copy_variant` con `revision`; `audience`; `ad_configuration`; `media_flight` (`budget_status`); `budget_line` (`kind ∈ {proposed, approved, actual}`, unique por flight/kind/granularity/period/channel); `scheduled_post` (`provider = metricool`, `provider_status`); `import_run`; `audit_event` con trigger append-only; `api_client` (sha256, scopes, organization_ids, revocación).
- `Actor` con `anonymous_open | api_client | user | operator_cli` y visibilidad por organización (`packages/domain/src/actor.ts`).
- Importador idempotente con dry-run transaccional (`packages/domain/src/import/catalog.ts`, CLI `scripts/import-catalog.ts`, registro `scripts/seeds/campaign-registry.json`).
- Readers y API de lectura `/api/v1` (`attention`, `calendar`, `campaigns`, `health`, `openapi.json`, `renditions`, `search`) con errores `{ error, code, actionable }` (`packages/contracts/src/errors.ts`).
- `campaign.brief_ref` guarda sólo una referencia textual a `BRIEF.md` en OneDrive.

### Gap

- Ningún command de escritura; ninguna ruta `POST`/`PATCH`.
- Sin matriz de transiciones legales para los tres estados (hoy cualquier valor del `CHECK` es aceptable).
- Sin llave de idempotencia persistida ni control de revisión en entidades distintas de `campaign` y `copy_variant` [verificar tabla por tabla].
- Sin noción de autoridad por campaña: el importador pisaría cualquier cambio hecho en Studio.
- Sin export inverso a `CATALOGO-DATOS.json` ni runbook de corte.
- El brief no tiene contenido propio en Studio (sólo `brief_ref`).
- Sin capability de escritura en Greenhouse ni tools de clase `write` en el manifiesto.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `repo efeonce-marketing-studio (packages/domain commands, packages/contracts, packages/database migraciones, apps/web rutas /api/v1) + Greenhouse (capability de escritura y documentación)`
- Future candidate home: `api`
- Boundary: `los commands de packages/domain/src/commands son el único camino de escritura sobre studio.*; apps/web (HTTP), la CLI de operador, el importador y la futura federación MCP son adaptadores que los invocan; el manifiesto de packages/contracts es la única fuente del inventario de tools`
- Server/browser split: `commands, idempotencia, stores y verificación de bearer sólo server-side; al navegador sólo llegan DTOs de contrato ya existentes`
- Build impact: `none sobre greenhouse-eo salvo capability y docs; en Studio no entra dependencia pesada nueva (zod y kysely ya están)`
- Extraction blocker: `none — Studio ya es un repo y runtime propios; la única transacción cruza tablas de un mismo schema`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `schema studio (todas las entidades escribibles) y la autoridad del catálogo, que pasa de CATALOGO-DATOS.json en OneDrive a Studio campaña por campaña`
- Consumidores afectados: `API /api/v1, CLI de operador, importador de catálogo, manifiesto de tools y futura federación MCP de escritura, futura UI de edición, actor user de TASK-1898`
- Runtime target: `production (Vercel de studio.efeonce.org + base de Studio) y Greenhouse (capability)`

### Contract surface

- Contrato existente a respetar: `OpenAPI v1 de Studio; errores { error, code, actionable }; manifiesto tool-manifest.v1 y guard de paridad de TASK-1890; MCP_TOOL_SURFACE_INVARIANTS; ADR API-first`
- Contrato nuevo o modificado: `commands en packages/domain/src/commands (ver Detailed Spec); rutas POST/PATCH /api/v1/... con Idempotency-Key obligatorio y If-Match en toda mutación de entidad existente; ETag en lecturas de entidad; tools studio.*.create|update|transition con clase write; columna source_of_truth; export inverso; capability marketing_studio.campaign.write`
- Backward compatibility: `compatible — rutas y tools nuevas; las lecturas agregan ETag y el campo sourceOfTruth; el importador cambia sólo para campañas cortadas`
- Full API parity: `cada escritura es un command con contrato; HTTP, CLI y MCP son adaptadores del mismo command; el guard de paridad del manifiesto exige tool o exclusión para cada operación nueva`

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.campaign (+source_of_truth, +cutover_at, +cutover_by), studio.campaign_brief [nueva] + studio.campaign_brief_audience + studio.campaign_brief_kpi [nuevas], studio.concept, studio.asset, studio.asset_version, studio.copy_variant, studio.ad_configuration, studio.media_flight, studio.budget_line, studio.scheduled_post, studio.audit_event, studio.idempotency_record [nueva], studio.api_client (scope studio:write)`
- Invariantes que no se pueden romper:
  - Los tres estados sólo cambian por su command de transición y dentro de su matriz legal; una transición ilegal devuelve `409 invalid_state_transition` y no escribe nada.
  - Ningún command, reader ni export suma `budget_line` de `kind` distinto; un command de presupuesto escribe exactamente un `kind` por llamada. `actual` no se escribe por command de operador ni agente en esta task (sólo por fuente observada).
  - El copy se persiste byte a byte como llegó; un test compara el valor leído con el enviado, incluidos espacios, saltos y comillas tipográficas.
  - Ningún command pone un `scheduled_post` en estado publicado.
  - `PATCH` distingue omitido de `null`; nunca se escriben defaults inventados.
  - `asset_version` es append-only: registrar una versión crea `version_no = max + 1`; nunca se reemplaza ni borra una versión existente.
  - Toda escritura exitosa inserta exactamente un `audit_event` en la misma transacción, con actor, operación, entidad, `correlation_id` y un `detail` con los campos cambiados (antes/después, sin copys completos de otras entidades).
  - `anonymous_open` nunca llega a un command: `403 write_not_allowed` antes de abrir transacción.
  - Un `api_client` escribe sólo si tiene scope `studio:write` y la campaña pertenece a una de sus `organization_ids`; fuera de ellas, `404` anti-oráculo.
  - El importador no modifica ninguna fila de una campaña con `source_of_truth = 'studio'` ni de sus hijos; lo reporta como `skipped_studio_owned` en `import_run`.
  - El corte es por campaña, auditado y reversible mientras exista export inverso validado.
- Write-target allowlist: `N/A — Studio no tiene boundary test de destinos de escritura; el domain-boundary-gate existente se extiende para que sólo packages/domain/src/commands e import escriban en studio.*`
- Tenant/space boundary: `organización canónica de Greenhouse en campaign.organization_id (TASK-1890); el actor api_client se intersecta con organization_ids; operator_cli ve todo; user queda preparado para TASK-1898`
- Idempotency/concurrency: `Idempotency-Key obligatorio en todo POST/PATCH: tabla studio.idempotency_record (actor, key, request_hash, response, expires_at); misma llave + mismo cuerpo ⇒ misma respuesta sin reescribir; misma llave + cuerpo distinto ⇒ 422 idempotency_key_reused. Concurrencia optimista con revision: If-Match con la revisión vigente; distinta ⇒ 412 revision_conflict sin escribir; ausencia de If-Match en mutación ⇒ 428 precondition_required. Cada command corre en una transacción; UPDATE … WHERE revision = $expected y revision = revision + 1`
- Audit/outbox/history: `audit_event append-only en la misma transacción que la escritura; sin outbox (Studio no tiene consumidores reactivos todavía); import_run registra saltos por autoridad`

### Migration, backfill and rollout

- Migration posture: `additive — columnas nuevas con DEFAULT (source_of_truth DEFAULT 'onedrive', revision donde falte DEFAULT 1), tablas nuevas (idempotency_record, campaign_brief), CHECK de source_of_truth; sin DROP`
- Default state: `commands desplegados pero sólo alcanzables por operator_cli y api_client con studio:write; ningún api_client tiene ese scope al desplegar; todas las campañas quedan en source_of_truth = 'onedrive'`
- Backfill plan: `backfill de revision = 1 en tablas que la reciben; source_of_truth = 'onedrive' para las campañas existentes por DEFAULT; el corte de cada campaña es un comando explícito, no un backfill`
- Rollback path: `commands: revocar el scope studio:write y revert del deploy; corte: cutover --revert por campaña (vuelve a onedrive) tras importar el export inverso a OneDrive; migración: down que elimina columnas y tablas nuevas sólo si ninguna campaña está en studio`
- External coordination: `secreto del token de escritura del operador o del gateway en Secret Manager como scalar crudo; release de Greenhouse para la capability; aviso a quienes editan CATALOGO-DATOS.json antes de cortar cada campaña`

### Security and access

- Auth/access gate: `operator_cli (CLI local con credencial de base) o api_client con scope studio:write + organización permitida; en Greenhouse, capability marketing_studio.campaign.write que el gateway verificará por persona en la federación de escritura`
- Sensitive data posture: `presupuestos propuestos y aprobados, copys y configuración de anuncios (sensibilidad comercial interna); sin PII personal; tokens sólo como sha256`
- Error contract: `{ error (es), code, actionable } con códigos nuevos: write_not_allowed (403), invalid_state_transition (409), revision_conflict (412), precondition_required (428), idempotency_key_reused (422), budget_kind_violation (422), campaign_not_studio_owned (409, escritura sobre campaña aún en onedrive), validation_failed (422); nunca SQL ni stack al cliente`
- Abuse/rate-limit posture: `sin rate limit propio en V1 (sólo actores de servicio con scope explícito); el gateway aplicará el suyo; idempotency_record con expiración para no crecer sin límite`

### Runtime evidence

- Local checks: `pnpm check en Studio (tests de cada command, matriz de transiciones, idempotencia, conflicto de revisión, copy literal, regla de kind, guarda del importador, paridad del manifiesto); pnpm local:check y pnpm test src/lib/entitlements en Greenhouse`
- DB/runtime checks: `tras migrar: columnas y tablas nuevas presentes en staging y producción; audit_event con una fila por escritura del smoke; UPDATE/DELETE sobre audit_event sigue fallando`
- Integration checks: `curl con bearer studio:write contra preview y producción: create 201, repetición con misma llave 200 idéntico, If-Match viejo 412, transición ilegal 409, sin bearer 403`
- Reliability signals/logs: `logs de Vercel con correlationId por escritura; import_run con skipped_studio_owned visible tras el corte`
- Production verification sequence: `ver Rollout Plan`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive: cada escritura vive en `packages/domain/src/commands`, no en handlers ni en la CLI.
- [ ] Modelada como command por aggregate (campaña, pieza, copy, plan de medios, post), no como click-handler.
- [ ] Cada command con authorization fina (scope `studio:write` + organización + capability Greenhouse), idempotencia, auditoría, errores canónicos sanitizados y `correlationId`.
- [ ] Capability `marketing_studio.campaign.write` + grant a ≥1 rol real en el mismo commit, con coverage test verde.
- [ ] Camino programático declarado: `/api/v1` + CLI de operador + tools de clase `write` en el manifiesto; la federación MCP de escritura queda como follow-up explícito.
- [ ] Writes aptos para `propose → confirm → execute`: cada tool de escritura declara clase `write` y admite un modo de simulación (`dryRun`) que devuelve el diff sin escribir.
- [ ] Un primitive, muchos consumers: HTTP, CLI e importador invocan los mismos commands.
- [ ] Parity check = SÍ para cada operación nueva (guard del manifiesto verde).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fundación de escritura (schema + infraestructura de command)

- Migración Studio aditiva: `studio.idempotency_record`; `revision` + `updated_at` en toda tabla escribible que no los tenga; `campaign.source_of_truth text NOT NULL DEFAULT 'onedrive' CHECK (source_of_truth IN ('onedrive','studio'))` + `cutover_at`, `cutover_by`; `studio.campaign_brief` con campos estructurados y revisión (ver «Brief como entidad») + `campaign_brief_audience` y `campaign_brief_kpi`; bloque `DO` de verificación post-DDL.
- `packages/domain/src/commands/_kernel.ts` [verificar nombre]: ejecutor común que valida actor (bloquea `anonymous_open`), resuelve idempotencia, abre transacción, verifica `revision`, escribe `audit_event` en la misma transacción y devuelve el resultado con la nueva revisión. Ningún command se escribe fuera de este ejecutor.
- Errores canónicos nuevos en `packages/contracts/src/errors.ts`.
- `domain-boundary-gate` extendido: sólo `packages/domain/src/commands/**` e `import/**` escriben en `studio.*`.

### Slice 2 — Máquinas de estado y regla de presupuesto

- `packages/domain/src/state-machines/`: una matriz legal por estado (`creative_state`, `media_authorization_state`, `launch_state`), tabla-driven y exportada para el manifiesto y el manual.
- Commands `transitionCreativeState`, `transitionMediaAuthorization`, `transitionLaunchState`, cada uno con nota obligatoria y referencia de decisión opcional (`decision_refs`).
- Regla de `kind` para presupuesto: helper único que valida `kind`, `granularity` y moneda, y que rechaza cualquier intento de sumar o convertir entre `kind`.
- Tests exhaustivos: toda transición legal pasa, toda ilegal da `409` sin escribir; un test de propiedad asegura que ningún command toca dos estados.

### Slice 3 — Commands de campaña, brief, concepto y pieza

- `createCampaign`, `updateCampaign` (campos descriptivos; nunca estados), `upsertCampaignBrief`, `createConcept`, `updateConcept`, `createAsset`, `updateAsset`, `registerAssetVersion` (append-only; exige objeto existente en GCS con `sha256`/`byte_size` verificados si TASK-1893 ya entregó el almacén; ver Open Questions).
- Toda escritura sobre una campaña en `source_of_truth = 'onedrive'` responde `409 campaign_not_studio_owned` salvo `createCampaign` (que nace en `studio`).

### Slice 4 — Commands de copy, anuncios, plan de medios y calendario

- `createCopyVariant`, `updateCopyVariant` (literal, con test byte a byte).
- `createAdConfiguration`, `updateAdConfiguration` (referencias a pieza, copy y audiencia existentes de la misma campaña).
- `createMediaFlight`, `updateMediaFlight`, `setBudgetLine` (un `kind` por llamada; sólo `proposed` o `approved`; `approved` exige referencia de aprobación), `removeBudgetLine` (sólo `proposed`, auditado).
- `createScheduledPost`, `updateScheduledPost`, `cancelScheduledPost` (programado ≠ publicado: ningún command escribe estado publicado).

### Slice 5 — API, CLI y manifiesto

- Rutas `POST`/`PATCH` en `apps/web/src/app/api/v1/**` que sólo parsean, resuelven actor (bearer con `studio:write` u operador) y delegan; `Idempotency-Key` obligatorio, `If-Match` obligatorio en mutaciones, `ETag` en lecturas de entidad, `dryRun=true` devuelve el diff sin escribir.
- OpenAPI con request/response schemas desde zod y los códigos de error de cada operación.
- CLI de operador `pnpm studio:write <command> --file payload.json` [verificar nombre] que invoca los commands como `operator_cli`.
- Manifiesto: una tool por command (`studio.campaign.create`, `studio.campaign.update`, `studio.campaign.creative_state.transition`, `studio.copy.update`, `studio.media_plan.budget_line.set`, …) con clase `write`, anotaciones `destructiveHint`/`idempotentHint` correctas y capability `marketing_studio.campaign.write`; guard de paridad y leak test verdes.
- CLI `pnpm api-client:create --scope studio:write` habilitada (el alta de TASK-1890 acepta el scope nuevo).

### Slice 6 — Corte de autoridad desde OneDrive

- Guarda en el importador: campañas con `source_of_truth = 'studio'` (y todos sus hijos) se saltan y quedan en `import_run` como `skipped_studio_owned`; test de regresión.
- Export inverso `pnpm export:catalog --out <CATALOGO-DATOS.json>`: produce el formato que consume el importador; test de ida y vuelta (import → export → import en dry-run sin diferencias).
- Comando `pnpm cutover:campaign --campaign CMP-### [--dry-run|--apply|--revert]`: valida que el último import de esa campaña no tenga diff pendiente, cambia `source_of_truth`, registra `cutover_at`/`cutover_by` y `audit_event`.
- Runbook de corte en `docs/manual-de-uso/marketing-studio/` [verificar carpeta] y delta en `EFEONCE_CAMPAIGN_REGISTRY_V1.md`.

### Slice 7 — Greenhouse, rollout y retiro de OneDrive como fuente

- Capability `marketing_studio.campaign.write` en `src/config/entitlements-catalog.ts` + migración seed en `capabilities_registry` + grant a roles internos reales verificados en `src/config/role-codes.ts` (decisión del operador 2026-09-25: `efeonce_admin`, `efeonce_operations`, `efeonce_account`, `designer`).
- Manual `docs/mcp/skills/marketing-studio/SKILL.md`: sección de escritura (qué command usar, cómo leer un `412`, por qué nunca sumar presupuestos, que publicar no es una acción de Studio).
- Corte campaña por campaña de todas las activas; cuando no queda ninguna en `onedrive`, el importador pasa a rechazar el modo `apply` del catálogo (queda sólo lectura de procedencia de archivos) y el runbook lo declara.
- Arquitectura de Studio (§escritura, §autoridad), Handoff y changelog.

## Out of Scope

- Federación MCP de escritura en el gateway (registro de tools `write`, scope de clase, UI de confirmación): follow-up de `TASK-1891`.
- Login de personas y actor `user` operativo (`TASK-1898`).
- Upload firmado y media worker (`TASK-1893`), salvo el registro de versión sobre un objeto ya existente.
- UI de edición en `studio.efeonce.org`.
- Escribir `budget_line.kind = 'actual'` o `launch_state = live_observed` desde fuentes observadas (Meta/Metricool): task propia de ingesta.
- Publicar posts o lanzar anuncios en proveedores: Studio no publica.
- Borrado físico de cualquier entidad (sólo archivado/cancelación auditada).

## Detailed Spec

### Matrices de transición (propuesta; confirmar contra los CDRs de `docs/campaigns/` en Discovery)

| Estado | Transiciones legales |
|---|---|
| `creative_state` | `unknown → in_production`, `in_production → final_available`, `final_available → approved`, `final_available → in_production`, `approved → in_production` (reapertura, nota obligatoria) |
| `media_authorization_state` | `unknown → pending`, `unknown → not_applicable`, `pending → authorized`, `pending → blocked`, `blocked → pending`, `authorized → blocked` (nota obligatoria) |
| `launch_state` | `not_launched → launch_unverified`, `launch_unverified → not_launched`, `paused → ended`, `launch_unverified → ended`; `live_observed` y `paused` sólo llegan desde observación (fuera de esta task) |

Ninguna transición depende del valor de otro estado: `approved` creativo no implica autorización de medios ni lanzamiento.

### Forma común de un command

```ts
type CommandInput<T> = {
  actor: Actor
  idempotencyKey: string
  expectedRevision?: number // obligatorio en mutaciones de entidad existente
  correlationId: string
  dryRun?: boolean
  payload: T
}

type CommandResult<R> = { entity: R; revision: number; auditEventId: string; replayed: boolean }
```

### Tools de escritura (nombres a confirmar con `mcp-craft` y el estilo final de TASK-1890)

| Command | Tool | Anotaciones |
|---|---|---|
| `createCampaign` | `studio.campaign.create` | write, no destructiva |
| `updateCampaign` | `studio.campaign.update` | write, idempotente con misma llave |
| `transition*` | `studio.campaign.{creative_state,media_authorization,launch_state}.transition` | write |
| `upsertCampaignBrief` | `studio.campaign.brief.upsert` | write |
| `createConcept` / `updateConcept` | `studio.concept.create` / `studio.concept.update` | write |
| `createAsset` / `updateAsset` / `registerAssetVersion` | `studio.asset.create` / `studio.asset.update` / `studio.asset.version.register` | write |
| `createCopyVariant` / `updateCopyVariant` | `studio.copy.create` / `studio.copy.update` | write |
| `createAdConfiguration` / `updateAdConfiguration` | `studio.ad.create` / `studio.ad.update` | write |
| `createMediaFlight` / `updateMediaFlight` / `setBudgetLine` / `removeBudgetLine` | `studio.media_plan.flight.create` / `.update` / `studio.media_plan.budget_line.set` / `.remove` | write; `remove` destructiva |
| `createScheduledPost` / `updateScheduledPost` / `cancelScheduledPost` | `studio.calendar.post.create` / `.update` / `.cancel` | write; `cancel` destructiva |

Exclusiones con razón: `cutover:campaign`, `export:catalog` y `api-client:*` son operaciones de operador por CLI, no tools.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → (Slice 3 ∥ Slice 4) → Slice 5 → Slice 6 → Slice 7.
- Slice 5 (exposición HTTP y tools) no se despliega antes de que Slices 1–4 tengan tests verdes: sin kernel ni matrices, la API escribiría sin invariantes.
- La guarda del importador (Slice 6) se despliega **antes** del primer `cutover --apply`: cortar una campaña sin guarda permite que el próximo reimport la pise.
- El retiro de OneDrive como fuente (Slice 7) ocurre sólo cuando todas las campañas activas están en `studio` y el export inverso pasó su prueba de ida y vuelta.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un reimport pisa cambios hechos en Studio | data | medium | guarda del importador + test de regresión antes del primer corte | `import_run` sin `skipped_studio_owned` para una campaña cortada |
| Escritura anónima por el modo `open` | identity | low | kernel bloquea `anonymous_open` antes de la transacción + test HTTP sin bearer | `audit_event.actor = anonymous_open` (debe ser cero) |
| Presupuestos sumados entre `kind` | data | low | helper único + test que falla si un reader/export suma `kind` distinto | diferencia entre total mostrado y líneas por `kind` |
| Pérdida de actualización por escritura concurrente | data | medium | `If-Match` obligatorio + `UPDATE … WHERE revision` | tasa de `412 revision_conflict` en logs |
| Reintentos duplican entidades | data | medium | `Idempotency-Key` obligatorio + `idempotency_record` | filas duplicadas por nombre y campaña |
| Copy alterado al guardar | content | low | test byte a byte | diferencia entre el valor enviado y el leído |
| Export inverso incompleto impide el rollback | data | medium | test de ida y vuelta obligatorio antes de cada corte | dry-run de reimport con diff |
| Un agente escribe sin confirmación humana | MCP | low | tools con clase `write` sin federar en esta task; `dryRun` disponible para el paso `propose` | tool `write` visible en el gateway antes de su task |
| Capability sin grant | entitlements | low | `capability-grant-coverage.test.ts` | CI rojo |

### Feature flags / cutover

- Sin env var: la exposición se controla por el scope `studio:write`, que ningún `api_client` tiene al desplegar; habilitarlo es un alta explícita por CLI y revocarlo es inmediato.
- El corte de autoridad es un flag por campaña en base (`campaign.source_of_truth`), cambiado sólo por `cutover:campaign` con dry-run previo y reversible con `--revert`.
- El retiro de OneDrive como fuente es un cambio de código del importador (rechazo de `apply` del catálogo), reversible con revert.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | migración down (columnas y tablas nuevas; sólo si ninguna campaña está en `studio`) + revert | minutos | sí |
| Slice 2 | revert (sin commands expuestos todavía) | minutos | sí |
| Slice 3–4 | revert; las filas escritas quedan auditadas y se corrigen con otro command | minutos | parcial (las escrituras hechas no se deshacen solas) |
| Slice 5 | revocar `studio:write` de todo `api_client` + revert del deploy | < 5 min | sí |
| Slice 6 | `cutover:campaign --revert` tras llevar el export inverso a OneDrive | < 30 min por campaña | sí mientras el export valide |
| Slice 7 | revert del importador para aceptar `apply` otra vez; revert de capability (sin uso) | minutos | sí |

### Production verification sequence

1. Migración en staging; verificar columnas, tablas y `DO` de verificación; `UPDATE` sobre `audit_event` sigue fallando.
2. Deploy preview de Studio: create 201, replay con misma llave idéntico, `If-Match` viejo 412, transición ilegal 409, sin bearer 403, `api_client` sin `studio:write` 403, organización ajena 404.
3. Producción de Studio con el mismo set usando una campaña sintética de prueba en `studio`, luego archivada.
4. Guarda del importador en producción: reimport completo en dry-run con la campaña sintética ⇒ `skipped_studio_owned`.
5. Export inverso + reimport en dry-run sin diff sobre las campañas reales.
6. Corte de la primera campaña real con `--dry-run`, luego `--apply`; editar un copy por CLI; reimport dry-run la salta; export la refleja.
7. Resto de campañas activas, una por una; al final, retiro de OneDrive como fuente.
8. Release de Greenhouse con la capability y el manual actualizado.

### Out-of-band coordination required

- Avisar a quienes editan `CATALOGO-DATOS.json` en OneDrive antes de cortar cada campaña: desde el corte, esa campaña se edita sólo en Studio.
- Secreto del token de escritura del operador o del gateway en Secret Manager (scalar crudo).
- Release de Greenhouse por el control plane (capability + manual).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un command en `packages/domain/src/commands` por cada operación de la tabla del Detailed Spec, y el `domain-boundary-gate` falla si otro módulo escribe en `studio.*`.
- [ ] Toda transición legal de los tres estados pasa y toda ilegal devuelve `409 invalid_state_transition` sin escribir; un test verifica que ningún command modifica dos estados.
- [ ] `setBudgetLine` escribe un solo `kind` por llamada, rechaza `actual`, y un test falla si algún reader o export suma `kind` distintos.
- [ ] Un copy guardado y leído es idéntico byte a byte al enviado (test con espacios, saltos y comillas tipográficas).
- [ ] Ningún command deja un `scheduled_post` en estado publicado.
- [ ] `PATCH` con un campo omitido no lo toca; con el campo en `null`, lo borra.
- [ ] Misma `Idempotency-Key` y mismo cuerpo devuelven la misma respuesta sin nueva fila; mismo `Idempotency-Key` con cuerpo distinto devuelve `422 idempotency_key_reused`.
- [ ] `If-Match` desactualizado devuelve `412 revision_conflict`; sin `If-Match` en una mutación, `428`.
- [ ] Sin bearer (modo `open`) toda escritura devuelve `403 write_not_allowed`; `api_client` sin `studio:write`, `403`; organización ajena, `404`.
- [ ] Cada escritura exitosa deja exactamente un `audit_event` con actor, operación, entidad y `correlation_id`.
- [ ] El manifiesto incluye una tool de clase `write` por command, con capability `marketing_studio.campaign.write`, y el guard de paridad y el leak test están verdes.
- [ ] `marketing_studio.campaign.write` existe en catálogo TS y `capabilities_registry` con grant a ≥1 rol real (coverage test verde).
- [ ] El importador salta toda campaña con `source_of_truth = 'studio'` y lo registra como `skipped_studio_owned`.
- [ ] Import → export → import en dry-run no produce diferencias para las campañas reales.
- [ ] `cutover:campaign` tiene `--dry-run`, `--apply` y `--revert`, y cada uno deja `audit_event`.
- [ ] Todas las campañas activas quedan en `source_of_truth = 'studio'` en producción, y el importador rechaza `apply` del catálogo.
- [ ] Runbook de corte, arquitectura de Studio, registro de campañas, manual servido, Handoff y changelog actualizados.

## Verification

- `pnpm check` en Studio (incluye gates, typecheck y tests de commands, matrices, idempotencia, guarda del importador y paridad del manifiesto)
- `pnpm local:check` y `pnpm test src/lib/entitlements` en Greenhouse
- `curl` con bearer `studio:write` contra preview y producción de Studio según la Production verification sequence
- Consulta de `studio.audit_event` e `import_run` en producción tras el primer corte

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] EPIC-049 actualizado con el corte de autoridad y el estado de OneDrive
- [ ] `TASK-1891` recibe un `## Delta` con las tools de clase `write` disponibles para su follow-up

## Follow-ups

- Federación MCP de escritura en el gateway con scope de clase y confirmación humana (extensión de `TASK-1891`).
- Ingesta de observaciones (`actual`, `live_observed`, `paused`, publicado) desde Meta y Metricool.
- UI de edición en Studio como consumidora de estos commands.
- Purga periódica de `studio.idempotency_record` expirados si el volumen lo pide.

## Open Questions

- ~~¿El brief se modela como tabla?~~ Resuelto 2026-09-25: sí, entidad estructurada propia (ver «Brief como entidad»).
- ~~¿Dónde vive el upload firmado?~~ Resuelto 2026-09-25: en esta task (ver Dependencies), sobre el almacén de TASK-1893.
- Matrices de transición: confirmar con el operador y los CDRs las reaperturas permitidas (`approved → in_production`, `authorized → blocked`).
- ~~Roles con escritura~~ Resuelto 2026-09-25: `efeonce_admin`, `efeonce_operations`, `efeonce_account` y `designer`.
