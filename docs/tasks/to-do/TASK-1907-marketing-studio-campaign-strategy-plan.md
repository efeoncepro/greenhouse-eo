# TASK-1907 — Marketing Studio: plan de campaña (estrategia, audiencias, casa de mensajes, contenidos, medición y programa)

## Decisión vigente 2026-10-04 — desarrollo sin TASK-1899

El operador retiró TASK-1899 por la fricción que añadiría en esta etapa. Su diseño de escritura MCP deja de ser
prerrequisito de desarrollo y cierre del alcance API/CLI/UI de esta task. La federación de escrituras MCP y su
verificación se retiran del alcance actual, pendientes de una nueva decisión; nunca se declaran operativas por
cerrar ese alcance. Esta decisión prevalece sobre las referencias y criterios MCP de TASK-1899 conservados más
abajo. API-first, dependencias funcionales y controles de acceso existentes siguen vigentes.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-10-04 — UTM derivadas de la activación (RESEARCH-012)

- Por [RESEARCH-012](../../research/RESEARCH-012-utm-relevance-ga4-activation-tracking.md): el Slice 5 ya no define la convención UTM por `channel_key`; la toma del catálogo (TASK-1905) y de la activación (TASK-2001). El plan de medición declara eventos de conversión, cadencia y responsable.

## Delta 2026-10-04 — activaciones y calendario de Studio (TASK-2001/2002)

- El plan de contenidos sigue siendo **qué producir** (versión aprobada). La salida concreta a un canal es una **activación** (TASK-2001): un ítem puede tener varias. `setContentPlanItemProgress` vincula también `activation_id`, y el hueco considera cubierto un ítem cuando su activación tiene evidencia `published`, no sólo un `post_id`.

## Delta 2026-10-02

- **TASK-1894 Entregables A y B en producción** (Studio `a8c7886`, API `1.4.0`); Entregable C diferido por el
  operador. La parte de TASK-1894 de la que depende esta task (kernel, brief como entidad, commands de
  pieza/copy/anuncio/post) ya existe; siguen bloqueando TASK-1899, TASK-1905 y TASK-1906.
- **Brief como entidad:** tablas `campaign_brief`, `campaign_brief_audience` y `campaign_brief_kpi` (migración
  `1790967435017_catalog-write-commands.sql`, aplicada en staging y producción); `upsertCampaignBrief` (texto literal;
  editar uno aprobado lo devuelve a borrador), `approveCampaignBrief` (`T2`) y la lectura
  `GET /api/v1/campaigns/{id}/brief` (tool `studio.campaign.brief.get`).
- **Plan de medios con revisión:** `revision` en `media_flight` y en las lecturas del plan (`flightId`, `budgetLineId`);
  `createMediaFlight`/`updateMediaFlight` (uno por campaña); `setBudgetLine` sólo `proposed`; `approveBudgetLine`
  (`T2`) crea la línea `approved` con `approvalRef` (columnas `approval_ref`, `approved_by`, `approved_at`) y conserva
  la propuesta. Es el patrón de aprobación con referencia que esta task puede imitar para `strategy_plan_version`; el
  plan estratégico sigue sin tocar la ruta del plan de medios.
- **Ids a los que se vinculan los ítems del plan:** concepto `CMP###-NN`, pieza `<concepto>-<imagen|video>-<WxH>`;
  `revision` en concepto, anuncio, copy y post.
