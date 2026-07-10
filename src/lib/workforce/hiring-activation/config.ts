// TASK-770 — Flag del bridge de activación hiring→HRIS.
//
// HIRING_ACTIVATION_ENABLED (default OFF) gatea los commands + readers del bridge. Se apila
// sobre HIRING_HANDOFF_BRIDGES_ENABLED (356): sin la cola habilitada, el queue reader del
// bridge retorna enabled:false aunque este flag esté ON.
// Runtime: Vercel (API/UI 1368). Registrada en docs/operations/FEATURE_FLAG_STATE_LEDGER.md.

export const isHiringActivationEnabled = (): boolean =>
  process.env.HIRING_ACTIVATION_ENABLED === 'true'
