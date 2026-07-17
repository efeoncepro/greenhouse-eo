# ANAM — Deal execution countries change set — 2026-07-17

> **Cliente:** ANAM
> **Portal HubSpot:** `19893546`
> **Objeto:** Deal
> **Estado:** ejecutado y verificado
> **Boundary:** este cambio pertenece al portal ANAM; no proyecta datos hacia Greenhouse ni modifica el portal Efeonce `48713323`

## Decisión y evidencia de negocio

Las reuniones live de Notion sostienen dos hechos estables:

- el 2025-11-10 ANAM pidió registrar qué se ganó y dónde se ganó, incluyendo región/zona;
- el 2026-03-18 María Paz explicó que la sede de una Company puede estar en Santiago mientras un Deal se ejecuta
  en Punta Arenas o en múltiples regiones, y se acordó una selección múltiple al adjudicar/cerrar.

La evidencia explícita cubre geografía de ejecución y multiselección en Chile. La extensión a países de
Latinoamérica fue solicitada y aprobada posteriormente por el operador para permitir negocios ejecutados fuera
de Chile. No se reinterpreta el país de la Company ni se infieren países históricos.

## Contrato de propiedad

| Campo | Contrato vigente |
|---|---|
| Definición de negocio | País o países donde se ejecutará o se ejecutó el negocio. |
| Objeto dueño | Deal: la geografía pertenece a la oportunidad/ejecución, no al domicilio del cliente. |
| Label visible | `Países de ejecución` |
| Internal name | `ef_paises_de_ejecucion` |
| Grupo | `dealinformation` |
| Tipo | `enumeration` |
| Field type | `checkbox` / selección múltiple |
| Fuente | Captura humana por owner/equipo comercial del Deal. |
| Momento esperado | Antes o durante la adjudicación/cierre; no existe aún enforcement por etapa. |
| Privacidad | Dato comercial no sensible. |
| Backfill | Ninguno. No inferir desde Company, dirección, nombre, notas ni dominio. |
| Consumers actuales | Captura y futura segmentación diagnóstica; no hay reporte, workflow ni KPI oficial habilitado por este cambio. |
| Deprecación/rollback | Archivar la propiedad sólo mediante change set aprobado; mientras esté vacía no existe pérdida de valores. |

El prefijo `ef_` es obligatorio para propiedades gestionadas por Kortex. Cumple la convención acordada: label
natural para usuarios e internal name estable en `snake_case`.

## Opciones activas

| Label | Valor interno | Label | Valor interno |
|---|---|---|---|
| Argentina | `argentina` | Bolivia | `bolivia` |
| Brasil | `brasil` | Chile | `chile` |
| Colombia | `colombia` | Costa Rica | `costa_rica` |
| Cuba | `cuba` | Ecuador | `ecuador` |
| El Salvador | `el_salvador` | Guatemala | `guatemala` |
| Haití | `haiti` | Honduras | `honduras` |
| México | `mexico` | Nicaragua | `nicaragua` |
| Panamá | `panama` | Paraguay | `paraguay` |
| Perú | `peru` | República Dominicana | `republica_dominicana` |
| Uruguay | `uruguay` | Venezuela | `venezuela` |

## Relación con las propiedades geográficas

| Propiedad | Objeto | Significado | Uso correcto |
|---|---|---|---|
| `region_de_chile` | Company | Región de sede/domicilio de la cuenta. | Dimensión estable de Company cuando está verificada. |
| `zona` (`Región`) | Deal | Una o más regiones chilenas donde se ejecuta el negocio. | Captura de ejecución dentro de Chile. |
| `ef_paises_de_ejecucion` | Deal | Uno o más países donde se ejecuta el negocio. | Captura LATAM; usar Chile junto con `zona` cuando corresponda. |

Las dimensiones de ejecución son multivaluadas y no aditivas. Un Deal con Chile y Perú representa una sola
oportunidad: un reporte por país puede mostrarlo en ambos grupos, pero no debe sumar ambos grupos como total
consolidado sin deduplicar por Deal.

## Change set ejecutado

El release final contenía exclusivamente la creación de `ef_paises_de_ejecucion`: cero workflows, cero
pipelines, cero UI extensions, cero cambios de registros y cero backfill.

| Evidencia | ID / resultado |
|---|---|
| Strategy workspace Kortex | `36700b8d-c1e8-4b34-ab22-1acf0794bcef` |
| Strategy input | `ac82d8ed-91c4-488c-8798-923492b5d77f` |
| Portal Kortex / HubSpot | `af9faacf-9f28-495e-a7e9-0f94eb37b615` / `19893546` |
| Compilación final | `a8575c72-a496-4aa3-9526-7ccf67c4dd58` |
| Aprobación | `15a9b42c-52f4-4398-99a0-3851aec1e62b` |
| Release candidate | `6533ebe9-d910-4ba1-ac97-53056d11f8ed` |
| Dry run | `4aca0530-3b95-4e5f-bd4c-501cec536a88` — completado; diff: crear una propiedad Deal |
| Ejecución | `2c80ce1a-0527-471b-a1c4-8ac40a7164e8` — completada; propiedad creada `1`, errores `0` |

Un release candidate previo (`a033ea0a-961f-4c05-8448-9611ec17f67b`) falló en preflight porque el internal
name propuesto, `paises_de_ejecucion`, no incluía el prefijo gobernado `ef_`. El guardrail detuvo la operación
antes de HubSpot; no hubo write parcial. La compilación, aprobación y RC posteriores reemplazaron ese intento.

## Readback runtime

La API de HubSpot devolvió una propiedad activa, no archivada y editable (`readOnlyValue: false`) con label,
internal name, grupo, tipo, descripción y las 20 opciones exactas de este documento. Una búsqueda
`HAS_PROPERTY` devolvió `0` Deals con valor, consistente con la decisión de no hacer backfill.

`formField: false` describe su exposición a formularios públicos; no prueba que la propiedad haya sido agregada
a un formulario de creación de Deal o marcada obligatoria por etapa. La propiedad es CRM-editable, pero la
ubicación/requiredness visible debe verificarse y aprobarse como un slice separado si ANAM desea enforcement.

## Fuera de alcance y siguientes controles

- no se modificó el formulario de creación de Deal;
- no se configuró obligatoriedad por etapa;
- no se creó workflow, tarea automática, backfill ni inferencia;
- no se creó un gráfico por país ni se declaró un KPI oficial;
- no se modificó `zona`, `region_de_chile`, Companies duplicadas ni asociaciones;
- no se mutó Notion.

El siguiente control recomendado es captura prospectiva: ANAM debe completar ambos campos de ejecución en los
Deals adjudicados que correspondan. Un reporte por país sólo debe avanzar cuando exista población suficiente,
denominador, cobertura y regla explícita de deduplicación.

## Decisión arquitectónica

No se requiere ADR nuevo. Es una propiedad aditiva, reversible y acotada a un portal cliente, coherente con el
modelo ya canónico donde Deal posee el contexto comercial/de ejecución y Company conserva la sede. No cambia
source of truth compartido, schema de Greenhouse ni una integración estructural.
