import type { PickTargetSize, TargetSize } from '../crop'
import type { CanonicalMask, MaskConvention } from '../mask'

/**
 * Contrato de adaptador de imagen (TASK-1965).
 *
 * El adaptador sólo traduce al proveedor: convierte la máscara a su convención, arma el pedido y devuelve la salida
 * CRUDA. Recomponer y verificar lo hace el pipeline, nunca el adaptador, así que ningún proveedor nuevo puede saltarse
 * la garantía de la zona protegida.
 */
export type ProviderMaskMode = 'auto' | 'on' | 'off'

export interface ImageAdapterParams {
  model: string
  quality?: string
  seed?: number
  /**
   * Si la máscara viaja al proveedor. `off`: el proveedor edita por instrucción la imagen entera y el pipeline
   * recompone sólo la zona (lo que permite usar un modelo cuya edición con máscara falla). `auto`: lo decide el
   * adaptador con lo medido.
   */
  providerMask?: ProviderMaskMode
}

export interface ImageAdapterRunInput extends ImageAdapterParams {
  prompt: string
  /** PNG al tamaño `size`. */
  image: Buffer
  /** Imágenes 2..N en orden: boceto (al tamaño `size`) y referencias del objeto. El adaptador las rechaza si su proveedor no las admite. */
  extraImages?: Buffer[]
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
  /** Modelo más potente del adaptador cuando no es el default; la CLI lo recuerda al operador o agente. */
  strongestModel?: { id: string; why: string }
  /** `true` si la máscara viaja al proveedor; `false` si el proveedor edita por instrucción y la máscara sólo recompone. */
  sendsMask: boolean
  maskConvention: MaskConvention | null
  /** Generación real verificada con este adaptador (YYYY-MM-DD); `null` = contrato verificado, generación no. */
  verifiedAt: string | null
  /** Sube cuando cambia cómo el adaptador arma el pedido: entra al hash, así la caché no reutiliza una salida vieja. */
  revision: number
  /** Valida modelo, calidad y semilla ANTES de gastar. */
  validate(params: ImageAdapterParams): void
  /** Si la máscara viajará con estos parámetros (default: `sendsMask`). Decide la guía automática de zona. */
  willSendMask?(params: ImageAdapterParams): boolean
  /** Avisos medidos sobre la combinación pedida (no bloquean): se imprimen antes de gastar. */
  advisories?(params: ImageAdapterParams): string[]
  pickSize(model: string): PickTargetSize
  estimate(params: ImageAdapterParams & { size: TargetSize; count: number }): Promise<CostEstimate>
  run(input: ImageAdapterRunInput): Promise<ImageAdapterRunOutput>
}
