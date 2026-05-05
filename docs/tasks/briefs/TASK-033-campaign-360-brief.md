# TASK-033 — Campaign 360 Brief

> **Reclasificado 2026-05-05** — movido de `to-do/` a `briefs/`. Este documento es referencia de framing de producto, no task ejecutable. Implementación viva en `to-do/TASK-017-campaign-360.md`. NO tomar como baseline técnica.

## Estado

Brief historico de producto saneado al 2026-03-24.

Este documento ya no prescribe implementacion tecnica directa.
Se conserva para capturar la intencion funcional original de `Campaign 360`, pero la baseline operativa vigente para modelado, runtime e integracion es:

- `docs/tasks/to-do/TASK-017-campaign-360.md`

Ante conflicto, prevalecen:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/tasks/to-do/TASK-017-campaign-360.md`

## Que conserva este brief

Este brief sigue siendo util para entender:

- la definicion de negocio de `Campaign`
- el problema que busca resolver para clientes y operadores
- la diferencia entre `Campaign`, `Service`, `Project` y `Space`
- la necesidad de exponer una superficie client-facing en `/campanas`
- la intencion de agregar metricas ICO a nivel de campana

## Que NO debe tomarse literalmente

Las versiones previas de este brief mezclaban framing de producto con decisiones tecnicas hoy obsoletas.

No implementar desde este documento:

- `UUID` como patron obligatorio de PK/FK para Campaign
- `notion_project_ids[]` como backbone estructural del objeto
- `greenhouse_olap` o BigQuery como source of truth de Campaign
- joins operativos basados en `UNNEST(c.notion_project_ids)` como mecanismo principal
- una relacion `Campaign -> Service` materializada prematuramente como tabla canonica

La implementacion vigente debe seguir el patron `Postgres-first`, con `space_id` como boundary operativo y relaciones explicitas entre objetos canonicos.

## Resumen de producto

Implementar `Campaign` (`EO-CMP-XXXX`) como entidad canonica de Greenhouse para agrupar proyectos bajo una misma iniciativa de negocio.

`Campaign` representa lo que el cliente reconoce como una campana, lanzamiento, seasonal push o sprint agrupado. Su valor es introducir una capa intermedia entre el contexto operativo de `Project` y el contexto de tenant en `Space`, permitiendo leer desempeno, throughput y avance a una escala mas cercana a la decision de negocio.

Ejemplo:

- una campana como `Vacaciones de Invierno 2026` puede involucrar varios proyectos de trabajo
- esos proyectos pueden pertenecer a distintos servicios o lineas de servicio
- hoy un cliente o account lead piensa en esa campana como una sola iniciativa
- sin `Campaign`, la lectura de metricas y estado queda fragmentada por proyecto o servicio

## Problema que resuelve

Hoy Greenhouse puede razonar bien sobre:

- tareas
- proyectos
- servicios
- espacios

Pero el nivel de lectura que muchas veces importa para negocio no es solo el proyecto operativo, sino la iniciativa compartida que los agrupa.

Sin `Campaign`, preguntas como estas quedan mal resueltas o exigen agregacion manual:

- cual fue el `OTD%` de una campana completa
- cuantos assets o tareas produjo una iniciativa cross-service
- que campanas activas tiene hoy un cliente y como se comparan entre si
- como se comporta una misma iniciativa a traves de varios proyectos coordinados

## Definicion conceptual

`Campaign` si es:

- una unidad de iniciativa
- un agrupador canonico de proyectos
- una futura dimension del `ICO Engine`
- una superficie reusable para scopes, vistas client-facing y analitica posterior

`Campaign` no es:

- un sustituto de `Service`
- un sustituto de `Project`
- un roster de equipo propio
- un presupuesto obligatorio en MVP
- un pipeline stage system separado

## Posicion en la jerarquia

Lectura conceptual:

```text
Organization
  -> Space
     -> Campaign
        -> Project links
           -> Source projects
              -> Tasks / Assets
```

Interpretacion:

- `Space` responde a "de que cliente o tenant estamos hablando"
- `Service` responde a "que se vende"
- `Project` responde a "donde se ejecuta el trabajo"
- `Campaign` responde a "para que iniciativa o momento de negocio se esta produciendo"

## Relacion con otros objetos

### Campaign y Space

`Campaign` vive dentro de un `space_id`.
Ese es su boundary operativo, de tenant y de autorizacion.

### Campaign y Project

Una campana puede agrupar multiples proyectos.
Un proyecto puede no pertenecer a ninguna campana.
Dentro del mismo `space_id`, un proyecto no debe pertenecer a multiples campanas activas a la vez.

### Campaign y Service

La relacion con `Service` es derivada en MVP.
Si un proyecto vinculado a una campana se reconcilia con un servicio, entonces ese servicio participa en la campana.

Esa relacion sirve para enrichment y lectura de negocio, pero no debe forzar una tabla canonica extra en la primera fase.

## UX y superficie esperada

La intencion original del brief sigue vigente:

- lectura client-facing via `/campanas`
- detalle por campana con metricas, estado y proyectos vinculados
- superficie interna para CRUD y administracion operativa
- respeto de scopes por `campaign_subset` cuando aplique

La UI concreta, los endpoints y la forma exacta del runtime deben seguir `TASK-017` y la arquitectura viva, no los borradores tecnicos historicos de este brief.

## ICO Engine

La intencion de este brief se mantiene: `Campaign` debe poder leerse como dimension de metricas operativas.

La regla actual es:

- no duplicar formulas para Campaign
- no crear una rama especial del engine solo para esta entidad
- integrar Campaign como una dimension adicional del patron context-agnostic existente

## Alcance funcional que sigue siendo valido

El MVP de `Campaign 360` sigue apuntando a:

- crear el objeto canonico `Campaign`
- asociar proyectos a la campana de forma explicita
- listar y detallar campanas por `space_id`
- habilitar lectura client-facing y operator-facing
- exponer metricas base por campana via ICO

Queda fuera del MVP:

- financial attribution fuerte
- presupuesto y margen obligatorios por campana
- exports enterprise completos
- una capa propia de staffing o roster

## Criterio operativo final

Usar este documento solo para:

- framing de producto
- lenguaje comun de la lane
- decisiones de alcance funcional

No usar este documento para:

- copiar DDL
- definir PK/FK
- fijar joins analiticos
- decidir el source of truth
- modelar tablas finales del runtime

Para implementar, contrastar siempre contra `TASK-017` y la arquitectura vigente del repo.

## Dependencies & Impact

- **Depende de:**
  - `greenhouse_core.spaces` como boundary operativo
  - patron context-agnostic del `ICO Engine`
  - `TASK-002` para mejorar el puente `Space -> Notion -> Projects`
- **Impacta a:**
  - `TASK-015` Financial Intelligence Layer
  - `TASK-020` Frame.io analytics pipeline
  - superficies client-facing de campaign scope
- **Referencia operativa vigente:**
  - `docs/tasks/to-do/TASK-017-campaign-360.md`
