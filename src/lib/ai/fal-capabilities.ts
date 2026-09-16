/**
 * Registro de capacidades de fal.ai que Greenhouse sabe operar desde el CLI.
 *
 * `src/lib/ai/fal.ts` es model-agnostic a propósito: recibe un slug y un input arbitrario. Este registro
 * es la capa de arriba, y existe para que el operador no tenga que recordar slugs, qué campo transporta
 * las imágenes ni dónde viene la salida — tres cosas que difieren POR ENDPOINT, no por proveedor.
 *
 * Reglas duras que este registro codifica:
 *
 * 1. **El prefijo NO es una regla del proveedor, es del endpoint.** Seedream 5 vive SIN `fal-ai/`
 *    (`bytedance/seedream/v5/...`) y Seedream 4/4.5 CON él (`fal-ai/bytedance/seedream/v4.5/...`).
 *    Verificado contra el API de modelos el 2026-09-16. Por eso el slug se declara entero acá y nunca
 *    se compone concatenando proveedor + versión.
 * 2. **`verifiedAt` dice si la capacidad se ejercitó contra el API real.** `null` significa declarada
 *    pero NO probada: el CLI lo advierte antes de gastar. Nunca marcar una fecha sin haber corrido.
 * 3. Fal es out-of-band: este registro alimenta herramientas de terminal, NUNCA el runtime del producto
 *    (el camino de imagen del producto sigue siendo `src/lib/ai/image-generator.ts`).
 */

export type FalMediaKind = 'image' | 'video'

export type FalOperation =
  | 'text-to-image'
  | 'edit'
  | 'layerize'
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'

/**
 * Contrato de video declarado POR ENDPOINT, no por familia: las variantes difieren de verdad.
 * Seedance 2.5 llega a 30 s pero topa en 1080p; Seedance 2.0 base sólo hace 15 s pero sí ofrece 4K;
 * `fast`, `mini` y `us` topan en 720p, y `mini` ni siquiera acepta `bitrate_mode`. Verificado contra
 * el OpenAPI de cada endpoint el 2026-09-16. El CLI valida contra esto ANTES de gastar: pedir 4K a
 * 2.5 o 30 s a 2.0 falla en local en vez de quemar una corrida.
 */
export interface FalVideoContract {
  maxDurationSeconds: number
  resolutions: readonly string[]
  aspectRatios: readonly string[]
  supportsAudioToggle: boolean
  supportsBitrateMode: boolean
}

const SEEDANCE_ASPECT_RATIOS: readonly string[] = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

/** Seedance 2.5: duración larga (hasta 30 s), sin 4K. */
const SEEDANCE_25: FalVideoContract = {
  maxDurationSeconds: 30,
  resolutions: ['480p', '720p', '1080p'],
  aspectRatios: SEEDANCE_ASPECT_RATIOS,
  supportsAudioToggle: true,
  supportsBitrateMode: true
}

/** Seedance 2.0 base: hasta 15 s, y la única familia con 4K. */
const SEEDANCE_20_BASE: FalVideoContract = {
  maxDurationSeconds: 15,
  resolutions: ['480p', '720p', '1080p', '4k'],
  aspectRatios: SEEDANCE_ASPECT_RATIOS,
  supportsAudioToggle: true,
  supportsBitrateMode: true
}

/** Variantes fast / us de 2.0: mismas duraciones, techo 720p. */
const SEEDANCE_20_LIGHT: FalVideoContract = {
  maxDurationSeconds: 15,
  resolutions: ['480p', '720p'],
  aspectRatios: SEEDANCE_ASPECT_RATIOS,
  supportsAudioToggle: true,
  supportsBitrateMode: true
}

/** Mini: como las anteriores pero sin `bitrate_mode`. */
const SEEDANCE_20_MINI: FalVideoContract = { ...SEEDANCE_20_LIGHT, supportsBitrateMode: false }

export interface FalCapability {
  /** Identificador corto que el operador escribe en el CLI. */
  id: string
  /** Slug exacto de fal, declarado entero. NUNCA componerlo por concatenación. */
  slug: string
  kind: FalMediaKind
  operation: FalOperation
  label: string
  /** Campo por el que viajan las entradas visuales; null si el endpoint no recibe ninguna. */
  inputMediaField: 'image_url' | 'image_urls' | null
  /** Cuántas entradas visuales acepta: una sola, varias, o ninguna. */
  inputMedia: 'none' | 'one' | 'many'
  requiresPrompt: boolean
  /** Clave del output que trae los assets generados. */
  outputKey: 'images' | 'layers' | 'video'
  /** Fecha en que se ejercitó contra el API real. `null` = declarada, sin verificar. */
  verifiedAt: string | null
  /** Sólo para `kind: 'video'`: límites reales del endpoint, que el CLI valida antes de gastar. */
  video?: FalVideoContract
  notes?: string
}

