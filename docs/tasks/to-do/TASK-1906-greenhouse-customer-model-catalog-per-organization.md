# TASK-1906 — Greenhouse: catálogo versionado de modelo de cliente (ICP) por organización, con lane ecosystem y MCP

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

Decisiones de Julio Reyes (operador) del 2026-09-26:

- **Se crea la clase de scope `efeonce.mcp.commercial.write`** (Slice 4). Nombre genérico por radio de impacto
  comercial; la capability `commercial.customer_model.manage` acota lo que permite hoy. Sumar otra escritura comercial
  a esta clase se evalúa en la task de esa escritura, contra la regla «una clase por radio de impacto».
- **Quién publica el modelo de cliente:** `efeonce_admin` siempre (es el rol de máximo privilegio y puede todo, decisión
  del operador 2026-09-26); además `efeonce_account` para una organización **cliente**. La organización **propia de
  Efeonce** (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`) sólo la publica `efeonce_admin`. El grant de
  `commercial.customer_model.manage` sigue en `efeonce_admin` y `efeonce_account`; la regla por tipo de organización la
  aplica el command de publicación (`forbidden` si no corresponde).

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
- Backend impact: `migration`
- Epic: `EPIC-049`
- Status real: `Diseno — creada 2026-09-26; resuelve la pregunta abierta 1 del ADR de capa de estrategia (dueño, tablas y capability del catálogo)`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none` (reutiliza el carril delegado de TASK-1852 ya vivo; la federación de escrituras requiere que la clase de scope nueva exista en Entra, incluido como slice)
- Branch: `Greenhouse develop (dominio, migraciones, lanes, manifiesto MCP, docs) · efeonce-mcp rama + PR a main (provider, contratos de canje, versión; deploy por dispatch manual); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crea en Greenhouse el **catálogo versionado de modelo de cliente por organización**: segmentos (ICP y anti-ICP),
buyer personas, trabajos por hacer (JTBD) situados, roles del buying group (operador, operador-champion, dueño del
problema, sponsor, comprador económico, dueño de gobierno), etapas del bow-tie con los internal names de HubSpot y un
libro de evidencia por afirmación. Las versiones publicadas son inmutables. Se lee por el lane ecosystem y por tools
MCP de lectura; se edita en borrador y se publica por commands del lane app con la autoridad delegada de una persona
(`T1` borrador, `T2` publicación con `dryRun` → digest → confirmación). La primera versión es la de Efeonce, sembrada
desde `docs/context/13_icp-buyer-personas-jtbd.md`; Studio (TASK-1905/1907) la referencia por organización, versión e id.

## Why This Task Exists

- El ICP de Efeonce vive sólo como contexto documental (`docs/context/13_icp-buyer-personas-jtbd.md`: 12 ICP, BP1–BP8
  vigentes y BP9 candidata) y el buying group en `docs/business-models/OPERATOR_BUYING_GROUP_REGISTRY_V1.md`. Ningún
  sistema puede referenciar «la persona BP2 de la versión que usamos en marzo»: no hay ids estables, versión ni
  evidencia consultable por máquina (verificado: `grep` de `icp` en `src/lib` sólo encuentra la taxonomía de business
  model del grader, 2026-09-26).
- El ADR de capa de estrategia (§4.3) decide que Greenhouse es dueño del modelo de cliente, **por organización** (una
  campaña de Sky o Berel apunta al modelo de ese cliente) y con versiones publicadas inmutables; deja abiertos el dominio
  dueño, las tablas y la capability de publicación (§11.1). Sin esta task, Studio sólo podría inventar personas locales,
  que el ADR prohíbe.
- Full API Parity: el catálogo nace con lectura y escritura programáticas, para que comercial, GTM, Nexa, Studio y los
  agentes lean y gobiernen la misma verdad.

## Goal

- Existe `greenhouse_commercial.customer_model_*` con catálogo por organización, versiones inmutables, ids estables
  entre versiones, nivel de evidencia por segmento y persona, y libro de evidencia.
- El lane ecosystem sirve el modelo publicado con anti-oráculo por organización; el lane app permite borrador (`T1`) y
  publicación (`T2`) con la persona como actor auditado.
- Tools MCP de lectura y escritura en el manifiesto de Greenhouse, federadas en el gateway, con una clase de scope de
  escritura propia de comercial.
- La versión 1 de Efeonce está publicada desde el contexto documental, revisada por una persona.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §3.1
  opción C, §4.3, §5 niveles, §8 invariantes, §11.1 pregunta que esta task resuelve)
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` (el catálogo
  cuelga de `greenhouse_core.organizations`, no crea identidad paralela)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lanes ecosystem y app, bindings, anti-oráculo)
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` y `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_CLIENT_SERVICE_EXPERIENCE_DECISION_V1.md` §Delta 2026-09-10 (patrón de escritura MCP con
  autoridad humana delegada, TASK-1852)
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` (migraciones, markers, bloque `DO`)

