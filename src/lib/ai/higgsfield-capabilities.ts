import snapshot from './higgsfield-schemas.json'

/**
 * Catálogo de capacidades de Higgsfield para `pnpm ai:fal --provider higgsfield`.
 *
 * Cada capacidad es un id estable de CLI (prefijo `hf-`, que también le indica a la CLI el proveedor) + el endpoint de
 * la API. El CONTRATO de entrada no se redacta acá: sale del JSON Schema que Higgsfield publica en su playground,
 * congelado en `higgsfield-schemas.json` (`pnpm ai:higgsfield:sync-schemas` lo refresca). Así el catálogo no deriva
 * del proveedor por copiar enums a mano.
 *
 * `verifiedAt` = fecha de una generación REAL exitosa con la cuenta de Efeonce. `estimateVerifiedAt` = el endpoint de
 * estimación aceptó un cuerpo válido (prueba acceso, esquema y precio; NO la salida). Al dar de alta una capacidad
 * nueva, córrela con `--estimate` antes de heredar la fecha del barrido.
 */

export type HiggsfieldMediaKind = 'image' | 'video'

export type HiggsfieldOperation =
  | 'text-to-image'
  | 'image-edit'
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'first-last-frame'
  | 'video-edit'
  | 'video-extend'

export type HiggsfieldJsonSchema = Record<string, unknown>

export interface HiggsfieldCapability {
  id: string
  endpoint: string
  label: string
  kind: HiggsfieldMediaKind
  operation: HiggsfieldOperation
  /** Qué la distingue de sus pares; lo imprime `--list`. */
  note?: string
  /** Generación real verificada con la cuenta de Efeonce (YYYY-MM-DD). */
  verifiedAt: string | null
  /** El endpoint de estimación aceptó un cuerpo válido con la cuenta de Efeonce (YYYY-MM-DD). */
  estimateVerifiedAt: string | null
}

interface SchemaSnapshot {
  capturedAt: string
  source: string
  missing: string[]
  schemas: Record<string, HiggsfieldJsonSchema>
}

const SNAPSHOT = snapshot as unknown as SchemaSnapshot

export const HIGGSFIELD_SCHEMA_CAPTURED_AT = SNAPSHOT.capturedAt

/**
 * Esquemas que el playground no publica, transcritos de la página de documentación del modelo. Sólo para endpoints
 * listados en `missing` del snapshot; si el proveedor empieza a publicarlo, el snapshot gana.
 */
const DOCUMENTED_SCHEMAS: Record<string, HiggsfieldJsonSchema> = {
  // docs.higgsfield.ai/docs/models/soul-cinema/generate (2026-09-16)
  'higgsfield-ai/soul/cinema': {
    type: 'object',
    required: ['prompt'],
    additionalProperties: false,
    properties: {
      prompt: { type: 'string', minLength: 1 },
      aspect_ratio: { type: 'string', enum: ['9:16', '16:9', '4:3', '3:4', '1:1', '2:3', '3:2'], default: '4:3' },
      resolution: { type: 'string', enum: ['720p', '1080p'], default: '720p' },
      batch_size: { type: 'integer', enum: [1, 4], default: 1 },
      enhance_prompt: { type: 'boolean', default: true },
      seed: { type: 'integer', minimum: 1, maximum: 1000000 }
    }
  }
}

/**
 * Campos que la app de Higgsfield expone pero el playground de la API no declara. Recraft V4.1 en la app acepta
 * `model_type` (standard · vector · utility · utility_vector; verificado con el conector de la app 2026-09-16). La API
 * no lo documenta y su estimación IGNORA campos desconocidos (`foo`, `model_type: "banana"` → 200), así que aceptar el
 * campo acá sólo evita que la validación local lo bloquee: que la API lo respete —y si con `vector` entrega SVG— está
 * SIN CONFIRMAR hasta una generación real.
 */
const APP_ONLY_PROPERTIES: Record<string, Record<string, HiggsfieldJsonSchema>> = {
  'recraft/v4.1/text-to-image': { model_type: { type: 'string', enum: ['standard', 'vector', 'utility', 'utility_vector'] } },
  'recraft/v4.1/pro/text-to-image': { model_type: { type: 'string', enum: ['standard', 'vector', 'utility', 'utility_vector'] } }
}

