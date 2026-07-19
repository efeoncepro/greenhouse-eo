# TASK-1483 — Globe Credits Operations Workbench Flow

## Primary flow

1. Resolver actor, workspace, audience y capability server-side.
2. Seleccionar workspace/período; leer runway, pools, risks y freshness.
3. Abrir pool/grant/entry; reader devuelve detalle redactado y actions permitidas.
4. Solicitar proposal de cambio; servidor calcula impacto, preconditions, fingerprint y TTL.
5. Confirmar con reason/evidence; command canónico ejecuta o devuelve error tipado.
6. Refrescar readers y mostrar ledger entry/audit; restore focus al origen.

## Secondary and recovery

- Ledger -> run/deep link; anomaly -> evidence -> safe remediation disponible.
- Proposal expired/stale -> repropose; conflict -> refrescar sin ocultar cambios ajenos.
- Permission/redaction -> explicar boundary sin revelar existencia cross-tenant.
- Drift -> no corregir localmente; sólo command gobernado expuesto por backend.
- Dirty drawer bloquea escape/click-away accidental; error preserva input no sensible.

## Parity and access

UI, SDK, MCP y CLI reciben igual command/result/error/audit. Operating mode informa responsabilidad, no
capability. External budget manager sigue policy-blocked hasta `TASK-1480` y rollout posterior.
