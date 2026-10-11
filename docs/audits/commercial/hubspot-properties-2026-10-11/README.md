# Inventario de propiedades HubSpot — 2026-10-11

Portal **48713323**, identidad Julio Reyes verificada por Agent CLI y MCP. Tres subagentes revisaron
Contact, Company y Deal/Lead; el agente principal capturó el diccionario completo y reconcilió catálogos.
La captura usa **HubSpot Agent CLI 0.15.1, build 1348**, no la CLI de desarrollo `hs`.

## Cobertura y archivos

| Objeto | Definiciones activas | Valor read-only | Metadata editable | Ocultas | `calculated=true` | `fieldType=calculation_*` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Contact | 454 | 290 | 164 | 110 | 38 | 45 |
| Company | 266 | 176 | 90 | 74 | 6 | 17 |
| Deal | 252 | 199 | 53 | 81 | 36 | 49 |
| Lead | 154 | 139 | 15 | 58 | 41 | 38 |
| **Total** | **1.126** | **804** | **322** | **323** | **121** | **149** |

Las dimensiones se superponen. Las 322 propiedades editables en metadata **no constituyen una lista de
campos de llenado manual**: incluyen controles de acceso, integración, atribución y valores automáticos.

- [CSV completo y filtrable](properties.csv): una fila por objeto/nombre, etiqueta, descripción, tipo,
  grupo interno, flags, número de opciones y tratamiento operativo. [Opciones exactas](property-options.csv)
  tiene una fila por opción incrustada, con objeto/propiedad para filtrar; evita celdas gigantes (por ejemplo,
  `hs_keywords`). Catálogos externos resueltos siguen en su JSON separado. Celda vacía en un flag = atributo omitido,
  no `false`. Tratamiento es triage de revisión; no autorización ni payload de escritura.
- Capturas íntegras de definiciones: [Contact](contacts.json), [Company](companies.json),
  [Deal](deals.json), [Lead](leads.json). Conservan metadatos adicionales y opciones sin reducirlos al CSV.
- [Manifiesto](manifest.json): cobertura, conteos, grupos internos y SHA-256 de las cuatro capturas.
- Catálogos externos consultados: [opciones](external-options.json),
  [pipelines Deal](pipelines-deals.json), [pipelines Lead](pipelines-leads.json).
- [Readback mínimo Lead](lead-pipeline-stage-readback.json): sólo pipeline/etapa de un registro existente;
  se descartaron ID, cursor y datos de la persona. No es una prueba de escritura.
- [Manual de llenado por fase](../../../manual-de-uso/hubspot/llenar-propiedades-comerciales.md).

Son **todas las definiciones activas devueltas** por las cuatro colecciones, incluidas las ocultas, con
`meta.next=null`, 1.126 nombres objeto/nombre únicos y sin filas omitidas. No se solicitó el catálogo de
definiciones archivadas ni se exportó la base de registros. Los JSON originales no contienen correos de
personas ni credenciales. Opciones MCP de propiedades que referencian personas/empresas se excluyeron del
artefacto adicional: esas respuestas pueden contener registros, no sólo configuración.

## Qué llenar

El [manual](../../../manual-de-uso/hubspot/llenar-propiedades-comerciales.md) separa el mínimo operativo
Efeonce, hechos opcionales con evidencia, estados que requieren calificación, y campos del sistema.

| Momento | Representación principal | Campos y evidencia |
| --- | --- | --- |
| Prospección de cuenta | Company | Identidad/dominio reconciliados, fecha de investigación, sector, geografía y tamaño sustentados; owner real. Target/ICP sólo desde selección aprobada. |
| Persona accionable | Contact + asociación Primary Company | Correo corporativo individual verificado, identidad, cargo vigente, fecha, tipo de contacto y evidencia. Fit en Contact; rol de compra sólo si comprobado. |
| Trabajo de calificación | Lead asociado | Nombre, asociación, owner, tipo y etapa efectivos; temperatura respaldada por relación. Reutilizar Lead automático/existente. |
| Oportunidad comercial | Deal asociado | Nombre, pipeline/etapa compatibles, owner, contexto y siguiente paso. Monto/moneda, fecha y oferta sólo cuando existe evidencia suficiente. |
| Cierre | Deal + canon contractual | Ganado/perdido, razón, monto y fecha sustentados; servicios contratados e integración tienen sus propios writers. |

No crear prospect Contact/Lead sin email elegible, ni Deal por completar el inventario. Mantener separados
el estado del Contact, el objeto Lead, lifecycle, target ABM y etapa del Deal. Buscar inicialmente objetivo
+ 2–3 adicionales y ampliar por funciones críticas; la cantidad no prueba calificación o autoridad.

## Discrepancias verificadas

1. `hs_is_target_account` es el checkbox visible de Company; `hs_target_account` es un enum oculto con
   el mismo label. No son intercambiables. `hs_ideal_customer_profile` admite `tier_1`, `tier_2`, `tier_3`.
2. Company `hs_employee_range` / `hs_revenue_range` son **texto**, no dropdowns. `gh_mrr_tier` sólo
   ofrece `active_client` / `pipeline`, no bandas numéricas MRR. `gh_*` conserva ownership Greenhouse.
