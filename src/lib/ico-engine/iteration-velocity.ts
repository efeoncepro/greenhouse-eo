export type IterationVelocityDataStatus = 'available' | 'degraded' | 'unavailable'
export type IterationVelocityConfidenceLevel = 'high' | 'medium' | 'low'
export type IterationVelocityEvidenceMode = 'observed' | 'proxy' | 'missing'

export interface IterationVelocityTaskEvidence {
  completedAt: string | null
  frameVersions: number | null
  clientChangeRounds: number | null
  workflowChangeRounds: number | null
  clientReviewOpen: boolean
  workflowReviewOpen: boolean
  openFrameComments: number | null
}

export interface IterationVelocityMetric {
  value: number | null
  cadenceWindowDays: number
  dataStatus: IterationVelocityDataStatus
  confidenceLevel: IterationVelocityConfidenceLevel | null
  evidenceMode: IterationVelocityEvidenceMode
  qualityGateReasons: string[]
  evidence: {
    candidateTasks: number
    signalCoverageTasks: number
    tasksWithVersionSignal: number
    tasksWithWorkflowSignal: number
    tasksWithClientRoundSignal: number
    usefulIterationTasks: number
    correctiveReworkTasks: number
  }
}

interface IterationVelocityInput {
  tasks: IterationVelocityTaskEvidence[]
  now?: Date | string
  cadenceWindowDays?: number
  hasObservedMarketEvidence?: boolean
}

const DAY_IN_MS = 86_400_000

const toDate = (value: string | null): Date | null => {
  if (!value) return null

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const toSafeNumber = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const hasSignal = (task: IterationVelocityTaskEvidence) =>
  toSafeNumber(task.frameVersions) > 0 || task.clientChangeRounds !== null || task.workflowChangeRounds !== null

const isCorrectiveRework = (task: IterationVelocityTaskEvidence) =>
  toSafeNumber(task.clientChangeRounds) > 0 ||
  task.clientReviewOpen ||
  task.workflowReviewOpen ||
  toSafeNumber(task.openFrameComments) > 0

const isUsefulIteration = (task: IterationVelocityTaskEvidence) =>
  (toSafeNumber(task.frameVersions) >= 2 || toSafeNumber(task.workflowChangeRounds) > 0) &&
  toSafeNumber(task.clientChangeRounds) === 0 &&
  !task.clientReviewOpen &&
  !task.workflowReviewOpen &&
  toSafeNumber(task.openFrameComments) === 0

const deriveConfidence = ({
  dataStatus,
  hasObservedMarketEvidence,
  candidateTasks,
  signalCoverageRatio
}: {
  dataStatus: IterationVelocityDataStatus
  hasObservedMarketEvidence: boolean
  candidateTasks: number
  signalCoverageRatio: number
}): IterationVelocityConfidenceLevel | null => {
  if (dataStatus === 'unavailable') return null
  if (hasObservedMarketEvidence && candidateTasks >= 5 && signalCoverageRatio >= 0.8) return 'high'
  if (candidateTasks >= 3 && signalCoverageRatio >= 0.5) return 'medium'

  return 'low'
}

export const resolveIterationVelocityMetric = ({
  tasks,
  now = new Date(),
  cadenceWindowDays = 30,
  hasObservedMarketEvidence = false
}: IterationVelocityInput): IterationVelocityMetric => {
  const qualityGateReasons: string[] = []
  const currentDate = now instanceof Date ? now : new Date(now)
  const currentMs = currentDate.getTime()

  const candidateTasks = tasks.filter(task => {
    const completedAt = toDate(task.completedAt)

    if (!completedAt) return false

    const elapsedMs = currentMs - completedAt.getTime()

    return elapsedMs >= 0 && elapsedMs <= cadenceWindowDays * DAY_IN_MS
  })

  const tasksWithVersionSignal = candidateTasks.filter(task => toSafeNumber(task.frameVersions) > 0).length
  const tasksWithWorkflowSignal = candidateTasks.filter(task => task.workflowChangeRounds !== null).length
  const tasksWithClientRoundSignal = candidateTasks.filter(task => task.clientChangeRounds !== null).length
  const signalCoverageTasks = candidateTasks.filter(hasSignal).length
  const usefulIterationTasks = candidateTasks.filter(isUsefulIteration).length
  const correctiveReworkTasks = candidateTasks.filter(isCorrectiveRework).length

  if (!hasObservedMarketEvidence) {
    qualityGateReasons.push('Sin evidencia observada de mercado; usando proxy operativo de delivery.')
  }

  if (candidateTasks.length === 0) {
    qualityGateReasons.push(`Sin tareas completadas en los ultimos ${cadenceWindowDays} dias para estimar Iteration Velocity.`)

    return {
      value: null,
      cadenceWindowDays,
      dataStatus: 'unavailable',
      confidenceLevel: null,
      evidenceMode: 'missing',
      qualityGateReasons,
      evidence: {
        candidateTasks: 0,
        signalCoverageTasks: 0,
        tasksWithVersionSignal: 0,
        tasksWithWorkflowSignal: 0,
        tasksWithClientRoundSignal: 0,
        usefulIterationTasks: 0,
        correctiveReworkTasks: 0
      }
    }
  }

  if (signalCoverageTasks === 0) {
    qualityGateReasons.push('Sin rounds ni versiones suficientes para distinguir iteracion util de correccion.')

    return {
      value: null,
      cadenceWindowDays,
      dataStatus: 'unavailable',
      confidenceLevel: null,
      evidenceMode: 'missing',
      qualityGateReasons,
      evidence: {
        candidateTasks: candidateTasks.length,
        signalCoverageTasks,
        tasksWithVersionSignal,
        tasksWithWorkflowSignal,
        tasksWithClientRoundSignal,
        usefulIterationTasks,
        correctiveReworkTasks
      }
    }
  }

  const signalCoverageRatio = signalCoverageTasks / candidateTasks.length

  if (signalCoverageRatio < 0.5) {
    qualityGateReasons.push('Cobertura parcial de rounds/versiones; interpretar la metrica con cautela.')
  }

  if (usefulIterationTasks === 0) {
    qualityGateReasons.push(`No hay iteraciones utiles cerradas en la ventana de ${cadenceWindowDays} dias.`)
  }

  if (correctiveReworkTasks > usefulIterationTasks) {
    qualityGateReasons.push('La ventana tiene mas correccion cliente que iteracion util.')
  }

  const dataStatus = hasObservedMarketEvidence ? 'available' : 'degraded'

  return {
    value: usefulIterationTasks,
    cadenceWindowDays,
    dataStatus,
    confidenceLevel: deriveConfidence({
      dataStatus,
      hasObservedMarketEvidence,
      candidateTasks: candidateTasks.length,
      signalCoverageRatio
    }),
    evidenceMode: hasObservedMarketEvidence ? 'observed' : 'proxy',
    qualityGateReasons,
    evidence: {
      candidateTasks: candidateTasks.length,
      signalCoverageTasks,
      tasksWithVersionSignal,
      tasksWithWorkflowSignal,
      tasksWithClientRoundSignal,
      usefulIterationTasks,
      correctiveReworkTasks
    }
  }
}
