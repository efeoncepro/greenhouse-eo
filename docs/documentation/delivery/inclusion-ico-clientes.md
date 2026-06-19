> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-19 por Claude (agente)
> **Ultima actualizacion:** 2026-06-19 por Claude (agente)
> **Documentacion tecnica:** [ICO Delivery Metrics — Agent Invariants](../../architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md) (§ ICO Client Inclusion), [TASK-1171](../../tasks/in-progress/TASK-1171-ico-client-inclusion-systemic-full-api-parity.md)

# Inclusion ICO de clientes

Este documento explica, en lenguaje simple, como un cliente entra al motor de metricas **ICO** (Intelligent Creative Operations) — las metricas de delivery de la agencia, como OTD (entregas a tiempo), RpA (rondas de correccion del cliente), tareas, etc. Cubre como se activa un cliente, como verificar el estado real y que significa cada etapa.

---

## Que problema resuelve

Antes, cuando entraba un cliente nuevo (el caso que lo destapo fue **Grupo Berel**, el 2026-06-19), ese cliente **no aparecia** en los calculos ICO ni en el reporte de agencia. Para incluirlo habia que tocar codigo. Eso es fragil: cada cliente nuevo dependia de un cambio manual de un desarrollador.

Ahora la inclusion es **data-driven**: cualquier cliente entra solo, **cero codigo**. Activar el ICO de un cliente es una accion gobernada por API, con permisos, idempotencia y verificacion de estado real. Lo unico que se necesita es que el cliente ya este conectado a Notion (su sistema operativo de tareas) y que un operador interno con permiso active el sync.

---

## Como entra un cliente a ICO (el camino completo, cero codigo)

| Paso | Que pasa | En palabras simples |
|---|---|---|
| 1 | Se conecta el Notion del cliente | Desde el wizard de onboarding, el espacio del cliente queda conectado a su teamspace de Notion |
| 2 | Un operador activa el sync ICO | Se llama la accion gobernada `POST /api/delivery/ico/enable-sync` con el cliente |
| 3 | El sistema propaga a BigQuery | Un proceso en segundo plano (worker) registra al cliente en el pipeline de datos. Es asincrono |
| 4 | El pipeline Notion→BigQuery toma al cliente | A partir de ahi, las tareas del cliente empiezan a fluir hacia el motor |
| 5 | Se materializan las metricas | Greenhouse calcula OTD, RpA, tareas, etc. para el periodo en curso |
| 6 | Aparece en sus reportes | El cliente ya se ve en su propio dashboard y en el reporte de agencia |

> Detalle tecnico: la activacion solo marca el sync de un cliente **ya conectado** a Notion. La conexion de Notion en si se hace antes, desde el onboarding. Si el cliente todavia no tiene Notion conectado, la activacion devuelve un error claro (`ico_sync_source_not_connected`) que pide conectar primero.

---

## "Configurado" no es lo mismo que "calculando"

Una leccion clave de este dominio: que un cliente este **configurado** (sync activado) no garantiza que las metricas ya esten **fluyendo**. Entre activar y ver numeros hay varios pasos asincronos (propagacion a BigQuery, el pipeline, la materializacion). Por eso existe una verificacion de estado real — un *preflight* — que responde en que etapa esta realmente el cliente, en vez de asumir.

Se consulta con `GET /api/delivery/ico/sync-status` y el campo importante es `stage`, que es una escalera:

| `stage` | Que significa | Que hacer |
|---|---|---|
| `not_connected` | El Notion del cliente todavia no esta conectado | Conectar Notion desde el onboarding antes de activar |
| `connected_not_enabled` | Esta conectado, pero el sync ICO esta apagado | Activar con `enable-sync` |
| `enabled_not_calculating` | El sync esta activo, pero aun no hay metricas del mes | Puede ser que se activo recien (esperar) o que el pipeline/token tiene un problema. Mirar `lastSyncedAt` |
| `calculating` | Ya hay metricas del mes presentes | Todo OK, el cliente esta vivo en ICO |

Ademas, el campo `calculating` puede venir en `null`: eso significa que **no se pudo consultar BigQuery** en ese momento (estado incierto), no que el cliente este mal. Es honestidad de estado: el sistema prefiere decir "no se" antes que afirmar un cero falso.

Otros campos que devuelve el preflight ayudan a leer el contexto: `connected`, `enabled`, `lastSyncedAt` (cuando sincronizo por ultima vez), `currentPeriod`, `currentTotalTasks`, `currentOtdPct` y `lastCalculatedPeriodKey`.

---

## Reglas de negocio importantes

- **Nunca se activa el teamspace "Greenhouse Demo".** Es un sandbox de pruebas, no un cliente real. Sus datos jamas deben entrar a los KPIs productivos.
- **Primero conectar Notion, despues activar.** Si se intenta activar un cliente sin Notion conectado, la accion falla con un error claro y no hace nada a medias.
- **Activar es idempotente.** Si el cliente ya tenia el sync activo, volver a activar no rompe nada: responde que ya estaba activado (`alreadyEnabled: true`).

---

## Como saber si esta funcionando

- En el dashboard del cliente y en el reporte de agencia, el cliente aparece con sus metricas del periodo.
- El preflight (`sync-status`) responde `stage: calculating`.
- Hay una **senal de confiabilidad** relacionada, visible en `/admin/operations`: `delivery.ico.client_absent_from_org_rollup`. Se enciende si un cliente que tiene tareas **no** aparece en el rollup ICO de la agencia. En estado sano esta en cero.

---

> Detalle tecnico:
> - Spec arquitectonica: [ICO Delivery Metrics — Agent Invariants](../../architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md) (§ ICO Client Inclusion)
> - Task: [TASK-1171](../../tasks/in-progress/TASK-1171-ico-client-inclusion-systemic-full-api-parity.md)
> - Manual operativo: [Activar ICO de un cliente y verificar el estado](../../manual-de-uso/operations/activar-ico-cliente.md)
