> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-26 por Claude (implementacion TASK-672)
> **Ultima actualizacion:** 2026-04-30
> **Documentacion tecnica:** [GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md), [GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md](../../architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md)

# Platform Health API — Preflight programatico de la plataforma

## Que es

Platform Health es un contrato de salud de la plataforma. Un solo request devuelve si Greenhouse esta sano, degradado o bloqueado, que dominios estan afectados, y que acciones son seguras de ejecutar en este momento.

Esta pensado para que agentes (MCP, Teams bot, CI), operadores y futuras apps puedan tomar decisiones antes de actuar — sin tener que leer la UI ni inferir el estado desde queries puntuales.

## Cuando usarlo

| Antes de... | Que pregunta responde |
|-------------|----------------------|
| Ejecutar un deploy | ¿La plataforma esta lista para recibir un cambio? |
| Lanzar un backfill | ¿El backlog reactivo permite cargar mas trabajo? |
| Notificar via Teams o Slack | ¿Los canales de notificacion estan operativos? |
| Correr automatizaciones de agente | ¿Algun bloqueo critico justifica detenerse? |
| Responder en un canal de soporte | ¿Que dominio reporta un incidente activo? |

## Estados posibles

El campo `overallStatus` resume la postura global:

| Estado | Significado | Que hacer |
|--------|------------|-----------|
| `healthy` | Todo opera con normalidad. | Continuar. |
| `degraded` | Hay advertencias en uno o mas modulos, pero nada bloqueante. | Revisar `warnings[]` y `recommendedChecks[]`. |
| `blocked` | Existe al menos un incidente critico. | Detenerse. Revisar `blockingIssues[]` antes de actuar. |
| `unknown` | No hay evidencia suficiente para afirmar el estado. | Tratar como bloqueante hasta verificar manualmente. |

`confidence` (`high`, `medium`, `low`, `unknown`) indica que tan respaldado esta el estado por las fuentes consultadas. Confianza baja casi siempre significa que una o mas fuentes no respondieron.

## Modos seguros (`safeModes`)

Son banderas booleanas que el cliente puede consultar sin re-implementar la logica de rollup. Cada bandera es conservadora: en caso de duda, el valor es `false`.

| Bandera | Significa "es seguro..." |
|---------|--------------------------|
| `readSafe` | leer datos del portal (Postgres + BigQuery operativos) |
| `writeSafe` | crear o actualizar registros |
| `deploySafe` | desplegar codigo nuevo a staging o produccion |
| `backfillSafe` | ejecutar jobs de larga duracion o backfills |
| `notifySafe` | enviar notificaciones outbound (email, Teams, Slack) |
| `agentAutomationSafe` | ejecutar automatizaciones de agente sin intervencion humana |

Si una bandera es `false`, el cliente no debe ejecutar la accion correspondiente. Las recomendaciones de remediacion vienen en `recommendedChecks[]`.

## Modulos cubiertos

V1 compone 4 modulos canonicos del Reliability Control Plane:

| Modulo | Que cubre |
|--------|-----------|
| `cloud` | Postgres, BigQuery, Sentry, Slack, posture de observabilidad |
| `finance` | Subsystems financieros, drift de ledger, smoke lane de Playwright |
| `delivery` | Pipeline Notion -> delivery, ICO metrics, worker reactivo |
| `integrations.notion` | Sync Notion, data quality, freshness raw |

Cada modulo expone `status`, `confidence`, `summary`, `topIssues[]` y `sourceFreshness{}`.

## Fuentes consultadas

El composer llama 7 fuentes en paralelo, cada una con timeout dedicado:

| Fuente | Que aporta | Timeout |
|--------|------------|---------|
| `reliability_control_plane` | Modulos + senales agregadas | 6 s |
| `operations_overview` | KPIs operacionales (handlers, webhooks) | 5 s |
| `internal_runtime_health` | Probes Postgres + BigQuery + posture | 5 s |
| `observability_posture` | Sentry, Slack, source maps configurados | 2 s |
| `sentry_incidents` | Issues abiertas tagged por dominio | 3 s |
| `synthetic_monitoring` | Ultima corrida de probes a rutas criticas | 3 s |
| `integration_readiness` | Estado por integracion (Notion, HubSpot, etc.) | 4 s |

Cuando una fuente falla o expira, aparece en `degradedSources[]` y la confianza global baja. La respuesta nunca es 500 por una sola fuente caida — siempre devuelve un payload util con la evidencia disponible.

## Rutas disponibles

