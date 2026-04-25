# TASK-636 — Vercel Billing FOCUS Cost Observability in Admin Center

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-586`
- Branch: `task/TASK-636-vercel-billing-focus-observability`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Greenhouse necesita monitorear el gasto de Vercel desde `Admin Center` con la misma disciplina operativa que ya se esta construyendo para GCP Billing Export. Esta task agrega una lectura read-only de la API oficial de Vercel Billing FOCUS, con costo actual, forecast mensual, spikes diarios, desglose por servicio/proyecto y senales de confiabilidad para evitar sorpresas de facturacion.

## Why This Task Exists

Ya ocurrio un incidente operativo donde el costo de Vercel subio demasiado por no revisar la factura a tiempo. El problema no es solo contable: Vercel es parte critica del runtime de Greenhouse y sus costos pueden dispararse por trafico, funciones, edge/network, previews, observability, storage o cambios de pricing.

Hoy Greenhouse esta empezando a observar GCP desde `TASK-586`, pero Vercel sigue fuera del plano operativo. Eso deja una brecha: el equipo puede ver health cloud y costo GCP en el portal, pero no detectar a tiempo que Vercel esta acumulando gasto anomalo antes de la invoice.

## Goal

- Exponer en `Admin Center` una lectura institucional del gasto Vercel, comparable a la lectura GCP.
- Detectar antes de la invoice: forecast mensual alto, spikes diarios y servicios/proyectos responsables.
- Conectar Vercel Billing al `Reliability Control Plane` como senal `billing` del modulo `cloud`.
- Mantener V1 read-only y API-driven, sin persistencia propia hasta validar el shape real de uso.

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
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Vercel Billing debe modelarse como senal de plataforma cloud, no como modulo financiero aislado.
- V1 debe consumir la API oficial de Vercel Billing (`/v1/billing/charges`) y no scrapear dashboard, invoices ni HTML.
- La lectura debe degradar honestamente: `not_configured`, `awaiting_data`, `warning` o `error`; nunca representar ausencia de datos como costo cero sano.
- No agregar `@vercel/sdk` salvo decision explicita en Discovery; preferir `fetch` server-side para evitar dependencia nueva si el contrato JSONL es simple.
- Access model:
  - `views` / `authorizedViews`: reutilizar la surface existente de Admin Center / Cloud & Integrations; no crear vista nueva salvo que Discovery lo justifique.
  - `entitlements`: tratar la informacion de facturacion como admin/internal-only; no exponer a clientes ni roles no internos.
  - `routeGroups`: debe permanecer bajo `admin`.
  - `startup policy`: sin cambios.
- Si se decide persistir datos en PostgreSQL, actualizar primero `GREENHOUSE_DATA_MODEL_MASTER_V1.md` y declarar anchor, schema y ownership. La intencion V1 es no persistir.
- No tocar variables de Vercel manualmente sin documentar nombre, proposito, entornos y formato.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/in-progress/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/complete/TASK-600-reliability-registry-signal-foundation.md`
- `docs/documentation/operations/postura-cloud-gcp.md`

Referencias externas verificadas el `2026-04-25`:

- Vercel changelog — Billing usage/cost API: `https://vercel.com/changelog/access-billing-usage-cost-data-api`
- Vercel API — List FOCUS billing charges: `https://docs.vercel.com/docs/rest-api/reference/endpoints/billing/list-focus-billing-charges`
- Vercel API — List FOCUS contract commitments: `https://docs.vercel.com/docs/rest-api/reference/endpoints/billing/list-focus-contract-commitments`
- Vercel CLI — `vercel usage`: `https://vercel.com/docs/cli/usage`
- Vercel REST API auth: `https://vercel.com/docs/rest-api`

## Dependencies & Impact

### Depends on

- `TASK-586` — fija el patron actual de GCP Billing Export, `Cloud & Integrations`, `Ops Health` y reliability adapters.
- `src/lib/reliability/get-reliability-overview.ts`
- `src/lib/reliability/signals.ts`
- `src/lib/reliability/registry.ts`
- `src/types/reliability.ts`
- `src/app/api/admin/cloud/gcp-billing/route.ts`
- `src/lib/cloud/gcp-billing.ts`
- `src/types/billing-export.ts`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
- `src/app/api/admin/reliability/route.ts`

