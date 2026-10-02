# TASK-1909 — Marketing Studio: IA por agentes con procedencia (borradores, validadores, contexto e informe semanal)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-26 — decisiones del operador

- **`studio.voice_rules.publish` es `T2`**, no `T1` (decisión de Julio Reyes, operador, 2026-09-26): publicar una
  versión de reglas de voz exige `dryRun` → digest de propuesta → confirmación explícita de una persona (token sin
  `act`), con la capability restringida `marketing_studio.catalog.manage`. Editar el borrador
  (`studio.voice_rules.draft.upsert`) sigue siendo `T1` restringido. Esta decisión no cambia el nivel de la
  publicación del catálogo de canales (TASK-1905).

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
- Status real: `Diseno — creada 2026-09-26 desde el ADR de capa de estrategia (§4.6); ningún slice empezado`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1905 (límites de canal, riskTier, capability de catálogos) · TASK-1907 (commands del plan a los que se engancha la procedencia) · TASK-1899 (escritura MCP y persona como actor). El contexto incluye SEO/AEO cuando exista TASK-1908 y aprendizajes cuando exista TASK-1911; sin ellas esas secciones responden not_available`
- Branch: `efeonce-marketing-studio main (procedencia, validadores, contexto, entidades de borrador) · Greenhouse develop (manual servido, docs, skills) · efeonce-mcp rama + PR (sync y versión); sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hace que Claude, Codex y Nexa **redacten dentro de Studio** con procedencia registrada y sin volverse autoridad:
un paquete de contexto acotado y versionado por campaña (brief, plan, modelo de cliente, límites de canal, reglas de
voz, SEO/AEO, aprendizajes validados); validadores deterministas de copy (límites del catálogo y reglas de voz) y de
pieza (formato del canal y derechos); entidades de borrador para briefs de contenido SEO/AEO, informes de QA creativo
e informe semanal de desempeño; y un **modelo de procedencia inmutable** (modelo y proveedor, instrucción y versión,
fuentes con ids y versiones, persona, quién aceptó y cuándo, si se editó después) que todo contenido redactado por IA
debe traer. La IA propone y una persona acepta; nunca aprueba, publica ni gasta. La IA dentro del producto queda como
follow-up sobre los mismos commands.

## Why This Task Exists

- Los agentes leen 12 tools `studio.*` pero no pueden redactar un plan, un copy por canal ni un informe que quede
  registrado con su procedencia (ADR de capa de estrategia §1). La skill `efeonce-campaign-planning` produce documentos
  sueltos que nadie puede auditar.
- El ADR decide **agentes primero** (§3.3 opción B), procedencia obligatoria e inmutable, copy aceptado que no se
  reescribe, y control de costo (§4.6). Nada de eso existe.
- Sin validadores deterministas, un agente no puede comprobar antes de escribir que un copy cabe en su plataforma o que
  una pieza tiene el formato y los derechos del canal; el error se descubriría al publicar.

## Goal

- Todo contenido redactado por un agente en Studio trae procedencia completa, inmutable y consultable; su aceptación
  la registra una persona.
- Los agentes tienen un contexto por campaña acotado, versionado y citable (`contextDigest`).
- Validadores deterministas de copy y de pieza disponibles por API y MCP antes de escribir.
- Briefs de contenido SEO/AEO, informes de QA creativo e informes semanales existen como entidades con borrador y
  aceptación.
