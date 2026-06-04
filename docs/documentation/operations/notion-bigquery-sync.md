# Sincronización Notion → BigQuery (notion-bq-sync)

> **Tipo de documento:** Documentación funcional (lenguaje simple)
> **Versión:** 1.0
> **Creado:** 2026-06-04 por Claude (TASK-1003)
> **Última actualización:** 2026-06-04 por Claude (TASK-1003)
> **Documentación técnica:** `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`

## Qué es

`notion-bq-sync` es el robot (un servicio en Cloud Run) que **lee las bases de Notion de cada cliente** (Tareas, Proyectos, Sprints, Revisiones) y las **copia a BigQuery** todos los días. Esa copia es la materia prima de las métricas de delivery (OTD, RpA, FTR…) que después alimentan **los bonos de la nómina**. Por eso es un flujo crítico: si se rompe, las métricas quedan viejas y los bonos salen mal.

## Cómo funciona (en simple)

1. Todos los días a las **03:00 (hora de Chile)** un temporizador (Cloud Scheduler) despierta al robot.
2. El robot recorre cada cliente activo, entra a sus bases de Notion con el **token (llave) correcto** de ese cliente y baja todas las páginas.
3. Guarda esa data cruda en BigQuery (`notion_ops`). Más tarde, otro proceso la ordena (conformed) y la lleva a la base operativa para las métricas.

```
Notion (bases del cliente) → notion-bq-sync → BigQuery → métricas ICO → bonos de nómina
```

## El cambio de junio 2026 (qué pasó y por qué importa)

Notion cambió su forma de identificar las bases en septiembre 2025: antes se llamaban "databases", ahora "data sources". El viejo modo quedó **deprecado** (con fecha de muerte). Nuestro robot seguía usando el modo viejo: Efeonce y Sky funcionaban solo porque tenían guardados los identificadores viejos, pero **cualquier cliente nuevo (como Grupo Berel) no podía sincronizar** (daba error 404). Y el día que Notion apagara el modo viejo, se rompía todo, incluido Efeonce/Sky.

**Lo que se hizo:** se actualizó el robot al **modo nuevo (canónico)** de Notion. Ahora:

- Entiende **los dos tipos de identificador** automáticamente (los viejos de Efeonce/Sky y los nuevos de los clientes que entran por el asistente de alta).
- Antes de prender el cambio, se corrió una **verificación de paridad**: comparó el modo viejo vs el nuevo sobre Efeonce y Sky y confirmó que devuelven **exactamente la misma data** (mismas filas, mismos campos). Cero diferencias.
- Se prendió con un **interruptor reversible** (se puede volver atrás en menos de 5 minutos si algo falla).

**Resultado:** Efeonce, Sky y Berel sincronizan por el modo nuevo, sin errores. La deuda quedó saldada para todos.

## ¿Hay que repetir esto con cada cliente nuevo? No

Este arreglo fue **una sola vez para todo el sistema**. Un cliente nuevo ahora entra solo:

1. El asistente de alta ya guarda los identificadores en el formato nuevo + su token propio.
2. El operador prende su sincronización (`sync_enabled = TRUE`).
3. El robot lo toma en la corrida diaria, sin tocar código ni hacer nada especial.

Lo único manual por cliente nuevo es el **provisioning de su Notion** (crear su integración/token y conectar el teamspace) — eso es parte del onboarding, no de esta migración.

## Qué significan los estados / señales

- **"Sync complete … 0 errors"** en los logs → todo bien.
- **Conteos de filas** (ej. Efeonce tareas 1374, Sky tareas 4118) → deben mantenerse estables corrida a corrida (salvo crecimiento real del trabajo en Notion).
- **Error 404 en un cliente** → ese cliente tiene un identificador o token mal configurado; queda aislado (no afecta a los demás).

## Qué NO hacer

- No volver al modo viejo de Notion (endpoint `databases` / versión 2022-06-28).
- No desplegar el robot con el script `deploy.sh` a secas (borra configuración sensible). Hay un comando de despliegue específico (ver el manual de uso).
- No prender/cambiar la versión de Notion sin correr antes la verificación de paridad.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
| --- | --- | --- |
| Un cliente nuevo da 404 | Token sin acceso al teamspace, o identificador mal | Revisar el token del cliente y que el teamspace esté compartido con su integración |
| Métricas viejas | El robot falló o no corrió | Revisar logs de Cloud Run + correr el sync manual (ver manual) |
| Conteos raros tras un cambio | Posible regresión | Correr la verificación de paridad; si hay diferencias, volver atrás el interruptor |

> Detalle técnico: arquitectura completa en `docs/architecture/GREENHOUSE_NOTION_BQ_SYNC_DATA_SOURCES_MIGRATION_V1.md`; operación paso a paso en `docs/manual-de-uso/operations/notion-bq-sync-operacion.md`; pipeline conformed en `docs/architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md`.