Reglas obligatorias:

- **Dominio dueño: comercial** (modelo de cliente = GTM y venta; la skill `efeonce-customer-model-operator` es su
  método). Código en `src/lib/commercial/customer-model/**`, tablas en `greenhouse_commercial`. Growth y Studio son
  consumidores.
- El catálogo es **por organización** (`organization_id` canónico `org-…`); nunca un catálogo global único.
- Versión `published` inmutable (trigger); ids de segmento, persona, trabajo y rol **estables entre versiones** para que
  una referencia `(organización, versión, id)` siga significando lo mismo.
- Nunca declarar ICP, persona, urgencia o comprador sin evidencia: cada segmento y persona declara
  `evidence_level ∈ {validated, documented, hypothesis}` y publicar exige al menos una fila de evidencia por segmento y
  persona activos. Una hipótesis se puede publicar y se ve como hipótesis.
- Roles del buying group por **función**, nunca por cargo fijo (contrato Operator-First).
- Etapas del bow-tie con los internal names de HubSpot vigentes; nunca etapas inventadas. Etapa del bow-tie ≠ fase
  creativa del embudo (esa vive en Studio).
- Escrituras sólo por commands de `src/lib/commercial/customer-model/commands/**` en una transacción con audit y outbox.
- `canonicalErrorResponse` en rutas; nada de prosa inglesa al cliente.

## Normative Docs

- `docs/context/13_icp-buyer-personas-jtbd.md` y `docs/business-models/OPERATOR_BUYING_GROUP_REGISTRY_V1.md` (fuente de
  la semilla).
