# TASK-1667 — Growth SEO: SEO Editorial Work Item y handoff gobernado a Content Factory

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-08-14 — TASK-1664 complete: dependencia desbloqueada

- El primitive de discovery existe y está verificado live: `queueKeywordDiscovery` /
  `readKeywordDiscovery` / `recordKeywordDiscoveryAction` (`src/lib/growth/seo/keyword-discovery/`),
  runner async en ops-worker, lanes app/ecosystem y MCP tools (`get_seo_keyword_discovery`,
  `discover_seo_keywords`). Candidatos guardan SOLO procedencia; la métrica vive en el store de
  TASK-1661 (writer compartido `persistKeywordMarketData`). Rollout runtime pendiente (flag OFF,
  scheduler pausado) — no bloquea el trabajo de código de esta task.

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
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|content|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el objeto operativo que falta entre una decisión SEO y la producción editorial: el
**SEO Editorial Work Item**. Recibe una decisión humana sobre un candidate u oportunidad, conserva la
evidencia y provenance de SEO/AEO, produce un `ContentFactoryBrief` válido y entrega el trabajo al
Content Factory canónico para preparar un borrador privado. No publica, no activa un prompt AEO y no
convierte una sugerencia en tracking recurrente.

## Why This Task Exists

EPIC-022 ya puede medir oportunidades existentes (`TASK-1308`) y, una vez completado `TASK-1664`, podrá
descubrir candidates desde seeds. `TASK-1666` podrá preparar un draft de grounded query AEO. Ninguna de
esas capacidades responde todavía a la pregunta operativa: **qué pieza editorial se debe crear o
optimizar, con qué brief, para qué superficie, con qué evidencia y cómo se entrega al flujo de
contenido existente**.

Hoy `ContentFactoryBrief` existe como contrato editorial general en
`src/lib/public-site/content-factory/contracts.ts`, pero no conserva la identidad de la intervención
SEO que lo originó. Si se conecta directamente desde una pantalla o desde un agente, se pierde la
relación entre keyword, target, candidate, página, intención, grounded query, CTA, autoría y resultado.
También se corre el riesgo de escribir directamente en WordPress o de tratar un draft generado como
publicación.

Esta task crea la costura de producto, no duplica Content Factory. La frontera debe permitir que SEO
decida y contextualice, que Content Factory produzca un draft privado con sus propios contratos, y que
una persona apruebe cualquier siguiente paso.

## Goal

- Un candidate elegido o una oportunidad GSC declarada puede convertirse, mediante una acción humana
  idempotente, en un work item SEO editorial con snapshot de contexto y evidencia.
- El work item puede producir un `ContentFactoryBrief` V1 para `create`, `refresh` o `fix`, sin
  ampliar silenciosamente el contrato general ni inventar campos que Content Factory no comprende.
- El handoff usa el adapter/command canónico de Content Factory y termina en un artefacto `draft` o
  `private`; nunca publica ni modifica una fuente pública directamente.
- La misma capability se expone como command/reader para app, Nexa, lane ecosystem y MCP, con
  tenant-boundary, capability fina, idempotencia, auditoría y errores canónicos.
- `TASK-1665`, `TASK-1668` y `TASK-1669` pueden consumir un identificador estable del work item sin
  leer tablas ni parsear payloads del proveedor.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1, §4, §7, §9, §10, §13, §17)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **Un solo aggregate SEO editorial.** La relación candidate → work item → brief → draft privado vive
  en un primitive server-side. La UI, Nexa y MCP nunca reconstruyen el vínculo desde sus propios
  payloads.
- **SEO y AEO mantienen fronteras duras.** Las referencias a grounded queries son opacas
  (`seo.grounded_query_draft:<id>` y `seo.discovery.context:<hash>`); no se crea FK ni JOIN SQL hacia
  `grader_prompt_sets`, `grader_runs` o tablas de citabilidad.
- **Content Factory sigue siendo el dueño de la producción editorial.** SEO entrega un brief tipado y
  contexto; no genera Gutenberg/Elementor en el módulo SEO, no escribe WordPress y no duplica sus
  validadores, planners o capability registry.
- **Draft/private antes de cualquier publicación.** Una fuente pública nunca se parchea desde esta
  task. Todo refresh se prepara sobre un clone o estado `draft/private`, de acuerdo con el runbook de
  Content Factory.
- **Full API Parity por capability.** Todo write es command gobernado, con capability, idempotencia,
  auditoría y soporte `propose → confirm → execute`; el agente no obtiene un bypass por ser agente.
