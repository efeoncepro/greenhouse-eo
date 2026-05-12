// TASK-822 Slice 1 — Curated re-exports barrel.
//
// Re-exports of readers OWNED by producer domains (account-360, agency,
// ico-engine, commercial, finance, delivery, identity) that the client portal
// route group consumes. Re-export is a POINTER, NOT a transfer of ownership:
// the upstream module remains source of truth; if its signature changes, this
// barrel reflects the change automatically.
//
// V1.0 ships 2 demonstrative re-exports (account-summary + ico-overview) to
// validate the full BFF pipeline end-to-end (DTO + meta + barrel + lint rule).
// More re-exports emerge in V1.1 when TASK-823 + TASK-827 introduce real
// client-facing consumers.
//
// Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md §3.1.

export {}
