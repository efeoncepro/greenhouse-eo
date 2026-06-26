import 'server-only'

import { NextResponse } from 'next/server'

/**
 * Canonical API error response contract (Greenhouse, 2026-05-14).
 *
 * **Por qué existe**: pre-2026-05-14 los helpers de tenant y los endpoints de
 * `/api/my/*` retornaban `{ error: 'Member identity not linked' }` con prose
 * en inglés directo al UI consumer. Los consumers (MyPaymentProfileView, etc.)
 * implementaron el anti-patrón `throw new Error(payload?.error || 'fallback es-CL')`
 * confiando el `error` crudo del API sobre el fallback local — causando que
 * un string inglés aterrizara en una UI cuyo contrato microcopy es es-CL
 * (TASK-265 + greenhouse-ux-writing skill).
 *
 * **Shape canónico**:
 *
 * ```json
 * {
 *   "error": "Tu identidad de colaborador aún no está enlazada. Pídele a People Ops que active tu acceso.",
 *   "code": "member_identity_not_linked",
 *   "actionable": false
 * }
 * ```
 *
 * - `error`: prose es-CL canónico. Backward compat con consumers legacy que
 *   leen `payload.error` directo — ahora ven texto humano correcto.
 * - `code`: stable machine identifier (snake_case). Consumers nuevos usan
 *   `code` para decidir CTAs específicos (e.g. "Contactar HR" vs "Reintentar").
 * - `actionable`: hint binario. `true` cuando reintentar puede resolver
 *   (timeout, network blip); `false` cuando la causa es estructural (identity
 *   no enlazada, permiso revocado, configuración faltante). El UI usa este
 *   flag para hide / show del botón "Reintentar".
 *
 * **Reglas duras**:
 * - NUNCA retornar prose inglesa en `error`. Toda string en `error` debe ser
 *   es-CL canónico, idealmente extraído de `src/lib/copy/*` (TASK-265).
 * - NUNCA poner detalle técnico (stack trace, SQL error, internal IDs) en
 *   `error`. Eso va a `captureWithDomain` en Sentry, NO al cliente.
 * - SIEMPRE proveer `code` stable cuando emerge un nuevo error path —
 *   permite a consumers mapear a UX específica sin string matching.
 * - SIEMPRE setear `actionable: false` cuando el error requiere acción humana
 *   externa (HR, admin, soporte). Ocultar "Reintentar" es UX honesta.
 */

export type CanonicalErrorCode =
  // Tenant / auth (Identity UX hardening 2026-05-14)
  | 'unauthorized'
  | 'forbidden'
  | 'member_identity_not_linked'
  | 'client_tenant_required'
  // Generic input / throttle / server codes (Coming Soon notify + reusable).
  | 'invalid_email'
  | 'invalid_period'
  | 'rate_limited'
  | 'internal_error'
  // Design System Figma node linking (TASK-1072).
  | 'invalid_figma_url'
  | 'figma_node_not_axis'
  | 'figma_file_not_allowed'
  | 'design_handoff_not_found'
  | 'invalid_design_handoff_input'
  | 'invalid_design_handoff_transition'
  | 'invalid_design_handoff_link'
  | 'invalid_design_handoff_evidence'
  | 'invalid_design_handoff_primitive_decision'
  | 'design_handoff_missing_evidence'
  | 'design_handoff_missing_primitive_decision'
  | 'design_handoff_node_unavailable'
  // Nexa chat endpoint (TASK-1131).
  | 'nexa_prompt_required'
  | 'nexa_generation_failed'
  // Nexa governed action runtime (TASK-1137).
  | 'nexa_action_not_available'
  | 'nexa_action_conflict'
  | 'nexa_action_failed'
  // Roadmap cockpit — work item Markdown lookup (TASK-1153 follow-up).
  | 'roadmap_work_item_not_found'
  // ICO sync activation gobernada (TASK-1171 Slice 3).
  | 'ico_sync_client_not_found'
  | 'ico_sync_source_not_connected'
  // Finance fiscal scope (TASK-725) — sin entidad legal operating configurada.
  | 'fiscal_entity_unavailable'
  // Growth Forms engine (TASK-1229).
  | 'growth_form_invalid_input'
  | 'growth_form_not_found'
  // Growth AI Visibility · admin grader routes (TASK-1226/1235/1239) + review gate (TASK-1244).
  | 'grader_run_not_found'
  | 'grader_run_invalid_input'
  | 'grader_report_not_releasable'
  | 'grader_report_not_reviewable'
  | 'grader_report_invalid_review_transition'
  | 'grader_report_review_reason_required'
// Reserved for future canonical codes — extender aquí cuando emerjan
// nuevos error paths estructurales. NUNCA usar strings ad-hoc.