3. `efeonce_prospecting_service_fit` existe en Contact, **no en Company**. `linea_de_servicio` /
   `servicios_especificos` de Company/Lead tienen descripciones que hablan del Deal: no convertirlos en
   clasificación de fit ni servicio contratado sin resolver su contrato.
4. `efeonce_prospecting_researched_on` existe en Company y Contact. Cohortes fechadas son históricas:
   no agregar opciones ni asignarlas a nuevos intakes, aunque la descripción antigua diga otra cosa.
5. `estado_del_lead` y `hs_lead_status` de Contact tienen catálogos distintos. Cargo, rol de empleo y
   `hs_buying_role` tampoco son sinónimos. Buying role es global, no por iniciativa.
6. El campo Deal es **`modalidad_de_venta`**, no `modalidad_venta`. No aparecen Deal `gate_status`,
   `prospect_source`, `scorecard_result`, `aeo_check_result` o `bucket_reason`. Company sí tiene
   `aeo_check_result`, de otro tipo/grano. Contact `is_advocate_individual` tampoco aparece.
7. `pipeline_bucket` ofrece `Core Pipeline`, `Strategic Bets`, `Opportunistic / Administrative`.
   La metadata y MCP coinciden en estos valores; no escribir el abreviado histórico `Opportunistic`.
8. MCP devuelve **dos pipelines Deal**, no los tres del contexto Bow-tie histórico: ventas (`default`,
   ocho etapas) y Shared Selling (siete etapas). No crear Expansion ni migrar Deals para reconciliar docs.
9. MCP devuelve un pipeline Lead con cinco etapas. `lead-pipeline-id` / `new-stage-id` también se
   leyeron literalmente por CLI en un registro existente. Los nombres de propiedades de tiempo conservan
   otros IDs numéricos; no derivar de ellos IDs para escritura ni inventar equivalencias históricas.
10. MCP y CLI devuelven ocho opciones estándar de lifecycle en Contact/Company; no devuelven `pql` ni
    etapas postventa del diseño histórico. Son los catálogos observados, no una certificación UI de ausencia
    o una autorización para migrar lifecycle. Reconsultar la propiedad antes de cambiarla.
11. `hs_lead_source` describe atribución analítica heredada del registro principal, no Apollo ni
    temperatura. `hs_lead_type` usa `NEW_BUSINESS`, `UPSELL`, `RE_ATTEMPTING`: copiar el ejemplo genérico
    de API con `NEW BUSINESS` sería incorrecto para este catálogo.
12. Monedas Deal resueltas por MCP: **PEN, COP, CLF, MXN, USD, CLP**. `amount` usa moneda del Deal;
    presupuesto del comprador, fee mensual, MRR, neto/IVA y valor total siguen siendo conceptos distintos.

## Límites y verificación pendiente

- Las definiciones no incluyen obligatoriedad del formulario de creación, validaciones detalladas,
  propiedades condicionales por etapa ni todas las automatizaciones. `formField=true` no significa required.
  La UI mostró inicio de sesión; sus reglas particulares no fueron inspeccionadas ni modificadas.
- Metadata accesible y OAuth scopes no prueban permiso de escritura. MCP reportó Lead write como
  `REQUIRES_REAUTHORIZATION` en identidad y `REQUIRES_PERMISSION_MODIFICATION` en descubrimiento. CLI
  pudo leer Lead; no se probó escritura ni se amplió acceso.
- La guía oficial REST v3 Lead exige nombre y Contact asociado; la guía MCP permite Contact **o** Company.
  Conservar el contrato de cada ruta, resolver tipos de asociación en vivo y no usar un payload universal.
- Owner/teams/brands/campañas y otras opciones externas no quedaron inventariadas exhaustivamente;
  los flags se preservan y deben resolverse sólo cuando la operación los requiera. No versionar opciones
  de referencia a registros como si fueran enums estáticos.
- No se auditó cuántos registros están poblados ni la calidad de sus valores. Line Items y contratos no
  forman parte de estos cuatro objetos. Ningún cambio live, enriquecimiento pagado, envío o Deal nuevo.

## Fuentes y actualización

Verificación de artefactos: tres revisiones delegadas aceptaron semántica/cobertura de sus objetos; cotejo
mecánico pasó para 1.126 claves únicas, hashes originales, columnas/flags y las **4.592 opciones incrustadas**.
El CSV de opciones se separó después de la revisión para evitar celdas enormes; su igualdad con todos los
arrays originales fue comprobada nuevamente (máximo de celda: 551 caracteres). Los campos de las tablas
del manual existen en sus objetos. Espejos de skills y enlaces locales se verifican al cierre documental.

Captura readonly: `hubspot whoami`, `hubspot properties list --type <objeto> --format json`, MCP
`GET_PIPELINES` y consultas de propiedades críticas. Verificar nuevamente portal, diccionario y catálogos
antes de un changeset: este snapshot tiene fecha, no congela el portal.

Contratos públicos consultados el 2026-10-11:
[Properties](https://developers.hubspot.com/docs/api-reference/legacy/crm/properties/guide),
[Contact](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide),
[Company](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/companies/guide),
[Deal](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/deals/guide),
[Lead](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/leads/guide) y
[formularios de creación](https://knowledge.hubspot.com/object-settings/set-up-fields-seen-when-manually-creating-records?tab=tab-crm).
La metodología vigente pertenece al [canon de prospección](../../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md)
y al [runbook de carriles](../../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md).
