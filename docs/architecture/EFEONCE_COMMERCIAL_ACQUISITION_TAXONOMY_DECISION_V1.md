# ADR — Origen comercial, canales y fuentes de adquisición

- Status: **Accepted — separación conceptual**; esquema físico y migración **propuestos, no aplicados**.
- Date / Validated as of: **2026-10-19**.
- Owner: Commercial / RevOps; Growth Measurement para contexto de ocurrencia y publicidad.
- Scope: taxonomía de adquisición Efeonce, portal HubSpot48713323, trazabilidad Forms/Meetings/CRM.
- Reversibility: `two-way-but-slow`; conservar histórico y consumidores durante la transición.
- Confidence: alta en separar conceptos; media en equivalencias legacy y baja en cobertura de consumidores.
- Acceptance: el operador aceptó la propuesta de separar origen, canal, fuente, punto de conversión y
  procedencia técnica («Bien me parece tu propuesta»). No se aceptó todavía un payload de schema/backfill.

## Context

Deal `canal_de_adqusicion` mezcla plataforma, relación y mecanismo comercial. Se releyó como
`enumeration/checkbox`, editable, sin descripción y con seis valores. Es multiselección, no un
origen primario único. No se corrige su nombre interno ni se reinterpretan sus valores en sitio.

Discovery readonly19/10:293 Deals no archivados,175 con valor,118 vacíos; dos combinaciones múltiples.
Contact472 y Deal252 definiciones activas releídas. Las tres propiedades candidatas de abajo no
existen en esa lectura; la colección Contact no contiene equivalentes custom de adquisición observados.
[Evidencia agregada, sin IDs personales](../audits/commercial/2026-10-19-acquisition-taxonomy-discovery.json).
No se exportaron nombres, correos o montos de negocios para este análisis; el listado no es una
transacción atómica del portal y requiere un snapshot fresco antes de cualquier escritura.

## Decision

Separar cinco dimensiones, con grano y writers explícitos:

| Dimensión | Definición y autoridad | Reutilización / proyección |
|---|---|---|
| Origen comercial | Cómo se abrió la oportunidad; Commercial/RevOps con evidencia | Deal: inbound, outbound, referral, partner o tender, como enum propuesto |
| Canal de adquisición | Canal del hecho comercial seleccionado, no herramienta ni plataforma | Contexto por ocurrencia; futura proyección Deal del canal primario con criterio explícito |
| Fuente concreta | Plataforma, partner o referencia del hecho seleccionado | Contexto/evidencia del mismo hecho; no email personal en el identificador |
| Punto de conversión | Formulario/surface/versión o binding/booking que confirmó la solicitud | Reutilizar IDs y registros de Forms/Meetings; nunca inferir del nombre de landing |
| Procedencia técnica | Qué proceso creó el registro CRM | Reutilizar Record Source y detalles nativos; no copiarlo como canal publicitario |

