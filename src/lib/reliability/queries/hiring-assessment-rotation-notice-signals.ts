import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { providerBlockedConditionSql } from '@/lib/hiring/assessment/access-recovery/provider-block'
import type { ReliabilitySignal } from '@/types/reliability'

// ══════════════════════════════════════════════════════════════════════════════
// TASK-1757 — Rotaciones de acceso que dejaron al candidato sin enterarse.
//
// POR QUÉ EXISTE. Emitir un enlace seguro MATA la credencial anterior del candidato y se la
// entrega en mano al operador, por WhatsApp o por teléfono. Si esa entrega falla —el operador se
// distrae, copia mal, la persona no contesta— el candidato queda sin acceso, sin saber por qué y
// con su plazo corriendo. El aviso por correo (TASK-1757) cubre ese hueco cuando el buzón funciona;
// esta señal cubre cuando el aviso tampoco salió.
//
// EL PUNTO CIEGO QUE CIERRA. La señal hermana `hiring.assessment.access_never_exchanged` detecta
// enlaces que llegan rotos joineando contra `email_deliveries`. Una recuperación por `secure_link`
// NO produce fila de delivery —su `delivery_id` es NULL por CHECK de schema—, así que el único
// canal donde la entrega puede fallar en silencio es precisamente el que esa señal no puede ver,
// por construcción. Sin esta, un candidato expulsado de su evaluación es invisible hasta que
// reclama. Y quien no reclama, se va.
//
// QUÉ MIDE. Rotaciones por enlace seguro de las últimas 24 h, con la credencial TODAVÍA VIVA, donde
// el aviso debía salir y no hay evidencia de que saliera.
//
// POR QUÉ SÓLO LAS DE CREDENCIAL VIVA. Una rotación cuya credencial ya venció no tiene remedio
// disponible: avisar ahora no le devuelve el acceso a nadie. Contarla dejaría la señal en un número
// permanente distinto de cero, y una señal cuyo estado estable no es cero deja de leerse.
//
// POR QUÉ LA POBLACIÓN EXCLUYE LOS SKIPS LEGÍTIMOS. Sin correo registrado, con el buzón bloqueado
// por el proveedor o con el operador declarando que el envío falló, el aviso NO debía salir: son
// decisiones del dominio (`decideAssessmentAccessRotationNotice`), no fallas. Meterlas acá
// convertiría la señal en un contador de casos normales.
//
// ⚠️ ESTE PREDICADO ES EL ESPEJO SQL DE ESA FUNCIÓN TS. No se puede compartir código entre ambos
// mundos, así que el acuerdo se sostiene con el test de paridad que vive junto a este archivo. Si
// agregas un motivo de omisión allá, agrégalo acá y al test — o la señal va a alertar sobre casos
// que el sistema decidió, correctamente, no avisar.

const SIGNAL_ID = 'hiring.assessment.access_recovery.rotation_unnotified'
const LABEL = 'Rotaciones de acceso sin aviso al candidato'

const SIGNAL_BASE = {
  signalId: SIGNAL_ID,
  moduleKey: 'hiring' as const,
  kind: 'data_quality' as const,
  source: 'getHiringAssessmentRotationNoticeSignal',
  label: LABEL,
}

interface RotationNoticeRow extends Record<string, unknown> {
  rotations_window: number
  unnotified: number
}

export const getHiringAssessmentRotationNoticeSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<RotationNoticeRow>(
      `WITH expected AS (
         SELECT recovery.recovery_id,
                profile.canonical_email
           FROM greenhouse_hiring.hiring_assessment_access_recovery recovery
           JOIN greenhouse_hiring.hiring_application application
             ON application.application_id = recovery.application_id
           JOIN greenhouse_core.identity_profiles profile
             ON profile.profile_id = application.identity_profile_id
          WHERE recovery.channel = 'secure_link'
            AND recovery.outcome = 'link_issued'
            AND recovery.created_at >= clock_timestamp() - INTERVAL '24 hours'
            -- Credencial viva: una vencida ya no tiene remedio disponible.
            AND recovery.expires_at > clock_timestamp()
            -- Espejo de decideAssessmentAccessRotationNotice: los skips legítimos no son fallas.
            AND recovery.outcome_reason IS DISTINCT FROM 'provider_delivery_failed'
            AND profile.canonical_email IS NOT NULL
            AND BTRIM(profile.canonical_email) <> ''
            AND NOT EXISTS (
              SELECT 1 FROM greenhouse_notifications.email_deliveries blocked
               WHERE LOWER(blocked.recipient_email) = LOWER(profile.canonical_email)
                 AND ${providerBlockedConditionSql('blocked')}
            )
       )
       SELECT (SELECT COUNT(*)::int FROM expected) AS rotations_window,
              (SELECT COUNT(*)::int FROM expected
                WHERE NOT EXISTS (
                  SELECT 1 FROM greenhouse_notifications.email_deliveries notice
                   WHERE notice.email_type = 'hiring_assessment_access_rotated'
                     AND notice.source_entity = expected.recovery_id
                     AND notice.status = 'sent'
                )) AS unnotified`,
    )

    const row = rows[0] ?? { rotations_window: 0, unnotified: 0 }
    const rotations = Number(row.rotations_window)
    const unnotified = Number(row.unnotified)

    // Steady = 0. Cada unidad es una persona que puede estar esperando un acceso que nadie le
    // entregó, así que el umbral no es proporcional: uno ya merece que alguien mire.
    const severity = unnotified >= 3 ? 'error' : unnotified >= 1 ? 'warning' : 'ok'

    const summary =
      severity === 'ok'
        ? rotations === 0
          ? 'Sin rotaciones por enlace seguro con credencial vigente en las últimas 24 horas.'
          : `Las ${rotations} rotación(es) por enlace seguro de las últimas 24 h tienen su aviso despachado.`
        : `${unnotified} de ${rotations} rotación(es) por enlace seguro no le avisaron al candidato. Esas personas perdieron su acceso anterior y pueden no saberlo: verifica la entrega en mano antes de que se les venza el plazo.`

    return {
      ...SIGNAL_BASE,
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'rotations_24h', value: String(rotations) },
        { kind: 'metric', label: 'unnotified', value: String(unnotified) },
        {
          kind: 'doc',
          label: 'Manual',
          value: 'docs/manual-de-uso/hr/recuperar-acceso-a-test-de-candidato.md',
        },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_rotation_notice' } })

    return {
      ...SIGNAL_BASE,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar si las rotaciones de acceso avisaron al candidato.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
