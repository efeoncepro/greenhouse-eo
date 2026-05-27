# Admin Center Reliability Audit — 2026-05-26

## Status

- Fecha de ejecucion: 2026-05-26
- Scope: ruta `/admin` como superficie del Reliability Control Plane en staging.
- Ambiente inspeccionado: `https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app/admin`
- Custom domain solicitado: `https://dev-greenhouse.efeoncepro.com/admin`
- Resultado del custom domain: protegido por Vercel SSO para automatizacion; se uso la URL `.vercel.app` canonica con bypass.
- Actor autenticado: `agent@greenhouse.efeonce.org` (`user-agent-e2e-001`, roles `efeonce_admin` + `collaborator`).
- Herramientas: Playwright/Chromium con storage state de agente, `pnpm pg:doctor`, SQL read-only via repo scripts, Vercel CLI, GitHub CLI.
- Artifacts locales: `.captures/admin-diagnostic-2026-05-26T11-19-01-072Z/`.
- Mutation policy: diagnostico principalmente read-only; se aplico un fix de codigo acotado al reader de Sentry para evitar rate-limit. No hubo remediacion de datos ni cambios de env.

## Guardrails

- No se silenciaron banners, errores ni estados de la UI.
- No se ocultaron reliability signals ni se redujo severidad para "limpiar" la pantalla.
- No se mutaron datos de Finance, Delivery, Identity, Payroll, Release ni Sync.
- No se configuraron env vars en Vercel durante la auditoria.
- No se resolvieron issues Sentry ni se cambiaron fingerprints.
- El header `x-vercel-protection-bypass` debe aplicarse solo a origins Greenhouse/Vercel; no debe filtrarse a terceros como Sentry.

## Executive Summary

`/admin` carga correctamente en staging con HTTP 200 y renderiza Admin Center. Los problemas observados no son un fallo cosmetico de UI: la pantalla esta exponiendo drift real del Reliability Control Plane.

El problema tecnico inmediato estaba en el reader de incidentes por dominio: `getReliabilityOverview()` consultaba Sentry para varios dominios en paralelo y Sentry devolvia `HTTP 429` (`Limit is 5 requests in 1 seconds`). El fix aplicado cambia ese fan-out a batches de 4 con pausa de 1.1s. Esto no silencia incidentes; reduce el rate-limit para permitir que el reader muestre senales reales.

La auditoria confirma drift activo en Notion/Delivery, FTR writeback, Finance ledger/distribution, Identity, Payroll final settlements, Release observer config y Sync/reactive projections. La mayoria son problemas subyacentes de data/env/proyeccion, no problemas de render.

## Methodology

1. Generar sesion NextAuth del usuario agente dedicado con `scripts/playwright-auth-setup.mjs`.
2. Abrir `/admin` con Playwright/Chromium usando storage state autenticado.
3. Capturar screenshot, console messages, page errors, failed requests y respuestas relevantes.
4. Consultar `/api/admin/reliability` autenticado para obtener el overview JSON.
5. Ejecutar probes read-only contra Postgres y CLIs autenticadas para comprobar las senales subyacentes.
6. Separar ruido de navegador de problemas reales:
   - RSC prefetch aborts: benignos.
   - Sentry CORS provocado por header de bypass a tercero: hygiene issue de la automatizacion.
   - Reliability cards/drift: senales reales.

## Findings

### REL-ADMIN-001 — Sentry domain incident reader rate-limited

Severity: High

Estado: fix aplicado en codigo.

Evidence:

- Browser/API diagnostic mostro fallas Sentry `HTTP 429`.
- Mensaje observado: `Limit is 5 requests in 1 seconds`.
- Codigo afectado: `src/lib/reliability/get-reliability-overview.ts`.

Root cause:

- `hydrateDomainIncidents()` hacia fan-out paralelo de todos los `incidentDomainTag`.
- Sentry rate-limit se activaba antes de poder devolver la senal por dominio.

Fix:

- Batches de 4 consultas.
- Pausa de 1.1s entre batches.
- Fallas siguen aisladas por dominio; no se oculta el incidente.

Verificacion:

- `pnpm exec eslint src/lib/reliability/get-reliability-overview.ts` OK.
- `pnpm exec tsc --noEmit --pretty false` OK.

### REL-ADMIN-002 — Notion/Delivery raw freshness y parity rotos en staging

Severity: Critical

Estado: abierto.