- **Autoridad por campaña:** CMP-001…005 siguen gobernadas por OneDrive (`409 campaign_not_studio_owned` ante
  escrituras del catálogo) hasta el Entregable C; para probar en staging existe la sandbox `CMP-900`, gobernada por
  Studio. `T2` por API responde hoy `403 confirmation_required` hasta TASK-1899.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
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
- Status real: `Diseno — creada 2026-09-26 desde el ADR de capa de estrategia (§4.4); ningún slice empezado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1894 (kernel, brief como entidad, capabilities .campaign.write) · TASK-1905 (channel_key, riskTier, audiencias con referencia ICP) · TASK-1906 (modelo de cliente publicado, para aprobar planes)`
- Branch: `efeonce-marketing-studio main (código, migraciones, registro, manifiesto) · Greenhouse develop (docs, manual servido) · efeonce-mcp rama + PR (sync del manifiesto, versión); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agrega a cada campaña de Studio un **plan estratégico versionado**: estrategia (objetivo, KPIs con meta, unidad,
ventana y fuente declarada; hipótesis explícitas), **matriz de audiencias** persona × etapa del bow-tie × canal,
**casa de mensajes** con pruebas que citan evidencia, **plan de contenidos** cuyo hueco (lo planificado que todavía no
tiene pieza, copy, anuncio o post real) se calcula y se ve, **plan de medición** (UTM, eventos de conversión, fuente por
meta) y un **programa** opcional que agrupa campañas bajo una misma tesis. El borrador se edita como `T1`; aprobarlo es
`T2` y fija la versión contra la que se medirá la campaña. Todo por commands, `/api/v1` y tools MCP federadas.

## Why This Task Exists

- Studio registra la ejecución (piezas, copys, anuncios, plan de medios, calendario) pero no el **porqué**: el brief es
  una referencia (`campaign.brief_ref`, hoy; entidad estructurada con TASK-1894), no hay objetivo con meta, ni
  hipótesis, ni matriz, ni casa de mensajes, ni plan de contenidos (ADR de capa de estrategia §1).
- Sin plan, nadie ve antes de la fecha qué falta producir, ni contra qué meta se juzga una campaña, ni qué persona y
  etapa atiende cada pieza. El operador pidió planificar dentro de Studio con IA (skill `efeonce-campaign-planning`),
  y esa skill hoy sólo puede producir un documento suelto.
- El ADR fija brief ≠ plan, borrador `T1`, aprobación `T2` con versión inmutable, pruebas sin fuente que bloquean la
  aprobación y programa opcional (§4.4); nada de eso existe.

## Goal

- Cada campaña puede tener un plan estratégico con borrador editable y versiones aprobadas inmutables.
- Los seis bloques del ADR §4.4 (salvo SEO/AEO, que agrega TASK-1908) existen como datos estructurados con reglas de
  integridad, y la aprobación valida su completitud con un `dryRun` que explica qué falta.
- El hueco del plan de contenidos se calcula en el reader contra piezas, copys, anuncios y posts reales, sin guardarse.
- Programa opcional con tesis, pilares y metas por periodo.
- Todo operable por la API y por agentes vía MCP con la persona como actor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §4.1,
  §4.3, §4.4, §5, §8)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes, §3.1, §4, §4.1)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/ui/flows/EPIC-049-marketing-studio-UI-FLOW.md` (§11 brief vs plan de medios; nodos que consumirá TASK-1912)

Reglas obligatorias:

- **Brief ≠ plan.** El plan nunca escribe el brief; un KPI del plan puede declarar qué KPI del brief responde
  (`brief_kpi_id`). Si el plan necesita una promesa que el brief no tiene, primero se actualiza el brief (TASK-1894).
- **Borrador editable, aprobada inmutable.** Toda edición ocurre en una versión `draft` (`T1`); aprobar (`T2`) la
  congela; editar después crea un borrador nuevo desde la aprobada. La medición de la campaña referencia la versión
  aprobada vigente.
- **Una prueba sin fuente no se aprueba** (ADR §4.4); un KPI sin fuente de medición declarada tampoco.
- **Etapa del bow-tie ≠ fase creativa del embudo:** dos columnas distintas en cada celda y en cada ítem.
- **Nada de personas locales:** la matriz referencia el modelo de cliente de Greenhouse (organización, versión, id) o
  una referencia pendiente visible; una pendiente bloquea la aprobación.
- **Ausencia ≠ cero:** línea base desconocida es `NULL`, nunca 0; hueco calculado, nunca guardado.
- **Texto literal:** mensajes, pruebas y títulos se guardan byte a byte, como el copy.
- Los montos del plan de medios y el sobre del brief **no** se tocan ni se suman aquí.
- El progreso operativo del plan de contenidos (vínculo a pieza/copy/anuncio/post y estado declarado) **no** es
  contenido del plan: vive fuera de la versión y se edita sin crear versión nueva.

## Normative Docs

