import type { FalCapability, FalPricingRule } from '@/lib/ai/fal-capabilities'

/**
 * Estimación de costo de fal ANTES de encolar. Funciones puras: el precio unitario de la API (si hace falta) llega por
 * parámetro, así se testea sin red.
 *
 * Por qué existe: el CLI encolaba sin decir cuánto costaba. El 2026-09-16 la verificación de Seedance costó el doble de
 * lo que se estimó a mano y Wan 3.0 a 1080p (su default) resultó costar 4× lo que devuelve la API de pricing. Toda
 * cifra es orientativa: la medida real es `pnpm ai:fal --balance` antes y después.
 */

export type FalCostConfidence = 'publicado' | 'api' | 'formula' | 'cota' | 'sin dato'

export interface FalCostEstimate {
  /** USD estimado; `null` si no hay datos suficientes. */
  usd: number | null
  /** Cómo se calculó, en español, para imprimirlo tal cual. */
  basis: string
  confidence: FalCostConfidence
}

export interface FalApiUnitPrice {
  unitPrice: number
  /** Unidad que devuelve fal: 'seconds', '1000 tokens', 'images', 'steps', 'units', … */
  unit: string
}

/** Área aproximada de salida por resolución de Seedance (medido: 480p 16:9 salió 864×496). */
const SEEDANCE_AREA_BY_RESOLUTION: Readonly<Record<string, number>> = {
  '480p': 864 * 496,
  '720p': 1280 * 720,
  '1080p': 1920 * 1080,
  '4k': 3840 * 2160
}

/** Área en píxeles de un `image_size` de fal (WxH o preset `auto_2K`, etc.). `null` si no se puede saber. */
export const falImageArea = (size: unknown): number | null => {
  if (size && typeof size === 'object') {
    const { width, height } = size as { width?: number; height?: number }

    return typeof width === 'number' && typeof height === 'number' ? width * height : null
  }

  if (typeof size !== 'string') return null

  const preset = /^auto_(\d+(?:\.\d+)?)K$/i.exec(size)

  if (preset) {
    const side = Number(preset[1]) * 1024

    return side * side
  }

  return null
}

const round = (value: number) => Math.round(value * 10_000) / 10_000

const numericDuration = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && /^\d+(\.\d+)?$/.test(value)) return Number(value)

  return null
}

/**
 * Segundos a cobrar: el pedido, el default del endpoint o, con `auto`, el máximo del contrato (cota superior: el
 * modelo elige el largo y puede llegar al tope).
 */
const resolveSeconds = (
  capability: FalCapability,
  rule: FalPricingRule,
  input: Record<string, unknown>
): { seconds: number | null; isUpperBound: boolean } => {
  const explicit = numericDuration(input.duration)

  if (explicit !== null) return { seconds: explicit, isUpperBound: false }

  const contract = capability.video?.duration ?? null
  const isAuto = input.duration === 'auto' || (input.duration === null && contract?.autoValue === null)

  if (isAuto && contract) return { seconds: contract.max, isUpperBound: true }
  if (rule.defaultSeconds !== undefined) return { seconds: rule.defaultSeconds, isUpperBound: false }
  if (contract?.acceptsAuto) return { seconds: contract.max, isUpperBound: true }

  return { seconds: null, isUpperBound: false }
}

const resolutionOf = (rule: FalPricingRule, input: Record<string, unknown>): string | null =>
  typeof input.resolution === 'string' ? input.resolution : rule.defaultResolution ?? null

const lookupByResolution = (table: Readonly<Record<string, number>>, resolution: string | null): number | null => {
  if (!resolution) return null

  const key = Object.keys(table).find(item => item.toLowerCase() === resolution.toLowerCase())

  return key ? table[key] : null
}

/**
 * Estima el costo de una corrida. `apiPrice` es el precio unitario de `GET /v1/models/pricing` para el slug (opcional:
 * se usa sólo cuando no hay tabla publicada o para la fórmula de tokens).
 */
