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

export type FalMediaKind = 'image' | 'video' | 'training'

export type FalOperation =
  | 'text-to-image'
  | 'edit'
  | 'layerize'
  | 'text-to-video'
  | 'image-to-video'
  | 'reference-to-video'
  | 'camera-control'
  | 'first-last-frame-to-video'
  | 'keyframes-to-video'
  | 'video-edit'
  | 'video-extend'
  | 'draft-enhance'
  | 'realtime-stream'
  | 'lora-training'

/** Un campo de referencias multimedia y cuántas entradas acepta (`null` = el OpenAPI no declara tope). */
export interface FalReferenceSlot {
  field: string
  max: number | null
}

/**
 * Contrato de video declarado POR ENDPOINT, no por familia: las variantes difieren de verdad.
 *
 * Seedance 2.5 llega a 30 s pero topa en 1080p; Seedance 2.0 base sólo hace 15 s pero sí ofrece 4K;
 * `fast`, `mini` y `us` topan en 720p, y `mini` ni siquiera acepta `bitrate_mode`. Minimax H3 cambia
 * hasta la FORMA de los campos: la duración es un entero de 5 a 15 (Seedance la recibe como texto y
 * admite `auto`), la resolución va en mayúsculas (`768P`, `2K`), image-to-video no acepta aspect ratio y
 * las referencias viajan por `reference_*_urls` con topes propios. Verificado contra el OpenAPI de cada
 * endpoint el 2026-09-16. El CLI valida contra esto ANTES de gastar: un pedido que el proveedor rechaza
 * después de encolar falla en local.
 */
export interface FalVideoContract {
  /** `null` = el endpoint no acepta duración (editar un video o mejorar un draft heredan la del origen). */
  duration: {
    /**
     * `string` = Seedance (`"5"`, `"auto"`); `integer` = Minimax H3 y Flux 3 (`5`). Con `integer` y
     * `acceptsAuto`, `auto` viaja como texto y los segundos como número (Flux 3).
     */
    encoding: 'string' | 'integer'
    min: number
    max: number
    acceptsAuto: boolean
    /**
     * Cómo viaja `auto`: como texto (Seedance, Flux 3) o como `null` (Wan 3.0: "smart duration", el modelo
     * elige el largo según el prompt y las referencias). Omitido = texto.
     */
    autoValue?: 'auto' | null
  } | null
  /** Valores canónicos del endpoint; vacío = no acepta `resolution` (drafts de Flux 3, edición). */
  resolutions: readonly string[]
  /** Vacío = el endpoint no acepta `aspect_ratio` (el encuadre sale de la imagen de entrada). */
  aspectRatios: readonly string[]
  supportsAudioToggle: boolean
  /** Nombre del booleano de audio: `generate_audio` (default) o `audio` (Wan 3.0). */
  audioField?: 'generate_audio' | 'audio'
  supportsBitrateMode: boolean
  /** `task` (reference | editing | extension) sólo existe en Seedance 2.5 reference-to-video. */
  acceptsTask: boolean
  acceptsEndImage: boolean
  /** Flux 3 first-last-frame: el último cuadro es OBLIGATORIO, no opcional. */
  endImageRequired?: boolean
  /** Sólo reference-to-video: por qué campo viaja cada tipo de referencia y con qué tope. */
  references?: {
    images?: FalReferenceSlot
    videos?: FalReferenceSlot
    audios?: FalReferenceSlot
  }
  /** Minimax H3: reescritura del prompt por el proveedor. `required` = el endpoint exige el campo. */
  promptExpansion?: {
    modes: readonly string[]
    required: boolean
    defaultMode: string
  }
  /** Endpoints `/lora`: exigen `loras` (`{ path, scale }`), con tope de entradas. */
  loras?: { max: number; scaleMin: number; scaleMax: number }
  /** Camera controls: trayectoria por keyframes `{ distance, elevation, azimuth, time }`. */
  cameraTrajectory?: { maxKeyframes: number }
  /** Flux 3 keyframes-to-video: `keyframes` obligatorio, `{ frame_index, image_url }`, con tope. */
  keyframes?: { max: number }
  /** Flux 3: tolerancia del filtro de seguridad (`safety_tolerance`). */
  safetyTolerance?: { min: number; max: number }
  /**
   * Flujo draft → enhance de Flux 3. `produces`: el endpoint devuelve `draft_cache` además del video barato;
   * `consumes`: `draft-enhance` recibe ese `draft_cache_url` y entrega la versión final sin re-generar la toma.
   */
  draftCache?: 'produces' | 'consumes'
  /**
   * Flux 3 extend: el video de origen DEBE traer pista de audio. Sin ella fal acepta el trabajo en cola y lo
   * rechaza al procesarlo con un 422 genérico ("Invalid request parameters"), cualquiera sea la duración.
   * Aislado con corridas reales 2026-09-16. El CLI lo revisa con ffprobe antes de subir.
   */
  requiresSourceAudio?: boolean
  /** reference-to-video: exige al menos una imagen o video de referencia; el audio solo no alcanza. */
  requiresVisualReference?: boolean
  /** Wan 3.0: la reescritura del prompt es un booleano (`enable_prompt_expansion`, prendido por defecto). */
  promptExpansionToggle?: boolean
  /**
   * Wan 3.0: razonamiento previo (`enable_thinking`). Con `groundingSources`, el video puede basarse en una página
   * web pública (`web_url`) o un documento (`file_url`), y ambos EXIGEN el razonamiento prendido.
   */
  thinking?: { groundingSources: boolean }
}

