/**
 * Lógica pura de `pnpm ai:listen`: que Gemini escuche/mire audio, video o imagen y lo critique.
 * Herramienta local de oficio (QA de sonido y animación); no cambia ningún default de producto.
 *
 * Hechos de Gemini 3.8 Flash que gobiernan este módulo (verificados en vivo el 2026-10-21):
 * - `temperature`/`top_p`/`top_k` se IGNORAN en la familia 3.x: el determinismo sale de `thinkingLevel` + schema.
 * - El video se muestrea a 1 fps por defecto: no ve un silencio de 0,25 s ni un tirón de dos cuadros. `fps` admite
 *   hasta 24 (60 devuelve 400) y el recorte `startOffset`/`endOffset` funciona; ambos sólo en modo estático.
 * - La resolución por defecto del video es la baja; `high` triplica los tokens; `ultra` sólo vale para imágenes.
 * - El audio dentro de un video llega a 1 kbps mono: una mezcla se critica pasando el WAV aparte (1 audio por prompt).
 * - El modo agéntico (`mediaProcessing: AGENTIC`) sólo responde en Vertex `v1beta1`.
 */
import { createHash } from 'node:crypto'
import { extname } from 'node:path'

import { GEMINI_MEDIA_PRESETS, type GeminiMediaPresetName } from '@/lib/ai/gemini-media-presets'

import type { EnvSource } from '@/types/env-source'

/** Verificado en Vertex `global` el 2026-10-20: 3.8 Flash responde; 3.8 Pro y 3.5 Pro dan 404. */
export const GEMINI_MEDIA_DEFAULT_MODEL = 'gemini-3.8-flash'

/** Tope del contenido inline de Vertex (20 MB por petición, con margen para el prompt). */
export const GEMINI_MEDIA_MAX_INLINE_BYTES = 19 * 1024 * 1024

/** `VideoMetadata.fps`: rango válido (0, 24] según el SDK 2.30 y la prueba en vivo (60 → 400). */
export const GEMINI_MEDIA_MAX_FPS = 24

/** Límites por prompt de Gemini 3.8 Flash en Vertex. */
export const GEMINI_MEDIA_MAX_VIDEOS = 10
export const GEMINI_MEDIA_MAX_AUDIO = 1

/** Cuadros por consulta sobre los que avisamos: 8 s a 24 fps ≈ 192 cuadros ≈ 15k tokens (medido). */
export const GEMINI_MEDIA_FRAME_BUDGET = 600

export type MediaKind = 'audio' | 'video' | 'image'
export type ThinkingLevelName = 'low' | 'medium' | 'high'
export type ResolutionName = 'low' | 'medium' | 'high' | 'ultra'

const MIME_BY_EXT: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

export const mimeForPath = (path: string): string => {
  const mime = MIME_BY_EXT[extname(path.split('?')[0]).toLowerCase()]

  if (!mime) throw new Error(`Formato no soportado: ${path}. Usa audio (wav/mp3/m4a/aac/flac/ogg), video (mp4/mov/webm) o imagen (png/jpg/webp).`)

  return mime
}

export const kindForPath = (path: string): MediaKind => mimeForPath(path).split('/')[0] as MediaKind

export interface ListenArgs {
  files: string[]
  prompt?: string
  promptFile?: string
  preset?: GeminiMediaPresetName
  model: string
  thinking?: ThinkingLevelName
  fps?: number
  clip?: { start: number; end: number }
  resolution?: ResolutionName
  agentic: boolean
  findings: boolean
  verify: boolean
  cues?: string
  gcs?: string
  keepGcs: boolean
  countTokens: boolean
  out?: string
  json: boolean
  /** Aceptado por compatibilidad; la familia Gemini 3.x lo ignora (se avisa). */
  temperature?: number
  warnings: string[]
}

