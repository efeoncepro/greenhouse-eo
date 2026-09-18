import 'server-only'

/**
 * TASK-1845 — puertos hacia unidades posteriores. Se DECLARAN aquí y quedan sin implementar
 * (arquitectura §7): TASK-1846 conecta outputs/render; TASK-1848 conecta share/delivery.
 * Mientras el puerto de outputs no esté conectado, `issue` permanece bloqueado: emitir exige
 * outputs solicitados VALIDADOS y nada aquí los fabrica.
 */

import type { InsightOutput } from './contracts/request'
import { InsightsNotReadyError } from './errors'
import type { InsightEditionRecord } from './stores/records'

export interface ValidatedOutputsSummary {
  /** Un hash por output validado; entra en el `issued_hash` de la edición. */
  outputs: Array<{ output: InsightOutput; assetId: string; manifestHash: string }>
}

export interface InsightOutputsPort {
  /** Lanza `InsightsNotReadyError` si algún output solicitado no está validado. */
  assertOutputsValidated(edition: InsightEditionRecord): Promise<ValidatedOutputsSummary>
}

/**
 * TASK-1848 — costura de sharing. La implementación vive en `sharing/` (commands + reader público)
 * y los consumers la importan directo; este marcador sólo declara que la costura está conectada.
 */
export interface InsightSharePort {
  readonly implemented: true
  readonly module: 'sharing'
}

const notConnectedOutputsPort: InsightOutputsPort = {
  assertOutputsValidated: async edition => {
    throw new InsightsNotReadyError('La edición no tiene outputs validados: el render durable (TASK-1846) aún no está conectado', {
      editionId: edition.editionId,
      outputs: edition.outputs
    })
  }
}

let outputsPort: InsightOutputsPort = notConnectedOutputsPort

export const getInsightOutputsPort = (): InsightOutputsPort => outputsPort

/** TASK-1846 registra su implementación; los tests pueden inyectar un fake. */
export const setInsightOutputsPort = (port: InsightOutputsPort | null): void => {
  outputsPort = port ?? notConnectedOutputsPort
}

export const insightSharePort: InsightSharePort = { implemented: true, module: 'sharing' }
