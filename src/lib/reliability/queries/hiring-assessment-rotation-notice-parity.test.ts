import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

import { decideAssessmentAccessRotationNotice } from '@/lib/hiring/assessment/access-recovery/vocabulary'

vi.mock('server-only', () => ({}))

/**
 * TASK-1757 — la señal y el envío tienen que estar de acuerdo sobre CUÁNDO debía salir el aviso.
 *
 * `decideAssessmentAccessRotationNotice` (TS) decide si se avisa; la señal replica ese criterio en
 * SQL para contar las rotaciones donde el aviso debía salir y no salió. No se puede compartir
 * código entre ambos mundos, así que el acuerdo se sostiene acá: si alguien agrega un motivo de
 * omisión en TS y no lo agrega al SQL, la señal empieza a alertar sobre casos que el sistema
 * decidió —correctamente— no avisar, y una señal que grita sobre casos normales deja de leerse.
 */

const SIGNAL_SQL = readFileSync(
  join(process.cwd(), 'src/lib/reliability/queries/hiring-assessment-rotation-notice-signals.ts'),
  'utf8',
)

/**
 * Cada motivo de omisión, con la evidencia de que el SQL lo cubre.
 *
 * `not_secure_link` y `credential_already_expired` son estructurales: los cubre el propio filtro de
 * población (canal, desenlace y vigencia), no una guarda aparte.
 */
const SKIP_COVERAGE: Record<string, string> = {
  not_secure_link: "recovery.channel = 'secure_link'",
  credential_already_expired: 'recovery.expires_at > clock_timestamp()',
  operator_declared_delivery_failed: "IS DISTINCT FROM 'provider_delivery_failed'",
  no_candidate_email: 'profile.canonical_email IS NOT NULL',
  provider_blocked: 'providerBlockedConditionSql',
}

describe('paridad SQL ⇄ TS del aviso de rotación', () => {
  it('cada motivo de omisión del dominio está cubierto por el SQL de la señal', () => {
    for (const [skip, marker] of Object.entries(SKIP_COVERAGE)) {
      expect(SIGNAL_SQL, `el motivo de omisión "${skip}" no tiene guarda en el SQL de la señal`)
        .toContain(marker)
    }
  })

  it('la señal excluye exactamente los casos que la función TS decide no avisar', () => {
    const base = {
      channel: 'secure_link' as const,
      outcome: 'link_issued' as const,
      reasonCode: 'alternate_channel_requested' as const,
      hasCandidateEmail: true,
      providerBlockStatus: null as string | null,
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    }

    // El caso que la señal SÍ cuenta como población: el aviso debía salir.
    expect(decideAssessmentAccessRotationNotice(base).notify).toBe(true)

    // Los cuatro que la población del SQL excluye, uno por uno.
    const excluded = [
      { ...base, channel: 'email' as const, outcome: 'dispatch_accepted' as const },
      { ...base, expiresAt: new Date(Date.now() - 1000).toISOString() },
      { ...base, reasonCode: 'provider_delivery_failed' as const },
      { ...base, hasCandidateEmail: false },
      { ...base, providerBlockStatus: 'bounced' },
    ]

    for (const input of excluded) {
      expect(decideAssessmentAccessRotationNotice(input).notify).toBe(false)
    }
  })

  it('la señal declara steady = 0: cada unidad es una persona esperando', () => {
    // Un umbral proporcional escondería el caso real de Efeonce — pocas vacantes vivas, un
    // candidato afectado. Uno solo ya merece que alguien mire.
    expect(SIGNAL_SQL).toContain("unnotified >= 1 ? 'warning'")
  })
})
