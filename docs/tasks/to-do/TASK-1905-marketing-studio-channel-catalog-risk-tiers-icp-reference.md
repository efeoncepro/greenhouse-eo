# TASK-1905 — Marketing Studio: catálogo de canales gobernado, nivel de riesgo en el registro y referencia al ICP

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Decisión vigente 2026-10-04 (posterior) — escritura por MCP con TASK-2003

El operador decidió (2026-10-04, después de retirar TASK-1899) que Efeonce es agent-friendly y que todo lo de EPIC-049
nace Full API Parity con sus tools en el MCP, **escrituras incluidas**. La «nueva decisión» que dejaba pendiente la
retirada de TASK-1899 es **TASK-2003**: núcleo de escritura por MCP con identidad delegada (scope en Entra, canje por
capability exacta, persona como actor, gateway con escrituras `T1`), **sin** aprobaciones ni `proposalDigest`, que
siguen retirados en TASK-1899. Desde TASK-2003, las escrituras `T1` de esta task nacen federadas; las `T2` siguen por
CLI/UI. La implementa Codex.

## Delta 2026-10-04 — Full API Parity y operación por MCP obligatorias (decisión del operador)

- **Regla:** todo lo que esta task implemente nace con command o reader en `packages/domain`, ruta `/api/v1`, entrada en
  el registro con **tool** (exclusión sólo para transporte o metadatos, nunca para una capacidad de negocio) y **tool
  federada y operable por Efeonce MCP**, lecturas **y escrituras**, con la identidad delegada de la persona
  (carril de TASK-2003: clase `efeonce.mcp.marketing_studio.write`, canje por capability exacta, persona como actor;
  las aprobaciones `T2` siguen por CLI/UI mientras TASK-1899 esté retirada). La UI es un cliente más de esos commands.
- **Cierre:** la task no se cierra hasta que una **sesión MCP real** (token Entra humano) ejecuta cada operación nueva
  —leer, planificar y editar (las `T2` por CLI/UI mientras TASK-1899 esté retirada)— y la evidencia queda registrada. Manual servido
  (`docs/mcp/skills/marketing-studio/SKILL.md`) actualizado con las tools nuevas.
- **Consecuencia de orden:** TASK-2003 (núcleo de escritura por MCP) va antes; sin ese carril esta task no puede cumplir la regla.

## Delta 2026-10-04 — UTM derivadas de la activación (RESEARCH-012)

- Por [RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md) (UTM con GA4, 2026-10-04): cada canal del catálogo guarda su `utm_source` y su `utm_medium` derivados (compatibles con el agrupamiento por defecto de GA4; dato versionado con fuente y fecha) y la plataforma de compra para `utm_source_platform`.

## Delta 2026-10-04 — taxonomía de canales decidida por el operador

- El ADR de estrategia §15 fija la semilla del catálogo: cuatro dimensiones independientes (**modalidad** `paid` ·
  `organic` · `owned` · `earned`; **familia** Social · Search · Display · Video · Email · Messaging · Web & Content ·
  Community · Creators & Influencers · PR & Media · Audio · OOH/DOOH; **plataforma** de compra y de aparición;
  **placement**), más **cuenta / voz** y **mercado** como atributos de la activación, no del canal.
- Decisiones que cambian la semilla de §4.2: AEO dentro de Search (placement «respuestas IA»); **ChatGPT Ads = paid
  search**; perfil personal de LinkedIn = cuenta de LinkedIn orgánico (no un canal aparte); Display no es variante de
  social (Audience Network es un placement de Meta); **UGC es content source de la pieza**, no canal.
- **Programmatic es buying method, no familia ni plataforma:** atributo de la activación pagada `platform` (Meta Ads,
  Google Ads, LinkedIn Ads, ChatGPT Ads…) · `programmatic` (DSP: DV360, The Trade Desk, Amazon DSP) · `direct` (orden de
  inserción al publisher); el **deal type** (`open_auction` · `pmp` · `programmatic_guaranteed`) es dato del anuncio. Esta
  task agrega ambos a `ad_configuration` y `budget_line`; el `channel_key` no los codifica. Familias semilla suman Audio y
  OOH/DOOH con DSP como plataforma de compra.
- Nombres en el spanglish del equipo (Paid, Organic, Owned, Earned, Social, Search, Display, Feed, Reels, SERP…).
- La entidad *activación* (campaña obligatoria, campañas **Always On**, punto vs franja en el calendario,
  descubrimiento de lo agendado en Metricool y vínculo con la versión de la pieza) no es de esta task: nace en una task
  nueva de EPIC-049.

## Delta 2026-10-02

- **TASK-1894 Entregables A y B en producción** (Studio `a8c7886`, API `1.4.0`, manifiesto de 44 tools); Entregable C
  diferido por el operador. La dependencia de esta task con los commands y el kernel de TASK-1894 está cubierta.
- **Lo que esta task hereda:** el puerto `ChannelValidator` con un adaptador por defecto que **no valida**
  (`catalogVersion null`) y el campo `warnings` en el resultado de toda escritura; el Slice 3 de esta task reemplaza
  ese adaptador por el real. Las claves de canal se guardan hoy como **texto** en brief, derechos de versión, copy,
  anuncios, líneas de presupuesto y posts: el backfill a `channel_key` parte de esos valores.
- **Superficie de escritura que el test de paridad ampliado debe cubrir:** 29 rutas de escritura
  (POST/PATCH/PUT/DELETE) registradas por slice (`operations-review.ts`, `operations-catalog.ts`, `operations-plan.ts`,
  helper `operations-write.ts`), con `riskTier` leído del registro (T2 = aprobaciones y destructivas).
- **Brief como entidad ya existe:** tablas `campaign_brief`, `campaign_brief_audience` y `campaign_brief_kpi` (migración
  `1790967435017_catalog-write-commands.sql`, aplicada en staging y producción) y commands `upsertCampaignBrief` /
  `approveCampaignBrief`.
- **Autoridad por campaña:** CMP-001…005 siguen gobernadas por OneDrive y responden `409 campaign_not_studio_owned` a
  escrituras del catálogo; el «modo `warn` en staging» del Rollout puede usar la sandbox `CMP-900` (ya creada,
  gobernada por Studio) y el `api_client` de pruebas de escritura de staging (token en Secret Manager
  `marketing-studio-write-tests-token-staging`).
- **Federación:** el gateway v1.10.0 no federa escrituras (`MARKETING_STUDIO_FEDERATED_TOOLS` = sólo lecturas) hasta
  TASK-1899; las tools de catálogo de esta task siguen ese mismo carril.

## Delta 2026-09-26 — decisiones del operador

- **Quién mantiene el catálogo de canales:** `efeonce_operations` (con `efeonce_admin`), decisión de Julio Reyes,
  operador, 2026-09-26. Son los únicos grants de `marketing_studio.catalog.manage`; `efeonce_account` **no** gobierna el
  catálogo. La misma capability gobierna las reglas de voz de TASK-1909, cuya publicación es `T2` por decisión del mismo
  día (la publicación del catálogo de canales conserva su nivel).
