/**
 * Lógica pura de `pnpm ai:listen`: que Gemini escuche/mire audio, video o imagen y lo describa.
 * Herramienta local de oficio (QA de sonido y animación); no cambia ningún default de producto.
 */
import { extname } from 'node:path'

import type { EnvSource } from '@/types/env-source'

/** Verificado en Vertex `global` el 2026-10-20: 3.8 Flash responde; 3.8 Pro y 3.5 Pro dan 404. */
export const GEMINI_MEDIA_DEFAULT_MODEL = 'gemini-3.8-flash'

/** Tope del contenido inline de Vertex (20 MB por petición, con margen para el prompt). */
export const GEMINI_MEDIA_MAX_INLINE_BYTES = 19 * 1024 * 1024

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
  const mime = MIME_BY_EXT[extname(path).toLowerCase()]

  if (!mime) throw new Error(`Formato no soportado: ${path}. Usa audio (wav/mp3/m4a/aac/flac/ogg), video (mp4/mov/webm) o imagen (png/jpg/webp).`)

  return mime
}

export interface ListenArgs {
  files: string[]
  prompt?: string
  promptFile?: string
  model: string
  out?: string
  json: boolean
  temperature: number
}

export const LISTEN_USAGE = `pnpm ai:listen — Gemini escucha o mira archivos y responde (QA de audio, sonido y animación)

  --file <ruta>             Audio, video o imagen (repetible; se envían en el orden dado)
  --prompt <texto>          Qué analizar
  --prompt-file <ruta>      El prompt desde un archivo
  --model <id>              Default ${GEMINI_MEDIA_DEFAULT_MODEL} (env GREENHOUSE_GEMINI_MEDIA_MODEL)
  --temperature <n>         Default 0.2
  --out <ruta>              Guarda la respuesta (markdown o JSON con --json)
  --json                    Devuelve {model, usage, text}

Ejemplo:
  pnpm ai:listen --file mezcla.wav --file video.mp4 --prompt-file critica.txt --out critica.md`

export const parseListenArgs = (argv: string[], env: EnvSource = process.env): ListenArgs => {
  const args: ListenArgs = {
    files: [],
    model: env.GREENHOUSE_GEMINI_MEDIA_MODEL?.trim() || GEMINI_MEDIA_DEFAULT_MODEL,
    json: false,
    temperature: 0.2
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
    else if (flag === '--model') args.model = next()
    else if (flag === '--out') args.out = next()
    else if (flag === '--temperature') args.temperature = Number(next())
    else if (flag === '--json') args.json = true
    else throw new Error(`Opción desconocida: ${flag}\n\n${LISTEN_USAGE}`)
  }

  if (args.files.length === 0) throw new Error(`Falta al menos un --file.\n\n${LISTEN_USAGE}`)
  if (!args.prompt && !args.promptFile) throw new Error('Falta --prompt o --prompt-file.')
  if (args.prompt && args.promptFile) throw new Error('Usa --prompt o --prompt-file, no ambos.')
  if (!Number.isFinite(args.temperature) || args.temperature < 0 || args.temperature > 2) throw new Error('--temperature debe estar entre 0 y 2.')

  args.files.forEach(mimeForPath)

  return args
}

export const assertInlineBudget = (sizes: number[]): void => {
  const total = sizes.reduce((sum, size) => sum + size, 0)

  if (total > GEMINI_MEDIA_MAX_INLINE_BYTES) {
    throw new Error(`Los archivos suman ${(total / 1048576).toFixed(1)} MB y el envío inline admite ${(GEMINI_MEDIA_MAX_INLINE_BYTES / 1048576).toFixed(0)} MB. Comprime o recorta antes.`)
  }
}
