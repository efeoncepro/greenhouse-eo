import 'server-only'

/**
 * TASK-1287 — Growth AI Visibility · Operator-scoped report reader (EPIC-020, server-only).
 *
 * La contraparte interna del reader client-scoped (TASK-1243). Un operador interno (Growth/AM)
 * lee el reporte AEO de CUALQUIER cliente o prospecto en el detalle operador (TASK-1276). NO
 * reimplementa la derivación — reusa la orquestación canónica `readGraderReport`
 * (run → score → previous → profile → `buildGraderReport`) + la re-proyección leak-safe
 * `toClientGraderReport` (mismo shape `ClientGraderReport` que TASK-1276 renderiza vía
 * `modelFromClientReport`; sin evidencia cruda de provider).
 *
 * Distinción dura vs el client reader: el client reader deriva la org de SU propio tenant
 * (`requireClientTenantContext`), así que el tenant ES el gate. Este reader recibe una org
 * ARBITRARIA, por lo que DEBE self-guardarse con la capability `report.read_operator` — de lo
 * contrario cualquier caller pasando cualquier org la leería. V1 = capability-gated: un interno
 * con la capability lee cualquier client-org (el scoping per-AM no existe como primitive; ver
 * TASK-1277, follow-up). El gate aplica por construcción para todos los consumers (UI/Nexa/MCP).
 */

import { can } from '@/lib/entitlements/runtime'
import { type TenantEntitlementSubject } from '@/lib/entitlements/types'

import {
  getClientGraderRunById,
  getLatestClientGraderRun,
  listOperatorCrossOrgAeoScores,
  type OperatorAeoCockpitRow
} from '../store'
import { readGraderReport, GraderReportError } from '../report/command'
import { type ClientGraderReport } from '../report/contracts'
import { toClientGraderReport } from '../report/builder'

export class OperatorGraderReportError extends Error {
  readonly code: 'forbidden' | 'not_found' | 'report_unavailable'

  constructor(code: 'forbidden' | 'not_found' | 'report_unavailable', message: string) {
    super(message)
    this.name = 'OperatorGraderReportError'
    this.code = code
  }
}

export interface ReadOperatorScopedAeoReportInput {
  /** Subject autenticado (de `requireInternalTenantContext`). El reader self-guarda con `can()`. */
  subject: TenantEntitlementSubject
  /** Org objetivo (cliente o prospecto). Arbitraria — por eso el gate es obligatorio. */
  organizationId: string
  /** Run específico; si se omite, el run reportable más reciente de la org. */
  runId?: string
}

export interface OperatorScopedAeoReportResult {
  report: ClientGraderReport
}

/**
 * Lee el reporte AEO de una organización en scope operador.
 * - `forbidden`: el subject no tiene la capability `report.read_operator`.
 * - `not_found`: la org no tiene un run reportable, o el `runId` pedido no es de esta org.
 * - `report_unavailable`: el run existe pero aún no tiene score persistido.
 */
export const readOperatorScopedAeoReport = async (
  input: ReadOperatorScopedAeoReportInput
): Promise<OperatorScopedAeoReportResult> => {
  if (!can(input.subject, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')) {
    throw new OperatorGraderReportError(
      'forbidden',
      'No tienes acceso al reporte AEO de operador.'
    )
  }

  const run = input.runId
    ? await getClientGraderRunById({ runId: input.runId, organizationId: input.organizationId })
    : await getLatestClientGraderRun(input.organizationId)

  if (!run) {
    throw new OperatorGraderReportError(
      'not_found',
      'No hay un reporte AEO disponible para esta organización.'
    )
  }

  try {
    const { report } = await readGraderReport({ runId: run.runId })

    return { report: toClientGraderReport(report) }
  } catch (error) {
    if (error instanceof GraderReportError && error.code === 'score_not_found') {
      throw new OperatorGraderReportError(
        'report_unavailable',
        'El reporte AEO de esta organización aún se está preparando.'
      )
    }

    throw error
  }
}

export type { OperatorAeoCockpitRow }

/**
 * Lista el agregado cross-org de scores AEO para el cockpit operador (TASK-1276): orgs CON AEO
 * vigente + tier + último run reportable + score (degradación honesta `null` cuando no hay run/score).
 * Self-guarda con la misma capability operador (`report.read_operator`). Solo lectura.
 */
export const readOperatorCrossOrgAeoScores = async (input: {
  subject: TenantEntitlementSubject
}): Promise<OperatorAeoCockpitRow[]> => {
  if (!can(input.subject, 'growth.ai_visibility.report.read_operator', 'read', 'tenant')) {
    throw new OperatorGraderReportError(
      'forbidden',
      'No tienes acceso al cockpit AEO de operador.'
    )
  }

  return listOperatorCrossOrgAeoScores()
}
