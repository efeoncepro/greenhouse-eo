import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

const MODULE_KEY = 'growth' as const
const SOURCE = 'getGrowthMeetingSignals'

export const GROWTH_MEETING_AVAILABILITY_FAILED = 'growth.meeting.availability_failed'
export const GROWTH_MEETING_BOOKING_FAILED = 'growth.meeting.booking_failed'
export const GROWTH_MEETING_OFFLINE_DETECTED = 'growth.meeting.offline_booking_detected'
export const GROWTH_MEETING_DUPLICATE_PREVENTED = 'growth.meeting.duplicate_prevented'
export const GROWTH_MEETING_BOOKING_CONFIRMED = 'growth.meeting.booking_confirmed'

interface Counts extends Record<string, unknown> {
  availability_failed: number
  booking_failed: number
  offline_booking_detected: number
  duplicate_prevented: number
  booking_confirmed: number
  ambiguous: number
}

const signal = (input: {
  signalId: string
  label: string
  count: number
  severity: ReliabilitySignal['severity']
  observedAt: string
}): ReliabilitySignal => ({
  signalId: input.signalId,
  moduleKey: MODULE_KEY,
  kind: 'runtime',
  source: SOURCE,
  label: input.label,
  severity: input.severity,
  summary: `${input.count} evento(s) observado(s) en las últimas 24h.`,
  observedAt: input.observedAt,
  evidence: [{ kind: 'metric', label: 'count_24h', value: String(input.count) }],
})

export const getGrowthMeetingSignals = async (): Promise<ReliabilitySignal[]> => {
  const observedAt = new Date().toISOString()

  try {
    const rows = await runGreenhousePostgresQuery<Counts>(
      `SELECT
         COALESCE(SUM(observed_count) FILTER (WHERE metric_kind = 'availability_failed'), 0)::int AS availability_failed,
         COALESCE(SUM(observed_count) FILTER (WHERE metric_kind = 'booking_failed'), 0)::int AS booking_failed,
         COALESCE(SUM(observed_count) FILTER (WHERE metric_kind = 'offline_booking_detected'), 0)::int AS offline_booking_detected,
         COALESCE(SUM(observed_count) FILTER (WHERE metric_kind = 'duplicate_prevented'), 0)::int AS duplicate_prevented,
         COALESCE(SUM(observed_count) FILTER (WHERE metric_kind = 'booking_confirmed'), 0)::int AS booking_confirmed,
         (SELECT COUNT(*)::int
            FROM greenhouse_growth.meeting_booking_execution
           WHERE state = 'ambiguous' AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 day') AS ambiguous
       FROM greenhouse_growth.meeting_runtime_rollup
      WHERE bucket_start > CURRENT_TIMESTAMP - INTERVAL '1 day'`,
    )

    const counts = rows[0] ?? {
      availability_failed: 0,
      booking_failed: 0,
      offline_booking_detected: 0,
      duplicate_prevented: 0,
      booking_confirmed: 0,
      ambiguous: 0,
    }

    return [
      signal({
        signalId: GROWTH_MEETING_AVAILABILITY_FAILED,
        label: 'Fallos de disponibilidad del scheduler',
        count: counts.availability_failed,
        severity: counts.availability_failed > 5 ? 'error' : counts.availability_failed > 0 ? 'warning' : 'ok',
        observedAt,
      }),
      signal({
        signalId: GROWTH_MEETING_BOOKING_FAILED,
        label: 'Fallos de booking del scheduler',
        count: counts.booking_failed,
        severity: counts.ambiguous > 0 || counts.booking_failed > 2 ? 'error' : counts.booking_failed > 0 ? 'warning' : 'ok',
        observedAt,
      }),
      signal({
        signalId: GROWTH_MEETING_OFFLINE_DETECTED,
        label: 'Booking offline o inválido detectado',
        count: counts.offline_booking_detected,
        severity: counts.offline_booking_detected > 0 ? 'error' : 'ok',
        observedAt,
      }),
      signal({
        signalId: GROWTH_MEETING_DUPLICATE_PREVENTED,
        label: 'Duplicados de booking prevenidos',
        count: counts.duplicate_prevented,
        severity: 'ok',
        observedAt,
      }),
      signal({
        signalId: GROWTH_MEETING_BOOKING_CONFIRMED,
        label: 'Bookings server-confirmed',
        count: counts.booking_confirmed,
        severity: 'ok',
        observedAt,
      }),
    ]
  } catch (caught) {
    captureWithDomain(caught, 'growth', { tags: { source: 'reliability_signal_growth_meeting' } })

    return [signal({
      signalId: GROWTH_MEETING_BOOKING_FAILED,
      label: 'Salud del scheduler nativo',
      count: 0,
      severity: 'unknown',
      observedAt,
    })]
  }
}
