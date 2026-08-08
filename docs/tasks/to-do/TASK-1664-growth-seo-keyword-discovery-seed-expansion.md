# TASK-1664 — Growth SEO: keyword discovery, seed expansion y enrichment de mercado

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

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
- Domain: `growth|seo|data`
- Blocked by: `TASK-1661`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el primitive server-side de **keyword discovery** que falta entre una idea humana y una
decisión SEO: recibe seeds manuales o medidas, expande con DataForSEO Labs, deduplica, trae volumen,
dificultad e intención estimadas y deja candidatos trazables para que un operador decida qué declarar,
seguir o convertir en consultas grounded. La corrida es asíncrona, acotada, costeada antes de gastar y
no agrega ninguna keyword al set monitoreado por sí sola.

## Why This Task Exists

El módulo actual contesta qué empujar de lo que ya aparece en GSC (`TASK-1308`) y permite declarar
objetivos (`TASK-1659`/`TASK-1660`), pero no contesta cómo pasar de una hipótesis diaria a un conjunto
priorizado de términos. Hoy el operador debe cambiar de herramienta para hacer keyword mining: copiar
seeds, buscar sugerencias, revisar volumen y dificultad, eliminar duplicados, volver a Greenhouse y
recién entonces decidir. Esa fragmentación impide que el producto cierre el loop
`descubrir → decidir → medir`.

El dato externo tiene además dos riesgos que no pueden quedar implícitos:

- Labs es un proveedor **Live**. Cada request y cada fila devuelta pueden cobrar; no existe una lectura
  gratuita por render ni una promesa de costo fijo.
- DataForSEO entrega estimaciones de mercado mensuales, no la demanda medida del Space. Las filas deben
  conservar `source`, `captured_at` y `provider_last_updated_at`, y la UI futura debe mostrar la lente
  estimada `◑` separada de GSC `●`.

La ausencia de este primitive deja dos caminos peligrosos: pagar llamadas sin límite o convertir
automáticamente una sugerencia en seguimiento recurrente. Esta task fija la frontera para que la
superficie diaria pueda ser rápida sin ser temeraria.

## Goal

- Un operador puede iniciar una corrida con hasta 10 seeds, elegir fuentes de expansión y ver el costo
  estimado y el saldo utilizable antes de confirmar.
- Cada candidato queda asociado a la corrida, seed, endpoint, mercado, fecha de captura y métricas
  estimadas; el dato faltante se representa como `null`/estado explícito, nunca como cero.
- La corrida se ejecuta fuera de Vercel en `ops-worker`, con `enforceSeoRunEntitlement`, el transporte
  DataForSEO canónico, ledger de gasto y señales de confiabilidad.
- El resultado se expone por un reader único a app, Nexa, lane ecosystem y MCP; ningún consumer lee las
  tablas directamente.
- Promover, declarar objetivo o seguir una keyword permanece como una acción posterior y explícita;
  esta task no crea membresías en `seo_keyword_set_members`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1, §4, §7, §9, §10.4, §13, §17)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`

Reglas obligatorias:

- **Un solo transporte provider-facing:** toda llamada usa `postDataForSeoTask({ family: 'labs', ... })`
  desde `src/lib/ai/dataforseo.ts`. No se agrega un SDK, `fetch` directo ni familia DataForSEO paralela.
- **Un solo gate de SEO:** cada corrida que pueda gastar pasa por
  `enforceSeoRunEntitlement(organizationId, { estimatedCostUsd, consumesAuditAllowance: false })` antes
  de la primera llamada y vuelve a comprobar el fence antes de cada lote posterior.
- **Ledger obligatorio:** el runtime que llame Labs importa
  `@/lib/growth/seo/register-provider-spend`; si el recorder no está registrado, la primera llamada
  debe fallar y no continuar con gasto no atribuido.
- **Labs no es task-based:** los endpoints de discovery son Live, un POST devuelve el resultado; cada
  llamada Live contiene una sola task del proveedor. No se implementa un poll ficticio ni se guarda una
  `provider_task_id` que no existe.
- **No live-per-view:** el render lee snapshots de candidatos materializados en PG; el browser nunca
  conoce credenciales ni llama DataForSEO.
- **No mezclar lentes:** GSC conserva la demanda medida del Space (`●`); Labs conserva demanda de
  mercado estimada (`◑`). Nunca se promedian ni se sustituye una por otra silenciosamente.
- **No auto-track:** crear una fila de candidato no crea ni modifica `seo_keyword_set_members`; la
  promoción usa después `trackKeywords`/`untrackKeywords` y su intención declarada.
- **No keyword gap duplicado:** `domain_intersection`/`page_intersection` y la derivación competitiva
  pertenecen a `TASK-1662`; 1664 sólo descubre desde seeds, GSC, set monitoreado y dominio propio.
- **No AI Optimization duplicado:** `ai_optimization`/LLM Mentions/SoV de proveedor pertenecen a
  `TASK-1651`; grounded queries son una salida AEO separada de `TASK-1666`.
- **Append-only para hechos:** una nueva respuesta del proveedor agrega una nueva captura; no actualiza
  una captura anterior. Los estados operativos de una corrida tienen una máquina explícita y no pueden
  mutar métricas históricas.

## Normative Docs

- `docs/tasks/complete/TASK-1300-growth-seo-dataforseo-family-registry.md`
- `docs/tasks/complete/TASK-1301-growth-seo-capabilities-per-org-entitlement.md`
- `docs/tasks/to-do/TASK-1659-growth-seo-keyword-target-intent-model.md`
- `docs/tasks/to-do/TASK-1661-growth-seo-keyword-market-data-capability.md`
- `docs/tasks/to-do/TASK-1662-growth-seo-keyword-gap-discovery.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Dependencies & Impact