- **Relacionado:** la delegación por corrida de agentes con `act` la posee `TASK-1917` (EPIC-044 U22).

## Delta 2026-09-26 (reparto con TASK-1894)

- **El campo `riskTier` y su enforcement en el kernel pasan a TASK-1894 Slice 1** (commit `0f225551f`): 1905 depende de
  los commands y del kernel de 1894, así que dejar aquí la introducción del campo creaba un ciclo. 1894 declara
  `riskTier` explícito en cada entrada del registro con el contrato de este Slice 1 (T0/T1/T2, leído del registro, nunca
  del request) y deja un puerto `ChannelValidator` con adaptador neutro que el Slice 3 de esta task reemplaza por el real.
- **Esta task conserva del Slice 1:** los detectores ampliados (c)–(e) del test de paridad y la lectura del `riskTier`
  por el gateway desde el artefacto sincronizado. Donde el Slice 1 dice «introduce `riskTier`», léase «verifica y
  consume el `riskTier` que ya declaró TASK-1894».
- **Relacionado:** TASK-1913–1916 (operación híbrida con agentes) usan este `riskTier` para decidir cuándo una
  asignación o corrida de agente exige confirmación humana.

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
- Status real: `Diseno — creada 2026-09-26 desde el ADR de capa de estrategia; ningún slice empezado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1894 (kernel runCommand, commands de copy/pieza/anuncio/presupuesto/post y brief como entidad, capabilities .asset.write y .campaign.write) · TASK-1899 (clase efeonce.mcp.marketing_studio.write, canje por capability, token delegado, proposalDigest) · Slice 6 también TASK-1906 (catálogo de modelo de cliente en Greenhouse) y el consumer de Studio de TASK-1892 Slice 3`
- Branch: `efeonce-marketing-studio main (código, migraciones, registro, manifiesto; push a main = deploy de producción) · Greenhouse develop (capability, seed, cliente de canje, docs) · efeonce-mcp rama + PR a main (sync del manifiesto, contratos de canje, versión; deploy por dispatch manual); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reemplaza el `channel` de texto libre de Studio por un **catálogo de canales gobernado y versionado** (`channel_key`,
tipo, plataforma, placements, formatos, límites de copy duros y recomendados, objetivos válidos, cada especificación
con fuente y fecha de verificación) que valida copys, piezas, anuncios, audiencias y presupuesto **al escribir**.
Además convierte en código dos reglas del ADR de capa de estrategia que todavía son sólo decisión: cada operación del
registro declara su **nivel de riesgo** (`T0`/`T1`/`T2`) y el **test de paridad** se amplía a escrituras. Por último,
las audiencias de Studio pasan a ser la traducción a plataforma de una **referencia al ICP de Greenhouse**
(organización, versión, id), con etapa del bow-tie y fase creativa del embudo en campos separados.

## Why This Task Exists

- `copy_variant.channel`, `ad_configuration.channel`, `audience.channel`, `budget_line.channel`, `scheduled_post.network`
  y `asset_version.rights_channels` son texto libre (verificado en `packages/database/src/schema.ts` del repo de Studio,
  2026-09-26). Nadie valida que un copy quepa en el límite de su plataforma, que una pieza tenga el formato que el canal
  exige ni que el objetivo de un anuncio exista en esa plataforma; `LinkedIn`, `linkedin` y `LinkedIn Ads` son tres
  canales distintos para cualquier lector.
- El ADR `EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (Accepted 2026-09-26) fija que el nivel de riesgo lo
  declara el registro y lo aplica el command, y que el test de paridad falla por escrituras sin contrato. Nada de eso
  existe: hoy el registro sólo conoce lecturas (`writes: false`) y el test sólo compara registro ↔ route handlers.
- `campaign.audience_summary` es prosa y `audience.definition` es la sintaxis de la plataforma sin ancla: no hay persona,
  segmento ni etapa del bow-tie a la que responda cada audiencia. El plan de campaña (TASK-1907) no puede construir su
  matriz persona × etapa × canal sin canales canónicos ni referencias ICP.

## Goal

- Existe un catálogo de canales versionado en Studio, sembrado con especificaciones verificadas contra la documentación
  oficial de cada plataforma, legible por API y MCP y editable por quien tiene la capability restringida.
- Todo copy, pieza (derechos), anuncio, audiencia, línea de presupuesto y post guarda `channel_key` y la versión del
  catálogo contra la que se validó; canal desconocido o límite duro excedido no se guarda; límite recomendado excedido o
  formato faltante queda como advertencia visible en «atención».
- El texto libre existente queda mapeado por una persona (nunca adivinado) y lo no mapeado es visible; el paso de
  contract queda preparado y fuera de esta task.
- Toda operación del registro declara `riskTier` y el test de paridad rompe el build ante una escritura sin contrato.
- Las audiencias y la campaña referencian el modelo de cliente de Greenhouse por organización, versión e id; Studio no
  guarda personas locales.
- Todas las capacidades nuevas son operables por agentes vía Efeonce MCP con la persona como actor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**, Accepted
  2026-09-26: §4.1 paridad y test ampliado, §4.2 catálogo de canales, §4.3 ICP en Greenhouse, §5 niveles, §8 invariantes)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (un command, tres puertas)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 modelo e invariantes, §3.1 capa de
  estrategia, §4 contrato, §4.1 agentes, §5 acceso)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`

Reglas obligatorias:

- El catálogo es **dato**, no un `switch` en el código: agregar un canal es una fila en una versión nueva, nunca un
  deploy.
- Una versión publicada del catálogo es **inmutable** (trigger que rechaza `UPDATE`/`DELETE` sobre filas de versiones
  `published`); cambiar una especificación crea una versión nueva.
- Ninguna especificación sin `source_url` y `verified_on`. Un límite que no se pudo verificar se guarda `NULL` («sin
  dato»), nunca un número recordado.
- El mercado **no** se codifica en el canal (`linkedin_ads`, nunca `linkedin_ads_cl`).
- Una versión nueva del catálogo **no** revalida en silencio lo ya validado: lo muestra como «validado con
  especificación anterior» hasta que una persona o un agente revalide.
- Studio nunca guarda nombres ni descripciones del ICP como verdad; referencia `(organización, versión, id)` y resuelve
  en vivo por el lane de Greenhouse. Etapa del bow-tie ≠ fase creativa del embudo (`campaign.funnel_phase`).
- Nunca SQL contra la base de Greenhouse; toda lectura de Greenhouse por lane ecosystem.
- Capability nueva ⇒ grant a ≥1 rol real en `src/lib/entitlements/runtime.ts` en el mismo commit.

## Normative Docs

- `.claude/skills/efeonce-marketing-studio/SKILL.md` y `references/` (contrato de mantenimiento obligatorio al cerrar).
- `.claude/skills/efeonce-campaign-planning/SKILL.md` (consumidor agéntico del catálogo y de las referencias ICP).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` y la skill `mcp-craft` (nombres, descripciones y anotaciones de tools).
- `.claude/skills/greenhouse-backend/SKILL.md`.
- `docs/tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md` (kernel, errores, forma común de un
  command) y `docs/tasks/to-do/TASK-1899-marketing-studio-mcp-writes-approvals.md` (contratos de canje y flujo MCP).
