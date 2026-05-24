# Cloud Cost Intelligence y Copiloto FinOps

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.2
> **Creado:** 2026-05-03 por Codex
> **Modulo:** operaciones / cloud / FinOps
> **Ruta en portal:** `/admin/integrations`
> **Arquitectura relacionada:** [GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1](../../architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md), [GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1](../../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)
> **Task relacionada:** [TASK-769](../../tasks/complete/TASK-769-cloud-cost-intelligence-ai-finops-copilot.md), [TASK-636](../../tasks/complete/TASK-636-vercel-billing-focus-observability.md), [TASK-637](../../tasks/in-progress/TASK-637-github-billing-actions-cost-observability.md)

## Para que sirve

Cloud Cost Intelligence permite mirar los costos de Google Cloud, Vercel y GitHub Actions desde Greenhouse sin depender de entrar a cada consola para entender lo basico.

La capacidad responde tres preguntas operativas:

- cuanto se esta gastando
- que servicio, recurso o SKU explica el gasto
- que conviene revisar primero para evitar que la cuenta siga subiendo

La capa se apoya en `Billing Export` de Google Cloud hacia BigQuery, en la API oficial de Vercel Billing FOCUS (`/v1/billing/charges`) y en GitHub Billing Usage API para GitHub Actions/productos metered. Greenhouse no reemplaza facturas oficiales ni modifica budgets desde el portal; interpreta datos exportados o leidos por API para hacerlos accionables dentro del flujo operativo.

## Que muestra Greenhouse

En `/admin/integrations`, las tarjetas de costo cloud muestran:

- total del periodo observado
- moneda reportada por Billing Export
- ultimo dia de uso disponible
- forecast mensual explicable
- top servicios por costo
- recursos y SKUs que explican el gasto
- alertas tempranas cuando un driver cruza umbral
- ultima observacion del Copiloto FinOps AI, si existe
- costo Vercel observado, forecast mensual, top servicios/proyectos y spike diario cuando la API Billing FOCUS esta configurada
- costo GitHub Actions observado, forecast mensual, top repo/SKU/producto y spike diario cuando GitHub Billing Usage esta configurado

El dato puede tener latencia natural de Billing Export, del feed FOCUS o de GitHub Billing Usage. Por eso Greenhouse muestra el ultimo dia de uso detectado y no asume que el dia actual esta completo.

## Como se calculan los drivers

La severidad no la decide la IA. La decide la capa deterministica.

Greenhouse calcula drivers con reglas auditables:

- `forecast_risk`: la proyeccion mensual cruza umbral de warning o error.
- `share_of_total`: un servicio concentra una parte excesiva del gasto observado.
- `service_spike`: un servicio sube contra su baseline reciente.
- `resource_driver`: un recurso/SKU puntual explica una parte relevante del gasto.

Cada driver trae evidencia concreta: servicio, recurso, SKU, costo, porcentaje del total, fecha de ultimo uso y threshold aplicado.

## Forecast mensual

El forecast es deterministico y esta pensado para ser conservador:

- si ya existen suficientes dias completos del mes, usa promedio del mes actual
- si el mes recien comenzo, usa una ventana rolling reciente para no subestimar
- si no hay suficientes datos, baja la confianza y lo declara

Esto puede diferir de la proyeccion que muestra GCP Console, porque Google puede usar reglas propietarias o datos internos no expuestos igual en Billing Export. La lectura de Greenhouse debe tratarse como una explicacion operativa y reproducible, no como reemplazo de la factura.

## Vercel Billing FOCUS

Vercel se lee en modo read-only con token API institucional. La V1 no persiste cargos en PostgreSQL y no agrega dependencias nuevas: usa `fetch` server-side contra `/v1/billing/charges`, que retorna JSONL FOCUS v1.3.

Variables runtime:

```text
GREENHOUSE_VERCEL_API_TOKEN_SECRET_REF=greenhouse-vercel-api-token
GREENHOUSE_VERCEL_TEAM_ID=team_gmNiF4YCHmc1wqsHUTCvqjmN
GREENHOUSE_VERCEL_TEAM_SLUG=efeonce-7670142f
GREENHOUSE_VERCEL_BILLING_MONTHLY_WARN_USD=
GREENHOUSE_VERCEL_BILLING_MONTHLY_CRITICAL_USD=
GREENHOUSE_VERCEL_BILLING_DAILY_SPIKE_PCT=
```

`GREENHOUSE_VERCEL_TEAM_ID` es preferido; `GREENHOUSE_VERCEL_TEAM_SLUG` queda como fallback. Si faltan token o team, el portal muestra `not_configured`. Si faltan umbrales, el forecast queda informativo (`unconfigured`) en lugar de inventar un presupuesto sano.

La senal reliability canonical es `cloud.billing.vercel`. Puede quedar:

- `ok`: costo configurado y dentro de umbrales definidos.
- `warning`: forecast o spike cruza warning.
- `error`: token sin permiso, API falla o forecast/spike cruza nivel critico.
- `not_configured`: faltan token/team.
- `awaiting_data`: la API respondio sin cargos para el rango observado.

## GitHub Billing Usage

GitHub se lee en modo read-only con token server-side. La V1 no persiste usage en PostgreSQL y no scrapea la UI de Billing: usa `fetch` server-side contra los endpoints oficiales de GitHub Billing Usage.

Variables runtime:

```text
GREENHOUSE_GITHUB_BILLING_TOKEN_SECRET_REF=
GREENHOUSE_GITHUB_BILLING_ORG=efeoncepro
GREENHOUSE_GITHUB_BILLING_MONTHLY_WARN_USD=
GREENHOUSE_GITHUB_BILLING_MONTHLY_CRITICAL_USD=
GREENHOUSE_GITHUB_ACTIONS_DAILY_SPIKE_PCT=
```

El token recomendado es dedicado y least-privilege, con permiso de organizacion `Administration: read` para el scope que recibe el cobro. `GREENHOUSE_GITHUB_BILLING_TOKEN` existe como fallback local, pero para staging/production se prefiere Secret Manager via `GREENHOUSE_GITHUB_BILLING_TOKEN_SECRET_REF`.

Greenhouse muestra dos montos:

- `grossAmount`: consumo bruto de Actions/SKUs antes de descuentos o cuota incluida.
- `netAmount`: impacto facturable despues de descuentos o cuota incluida.

Esto es importante porque GitHub puede mostrar consumo bruto positivo con `netAmount=0` cuando la cuota incluida absorbe el cargo. En ese caso Greenhouse no debe decir "sin uso"; debe decir "uso cubierto por descuento/cuota".

La senal reliability canonical es `cloud.billing.github`. Puede quedar:

- `ok`: GitHub Billing configurado y dentro de umbrales definidos.
- `warning`: forecast o spike cruza warning.
- `error`: token sin permiso, API falla o forecast/spike cruza nivel critico.
- `not_configured`: faltan token/org.
- `awaiting_data`: la API respondio sin usage items para el periodo observado.

Budgets GitHub siguen siendo un guardrail externo complementario. Si el equipo quiere stop-usage o alertas 75/90/100%, se configuran en GitHub Billing & Licensing; Greenhouse solo observa y reporta.

## Alertas tempranas

Las alertas viven en el `ops-worker`, no en la UI.

El endpoint canonico es:

```text
POST /cloud-cost-ai-watch
```

Ese endpoint ejecuta primero la evaluacion deterministica y luego, si esta activada, la capa AI.

El sweep de alertas:

- usa fingerprint para evitar spam
- respeta cooldown
- envia Teams como canal primario
- usa Slack como fallback si Teams no puede despachar
- soporta `dryRun=true` para smoke checks sin enviar notificaciones ni persistir fingerprints

## Copiloto FinOps AI

El Copiloto FinOps AI interpreta los drivers ya calculados.

Puede producir:

- resumen ejecutivo
- drivers explicados en lenguaje simple
- causas probables
- prioridades de ataque
- acciones recomendadas
- telemetria faltante
- nivel de confianza

La IA no cambia severidad, no dispara alertas por si sola y no inventa metricas. Si falta evidencia, debe declarar incertidumbre.

La activacion es opt-in:

```text
CLOUD_COST_AI_COPILOT_ENABLED=true
```

Con el flag apagado, el endpoint retorna `skippedReason` y la experiencia deterministica sigue funcionando.

## Que vive en GCP Console y que vive en Greenhouse

Vive en GCP Console:

- configuracion oficial de Billing Export
- budgets nativos de GCP
- factura oficial
- permisos IAM de billing
- pricing catalog oficial

Vive en Vercel:

- factura oficial
- permisos del token de Billing API
- pricing y commitments oficiales
- budgets/alerts nativos de Vercel si el equipo decide configurarlos fuera del portal

Vive en Greenhouse:

- lectura operativa de Billing Export
- lectura operativa de Vercel Billing FOCUS
- drivers deterministicos
- forecast explicable
- proyeccion a Reliability Control Plane
- alert routing portal-first
- interpretacion AI grounded
- documentacion y handoff operativo

## Datos reales verificados al cierre de TASK-769

Al 2026-05-03, Greenhouse verifico:

- dataset `efeonce-group.billing_export`
- tabla `gcp_billing_export_v1_013340_4C7071_668441`
- tabla resource-level `gcp_billing_export_resource_v1_013340_4C7071_668441`
- 30 dias observados: CLP 114.379,91
- forecast rolling mensual: CLP 121.840,58
- driver principal: Cloud SQL `greenhouse-pg-dev`

## Limitaciones conocidas

- La lectura depende de que Billing Export siga poblando BigQuery y de que el token Vercel tenga acceso a Billing API.
- La latencia natural puede hacer que el dia actual este incompleto.
- La proyeccion puede diferir de GCP Console.
- La capa AI requiere Vertex AI/configuracion runtime y esta apagada por defecto.
- La optimizacion de recursos sigue requiriendo decision humana antes de apagar, reducir o cambiar infraestructura.

## Referencias tecnicas

- Reader: `src/lib/cloud/gcp-billing.ts`
- Reader Vercel: `src/lib/cloud/vercel-billing.ts`
- Tipos: `src/types/billing-export.ts`
- Tipos Vercel: `src/types/vercel-billing.ts`
- UI: `src/components/greenhouse/admin/GcpBillingCard.tsx`
- UI Vercel: `src/components/greenhouse/admin/VercelBillingCard.tsx`
- Alert sweep: `src/lib/cloud/gcp-billing-alerts.ts`
- Copiloto AI: `src/lib/cloud/finops-ai/`
- ops-worker: `services/ops-worker/server.ts`