### Depends on

- `TASK-1299` — schema y grants base de `greenhouse_growth`.
- `TASK-1300` — allowlist `labs`, breaker por familia, transporte único y spend recorder.
- `TASK-1301` — capability y gate `enforceSeoRunEntitlement` per-org.
- `TASK-1661` — primitive de datos de mercado y reader de volumen/dificultad. 1664 no duplica sus
  columnas ni sus snapshots; consume el contrato para enriquecer candidatos.
- `src/lib/growth/seo/keyword-opportunities-reader.ts` — consulta de oportunidades GSC ya materializada.
- `src/lib/growth/seo/track-keywords.ts` — command posterior que convierte una decisión explícita en
  seguimiento recurrente.

### Blocks / Impacts

- `TASK-1665` — workbench diario sobre el reader de discovery.
- `TASK-1666` — puente de candidatos/seed hacia grounded queries AEO.
- `TASK-1662` — reutiliza la forma de candidato, pero conserva su propio análisis de competencia.
- `TASK-1310` — el report cliente puede consumir únicamente candidatos aprobados o derivados, nunca una
  lista de sugerencias sin decisión humana.

### Files owned

- `migrations/[timestamp]_task-1664-seo-keyword-discovery.sql`
- `src/lib/growth/seo/keyword-discovery/contracts.ts`
- `src/lib/growth/seo/keyword-discovery/queue.ts`
- `src/lib/growth/seo/keyword-discovery/runner.ts`
- `src/lib/growth/seo/keyword-discovery/reader.ts`
- `src/lib/growth/seo/keyword-discovery/provider.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/contracts.test.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/runner.test.ts`
- `src/lib/growth/seo/keyword-discovery/__tests__/reader.test.ts`
- `src/lib/growth/seo/__tests__/keyword-discovery-parity.test.ts`
- `services/ops-worker/server.ts`
- `services/ops-worker/deploy.sh`
- `src/app/api/admin/growth/seo/keyword-discovery/route.ts`
- `src/app/api/platform/ecosystem/growth/seo/keyword-discovery/route.ts`
- `src/mcp/greenhouse/seo/keyword-discovery.ts`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

## Current Repo State

### Already exists

- `src/lib/ai/dataforseo-families.ts` tiene la familia `labs` con prefijo cerrado
  `/v3/dataforseo_labs/` y propósito de keyword research.
- `src/lib/ai/dataforseo.ts` implementa auth, timeout, breaker y registro de costo; soporta el POST
  genérico que los endpoints Labs necesitan.
- `src/lib/growth/seo/register-provider-spend.ts` conecta el ledger `seo_provider_spend_daily`.
- `src/lib/growth/seo/entitlement.ts` resuelve tier, allowance y budget por organización.
- `src/lib/growth/seo/keyword-opportunities-reader.ts` expone consultas GSC que pueden servir como
  seeds sin costo de proveedor.
- `greenhouse_growth.seo_keyword_sets` y `seo_keyword_set_members` contienen el set monitoreado; la
  membresía vigente es un compromiso de captura recurrente, no un almacén de candidatos.
- `services/ops-worker/server.ts` ya es el runtime de batches SEO y conoce la regla de importar el
  spend recorder en su entrypoint.
- La arquitectura y la skill documentan los endpoints Labs `keyword_suggestions`, `related_keywords`,
  `keyword_ideas`, `keywords_for_site` y `keyword_overview`.

### Gap

- No existe una entidad de corrida que separe una solicitud de discovery de sus resultados.
- No existe persistencia de candidatos con procedencia, mercado, as-of, intent ni deduplicación.
- No existe preview de costo ni un segundo fence para una corrida de varios endpoints.
- No existe worker que materialice resultados Live ni signal de corrida atascada.
- No existe reader con filtros para workbench, MCP o Nexa.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/` compartido por Vercel (commands/readers) y `services/ops-worker/`
  (provider execution).
- Future candidate home: `domain-package`
- Boundary: `queueKeywordDiscovery` y `readKeywordDiscovery` son la API canónica; `runner` es el único
  consumidor de DataForSEO; `trackKeywords` sigue siendo el único writer del set monitoreado.
- Server/browser split: seeds, tablas, credenciales, prompts de proveedor y respuestas crudas son
  server-only. El browser recibe DTOs redactados del reader y nunca `raw provider response`.
- Build impact: `none`; se reutilizan el cliente DataForSEO y el worker existentes, sin SDK nuevo.
- Extraction blocker: transacción de outbox/command, entitlement y spend recorder compartidos; el seam
  futuro debe conservar `organization_id` como único acople de tenant y no importar tablas de otro motor.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_keyword_discovery_runs` +
  `seo_keyword_discovery_candidates` + `seo_keyword_discovery_actions` para discovery; DataForSEO Labs
  es fuente externa estimada y `seo_keyword_set_members` sigue siendo SoT de tracking.
