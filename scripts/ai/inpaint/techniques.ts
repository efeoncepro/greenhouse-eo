import sharp from 'sharp'

import type { InpaintImageAdapter } from './adapters/types'
import { dilate, feather, type CanonicalMask } from './mask'
import type { RgbaImage } from './raw'

/**
 * Técnicas de edición sobre el pipeline de inpainting (TASK-1973): borrar con clean plate o con modelo, y la medición
 * de residuo. Todo termina en la recomposición y la verificación del núcleo (`runImageInpaint`).
 */

/** Prompt por defecto para borrar con un modelo con máscara. */
export const ERASE_DEFAULT_PROMPT =
  'Remove the object in the marked area completely, including its shadow and reflection. Reconstruct what is behind it so the surface, texture and lighting continue naturally. Leave the area empty: no new objects.'

/**
 * Máscara de borrado DERIVADA (de capa o de sujeto): se agranda para llevarse el borde y la sombra de contacto, y se
 * difumina. Una máscara explícita del operador nunca pasa por acá.
 */
export const prepareEraseMask = async (mask: CanonicalMask, growPx = 16, featherPx = 12): Promise<CanonicalMask> => feather(dilate(mask, growPx), featherPx)

/**
 * Adaptador local «clean plate»: devuelve la base de Layerize (la escena sin los elementos) ya en el tamaño de la
 * original, sin llamar a ningún proveedor ni gastar. El pipeline la trata como cualquier salida cruda: corrige color,
 * recompone sólo la zona y verifica.
 */
export const createPlateAdapter = (plate: { png: Buffer; width: number; height: number; source: string }): InpaintImageAdapter => ({
  id: 'plate',
  provider: 'fal',
  label: 'Clean plate de Layerize (sin proveedor)',
  defaultModel: 'clean-plate',
  sendsMask: false,
  maskConvention: null,
  verifiedAt: null,
  revision: 1,
  // La máscara no viaja, pero tampoco hay guía que mandar: el plate ya es la escena sin el objeto.
  willSendMask: () => true,
  validate({ model, quality, seed }) {
    if (model !== 'clean-plate' || quality !== undefined || seed !== undefined) throw new Error('El clean plate no admite --model, --quality ni --seed.')
  },
  pickSize: () => () => ({ width: plate.width, height: plate.height }),
  async estimate() {
    return { usd: 0, basis: `clean plate local (${plate.source}); sin proveedor` }
  },
  async run({ size }) {
    if (size.width !== plate.width || size.height !== plate.height) {
      throw new Error('El clean plate se usa sobre la imagen completa: corre con --crop off.')
    }

    return { image: plate.png, providerModel: 'clean-plate', outputUsd: 0, usage: null, meta: { source: plate.source } }
  }
})

/** Lleva el clean plate (que puede medir distinto) al tamaño exacto de la original. */
export const loadPlateAtSize = async (platePath: string, width: number, height: number): Promise<Buffer> =>
  sharp(platePath).resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).png().toBuffer()

export interface ErasureReport {
  /** Diferencia media (0–255) entre la original y el resultado en el NÚCLEO de la zona: bajo = el objeto sigue ahí. */
  changeInCore: number
  corePixels: number
  residueSuspected: boolean
}

/** Bajo este cambio medio en el núcleo de la zona, el objeto probablemente no se borró. */
export const ERASE_RESIDUE_THRESHOLD = 18

/** Mide si el borrado ocurrió: sólo el núcleo de la máscara (255), donde estaba el objeto. */
export const measureErasure = (base: RgbaImage, final: RgbaImage, mask: CanonicalMask): ErasureReport => {
  let sum = 0
  let count = 0

  for (let i = 0; i < mask.data.length; i += 1) {
    if (mask.data[i] !== 255) continue

    for (let c = 0; c < 3; c += 1) sum += Math.abs(base.data[i * 4 + c] - final.data[i * 4 + c])

    count += 1
  }

  const changeInCore = count ? Math.round((sum / (count * 3)) * 100) / 100 : 0

  return { changeInCore, corePixels: count, residueSuspected: count > 0 && changeInCore < ERASE_RESIDUE_THRESHOLD }
}
