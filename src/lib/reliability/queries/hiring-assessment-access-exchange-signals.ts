import 'server-only'

import { captureWithDomain } from '@/lib/observability/capture'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { ReliabilitySignal } from '@/types/reliability'

// ══════════════════════════════════════════════════════════════════════════════
// TASK-1746 — Detección de enlaces de assessment que llegan rotos al candidato.
//
// POR QUÉ EXISTE. Con el cutover a fragmento, el correo lleva el bearer en
// `/public/assessment/access#access=<token>`. El fragmento NO viaja al servidor: lo lee el
// bootstrap en el navegador y lo canjea por una sesión HttpOnly. Eso tiene una consecuencia
// incómoda — si algo borra el fragmento en el camino (click tracking del proveedor, un
// reescritor de URLs corporativo del lado del candidato, un cliente de correo que "limpia"
// enlaces), el candidato aterriza en una pantalla de no disponible y NOSOTROS NO NOS
// ENTERAMOS: no hay request al exchange, no hay 4xx, no hay excepción, no hay nada. La única
// traza sería un pageview.
//
// El gate previo al flip (`click_tracking=false` verificado por API) cubre UNA de las causas
// —la nuestra— y es un control humano de una sola vez. No cubre a los reescritores del lado
// del candidato ni detecta una regresión de configuración meses después.
//
// QUÉ MIDE. Assessments despachados hace más de 6 horas que nunca produjeron una sesión
// pública. Con el link funcionando, la mayoría de los candidatos abre el correo dentro de ese
// plazo, así que un conteo alto y sostenido significa exactamente "el enlace llega roto".
//
// POR QUÉ 6 HORAS Y NO MENOS. Un candidato real no abre el correo al instante: lo ve al salir
// del trabajo, al día siguiente, en el metro. Una ventana corta produciría una señal
// permanentemente amarilla, que es la forma más rápida de que nadie la vuelva a mirar. Se
// prefiere detectar tarde y de verdad, que temprano y con ruido.
//
// POR QUÉ SIGUE SIENDO PARCIAL, dicho sin adornos: un candidato que simplemente no abrió el
// correo es indistinguible de uno cuyo enlace llegó roto. Por eso el umbral de `error` es una
// PROPORCIÓN alta y no un conteo: que 2 de 3 no canjeen es ruido estadístico; que 15 de 16 no
// canjeen no lo es. La señal delata el patrón, no diagnostica el caso individual.
//
// POR QUÉ NO SE GATEA POR EL FLAG. `HIRING_ASSESSMENT_PUBLIC_SESSION_LINKS_ENABLED` vive SÓLO en
// el ops-worker; esta señal la lee el overview, que corre en Vercel. Gatearla por esa env daría
// `ok` — "no aplica, el cutover está apagado" — precisamente después del flip, que es cuando es la
// única detección posible. Verde y mintiendo. El estado del cutover se deriva de un hecho en DB.
//
// POR QUÉ NO SE MIDE SOBRE `hiring_assessment_public_session`. Esa tabla se purga a diario (04:17).
// Contar "no tiene sesión" sobre una ventana de días contra una tabla que se vacía cada 24 h hace
// que todo assessment sano cuente como roto al día siguiente: el ratio tiende a 1 y la señal queda
// en rojo permanente con todo funcionando. Se mide `first_access_exchanged_at`, append-once, que
// sobrevive a la retención.
//
// PII-free: sólo conteos. Nunca assessmentId, correo, token ni nombre.
// ══════════════════════════════════════════════════════════════════════════════

type AccessExchangeRow = {
  cutover_active: boolean
  dispatched_window: number
  never_exchanged: number
}

export const HIRING_ASSESSMENT_ACCESS_EXCHANGE_SIGNAL_ID = 'hiring.assessment.access_never_exchanged'

const LABEL = 'Enlaces de assessment que nunca se canjearon'

const SIGNAL_BASE = {
  signalId: HIRING_ASSESSMENT_ACCESS_EXCHANGE_SIGNAL_ID,
  moduleKey: 'hiring' as const,
  kind: 'data_quality' as const,
  source: 'getHiringAssessmentAccessExchangeSignal',
  label: LABEL,
}

