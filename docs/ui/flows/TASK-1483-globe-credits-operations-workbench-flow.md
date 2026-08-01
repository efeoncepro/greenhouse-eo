# TASK-1483 — Greenhouse Globe Credits Operations Workbench Flow

Surface: `/admin/globe/credits`. Globe Producer no administra y sólo enlaza a esta ruta cuando el actor tiene
entitlement.

## Primary flow

1. Resolver actor, workspace, audience y capability server-side.
2. Seleccionar workspace/período; leer capacity status, operations, pools, risks y freshness.
3. Abrir `Asegurar capacidad`; preview server-side resuelve ciclo/target/delta y devuelve before/after.
4. Crear proposal durable con operation key, fingerprint y TTL.
5. Confirmar manualmente o mediante agente autenticado bajo instrucción/delegación; segundo actor sólo por policy.
6. Si falta selección o segundo actor, presentar `selection_required|second_actor_required` sin mutar.
7. Durante confirm, mostrar `confirming`; consultar operation/status hasta
   `completed|confirm_failed|reconciled|outcome_unknown` y restaurar foco.

## Secondary and recovery

- Ledger -> run/deep link; anomaly -> evidence -> safe remediation disponible.
- Proposal expired/stale -> preview nuevo; outcome unknown -> status/reconcile con la misma operation key.
- Fingerprint mismatch -> invalidar confirmación y exigir preview nuevo; nunca adaptar el payload silenciosamente.
- Timeout -> status/readback-first: `timeout_recovered` si aparece receipt terminal; `outcome_unknown` si la
  autoridad aún no puede probar efecto o ausencia de efecto. En ninguno de los dos casos hay retry ciego.
- Permission/redaction -> explicar boundary sin revelar existencia cross-tenant.
- Drift -> no corregir localmente; sólo command gobernado expuesto por backend.
- Dirty drawer bloquea escape/click-away accidental; error preserva input no sensible.

## Parity and access

UI, SDK y CLI reciben igual command/result/error/audit. MCP/Nexa son adapters futuros del mismo primitive y no
bloquean esta UI ni obtienen autoridad adicional. Operating mode informa responsabilidad, no capability.
External budget manager sigue policy-blocked hasta `TASK-1480` y rollout posterior.

## GVC Scenario Plan

- Quality profile: premium; desktop 1440×1000 y mobile 390×844.
- Ejercer selección, preview, confirmación bloqueada, recovery readback-first, Escape y focus restore.
- El dossier vive en `docs/ui/reviews/TASK-1483-globe-credits-operations-workbench-first-fold-review-2026-08-01.md`.

## Design Decision Log

Se eligió un flujo read-before-write con propuesta durable y readback terminal. Se rechazó un submit directo y
un retry automático porque ambos ocultarían el plan o podrían duplicar una mutación económica.
