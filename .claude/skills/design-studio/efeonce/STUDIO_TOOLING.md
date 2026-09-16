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
| **Video / motion** | provider route gobernado + `social-media-studio` (motion) | KV en movimiento, video social, cutdowns y mastering |
| **Craft fino de tipo** | `typography-design` | peso/variante/escala/tracking/leading |
| **Chart / infografía** | `dataviz-design` | encoding de datos |
| **Infografía editorial exacta** | SVG source + delivery SVG o raster medido | aplicar `../../content-marketing-studio/references/deterministic-editorial-infographics.md`; para Efeonce sumar `../../content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`; design-studio dirige composición |
| **Auditar** | `../modules/05` + `templates/key-visual-audit-scorecard.md` | rúbrica puntuada del KV |
| **Handoff / design system** | Figma (MCP) | entregar a diseño/dev, tokens, componentes |

## Router de producción (elige la mano correcta)

- **¿El asset vive en la UI de Greenhouse?** → `greenhouse-ai-image-generator` (SIEMPRE; impone
  helper + DESIGN.md/AXIS + transparencia). design-studio solo dirige el concepto/prompt.
- **¿Es imagen de marketing/marca (KV, hero, poster, social)?** → elige el modelo por tarea
  (matriz en `SOURCES.md`): volumen GCP → Gemini 3.1 Flash Lite Image; contexto/multirreferencia →
  Gemini 3.1 Flash Image; acabado premium → Gemini 3 Pro Image; texto conceptual → Ideogram;
  vector escalable → Recraft; realismo/cámara → FLUX.2; composición/máscara → GPT Image 2;
  divergencia barata → Seedream 5 Lite; material/color/atmósfera o región semántica → Seedream 5 Pro
  (ambos con `pnpm ai:fal`, CLI out-of-band; `pnpm ai:fal --list` es gratis, toda corrida gasta).
  Midjourney, Firefly, Higgsfield y Magnific son workbenches `watch/out-of-band`, no rutas enterprise
  allowlisted hasta completar términos, schemas y evals. Si una campaña requiere varias
  fortalezas, cargar `../modules/12_HYBRID_IMAGE_CAMPAIGN_PRODUCTION.md` y diseñar una secuencia
  de manos con anchor/handoff, no un torneo de modelos.
- **¿Hay que recomponer, retocar o animar por partes un KV ya aprobado?** → no regeneres:
  `pnpm ai:fal --capability seedream5-pro-layerize --image kv.png --out-dir ./capas` devuelve hasta 16 capas
  con alfa real + `layers.json`. Es dirección de arte sobre capas; el logo oficial y el copy final siguen
  saliendo del vector y de la composición determinística.
- **¿Es video/motion?** → Seedance 2.5 (Fal: T2V/I2V/R2V, audio y referencias multimodales) o Seedance 2.0 (control por referencias, Fal) / Minimax H3 (Fal, conectado 2026-09-16: Max Turbo exploración barata · Max `camera-controls` cámara sobre imagen congelada · base 2K/4K) / Veo 3.1 (premium, Vertex) /
  PixVerse V6 (escala, Fal) / Kling 3 (4K/specialist, Fal) / Gemini Omni (canary, Vertex);
  Seedance y H3 se operan con `pnpm ai:fal` y el endpoint (Seedance 2.5 larga · 2.0 base 4K · H3 Turbo exploración) se elige en
  `motion-design-studio/workflows/engine-selection-by-fidelity-contract.md`;
  producción y formato social →
  `social-media-studio`. Un clip de duración mínima sólo valida el endpoint: el release profesional exige
  master + cutdown por ratio, end card, poster, audio/captions y QA temporal.
- **¿Es un logo real de tercero?** → `greenhouse-digital-brand-asset-designer`.
- **¿Es retoque de una zona de una imagen que ya existe?** → el CLI canónico ya trae máscara:
  `pnpm ai:image --image base.png --mask mask.png --prompt "…" --out out.png` (la máscara marca en
  **transparente** lo que se reemplaza). **Editar no abarata** — en `low` cuesta ~2,3× una generación,
  porque el modelo devuelve la imagen completa y la base entra como input; el `usage` que imprime el
  CLI es la fuente real de costo. Y el recorte de fondo de un asset existente va por
  `pnpm ai:image:rmbg` (matting local, costo cero), nunca pidiéndoselo al modelo. Detalle y evidencia:
  `greenhouse-ai-image-generator` + `ai-generations/2026-09-16_gpt-image-2-5-usage-baseline/`.
- **¿El craft final lo hace una persona** (retoque, ilustración propietaria, print)? → handoff con
  `templates/asset-delivery-spec.md` + referencias; no fuerces IA.

## Workbenches conectados (watch/out-of-band)

Conectado no significa `production_approved`. Estas manos sólo sirven para exploración o producción asistida
fuera del router hasta registrar endpoint/modelo exacto, términos, residencia/retención y bake-off:

- **Higgsfield**: `generate_image` / `generate_video` / `generate_audio`, `models_explore(recommend)`,
  `upscale_*`, `outpaint_image`, `reframe`, `remove_background`, `virality_predictor`, avatares/UGC.
- **Adobe (Firefly)**: generación/edición (crop, adjust, remove-bg, vectorize, expand); su aptitud comercial
  depende de términos e indemnidad revisados para el endpoint y cliente, no de una etiqueta genérica.
- **Magnific**: upscale/enhance de alta calidad (requiere auth del server — reverificar).
- **Figma**: design system, get/generate design, handoff dev, variables/tokens.
- **`greenhouse-ai-image-generator`**: la mano canónica para todo asset que aterrice en el portal.

## Política de providers y portafolio enterprise

- **Google nativo → Google Cloud/Vertex directo**, nunca Fal: Gemini Image, Veo, Gemini Omni, Lyria,
  Gemini/Chirp TTS, Chirp STT y Translation.
- **Fal → sólo modelos no-Google y utilidades allowlisted.**
- **OpenAI → directo.**
- **Post/composición exacta → runtime determinístico/humano.**

Antes de elegir, cargar `../modules/14_ENTERPRISE_CREATIVE_MODEL_ROUTING.md` y leer el registry
`docs/architecture/EFEONCE_CREATIVE_STUDIO_CAPABILITY_REGISTRY_V1.json`. Imagen 4 está deprecado.
Seedance 2.5 está expuesto por Fal, pero permanece gated en Globe: no ofrecerlo como ruta comercial hasta
que exista contrato, adapter, derechos, pricing, evaluación y canary exactos. `canary` nunca sostiene solo un SLA.

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
