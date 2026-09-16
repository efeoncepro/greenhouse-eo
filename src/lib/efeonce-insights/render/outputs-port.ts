import 'server-only'

/**
 * TASK-1846 — implementación REAL del `InsightOutputsPort` que TASK-1845 dejó declarado y sin conectar.
 *
 * `issue` sólo puede cruzar su gate humano si TODOS los outputs solicitados por la edición existen,
 * están `completed`, tienen asset y su manifest hash sellado — y para la MISMA audiencia de la
 * edición. Un output de otra audiencia no cuenta aunque coincidan organización y período (un job de
 * cliente jamás reutiliza bytes de un draft interno). Cualquier falta ⇒ `not_ready` con la causa.
 */

import { InsightsNotReadyError } from '../errors'
import { getInsightOutputsPort, setInsightOutputsPort, type InsightOutputsPort } from '../ports'
import type { InsightEditionRecord } from '../stores/records'

import type { InsightOutput } from '../contracts/request'
import { findInsightOutputsForEdition } from './store'

export const createInsightOutputsPort = (): InsightOutputsPort => ({
  assertOutputsValidated: async (edition: InsightEditionRecord) => {
    const requested = edition.outputs as InsightOutput[]

    const existing = await findInsightOutputsForEdition({
      organizationId: edition.organizationId,
      editionId: edition.editionId,
      audience: edition.audience
    })

    const completed = new Map(existing.filter(o => o.state === 'completed' && o.outputAssetId).map(o => [o.output, o] as const))
    const missing = requested.filter(output => !completed.has(output))

    if (missing.length > 0) {
      const pending = existing.filter(o => missing.includes(o.output)).map(o => `${o.output}:${o.state}`)

      throw new InsightsNotReadyError('La edición no tiene todos sus outputs validados: falta render o el render no terminó', {
        editionId: edition.editionId,
        audience: edition.audience,
        missing,
        pending
      })
    }

    return {
      outputs: requested.map(output => {
        const record = completed.get(output)!

        return { output, assetId: record.outputAssetId!, manifestHash: record.manifestHash }
      })
    }
  }
})

/**
 * Conecta el puerto una sola vez por proceso. Lo invoca el barrel de commands al cargarse, que es
 * por donde entran lanes y MCP; los tests que importan un command directo siguen viendo el puerto
 * sin conectar y pueden inyectar un fake.
 */
export const wireInsightOutputsPort = (): void => {
  if (getInsightOutputsPort() !== defaultPortSentinel()) return

  setInsightOutputsPort(createInsightOutputsPort())
}

// El puerto "no conectado" no se exporta desde `ports.ts`; se detecta comparando contra el estado
// inicial capturado la primera vez que este módulo carga (antes de cablear nada).
const initialPort = getInsightOutputsPort()
const defaultPortSentinel = (): InsightOutputsPort => initialPort