/** Entrenadores de LoRA: el dataset viaja como URL a un zip y los hiperparámetros tienen rangos reales. */
export interface FalTrainingContract {
  dataField: 'training_data_url'
  steps: { min: number; max: number; defaultValue: number }
  ranks: readonly number[]
  learningRate: { min: number; max: number }
  /** Probabilidades de condicionamiento propias de cada entrenador (informativo; se pasan por `--input`). */
  conditioningFields: readonly string[]
}

const SEEDANCE_ASPECT_RATIOS: readonly string[] = ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16']

/**
 * Topes de referencias medidos contra el OpenAPI 2026-09-16. Seedance 2.0 (todas sus variantes): 9 imágenes,
 * 3 videos (2–15 s combinados, 480p–720p) y 3 audios (≤ 15 s combinados). Seedance 2.5: 30 imágenes,
 * 10 videos y 10 audios (cada uno 1,8–30,2 s; ≤ 30,2 s combinados).
 */
const SEEDANCE_20_REFERENCES: NonNullable<FalVideoContract['references']> = {
  images: { field: 'image_urls', max: 9 },
  videos: { field: 'video_urls', max: 3 },
  audios: { field: 'audio_urls', max: 3 }
}

const SEEDANCE_25_REFERENCES: NonNullable<FalVideoContract['references']> = {
  images: { field: 'image_urls', max: 30 },
  videos: { field: 'video_urls', max: 10 },
  audios: { field: 'audio_urls', max: 10 }
}

const seedanceDuration = (max: number): FalVideoContract['duration'] => ({
  encoding: 'string',
  // 4 s es el mínimo real del enum (`auto`, `4`…); medido contra el OpenAPI 2026-09-16.
  min: 4,
  max,
  acceptsAuto: true
})

/** Seedance 2.5: duración larga (hasta 30 s), sin 4K. */
const SEEDANCE_25: FalVideoContract = {
  duration: seedanceDuration(30),
  resolutions: ['480p', '720p', '1080p'],
  aspectRatios: SEEDANCE_ASPECT_RATIOS,
  supportsAudioToggle: true,
  supportsBitrateMode: true,
  acceptsTask: false,
  acceptsEndImage: false
}

/** Seedance 2.0 base: hasta 15 s, y la única familia con 4K. */
const SEEDANCE_20_BASE: FalVideoContract = {
  ...SEEDANCE_25,
  duration: seedanceDuration(15),
  resolutions: ['480p', '720p', '1080p', '4k']
}

