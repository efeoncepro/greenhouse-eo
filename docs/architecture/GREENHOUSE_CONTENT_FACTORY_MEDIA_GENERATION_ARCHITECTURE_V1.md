# Greenhouse Content Factory — Media Generation Foundry V1

> **Tipo de documento:** Spec de arquitectura (proposal — visión, no implementada)
> **Version:** 1.0
> **Creado:** 2026-07-04 por Claude (visión operador Julio Reyes)
> **Ultima actualizacion:** 2026-07-04
> **Status:** `superseded as Greenhouse runtime` — la implementación NO comenzó y ahora corresponde a [Efeonce Creative Studio](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md). Este documento es evidencia histórica de principios, no especificación ejecutable en este repositorio.
> **Owner:** Content / AI Platform (ai-tooling)
> **Domain boundary:** `content.media` — generación multimodal (imagen / video / audio / 3D). Hermano del plano editorial `content.editorial` (TASK-1123, EPIC-019).
> **Validated as of:** 2026-07-04 (pricing Vertex/Magnific/Higgsfield + disponibilidad de modelos verificados en vivo esta fecha)

---

## 1. Executive summary

Efeonce es una agencia creativa: **producir media a escala ES el mercado**. Hoy Greenhouse genera imágenes solo como *tooling interno de dev* (AI Visual Asset Generator, TASK-278) y contenido editorial de texto vía el Content Factory de WordPress (TASK-1123). Falta el tercer plano: una **fábrica de media de producto** que conecte los mejores modelos por modalidad (imagen, video, audio, 3D) detrás de un **contrato programático gobernado, provider-neutral**.

La decisión: construir el **Media Generation Foundry** — un primitive canónico único en `src/lib/media/` que abstrae *modalidad* y *proveedor* detrás de un command/reader estable, con **routing make-vs-buy** (Vertex/OpenAI directo para producción/volumen; Magnific/Higgsfield para exploración humana y ops especializadas como upscaling), **jobs asíncronos** (outbox + reactive + state machine, porque video/audio tardan minutos), y **gobernanza de costo** (generar gasta dinero → capability + budget guard + `propose→confirm→execute`). UI web, Nexa, MCP, CLI y el Content Factory editorial son todos **consumers del mismo primitive** (Full API Parity).

**4-pillar (una línea):** Safety = capability + budget cap + confirm-before-spend + content moderation; Robustness = job idempotente + atomic outbox + provider fallback; Resilience = dead_letter + reliability lag signal + GCS persistence; Scalability = async worker + provider routing por costo (Vertex ~1.7–2.5× más barato que agregadores al volumen).

## 2. Use cases

- **Deliverables de cliente Globe** (aerolíneas, bancos, manufactura): sets de imágenes de campaña, videos cortos, locuciones multi-idioma, versiones/reframes por formato.
- **Alimentar el Content Factory editorial** (TASK-1123): un post/landing WordPress pide su hero image, ilustraciones inline o un video embebido → el editorial plane invoca al media foundry por contrato, no reimplementa generación.
- **Marca Efeonce y sitio público** (`efeonce-web`, `efeonce-think`): assets de marketing, OG images, ilustraciones.
- **Producción a escala**: batches (N variaciones, N formatos, N idiomas de locución) con costo predecible y trazable.
- **Ops especializadas**: upscaling/enhancement (upscaler diferenciado de Magnific), quitar fondo, vectorizar (raster→SVG), lipsync, relight.
- **Operación conversacional (Nexa)**: "genérame 3 variantes de este banner en 9:16" → Nexa propone, humano confirma el gasto, el foundry ejecuta.

## 3. Model

### 3.1 El primitive canónico

