# TASK-769 — Cloud Cost Intelligence + AI FinOps Copilot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-769-cloud-cost-intelligence-ai-finops-copilot`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Greenhouse ya puede leer `Billing Export`, pero hoy solo muestra costo cloud base y una señal informativa en Reliability. Esta task convierte esa foundation en una capacidad operativa real: drill-down por recurso, detección temprana de spikes, alertas accionables y una capa AI grounded que interprete el gasto, explique los drivers más probables y sugiera dónde atacar primero para bajar costo.

## Why This Task Exists

El gap ya no es "tener datos", sino volverlos legibles y accionables sin depender de GCP Console. Al 2026-05-03 el dataset `billing_export` ya materializó filas reales (`gcp_billing_export_v1*`, `gcp_billing_export_resource_v1*`, `cloud_pricing_export`), pero Greenhouse sigue con un V1 deliberadamente acotado:

- muestra costo global y top servicios, pero no baja a recurso real
- no detecta spikes per-service ni deriva severidades por threshold
- no explica por qué subieron Cloud SQL, Cloud Run, Vertex AI u otros servicios
- no entrega recomendaciones priorizadas de ahorro dentro del portal
- no alerta por Teams/Slack cuando el costo empieza a desviarse del baseline

El usuario hoy ve un aumento de `0 -> ~93 mil CLP` y una proyección de `~135 mil CLP`, pero Greenhouse todavía no puede responder dentro del propio portal: "qué se disparó", "por qué", "qué revisar primero" y "qué acción concreta debería tomar". Esa brecha ya no es de datos; es de inteligencia operativa.

## Goal

- Exponer en Greenhouse un control plane de costo cloud con breakdown por servicio y por recurso real.
- Detectar gasto anómalo con reglas determinísticas auditables antes de que la factura sorprenda.
- Agregar una capa AI grounded que interprete los costos, priorice drivers y proponga acciones concretas de optimización sin reemplazar reglas determinísticas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- La capa determinística decide detección y severidad; la IA solo interpreta, prioriza y recomienda.
- `Billing Export` y `gcp_billing_export_resource_v1*` son read-only; no se muta ni se reconfigura el dataset desde esta task.
- Si una explicación AI no puede anclarse a evidencia concreta (`service`, `resource`, `delta`, `period`), debe degradar honestamente y declarar incertidumbre.
- La task debe pensar dos planos explícitos:
  - `views` / surface visible en `Admin Center`
  - `signals` / `reliability` / notificaciones para alertas tempranas
- La capa AI debe reusar guardrails del patrón `TASK-638`: sanitización, dedupe, kill-switch, JSON estricto y no-feedback-loop.

## Normative Docs

- `docs/tasks/complete/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/complete/TASK-638-reliability-ai-observer.md`
- `docs/tasks/in-progress/TASK-103-gcp-budget-alerts-bigquery-guards.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/complete/TASK-638-reliability-ai-observer.md`
- `docs/tasks/in-progress/TASK-103-gcp-budget-alerts-bigquery-guards.md`
- `src/lib/cloud/gcp-billing.ts`
- `src/types/billing-export.ts`
- `src/lib/reliability/signals.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/reliability/ai/*`
- `services/ops-worker/server.ts`

### Blocks / Impacts

- `TASK-103` — deja de depender solo de GCP Console para visibilidad y se complementa con alertas portal-first
- `TASK-636` / `TASK-637` — fija el patrón canónico multi-provider de FinOps para Vercel/GitHub
- `Admin Center` (`/admin`, `/admin/integrations`, `/admin/ops-health`)
- futuras lanes de budgets, runbooks cloud y alertas multi-canal

### Files owned