/** Variantes fast / us de 2.0: mismas duraciones, techo 720p. */
const SEEDANCE_20_LIGHT: FalVideoContract = { ...SEEDANCE_20_BASE, resolutions: ['480p', '720p'] }

/** Mini: como las anteriores pero sin `bitrate_mode`. */
const SEEDANCE_20_MINI: FalVideoContract = { ...SEEDANCE_20_LIGHT, supportsBitrateMode: false }

/** Variante image-to-video de un contrato Seedance: admite último cuadro. */
const seedanceI2V = (contract: FalVideoContract): FalVideoContract => ({ ...contract, acceptsEndImage: true })

/**
 * Variante reference-to-video de un contrato Seedance. El video a video de Seedance vive ACÁ, no en un
 * endpoint aparte: en 2.5, `--task editing` modifica un video de referencia y `--task extension` lo continúa;
 * en 2.0 el video sólo guía la generación (`@Video1` en el prompt), sin edición ni extensión.
 */
const seedanceR2V = (contract: FalVideoContract, acceptsTask = false): FalVideoContract => ({
  ...contract,
  acceptsTask,
  references: acceptsTask ? SEEDANCE_25_REFERENCES : SEEDANCE_20_REFERENCES,
  requiresVisualReference: true
})

const H3_ASPECT_RATIOS: readonly string[] = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16']
const H3_R2V_ASPECT_RATIOS: readonly string[] = ['adaptive', ...H3_ASPECT_RATIOS]
const H3_DURATION: FalVideoContract['duration'] = { encoding: 'integer', min: 5, max: 15, acceptsAuto: false }

const H3_REFERENCES: NonNullable<FalVideoContract['references']> = {
  images: { field: 'reference_image_urls', max: 9 },
  videos: { field: 'reference_video_urls', max: 3 },
  audios: { field: 'reference_audio_urls', max: 3 }
}

/** Minimax H3 base: la única variante H3 con 2K y 4K; expansión de prompt opcional con modo `fast`. */
const H3_BASE: FalVideoContract = {
  duration: H3_DURATION,
  resolutions: ['480P', '768P', '2K', '4K'],
  aspectRatios: H3_ASPECT_RATIOS,
  supportsAudioToggle: false,
  supportsBitrateMode: false,
  acceptsTask: false,
  acceptsEndImage: false,
  promptExpansion: { modes: ['disabled', 'fast', 'balanced', 'quality'], required: false, defaultMode: 'balanced' }
}

/** Minimax H3 Max y Max Turbo: techo 1080p y `prompt_expansion_mode` OBLIGATORIO (sin `fast`). */
const H3_MAX: FalVideoContract = {
  ...H3_BASE,
  resolutions: ['480P', '768P', '1080P'],
  promptExpansion: { modes: ['disabled', 'balanced', 'quality'], required: true, defaultMode: 'balanced' }
}

const H3_LORAS: NonNullable<FalVideoContract['loras']> = { max: 3, scaleMin: 0, scaleMax: 4 }

/** image-to-video de H3: sin aspect ratio (manda la imagen) y con último cuadro opcional. */
const h3I2V = (contract: FalVideoContract): FalVideoContract => ({ ...contract, aspectRatios: [], acceptsEndImage: true })

const h3R2V = (contract: FalVideoContract): FalVideoContract => ({
  ...contract,
  aspectRatios: H3_R2V_ASPECT_RATIOS,
  references: H3_REFERENCES
})

const H3_TRAINING = (conditioningFields: readonly string[]): FalTrainingContract => ({
  dataField: 'training_data_url',
  steps: { min: 1, max: 15_000, defaultValue: 2000 },
  ranks: [8, 16, 32, 64, 128],
  learningRate: { min: 0.000001, max: 1 },
  conditioningFields
})

const FLUX3_ASPECT_RATIOS: readonly string[] = ['auto', '21:9', '2:1', '16:9', '4:3', '1:1', '3:4', '9:16']
const FLUX3_SAFETY = { min: 0, max: 4 }