### Blocks / Impacts

- Observabilidad operativa de costo Vercel en `Admin Center`.
- Senal `cloud.billing` dentro de Reliability Control Plane.
- Futuro FinOps multi-cloud dentro de Greenhouse.
- Posible follow-up de alertas proactivas por Slack/email si el equipo quiere notificaciones fuera del portal.

### Files owned

- `docs/tasks/to-do/TASK-636-vercel-billing-focus-observability.md`
- `src/lib/cloud/vercel-billing.ts`
- `src/lib/cloud/vercel-billing.test.ts`
- `src/types/vercel-billing.ts`
- `src/app/api/admin/cloud/vercel-billing/route.ts`
- `src/lib/reliability/signals.ts`
- `src/lib/reliability/get-reliability-overview.ts`
- `src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `.env.example`
- `project_context.md`
- `Handoff.md`
- `changelog.md`
- `docs/documentation/operations/postura-cloud-gcp.md` o nuevo doc operativo de costos cloud si Discovery lo prefiere

## Current Repo State

### Already exists

- `TASK-600` ya entrego el `Reliability Control Plane V1` con `billing` como kind valido.
- `TASK-586` esta en progreso y ya agrego una primera capa para GCP Billing Export:
  - `src/lib/cloud/gcp-billing.ts`
  - `src/app/api/admin/cloud/gcp-billing/route.ts`
  - `src/types/billing-export.ts`
  - adapters `buildGcpBillingSignals` en `src/lib/reliability/signals.ts`
- `Admin Center`, `Cloud & Integrations` y `Ops Health` ya existen como surfaces admin.
- El repo ya tiene reglas operativas fuertes para Vercel, deployment protection, proyecto unico y variables por ambiente.

### Gap

- Greenhouse no lee ni muestra Vercel Billing.
- No existe reader para `/v1/billing/charges` ni parser JSONL FOCUS.
- No hay forecast mensual ni spike detection para Vercel.
- No hay umbrales warning/critical para costo Vercel dentro del Reliability Control Plane.
- No hay variables documentadas para token/team Vercel de billing read-only.

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

### Slice 1 — Vercel Billing reader

- Crear tipos canonicos para la lectura Vercel, separados de GCP pero compatibles conceptualmente con `BillingExportAvailability`.
- Crear `src/lib/cloud/vercel-billing.ts` con:
  - auth bearer desde `GREENHOUSE_VERCEL_API_TOKEN` o `GREENHOUSE_VERCEL_API_TOKEN_SECRET_REF`
  - `teamId` o `slug` desde env
  - request a `GET https://api.vercel.com/v1/billing/charges`
  - parser de JSONL
  - agregados por dia, servicio, categoria y proyecto (`Tags.ProjectId` / `Tags.ProjectName` cuando exista)
  - manejo de `from`/`to` UTC, con default de mes corriente o ultimos 30 dias segun Discovery
  - cache server-side corta similar al reader GCP
  - degradacion honesta cuando falten token/team, permisos o datos
- Evitar SDK nuevo salvo que Discovery demuestre que reduce riesgo real.

### Slice 2 — Cost guardrails y forecast

- Calcular:
  - total del periodo observado
  - costo diario promedio
  - forecast mensual simple
  - max day cost
  - top service
  - top project
  - variacion vs ventana anterior equivalente cuando el rango lo permita
- Agregar thresholds configurables por env:
  - `GREENHOUSE_VERCEL_BILLING_MONTHLY_WARN_USD`
  - `GREENHOUSE_VERCEL_BILLING_MONTHLY_CRITICAL_USD`
  - `GREENHOUSE_VERCEL_BILLING_DAILY_SPIKE_PCT`
- Si no hay thresholds configurados, rendir el estado como `configured` pero sin severity de budget; no inventar limites.

### Slice 3 — Admin API

