// TASK-356 — Flag de bridges downstream del HiringHandoff.
//
// HIRING_HANDOFF_BRIDGES_ENABLED (default OFF) gatea SOLO los consumers: el reader de cola
// (listInternalHireReadyForOnboarding) y los bridges downstream (Staff Aug intents).
// El materializer reactivo NO va gateado — un refresh() no-op escribe un resultado terminal
// en outbox_reactive_log y los eventos se perderían de forma permanente.
//
// Runtimes que la leen: Vercel (readers vía API/UI 770) + ops-worker (si un bridge reactivo
// futuro la consume). Registrada en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.

export const isHiringHandoffBridgesEnabled = (): boolean =>
  process.env.HIRING_HANDOFF_BRIDGES_ENABLED === 'true'