- **Evidencia medida y estimada separada.** GSC conserva `●`; DataForSEO Labs conserva `◑`; la task no
  promedia señales ni convierte una estimación de mercado en un outcome.
- **No auto-track.** Crear un work item nunca inserta ni modifica `seo_keyword_set_members`. El
  seguimiento recurrente continúa siendo una acción explícita de `trackKeywords`.
- **No auto-publish.** El estado de work item no puede avanzar a `published` por una respuesta de
  Content Factory. La publicación humana, el QA live y el outcome pertenecen al control plane de
  `TASK-1668`.
- **No persistir secretos ni payloads crudos.** Se guardan hashes, referencias y campos estructurados
  necesarios para auditar; no respuestas completas de DataForSEO, prompts, cookies, HMAC o HTML bruto.

## Normative Docs

- `docs/tasks/to-do/TASK-1664-growth-seo-keyword-discovery-seed-expansion.md`
- `docs/tasks/to-do/TASK-1665-growth-seo-keyword-discovery-workbench.md`
- `docs/tasks/to-do/TASK-1666-growth-seo-grounded-query-bridge.md`
- `docs/tasks/to-do/TASK-1659-growth-seo-keyword-target-intent-model.md`
- `docs/tasks/to-do/TASK-1660-growth-seo-keyword-targets-surface.md`
- `src/lib/public-site/content-factory/contracts.ts`
- `src/lib/public-site/content-factory/gutenberg-planner.ts`
- `src/lib/public-site/content-factory/gutenberg-validator.ts`
- `src/lib/public-site/content-factory/refresh-plan.ts`
- `src/lib/public-site/content-factory/patch-plan.ts`
- `src/lib/public-site/content-factory/draft-smoke-plan.ts`
- `docs/operations/public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`
- `docs/operations/public-site-route-ownership-matrix-20260616.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `TASK-1664` — reader y acciones append-only de discovery; es la fuente de candidates, seeds,
  mercado, procedencia y decisión posterior.
- `TASK-1659`/`TASK-1660` — intención declarada y contexto de target cuando la acción sea `objective`
  o `opportunity`. Si esos contratos aún no están disponibles, el command debe exigir los campos
  explícitos equivalentes y no inferirlos.
- `TASK-1666` — integración opcional para adjuntar un draft de grounded query; el work item base
  `create|refresh|fix` no queda bloqueado por una grounded query ausente.
- `src/lib/public-site/content-factory/contracts.ts` — contrato V1 existente, especialmente
  `ContentFactoryBrief`, `ContentFactoryGeneratedDraft` y `ContentFactoryValidation`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — commands/readers y consumers
  canónicos.

### Blocks / Impacts

- `TASK-1668` — QA, publicación humana, outcome y siguiente iteración.
- `TASK-1669` — plan diario de agentes; el agente puede leer work items y recomendar acciones.
- `TASK-1665` — el workbench podrá ofrecer `Crear trabajo editorial` y mostrar estado sin implementar
  otro handoff.
- `TASK-1310` — report cliente; sólo consume work items o resultados explícitamente autorizados, nunca
  candidatos sin decisión.
- Content Factory — recibe una envolvente SEO y un brief V1, pero conserva su propio source of truth,
  validators, lanes y permisos.

### Files owned

- `migrations/[timestamp]_task-1667-seo-editorial-work-items.sql`
- `src/lib/growth/seo/editorial/contracts.ts`
- `src/lib/growth/seo/editorial/command.ts`
- `src/lib/growth/seo/editorial/reader.ts`
- `src/lib/growth/seo/editorial/events.ts`
- `src/lib/growth/seo/editorial/content-factory-adapter.ts`
- `src/lib/growth/seo/editorial/__tests__/contracts.test.ts`
- `src/lib/growth/seo/editorial/__tests__/command.test.ts`
- `src/lib/growth/seo/editorial/__tests__/reader.test.ts`
- `src/lib/growth/seo/editorial/__tests__/content-factory-adapter.test.ts`
- `src/app/api/admin/growth/seo/editorial/route.ts`
- `src/app/api/platform/ecosystem/growth/seo/editorial/route.ts`
- `src/mcp/greenhouse/seo/editorial.ts`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/seo-editorial-work-items.md`

## Current Repo State

### Already exists

- `TASK-1664` define runs/candidates/actions append-only y el reader `readKeywordDiscovery` como
  contrato futuro para el workbench y otros consumers.
- `TASK-1666` define el bridge SEO → AEO como draft aislado, con referencias opacas y sin activar el
  grader.