export const estimateFalCost = (params: {
  capability: FalCapability
  input: Record<string, unknown>
  apiPrice?: FalApiUnitPrice | null
  /** Duración del video de origen (edit/enhance), si se pudo medir localmente. */
  sourceSeconds?: number | null
}): FalCostEstimate => {
  const { capability, input, apiPrice } = params
  const rule = capability.pricing

  if (!rule) return { usd: null, basis: 'sin regla de precio para esta capacidad', confidence: 'sin dato' }

  if (rule.unit === 'token_1k') {
    const resolution = resolutionOf(rule, input)
    const area = resolution ? SEEDANCE_AREA_BY_RESOLUTION[resolution.toLowerCase()] : undefined
    const { seconds, isUpperBound } = resolveSeconds(capability, rule, input)

    if (!apiPrice || !area || seconds === null) {
      return { usd: null, basis: 'faltan precio por token, resolución o duración', confidence: 'sin dato' }
    }

    const tokens = (area * seconds * 24) / 1024
    const usd = round((tokens * apiPrice.unitPrice) / 1000)

    return {
      usd,
      basis:
        `${Math.round(tokens).toLocaleString('es-CL')} tokens (${resolution} × ${seconds} s × 24 fps / 1024) × ` +
        `USD ${apiPrice.unitPrice} por 1.000${isUpperBound ? ' · duración auto: cota superior' : ''}`,
      confidence: isUpperBound ? 'cota' : 'formula'
    }
  }

  if (rule.unit === 'second') {
    const resolution = resolutionOf(rule, input)
    const fromTable = rule.publishedUsdByResolution ? lookupByResolution(rule.publishedUsdByResolution, resolution) : null
    const perSecond = fromTable ?? rule.publishedUsdPerUnit ?? apiPrice?.unitPrice ?? null
    const source = fromTable !== null || rule.publishedUsdPerUnit !== undefined ? 'publicado' : 'api'
    const resolved = params.sourceSeconds ?? null
    const { seconds, isUpperBound } = resolved !== null ? { seconds: resolved, isUpperBound: false } : resolveSeconds(capability, rule, input)

    if (perSecond === null || seconds === null) {
      return { usd: null, basis: 'falta precio por segundo o duración (p. ej. largo del video de origen)', confidence: 'sin dato' }
    }

    return {
      usd: round(perSecond * seconds),
      basis: `${seconds} s × USD ${perSecond}/s${resolution ? ` (${resolution})` : ''} · precio ${source === 'publicado' ? 'publicado' : 'de la API (escalón más bajo)'}${isUpperBound ? ' · duración auto: cota superior' : ''}`,
      confidence: isUpperBound ? 'cota' : source
    }
  }

  if (rule.unit === 'image' || rule.unit === 'layer') {
    const area = falImageArea(input.image_size)
    const count = Math.max(1, Number(input.num_images ?? 1)) * Math.max(1, Number(input.max_images ?? 1))
    let perUnit: number | null = rule.publishedUsdPerUnit ?? null
    let areaNote = ''

    if (rule.publishedUsdByArea) {
      const large = area !== null && area > 1536 * 1536

      perUnit = large ? rule.publishedUsdByArea.above1536sq : rule.publishedUsdByArea.upTo1536sq
      areaNote = area === null ? ' (área sin dato: se asume ≤ 1536²)' : large ? ' (área > 1536²)' : ' (área ≤ 1536²)'
    }

    perUnit ??= apiPrice?.unitPrice ?? null

    if (perUnit === null) return { usd: null, basis: 'sin precio por imagen', confidence: 'sin dato' }

    if (rule.unit === 'layer') {
      return {
        usd: null,
        basis: `USD ${perUnit} por capa generada${areaNote}; el número de capas lo decide el modelo (hasta 16: ≤ USD ${round(perUnit * 16)})`,
        confidence: 'sin dato'
      }
    }

    const references = Array.isArray(input.image_urls) ? input.image_urls.length : 0
    const extra = rule.extraReferenceUsd && references > 1 ? rule.extraReferenceUsd * (references - 1) : 0

    return {
      usd: round(perUnit * count + extra),
      basis: `${count} imagen(es) × USD ${perUnit}${areaNote}${extra ? ` + ${references - 1} referencia(s) extra × USD ${rule.extraReferenceUsd}` : ''}`,
      confidence: 'publicado'
    }
  }

  // step
  const steps = Math.max(Number(input.number_of_steps ?? capability.training?.steps.defaultValue ?? 0), rule.minBillableUnits ?? 0)
  const perStep = apiPrice?.unitPrice ?? null

  if (!perStep || !steps) return { usd: null, basis: 'sin precio por step', confidence: 'sin dato' }

  return {
    usd: round(steps * perStep),
    basis: `${steps} steps × USD ${perStep}${rule.minBillableUnits ? ` (fal cobra mínimo ${rule.minBillableUnits})` : ''}`,
    confidence: 'api'
  }
}

/** Tope por defecto sobre el que el CLI exige `--yes`. Sobrescribible con FAL_COST_CONFIRM_USD o `--max-usd`. */
export const DEFAULT_FAL_COST_CONFIRM_USD = 1

export const resolveFalCostCap = (
  flag: string | undefined,
  env: Readonly<Record<string, string | undefined>> = process.env
): number => {
  const raw = flag ?? env.FAL_COST_CONFIRM_USD

  if (raw === undefined || raw === '') return DEFAULT_FAL_COST_CONFIRM_USD

  const value = Number(raw)

  if (!Number.isFinite(value) || value < 0) throw new Error(`Tope de costo inválido: "${raw}". Usa un número en USD, p. ej. 1.5.`)

  return value
}
