# Diccionario efectivo y captura comercial

Origen/canales: [ADR aceptado19/10](../../../../docs/architecture/EFEONCE_COMMERCIAL_ACQUISITION_TAXONOMY_DECISION_V1.md).
Separación conceptual vigente; schema/backfill aún propuestos. No reinterpretar canal_de_adqusicion,
Traffic Source o Record Source. Conservar histórico; Marketing/multiselect/vacíos requieren evidencia.

## Nombre de Deal y Lead

Aplicar la [convención de nombres](../../../../docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md)
en el changeset: Deal `Marca o cuenta | País | Iniciativa | Referencia`; Lead
`Marca o cuenta | País | Necesidad | Nombre Apellido`. Verificar marca frente a holding, mercado y
referencia; conservar IDs, asociaciones, admisión y nombres históricos. Renombrar exige mandato que
incluya el registro, valor anterior/nuevo y lectura posterior; no normalizar al editar otro campo.

Antes de crear/reutilizar/actualizar Contact, Company, Lead o Deal de Efeonce, cargar el
[manual por objeto y fase](../../../../docs/manual-de-uso/hubspot/llenar-propiedades-comerciales.md) y sólo
las filas necesarias del [inventario fechado](../../../../docs/audits/commercial/hubspot-properties-2026-10-11/README.md).
Incluye 1.126 definiciones activas, CSV completo, metadata JSON íntegra, catálogos externos y diferencias
respecto del contexto Bow-tie histórico. No cargar cuatro dumps completos en contexto por defecto.

Verificar portal/ruta, reconsultar campos/owner/pipeline y conservar semántica, evidencia y desconocidos.
Separar política Efeonce, requisitos de API/MCP y formulario/etapa UI. Editable en metadata no significa
manual ni permitido; calcular/rollup, atribución, acceso y writers Greenhouse mantienen sus owners.
La UI específica y Lead write no quedaron certificados por la auditoría readonly.

Contact conserva email individual corporativo verificado y Primary Company; Company identidad/research/ABM;
Lead calificación asociada; Deal oportunidad/value/compromiso. No sobrecargar fit como interés/contrato,
Lead como lifecycle, cargo como authority ni selección target como calificación. Cohortes fechadas son
históricas: nuevo intake usa researched_on separado en Company/Contact. El catálogo no autoriza mutaciones.

## Convertir evidencia en campos

1. Elegir objeto y fase: investigación de cuenta/persona, calificación, oportunidad, propuesta o cierre.
   Declarar crear/reutilizar/actualizar/no crear por objeto. Contact no implica un Lead nuevo; antes comprobar
   el existente o automático. Un Lead se crea sólo tras una interacción real de una persona registrable
   (respuesta con interés, reunión aceptada, solicitud entrante); investigar y registrar no lo crea. ABM no implica Deal. Usar el portal del mandato, no extrapolar este snapshot.
2. Consultar sólo las filas pertinentes del CSV y su JSON: nombre interno, descripción/grano, tipo,
   opciones, flags de valor/definición, cálculo y writer. Releer en vivo los campos a cambiar y resolver
   sus catálogos externos. Labels similares no autorizan copiar valores entre objetos.
3. Mapear cada dato investigado al campo adecuado, con fuente/fecha/confianza y valor anterior. No dejar
   vacío un dato pertinente ya confirmado por limitarse al mínimo técnico de alta. Conflictos o nueva
   evidencia débil conservan el valor anterior y una brecha explícita hasta resolver identidad/vigencia.
4. Clasificar cada campo: **completar** (hecho nuevo sustentado y dentro del mandato), **conservar**
   (vigente/no-op o writer externo), **pendiente** (desconocido, conflicto o requisito sin verificar),
   **sistema** (read-only, cálculo/rollup/atribución o writer técnico). Una propiedad metadata-writable
   puede pertenecer al sistema. No reemplazar desconocidos por cero, fecha, tier o etapa inventados.
