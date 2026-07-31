# Efeonce Globe — Expansión de flota de imagen

## Estado

- Estado: propuesta y tasks de integración documental.
- Snapshot Fal autenticado y documentación oficial consultada: 2026-07-31.
- Runway queda fuera de alcance: no existe en el conector Fal y requeriría un proveedor directo separado.

## Estado actual de Globe

El Producer ya tiene disponibles seis rutas raster: Seedream 5 Pro y Edit, Nano Banana Pro, Nano Banana 2, GPT Image 2 y GPT Image 1.5. Recraft v4.1 está disponible para vectorización; Topaz image-upscale tiene ruta pero no lane gobernado. FLUX.2 Max/Edit ya está documentado en `TASK-1620`.

## Tasks nuevas

| Task | Familia | Decisión |
|---|---|---|
| `TASK-1621` | Ideogram v4 Generate/Edit | Agregar: typography, posters, logos y image-to-image con preservación de estructura |
| `TASK-1622` | Recraft v4.1 Raster | Agregar: extender la integración Recraft vector a generación raster y variante Pro |
| `TASK-1623` | Qwen Image 2/Pro Edit | Agregar como challenger calidad/precio, sin crear capability nueva |
| `TASK-1624` | Grok Imagine Image | Agregar como familia imagen→edición, con safety gate por cobro de violaciones |

## Qué se reutiliza

- `image-generate` e `image-edit`.
- catálogo y resolución por `routeId`.
- `FalCreativeAdapter`, queue/status/result, uploads privados hash→URL, descarga y hash.
- result driver para `images[]`, MIME/output governance, retrieval, lineage y compare.
- selector del Producer y availability reader; no debe agregarse lógica por modelo en UI.
- rates, rights, readiness, binding, evaluación durable y promoción por ruta.

## Qué se extiende

| Familia | Extensión requerida |
|---|---|
| Ideogram | `image_size` custom, expansion model, rendering speed, strength para image-to-image y typography/poster constraints |
| Recraft raster | nueva ruta raster junto a vector, MIME WebP/JPEG/PNG, variante Pro/utility y rate por resolución |
| Qwen | `negative_prompt`, seed, `num_images` 1–4, formatos PNG/JPEG/WebP, image size y límites de edición/referencias |
| Grok Image | resolución 1K/2K, `num_images` 1–4, 1–3 referencias en Edit, aspect ratios, revised prompt y policy de cobro |

Ninguna familia exige una primitive nueva del Producer. FLUX.2 tampoco la requiere. Solo se propondrá una capability nueva si el contrato vigente no puede expresar una diferencia semántica real; no se crearán capabilities por marca.

## Priorización

1. Ideogram v4: mayor diferenciación por texto legible, logos, posters y piezas editoriales. Fal documenta generación comercial, image-to-image y controles de tamaño/expansión. [Ideogram v4](https://fal.ai/models/ideogram/v4)
2. Recraft raster: mayor reutilización y sinergia con el Recraft vector ya promovido. Fal lo posiciona para brand systems y editorial; v4.1 raster estándar muestra un precio publicado de USD 0,035 por imagen. [Recraft v4.1](https://fal.ai/models/fal-ai/recraft/v4.1/text-to-image)
3. Qwen Image 2 Pro/Edit: challenger de calidad/precio y tipografía; Pro publica USD 0,075 por imagen y Standard USD 0,035, sujeto a revalidación. [Qwen Image 2 Pro](https://fal.ai/models/fal-ai/qwen-image-2/pro/text-to-image)
4. Grok Imagine Image: familia coherente con Grok Video, 1K/2K y edición multiimagen; Fal publica USD 0,02 por generación y USD 0,022 por edición, pero advierte que las solicitudes bloqueadas por términos de xAI siguen cobrando. [Grok Imagine Image](https://fal.ai/docs/model-api-reference/image-generation-api/xai-grok-imagine-image)

## Gates comunes

- Reconsultar `GET /v1/models` con OpenAPI expandido y pricing por endpoint antes de ejecutar.
- Cada endpoint obtiene `routeId`, binding, rate, rights, evaluación, readiness y canary propios.
- No exponer slugs, URLs Fal, costos vendor ni margen al cliente.
- Validar límites antes de reservar créditos y nuevamente en `prepare`.
- Mantener `gated` hasta evidencia terminal, revisión, atestación, promoción y readback de `globe.producer.fleet.list`.
- Verificar MIME, hash, lineage, retrieval, compare y descarga.
- No usar Fill/Erase como sustituto de FLUX.2 Edit ni mezclar Recraft vector con raster.

## Fuera de alcance

- Runway: requiere un adapter directo y no pertenece a esta expansión Fal.
- Más variantes Seedream, FLUX genérico o modelos duplicados sin una hipótesis evaluable.
- Nueva UI base del Producer: las tasks solo extienden catálogo y controles declarados por ruta.
