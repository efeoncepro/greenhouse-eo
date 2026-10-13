# Llenar propiedades comerciales de HubSpot

Owner: HubSpot / Commercial. Portal de esta guía: **48713323**. Diccionario observado:
[inventario completo 2026-10-11](../../audits/commercial/hubspot-properties-2026-10-11/README.md),
[CSV](../../audits/commercial/hubspot-properties-2026-10-11/properties.csv) y cuatro JSON originales.
Es una guía de captura; no un script ni aprobación de escritura.

## Antes del changeset

1. Leer el [runbook Agent CLI/MCP](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md), verificar
   usuario/portal y ruta exacta. Permiso/metadata de un portal no se hereda a ANAM u otros clientes.
2. Reconsultar propiedades a tocar, enums externos, owner y pipeline/etapas. El snapshot acelera el
   trabajo, pero la respuesta actual prevalece. Filtrar CSV por `object` y `name`; revisar JSON para
   descripción completa, `modificationMetadata`, cálculo, opciones y ownership.
3. Buscar registros existentes y resolver identidad/empleador/Primary Company. No duplicar Contact,
   Company, Lead automático o Deal; un miss de search puede ser demora de indexación.
4. Separar lo requerido por política Efeonce, por el canal API/MCP/CLI, y por formulario/etapa del portal.
   No deducir los dos últimos de `formField`, label o `readOnlyValue=false`.
5. Preparar valores con fuente/fecha, IDs de asociaciones, campos que se preservan y desconocidos.
   Reutilizar autorización explícita vigente; los nuevos objetos o cambios fuera de ella siguen separados.

## Preparar el plan de captura

Antes de pasar a las tablas, preparar el plan de captura del
[changeset HubSpot](../../../.codex/skills/hubspot-as-a-service/templates/account-based-changeset.md):
objeto/fase, crear/reutilizar/actualizar/no crear, campos a completar con fuente, a conservar, pendientes
y del sistema. Incluir los datos pertinentes confirmados, además del mínimo de alta; registrar omisiones
y requisitos operativo/carril/UI por separado. Este plan se entrega aunque la ejecución siga pendiente.

## Contact: persona accionable

| Uso | Campos | Cuándo poblar |
| --- | --- | --- |
| Admisión de prospecto | `email`, `firstname`, `lastname` | Correo corporativo **individual verificado contra la persona** e identidad reconciliada; usar sólo nombres conocidos, sin expandir iniciales por intuición. Sin email elegible: investigación o nota de Company autorizada y buscar contactos relacionados. |
| Intake actual | `efeonce_prospecting_contact_kind`, `efeonce_prospecting_researched_on` | Para nuevos prospectos elegibles, `individual_email`; fecha de investigación real en Contact, separada de Company y de createdate: el día en que se verificó la evidencia, no el de la escritura; si pasan más de 7 días, revalidar empleo y correo y escribir esa fecha. Las opciones no-email existentes no permiten crear nuevos contactos vacíos. |
| Vinculación | Asociación Primary Company; `hubspot_owner_id` | Empresa/empleo vigente y asignación sustentados. `company` texto no crea Primary; `associatedcompanyid` no sustituye el contrato de asociaciones. Owner requiere ID actual, no email/nombre. |
| Hechos opcionales | `jobtitle`, `phone`, `mobilephone`, `hs_linkedin_url`, `country`, `city` | Cargo/permanencia y datos atribuibles a esa persona. Sede de la empresa no prueba ubicación del individuo. No inventar ni completar rangos con cifras exactas. |
| Fit | `efeonce_prospecting_service_fit` | Sólo `creative` / `hubspot_crm` cuando encaje investigado y compatible con el segmento. Se decide por la función propia de la persona y el encaje de la cuenta; la señal de otra persona no cuenta. Sin valor aplicable, vacío y reportado. No significa interés ni contrato. |
| Calificación/compra | `hs_lead_status`, `estado_del_lead`, `lifecyclestage`, `hs_buying_role` | Estado o participación comprobados y mandato. No hay mapping aprobado automático entre estados custom/nativo. Buying role global: preservar selecciones existentes; mapa por iniciativa en nota/dossier. No atribuir authority por cargo. |