- `ContentFactoryBrief` soporta `intent: create|refresh|fix`, lanes Gutenberg/Elementor, objective,
  audience, target, offer, service, campaign, keywords, tone, locale y CTA.
- Content Factory ya contiene planners, validators, inspección profunda, refresh/patch plans y un
  `draft-smoke-plan` orientado a draft/private.
- El runbook de Content Factory ya documenta inspección, approval packet, write gobernado, readback,
  rollback y la prohibición de mutar directamente una fuente publicada.
- El módulo SEO ya tiene entitlement, readers GSC/rank y commands de tracking que pueden ser citados
  como evidencia o acción separada.

### Gap

- No existe una entidad durable que explique qué trabajo editorial nació de qué candidate, target o
  oportunidad.
- El `ContentFactoryBrief` actual no recibe provenance SEO/AEO, hash de evidencia, decisión del
  operador ni criterio de éxito sin que otro sistema lo guarde por separado.
- No existe command idempotente para crear un brief desde una decisión SEO ni adapter que entregue el
  trabajo a Content Factory sin llamar WordPress desde SEO.
- No existe un estado único para distinguir `brief_ready`, `draft_requested`, `draft_private`, fallo
  de handoff y cancelación.
- No existe reader/route/MCP/Nexa contract para consultar el lifecycle por organización y target.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/` para command/reader y `src/lib/public-site/content-factory/`
  para el adapter que consume contratos editoriales; cualquier ejecución asíncrona vive en el worker
  existente, no en un nuevo servicio.
- Future candidate home: `domain-package`
- Boundary: `createSeoEditorialWorkItem`, `readSeoEditorialWorkItems`,
  `requestSeoEditorialDraft` y el adapter tipado a Content Factory son la API canónica. El aggregate
  SEO editorial no expone tablas ni deja que Content Factory lea `seo_keyword_discovery_*`.
- Server/browser split: org/target resolution, candidates, evidence refs, capability, brief snapshot,
  provider metadata y WordPress refs son server-only. El browser recibe DTOs redactados del reader.
- Build impact: `none`; reutiliza clientes, validators y runtime existentes. No se agrega SDK de IA,
  DataForSEO ni WordPress al bundle del browser.
- Extraction blocker: transacción command + outbox, capability/entitlement y boundary de Content
  Factory/WordPress; cualquier extracción debe conservar `organization_id` y referencias opacas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_editorial_work_items` y su log append-only de
  eventos; Content Factory sigue siendo SoT de sus propios briefs/drafts y WordPress de la entidad
  editorial externa.
- Consumidores afectados: `UI`, `Nexa`, `MCP`, `ecosystem`, `ops-worker`, `Content Factory`.
- Runtime target: `Vercel` para commands/readers, `ops-worker` o outbox worker para handoff asíncrono,
  `staging` antes de cualquier ventana de draft privado y `production` con flag OFF.

## ADR Gate

Antes de implementar el primer slice, registrar o vincular en
`docs/architecture/DECISIONS_INDEX.md` una decisión que resuelva, como mínimo:

- dueño del aggregate `SEO Editorial Work Item` frente a SEO y Content Factory;
- uso de `SeoEditorialBriefEnvelopeV1` sin modificar silenciosamente `ContentFactoryBrief.v1`;
- refs opacas y ausencia de FK/JOIN SEO↔AEO/WordPress;
- idempotencia/reconciliación ante timeout o estado externo incierto;
- capabilities `growth.seo.editorial.read/manage`, grants y actor humano confirmado;
- política `draft/private only`, flag y rollback.

La task no debe inventar un número ADR. Si existe una decisión aplicable, el implementador debe citarla;
si no existe, debe proponerla antes de tocar schema, access o integración externa.

### Contract surface

- Contrato existente a respetar:
  - `readKeywordDiscovery` y `recordKeywordDiscoveryAction` de `TASK-1664`.
  - `createGroundedQueryDraft` de `TASK-1666`, sólo como referencia opcional.
  - `ContentFactoryBrief`, `ContentFactoryGeneratedDraft` y `ContentFactoryValidation` en
    `src/lib/public-site/content-factory/contracts.ts`.
  - planners/validators de `src/lib/public-site/content-factory/`.
- Contrato nuevo:
  - `createSeoEditorialWorkItem(input)` → `{ ok: true, workItemId, status: 'brief_ready', briefRef, sourceRefs }`.
  - `readSeoEditorialWorkItems(input)` → DTO paginado por `organizationId`, `seoTargetId`, estado,
    keyword, URL y cursor; devuelve `asOf`, refs y motivos, nunca payload crudo.
  - `requestSeoEditorialDraft(input)` → `{ ok: true, workItemId, status: 'draft_requested', handoffId }`;
    es idempotente y sólo encola/ejecuta el adapter de Content Factory.
  - `recordSeoEditorialHandoff(input)` → evento interno con resultado sanitizado del adapter; no es
    un endpoint que el browser pueda falsificar.
  - `readSeoEditorialWorkItem(workItemId)` → detalle completo autorizado para drawer, Nexa y MCP.
