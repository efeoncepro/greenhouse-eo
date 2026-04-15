// TASK-409 hotfix 2026-04-15 — shared reactive handler key helper.
//
// This file is intentionally free of `server-only`, `next/*`, or any
// database client so diagnostic scripts, tests, and the reactive
// consumer itself can all import the same single source of truth for
// the handler key format.
//
// The handler column in `greenhouse_sync.outbox_reactive_log` carries
// a composite `<projection_name>:<event_type>` value. Duplicating the
// ":" separator across the consumer (writer) and any reader invites
// silent drift — a diagnostic script that hardcodes the format can
// return zero rows without error when the format changes. Centralizing
// it here keeps the contract observable and refactorable.
//
// Import this module instead of replicating the template string.

export const REACTIVE_HANDLER_KEY_SEPARATOR = ':'

export const buildReactiveHandlerKey = (projectionName: string, eventType: string) =>
  `${projectionName}${REACTIVE_HANDLER_KEY_SEPARATOR}${eventType}`
