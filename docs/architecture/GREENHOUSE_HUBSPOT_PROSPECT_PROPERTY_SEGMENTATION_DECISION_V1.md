# HubSpot: segmentos activos de prospección por propiedades

## Status

- **Status:** Accepted — instrucción y corrección explícitas del operador, 2026-10-06.
- **Owner:** Commercial / RevOps; Julio Reyes aprueba el alcance y las clasificaciones.
- **Scope:** operación directa del portal Efeonce `48713323`, cohortes de empresas/contactos y segmentos nativos.
- **Reversibility:** two-way; conservar prestate de atributos y filtros para restaurarlos sin borrar registros.
- **Confidence:** high en el contrato; implementación y membresía requieren readback independiente.
- **Validated as of:** 2026-10-06; cuatro definiciones por Agent CLI `0.15.1`, cohorte 81/81 tras Sika y 19 membresías completas por lector MCP independiente. Catálogo y deltas fechados enlazados abajo.

## Context

Los segmentos derivados 159–176 eran ACTIVE, pero dependían de bases estáticas de origen, correo individual y
fit. Completar industria/cargo no incorporaba por sí solo a un prospecto nuevo. El operador exige que la carga
de propiedades produzca la incorporación automática, conservando el límite entre estas búsquedas y el CRM histórico.

## Decision

El origen de investigación es un atributo explícito del registro. Los segmentos activos consumen ese atributo
y las propiedades de industria, cargo, tamaño, tipo de contacto y fit; no dependen de inscripciones manuales a
listas estáticas. Las listas originales se conservan como evidencia histórica y dejan de ser consumidores operativos.
La aplicación a una cohorte sólo alcanza IDs reconciliados contra su manifiesto y ampliaciones autorizadas.

| Objeto           | Propiedad                          | Tipo / presentación    | Significado y valores iniciales                                                                                                       |
| ---------------- | ---------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Company, Contact | `efeonce_prospecting_cohorts`      | enumeration / checkbox | Rondas verificadas; `research_2026_10_06`, «Búsquedas 06-10-2026». Admite rondas independientes múltiples.                            |
| Contact          | `efeonce_prospecting_contact_kind` | enumeration / select   | `individual_email`, `individual_no_email`, `shared_inbox`, `identity_pending`; clasificación de identidad/canal, no permiso de envío. |
| Contact          | `efeonce_prospecting_service_fit`  | enumeration / checkbox | `creative`, `hubspot_crm`; clasificaciones comerciales independientes, no intención declarada ni servicio contratado.                 |

Grupo de negocio por objeto: `efeonce_prospecting`, «Prospección Efeonce». Campos editables ordinarios, sin IA,
unique key ni formularios públicos. No contienen PII; la evidencia individual permanece en las notas del CRM y
artefactos locales controlados. No cambia la retención ni concede acceso. Nuevas opciones requieren un universo
definido y diccionario actualizado. Añadir una cohorte conserva los valores previos; no reemplazarlos por la última.

## Runtime contract

1. Alta/reuso autorizado → verificar identidad, asociaciones, fuentes y estado previo.
2. Poblar cohorte en empresa/contacto y los atributos respaldados; clasificar tipo de contacto y fit.
3. Toda rama OR de un segmento de búsquedas exige el valor de cohorte. Los segmentos individuales con email
   exigen además `individual_email` y email presente; esto no prueba consentimiento, ausencia de bajas o entregabilidad.
4. Reusar `industria` de Contact y `industry` de Company, sin copiarlos por similitud de nombre. Conservar los
   filtros sectoriales y de cargo/tamaño. Fit 175/176 lee la nueva propiedad; 172/173 conserva la solicitud observada
   compatible con `servicio_de_interes` y su nota de fuente. Una solicitud audiovisual no se traduce a Social Media.
5. La carga no está terminada hasta leer atributos y membresía efectiva, positivos y negativos. Una propiedad
   guardada no demuestra que el segmento la consuma ni que la propagación haya terminado.
6. Revalidar el destinatario y actividad previa antes de un envío autorizado; no activar campañas/workflows/secuencias.

## Alternatives considered

- Industria/cargo sobre todo el CRM: descartado para búsquedas específicas porque incorpora registros antiguos.
- Bases estáticas + derivados activos: válido como snapshot, descartado como método ordinario de incorporación.
- Fecha de creación: descarta empresas existentes reinvestigadas y no acredita origen.
- Reusar campos de servicios contratados, interés o flags del agente: mezcla significados y autoridad del escritor.

## Consequences and verification

Se introduce un diccionario mínimo de cuatro definiciones (cohorte en dos objetos y dos campos de Contact).
Los 18 segmentos conservan IDs y tipo ACTIVE; el reemplazo de filtros ocurre después de poblar y verificar el
manifiesto. El prestate y los filtros originales permiten recuperar el estado previo. La corrección manual
intermedia de una base no se presenta como automatización ni como snapshot original intacto.

Corte previo a Sika: 80 empresas y 80 contactos con valores exactos, 18 filtros sin dependencias estáticas,
18 conjuntos sin faltantes/extras y 15 definiciones globales preservadas. Universo individual con email: 62;
Retail 11, roles 32, fit creativo 50, fit CRM 26.

Extensión autorizada Sika LIC-1164: cohorte **81 empresas/81 contactos**, 174 **63**, 176 **51**, 175 **26**; nuevo
ACTIVE **177 Química y materiales** en Company, cohorte AND `industry IN ('BUILDING_MATERIALS', 'CHEMICALS')`.
Nueva lectura completa: 34 definiciones (19 de cohorte, 15 generales) y 19 conjuntos exactos, sin faltantes ni
extras; los 18 filtros anteriores y 15 globales no cambiaron. [Catálogo exacto fechado, sin PII](../operations/HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json).
La [documentación funcional](../documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md) relaciona
propiedades, segmentos y caso Sika. El alcance de esta ronda admite deltas explícitos; no es la etiqueta por
defecto para todas las rondas futuras.

Procedimiento y estado verificado: [manual](../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md),
[runbook](../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md) y
[auditoría](../audits/commercial/2026-10-06-prospeccion-segmentacion-hubspot.md).
La skill dueña es `hubspot-as-a-service` → `references/prospecting-segmentation.md`, espejada en Codex/Claude.

## Revisit when

Cambie la granularidad de cohortes, se requiera ingestión programada o sincronización cross-object, o un campo
existente pase a representar exactamente estos hechos. Automatización de ingestión y cambios de canal requieren
su propia autorización; esta decisión sólo configura clasificación y selección nativa activa.
