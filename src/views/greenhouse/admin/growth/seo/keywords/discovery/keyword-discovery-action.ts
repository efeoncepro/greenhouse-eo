import { GH_GROWTH_SEO_KEYWORDS } from '@/lib/copy/growth'

/**
 * TASK-1665 Slice 4 — mapeo de las acciones gobernadas del candidato.
 *
 * Este módulo existe para que el drawer sea PROYECCIÓN y nada más. Acá vive el mapa
 * "acción → ruta → cuerpo → cómo se lee el resultado"; en el JSX sólo queda pintar y llamar.
 * Es transporte y presentación, no regla de negocio: el techo de gasto, la idempotencia, la
 * normalización y el entitlement viven en `trackKeywords` / `recordKeywordDiscoveryAction` /
 * `createGroundedQueryDraft`, que son los MISMOS primitives que consumen Nexa y el lane MCP.
 *
 * 🔴 **Ninguna acción se resuelve en el cliente.** No hay optimistic update: seguir un término
 * compromete gasto recurrente, y pintar "Siguiendo" antes de que el command confirme mentiría
 * sobre la factura. El estado visual sólo se mueve con un outcome durable en la mano.
 *
 * 🔴 **El outcome se lee POR keyword, jamás el 200 pelado.** `trackKeywords` responde 200 con la
 * keyword RECHAZADA por techo (`capacity_exceeded`): tratar eso como éxito pintaría seguimiento
 * sobre algo que nadie está midiendo. El vocabulario real del command es
 * `tracked | already_tracked | intent_changed | capacity_exceeded | invalid` — NO el
 * `declared`/`already_target` del borrador del flow, que nunca existió en el primitive.
 */

const COPY = GH_GROWTH_SEO_KEYWORDS.discovery.actions

/** Acciones que el drawer puede ofrecer. `viewTrajectory` es navegación, no command. */
export type KeywordDiscoveryActionKind = 'declareTarget' | 'followOpportunity' | 'prepareGrounded' | 'dismiss'

/** Las tres que comprometen algo piden confirmación explícita; descartar también la pide. */
export const KEYWORD_DISCOVERY_ACTION_CONFIRM: Record<KeywordDiscoveryActionKind, string> = {
  declareTarget: COPY.declareTargetConfirm,
  followOpportunity: COPY.followOpportunityConfirm,
  prepareGrounded: COPY.prepareGroundedConfirm,
  dismiss: COPY.dismissConfirm
}

export const KEYWORD_DISCOVERY_ACTION_LABEL: Record<KeywordDiscoveryActionKind, string> = {
  declareTarget: COPY.declareTarget,
  followOpportunity: COPY.followOpportunity,
  prepareGrounded: COPY.prepareGrounded,
  dismiss: COPY.dismiss
}

export const KEYWORD_DISCOVERY_ACTION_HINT: Record<KeywordDiscoveryActionKind, string> = {
  declareTarget: COPY.declareTargetHint,
  followOpportunity: COPY.followOpportunityHint,
  prepareGrounded: COPY.prepareGroundedHint,
  dismiss: COPY.dismissHint
}

export const TRACK_ENDPOINT = '/api/admin/growth/seo/keywords/track'
export const DISCOVERY_ENDPOINT = '/api/admin/growth/seo/keyword-discovery'
export const GROUNDED_QUERIES_ENDPOINT = '/api/admin/growth/seo/grounded-queries'

export interface KeywordDiscoveryActionContext {
  organizationId: string
  seoTargetId: string
  runId: string
  candidateId: string
  keyword: string
  /** Perfil AEO de la org; sin él `prepareGrounded` ni se ofrece. */
  graderProfileId: string | null
}

export interface KeywordDiscoveryActionRequest {
  endpoint: string
  body: Record<string, unknown>
}

/**
 * Traduce la acción al request del lane app. Devuelve `null` cuando la acción no es ejecutable
 * con el contexto disponible (por ejemplo, grounded sin perfil AEO) — el caller no debe adivinar
 * un cuerpo incompleto para que el servidor lo rechace después.
 */
export const buildKeywordDiscoveryActionRequest = (
  kind: KeywordDiscoveryActionKind,
  context: KeywordDiscoveryActionContext
): KeywordDiscoveryActionRequest | null => {
  switch (kind) {
    // Seguir y declarar objetivo son EL MISMO command con intención distinta. Son dos labels
    // porque son dos decisiones de negocio, no dos mecánicas: `intent` viaja con autor y fecha.
    case 'declareTarget':
      return {
        endpoint: TRACK_ENDPOINT,
        body: { seoTargetId: context.seoTargetId, keywords: [context.keyword], intent: 'target' }
      }

    case 'followOpportunity':
      return {
        endpoint: TRACK_ENDPOINT,
        body: { seoTargetId: context.seoTargetId, keywords: [context.keyword], intent: 'opportunity' }
      }

    case 'prepareGrounded':
      if (!context.graderProfileId) return null

      return {
        endpoint: GROUNDED_QUERIES_ENDPOINT,
        body: {
          organizationId: context.organizationId,
          profileId: context.graderProfileId,
          seoTargetId: context.seoTargetId,
          discoveryRunId: context.runId,
          candidateIds: [context.candidateId]
        }
      }

    // Descartar NO borra: registra una decisión append-only. La evidencia (candidato, corrida,
    // procedencia) queda intacta y auditable, y cualquier decisión posterior la supersede.
    case 'dismiss':
      return {
        endpoint: DISCOVERY_ENDPOINT,
        body: {
          intent: 'record_action',
          organizationId: context.organizationId,
          candidateId: context.candidateId,
          actionKind: 'dismissed'
        }
      }
  }
}

