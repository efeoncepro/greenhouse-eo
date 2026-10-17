/** BytePlus Johor. Tarifas observadas en la cuenta del operador, 2026-10-12; no son settlement. */
export const BYTEPLUS_PRICE_AS_OF = '2026-10-12'
export type BytePlusKind = 'image' | 'video' | 'audio' | 'tts' | 'asr-file' | 'asr-stream' | 'interpretation'
export interface BytePlusModel {
  id: string
  model: string
  kind: BytePlusKind
  layers?: boolean
  resource?: string
  /** USD por millón de tokens, sin video de entrada, a 480p/720p. */
  videoRate?: number
  videoInputRate?: number
  imageRate?: number
  /** Precio por imagen/capa pequeña y grande; el umbral de BytePlus es 2.61 MP. */
  imageTiers?: readonly [number, number]
  layerTiers?: readonly [number, number]
  maxDuration?: number
  resolutions?: readonly string[]
  /** Modo borrador del fabricante: borrador a una resolución fija y final desde su task ID, dentro de la vigencia. */
  draft?: { readonly resolution: string; readonly finalResolutions: readonly string[]; readonly ttlDays: number }
}
export const BYTEPLUS_MODELS: readonly BytePlusModel[] = [
  { id: 'seedream5-flash', model: 'dola-seedream-5-0-flash-260915', kind: 'image', layers: true, imageRate: 0.018, layerTiers: [0.018, 0.018] },
  { id: 'seedream5-pro', model: 'dola-seedream-5-0-pro-260628', kind: 'image', layers: true, imageTiers: [0.0405, 0.081], layerTiers: [0.02025, 0.0405] },
  { id: 'seedream5-lite', model: 'seedream-5-0-lite-260128', kind: 'image', imageRate: 0.0315 },
  { id: 'seedream45', model: 'seedream-4-5-251128', kind: 'image', imageRate: 0.036 },
  { id: 'seedream4', model: 'seedream-4-0-250828', kind: 'image', imageRate: 0.027 },
  // Borrador: tutorial oficial «Dreamina Seedance 2.5 Draft mode» (2026-10-16): 480p fijo, final sólo 1080p, 7 días.
  { id: 'seedance25', model: 'dreamina-seedance-2-5-260628', kind: 'video', videoRate: 10.7, videoInputRate: 6.4, maxDuration: 30, resolutions: ['480p', '720p', '1080p'],
    draft: { resolution: '480p', finalResolutions: ['1080p'], ttlDays: 7 } },
  { id: 'seedance2', model: 'dreamina-seedance-2-0-260128', kind: 'video', videoRate: 7, videoInputRate: 4.3, maxDuration: 15, resolutions: ['480p', '720p', '1080p', '4k'] },
  { id: 'seedance2-fast', model: 'dreamina-seedance-2-0-fast-260128', kind: 'video', videoRate: 2.8, videoInputRate: 1.65, maxDuration: 15, resolutions: ['480p', '720p'] },
  { id: 'seedance2-mini', model: 'dreamina-seedance-2-0-mini-260615', kind: 'video', videoRate: 1.4, videoInputRate: 0.84, maxDuration: 15, resolutions: ['480p', '720p'] },
  { id: 'seedance1-pro', model: 'seedance-1-0-pro-250528', kind: 'video', videoRate: 2.375, maxDuration: 12, resolutions: ['480p', '720p', '1080p'] },
  { id: 'seedance1-fast', model: 'seedance-1-0-pro-fast-251015', kind: 'video', videoRate: 0.9, maxDuration: 12, resolutions: ['480p', '720p', '1080p'] },
  { id: 'seed-audio', model: 'seed-audio-1.0', kind: 'audio' },
  { id: 'tts2', model: 'seed-tts-2.0', resource: 'seed-tts-2.0', kind: 'tts' },
  { id: 'tts1', model: 'seed-tts-1.0', resource: 'seed-tts-1.0', kind: 'tts' },
  { id: 'voice2', model: 'seed-icl-2.0', resource: 'seed-icl-2.0', kind: 'tts' },
  { id: 'voice1', model: 'seed-icl-1.0', resource: 'seed-icl-1.0', kind: 'tts' },
  { id: 'asr2-file', model: 'seed-asr-2.0', resource: 'volc.seedasr.auc', kind: 'asr-file' },
  { id: 'asr1-file', model: 'seed-asr-1.0', resource: 'volc.bigasr.auc', kind: 'asr-file' },
  { id: 'asr2-stream', model: 'seed-asr-2.0', resource: 'volc.seedasr.sauc.duration', kind: 'asr-stream' },
  { id: 'asr1-stream', model: 'seed-asr-1.0', resource: 'volc.bigasr.sauc.duration', kind: 'asr-stream' },
  { id: 'interpretation2', model: 'live-interpretation-2.0', resource: 'volc.service_type.1000025', kind: 'interpretation' }
]