export const LISTEN_USAGE = `pnpm ai:listen — Gemini escucha o mira archivos y responde (QA de audio, sonido y animación)

  --file <ruta|gs://>       Audio, video o imagen (repetible; se envían en el orden dado). Máx. 1 audio y 10 videos
  --prompt <texto>          Qué analizar (con --preset, se suma como contexto)
  --prompt-file <ruta>      El prompt desde un archivo
  --preset <nombre>         Rúbrica versionada: ${Object.keys(GEMINI_MEDIA_PRESETS).join(' | ')}
  --model <id>              Default ${GEMINI_MEDIA_DEFAULT_MODEL} (env GREENHOUSE_GEMINI_MEDIA_MODEL)
  --thinking <nivel>        low | medium | high (default medium; high para análisis cuadro a cuadro, ~2-3 min)

  Precisión temporal (video, modo estático):
  --fps <n>                 Cuadros por segundo que mira Gemini (default 1; máx. ${GEMINI_MEDIA_MAX_FPS})
  --clip <ini>-<fin>        Tramo en segundos, p. ej. 1.5-2.5 (los tiempos de la respuesta siguen siendo absolutos)
  --resolution <nivel>      low | medium | high (ultra sólo imágenes). Video: default low; high triplica tokens
  --agentic                 Gemini navega el video y decide qué mirar (videos largos; incompatible con --fps/--clip)

  Salida estructurada y verificación:
  --findings                JSON con hallazgos {t, tipo, severidad, afirmacion, medible} y puntajes
  --verify                  Contrasta cada hallazgo medible con ffmpeg: confirmado | refutado | no_medible
  --cues <audio-cues.json>  Beat sheet: veredicto por cue; con --verify, además se mide cada cue

  Archivos y costo:
  --gcs gs://bucket/pref/   Sube los archivos locales a ese prefijo y los pasa por URI (para > 19 MB)
  --keep-gcs                No borra los archivos subidos al terminar
  --count-tokens            Sólo cuenta tokens de entrada (no genera)
  --out <ruta>              Guarda la respuesta (markdown, o JSON con --json/--findings)
  --json                    Devuelve {meta, text|findings, verificacion}

Ejemplos:
  pnpm ai:listen --file mezcla.wav --file video.mp4 --preset sync --cues audio-cues.json --verify --out qa.json
  pnpm ai:listen --file video.mp4 --clip 1.5-2.5 --fps 24 --thinking high --prompt "¿El golpe cae con el corte?"`

const THINKING: readonly ThinkingLevelName[] = ['low', 'medium', 'high']
const RESOLUTIONS: readonly ResolutionName[] = ['low', 'medium', 'high', 'ultra']

export const parseClip = (value: string): { start: number; end: number } => {
  const match = /^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/.exec(value.trim())

  if (!match) throw new Error(`--clip debe ser <inicio>-<fin> en segundos, p. ej. 1.5-2.5 (recibí «${value}»).`)

  const start = Number(match[1])
  const end = Number(match[2])

  if (!(end > start)) throw new Error('--clip: el fin debe ser mayor que el inicio.')

  return { start, end }
}

export const isGcsUri = (value: string) => /^gs:\/\/[^/\s]+\/.+/.test(value)

// Con límites de palabra: «Distingue» contiene «sting» y daba un falso aviso.
const SOUND_INTENT = /\b(mezcla|sonido|audio|sting|sfx|m[uú]sica|golpes?|silencios?|volumen|sincron[ií]a)\b/i

