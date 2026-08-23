import 'server-only'

import { activeProcessPredicate } from '@/lib/hiring/active-process'
import { countAssignmentDeadEnds } from '@/lib/hiring/assessment/assignment-policy/dead-ends'
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
// 2. TRIGGER ALCANZADO SIN RESULTADO TERMINAL — la postulación entró a la etapa, SIGUE en proceso
//    activo y no hay fila terminal en el ledger. Es el backlog que la reconciliación debe drenar.
//
//    ⚠️ TASK-1772 / ISSUE-162 — «sigue en proceso» son DOS columnas, no una. Hasta el 2026-08-23
//    esta métrica preguntaba sólo `decision IS NULL` y por eso contaba postulaciones ARCHIVADAS:
//    valía 13, de las cuales 10 eran de humo archivadas por el CLI de purga. La señal vivía en
//    `warning` permanente por datos que nadie podía ir a arreglar, y las 3 reales que sí esperaban
//    quedaban escondidas detrás del ruido. Una señal amarilla que no baja nunca es una señal que
//    nadie vuelve a mirar.
//
//    Lo excluido NO se calla: viaja como `awaiting_terminal_excluded_archived`. Sin ese conteo,
//    un filtro es indistinguible de un cap silencioso y «0 esperando» dejaría de significar lo
//    mismo que significaba ayer sin que nadie pudiera notarlo.
//
//    La PROCEDENCIA no entra: el reader que esta métrica espeja tampoco la filtra, y divergir de él
//    rompe el invariante 19. La razón completa está en el docstring de
//    `resolveApplicationsAwaitingAssignment`.
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
// 4. ASIGNADO SIN DESPACHO (24 h) — el ledger dice `assigned` y no hay despacho `sent` del
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
// 5. CALLEJONES DEL CARRIL AUTOMÁTICO (TASK-1771) — filas vigentes con resultado recuperable
//    (`blocked`/`held`/`stale`) de un origen NO manual, que ocupan la clave de idempotencia de
//    una policy activa sin haber asignado nada.
//
//    Se cuentan en TRES poblaciones que no son lo mismo, y mezclarlas rompería la señal:
//      · `recoverable` — la causa YA NO aplicaría hoy. Accionable ⇒ `warning`. Steady = 0: si el
//        supersede funciona, este conteo vuelve a cero solo.
//      · `honest` — bloqueada y la causa SIGUE aplicando. **No alarma**: no hay nada que hacer
//        todavía, y alarmar por esto entrena a la gente a ignorar la señal entera.
//      · `cap_reached` — agotaron el tope de recuperación ⇒ `error`. Mismo espíritu que el
//        `dead_letter` del outbox: alguien tiene que mirar.
//
//    Es el hueco que `blocked_last_24h` no cubre y no puede cubrir: esa métrica **no entra al
//    cálculo de severidad** y caduca a las 24 horas, así que una clave quemada sale hasta de la
//    evidencia mientras sigue bloqueando a la persona. `awaiting_terminal` tampoco la ve — la
//    excluye por construcción, porque la fila del ledger existe.
//
//    ⚠️ El predicado NO se escribe acá: se importa de `countAssignmentDeadEnds`
//    (`assignment-policy/dead-ends.ts`), que es el mismo que alimenta la cola del endpoint de
//    reconciliación. Es el invariante 19 aplicado antes de que haya nada que reparar.
//
//    Excluye postulaciones sintéticas y archivadas, y reporta ese conteo aparte
//    (`dead_ends_excluded_synthetic`): sin la exclusión la métrica nacería en 2 por datos de
//    smoke y su steady = 0 sería inalcanzable — una señal que nace amarilla nadie la vuelve a
//    mirar. Sin el reporte, la exclusión sería un cap silencioso.
//
// PII-free: sólo conteos. Nunca applicationId, nombre, correo ni token.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * TASK-1772 / ISSUE-162 — el FROM+WHERE de `awaiting_terminal`, extraído a una constante para que
 * la métrica y su exclusión NO puedan describir poblaciones distintas: comparten el fragmento, así
 * que un cambio en uno es aritméticamente imposible sin el otro.
 *
 * `${inProcessClause}` es lo ÚNICO que las diferencia. Se recibe ENTERO en vez de recortarle una
 * mitad al predicado canónico: una cirugía de string sobre `activeProcessPredicate` sobreviviría a
 * que el predicado cambie de orden o crezca un eje, y produciría otra pregunta en silencio — que es
 * el defecto que esta task existe para cerrar, cometido en su propia implementación.
 */
const awaitingTerminalScope = (inProcessClause: string) => `
  FROM greenhouse_hiring.hiring_application app
  JOIN greenhouse_hiring.hiring_opening_assessment_policy p
    ON p.opening_id = app.opening_id
   AND p.state = 'enabled'
   AND p.mode = 'on_stage_entry'
 WHERE ${inProcessClause}
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
       )`

/**
 * La cola REAL: postulaciones que siguen en proceso activo. Predicado CANÓNICO íntegro — es el
 * mismo que ejecuta `resolveApplicationsAwaitingAssignment`, y ése es el invariante 19 del ADR:
 * una señal cuyo predicado no es el del reader que describe no es una señal, es un silencio.
 */
const AWAITING_TERMINAL_FROM = awaitingTerminalScope(activeProcessPredicate('app'))

