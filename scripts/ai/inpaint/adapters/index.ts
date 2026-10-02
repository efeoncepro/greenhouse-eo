import { openAIInpaintAdapter } from './openai'
import type { InpaintImageAdapter } from './types'

/**
 * Registro de adaptadores de imagen de `pnpm ai:inpaint image`. Un proveedor nuevo es un adaptador más aquí; el
 * pipeline (recorte, recomposición, verificación, manifiesto) no cambia.
 */
const IMAGE_ADAPTERS: readonly InpaintImageAdapter[] = [openAIInpaintAdapter]

export const IMAGE_ADAPTER_IDS = IMAGE_ADAPTERS.map(adapter => adapter.id)

export const resolveImageAdapter = (id: string | undefined): InpaintImageAdapter => {
  const wanted = id ?? 'openai'
  const adapter = IMAGE_ADAPTERS.find(item => item.id === wanted)

  if (!adapter) throw new Error(`Adaptador desconocido: "${wanted}". Disponibles: ${IMAGE_ADAPTER_IDS.join(', ')}.`)

  return adapter
}