- `src/types/billing-export.ts`
- `src/lib/cloud/gcp-billing.ts`
- `src/app/api/admin/cloud/gcp-billing/route.ts`
- `src/components/greenhouse/admin/GcpBillingCard.tsx`
- `src/components/greenhouse/admin/ReliabilityAiWatcherCard.tsx`
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
- `src/lib/reliability/signals.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/reliability/ai/*`
- `services/ops-worker/server.ts`
- `services/ops-worker/README.md`
- `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

## Current Repo State

### Already exists

- Reader canónico V1 de Billing Export en `src/lib/cloud/gcp-billing.ts`
- API read-only `GET /api/admin/cloud/gcp-billing` en `src/app/api/admin/cloud/gcp-billing/route.ts`
- Card operativa `GcpBillingCard` en `src/components/greenhouse/admin/GcpBillingCard.tsx`
- Wiring en `AdminIntegrationGovernanceView` y `Ops Health`
- señal `cloud.billing.gcp_export` en `src/lib/reliability/signals.ts`
- patrón AI grounded con persistencia, sanitización y runner en `src/lib/reliability/ai/*` + `services/ops-worker/server.ts`

### Gap

- `GcpBillingOverview` no expone drill-down por recurso, forecast ni baselines comparativos
- la señal billing no escala a `warning/error` por spikes o share anómalo
- no existe una vista canónica que responda "qué servicio/recurso explicó la subida"
- no existe resumen AI específico de costo cloud ni recomendaciones de optimización
- no existe ruta de alertas tempranas portal-first para spikes de costo cloud

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Billing V2 contracts + resource-aware readers

- extender `src/types/billing-export.ts` con contratos V2 para:
  - servicio con deltas/baseline
  - recurso/label/instance attribution
  - forecast/projection
  - drivers explicables
- extender `src/lib/cloud/gcp-billing.ts` para leer:
  - `gcp_billing_export_v1*`
  - `gcp_billing_export_resource_v1*`
  - `cloud_pricing_export` cuando aporte contexto útil de pricing/SKU
- componer overview V2 reusable por API, UI, reliability y AI sin romper el consumer V1 durante la transición

### Slice 2 — Admin Center surface: Cloud Cost Intelligence

- evolucionar `GcpBillingCard` o extraer una nueva surface shared dentro de `src/components/greenhouse/admin/`
- mostrar:
  - total 7d / 30d
  - variación vs baseline
  - top servicios
  - top recursos/drivers
  - forecast mensual/proyección explicable
- mantener `/admin/integrations` como surface principal y `/admin/ops-health` como surface compacta incidente-style

### Slice 3 — Deterministic spike detection + Reliability signals

- crear reglas auditables por servicio para:
  - `day_over_day_growth`
  - `share_of_total`
  - `7d_vs_30d_baseline`
  - `forecast_month_end`
- mapear severidad real (`ok` / `warning` / `error`) en `src/lib/reliability/signals.ts`
- agregar evidencia concreta por signal: servicio, delta, recurso top, período, threshold gatillado
- integrar estos signals en `get-reliability-overview` sin degradar las señales billing existentes

### Slice 4 — AI FinOps Copilot grounded en ops-worker

- crear reader/prompt/persist/adapter específicos para costo cloud reusando el patrón `TASK-638`
- hostear la corrida AI en `services/ops-worker/server.ts`, no en Vercel cron
- exigir output JSON estricto con:
  - `executive_summary`
  - `top_cost_drivers`
  - `probable_causes`
  - `attack_priority`
  - `recommended_actions`
  - `confidence`
  - `missing_telemetry`
- persistir observaciones deduplicadas bajo `greenhouse_ai` con kill-switch explícito

### Slice 5 — Alert routing + runbooks accionables

- enviar alertas tempranas a canal operativo existente (`Teams` o `Slack`) cuando un signal cloud-cost cambie a `warning/error`
- incluir evidencia suficiente para actuar sin abrir GCP Console primero
- documentar runbooks por categoría:
  - Cloud SQL
  - Cloud Run
  - Vertex AI / Gemini
  - Artifact Registry
  - Secret Manager / otros servicios recurrentes si emergen como drivers reales

## Out of Scope

- auto-remediación destructiva de recursos GCP
- reemplazar GCP Billing Console como fuente oficial de facturación
- FinOps multi-cloud completo (`Vercel`, `GitHub`, `Azure`) en esta misma lane
- explicación AI sin evidencia estructurada o basada solo en intuición del modelo
- costo near-real-time sub-minuto: `Billing Export` sigue teniendo latencia natural y debe complementarse, no fingirse real-time

## Detailed Spec

La arquitectura debe separar explícitamente tres capas:

1. **Costo observado** — facts determinísticos desde `billing_export` y `resource export`
2. **Costo alertado** — reglas auditables que derivan severidad y evidence
3. **Costo interpretado** — IA grounded que explica y prioriza, pero nunca reemplaza la detección

### Contrato mínimo V2 esperado

- `overview.totalCost`
- `overview.forecast.monthEnd`
- `overview.costByService[]` con `baseline7d`, `baseline30d`, `deltaPercent`, `share`, `topResources[]`
- `overview.topDrivers[]`
- `overview.notes[]`
- `overview.source.latestUsageDate`

### Rules-first

Las alertas deben salir aunque la IA esté apagada o falle. La IA:

- no cambia severidades
- no inventa recursos
- no propone ahorro sin evidence path
- puede declarar incertidumbre (`missing_telemetry`) cuando falten labels, instance names o attribution granular

### Grounding mínimo por servicio

- **Cloud SQL**: instance, región, SKU/tier si está disponible, storage/CPU billing driver cuando se pueda inferir
- **Cloud Run**: service, revision y labels canónicos cuando existan
- **Vertex AI / Gemini**: modelo, family o service bucket si está presente en export
- **Artifact Registry**: repositorios/almacenamiento/egress cuando el export lo permita

### Persistencia AI

La persistencia puede seguir el patrón de `greenhouse_ai.reliability_ai_observations`, pero separada de ella. Si durante Discovery emerge que conviene reutilizar la misma tabla con `scope='cloud_cost'`, documentar la decisión antes de implementar.

### Ownership split

- `TASK-103` sigue dueña de budgets/thresholds manuales en GCP Billing Console
- `TASK-769` es dueña de la experiencia portal-first, drill-down, signals, interpretación AI y alert routing sobre esos datos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Admin Center` muestra costo cloud con breakdown por servicio y por recurso usando datos reales de Billing Export materializado
- [ ] existe al menos una señal determinística por spike de costo cloud que pueda escalar a `warning/error` con evidencia concreta
- [ ] la capa AI produce resumen grounded con drivers, causas probables y acciones recomendadas sin modificar severidades determinísticas
- [ ] cuando la IA está desactivada o falla, la experiencia degrada honestamente y las alertas determinísticas siguen funcionando
- [ ] el canal operativo seleccionado (`Teams` o `Slack`) recibe alertas tempranas cuando un servicio cruza threshold relevante
- [ ] la documentación deja explícito qué vive en GCP Console (budgets) y qué vive dentro de Greenhouse (control plane + AI + alert routing)

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en `/admin/integrations` y `/admin/ops-health`
- smoke contra `GET /api/admin/cloud/gcp-billing?days=30`
- smoke de `POST /reliability-ai-watch` o endpoint homólogo del copilot en staging

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md` quedo actualizado a V2 o superseded explícitamente
- [ ] `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` quedo actualizado con los nuevos signals/AI contracts cloud-cost

## Follow-ups

- multi-cloud FinOps convergence con `TASK-636` (Vercel) y `TASK-637` (GitHub)
- budgets bidireccionales portal-first si en el futuro se desea escribir/leer configuración de budget desde Greenhouse
- recomendaciones automáticas de cleanup o resizing con aprobación humana explícita

## Delta 2026-05-03

Task creada a partir del hallazgo operativo posterior a la materialización real de `billing_export`: el dato ya existe, pero Greenhouse aún no puede explicar ni alertar de forma accionable el salto de costo percibido por el usuario.

## Open Questions

- ¿conviene persistir las observaciones AI en tabla nueva (`cloud_cost_ai_observations`) o extender el patrón de `reliability_ai_observations` con `scope` nuevo?
- ¿el canal primario de alerta para V1 será `Teams`, `Slack` o ambos?
- ¿la proyección mensual V1 debe apoyarse solo en `Billing Export` o enriquecerse además con Cloud Monitoring para señales más tempranas en servicios de alta variabilidad?