HubSpot Original/Latest Traffic Source y sus drill-downs conservan su semántica y writer.
No forzar valores para hacerlos coincidir con la clasificación comercial. Un registro creado por
API puede provenir de un anuncio, prospección o referido: integración no define adquisición.
[Traffic Source](https://knowledge.hubspot.com/properties/understand-traffic-source-properties) y
[Record Source](https://knowledge.hubspot.com/properties/view-and-use-the-record-source-property), consultados19/10.

Temperatura, fit, lifecycle, etapa Lead/Deal, tipo de negocio, modalidad de venta y bucket son otras
clasificaciones. No cambiar esas propiedades ni crear Lead/Deal para completar la nueva taxonomía.
Apollo/CLI/MCP/Outlook pueden ser herramientas de investigación u operación, sin ser la fuente de
adquisición del comprador. Una publicación LinkedIn investigada no equivale a LinkedIn Ads.

## Physical schema candidate — no creado

Tras revisar reutilización y consumidores, se proponen sólo tres propiedades Deal en el grupo ya
existente `dealinformation`; **nombres y opciones aún son payload para revisión**, no contrato runtime:

| Nombre candidato | Tipo | Regla |
|---|---|---|
| `ef_acquisition_origin` | enum/select | inbound, outbound, referral, partner, tender; vacío cuando no se conoce |
| `ef_acquisition_channel` | enum/select | Canal primario; catálogo completo en evidencia, sin default automático |
| `ef_acquisition_source` | string/text | Slug controlado de fuente del hecho primario; sin PII ni texto libre de la conversación |

El catálogo de canales propuesto distingue búsqueda/social pagados y orgánicos, email marketing,
email outbound/inbound, referencias IA/web, acceso web directo, teléfono, mensajería, presencial,
plataforma de compras y otro canal documentado. Ausencia de evidencia queda vacía; no asignar
`direct_web`, `inbound` ni `other` como relleno. No se crean cinco campos por objeto ni se sincroniza
ciegamente el mismo dato entre Company/Contact/Lead/Deal.

Las tres propiedades serían una **proyección para operar/reportar**, no el historial de atribución.
Varias solicitudes por contacto y varios contactos/negocios requieren vínculos por ocurrencia,
fecha, fuente, propósito y criterio de selección. Ese vínculo no nace al crear estas propiedades.
No sobrescribir una atribución primaria por el último clic ni inferir ingreso por la misma Company.
Una fuente de investigación se conserva como evidencia de señal; no se transforma en fuente de
tráfico de un email posterior. El contexto debe indicar qué hecho y rol representa cada observación.

## Historical mapping candidate

| Legacy exacto, si es valor único | Origen candidato | Canal / fuente candidatos | Negocios |
|---|---|---|---:|
| WherEX | tender | procurement_platform / wherex |24|
| Mercado público | tender | procurement_platform / mercado_publico |96|
| Partnership | partner | Sin inferir plataforma o partner concreto |5|
| Referidos | referral | Sin inferir quién refirió ni por qué canal |10|
| Prospección directa | outbound | Sin inferir Apollo, LinkedIn, email o llamada |33|
| Marketing | Revisión | No determina inbound ni pago/orgánico |5|
| Marketing + Prospección directa | Revisión | No elegir prioridad ni descartar un valor |2|
| Vacío | Revisión | Sin reconstrucción automática |118|

**168 candidatos de traducción y125 pendientes de revisión; cero migrados.** La equivalencia reproduce
clasificación legacy, no vuelve a verificar la demanda, el origen histórico real ni la atribución Ads.
Las177 selecciones incluyen doble conteo de los dos registros múltiples;175 registros tienen valor.
No convertir esta tabla en KPIs de adquisición sin denominador, cobertura y validación de negocio.

## Consumers, rollout and closure

- Listado de86 informes completo por paginación;82 devuelven config no vacía. No hubo coincidencias
  literales del nombre legacy en esa metadata/config. No certifica todas las definiciones, IDs
  indirectos o consumidores externos. Un GET de informe de sondeo pasó, no un censo exhaustivo de GETs.
- Cero segmentos propios de Deal devueltos para objectType0-3; no cubre segmentos Contact/Company
  con filtros de asociaciones. Vistas, formularios y consumidores externos no están completos.
- Workflows v4: lectura403 por scopes. No reautorizar, usar otra identidad o elevar privilegios
  para ocultar ese hueco. No se certifican workflows clásicos ni reglas UI.
- Referencias versionadas encontradas en el manual comercial y property-inventory de la skill;
  no se detectó referencia literal en los runtime/scripts escaneados. No equivale a ausencia global.

Antes de writes: completar consumers, revisar schema exacto, snapshot de valores/asociaciones,
manifest de filas aprobado, precondiciones metadata/valor vigente/targets vacíos y exclusión de
triggers de conversión por backfill. Crear schema y verificarlo es distinto de poblar registros,
cambiar informes o activar automatizaciones. No borrar ni renombrar el legacy. Cada lote debe
conservar antes/después, readback y recuperación; unknown exige reconciliar antes de repetir.

## Alternatives considered and consequences

Ampliar el enum viejo mantendría una mezcla de dimensiones y multiselección. Reescribir campos
nativos alteraría su contrato de tráfico/creación. Crear todos los campos en cada objeto produciría
writers contradictorios. Se conserva lo nativo, se propone una proyección mínima de Deal y se
mantiene identidad por ocurrencia para la evolución de medición.

Costos: convivencia temporal, reglas de cobertura, consumidores todavía no auditados y revisión
manual del histórico ambiguo. Beneficio: separar demanda, procedencia y herramientas sin inventar
canales ni borrar evidencia.

## Runtime contract / Revisit when

Hoy mandan el portal y los contratos existentes; no hay nuevo writer, propiedad, workflow,
evento publicitario, SQL ni deploy. Este ADR gobierna la separación conceptual aceptada.
Reabrir nombres/catalogo al completar consumers o aparecer campos equivalentes; revisar atribución
primaria si hay múltiples solicitudes, cambios de canal, distintos negocios o consentimiento tardío.
[Funcional](../documentation/hubspot-as-a-service/origen-canales-adquisicion.md) ·
[Manual de transición](../manual-de-uso/hubspot/normalizar-origen-canales-adquisicion.md).
