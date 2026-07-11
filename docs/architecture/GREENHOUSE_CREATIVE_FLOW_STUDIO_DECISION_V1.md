# ADR — Creative Flow Studio (orquestación de media node-based) V1

> **Tipo:** Architecture Decision Record (dedicado, cross-domain)
> **Historical engine spec:** `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_ARCHITECTURE_V1.md` (el motor de generación single-shot propuesto)
> **Regla ADR:** `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

> **Superseded 2026-07-11:** el runner, las plantillas y cualquier canvas creativo deben nacer en [Efeonce Creative Studio](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md), no como `content.media.flow` dentro de Greenhouse. Se preservan este análisis DAG y la evidencia del piloto como referencia histórica.

## Architecture Decision 2026-07-06 — Creative Flow Studio (capa de orquestación DAG sobre el Media Foundry)

- **Status:** `Superseded` — la propuesta Greenhouse-local queda reemplazada por la plataforma hermana Efeonce Creative Studio; no materializar este dominio en `greenhouse-eo`.
- **Date:** 2026-07-06
- **Owner:** Content / AI Platform (ai-tooling)
- **Scope:** capa nueva `content.media.flow` — orquestación visual de pipelines de generación. `src/lib/media/flow/**`, `src/app/api/ai-tools/media/flows/**`, tablas `greenhouse_media.flow_definitions` / `flow_runs` / `flow_run_nodes`, canvas React Flow bajo `ai-tooling`, reliability subsystem `AI & Media`. **Es una capa ENCIMA del Media Foundry**, no un dominio paralelo.
- **Reversibility:** `two-way` — el runner es una capa de composición, hoja del DAG; se puede reencuadrar sin romper el foundry, finance ni identity. El canvas (React Flow) es reemplazable sin tocar el motor.
- **Confidence:** `high` (dirección + reuse del foundry) / `medium` (DSL de nodos y alcance del canvas libre vs plantillas, ver open questions).
- **Depends on:** Media Foundry (motor de generación); outbox + ops-worker (TASK-773/775); asset uploader (TASK-721); capabilities registry; Nexa governed-action runtime.

### Context

El operador validó (conversación 2026-07-06) que plataformas como Higgsfield, Krea o ComfyUI exponen un **node-based editor**: un lienzo donde se arrastran nodos y se conectan con cables para armar un **flujo orquestado de IA** (imagen → video → audio → reframe), y debajo un **motor de DAG** que ejecuta el grafo llamando a modelos por paso.

Greenhouse ya tiene la mitad del problema resuelto en papel: el **Media Generation Foundry** genera **un** asset gobernado (una imagen, un video) provider-neutral, async, con gasto controlado. Lo que falta es la capa que **compone N generaciones en un pipeline reproducible**: el valor de una agencia creativa no es generar una imagen suelta, es encadenar "brief → hero image → animarla a video 9:16 → locución es-CL → reframe a 3 formatos", repetible a escala y por lote.

Ese "encadenar" es precisamente un **grafo dirigido acíclico (DAG)**. La pregunta arquitectónica no es "¿qué librería de canvas?" (eso es UI, se decide abajo) sino **cómo modelar la orquestación sin reimplementar generación, gasto ni gobernanza** — que ya viven en el foundry.

Fuerzas en tensión: (a) el canvas visual es tentador de construir primero, pero el valor real y el riesgo están en el **motor**; (b) un flow multiplica el gasto (N nodos = N× dinero real) → el budget gate del foundry, pensado para 1 generación, no basta; (c) los invariantes del repo exigen Full API Parity y prohíben identidades/SDKs paralelos; (d) embeber ComfyUI/n8n regalaría el canvas pero rompería tokenización AXIS, gobernanza de costo/identidad y Full API Parity.

### Decision

Construir el **Creative Flow Studio**: una capa de orquestación de grafos (`content.media.flow`) que compone múltiples generaciones del Media Foundry en un pipeline visual node-based. **Tres piezas nuevas**, todo lo demás es reuse:

1. **Modelo del grafo + DSL de nodos** (`src/lib/media/flow/flow-graph.ts`, `node-registry.ts`) — nodos tipados (input, generate-image, generate-video, **edit-video**, tts, upscale, reframe, **compose**, **extract-audio**, **review**, output) con **puertos tipados** (`text | image | video | audio | 3d`); validación de conexiones (no se enchufa audio a un input de imagen) y de aciclicidad (es un DAG real). El catálogo de tipos de nodo es **config versionada**, no hardcode.
2. **DAG runner** (`flow-runner.ts`) — orden topológico, ejecuta nodo por nodo, pasa el asset de salida de un nodo como *reference input* del siguiente. **Cada nodo generativo NO genera: crea un `generation_job` del foundry** (`flow_run_nodes.generation_job_id` FK → `generation_jobs.job_id`) y espera su resultado. El runner orquesta; el foundry genera, cobra, modera y enruta providers.
3. **Canvas** (`@xyflow/react` / React Flow) — nodos como componentes React tokenizados (primitives AXIS), no LiteGraph crudo. Renderiza y edita el grafo; el estado se serializa a `flow_definitions` (jsonb: grafo lógico + layout x/y separados).

Todo lo pesado (gasto, providers, budget, moderación, async, asset store) se **hereda del foundry por composición**. UI web, Nexa, MCP y CLI son consumers del **mismo runner** (Full API Parity).

### Alternatives Considered

- **Embeber ComfyUI (LiteGraph, self-host):** rechazado — canvas `<canvas>` no-React, no tokenizable AXIS; su motor gasta/persiste fuera de la gobernanza Greenhouse (sin capability, budget, audit, identity 360); sin Full API Parity; op-heavy (GPU self-host). Buena referencia de UX, mal fit de plataforma.
- **Embeber n8n:** rechazado — canvas en Vue, motor genérico de automatización que no modela media/assets/gasto gobernado; self-host operacionalmente caro; duplicaría el patrón outbox+worker que ya corremos.
- **Quedarse solo con el Media Foundry single-shot:** insuficiente — cubre "genera 1 asset", no "encadena N reproducible por lote", que es el producto de agencia.
- **DAG runner síncrono / en un route handler Vercel:** rechazado — un nodo de video tarda 1–12 min; N nodos serializados es imposible inline (timeout + costo colgado). Async obligatorio, en ops-worker.
- **Canvas libre total (lienzo en blanco estilo ComfyUI) como MVP:** rechazado para el MVP — superficie de gasto ilimitada y caos de UX; se prefiere **plantillas curadas parametrizables** primero, canvas libre detrás de `media.flow.author` en fase posterior.
- **El flow reimplementa la generación (llama providers directo):** rechazado — viola reuse; duplicaría gasto/budget/moderación/routing. El nodo generativo **debe** ser un `generation_job` del foundry.

### Consequences

- **+** El producto real de agencia (pipelines reproducibles a escala) queda modelado con **tres piezas nuevas**; gasto, providers, budget y async se heredan del foundry.
- **+** Un flow es un **contrato gobernado**: Nexa puede proponer y correr pipelines por construcción (Full API Parity), sin integración Nexa-específica.
- **+** Partial results: si un nodo tardío falla, los assets de los nodos ya `succeeded` se preservan (no se pierde lo generado/pagado).
- **−** Amplificación de gasto: un flow dispara N generaciones → el budget gate debe operar a **nivel de flow completo** (Σ nodos), no solo por nodo. Es el riesgo #1.
- **−** Complejidad del DAG runner (orden topológico, fan-out paralelo, resume, idempotencia por nodo).
- **Riesgo:** alcance del canvas (libre vs plantillas) y semántica de loops/variaciones sin cerrar (open questions).

### Model (ilustrativo — proposal)

**El primitive (capa sobre el foundry):**

```
src/lib/media/flow/                 ← Creative Flow Studio (NUEVO, capa de orquestación)
  flow-graph.ts                     ← modelo del grafo + DSL + validación de puertos y aciclicidad
  flow-runner.ts                    ← DAG runner: topo-sort, ejecuta nodos, encadena assets
  node-registry.ts                  ← catálogo versionado de tipos de nodo (config, NO hardcode)
  templates/                        ← plantillas curadas de flow (config parametrizable)
                                      cada nodo generativo → foundry.requestGeneration()
```

**Schema (ilustrativo, schema `greenhouse_media`):**

```sql
-- Definición del grafo (plantilla o flow autorado). Versionada.
CREATE TABLE greenhouse_media.flow_definitions (
  flow_id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  version          int  NOT NULL DEFAULT 1,
  graph            jsonb NOT NULL,          -- grafo lógico: nodes[] + edges[] (puertos tipados)
  layout           jsonb NOT NULL DEFAULT '{}',  -- posiciones x/y del canvas (separado del grafo lógico)
  organization_id  uuid,                    -- FK Cliente (extiende 360, NO identidad paralela)
  service_module_id uuid,                   -- FK Servicio cuando el flow produce un deliverable
  created_by       text NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Ejecución del grafo (una corrida). State machine.
CREATE TABLE greenhouse_media.flow_runs (
  run_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id          uuid NOT NULL REFERENCES greenhouse_media.flow_definitions(flow_id),
  status           text NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','running','awaiting_review','succeeded','failed','dead_letter','canceled')),
  requested_by     text NOT NULL,
  estimated_cost_usd numeric(10,4),         -- Σ estimados de los nodos (budget gate a nivel FLOW)
  actual_cost_usd  numeric(10,4),           -- Σ reales
  params           jsonb NOT NULL DEFAULT '{}',  -- overrides de la plantilla para esta corrida
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Estado por nodo de la corrida. Cada nodo generativo apunta a UN job del foundry.
CREATE TABLE greenhouse_media.flow_run_nodes (
  run_node_id       bigserial PRIMARY KEY,
  run_id            uuid NOT NULL REFERENCES greenhouse_media.flow_runs(run_id),
  node_key          text NOT NULL,          -- id del nodo dentro del grafo
  node_type         text NOT NULL,          -- del node_registry (generate-image | edit-video | compose | extract-audio | review | tts | reframe | ...)
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','waiting_deps','running','awaiting_review','succeeded','failed','skipped','rejected')),
  generation_job_id uuid REFERENCES greenhouse_media.generation_jobs(job_id),  -- ← el nodo NO genera; delega al foundry
  result_asset_id   uuid,                   -- asset producido (del job del foundry)
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Audit append-only de transiciones (trío state-machine + CHECK + audit).
CREATE TABLE greenhouse_media.flow_run_transitions (
  transition_id bigserial PRIMARY KEY,
  run_id        uuid NOT NULL REFERENCES greenhouse_media.flow_runs(run_id),
  node_key      text,                        -- null = transición del run completo
  from_status   text,
  to_status     text NOT NULL,
  actor         text NOT NULL,
  detail        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

**Regla de reuse dura:** `flow_run_nodes.generation_job_id` es el puente. El nodo generativo **crea un `generation_job` del foundry y espera su asset**; nunca llama a un provider directo. Así el gasto, budget, moderación, routing make-vs-buy y asset store se heredan sin duplicar.

### Lifecycle (state machines)

**Run del flow:**

```
   author (flow_definition)         budget gate OK (Σ nodos)
          │                                  │
          ▼                                  ▼
     ┌────────┐   ops-worker toma el run  ┌─────────┐
     │ queued │ ───────────────────────▶ │ running │
     └────────┘                          └────┬────┘
          │ cancel                    todos    │   algún nodo dead_letter
          ▼                        succeeded   ▼   (tras MAX)
    ┌──────────┐                    ┌──────────┐ ┌────────┐
    │ canceled │                    │succeeded │ │ failed │→ dead_letter
    └──────────┘                    └──────────┘ └────────┘
```

**Por nodo:** `pending → waiting_deps → running → awaiting_review → succeeded | rejected | failed | skipped`. Un nodo entra a `running` solo cuando sus dependencias (edges entrantes) están `succeeded`. `failed` transitorio hereda el retry del `generation_job`; `awaiting_review` pertenece a un nodo `review` y no dispara gasto. Terminal del run: `succeeded`, `canceled`, `dead_letter`. **Partial results:** un run `failed` preserva los `result_asset_id` de los nodos ya `succeeded`; un asset generado puede estar técnicamente disponible pero seguir como **candidato** hasta que un review humano lo apruebe o rechace.

### Governance

- **Capabilities separadas:** `media.flow.author` (crear/editar flows y plantillas), `media.flow.execute` (correr un flow — gasta), `media.flow.read` (ver flows/runs). **Author ≠ execute** (autorar no debe implicar gastar).
- **Budget gate a nivel FLOW (safety #1):** antes de encolar, el runner estima `Σ estimated_cost_usd` de todos los nodos y lo compara contra el cap por-org/por-request/por-período. Sobre el cap → `propose` requiere aprobación explícita. El budget gate del foundry (por-job) sigue operando como segunda capa, pero el gate **primario** es el agregado del flow, porque N nodos amplifican el gasto.
- **Governed action (Nexa):** el LLM NUNCA corre un flow directo. `propose → confirm → execute` — Nexa propone la plantilla + params + **costo total estimado**; muta solo en el endpoint de confirmación humana. Amplificado respecto al foundry: un flow confirma N generaciones de una vez.
- **Creative review gate:** todo template que entregue o encadene un asset generativo sensible (video, imagen hero, audio de marca) declara un nodo `review` antes de finish/publicación. `generation succeeded` no implica `creative approved`: la revisión ve el asset real, puede rechazarlo sin perder lineage y decide si el siguiente paso es otra generación, `edit-video`, `compose` determinista o `extract-audio` (audio aceptado con video rechazado, con ventanas/transientes explícitos y placa visual preservada). **Límite V2:** `compose` no puede reparar un practical diegético ni simular una actuación física hero; si cambia profundidad/oclusión/causalidad del mundo, el runner vuelve a `generate-video` o deriva a captura/3D de toma completa.
- **Moderación:** heredada del foundry por nodo (prompt/output pasan por su guard).
- **Audit append-only** de transiciones (run + por nodo) + lineage del asset (heredado del foundry).

### Surface (UI / API)

- **UI:** "Creative Flow Studio" bajo `ai-tooling` (`/ai-tools/media/flows`). Canvas React Flow con nodos tokenizados AXIS; panel de plantillas; preview por nodo; botón "estimar costo → aprobar → ejecutar"; timeline del run. Reusa Composition Shell + Adaptive Card.
- **API (Full API Parity):** `POST /api/ai-tools/media/flows` (autorar), `POST /api/ai-tools/media/flows/[id]/run` (ejecutar — command), `GET /api/ai-tools/media/flows/[id]` y `GET /api/ai-tools/media/runs/[id]` (readers), `GET /api/ai-tools/media/node-types` (registry). Lane `api/platform/app/*` first-party, `api/platform/ecosystem/*` para MCP.
- **CLI:** `pnpm ai:media flow run <template> --param ...` como consumer del mismo runner.

### 4-Pillar Score

**Safety.** Riesgo #1 = gasto amplificado (N nodos). Gates: budget gate **agregado a nivel flow** + capability `author≠execute` + `propose→confirm→execute` (Nexa confirma el flow completo) + moderación heredada por nodo + cancel aborta jobs pendientes. Blast radius: gasto + assets; dominio hoja, sin efectos en finance/payroll/identity. Residual: alcance del canvas libre sin cerrar.

**Robustness.** Idempotencia: re-run no re-cobra nodos `succeeded` (reusa el `generation_job` idempotente del foundry). Atomicidad: transición de estado + outbox event en la misma tx. Validación **previa a encolar**: puertos compatibles + grafo acíclico (no corre un grafo inválido). Race: `SELECT FOR UPDATE SKIP LOCKED` al drenar runs/nodos. Verified by state machine + audit trío.

**Resilience.** Retry/backoff heredado del job por nodo; nodo `dead_letter` → run `failed` con **partial results preservados**; resume desde el último nodo bueno; reliability signals `media.flow.run_lag`, `media.flow.dead_letter`, `media.flow.budget_breach` (steady = 0), visibles en `/admin/operations` subsystem `AI & Media`.

**Scalability.** Nodos del mismo nivel topológico corren en **paralelo** (slots del ops-worker); encolar es O(1); todo lo pesado es async. Índices: `(status, created_at)` para el drain de runs; `(run_id)` en `flow_run_nodes`. Costo lineal por reuse del routing Vertex del foundry; budget caps evitan runaway.

### Hard rules (anti-regression)

- **NUNCA** el flow reimplementa generación — cada nodo generativo es un `generation_job` del foundry (`flow_run_nodes.generation_job_id` FK). El flow **orquesta**, el foundry **genera/cobra/modera/enruta**.
- **NUNCA** ejecutar un flow sin estimar el **costo total agregado (Σ nodos)** + budget gate a nivel flow; para Nexa, NUNCA sin `propose→confirm→execute` (N generaciones = gasto amplificado).
- **NUNCA** correr el DAG inline en un route handler Vercel — corre en ops-worker; cada nodo tarda minutos.
- **NUNCA** embeber un canvas no-React estilo LiteGraph/ComfyUI ni un motor externo (n8n) — canvas `@xyflow/react` con nodos tokenizados AXIS; el motor es propio y gobernado.
- **NUNCA** hardcodear el catálogo de tipos de nodo en runtime — sale del `node_registry` versionado.
- **NUNCA** encolar un grafo sin validar puertos compatibles + aciclicidad (es un DAG, no un grafo cualquiera).
- **NUNCA** perder los assets de nodos ya `succeeded` cuando un nodo posterior falla — partial results preservados (run nodes append-only en su lineage).
- **NUNCA** inferir que un MP4/imagen `succeeded` está aprobado creativamente. El nodo `review` separa estado técnico de aceptación humana; un rechazo conserva asset, prompt, metadata y motivo para aprender sin re-cobrar a ciegas.
- **NUNCA** usar un nodo generativo para timing, orden, freeze, texto/logo **no diegético** exacto o foley si un `compose`/edit determinista sobre el asset existente resuelve el pedido. `edit-video` se reserva para píxeles/acción que no existen en el lineage. **Excepción de realidad de toma:** un practical que pertenece al mundo, o una actuación corporal cuyo significado no está presente en los frames, no se compone ni retima; exige una toma completa nueva. Si el operador pide explícitamente foley nativo de video IA, `extract-audio` puede rescatar sólo eventos aprobados de un output visual rechazado, nunca promover ese video ni sus transientes inventados.
- **NUNCA** crear identidad paralela para el flow/asset — extiende Cliente/Servicio vía FK; el asset va por el uploader canónico (TASK-721) heredado del foundry.
- **SIEMPRE** un flow nace con contrato gobernado (Full API Parity) — UI, Nexa, MCP, CLI son consumers del mismo runner.

### Open questions

- **Canvas libre vs plantillas parametrizables en el MVP.** Recomendación: MVP = plantillas curadas + params; canvas libre (`media.flow.author`) en fase posterior.
- **Semántica del DSL:** ¿solo DAG lineal + fan-out (N variaciones/formatos), o también ramas condicionales y loops? Deferir loops/condicionales.
- **Colaboración multi-usuario en el canvas (tiempo real):** deferida.
- **Plantillas de flow como assets versionados del Cliente/Servicio:** ata con el asset store; decidir al implementar.
- **Fan-out paralelo de variaciones:** ¿un nodo "×N" que expande a N jobs? Modelar en Slice 6.
- **Schema:** vive en `greenhouse_media` junto al foundry (decisión heredada de su Slice 0).

### Roadmap by slices

> Implementación **deferida** hasta green-light (Status `Proposed`) y hasta que el Media Foundry tenga su motor single-shot vivo. Al aprobar, autorar cada slice con `greenhouse-task-planner`. **El motor va primero; el canvas es la cara.**

- **Slice 0 — Fundación:** schema `flow_definitions/flow_runs/flow_run_nodes` + state machine + `node_registry` (config) + capabilities `media.flow.*`. Depende de Media Foundry Slice 0–1.
- **Slice 1 — DAG runner headless (corazón):** ejecutar por API un flow lineal de 2–3 nodos (imagen → video → audio) sobre ops-worker, cada nodo = `generation_job` del foundry. **Sin UI.** Prueba el encadenamiento real.
- **Gate transversal de templates:** modelar desde el Slice 1 los nodos no generativos `review`, `compose` y `extract-audio`: pausa humana explícita, razones de aceptación/rechazo, lineage de overlays/edits y recuperación selectiva de eventos de audio sin gasto de provider. La plantilla debe clasificar cada elemento como no diegético o practical/actuación de toma: el segundo bloquea `compose` y fuerza una nueva producción integral. No requiere canvas para probarlo.
- **Slice 2 — Gobernanza de costo:** budget gate agregado a nivel flow + `propose→confirm→execute` + reliability signals.
- **Slice 3 — Canvas (plantillas):** React Flow con plantillas curadas parametrizables — la cara del producto.
- **Slice 4 — Canvas libre:** autoría de grafos (`media.flow.author`) + validación de puertos en vivo.
- **Slice 5 — Nexa + MCP:** proponer/correr flows conversacional (propose→confirm→execute) + lane ecosystem.
- **Slice 6 — Avanzado:** fan-out paralelo de variaciones, resume desde partial results, versionado de plantillas.

### Related documents

- **Motor:** `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_DECISION_V1.md` + `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_ARCHITECTURE_V1.md` — el Media Foundry (generación single-shot que este flow orquesta).
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — UI/Nexa/MCP/CLI como consumers del mismo contrato.
- `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — governed action runtime.
- `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` + TASK-773/775 — outbox + ops-worker async.
- `GREENHOUSE_CANONICAL_PATTERNS_V1.md` — state-machine+CHECK+audit, outbox+reactive, capability⇒grant.
- Doc funcional: `docs/documentation/ai-tooling/estudio-de-flujos-creativos.md`.

### Patterns reused

| Patrón | Fuente | Cómo se aplica aquí |
|---|---|---|
| Generación gobernada single-shot | Media Foundry | Cada nodo generativo = un `generation_job` (reuse total del gasto/moderación/routing) |
| State machine + CHECK + audit | TASK-700/765 | `flow_runs` + `flow_run_nodes` transiciones + audit append-only |
| Outbox + reactive + dead_letter | TASK-771/773 | run async, resultado → señal de lag/dead_letter |
| Cloud Scheduler + ops-worker | TASK-775 | drain de runs/nodos (no Vercel cron) |
| Provider/model registry versionado | AEO grader / Media Foundry | `node_registry` tipos de nodo, no hardcode |
| Governed action `propose→confirm→execute` | Nexa (TASK-1094) | correr un flow desde Nexa sin gasto directo del LLM |
| Full API Parity (1 primitive, N consumers) | `FULL_API_PARITY_DECISION` | UI/Nexa/MCP/CLI = clients del mismo runner |

### Revisit When

- El operador da green-light para implementar → mover a `Accepted` + autorar slices con `greenhouse-task-planner` (después del Media Foundry).
- El Media Foundry pasa a `Accepted`/implementado → desbloquea Slice 0–1 de este ADR.
- Se decide canvas libre vs plantillas, o se necesita semántica de loops/condicionales (cierra open questions).