Evidence:

- `integration_data_quality_runs` broken para 2 spaces.
- Raw Notion vacio: `raw=0`.
- Conformed tiene datos: 313 y 59 rows.
- Checks afectados: `missing_in_raw`, `row_count_parity`, `raw_freshness`.
- `task_status_transitions` existe, pero coverage ultimos 90 dias sigue casi todo unavailable: 1902/1911 unavailable.

Env evidence:

- `NOTION_TOKEN` existe en Production y Preview(develop), no en `staging`.
- `NOTION_STATUS_TRANSITIONS_*` aparece solo en Production.

Interpretacion:

- Admin Center esta mostrando una degradacion real de ingesta/proyeccion Notion en staging.
- No debe tratarse como bug de UI.

Recommended next action:

- Decidir si staging debe tener Notion runtime completo o si las senales deben distinguir `not_configured` de `broken`.
- Revisar env parity y el contrato de TASK-908/TASK-912 para staging.

### REL-ADMIN-003 — FTR writeback lag sin intentos

Severity: Medium

Estado: remediado semánticamente 2026-05-26 / esperado mientras el flag siga OFF.

Evidence:

- 63 `task_ftr_snapshots` valid pending writeback > 30m.
- Sky: 53.
- Efeonce: 10.
- `attempted=0`.
- `NOTION_FTR_WRITEBACK_ENABLED` no esta configurado.

Interpretacion:

- El signal refleja una capacidad implementada pero no activada.
- Mientras el flag este OFF, la deuda puede ser esperada, pero la UI deberia comunicar claramente si es `disabled_by_flag` vs `lag`.

Recommended next action:

- Activar el flag solo si se aprueba la escritura a Notion.
- Si no se activara pronto, ajustar el signal para separar pending operativo de feature deshabilitada.

### REL-ADMIN-004 — Finance ledger y distribution drift activos

Severity: High

Estado: abierto; requiere remediacion operativa, no UI.

Evidence:

- `finance.account_balances.fx_drift`: 2 rows en `global66-clp`.
  - 2026-04-04 drift CLP 1,778,789.
  - 2026-03-06 drift CLP 1,034,522.
- `expense_distribution.unresolved`: 4 expenses de mayo 2026.
  - `EXP-NB-36938594` Santander CLP 15,963.
  - `EXP-NB-36671466` Nubox CLP 71,638.
  - `EXP-NB-36689178` X CAPITAL CLP 27,990.
  - `EXP-NB-36671467` Luis Reyes CLP 148,312.
- `finance.ledger.unresolved_drift_items`: 34 unanchored.
- Ledger drift inventory:
  - settlement count: 0.
  - unanchored total: CLP 5,374,028.
  - material: 18.
  - immaterial: 16.
  - acknowledged: 0.

Important nuance:

- Los 3 `internalTransferImbalance` observados corresponden al detector legacy ya documentado por TASK-714d como falso positivo; no deben mezclarse con drift contable real.

Recommended next action:

- Resolver/acknowledgear unanchored via tooling de TASK-934.
- Remediar FX drift de `global66-clp` con task de Finance dedicada.
- Cerrar Sentry/health solo tras 24-48h de `healthy=true`, no por ocultamiento de UI.

### REL-ADMIN-005 — Identity access/person drift

Severity: Medium

Estado: remediado 2026-05-26 (ver Remediation Delta).

Evidence:

- 4 members Chile sin CL_RUT verificado:
  - Felipe Zurita.
  - Humberly Henriquez.
  - Julio Reyes.
  - Luis Reyes.
- 7 contract/legal relationship drift:
  - Humberly.
  - Luis.
  - Felipe.
  - Maria Camila.
  - Andres.
  - Daniela.
  - Melkin.
- 1 SCIM internal user without member:
  - `support@efeoncepro.com`.

Interpretacion:

- Es drift real de identity/person governance.
- No bloquea render de `/admin`, pero debe permanecer visible.

Recommended next action:

- Ejecutar reconciliacion Person 360 / legal relationships por task de Identity/HR.
- Revisar si `support@efeoncepro.com` debe ser usuario tecnico sin member o si requiere member/profile asociado.

### REL-ADMIN-006 — Payroll final settlement PDF metadata drift

Severity: Medium

Estado: abierto.

Evidence:

- 13 `final_settlement_documents` legacy/superseded de Valentina Hoyos.
- Tienen `pdf_asset_id`, pero el asset no tiene `metadata_json.documentStatusAtRender`.
- Max drift observado: ~493h.

