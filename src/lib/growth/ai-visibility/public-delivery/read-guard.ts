import 'server-only'

/**
 * TASK-1245 Slice 3 — Rate-limit proporcional de los reads públicos (status + report token).
 *
 * Los handles ya son NO enumerables (poll_token / report_token de 256 bits, submission_id),
 * así que la enumeración por fuerza bruta es inviable; este guard acota el RIESGO VOLUMÉTRICO
 * (DoS / hammering) de un endpoint público anónimo, SIN gasto LLM. Reusa el window-counter
 * append-only `grader_intake_events` (hash de IP, mismo salt) con outcomes namespaced de read
 * (`read_status` / `read_report`) — NO contaminan el budget de costo (filtra `outcome='accepted'`)
 * ni los signals de intake (filtran sus propios outcomes).
 *
 * Límite generoso por defecto (el poll legítimo cada ~5 s = ~12/min): sólo corta abuso real.
 * Fail-open: si el conteo/registro falla, NO bloquea al usuario legítimo (la protección de fondo
 * es el handle no enumerable); el error se observa, no se propaga al cliente.
 */

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

import { hashIdentifier, recordIntakeEvent } from '../public-intake/abuse-guard'

export type PublicReadKind = 'status' | 'report'

const OUTCOME_BY_KIND: Record<PublicReadKind, string> = {
  status: 'read_status',
  report: 'read_report',
}

export const resolvePublicReadLimitPerMinute = (env: NodeJS.ProcessEnv = process.env): number =>
  Number(env.GROWTH_AI_VISIBILITY_PUBLIC_READ_PER_IP_PER_MIN) || 60

const countReadsLastMinute = async (ipHash: string): Promise<number> => {
  const rows = await runGreenhousePostgresQuery<{ n: number }>(
    `SELECT COUNT(*)::int AS n
       FROM greenhouse_growth.grader_intake_events
      WHERE ip_hash = $1
        AND outcome IN ('read_status', 'read_report')
        AND created_at > NOW() - INTERVAL '1 minute'`,
    [ipHash],
  )

  return Number(rows[0]?.n ?? 0)
}

/**
 * ¿Se permite este read? Cuenta los reads del IP en la ventana de 1 min; si excede el límite,
 * bloquea (sin registrar, para no inflar el contador en el path bloqueado). Si pasa, registra el
 * read y permite. Sin IP resoluble → se permite (no podemos contar; el handle no enumerable protege).
 * Fail-open ante error de DB.
 */
export const checkPublicReadAllowed = async (ip: string | null, kind: PublicReadKind): Promise<boolean> => {
  const ipHash = hashIdentifier(ip)

  if (!ipHash) return true

  try {
    const used = await countReadsLastMinute(ipHash)

    if (used >= resolvePublicReadLimitPerMinute()) return false

    await recordIntakeEvent({ ipHash, emailHash: null, runId: null, estimatedCostUsd: null, outcome: OUTCOME_BY_KIND[kind] })

    return true
  } catch (error) {
    captureWithDomain(error, 'growth', { tags: { source: 'growth_ai_visibility_public_read_guard', kind } })

    return true
  }
}