/**
 * Su complemento: lo que el eje de visibilidad deja fuera. Evidencia, no alarma.
 *
 * Conserva `decision IS NULL` a propósito — sin él contaría también a las decididas, que no son
 * «excluidas por archivado» sino postulaciones que terminaron y que el predicado viejo tampoco
 * contaba. La exclusión tiene que medir exactamente la diferencia entre el antes y el después.
 */
const AWAITING_TERMINAL_FROM_ARCHIVED = awaitingTerminalScope(
  'app.decision IS NULL AND app.archived_at IS NOT NULL',
)

type AssignmentHealthRow = {
  intent_at_rest: number
  awaiting_terminal: number
  awaiting_terminal_excluded_archived: number
  expired_open_proposals: number
  blocked_last_24h: number
  assigned_without_dispatch_24h: number
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
         -- por (policy, version, etapa) + superseded_at IS NULL, misma exclusion de la
         -- instancia ya abierta de ESA plantilla, y el MISMO predicado de proceso activo
         -- (TASK-1772). Si los dos divergen, la senal deja de describir la cola que la
         -- reconciliacion va a drenar. Los dos se mueven en el mismo commit, siempre.
         (SELECT COUNT(*)::int ${AWAITING_TERMINAL_FROM})                         AS awaiting_terminal,

         -- ISSUE-162 — lo EXCLUIDO por archivado, contado y visible. Un filtro que no se reporta
         -- es indistinguible de un cap silencioso: sin esta metrica, "0 esperando" dejaria de
         -- significar lo mismo que significaba ayer y nadie podria notarlo.
         (SELECT COUNT(*)::int ${AWAITING_TERMINAL_FROM_ARCHIVED})                AS awaiting_terminal_excluded_archived,

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
                      AND d.status IN ('sent', 'delivered')
                 ))                                                    AS assigned_without_dispatch_24h`,
    )

    const deadEndCounts = await countAssignmentDeadEnds()

    const row = rows[0] ?? {
      intent_at_rest: 0,
      awaiting_terminal: 0,
      awaiting_terminal_excluded_archived: 0,
      expired_open_proposals: 0,
      blocked_last_24h: 0,
      assigned_without_dispatch_24h: 0,
    }

    const intentAtRest = Number(row.intent_at_rest)
    const awaiting = Number(row.awaiting_terminal)
    const awaitingExcludedArchived = Number(row.awaiting_terminal_excluded_archived)
    const expiredProposals = Number(row.expired_open_proposals)
    const blocked = Number(row.blocked_last_24h)
    const assignedWithoutDispatch = Number(row.assigned_without_dispatch_24h)
    const deadEnds = deadEndCounts.deadEnds
    const recoverableDeadEnds = deadEndCounts.recoverable
    const honestDeadEnds = deadEndCounts.honest
    const deadEndsCapReached = deadEndCounts.capReached
    const deadEndsExcludedSynthetic = deadEndCounts.excludedSynthetic

    const severity =
      intentAtRest > 0 || deadEndsCapReached > 0
        ? 'error'
        : recoverableDeadEnds > 0 || awaiting > 0 || expiredProposals > 0 || assignedWithoutDispatch > 0
          ? 'warning'
          : 'ok'

    const summary =
      intentAtRest > 0
        ? `${intentAtRest} asignación(es) quedaron a medio registrar: el command murió entre el ledger y la instancia. Es un bug, no operación normal.`
        : deadEndsCapReached > 0
          ? `${deadEndsCapReached} asignación(es) automáticas agotaron el tope de recuperación: la clave sigue ocupada y exige intervención humana.`
        : recoverableDeadEnds > 0
          ? `${recoverableDeadEnds} asignación(es) automáticas quedaron en callejón y su causa ya no aplicaría: se pueden liberar por el supersede gobernado.`
          : assignedWithoutDispatch > 0
            ? `${assignedWithoutDispatch} asignación(es) de las últimas 24 h no tienen despacho de correo registrado.`
            : awaiting > 0
              ? `${awaiting} postulación(es) alcanzaron la etapa trigger sin resultado terminal en el ledger. La reconciliación debe drenarlas.`
              : expiredProposals > 0
                ? `${expiredProposals} propuesta(s) de asignación vencieron sin confirmarse ni cerrarse.`
                : honestDeadEnds > 0
                  ? `${honestDeadEnds} asignación(es) siguen bloqueadas por una causa vigente. No hay nada que liberar todavía: primero se corrige la causa.`
                  : 'Toda asignación tiene resultado terminal, despacho registrado, no hay callejones vigentes ni propuestas vencidas abiertas.'

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
        {
          kind: 'metric',
          label: 'awaiting_terminal_excluded_archived',
          value: String(awaitingExcludedArchived),
        },
        { kind: 'metric', label: 'expired_open_proposals', value: String(expiredProposals) },
        { kind: 'metric', label: 'blocked_last_24h', value: String(blocked) },
        { kind: 'metric', label: 'assignment_dead_ends', value: String(deadEnds) },
        { kind: 'metric', label: 'dead_ends_recoverable', value: String(recoverableDeadEnds) },
        { kind: 'metric', label: 'dead_ends_honest', value: String(honestDeadEnds) },
        { kind: 'metric', label: 'dead_ends_cap_reached', value: String(deadEndsCapReached) },
        { kind: 'metric', label: 'dead_ends_excluded_synthetic', value: String(deadEndsExcludedSynthetic) },
        { kind: 'metric', label: 'dead_ends_evaluation_truncated', value: String(deadEndCounts.truncated) },
        { kind: 'metric', label: 'assigned_without_dispatch_24h', value: String(assignedWithoutDispatch) },
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