- `.claude/skills/efeonce-campaign-planning/SKILL.md` (método y orden del plan; esta task le da las tools reales).
- `.claude/skills/efeonce-marketing-studio/SKILL.md` (contrato de mantenimiento).
- `.claude/skills/efeonce-customer-model-operator/SKILL.md` (roles y evidencia en la matriz).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `mcp-craft`.
- `docs/tasks/in-progress/TASK-1894-marketing-studio-write-commands-authority-cutover.md` §«Brief como entidad» y §«Forma
  común de un command»; `docs/tasks/to-do/TASK-1899-marketing-studio-mcp-writes-approvals.md` §«Aprobación».
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md` §8 (contrato del brief ampliado; convención de nombres de archivo).

## Contrato editorial SEO reconciliado — 2026-10-04

El plan de contenidos referencia trabajo/brief editorial de Studio (TASK-1667/TASK-1913), con
versión y sujeto SV360 desde TASK-1908; no crea una segunda cola ni lifecycle editorial. El plan
puede existir antes de producir o medir: 1667/1668 son consumers posteriores, no blockers de foundation.

Canon: ADR de estrategia Studio §14. Esta precisión documental no implementa ni cierra esta task.

## Dependencies & Impact

### Depends on

- `TASK-1894`: kernel, `studio.campaign_brief` + `campaign_brief_kpi`, commands de pieza/copy/anuncio/post (los ítems del
  plan se vinculan a sus ids), capability `marketing_studio.campaign.write`.
- `TASK-1899`: `marketing_studio.campaign.approve`, `proposalDigest`, federación de escrituras.
- `TASK-1905`: `channel_key` + versión de catálogo, `riskTier`, `studio.audience` con referencia ICP, adapter del modelo
  de cliente.
- `TASK-1906`: modelo de cliente publicado (la aprobación exige referencias resueltas).

### Blocks / Impacts

- TASK-1667/TASK-1913 (work editorial) y TASK-1669 (plan diario).

- `TASK-1908` (plan SEO/AEO): agrega su bloque a la versión del plan y su chequeo al `dryRun` de aprobación.
- `TASK-1909` (IA): el borrador de plan por agente usa estos commands; la procedencia se engancha a ellos.
- `TASK-1910` (medición): lee el plan de medición y los KPIs aprobados.
- `TASK-1911` (experimentos): una hipótesis del plan es el origen de un experimento.
- `TASK-1912` (UI): pinta el plan, la matriz, la casa de mensajes, el hueco y el programa.
- `TASK-1895`: nada que cambiar; el brief sigue siendo su superficie.

### Files owned

- Repo Studio — contratos: `packages/contracts/src/strategy-plan.ts` [nuevo], `packages/contracts/src/programs.ts` [nuevo], `packages/contracts/src/metric-sources.ts` [nuevo] (vocabulario cerrado de fuentes y métricas), `packages/contracts/src/operations.ts`, `packages/contracts/src/semantics.ts`, `packages/contracts/src/errors.ts`, `packages/contracts/generated/tool-manifest.json`
- Repo Studio — dominio: `packages/domain/src/strategy-plan/**` [nuevo] (`model.ts`, `readiness.ts`, `coverage.ts`, `clone.ts`), `packages/domain/src/commands/strategy-plan.ts` [nuevo], `packages/domain/src/commands/program.ts` [nuevo], `packages/domain/src/readers/strategy-plan.ts` [nuevo], `packages/domain/src/readers/programs.ts` [nuevo]
- Repo Studio — base: `packages/database/migrations/<ts>_strategy-plan.sql` [nuevo], `packages/database/migrations/<ts>_programs.sql` [nuevo], `packages/database/src/schema.ts`
- Repo Studio — web: `apps/web/src/app/api/v1/campaigns/[campaignId]/strategy-plan/**`, `apps/web/src/app/api/v1/campaigns/[campaignId]/content-items/**`, `apps/web/src/app/api/v1/campaigns/[campaignId]/program/**`, `apps/web/src/app/api/v1/programs/**`
- Greenhouse: `docs/mcp/skills/marketing-studio/SKILL.md`, docs de arquitectura/funcional/manual de Studio
- Gateway: `package.json` (versión), `surface-baseline.json`

## Current Repo State

### Already exists

- `studio.campaign` con `funnel_phase`, `audience_summary`, `brief_ref` (texto libre) y los tres estados.
- Plan de **medios** (`getCampaignPlan`, `GET /api/v1/campaigns/{id}/plan`, tool `studio.campaign.media_plan.get`):
  flights y líneas de presupuesto por naturaleza. Es otra cosa; esta task no lo toca y no reutiliza su ruta.
- Brief estructurado con audiencias y KPIs: existe desde 2026-10-02 (TASK-1894 Entregable B; tablas `campaign_brief`,
  `campaign_brief_audience`, `campaign_brief_kpi`, commands `upsertCampaignBrief`/`approveCampaignBrief`, lectura
  `studio.campaign.brief.get`).
- Plan de medios con `revision` y aprobación de línea con `approvalRef` (TASK-1894 Entregable B, 2026-10-02).
- Método de planificación en la skill `efeonce-campaign-planning` (documento, sin persistencia).

### Gap

- No hay entidad de plan estratégico, ni versiones, ni aprobación, ni hueco calculado, ni programa.
- No hay vocabulario cerrado de fuentes de medición para declarar dónde se mide cada meta.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/contracts`, `packages/domain`, `packages/database`, `apps/web`) + manual servido en Greenhouse + sync en `efeonce-mcp`
- Future candidate home: `remain-shared`
- Boundary: aggregate `strategy-plan` en `packages/domain/src/strategy-plan/**`; commands vía `runCommand`; consumers: `/api/v1`, tools `studio.*`, UI de TASK-1912, skill de planificación
- Server/browser split: dominio, readers y commands en servidor; el navegador sólo consume `/api/v1`
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: schema `studio` (tablas nuevas del plan y del programa; `campaign.program_id`)
- Consumidores afectados: web (TASK-1912), agentes vía MCP, TASK-1908/1909/1910/1911
- Runtime target: `staging` y `production` de Studio; gateway

### Contract surface

- Contrato existente a respetar: forma común de command de TASK-1894; `riskTier` de TASK-1905; digest de TASK-1899; `ERROR_CATALOG`
- Contrato nuevo o modificado: operaciones de Detailed Spec §«Operaciones y tools»; DTO `StrategyPlan` con `coverage`
- Backward compatibility: `compatible` (todo nuevo; `campaign.program_id` nullable)
- Full API parity: cada bloque se lee y se escribe por `/api/v1` y MCP con el mismo command que usará la UI

### Data model and invariants

- Entidades/tablas/views afectadas: `studio.strategy_plan`, `strategy_plan_version`, `plan_objective`, `plan_kpi`, `plan_hypothesis`, `plan_audience_cell`, `plan_message_house`, `plan_message_pillar`, `plan_proof_point`, `plan_persona_message`, `plan_content_item`, `plan_content_item_progress`, `plan_measurement`, `studio.program`, `program_pillar`, `program_goal` (nuevas); `studio.campaign.program_id` (nueva)
- Invariantes que no se pueden romper:
  - una versión `approved` o `superseded` no cambia (trigger)
  - una sola `draft` por campaña; aprobar supersede la anterior aprobada en la misma transacción
  - `plan_proof_point` sin evidencia ⇒ la aprobación falla
  - KPI con meta sin fuente declarada ⇒ la aprobación falla
  - referencia de persona pendiente ⇒ la aprobación falla
  - bow-tie y fase creativa en columnas distintas
  - hueco calculado en el reader; nunca persistido
  - `item_id` y `kpi_id` estables entre versiones (el progreso y la medición los siguen)
- Write-target allowlist: N/A (Studio; guard = test de paridad ampliado)
- Tenant/space boundary: por `campaign.organization_id`; programas por `organization_id`; una campaña sólo entra a un programa de su misma organización
- Idempotency/concurrency: `Idempotency-Key` en todo; `If-Match` con `revision` de la versión en borrador (o del progreso del ítem); aprobar con lock de fila sobre `strategy_plan`
- Audit/outbox/history: `audit_event` por command en la misma transacción; versiones conservadas

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `STUDIO_STRATEGY_PLAN_ENABLED=false` (rutas responden `disabled` y las tools `policy_blocked` en el gateway por el error canónico) hasta el canary en staging
- Backfill plan: ninguno automático; las campañas `CMP-001…005` reciben plan sólo si una persona o agente lo redacta (nunca inferido de `audience_summary`)
- Rollback path: flag OFF; revert PR; tablas quedan
- External coordination: env var en Vercel de Studio; dispatch del gateway

### Security and access

- Auth/access gate: lectura `.campaign.read` / `studio:read`; borrador `.campaign.write` / `studio:write`; aprobar `.campaign.approve` (persona, `requiresPerson`); descartar borrador y cerrar programa `T2` con `.campaign.write`
- Sensitive data posture: sin PII; `owner_label` del ítem es etiqueta de persona interna, sin email
- Error contract: códigos nuevos en Detailed Spec; `{ error, code, actionable }`
- Abuse/rate-limit posture: tope de 300 ítems de contenido y 200 celdas por versión

### Runtime evidence

- Local checks: tests de readiness (cada regla de aprobación falla sola), coverage (fixtures de ítems con y sin vínculo), inmutabilidad, clonación de versión, paridad
- DB/runtime checks: migraciones y trigger verificados en staging y production
- Integration checks: canary MCP con plan completo en `CMP-900` de staging: borrador, `dryRun` de aprobación con faltantes, aprobación con digest, edición posterior crea borrador
- Reliability signals/logs: frescura nueva `strategy_plan_overdue_items` en health profundo (ítems con `due_on` vencido sin vínculo en campañas activas); ítem de atención por campaña
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en `packages/domain/src/strategy-plan/**`.
- [ ] Aggregate `strategy_plan` → versiones → bloques, con commands por bloque.
- [ ] Reader con `coverage`; commands con `riskTier`, capability, idempotencia, `If-Match`, audit y errores canónicos.
- [ ] Sin capability nueva: usa `.campaign.write` y `.campaign.approve` (sembradas por TASK-1894/1899); declarado.
- [ ] Camino programático: `/api/v1` + tools federadas.
- [ ] Aprobación y descarte aptos para `dryRun` → digest → confirmación.
- [ ] Un primitive, muchos consumers (UI, agentes, skill de planificación, Nexa por el gateway).
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

### Slice 1 — Modelo, versiones y vocabulario de fuentes

- Migración `<ts>_strategy-plan.sql` (tablas de Detailed Spec §«Modelo», trigger de inmutabilidad de versiones
  `approved`/`superseded`, bloque `DO`), `schema.ts`.
- `packages/contracts/src/metric-sources.ts`: vocabulario cerrado `measurementSource ∈ {ga4, search_console,
  seo_visibility, meta_ads, linkedin_ads, metricool, hubspot, manual}` y `metricKey` por fuente (los que TASK-1892 y
  TASK-1910 leen); `manual` exige `manual_method` descriptivo.
- `packages/domain/src/strategy-plan/clone.ts`: nuevo borrador desde la última aprobada, preservando `kpi_id`,
  `hypothesis_id`, `cell_id`, `pillar_id`, `item_id`.

### Slice 2 — Estrategia y matriz de audiencias

- Commands `createStrategyPlanDraft`, `setPlanStrategy` (objetivo + KPIs + hipótesis como conjunto, reemplazo con
  `If-Match`; el `dryRun` muestra altas, cambios y bajas), `setPlanAudienceMatrix` (celdas persona × etapa × canal con
  `audience_key` opcional de `studio.audience`).
- Validación: persona y etapa existen en la versión del modelo de cliente fijada en la campaña (adapter de TASK-1905);
  `channel_key` activo en la versión de catálogo de la campaña; KPIs con `brief_kpi_id` apuntan a un KPI del brief de la
  misma campaña.

### Slice 3 — Casa de mensajes

- Command `setPlanMessageHouse`: mensaje paraguas, pilares, pruebas (cada una con `evidence_kind ∈ {document, metric,
  case, third_party, customer_quote}`, `evidence_ref`, `as_of`; `evidence_ref NULL` = sin fuente, visible y bloqueante)
  y mensajes por persona (texto literal, referencia a persona de la matriz).

### Slice 4 — Plan de contenidos, progreso y hueco

- Commands `upsertContentPlanItem` / `removeContentPlanItem` (en el borrador; quitar = baja reversible dentro del
  borrador) y `setContentPlanItemProgress` (fuera de la versión: vínculos a `asset_id`, `copy_id`, `ad_id`, `post_id`
  de la misma campaña + estado declarado `planned|in_production|delivered|dropped`).
- `coverage.ts`: por ítem aprobado calcula `gap ∈ {no_link, link_without_approved_version, overdue, covered, dropped}`
  contra piezas (versión vigente y `review_state`), copys, anuncios y posts (evidencia observada), y agregados por
  canal, persona y etapa. Nunca persistido.
- Frescura `strategy_plan_overdue_items` y ítem de atención («N ítems del plan vencidos sin pieza»).

### Slice 5 — Plan de medición

- Command `setPlanMeasurement`: convención UTM (`utm_source`/`utm_medium` por `channel_key`, `utm_campaign` de la
  campaña, `utm_content` por ítem), eventos de conversión (nombres GA4 y formularios/campos ocultos de HubSpot como
  referencias declaradas), cadencia de lectura y responsable. No escribe el mapeo de métricas de TASK-1892 (eso es
  TASK-1910).

### Slice 6 — Aprobación y descarte (`T2`)

- `approveStrategyPlan` (`requiresPerson`, `.campaign.approve`): `dryRun` devuelve `readiness[]` (Detailed Spec
  §«Reglas de aprobación»), `diff` contra la aprobada anterior y `proposalDigest`; con faltantes responde `422
  strategy_plan_not_ready` y el detalle; sin faltantes y con digest aprueba.
- `discardStrategyPlanDraft` (`T2`, destructiva).
- Punto de extensión `readinessContributors` para que TASK-1908 agregue las reglas del bloque SEO/AEO sin tocar este
  command.

### Slice 7 — Programa

- Migración `<ts>_programs.sql`: `studio.program`, `program_pillar`, `program_goal`, `campaign.program_id`.
- Commands `upsertProgram` (`T1`), `setCampaignProgram` (`T1`, misma organización), `closeProgram` (`T2`).
- Readers `listPrograms`, `getProgram` (campañas del programa con su estado y plan aprobado; metas por periodo sin
  sumar montos ni mezclar fuentes).

### Slice 8 — Exposición, gateway, canary y docs

- Rutas, registro con `riskTier`, descripciones con `mcp-craft`, `pnpm mcp:manifest:generate`, `API_VERSION` minor.
- Gateway: `pnpm studio:manifest:sync`, bump minor, `surface:baseline`, PR, dispatch (sin clientes de canje nuevos: usa
  `.campaign.write` y `.campaign.approve` de TASK-1899).
- Canary MCP real y actualización de docs, manual servido, skills `efeonce-marketing-studio` y `efeonce-campaign-planning`
  (la skill pasa de «documento» a «escribe en Studio con estas tools»).

## Out of Scope

- Bloque SEO/AEO del plan (TASK-1908).
- Procedencia de IA y tools de borrador asistido (TASK-1909).
- Mapeo de métricas, readback y chequeo de destino (TASK-1910).
- Experimentos y aprendizajes (TASK-1911).
- UI del plan (TASK-1912).
- Cambios al brief o al plan de medios.

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `strategy_plan` | `campaign_id PK FK`, `approved_version_no int NULL`, `draft_version_no int NULL`, `customer_model_version int NULL`, `channel_catalog_version int NULL` |
| `strategy_plan_version` | `(campaign_id, version_no) PK`, `status draft\|approved\|superseded`, `based_on`, `approved_by`, `approved_at`, `approval_ref`, `revision`, `created_by` |
| `plan_objective` | `(campaign_id, version_no) PK`, `objective_kind brand\|demand\|conversion\|adoption\|retention\|expansion`, `statement` |
| `plan_kpi` | `(campaign_id, version_no, kpi_id) PK`, `label`, `measurement_source`, `metric_key`, `target_value numeric`, `unit`, `baseline_value numeric NULL`, `window_starts_on`, `window_ends_on`, `is_primary`, `brief_kpi_id NULL` |
| `plan_hypothesis` | `(campaign_id, version_no, hypothesis_id) PK`, `statement`, `kpi_ids text[]`, `confidence low\|medium\|high` |
| `plan_audience_cell` | `(campaign_id, version_no, cell_id) PK`, `segment_id`, `persona_id NULL`, `pending_note NULL`, `buying_role NULL`, `bowtie_stage`, `funnel_phase NULL`, `channel_key`, `audience_key NULL`, `pillar_id NULL`, `priority primary\|secondary` |
| `plan_message_house` | `(campaign_id, version_no) PK`, `umbrella_message` |
| `plan_message_pillar` | `(campaign_id, version_no, pillar_id) PK`, `title`, `statement`, `position` |
| `plan_proof_point` | `(campaign_id, version_no, proof_id) PK`, `pillar_id`, `statement`, `evidence_kind NULL`, `evidence_ref NULL`, `as_of NULL` |
| `plan_persona_message` | `(campaign_id, version_no, pillar_id, persona_id) PK`, `message` |
| `plan_content_item` | `(campaign_id, version_no, item_id) PK`, `title`, `concept_id NULL`, `channel_key`, `placement_key NULL`, `format_key`, `cell_id NULL`, `pillar_id NULL`, `funnel_phase NULL`, `owner_label`, `due_on`, `publish_window_start NULL`, `publish_window_end NULL`, `filename_stem NULL`, `status active\|removed` |
| `plan_content_item_progress` | `(campaign_id, item_id) PK`, `asset_id NULL`, `copy_id NULL`, `ad_id NULL`, `post_id NULL`, `declared_status`, `revision`, `updated_by` |
| `plan_measurement` | `(campaign_id, version_no) PK`, `utm_convention jsonb`, `conversion_events jsonb`, `reading_cadence`, `owner_label` |
| `program` | `program_id PK`, `organization_id`, `name`, `thesis`, `period_starts_on`, `period_ends_on`, `status active\|closed`, `revision` |
| `program_pillar` / `program_goal` | pilares de la tesis; metas con `measurement_source`, `metric_key`, `target_value`, `period` |

`filename_stem` sigue la convención canónica `CMP001-02 - <título> - 4x5` (la que infiere `studio:upload`, TASK-1894).

### Reglas de aprobación (`readiness`)

1. Existe brief de la campaña con estado aprobado (TASK-1894).
2. Hay objetivo y al menos un KPI primario con meta, unidad, ventana y `measurement_source`.
3. Toda hipótesis referencia al menos un KPI.
4. Toda celda tiene persona resuelta (sin `pending_note`), etapa del bow-tie válida y canal activo.
5. Toda prueba tiene `evidence_ref`.
6. Todo ítem activo tiene canal y formato válidos en la versión de catálogo fijada y `due_on`.
7. Si el objetivo es `demand` o `conversion`, el plan de medición declara al menos un evento de conversión y la
   convención UTM.
8. Contribuyentes externos (`readinessContributors`, p. ej. SEO/AEO de TASK-1908) sin faltantes.

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel | Capability / scope |
|---|---|---|---|---|
| `getStrategyPlan` | `GET /api/v1/campaigns/{campaignId}/strategy-plan?version=` | `studio.campaign.strategy_plan.get` | T0 | `.campaign.read` / `studio:read` |
| `listStrategyPlanVersions` | `GET /api/v1/campaigns/{campaignId}/strategy-plan/versions` | `studio.campaign.strategy_plan.versions.list` | T0 | ídem |
| `listContentPlanGaps` | `GET /api/v1/campaigns/{campaignId}/strategy-plan/gaps` | `studio.campaign.content_plan.gaps.list` | T0 | ídem |
| `createStrategyPlanDraft` | `POST /api/v1/campaigns/{campaignId}/strategy-plan/drafts` | `studio.campaign.strategy_plan.draft.create` | T1 | `.campaign.write` / `studio:write` |
| `setPlanStrategy` | `PUT …/strategy-plan/drafts/{versionNo}/strategy` | `studio.campaign.strategy_plan.strategy.set` | T1 | ídem |
| `setPlanAudienceMatrix` | `PUT …/strategy-plan/drafts/{versionNo}/audience-matrix` | `studio.campaign.strategy_plan.audience_matrix.set` | T1 | ídem |
| `setPlanMessageHouse` | `PUT …/strategy-plan/drafts/{versionNo}/message-house` | `studio.campaign.strategy_plan.message_house.set` | T1 | ídem |
| `upsertContentPlanItem` | `PUT …/strategy-plan/drafts/{versionNo}/content-items/{itemId}` | `studio.campaign.strategy_plan.content_item.upsert` | T1 | ídem |
| `removeContentPlanItem` | `DELETE …/strategy-plan/drafts/{versionNo}/content-items/{itemId}` | `studio.campaign.strategy_plan.content_item.remove` | T1 (baja reversible en borrador) | ídem |
| `setPlanMeasurement` | `PUT …/strategy-plan/drafts/{versionNo}/measurement` | `studio.campaign.strategy_plan.measurement.set` | T1 | ídem |
| `setContentPlanItemProgress` | `PUT /api/v1/campaigns/{campaignId}/content-items/{itemId}/progress` | `studio.campaign.content_item.progress.set` | T1 | ídem |
| `approveStrategyPlan` | `POST …/strategy-plan/drafts/{versionNo}/approve` | `studio.campaign.strategy_plan.approve` | T2 (persona) | `.campaign.approve` / ninguno |
| `discardStrategyPlanDraft` | `DELETE …/strategy-plan/drafts/{versionNo}` | `studio.campaign.strategy_plan.draft.discard` | T2 | `.campaign.write` / `studio:write` |
| `listPrograms` / `getProgram` | `GET /api/v1/programs` · `GET /api/v1/programs/{programId}` | `studio.programs.list` · `studio.program.get` | T0 | `.campaign.read` / `studio:read` |
| `upsertProgram` | `PUT /api/v1/programs/{programId}` | `studio.program.upsert` | T1 | `.campaign.write` / `studio:write` |
| `setCampaignProgram` | `PUT /api/v1/campaigns/{campaignId}/program` | `studio.campaign.program.set` | T1 | ídem |
| `closeProgram` | `POST /api/v1/programs/{programId}/close` | `studio.program.close` | T2 | ídem |

### Errores nuevos

| code | HTTP | actionable | Cuándo |
|---|---|---|---|
| `strategy_plan_not_ready` | 422 | true | aprobar con faltantes (detalle `readiness[]`) |
| `strategy_plan_draft_exists` | 409 | true | ya hay borrador abierto |
| `strategy_plan_version_immutable` | 409 | false | escritura sobre versión aprobada |
| `plan_reference_invalid` | 422 | true | persona, etapa, canal, KPI del brief o entidad vinculada inválidos u otra campaña |
| `program_organization_mismatch` | 422 | false | campaña y programa de organizaciones distintas |

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Dependencias en producción → Slice 1 → Slices 2, 3, 5 (paralelos) → Slice 4 → Slice 6 → Slice 7 → Slice 8.
- `STUDIO_STRATEGY_PLAN_ENABLED` se prende en staging tras el canary con `CMP-900` y en production después de un release.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reglas de aprobación demasiado estrictas frenan el trabajo | operación de campañas | medium | `dryRun` explica cada faltante; el borrador nunca se bloquea | tasa de `strategy_plan_not_ready` en logs |
| Plan aprobado editado en su lugar | integridad de medición | low | trigger de inmutabilidad + clonación | test de trigger |
| Hueco mal calculado por vínculos ajenos a la campaña | lectura | low | validación de misma campaña en el command | `plan_reference_invalid` |
| Confusión plan de medios ↔ plan estratégico | agentes | medium | rutas y tools distintas (`strategy_plan` vs `media_plan`); glosario en `semantics.ts` | preguntas en el canary |

### Feature flags / cutover

- `STUDIO_STRATEGY_PLAN_ENABLED` (Vercel de Studio; default `false`). Revert: `false` + redeploy (< 5 min). Fila en el
  ledger de flags.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–7 | flag OFF; revert PR; tablas quedan | < 15 min | sí |
| Slice 8 | revert del sync en el gateway + dispatch | < 30 min | sí |

### Production verification sequence

1. Migraciones en staging; trigger verificado.
2. Flag ON en staging; canary con `CMP-900`: borrador, bloques, `dryRun` de aprobación con faltantes, completar, aprobar
   con digest (persona), editar ⇒ borrador nuevo; hueco correcto con un ítem vinculado y otro no.
3. Persona sin `.campaign.approve` ⇒ `forbidden`; `api_client` ⇒ `approval_requires_person`.
4. Production con flag OFF → ON tras un release; sesión MCP real.

### Out-of-band coordination required

- Dispatch manual del gateway.
- Operador valida con un plan real (una campaña vigente) que las reglas de aprobación son las correctas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El ítem de contenido referencia brief/work/version Studio (TASK-1667/TASK-1913) y evidencia SEO de TASK-1908; no duplica lifecycle ni prioridad SV360.
- [ ] Un contenido planeado no se representa publicado/medido por tener un vínculo o versión aprobada; conserva observación y cobertura separadas.

- [ ] Existen las tablas del plan y del programa con trigger de inmutabilidad probado.
- [ ] Una campaña tiene como máximo un borrador y una versión aprobada vigente; editar tras aprobar crea borrador nuevo con ids estables.
- [ ] Cada una de las ocho reglas de aprobación, fallando sola, produce su ítem en `readiness[]` y bloquea la aprobación.
- [ ] Aprobar exige persona y digest; `api_client` recibe `approval_requires_person`.
- [ ] El hueco por ítem distingue `no_link`, `link_without_approved_version`, `overdue`, `covered` y `dropped`, y no se persiste.
- [ ] Etapa del bow-tie y fase creativa se guardan en columnas distintas y se validan por separado.
- [ ] El plan nunca escribe el brief ni el plan de medios (test).
- [ ] Programa: una campaña de otra organización responde `program_organization_mismatch`.
- [ ] Todas las operaciones de la tabla están en el registro con `riskTier`, en el OpenAPI y federadas; sesión MCP real verde.
- [ ] La skill `efeonce-campaign-planning` usa las tools reales.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Gateway: tests + `pnpm surface:baseline`.
- Canary MCP real en staging y production.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-marketing-studio` actualizada (contrato de mantenimiento) y espejada.
- [ ] `EPIC-049` refleja el estado de esta task.

## Follow-ups

- Plan por mercado (Sky CL/PE/CO) cuando se decida la localización (ADR §4.8).
- Comparar planes entre campañas de un programa (lectura agregada).

## Open Questions

- ¿La aprobación del plan exige brief **aprobado** (regla 1) o sólo existente? Por defecto aprobado; confirmar con el operador.