5. Separar mínimo operativo Efeonce, contrato del carril y requisitos UI/etapa. Registrar verificado/no
   verificado/no aplicable por ruta; no bloquear una operación API válida por una regla UI desconocida,
   ni usar API para eludir un requisito comercial o un gate del carril elegido.
6. Entregar la [plantilla de changeset](../templates/account-based-changeset.md), con plan por objeto,
   cambios mínimos, omisiones justificadas y lectura posterior. Reutilizar el mandato vigente sin volver
   a pedir aprobación de sus mismos campos. Releer tras automatización; resultado parcial sigue parcial.

## Familias de captura del portal Efeonce

Resumen del inventario **2026-10-11**; el manual posee criterios completos y el portal posee el catálogo
actual. Son candidatos por evidencia/fase, no required universales ni defaults para todo registro.

| Objeto / fase | Candidatos de captura | Condición |
| --- | --- | --- |
| Company / investigación | `name`, `domain`, `website`, `industry`, `country`, `city`, `hs_employee_range`, `numberofemployees`, `hs_revenue_range`, `annualrevenue`, `linkedin_company_page`, `description`, `hubspot_owner_id`, `efeonce_prospecting_researched_on` | Hechos de cuenta. Rangos son texto; cifras exactas requieren fuente exacta. Fecha de investigación propia de Company. |
| Company / ABM | `hs_is_target_account`, `hs_ideal_customer_profile` | Selección/fit aprobados; no interés comprador. No usar enum oculto `hs_target_account` como checkbox. |
| Contact / investigación | `email`, `firstname`, `lastname`, `jobtitle`, `phone`, `mobilephone`, `hs_linkedin_url`, `country`, `city`, `hubspot_owner_id`, `efeonce_prospecting_contact_kind`, `efeonce_prospecting_researched_on`, `efeonce_prospecting_service_fit` | Correo individual corporativo verificado para alta; empleo/identidad/Primary Company reconciliados. Fit no es interés. Asociación Primary se prepara aparte. |
| Contact / avance comprobado | `hs_lead_status`, `estado_del_lead`, `lifecyclestage`, `hs_buying_role` | Mandato y evidencia de transición/rol; estados custom/nativo distintos y roles globales separados de iniciativa. |
| Lead / calificación | `hs_lead_name`, `hubspot_owner_id`, `hs_lead_type`, `hs_lead_label`, `hs_pipeline`, `hs_pipeline_stage`, `hs_lead_disqualification_reason`, `hs_lead_disqualification_note` | Sólo fase real y asociación válida del carril, conservando email gate; no duplicar Lead. Source analítica no se rellena como Apollo. |
| Deal / oportunidad y propuesta | `dealname`, `pipeline`, `dealstage`, `hubspot_owner_id`, `description`, `canal_de_adqusicion`, `dealtype`, `pipeline_bucket`, `modalidad_de_venta`, `linea_de_servicio`, `servicios_especificos`, `hs_next_step`, `amount`, `deal_currency_code`, `closedate` | Oportunidad/etapa autorizadas y sustentadas. Valor total, moneda y plazo con evidencia; no defaults monetarios. Asociaciones aparte. |
| Deal / licitación o cierre | `id_de_licitacion`, `fecha_de_cierre_de_licitacion`, `ficha_de_licitacion`, `presupuesto_de_la_licitacion`, `closed_won_reason`, `closed_lost_reason` | Sólo si aplica y con fuente; presupuesto del buyer separado de oferta; aceptación/pérdida reales. |

Preservar `gh_*`, MRR/ARR/ACV/TCV calculados, supresión, permisos, atribución y datos declarados en
formularios bajo sus writers. `servicios_contratados` nunca se completa desde fit. En Company no existe
el fit dedicado de Contact: documentarlo en nota/dossier, sin reutilizar propiedades de servicio del Deal.
Ante propiedad ausente/enums sin encaje, entregar brecha al owner; no crear schema como efecto del intake.
