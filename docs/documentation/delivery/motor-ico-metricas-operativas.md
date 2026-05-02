> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-05 por Claude (agente)
> **Ultima actualizacion:** 2026-05-02 por Codex
> **Documentacion tecnica:** [Greenhouse ICO Engine v1](../../architecture/Greenhouse_ICO_Engine_v1.md), [Contrato Metricas ICO v1](../../architecture/Contrato_Metricas_ICO_v1.md)

# Motor ICO — Metricas Operativas

El ICO Engine es el motor de metricas operativas de Greenhouse. Calcula indicadores de rendimiento para cada Space (cliente), proyecto, miembro del equipo y unidad de negocio, usando los datos de tareas sincronizados desde Notion.

---

## Que mide

| Metrica | Que significa | Como se calcula |
|---------|---------------|-----------------|
| OTD% (On-Time Delivery) | Porcentaje de tareas entregadas a tiempo | Tareas completadas antes o el dia de su due_date / total de tareas del periodo |
| RpA (Revisions per Asset) | Cuantas rondas de cambios del cliente tuvo cada entregable | Promedio de `rpa_value` de tareas completadas con valor > 0 |
| FTR% (First Time Right) | Porcentaje de tareas aprobadas sin cambios del cliente | Tareas completadas con `client_change_round_final = 0` / total completadas |
| Cycle Time | Dias promedio desde creacion hasta cierre de una tarea | Promedio de `cycle_time_days` de tareas completadas |
| Throughput | Cantidad de tareas completadas en el periodo | Conteo de tareas on-time + late-drop |
| Pipeline Velocity | Relacion entre tareas completadas y tareas abiertas | Completadas / abiertas |
| Stuck Assets | Tareas abiertas sin actualizacion reciente | Tareas con `is_stuck = true` (>48h sin cambios) |

> Detalle tecnico: las formulas canonicas estan en [Contrato de Metricas ICO v1](../../architecture/Contrato_Metricas_ICO_v1.md). El codigo fuente vive en [src/lib/ico-engine/shared.ts](../../../src/lib/ico-engine/shared.ts).

---

## Como llegan los datos

```
Notion (tareas)
  → Sync Pipeline (Cloud Run, diario)
    → BigQuery: notion_ops.tareas (raw)
      → Vista enriquecida: ico_engine.v_tasks_enriched
        → Materializacion (Cloud Run, 3:15 AM Chile)
          → Snapshots mensuales por Space, proyecto, miembro, sprint, BU
```

1. **Notion** es la fuente de verdad para las tareas operativas
2. Un pipeline de sincronizacion copia las tareas a BigQuery diariamente
3. Una vista de BigQuery (`v_tasks_enriched`) enriquece cada tarea con delivery compliance, cycle time, due dates, etc.
4. La **materializacion** (proceso batch) calcula metricas agregadas y las guarda como snapshots mensuales

> Detalle tecnico: el sync pipeline es un servicio Cloud Run (`notion-bq-sync`). La materializacion corre desde otro Cloud Run (`ico-batch-worker`). Ambos estan documentados en [Cloud Infrastructure v1](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md).

### Nota importante sobre "ultimo sync"

Desde `2026-05-02`, Greenhouse trata la frescura de Notion con una regla mas estricta:

- el pipeline upstream actualiza freshness en BigQuery
- el portal reconcilia esa frescura de vuelta a PostgreSQL
- si PostgreSQL viene atrasado o nulo, las surfaces operativas pueden usar BigQuery como fallback para no mostrar falsos "nunca sincronizado"

Esto evita un caso real donde Notion estaba fresco en mayo, pero algunas pantallas internas leian `NULL` en PostgreSQL y daban la impresion equivocada de que el pipeline no habia corrido.

> Detalle tecnico: ver [GREENHOUSE_NOTION_DELIVERY_SYNC_V1](../../architecture/GREENHOUSE_NOTION_DELIVERY_SYNC_V1.md).

---

## Donde se guardan las metricas

Las metricas se calculan una vez al dia y se guardan en tres capas, de mas rapida a mas lenta:

| Capa | Donde vive | Velocidad | Cuando se usa |
|------|-----------|-----------|---------------|
| **Postgres serving** | `greenhouse_serving.agency_performance_reports` | <200ms | Siempre primero |
| **BigQuery materializado** | `ico_engine.performance_report_monthly` | ~2s | Si Postgres no tiene datos |
| **Calculo en vivo** | Consulta directa a `v_tasks_enriched` | ~8s | Ultimo recurso si nada esta materializado |

El sistema intenta la capa mas rapida primero y cae a la siguiente si esta vacia.

### Importante: periodo cerrado vs periodo en curso

No todas las pantallas leen siempre un snapshot cerrado. Algunas surfaces de Agency pueden leer `ICO` live sobre `v_tasks_enriched` para el **mes en curso**. En esos casos puede pasar algo metodologicamente valido pero operativamente fragil:

- si solo 1 tarea completada tiene `rpa_value > 0`
- y ese valor es `3`
- entonces el RpA live del periodo puede verse como `3.0`