- `docs/context/11_hubspot-bowtie.md` (internal names de etapas del bow-tie).

## Dependencies & Impact

### Depends on

- `TASK-1894`: kernel `runCommand` (`packages/domain/src/commands/kernel.ts`), punto de extensión `confirmation`,
  commands de copy/pieza/anuncio/presupuesto/post, `studio.campaign_brief` con `channels text[]`, capabilities
  `marketing_studio.asset.write` y `marketing_studio.campaign.write`, scopes de bearer `studio:write` y
  `studio:assets:write`.
- `TASK-1899`: clase `efeonce.mcp.marketing_studio.write`, tabla de contratos de canje (`resolveScopeContract` en
  Greenhouse y `marketing-studio-exchange-contracts.ts` en el gateway), cabecera `Efeonce-Delegated-Token`,
  `proposalDigest` para `T2`.
- `TASK-1906`: lane ecosystem del catálogo de modelo de cliente (sólo Slice 6).
- `TASK-1892` Slice 3: consumer `efeonce-marketing-studio` y binding por organización en Greenhouse (sólo Slice 6).

### Blocks / Impacts

- `TASK-1907` (plan de campaña): la matriz persona × etapa × canal usa `channel_key` y referencias ICP de esta task.
- `TASK-1909` (IA): el validador de copy por límites de canal es el de esta task.
- `TASK-1910` (medición): el readback de pauta mapea cuentas y anuncios por `channel_key`.
- `TASK-1912` (UI de planificación): muestra hallazgos de canal y selector de canal/ICP.
- `TASK-1894` y `TASK-1895`: sus commands de copy/pieza/anuncio/post y el brief pasan a usar `channel_key` (Deltas en
  Detailed Spec §«Deltas a otras tasks»).
- Gateway `efeonce-mcp`: nuevo cliente de canje y filas de contrato; bump de versión minor.

### Files owned

- Repo Studio — contratos: `packages/contracts/src/operations.ts` (campo `riskTier`, entradas nuevas),
  `packages/contracts/src/channels.ts` [nuevo], `packages/contracts/src/customer-model.ts` [nuevo],
  `packages/contracts/src/dto.ts` (canal y referencia ICP en DTOs), `packages/contracts/src/semantics.ts` (glosario de
  canal, versión de catálogo, referencia ICP), `packages/contracts/src/errors.ts`, `packages/contracts/generated/tool-manifest.json`.
- Repo Studio — dominio: `packages/domain/src/channels/**` [nuevo] (`catalog.ts`, `validate.ts`, `aliases.ts`,
  `market-guard.ts`), `packages/domain/src/commands/channel-catalog.ts` [nuevo], `packages/domain/src/commands/audience.ts`
  [nuevo], `packages/domain/src/customer-model/**` [nuevo] (`greenhouse-adapter.ts`, `reader.ts`),
  `packages/domain/src/readers/attention.ts` (ítems de canal), `packages/domain/src/import/catalog.ts` (mapeo por alias).
- Repo Studio — base: `packages/database/migrations/<ts>_channel-catalog.sql` [nuevo],
  `packages/database/migrations/<ts>_channel-key-expand.sql` [nuevo], `packages/database/migrations/<ts>_audience-icp-reference.sql` [nuevo],
  `packages/database/src/schema.ts`, `packages/database/seeds/channel-catalog-v1.json` [nuevo].
- Repo Studio — web y scripts: `apps/web/src/app/api/v1/channels/**`, `apps/web/src/app/api/v1/channel-catalog/**`,
  `apps/web/src/app/api/v1/channel-aliases/**`, `apps/web/src/app/api/v1/customer-model/**`,
  `apps/web/src/app/api/v1/campaigns/[campaignId]/audiences/**`, `apps/web/src/app/api/v1/campaigns/[campaignId]/channel-findings/**`,
  `apps/web/src/app/api/v1/campaigns/[campaignId]/channel-validation/**`, `apps/web/src/server/operations-parity.test.ts`
  (ampliado), `scripts/channels-backfill.ts` [nuevo].
- Greenhouse: `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`,
  `migrations/<ts>_task-1905-marketing-studio-catalog-manage-capability.sql` [nuevo],
  `migrations/<ts>_task-1905-mcp-marketing-studio-catalog-manage-client.sql` [nuevo],
  `src/lib/sister-platforms/mcp-token-exchange.ts` (fila de contrato), `docs/mcp/skills/marketing-studio/SKILL.md`.
- Gateway `efeonce-mcp`: `src/providers/marketing-studio-exchange-contracts.ts`, `package.json` (versión),
  `surface-baseline.json`.

## Current Repo State

### Already exists

- Registro único de operaciones `packages/contracts/src/operations.ts` (17 entradas, sólo `GET`, `ToolSpec.writes: false`)
  y test de paridad handlers ↔ registro `apps/web/src/server/operations-parity.test.ts` (TASK-1890).
- Texto libre de canal en `copy_variant.channel`, `ad_configuration.channel` (+ `placement`, `objective`),
  `audience.channel` (+ `temperature`, `definition jsonb`), `budget_line.channel`, `scheduled_post.network`,
  `asset_version.rights_channels` (schema de Studio).
- `campaign.funnel_phase` (fase creativa en texto libre) y `campaign.audience_summary` (prosa).
- Canje RFC 8693 por capability y federación de lecturas (TASK-1891); mecánica de escritura planificada en TASK-1899.
- Contexto documental del ICP de Efeonce: `docs/context/13_icp-buyer-personas-jtbd.md`; etapas del bow-tie:
  `docs/context/11_hubspot-bowtie.md`.
- (2026-10-02, TASK-1894 Entregable B en producción) El registro ya no es sólo `GET`: suma 29 rutas de escritura con
  `riskTier`; puerto `ChannelValidator` con adaptador por defecto sin validar; `warnings` en el resultado de toda
  escritura; tablas `campaign_brief`, `campaign_brief_audience` y `campaign_brief_kpi`. La línea de arriba sobre
  «17 entradas, sólo `GET`» describe el estado previo.

### Gap

- No existe catálogo de canales, ni validación de límites o formatos, ni versión de especificación por registro.
- El registro no declara nivel de riesgo y el test de paridad no cubre escrituras ni mutaciones de la UI. (2026-10-02:
  el `riskTier` ya lo declara TASK-1894 en el registro; los detectores ampliados (c)–(e) siguen siendo de esta task.)
