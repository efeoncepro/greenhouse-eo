# ADR — Content Factory Media Generation Foundry V1

> **Tipo:** Architecture Decision Record (dedicado, cross-domain)
> **Canonical spec:** `GREENHOUSE_CONTENT_FACTORY_MEDIA_GENERATION_ARCHITECTURE_V1.md`
> **Regla ADR:** `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`

## Architecture Decision 2026-07-04 — Media Generation Foundry provider-neutral

- **Status:** `Proposed` — visión aprobada como dirección; implementación deferida ("eventualmente"). No materializar contratos irreversibles sobre este ADR hasta pasar a `Accepted` con checkpoint humano.
- **Date:** 2026-07-04
- **Owner:** Content / AI Platform (ai-tooling)
- **Scope:** dominio nuevo `content.media` (generación imagen/video/audio/3D); `src/lib/media/**`, `src/app/api/ai-tools/media/**`, schema `greenhouse_media` (o extensión `greenhouse_ai`), reliability subsystem `AI & Media`. Toca costo (gasto real), Nexa (governed action), providers cloud (Vertex/OpenAI/Magnific/Higgsfield).
- **Reversibility:** `two-way` — el primitive es hoja del DAG; se puede reencuadrar sin romper finance/identity. El lock-in de proveedor es lo evitado por diseño (abstracción provider-neutral).
- **Confidence:** `high` (dirección) / `medium` (detalle de schema y audio provider, ver open questions).
- **Validated as of:** 2026-07-04 — pricing Vertex/Magnific/Higgsfield y disponibilidad de `gemini-omni-flash-preview` + `gemini-3.1-flash-lite-image` verificados en vivo contra `efeonce-group`.

### Context

Efeonce es agencia creativa; **producir media a escala es el mercado**. Greenhouse hoy tiene dos planos de contenido y le falta el tercero:

1. **Editorial/texto** — Content Factory de WordPress (TASK-1123, EPIC-019): posts/landings gobernados.
2. **Imagen interna de dev** — AI Visual Asset Generator (TASK-278): tooling de productividad del agente, no producto.
3. **(GAP) Generación de media de producto** — audio/video/imagen a escala, con los mejores modelos por modalidad, como capability gobernada.

Fuerzas en tensión: (a) *best-in-class por modalidad* está repartido entre proveedores (Seedance video, Nano Banana imagen, upscaler Magnific) → ningún proveedor único gana; (b) *costo* — Vertex directo es ~1.7–2.5× más barato que agregadores al volumen, pero los agregadores dan exploración manual y modelos que Vertex no tiene; (c) *gobernanza* — generar gasta dinero real, y Nexa debe poder operarlo sin gastar directo; (d) los invariantes del repo prohíben SDKs paralelos y exigen Full API Parity.

### Decision

Construir el **Media Generation Foundry**: un primitive canónico único en `src/lib/media/` que abstrae **modalidad** y **proveedor** detrás de un command/reader gobernado, con:

1. **Abstracción provider-neutral** — adapters delgados sobre los clientes canónicos de `src/lib/ai/*`; nunca un SDK paralelo.
2. **Provider router make-vs-buy** — Vertex/OpenAI directo como default de producción/volumen; Magnific/Higgsfield para exploración humana y ops especializadas (upscaler, lipsync, modelos no-Vertex). La política de costo está codificada en el router.
3. **Model registry versionado** — mapeo modalidad→mejores modelos como config, no hardcode.
4. **Jobs asíncronos** — state machine `queued→generating→succeeded|failed→dead_letter`, outbox + ops-worker (video/audio tardan minutos; nunca inline en Vercel).
5. **Gobernanza de costo first-class** — capability `media.generation.execute` + budget cap + `propose→confirm→execute` para Nexa (el LLM nunca gasta directo) + audit + lineage del asset.
6. **Full API Parity** — UI web, Nexa, MCP, CLI y el Content Factory editorial son consumers del MISMO primitive.

Detalle completo (schema, matriz de modelos, roadmap por slices, 4-pillar) en la spec canónica.

### Alternatives Considered

- **Lock-in single-provider (todo Vertex):** rechazado — pierde best-in-class por modalidad (Seedance, upscaler Magnific, modelos niche) y no da superficie de exploración.
- **Todo-agregador (solo Magnific/Higgsfield):** rechazado — 1.7–2.5× más caro al volumen, techo de créditos, menos gobernanza, sin billing consolidado en GCP.
- **Extender el AI Visual Asset Generator in-place:** rechazado — es tooling interno de dev (otro modelo de gobernanza/costo/consumers); se reencuadra como consumer, no se estira a producto.
- **Un SDK/adapter por proveedor suelto en cada dominio:** rechazado — viola el invariante `src/lib/ai/` (no SDKs paralelos) y Full API Parity.
- **Generación síncrona en route handlers:** rechazado — video/audio tardan 1–12 min (timeout Vercel + costo colgado); async obligatorio.

### Consequences

- **+** Best-in-class por modalidad sin lock-in; costo óptimo por routing; Nexa opera media por construcción; un solo primitive, muchos consumers.
- **+** Alimenta el Content Factory editorial, deliverables de cliente y marca desde una sola fábrica gobernada.
- **−** Complejidad de mantener adapters multi-proveedor + registry al día con catálogos que cambian rápido.
- **−** Gasto real → requiere disciplina de budget/moderación desde el día 1 (no es opcional).
- **Riesgo:** política de consent/deepfake y provider de audio primario sin resolver (open questions).

### Runtime Contract

Fuente de verdad cuando se implemente: `src/lib/media/foundry.ts` (command/reader), `greenhouse_media.generation_jobs` (aggregate + state machine), `model-registry.ts` (modelos por modalidad), capabilities `media.generation.*`, reliability signals `media.generation.{job_lag,dead_letter,budget_breach}`. Contratos API bajo `/api/ai-tools/media/**`. Mientras el Status sea `Proposed`, **no** hay runtime vigente — es dirección documentada.

### Revisit When

- El operador da green-light para implementar → mover a `Accepted` + autorar slices con `greenhouse-task-planner`.
- Cambia materialmente el pricing/disponibilidad de Vertex vs agregadores (revalidar make-vs-buy).
- Se decide el provider de audio primario o la política de consent (cierra open questions).
- Aparece un proveedor que colapsa varias modalidades a costo Vertex (podría simplificar el router).