Eso **no** significa que Notion este vacio ni que el engine este roto. Significa que la muestra del periodo en curso es pequena y todavia no estabiliza el promedio.

Regla practica:

- **snapshot materializado / periodo cerrado** = lectura mas estable para reporting
- **live period / mes en curso** = lectura util para operacion diaria, pero mas sensible a muestras pequenas

> Caso real validado el 2026-05-02: Efeonce tenia 39 tareas de mayo, 39 completadas, pero solo 1 con `rpa_value > 0`, por eso `avg_positive_rpa = 3.0`.

### Como se llena Postgres

1. La materializacion escribe el reporte a BigQuery
2. Publica un evento `ico.performance_report.materialized` al outbox
3. Un proceso reactivo (`outbox-react-delivery`, cada 5 min) recoge el evento
4. Ejecuta la proyeccion que copia los datos de BigQuery a Postgres

> Detalle tecnico: la proyeccion es `agencyPerformanceReportProjection` en [src/lib/sync/projections/agency-performance-report.ts](../../../src/lib/sync/projections/agency-performance-report.ts). Usa UPSERT para ser idempotente.

---

## Que se ve en el portal

### Tab ICO Engine (Agency Workspace)

El tab ICO Engine del workspace de agencia muestra:

- **Metricas por Space**: OTD%, RpA, FTR%, Cycle Time, Throughput para cada cliente
- **Performance Report**: resumen ejecutivo de la agencia con tendencia mes a mes, alertas y top performer
- **Task Mix**: distribucion de tareas por segmento (cliente)
- **Trust Metadata**: nivel de confianza de cada metrica (alto, medio, bajo, sin datos)
- **Nexa Insights**: analisis narrativo generado por IA con recomendaciones accionables

### Digest semanal para liderazgo

Ademas del consumo dentro del portal, Greenhouse ya puede reutilizar los insights materializados de Nexa para enviar un **digest semanal por email** al liderazgo interno.

Ese digest:

- no recalcula metricas
- reutiliza el ranking advisory ya materializado
- resume los hallazgos mas relevantes de la semana
- enlaza de vuelta al portal para abrir mas contexto

> Detalle funcional: [Nexa Insights — Digest semanal para liderazgo](nexa-insights-digest-semanal.md)

### Metricas por persona (People)

Cada miembro del equipo tiene metricas ICO visibles en su perfil de People, calculadas sobre las tareas donde es primary owner.

### Creative Hub (por Space)

Los Spaces de clientes muestran un resumen de metricas ICO en su Creative Hub, incluyendo throughput y confianza de datos.

> Detalle tecnico: la UI del tab ICO esta en [src/views/agency/AgencyIcoEngineView.tsx](../../../src/views/agency/AgencyIcoEngineView.tsx). El workspace completo en [src/views/agency/AgencyWorkspace.tsx](../../../src/views/agency/AgencyWorkspace.tsx).

---

## Materializacion diaria

El proceso de materializacion corre automaticamente todos los dias a las 3:15 AM hora Chile desde Cloud Run. Ejecuta 12 pasos:

1. Snapshot de tareas del periodo (congela estado actual)
2. Metricas por Space
3. Distribucion CSC (fases de produccion)
4. Stuck assets (tareas atascadas)
5. Tendencia RpA (ultimos 12 meses)
6. Metricas por proyecto
7. Metricas por miembro
8. Metricas por sprint
9. Metricas por organizacion
10. Metricas por unidad de negocio
11. Performance Report de agencia
12. Senales AI y predicciones

Si algo falla en un paso, los pasos anteriores ya estan escritos y disponibles.

> Detalle tecnico: codigo en [src/lib/ico-engine/materialize.ts](../../../src/lib/ico-engine/materialize.ts). Infraestructura en [services/ico-batch/](../../../services/ico-batch/).

---

## Diagnostico

Existe un endpoint interno para verificar el estado del ICO Engine paso a paso:

```
GET /api/internal/ico-diagnostics
```

Verifica: infraestructura BigQuery, snapshots, metricas de agencia, Postgres serving, BigQuery materializado, query de top performer, reporte completo. Si Postgres esta vacio pero BigQuery tiene datos, lo puebla automaticamente.

> Detalle tecnico: [src/app/api/internal/ico-diagnostics/route.ts](../../../src/app/api/internal/ico-diagnostics/route.ts). Requiere autenticacion de agencia o CRON_SECRET.

---

## Glosario

| Termino | Significado |
|---------|-------------|
| **Space** | Workspace de un cliente en Notion, identificado por `space_id` |
| **Materializacion** | Proceso batch que calcula metricas y las guarda como snapshots |
| **Proyeccion** | Proceso que copia datos de BigQuery a Postgres para lectura rapida |
| **Outbox** | Cola de eventos en Postgres que notifica cambios a otros sistemas |
| **Trust Metadata** | Indicador de confianza de cada metrica (depende del volumen de datos) |
| **Fallback chain** | Cadena de lectura: Postgres → BigQuery → calculo en vivo |