export const FAL_CAPABILITIES: readonly FalCapability[] = [
  // ── Seedream 5.0 — imagen ───────────────────────────────────────────────────────────────────────
  {
    id: 'seedream5-pro',
    slug: 'bytedance/seedream/v5/pro/text-to-image',
    kind: 'image',
    operation: 'text-to-image',
    label: 'Seedream 5.0 Pro — texto a imagen',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'images',
    verifiedAt: '2026-09-16',
    notes: 'Materialidad, atmósfera y desarrollo de look. Hasta 4K según el proveedor.'
  },
  {
    id: 'seedream5-pro-edit',
    slug: 'bytedance/seedream/v5/pro/edit',
    kind: 'image',
    operation: 'edit',
    label: 'Seedream 5.0 Pro — edición por referencia',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'images',
    verifiedAt: '2026-09-16',
    notes: 'Edición region-precise: cambia un elemento y conserva el resto. Hasta 10 referencias.'
  },
  {
    id: 'seedream5-pro-layerize',
    slug: 'bytedance/seedream/v5/pro/layerize',
    kind: 'image',
    operation: 'layerize',
    label: 'Seedream 5.0 Pro — separación por capas',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: false,
    outputKey: 'layers',
    verifiedAt: '2026-09-16',
    notes:
      'Descompone una pieza en hasta 16 capas editables (texto, sujeto, fondo, decoración) con nombre, ' +
      'descripción, z_index y bounding box, reconstruyendo lo que estaba ocluido. No pide prompt.'
  },
  {
    id: 'seedream5-lite',
    slug: 'bytedance/seedream/v5/lite/text-to-image',
    kind: 'image',
    operation: 'text-to-image',
    label: 'Seedream 5.0 Lite — texto a imagen',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'images',
    verifiedAt: '2026-09-16',
    notes: 'Divergencia barata y lotes rápidos, antes de que exista un ancla.'
  },
  {
    id: 'seedream5-lite-edit',
    slug: 'bytedance/seedream/v5/lite/edit',
    kind: 'image',
    operation: 'edit',
    label: 'Seedream 5.0 Lite — edición por referencia',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'images',
    verifiedAt: '2026-09-16'
  },

  // ── Seedance — video · DECLARADO, SIN VERIFICAR hasta ejercitar cada endpoint ──────────────────
  {
    id: 'seedance25-t2v',
    slug: 'bytedance/seedance-2.5/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Seedance 2.5 — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: SEEDANCE_25,
    notes: 'hasta 30 s · techo 1080p'
  },
  {
    id: 'seedance25-i2v',
    slug: 'bytedance/seedance-2.5/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Seedance 2.5 — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: SEEDANCE_25,
    notes: 'hasta 30 s · techo 1080p · admite end_image_url (último cuadro)'
  },
  {
    id: 'seedance25-r2v',
    slug: 'bytedance/seedance-2.5/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Seedance 2.5 — referencias a video',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_25,
    notes: 'hasta 30 s · techo 1080p · admite audio_urls y video_urls · task reference|editing|extension'
  },
  {
    id: 'seedance20-t2v',
    slug: 'bytedance/seedance-2.0/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Seedance 2.0 — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: SEEDANCE_20_BASE,
    notes: 'hasta 15 s · única familia con 4K'
  },
  {
    id: 'seedance20-i2v',
    slug: 'bytedance/seedance-2.0/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Seedance 2.0 — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_BASE,
    notes: 'hasta 15 s · única familia con 4K · admite end_image_url (último cuadro)'
  },
  {
    id: 'seedance20-r2v',
    slug: 'bytedance/seedance-2.0/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Seedance 2.0 — referencias a video',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_BASE,
    notes: 'hasta 15 s · única familia con 4K · admite audio_urls y video_urls'
  },
  {
    id: 'seedance20-fast-t2v',
    slug: 'bytedance/seedance-2.0/fast/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Seedance 2.0 Fast — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_LIGHT,
    notes: 'variante rápida · techo 720p'
  },
  {
    id: 'seedance20-fast-i2v',
    slug: 'bytedance/seedance-2.0/fast/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Seedance 2.0 Fast — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_LIGHT,
    notes: 'variante rápida · techo 720p · admite end_image_url (último cuadro)'
  },
  {
    id: 'seedance20-fast-r2v',
    slug: 'bytedance/seedance-2.0/fast/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Seedance 2.0 Fast — referencias a video',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_LIGHT,
    notes: 'variante rápida · techo 720p · admite audio_urls y video_urls'
  },
  {
    id: 'seedance20-mini-t2v',
    slug: 'bytedance/seedance-2.0/mini/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Seedance 2.0 Mini — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_MINI,
    notes: 'la más barata · sin bitrate_mode'
  },
  {
    id: 'seedance20-mini-i2v',
    slug: 'bytedance/seedance-2.0/mini/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Seedance 2.0 Mini — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_MINI,
    notes: 'la más barata · sin bitrate_mode · admite end_image_url (último cuadro)'
  },
  {
    id: 'seedance20-mini-r2v',
    slug: 'bytedance/seedance-2.0/mini/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Seedance 2.0 Mini — referencias a video',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_MINI,
    notes: 'la más barata · sin bitrate_mode · admite audio_urls y video_urls'
  },
  {
    id: 'seedance20-us-t2v',
    slug: 'bytedance/seedance-2.0/us/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Seedance 2.0 US — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_LIGHT,
    notes: 'región US · techo 720p'
  },
  {
    id: 'seedance20-us-i2v',
    slug: 'bytedance/seedance-2.0/us/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Seedance 2.0 US — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_LIGHT,
    notes: 'región US · techo 720p · admite end_image_url (último cuadro)'
  },
  {
    id: 'seedance20-us-r2v',
    slug: 'bytedance/seedance-2.0/us/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Seedance 2.0 US — referencias a video',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: SEEDANCE_20_LIGHT,
    notes: 'región US · techo 720p · admite audio_urls y video_urls'
  },
] as const

export const findFalCapability = (id: string): FalCapability | undefined =>
  FAL_CAPABILITIES.find(capability => capability.id === id)

export const FAL_CAPABILITY_IDS: readonly string[] = FAL_CAPABILITIES.map(capability => capability.id)