export const parseListenArgs = (argv: string[], env: EnvSource = process.env): ListenArgs => {
  const args: ListenArgs = {
    files: [],
    model: env.GREENHOUSE_GEMINI_MEDIA_MODEL?.trim() || GEMINI_MEDIA_DEFAULT_MODEL,
    agentic: false,
    findings: false,
    verify: false,
    keepGcs: false,
    countTokens: false,
    json: false,
    warnings: []
  }

  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]

    const next = () => {
      const value = argv[++i]

      if (value === undefined || value.startsWith('--')) throw new Error(`Falta el valor de ${flag}.`)

      return value
    }

    if (flag === '--file') args.files.push(next())
    else if (flag === '--prompt') args.prompt = next()
    else if (flag === '--prompt-file') args.promptFile = next()
    else if (flag === '--preset') {
      const name = next()

      if (!(name in GEMINI_MEDIA_PRESETS)) throw new Error(`--preset desconocido: ${name}. Opciones: ${Object.keys(GEMINI_MEDIA_PRESETS).join(', ')}.`)
      args.preset = name as GeminiMediaPresetName
    } else if (flag === '--model') args.model = next()
    else if (flag === '--thinking') {
      const level = next().toLowerCase() as ThinkingLevelName

      if (!THINKING.includes(level)) throw new Error('--thinking debe ser low, medium o high (minimal no existe en Gemini 3.8).')
      args.thinking = level
    } else if (flag === '--fps') args.fps = Number(next())
    else if (flag === '--clip') args.clip = parseClip(next())
    else if (flag === '--resolution') {
      const level = next().toLowerCase() as ResolutionName

      if (!RESOLUTIONS.includes(level)) throw new Error('--resolution debe ser low, medium, high o ultra.')
      args.resolution = level
    } else if (flag === '--agentic') args.agentic = true
    else if (flag === '--findings') args.findings = true
    else if (flag === '--verify') args.verify = true
    else if (flag === '--cues') args.cues = next()
    else if (flag === '--gcs') args.gcs = next()
    else if (flag === '--keep-gcs') args.keepGcs = true
    else if (flag === '--count-tokens') args.countTokens = true
    else if (flag === '--out') args.out = next()
    else if (flag === '--temperature') args.temperature = Number(next())
    else if (flag === '--json') args.json = true
    else throw new Error(`Opción desconocida: ${flag}\n\n${LISTEN_USAGE}`)
  }

  if (args.files.length === 0) throw new Error(`Falta al menos un --file.\n\n${LISTEN_USAGE}`)
  if (!args.prompt && !args.promptFile && !args.preset) throw new Error('Falta --prompt, --prompt-file o --preset.')
  if (args.prompt && args.promptFile) throw new Error('Usa --prompt o --prompt-file, no ambos.')

  const kinds = args.files.map(kindForPath)
  const videos = kinds.filter(kind => kind === 'video').length
  const audios = kinds.filter(kind => kind === 'audio').length

  if (audios > GEMINI_MEDIA_MAX_AUDIO) throw new Error(`Gemini 3.8 admite ${GEMINI_MEDIA_MAX_AUDIO} archivo de audio por consulta; recibí ${audios}.`)
  if (videos > GEMINI_MEDIA_MAX_VIDEOS) throw new Error(`Gemini 3.8 admite ${GEMINI_MEDIA_MAX_VIDEOS} videos por consulta; recibí ${videos}.`)

  if (args.fps !== undefined && !(Number.isFinite(args.fps) && args.fps > 0 && args.fps <= GEMINI_MEDIA_MAX_FPS)) {
    throw new Error(`--fps debe estar entre 0 y ${GEMINI_MEDIA_MAX_FPS} (Vertex rechaza más).`)
  }

  if ((args.fps !== undefined || args.clip) && videos === 0) throw new Error('--fps y --clip sólo aplican a videos.')
  if (args.agentic && (args.fps !== undefined || args.clip)) throw new Error('--agentic no admite --fps ni --clip: en modo agéntico Gemini decide qué mirar.')
  if (args.agentic && videos === 0) throw new Error('--agentic sólo aplica a videos.')
  if (args.resolution === 'ultra' && videos > 0) throw new Error('--resolution ultra sólo vale para imágenes; para video usa high.')
  if (args.gcs && !isGcsUri(args.gcs.replace(/\/?$/, '/x'))) throw new Error('--gcs debe ser gs://bucket/prefijo/.')
  if (args.verify) args.findings = true
  if (args.cues && !args.findings) args.findings = true

  if (args.temperature !== undefined) {
    args.warnings.push('--temperature se ignora en Gemini 3.x; para respuestas consistentes usa --thinking y --findings.')
  }

  // La intención sonora puede venir del autor o de la rúbrica (p. ej. `cierre` pregunta por el sting).
  const intent = `${args.prompt ?? ''} ${args.preset ? GEMINI_MEDIA_PRESETS[args.preset].prompt : ''}`

  if (videos > 0 && audios === 0 && (args.preset === 'sync' || SOUND_INTENT.test(intent))) {
    args.warnings.push('Gemini escucha el audio de un video a 1 kbps mono: para criticar la mezcla, pasa también el WAV con --file.')
  }

  return args
}

export const assertInlineBudget = (sizes: number[]): void => {
  const total = sizes.reduce((sum, size) => sum + size, 0)

  if (total > GEMINI_MEDIA_MAX_INLINE_BYTES) {
    throw new Error(
      `Los archivos suman ${(total / 1048576).toFixed(1)} MB y el envío inline admite ${(GEMINI_MEDIA_MAX_INLINE_BYTES / 1048576).toFixed(0)} MB. Usa --gcs gs://bucket/prefijo/ o recorta.`
    )
  }
}

/** Cuadros que mirará Gemini en un video local; avisa antes de una consulta cara. */
export const estimateFrames = (durationSec: number, fps = 1, clip?: { start: number; end: number }) => {
  const span = clip ? Math.max(0, Math.min(clip.end, durationSec) - clip.start) : durationSec

  return Math.ceil(span * fps)
}