- Backward compatibility: `gated`; no cambia los contracts de GSC, tracking, Content Factory ni AEO.
- Full API parity: los routes app/ecosystem, Nexa y MCP llaman estos mismos primitives. Un agente
  sólo puede proponer la acción; ejecutar requiere confirmation card/command idempotente con capability.

### Data model and invariants

#### `greenhouse_growth.seo_editorial_work_items`

Una fila representa una intervención editorial, no una keyword y no un draft de WordPress. Campos
mínimos:

| Campo | Tipo | Regla |
|---|---|---|
| `work_item_id` | `uuid` | PK estable; se usa en todos los readers y refs externas |
| `organization_id` | `uuid` | tenant obligatorio; nunca se acepta como autoridad desde query string |
| `seo_target_id` | `uuid` | target validado contra la organización; nullable sólo si el contrato de discovery permite un targetless brief explícito |
| `status` | `text` | `brief_ready → draft_requested → draft_private`; errores/cancelación son estados terminales gobernados |
| `work_kind` | `text` | enum `create|refresh|fix`; `consolidate` requiere otra task y no se convierte silenciosamente |
| `decision_kind` | `text` | enum `objective|opportunity|discovery_candidate|technical_fix|manual` |
| `source_refs_json` | `jsonb` | refs opacas a run/candidate/GSC opportunity/grounded draft; nunca payload crudo |
| `source_context_hash` | `text` | SHA-256 de la evidencia normalizada que originó la decisión |
| `primary_keyword` | `text` | snapshot normalizado, máximo contractual del dominio |
| `secondary_keywords_json` | `jsonb` | lista bounded; conserva fuente por término |
| `intent_snapshot_json` | `jsonb` | intención declarada o estimada, actor, as-of y fuente; no se sobreescribe |
| `target_snapshot_json` | `jsonb` | audiencia, mercado, idioma, URL/canonical owner y superficie al momento de decidir |
| `brief_payload_json` | `jsonb` | `ContentFactoryBrief.v1` validado; no contiene secretos ni HTML generado crudo |
| `brief_hash` | `text` | hash canónico del brief enviado |
| `content_factory_ref_json` | `jsonb` | refs opacas a brief/spec/draft/inspection; puede estar vacío antes del handoff |
| `created_by` | `text` | actor humano o actor de sistema auditado; un agente siempre conserva usuario confirmador |
| `idempotency_key` | `text` | unique por organización + decisión + contexto + actor |
| `created_at/updated_at` | `timestamptz` | timestamps server-side; no aceptar fecha del cliente |

La tabla no contiene `published_url` como autoridad final: una URL publicada, QA y outcome llegan por
`TASK-1668` con evidencia propia. Puede conservar una referencia de objetivo/canonical para preparar el
brief, pero debe marcarla como snapshot y no como verdad live.

#### `greenhouse_growth.seo_editorial_work_item_events`

Log append-only con `event_id`, `work_item_id`, `organization_id`, `event_type`, `from_status`,
`to_status`, `actor`, `idempotency_key`, `payload_json` redactado, `evidence_refs_json`, `created_at` y
`correlation_id`. Los eventos permitidos V1 son:

- `work_item_created`;
- `brief_validated`;
- `draft_requested`;
- `content_factory_handoff_succeeded`;
- `content_factory_handoff_failed`;
- `draft_private_recorded`;
- `blocked`;
- `cancelled`.

El evento es la historia; el estado de la fila es una proyección operativa. No se puede borrar ni
editar un hecho histórico. Un retry agrega un evento idempotente o devuelve el resultado existente.

### Exact handoff contract V1

El aggregate construye una envolvente que separa el brief existente de la provenance SEO:

```ts
type SeoEditorialBriefEnvelopeV1 = {
  contractVersion: 'seoEditorialBriefEnvelope.v1'
  workItemId: string
  organizationId: string
  sourceRefs: string[]
  sourceContextHash: string
  evidence: Array<{
    ref: string
    kind: 'gsc' | 'labs' | 'rank' | 'page' | 'grounded_query_draft' | 'manual'
    asOf: string
    signal: 'measured' | 'estimated' | 'declared' | 'derived'
  }>
  brief: ContentFactoryBrief
}
```