- Consumidores afectados: `UI`, `Nexa`, `MCP`, `ops-worker`, `report readers`.
- Runtime target: `Vercel` para enqueue/read, `ops-worker` para provider execution, `production` después
  de rollout gated.

### Contract surface

- Contrato existente a respetar:
  - `postDataForSeoTask` y `DataForSeoTaskInput` en `src/lib/ai/dataforseo.ts`.
  - `enforceSeoRunEntitlement` en `src/lib/growth/seo/entitlement.ts`.
  - `trackKeywords` en `src/lib/growth/seo/track-keywords.ts`.
  - `readKeywordOpportunities` para seeds derivados de GSC.
- Contrato nuevo:
  - `queueKeywordDiscovery(input)` → `{ ok: true, runId, estimatedCostUsd, limits }` o error canónico;
  - `readKeywordDiscovery(input)` → run, resumen y candidatos filtrados;
  - `recordKeywordDiscoveryAction(input)` → acción append-only de candidato, sin tracking implícito;
  - `runKeywordDiscovery(runId)` → resultado interno del worker, no endpoint público.
- Backward compatibility: `gated`; no se cambia la forma de readers ni commands existentes. Con flag
  `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED=false`, enqueue y runner devuelven estado disabled sin gastar.
- Full API parity:
  - app lane: route admin `POST/GET /api/admin/growth/seo/keyword-discovery`;
  - ecosystem lane: route `/api/platform/ecosystem/growth/seo/keyword-discovery` con binding por org y
    redacción anti-oracle;
  - MCP read: `get_seo_keyword_discovery`;
  - MCP write: `discover_seo_keywords`, bajo `efeonce.mcp.seo.write`, sólo binding interno y siempre
    con preview/confirmación humana para ejecutar;
  - Nexa usa los mismos commands/readers, no SQL ni endpoint paralelo.

### Data model and invariants

#### `greenhouse_growth.seo_keyword_discovery_runs`

Una fila representa una solicitud de discovery y su estado operativo. Campos mínimos:

| Campo | Tipo | Regla |
|---|---|---|
| `run_id` | `uuid` | PK, ID de la corrida que se comparte con workers/readers |
| `organization_id` | `uuid` | tenant obligatorio; nunca se deriva desde un query param confiable |
| `seo_target_id` | `uuid` | FK al target; la consulta valida que pertenece a `organization_id` |
| `source_kind` | `text` | enum cerrado: `manual`, `gsc_queries`, `tracked_keywords`, `target_domain`, `mixed` |
| `seed_inputs_json` | `jsonb` | seeds normalizadas y referencias de GSC/set; sin secretos ni HTML crudo |
| `methods_json` | `jsonb` | endpoints elegidos y límites exactos de la corrida |
| `location_code` | `integer` | mercado de Google Labs; forma parte de la identidad de resultados |
| `language_code` | `text` | idioma de Google Labs; forma parte de la identidad de resultados |
| `status` | `text` | `pending → running → succeeded|partial|no_results|failed|budget_blocked|cancelled` |
| `estimated_cost_usd` | `numeric` | costo conservador aprobado antes del primer provider call |
| `actual_cost_usd` | `numeric` | suma del `cost` real devuelto por transporte; nunca se estima al cerrar |
| `provider_calls` | `integer` | cantidad de llamadas Live realizadas |
| `candidate_count` | `integer` | filas insertadas, no cantidad solicitada |
| `error_code` | `text nullable` | código canónico, nunca mensaje bruto del proveedor |
| `created_by` | `text` | actor humano/máquina auditado |
| `idempotency_key` | `text` | único por org + target + inputs + mercado + methods + actor intent |
| `requested_at/started_at/completed_at` | `timestamptz` | cronología; `clock_timestamp()` en transacciones |

La corrida puede actualizar **sólo** los campos operativos (`status`, tiempos, costos, conteos y
error_code) en transiciones permitidas. Nunca reescribe `seed_inputs_json`, `methods_json`, mercado o
el costo de una llamada ya registrada.

#### `greenhouse_growth.seo_keyword_discovery_candidates`

Una fila es un hecho de una respuesta concreta del proveedor:

| Campo | Tipo | Regla |
|---|---|---|
| `candidate_id` | `uuid` | PK |
| `run_id` | `uuid` | FK a la corrida; no se reasigna a otra corrida |
| `organization_id`/`seo_target_id` | `uuid` | se guardan para tenant/index y se validan contra run |
| `keyword` | `text` | texto devuelto; máximo 80 caracteres y 10 palabras por el límite Labs |
| `normalized_keyword` | `text` | NFKC, trim, lowercase y espacios colapsados; no elimina tildes |
| `seed_keywords_json` | `jsonb` | seeds que originaron el resultado |
| `source_endpoint` | `text` | enum cerrado: `keyword_suggestions`, `related_keywords`, `keyword_ideas`, `keywords_for_site` |
| `source_rank` | `integer nullable` | posición del resultado dentro de esa respuesta |
| `core_keyword` | `text nullable` | agrupador entregado por Labs; no se construye clustering propio |
| `search_volume`/`keyword_difficulty` | `integer nullable` | estimados Labs; `null` si proveedor no tiene dato |
| `competition` | `numeric nullable` | competencia paga 0–1; nunca se etiqueta como dificultad orgánica |
| `intent`/`intent_probability` | `text nullable`/`numeric nullable` | vocabulario Labs; no se mezcla con `intent` de TASK-1659 |
| `provider_last_updated_at` | `timestamptz nullable` | fecha que devuelve Labs para la métrica |
| `captured_at` | `timestamptz` | fecha en que Greenhouse capturó la respuesta |
| `market_source` | `text` | fijo `dataforseo_labs`; disclosure `estimated` |
| `raw_payload_hash` | `text` | hash para diagnóstico; no se persiste payload completo |