Interpretacion:

- No afecta calculo de liquidacion/finiquito.
- Si afecta coherencia audit trail PDF/status para documentos legacy.

Recommended next action:

- Decidir entre reissue controlado o backfill de metadata para documentos superseded.
- Mantener fuera de payroll calculation logic.

### REL-ADMIN-007 — Release observer degradado por config incompleta

Severity: Medium

Estado: remediado 2026-05-26 (ver Remediation Delta).

Evidence:

- `github_release_webhook_events` ultimas 24h:
  - ignored: 188.
  - unmatched: 58.
  - failed: 0.
- `gh run list --status waiting` devolvio `[]`.
- `GITHUB_RELEASE_OBSERVER_TOKEN` no aparece en Vercel env.

Interpretacion:

- No hay evidencia de cola waiting real en GitHub.
- Algunos readers de stale/pending/revision drift degradan a `unknown` por token faltante.

Recommended next action:

- Configurar token dedicado si el observer debe operar en staging.
- Mantener `unmatched` como senal hasta revisar si son eventos esperados o mapping incompleto.

### REL-ADMIN-008 — Sync/reactive failures no recuperados

Severity: High

Estado: remediado para la causa `greenhouse_serving` 2026-05-26; quedan failures de aplicación/configuración fuera de este root cause.

Evidence:

- `outbox_events` dead-letter: vacio.
- `outbox_reactive_log` conserva failures no recuperados.
- Error principal: `permission denied for schema greenhouse_serving` en proyecciones commercial/member/person.
- Otro error: `hubspot_services_intake` con `Sentry.captureException is not a function`, ultimo observado 2026-05-09.

Interpretacion:

- El outbox principal no esta muerto, pero reactive consumers tienen deuda de recovery/permisos.
- Esto puede explicar senales stale o projections incompletas en Admin Center.

Recommended next action:

- Revisar grants del runtime user contra `greenhouse_serving`.
- Corregir import/uso de Sentry en `hubspot_services_intake`.
- Reprocesar failures tras fix y confirmar `outbox_reactive_log` limpio.

## Browser / Automation Notes

- La ruta `/admin` renderiza 200 con sesion agente.
- El custom domain `dev-greenhouse.efeoncepro.com` no es target programatico confiable por SSO; usar `.vercel.app` + bypass.
- RSC prefetch aborts observados no se trataron como incidentes.
- El envio accidental de `x-vercel-protection-bypass` a Sentry provoca CORS/noise; el hook `greenhouse-browser-diagnostics` canoniza que ese header se limite por origin.

## Remediation Delta — 2026-05-26

Hallazgos remediados tras la auditoría:

- **REL-ADMIN-002 / Notion flags**:
  - Causa raíz confirmada para `raw=0`: el writer upstream `notion-bq-sync` eliminaba filas existentes de `notion_ops.tareas` por space y luego fallaba la carga BigQuery por una propiedad Notion nueva `[GH] RpA v2`, normalizada a un field inválido (`[gh]_rpa_v2`).
  - Contrato post-fix: el eco raw válido de esa propiedad es `notion_ops.tareas.gh_rpa_v2`; el writeback RpA V2 sigue apuntando a la propiedad Notion literal `[GH] RpA v2` y el motor no usa el eco raw como input.
  - Fix aplicado fuera del portal: normalización defensiva en `../notion-bigquery/main.py` para convertir caracteres prohibidos en nombres dinámicos de propiedades a `_`; desplegado a Cloud Run revision `notion-bq-sync-00017-pct` y tráfico actualizado al 100%.
  - Remediación live: `notion-bq-daily-sync` post-fix terminó `7 ok, 0 skipped, 0 errors` y restauró `notion_ops.tareas` (Efeonce 1345, Sky 3989).
  - Se ejecutó `ops-notion-conformed-sync`; el drain PG escribió `152 projects`, `35 sprints`, `5334 tasks`.
  - Verificación DQ persistida: Efeonce `healthy raw=60 conformed=60 diff=0`; Sky `healthy raw=358 conformed=358 diff=0`.
  - `notion.metrics.ftr_writeback_lag` ahora es flag-aware: con `NOTION_FTR_WRITEBACK_ENABLED` OFF reporta backlog dormido y conserva `lag_count_if_enabled` como evidencia.
  - `notion.correction_transitions.source_availability` ahora reporta `unknown` cuando `NOTION_STATUS_TRANSITIONS_WEBHOOK_ENABLED` está OFF, en vez de critical falso pre-activación.
  - Se agregó `NOTION_TOKEN` a Vercel `staging`.
  - Se reprocesó el retry de `notion_status_transition_capture`; resultado live `noop:unchanged`, sin error.