Reglas de construcción:

1. `brief.intent` sólo puede ser `create`, `refresh` o `fix`; un candidate descartado o de
   consolidación no puede crear un brief por accidente.
2. `primaryKeyword`, `secondaryKeywords`, `audience`, `objective`, `offer`, `serviceKey`, `locale`,
   `tone` y `cta` deben estar completos o el command devuelve `seo_editorial_brief_incomplete` con
   los paths faltantes.
3. Un refresh/fix requiere `target.url` o `target.wordpressPostId` y una inspección/owner confiable;
   si sólo existe una keyword sin página dueña, el command debe pedir `create` explícito.
4. El brief no agrega grounded query como si fuera keyword primaria. El draft AEO se adjunta en
   `sourceRefs` y en instrucciones estructuradas para Content Factory, nunca como autoridad editorial.
5. El envelope se valida antes de persistir y antes de llamar al adapter. El adapter rechaza versiones
   desconocidas, lanes incompatibles y targets que apunten a una fuente publicada sin clone/private.
6. El adapter devuelve referencias, estado, fingerprints y errores canónicos; nunca propaga raw error,
   HMAC, URL firmada o respuesta HTML al browser.

### State machine and commands

| Estado | Entrada válida | Siguiente estado | Actor permitido |
|---|---|---|---|
| `brief_ready` | decisión explícita + brief válido | `draft_requested`, `cancelled` | humano confirmado; agente sólo propone |
| `draft_requested` | outbox/handoff idempotente | `draft_private`, `blocked` | worker/adapter |
| `draft_private` | Content Factory devuelve ref de draft/private y fingerprint | `TASK-1668: qa_pending` | worker, no browser directo |
| `blocked` | error recuperable o guard de seguridad | retry gobernado o `cancelled` | worker + operador |
| `cancelled` | cancelación con razón | terminal | capability editorial manage |

No existe transición V1 a `published`, `active`, `indexed`, `tracked` o `graded`.

### Security, tenancy and errors

- Capability de lectura propuesta: `growth.seo.editorial.read`.
- Capability de escritura propuesta: `growth.seo.editorial.manage`.
- El grant debe registrarse y probarse en el mismo cambio que la capability; no se gatea por rol
  genérico ni por la existencia de una sesión admin.
- `organizationId` se deriva del session/space binding server-side. Un work item de otra org devuelve
  `not_found`, no `forbidden` con detalles que permitan un oracle.
- Errores cerrados mínimos: `seo_editorial_disabled`, `seo_editorial_not_found`,
  `seo_editorial_forbidden`, `seo_editorial_brief_incomplete`, `seo_editorial_invalid_source`,
  `seo_editorial_duplicate`, `seo_editorial_handoff_blocked`, `seo_editorial_provider_unavailable`.
- El payload de una candidate y cualquier URL/claim proveniente de provider o usuario se trata como
  dato no confiable; no puede inyectar instrucciones al adapter ni cambiar capability/lane.

## Scope

### Slice 1 — contrato, schema y procedencia

- Crear migration aditiva para work items y eventos append-only, índices por org/target/status y
  unique idempotency key.
- Definir enums/códigos de error, DTOs, envelope `seoEditorialBriefEnvelope.v1`, source refs y
  canonical hash.
- Definir la matriz de transiciones y un trigger/guard server-side que impida estados no autorizados.
- Añadir tests de tenant isolation, source hash, redacción y no mutación de hechos históricos.

### Slice 2 — command/reader y Full API Parity

- Implementar `createSeoEditorialWorkItem`, `readSeoEditorialWorkItem(s)` y
  `requestSeoEditorialDraft` en `src/lib/growth/seo/editorial/`.
- Resolver candidate/target/intent server-side mediante los readers de 1664/1659/1660; no aceptar
  joins armados por la UI.
- Exponer route app, route ecosystem, reader Nexa y tool MCP bajo la misma capability y DTO.
- Registrar audit/outbox/correlation IDs y devolver outcomes por work item, no un HTTP 200 ambiguo.

### Slice 3 — adapter Content Factory draft/private

- Crear el adapter tipado que recibe `SeoEditorialBriefEnvelopeV1` y llama planners/commands
  existentes de Content Factory, sin `fetch` directo a WordPress desde `growth/seo`.
- Encolar el handoff si la operación tarda; reclamar el trabajo con idempotency key y no repetir un
  write externo cuando el resultado ya tiene fingerprint.
- Aceptar sólo resultado `draft`/`private`; guardar `briefRef`, `specRef`, `inspectionRef`, post ID
  si existe, fingerprint y estado sanitizado.
