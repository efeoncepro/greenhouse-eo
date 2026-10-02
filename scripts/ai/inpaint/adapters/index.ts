import { createFalInpaintAdapter, FAL_INPAINT_CAPABILITY_IDS } from './fal'
import { openAIInpaintAdapter } from './openai'
import type { InpaintImageAdapter } from './types'

/**
 * Registro de adaptadores de imagen de `pnpm ai:inpaint image`. Un proveedor nuevo es un adaptador más aquí; el
 * pipeline (recorte, recomposición, verificación, manifiesto) no cambia. Los de fal salen del catálogo verificado.
 */
export const IMAGE_ADAPTER_IDS = ['openai', ...FAL_INPAINT_CAPABILITY_IDS.map(id => `fal:${id}`)]

export const resolveImageAdapter = (id: string | undefined): InpaintImageAdapter => {
  const wanted = id ?? 'openai'

  if (wanted === 'openai') return openAIInpaintAdapter
  if (wanted.startsWith('fal:')) return createFalInpaintAdapter(wanted.slice(4))

  throw new Error(`Adaptador desconocido: "${wanted}". Disponibles: ${IMAGE_ADAPTER_IDS.join(', ')}.`)
}