export type KeywordDiscoveryActionSeverity = 'success' | 'info' | 'error'

export interface KeywordDiscoveryActionFeedback {
  severity: KeywordDiscoveryActionSeverity
  message: string
  /** `true` cuando el término quedó efectivamente en el seguimiento diario. */
  tracked: boolean
}

interface TrackOutcome {
  keyword?: string
  status?: string
}

const fillKeyword = (template: string, keyword: string) => template.replace('{keyword}', keyword)

/**
 * Lee la respuesta de `trackKeywords` **por keyword**. Un lote de uno sigue siendo un lote: se
 * busca el outcome de ESTA keyword y sólo si no viene se cae al primero, nunca al `ok` global.
 */
export const resolveTrackFeedback = (
  payload: { outcomes?: TrackOutcome[] } | null,
  keyword: string,
  kind: 'declareTarget' | 'followOpportunity'
): KeywordDiscoveryActionFeedback => {
  const outcome = payload?.outcomes?.find(item => item.keyword === keyword) ?? payload?.outcomes?.[0]

  switch (outcome?.status) {
    case 'tracked':
      return {
        severity: 'success',
        message: fillKeyword(kind === 'declareTarget' ? COPY.feedbackTargetDeclared : COPY.feedbackTracked, keyword),
        tracked: true
      }

    // Ya estaba: es `info`, no `success`. Decirlo "listo" escondería que no pasó nada nuevo.
    case 'already_tracked':
      return { severity: 'info', message: fillKeyword(COPY.feedbackAlreadyTracked, keyword), tracked: true }

    // TASK-1659: reclasificar CIERRA la membresía vigente y abre otra. Sí pasó algo, y no
    // consume cupo — reportarlo como `already_tracked` sería mentira.
    case 'intent_changed':
      return { severity: 'success', message: fillKeyword(COPY.feedbackIntentChanged, keyword), tracked: true }

    case 'capacity_exceeded':
      return { severity: 'error', message: fillKeyword(COPY.feedbackCapacityExceeded, keyword), tracked: false }

    case 'invalid':
      return { severity: 'error', message: fillKeyword(COPY.feedbackInvalid, keyword), tracked: false }

    default:
      return { severity: 'error', message: fillKeyword(COPY.feedbackError, keyword), tracked: false }
  }
}

/**
 * `TASK-1666` distingue el borrador razonado por el modelo del que salió de la plantilla base.
 * El `baseline_fallback` NO es un éxito silencioso: el operador tiene que saber que lo que va a
 * revisar no se construyó con el contexto de su marca.
 *
 * 🔴 **Tres hechos del contrato del bridge que NO se pueden omitir**, y que este resolver leía
 * sólo a medias cuando miraba únicamente `mode`:
 *
 *  1. `coverageNotice` viaja OBLIGATORIO: un draft `grounded_llm` con huecos jamás se presenta
 *     como cobertura total. Anunciar «se creó el borrador» a secas sobre un borrador que dejó
 *     candidatos afuera es exactamente lo que el primitive prohíbe.
 *  2. `deduped: true` significa que se reutilizó un draft vigente — no hubo segunda llamada al
 *     modelo ni borrador nuevo. Decir «se creó» escondería un no-op.
 *  3. El fallback ya estaba cubierto y se mantiene.
 *
 * Orden de precedencia: fallback > deduped > cobertura parcial > éxito pleno. El fallback manda
 * porque cambia la NATURALEZA de lo que hay que revisar; los otros dos matizan un draft real.
 */
export const resolveGroundedFeedback = (
  payload: { mode?: string; fallbackNotice?: string | null; coverageNotice?: string | null; deduped?: boolean } | null,
  keyword: string
): KeywordDiscoveryActionFeedback => {
  if (payload?.mode === 'baseline_fallback') {
    return { severity: 'info', message: fillKeyword(COPY.feedbackGroundedFallback, keyword), tracked: false }
  }

  if (payload?.deduped === true) {
    return { severity: 'info', message: fillKeyword(COPY.feedbackGroundedDeduped, keyword), tracked: false }
  }

  const coverageNotice = typeof payload?.coverageNotice === 'string' ? payload.coverageNotice.trim() : ''

  if (coverageNotice.length > 0) {
    return {
      severity: 'info',
      message: fillKeyword(COPY.feedbackGroundedPartial, keyword).replace('{notice}', coverageNotice),
      tracked: false
    }
  }

  return { severity: 'success', message: fillKeyword(COPY.feedbackGroundedDraft, keyword), tracked: false }
}

export const resolveDismissFeedback = (keyword: string): KeywordDiscoveryActionFeedback => ({
  severity: 'info',
  message: fillKeyword(COPY.feedbackDismissed, keyword),
  tracked: false
})

export const resolveActionErrorFeedback = (keyword: string, message?: string): KeywordDiscoveryActionFeedback => ({
  severity: 'error',
  message: message || fillKeyword(COPY.feedbackError, keyword),
  tracked: false
})

/** Enlace read-only a Rendimiento. No inicia corrida ni gasta: es navegación. */
export const buildTrajectoryHref = (organizationId: string, keyword: string): string =>
  `/admin/growth/seo/performance?space=${encodeURIComponent(organizationId)}&keywords=${encodeURIComponent(keyword)}`