/**
 * Flux 3 (Black Forest Labs) — en fal es un modelo de VIDEO, no de imagen. Duración `auto` o entera 5–20 s,
 * 720p/1080p, audio generado apagable, `safety_tolerance` 0–4. Verificado contra el OpenAPI 2026-09-16.
 */
const FLUX3: FalVideoContract = {
  duration: { encoding: 'integer', min: 5, max: 20, acceptsAuto: true },
  resolutions: ['720p', '1080p'],
  aspectRatios: FLUX3_ASPECT_RATIOS,
  supportsAudioToggle: true,
  supportsBitrateMode: false,
  acceptsTask: false,
  acceptsEndImage: false,
  safetyTolerance: FLUX3_SAFETY
}

/** Variante `/draft`: sin resolución, más barata, y devuelve `draft_cache` para mejorarla después. */
const flux3Draft = (contract: FalVideoContract): FalVideoContract => ({ ...contract, resolutions: [], draftCache: 'produces' })

/** first-last-frame y keyframes: duración entera 5–20 SIN `auto`. */
const FLUX3_FIXED_DURATION: FalVideoContract['duration'] = { encoding: 'integer', min: 5, max: 20, acceptsAuto: false }

const FLUX3_FLF: FalVideoContract = { ...FLUX3, duration: FLUX3_FIXED_DURATION, acceptsEndImage: true, endImageRequired: true }
const FLUX3_KEYFRAMES: FalVideoContract = { ...FLUX3, duration: FLUX3_FIXED_DURATION, keyframes: { max: 10 } }

/** edit-video y draft-enhance: sin duración, resolución, aspecto ni audio (heredan del origen). */
const FLUX3_PASSTHROUGH: FalVideoContract = {
  ...FLUX3,
  duration: null,
  resolutions: [],
  aspectRatios: [],
  supportsAudioToggle: false
}

const WAN3_REFERENCES: NonNullable<FalVideoContract['references']> = {
  images: { field: 'reference_image_urls', max: 10 },
  videos: { field: 'reference_video_urls', max: 5 },
  audios: { field: 'reference_audio_urls', max: 5 }
}

/**
 * Wan 3.0 y Wan 3.0 Prime (Alibaba) — segundo del ranking de video de OpenArt Arena y primero en edición de video
 * (2026-09-16). Mismo contrato y mismo precio (USD 0,05/s) en ambas líneas, medido contra el OpenAPI 2026-09-16:
 * duración entera 2–30 s (`auto` = `null`), 480p/720p/1080p con 1080p por defecto, audio por `audio`, expansión de
 * prompt booleana y razonamiento opcional.
 */
const WAN3: FalVideoContract = {
  duration: { encoding: 'integer', min: 2, max: 30, acceptsAuto: true, autoValue: null },
  resolutions: ['480p', '720p', '1080p'],
  aspectRatios: ['adaptive', '16:9', '4:3', '1:1', '3:4', '9:16'],
  supportsAudioToggle: true,
  audioField: 'audio',
  supportsBitrateMode: false,
  acceptsTask: false,
  acceptsEndImage: false,
  promptExpansionToggle: true,
  thinking: { groundingSources: false }
}

const WAN3_I2V: FalVideoContract = { ...WAN3, acceptsEndImage: true }

/** Referencias a video: hasta 10 imágenes, 5 videos y 5 audios, y puede basarse en una web o un documento. */
const WAN3_R2V: FalVideoContract = { ...WAN3, references: WAN3_REFERENCES, thinking: { groundingSources: true } }