- Las audiencias no tienen ancla en un modelo de cliente; no existe etapa del bow-tie en Studio.
- No hay capability para gobernar catálogos de Studio ni cliente de canje para ella.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/contracts`, `packages/domain`, `packages/database`, `apps/web`) + Greenhouse (`src/config`, `src/lib/entitlements`, `src/lib/sister-platforms`, `migrations/`) + `efeonce-mcp` (`src/providers/`)
- Future candidate home: `remain-shared`
- Boundary: catálogo y validación en `packages/domain/src/channels/**` (sin framework); commands vía `runCommand`; consumers: rutas `/api/v1`, CLI de operador, tools `studio.*` federadas, UI de TASK-1912
- Server/browser split: catálogo, validación, commands y adapter corren en servidor; el navegador sólo consume `/api/v1`; el token de consumer de Greenhouse vive en env sensible de Vercel de Studio
- Build impact: `none` (sin SDK nuevo; el seed es JSON versionado leído por la migración/CLI, nunca por un módulo de ruta)
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: schema `studio` (tablas nuevas del catálogo; columnas `channel_key`/`channel_catalog_version` en seis tablas; referencias ICP en `audience` y `campaign`)
- Consumidores afectados: web de Studio, CLI, agentes vía Efeonce MCP, importador de catálogo, TASK-1907/1909/1910/1912
- Runtime target: `staging` y `production` de Studio (Vercel `prj_dztLezZkYxAJikDuPSdT9QROEJRS`), Greenhouse production (capability y canje), gateway

### Contract surface

- Contrato existente a respetar: registro `operations.ts` + OpenAPI 3.1 + manifiesto con `manifestHash`; forma común de command de TASK-1894 (§«Forma común de un command»); `ERROR_CATALOG` es-CL
- Contrato nuevo o modificado: campo `riskTier` en `Operation`; operaciones del catálogo de canales, alias, audiencias, hallazgos y modelo de cliente (tabla en Detailed Spec); DTOs con `channel` (`key`, `label`, `catalogVersion`) y `icpReference`
- Backward compatibility: `compatible` (columnas nuevas nullable; el texto libre convive hasta el contract; DTO aditivo; `API_VERSION` minor)
- Full API parity: cada lectura y escritura nace con command/reader, ruta `/api/v1`, entrada en el registro con `riskTier` y tool federada

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.channel_catalog_version`, `studio.channel`, `studio.channel_placement`, `studio.channel_format`, `studio.channel_copy_limit`, `studio.channel_objective`, `studio.channel_alias`, `studio.channel_validation_finding` (nuevas); `studio.copy_variant`, `studio.ad_configuration`, `studio.audience`, `studio.budget_line`, `studio.scheduled_post`, `studio.asset_version`, `studio.campaign_brief`, `studio.campaign` (columnas nuevas)
- Invariantes que no se pueden romper:
  - una versión `published` del catálogo nunca cambia; sólo se supersede
  - ningún registro nuevo con canal desconocido o con límite duro excedido
  - toda especificación con `source_url` y `verified_on`; sin dato ⇒ `NULL`
  - `channel_key` sin sufijo de mercado; mercado en su dimensión
  - el mapeo de texto libre a `channel_key` lo decide una persona; lo no mapeado queda `unmapped` y visible
  - Studio no guarda nombres de ICP como verdad; etapa del bow-tie ≠ `funnel_phase`
  - el nivel de riesgo lo fija el registro; un cliente nunca lo degrada
- Write-target allowlist: N/A (Studio no tiene boundary test de destinos; el guard equivalente es el test de paridad ampliado)
- Tenant/space boundary: catálogo de canales global a la instalación de Studio (especificaciones de plataforma); referencias ICP por `campaign.organization_id`; el adapter de Greenhouse envía `externalScopeType=organization&externalScopeId=<org canónica>` y respeta el 404 anti-oráculo
- Idempotency/concurrency: `Idempotency-Key` obligatoria en toda escritura; `If-Match` con `revision` de la versión en borrador, del alias o de la audiencia; publicar una versión toma lock de fila sobre la versión y verifica que no exista otra `draft` publicándose
- Audit/outbox/history: `audit_event` en la misma transacción por cada escritura (actor persona, canal `via`); versiones superseded conservadas; hallazgos append-only por revisión validada

### Migration, backfill and rollout

- Migration posture: `additive` (tablas nuevas + columnas nullable) + `backfill` revisado por persona; el contract (NOT NULL y retiro del texto libre) queda como Follow-up posterior al release
- Default state: `STUDIO_CHANNEL_VALIDATION_MODE=warn` (valida y registra hallazgos sin bloquear) hasta cerrar el backfill; `enforce` después; `STUDIO_CUSTOMER_MODEL_ENABLED=false` hasta TASK-1906 en producción
- Backfill plan: `pnpm channels:backfill --dry-run` lista valores distintos por tabla con conteo; una persona mapea con `studio.channel_alias.map` (o la CLI `--map raw=key`); `--apply` rellena `channel_key` sólo desde alias `mapped`; lotes de 500 filas; idempotente
- Rollback path: modo `off` por env (sin redeploy de código); las columnas nuevas quedan nullable y el texto libre intacto; revert PR para rutas y tools
- External coordination: env vars en Vercel de Studio (staging y production); allowlist `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` en Vercel de Greenhouse production (redeploy); dispatch manual del gateway

### Security and access

- Auth/access gate: lecturas `marketing_studio.campaign.read` / `studio:read`; escrituras del catálogo y alias `marketing_studio.catalog.manage` (nueva) / sin scope de bearer (un `api_client` no gobierna catálogos); audiencias y revalidación `marketing_studio.campaign.write` / `studio:write`; descartar borrador y quitar audiencia son `T2`
- Sensitive data posture: sin PII; el token de consumer de Greenhouse sólo en Secret Manager y env sensible de Vercel
- Error contract: `{ error (es-CL), code, actionable }` del `ERROR_CATALOG`; códigos nuevos en Detailed Spec
- Abuse/rate-limit posture: tope de 20 borradores de catálogo abiertos (uno por persona); el adapter de ICP con timeout y caché de 5 min / 60 s degradado

### Runtime evidence

- Local checks: `pnpm check` en Studio (paridad ampliada, leak test, determinismo del manifiesto, tests de validación con fixtures de límites), `pnpm local:check` y `capability-grant-coverage.test.ts` en Greenhouse, tests del gateway
- DB/runtime checks: migraciones aplicadas en staging y production de Studio con verificación por `information_schema`; trigger de inmutabilidad probado con un `UPDATE` que debe fallar
- Integration checks: canary MCP real (persona con capability: T0/T1; persona sin capability: `forbidden`; `api_client` en `T2`: `approval_requires_person`); lectura de referencias ICP contra el lane de TASK-1906 en staging
- Reliability signals/logs: frescura nueva `channel_unmapped` en el health profundo de Studio (proyectada por `platform.marketing_studio.health` en Greenhouse); `logEvent` por hallazgo `hard`
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado; el guard es el test de paridad.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `packages/domain` (catálogo, validación, alias, audiencias, adapter ICP), nunca en la UI ni en handlers.
- [ ] Modelada como recursos y commands (versión de catálogo, canal, alias, audiencia), no como click-handlers.
- [ ] Lecturas como readers; escrituras como commands con `riskTier`, capability fina, idempotencia, `If-Match`, `audit_event` y errores canónicos.
- [ ] Capability `marketing_studio.catalog.manage` + grant + coverage test en el mismo PR de Greenhouse.
- [ ] Camino programático: `/api/v1` + tool `studio.*` federada con la clase de TASK-1899; la CLI de backfill es exclusión razonada.
- [ ] `T2` (descartar borrador, quitar audiencia) apto para `dryRun` → digest → confirmación.
- [ ] Un primitive, muchos consumers: la misma `validateAgainstChannelCatalog` para web, CLI, agentes e importador.
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

### Slice 1 — Nivel de riesgo en el registro y test de paridad ampliado

- `Operation.riskTier: 'T0' | 'T1' | 'T2'` obligatorio en `operations.ts`; derivación inicial para las operaciones
  existentes y las de TASK-1894 (lectura ⇒ `T0`; escritura no destructiva sin persona obligatoria ⇒ `T1`; `approve`,
  `requiresPerson`, `destructive`, gasto o credenciales externas ⇒ `T2`). El valor se declara explícito en cada entrada,
  no se calcula en runtime.
- Manifiesto: `riskTier` por tool; el gateway lo lee del artefacto sincronizado (no de una lista a mano).
- Kernel (`runCommand`): un command `T2` sin `dryRun` previo y sin `confirmation.proposalDigest` responde `428
  confirmation_required` (mecánica de TASK-1899); un `T1` exige `Idempotency-Key` y, sobre entidad existente, `If-Match`.
  El `riskTier` del command lo lee el kernel del registro; ningún parámetro del request lo cambia.
- `operations-parity.test.ts` falla si: (a) una ruta de escritura no tiene entrada; (b) una entrada de escritura no tiene
  tool ni exclusión; (c) una operación no declara `riskTier`; (d) una mutación que dispara la web (llamadas del cliente
  único `apps/web/src/client/studio-api.ts` de TASK-1895, inventariadas por test estático) no corresponde a una operación
  registrada; (e) una tool de lectura cubre una capacidad que la web escribe. Cada detector se ve fallar con un caso
  inyectado antes de confiar en su verde.

### Slice 2 — Esquema del catálogo y semilla v1

- Migración `<ts>_channel-catalog.sql` con las tablas de Detailed Spec §«Modelo del catálogo», trigger de inmutabilidad
  de versiones `published` y bloque `DO` que verifica que las tablas existen.
- Semilla `packages/database/seeds/channel-catalog-v1.json` con los canales del ADR §4.2 (tabla en Detailed Spec) y todo
  valor distinto de canal que Discovery encuentre hoy en producción (`SELECT DISTINCT channel` por tabla, leído con el rol
  de lectura). Cada límite, formato y objetivo lleva `source_url` (documentación oficial de la plataforma) y `verified_on`;
  lo no verificable queda `NULL`. La semilla la carga `pnpm channels:seed --version 1 --apply` (dry-run por defecto) y
  queda `published` con `published_by` = persona que corrió el comando.
- **Valores de medición por canal** ([RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md) §Origen y ciclo de vida): cada canal de la
  versión guarda `utm_source` (plataforma de aparición), `utm_medium` (derivado de modalidad × familia), plataforma de
  compra para `utm_source_platform` (paid), modo de etiquetado `utm | auto | auto_plus_full_utm` (Google Ads = `auto`) y,
  si no calza en un canal por defecto de GA4, `ga4_custom_group`. Función pura `expectedGa4Channel(source, medium)` que
  replica el agrupamiento por defecto de GA4 (fuente: documentación de Google, as of 2026-10-04) y test que exige que cada
  canal caiga en su canal GA4 esperado o declare su grupo propio.
- Reporte de la semilla: compara el `utm` escrito a mano en los anuncios existentes con lo que generaría el catálogo y lo
  deja para el backfill revisado (nunca sobrescribe).
- `validateChannelKey` rechaza claves con sufijo de código de país ISO 3166-1 alfa-2 o de idioma (`_cl`, `_mx`, `_es`,
  `_en`…) y claves fuera de `^[a-z][a-z0-9_]{2,47}$`.

### Slice 3 — Validación al escribir

- `packages/domain/src/channels/validate.ts`: `validateAgainstChannelCatalog({ entityType, channelKey, placementKey?,
  formatHint?, fields, objectiveKey?, catalogVersion })` devuelve `{ blocking: Finding[], warnings: Finding[] }`.
- Enganche en los commands de TASK-1894 que escriben canal: `createCopyVariant`/`updateCopyVariant` (límites por campo),
  `createAdConfiguration`/`updateAdConfiguration` (canal, placement, objetivo, formato de la pieza vigente),
  `setBudgetLine` (canal conocido cuando la granularidad es por canal), `createScheduledPost`/`updateScheduledPost`
  (canal orgánico conocido), `setAssetVersionRights` (canales de derechos conocidos) y `upsertCampaignBrief` (canales).
- `blocking` ⇒ `422 channel_unknown` o `422 channel_hard_limit_exceeded` sin escribir (modo `enforce`; en `warn` se
  registran como hallazgo `hard` y se escribe). `warnings` ⇒ fila en `studio.channel_validation_finding` + `warnings[]`
  en el resultado + ítem de atención. Cada registro guarda `channel_catalog_version` con la que se validó.
- Reader de hallazgos por campaña y marca `validatedWithPreviousSpec` cuando la versión guardada < última publicada.
- Command `revalidateCampaignChannels` (`T1`): con `dryRun` devuelve los hallazgos contra la última versión; sin `dryRun`
  actualiza `channel_catalog_version` sólo de los registros sin hallazgo `hard` y deja el resto listado.

### Slice 4 — Expand y backfill revisado

- Migración `<ts>_channel-key-expand.sql`: `channel_key text NULL` + `channel_catalog_version int NULL` en `copy_variant`,
  `ad_configuration`, `audience`, `budget_line`, `scheduled_post`; `rights_channel_keys text[] NULL` en `asset_version`;
  `channel_keys text[] NULL` en `campaign_brief` (tabla de TASK-1894); FK compuestas a `studio.channel (version_no,
  channel_key)` diferidas. `studio.channel_alias` con estados `unmapped | mapped | ignored`.
- CLI `scripts/channels-backfill.ts` (`pnpm channels:backfill [--dry-run] [--apply] [--map "LinkedIn Ads=linkedin_ads"]`)
  como `operator_cli`: descubre valores distintos, crea alias `unmapped`, rellena sólo desde alias `mapped`, lotes de 500,
  idempotente, `ops_run` registrado.
- El importador de catálogo (`packages/domain/src/import/catalog.ts`) resuelve canal por alias; un valor nuevo queda
  `unmapped` y el registro con `channel_key NULL` + hallazgo, nunca adivinado.
- Frescura `channel_unmapped` en el health profundo (conteo de registros con texto libre sin `channel_key`).

### Slice 5 — Operaciones del catálogo, alias y audiencias

- Commands `createChannelCatalogDraft`, `upsertDraftChannel`, `publishChannelCatalogVersion`,
  `discardChannelCatalogDraft`, `mapChannelAlias`, `upsertChannelAudience`, `removeChannelAudience`,
  `revalidateCampaignChannels` y readers `listChannels`, `getChannel`, `listChannelCatalogVersions`,
  `listChannelAliases`, `listCampaignChannelFindings` (tabla en Detailed Spec §«Operaciones y tools»).
- Rutas `/api/v1`, entradas en el registro con `riskTier`, descripciones con `mcp-craft` y glosario en `semantics.ts`,
  `pnpm mcp:manifest:generate`, `API_VERSION` minor.

### Slice 6 — Referencia al ICP de Greenhouse

- Migración `<ts>_audience-icp-reference.sql`: en `studio.audience` → `icp_catalog_version int NULL`,
  `icp_segment_id text NULL`, `icp_persona_id text NULL`, `buying_role text NULL`, `bowtie_stage text NULL`,
  `icp_pending_note text NULL`; en `studio.campaign` → `icp_catalog_version int NULL`, `icp_segment_ids text[] NOT NULL
  DEFAULT '{}'`. CHECK: si `icp_pending_note` no es nulo, `icp_persona_id` es nulo (referencia pendiente visible).
- Adapter `packages/domain/src/customer-model/greenhouse-adapter.ts` sobre el lane de TASK-1906 con el consumer de
  TASK-1892 (`fetch` con `AbortSignal.timeout`, `X-Correlation-Id`, validación de la respuesta, caché 5 min / 60 s,
  401/5xx ⇒ `unavailable`, 404 ⇒ `not_entitled`).
- Reader `getCustomerModel(actor, organizationId, version?)` y operación `getCustomerModel` (proxy de lectura para que la
  web y los agentes elijan referencias sin conocer Greenhouse).
- `upsertChannelAudience` valida que `(organización, versión, segmento/persona)` existe en esa versión publicada y que
  `bowtie_stage` es un internal name de esa versión; con el lane caído responde `503 customer_model_unavailable`
  (`actionable: true`) sin escribir, salvo referencia pendiente explícita.
- `setCampaignCustomerModelVersion` (`T1`): con `dryRun` lista las referencias que no existen en la versión nueva; nunca
  migra referencias sola.

### Slice 7 — Greenhouse: capability, cliente de canje y release

- Capability `marketing_studio.catalog.manage` en `src/config/entitlements-catalog.ts` (`module: 'marketing_studio'`,
  `actions: ['create','update']`, `defaultScope: 'tenant'`) + migración seed en `capabilities_registry` (patrón de
  `20260926075619118_task-1893-marketing-studio-asset-download-capability.sql`) + grant de ambas acciones a
  `efeonce_admin` y `efeonce_operations` en `src/lib/entitlements/runtime.ts` (decisión del operador 2026-09-26:
  `efeonce_operations` mantiene el catálogo, con `efeonce_admin`; `efeonce_account` no lo gobierna);
  `capability-grant-coverage.test.ts` verde.
- Cliente de canje `efeonce-mcp-marketing-studio-catalog-manage` (input scope `efeonce.mcp.marketing_studio.write`,
  capability `marketing_studio.catalog.manage`, acción `update`) por migración (patrón del cliente
  `efeonce-mcp-client-services`, `requireOnPrivilegedAction = true`), fila en `resolveScopeContract` y allowlist
  `GREENHOUSE_SISTER_PLATFORM_OAUTH_ALLOWED_CONSUMERS` en Vercel production + redeploy. Release por el control plane.

### Slice 8 — Gateway, canary y documentación

- `efeonce-mcp` (rama + PR): `pnpm studio:manifest:sync`, fila del contrato en `marketing-studio-exchange-contracts.ts`
  (paridad por test con Greenhouse), bump minor de `version`, `pnpm surface:baseline` después de decidir el bump, merge,
  dispatch manual de `deploy.yml`.
- Canary `pnpm studio:canary` ampliado + sesión MCP real con token Entra humano (ver Production verification sequence).
- Docs: arquitectura §3.1 (estado vigente), runbook `MARKETING_STUDIO_RUNTIME_HANDOFF.md` §Catálogo de canales,
  manual servido `docs/mcp/skills/marketing-studio/SKILL.md` (`appliesTo` + cómo mapear un alias y revalidar),
  `FEATURE_FLAG_STATE_LEDGER.md`, skill `efeonce-marketing-studio` (contrato de mantenimiento) y skill
  `efeonce-campaign-planning` (tools reales de canal e ICP).

## Out of Scope

- Paso de contract: `channel_key NOT NULL` y retiro de las columnas de texto libre (Follow-up tras un release sin
  escritores de texto libre y cero `unmapped`).
- El catálogo de modelo de cliente en Greenhouse (TASK-1906).
- Plan de campaña, matriz de audiencias y casa de mensajes (TASK-1907).
- UI del catálogo y de las referencias (TASK-1912; hasta entonces sólo API, CLI y agentes).
- Mercados y localización del catálogo (follow-up del ADR §4.8).
- Escrituras en plataformas publicitarias.

## Detailed Spec

### Modelo del catálogo

| Tabla | Columnas clave | Notas |
|---|---|---|
| `studio.channel_catalog_version` | `version_no int PK`, `status draft\|published\|superseded`, `based_on int NULL`, `notes text`, `created_by`, `published_by`, `published_at`, `revision` | una sola `draft` por persona; publicar supersede la anterior |
| `studio.channel` | `(version_no, channel_key) PK`, `label`, `channel_type paid\|organic\|owned`, `platform`, `readback_provider meta_ads\|linkedin_ads\|metricool\|hubspot\|none`, `status active\|retired` | `retired` no admite registros nuevos |
| `studio.channel_placement` | `(version_no, channel_key, placement_key) PK`, `label` | p. ej. feed, stories, reels, documento, conversación |
| `studio.channel_format` | `(version_no, channel_key, placement_key NULL, format_key) PK`, `media_kind image\|video\|carousel\|document\|text\|html`, `aspect_ratios text[]`, `min_duration_s`, `max_duration_s`, `max_file_bytes`, `file_types text[]`, `required bool`, `source_url`, `verified_on` | `required` = formato que el canal exige para la pieza |
| `studio.channel_copy_limit` | `(version_no, channel_key, placement_key NULL, field) PK`, `hard_limit int NULL`, `recommended_limit int NULL`, `unit chars\|words\|items`, `source_url`, `verified_on` | `field ∈ primary_text, headline, description, cta, hashtags, subject, preheader, title` |
| `studio.channel_objective` | `(version_no, channel_key, objective_key) PK`, `label`, `source_url`, `verified_on` | objetivos válidos por plataforma |
| `studio.channel_alias` | `raw_value text PK`, `channel_key text NULL`, `status`, `mapped_by`, `mapped_at`, `revision` | texto libre → clave; decisión humana |
| `studio.channel_validation_finding` | `finding_id`, `entity_type`, `entity_id`, `entity_revision`, `catalog_version`, `code`, `field`, `limit_value`, `actual_value`, `severity hard\|warning`, `created_at` | append-only |

### Semilla v1 (canales mínimos del ADR §4.2)

| `channel_key` | Tipo | Plataforma | `readback_provider` |
|---|---|---|---|
| `meta_ads` | paid | Meta (Facebook e Instagram Ads) | `meta_ads` |
| `linkedin_ads` | paid | LinkedIn | `linkedin_ads` |
| `linkedin_company_page` | organic | LinkedIn | `metricool` |
| `linkedin_personal_profile` | organic | LinkedIn | `metricool` |
| `instagram_organic` | organic | Instagram | `metricool` |
| `google_ads` | paid | Google | `none` |
| `tiktok_organic` | organic | TikTok | `metricool` |
| `blog_web` | owned | Web propia | `none` |
| `email_hubspot` | owned | HubSpot | `hubspot` |

`tiktok_ads` sólo se agrega si Discovery encuentra una campaña real que lo use. Los límites y formatos de cada fila se
toman de la documentación oficial vigente al sembrar (URL + fecha); ningún número de esta task es un valor a copiar.

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel | Capability / scope |
|---|---|---|---|---|
| `listChannels` | `GET /api/v1/channels?version=` | `studio.channels.list` | T0 | `.campaign.read` / `studio:read` |
| `getChannel` | `GET /api/v1/channels/{channelKey}?version=` | `studio.channel.get` | T0 | `.campaign.read` / `studio:read` |
| `listChannelCatalogVersions` | `GET /api/v1/channel-catalog/versions` | `studio.channel_catalog.versions.list` | T0 | `.campaign.read` / `studio:read` |
| `createChannelCatalogDraft` | `POST /api/v1/channel-catalog/versions` | `studio.channel_catalog.draft.create` | T1 | `.catalog.manage` / ninguno |
| `upsertDraftChannel` | `PUT /api/v1/channel-catalog/versions/{versionNo}/channels/{channelKey}` | `studio.channel_catalog.draft.channel.upsert` | T1 | `.catalog.manage` / ninguno |
| `publishChannelCatalogVersion` | `POST /api/v1/channel-catalog/versions/{versionNo}/publish` | `studio.channel_catalog.version.publish` | T1 (capability restringida, ADR §5) | `.catalog.manage` / ninguno |
| `discardChannelCatalogDraft` | `DELETE /api/v1/channel-catalog/versions/{versionNo}` | `studio.channel_catalog.draft.discard` | T2 (destructiva) | `.catalog.manage` / ninguno |
| `listChannelAliases` | `GET /api/v1/channel-aliases?status=` | `studio.channel_aliases.list` | T0 | `.campaign.read` / `studio:read` |
| `mapChannelAlias` | `PUT /api/v1/channel-aliases/{rawValue}` | `studio.channel_alias.map` | T1 | `.catalog.manage` / ninguno |
| `listCampaignChannelFindings` | `GET /api/v1/campaigns/{campaignId}/channel-findings` | `studio.campaign.channel_findings.list` | T0 | `.campaign.read` / `studio:read` |
| `revalidateCampaignChannels` | `POST /api/v1/campaigns/{campaignId}/channel-validation/revalidate` | `studio.campaign.channels.revalidate` | T1 | `.campaign.write` / `studio:write` |
| `upsertChannelAudience` | `PUT /api/v1/campaigns/{campaignId}/audiences/{audienceKey}` | `studio.campaign.audience.upsert` | T1 | `.campaign.write` / `studio:write` |
| `removeChannelAudience` | `DELETE /api/v1/campaigns/{campaignId}/audiences/{audienceKey}` | `studio.campaign.audience.remove` | T2 (destructiva) | `.campaign.write` / `studio:write` |
| `getCustomerModel` | `GET /api/v1/customer-model?organizationId=&version=` | `studio.customer_model.get` | T0 | `.campaign.read` / `studio:read` |
| `setCampaignCustomerModelVersion` | `PUT /api/v1/campaigns/{campaignId}/customer-model-version` | `studio.campaign.customer_model_version.set` | T1 | `.campaign.write` / `studio:write` |
| `channels:backfill`, `channels:seed` | CLI | exclusión: operación de operador con credencial de migración | — | `operator_cli` |

Nombres finales se confirman con `mcp-craft` en el Slice 5; cualquier cambio se refleja aquí antes de implementar.

### Errores nuevos (`ERROR_CATALOG`, prosa es-CL)

| code | HTTP | actionable | Cuándo |
|---|---|---|---|
| `channel_unknown` | 422 | true | canal no existe o está `retired` en la versión fijada |
| `channel_hard_limit_exceeded` | 422 | true | un campo supera el límite duro (detalle: campo, límite, largo) |
| `channel_key_invalid` | 422 | true | clave con sufijo de mercado o fuera del patrón |
| `channel_catalog_version_immutable` | 409 | false | escritura sobre una versión publicada |
| `channel_catalog_draft_exists` | 409 | true | la persona ya tiene un borrador abierto |
| `customer_model_reference_invalid` | 422 | true | segmento, persona o etapa inexistente en esa versión |
| `customer_model_unavailable` | 503 | true | el lane de Greenhouse no responde |
| `confirmation_required` | 428 | true | `T2` sin `dryRun`/digest (reusa el código de TASK-1899) |

### Deltas a otras tasks (a registrar por quien tome esta task, o por su dueña si ya está en curso)

- **TASK-1894:** `studio.campaign_brief.channels text[]` nace o migra a `channel_keys text[]`; sus commands de copy,
  pieza, anuncio, presupuesto y post llaman `validateAgainstChannelCatalog` (Slice 3 de esta task agrega el enganche si
  1894 ya cerró).
- **TASK-1899:** su tabla de contratos de canje suma la fila `marketing_studio.catalog.manage` →
  `efeonce-mcp-marketing-studio-catalog-manage` (este Slice 7/8 la implementa con su receta).
- **TASK-1895:** el selector de canal del editor de copy/anuncio usa `studio.channels.list` y muestra hallazgos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1894 (Entregable B) y TASK-1899 en producción → Slice 1 → Slice 2 → Slice 3 (modo `warn`) → Slice 4 → Slice 5 →
  Slice 7 (release Greenhouse antes del gateway) → Slice 8.
- Slice 6 corre después de TASK-1906 en producción y del consumer de TASK-1892; puede ir en paralelo a Slices 4–5.
- `STUDIO_CHANNEL_VALIDATION_MODE=enforce` sólo cuando `channel_unmapped = 0` en production y un release completo corrió
  en `warn` sin hallazgos `hard` inesperados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un límite mal sembrado bloquea copys válidos | Studio escrituras | medium | modo `warn` primero; fuente y fecha por límite; versión nueva corrige sin tocar la anterior | hallazgos `hard` en `logEvent`; atención por campaña |
| Backfill mapea mal un canal | datos de campaña | medium | mapeo humano por alias; `--dry-run` con conteo; lote reversible (`channel_key` a `NULL` por alias) | frescura `channel_unmapped`; diff del dry-run |
| El test de paridad ampliado rompe el build por operaciones heredadas | CI de Studio | medium | Slice 1 declara `riskTier` explícito en todas las entradas antes de encender los detectores | fallo nombrando la operación |
| Lane ICP caído bloquea audiencias | Studio escrituras | low | `503 customer_model_unavailable` actionable; referencia pendiente explícita permitida | `customer_model_unavailable` en logs |
| Nuevo cliente de canje sin allowlist | gateway ↔ Greenhouse | medium | release + redeploy antes del dispatch del gateway; canary | `upstream_unavailable` en el canary |
| Capability sin grant | Greenhouse | low | coverage test en el mismo PR | CI rojo |

### Feature flags / cutover

- `STUDIO_CHANNEL_VALIDATION_MODE` (`off|warn|enforce`, default `warn`) en Vercel de Studio (staging y production).
  Revert: `off` + redeploy de Vercel (< 5 min).
- `STUDIO_CUSTOMER_MODEL_ENABLED` (default `false`) en Vercel de Studio; OFF ⇒ `getCustomerModel` responde estado
  `disabled` y las audiencias sólo aceptan referencias pendientes.
- Ambas filas en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime «Vercel de Studio».

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (el campo es aditivo) | < 15 min | sí |
| Slice 2 | versión nueva o `channels:seed --revert` sobre una versión no referenciada; tablas quedan | < 15 min | sí |
| Slice 3 | `STUDIO_CHANNEL_VALIDATION_MODE=off` | < 5 min | sí |
| Slice 4 | `channels:backfill --revert-alias <raw>` pone `channel_key` a `NULL` para ese alias; texto libre intacto | < 15 min | sí |
| Slice 5 | revert PR + regenerar manifiesto + sync del gateway | < 30 min | sí |
| Slice 6 | `STUDIO_CUSTOMER_MODEL_ENABLED=false`; columnas nullable quedan | < 5 min | sí |
| Slice 7 | quitar el cliente de la allowlist + redeploy; capability queda sin uso | < 15 min | sí |
| Slice 8 | revert del PR del gateway + dispatch | < 30 min | sí |

### Production verification sequence

1. Migraciones en staging de Studio; verificar tablas, columnas y trigger (`UPDATE` sobre versión `published` falla).
2. `channels:seed --version 1` dry-run → apply en staging; `studio.channels.list` devuelve la semilla con fuente y fecha.
3. Modo `warn` en staging: crear copy sobre `CMP-900` que excede un límite recomendado → `201` con `warnings[]` y
   hallazgo; uno que excede un límite duro → hallazgo `hard` registrado.
4. `channels:backfill --dry-run` en production; mapeo humano; `--apply`; `channel_unmapped` baja al conteo esperado.
5. Release de Greenhouse (capability, cliente, allowlist); gateway con el manifiesto nuevo; canary: persona con
   `catalog.manage` crea borrador y publica versión 2 en staging; persona sin capability recibe `forbidden`;
   `discardChannelCatalogDraft` sin digest responde `confirmation_required`.
6. Con TASK-1906 en producción: `studio.customer_model.get` para Efeonce devuelve la versión publicada;
   `upsertChannelAudience` con referencia válida `200`, con persona inexistente `422`.
7. Tras un release en `warn` sin sorpresas: `enforce` en production y verificación de un `422` controlado en `CMP-900`
   de staging.

### Out-of-band coordination required

- Allowlist del cliente de canje en Vercel de Greenhouse production (operador) + redeploy.
- Dispatch manual del deploy del gateway.
- Revisión humana del mapeo de alias (persona de operaciones de campañas).
- Aviso a quienes editan `CATALOGO-DATOS.json`: el canal debe coincidir con un alias mapeado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Toda entrada de `operations.ts` declara `riskTier` y el manifiesto lo exporta por tool.
- [ ] Cada canal de la semilla tiene `utm_source`, `utm_medium`, modo de etiquetado y (en paid) plataforma de compra; el test `expectedGa4Channel` pasa para todos o el canal declara `ga4_custom_group`; ningún canal cae en Unassigned.
- [ ] La lectura del catálogo (API y tool MCP) expone los valores de medición por canal y versión.
- [ ] Cada operación nueva de esta task (lecturas y escrituras del catálogo) se ejecutó en una sesión MCP real con identidad delegada, con evidencia registrada.
- [ ] El test de paridad falla (visto con un caso inyectado) en cada uno de los cinco casos del Slice 1.
- [ ] Un `T2` sin digest responde `428 confirmation_required` por API y por MCP.
- [ ] La versión 1 del catálogo está `published` en staging y production; cada límite, formato y objetivo tiene `source_url` y `verified_on` o vale `NULL`.
- [ ] Un `UPDATE` sobre una fila de una versión `published` falla por trigger.
- [ ] Una clave con sufijo de mercado responde `422 channel_key_invalid`.
- [ ] En `enforce`, un copy con límite duro excedido responde `422 channel_hard_limit_exceeded` y no escribe; en `warn` escribe y registra hallazgo `hard`.
- [ ] Un límite recomendado excedido escribe, devuelve `warnings[]` y aparece en «atención».
- [ ] Todo registro nuevo de copy, anuncio, audiencia, presupuesto por canal, post y derechos guarda `channel_key` y `channel_catalog_version`.
- [ ] Publicar una versión nueva marca `validatedWithPreviousSpec` en los registros previos sin cambiar su versión.
- [ ] `channel_unmapped = 0` en production al cerrar, o cada alias pendiente tiene dueño declarado en el Handoff.
- [ ] Una audiencia guarda organización, versión e id de segmento/persona y `bowtie_stage` separado de `funnel_phase`; Studio no guarda nombres de ICP.
- [ ] `marketing_studio.catalog.manage` existe en catálogo, `capabilities_registry` y grants (sólo `efeonce_admin` y `efeonce_operations`), con coverage test verde.
- [ ] Sesión MCP real verde: persona con capability ejecuta T0 y T1; persona sin capability recibe `forbidden`; el actor auditado es la persona.
- [ ] Gateway desplegado con bump minor y `surface-baseline.json` actualizado.

## Verification

- Studio: `pnpm check` y `pnpm build`.
- Greenhouse: `pnpm local:check`, `pnpm test src/lib/entitlements`, `pnpm migration-marker-gate`.
- Gateway: tests + `pnpm surface:baseline`.
- `pnpm studio:canary` y sesión MCP real con token Entra humano.
- Lectura de `information_schema` y prueba del trigger en staging y production.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-marketing-studio` actualizada según su contrato de mantenimiento (ledger, mapa, contratos, operación, lecciones) y espejada a `.codex/`.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- Contract del canal: `channel_key NOT NULL` y retiro de las columnas de texto libre tras un release sin escritores de texto libre y `channel_unmapped = 0`.
- Catálogo por mercado y localización (ADR §4.8, Sky CL/PE/CO).
- Revisión periódica de especificaciones de plataforma (dueño y cadencia por definir con el operador).

## Open Questions

- Cadencia de revisión de las especificaciones de plataforma (ADR §11.4; quién la mantiene quedó decidido el 2026-09-26: `efeonce_operations` con `efeonce_admin`). Propuesta: trimestral y cada vez que una plataforma anuncia un cambio.
