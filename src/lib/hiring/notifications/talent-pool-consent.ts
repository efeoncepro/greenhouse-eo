import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'

/**
 * TASK-1762 Slice 4 — ¿esta persona autorizó que la contactemos en el futuro, AHORA?
 *
 * Se re-lee **en el momento de enviar**, nunca se arrastra desde el preview ni desde el evento: el
 * consentimiento es revocable y una promesa hecha con un permiso vencido es una promesa sin base.
 * Entre que se confirmó un cierre y que salió el correo pueden pasar minutos u horas, y el
 * candidato pudo retirar su autorización en el medio.
 *
 * Fail-closed a propósito: si la consulta falla o no hay fila, la respuesta es `false`. Prometer
 * el Banco de Talento por error es afirmar un tratamiento de datos que nadie autorizó; NO
 * prometerlo por error sólo hace el correo más escueto.
 */
export const hasCurrentTalentPoolFutureConsent = async (applicationId: string): Promise<boolean> => {
  try {
    const rows = await runGreenhousePostgresQuery<{ current: boolean }>(
      `SELECT bool_or(
                m.lifecycle_status = 'pool_eligible'
                AND m.future_consent_expires_at IS NOT NULL
                AND m.future_consent_expires_at > now()
              ) AS current
         FROM greenhouse_hiring.hiring_application a
         JOIN greenhouse_hiring.talent_pool_membership m
              ON m.candidate_facet_id = a.candidate_facet_id
        WHERE a.application_id = $1`,
      [applicationId]
    )

    return rows[0]?.current === true
  } catch {
    return false
  }
}