export interface FalCapability {
  /** Identificador corto que el operador escribe en el CLI. */
  id: string
  /** Slug exacto de fal, declarado entero. NUNCA componerlo por concatenación. */
  slug: string
  kind: FalMediaKind
  operation: FalOperation
  label: string
  /** Campo por el que viajan las entradas visuales principales; null si el endpoint no recibe ninguna. */
  inputMediaField: 'image_url' | 'image_urls' | 'reference_image_urls' | 'start_image_url' | 'video_url' | null
  /** Cuántas entradas visuales acepta: una sola, varias, o ninguna. */
  inputMedia: 'none' | 'one' | 'many'
  requiresPrompt: boolean
  /** Clave del output que trae los assets generados. */
  outputKey: 'images' | 'layers' | 'video' | 'lora_file'
  /** Fecha en que se ejercitó contra el API real. `null` = declarada, sin verificar. */
  verifiedAt: string | null
  /** Sólo para `kind: 'video'`: límites reales del endpoint, que el CLI valida antes de gastar. */
  video?: FalVideoContract
  /** Sólo para `kind: 'training'`. */
  training?: FalTrainingContract
  /**
   * Presente cuando el endpoint existe en el catálogo de fal pero NO se puede operar por la cola. El CLI
   * lo lista para que nadie lo "descubra" de nuevo, y se niega a ejecutarlo explicando por qué.
   */
  unsupportedReason?: string
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
    notes: 'Materialidad, atmósfera y desarrollo de look. En fal el área máxima es 2048×2048 (no 4K: el schema lo limita, aunque ByteDance lo publique). JPEG por defecto: pasa --format png si guardas .png.'
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

