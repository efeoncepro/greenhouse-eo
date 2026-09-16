import { SEEDANCE_AREA_BY_RESOLUTION } from './fal-pricing'

/**
 * Cota de costo para los endpoints de Higgsfield cuya API de estimación devuelve una FÓRMULA en vez de un monto
 * (`type: description`): Seedance 2.0/2.5 (tokens de video) y Wan 3.0 (USD por segundo según resolución).
 *
 * Las tarifas se transcriben de esa misma fórmula del proveedor (verificada 2026-09-16) y son "antes de descuento":
 * el resultado es una cota SUPERIOR, apta para el tope de confirmación de la CLI. Cuando la fórmula depende de la
 * duración de un video de entrada que no se conoce, no se inventa: devuelve `null` y la CLI exige `--yes`.
 */

export interface HiggsfieldFormulaEstimate {
  usd: number
  basis: string
}

type SeedanceRates = { standard: Readonly<Record<string, number>>; withVideoInput: Readonly<Record<string, number>> | null }

interface SeedanceRule {
  kind: 'seedance-tokens'
  rates: SeedanceRates
  /** El video de entrada también se factura (editar/extender, referencias con video). */
  billsInputVideo: boolean
  /** Editar no acepta duración: la salida dura lo mismo que el origen. */
  outputFollowsInput: boolean
}

interface PerSecondRule {
  kind: 'per-second'
  usdPerSecondByResolution: Readonly<Record<string, number>>
}

type HiggsfieldFormulaRule = SeedanceRule | PerSecondRule

const SEEDANCE_25: SeedanceRates = {
  standard: { '480p': 0.0214, '720p': 0.0214 },
  withVideoInput: { '480p': 0.01284, '720p': 0.01284 }
}

const SEEDANCE_2: SeedanceRates = {
  standard: { '480p': 0.014, '720p': 0.014, '1080p': 0.014, '4k': 0.008 },
  withVideoInput: { '480p': 0.0084, '720p': 0.0084, '1080p': 0.0084, '4k': 0.0048 }
}

const WAN_3: PerSecondRule = { kind: 'per-second', usdPerSecondByResolution: { '480p': 0.05, '720p': 0.1, '1080p': 0.2 } }

const seedance = (rates: SeedanceRates, billsInputVideo = false, outputFollowsInput = false): SeedanceRule => ({
  kind: 'seedance-tokens',
  rates,
  billsInputVideo,
  outputFollowsInput
})

const RULES: Readonly<Record<string, HiggsfieldFormulaRule>> = {
  'bytedance/seedance-2.5/text-to-video': seedance(SEEDANCE_25),
  'bytedance/seedance-2.5/image-to-video': seedance(SEEDANCE_25),
  'bytedance/seedance-2.5/reference-to-video': seedance(SEEDANCE_25, true),
  'bytedance/seedance-2.5/video-edit': seedance({ standard: SEEDANCE_25.withVideoInput!, withVideoInput: SEEDANCE_25.withVideoInput }, true, true),
  'bytedance/seedance-2.5/video-extend': seedance({ standard: SEEDANCE_25.withVideoInput!, withVideoInput: SEEDANCE_25.withVideoInput }, true),
  'bytedance/seedance-2.0/text-to-video': seedance(SEEDANCE_2),
  'bytedance/seedance-2.0/image-to-video': seedance(SEEDANCE_2),
  'bytedance/seedance-2.0/reference-to-video': seedance(SEEDANCE_2, true),
  'alibaba/wan-3.0/text-to-video': WAN_3,
  'alibaba/wan-3.0/image-to-video': WAN_3,
  'alibaba/wan-3.0/reference-to-video': WAN_3
}

/** Defaults del proveedor cuando el cuerpo no trae el campo (esquemas 2026-09-16). */
const DEFAULT_SECONDS = 5
const DEFAULT_RESOLUTION: Readonly<Record<HiggsfieldFormulaRule['kind'], string>> = { 'seedance-tokens': '720p', 'per-second': '1080p' }

const hasVideoInput = (input: Record<string, unknown>) =>
  typeof input.video_url === 'string' || (Array.isArray(input.video_urls) && input.video_urls.length > 0)

const round = (value: number) => Math.round(value * 10_000) / 10_000

/**
 * Cota en USD para el cuerpo, o `null` si el endpoint no tiene regla o falta un dato que la fórmula necesita.
 * `inputVideoSeconds` = suma medida de los videos de entrada, si la CLI pudo medirla.
 */
export const estimateHiggsfieldFormulaCost = (params: {
  endpoint: string
  input: Record<string, unknown>
  inputVideoSeconds?: number | null
}): HiggsfieldFormulaEstimate | null => {
  const rule = RULES[params.endpoint]

  if (!rule) return null

  const { input } = params
  const resolution = (typeof input.resolution === 'string' ? input.resolution : DEFAULT_RESOLUTION[rule.kind]).toLowerCase()
  const requestedSeconds = typeof input.duration === 'number' ? input.duration : DEFAULT_SECONDS

  if (rule.kind === 'per-second') {
    const rate = rule.usdPerSecondByResolution[resolution]

    if (rate === undefined) return null

    return {
      usd: round(rate * requestedSeconds),
      basis: `fórmula del proveedor: ${requestedSeconds} s × USD ${rate}/s a ${resolution} (antes de descuento)`
    }
  }

  const videoInput = hasVideoInput(input)
  const rates = videoInput && rule.rates.withVideoInput ? rule.rates.withVideoInput : rule.rates.standard
  const rate = rates[resolution]
  const area = SEEDANCE_AREA_BY_RESOLUTION[resolution]

  if (rate === undefined || area === undefined) return null

  const inputSeconds = videoInput && rule.billsInputVideo ? params.inputVideoSeconds ?? null : 0

  // Sin la duración del video de entrada la cuenta no cierra: mejor pedir confirmación que subestimar.
  if (inputSeconds === null) return null

  const outputSeconds = rule.outputFollowsInput ? inputSeconds : requestedSeconds
  const tokens = Math.ceil(((inputSeconds + outputSeconds) * area * 24) / 1024)
  const usd = round((tokens / 1000) * rate)

  return {
    usd,
    basis: `fórmula del proveedor: ${tokens.toLocaleString('es-CL')} tokens de video (${inputSeconds + outputSeconds} s a ${resolution}) × USD ${rate}/1.000 (antes de descuento)`
  }
}