- **REL-ADMIN-007 / Release observer**:
  - `github-webhook-reconciler` clasifica eventos no-failure sin release manifest como `ignored/non_failure_without_release_manifest`; failures sin manifest siguen siendo `unmatched`.
  - Se reclasificaron 2722 eventos benignos históricos.
  - Verificación live: últimos 24h con `processing_status IN ('unmatched','failed')` = 0.
  - Se agregó GitHub App observer config a Vercel `staging`.
- **REL-ADMIN-008 / Reactive failures**:
  - Se agregó replay scoped por handler (`handlerKeys` + `replayFailedHandlers`) para procesar `retry/dead-letter` activos sin drenar backlog global.
  - Se re-procesaron handlers afectados por el drift histórico de `greenhouse_serving`.
  - Verificación live: `active_infra_failures = 0`.
  - Quedan failures activas de aplicación/configuración fuera del root cause de permisos: HubSpot outbound token, payload HubSpot company inválido, payment profile SQL drift, payroll receipt insert shape.

## Changes Applied

- `src/lib/reliability/get-reliability-overview.ts`
  - agrega batching de consultas Sentry por dominio.
  - conserva aislamiento de fallos por dominio.
  - evita rate-limit sin degradar la senal.
- `.codex/skills/greenhouse-browser-diagnostics/`
  - agrega hook operativo para futuros diagnosticos de rutas con usuario agente + Playwright/Chromium.
- `AGENTS.md`, `CLAUDE.md`, `project_context.md`
  - documentan el contrato de browser diagnostics autenticado.

## Verification Executed

- Playwright/Chromium authenticated route check: `/admin` HTTP 200.
- `/api/admin/reliability` consultado con sesion agente.
- `pnpm pg:doctor` OK.
- SQL read-only probes para Finance, Delivery/Notion, Identity, Payroll, Release y Sync.
- `gh run list --status waiting` OK, sin waiting runs.
- `pnpm exec eslint src/lib/reliability/get-reliability-overview.ts` OK.
- `pnpm exec tsc --noEmit --pretty false` OK.
- `git diff --check` OK.
- YAML/frontmatter de `.codex/skills/greenhouse-browser-diagnostics` parseado con Ruby/Node. `quick_validate.py` no corrio porque el Python local no tiene `PyYAML`.

## Open Remediation Backlog

| Area | Suggested owner | Next step |
|---|---|---|
| Notion/Delivery upstream hardening | Delivery/Platform | Evitar delete-before-load en `notion-bq-sync` con staging/swap o delete-after-success para que futuros errores de schema no vacíen raw. |
| FTR writeback | Delivery/Ops | Activar flag solo con aprobación de escritura a Notion; mientras esté OFF el signal ya comunica backlog dormido sin marcar lag operativo falso. |
| Finance FX drift | Finance | Remediar `global66-clp` drifts de marzo/abril. |
| Finance unanchored | Finance | Ejecutar acknowledgment/anchoring TASK-934 para 34 items. |
| Identity legal/person drift | Identity/HR | Reconciliar CL_RUT, legal relationships y SCIM user sin member. |
| Payroll PDF metadata | Payroll | Reissue/backfill metadata de PDFs superseded legacy. |
| Release observer | Platform/Release | Mantener GitHub App observer config en staging; monitorear failures reales sin manifest como `unmatched`. |
| Reactive sync | Platform/Data | Resolver failures restantes de aplicación/configuración (HubSpot token/payload, payment SQL drift, payroll receipt insert shape). |

## Follow-up Audit Criteria

Abrir refresh de esta auditoria si ocurre cualquiera de estos casos:

- `/admin` vuelve a mostrar Sentry `HTTP 429` en reliability overview.
- Cambia el contrato de Vercel protection/bypass.
- Se configura Notion/FTR/Release observer en staging.
- Finance TASK-934 o FX drift remediation cambia el inventario.
- Reactive sync replay limpia o reabre failures.
- Identity/Payroll ejecutan backfills que cambian los conteos.