  // ── Seedance — video ──────────────────────────────────────────────────────────────────────────
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
    video: seedanceI2V(SEEDANCE_25),
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
    verifiedAt: '2026-09-16',
    video: seedanceR2V(SEEDANCE_25, true),
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
    verifiedAt: '2026-09-16',
    video: seedanceI2V(SEEDANCE_20_BASE),
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
    verifiedAt: '2026-09-16',
    video: seedanceR2V(SEEDANCE_20_BASE),
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
    verifiedAt: '2026-09-16',
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
    verifiedAt: '2026-09-16',
    video: seedanceI2V(SEEDANCE_20_LIGHT),
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
    verifiedAt: '2026-09-16',
    video: seedanceR2V(SEEDANCE_20_LIGHT),
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
    verifiedAt: '2026-09-16',
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
    verifiedAt: '2026-09-16',
    video: seedanceI2V(SEEDANCE_20_MINI),
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
    verifiedAt: '2026-09-16',
    video: seedanceR2V(SEEDANCE_20_MINI),
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
    verifiedAt: '2026-09-16',
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
    verifiedAt: '2026-09-16',
    video: seedanceI2V(SEEDANCE_20_LIGHT),
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
    verifiedAt: '2026-09-16',
    video: seedanceR2V(SEEDANCE_20_LIGHT),
    notes: 'región US · techo 720p · admite audio_urls y video_urls'
  },

  // ── Minimax H3 — video (base: hasta 4K · Max y Max Turbo: techo 1080p) ──────────────────────────
  {
    id: 'h3-t2v',
    slug: 'minimax/h3/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Minimax H3 — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: H3_BASE,
    notes: '5–15 s · 480P/768P nativos; 2K (default) y 4K son reescalados desde 768P · USD 0,05/s en el escalón más bajo, 2K ≈ 0,13/s · expansión de prompt opcional (incluye fast)'
  },
  {
    id: 'h3-i2v',
    slug: 'minimax/h3/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Minimax H3 — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: h3I2V(H3_BASE),
    notes: '5–15 s · 2K/4K reescalados desde 768P · sin aspect ratio · admite end_image_url'
  },
  {
    id: 'h3-r2v',
    slug: 'minimax/h3/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Minimax H3 — referencias a video',
    inputMediaField: 'reference_image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: h3R2V(H3_BASE),
    notes: '5–15 s · 2K/4K reescalados desde 768P · hasta 9 imágenes, 3 videos y 3 audios de referencia'
  },
  {
    id: 'h3-t2v-lora',
    slug: 'minimax/h3/text-to-video/lora',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Minimax H3 — texto a video con LoRA',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: { ...H3_BASE, loras: H3_LORAS },
    notes: 'exige --lora (hasta 3) · 5–15 s · 2K/4K reescalados desde 768P'
  },
  {
    id: 'h3-i2v-lora',
    slug: 'minimax/h3/image-to-video/lora',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Minimax H3 — imagen a video con LoRA',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: { ...h3I2V(H3_BASE), loras: H3_LORAS },
    notes: 'exige --lora (hasta 3) · sin aspect ratio · admite end_image_url'
  },
  {
    id: 'h3-r2v-lora',
    slug: 'minimax/h3/reference-to-video/lora',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Minimax H3 — referencias a video con LoRA',
    inputMediaField: 'reference_image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    video: { ...h3R2V(H3_BASE), loras: H3_LORAS },
    notes: 'exige --lora (hasta 3) · hasta 9 imágenes, 3 videos y 3 audios'
  },
  {
    id: 'h3max-t2v',
    slug: 'minimax/h3-max/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Minimax H3 Max — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: H3_MAX,
    notes: '5–15 s · techo 1080P · prompt_expansion_mode obligatorio (el CLI envía balanced)'
  },
  {
    id: 'h3max-i2v',
    slug: 'minimax/h3-max/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Minimax H3 Max — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: h3I2V(H3_MAX),
    notes: '5–15 s · techo 1080P · sin aspect ratio · admite end_image_url'
  },
  {
    id: 'h3max-r2v',
    slug: 'minimax/h3-max/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Minimax H3 Max — referencias a video',
    inputMediaField: 'reference_image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: h3R2V(H3_MAX),
    notes: '5–15 s · techo 1080P · hasta 9 imágenes, 3 videos y 3 audios'
  },
  {
    id: 'h3max-camera',
    slug: 'minimax/h3-max/camera-controls',
    kind: 'video',
    operation: 'camera-control',
    label: 'Minimax H3 Max — control de cámara',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: false,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: { ...h3I2V(H3_MAX), acceptsEndImage: false, cameraTrajectory: { maxKeyframes: 12 } },
    notes: 'escena congelada, sólo se mueve la cámara · --camera-trajectory hasta 12 keyframes · prompt opcional'
  },
  {
    id: 'h3turbo-t2v',
    slug: 'minimax/h3-max-turbo/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Minimax H3 Max Turbo — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: H3_MAX,
    notes: 'la más barata de H3 · 5–15 s · techo 1080P'
  },
  {
    id: 'h3turbo-i2v',
    slug: 'minimax/h3-max-turbo/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Minimax H3 Max Turbo — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: h3I2V(H3_MAX),
    notes: 'la más barata de H3 · techo 1080P · admite end_image_url'
  },
  {
    id: 'h3max-director',
    slug: 'minimax/h3-max/director',
    kind: 'video',
    operation: 'realtime-stream',
    label: 'Minimax H3 Max Director — video en tiempo real',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null,
    unsupportedReason:
      'Stream continuo con prompts en vivo, no un trabajo de cola: fal lo lista activo, pero su OpenAPI de cola ' +
      'da 404 y POST a la app responde "Application h3-max not found" (medido 2026-09-16). Necesita un cliente realtime.'
  },

  // ── Minimax H3 — entrenamiento de LoRA (se cobra por step) ──────────────────────────────────────
  {
    id: 'h3-train-t2v',
    slug: 'minimax/h3/t2v/trainer',
    kind: 'training',
    operation: 'lora-training',
    label: 'Minimax H3 — entrenar LoRA texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: false,
    outputKey: 'lora_file',
    verifiedAt: null,
    training: H3_TRAINING([]),
    notes: 'dataset zip por --training-data · 1–15000 steps · rank 8–128'
  },
  {
    id: 'h3-train-i2v',
    slug: 'minimax/h3/i2v/trainer',
    kind: 'training',
    operation: 'lora-training',
    label: 'Minimax H3 — entrenar LoRA imagen a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: false,
    outputKey: 'lora_file',
    verifiedAt: null,
    training: H3_TRAINING(['first_frame_conditioning_p']),
    notes: 'condicionamiento por primer cuadro (default 0.5)'
  },
  {
    id: 'h3-train-flf2v',
    slug: 'minimax/h3/flf2v/trainer',
    kind: 'training',
    operation: 'lora-training',
    label: 'Minimax H3 — entrenar LoRA primer y último cuadro',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: false,
    outputKey: 'lora_file',
    verifiedAt: null,
    training: H3_TRAINING(['first_frame_conditioning_p', 'last_frame_conditioning_p', 'first_last_frame_conditioning_p']),
    notes: 'condicionamiento primer 0.2 · último 0.2 · ambos 0.4'
  },
  {
    id: 'h3-train-ref2va',
    slug: 'minimax/h3/ref2va/trainer',
    kind: 'training',
    operation: 'lora-training',
    label: 'Minimax H3 — entrenar LoRA referencias a video y audio',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: false,
    outputKey: 'lora_file',
    verifiedAt: null,
    training: H3_TRAINING(['reference_conditioning_p', 'resume_from_lora_url']),
    notes: 'condicionamiento por referencia 0.9 · puede retomar desde una LoRA'
  },

  // ── Flux 3 (Black Forest Labs) — video · slugs SIN fal-ai/ ────────────────────────────────────────
  {
    id: 'flux3-t2v',
    slug: 'blackforestlabs/flux-3/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Flux 3 — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: FLUX3,
    notes: 'auto o 5–20 s · 720p/1080p · USD 0,085/s registrado; BFL/fal publican 0,17/s: confirma con --balance'
  },
  {
    id: 'flux3-t2v-draft',
    slug: 'blackforestlabs/flux-3/text-to-video/draft',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Flux 3 — texto a video (draft)',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: flux3Draft(FLUX3),
    notes: 'borrador barato (0,03/s registrado; publicado 0,06/s) · devuelve draft_cache para flux3-enhance'
  },
  {
    id: 'flux3-i2v',
    slug: 'blackforestlabs/flux-3/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Flux 3 — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: FLUX3,
    notes: 'auto o 5–20 s · 720p/1080p'
  },
  {
    id: 'flux3-i2v-draft',
    slug: 'blackforestlabs/flux-3/image-to-video/draft',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Flux 3 — imagen a video (draft)',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: flux3Draft(FLUX3),
    notes: 'borrador · devuelve draft_cache'
  },
  {
    id: 'flux3-flf',
    slug: 'blackforestlabs/flux-3/first-last-frame-to-video',
    kind: 'video',
    operation: 'first-last-frame-to-video',
    label: 'Flux 3 — primer y último cuadro a video',
    inputMediaField: 'start_image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: FLUX3_FLF,
    notes: '--image (primero) y --end-image (último) obligatorios · 5–20 s sin auto'
  },
  {
    id: 'flux3-flf-draft',
    slug: 'blackforestlabs/flux-3/first-last-frame-to-video/draft',
    kind: 'video',
    operation: 'first-last-frame-to-video',
    label: 'Flux 3 — primer y último cuadro (draft)',
    inputMediaField: 'start_image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: flux3Draft(FLUX3_FLF),
    notes: 'borrador · devuelve draft_cache'
  },
  {
    id: 'flux3-keyframes',
    slug: 'blackforestlabs/flux-3/keyframes-to-video',
    kind: 'video',
    operation: 'keyframes-to-video',
    label: 'Flux 3 — keyframes a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: FLUX3_KEYFRAMES,
    notes: '--keyframe <imagen>@<frame_index>, de 1 a 10 · 5–20 s sin auto'
  },
  {
    id: 'flux3-keyframes-draft',
    slug: 'blackforestlabs/flux-3/keyframes-to-video/draft',
    kind: 'video',
    operation: 'keyframes-to-video',
    label: 'Flux 3 — keyframes a video (draft)',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: flux3Draft(FLUX3_KEYFRAMES),
    notes: 'borrador · devuelve draft_cache'
  },
  {
    id: 'flux3-edit',
    slug: 'blackforestlabs/flux-3/edit-video',
    kind: 'video',
    operation: 'video-edit',
    label: 'Flux 3 Fast — editar video',
    inputMediaField: 'video_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: FLUX3_PASSTHROUGH,
    notes: '--video obligatorio · edición por prompt · USD 0,03/s'
  },
  {
    id: 'flux3-extend',
    slug: 'blackforestlabs/flux-3/extend-video',
    kind: 'video',
    operation: 'video-extend',
    label: 'Flux 3 — extender video',
    inputMediaField: 'video_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: { ...FLUX3, requiresSourceAudio: true },
    notes: '--video con pista de audio (usa hasta 4 s de video y audio como contexto) · entrega SÓLO la continuación (--duration = segundos nuevos); unir en post · 0,205/s registrado; publicado 0,41/s'
  },
  {
    id: 'flux3-extend-draft',
    slug: 'blackforestlabs/flux-3/extend-video/draft',
    kind: 'video',
    operation: 'video-extend',
    label: 'Flux 3 — extender video (draft)',
    inputMediaField: 'video_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: { ...flux3Draft(FLUX3), requiresSourceAudio: true },
    notes: 'borrador de la extensión (USD 0,06/s) · origen con audio · entrega sólo la continuación · devuelve draft_cache'
  },
  {
    id: 'flux3-enhance',
    slug: 'blackforestlabs/flux-3/draft-enhance',
    kind: 'video',
    operation: 'draft-enhance',
    label: 'Flux 3 — mejorar un draft',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: false,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: { ...FLUX3_PASSTHROUGH, draftCache: 'consumes' },
    notes: '--draft-cache <url> de un draft · entrega la versión final (verificado: 1920×1088) · USD 0,085/s'
  },

  // ── Wan 3.0 / Wan 3.0 Prime (Alibaba) — video · slugs SIN fal-ai/ ────────────────────────────────────
  {
    id: 'wan3-t2v',
    slug: 'alibaba/wan-3.0/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Wan 3.0 — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: WAN3,
    notes: '2–30 s o auto · 30 fps · USD 0,05/s a 480p; el default 1080p ≈ 0,20/s: pasa --resolution para explorar · --thinking'
  },
  {
    id: 'wan3-i2v',
    slug: 'alibaba/wan-3.0/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Wan 3.0 — imagen a video',
    inputMediaField: 'start_image_url',
    inputMedia: 'one',
    requiresPrompt: false,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: WAN3_I2V,
    notes: '--image = primer cuadro · --end-image opcional · prompt opcional'
  },
  {
    id: 'wan3-r2v',
    slug: 'alibaba/wan-3.0/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Wan 3.0 — referencias a video',
    inputMediaField: 'reference_image_urls',
    inputMedia: 'many',
    requiresPrompt: false,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: WAN3_R2V,
    notes: 'hasta 10 imágenes, 5 videos y 5 audios (≤ 15 s) · --web-url / --file con --thinking · prompt opcional'
  },
  {
    id: 'wan3prime-t2v',
    slug: 'alibaba/wan-3.0-prime/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Wan 3.0 Prime — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: WAN3,
    notes: '2–30 s o auto · 30 fps · versión acelerada según Alibaba (calidad vs base sin medir) · más cara que base: ≈ 0,28/s a 1080p (default) · --thinking'
  },
  {
    id: 'wan3prime-i2v',
    slug: 'alibaba/wan-3.0-prime/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Wan 3.0 Prime — imagen a video',
    inputMediaField: 'start_image_url',
    inputMedia: 'one',
    requiresPrompt: false,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: WAN3_I2V,
    notes: '--image = primer cuadro · --end-image opcional · prompt opcional'
  },
  {
    id: 'wan3prime-r2v',
    slug: 'alibaba/wan-3.0-prime/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Wan 3.0 Prime — referencias a video',
    inputMediaField: 'reference_image_urls',
    inputMedia: 'many',
    requiresPrompt: false,
    outputKey: 'video',
    verifiedAt: '2026-09-16',
    video: WAN3_R2V,
    notes: 'hasta 10 imágenes, 5 videos y 5 audios (≤ 15 s) · --web-url / --file con --thinking · prompt opcional'
  },
] as const

export const findFalCapability = (id: string): FalCapability | undefined =>
  FAL_CAPABILITIES.find(capability => capability.id === id)

export const FAL_CAPABILITY_IDS: readonly string[] = FAL_CAPABILITIES.map(capability => capability.id)
