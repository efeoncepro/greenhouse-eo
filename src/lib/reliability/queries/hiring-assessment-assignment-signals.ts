import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

// ══════════════════════════════════════════════════════════════════════════════
// TASK-1719 — Salud de la asignación de assessments (manual + automática).
//
// Es la señal que la matriz de riesgo del ADR exige para el canary: sin ella, la
// automatización se enciende sobre candidatos reales y nadie mira nada durante 7 días.
//
// Tres cosas distintas, con severidades distintas a propósito:
//
// 1. `intent` EN REPOSO — un ledger que dice `intent` es un command que murió entre el
//    INSERT y el UPDATE que le adjunta la instancia. Ambos viven en la MISMA transacción,
//    así que en reposo es evidencia de un bug, nunca de operación normal. Steady = 0
//    SIEMPRE, con flag ON o OFF. Es `error` desde la primera fila.
//
// 2. TRIGGER ALCANZADO SIN RESULTADO TERMINAL — la postulación entró a la etapa y no hay
//    fila terminal en el ledger. Es el backlog que la reconciliación debe drenar.
//
//    ⚠️ Su predicado tiene que ser EL MISMO de `resolveApplicationsAwaitingAssignment`
//    (`assignment-policy/readers.ts`), que es el reader canónico y el que la reconciliación
//    ejecuta. Antes contaba `NOT EXISTS (... outcome <> 'intent')` sin scope por
//    policy/versión/etapa y sin excluir instancias abiertas: al reconfigurar una policy (bump de
//    versión) la cola de reconciliación se llenaba y la señal seguía en `ok`, porque encontraba
//    la fila VIEJA del ledger y daba el caso por cerrado. Una señal que no ve lo que el reader
//    ve no es una señal, es un silencio.
//
// 3. PROPUESTAS VENCIDAS SIN CERRAR — propuestas `proposed` pasadas de su expiry. No hacen
//    daño (el confirm las rechaza), pero acumularlas indica que alguien abre el diálogo y
//    no lo cierra: señal de fricción en la superficie, no de corrupción.
//
// 4. ASIGNADO SIN CORREO (24 h) — el ledger dice `assigned` y no hay entrega `sent` del
//    `hiring_assessment_assigned` para esa instancia.
//
//    Cierra PARCIALMENTE un hueco honesto: el fan-in de comunicación suprime el correo genérico
//    confiando en que la projection del correo del test entregue, pero esa projection tiene
//    cuatro salidas SILENCIOSAS (sin email resoluble, token no rotable, kill-switch por tipo,
//    dead-letter tras 3 reintentos). El invariante "una comunicación por movimiento" se cumple
//    sobre el LEDGER, no sobre la entrega — así que el caso "cero correos" existe y esta métrica
//    es lo que lo hace visible. No lo previene: lo delata.
//
//    Severidad `warning` y no `error`: el lane es asíncrono y tiene latencia legítima. Por eso
//    además se excluyen los últimos 15 minutos — contar una asignación de hace 30 segundos
//    produciría una señal permanentemente amarilla, que es la forma más rápida de que nadie
//    vuelva a mirarla.
//
// PII-free: sólo conteos. Nunca applicationId, nombre, correo ni token.
// ══════════════════════════════════════════════════════════════════════════════

type AssignmentHealthRow = {
  intent_at_rest: number
  awaiting_terminal: number
  expired_open_proposals: number
  blocked_last_24h: number
  assigned_without_email_24h: number
}

export const HIRING_ASSESSMENT_ASSIGNMENT_HEALTH_SIGNAL_ID = 'hiring.assessment.assignment_health'

const LABEL = 'Salud de la asignación de assessments'

export const getHiringAssessmentAssignmentHealthSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<AssignmentHealthRow>(
      `SELECT
         (SELECT COUNT(*)::int
            FROM greenhouse_hiring.hiring_assessment_assignment
           WHERE outcome = 'intent'
             AND created_at < NOW() - INTERVAL '5 minutes')                       AS intent_at_rest,

         -- Espejo EXACTO de resolveApplicationsAwaitingAssignment (readers.ts): mismo scope
         -- por (policy, version, etapa) + superseded_at IS NULL, y misma exclusion de la
         -- instancia ya abierta de ESA plantilla. Si los dos predicados divergen, la senal
         -- deja de describir la cola que la reconciliacion va a drenar.
         (SELECT COUNT(*)::int
            FROM greenhouse_hiring.hiring_application app
            JOIN greenhouse_hiring.hiring_opening_assessment_policy p
              ON p.opening_id = app.opening_id
             AND p.state = 'enabled'
             AND p.mode = 'on_stage_entry'
           WHERE app.decision IS NULL
             AND app.stage = p.trigger_stage
             AND NOT EXISTS (
                   SELECT 1 FROM greenhouse_hiring.hiring_assessment a
                    WHERE a.application_id = app.application_id
                      AND a.template_id = p.template_id
                      AND a.method = 'candidate_test'
                      AND a.status IN ('assigned', 'sent', 'in_progress', 'submitted', 'scored')
                 )
             AND NOT EXISTS (
                   SELECT 1 FROM greenhouse_hiring.hiring_assessment_assignment asg
                    WHERE asg.application_id = app.application_id
                      AND asg.policy_id = p.policy_id
                      AND asg.policy_version = p.policy_version
                      AND asg.trigger_stage = p.trigger_stage
                      AND asg.superseded_at IS NULL
                 ))                                                               AS awaiting_terminal,

         (SELECT COUNT(*)::int
            FROM greenhouse_hiring.hiring_assessment_assignment_proposal
           WHERE status = 'proposed' AND expires_at < NOW())                      AS expired_open_proposals,

         (SELECT COUNT(*)::int
            FROM greenhouse_hiring.hiring_assessment_assignment
           WHERE outcome = 'blocked'
             AND created_at > NOW() - INTERVAL '24 hours')                        AS blocked_last_24h,

         (SELECT COUNT(*)::int
            FROM greenhouse_hiring.hiring_assessment_assignment asg
           WHERE asg.outcome = 'assigned'
             AND asg.assessment_id IS NOT NULL
             AND asg.created_at > NOW() - INTERVAL '24 hours'
             AND asg.created_at < NOW() - INTERVAL '15 minutes'
             AND NOT EXISTS (
                   SELECT 1 FROM greenhouse_notifications.email_deliveries d
                    WHERE d.source_entity = asg.assessment_id
                      AND d.email_type = 'hiring_assessment_assigned'
                      AND d.status = 'sent'
                 ))                                                    AS assigned_without_email_24h`,
    )

    const row = rows[0] ?? {
      intent_at_rest: 0,
      awaiting_terminal: 0,
      expired_open_proposals: 0,
      blocked_last_24h: 0,
      assigned_without_email_24h: 0,
    }

    const intentAtRest = Number(row.intent_at_rest)
    const awaiting = Number(row.awaiting_terminal)
    const expiredProposals = Number(row.expired_open_proposals)
    const blocked = Number(row.blocked_last_24h)
    const assignedWithoutEmail = Number(row.assigned_without_email_24h)

    const severity =
      intentAtRest > 0
        ? 'error'
        : awaiting > 0 || expiredProposals > 0 || assignedWithoutEmail > 0
          ? 'warning'
          : 'ok'

    const summary =
      intentAtRest > 0
        ? `${intentAtRest} asignación(es) quedaron a medio registrar: el command murió entre el ledger y la instancia. Es un bug, no operación normal.`
        : assignedWithoutEmail > 0
          ? `${assignedWithoutEmail} asignación(es) de las últimas 24 h no tienen correo entregado al candidato. El ledger dice asignado, la bandeja del candidato no.`
          : awaiting > 0
            ? `${awaiting} postulación(es) alcanzaron la etapa trigger sin resultado terminal en el ledger. La reconciliación debe drenarlas.`
            : expiredProposals > 0
              ? `${expiredProposals} propuesta(s) de asignación vencieron sin confirmarse ni cerrarse.`
              : 'Toda asignación tiene resultado terminal, correo entregado y no hay propuestas vencidas abiertas.'

    return {
      signalId: HIRING_ASSESSMENT_ASSIGNMENT_HEALTH_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringAssessmentAssignmentHealthSignal',
      label: LABEL,
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'intent_at_rest', value: String(intentAtRest) },
        { kind: 'metric', label: 'awaiting_terminal', value: String(awaiting) },
        { kind: 'metric', label: 'expired_open_proposals', value: String(expiredProposals) },
        { kind: 'metric', label: 'blocked_last_24h', value: String(blocked) },
        { kind: 'metric', label: 'assigned_without_email_24h', value: String(assignedWithoutEmail) },
        {
          kind: 'doc',
          label: 'ADR',
          value: 'docs/architecture/GREENHOUSE_HIRING_ASSESSMENT_ASSIGNMENT_POLICY_DECISION_V1.md',
        },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_assignment_health' } })

    return {
      signalId: HIRING_ASSESSMENT_ASSIGNMENT_HEALTH_SIGNAL_ID,
      moduleKey: 'hiring',
      kind: 'data_quality',
      source: 'getHiringAssessmentAssignmentHealthSignal',
      label: LABEL,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar la salud de la asignación de assessments.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
