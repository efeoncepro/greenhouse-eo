// TASK-822 Slice 1 — Client Portal BFF public surface.
//
// Single entry point for consumers (TASK-823 API namespace, TASK-825 resolver,
// TASK-827 UI composition layer). NEVER imported by producer domains —
// ESLint rule `greenhouse/no-cross-domain-import-from-client-portal` enforces
// the leaf-of-DAG invariant (spec §3.2).
//
// Spec: docs/architecture/GREENHOUSE_CLIENT_PORTAL_DOMAIN_V1.md.

export * from './dto'
export * from './readers'