/** Esquema de entrada de un endpoint: snapshot del playground, o la transcripción documentada. `null` si no hay. */
export const getHiggsfieldSchema = (endpoint: string): HiggsfieldJsonSchema | null => {
  const base = SNAPSHOT.schemas[endpoint] ?? DOCUMENTED_SCHEMAS[endpoint] ?? null
  const extra = APP_ONLY_PROPERTIES[endpoint]

  if (!base || !extra) return base

  return { ...base, properties: { ...((base.properties ?? {}) as Record<string, HiggsfieldJsonSchema>), ...extra } }
}

/**
 * Barrido `pnpm ai:fal --capability <id> --estimate` sobre TODO el catálogo con la cuenta de Efeonce: las 44
 * capacidades respondieron 200 (validación + precio). La primera generación real quedó bloqueada por
 * `403 not_enough_credits` hasta que se cargaron créditos en la cuenta de API; el 2026-09-17 `hf-zimage-turbo`
 * completó la primera generación real (request `52df8c09-c2b4-4aec-98c7-b5768fbda8fc`, USD 0,015). El resto sigue
 * sin `verifiedAt`: una generación exitosa verifica su capacidad, no la familia.
 */
const ESTIMATE_SWEEP = '2026-09-16'

const capability = (
  id: string,
  endpoint: string,
  label: string,
  kind: HiggsfieldMediaKind,
  operation: HiggsfieldOperation,
  extra: Partial<Pick<HiggsfieldCapability, 'note' | 'verifiedAt' | 'estimateVerifiedAt'>> = {}
): HiggsfieldCapability => ({
  id,
  endpoint,
  label,
  kind,
  operation,
  note: extra.note,
  verifiedAt: extra.verifiedAt ?? null,
  estimateVerifiedAt: extra.estimateVerifiedAt ?? ESTIMATE_SWEEP
})

