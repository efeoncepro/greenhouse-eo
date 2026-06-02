/**
 * TASK-797 — Contractor closure readiness evaluation (pure).
 *
 * Mirror del patrón `evaluatePayableReadiness` (TASK-793): el server resuelve los
 * inputs (counts de submissions/payables abiertos, flags del engagement) y
 * alimenta este evaluador puro, que queda 100% unit-testable.
 *
 * Diferencia clave con payable readiness: los blockers de cierre son
 * ACKNOWLEDGEABLE — el operador puede cerrar de todas formas declarando una razón
 * explícita (override gobernado + auditado). `ready` exige que no queden blockers
 * SIN reconocer. Los advisories son informativos y NUNCA bloquean.
 *
 * El cierre NUNCA es finiquito (boundary TASK-890): este helper no conoce ni
 * dispara `final_settlements`.
 */
import {
  type ContractorClosureAdvisory,
  type ContractorClosureBlocker,
  type ContractorClosureBlockerCode,
  type ContractorClosureReadinessInputs,
  type ContractorClosureReadinessResult
} from './types'

export const evaluateContractorClosureReadiness = (
  inputs: ContractorClosureReadinessInputs,
  now: string = new Date().toISOString()
): ContractorClosureReadinessResult => {
  const acknowledged = new Set<ContractorClosureBlockerCode>(inputs.acknowledgedBlockerCodes ?? [])

  const rawBlockers: Array<{ code: ContractorClosureBlockerCode; message: string }> = []

  if (inputs.openWorkSubmissionsCount > 0) {
    rawBlockers.push({
      code: 'open_work_submissions',
      message: `Hay ${inputs.openWorkSubmissionsCount} envío${
        inputs.openWorkSubmissionsCount === 1 ? '' : 's'
      } de trabajo sin resolver.`
    })
  }

  if (inputs.openPayablesCount > 0) {
    rawBlockers.push({
      code: 'open_payables',
      message: `Hay ${inputs.openPayablesCount} payable${
        inputs.openPayablesCount === 1 ? '' : 's'
      } sin liquidar.`
    })
  }

  if (inputs.providerOwned && !inputs.providerTerminationRefPresent) {
    rawBlockers.push({
      code: 'provider_termination_ref_missing',
      message:
        'Falta la referencia de terminación del provider (EOR/plataforma) para cerrar el engagement.'
    })
  }

  if (inputs.classificationRiskBlocking) {
    rawBlockers.push({
      code: 'classification_risk_blocking',
      message:
        'El engagement tiene riesgo de clasificación laboral bloqueante (revisión legal pendiente).'
    })
  }

  const blockers: ContractorClosureBlocker[] = rawBlockers.map((b) => ({
    ...b,
    acknowledged: acknowledged.has(b.code)
  }))

  const advisories: ContractorClosureAdvisory[] = []

  if (inputs.hasPortalMember) {
    advisories.push({
      code: 'access_handoff_reminder',
      message:
        'Recuerda gestionar el access offboarding por separado: el cierre contractual no desactiva accesos.'
    })
  }

  const ready = blockers.every((b) => b.acknowledged)

  return {
    ready,
    blockers,
    advisories,
    evaluatedAt: now
  }
}