export interface CanonicalErrorBody {
  /** es-CL canónico, safe para mostrar al usuario directo. */
  error: string
  /** Stable machine identifier para UI mapping. */
  code: CanonicalErrorCode
  /** Hint: si reintentar puede resolver, true. Estructural humana → false. */
  actionable: boolean
}

interface CanonicalErrorDefinition {
  status: number
  message: string
  actionable: boolean
}

const CANONICAL_ERRORS: Record<CanonicalErrorCode, CanonicalErrorDefinition> = {
  unauthorized: {
    status: 401,
    message: 'Tu sesión expiró. Inicia sesión de nuevo para continuar.',
    actionable: true
  },
  forbidden: {
    status: 403,
    message: 'No tienes permisos para acceder a este recurso.',
    actionable: false
  },
  member_identity_not_linked: {
    status: 422,
    // Mensaje accionable explicando QUÉ falta y QUÉ hacer.
    // Reintentar no resuelve — el operador debe gestionar con HR.
    message:
      'Tu cuenta aún no está enlazada a un colaborador. Pídele a People Ops que active tu identidad para acceder a las vistas personales.',
    actionable: false
  },
  client_tenant_required: {
    status: 403,
    message: 'Este recurso solo está disponible para usuarios de cliente.',
    actionable: false
  },
  invalid_email: {
    status: 422,
    message: 'Ingresa un correo válido (ej. nombre@empresa.com).',
    actionable: true
  },
  invalid_period: {
    status: 400,
    message: 'El período solicitado no es válido. Usa un año entre 2024 y 2030 y un mes entre 1 y 12.',
    actionable: true
  },
  rate_limited: {
    status: 429,
    message: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
    actionable: true
  },
  fiscal_entity_unavailable: {
    status: 422,
    // Estructural: falta la entidad legal operativa (is_operating_entity).
    // Reintentar no resuelve — requiere configuración de Admin/Finanzas.
    message:
      'La posición fiscal no está disponible: falta configurar la entidad legal operativa. Contacta a tu administrador de Finanzas.',
    actionable: false
  },
  internal_error: {
    status: 500,
    message: 'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',
    actionable: true
  },
  invalid_figma_url: {
    status: 422,
    message: 'No parece un enlace de nodo Figma. Copia el enlace desde Figma → Copiar enlace de la selección.',
    actionable: true
  },
  figma_node_not_axis: {
    status: 422,
    message: 'El nodo debe ser del archivo AXIS. Pega un enlace de un nodo del Design System en AXIS.',
    actionable: true
  },
  figma_file_not_allowed: {
    status: 422,
    message:
      'Ese archivo de Figma aún no está aprobado para handoff de producto. Pídele a un admin que lo agregue al allowlist.',
    actionable: false
  },
  design_handoff_not_found: {
    status: 404,
    message: 'No encontramos ese handoff de diseño. Puede que se haya archivado o movido.',
    actionable: false
  },
  invalid_design_handoff_input: {
    status: 422,
    message: 'Revisa los datos del handoff. La ruta implementada debe ser una ruta interna válida.',
    actionable: true
  },
  invalid_design_handoff_transition: {
    status: 409,
    message: 'Ese cambio de estado no es válido para el handoff seleccionado.',
    actionable: false
  },
  invalid_design_handoff_link: {
    status: 422,
    message: 'El vínculo del handoff no es válido. Usa una referencia tipada y segura.',
    actionable: true
  },
  invalid_design_handoff_evidence: {
    status: 422,
    message: 'La evidencia del handoff no es válida. Adjunta una ruta, captura o revisión reconocida.',
    actionable: true
  },
  invalid_design_handoff_primitive_decision: {
    status: 422,
    message: 'Revisa la decisión de Primitive governance. La estrategia debe tener los campos obligatorios.',
    actionable: true
  },
  design_handoff_missing_evidence: {
    status: 409,
    message: 'Para cerrar un handoff como implementado necesitas evidencia runtime o una excepción gobernada.',
    actionable: false
  },
  design_handoff_missing_primitive_decision: {
    status: 409,
    message: 'Para cerrar un handoff como implementado necesitas una decisión Primitive governance resuelta.',
    actionable: true
  },
  design_handoff_node_unavailable: {
    status: 409,
    message: 'No pudimos verificar ese nodo Figma ahora. Revisa el acceso al archivo o inténtalo más tarde.',
    actionable: true
  },
  nexa_prompt_required: {
    status: 422,
    message: 'Escribe una pregunta para Nexa antes de enviar.',
    actionable: true
  },
  nexa_generation_failed: {
    status: 500,
    // Transitorio (hiccup del proveedor LLM / tool): reintentar suele resolver.
    message: 'Nexa no pudo generar una respuesta. Inténtalo de nuevo en unos segundos.',
    actionable: true
  },
  // TASK-1137 — la acción propuesta ya no está disponible (no existe, deshabilitada o sin permiso).
  nexa_action_not_available: {
    status: 422,
    message: 'Esta acción ya no está disponible para tu cuenta. Pídele a Nexa que la proponga de nuevo.',
    actionable: false
  },
  // Idempotencia: la misma acción ya se está ejecutando, o el contexto cambió respecto a la propuesta.
  nexa_action_conflict: {
    status: 409,
    message: 'Esta acción ya se está procesando o cambió desde que se propuso. Vuelve a pedirla si hace falta.',
    actionable: false
  },
  // La ejecución del command falló (transitorio): reintentar suele resolver.
  nexa_action_failed: {
    status: 500,
    message: 'No pude completar la acción en este momento. Inténtalo de nuevo en unos segundos.',
    actionable: true
  },
  // TASK-1153 — el work item solicitado no existe (o no es legible) en el índice del backlog.
  roadmap_work_item_not_found: {
    status: 404,
    message: 'No encontramos ese work item en el backlog. Puede que se haya movido o renombrado.',
    actionable: false
  },
  ico_sync_client_not_found: {
    status: 404,
    message: 'No encontramos un espacio para ese cliente. Verifica que el cliente exista y tenga un espacio activo.',
    actionable: false
  },
  ico_sync_source_not_connected: {
    status: 422,
    // Reintentar no resuelve: hay que conectar Notion primero (wizard de onboarding).
    message:
      'Este cliente aún no tiene Notion conectado, así que no se puede activar su sync de ICO. Conéctalo primero desde el onboarding.',
    actionable: false
  },
  // TASK-1229 — Growth Forms engine.
  growth_form_invalid_input: {
    status: 400,
    message: 'Revisa los datos del formulario. Falta un campo obligatorio o un valor no es válido.',
    actionable: true
  },
  growth_form_not_found: {
    status: 404,
    message: 'No encontramos ese formulario. Puede que se haya archivado o no exista.',
    actionable: false
  },
  // Growth AI Visibility · admin grader routes (TASK-1226/1235/1239) + review gate (TASK-1244).
  // Errores estructurales (no se resuelven reintentando) → actionable: false; los de input
  // (el operador corrige y reenvía) → actionable: true.
  grader_run_not_found: {
    status: 404,
    message: 'No encontramos ese análisis del grader, o aún no tiene datos para mostrar.',
    actionable: false
  },
  grader_run_invalid_input: {
    status: 400,
    message: 'Revisa los datos del análisis: falta un campo obligatorio o un valor no es válido.',
    actionable: true
  },
  grader_report_not_releasable: {
    status: 409,
    message: 'El reporte no es publicable en su estado actual (requiere cobertura suficiente o aprobación de revisión).',
    actionable: false
  },
  grader_report_not_reviewable: {
    status: 409,
    message: 'Este reporte no está en revisión: solo se aprueba o rechaza un reporte marcado para revisión humana.',
    actionable: false
  },
  grader_report_invalid_review_transition: {
    status: 409,
    message: 'Ese cambio no es válido: el reporte ya fue aprobado o rechazado.',
    actionable: false
  },
  grader_report_review_reason_required: {
    status: 422,
    message: 'Indica el motivo del rechazo para continuar (queda en el registro interno).',
    actionable: true
  }
}