export const getHiringAssessmentAccessExchangeSignal = async (): Promise<ReliabilitySignal> => {
  try {
    const rows = await runGreenhousePostgresQuery<AccessExchangeRow>(
      `WITH dispatched AS (
         SELECT a.assessment_id,
                a.first_access_exchanged_at,
                a.started_at
           FROM greenhouse_hiring.hiring_assessment a
           JOIN greenhouse_notifications.email_deliveries d
             ON d.source_entity = a.assessment_id
            AND d.email_type IN ('hiring_assessment_assigned', 'hiring_assessment_access_recovery')
            AND d.status IN ('sent', 'delivered')
          WHERE a.method = 'candidate_test'
            AND a.access_token_hash IS NOT NULL
            -- 48 h y no 6: un candidato real abre el correo al salir del trabajo, al día
            -- siguiente, el lunes si se despachó un viernes. Una ventana corta produce una señal
            -- permanentemente amarilla, que es la forma más rápida de que nadie la vuelva a mirar.
            AND d.created_at < NOW() - INTERVAL '48 hours'
            AND d.created_at > NOW() - INTERVAL '14 days'
          GROUP BY a.assessment_id, a.first_access_exchanged_at, a.started_at
       )
       SELECT
         -- El cutover se declara activo por evidencia durable, nunca por una env var de otro
         -- runtime: basta un canje en toda la historia para saber que los enlaces con fragmento
         -- ya están circulando.
         EXISTS (SELECT 1 FROM greenhouse_hiring.hiring_assessment
                  WHERE first_access_exchanged_at IS NOT NULL)                    AS cutover_active,
         (SELECT COUNT(*)::int FROM dispatched)                                   AS dispatched_window,
         (SELECT COUNT(*)::int FROM dispatched
           WHERE first_access_exchanged_at IS NULL
             -- started_at cubre a quien entró por el enlace legacy antes del cutover: rindió,
             -- así que su enlace no estaba roto aunque no tenga marca de canje.
             AND started_at IS NULL)                                              AS never_exchanged`,
    )

    const row = rows[0] ?? { cutover_active: false, dispatched_window: 0, never_exchanged: 0 }
    const cutoverActive = Boolean(row.cutover_active)
    const dispatched = Number(row.dispatched_window)
    const neverExchanged = Number(row.never_exchanged)
    const ratio = dispatched > 0 ? neverExchanged / dispatched : 0

    if (!cutoverActive) {
      return {
        ...SIGNAL_BASE,
        severity: 'ok',
        observedAt: new Date().toISOString(),
        summary:
          'No aplica todavía: ningún enlace de assessment se ha canjeado por sesión pública, así que el cutover a enlaces con fragmento aún no está circulando.',
        evidence: [{ kind: 'metric', label: 'cutover_active', value: 'false' }],
      }
    }

    // Dos reglas, porque Efeonce opera volúmenes chicos. La proporción necesita masa para
    // significar algo; la racha absoluta caza el caso real de "2 vacantes vivas y todos los
    // enlaces rotos", que con un umbral de 5 despachos pasaría inadvertido.
    const severity =
      (dispatched >= 5 && ratio >= 0.8) || neverExchanged >= 3
        ? 'error'
        : (dispatched >= 5 && ratio >= 0.5) || neverExchanged >= 2
          ? 'warning'
          : 'ok'

    const summary =
      severity === 'ok'
        ? dispatched === 0
          ? 'Sin despachos de assessment con más de 48 horas en las últimas dos semanas.'
          : `${neverExchanged} de ${dispatched} enlace(s) despachado(s) hace más de 48 h aún no se canjean. Dentro de lo esperable.`
        : `${neverExchanged} de ${dispatched} enlaces despachados hace más de 48 h nunca se canjearon ni se empezaron. Revisa que el proveedor no esté reescribiendo los links: el bearer viaja en el fragmento de la URL y un rewrite lo descarta, dejando al candidato sin acceso y sin ningún error visible para nosotros.`

    return {
      ...SIGNAL_BASE,
      severity,
      observedAt: new Date().toISOString(),
      summary,
      evidence: [
        { kind: 'metric', label: 'cutover_active', value: 'true' },
        { kind: 'metric', label: 'dispatched_48h_plus', value: String(dispatched) },
        { kind: 'metric', label: 'never_exchanged', value: String(neverExchanged) },
        { kind: 'metric', label: 'never_exchanged_ratio', value: dispatched > 0 ? ratio.toFixed(2) : '0.00' },
        {
          kind: 'doc',
          label: 'Runbook',
          value: 'docs/operations/runbooks/resend-email-lifecycle-rollout.md',
        },
      ],
    }
  } catch (error) {
    captureWithDomain(error, 'hiring', { tags: { source: 'reliability_hiring_assessment_access_exchange' } })

    return {
      ...SIGNAL_BASE,
      severity: 'unknown',
      observedAt: null,
      summary: 'No se pudo evaluar el canje de enlaces de assessment.',
      evidence: [{ kind: 'metric', label: 'error', value: 'query_failed' }],
    }
  }
}
