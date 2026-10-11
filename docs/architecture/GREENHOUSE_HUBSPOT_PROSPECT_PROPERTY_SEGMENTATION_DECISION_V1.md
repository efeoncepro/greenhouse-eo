# HubSpot: segmentos activos de prospección por propiedades

## Status

- **Status:** Accepted — instrucción y corrección explícitas del operador, 2026-10-06.
- **Owner:** Commercial / RevOps; Julio Reyes aprueba el alcance y las clasificaciones.
- **Scope:** operación directa del portal Efeonce `48713323`, cohortes de empresas/contactos y segmentos nativos.
- **Reversibility:** two-way; conservar prestate de atributos y filtros para restaurarlos sin borrar registros.
- **Confidence:** high en el contrato; implementación y membresía requieren readback independiente.
- **Validated as of:** 2026-10-11 para el límite por fecha (ver Delta 2026-10-11); 2026-10-06 para el contrato original: cuatro definiciones por Agent CLI `0.15.1`, cohorte 81/81 tras Sika y 19 membresías completas por lector MCP independiente. Catálogo y deltas fechados enlazados abajo.

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

### Evidencia posterior sin cambio de decisión — 2026-10-07

[Admisión LIC-1169](../commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md): nueva oportunidad
con Company/Contact reutilizados, sin cambios de esquema, propiedades, cohortes o expresiones. Se leyó pertenencia
individual Contact 174/176 y Company 177; no se volvió a enumerar toda la cohorte ni actualizar sus totales.
La nota del Deal conserva la intención del proceso y la responsabilidad del contacto pendiente. Es aplicación
del contrato existente, no ampliación del universo ni revisión de la decisión aceptada.

### Ronda adicional — 2026-10-08

Aplicación del contrato de rondas independientes: nueva opción research_2026_10_08 en Company y Contact,
sin reemplazar cohortes ni reglas previas. ACTIVE 178 clasifica personas con/sin email por fit creativo de esa
ronda; ACTIVE 179 selecciona sus empresas. Se verificaron conjuntos completos de dos contactos y dos empresas,
asociaciones Primary y notas de fuente. 178 no acredita disponibilidad/entregabilidad de correo ni autorización
de envío. [Auditoría y expresiones](../audits/commercial/2026-10-08-creative-prospect-intake.md).

### Delta 2026-10-11 — la fecha de investigación sustituye a las cohortes fechadas

Decisión del operador (Julio Reyes, 2026-10-11): una opción de enum por día de trabajo no escala, porque cada
ronda exige un cambio de esquema. Desde esta fecha el universo de prospección se delimita con una propiedad de
fecha, no con una opción nueva.

| Objeto | Propiedad | Tipo | Regla |
| --- | --- | --- | --- |
| Company, Contact | `efeonce_prospecting_researched_on` | date | Fecha de la investigación más reciente. Se escribe en cada alta o reinvestigación, en ambos objetos por separado. |
| Company, Contact | `efeonce_prospecting_cohorts` | enumeration | **Histórica.** Conserva sus cuatro opciones (06, 08, 09 y 10 de octubre) y sus valores; no recibe opciones ni asignaciones nuevas. |

- Los ACTIVE **180–187** («Prospección continua») conservan ID y cambian su límite de
  `efeonce_prospecting_cohorts IS NOT NULL` a `efeonce_prospecting_researched_on IS NOT NULL`; el resto de cada
  expresión no cambió.
- Los ACTIVE por ronda **159–179** quedan intactos sobre la propiedad histórica. No se crean segmentos por ronda
  nuevos: una vista por período es un filtro de fecha sobre la propiedad, no una opción ni un segmento.
- La fecha guarda sólo la última investigación. El historial de rondas de un registro reinvestigado vive en sus
  notas CRM, que ya registran cada señal con fuente y fecha.
- Alternativa descartada de nuevo: fecha de creación del CRM. La propiedad nueva se escribe de forma explícita
  al investigar, así que cubre empresas preexistentes reinvestigadas.

Aplicación verificada el 2026-10-11 con Agent CLI `0.15.1`: definición creada en ambos objetos; **96 contactos y
91 empresas** fechados desde su cohorte (la empresa con dos cohortes tomó la más reciente), con cero faltantes,
cero extras, cero fechas distintas a la esperada y cero cohortes alteradas; ocho definiciones leídas de vuelta
idénticas a lo previsto. Totales de membresía por lector MCP antes → después: 180 **96 → 97**, 181 **78 → 78**,
182 **59 → 59**, 183 **31 → 31**, 184 **9 → 10**, 185+186 **9 → 9**, 187 **91 → 92**. Las diferencias corresponden
al único alta del día (un contacto sin email y su empresa), que entró sólo por fecha, sin cohorte. Los totales
son conteos; no se enumeraron los conjuntos completos de membresía. Recuperación: restaurar las ocho expresiones
desde el prestate; la propiedad histórica no se modificó salvo su etiqueta.

### Aplicación por cuentas bancarias — 2026-10-11

ACTIVE **188** aplica el contrato continuo: fecha conocida AND `individual_email` AND email conocido AND
`associatedcompanyid IN (...)` con los 14 Company IDs aprobados. El último término es la empresa principal
del Contact, no su dominio de correo ni una lista estática de Contact IDs. Selección explícita autorizada por
el operador; no crea propiedad, enum diario ni nuevo límite por ronda. La incorporación sigue siendo nativa
y automática dentro de esas cuentas; añadir otra cuenta requiere ampliar la definición autorizada.

[Snapshot exacto y agregado](../operations/HUBSPOT_BANKS_SEGMENT_2026-10-11.json) y
[expediente](../commercial/prospects/bancos-chile-2026-10/README.md): 28 miembros enumerados por lector MCP,
cero faltantes/extras, definición ACTIVE leída por CLI y tamaño procesado en UI. Aplicación del ADR existente,
sin cambio de source of truth, permisos o propiedades. No altera 180–187 ni las rondas históricas.

## Revisit when

Cambie la granularidad de cohortes, se requiera ingestión programada o sincronización cross-object, o un campo
existente pase a representar exactamente estos hechos. Automatización de ingestión y cambios de canal requieren
su propia autorización; esta decisión sólo configura clasificación y selección nativa activa.