```
src/lib/media/                      ← Media Generation Foundry (NUEVO, canónico)
  foundry.ts                        ← command/reader públicos: requestGeneration(), getJob()
  provider-router.ts                ← elige provider por (modalidad, tier, política de costo, interactivo/batch)
  registry/
    model-registry.ts               ← registry versionado modalidad→modelos (config, NO hardcode)
  jobs/
    generation-job.ts               ← state machine del job
  providers/                        ← adapters DELGADOS sobre los clientes canónicos de src/lib/ai/*
    vertex.ts   (Gemini Omni Flash, Veo 3.1, Nano Banana Pro/2 Lite, Gemini Live)
    openai.ts   (GPT Image, Sora 2 vía API cuando aplique)
    magnific.ts (aggregator: upscaler, catálogo amplio, SVG, audio)
    higgsfield.ts (aggregator: Seedance, presets, lipsync, 3D)
```

**Regla dura:** los adapters de `providers/*` son *delgados* y llaman a los clientes canónicos existentes de `src/lib/ai/*` (`google-genai.ts`, `openai.ts`, `anthropic.ts`, `image-generator.ts`). **NUNCA** instancian un SDK LLM/media paralelo ni resuelven secretos client-side. Extiende, no paraleliza (`GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` §invariantes providers).

### 3.2 Schema (ilustrativo — proposal, schema `greenhouse_ai` / nuevo `greenhouse_media`)

```sql
-- Job de generación (aggregate raíz, state machine). PG = OLTP; BQ downstream vía outbox.
CREATE TABLE greenhouse_media.generation_jobs (
  job_id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  modality         text NOT NULL,          -- image | video | audio | model3d | edit
  operation        text NOT NULL,          -- generate | upscale | remove_bg | vectorize | reframe | lipsync | tts | music | sfx
  model_slug       text NOT NULL,          -- resuelto desde model_registry (versionado)
  provider         text NOT NULL,          -- vertex | openai | magnific | higgsfield
  status           text NOT NULL DEFAULT 'queued'
                     CHECK (status IN ('queued','generating','succeeded','failed','dead_letter','canceled')),
  requested_by     text NOT NULL,          -- user_id / agent principal
  organization_id  uuid,                   -- FK Cliente/tenant (extiende 360, NO identidad paralela)
  service_module_id uuid,                  -- FK Servicio cuando el asset es deliverable
  prompt           text,
  params           jsonb NOT NULL DEFAULT '{}',   -- duration, aspectRatio, resolution, references, seeds...
  estimated_cost_usd numeric(10,4),        -- del simulador antes de ejecutar (budget gate)
  actual_cost_usd  numeric(10,4),          -- real post-ejecución
  result_asset_id  uuid,                   -- FK al asset canónico (uploader TASK-721)
  parent_asset_id  uuid,                   -- lineage: edit/upscale deriva de otro asset
  error_code       text,
  retries          int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Audit append-only de transiciones (anti-UPDATE/DELETE trigger). Trío state-machine + CHECK + audit.
CREATE TABLE greenhouse_media.generation_job_transitions (
  transition_id bigserial PRIMARY KEY,
  job_id        uuid NOT NULL REFERENCES greenhouse_media.generation_jobs(job_id),
  from_status   text,
  to_status     text NOT NULL,
  actor         text NOT NULL,
  detail        jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

El **asset resultante** se persiste con el uploader canónico (`GreenhouseFileUploader` + `/api/assets/private`, patrón TASK-721) y su **lineage** (prompt + model + provider + cost + references + `parent_asset_id`) es append-only.

### 3.3 Model registry — "los mejores modelos por modalidad" (verificado 2026-07-04)

Config versionada (como el registry de providers del AEO grader), **no** hardcode. Curado por tier de calidad + costo:

| Modalidad | Producción (tier SOTA) | Rápido/barato | Exploración / especialidad |
|---|---|---|---|
| **Imagen** | Nano Banana Pro (`gemini-3-pro-image-preview`, edit/marca) · GPT 2 (texto/infografía/UI) · Recraft V4.1 (T2I) | **Nano Banana 2 Lite** (`gemini-3.1-flash-lite-image`, ~$0.034/img, ~4s) | Seedream 4.5/5, Flux.2, Imagen 4 (vía agregador) |
| **Upscale / enhance** | — | — | **Magnific upscaler** (diferenciado, no hay equivalente directo) |
| **Video** | **Seedance 2.0** (SOTA: audio nativo, lipsync, 52 cámaras) · **Veo 3.1** (Vertex, hasta 4K) | **Gemini Omni Flash** (`gemini-omni-flash-preview`, $0.10/s, 720p, refs+audio) | Kling 2.5/3.0, Sora 2, Wan 2.x (vía agregador) |
| **Lipsync / avatar** | — | — | Omni Human 1.5, Veed Fabric, Kling 2.6 (Higgsfield/Magnific) |
| **Audio (TTS/música/SFX)** | Gemini Live 2.5 (audio nativo) | — | Magnific audio, Higgsfield audio; **ElevenLabs candidato** (open question) |
| **3D** | — | — | Higgsfield `generate_3d`, Magnific `models3d` (deferred) |

> ⚠️ **Gotcha de región (Vertex):** `gemini-omni-flash-preview` y `gemini-3.1-flash-lite-image` viven solo en `us-central1` / endpoint `global` — **NO en `us-east4`** (región de la infra Greenhouse). Todo llamado Vertex de estos modelos apunta a `us-central1`/`global`. Detalle: memoria `reference_vertex_gemini_omni_nanobanana_lite`.

## 4. Lifecycle (job state machine)

```
             requestGeneration() + budget gate OK
                        │
                        ▼
                   ┌─────────┐   ops-worker toma el job    ┌────────────┐
                   │ queued  │ ─────────────────────────▶ │ generating │
                   └─────────┘                             └─────┬──────┘
                        │ cancel                        provider OK │  provider FAIL
                        ▼                                    ▼      ▼
                  ┌──────────┐                        ┌──────────┐ ┌────────┐
                  │ canceled │                        │succeeded │ │ failed │
                  └──────────┘                        └──────────┘ └───┬────┘
                                                                        │ retries ≥ MAX
                                                                        ▼
                                                                  ┌────────────┐
                                                                  │ dead_letter│
                                                                  └────────────┘
