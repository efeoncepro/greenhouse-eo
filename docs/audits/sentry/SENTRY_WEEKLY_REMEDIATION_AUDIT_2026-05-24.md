# Sentry Weekly Remediation Audit — 2026-05-24

## Status

- Window revisado: reporte semanal Sentry `2026-05-15` a `2026-05-22`.
- Proyecto: `efeonce-group-spa/javascript-nextjs`, environment `production`.
- Ejecutado: `2026-05-24`.
- Resultado: se implementaron hardenings root-cause para Reliability AI, synthetic probes y finance ledger health. El cierre en Sentry de issues stale/fixed quedo bloqueado por permisos del token disponible.

## Guardrails

- No se bajo sampling.
- No se cambiaron fingerprints para esconder errores.
- No se ignoro ni oculto finance drift.
- Los issues performance siguen abiertos hasta verificar caida real post-deploy.
- Los cierres stale/fixed requieren evidencia runtime y permisos de escritura Sentry.

## Issues stale/fixed candidatos a resolver

| Issue | Sentry ID | Estado observado | Evidencia |
|---|---:|---|---|
| `JAVASCRIPT-NEXTJS-4S` identity auth smoke `portal_auth_health` | `7476342042` | stale/fixed | `/api/auth/health` prod respondio `overallStatus=ready`; Scheduler `ops-identity-auth-smoke` habilitado; ultimo evento visto `2026-05-22`. |
| `JAVASCRIPT-NEXTJS-6E` / `6A` Nubox timeout | `7499811826`, `7497817428` | stale/fixed | ISSUE-080 agrego timeout budget/transient handling; logs recientes de hot sync sin timeout nuevo. |
| `JAVASCRIPT-NEXTJS-6B` / `6C` / `6D` Notion FK drain | `7499608597`, `7499608600`, `7499608638` | stale/fixed | ISSUE-079 creo drain owning `source_sync_runs`; no hay recurrencia reciente en la ventana post-fix. |
| `JAVASCRIPT-NEXTJS-64` Notion arrays null | `7489350534` | stale/fixed | `arrayArg()` / `COALESCE` ya protegen arrays NOT NULL. |
| `JAVASCRIPT-NEXTJS-5Y` / `5Q` / `5T` HubSpot company persistence | `7483362290`, `7479071580`, `7481333857` | stale/fixed | fallback de company name y race canonical `RETURNING` ya aplicados. |
| `JAVASCRIPT-NEXTJS-4T` Entra validation | `7478152701` | stale/fixed | ISSUE-075 corrigio POST validation handshake + signal de subscription health. |
| `JAVASCRIPT-NEXTJS-4R` GitHub App PEM | `7476092645` | stale/fixed | TASK-870 normalizo Secret Manager PEM; sin recurrencia reciente observada. |
| `JAVASCRIPT-NEXTJS-61` / `62` / `3V` / `3S` / `3T` Reliability AI SQL historico | `7485217310`, `7485217344`, `7474970784`, `7474970498`, `7474970575` | stale/fixed | Errores SQL viejos no reaparecen; el problema activo actual era JSON invalido/truncado del modelo, corregido en este cambio. |
| `role_view_fallback_used` warnings | multiples | stale/fixed | TASK-827 seed formalizo grants faltantes; warning queda util como detector de drift futuro. |

Intento de cierre Sentry:

- Comando usado: `PUT /api/0/issues/<id>/ {"status":"resolved"}` con token `greenhouse-sentry-incidents-auth-token`.
- Resultado para todos: `You do not have permission to perform this action.`
- Accion requerida: rotar o ampliar token Sentry con permiso de resolver issues, o ejecutar cierre controlado desde UI/CLI con una identidad autorizada. No se debe borrar, ignorar ni mutear.

## Issues activos que permanecen abiertos

| Issue | Estado | Plan |
|---|---|---|
| `JAVASCRIPT-NEXTJS-4Q` Finance ledger drift | real/activo | Mantener visible. Este cambio agrega dedupe/audit de health run para alertar en Sentry solo cuando el drift cambia materialmente, sin ocultar la deuda. Remediacion contable queda en `TASK-929`. |
| N+1 `/admin/ops-health`, `/admin/integrations`, `/admin/views`, `/hr/payroll*` | real/activo | No resolver en Sentry hasta post-deploy. Synthetic cron `INSERT` N+1 se corrige aqui con bulk insert; el resto queda en `TASK-928`. |
| Reliability AI JSON invalid/truncated | real en Cloud Run logs, no como issue principal Sentry | Corregido aqui con schema estricto, prompt compacto, parser balanceado y un retry de reparacion. Post-deploy debe bajar a cero el log ruidoso `raw response`. |

## Cambios implementados en codigo

### Reliability AI Observer

- `src/lib/reliability/ai/build-prompt.ts`: reduce salida esperada y limita modulos no-ok a 4.
- `src/lib/reliability/ai/runner.ts`: agrega `responseSchema`, `responseMimeType=application/json`, `maxOutputTokens`, parsing de JSON balanceado y un unico retry compacto.
- Parse failures recuperables ya no emiten respuesta cruda; quedan como warning operacional con metadata acotada.
- Tests: `src/lib/reliability/ai/runner.test.ts`.

### Synthetic probes N+1

- `src/lib/reliability/synthetic/persist.ts`: agrega `recordProbeResults()` con `UNNEST` bulk insert.
- `src/lib/reliability/synthetic/runner.ts`: usa bulk insert por chunk y conserva fallback per-probe si el bulk falla.
- Tests: `src/lib/reliability/synthetic/persist.test.ts`.

### Finance ledger health

- `services/ops-worker/server.ts`: registra cada corrida de health en `greenhouse_sync.source_sync_runs` con firma deterministica de drift.
- Sentry se dispara solo si el drift es nuevo o cambia materialmente respecto de la ultima corrida finalizada.
- La deuda contable sigue visible: estado unhealthy, notas auditables y task de remediacion separada.

## Verificacion ejecutada

- `pnpm exec vitest run src/lib/reliability/ai/runner.test.ts src/lib/reliability/synthetic/persist.test.ts` → `2 files / 6 tests passing`.
- `pnpm exec tsc --noEmit` → green.
- `pnpm lint` → green.
- `pnpm build` → green.

## Post-deploy checks requeridos

- Sentry: 24-48h sin eventos nuevos para los issues stale/fixed antes de resolverlos.
- Cloud Run logs: confirmar ausencia de `JSON parse failed — raw response` y presencia solo de warnings acotados si el modelo falla dos veces.
- Sentry performance: validar caida de `JAVASCRIPT-NEXTJS-5R` tras bulk insert; no cerrar otros N+1 hasta implementar `TASK-928`.
- Finance: confirmar que `finance_ledger_health` crea una fila diaria en `source_sync_runs` y que Sentry no alerta repetido si la firma no cambia.