/**
 * Build canonical error NextResponse. Single source of truth para todos los
 * errores API que cruzan al cliente. Replaces ad-hoc
 * `NextResponse.json({ error: 'English prose' }, { status: 422 })`.
 *
 * @param code stable canonical error code
 * @param overrides opcional: extiende `extra` con metadata adicional safe
 *   para el cliente (e.g. requiredCapability, link a runbook). NUNCA pasar
 *   info sensitive (PII, internal IDs, stack traces) — esos van a Sentry.
 */
export const canonicalErrorResponse = (
  code: CanonicalErrorCode,
  overrides?: { extra?: Record<string, unknown>; statusOverride?: number }
): NextResponse<CanonicalErrorBody & Record<string, unknown>> => {
  const definition = CANONICAL_ERRORS[code]
  const status = overrides?.statusOverride ?? definition.status

  const body: CanonicalErrorBody & Record<string, unknown> = {
    error: definition.message,
    code,
    actionable: definition.actionable,
    ...(overrides?.extra ?? {})
  }

  return NextResponse.json(body, { status })
}

/**
 * Type guard para parsear canonical error responses desde el cliente.
 * Consumers nuevos lo usan para decidir UI flow basado en `code`.
 */
export const isCanonicalErrorBody = (value: unknown): value is CanonicalErrorBody =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as CanonicalErrorBody).error === 'string' &&
  typeof (value as CanonicalErrorBody).code === 'string' &&
  typeof (value as CanonicalErrorBody).actionable === 'boolean'