- `docs/strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md` (roles del buying group).
- `docs/context/11_hubspot-bowtie.md` (internal names del bow-tie).
- `.claude/skills/efeonce-customer-model-operator/SKILL.md` (método: integridad, evidencia, roles).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `mcp-craft` (federación, clase de scope, canary).
- `.claude/skills/greenhouse-backend/SKILL.md` y `greenhouse-postgres`.

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations` (FK del catálogo) y el patrón de lanes (`runEcosystemReadRoute`, lane app con autoridad
  delegada de TASK-1852: `mcp-token-exchange.ts`, `resolve…Authority` por llamada).
- Gateway `efeonce-mcp` con el patrón de provider que monta la config del lane (`greenhouse-insights`/`greenhouse-skills`).
- Recurso Entra «Efeonce MCP Resource» (se agrega la clase nueva con round-trip verificado).

### Blocks / Impacts

- `TASK-1905` Slice 6 (referencias ICP en audiencias y campaña de Studio).
- `TASK-1907` (matriz persona × etapa × canal del plan de campaña).
- `TASK-1909` (paquete de contexto de IA con personas y JTBD).
- Consumidores futuros: Nexa (lectura por paridad), propuestas comerciales, TASK-1593 (ICP enterprise de Globe, política:
  cuando se decida, se publica como versión de la organización correspondiente, no como documento aparte).

### Files owned

- `src/lib/commercial/customer-model/**` [nuevo] (`types.ts`, `validators.ts`, `readers.ts`, `commands/**`, `authority.ts`, `digest.ts`)
- `src/lib/api-platform/resources/ecosystem-commercial-customer-model.ts` [nuevo] y `app-commercial-customer-model.ts` [nuevo]
- `src/app/api/platform/ecosystem/commercial/customer-model/**` [nuevo]
- `src/app/api/platform/app/commercial/customer-model/**` [nuevo]
- `migrations/<ts>_task-1906-customer-model-catalog.sql` [nuevo], `migrations/<ts>_task-1906-customer-model-capabilities.sql` [nuevo], `migrations/<ts>_task-1906-mcp-customer-model-oauth-client.sql` [nuevo]
- `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`
- `src/lib/sister-platforms/mcp-token-exchange.ts` (cliente y scope), `src/lib/auth-server/oauth/scopes.ts` (paridad de la clase)
- `src/mcp/greenhouse/tool-manifest.ts` + artefacto generado
- `scripts/commercial/customer-model-seed.ts` [nuevo], `scripts/commercial/customer-model-seeds/efeonce-v1.json` [nuevo]
- `docs/architecture/commercial/GREENHOUSE_CUSTOMER_MODEL_CATALOG_V1.md` [nuevo], `docs/documentation/commercial/catalogo-modelo-de-cliente.md` [nuevo], `docs/manual-de-uso/commercial/gobernar-modelo-de-cliente.md` [nuevo], `docs/mcp/skills/customer-model/SKILL.md` [nuevo] (manual servido)
- Gateway `efeonce-mcp`: `src/providers/greenhouse-customer-model.ts` [nuevo], contratos de canje, `EXPECTED_GREENHOUSE_PLATFORM_TOOLS`, `package.json`, `surface-baseline.json`, `scripts/greenhouse-customer-model-canary.mjs` [nuevo]

## Current Repo State

### Already exists

- Contexto documental del ICP de Efeonce (`docs/context/13_icp-buyer-personas-jtbd.md`), registro de buying groups
  (`docs/business-models/OPERATOR_BUYING_GROUP_REGISTRY_V1.md`) y bow-tie (`docs/context/11_hubspot-bowtie.md`).
- Taxonomía de business model del grader (`src/lib/growth/ai-visibility/taxonomy/business-model.ts`): clasifica marcas
  para el grader; **no** es un modelo de cliente y no se reutiliza como tal.
- Lanes ecosystem/app, exchange RFC 8693 por capability y patrón de provider federado (`greenhouse-insights`,
  `greenhouse-client-services`).
- Capabilities `commercial.*` existentes en `src/config/entitlements-catalog.ts` (ninguna de modelo de cliente).

### Gap

- No hay tablas, readers, commands, lanes ni tools del modelo de cliente.
- No hay clase de scope MCP de escritura para el dominio comercial.
- No hay ids estables de personas ni segmentos que un tercero pueda referenciar.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/commercial/customer-model/**` + rutas `src/app/api/platform/{ecosystem,app}/commercial/customer-model/**` en Greenhouse + provider en `efeonce-mcp`
- Future candidate home: `domain-package`
- Boundary: readers y commands en `src/lib/commercial/customer-model/**`; consumers autorizados: lane ecosystem (Studio, gateway), lane app (personas vía gateway), tools MCP de Greenhouse, Nexa
- Server/browser split: dominio, lanes y exchange corren en servidor; no hay componente de navegador en esta task
- Build impact: `none` (la semilla JSON la lee sólo el script CLI, nunca un módulo alcanzable por una ruta)
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_commercial.customer_model_*` (nuevo)
- Consumidores afectados: Studio (lane ecosystem), gateway MCP (lectura y escritura), Nexa, comercial
- Runtime target: `staging` y `production` (Vercel de Greenhouse), gateway en Cloud Run

### Contract surface

- Contrato existente a respetar: `runEcosystemReadRoute` y resolución de organización por binding (org-scoped manda; `internal` exige `organizationId`; 404 anti-oráculo); lane app con autoridad delegada por llamada; manifiesto `src/mcp/greenhouse/tool-manifest.ts` con `manifestHash`
- Contrato nuevo o modificado: lanes y tools en Detailed Spec §«Superficie»; DTO `CustomerModelV1`
- Backward compatibility: `compatible` (todo nuevo)
- Full API parity: un reader y un set de commands; UI futura, Nexa, Studio y agentes consumen lo mismo

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_commercial.customer_model_catalog`, `customer_model_version`, `customer_model_segment`, `customer_model_persona`, `customer_model_job`, `customer_model_buying_role`, `customer_model_bowtie_stage`, `customer_model_evidence` (nuevas)
- Invariantes que no se pueden romper:
  - una versión `published` no cambia (trigger rechaza `UPDATE`/`DELETE` de filas de esa versión)
  - un id de segmento/persona/trabajo/rol conserva su significado entre versiones; retirar ≠ reutilizar
  - publicar exige evidencia para cada segmento y persona activos; `hypothesis` visible como tal
  - una sola versión `draft` abierta por catálogo; publicar supersede la anterior en la misma transacción
  - etapas del bow-tie sólo con internal names verificados
- Write-target allowlist: N/A (el dominio comercial no tiene boundary test de destinos hoy; si Discovery encuentra uno, las tablas nuevas se declaran en él en el mismo PR)
- Tenant/space boundary: `organization_id` del catálogo; lane ecosystem por binding; lane app por autoridad de la persona (capability + membership interna)
- Idempotency/concurrency: `Idempotency-Key` en todo command; `If-Match` con `revision` de la versión en borrador; publicar con `SELECT … FOR UPDATE` sobre el catálogo
- Audit/outbox/history: audit append-only por command; eventos `commercial.customer_model.version_published` y `…draft_updated` al outbox en la misma transacción; versiones superseded conservadas

### Migration, backfill and rollout

- Migration posture: `additive` + `seed` (versión 1 de Efeonce por command, no por SQL)
- Default state: `COMMERCIAL_CUSTOMER_MODEL_ENABLED=false` (lanes responden `disabled`) hasta la semilla publicada en staging
- Backfill plan: `pnpm customer-model:seed --organization org-2df565fb-98aa-42f7-b324-ea9a2209017f --file scripts/commercial/customer-model-seeds/efeonce-v1.json --dry-run` → revisión humana → `--apply` crea el borrador; la publicación la confirma una persona con el digest
- Rollback path: flag OFF; revert PR; las tablas quedan (sin consumidores)
- External coordination: scope nuevo en el recurso Entra (round-trip); allowlist del cliente de canje en Vercel production + redeploy; env del gateway en `deploy.yml`; dispatch manual del gateway

### Security and access

- Auth/access gate: lectura `commercial.customer_model.read` (lane app) o binding ecosystem; escritura `commercial.customer_model.manage` (acciones `create`, `update`, `approve`) por lane app con token delegado; clase MCP `efeonce.mcp.commercial.write`
- Sensitive data posture: sin PII; la evidencia cita fuentes (documentos, entrevistas por referencia), nunca datos personales de entrevistados
- Error contract: `canonicalErrorResponse` con códigos nuevos (`customer_model_not_found`, `customer_model_version_immutable`, `customer_model_evidence_missing`, `customer_model_draft_exists`, `confirmation_required`, `confirmation_mismatch`)
- Abuse/rate-limit posture: un borrador por catálogo; tope de 500 entidades por versión

### Runtime evidence

- Local checks: tests de validators, commands (borrador, publicación con digest, inmutabilidad), readers y lanes (binding propio, ajeno 404, `internal` sin org 400); `capability-grant-coverage.test.ts`; `pnpm mcp:manifest:check`
- DB/runtime checks: migración aplicada y verificada por `information_schema` + bloque `DO`; trigger probado con un `UPDATE` que falla
- Integration checks: canary del provider contra staging y production (lectura Efeonce, deny 404, escritura en borrador con persona, publicación con digest, persona sin capability `forbidden`)
- Reliability signals/logs: `captureWithDomain(err, 'commercial', …)`; señal `commercial.customer_model.stale_hypothesis` (warning cuando una persona `hypothesis` referenciada por una campaña activa supera 180 días sin evidencia nueva) queda como Follow-up
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `src/lib/commercial/customer-model/**`.
- [ ] Modelada como aggregate (catálogo → versiones → entidades) y commands, no como handlers.
- [ ] Reader canónico; commands con capability fina, idempotencia, `If-Match`, audit + outbox y errores canónicos.
- [ ] `commercial.customer_model.read` y `.manage` con grant a roles reales y coverage test en el mismo PR.
- [ ] Camino programático: lane ecosystem + lane app + tools MCP federadas.
- [ ] Publicación apta para `propose → confirm → execute` (`dryRun` → digest → confirmación).
- [ ] Un primitive, muchos consumers (Studio, Nexa, gateway, comercial).
- [ ] Parity check = SÍ.

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

### Slice 1 — Esquema y validators

- Migración `<ts>_task-1906-customer-model-catalog.sql` (marker `-- Up Migration`, bloque `DO` que verifica tablas,
  trigger de inmutabilidad, GRANTs a `greenhouse_runtime`) con el modelo de Detailed Spec §«Modelo».
- `src/lib/commercial/customer-model/validators.ts`: validators tipados (sin Zod) por tipo de entidad; roles del buying
  group como enum cerrado; `bowtie_stage.hubspot_internal_name` contra la lista de `docs/context/11_hubspot-bowtie.md`
  (verificada en Discovery contra las propiedades de HubSpot del portal `48713323` por el reader de propiedades
  existente [verificar]).
- `pnpm db:generate-types`.

### Slice 2 — Readers y lane ecosystem

- Readers `listCustomerModelVersions(organizationId)`, `getCustomerModel(organizationId, { version? })` (por defecto la
  última `published`), `getCustomerModelEntity(organizationId, version, kind, id)`.
- Payload `ecosystem-commercial-customer-model.ts` + rutas `GET /api/platform/ecosystem/commercial/customer-model` y
  `GET /api/platform/ecosystem/commercial/customer-model/versions` con `runEcosystemReadRoute`; flag OFF ⇒ `disabled`.

### Slice 3 — Commands y lane app con autoridad delegada

- Commands `createCustomerModelDraft` (`T1`, clona la última publicada o parte vacío), `upsertCustomerModelDraftEntity`
  (`T1`, por tipo; quitar = marcar `status = 'removed'` en el borrador, reversible), `publishCustomerModelVersion`
  (`T2`), `discardCustomerModelDraft` (`T2`). `T2` con `dryRun` → `proposalDigest` (sha256 del diff contra la última
  publicada + `baseRevision` + persona) → confirmación con el digest; `428 confirmation_required` sin él, `409
  confirmation_mismatch` si cambió.
- Lane app `POST/PATCH /api/platform/app/commercial/customer-model/**` con resolución de autoridad por llamada
  (patrón `resolveServiceEnablementAuthority`): capability `commercial.customer_model.manage` + membership interna;
  el recibo registra `authority: { kind: 'delegated_oauth' | 'app_session', … }`.

### Slice 4 — Capabilities, clase de scope y cliente de canje

- `commercial.customer_model.read` (`actions: ['read']`) y `commercial.customer_model.manage`
  (`actions: ['create','update','approve']`) en catálogo + seed en `capabilities_registry` + grants: read a
  `efeonce_admin`, `efeonce_account`, `efeonce_operations`; manage (las tres acciones) a `efeonce_admin` y
  `efeonce_account`. Coverage test verde. Publicar (`approve`) además exige, por decisión del operador del 2026-09-26:
  `efeonce_admin` en cualquier organización, y `efeonce_account` sólo en organizaciones cliente; el command de
  publicación lo verifica con el tipo de organización y responde `forbidden` si no corresponde.
- Clase MCP `efeonce.mcp.commercial.write` en `src/lib/auth-server/oauth/scopes.ts` (`EFEONCE_MCP_WRITE_SCOPES`, test
  de paridad) y en el recurso Entra «Efeonce MCP Resource» (scope Admin, round-trip verificado leyendo el arreglo antes y
  después; `az ad app update` reemplaza el arreglo completo). **Nunca** en el cliente PKCE público compartido.
- Cliente de canje `efeonce-mcp-customer-model` por migración (input scope `efeonce.mcp.commercial.write`, scope
  Greenhouse `commercial.customer_model.manage`, `requireOnPrivilegedAction = true`) y allowlist
  `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` + redeploy.

### Slice 5 — Tools MCP y manual servido

- Entradas en `src/mcp/greenhouse/tool-manifest.ts`: `get_customer_model` (read, base scope),
  `list_customer_model_versions` (read, base scope), `upsert_customer_model_draft` (write, `T1`),
  `publish_customer_model_version` (write, `T2`, `destructiveHint: false`, requiere digest),
  `discard_customer_model_draft` (write, `T2`). `pnpm mcp:manifest:generate` + `pnpm mcp:manifest:check`.
- Manual servido `docs/mcp/skills/customer-model/SKILL.md` (audiencia `internal`; cómo leer evidencia, cómo proponer un
  borrador y cuándo pedir confirmación); entrada en `src/mcp/greenhouse/skill-manifest.ts`; `pnpm mcp:skills:generate` +
  `pnpm mcp:skills:check` (leak test).

### Slice 6 — Gateway

- Provider `greenhouse-customer-model` en `efeonce-mcp`: lecturas por el lane ecosystem montando la config del provider
  SEO (patrón `greenhouse-insights`, sin env nueva para lecturas); escrituras por canje (cliente
  `efeonce-mcp-customer-model`) y lane app, detrás de `GREENHOUSE_CUSTOMER_MODEL_WRITES_ENABLED` (declarada en
  `deploy.yml`, default `false`). Política: issuer Entra; nativo `unsupported` (`customer_model_native_policy_missing`).
- `pnpm greenhouse:manifest:sync`, entradas en `EXPECTED_GREENHOUSE_PLATFORM_TOOLS`, `efeonce.gateway.status` lista el
  provider (probado por la puerta HTTP), bump minor, `pnpm surface:baseline`, PR, merge, dispatch.

### Slice 7 — Semilla de Efeonce, rollout y documentación

- `scripts/commercial/customer-model-seeds/efeonce-v1.json` redactado desde `docs/context/13` y el registro de buying
  groups: 12 segmentos (`fit: target`) + anti-ICP declarados en el contexto (si no hay, ninguno), BP1–BP8 `documented`
  (evidencia: el documento de Segmentación Comercial mar-2026 citado en el contexto), BP9 `hypothesis`, JTBD por
  segmento, roles del buying group por función y etapas del bow-tie. Revisión humana del JSON antes del `--apply`.
- CLI `pnpm customer-model:seed` crea el borrador por el command (actor = persona que lo corre); la publicación v1 la
  confirma una persona con el digest.
- Docs: arquitectura nueva, documentación funcional, manual de uso, `DECISIONS_INDEX` (si el dominio dueño se registra
  como decisión), `FEATURE_FLAG_STATE_LEDGER.md` (dos flags), Handoff, changelog.

## Out of Scope

- UI de Greenhouse para editar el modelo de cliente (follow-up `ui-ux`; hasta entonces lane app, CLI y agentes).
- Personas de clientes externos editando su propio modelo (grant, consentimiento y piloto aparte).
- Sincronizar personas o segmentos hacia HubSpot (el bow-tie se referencia, no se escribe).
- Consumo desde Studio (TASK-1905 Slice 6 y TASK-1907).
- Modelos de clientes (Sky, Berel): el catálogo los admite; sembrarlos es trabajo comercial con evidencia propia.

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `customer_model_catalog` | `catalog_id text PK` (`cmc-…`), `organization_id text UNIQUE FK greenhouse_core.organizations`, `created_at` |
| `customer_model_version` | `(catalog_id, version_no) PK`, `status draft\|published\|superseded`, `based_on int NULL`, `change_note text`, `created_by`, `published_by`, `published_at`, `revision` |
| `customer_model_segment` | `(catalog_id, version_no, segment_id) PK` (`seg-…` estable), `name`, `fit target\|anti`, `business_line text NULL`, `firmographics jsonb` (industria, tamaño, geografía, madurez), `triggers text[]`, `pains text[]`, `entry_path gateway\|cross_sell\|null`, `evidence_level`, `status active\|removed` |
| `customer_model_persona` | `(catalog_id, version_no, persona_id) PK` (`per-…` estable), `code text NULL` (p. ej. `BP2`), `name`, `segment_ids text[]`, `central_pain`, `needs_to_see`, `evidence_level`, `status` |
| `customer_model_job` | `(catalog_id, version_no, job_id) PK` (`job-…`), `segment_id`, `persona_id NULL`, `situation`, `motivation`, `expected_outcome`, `evidence_level`, `status` |
| `customer_model_buying_role` | `(catalog_id, version_no, role_id) PK`, `segment_id`, `role operator\|operator_champion\|problem_owner\|sponsor\|economic_buyer\|governance_owner`, `function_description`, `persona_id NULL`, `status` |
| `customer_model_bowtie_stage` | `(catalog_id, version_no, stage_key) PK`, `hubspot_internal_name`, `label`, `side acquisition\|expansion`, `position int` |
| `customer_model_evidence` | `evidence_id PK`, `catalog_id`, `version_no`, `subject_kind`, `subject_id`, `claim`, `source_kind document\|interview\|deal\|research\|operator`, `source_ref`, `as_of date`, `confidence low\|medium\|high` |

### Superficie

| Lane / tool | Método y ruta | Nivel | Autoridad |
|---|---|---|---|
| lectura modelo | `GET /api/platform/ecosystem/commercial/customer-model?organizationId=&version=` · tool `get_customer_model` | T0 | binding ecosystem / base scope |
| lectura versiones | `GET /api/platform/ecosystem/commercial/customer-model/versions?organizationId=` · tool `list_customer_model_versions` | T0 | ídem |
| crear borrador | `POST /api/platform/app/commercial/customer-model/drafts` · tool `upsert_customer_model_draft` (sin `entity` crea) | T1 | `commercial.customer_model.manage:create` |
| editar entidad del borrador | `PATCH /api/platform/app/commercial/customer-model/drafts/{versionNo}/entities/{kind}/{id}` · tool `upsert_customer_model_draft` | T1 | `…manage:update` |
| publicar | `POST /api/platform/app/commercial/customer-model/drafts/{versionNo}/publish` · tool `publish_customer_model_version` | T2 | `…manage:approve` |
| descartar borrador | `DELETE /api/platform/app/commercial/customer-model/drafts/{versionNo}` · tool `discard_customer_model_draft` | T2 | `…manage:update` |

### DTO de lectura (forma)

```ts
interface CustomerModelV1 {
  organizationId: string
  version: { versionNo: number; status: 'published' | 'superseded' | 'draft'; publishedAt: string | null; changeNote: string | null }
  segments: Array<{ segmentId: string; name: string; fit: 'target' | 'anti'; evidenceLevel: 'validated' | 'documented' | 'hypothesis'; triggers: string[]; pains: string[] }>
  personas: Array<{ personaId: string; code: string | null; name: string; segmentIds: string[]; evidenceLevel: 'validated' | 'documented' | 'hypothesis' }>
  jobs: Array<{ jobId: string; segmentId: string; personaId: string | null; situation: string; motivation: string; expectedOutcome: string }>
  buyingRoles: Array<{ roleId: string; segmentId: string; role: string; functionDescription: string; personaId: string | null }>
  bowtieStages: Array<{ stageKey: string; hubspotInternalName: string; label: string; side: 'acquisition' | 'expansion'; position: number }>
  evidence: Array<{ subjectKind: string; subjectId: string; claim: string; sourceKind: string; sourceRef: string; asOf: string; confidence: string }>
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5 → release de Greenhouse → Slice 6 (gateway) → Slice 7 (semilla y
  publicación) en staging → production.
- La clase en Entra y la allowlist salen **antes** del dispatch del gateway; los flags se prenden Greenhouse → gateway y
  se apagan gateway → Greenhouse.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Se publica un ICP sin evidencia | datos comerciales | medium | publicar exige evidencia por segmento/persona; `hypothesis` visible | `customer_model_evidence_missing` en el dry-run |
| Round-trip de Entra borra scopes vivos | identidad MCP | medium | leer el arreglo antes, escribir el arreglo completo, verificar después | canary base del gateway |
| Clase de escritura cableada al cliente público | autorización | low | regla del gateway: nunca al cliente compartido; revisión en PR | auditoría de `requiredResourceAccess` |
| Etapas del bow-tie inventadas | integridad con HubSpot | low | validator contra internal names verificados | test del validator |
| Studio pierde referencias por reuso de ids | Studio | low | ids estables; retirar ≠ reutilizar (validator rechaza reuso) | test de reuso |

### Feature flags / cutover

- `COMMERCIAL_CUSTOMER_MODEL_ENABLED` (Vercel de Greenhouse; default `false`): lanes `disabled` cuando OFF.
- `GREENHOUSE_CUSTOMER_MODEL_WRITES_ENABLED` (gateway, `deploy.yml`; default `false`): OFF ⇒ tools de escritura
  `policy_blocked`.
- Ambas filas en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR; migración down borra tablas vacías (sólo antes de la semilla) | < 15 min | sí |
| Slices 2–3 | `COMMERCIAL_CUSTOMER_MODEL_ENABLED=false` | < 5 min | sí |
| Slice 4 | quitar cliente de la allowlist + redeploy; scope Entra queda sin cliente | < 15 min | sí |
| Slice 5 | revert de entradas + regenerar manifiesto | < 30 min | sí |
| Slice 6 | `GREENHOUSE_CUSTOMER_MODEL_WRITES_ENABLED=false` + dispatch, o revert del PR | < 30 min | sí |
| Slice 7 | publicar una versión corregida (las publicadas no se editan) | < 1 h | parcial |

### Production verification sequence

1. Migración en la instancia compartida con verificación de tablas y trigger.
2. Staging con el flag ON: `get_customer_model` para una org sin catálogo ⇒ `404`; seed dry-run → apply → publicación
   con digest por una persona.
3. Lane ecosystem con binding org-scoped de otra organización ⇒ `404`; `internal` sin `organizationId` ⇒ `400`.
4. Release de Greenhouse; Entra; allowlist; gateway con flags OFF → ON; canary del provider (lectura, deny, borrador,
   publicación con digest, persona sin capability `forbidden`).
5. Production: semilla v1 de Efeonce publicada por una persona con `efeonce_admin` (organización propia); Studio (TASK-1905) lee la versión en staging.

### Out-of-band coordination required

- Scope Admin nuevo en el recurso Entra «Efeonce MCP Resource» (operador con `az`, round-trip).
- Allowlist del cliente de canje en Vercel de Greenhouse production + redeploy.
- Revisión humana de la semilla v1 (dueño comercial) y confirmación de la publicación por una persona con `efeonce_admin` (organización propia de Efeonce).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las ocho tablas existen en `greenhouse_commercial` con trigger de inmutabilidad probado en staging y production.
- [ ] El lane ecosystem sirve el modelo publicado; binding ajeno `404`; flag OFF `disabled`.
- [ ] Crear y editar borrador funciona como `T1` con `Idempotency-Key` e `If-Match`; publicar sin digest responde `428`, con digest alterado `409`, con digest correcto publica y supersede.
- [ ] Publicar sin evidencia en un segmento o persona activo responde `422 customer_model_evidence_missing`.
- [ ] Un id retirado no puede reutilizarse con otro significado (test).
- [ ] `commercial.customer_model.read` y `.manage` sembradas con grants y coverage test verde.
- [ ] Publicar el modelo de una organización cliente lo logran `efeonce_admin` y `efeonce_account`, y el de la organización propia de Efeonce sólo `efeonce_admin`; el resto recibe `forbidden` (test).
- [ ] La clase `efeonce.mcp.commercial.write` existe en Entra y en `scopes.ts` con test de paridad, y no está en el cliente público compartido.
- [ ] Cinco tools en el manifiesto de Greenhouse y federadas; `efeonce.gateway.status` lista el provider.
- [ ] Sesión MCP real: lectura, borrador y publicación con la persona como actor; persona sin capability `forbidden`.
- [ ] Versión 1 de Efeonce publicada en production con BP9 como `hypothesis`.
- [ ] Manual servido publicado y leak test verde.

## Verification

- `pnpm local:check`, `pnpm test src/lib/commercial/customer-model src/lib/entitlements`, `pnpm migration-marker-gate`, `pnpm mcp:manifest:check`, `pnpm mcp:skills:check`.
- `pnpm test` completo + `pnpm build` antes de cerrar (gate de cierre).
- Canary del provider y sesión MCP real con token Entra humano.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Triple documentación (técnica, funcional, manual) creada.
- [ ] Skills `efeonce-customer-model-operator` y `efeonce-campaign-planning` apuntan a las tools reales.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- UI de Greenhouse para gobernar el modelo de cliente (`ui-ux`).
- Señal `commercial.customer_model.stale_hypothesis`.
- Modelos de cliente de Sky y Berel con evidencia propia (trabajo comercial).
- Personas externas gobernando su propio modelo (grant, consentimiento, piloto).

## Open Questions

- Ninguna abierta sobre quién publica: resuelto el 2026-09-26 — `efeonce_admin` puede todo; `efeonce_account` publica organizaciones cliente.
