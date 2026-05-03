# Monitorear Costos Cloud con FinOps

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-03 por Codex
> **Modulo:** operaciones / cloud / FinOps
> **Ruta en portal:** `/admin/integrations`
> **Documentacion relacionada:** [Cloud Cost Intelligence y Copiloto FinOps](../../documentation/operations/cloud-cost-intelligence-finops.md)

## Para que sirve

Este manual explica como usar Greenhouse para revisar costos de Google Cloud, detectar que se disparo y decidir donde atacar primero.

Usalo cuando:

- la factura subio inesperadamente
- GCP proyecta un pago mayor al esperado
- quieres saber si Cloud SQL, Cloud Run, Vertex AI, BigQuery u otro servicio esta empujando el gasto
- necesitas validar si una alerta temprana tiene evidencia suficiente

## Antes de empezar

Necesitas acceso admin al portal Greenhouse.

Tambien debes tener presente:

- Billing Export puede tener latencia natural de hasta 24h.
- Greenhouse no reemplaza la factura oficial de GCP.
- No apagues ni reduzcas recursos productivos solo por una recomendacion AI.
- Las alertas deterministicas son la fuente de severidad; la IA solo explica y prioriza.

## Paso a paso

1. Entra a Greenhouse.
2. Abre `/admin/integrations`.
3. Busca la tarjeta **Costo cloud (Billing Export)**.
4. Revisa el chip de estado:
   - `Activo`: hay datos disponibles.
   - `Esperando datos`: Billing Export existe, pero aun no hay filas utiles.
   - `Sin configurar`: falta project/dataset/configuracion.
   - `Error`: el reader no pudo consultar BigQuery.
5. Revisa el total del periodo y el ultimo dia disponible.
6. Mira la **Proyeccion mensual**.
7. Revisa **Alertas tempranas**.
8. Baja a **Top servicios** para ver que servicio concentra gasto.
9. Revisa **Recursos que explican el gasto** para identificar instancia, recurso o SKU.
10. Si existe bloque **Copiloto FinOps AI**, leelo como interpretacion, no como fuente de verdad.

## Como leer el forecast

El forecast muestra una proyeccion de cierre mensual.

Interpreta la confianza asi:

- `high`: hay suficientes dias completos para una lectura estable.
- `medium`: hay datos, pero conviene revisar de nuevo mas adelante.
- `low`: el periodo observado es muy corto o incompleto.

Si GCP Console muestra otra proyeccion, compara ambas:

- Greenhouse explica su metodo con Billing Export.
- GCP Console puede usar un metodo propietario.
- Si ambas apuntan a crecimiento, trata el costo como riesgo real.

## Como interpretar alertas tempranas

Cada alerta incluye resumen y evidencia.

Prioriza en este orden:

1. Drivers `error`.
2. Recursos/SKUs con alto porcentaje del total.
3. Servicios que concentran mas de la mitad del gasto.
4. Forecast que cruza umbral mensual.
5. Spikes de servicios con aumento contra baseline.

Ejemplo:

```text
greenhouse-pg-dev concentra 25.2% del costo observado en Cloud SQL.
```

Esto significa que el primer lugar para investigar es esa instancia o SKU, no "todo GCP".

## Que revisar segun servicio

### Cloud SQL

Revisa:

- instancia exacta
- vCPU y RAM
- si es dev/staging/prod
- tamaño de maquina
- backups, HA, storage y replicas
- si existen instancias antiguas o duplicadas

No hacer:

- apagar una instancia sin confirmar ambiente y dependencias
- bajar recursos sin ventana de cambio
- tocar produccion sin rollback

### Cloud Run

Revisa:

- min instances
- memoria y CPU asignada
- concurrencia
- servicios legacy publicos
- jobs que quedaron corriendo mas de lo esperado

No hacer:

- poner `minScale=0` en servicios que necesitan warm start sin validar impacto
- cambiar identidad o permisos junto con optimizacion de costo en el mismo paso si no esta planeado

### Vertex AI / Gemini

Revisa:

- jobs o runners AI activos
- frecuencia de scheduler
- dedupe por fingerprint
- prompts que puedan estar ejecutandose demasiado
- kill-switches

No hacer:

- dejar un watcher AI activo sin umbral, dedupe o schedule conservador

### BigQuery

Revisa:

- queries sin particion
- caps de `maximumBytesBilled`
- tablas grandes consultadas por crons
- scheduled queries o materializaciones

No hacer:

- abrir queries exploratorias sin limite o filtro temporal

## Como probar alertas sin enviar mensajes

El endpoint operativo soporta dry-run:

```text
POST /cloud-cost-ai-watch
Body: { "triggeredBy": "manual", "dryRun": true }
```

Un dry-run:

- evalua drivers
- no manda Teams
- no manda Slack
- no persiste fingerprint
- devuelve counts y `skippedReason`

Usalo para validar que el sistema detecta riesgos antes de activar despachos reales.

## Activar o desactivar el Copiloto AI

La capa AI esta apagada por defecto.

Para activarla en el runtime del ops-worker:

```text
CLOUD_COST_AI_COPILOT_ENABLED=true
```

Para apagarla:

```text
CLOUD_COST_AI_COPILOT_ENABLED=false
```

Con la IA apagada:

- las alertas deterministicas siguen funcionando
- la UI sigue mostrando costos, forecast y drivers
- el endpoint devuelve `skippedReason`
- no se consumen tokens por interpretacion AI

## Que no hacer

- No tomar decisiones destructivas solo por el resumen AI.
- No asumir que el dia actual esta completo.
- No comparar forecast de Greenhouse y GCP Console como si usaran el mismo metodo.
- No arreglar costos tocando seguridad, IAM o networking en el mismo cambio sin plan.
- No enviar alertas desde la UI ni desde un GET; el envio vive en el sweep del ops-worker.

## Problemas comunes

### La tarjeta dice "Esperando datos"

Puede significar que Billing Export esta configurado pero BigQuery aun no materializa filas para el periodo observado.

Accion:

- esperar la ventana natural de Billing Export
- confirmar dataset y tablas en BigQuery
- revisar arquitectura de Billing Export si persiste

### No aparece el Copiloto AI

Puede estar apagado o no haber observaciones persistidas.

Accion:

- confirmar `CLOUD_COST_AI_COPILOT_ENABLED`
- revisar que el scheduler haya corrido
- revisar respuesta de `/cloud-cost-ai-watch`

### Hay alerta pero no llego a Teams

Puede faltar canal Teams o estar deshabilitado.

Accion:

- revisar `CLOUD_COST_ALERT_TEAMS_CHANNEL_CODE`
- revisar fallback Slack
- revisar tabla `greenhouse_ai.cloud_cost_alert_dispatches`

### El forecast de Greenhouse no coincide con GCP Console

Es esperado si el metodo de GCP usa datos o supuestos distintos.

Accion:

- usar Greenhouse para entender drivers y evidencia
- usar GCP Console para factura/proyeccion oficial
- si ambas muestran tendencia al alza, investigar los drivers principales

## Referencias tecnicas

- Documentacion funcional: `docs/documentation/operations/cloud-cost-intelligence-finops.md`
- Arquitectura Billing Export: `docs/architecture/GREENHOUSE_BILLING_EXPORT_OBSERVABILITY_V1.md`
- Arquitectura Reliability: `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- Task: `docs/tasks/complete/TASK-769-cloud-cost-intelligence-ai-finops-copilot.md`
