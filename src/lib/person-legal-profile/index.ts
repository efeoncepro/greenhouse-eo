import 'server-only'

/**
 * TASK-784 — Person Legal Profile module.
 *
 * Single source of truth for person identity documents + addresses,
 * anchored to `greenhouse_core.identity_profiles.profile_id`.
 *
 * Reglas duras (CLAUDE.md TASK-784 invariants):
 *   - NUNCA leer `value_full` directo en consumers. Use readers canonicos.
 *   - NUNCA loggear `value_full`, `value_normalized`, `presentation_text`,
 *     ni el contenido de `street_line_1` en errors/Sentry/outbox/AI context.
 *   - Reveal SIEMPRE pasa por reveal-helper canonico (capability + reason +
 *     audit + outbox). NUNCA bypass.
 *   - `organizations.tax_id` queda intacto como identidad tributaria de
 *     organizaciones/facturacion. Esta capa cubre identidad legal de
 *     personas naturales.
 */

export * from './errors'
export * from './types'
