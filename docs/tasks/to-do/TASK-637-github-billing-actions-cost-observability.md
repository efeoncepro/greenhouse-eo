# TASK-637 — GitHub Billing & Actions Cost Observability in Admin Center

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
- Branch: `task/TASK-637-github-billing-actions-cost-observability`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Greenhouse necesita monitorear GitHub Billing y especialmente GitHub Actions desde `Admin Center` para evitar sorpresas de facturacion por CI/CD, artifacts/cache storage, runners, Packages, Codespaces o productos metered asociados. Esta task agrega una lectura read-only de la API oficial de GitHub Billing Usage, con costo actual, forecast mensual, costo por repo/SKU/producto y guardrails de budget.

## Why This Task Exists

Greenhouse usa GitHub Actions para CI/CD y despliegues de servicios. Si un workflow empieza a correr demasiado, si un artifact/cache crece sin control, si se usan runners cobrables o si un producto metered queda abierto, el costo puede aparecer tarde en billing.

Ya se abrio `TASK-636` para Vercel porque el costo de infraestructura puede dispararse sin visibilidad temprana. GitHub debe entrar al mismo plano operativo: no basta con confiar en emails de budget o revisar GitHub Billing manualmente. Greenhouse debe poder mostrar desde Admin Center si Actions o cualquier SKU GitHub esta consumiendo presupuesto de forma riesgosa.

## Goal

- Exponer en `Admin Center` una lectura institucional del gasto GitHub, enfocada en Actions y productos metered.
- Detectar forecast mensual alto, spikes diarios y repos/SKUs responsables.
- Conectar GitHub Billing como senal `billing` del modulo `cloud` dentro del `Reliability Control Plane`.
- Mantener V1 read-only y API-driven, usando REST API oficial y sin scraping de UI.

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
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- GitHub Billing debe modelarse como costo de plataforma cloud/dev-platform, no como modulo financiero aislado.
- V1 debe consumir la API oficial de GitHub Billing Usage y no scrapear Billing UI, CSVs descargados manualmente ni emails.
- La lectura debe degradar honestamente: `not_configured`, `awaiting_data`, `warning` o `error`; nunca representar ausencia de datos como costo cero sano.
- Access model:
  - `views` / `authorizedViews`: reutilizar Admin Center / Cloud & Integrations; no crear vista nueva salvo que Discovery lo justifique.
  - `entitlements`: tratar la informacion de facturacion como admin/internal-only; no exponer a clientes ni roles no internos.
  - `routeGroups`: debe permanecer bajo `admin`.
  - `startup policy`: sin cambios.
- No introducir persistencia PostgreSQL en V1 salvo hallazgo fuerte de Discovery; si se persiste, actualizar `GREENHOUSE_DATA_MODEL_MASTER_V1.md` primero.
- La configuracion de budgets en GitHub debe quedar documentada como control externo complementario, no como sustituto de la observabilidad Greenhouse.

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/in-progress/TASK-586-notion-sync-billing-observability.md`
- `docs/tasks/complete/TASK-600-reliability-registry-signal-foundation.md`
- `docs/tasks/to-do/TASK-636-vercel-billing-focus-observability.md`
- `docs/documentation/operations/postura-cloud-gcp.md`

Referencias externas verificadas el `2026-04-25`:

- GitHub Billing Usage REST API: `https://docs.github.com/en/rest/billing/usage`
- GitHub Actions billing: `https://docs.github.com/en/billing/concepts/product-billing/github-actions`
- GitHub budgets and alerts: `https://docs.github.com/en/billing/how-tos/set-up-budgets`
- GitHub billing reports reference: `https://docs.github.com/en/billing/reference/billing-reports`

## Dependencies & Impact

### Depends on

- `TASK-586` — fija el patron actual de GCP Billing Export, `Cloud & Integrations`, `Ops Health` y reliability adapters.
- `TASK-636` — sibling de Vercel Billing; debe coordinar naming/types para evitar dos modelos divergentes de provider billing.
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

- Observabilidad operativa de costo GitHub/Actions en `Admin Center`.
- Senal `cloud.billing.github` dentro del Reliability Control Plane.
- FinOps multi-provider junto con GCP y Vercel.
- Decision operativa de budgets GitHub para Actions y productos metered.

### Files owned

- `docs/tasks/to-do/TASK-637-github-billing-actions-cost-observability.md`
- `src/lib/cloud/github-billing.ts`
- `src/lib/cloud/github-billing.test.ts`
- `src/types/github-billing.ts`
- `src/app/api/admin/cloud/github-billing/route.ts`
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
- `TASK-586` esta definiendo el patron de GCP Billing Export en Admin Center.
- `TASK-636` define el carril equivalente para Vercel Billing.
- El repo usa GitHub Actions para CI/CD y despliegues de workers/servicios.
- GitHub provee REST API oficial para usage y usage summary por organizacion/usuario.

### Gap