Guardar procedencia de email, verificación/vigencia, señal pública, relación real y desconocidos en nota/
dossier aprobado; el catálogo no tiene un campo inequívoco para toda esa evidencia. Investigación no
convierte a alguien en SQL. Leer supresión/bounce/opt-out antes de cualquier envío autorizado por separado.
`gh_form_*`, presupuesto/timing e interés declarados se conservan como respuestas reales; no se rellenan
desde investigación como si hubiera existido un formulario. `servicios_contratados` requiere contrato.

## Company: cuenta

| Uso | Campos | Cuándo poblar |
| --- | --- | --- |
| Identidad | `name`, `domain`, `website`, `hubspot_owner_id` | Entidad y dominio reconciliados, dedupe y owner real. Dominio no es sustituto de identidad legal ni garantiza dedupe por API. |
| Investigación | `efeonce_prospecting_researched_on`, `description`, `industry`, `country`, `city`, `linkedin_company_page` | Fecha real y hechos de cuenta con fuente. `industry` usa enums de Company; no copiar el texto/enum distinto de Contact. |
| Tamaño/economía | `hs_employee_range`, `numberofemployees`, `hs_revenue_range`, `annualrevenue` | Rangos como texto; número sólo si exacto y respaldado. Ingreso estimado de empresa no es presupuesto comprador; documentar unidad/fecha/fuente. |
| Selección ABM | `hs_is_target_account`, `hs_ideal_customer_profile` | Cuenta elegida y tier sustentado en modelo aprobado; `tier_1` / `tier_2` / `tier_3`. Selección no declara intención, relación cálida ni compra. |
| Estado comercial | `type`, `hs_lead_status`, `lifecyclestage` | Sólo clasificación/transición real. No sobrescribir una empresa existente a PROSPECT/Lead por reinvestigarla. |

Company no tiene `efeonce_prospecting_service_fit`. Su `linea_de_servicio` / `servicios_especificos` no
son reemplazos de fit. Preservar cohorts históricas sin nuevas asignaciones. `gh_*`, contratos, MRR/ARR,
actividad nativa y `hs_current_customer` tienen writers propios; prospecting no los completa manualmente.

## Lead: calificación

Un Lead se crea sólo tras una interacción real de una persona registrable: respuesta con interés, reunión
aceptada o solicitud entrante. Investigar y registrar una cuenta no lo crea, ni una señal pública de alguien
sin correo. Primero comprobar si ya existe. Hasta el 2026-10-12 una automatización del pipeline de Leads creaba
uno cada vez que un contacto pasaba a la etapa `Lead` (origen «Create Lead Upon Contact LCS Update»): generó
2.222 de los 2.251 Leads del portal, así que un Lead existente no prueba calificación. Se apagó ese día;
desde entonces un Lead sólo existe si alguien lo crea. Un Lead nuevo sigue el gate de correo del
Contact asociado, aunque el canal permita asociarlo sólo a Company. No usar Company-only para eludirlo.

| Uso | Campos | Cuándo poblar |
| --- | --- | --- |
| Base | `hs_lead_name`, `hubspot_owner_id`, asociaciones | Nombre significativo, contacto elegible y cuenta reconciliados; owner con acceso/asiento adecuado para trabajar en workspace. |
| Tipo | `hs_lead_type` | `NEW_BUSINESS`, `UPSELL`, `RE_ATTEMPTING` según iniciativa real; cliente existente no prueba upsell. |
| Relación | `hs_lead_label` | `COLD`, `WARM`, `HOT` sólo con sustento; existir en CRM, encajar en ICP o publicar una búsqueda no prueba relación cálida con Efeonce. |
| Trabajo efectivo | `hs_pipeline`, `hs_pipeline_stage` | Catálogo actual y fase observada; no Qualified por crear Contact o completar buying group. |
| Descalificación | `hs_lead_disqualification_reason`, `hs_lead_disqualification_note` | Motivo real y explicación, conservando diferencia entre mal timing, ausencia de presupuesto/authority y rechazo. |

`hs_lead_source` es atribución heredada, no origen Apollo. `hs_primary_contact_id` /
`hs_primary_company_id` son read-only: usar asociaciones, no PATCH de esos campos. Los dos custom de
servicio en Lead tienen semántica Deal ambigua: no poblar por defecto.

## Deal: oportunidad y avance

La creación depende de oportunidad/calificación y alcance autorizado; no de cantidad de contactos o
selección ABM. La relación comercial y los [criterios Commercial](../../../.codex/skills/commercial-expert/SKILL.md)
se documentan aunque no existan campos custom para todos ellos.

