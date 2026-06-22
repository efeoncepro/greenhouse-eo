# Activar ICO de un cliente y verificar el estado

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-19 por Claude (agente)
> **Ultima actualizacion:** 2026-06-19 por Claude (agente)
> **Modulo:** operaciones / delivery / ICO
> **Ruta en portal:** acciones por API (`/api/delivery/ico/*`); senales en `/admin/operations`
> **Documentacion relacionada:** [Inclusion ICO de clientes](../../documentation/delivery/inclusion-ico-clientes.md), [ICO Delivery Metrics — Agent Invariants](../../architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md) (§ ICO Client Inclusion)

## Para que sirve

Este manual explica como **activar el motor de metricas ICO** (OTD, RpA, tareas, etc.) para un cliente y como **verificar en que etapa real** esta el cliente. Desde TASK-1171 esto es data-driven: cualquier cliente entra solo, sin tocar codigo.

Usalo cuando:

- entra un cliente nuevo y hay que hacerlo aparecer en su dashboard y en el reporte de agencia
- un cliente ya conectado a Notion no muestra metricas
- quieras confirmar si un cliente esta "configurado" o realmente "calculando"
- se enciende la senal `delivery.ico.client_absent_from_org_rollup`

## Antes de empezar

- El cliente **ya debe tener su Notion conectado** (se hace antes, desde el wizard de onboarding). Si no lo esta, primero conectalo; la activacion fallara hasta entonces.
- Necesitas un rol interno con la capability correspondiente:
  - Para **activar** (`enable-sync`): capability `delivery.ico.sync.enable` — la tienen EFEONCE_ADMIN, EFEONCE_OPERATIONS y EFEONCE_ACCOUNT.
  - Para **consultar estado** (`sync-status`): capability `delivery.ico.sync.read` — disponible para el route_group interno y EFEONCE_ADMIN.
- Activar es **idempotente**: si ya estaba activo, no rompe nada.
- Las metricas no aparecen al instante: tras activar hay pasos asincronos (propagacion a BigQuery, pipeline Notion→BQ, materializacion). Da tiempo antes de concluir que algo fallo.

## Paso a paso

### 1. Activar el sync ICO del cliente

Llama la accion gobernada:

```
POST /api/delivery/ico/enable-sync
Content-Type: application/json

{ "clientId": "<id del cliente>", "reason": "alta cliente nuevo" }
```

- Pasa **`clientId` o `spaceId`** (cualquiera de los dos identifica al cliente). `reason` es opcional pero recomendable para la auditoria.
- Respuesta esperada:

```json
{
  "ok": true,
  "clientId": "...",
  "spaceId": "...",
  "sourceId": "...",
  "alreadyEnabled": false,
  "bigQuerySyncQueued": true
}
```

- `alreadyEnabled: true` significa que el cliente ya estaba activo (idempotente, todo bien).
- `bigQuerySyncQueued: true` significa que ya se encolo la propagacion a BigQuery (el worker la procesa en segundo plano).

### 2. Verificar el estado real (preflight)

```
GET /api/delivery/ico/sync-status?clientId=<id del cliente>
```

(o `?spaceId=<id del espacio>`).

Respuesta esperada:

```json
{
  "ok": true,
  "clientId": "...",
  "spaceId": "...",
  "spaceName": "...",
  "stage": "calculating",
  "connected": true,
  "enabled": true,
  "calculating": true,
  "lastSyncedAt": "...",
  "currentPeriod": "...",
  "currentTotalTasks": 0,
  "currentOtdPct": 0,
  "lastCalculatedPeriodKey": "..."
}
```

Mira el campo **`stage`**: es la escalera que te dice exactamente donde esta el cliente (ver la tabla de estados abajo).

### 3. Confirmar que aparece

- En el dashboard del cliente y en el reporte de agencia, el cliente ya muestra metricas del periodo.
- El preflight responde `stage: calculating`.

## Que significan los estados

| `stage` | Que significa | Que hacer |
|---|---|---|
| `not_connected` | El Notion del cliente no esta conectado | Conectar Notion desde el onboarding **antes** de activar |
| `connected_not_enabled` | Conectado, pero el sync ICO esta apagado | Activar con `POST /enable-sync` (paso 1) |
| `enabled_not_calculating` | Sync activo, pero aun sin metricas del mes | Si se activo recien, esperar. Si ya paso tiempo, mirar `lastSyncedAt`: si quedo viejo, el pipeline o el token tienen un problema |
| `calculating` | Hay metricas del mes presentes | Todo OK, el cliente esta vivo en ICO |

Ademas, `calculating: null` (no `true`/`false`) significa que **no se pudo consultar BigQuery** en ese momento — estado incierto, no error del cliente. Reintenta el preflight mas tarde.

## Que no hacer

- **No actives el teamspace "Greenhouse Demo".** Es un sandbox de pruebas; sus datos jamas deben entrar a los KPIs productivos.
- **No intentes activar antes de conectar Notion.** Si el cliente no tiene Notion conectado, recibiras `ico_sync_source_not_connected`: conecta primero.
- **No asumas que el cliente esta roto si no aparece al instante.** Hay pasos asincronos; verifica el `stage` con el preflight antes de escalar.
- **No edites datos a mano en BigQuery ni en el pipeline.** La inclusion es data-driven via la accion gobernada; cualquier ajuste va por ahi.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| `enable-sync` devuelve `ico_sync_source_not_connected` | El cliente todavia no tiene Notion conectado | Conectar el Notion del cliente desde el onboarding y reintentar |
| `enable-sync` devuelve `ico_sync_client_not_found` | No hay un espacio para ese `clientId`/`spaceId` | Verificar el identificador del cliente / que el espacio exista |
| `enable-sync` o `sync-status` devuelve `forbidden` | Te falta la capability requerida | Pedir el rol/capability correcto (`delivery.ico.sync.enable` / `delivery.ico.sync.read`) |
| `stage` se queda en `enabled_not_calculating` por mucho tiempo | Pipeline o token con problema | Revisar `lastSyncedAt`; si quedo viejo, revisar la salud del sync Notion→BQ del cliente |
| `calculating` viene en `null` | No se pudo consultar BigQuery (estado incierto) | Reintentar el preflight mas tarde |
| Senal `delivery.ico.client_absent_from_org_rollup` encendida en `/admin/operations` | Un cliente con tareas no aparece en el rollup ICO | Verificar con el preflight en que `stage` esta y completar el paso que falte |

## Referencias tecnicas

- Documentacion funcional: [Inclusion ICO de clientes](../../documentation/delivery/inclusion-ico-clientes.md)
- Spec arquitectonica: [ICO Delivery Metrics — Agent Invariants](../../architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md) (§ ICO Client Inclusion)
- API quick reference: [GREENHOUSE_API_REFERENCE_V1.md](../../api/GREENHOUSE_API_REFERENCE_V1.md) (ICO Engine API)
- Task: [TASK-1171](../../tasks/in-progress/TASK-1171-ico-client-inclusion-systemic-full-api-parity.md)