- Greenhouse no lee ni muestra GitHub Billing.
- No existe reader para GitHub Billing Usage REST API.
- No hay forecast mensual ni spike detection para Actions/GitHub.
- No hay costo por repo/SKU/producto visible en Admin Center.
- No hay variables documentadas para token/org GitHub de billing read-only.
- No hay recordatorio operativo dentro del repo para configurar budgets GitHub con alerts o stop-usage.

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

### Slice 1 — GitHub Billing reader

- Crear tipos canonicos para la lectura GitHub, compatibles conceptualmente con los readers GCP/Vercel.
- Crear `src/lib/cloud/github-billing.ts` con:
  - auth bearer desde `GREENHOUSE_GITHUB_BILLING_TOKEN` o `GREENHOUSE_GITHUB_BILLING_TOKEN_SECRET_REF`
  - org desde `GREENHOUSE_GITHUB_BILLING_ORG`
  - request a:
    - `GET https://api.github.com/organizations/{org}/settings/billing/usage`
    - `GET https://api.github.com/organizations/{org}/settings/billing/usage/summary`
  - header `X-GitHub-Api-Version` documentado, default `2026-03-10` o version vigente confirmada en Discovery
  - filtros `year`, `month`, `day`, `repository`, `product`, `sku`
  - agregados por dia, producto, SKU y repo
  - cache server-side corta similar al reader GCP
  - degradacion honesta cuando falten token/org/permisos o datos

### Slice 2 — Actions cost guardrails y forecast

- Calcular:
  - total del periodo observado
  - net amount vs gross amount
  - cantidad de minutes/units por SKU
  - forecast mensual simple
  - max day cost
  - top repository
  - top SKU/producto
  - variacion vs ventana anterior equivalente cuando el rango lo permita
- Agregar thresholds configurables por env:
  - `GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD`
  - `GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD`
  - `GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT`
- Si no hay thresholds configurados, rendir el estado como `configured` pero sin severity de budget; no inventar limites.

### Slice 3 — Admin API

- Crear `GET /api/admin/cloud/github-billing`.
- Proteger con `requireAdminTenantContext()`.
- Soportar query params seguros:
  - `year`
  - `month`
  - `day`
  - `repository`
  - `product`
  - `sku`
  - `refresh=true`
- Responder JSON estable y testeable, no proxy crudo del API externo.

### Slice 4 — Reliability Control Plane

- Agregar adapter en `src/lib/reliability/signals.ts`:
  - signal id `cloud.billing.github`
  - module `cloud`
  - kind `billing`
  - severity:
    - `not_configured` si falta token/org
    - `awaiting_data` si GitHub responde sin usage
    - `warning` si forecast/spike cruza warn
    - `error` si forecast/spike cruza critical o API falla de forma operacional
    - `ok` si hay datos y no cruza thresholds
- Conectar el source en `getReliabilityOverview()` sin duplicar fetches innecesarios.
- No redefinir el contrato de `TASK-600`.

### Slice 5 — UI en Cloud & Integrations / Ops Health

- En `Cloud & Integrations`, agregar una seccion compacta para GitHub:
  - estado de configuracion
  - costo periodo actual
  - forecast mensual
  - top repo
  - top SKU/producto
  - uso por dia
  - costo por repo/SKU/producto
- En `Ops Health`, elevar solo lo accionable:
  - API billing no configurada
  - API billing fallando
  - forecast critical
  - daily spike relevante
- Mantener la UI como monitoring operativo, no como BI ilimitado.

### Slice 6 — Budget posture y docs

- Documentar setup manual recomendado de GitHub Budgets:
  - budget para producto `Actions`
  - scope org `efeoncepro` o repo `greenhouse-eo`
  - alerts 75/90/100
  - evaluar `Stop usage when budget limit is reached`
- Actualizar `.env.example` con variables GitHub Billing.
- Actualizar `project_context.md` con el contrato nuevo.
- Actualizar `changelog.md` por cambio visible en Admin Center.
- Actualizar documentacion funcional:
  - extender `docs/documentation/operations/postura-cloud-gcp.md` hacia postura cloud/costos multi-provider, o
  - crear un doc nuevo si Discovery concluye que mezclar GCP + Vercel + GitHub vuelve confuso el documento actual.

## Out of Scope

- Scraping de GitHub Billing UI.
- Automatizar creacion/edicion de budgets de GitHub desde Greenhouse.
- Persistir usage GitHub en PostgreSQL en V1.
- Costeo detallado por `workflow_path` si la API REST no lo expone.
- Reescribir workflows para optimizar minutos de Actions.
- Alertas Slack/email proactivas fuera del portal, salvo que se deje como follow-up.

## Detailed Spec

### API externa GitHub

Contrato confirmado al `2026-04-25`:

- `GET https://api.github.com/organizations/{org}/settings/billing/usage`
- `GET https://api.github.com/organizations/{org}/settings/billing/usage/summary`
- Auth: `Authorization: Bearer <token>`
- Headers:
  - `Accept: application/vnd.github+json`
  - `X-GitHub-Api-Version: 2026-03-10` o version vigente confirmada en Discovery