- Crear `GET /api/admin/cloud/vercel-billing`.
- Proteger con `requireAdminTenantContext()`.
- Soportar query params seguros:
  - `from`
  - `to`
  - `days`
  - `refresh=true`
- Limitar rango maximo a 366 dias por contrato de Vercel y usar defaults conservadores para UI.
- Responder JSON estable y testeable, no proxy crudo del API externo.

### Slice 4 — Reliability Control Plane

- Agregar adapter en `src/lib/reliability/signals.ts`:
  - signal id `cloud.billing.vercel`
  - module `cloud`
  - kind `billing`
  - severity:
    - `not_configured` si falta token/team
    - `awaiting_data` si Vercel responde sin cargos
    - `warning` si forecast/spike cruza warn
    - `error` si forecast/spike cruza critical o API falla de forma operacional
    - `ok` si hay datos y no cruza thresholds
- Conectar el source en `getReliabilityOverview()` sin duplicar fetches innecesarios.
- Actualizar boundaries/notas si corresponde, sin redefinir el contrato de `TASK-600`.

### Slice 5 — UI en Cloud & Integrations / Ops Health

- En `Cloud & Integrations`, agregar una seccion compacta para Vercel:
  - estado de configuracion
  - costo periodo actual
  - forecast mensual
  - top service
  - top project
  - costo por dia
  - costo por servicio/proyecto
- En `Ops Health`, elevar solo lo accionable:
  - API billing no configurada
  - API billing fallando
  - forecast critical
  - daily spike relevante
- Mantener la UI como monitoring operativo, no como BI ilimitado.

### Slice 6 — Docs, env y runbook

- Actualizar `.env.example` con variables Vercel Billing.
- Actualizar `project_context.md` con el contrato nuevo.
- Actualizar `changelog.md` por cambio visible en Admin Center.
- Actualizar documentacion funcional:
  - extender `docs/documentation/operations/postura-cloud-gcp.md` hacia postura cloud/costos multi-provider, o
  - crear un doc nuevo si Discovery concluye que mezclar GCP + Vercel vuelve confuso el documento actual.
- Documentar el smoke manual:
  - `vercel usage --format json` como verificacion rapida
  - request a `/api/admin/cloud/vercel-billing` como verificacion runtime Greenhouse

## Out of Scope

- Scraping de invoices, dashboard de Vercel o emails de facturacion.
- Persistir cargos Vercel en PostgreSQL en V1.
- Automatizar compras, cambios de plan, upgrades/downgrades o limites dentro de Vercel.
- Alertas Slack/email proactivas fuera del portal, salvo que el agente encuentre un hook ya trivial y lo documente como follow-up.
- Reemplazar la invoice oficial de Vercel como fuente contable.
- Reabrir `TASK-586` ni refactorizar GCP Billing Export fuera de lo necesario para compartir componentes pequenos.

## Detailed Spec

### API externa Vercel

Contrato confirmado al `2026-04-25`:

- `GET https://api.vercel.com/v1/billing/charges`
- Auth: `Authorization: Bearer <token>`
- Query:
  - `from`: ISO 8601 UTC inclusive
  - `to`: ISO 8601 UTC exclusive
  - `teamId` o `slug`
- Response:
  - `application/jsonl`
  - formato `FOCUS v1.3`
  - 1-day granularity
  - max range: 1 year

Campos FOCUS relevantes:

- `BilledCost`
- `EffectiveCost`
- `BillingCurrency`
- `ChargeCategory`
- `ChargePeriodStart`
- `ChargePeriodEnd`
- `ConsumedQuantity`
- `ConsumedUnit`
- `ServiceName`
- `ServiceProviderName`
- `ServiceCategory`
- `PricingCategory`
- `Tags.ProjectId`
- `Tags.ProjectName`

Endpoint complementario:

- `GET /v1/billing/contract-commitments`
- V1 puede leerlo solo si ayuda a mostrar commitments; si no, dejarlo como follow-up.

### Shape interno sugerido

El agente puede ajustar nombres durante Discovery, pero debe preservar estas capacidades:

```ts
type VercelBillingAvailability =
  | 'configured'
  | 'awaiting_data'
  | 'not_configured'
  | 'error'

interface VercelBillingOverview {
  availability: VercelBillingAvailability
  generatedAt: string
  period: { from: string; to: string; days: number }
  totalBilledCost: number
  totalEffectiveCost: number
  currency: 'USD' | string
  forecast: {
    monthlyBilledCost: number | null
    monthlyEffectiveCost: number | null
    thresholdStatus: 'ok' | 'warning' | 'critical' | 'unconfigured'
  }
  daily: Array<{ date: string; billedCost: number; effectiveCost: number }>
  byService: Array<{ serviceName: string; billedCost: number; effectiveCost: number }>
  byProject: Array<{ projectId: string | null; projectName: string; billedCost: number; effectiveCost: number }>
  guardrails: {
    monthlyWarnUsd: number | null
    monthlyCriticalUsd: number | null
    dailySpikePct: number | null
    spikeDetected: boolean
    spikeSummary: string | null
  }
  source: {
    provider: 'vercel'
    teamId: string | null
    teamSlug: string | null
    endpoint: '/v1/billing/charges'
  }
  notes: string[]
  error: string | null
}
```

### Security / access

- Token Vercel debe ser server-only.
- No exponer raw token, raw request URL con secrets ni headers en UI/logs.
- Preferir Secret Manager ref si el ambiente ya opera con ese patron.
- Documentar los permisos esperados del token: acceso de billing/usage para el team Vercel correspondiente.
- UI y API deben quedar bajo `admin`; no exponer esta lectura en portal cliente.

### Monitoring semantics

El objetivo no es solo ver la factura, sino detectar riesgo temprano:

- `forecast.warning`: el gasto proyectado supera `GREENHOUSE_VERCEL_BILLING_MONTHLY_WARN_USD`.
- `forecast.critical`: supera `GREENHOUSE_VERCEL_BILLING_MONTHLY_CRITICAL_USD`.
- `daily_spike`: el costo de un dia supera el promedio de la ventana anterior por `GREENHOUSE_VERCEL_BILLING_DAILY_SPIKE_PCT`.
- Si no hay baseline suficiente, rendir `awaiting_data` o summary explicito, no alerta falsa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe reader server-side para Vercel Billing FOCUS JSONL con tests unitarios de parsing/agregacion.
- [ ] Existe `GET /api/admin/cloud/vercel-billing` protegido por admin tenant context.
- [ ] La UI admin muestra costo Vercel, forecast, top service/proyecto y estado de configuracion.
- [ ] Reliability expone una senal `cloud.billing.vercel` con severidad basada en configuracion, API health y thresholds.
- [ ] La ausencia de token/team o datos no se representa como gasto cero sano.
- [ ] `.env.example`, `project_context.md`, `changelog.md` y documentacion funcional quedan actualizados.
- [ ] La task documenta claramente si V1 sigue read-only o si Discovery justifico persistencia.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/cloud/vercel-billing.test.ts`
- `pnpm test -- src/lib/reliability`
- Smoke manual con token real en ambiente seguro:
  - `vercel usage --format json`
  - request autenticado a `/api/admin/cloud/vercel-billing`
- Validacion visual/manual de `Cloud & Integrations` y `Ops Health` si se modifica UI.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se reviso que `TASK-586` no tenga conflictos de ownership en archivos de reliability/admin billing
- [ ] si se agregaron env vars, quedaron documentadas con proposito, entornos y formato

## Follow-ups

- Persistencia historica de cargos Vercel en PostgreSQL si se requiere auditoria interna o dashboards de largo plazo.
- Alertas proactivas Slack/email/in-app por threshold critical.
- Correlacion de spikes Vercel con deploys, PRs, rutas calientes o Sentry incidents.
- Integracion de contract commitments si el plan Vercel del team entrega datos utiles.

## Open Questions

- Definir los thresholds iniciales concretos para `warn` y `critical` segun presupuesto operativo real.
- Confirmar si el team Vercel canónico se identifica mejor por `teamId` o `slug` en los ambientes de Greenhouse.
- Confirmar si el token Vercel disponible tiene permisos de Billing/Usage suficientes sin elevarlo a owner innecesariamente.