Índice único: `(run_id, normalized_keyword, source_endpoint, location_code, language_code)`.
Una misma keyword proveniente de dos endpoints conserva ambas procedencias; el reader puede deduplicar
para la vista, pero no destruye evidencia.

#### `greenhouse_growth.seo_keyword_discovery_actions`

Tabla append-only para decisiones posteriores: `dismissed`, `selected_for_target`,
`selected_for_grounded_query`, `promoted_to_tracking`, `rejected`. Cada acción incluye
`candidate_id`, actor, timestamp, `idempotency_key` y metadata mínima. No contiene una copia de la
keyword como autoridad y no puede insertar en `seo_keyword_set_members`.

Invariantes transversales:

- Toda fila de discovery pertenece a una org y target que se validan server-side; un ID de otra org
  devuelve `not_found`/anti-oracle, no una diferencia explicativa.
- No hay FK hacia `grader_prompt_sets`; el puente AEO (`TASK-1666`) usa referencias opacas y comandos
  públicos para mantener motores separados.
- El mismo `idempotency_key` devuelve la corrida existente sin otra llamada provider.
- Dos workers no pueden correr la misma corrida: claim con lock/estado `pending → running`; el segundo
  devuelve `busy` sin gasto.
- Retries sólo repiten una etapa no confirmada; cada endpoint/seed lleva una clave de subllamada y no
  inserta candidatos duplicados.
- El `provider_cost` de cada llamada se registra por el transporte; `actual_cost_usd` es resumen y no
  fuente de presupuesto.
- Las eliminaciones físicas de runs/candidates/actions están prohibidas por la política append-only;
  la retención futura debe ser una decisión de datos, no un `DELETE` casual.

### Exact provider contract V1

Todos los endpoints siguientes son Google Labs Live y se llaman mediante `postDataForSeoTask` con un
único task por llamada, `location_code`, `language_code`, `include_serp_info=false`,
`include_clickstream_data=false`, `limit` explícito y `tag` con `run_id`/`seed_hash`:

| Método UI | Endpoint | Payload V1 | Límite |
|---|---|---|---|
| Sugerencias | `/v3/dataforseo_labs/google/keyword_suggestions/live` | `keyword`, mercado, `include_seed_keyword=false`, `exact_match=false`, filtros de `search_volume > 0` | una llamada por seed; hasta 10 seeds; `limit` 50 default/100 max |
| Relacionadas | `/v3/dataforseo_labs/google/related_keywords/live` | `keyword`, mercado, `depth=1`, `include_serp_info=false` | una llamada por seed; hasta 10 seeds; `limit` 50 default/100 max |
| Ideas | `/v3/dataforseo_labs/google/keyword_ideas/live` | `keywords[]`, mercado, `closely_variants=false`, filtros de `search_volume > 0` | una llamada para todas las seeds; máximo 10 seeds; `limit` 50 default/100 max |
| Dominio propio | `/v3/dataforseo_labs/google/keywords_for_site/live` | `target` sin scheme, mercado, `limit`, `order_by=["relevance,desc"]` | una llamada opcional por corrida; apagada por default |
| Enriquecimiento | `/v3/dataforseo_labs/google/keyword_overview/live` | `keywords[]` deduplicadas, máximo 100; sin clickstream | una llamada final por corrida; `keyword_overview` no crea seeds |

No se llaman `keywords_data`, `bulk_keyword_difficulty`, `domain_intersection` ni `search_intent` en
V1. `keyword_overview` entrega el conjunto enriquecido para evitar joins de APIs y su `keyword_difficulty`
es la dificultad orgánica estimada; `competition` sigue siendo paid.

El parser acepta una respuesta sólo cuando el task tiene `status_code=20000`. Por resultado se
conservan `keyword`, `keyword_info`, `keyword_properties`, `search_intent_info` y fechas disponibles;
los campos ausentes se proyectan como `null`. Se registran como `provider_error` la respuesta HTTP
fallida, task status distinto de 20000, JSON inválido o timeout. Un resultado válido con cero items es
`no_results`, no error.

### Cost and limits contract

El preview usa el perfil documentado de Labs y debe mostrar fórmula, no sólo un número:

```text
estimatedCostUsd =
  providerCallCount × LABS_TASK_SETUP_USD
  + requestedResultRows × LABS_RESULT_ROW_USD
```

Valores V1 del perfil (`.claude/skills/dataforseo-operator/references/02-labs.md`):
`LABS_TASK_SETUP_USD = 0.012` y `LABS_RESULT_ROW_USD = 0.00012`. La respuesta real del proveedor
prevalece sobre el estimado y se registra en el ledger. Clickstream está prohibido porque duplica el
costo y no es necesario para esta pregunta.