- Si Content Factory devuelve publicación o un status inesperado, bloquear y emitir
  `seo_editorial_unsafe_external_state`; no avanzar automáticamente.

### Slice 4 — rollout, manual y cross-surface evidence

- Añadir `GROWTH_SEO_EDITORIAL_HANDOFF_ENABLED` al Feature Flag State Ledger, default `false`.
- Documentar el flujo humano candidate → work item → brief → draft privado y los límites con AEO,
  tracking, publicación y QA.
- Probar el mismo work item desde app, Nexa y MCP con la misma org y confirmar que los DTOs coinciden.
- Entregar fixtures de estados para que `TASK-1665`, 1668 y 1669 puedan integrar sin inventar
  contratos.

## Out of Scope

- Implementar el discovery de seeds, Labs, mercado o candidate actions de `TASK-1664`.
- Implementar o activar grounded queries, prompt sets, grader, citation attribution o AEO lifecycle
  de `TASK-1666` y `TASK-1311`.
- Generar contenido nuevo con un modelo dentro del módulo SEO; Content Factory conserva sus planners,
  registries, validators y políticas de IA.
- Escribir, publicar, actualizar, purgar caché o hacer rollback en WordPress/Think directamente.
- Crear el QA live, medir resultados, atribuir conversiones o decidir la siguiente iteración; eso es
  `TASK-1668`.
- Crear un agente autónomo o permitir que Nexa ejecute un write sin confirmación; eso es `TASK-1669`.
- Crear una UI nueva; el workbench de `TASK-1665` es consumer.
- Convertir `consolidate` en `refresh` sin decisión humana o inventar una URL canonical.

## Detailed Spec

### Input command V1

```ts
type CreateSeoEditorialWorkItemInput = {
  organizationId?: string // nunca autoridad; se resuelve server-side
  seoTargetId: string
  decision: 'create' | 'refresh' | 'fix'
  decisionKind: 'objective' | 'opportunity' | 'discovery_candidate' | 'technical_fix' | 'manual'
  candidateRefs?: string[]
  discoveryRunRef?: string
  groundedQueryDraftRefs?: string[]
  primaryKeyword: string
  secondaryKeywords?: string[]
  objective: string
  audience: string
  offer?: string
  serviceKey?: string
  target?: { wordpressPostId?: number; url?: string; moduleId?: string }
  locale: 'es-CL' | 'en-US' | 'pt-BR'
  tone: 'efeonce_expert' | 'educational' | 'conversion' | 'thought_leadership'
  cta: { kind: 'hubspot_form' | 'hubspot_meeting' | 'external_url' | 'greenhouse_capture'; target: string }
  idempotencyKey: string
  actor: { kind: 'human' | 'agent_confirmed' | 'system'; id: string }
}
```

Validaciones obligatorias:

1. El actor tiene `growth.seo.editorial.manage`; `agent_confirmed` debe contener una confirmation
   event válida y no puede venir sólo con un prompt.
2. `seoTargetId`, candidates y refs pertenecen a la misma organización. Las refs faltantes se
   reportan como `not_found` sin revelar si pertenecen a otra org.
3. Se normaliza keyword para comparar duplicados, pero se conserva el valor editorial aprobado en el
   snapshot. No se eliminan tildes ni se reemplaza una query por una traducción automática.
4. `refresh`/`fix` exige target URL o post ID y una evidencia de página; `create` exige que no exista
   una página dueña conocida o que el actor confirme crear una nueva.
5. `primaryKeyword` no puede ser una grounded query completa por accidente: si la selección trae
   pregunta larga, el command la marca como source context y exige keyword primaria explícita.
6. Idempotencia devuelve el work item existente si hash de input coincide. Si la key se reutiliza con
   otro hash, devuelve `seo_editorial_idempotency_conflict` y no crea nada.

### Reader DTO V1

El reader devuelve, como mínimo:

- identidad: `workItemId`, `organizationId` redactada, `seoTargetId`, `status`, `workKind`;
- decisión: `decisionKind`, actor display-safe, fecha, keyword primaria/secundarias;
- provenance: refs de run/candidate/grounded draft, `sourceContextHash`, as-of por señal;
- brief: sólo campos seguros del `ContentFactoryBrief`, `briefHash`, validación y lane;
- handoff: `handoffId`, `contentFactoryRef` redactada, status, último evento, retryable;
- próximos pasos: `canRequestDraft`, `canCancel`, `nextOwner`, `blockedReason`;
- disclosure: `● medido`, `◑ estimado`, `declarado` o `derived` por cada evidencia.