/** Formato de offset de Vertex («1.5s»). */
export const toOffset = (seconds: number) => `${Number(seconds.toFixed(3))}s`

export const PART_RESOLUTION: Record<ResolutionName, string> = {
  low: 'MEDIA_RESOLUTION_LOW',
  medium: 'MEDIA_RESOLUTION_MEDIUM',
  high: 'MEDIA_RESOLUTION_HIGH',
  ultra: 'MEDIA_RESOLUTION_ULTRA_HIGH'
}

export interface MediaSource {
  path: string
  mimeType: string
  /** base64 inline o URI gs:// (uno de los dos). */
  data?: string
  uri?: string
}

/** Arma una parte de contenido con los controles de video/resolución que correspondan a su tipo. */
export const buildMediaPart = (source: MediaSource, args: Pick<ListenArgs, 'fps' | 'clip' | 'resolution' | 'agentic'>) => {
  const kind = source.mimeType.split('/')[0] as MediaKind
  const part: Record<string, unknown> = source.uri ? { fileData: { fileUri: source.uri, mimeType: source.mimeType } } : { inlineData: { mimeType: source.mimeType, data: source.data } }

  if (kind === 'video') {
    if (args.agentic) part.mediaProcessing = 'AGENTIC'
    else if (args.fps !== undefined || args.clip) {
      const metadata: Record<string, unknown> = {}

      if (args.fps !== undefined) metadata.fps = args.fps

      if (args.clip) {
        metadata.startOffset = toOffset(args.clip.start)
        metadata.endOffset = toOffset(args.clip.end)
      }

      part.videoMetadata = metadata
    }
  }

  if (args.resolution && kind !== 'audio') part.mediaResolution = { level: PART_RESOLUTION[args.resolution] }

  return part
}

export const FINDING_TYPES = ['silencio', 'golpe', 'corte', 'cuadro_quieto', 'desfase', 'nivel', 'legibilidad', 'ritmo', 'juicio'] as const
export type FindingType = (typeof FINDING_TYPES)[number]

/** Tipos que la CLI sabe medir con ffmpeg. El resto queda «no_medible» aunque el modelo diga lo contrario. */
export const MEASURABLE_TYPES: readonly FindingType[] = ['silencio', 'golpe', 'corte', 'cuadro_quieto', 'desfase']

export interface Finding {
  t: number
  t_fin?: number
  tipo: FindingType
  severidad: 'alta' | 'media' | 'baja'
  afirmacion: string
  medible: boolean
  sugerencia?: string
}

export interface CueVerdict {
  t: number
  veredicto: 'cumple' | 'falla' | 'dudoso'
  nota: string
}

export interface FindingsReport {
  resumen: string
  puntajes?: { impacto?: number; sincronia?: number; cierre?: number; legibilidad?: number }
  hallazgos: Finding[]
  cues?: CueVerdict[]
}

/** JSON Schema de la respuesta (`responseJsonSchema`). Sin `minimum`/`maximum`: algunos validadores estrictos los rechazan. */
export const buildFindingsSchema = (withCues: boolean) => ({
  type: 'object',
  properties: {
    resumen: { type: 'string', description: 'Veredicto general en 1-3 frases.' },
    puntajes: {
      type: 'object',
      description: 'Puntajes de 0 a 10 (sólo los que apliquen).',
      properties: { impacto: { type: 'number' }, sincronia: { type: 'number' }, cierre: { type: 'number' }, legibilidad: { type: 'number' } }
    },
    hallazgos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          t: { type: 'number', description: 'Segundo de inicio, medido desde el inicio del ARCHIVO completo, con decimales.' },
          t_fin: { type: 'number', description: 'Segundo de fin si el hallazgo es un tramo.' },
          tipo: { type: 'string', enum: [...FINDING_TYPES] },
          severidad: { type: 'string', enum: ['alta', 'media', 'baja'] },
          afirmacion: { type: 'string', description: 'Qué observas, en una frase concreta.' },
          medible: { type: 'boolean', description: 'true si la afirmación se puede comprobar midiendo audio o imagen (tiempo, nivel, silencio, cuadro quieto).' },
          sugerencia: { type: 'string' }
        },
        required: ['t', 'tipo', 'severidad', 'afirmacion', 'medible']
      }
    },
    ...(withCues
      ? {
          cues: {
            type: 'array',
            description: 'Un veredicto por cada cue de la hoja, en el mismo orden.',
            items: {
              type: 'object',
              properties: { t: { type: 'number' }, veredicto: { type: 'string', enum: ['cumple', 'falla', 'dudoso'] }, nota: { type: 'string' } },
              required: ['t', 'veredicto', 'nota']
            }
          }
        }
      : {})
  },
  required: withCues ? ['resumen', 'hallazgos', 'cues'] : ['resumen', 'hallazgos']
})