Límites duros por corrida:

- máximo 10 seeds, después de normalización y deduplicación;
- máximo 3 métodos de expansión entre sugerencias, relacionadas e ideas;
- `keywords_for_site` es opcional y cuenta como cuarto método sólo si el operador lo activa;
- máximo 100 resultados solicitados por endpoint/seed;
- máximo 500 candidatos antes de deduplicación final y máximo 200 candidatos enriquecidos por
  `keyword_overview`;
- máximo 30 llamadas Labs por corrida (10 sugerencias + 10 relacionadas + 1 ideas + 1 dominio + 1
  overview = 23 en el caso máximo V1; el margen restante es para reintentos controlados);
- si el costo estimado supera el presupuesto restante o la cuota, no se ejecuta ninguna llamada;
- si el fence se agota a mitad de corrida, se conserva lo materializado y el run termina
  `budget_blocked`/`partial` con costo real y candidatos ya escritos.

No existe un cron diario en esta task. "Diario" significa que el operador puede repetir corridas con
inputs y mercado explícitos; una programación automática requeriría otra task con presupuesto y
aprobación propios.

### Access, privacy and error contract

- Leer discovery exige `growth.seo.observation.read` y assignment `seo_v1` vigente.
- Encolar/ejecutar exige `growth.seo.target.configure` además del assignment; MCP requiere también
  binding interno y `efeonce.mcp.seo.write` para el write.
- `organization_id`, target y mercado se derivan/validan server-side; jamás se confía en el `orgId` del
  body ni en un target de otra org.
- No se persiste HTML, contenido de páginas, nombres de personas, credenciales ni respuesta cruda del
  proveedor. El `raw_payload_hash` sólo sirve para correlación.
- Error codes cerrados: `seo_keyword_discovery_disabled`, `forbidden`, `target_not_found`,
  `invalid_seed`, `limit_exceeded`, `duplicate_run`, `busy`, `budget_blocked`, `provider_error`,
  `no_results`, `partial`, `run_not_found`.
- Ningún mensaje de error expone endpoint, SQL, body del proveedor, credenciales o stack.

### Runtime and signals

- Flag nuevo: `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED`, default `false`, declarado en Vercel y
  `services/ops-worker/deploy.sh`; registrar en `FEATURE_FLAG_STATE_LEDGER.md`.
- La ruta app crea run y outbox en una transacción; responde `202` con `runId` sólo si la corrida queda
  durable. No llama provider.
- El worker consume `growth.seo.keyword_discovery.requested`, reclama `pending`, procesa endpoints y
  escribe candidatos/run/outbox en transacciones acotadas.
- La señal `seo.keyword_discovery.stuck_runs` alerta corridas `running` por más de 15 minutos; la
  señal `seo.keyword_discovery.provider_errors` cuenta fallas de proveedor por familia; la señal
  `seo.provider.cost_over_budget` sigue siendo la alarma de presupuesto.
- Un run parcial nunca se reintenta sin clave de subllamada; el operador puede solicitar una nueva
  corrida y la UI debe mostrarla como nueva captura.

## Backend/Data Contract — Full API Parity gate

Esta task introduce un command provider-facing y un reader. Deben llegar juntos por cada lane:

1. **App:** route handler admin, `canonicalErrorResponse`, capability y tenant check.
2. **Nexa:** wrapper del mismo command/reader; nunca acceso a SQL ni `postDataForSeoTask` directo.
3. **Ecosystem:** route allowlisted con org derivada del binding, `404` anti-oracle fuera de assignment y
   redacción client-safe.
4. **MCP:** tool read `get_seo_keyword_discovery`; tool write `discover_seo_keywords`; inventario y
   exclusion/parity del gateway actualizados en el mismo cambio. Write bajo `efeonce.mcp.seo.write`,
   nunca bajo `efeonce.mcp.read`.
5. **Audit:** actor, source lane, run ID, idempotency key y resultado por endpoint quedan disponibles
   para soporte; un error parcial no se reporta como éxito total.

La aceptación no se cumple con exports TypeScript solamente: debe existir route/lane/tool ejercitable y
una prueba de paridad que demuestre que app, Nexa, ecosystem y MCP convergen en el mismo primitive.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- El agente que tome la task debe llenar esta zona con Discovery y plan aprobado. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 0 — Discovery contract, limits y cost preview

- Crear contracts cerrados para `source_kind`, endpoints, status, error codes, seed normalization,
  candidate provenance y cost profile.
- Implementar el cálculo determinista de calls/rows/costo antes de persistir o ejecutar.
- Declarar `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` en el flag ledger, con default OFF en ambos runtimes.
- Probar que inputs inválidos no llegan al transporte y que una corrida GSC-only tiene costo provider
  cero.

### Slice 1 — Schema append-only y grants

- Crear las tres tablas indicadas, constraints de tenant, estados cerrados, índices y GRANTs least
  privilege.
- Aplicar el marker de migración usado por el repo, generar tipos DB y verificar contra PostgreSQL
  real.
- Crear índices de lectura por `(organization_id, seo_target_id, captured_at desc)`,
  `(run_id, normalized_keyword)` y acciones por candidate.