export const HIGGSFIELD_CAPABILITIES: readonly HiggsfieldCapability[] = [
  // ── Imagen ─────────────────────────────────────────────────────────────────────────────────────
  capability('hf-soul2', 'higgsfield-ai/soul/v2/standard', 'SOUL 2 (texto a imagen, realismo)', 'image', 'text-to-image', {
    note: 'Modelo propio de Higgsfield; estilos por style_id; batch 1 o 4'
  }),
  capability('hf-soul', 'higgsfield-ai/soul/standard', 'SOUL (primera versión)', 'image', 'text-to-image', {
    note: 'Acepta style_strength; más cara que SOUL 2'
  }),
  capability('hf-soul-cinema', 'higgsfield-ai/soul/cinema', 'SOUL Cinema (look cinematográfico)', 'image', 'text-to-image', {
    note: 'Esquema transcrito de la documentación (el playground no lo publica)'
  }),
  capability('hf-marketing-studio', 'marketing-studio/image', 'Marketing Studio (piezas de campaña, producto)', 'image', 'image-edit', {
    note: 'Hasta 16 referencias; modo enhanced con preset_id + imagen de producto; 1k/2k/4k'
  }),
  capability('hf-recraft41', 'recraft/v4.1/text-to-image', 'Recraft V4.1', 'image', 'text-to-image', {
    note: 'output_format jpg/png/webp; SVG SIN CONFIRMAR: probar --input \'{"model_type":"vector"}\' con una generación real. Paleta por colors/background_color'
  }),
  capability('hf-recraft41-pro', 'recraft/v4.1/pro/text-to-image', 'Recraft V4.1 Pro (2k)', 'image', 'text-to-image', {
    note: 'output_format jpg/png/webp; SVG SIN CONFIRMAR (model_type vector por --input)'
  }),
  capability('hf-ideogram4', 'ideogram/v4.0', 'Ideogram 4.0 (tipografía en imagen)', 'image', 'text-to-image', {
    note: 'rendering_speed TURBO/DEFAULT/QUALITY; image_url opcional con image_weight'
  }),
  capability('hf-qwen-image3', 'alibaba/qwen-image-3/text-to-image', 'Qwen Image 3', 'image', 'text-to-image'),
  capability('hf-zimage-turbo', 'z-image/turbo', 'Z-Image Turbo (rápido y barato)', 'image', 'text-to-image', {
    verifiedAt: '2026-09-17'
  }),
  capability('hf-grok-image2', 'xai/grok-imagine-image-2.0', 'Grok Imagine Image 2.0 (genera y edita)', 'image', 'image-edit', {
    note: 'Hasta 10 imágenes de referencia; 1k/2k'
  }),

  // ── Video: Seedance ────────────────────────────────────────────────────────────────────────────
  capability('hf-seedance25-t2v', 'bytedance/seedance-2.5/text-to-video', 'Seedance 2.5 texto a video', 'video', 'text-to-video', {
    note: 'Precio por tokens (resolución × segundos); 480p/720p; 4–30 s'
  }),
  capability('hf-seedance25-i2v', 'bytedance/seedance-2.5/image-to-video', 'Seedance 2.5 imagen a video', 'video', 'image-to-video', {
    note: 'Primer cuadro obligatorio; último cuadro opcional (--end-image)'
  }),
  capability('hf-seedance25-r2v', 'bytedance/seedance-2.5/reference-to-video', 'Seedance 2.5 referencias a video', 'video', 'reference-to-video', {
    note: 'Hasta 30 imágenes · 10 videos · 10 audios'
  }),
  capability('hf-seedance25-edit', 'bytedance/seedance-2.5/video-edit', 'Seedance 2.5 editar video', 'video', 'video-edit', {
    note: 'Video de origen por --video (el primero); el resto son referencias'
  }),
  capability('hf-seedance25-extend', 'bytedance/seedance-2.5/video-extend', 'Seedance 2.5 extender video', 'video', 'video-extend', {
    note: 'Video de origen por --video (el primero); --duration = segundos nuevos'
  }),
  capability('hf-seedance2-t2v', 'bytedance/seedance-2.0/text-to-video', 'Seedance 2.0 texto a video', 'video', 'text-to-video', {
    note: 'Hasta 4k; 4–15 s'
  }),
  capability('hf-seedance2-i2v', 'bytedance/seedance-2.0/image-to-video', 'Seedance 2.0 imagen a video', 'video', 'image-to-video'),
  capability('hf-seedance2-r2v', 'bytedance/seedance-2.0/reference-to-video', 'Seedance 2.0 referencias a video', 'video', 'reference-to-video', {
    note: 'Hasta 9 imágenes · 3 videos · 3 audios'
  }),

  // ── Video: Wan ─────────────────────────────────────────────────────────────────────────────────
  capability('hf-wan3-t2v', 'alibaba/wan-3.0/text-to-video', 'Wan 3.0 texto a video', 'video', 'text-to-video', {
    note: '480p 0,05 · 720p 0,10 · 1080p 0,20 USD/s (default del proveedor: 1080p)'
  }),
  capability('hf-wan3-i2v', 'alibaba/wan-3.0/image-to-video', 'Wan 3.0 imagen a video', 'video', 'image-to-video'),
  capability('hf-wan3-r2v', 'alibaba/wan-3.0/reference-to-video', 'Wan 3.0 referencias a video', 'video', 'reference-to-video', {
    note: 'Contexto por --web-url o --file (activan razonamiento); 10 img · 5 video · 5 audio'
  }),
  capability('hf-wan3prime-t2v', 'alibaba/wan-3.0-prime/text-to-video', 'Wan 3.0 Prime texto a video', 'video', 'text-to-video', {
    note: 'Versión acelerada, más cara que Wan 3.0'
  }),
  capability('hf-wan27-t2v', 'wan/v2.7/text-to-video', 'Wan 2.7 texto a video', 'video', 'text-to-video'),
  capability('hf-wan26-t2v', 'wan/v2.6/text-to-video', 'Wan 2.6 texto a video', 'video', 'text-to-video', { note: 'Multi-toma' }),

  // ── Video: Kling ───────────────────────────────────────────────────────────────────────────────
  capability('hf-kling3-std-t2v', 'kling-video/v3.0/std/text-to-video', 'Kling 3.0 Standard texto a video', 'video', 'text-to-video', {
    note: 'Multi-toma (multi_prompt), elements, cfg_scale; 3–15 s'
  }),
  capability('hf-kling3-std-i2v', 'kling-video/v3.0/std/image-to-video', 'Kling 3.0 Standard imagen a video', 'video', 'image-to-video'),
  capability('hf-kling3-pro-t2v', 'kling-video/v3.0/pro/text-to-video', 'Kling 3.0 Pro texto a video', 'video', 'text-to-video'),
  capability('hf-kling3-pro-i2v', 'kling-video/v3.0/pro/image-to-video', 'Kling 3.0 Pro imagen a video', 'video', 'image-to-video'),
  capability('hf-kling3-4k-t2v', 'kling-video/v3.0/4k/text-to-video', 'Kling 3.0 4K texto a video', 'video', 'text-to-video'),
  capability('hf-kling3-4k-i2v', 'kling-video/v3.0/4k/image-to-video', 'Kling 3.0 4K imagen a video', 'video', 'image-to-video'),
  capability('hf-kling3turbo-t2v', 'kling-video/v3.0-turbo/text-to-video', 'Kling 3.0 Turbo texto a video', 'video', 'text-to-video'),
  capability('hf-kling3turbo-i2v', 'kling-video/v3.0-turbo/image-to-video', 'Kling 3.0 Turbo imagen a video', 'video', 'image-to-video'),
  capability('hf-kling-o3-flf', 'kling-video/o3/first-last-frame', 'Kling O3 primer y último cuadro', 'video', 'first-last-frame', {
    note: 'El primer --image es el primer cuadro; --end-image el último'
  }),
  capability('hf-kling-omni-flf', 'kling-video/omni/first-last-frame', 'Kling Omni primer y último cuadro', 'video', 'first-last-frame'),
  capability('hf-kling26-pro-t2v', 'kling-video/v2.6/pro/text-to-video', 'Kling 2.6 Pro texto a video', 'video', 'text-to-video'),
  capability('hf-kling25turbo-i2v', 'kling-video/v2.5-turbo/standard/image-to-video', 'Kling 2.5 Turbo imagen a video', 'video', 'image-to-video'),

  // ── Video: otros ───────────────────────────────────────────────────────────────────────────────
  capability('hf-h3-t2v', 'minimax/h3/text-to-video', 'MiniMax H3 texto a video (2K)', 'video', 'text-to-video', {
    note: 'Sólo 2K; 5–15 s'
  }),
  capability('hf-hailuo23-t2v', 'minimax/hailuo-2.3/standard/text-to-video', 'Hailuo 2.3 texto a video', 'video', 'text-to-video'),
  capability('hf-ltx25-fast', 'lightricks/ltx-2.5/text-to-video/fast', 'LTX 2.5 Fast texto a video', 'video', 'text-to-video', {
    note: 'Duración 6/8/10 s; camera_movement por --input'
  }),
  capability('hf-ltx25-pro', 'lightricks/ltx-2.5/text-to-video/pro', 'LTX 2.5 Pro texto a video', 'video', 'text-to-video', {
    note: 'Duración 6/8/10 s; camera_movement por --input'
  }),
  capability('hf-pixverse6-t2v', 'pixverse/v6/text-to-video', 'PixVerse 6 texto a video', 'video', 'text-to-video'),
  capability('hf-happyhorse11-t2v', 'alibaba/happy-horse/v1.1/text-to-video', 'Happy Horse 1.1 texto a video', 'video', 'text-to-video'),
  capability('hf-happyhorse1-t2v', 'alibaba/happy-horse/text-to-video', 'Happy Horse 1.0 texto a video', 'video', 'text-to-video'),
  capability('hf-grok-video15-r2v', 'xai/grok-imagine-video/v1.5/reference-to-video', 'Grok Imagine Video 1.5 referencias a video', 'video', 'reference-to-video')
]

export const findHiggsfieldCapability = (id: string): HiggsfieldCapability | undefined =>
  HIGGSFIELD_CAPABILITIES.find(item => item.id === id)

export const HIGGSFIELD_CAPABILITY_PREFIX = 'hf-'
