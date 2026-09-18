import type { FalCapability, FalTrainingContract } from '@/lib/ai/fal-capabilities'

/**
 * Reglas de entrada del CLI `pnpm ai:fal` que no dependen de la red. Viven fuera del script para poder testearlas:
 * cada una corresponde a una falla real detectada el 2026-09-16 (ver brechas en el catálogo fal).
 */

export type DetectedMediaFormat = 'png' | 'jpeg' | 'webp' | 'gif' | 'mp4' | 'mov' | 'zip'

const EXTENSION_BY_FORMAT: Readonly<Record<DetectedMediaFormat, string>> = {
  png: '.png',
  jpeg: '.jpg',
  webp: '.webp',
  gif: '.gif',
  mp4: '.mp4',
  mov: '.mov',
  zip: '.zip'
}

/** Formato real de un archivo por sus primeros bytes. `null` si no se reconoce. */
export const detectMediaFormat = (bytes: Uint8Array): DetectedMediaFormat | null => {
  const at = (index: number) => bytes[index]
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length))

  if (bytes.length >= 8 && at(0) === 0x89 && ascii(1, 3) === 'PNG') return 'png'
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'jpeg'
  if (bytes.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp'
  if (bytes.length >= 6 && ascii(0, 3) === 'GIF') return 'gif'
  if (bytes.length >= 4 && at(0) === 0x50 && at(1) === 0x4b && at(2) === 0x03 && at(3) === 0x04) return 'zip'

  if (bytes.length >= 12 && ascii(4, 4) === 'ftyp') return ascii(8, 2) === 'qt' ? 'mov' : 'mp4'

  return null
}

export const extensionForFormat = (format: DetectedMediaFormat): string => EXTENSION_BY_FORMAT[format]

const sameFormatExtension = (extension: string, format: DetectedMediaFormat): boolean => {
  const normalized = extension.toLowerCase()

  if (format === 'jpeg') return normalized === '.jpg' || normalized === '.jpeg'

  return normalized === EXTENSION_BY_FORMAT[format]
}

/**
 * Si el archivo descargado no coincide con la extensión pedida, devuelve la ruta corregida (misma base, extensión
 * real). Evita el caso de Seedream Pro: JPEG por defecto guardado como `.png`.
 */
export const reconcileOutputExtension = (target: string, format: DetectedMediaFormat | null): string => {
  if (!format) return target

  const dot = target.lastIndexOf('.')
  const slash = Math.max(target.lastIndexOf('/'), target.lastIndexOf('\\'))
  const extension = dot > slash ? target.slice(dot) : ''

  if (extension && sameFormatExtension(extension, format)) return target

  return `${dot > slash ? target.slice(0, dot) : target}${EXTENSION_BY_FORMAT[format]}`
}

/**
 * `output_format` a enviar para una capacidad de imagen, derivado de `--format` o, si no se pasó, de la extensión de
 * `--out`. Falla en local cuando el pedido no es posible (p. ej. `--format` en Seedream Lite, que no expone el campo).
 */
export const resolveImageOutputFormat = (params: {
  capability: FalCapability | null
  format?: string
  outPath?: string
}): 'jpeg' | 'png' | undefined => {
  const { capability, format, outPath } = params
  const output = capability?.imageOutput

  if (!capability || !output) return format === 'jpeg' || format === 'png' ? format : undefined

  if (format) {
    if (!output.formats.length) {
      throw new Error(`"${capability.id}" no acepta --format: entrega ${output.defaultFormat.toUpperCase()} siempre.`)
    }

    if (!output.formats.includes(format as 'jpeg' | 'png')) {
      throw new Error(`--format "${format}" no está en "${capability.id}". Formatos: ${output.formats.join(', ')}.`)
    }

    return format as 'jpeg' | 'png'
  }

  if (!outPath || !output.formats.length) return undefined

  const extension = outPath.slice(outPath.lastIndexOf('.')).toLowerCase()
  const fromExtension = extension === '.png' ? 'png' : extension === '.jpg' || extension === '.jpeg' ? 'jpeg' : null

  if (!fromExtension) {
    throw new Error(`--out "${outPath}": "${capability.id}" sólo entrega ${output.formats.join(' o ')}; usa .png o .jpg.`)
  }

  return fromExtension
}

/** `--seed` sólo donde el endpoint lo declara. */
export const assertSeedAllowed = (capability: FalCapability | null, seed: string | undefined): void => {
  if (seed === undefined || !capability) return

  if (!capability.acceptsSeed) {
    throw new Error(`"${capability.id}" no declara seed en su contrato; quita --seed (fal podría ignorarlo o fallar).`)
  }
}

/** Tope de `--image` que el endpoint realmente usa. */
export const assertMaxInputImages = (capability: FalCapability | null, count: number): void => {
  const max = capability?.maxInputImages

  if (max !== undefined && count > max) {
    throw new Error(`"${capability!.id}" usa como máximo ${max} --image (fal toma sólo las últimas ${max}); pasaste ${count}.`)
  }
}

export interface ParsedLora {
  path: string
  scale?: number
  weight_name?: string
}

/**
 * `--lora <path>[@<scale>][#<weight_name>]`. El path puede ser URL o repo de Hugging Face; `weight_name` elige el
 * archivo de pesos dentro del repo.
 */
export const parseLoraFlag = (raw: string, scaleMin: number, scaleMax: number): ParsedLora => {
  const hash = raw.lastIndexOf('#')
  const weightName = hash > 0 ? raw.slice(hash + 1).trim() : ''
  const rest = hash > 0 ? raw.slice(0, hash) : raw

  if (hash > 0 && !weightName) throw new Error(`--lora "${raw}": weight_name vacío después de #.`)

  const at = rest.lastIndexOf('@')
  const hasScale = at > 0 && /^\d+(\.\d+)?$/.test(rest.slice(at + 1))
  const path = (hasScale ? rest.slice(0, at) : rest).trim()

  if (!path) throw new Error(`--lora "${raw}" no trae path.`)

  const lora: ParsedLora = { path }

  if (hasScale) {
    const scale = Number(rest.slice(at + 1))

    if (scale < scaleMin || scale > scaleMax) {
      throw new Error(`--lora "${raw}": la escala debe estar entre ${scaleMin} y ${scaleMax}.`)
    }

    lora.scale = scale
  }

  if (weightName) lora.weight_name = weightName

  return lora
}

/** `number_of_frames` del entrenador H3: rango y regla `frames % 17 == 5`. */
export const assertTrainingFrames = (training: FalTrainingContract, value: unknown): number => {
  const frames = Number(value)
  const { min, max, modulo, remainder } = training.frames

  if (!Number.isInteger(frames) || frames < min || frames > max || frames % modulo !== remainder) {
    const valid: number[] = []

    for (let candidate = min; candidate <= max; candidate++) if (candidate % modulo === remainder) valid.push(candidate)

    throw new Error(`number_of_frames "${value}" no es válido: debe estar en ${min}–${max} y cumplir frames % ${modulo} == ${remainder} (${valid.join(', ')}).`)
  }

  return frames
}

/** `split_input_duration_threshold` del entrenador H3, en segundos. */
export const assertSplitThreshold = (training: FalTrainingContract, value: unknown): number => {
  const seconds = Number(value)
  const { min, max } = training.splitThreshold

  if (!Number.isFinite(seconds) || seconds < min || seconds > max) {
    throw new Error(`split_input_duration_threshold "${value}" debe estar entre ${min} y ${max} segundos.`)
  }

  return seconds
}
