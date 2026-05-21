# Operar el pipeline RpA V2 demo (captura de transiciones Notion)

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-05-20 por Claude (agente)
> **Modulo:** operaciones / delivery / ICO / Notion
> **Ruta en portal:** `/admin/operations` (señales de confiabilidad)
> **Documentacion relacionada:** [Captura de transiciones Notion → RpA (carril demo)](../../documentation/delivery/captura-transiciones-notion-rpa-demo.md), [RpA V2 Strangler Migration](../../architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md)

## Para que sirve

Este manual explica como verificar y operar el pipeline que captura cambios de estado de tareas en el teamspace **Demo Greenhouse** de Notion y los convierte en la metrica **RpA** (rondas de correccion), escribiendola de vuelta en Notion.

Usalo cuando:

- quieras confirmar que un cambio de estado en una tarea demo se capturo
- la propiedad `RpA` de una tarea demo no se actualiza
- una señal de confiabilidad del pipeline demo se enciende
- vayas a hacer un smoke test del pipeline tras un cambio

## Antes de empezar

- El pipeline corre **solo sobre el teamspace Demo Greenhouse**. No afecta clientes reales.
- La propiedad `RpA` en Notion es **de solo lectura para operadores**: la escribe Greenhouse, no la edites a mano.
- Los cambios se procesan de forma asincrona via crons cada ~5 minutos. No es instantaneo: una transicion puede tardar ~5 min en capturarse y ~10-15 min en reflejar el `RpA` en Notion (varios saltos de cron).

## Paso a paso — verificar que la captura funciona

1. En Notion, abre una tarea del teamspace Demo Greenhouse.
2. Cambia su estado (propiedad **Estado**). Para generar una **correccion** (lo que cuenta RpA), llevala a `Listo para revisión` y luego, **esperando unos minutos entre cada cambio**, a `Cambios solicitados`.
3. Espera ~5-6 minutos (el cron de captura corre cada 5 min).
4. La transicion queda registrada. Tras otros ~5-10 min, la propiedad `RpA` de la tarea muestra el numero de correcciones acumuladas.

> Importante: espacia los cambios de estado por algunos minutos. Si cambias muy rapido (segundos), Notion puede agrupar los avisos y el sistema solo "ve" el estado final — puede perderse un estado intermedio. En uso real esto no pasa porque los cambios de estado ocurren con minutos u horas de diferencia.

## Que significan los estados y señales

| Señal en `/admin/operations` | Que significa | Estado sano |
|---|---|---|
| `notion.metrics.transition_capture_refetch_failed_demo` | El sistema no pudo volver a leer una pagina de Notion (token vencido, Notion caido, pagina borrada) | **0** (cero) |
| `notion.metrics.writeback_dead_letter_demo` | El sistema no pudo escribir el `RpA` en Notion tras varios intentos | **0** (cero) |
| `notion.metrics.writeback_lag_demo` | Hay snapshots calculados pero aun no escritos en Notion | **0** en estado sano; >0 transitorio es normal mientras corre el cron |

## Que no hacer

- **No edites la propiedad `RpA`** en Notion a mano: la sobrescribe Greenhouse en el proximo ciclo.
- **No cambies el estado de una tarea muchas veces en pocos segundos** esperando capturar cada paso: pueden agruparse.
- **No asumas que el pipeline esta roto si el `RpA` no aparece al instante**: espera al menos 15 minutos (varios saltos de cron).
- **No uses este flujo para tareas de clientes reales**: es exclusivo del teamspace demo.

## Problemas comunes

| Sintoma | Causa probable | Que hacer |
|---|---|---|
| `RpA` sigue vacio tras 20+ min | El cron de writeback no corrio o el token Notion demo fallo | Revisar `notion.metrics.writeback_dead_letter_demo` y `writeback_lag_demo` en `/admin/operations` |
| Una transicion no se registro | El estado actual coincide con el ultimo registrado (no hubo cambio) o los cambios se agruparon | Repetir el cambio con mas espaciado |
| Webhook llega pero no captura | Revisar la señal `transition_capture_refetch_failed_demo` (re-fetch fallo) | Verificar token demo en GCP Secret Manager + permisos del integration token sobre el teamspace |

## Referencias tecnicas

- Documentacion funcional: [Captura de transiciones Notion → RpA (carril demo)](../../documentation/delivery/captura-transiciones-notion-rpa-demo.md)
- Spec arquitectonica: [GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md](../../architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md) (Delta 2026-05-20)
- Runbook de activacion: `docs/operations/runbooks/rpa-v2-demo-activation.md`
- Task: `docs/tasks/in-progress/TASK-914-notion-demo-transition-capture-refetch.md`