| Momento | Campos | Cuándo poblar |
| --- | --- | --- |
| Creación | `dealname`, `pipeline`, `dealstage`, `hubspot_owner_id`, `description`; asociaciones Company/Contact | Identidad, oportunidad, dueño y evidencia de etapa. Pipeline y etapa deben pertenecer al mismo catálogo. No usar pipelines narrativos ausentes. |
| Origen/encaje de oportunidad | `canal_de_adqusicion`, `dealtype`, `pipeline_bucket`, `modalidad_de_venta` | Nombres exactos, incluso el typo `adqusicion`; valor interno vigente y razón sustentada. Origen no impone bucket sin evaluar la oportunidad. |
| Alcance definido | `linea_de_servicio`, `servicios_especificos` | Oferta/scope sustentados; preservar multiselect. No implica contrato firmado. No inventar una opción para oferta nueva. |
| Próximo compromiso | `hs_next_step`, `closedate` | Paso acordado, dueño y plazo sustentados; fecha de cierre estimada sólo con evidencia, revisión y mandato. Desconocido queda desconocido. |
| Valor defendible | `amount`, `deal_currency_code` | Valor neto aprobado del compromiso completo y moneda configurada; describir plazo, composición, IVA/gross y diferencias cuando corresponda. No poner cero para desconocido ni fee mensual en lugar del valor total. |
| Licitación | `id_de_licitacion`, `fecha_de_cierre_de_licitacion`, `ficha_de_licitacion`, `presupuesto_de_la_licitacion` | Hechos de bases/buyer con fuente. Presupuesto no es oferta propia; metadata no declara su moneda/neto/bruto: resolverlos antes de llenar. |
| Ganado/perdido | `dealstage`, `closedate`, `amount`, `closed_won_reason` / `closed_lost_reason` | Evidencia de aceptación contractual o pérdida real. Silencio/HOLD no es perdido; envío de propuesta no es ganado. |

No escribir `hs_mrr`, `hs_arr`, `hs_acv`, `hs_tcv`, montos ponderados ni cálculos de actividad. No convertir
importe anual en MRR SaaS. `gh_deal_origin` / `gh_idempotency_key` son Greenhouse, no procedencia manual.
Tasas/probabilidades, Shared Selling, acceso, atribución y controles de automatización requieren sus owners.

## Requisitos técnicos y límites observados

La documentación oficial consultada el 2026-10-11 distingue estas rutas; no se hicieron altas de prueba:

- [REST Contact](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/contacts/guide): exige
  al menos uno entre email/firstname/lastname. Política de prospecting Efeonce exige email elegible además.
- [REST Company](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/companies/guide):
  recomienda name o domain; no se convierte esa recomendación en required probado del portal.
- [REST Deal](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/deals/guide): indica
  incluir dealname/dealstage y pipeline cuando hay varios, usando IDs internos. Efeonce los explicita.
- [REST Lead](https://developers.hubspot.com/docs/api-reference/legacy/crm/objects/leads/guide): exige
  hs_lead_name y Contact existente asociado. MCP describe asociación Contact o Company. Resolver contrato
  y associationTypeId de la ruta concreta; metadata/schema no certifica escritura.
- [Formulario UI](https://knowledge.hubspot.com/object-settings/set-up-fields-seen-when-manually-creating-records?tab=tab-crm):
  propiedades/asociaciones requeridas y lógica condicional se configuran aparte. UI del portal sin sesión;
  sus campos requeridos y gates por etapa quedan **no verificados**, no vacíos ni inexistentes.

## Ejecutar y comprobar

Seguir changeset/dry-run/digest y readback del runbook y del
[adapter account-based](../../../.codex/skills/hubspot-as-a-service/references/account-based-prospecting.md).
En CLI 0.15.1 preferir la vía JSONL/stdin documentada frente al update individual que quedó sin escritura
en shell no interactiva. Leer objetos y asociaciones tras automatización, verificar Primary Company y
membresía efectiva de segmentos cuando corresponda. Reportar preparado/aprobado/escrito/leído por separado.
Si cambió metadata, conservar snapshot fechado y comparar nombres, tipos, opciones y writers antes de
actualizar guías. Descubrir drift no autoriza crear propiedades, migrar registros ni cambiar workflows.
