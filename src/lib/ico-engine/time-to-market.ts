export type TimeToMarketDataStatus = 'available' | 'degraded' | 'unavailable'
export type TimeToMarketConfidenceLevel = 'high' | 'medium' | 'low'
export type TimeToMarketEvidenceMode = 'observed' | 'proxy' | 'planned' | 'missing'

export interface TimeToMarketCandidate {
  date: string | null
  label: string
  source: string
  mode: Exclude<TimeToMarketEvidenceMode, 'missing'>
}

export interface TimeToMarketEvidence {
  date: string | null
  label: string | null
  source: string | null
  mode: TimeToMarketEvidenceMode
}

export interface TimeToMarketMetric {
  valueDays: number | null
  dataStatus: TimeToMarketDataStatus
  confidenceLevel: TimeToMarketConfidenceLevel | null
  start: TimeToMarketEvidence
  activation: TimeToMarketEvidence
  qualityGateReasons: string[]
}

interface TimeToMarketInput {
  startCandidates: TimeToMarketCandidate[]
  activationCandidates: TimeToMarketCandidate[]
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

const toDateOnly = (value: string | null | undefined): string | null => {
  if (!value) return null

  const normalized = value.trim().slice(0, 10)

  return DATE_ONLY_RE.test(normalized) ? normalized : null
}

const toUtcDay = (value: string): number => {
  const [year, month, day] = value.split('-').map(Number)

  return Date.UTC(year, month - 1, day)
}

const selectEvidence = (candidates: TimeToMarketCandidate[]): TimeToMarketEvidence => {
  for (const candidate of candidates) {
    const date = toDateOnly(candidate.date)

    if (!date) continue

    return {
      date,
      label: candidate.label,
      source: candidate.source,
      mode: candidate.mode
    }
  }

  return {
    date: null,
    label: null,
    source: null,
    mode: 'missing'
  }
}

const buildModeReason = (role: 'inicio' | 'activación', evidence: TimeToMarketEvidence): string | null => {
  if (evidence.mode === 'proxy' && evidence.label) {
    return `${role} usando proxy operativo: ${evidence.label}.`
  }

  if (evidence.mode === 'planned' && evidence.label) {
    return `${role} usando fecha planificada: ${evidence.label}.`
  }

  return null
}

const deriveConfidence = (
  start: TimeToMarketEvidence,
  activation: TimeToMarketEvidence
): TimeToMarketConfidenceLevel | null => {
  if (!start.date || !activation.date) return null
  if (start.mode === 'observed' && activation.mode === 'observed') return 'high'
  if (start.mode === 'planned' || activation.mode === 'planned') return 'low'

  return 'medium'
}

export const resolveTimeToMarketMetric = ({
  startCandidates,
  activationCandidates
}: TimeToMarketInput): TimeToMarketMetric => {
  const start = selectEvidence(startCandidates)
  const activation = selectEvidence(activationCandidates)
  const qualityGateReasons: string[] = []

  const startModeReason = buildModeReason('inicio', start)

  if (startModeReason) {
    qualityGateReasons.push(startModeReason)
  }

  const activationModeReason = buildModeReason('activación', activation)

  if (activationModeReason) {
    qualityGateReasons.push(activationModeReason)
  }

  if (!start.date) {
    qualityGateReasons.push('Sin evidencia suficiente para fijar el inicio del TTM.')
  }

  if (!activation.date) {
    qualityGateReasons.push('Sin evidencia suficiente para fijar la activación del TTM.')
  }

  if (!start.date || !activation.date) {
    return {
      valueDays: null,
      dataStatus: 'unavailable',
      confidenceLevel: null,
      start,
      activation,
      qualityGateReasons
    }
  }

  const valueDays = Math.round((toUtcDay(activation.date) - toUtcDay(start.date)) / 86_400_000)

  if (valueDays < 0) {
    qualityGateReasons.push('La activación quedó antes del inicio seleccionado; revisar el mapeo de evidencia.')

    return {
      valueDays: null,
      dataStatus: 'unavailable',
      confidenceLevel: null,
      start,
      activation,
      qualityGateReasons
    }
  }

  const dataStatus =
    start.mode === 'observed' && activation.mode === 'observed'
      ? 'available'
      : 'degraded'

  return {
    valueDays,
    dataStatus,
    confidenceLevel: deriveConfidence(start, activation),
    start,
    activation,
    qualityGateReasons
  }
}