export const findBytePlusModel = (id: string): BytePlusModel => {
  const normalized = id.replace(/-layerize$/, '')
  const model = BYTEPLUS_MODELS.find(item => item.id === normalized || item.model === normalized)

  if (!model) throw new Error(`Modelo BytePlus desconocido: ${id}. Ver pnpm ai:byteplus --list.`)

  return model
}

export const bytePlusImageRate = (model: BytePlusModel, area: number, layers = false): number => {
  const tiers = layers ? model.layerTiers : model.imageTiers

  if (tiers) return tiers[area > 2_610_000 ? 1 : 0]
  if (!layers && model.imageRate !== undefined) return model.imageRate

  throw new Error('Este modelo no declara precio para esa operación.')
}

/** Dimensiones nominales de Seedance 2.x por ratio; la salida/usage real puede variar. */
export const bytePlusVideoDimensions = (resolution: string, ratio: string): readonly [number, number] => {
  const tables: Record<string, Record<string, readonly [number, number]>> = {
    '480p': { '16:9':[854,480], '4:3':[752,560], '1:1':[640,640], '3:4':[560,752], '9:16':[480,854], '21:9':[992,432] },
    '720p': { '16:9':[1280,720], '4:3':[1112,834], '1:1':[960,960], '3:4':[834,1112], '9:16':[720,1280], '21:9':[1470,630] },
    '1080p': { '16:9':[1920,1080], '4:3':[1664,1248], '1:1':[1440,1440], '3:4':[1248,1664], '9:16':[1080,1920], '21:9':[2206,946] }
  }

  const nominal = tables[resolution === '4k' ? '1080p' : resolution]?.[ratio]

  if (!nominal) throw new Error('Ratio no soportado; usa 16:9|4:3|1:1|3:4|9:16|21:9.')

  return resolution === '4k' ? [nominal[0]*2,nominal[1]*2] : nominal
}

/**
 * Al finalizar un borrador el fabricante reutiliza prompt, referencias, duración, ratio, seed, audio y tipo de tarea:
 * reenviarlos es error aunque coincidan. Sólo estos campos pueden acompañar al `draft_task`.
 */
export const BYTEPLUS_DRAFT_FINAL_ALLOWED_FIELDS = ['return_last_frame', 'output_format', 'watermark', 'service_tier',
  'execution_expires_after', 'priority', 'callback_url', 'safety_identifier'] as const

export const BYTEPLUS_TASK_ID_PATTERN = /^[a-zA-Z0-9_-]+$/

/** Arma el cuerpo del video final desde un borrador; falla antes de cualquier llamada si el pedido viola el contrato. */
export const buildBytePlusDraftFinalRequest = (model: BytePlusModel, draftTaskId: string, options: {
  resolution?: string; extra?: Record<string, unknown>
} = {}): Record<string, unknown> => {
  if (!model.draft) throw new Error(`${model.id} no admite modo borrador.`)
  if (!BYTEPLUS_TASK_ID_PATTERN.test(draftTaskId)) throw new Error('Task ID de borrador inválido.')
  const resolution = options.resolution ?? model.draft.finalResolutions[0]

  if (!model.draft.finalResolutions.includes(resolution)) throw new Error(`El final desde borrador sólo admite ${model.draft.finalResolutions.join('|')}.`)
  const extra = options.extra ?? {}
  const forbidden = Object.keys(extra).filter(key => !(BYTEPLUS_DRAFT_FINAL_ALLOWED_FIELDS as readonly string[]).includes(key))

  if (forbidden.length) throw new Error(`Campos no permitidos al finalizar un borrador (el fabricante los reutiliza): ${forbidden.join(', ')}.`)

  return { ...extra, model: model.model, content: [{ type: 'draft_task', draft_task: { id: draftTaskId } }], resolution }
}

/** Vigencia del borrador desde su `created_at` (segundos Unix). Sin dato, no se afirma vigencia: lo decide el fabricante. */
export const bytePlusDraftExpiry = (model: BytePlusModel, createdAtSeconds: number | undefined, nowMs = Date.now()) => {
  if (!model.draft || !Number.isFinite(createdAtSeconds)) return { known: false as const }
  const expiresAtMs = (createdAtSeconds as number) * 1000 + model.draft.ttlDays * 86_400_000

  return { known: true as const, expiresAt: new Date(expiresAtMs).toISOString(), expired: nowMs >= expiresAtMs }
}

export const estimateBytePlusVideo = (model: BytePlusModel, options: {
  width: number; height: number; duration: number; inputVideoSeconds?: number; resolution: string
}): number | null => {
  if (options.inputVideoSeconds !== undefined) return null // upstream impone mínimos variables con video de entrada
  let rate = model.videoRate

  if (model.id === 'seedance25' && options.resolution === '1080p') rate = 11.7
  if (model.id === 'seedance2' && options.resolution === '1080p') rate = 7.7
  if (model.id === 'seedance2' && options.resolution === '4k') rate = 4
  if (rate === undefined) return null

  return Math.ceil(options.width * options.height * options.duration * 24 / 1024) * rate / 1_000_000
}