- Query:
  - `year`
  - `month`
  - `day`
  - `repository`
  - `product`
  - `sku`

Campos relevantes:

- `date`
- `product`
- `sku`
- `quantity`
- `unitType`
- `pricePerUnit`
- `grossAmount`
- `discountAmount`
- `netAmount`
- `repositoryName`
- `organizationName`

Limitacion importante:

- GitHub documenta que el reporte detallado con `workflow_path` existe en Billing UI/reportes, pero no esta disponible por el endpoint REST `/usage`. V1 no debe prometer costo por workflow si el endpoint no lo entrega.

### Shape interno sugerido

El agente puede ajustar nombres durante Discovery, pero debe preservar estas capacidades:

```ts
type GitHubBillingAvailability =
  | 'configured'
  | 'awaiting_data'
  | 'not_configured'
  | 'error'

interface GitHubBillingOverview {
  availability: GitHubBillingAvailability
  generatedAt: string
  period: { year: number; month: number | null; day: number | null }
  totalGrossAmount: number
  totalDiscountAmount: number
  totalNetAmount: number
  currency: 'USD' | string
  forecast: {
    monthlyNetAmount: number | null
    thresholdStatus: 'ok' | 'warning' | 'critical' | 'unconfigured'
  }
  daily: Array<{ date: string; grossAmount: number; netAmount: number }>
  byProduct: Array<{ product: string; grossAmount: number; netAmount: number }>
  bySku: Array<{ sku: string; unitType: string; quantity: number; grossAmount: number; netAmount: number }>
  byRepository: Array<{ repositoryName: string; grossAmount: number; netAmount: number }>
  actions: {
    netAmount: number
    grossAmount: number
    minutes: number | null
    topSku: string | null
    topRepository: string | null
  }
  guardrails: {
    monthlyWarnUsd: number | null
    monthlyCriticalUsd: number | null
    dailySpikePct: number | null
    spikeDetected: boolean
    spikeSummary: string | null
  }
  source: {
    provider: 'github'
    org: string | null
    endpoint: '/organizations/{org}/settings/billing/usage'
  }
  notes: string[]
  error: string | null
}
```

### Security / access

- Token GitHub debe ser server-only.
- Usar token con permiso minimo suficiente para billing usage. La doc externa indica que los endpoints requieren permisos de plan/billing read segun tipo de token y rol de la cuenta; Discovery debe confirmar el tipo real disponible.
- No exponer token, raw headers ni payloads sensibles en UI/logs.
- UI y API quedan bajo `admin`; no exponer esta lectura en portal cliente.

### Monitoring semantics

- `forecast.warning`: el gasto proyectado supera `GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD`.
- `forecast.critical`: supera `GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD`.
- `daily_spike`: el costo de un dia supera el promedio de la ventana anterior por `GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT`.
- Si no hay baseline suficiente, rendir `awaiting_data` o summary explicito, no alerta falsa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe reader server-side para GitHub Billing Usage con tests unitarios de parsing/agregacion.
- [ ] Existe `GET /api/admin/cloud/github-billing` protegido por admin tenant context.
- [ ] La UI admin muestra costo GitHub/Actions, forecast, top repo, top SKU/producto y estado de configuracion.
- [ ] Reliability expone una senal `cloud.billing.github` con severidad basada en configuracion, API health y thresholds.
- [ ] La ausencia de token/org o datos no se representa como gasto cero sano.
- [ ] `.env.example`, `project_context.md`, `changelog.md` y documentacion funcional quedan actualizados.
- [ ] La task documenta claramente que V1 no promete costo por workflow si REST API no entrega `workflow_path`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test -- src/lib/cloud/github-billing.test.ts`
- `pnpm test -- src/lib/reliability`
- Smoke manual con token real en ambiente seguro:
  - request directo a GitHub Billing Usage API
  - request autenticado a `/api/admin/cloud/github-billing`
- Validacion visual/manual de `Cloud & Integrations` y `Ops Health` si se modifica UI.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] se reviso que `TASK-586` y `TASK-636` no tengan conflictos de ownership en archivos de reliability/admin billing
- [ ] si se agregaron env vars, quedaron documentadas con proposito, entornos y formato

## Follow-ups

- Alertas proactivas Slack/email/in-app por threshold critical.
- Correlacion de spikes GitHub con workflows/runs especificos usando APIs de Actions si REST Billing no entrega workflow-level detail.
- Limpieza/retention de artifacts y caches si el usage muestra storage alto.
- Budget compliance runbook para GitHub Actions y productos metered.

## Open Questions

- Definir los thresholds iniciales concretos para `warn` y `critical` segun presupuesto operativo real.
- Confirmar si el billing scope canonico es org `efeoncepro`, usuario, enterprise o una combinacion.
- Confirmar si el token disponible tiene permisos de billing/plan read suficientes sin elevarlo a owner innecesariamente.