Nunca devuelve raw prompt, raw provider response, secretos, contenido HTML completo, URLs firmadas ni
errores internos.

### Observability

Emitir, sin contenido sensible:

- `seo.editorial.work_item.created`;
- `seo.editorial.handoff.queued`;
- `seo.editorial.handoff.succeeded`;
- `seo.editorial.handoff.blocked`;
- `seo.editorial.handoff.latency`;
- `seo.editorial.idempotency_replay`.

Cada señal incluye org redacted/hash, work item, correlation ID, status, lane, retryable y flag state.
No incluir keyword completa, copy, prompt ni URL privada en una métrica de alta cardinalidad.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema/contract) → Slice 2 (commands/readers/parity) → Slice 3 (adapter/outbox) → Slice 4
  (flagged staging smoke).
- El adapter de Content Factory MUST permanecer disabled hasta que Slice 1 y 2 tengan tests de
  tenant/idempotencia y el smoke de draft/private esté documentado.
- La publicación humana y el outcome de `TASK-1668` MUST NOT depender de que el handoff esté ON para
  leer work items históricos.
- `TASK-1669` puede construir el plan advisory en paralelo después de que Slice 2 exponga readers,
  pero no puede ejecutar writes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Brief con source ref de otra organización | auth/data | medium | resolver ownership server-side, anti-oracle y test cross-tenant | `seo.editorial.authorization_denied` |
| Retry crea dos drafts privados | outbox/external | medium | idempotency key + fingerprint de handoff + claim único | `seo.editorial.idempotency_replay`, duplicados por work item |
| Refresh termina mutando fuente publicada | Content Factory/WordPress | high | adapter exige clone/private y bloquea status publish | `seo.editorial.unsafe_external_state` |
| Brief incompleto llega a authoring | integration | medium | schema validation antes del adapter y error por path | `seo.editorial.brief_validation_failed` |
| AEO o keyword se convierten en hecho editorial sin disclosure | SEO/AEO | medium | source refs tipadas, `signal` explícito y no JOIN | test de envelope/provenance |
| Handoff tarda o queda atascado | worker | medium | outbox claim, retry bounded, estado blocked y signal de stuck | `seo.editorial.handoff_blocked` |
| Se habilita producción sin revisión humana | release | low | flag OFF, capability separada y gate de approval packet | flag drift / audit event |

### Feature flags / cutover

- `GROWTH_SEO_EDITORIAL_HANDOFF_ENABLED=false` por defecto en local, staging y producción al crear la
  task.
- Con `false`, los readers pueden mostrar work items y fixtures; los commands de creación/handoff
  devuelven `seo_editorial_disabled` antes de escribir o gastar.
- Cutover: migration aditiva → deploy con flag OFF → smoke de commands read-only → enable sólo en una
  organización allowlisted → una corrida `create` y una `refresh` a draft/private → ampliar allowlist.
- Revert: volver el flag a `false`; no borrar work items ni eventos. Los drafts privados quedan bajo el
  runbook de Content Factory y se contienen manualmente si el smoke lo requiere.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 1 | deshabilitar commands, conservar migration aditiva y revertir sólo código no migración | <5 min | sí, con datos históricos conservados |
| Slice 2 | flag OFF y revert de routes/commands; readers pueden seguir leyendo fixtures válidos | <5 min | sí |
| Slice 3 | flag OFF, detener consumer/outbox de handoff y no reintentar automáticamente drafts ambiguos | <5 min para contención | parcial; revisar cualquier draft externo por runbook |
| Slice 4 | retirar org allowlist y dejar flag OFF; no borrar evidencia | <5 min | sí |

### Production verification sequence

1. Ejecutar lint de task y tests unitarios del envelope, transitions, tenant isolation e idempotency.
2. Aplicar migration en staging y verificar índices, constraints y trigger sin filas de producción.
3. Deploy con flag OFF; probar que readers retornan estados y que commands no generan outbox ni llaman
   Content Factory.
4. Habilitar una organización de prueba; crear un `create` y un `refresh` con actor humano confirmado.
5. Verificar brief hash, source refs, capability, outbox, adapter y resultado draft/private con
   fingerprint; comprobar que no existe write publish.
6. Repetir el mismo request con la misma idempotency key y confirmar que no aparece un segundo draft.
7. Forzar respuesta parcial/timeout del adapter y comprobar `blocked`, retry bounded y error saneado.
8. Ejecutar smoke read por app/Nexa/MCP/ecosystem y comparar DTOs.
9. Sólo después ampliar la organización allowlist; monitorear signals durante la ventana acordada.