| Ruta | Audiencia | Que devuelve |
|------|-----------|--------------|
| `GET /api/admin/platform-health` | Operadores admin (tenant context) | Payload completo con evidencia y referencias |
| `GET /api/platform/ecosystem/health` | Agentes MCP, Teams bot, apps externas | Resumen redactado, sin evidencia detallada |

La ruta admin requiere sesion autenticada con rol `efeonce_admin`. La ruta ecosystem se autentica via Bearer token de API Platform y respeta el scope binding del consumidor.

## Como consultarlo

Desde un agente o script con sesion de admin:

```bash
pnpm staging:request /api/admin/platform-health --pretty
```

Desde un cliente externo con token de ecosystem:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  https://greenhouse.efeoncepro.com/api/platform/ecosystem/health
```

Ambas rutas soportan `If-None-Match` para validacion condicional. La respuesta incluye `etag` en `meta.freshness`.

## Estructura de la respuesta

```json
{
  "contractVersion": "platform-health.v1",
  "generatedAt": "2026-04-26T18:30:00.000Z",
  "environment": "staging",
  "overallStatus": "degraded",
  "confidence": "high",
  "safeModes": {
    "readSafe": true,
    "writeSafe": true,
    "deploySafe": false,
    "backfillSafe": false,
    "notifySafe": true,
    "agentAutomationSafe": false
  },
  "modules": [
    {
      "moduleKey": "delivery",
      "label": "Delivery",
      "domain": "delivery",
      "status": "degraded",
      "confidence": "high",
      "summary": "Reactive backlog acumulado en handler vat_monthly_position",
      "topIssues": [/* ... */],
      "sourceFreshness": {/* ... */}
    }
  ],
  "blockingIssues": [],
  "warnings": [/* ... */],
  "recommendedChecks": [
    {
      "id": "inspect-handler-health",
      "label": "Inspect reactive handler state machine for active dead-letters",
      "command": "pnpm staging:request /api/admin/ops/reactive/handler-health --pretty",
      "appliesWhen": ["safe-mode:backfillSafe:false"]
    }
  ],
  "degradedSources": []
}
```

## Que NO hace

Por contrato, esta API es solo de lectura. No expone:

- Comandos de remediacion, replay, requeue, sync manual o cualquier mutacion
- Stack traces, secretos, tokens, DSNs ni valores sensibles
- Datos sensibles de People, Payroll o Finance a consumidores externos
- Detalle granular en la ruta ecosystem hasta que TASK-658 cierre el bridge de autorizacion por capability

Si necesitas remediacion, usa los endpoints especificos de cada dominio (por ejemplo `/api/admin/ops/reactive/handler-health` para acknowledge de handlers degradados).

## Que pueden inferir los agentes

Recomendacion de uso para agentes MCP y Teams bot:

1. Consultar `safeModes` antes de ejecutar acciones sensibles. Respetar las banderas tal como vienen — no interpretar `degraded` como `healthy`.
2. Si `agentAutomationSafe` es `false`, escalar a operador humano antes de actuar.
3. Si una accion especifica falla durante ejecucion, reconsultar Platform Health para confirmar si el modulo afectado paso a `blocked`.
4. No cachear el payload mas alla de 30 segundos. La API ya tiene cache in-process; reusar es contraproducente.
5. No depender de campos no documentados. Solo `contractVersion: platform-health.v1` garantiza shape estable.

## Versionado

`contractVersion` es la unica garantia de shape estable. Cambios incompatibles bumpean el numero de version (`platform-health.v1` -> `platform-health.v2`). Nuevos campos opcionales se agregan dentro de `v1` sin bump.

> **Detalle tecnico:** spec completa en [GREENHOUSE_API_PLATFORM_V1.md](../../api/GREENHOUSE_API_PLATFORM_V1.md), schema OpenAPI en [GREENHOUSE_API_PLATFORM_V1.openapi.yaml](../../api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml), composer en [src/lib/platform-health/composer.ts](../../../src/lib/platform-health/composer.ts).

## Tareas relacionadas

- TASK-647 — MCP read-only adapter ya expone la tool `get_platform_health` que envuelve este contrato.
- TASK-657 — degraded modes / dependency health usa el mismo wrapper `withSourceTimeout` para sus probes.
- TASK-658 — resource authorization bridge habilitara `platform.health.detail` en la ruta ecosystem.
- TASK-660 — promueve este contrato a `stable` en la OpenAPI publica.
- TASK-671 — Teams bot consume `safeModes.notifySafe` antes de enviar alertas.
