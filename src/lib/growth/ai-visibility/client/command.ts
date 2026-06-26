import 'server-only'

/**
 * TASK-1243 — Growth AI Visibility · Client-scoped report reader (EPIC-020 E, server-only).
 *
 * El 3.er consumer de la parity: un usuario `client_*` autenticado ve el reporte del grader
 * de SU organización. NO reimplementa la derivación — reusa la orquestación canónica
 * `readGraderReport` (run → score → previous → profile → `buildGraderReport`) y agrega sólo:
 *   1. Resolución del run SCOPED por organización (binding `run.profile_id → grader_profiles.
 *      organization_id`). La org se deriva server-side del `orgContext` de sesión, NUNCA del
 *      browser. Un run de otra org → `not_found` (tenant boundary duro, sin revelar existencia).
 *   2. Re-proyección al DTO cliente (`toClientGraderReport`) — sin evidencia cruda de provider.
 *
 * El client portal (hoja del DAG) lo consume vía su BFF; este reader vive en el producer
 * domain `growth` y recibe la `organizationId` ya resuelta (no importa `@/lib/client-portal/*`).
 */

import { getClientGraderRunById, getLatestClientGraderRun } from '../store'
import { readGraderReport, GraderReportError } from '../report/command'
import { type ClientGraderReport } from '../report/contracts'
import { toClientGraderReport } from '../report/builder'

export class ClientGraderReportError extends Error {
  readonly code: 'not_found' | 'report_unavailable'

  constructor(code: 'not_found' | 'report_unavailable', message: string) {
    super(message)
    this.name = 'ClientGraderReportError'
    this.code = code
  }
}

export interface ReadClientGraderReportInput {
  /** Org del cliente, derivada server-side del orgContext de sesión. NUNCA del browser. */
  organizationId: string
  /** Run específico; si se omite, el run reportable más reciente de la org. */
  runId?: string
}

export interface ClientGraderReportResult {
  report: ClientGraderReport
}

/**
 * Lee el reporte del grader scoped a la organización del cliente.
 * - `not_found`: la org no tiene un run reportable, o el `runId` pedido no es de esta org.
 * - `report_unavailable`: el run existe pero aún no tiene score persistido.
 */
export const readClientGraderReport = async (
  input: ReadClientGraderReportInput
): Promise<ClientGraderReportResult> => {
  const run = input.runId
    ? await getClientGraderRunById({ runId: input.runId, organizationId: input.organizationId })
    : await getLatestClientGraderRun(input.organizationId)

  if (!run) {
    // Sin revelar si el run no existe o es de otra org (tenant boundary).
    throw new ClientGraderReportError('not_found', 'No hay un reporte disponible para tu organización.')
  }

  try {
    const { report } = await readGraderReport({ runId: run.runId })

    return { report: toClientGraderReport(report) }
  } catch (error) {
    if (error instanceof GraderReportError && error.code === 'score_not_found') {
      throw new ClientGraderReportError('report_unavailable', 'El reporte de tu organización aún se está preparando.')
    }

    throw error
  }
}
