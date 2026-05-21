> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-20 por Claude (agente)
> **Ultima actualizacion:** 2026-05-20 por Claude (agente)
> **Documentacion tecnica:** [RpA V2 Strangler Migration](../../architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md) (Delta 2026-05-20), [Delivery Metrics Ownership Boundary](../../architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md)

# Captura de transiciones Notion → RpA (carril demo)

Este documento explica, en lenguaje simple, como Greenhouse "se entera" de que una tarea cambio de estado en Notion y como eso se convierte en la metrica **RpA** (rondas de correccion del cliente). Aplica al **carril demo** (teamspace "Demo Greenhouse"), que es el sandbox donde se prueba el motor antes de tocar los clientes reales (Efeonce, Sky).

---

## Que problema resuelve

Antes, la metrica RpA se calculaba con una formula dentro de Notion. Eso era fragil: cualquiera podia editar la formula, no habia historial, ni tests, ni control. La decision canonica de Greenhouse es: **Notion es el lugar donde se trabaja (el sistema operativo de tareas), y Greenhouse es el motor que calcula las metricas.** Greenhouse calcula RpA con su propio codigo y escribe el resultado de vuelta a Notion en una propiedad de solo lectura llamada `RpA`.

Para calcular RpA, Greenhouse necesita saber **cuantas veces una tarea paso de "Listo para revision" a "Cambios solicitados"** (cada uno de esos pasos es una correccion del cliente). Para eso necesita capturar los cambios de estado de cada tarea.

---

## Como funciona (paso a paso)

| Paso | Que pasa | En palabras simples |
|---|---|---|
| 1 | Un operador cambia el estado de una tarea en Notion | "Marco la tarea como Cambios solicitados" |
| 2 | Notion avisa a Greenhouse con un webhook | Notion manda un mensaje: "la tarea X cambio una propiedad" |
| 3 | Greenhouse valida el mensaje (firma HMAC) | Confirma que el mensaje viene de Notion de verdad |
| 4 | Greenhouse emite una senal interna (trigger) | "Algo cambio en la tarea X, hay que revisar" |
| 5 | Un proceso en segundo plano vuelve a leer la tarea en Notion | Le pregunta a Notion: "¿en que estado esta la tarea X ahora?" |
| 6 | Greenhouse calcula desde-hacia | El estado de ahora es el "hacia"; el ultimo estado que tenia registrado es el "desde" |
| 7 | Si el estado cambio, lo guarda como una transicion | Queda registrado: "Listo para revision → Cambios solicitados" |
| 8 | Si fue una correccion, recalcula RpA y lo escribe en Notion | La propiedad `RpA` de la tarea se actualiza con el numero de correcciones |

> Detalle tecnico: el webhook de Notion **no incluye el valor nuevo** de la propiedad (solo dice que cambio). Por eso el paso 5 ("volver a leer la tarea") es clave — es la unica fuente confiable del estado real. Esto se llama *re-fetch pattern*. Ver [RpA V2 Strangler Migration, Delta 2026-05-20](../../architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md).

---

## Por que el webhook es solo un "aviso" y no la fuente de verdad

El mensaje que manda Notion solo dice "la tarea X cambio la propiedad Y" — pero **no dice cual es el valor nuevo**. Por eso Greenhouse siempre vuelve a leer la tarea desde Notion antes de calcular nada. Confiar ciegamente en el aviso del webhook seria un error (de hecho fue la causa de un bug que se corrigio en TASK-914).

Como el "desde" (estado anterior) tampoco viene en el aviso, Greenhouse lo deduce de la ultima transicion que tenia guardada para esa tarea. Si nunca habia guardado ninguna, asume que venia de "Sin empezar".

---

## Que NO hace

- **No toca a los clientes reales.** Todo este flujo corre solo sobre el teamspace demo. Los datos demo nunca afectan KPIs, bonos ni nomina de colaboradores reales (hay 9 capas de proteccion).
- **No calcula RpA leyendo la formula vieja de Notion.** Greenhouse calcula con su propio codigo; la formula de Notion queda como respaldo durante la migracion.
- **No registra una transicion si el estado no cambio.** Si el aviso llega pero la tarea sigue en el mismo estado, no hace nada (es idempotente).

---

## Como saber si esta funcionando

- En Notion, la propiedad `RpA` de una tarea demo muestra el numero de correcciones (ej. `2`).
- Si algo falla (Notion caido, token vencido), una senal de confiabilidad llamada `notion.metrics.transition_capture_refetch_failed_demo` lo detecta y avisa en `/admin/operations`. En estado sano, esa senal esta en cero.

---

> Detalle tecnico:
> - Spec arquitectonica: [GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md](../../architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md) (Delta 2026-05-20)
> - Codigo: `src/lib/webhooks/handlers/notion-tasks-demo.ts`, `src/lib/sync/projections/notion-status-transition-capture-demo.ts`, `src/lib/notion-metrics/notion-demo-client.ts`
> - Task: `docs/tasks/in-progress/TASK-914-notion-demo-transition-capture-refetch.md`
> - Manual operativo: [Operar el pipeline RpA V2 demo](../../manual-de-uso/operations/pipeline-rpa-v2-demo.md)