- La ejecución de punta a punta por agentes queda documentada en el manual servido y en la skill de planificación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_STRATEGY_LAYER_DECISION_V1.md` (**gobernante**: §3.3,
  §4.1, §4.6, §5, §8)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (§3 invariantes: copy literal)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` (loop `propose → confirm → execute`)
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_AI_CREATIVE_DATA_GOVERNANCE_DECISION_V1.md` (gobierno de datos y derechos en trabajo creativo con IA)

Reglas obligatorias:

- **La IA propone, una persona acepta, el command ejecuta.** Ninguna tool de esta task aprueba, publica ni gasta;
  aprobar sigue siendo `T2` de las tasks dueñas y rechaza contenido de IA no aceptado.
- **Procedencia obligatoria e inmutable:** toda escritura por MCP que traiga texto redactado declara
  `provenance.origin ∈ {ai_agent, human_dictated}`; `ai_agent` exige modelo, proveedor, instrucción y fuentes. Los
  eventos posteriores (aceptado, editado, rechazado) se agregan, nunca se reescriben.
- **Copy aceptado no se reescribe en su lugar:** una propuesta de IA crea una variante nueva (TASK-1894 `createCopyVariant`).
- **Studio no llama modelos en esta task:** el costo de modelo lo absorbe el cliente agente; Studio registra el uso que
  el cliente reporta, etiquetado como reportado, y aplica cuotas de escritura.
- **Evidencia antes que afirmación:** una prueba, cifra o afirmación en un borrador de IA sin fuente queda marcada; un
  aprendizaje sin evidencia no se usa como hecho (sólo aprendizajes `validated` entran al contexto).
- **Ausencia ≠ cero** en el contexto y en el informe semanal: métrica sin dato se dice «sin dato».

## Normative Docs

- `.claude/skills/efeonce-campaign-planning/SKILL.md` (flujo agéntico de planificación; esta task le da tools reales).
- `.claude/skills/copywriting/SKILL.md` y `docs/context/05_voz-tono-estilo.md` (reglas de voz a sembrar).
- `.claude/skills/efeonce-advertising-creative/SKILL.md` y `axis-design-system` (QA creativo contra marca y AXIS lo hace el
  agente; el validador de Studio cubre formato y derechos).
- `.claude/skills/efeonce-mcp-platform/SKILL.md` + `mcp-craft`; `.claude/skills/efeonce-marketing-studio/SKILL.md`.
- `docs/tasks/to-do/TASK-1903-efeonce-insights-editorial-agent.md` (patrón de agente que propone y persona que acepta por
  campo en Insights; referencia de método, no dependencia).

## Dependencies & Impact

### Depends on

- `TASK-1905`: `validateAgainstChannelCatalog`, `riskTier`, capability `marketing_studio.catalog.manage`.
- `TASK-1907`: commands del plan (`setPlan*`, `upsertContentPlanItem`) donde se engancha la procedencia.
- `TASK-1894`: `createCopyVariant`, derechos de versión, kernel.
- `TASK-1899`: escritura MCP con persona delegada.
- Opcionales: `TASK-1908` (objetivos y snapshots SEO/AEO para el contexto y el brief de contenido), `TASK-1911`
  (aprendizajes validados), `TASK-1892`/`TASK-1910` (métricas para el informe semanal).

### Blocks / Impacts

- `TASK-1911`: el contexto consume aprendizajes validados.
- `TASK-1912`: muestra procedencia, aceptación y hallazgos de QA.
- Follow-up de IA dentro del producto (puerto único de proveedor + evaluación + techo por organización).

### Files owned

- Repo Studio: `packages/contracts/src/provenance.ts` [nuevo], `packages/contracts/src/ai-drafts.ts` [nuevo], `packages/domain/src/provenance/**` [nuevo], `packages/domain/src/ai/context-pack.ts` [nuevo], `packages/domain/src/ai/validators/copy.ts` [nuevo], `packages/domain/src/ai/validators/creative.ts` [nuevo], `packages/domain/src/voice/**` [nuevo], `packages/domain/src/commands/content-brief.ts` [nuevo], `packages/domain/src/commands/qa-report.ts` [nuevo], `packages/domain/src/commands/readout.ts` [nuevo], `packages/domain/src/commands/ai-draft.ts` [nuevo], `packages/domain/src/commands/kernel.ts` (hook `acceptsGeneratedContent`), `packages/database/migrations/<ts>_ai-provenance.sql` [nuevo], `packages/database/seeds/voice-rules-efeonce-v1.json` [nuevo], `packages/database/src/schema.ts`, `packages/contracts/src/operations.ts`, `apps/web/src/app/api/v1/{context,validate,provenance,content-briefs,qa-reports,readouts,voice-rules,ai-drafts}/**`
- Greenhouse: `docs/mcp/skills/marketing-studio/SKILL.md` (sección «Redactar con IA»), docs de Studio, `.claude/skills/efeonce-campaign-planning/**` (tools reales; coordinar con su autor)
- Gateway: `package.json`, `surface-baseline.json`

## Current Repo State

### Already exists

- Lecturas de Studio por MCP (TASK-1891) y el plan de escritura por MCP (TASK-1899).
- Skill `efeonce-campaign-planning` (método agéntico que hoy entrega un documento).
- Guía de voz documental `docs/context/05_voz-tono-estilo.md`.
- Precedente de autoría IA acotada con aceptación por campo: TASK-1845/1903 en Insights.

### Gap

- No existe procedencia, ni aceptación de borradores, ni contexto por campaña, ni validadores, ni entidades de brief de
  contenido, QA o informe semanal, ni reglas de voz versionadas en Studio.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-marketing-studio` (`packages/domain/src/{provenance,ai,voice}/**`, commands, rutas `/api/v1`) + manual servido en Greenhouse + sync en `efeonce-mcp`
- Future candidate home: `remain-shared`
- Boundary: procedencia y validadores en `packages/domain`; consumers: tools MCP (agentes), UI de TASK-1912, futura IA en producto
- Server/browser split: dominio y validadores en servidor; ningún SDK de modelo en Studio en esta task
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `studio.provenance_record`, `provenance_event`, `content_brief`, `qa_report`, `performance_readout`, `voice_rule_set` (nuevas)
- Consumidores afectados: agentes vía MCP, UI de TASK-1912, commands de TASK-1894/1907/1908
- Runtime target: Studio staging/production; gateway

### Contract surface

- Contrato existente a respetar: forma común de command; `riskTier`; copy literal; digest de `T2`
- Contrato nuevo o modificado: `provenance` como entrada estándar de commands con `acceptsGeneratedContent: true` en el registro; operaciones de Detailed Spec
- Backward compatibility: `compatible` (campo opcional para la web; obligatorio sólo para escrituras con texto que llegan por MCP)
- Full API parity: aceptar, rechazar, validar y leer procedencia tienen command/reader, ruta y tool

### Data model and invariants

- Entidades/tablas/views afectadas: nuevas de Detailed Spec §«Modelo»; `copy_variant`, tablas del plan y del bloque SEO/AEO ganan `provenance_id NULL`
- Invariantes que no se pueden romper:
  - `provenance_record` inmutable (trigger); eventos append-only
  - escritura por MCP con texto sin `provenance` ⇒ `422 provenance_required`
  - aprobar (`T2`) contenido `ai_agent` no aceptado ⇒ `422 ai_draft_not_accepted`
  - aceptar exige actor persona; un `api_client` nunca acepta
  - una IA nunca edita en su lugar un copy aceptado (`409 accepted_copy_requires_new_variant`)
  - el uso reportado por el cliente nunca se suma como costo real de Studio
- Write-target allowlist: N/A (Studio)
- Tenant/space boundary: por `campaign.organization_id`; reglas de voz por `organization_id`
- Idempotency/concurrency: `Idempotency-Key` en toda escritura; `If-Match` en borradores existentes
- Audit/outbox/history: `audit_event` por command; `provenance_event` por aceptación/edición/rechazo

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `STUDIO_AI_DRAFTS_ENABLED=false`; con OFF las escrituras por MCP aceptan `provenance` opcional (compatibilidad) y las tools nuevas responden `disabled`
- Backfill plan: ninguno (lo existente queda con `provenance_id NULL` = origen no registrado, nunca «humano» inferido)
- Rollback path: flag OFF; revert PR
- External coordination: dispatch del gateway

### Security and access

- Auth/access gate: lecturas `.campaign.read`; borradores `.campaign.write` / `studio:write`; aceptar/rechazar `.campaign.write` con `requiresPerson`; reglas de voz `.catalog.manage` (publicar es `T2` con `dryRun` → digest → confirmación de una persona)
- Sensitive data posture: el contexto no incluye PII ni datos competitivos (`internal_competitive` filtrado por el reader de TASK-1908 según actor)
- Error contract: `provenance_required`, `provenance_invalid`, `ai_draft_not_accepted`, `accepted_copy_requires_new_variant`, `ai_draft_quota_exceeded` (429)
- Abuse/rate-limit posture: cuotas `STUDIO_AI_DRAFT_DAILY_LIMIT_PER_PERSON` (default 200 escrituras `ai_agent` por persona y día) y 50 borradores abiertos por campaña

### Runtime evidence

- Local checks: tests de procedencia (inmutable, obligatoria por MCP), aceptación por persona, bloqueo de aprobación, validadores con fixtures, digest del contexto estable
- DB/runtime checks: migración y triggers verificados
- Integration checks: sesión MCP real de punta a punta sobre `CMP-900` en staging (contexto → borrador de plan → copy validado → variante → QA → aceptación → aprobación con digest)
- Reliability signals/logs: frescura `ai_drafts_pending_acceptance` (borradores de IA sin aceptar > 14 días) en health profundo; `logEvent` de cuota excedida
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (Studio: N/A declarado.)
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] Procedencia, validadores y contexto en `packages/domain`.
- [ ] Entidades de borrador como recursos con commands.
- [ ] `riskTier` en todas las operaciones; la única `T2` nueva es `publishVoiceRules` (decisión del operador 2026-09-26); aprobar sigue en las dueñas.
- [ ] Sin capability nueva (usa `.campaign.read`, `.campaign.write`, `.catalog.manage`).
- [ ] Camino programático: `/api/v1` + tools federadas.
- [ ] Un primitive, muchos consumers: agentes hoy, IA en producto después, sobre los mismos commands.
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

### Slice 1 — Modelo de procedencia y enganche en el kernel

- Migración `<ts>_ai-provenance.sql`: `provenance_record`, `provenance_event`, `provenance_id NULL` en `copy_variant`,
  `strategy_plan_version` (por bloque, vía tabla puente `plan_block_provenance`), `plan_content_item`, `plan_seo_target`;
  triggers de inmutabilidad; bloque `DO`.
- Registro: flag `acceptsGeneratedContent: true` en las operaciones con texto libre (copy, bloques del plan, ítems de
  contenido, bloque SEO/AEO, entidades de esta task). El kernel exige `provenance` cuando `via = mcp` y la operación lo
  acepta; con `origin = ai_agent` valida campos obligatorios; persiste el registro en la misma transacción.

### Slice 2 — Aceptación y guardas

- Commands `acceptAiDraft` y `rejectAiDraft` (`T1`, `requiresPerson`, por entidad y revisión): registran evento con
  persona y fecha; editar después de aceptar agrega evento `edited_after_acceptance`.
- Guardas en los commands `T2` dueños (aprobar plan, brief, versión, aprobar reportes): contenido `ai_agent` sin
  aceptación ⇒ `422 ai_draft_not_accepted` (hook del kernel, sin tocar la lógica de cada aprobación).
- Guarda de copy: una escritura con `origin = ai_agent` sobre un copy aceptado ⇒ `409 accepted_copy_requires_new_variant`.

### Slice 3 — Contexto por campaña

- Reader `getCampaignAgentContext(actor, campaignId)`: campaña, brief, plan (aprobado y borrador), referencias del modelo
  de cliente resueltas, límites de canal de los canales en juego, reglas de voz vigentes, objetivos y últimos snapshots
  SEO/AEO (filtrados por clasificación), aprendizajes `validated` con su evidencia; cada sección con `status`
  (`ok | not_available | disabled`), tope de tamaño y `contextDigest` (sha256 del JSON canónico) + `contextVersion`.
  Las fuentes de la procedencia citan el digest.

### Slice 4 — Validadores deterministas

- `validateCopy` (T0, `POST` sin escritura): por campo, límites duros/recomendados del catálogo (TASK-1905) y reglas de
  voz (registro tuteo/usted, voseo prohibido, términos vetados y obligatorios, política de emoji); devuelve hallazgos,
  nunca reescribe.
- `checkCreative` (T0): versión de pieza contra formatos del canal (proporción, duración, tamaño, tipo) y derechos
  (licencia, ventana, territorios, canales); la revisión de marca y AXIS la hace el agente y la registra como QA.

### Slice 5 — Reglas de voz versionadas

- `voice_rule_set` por organización con versiones (`draft|published|superseded`), commands `upsertVoiceRulesDraft`
  (`T1`, capability restringida `.catalog.manage`) y `publishVoiceRules` (`T2`: `dryRun` → digest → confirmación de una
  persona sin `act`, misma capability; decisión del operador 2026-09-26). A diferencia de la publicación del catálogo
  de canales, que sigue `T1` restringida en TASK-1905.
- Semilla Efeonce desde `docs/context/05_voz-tono-estilo.md` (revisada por una persona antes del `--apply`).

### Slice 6 — Entidades de borrador: brief de contenido, QA e informe semanal

- `content_brief` (ligado a un ítem del plan y objetivos SEO/AEO: intención, audiencia, esquema de secciones, preguntas a
  responder, entidades, enlaces internos, sugerencias de datos estructurados y libro de afirmaciones con fuente).
- `qa_report` (sobre versión de pieza o copy: checks con `pass|warn|fail`, detalle y evidencia; un `fail` crea ítem de
  atención).
- `performance_readout` (campaña o programa + periodo: qué pasó con métricas citadas por fuente y `dataThrough`, contra
  metas del plan aprobado, estado de hipótesis, próximos pasos y decisiones pedidas).
- Commands `upsert*` (`T1`), readers `list*`/`get*` (T0); todas con `provenance`.

### Slice 7 — Exposición, manual servido y skill

- Rutas, registro con `riskTier` y `acceptsGeneratedContent`, descripciones con `mcp-craft` (cuándo usar, qué NO
  significa, qué hacer después: «pide aceptación a la persona»), manifiesto, gateway sync + bump minor.
- Manual servido `docs/mcp/skills/marketing-studio/SKILL.md` §«Redactar con IA»: flujo de punta a punta, obligación de
  procedencia, cuándo pedir aceptación, qué nunca hacer (aprobar, publicar, gastar).
- Skill `efeonce-campaign-planning`: pasa a escribir en Studio con estas tools (coordinar con su autor; espejo `.codex`).

## Out of Scope

- IA dentro del producto (botones «generar» en la UI, puerto único de proveedor, evaluación, techo de costo por
  organización): follow-up explícito.
- Generación de imágenes o video (Globe y las skills creativas; Studio sólo registra versiones por `createAssetVersion`).
- Compartir o enviar el informe semanal a un cliente (publicación: requiere su propia decisión y `T2`).
- Nexa como cliente propio (usa el gateway MCP; ver Open Questions).

## Detailed Spec

### Modelo

| Tabla | Columnas clave |
|---|---|
| `provenance_record` | `provenance_id PK`, `entity_type`, `entity_id`, `entity_revision`, `origin ai_agent\|human_dictated\|import\|system`, `provider NULL`, `model NULL`, `agent_client NULL` (`claude_code`, `codex`, `claude_ai`, `chatgpt`, `nexa`, `other`), `instruction_ref NULL` (skill@versión o hash), `sources jsonb` (`[{kind, id, version}]`, incluye `contextDigest`), `reported_usage jsonb NULL`, `generated_at`, `person_actor`, `via` |
| `provenance_event` | `event_id PK`, `provenance_id`, `kind accepted\|rejected\|edited_after_acceptance`, `person_actor`, `note NULL`, `at` |
| `voice_rule_set` | `(organization_id, version_no) PK`, `status`, `register tuteo\|usted`, `forbid_voseo bool`, `banned_terms text[]`, `required_terms text[]`, `emoji_policy`, `source_ref`, `published_by`, `published_at` |
| `content_brief` | `brief_id PK`, `campaign_id`, `content_item_id NULL`, `seo_target_ids text[]`, `body jsonb`, `status draft\|accepted\|rejected`, `provenance_id`, `revision` |
| `qa_report` | `report_id PK`, `campaign_id`, `subject_type asset_version\|copy`, `subject_ref`, `checks jsonb`, `status`, `provenance_id`, `revision` |
| `performance_readout` | `readout_id PK`, `campaign_id NULL`, `program_id NULL`, `period_start`, `period_end`, `body jsonb`, `status`, `provenance_id`, `revision` |

### Operaciones y tools

| operationId | Método y ruta | Tool | Nivel |
|---|---|---|---|
| `getCampaignAgentContext` | `GET /api/v1/campaigns/{campaignId}/agent-context` | `studio.campaign.agent_context.get` | T0 |
| `validateCopy` | `POST /api/v1/validate/copy` | `studio.copy.validate` | T0 |
| `checkCreative` | `POST /api/v1/validate/creative` | `studio.creative.check` | T0 |
| `getProvenance` | `GET /api/v1/provenance?entityType=&entityId=` | `studio.provenance.get` | T0 |
| `acceptAiDraft` · `rejectAiDraft` | `POST /api/v1/ai-drafts/{entityType}/{entityId}/accept` · `…/reject` | `studio.ai_draft.accept` · `studio.ai_draft.reject` | T1 (persona) |
| `getVoiceRules` | `GET /api/v1/voice-rules?organizationId=` | `studio.voice_rules.get` | T0 |
| `upsertVoiceRulesDraft` | `PUT /api/v1/voice-rules/drafts/{versionNo}` | `studio.voice_rules.draft.upsert` | T1 (restringida) |
| `publishVoiceRules` | `POST /api/v1/voice-rules/drafts/{versionNo}/publish` | `studio.voice_rules.publish` | T2 (`dryRun` → digest → confirmación de persona) |
| `listContentBriefs` · `getContentBrief` · `upsertContentBrief` | `GET/GET/PUT /api/v1/campaigns/{campaignId}/content-briefs[/{briefId}]` | `studio.content_briefs.list` · `studio.content_brief.get` · `studio.content_brief.upsert` | T0 · T0 · T1 |
| `listQaReports` · `createQaReport` | `GET/POST /api/v1/campaigns/{campaignId}/qa-reports` | `studio.qa_reports.list` · `studio.qa_report.create` | T0 · T1 |
| `listReadouts` · `getReadout` · `upsertReadout` | `GET/GET/PUT /api/v1/readouts[/{readoutId}]` | `studio.readouts.list` · `studio.readout.get` · `studio.readout.upsert` | T0 · T0 · T1 |

Capabilities: T0 `.campaign.read` / `studio:read`; T1 `.campaign.write` / `studio:write`; reglas de voz
`.catalog.manage`; aceptar/rechazar con `requiresPerson` (un `api_client` recibe `forbidden`).

### Ejecución de punta a punta por un agente (lo que el manual servido enseña)

1. `studio.campaign.agent_context.get` → leer y citar `contextDigest`.
2. Borrador de plan con las tools de TASK-1907 y `provenance` (`origin = ai_agent`).
3. Copys por canal: `studio.copy.validate` → `studio.copy.create` (variante nueva) con `provenance`.
4. Piezas: `studio.creative.check` + revisión de marca/AXIS del agente → `studio.qa_report.create`.
5. Mostrar a la persona lo redactado; con su «sí», `studio.ai_draft.accept`.
6. Aprobar sólo por las tools `T2` dueñas: `dryRun` → digest → confirmación explícita de la persona.
7. Semanalmente: `studio.readout.upsert` con métricas citadas y «sin dato» donde falte.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1905, TASK-1907 y TASK-1899 en producción → Slice 1 → Slice 2 → Slices 3, 4, 5 (paralelos) → Slice 6 → Slice 7.
- `STUDIO_AI_DRAFTS_ENABLED` se prende en staging tras la sesión de punta a punta; en production tras un release.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un agente declara `human_dictated` para saltarse la procedencia | gobernanza de IA | medium | descripción de la tool, manual servido y auditoría por persona; `via = mcp` siempre queda registrado | revisión de `provenance_record` por persona |
| Contexto demasiado grande para el agente | agentes | medium | topes por sección y `not_available` explícito | tamaño en `logEvent` |
| Cifras inventadas en informes | calidad | medium | métricas sólo citadas por fuente y `dataThrough`; «sin dato» obligatorio | QA de readout |
| Fatiga de aceptaciones | operación | low | aceptar es `T1` sin digest | borradores pendientes (frescura) |

### Feature flags / cutover

- `STUDIO_AI_DRAFTS_ENABLED` (Vercel de Studio; default `false`); fila en el ledger.
- `STUDIO_AI_DRAFT_DAILY_LIMIT_PER_PERSON` (default 200) documentado en el runbook.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slices 1–6 | flag OFF (procedencia vuelve a opcional); revert PR; tablas quedan | < 15 min | sí |
| Slice 7 | revert del sync del gateway + dispatch | < 30 min | sí |

### Production verification sequence

1. Migración y triggers en staging.
2. Sesión MCP real de punta a punta sobre `CMP-900` (pasos 1–6 del flujo); intentar aprobar sin aceptar ⇒ `422`.
3. Escritura por MCP sin `provenance` ⇒ `422 provenance_required`; `api_client` aceptando ⇒ `forbidden`.
4. Production con flag OFF → ON tras un release; repetir pasos 1–3 con una campaña real con permiso del operador.

### Out-of-band coordination required

- Operador revisa la semilla de reglas de voz de Efeonce.
- Autor de la skill `efeonce-campaign-planning` incorpora las tools reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Toda escritura por MCP con texto sin `provenance` responde `422 provenance_required` (con el flag ON).
- [ ] `provenance_record` no se puede modificar; los eventos son append-only.
- [ ] Aceptar exige persona; aprobar contenido de IA no aceptado responde `422 ai_draft_not_accepted`.
- [ ] Una propuesta de IA sobre un copy aceptado crea variante nueva; editar en su lugar responde `409`.
- [ ] El contexto por campaña devuelve `contextDigest` estable y secciones `not_available` cuando falta la fuente.
- [ ] `studio.copy.validate` y `studio.creative.check` no escriben y reportan límites, voz, formato y derechos.
- [ ] Reglas de voz de Efeonce publicadas en production desde la guía documental, por `studio.voice_rules.publish` como `T2` confirmado por una persona.
- [ ] Publicar reglas de voz sin digest responde `confirmation_required`; con token con `act` responde `403 confirmation_requires_direct_person`.
- [ ] Brief de contenido, QA e informe semanal existen con borrador y aceptación, por API y MCP.
- [ ] Sesión MCP real de punta a punta verde en staging y production.
- [ ] Manual servido y skill de planificación usan las tools reales; leak test verde.

## Verification

- Studio: `pnpm check` + `pnpm build`.
- Greenhouse: `pnpm mcp:skills:generate` + `pnpm mcp:skills:check`, `pnpm skills:mirrors`.
- Gateway: tests + `pnpm surface:baseline`.

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

- IA dentro del producto sobre los mismos commands: puerto único de proveedor de modelo en Studio, línea base de evaluación por tarea (ADR §11.6), costo por organización con techo gobernado. Se crea como task nueva de EPIC-049 cuando el uso por agentes muestre qué tareas valen.
- Compartir el informe semanal (publicación `T2`).

## Delta 2026-09-26

- ADR de operación híbrida con agentes aceptado: el trabajo de los agentes se organiza en work items (TASK-1913) y sus
  entregables son los borradores con procedencia de esta task; la corrida (rol, runtime, modelo, costo) la completa el
  ledger de TASK-1915. Del follow-up «IA dentro del producto», el puerto de proveedor, el techo de costo por
  organización y la evaluación por tarea quedan cubiertos para agentes por TASK-1915 (puerto y reserva) y TASK-1916
  (evals y costo normalizado); la IA con botones en la UI sigue como follow-up y debe reutilizarlos, no duplicarlos.

## Open Questions

- ¿Nexa opera Studio por el gateway MCP o por un canal propio? (ADR §11.5). Por defecto por el gateway, con las mismas tools y niveles.
- ¿El límite diario de escrituras de IA por persona (200) es el correcto? Ajustable por env sin deploy de código.
