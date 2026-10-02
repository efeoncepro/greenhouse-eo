import type { PickTargetSize, TargetSize } from '../crop'
import type { CanonicalMask, MaskConvention } from '../mask'

/**
 * Contrato de adaptador de imagen (TASK-1965).
 *
 * El adaptador sólo traduce al proveedor: convierte la máscara a su convención, arma el pedido y devuelve la salida
 * CRUDA. Recomponer y verificar lo hace el pipeline, nunca el adaptador, así que ningún proveedor nuevo puede saltarse
 * la garantía de la zona protegida.
 */
export interface ImageAdapterParams {
  model: string
  quality?: string
  seed?: number
}

export interface ImageAdapterRunInput extends ImageAdapterParams {
  prompt: string
  /** PNG al tamaño `size`. */
  image: Buffer
  /** Máscara canónica al tamaño `size`; el adaptador la convierte o la ignora si su proveedor no la usa. */
  mask: CanonicalMask
  size: TargetSize
}

export interface ImageAdapterRunOutput {
  /** Imagen cruda del proveedor (cualquier formato que sharp decodifique). */
  image: Buffer
  providerModel: string
  /** Costo de salida medido por el proveedor, si lo informa. */
  outputUsd: number | null
  usage: Record<string, unknown> | null
  /** Metadatos sin secretos ni URLs firmadas (ids de request, semilla efectiva). */
  meta: Record<string, unknown>
}

export interface CostEstimate {
  usd: number | null
  basis: string
}

export interface InpaintImageAdapter {
  /** Lo que el operador pasa a `--provider`/`--capability`. */
  id: string
  provider: 'openai' | 'fal'
  label: string
  defaultModel: string
  /** `true` si la máscara viaja al proveedor; `false` si el proveedor edita por instrucción y la máscara sólo recompone. */
  sendsMask: boolean
  maskConvention: MaskConvention | null
  /** Generación real verificada con este adaptador (YYYY-MM-DD); `null` = contrato verificado, generación no. */
  verifiedAt: string | null
  /** Valida modelo, calidad y semilla ANTES de gastar. */
  validate(params: ImageAdapterParams): void
  pickSize(model: string): PickTargetSize
  estimate(params: ImageAdapterParams & { size: TargetSize; count: number }): Promise<CostEstimate>
  run(input: ImageAdapterRunInput): Promise<ImageAdapterRunOutput>
}
