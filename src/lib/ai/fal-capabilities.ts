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

  // ── Video — DECLARADO, SIN VERIFICAR ────────────────────────────────────────────────────────────
  // El CLI ya sabe operarlos (el transporte es el mismo), pero ninguno se ejercitó contra el API real.
  // Antes de marcar `verifiedAt` hay que correr uno y confirmar la forma del output: el contrato de
  // video NO está verificado y `outputKey: 'video'` es una hipótesis leída del catálogo, no evidencia.
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
    verifiedAt: null
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
    verifiedAt: null
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
    verifiedAt: null
  },
  {
    id: 'omni11-t2v',
    slug: 'google/gemini-omni-flash/v1.1/text-to-video',
    kind: 'video',
    operation: 'text-to-video',
    label: 'Gemini Omni Flash 1.1 — texto a video',
    inputMediaField: null,
    inputMedia: 'none',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null
  },
  {
    id: 'omni11-i2v',
    slug: 'google/gemini-omni-flash/v1.1/image-to-video',
    kind: 'video',
    operation: 'image-to-video',
    label: 'Gemini Omni Flash 1.1 — imagen a video',
    inputMediaField: 'image_url',
    inputMedia: 'one',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null
  },
  {
    id: 'omni11-r2v',
    slug: 'google/gemini-omni-flash/v1.1/reference-to-video',
    kind: 'video',
    operation: 'reference-to-video',
    label: 'Gemini Omni Flash 1.1 — referencias a video',
    inputMediaField: 'image_urls',
    inputMedia: 'many',
    requiresPrompt: true,
    outputKey: 'video',
    verifiedAt: null
  }
] as const

export const findFalCapability = (id: string): FalCapability | undefined =>
  FAL_CAPABILITIES.find(capability => capability.id === id)

export const FAL_CAPABILITY_IDS: readonly string[] = FAL_CAPABILITIES.map(capability => capability.id)
