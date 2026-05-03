# Cloud Cost Intelligence y Copiloto FinOps

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-05-03 por Codex
> **Modulo:** operaciones / cloud / FinOps
> **Ruta en portal:** `/admin/integrations`
> **Arquitectura relacionada:** [GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1](../../architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md), [GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1](../../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)
> **Task relacionada:** [TASK-769](../../tasks/complete/TASK-769-cloud-cost-intelligence-ai-finops-copilot.md)

## Para que sirve

Cloud Cost Intelligence permite mirar los costos de Google Cloud desde Greenhouse sin depender de entrar a GCP Console para entender lo basico.

La capacidad responde tres preguntas operativas:

- cuanto se esta gastando
- que servicio, recurso o SKU explica el gasto
- que conviene revisar primero para evitar que la cuenta siga subiendo

La capa se apoya en `Billing Export` de Google Cloud hacia BigQuery. Greenhouse no reemplaza la factura oficial de GCP ni modifica budgets desde el portal; interpreta datos exportados para hacerlos accionables dentro del flujo operativo.

## Que muestra Greenhouse

En `/admin/integrations`, la tarjeta de costo cloud muestra:

- total del periodo observado
- moneda reportada por Billing Export
- ultimo dia de uso disponible
- forecast mensual explicable
- top servicios por costo
- recursos y SKUs que explican el gasto
- alertas tempranas cuando un driver cruza umbral
- ultima observacion del Copiloto FinOps AI, si existe

El dato puede tener latencia natural de Billing Export. Por eso Greenhouse muestra el ultimo dia de uso detectado y no asume que el dia actual esta completo.

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

Vive en Greenhouse:

- lectura operativa de Billing Export
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

- La lectura depende de que Billing Export siga poblando BigQuery.
- La latencia natural puede hacer que el dia actual este incompleto.
- La proyeccion puede diferir de GCP Console.
- La capa AI requiere Vertex AI/configuracion runtime y esta apagada por defecto.
- La optimizacion de recursos sigue requiriendo decision humana antes de apagar, reducir o cambiar infraestructura.

## Referencias tecnicas

- Reader: `src/lib/cloud/gcp-billing.ts`
- Tipos: `src/types/billing-export.ts`
- UI: `src/components/greenhouse/admin/GcpBillingCard.tsx`
- Alert sweep: `src/lib/cloud/gcp-billing-alerts.ts`
- Copiloto AI: `src/lib/cloud/finops-ai/`
- ops-worker: `services/ops-worker/server.ts`
