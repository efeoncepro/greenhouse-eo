# Prospección Efeonce: incorporación automática en segmentos

Portal **48713323**. Contrato técnico: [decisión aceptada](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
Operación: [manual](../../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md).
La [captura por objeto y fase](../../manual-de-uso/hubspot/llenar-propiedades-comerciales.md) y el
[inventario completo fechado](../../audits/commercial/hubspot-properties-2026-10-11/README.md) distinguen
campos de investigación, calificación, oportunidad y sistema. La presencia en segmentos no convierte
fit en interés ni Lead/Contact en Deal; el catálogo no certifica requisitos UI/etapa.
La skill convierte estos datos en un plan por objeto/fase: completar hechos pertinentes confirmados,
conservar valores vigentes, declarar pendientes y separar writers del sistema. El mínimo técnico de alta
no reemplaza evidencia disponible; tampoco se completan desconocidos para aparentar un registro completo.
Las expresiones completas, nombres e IDs leídos en HubSpot están en el
[catálogo fechado](../../operations/HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json). Es evidencia de configuración; HubSpot sigue siendo la fuente viva.

## Vigente desde el 2026-10-11: se incorpora por fecha de investigación

Las rondas dejaron de modelarse como opciones de una lista. Cada alta o reinvestigación escribe
`efeonce_prospecting_researched_on` (fecha) en empresa y contacto, y esa fecha es la que incorpora el registro a
los segmentos de «Prospección continua» **180–187**. `efeonce_prospecting_cohorts` queda como histórico de las
rondas del 06 al 10 de octubre y de los segmentos **159–179**; no recibe opciones ni registros nuevos. La fecha
guarda la última investigación; el historial queda en las notas. Las secciones siguientes describen las rondas
históricas y siguen siendo válidas para ellas.
[Decisión y verificación](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-11--la-fecha-de-investigación-sustituye-a-las-cohortes-fechadas).

## Admisión vigente: correo y cobertura B2B de la cuenta

Investigar al objetivo **y buscar siempre inicialmente 2–3 contactos adicionales relevantes**, aunque tenga
correo. La base no es techo: ampliar por roles/riesgos de la oportunidad/fase. Contar personas únicas y funciones
por separado; suficiencia para el siguiente paso, no grupo completo por cantidad. Brechas con owner/ruta visibles. El resultado útil combina correo corporativo individual, cargo, fuente y una ruta razonada de acceso
al objetivo. Distinguir relación confirmada de proximidad funcional; no atribuir a colegas su intención de compra.

**No registrar nuevos contactos de prospección sin correo corporativo individual verificado.** Si el objetivo
no tiene correo, conservar la señal en el expediente o en una nota de empresa y continuar por personas
adyacentes. No inventar direcciones ni atribuir un buzón compartido a una persona. Declarar validaciones
contradictorias y brechas si no se alcanzan 2–3 contactos adicionales accionables; un alta parcial no completa
la investigación. Los tipos históricos sin correo siguen existiendo, sin habilitar nuevas altas ni su borrado.

[Decisión del operador y límites](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-11--contactos-accionables-y-cobertura-de-la-cuenta-b2b).
La [excepción individual informada vigente](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md#delta-de-operación-documentado--21102026)
se limita a la persona, dirección y acciones autorizadas por el operador después de conocer la incertidumbre.
El correo conserva su condición inferida en la nota: `individual_email` clasifica persona/canal, no verifica
la casilla. [Aplicación Contact + envío en Fundación Luz](../../commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md),
sin secuencia ni membresía efectiva de segmentos acreditada en ese corte.
No cambia segmentos ni autoriza créditos fuera del alcance aprobado, envíos o Deals.

## Vigente desde el 12/10/2026: la industria es de la empresa

Los segmentos agrupan por atributos comunes. La industria se clasifica una sola vez, en la empresa, y los
contactos la heredan por su empresa principal. Por eso un contacto aparece en «Contactos · Finanzas» cuando su
empresa es de finanzas, aunque nadie haya llenado la industria en su ficha.

| Segmento | Regla | Miembros | De la prospección vigente |
| --- | --- | --- | --- |
| 151 Contactos · Tecnología | Empresa principal en software, TI, internet o seguridad informática | 380 | 17 |
| 152 Contactos · Retail | Empresa principal en retail y consumo | 223 | 19 |
| 153 Contactos · Finanzas | Empresa principal en banca, servicios financieros, inversión o seguros | 147 | 35 |
| 154 Contactos · Educación | Empresa principal en educación | 52 | 8 |
| 155 Contactos · Gobierno | Empresa principal en administración pública | 63 | 14 |
| 188 Bancos Chile · Personas con email | Investigado, con email, y empresa principal de banca en Chile | 26 | 26 |
| 195 Seguros Chile · Personas con email | Investigado, con email, y empresa principal de seguros en Chile | 12 | 12 |

Bancos y Seguros son valores de industria dentro de Finanzas: los contactos de 188 y de 195 están todos en 153
y ninguno está en ambos. Los conteos de la tabla son del 12/10 y cambian con cada alta. Un banco
chileno nuevo entra solo, sin editar el filtro. Los segmentos 151–155 son globales, así que incluyen contactos
históricos del CRM; la columna de la derecha dice cuántos vienen de la prospección actual.

Para que un prospecto caiga en su segmento, su **empresa** debe tener industria y país. Sin industria en la
empresa, ninguno de sus contactos aparece. La industria del contacto ya no alimenta estos segmentos.

Consorcio quedó fuera de Bancos con sus dos contactos: su empresa en HubSpot es el grupo asegurador y está
clasificada como seguros. Sigue en Finanzas. Si se quiere contar como banco, se cambia ese único campo.
[Definiciones y conteos sin PII](../../operations/HUBSPOT_INDUSTRY_SEGMENTS_2026-10-12.json) ·
[decisión](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#delta-2026-10-12--la-industria-vive-en-la-empresa).

## Bancos de Chile: corte del 11/10/2026 (sustituido)

Hasta el 11/10 el [segmento activo 188](https://app.hubspot.com/contacts/48713323/objectLists/188/filters)
enumeraba 14 empresas por ID. Era una lista manual con forma de segmento activo y no quedaba contenido en
Finanzas; la regla vigente está en la sección anterior. Lo que sigue describe ese corte.

Corte verificado 11/10/2026: **28 contactos**, sin faltantes ni adicionales respecto del manifiesto autorizado.
Excluye Cencosud y los dos contactos bancarios aún sin email. Presencia de correo no garantiza entregabilidad:
dos personas mantienen validaciones contradictorias. Fit de servicio: 21 creativo, 7 CRM, cuatro con ambos;
cuatro con foco SEO/web en notas y fit vacío. [Expediente y propiedades](../../commercial/prospects/bancos-chile-2026-10/README.md)
y [definición exacta sin PII](../../operations/HUBSPOT_BANKS_SEGMENT_2026-10-11.json).
No se alteraron contactos, permisos de envío, workflows ni las definiciones continuas 180–187 al crear 188.

## Ronda adicional — 2026-10-08

Se añadió research_2026_10_08 como opción en Company y Contact para dos oportunidades autorizadas.
ACTIVE **178** selecciona esa cohorte + tipo individual_email/individual_no_email + fit creative;
ACTIVE **179** selecciona las empresas de esa cohorte. Miembros efectivos: **2 contactos y 2 empresas**,
coincidentes con los conjuntos completos etiquetados. 178 clasifica fit con o sin email; no es una lista de
envío ni modifica el universo con email de 174/176. Las definiciones anteriores permanecen intactas.
[Diccionario, expresiones y evidencia de la ronda](../../audits/commercial/2026-10-08-creative-prospect-intake.md).

## Cómo se incorpora un prospecto

El agente completa las propiedades del registro. HubSpot recalcula la pertenencia a los segmentos nativos
**ACTIVE**, antes llamados listas activas. No se añade manualmente a una lista base, no se filtra por IDs de
registros y no hace falta activar un workflow para esta incorporación. Cambiar una propiedad puede añadir o
retirar al registro del segmento correspondiente; el recálculo es asíncrono.

| Registro | Propiedad | Qué cargar |
| --- | --- | --- |
| Company y Contact, por separado | `efeonce_prospecting_researched_on` | Fecha de la investigación (`AAAA-MM-DD`). Es el límite del universo de prospección continua desde el 2026-10-11 |
| Company y Contact, por separado | `efeonce_prospecting_cohorts` | Histórica: sólo las rondas del 06 al 10 de octubre. No añadir opciones ni asignarla a registros nuevos |
| Contact | `efeonce_prospecting_contact_kind` | Admisión general: `individual_email` con correo corporativo individual verificado. Una excepción individual informada conserva calidad pendiente en la nota; este enum no significa `verified`. Los otros valores clasifican registros históricos y no autorizan altas sin correo |
| Contact | `efeonce_prospecting_service_fit` | `creative`, `hubspot_crm` o ambas cuando haya evidencia; conservar valores compatibles previos |
| Company | `industry`, `country`, `hs_employee_range` | Industria y datos de cuenta respaldados, usando las opciones exactas existentes |
| Contact | `jobtitle`, `email` | Datos personales respaldados; no inferir cargo ni inventar email. `industria` ya no alimenta segmentos desde el 12/10: el sector se toma de la empresa |
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

### Reutilización comprobada — 2026-10-07

[LIC-1169 Q4 Home Center](../../commercial/tenders/sika-mexico-campana-q4-home-center-1169/README.md) creó un
Deal distinto usando Company/Contact existentes. No cambió cohortes, atributos ni reglas. El lector confirmó
el contacto en 174/176 y la empresa en 177. Es comprobación individual, no un nuevo censo de los 19 segmentos;
la tabla y sus conteos siguen fechados al 06/10. La nota conserva la solicitud Q4 y la responsabilidad del
contacto aún por confirmar. Un nuevo proceso no convierte fit creativo en demanda HubSpot ni crea destinatarios nuevos.

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

## Actualización operativa — 2026-10-08

Existen activos de la ronda 08/10 (178–179) y ocho activos continuos (180–187), creados antes de la
precisión posterior del operador: **no crear más segmentos si ya hay uno compatible; completar propiedades
respaldadas y verificar incorporación automática**. Los 86 segmentos previos permanecen intactos.
Diego y Emily ya cumplen las propiedades de 178; sus empresas, las de 179. No fue necesario agregar
atributos ni forzar cargo/interés/industria. Fit y pertenencia no equivalen a oportunidad calificada.
Los negocios previos se conservan por instrucción del operador; siguientes altas siguen lead → calificación
→ oportunidad. [Catálogo, conteos, verificación y diagnóstico de Prospecting Agent](../../audits/commercial/2026-10-08-prospecting-agent-active-segments.md).

## Aplicación individual — 22/10/2026

[Alta Kibernum y readback](../../commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md):
un Contact nuevo y Company existente, fecha de investigación en ambos y Primary comprobada; tipo
individual, fit creativo/CRM y cargo verificados. Pertenencia efectiva a 180/181/182/183/151/156 y Company187,
sin cambio de reglas ni inscripción manual. Es un corte individual; los totales históricos permanecen fechados.
La solicitud Growth para Colombia se conserva en nota, separada del fit CRM y del país Chile de la empresa.