```

Terminal: `succeeded`, `canceled`, `dead_letter`. `failed` es transitorio (retry con backoff). Asíncrono porque video/audio tardan 1–12 min — **NUNCA** inline en un route handler Vercel (timeout + costo colgado).

## 5. Governance

- **Capability granular:** `media.generation.execute` (ejecutar), `media.generation.read` (ver jobs/assets), `media.registry.manage` (curar el registry). NUNCA reusar `ai.admin` catch-all.
- **Budget gate (safety de costo, first-class):** antes de ejecutar, `simulateCost()` estima USD; se compara contra cap por-org / por-request / por-período; sobre el cap → `propose` requiere aprobación explícita. El gasto se registra en `actual_cost_usd`.
- **Governed action runtime (Nexa):** el LLM NUNCA ejecuta una generación directa. Loop `propose → confirm → execute` — Nexa propone el job + costo estimado; muta solo en el endpoint de confirmación humana (`KNOWLEDGE_NEXA_AGENT_INVARIANTS`).
- **Content moderation:** prompts + outputs pasan por la política de moderación del provider + un guard propio (no generar marca de cliente sin autorización, no deepfakes de personas reales sin consent, etc.). Open question §16.
- **Audit append-only** de transiciones + lineage del asset.

## 6. Cost / observability

**Make-vs-buy por modalidad (unidad: 1 video 8s 720p, verificado 2026-07-04):**

| Vía | Costo efectivo | Modelo de cobro | Rol |
|---|---|---|---|
| **Vertex directo** (Gemini Omni Flash) | **$0.80** ($0.10/s) | pay-per-use | **Default producción / volumen / programático** |
| Higgsfield (Ultra) | ~$1.32–1.72 | créditos prepagados | Exploración humana, Seedance, lipsync, 3D |
| Magnific (Premium+) | ~$1.50–2.00 | créditos prepagados | Exploración humana, **upscaler**, catálogo amplio, SVG |

Vertex directo es **~1.7–2.5× más barato** al volumen (es el precio crudo de Google, sin markup de reventa). Los agregadores ganan cuando (a) el modelo no está en Vertex, (b) es exploración manual con suscripción ya pagada (costo hundido), o (c) es una op diferenciada (upscaler Magnific). El **provider-router codifica esta política**.

**Reliability signals (steady = 0):** `media.generation.job_lag` (jobs `queued`/`generating` > umbral), `media.generation.dead_letter` (agotaron retries → humano), `media.generation.budget_breach` (gasto sobre cap). Visibles en `/admin/operations`, subsystem `AI & Media`.

## 7. Surface (UI / API)

- **UI:** un "Media Studio" bajo `ai-tooling` (`/ai-tools/media` o `/agency/*` para deliverables) — brief → modelo → preview → aprobar/gastar → asset en librería. Reusa Composition Shell + Adaptive Card.
- **API (Full API Parity):** `POST /api/ai-tools/media/generate` (command), `GET /api/ai-tools/media/jobs/[id]` (reader), `GET /api/ai-tools/media/registry` (modelos disponibles). Lane `api/platform/app/*` para first-party, `api/platform/ecosystem/*` para MCP downstream.
- **CLI:** extender `pnpm ai:image` a `pnpm ai:media` (image/video/audio) como consumer del mismo command.

## 8. Conversión / interacciones

- **Content Factory editorial (TASK-1123)** invoca el foundry por contrato para los assets de un post/landing (hero, ilustraciones, video embebido) — no reimplementa generación.
- **AI Visual Asset Generator (TASK-278)** queda como el *carril de dev interno* (productividad del agente); su path de imagen se re-expresa como un consumer del foundry cuando la generación de producto lo justifique (no se borra; convive).
- **Asset store canónico** (TASK-721) es el destino; los assets extienden Cliente/Servicio/Space vía FK.
- **Nexa** opera todo por construcción (Full API Parity) — no se construye integración Nexa-específica.

## 9. Metrics

- Costo por asset por modalidad (real vs estimado — drift < 10%).
- Throughput (assets/día), latencia P50/P95 por modalidad.
- % jobs `succeeded` vs `failed`/`dead_letter`.
- Ahorro por routing (USD evitados usando Vertex vs agregador al volumen).
- Adopción: assets consumidos por el editorial plane, por deliverables de cliente, por marca.

## 10. Dependencies & impact

- **Depends on:** clientes canónicos `src/lib/ai/*`; Vertex (`aiplatform` ya ENABLED, IAM `aiplatform.user`, bucket GCS salida, región `us-central1`); conectores/API Magnific + Higgsfield; asset uploader (TASK-721); outbox + ops-worker (TASK-773/775); capabilities registry; Nexa governed-action runtime.
- **Impacts:** Content Factory editorial (nuevo consumer), AI Visual Asset Generator (re-encuadre), ai-tooling credits/billing, `/admin/operations` (nuevos signals), FEATURE_FLAG_STATE_LEDGER (flag nuevo).
- **Files owned (futuros):** `src/lib/media/**`, `src/app/api/ai-tools/media/**`, `migrations/*media*`, `src/lib/reliability/queries/media-*.ts`.

## 11. Roadmap by slices

> Implementación **deferida** hasta green-light del operador (Status Proposed). Al aprobar, autorar cada slice con `greenhouse-task-planner`.

- **Slice 0 — Fundación & registry:** schema `generation_jobs` + state machine + model registry (config) + capability `media.generation.*`. Sin providers aún.
- **Slice 1 — Imagen directa (Vertex):** Nano Banana 2 Lite + Pro como primer provider; command + reader + budget gate + asset store. Camino más barato y de menor riesgo.
- **Slice 2 — Async video:** job worker (ops-worker) + Gemini Omni Flash / Veo 3.1 (Vertex, `us-central1`) + GCS output + reliability signals.
- **Slice 3 — Aggregators:** adapters Magnific (upscaler + catálogo) + Higgsfield (Seedance + lipsync) detrás del router.
- **Slice 4 — Audio:** TTS/música/SFX (Gemini Live + agregadores; evaluar ElevenLabs).
- **Slice 5 — Surface + Nexa:** Media Studio UI + operación conversacional (propose→confirm→execute).
- **Slice 6 — Editorial bridge:** el Content Factory de WordPress consume el foundry por contrato.

## 12. Hard rules (anti-regression)

- **NUNCA** instanciar un SDK LLM/media paralelo dentro del foundry ni de un dominio — los adapters llaman a los clientes canónicos de `src/lib/ai/*`; el secreto se resuelve server-side vía `*_SECRET_REF`.
- **NUNCA** ejecutar una generación (que gasta dinero) sin capability + budget gate + audit; para Nexa, NUNCA sin `propose→confirm→execute` (el LLM no gasta directo).
- **NUNCA** correr generación de video/audio inline en un route handler Vercel — es async vía job + outbox + ops-worker.
- **NUNCA** apuntar Gemini Omni Flash / Nano Banana 2 Lite a `us-east4` (404) — solo `us-central1` / `global`.
- **NUNCA** crear una identidad paralela para el asset — extiende Cliente/Servicio/Space vía FK; el asset va por el uploader canónico (TASK-721).
- **NUNCA** hardcodear el mapeo modalidad→modelo en runtime — sale del `model_registry` versionado.
- **SIEMPRE** registrar el costo estimado (pre) y real (post) del job; drift > 10% dispara señal.
- **SIEMPRE** que el foundry gane una capability nueva, nace con contrato gobernado (Full API Parity) — UI, Nexa, MCP, CLI son consumers del mismo primitive.

## 13. Related documents

- ADR: `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_DECISION_V1.md` (la decisión).
- **Capa de orquestación:** `GREENHOUSE_CREATIVE_FLOW_STUDIO_DECISION_V1.md` — el Creative Flow Studio compone N generaciones de este foundry en un pipeline visual node-based (DAG). Cada nodo generativo del flow = un `generation_jobs` de este primitive; el flow orquesta, el foundry genera.
- `GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — carril de imagen interno de dev (semilla, convive).
- `docs/tasks/in-progress/TASK-1123-*.md` — Content Factory editorial (plano hermano, EPIC-019).
- `GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — UI/Nexa/MCP como consumers del mismo contrato.
- `GREENHOUSE_NEXA_ARCHITECTURE_V1.md` + `KNOWLEDGE_NEXA_AGENT_INVARIANTS.md` — governed action runtime.
- `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` + TASK-773/775 — outbox + ops-worker async.
- Memoria `reference_vertex_gemini_omni_nanobanana_lite` — IDs + gotcha de región.

## 14. Patterns reused

| Patrón | Fuente | Cómo se aplica aquí |
|---|---|---|
| State machine + CHECK + audit | TASK-700/765 | `generation_jobs` transiciones + audit append-only |
| Outbox + reactive + dead_letter | TASK-771/773 | jobs async, resultado → BQ + señal de lag |
| Cloud Scheduler + ops-worker | TASK-775 | drain de jobs de generación (no Vercel cron) |
| Canonical asset uploader | TASK-721 | persistencia + lineage del asset generado |
| Provider registry versionado | AEO grader (`ai-visibility`) | model_registry modalidad→modelo, no hardcode |
| Governed action `propose→confirm→execute` | Nexa (TASK-1094) | generación desde Nexa sin gasto directo del LLM |
| Full API Parity (1 primitive, N consumers) | `FULL_API_PARITY_DECISION` | UI/Nexa/MCP/CLI/editorial = clients del foundry |

## 15. Smoke tests (cuando se implemente)

- Generar imagen Nano Banana 2 Lite en `us-central1` → asset en store + `actual_cost_usd ≈ estimated`.
- Job de video sobre budget cap → estado `proposed`, NO ejecuta hasta confirmación.
- Provider Vertex 500 → retry con backoff → tras MAX → `dead_letter` + señal.
- Nexa pide generación → `propose` con costo; sin confirmación humana no muta nada.
- Apuntar Gemini Omni Flash a `us-east4` en test → falla claro (guard de región), no 404 silencioso.

## 16. Open questions

- **Audio provider primario:** ¿ElevenLabs (calidad TTS/voces líder) vs Gemini Live vs agregadores? No decidido — evaluar calidad es-CL + costo + licenciamiento de voz.
- **Consent / deepfake policy:** generar/lipsync de personas reales (ejecutivos de cliente) requiere política de consentimiento + guard. No decidido.
- **Créditos vs pay-per-use accounting:** cómo reconciliar el gasto de agregadores (créditos prepagados) contra Finance/costo por cliente. Ata con `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1` (Tool × Client × Period).
- **¿Schema `greenhouse_media` nuevo vs extender `greenhouse_ai`?** — decidir en Slice 0.
- **3D:** ¿modalidad de primera clase o deferred indefinido? Deferred por ahora.

## 17. 4-Pillar Score

### Safety
- **Qué puede salir mal:** gasto descontrolado (loop de generación), contenido prohibido (deepfake, marca sin autorización), un agente gastando sin humano.
- **Gates:** capability `media.generation.execute` + budget cap por-org/request/período + `propose→confirm→execute` (LLM no gasta) + moderación de prompt/output + audit.
- **Blast radius si falla:** acotado a gasto + un asset; sin efectos en finance/payroll/identity (dominio hoja).
- **Verified by:** budget gate + capability guard + señal `budget_breach`.
- **Residual risk:** política de consent/deepfake sin definir (open question).

### Robustness
- **Idempotencia:** job con clave idempotente (mismo request no duplica gasto); retry no re-cobra un `succeeded`.
- **Atomicidad:** transición de estado + outbox event en la misma tx; asset se linkea solo tras persistir.
- **Race protection:** `SELECT FOR UPDATE SKIP LOCKED` al tomar jobs en el worker.
- **Constraint coverage:** CHECK de status; FK a asset/org/servicio.
- **Verified by:** state machine + audit trio.

### Resilience
- **Retry policy:** backoff exponencial hasta MAX; `failed` transitorio.
- **Dead letter:** `dead_letter` tras MAX → humano.
- **Reliability signal:** `job_lag`, `dead_letter`, `budget_breach` (steady 0).
- **Audit trail:** transiciones append-only + lineage del asset.
- **Recovery:** re-encolar desde `dead_letter`; provider fallback (Vertex→agregador) para modelos con equivalente.

### Scalability
- **Hot path:** encolar es O(1); generación es async, no bloquea request.
- **Index coverage:** `(status, created_at)` para el drain; `(organization_id, created_at)` para reads.
- **Async paths:** todo el pesado corre en ops-worker (paralelismo por slots), no en Vercel.
- **Cost at 10x:** routing a Vertex directo mantiene costo lineal ~1.7–2.5× bajo agregadores; budget caps evitan runaway.
- **Pagination:** reads de jobs/assets paginados por `created_at`.

## 18. Changelog

| Date | Version | Author | Change |
|---|---|---|---|
| 2026-07-04 | 1.0 | Claude (visión operador) | Spec inicial (proposal). Pricing + disponibilidad de modelos verificados en vivo. |
