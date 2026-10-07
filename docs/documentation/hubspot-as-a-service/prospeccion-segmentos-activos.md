# Prospección Efeonce: incorporación automática en segmentos

Portal **48713323**. Contrato técnico: [decisión aceptada](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
Operación: [manual](../../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md).
Las expresiones completas, nombres e IDs leídos en HubSpot están en el
[catálogo fechado](../../operations/HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json). Es evidencia de configuración; HubSpot sigue siendo la fuente viva.

## Cómo se incorpora un prospecto

El agente completa las propiedades del registro. HubSpot recalcula la pertenencia a los segmentos nativos
**ACTIVE**, antes llamados listas activas. No se añade manualmente a una lista base, no se filtra por IDs de
registros y no hace falta activar un workflow para esta incorporación. Cambiar una propiedad puede añadir o
retirar al registro del segmento correspondiente; el recálculo es asíncrono.

| Registro | Propiedad | Qué cargar |
| --- | --- | --- |
| Company y Contact, por separado | `efeonce_prospecting_cohorts` | Opción `research_2026_10_06` sólo para el universo autorizado de esa ronda y sus ampliaciones explícitas; conservar otras cohortes |
| Contact | `efeonce_prospecting_contact_kind` | `individual_email`, `individual_no_email`, `shared_inbox` o `identity_pending`, según la identidad/canal respaldados |
| Contact | `efeonce_prospecting_service_fit` | `creative`, `hubspot_crm` o ambas cuando haya evidencia; conservar valores compatibles previos |
| Company | `industry`, `country`, `hs_employee_range` | Industria y datos de cuenta respaldados, usando las opciones exactas existentes |
| Contact | `industria`, `jobtitle`, `email` | Clasificación y datos personales respaldados; no inferir cargo ni inventar email |
| Contact y Company/Deal asociados | Nota CRM | Señal exacta, fuente, fecha, estado del proceso, servicio pertinente e incertidumbres |

La cohorte de empresa no se copia automáticamente al contacto. Tampoco `industry` e `industria` son el mismo
campo ni comparten opciones. El enum de Contact no contiene Química: un contacto puede permanecer en `Otro`
y entrar en Fit creativo, mientras la empresa entra en Química y materiales. Una nota sola no popula filtros.

## Dos universos diferentes

- **144–158:** segmentos generales por atributos de toda la base; pueden incluir registros históricos.
- **159–177:** segmentos de la ronda `research_2026_10_06`; todas sus ramas OR requieren esa cohorte.
- **118/119/140/122/124:** bases estáticas históricas. Conservan evidencia anterior y ya no gobiernan la incorporación automática.

«Nuevo» describe el universo investigado, no que toda empresa se haya creado ahora. No usar `createdate` como
sustituto de origen. Una futura ronda necesita una opción de cohorte y filtros definidos para su propio
universo; el valor de octubre no se asigna a todos los futuros prospectos por conveniencia.

## Catálogo de la cohorte — verificado 2026-10-06

**C** = cohorte. **E** = C + `individual_email` + email presente. Las condiciones de esta tabla son un resumen;
el catálogo enlazado contiene la expresión exacta, incluyendo enums y límites OR. Conteos fechados y solapados.

| ID | Objeto / segmento | Regla adicional a C o E | Miembros |
| --- | --- | --- | ---: |
| 159 | Company · Software | C + `industry` Software | 16 |
| 160 | Company · Retail y consumo | C + industrias de consumo | 11 |
| 161 | Company · Finanzas y seguros | C + industrias financieras | 8 |
| 162 | Company · Educación | C + industrias educativas | 8 |
| 163 | Company · Gobierno | C + industrias gubernamentales | 15 |
| 164 | Company · Chile, rango 51–1.000 | C + país Chile + rangos registrados | 38 |
| 165 | Company · Tecnología Chile, rango 51–1.000 | C + industria tecnológica + país/rango | 15 |
| 166 | Contact · Tecnología | E + `industria=Tecnología` | 16 |
| 167 | Contact · Retail | E + `industria=Retail` | 11 |
| 168 | Contact · Finanzas | E + `industria=Finanzas` | 4 |
| 169 | Contact · Educación | E + `industria=Educación` | 5 |
| 170 | Contact · Gobierno | E + `industria=Gobierno` | 11 |
| 171 | Contact · Roles Marketing/Growth/Comunicaciones | E en cada rama + `jobtitle CONTAINS` | 32 |
| 172 | Contact · Solicitud observada HubSpot | E + `servicio_de_interes` Soporte/Onboarding | 3 |
| 173 | Contact · Solicitud observada Contenido/social | E + `servicio_de_interes` Content Management/Social Media | 1 |
| 174 | Contact · Individuales con email | E | 63 |
| 175 | Contact · Fit HubSpot/CRM | E + fit `hubspot_crm` | 26 |
| 176 | Contact · Fit creativo | E + fit `creative` | 51 |
| 177 | Company · Química y materiales | C + `industry IN ('BUILDING_MATERIALS', 'CHEMICALS')` | 1 |

La cohorte completa contiene **81 empresas y 81 contactos** al cierre documentado; los segmentos de contactos
seleccionan los individuales con email. No sumar sus conteos: un mismo registro puede estar en varios.
Los rangos son clasificaciones registradas, no headcounts exactos.

## Caso comprobado: Sika México

La admisión [LIC-1164](../../commercial/tenders/sika-mexico-campana-creativa-1164/README.md) añadió un contacto
individual con email y fit creativo, y una empresa mexicana con `industry=CHEMICALS`, ambos etiquetados con la
cohorte autorizada. El contacto entró automáticamente en **174 y 176** y quedó fuera de **175**; la empresa
entró en **177**. No se le inventó cargo para entrar en 171 ni interés HubSpot para entrar en 172.

HubSpot generó una empresa vacía a partir del dominio del email, distinto del dominio web oficial. Se verificó
y corrigió Primary hacia la entidad mexicana del deal; la empresa automática quedó secundaria y sin cohorte.
Un dominio de email o una asociación automática no acreditan la entidad legal ni autorizan una fusión.

## Cierre del alta y uso comercial

El alta termina cuando se leen las propiedades escritas, la asociación correcta, las expresiones ACTIVE y la
membresía efectiva. Comparar conjuntos completos contra manifiesto + delta autorizado, incluyendo exclusiones;
si tarda el recálculo, repetir sólo la lectura pendiente. No recrear el contacto ni inscribirlo manualmente.
Procedimiento CLI/MCP y recuperación: manual enlazado.

Para preparar correos, **174** define el universo de individuos con email; **175/176** orientan la propuesta,
**171** ayuda cuando el cargo existe y los sectores aportan contexto. Una empresa en 177 no crea un segmento
de destinatarios de contacto: reconciliar los individuos asociados antes de personalizar por ese sector.
Fit no acredita intención. Los 172/173 incluyen solicitudes observadas, incluso históricas; leer su nota y
fecha/estado. No existe en este catálogo un segmento específico de SEO/AEO/GEO ni uno de licitación abierta.
Conservar esas señales en su fuente/nota hasta definir una propiedad y consumidor compatibles bajo autorización.

Email disponible y pertenencia a un segmento no prueban entregabilidad, vigencia del empleo ni habilitación de
envío. Antes de un envío autorizado se refrescan destinatarios, bajas, supresiones y actividad previa, se
deduplica por contacto y se elige un ángulo inicial. No se activaron campañas, secuencias ni workflows.

Evidencia: [auditoría](../../audits/commercial/2026-10-06-prospeccion-segmentacion-hubspot.md). Los manifiestos y
miembros individuales permanecen fuera de Git; el catálogo sólo contiene definiciones y agregados.