- Probar que una captura repetida no sobrescribe otra y que candidate/action no pueden cruzar orgs.

### Slice 2 — Queue, reader y action log

- Implementar `queueKeywordDiscovery` con transaction boundary: validar actor/assignment/target,
  calcular costo, validar idempotency, insertar run `pending` y outbox en una sola transacción.
- Implementar `readKeywordDiscovery` con filtros `runId`, `sourceEndpoint`, `query`, `intent`,
  `minSearchVolume`, `maxDifficulty`, `status`, `limit` y cursor; limitar `limit` server-side a 200.
- Implementar `recordKeywordDiscoveryAction` como acción append-only; no debe llamar tracking ni
  AEO, sólo dejar la intención de la siguiente acción.
- Proyectar `measuredRank`/GSC como campo separado cuando exista; nunca rellenar `searchVolume` desde
  GSC ni `position` desde Labs.

### Slice 3 — Labs adapter y runner async

- Implementar adapters tipados para los cinco endpoints aprobados y parser por `status_code=20000`.
- Ejecutar un task por llamada Live, limitar concurrencia a 10 dentro del máximo de 30 provider calls,
  reintentar sólo errores transitorios sin repetir una subllamada confirmada.
- Importar el spend recorder en el entrypoint del worker y ejecutar el entitlement gate antes de cada
  batch/fence.
- Deduplicar con la normalización definida, enriquecer máximo 200 candidatos y persistir as-of/provider
  timestamps sin payload crudo.
- Emitir estados `succeeded`, `partial`, `no_results`, `budget_blocked` y `failed` con razones
  canónicas; no ocultar un proveedor caído como lista vacía.

### Slice 4 — Worker, outbox, lanes y MCP

- Añadir handler protegido de ops-worker para drenar corridas pendientes y registrarlo en el router
  existente; no agregar Vercel cron.
- Crear route app, route ecosystem y tools MCP con el mismo DTO y error mapping.
- Añadir tests de paridad app/Nexa/ecosystem/MCP, binding anti-oracle y scope de escritura.
- Registrar señales y logs estructurados con `runId`, `organizationId` redactado, endpoint lógico,
  status, counts, cost y latency; nunca keyword list completa en logs de producción.

### Slice 5 — Verificación live acotada

- Ejecutar primero modo GSC-only sin costo externo.
- En staging, ejecutar una corrida de una seed, un método, `limit=10`, con org de prueba y confirmar
  ledger, candidates, as-of y rollback por flag.
- Ejecutar un caso parcial/empty, un caso budget-blocked y un caso duplicate/idempotent.
- Confirmar que una keyword candidata no aparece en `seo_keyword_set_members` hasta invocar después
  el command explícito de tracking.

## Out of Scope

- Tracking recurrente, modificación de `seo_keyword_set_members` o cambio de intención: `TASK-1659` y
  `trackKeywords` existente.
- UI del workbench: `TASK-1665`.
- Keyword gap entre dominios, competidores declarados o `domain_intersection`: `TASK-1662`.
- DataForSEO `ai_optimization`, LLM Mentions o SoV provider: `TASK-1651`.
- Generación/activación de prompt sets AEO: `TASK-1666` y EPIC-020.
- Cron diario automático, scraping propio, Google Ads Keywords Data API, clickstream y CMS writes.

## Detailed Spec

### Seed resolution order

El command recibe `seedSource` y resuelve los seeds server-side en este orden, sin mezclar fuentes en
una misma etiqueta:

1. `manual`: acepta texto del actor, uno por línea o token; normaliza, deduplica y rechaza vacío,
   >80 caracteres, >10 palabras o más de 10 seeds.
2. `gsc_queries`: lee sólo consultas de `seo_gsc_daily` del target/org, período máximo 28 días,
   `impressions > 0`, ordenadas por impresiones desc y limitada a 10; no tiene costo DataForSEO.
3. `tracked_keywords`: lee keywords vigentes del target, máximo 10, preservando la procedencia
   `source`/`intent` como metadata; no las vuelve a trackear.
4. `target_domain`: toma el dominio canónico ya validado del target y activa
   `keywords_for_site`; no acepta un dominio arbitrario en el body.
5. `mixed`: combina manual + una fuente medida, aplica el mismo máximo de 10 y guarda el origen por
   seed; no combina dos targets ni dos orgs.

La salida de resolución es un snapshot inmutable en `seed_inputs_json`; una nueva corrida vuelve a
leer y puede producir un conjunto distinto sin reescribir la anterior.

### Candidate ranking and deduplication

El reader no inventa un score único. Para orden por default usa:

1. acción pendiente primero (`new` antes que `dismissed`);
2. coincidencia exacta con una seed;
3. `core_keyword` presente;
4. `search_volume` desc cuando existe;
5. `keyword_difficulty` asc cuando existe;
6. `captured_at` desc;
7. `candidate_id` asc como desempate estable.

La ausencia de volumen o dificultad no elimina la fila ni la convierte en cero. El reader devuelve
`marketAvailability: 'available'|'unavailable'` y `marketFreshness` con la fecha máxima disponible.

### Promotion boundary

El candidate reader puede devolver `alreadyTracked`, `currentIntent` y `trackingCostDisclosure` al
consumer, pero no puede ejecutar la promoción. El flujo correcto posterior es:

```text
candidate → operator selects action → cost/recurring disclosure → trackKeywords(... intent ...) →
recordKeywordDiscoveryAction(promoted_to_tracking) → rank capture includes it on the next cycle
```

Si `trackKeywords` rechaza por cupo, entitlement o keyword inválida, la acción queda con el outcome
real y el candidate no se pinta como promovido.

### Provider result disclosure

Cada DTO de candidate incluye:

- `source: 'dataforseo_labs'`, `sourceEndpoint`, `capturedAt`, `providerLastUpdatedAt`;
- `measurementKind: 'estimated_market'` y `displayMarker: '◑'`;
- `searchVolume`, `difficulty`, `intent`, `coreKeyword` y `competition` sin cambiar su semántica;
- `measuredGsc` separado si el reader puede cruzarlo por `organization_id + keyword`, marcado `●`.

Los consumers no pueden renombrar `competition` a `difficulty`, presentar Labs como "tu volumen" ni
ordenar una observación GSC por la fecha de Labs.

### ADR gate

La implementación está cubierta por la arquitectura existente de EPIC-022 y `TASK-1300`; no se crea
una nueva fuente compartida fuera del dominio. Si durante Discovery se propone mover candidates a otro
paquete/runtime o reutilizarlos como SoT de AEO, la ejecución se detiene y se debe registrar un ADR
antes de cambiar el schema. La extracción física a Wave queda fuera de esta task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 **MUST** cerrar contratos, límites y cost profile antes de cualquier migration o provider call.
- Slice 1 **MUST** preceder Slice 2; no se encola una corrida sin schema y outbox verificados.
- Slice 2 **MUST** preceder Slice 3; el worker no puede persistir directamente desde el adapter.
- Slice 3 **MUST** estar verde con mocks contractuales antes de habilitar Slice 4.
- Slice 4 **MUST** operar con flag OFF hasta completar Slice 5 staging.
- Slice 5 es requisito para `UI ready` de `TASK-1665` y para cualquier promoción a producción.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Una corrida Live cobra más de lo previsto | provider/budget | high | fórmula conservadora, limits duros, entitlement antes de cada batch y fence por llamada | `seo.provider.cost_over_budget` |
| Falta spend recorder en un runtime nuevo | worker/provider | medium | import explícito en entrypoint + test que espera throw sin recorder | error estructurado de `postDataForSeoTask` |
| Repetición concurrente duplica costo | worker/outbox | medium | claim `pending→running`, idempotency y subcall keys | `seo.keyword_discovery.stuck_runs` |
| Datos estimados se presentan como medidos | reader/UI | medium | campos `measurementKind`, `source` y tests de no-mezcla | auditoría de DTO / visual review |
| Keyword candidate se convierte en tracking sin aprobación | domain/cost | high | ningún FK/write a members; promotion sólo llama command existente | test `candidate_does_not_track` |
| Respuesta Labs cambia shape o status | integration | medium | gate `status_code=20000`, fixtures reales, parser tolerante con null | `seo.keyword_discovery.provider_errors` |
| Cross-tenant por candidate/run ID | security | low | org derivada de sesión/binding + queries con org + anti-oracle | 404 anti-oracle / auth test |
| Worker queda bloqueado en running | reliability | medium | timeout operacional 15m, señal, retry controlado y estado failed/partial honesto | `seo.keyword_discovery.stuck_runs` |

### Feature flags / cutover

- `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED=false` en Vercel y ops-worker al crear la capacidad.
- La route con flag OFF devuelve `disabled` sin insertar run ni llamar provider; un read de histórico
  ya existente sigue siendo posible sólo si la policy lo permite.
- Staging: flag ON para una org de prueba, sin scheduler diario, una seed y `limit=10`.
- Production: flag OFF hasta que migration, worker, spend ledger, parity, MCP y staging smoke estén
  verificados; luego ON sólo para una allowlist de orgs si el runtime ya soporta esa modalidad. Si no
  existe allowlist por org en el flag actual, mantener OFF y pedir autorización antes del rollout.
- Rollback inmediato: flag OFF en ambos runtimes + pausar/retirar la invocación del worker; los facts
  históricos permanecen y no se borran.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 0 | flag OFF; revert de contracts/route sin datos | <5 min | sí |
| 1 | flag OFF; migration reverse sólo si no hay consumidores; si hay datos, conservar tablas y revocar writes | <15 min | parcial, append-only |
| 2 | bloquear enqueue y dejar reader read-only sobre runs ya materializados | <5 min | sí |
| 3 | flag OFF en worker; no reintentar pendientes; conservar estado y costo real | <5 min | sí |
| 4 | retirar routes/tools del allowlist con parity test actualizado; no tocar snapshots | <15 min | sí |
| 5 | detener smoke/allowlist y volver flag OFF; no realizar llamadas nuevas | inmediato | sí |

### Production verification sequence

1. Ejecutar `pnpm db:generate-types` y migration en staging; consultar constraints, índices, grants y
   estados permitidos con `psql` read-only.
2. Deploy worker y Vercel con flag OFF; comprobar que una solicitud devuelve `disabled` y costo cero.
3. Activar flag en staging para una org autorizada; ejecutar GSC-only y verificar que no existe ledger
   DataForSEO.
