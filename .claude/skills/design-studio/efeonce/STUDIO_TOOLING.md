# STUDIO_TOOLING — el pipeline real de ejecución

> Lo que vuelve a `design-studio` un **estudio** y no un PDF: cablea las herramientas
> conectadas en el loop **idear → dirigir → producir → auditar → iterar**. Reverifica
> capacidades de cada modelo/MCP (cambian por mes — ver `SOURCES.md`).

## El loop y qué corre cada paso

| Paso | Herramienta / skill | Qué hace |
|---|---|---|
| **Idear / dirigir** | esta skill (`../modules/`) + `templates/` | concepto, KV, brief, mood board, selección de herramienta |
| **Producir asset UI Greenhouse** | `greenhouse-ai-image-generator` (CLI `pnpm ai:image`) | icono/empty state/banner/hero con helper canónico + DESIGN.md + QA transparencia |
| **Producir imagen marketing/concept** | modelos IA vía MCP (ver matriz) | KV, hero, poster, editorial, mood |
| **Logo real de tercero** | `greenhouse-digital-brand-asset-designer` | vectorizar/variantes desde fuente oficial |
| **Video / motion** | `higgsfield-*` + `social-media-studio` (motion) + modelos video | KV en movimiento, video social |
| **Craft fino de tipo** | `typography-design` | peso/variante/escala/tracking/leading |
| **Chart / infografía** | `dataviz-design` | encoding de datos |
| **Infografía editorial exacta** | SVG source + delivery SVG o raster medido | aplicar `../../content-marketing-studio/references/deterministic-editorial-infographics.md`; para Efeonce sumar `../../content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`; design-studio dirige composición |
| **Auditar** | `../modules/05` + `templates/key-visual-audit-scorecard.md` | rúbrica puntuada del KV |
| **Handoff / design system** | Figma (MCP) | entregar a diseño/dev, tokens, componentes |

## Router de producción (elige la mano correcta)

- **¿El asset vive en la UI de Greenhouse?** → `greenhouse-ai-image-generator` (SIEMPRE; impone
  helper + DESIGN.md/AXIS + transparencia). design-studio solo dirige el concepto/prompt.
- **¿Es imagen de marketing/marca (KV, hero, poster, social)?** → elige el modelo por tarea
  (matriz en `SOURCES.md`): texto-en-imagen → Nano Banana Pro / Ideogram; estética/concepto →
  Midjourney; vector/logo escalable → Recraft; realismo/cámara → FLUX.2; realista diario →
  GPT Image 2; divergencia barata → Seedream 5 Lite; material/color/atmósfera o región semántica
  → Seedream 5 Pro; licencia limpia + Photoshop → Adobe Firefly. Si una campaña requiere varias
  fortalezas, cargar `../modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` y diseñar una secuencia
  de manos con anchor/handoff, no un torneo de modelos.
- **¿Es video/motion?** → Seedance (control por referencias) / Veo (broadcast) / Kling (económico) /
  Gemini Omni (still→motion + edición conversacional) / Higgsfield; producción y formato social →
  `social-media-studio`. Un clip de duración mínima sólo valida el endpoint: el release profesional exige
  master + cutdown por ratio, end card, poster, audio/captions y QA temporal.
- **¿Es un logo real de tercero?** → `greenhouse-digital-brand-asset-designer`.
- **¿El craft final lo hace una persona** (retoque, ilustración propietaria, print)? → handoff con
  `templates/asset-delivery-spec.md` + referencias; no fuerces IA.

## MCP conectados (reverificar capacidades)

- **Higgsfield**: `generate_image` / `generate_video` / `generate_audio`, `models_explore(recommend)`,
  `upscale_*`, `outpaint_image`, `reframe`, `remove_background`, `virality_predictor`, avatares/UGC.
- **Adobe (Firefly)**: generación commercially-safe + edición (crop, adjust, remove-bg, vectorize,
  generative expand) — útil para retoque de foto real y assets con licencia limpia.
- **Magnific**: upscale/enhance de alta calidad (requiere auth del server — reverificar).
- **Figma**: design system, get/generate design, handoff dev, variables/tokens.
- **`greenhouse-ai-image-generator`**: la mano canónica para todo asset que aterrice en el portal.

## Vertex (efeonce-group) — modelos Google disponibles

Nano Banana Pro / Nano Banana 2 Lite / Imagen 4 / Gemini Omni corren en **Vertex del proyecto
`efeonce-group`** (ver memoria `reference_vertex_gemini_omni_nanobanana_lite`). Gotcha: algunos
solo en `us-central1`/`global`, NO `us-east4`. Los clientes LLM canónicos viven en `src/lib/ai/*`
(no instanciar SDK paralelo en un dominio).

## Gasto gobernado

Separar dos registros que nunca deben confundirse:

- **costo interno del provider/compute:** input confidencial para routing, unit economics y margen;
- **Studio Credits:** unidad client-facing de operaciones generativas gobernadas, provider-neutral.

Antes de ejecutar, clasifica la `capability_class`, prepara un estimate en la rate version vigente, reserva el
máximo aprobado y registra attempts. El settlement se decide por outcome y refund policy; un retry técnico no
genera doble cargo. Dirección, moodboard, curaduría, QA, layout, composición, copy, export y finishing
determinístico cuestan capacidad/gobierno, pero devengan **0 Studio Credits**. Derechos y pass-through van en
línea separada. No hardcodees precio por crédito, banda, equivalencia vendor→crédito ni tabla por pieza en esta
skill: el canon es `docs/business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md`.

## Autenticidad + gobernanza IA

Gana lo humano/imperfecto/serializado (tendencia 2026). La IA **acelera**, no reemplaza el juicio
de marca. Contenido IA que un espectador confundiría con real → etiquetar si el contexto lo exige
("ante la duda, revela"). Cura todo output contra marca Efeonce antes de que salga.
