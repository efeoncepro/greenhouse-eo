# TASK-1483 — Greenhouse Globe Credits Operations Workbench Flow

Surface: `/admin/globe/credits`. Globe Producer no administra y sólo enlaza a esta ruta cuando el actor tiene
entitlement.

## Primary flow

1. Resolver actor, workspace, audience y capability server-side.
2. Seleccionar workspace/período; leer capacity status, operations, pools, risks y freshness.
3. Abrir `Asegurar capacidad`; preview server-side resuelve ciclo/target/delta y devuelve before/after.
4. Crear proposal durable con operation key, fingerprint y TTL.
5. Confirmar manualmente o mediante agente autenticado bajo instrucción/delegación; segundo actor sólo por policy.
6. Consultar operation/status hasta terminal; mostrar grant/policy/ledger/readback y restaurar foco.

## Secondary and recovery

- Ledger -> run/deep link; anomaly -> evidence -> safe remediation disponible.
- Proposal expired/stale -> preview nuevo; outcome unknown -> status/reconcile con la misma operation key.
- Permission/redaction -> explicar boundary sin revelar existencia cross-tenant.
- Drift -> no corregir localmente; sólo command gobernado expuesto por backend.
- Dirty drawer bloquea escape/click-away accidental; error preserva input no sensible.

## Parity and access

UI, SDK, MCP y CLI reciben igual command/result/error/audit. Operating mode informa responsabilidad, no
capability. External budget manager sigue policy-blocked hasta `TASK-1480` y rollout posterior.