export interface Cue {
  t: number
  hasta?: number
  imagen?: string
  sonido?: string
}

/** Lee la hoja de cues (formato `audio-cues.json` de la serie de partners). */
export const parseCues = (raw: unknown): Cue[] => {
  const list = Array.isArray(raw) ? raw : (raw as { cues?: unknown })?.cues

  if (!Array.isArray(list)) throw new Error('--cues: el JSON debe ser un arreglo o tener la clave "cues".')

  return list.map((item, index) => {
    const cue = item as Record<string, unknown>

    if (typeof cue.t !== 'number') throw new Error(`--cues: el cue ${index + 1} no tiene "t" numérico.`)

    return {
      t: cue.t,
      hasta: typeof cue.hasta === 'number' ? cue.hasta : undefined,
      imagen: typeof cue.imagen === 'string' ? cue.imagen : undefined,
      sonido: typeof cue.sonido === 'string' ? cue.sonido : undefined
    }
  })
}

export type CueExpectation = { kind: 'silencio'; t: number; tFin: number } | { kind: 'golpe'; t: number } | { kind: 'pico'; t: number }

/** Qué se puede medir de un cue a partir de su texto (independiente de lo que diga Gemini). */
export const cueExpectations = (cue: Cue): CueExpectation[] => {
  const text = `${cue.imagen ?? ''} ${cue.sonido ?? ''}`.toLowerCase()
  const out: CueExpectation[] = []

  const declared = /silencio[^0-9]*(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/.exec(text)

  if (declared) out.push({ kind: 'silencio', t: Number(declared[1].replace(',', '.')), tFin: Number(declared[2].replace(',', '.')) })
  else if (/silencio/.test(text) && cue.hasta !== undefined) out.push({ kind: 'silencio', t: cue.t, tFin: cue.hasta })
  // Un golpe es un instante: sólo en cues sin «hasta» (en el tramo 5–8 s «cola del drop» no es un golpe).
  if (cue.hasta === undefined && /golpe|impacto|drop/.test(text) && !/silencio/.test(cue.sonido?.toLowerCase() ?? '')) out.push({ kind: 'golpe', t: cue.t })
  if (/pico|sting/.test(cue.sonido?.toLowerCase() ?? '') && cue.hasta === undefined) out.push({ kind: 'pico', t: cue.t })

  return out
}

/** Arma el prompt final: rúbrica + contexto del autor + reglas de tiempo + hoja de cues. */
export const composePrompt = (input: { preset?: GeminiMediaPresetName; userPrompt?: string; clip?: { start: number; end: number }; cues?: Cue[]; files: string[]; findings: boolean }) => {
  const blocks: string[] = []

  blocks.push(
    `Archivos, en orden: ${input.files.map((file, index) => `(${index + 1}) ${kindForPath(file)} «${file.split('/').pop()}»`).join(', ')}.`
  )

  if (input.preset) blocks.push(GEMINI_MEDIA_PRESETS[input.preset].prompt)
  if (input.userPrompt) blocks.push(input.preset ? `Contexto del autor:\n${input.userPrompt}` : input.userPrompt)

  if (input.clip) {
    blocks.push(`Sólo se te muestra el tramo ${input.clip.start}–${input.clip.end} s del video. Expresa todos los tiempos medidos desde el inicio del ARCHIVO completo, no del tramo.`)
  }

  if (input.cues) {
    blocks.push(
      `Hoja de cues planificada (t en segundos desde el inicio):\n${JSON.stringify(input.cues, null, 1)}\nDa un veredicto por cue: cumple, falla o dudoso.`
    )
  }

  if (input.findings) {
    blocks.push(
      'Responde en el JSON pedido. Reglas: cada tiempo con decimales y absoluto; marca medible=true sólo si la afirmación se puede comprobar midiendo (un tiempo, un nivel, un silencio, un cuadro quieto); no inventes tiempos que no viste: si no estás seguro, dilo en la afirmación y baja la severidad.'
    )
  }

  return blocks.join('\n\n')
}

export const shortHash = (value: string | Buffer) => createHash('sha256').update(value).digest('hex').slice(0, 12)