4. Ejecutar una seed manual con un solo método/limit 10; verificar request real, `status_code`, rows,
   `provider_cost`, `actual_cost_usd`, as-of, outbox y reader.
5. Repetir la misma idempotency key y confirmar cero llamadas/costo adicional.
6. Provocar `budget_blocked`, provider error y zero results con fixtures/sandbox; comprobar estados y
   copy/error mapping sin raw provider error.
7. Verificar paridad por app, Nexa, ecosystem y MCP con la misma org; probar deny anti-oracle y scope
   write.
8. Revisar signals durante la ventana declarada; sólo después solicitar rollout productivo gradual.
9. En producción, repetir con una seed/limit 10, verificar ledger y apagar el flag inmediatamente tras
   la prueba si no existe autorización para exposición continua.

### Out-of-band coordination required

Se requiere sign-off del operador para activar `GROWTH_SEO_KEYWORD_DISCOVERY_ENABLED` en producción y
para gastar saldo DataForSEO. No se requiere Entra nuevo: el write reutiliza `efeonce.mcp.seo.write`.
Si el gateway todavía no incluye las nuevas tools, actualizar su allowlist/parity antes de declararlo
operativo. No se crean secrets nuevos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La migration crea runs, candidates y actions con constraints, índices, grants y estados cerrados;
  `pnpm db:generate-types` queda sincronizado y la verificación PG real pasa.
- [ ] `queueKeywordDiscovery` valida org/target/assignment/capability, normaliza seeds, calcula costo,
  respeta idempotency y persiste outbox + run en una transacción.
- [ ] Con flag OFF no hay provider call, insert ni costo.
- [ ] El preview calcula calls y rows usando límites explícitos; una corrida máxima no supera 10 seeds,
  3 métodos, 500 candidates ni 200 enrichments.
- [ ] Cada endpoint Labs usa el transporte canónico, `family: 'labs'`, endpoint allowlisted,
  `organizationId`, `status_code=20000` y `tag` correlacionable.
- [ ] El runner valida el spend recorder y ejecuta el gate/fence antes de gastar; el ledger coincide
  con `actual_cost_usd`.
- [ ] Sugerencias, relacionadas, ideas, dominio y overview conservan procedencia y `captured_at`;
  el parser no persiste raw payload.
- [ ] Un run `no_results` se distingue de `provider_error`; un run parcial conserva sus candidatos y
  su costo real; un budget block no ejecuta otra llamada.
- [ ] `readKeywordDiscovery` devuelve DTO server-side con paginación/filtros y marca Labs como
  `estimated_market`/`◑`; no mezcla ni sustituye GSC.
- [ ] Crear/leer/actionar un candidate nunca inserta, actualiza ni elimina `seo_keyword_set_members`.
- [ ] El mismo command/reader está disponible en app, Nexa, ecosystem y MCP, con parity tests y
  `efeonce.mcp.seo.write` para writes.
- [ ] El reader y las tools respetan anti-oracle, capability, assignment y redacción de errores.
- [ ] Existen tests para normalización, límites, idempotency, concurrencia, parser, status, costo,
  tenant boundary, no-auto-track y degradación.
- [ ] Existe signal `seo.keyword_discovery.stuck_runs` y el worker no deja una corrida running sin
  observabilidad después del umbral.
- [ ] El smoke staging de una seed/limit 10 deja evidencia de provider cost, as-of, reader, parity y
  rollback por flag.
- [ ] `pnpm task:lint --changed`, `pnpm docs:closure-check -- docs/tasks docs/epics docs/ui` y los gates
  backend proporcionales pasan sin warnings load-bearing.

## Verification

- `pnpm task:lint --task TASK-1664`
- `pnpm vitest run src/lib/growth/seo/keyword-discovery src/lib/growth/seo/__tests__/keyword-discovery-parity.test.ts`
- `pnpm worker:build-contract-gate`
- `pnpm worker:runtime-deps-gate`
- `pnpm db:generate-types`
- sanity PG real documentado en `scripts/growth/_sanity-task-1664-keyword-discovery.ts`
- smoke DataForSEO Labs acotado con saldo/entitlement aprobado
- route/lane/MCP parity y anti-oracle
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron sincronizados.
- [ ] `Handoff.md` quedó actualizado si hubo runtime evidence, bloqueo o rollout pendiente.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, costo o protocolo visible.
- [ ] Se ejecutó chequeo de impacto sobre `TASK-1661`, `TASK-1662`, `TASK-1665`, `TASK-1666` y
  `TASK-1310`.
- [ ] El estado final distingue `complete`, `code complete, rollout pendiente` u `operativamente
  bloqueado`; no se usa `complete` sólo por tener código local.

## Follow-ups

- `TASK-1665` consume el reader y construye el workbench; no debe reimplementar cost/tenant/provider.
- `TASK-1666` consume candidates seleccionados como contexto SEO y los convierte en propuesta AEO sin
  fusionar source-of-truth.
- Una corrida automática diaria requiere un task posterior con presupuesto, cadence, retention y
  ownership aprobados.

## Open Questions

- Ninguna para la implementación V1. La decisión de cron diario queda explícitamente fuera de alcance;
  no debe resolverse dentro de esta task por conveniencia.