### Out-of-band coordination required

- Owner de Content Factory debe confirmar el adapter, lane soportado y forma de crear draft/private.
- Owner de WordPress/Kinsta debe confirmar que el smoke nunca publica y que existe procedimiento de
  contención para un estado externo ambiguo.
- Auth/platform owner debe registrar grants de `growth.seo.editorial.read/manage`.
- No se requiere nueva credencial ni provider externo; cualquier cambio de secret queda fuera de esta
  task y debe tener su propio gate.

## Acceptance Criteria

- [ ] Existe `seo_editorial_work_items` con tenant, target, work kind, decision kind, source refs,
  context hash, brief hash, idempotency key y estados explícitos.
- [ ] Existe log append-only de eventos; una captura histórica no puede editarse ni borrarse desde el
  command normal.
- [ ] El command rechaza candidate/ref/target de otra organización con respuesta anti-oracle.
- [ ] El command diferencia `create`, `refresh` y `fix`; no transforma `consolidate` o una grounded
  query en otro tipo sin confirmación explícita.
- [ ] El command valida un `ContentFactoryBrief.v1` completo antes de persistir o entregar.
- [ ] Un refresh/fix sin URL/post/inspección dueña falla con error canónico y no llama Content Factory.
- [ ] La envolvente conserva por separado source refs, as-of y tipo de señal `measured|estimated|declared|derived`.
- [ ] El adapter de Content Factory es el único puente; SEO no hace fetch directo a WordPress/Think.
- [ ] El handoff acepta sólo `draft/private`; status `publish` o una respuesta ambigua bloquea la
  transición y genera señal.
- [ ] Reintentar con la misma idempotency key no crea otro work item, evento externo ni draft.
- [ ] `trackKeywords` no se invoca como efecto secundario de crear o entregar un work item.
- [ ] `createGroundedQueryDraft` no se invoca automáticamente; una referencia existente queda opaca.
- [ ] La capability read/manage está registrada, grantada y cubierta por test; no depende sólo del rol.
- [ ] App, Nexa, ecosystem y MCP consumen los mismos DTOs/commands y tienen el mismo tenant-boundary.
- [ ] El browser no recibe secretos, raw provider responses, prompts, HTML completo ni signed URLs.
- [ ] `GROWTH_SEO_EDITORIAL_HANDOFF_ENABLED` figura en el Feature Flag State Ledger con default OFF,
  cutover y rollback.
- [ ] Existen señales de creación, handoff, replay, fallo y latencia sin keyword/copy/URL sensible.
- [ ] El smoke de staging prueba un `create`, un `refresh`, un retry idempotente y un fallo de adapter.
- [ ] El manual explica el camino candidate → work item → brief → draft privado y sus pasos siguientes.
- [ ] `TASK-1665`, `TASK-1668` y `TASK-1669` tienen refs claras al contract y no necesitan leer tablas.

## Verification

- `pnpm task:lint --task TASK-1667`
- Tests focales de contracts, commands, reader, adapter, tenant isolation, transitions y idempotency.
- Migration verify en staging con query read-only y revisión de grants.
- Smoke de Content Factory draft/private con el runbook vigente; nunca publish.
- Smoke parity app/Nexa/ecosystem/MCP con actor y organización de prueba.
- `pnpm docs:closure-check`
- `git diff --check -- docs/tasks/to-do/TASK-1667-growth-seo-editorial-work-item-content-factory-handoff.md`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla,
  `complete` al cerrarla).
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre 1664–1669, Content Factory y EPIC-022.
- [ ] La evidencia demuestra `draft/private`, no publicación ni tracking automático.

## Follow-ups

- `TASK-1668` — lifecycle post-draft, QA live, publicación humana, outcome e iteración.
- `TASK-1669` — agentes que recomiendan el siguiente paso leyendo este aggregate.
- Una task posterior puede definir publicación programática opt-in; no se deriva automáticamente de
  este handoff y debe respetar `TASK-1323` y el runbook de Content Factory.

## Open Questions

- Confirmar con Content Factory si el primer adapter soportará sólo `post_draft_gutenberg` o también
  `landing_draft_elementor`; si se limita a Gutenberg, el command debe devolver un reason code claro
  para otras lanes.
- Confirmar el namespace final de capabilities (`growth.seo.editorial.*`) contra el registry vigente;
  la decisión no puede quedar como gate por rol.
- Confirmar el nombre del recurso MCP, manteniendo el principio de que es un thin adapter sobre el
  command y no un contrato paralelo.
