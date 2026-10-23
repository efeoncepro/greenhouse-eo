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

### Delta 2026-10-11 — contactos accionables y cobertura de la cuenta B2B

**Accepted — instrucción explícita del operador, Julio Reyes.** La unidad de investigación es la cuenta y
su grupo de compra: investigar al objetivo **y buscar siempre inicialmente 2–3 personas adicionales relevantes**,
incluso cuando el objetivo ya tenga correo. Priorizar responsables del área, pares, jefatura y decisores
relacionados con la necesidad. Registrar cargo, empresa, fuente, fecha y razón de acceso al objetivo; trabajar
en la misma empresa no prueba relación personal ni jefatura. Distinguir vínculo confirmado de hipótesis funcional.

**No registrar nuevos contactos de prospección sin correo.** Antes del alta, disponer de un correo corporativo
individual verificado, atribuible a esa persona, con fuente y estado de validación conservados. No inferir una
dirección desde un patrón ni usar un buzón general o personal como correo individual corporativo. Presencia,
validación del proveedor y entregabilidad son hechos distintos; conservar contradicciones y resolverlas antes
de tratar el canal como accionable.

Ésta es la admisión general. La [excepción individual informada ya documentada](EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md#delta-de-operación-documentado--21102026)
requiere autorización expresa para la persona, dirección y acciones concretas, conservando `inferida` y calidad
pendiente en la nota; no convierte el patrón en verificación ni habilita otras altas o envíos. El
[caso Fundación Luz](../commercial/prospecting-agent/runs/2026-10-22-fundacion-luz-mariana.md) aplica esa excepción
a Contact + correo, sin secuencia ni cambio de schema o filtros.

Si el objetivo no tiene correo, conservar su identidad y señal en el expediente de investigación o en una
nota de la empresa, sin crear Contact/Lead para esa persona, y continuar por los contactos adyacentes. Apollo
`emails: []` detiene el alta de esa persona, no la investigación de la cuenta. Un buzón compartido puede quedar
como vía secundaria en la nota de cuenta; no satisface el requisito ni se atribuye a una persona.

El resultado identifica objetivo, base de 2–3 adicionales y ampliación pertinente con datos accionables, relación
y fuente, o declara brechas, riesgos y siguientes vías. La base nunca es techo ni prueba de grupo completo: ampliar
por funciones críticas, decisiones y dependencias de la oportunidad/fase, conforme al
[método aprobado](EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md#delta-aceptado-2026-10-11--cobertura-del-buying-group).
Contar personas únicas y funciones por separado; un email no prueba participación o autoridad. El mapa puede
incluir un stakeholder sin correo o un rol pendiente, sin crear Contact/Lead vacío. La suficiencia es para el
siguiente paso, sin exigir comité completo/champion antes del primer acercamiento ni crear Deal para mapearlo. Los contactos que sí cumplan el requisito pueden darse de
alta dentro del alcance autorizado; una cobertura parcial no se presenta como investigación completa ni se
rellena con contactos vacíos. La solicitud del objetivo no se atribuye como intención de compra de sus colegas.

Este delta rige nuevas altas de prospección; `individual_no_email`, `shared_inbox` e `identity_pending` siguen
describiendo registros históricos. No se eliminan registros ni enums, ni se cambian filtros o esquema por esta
decisión. Reutilizar registros existentes exige preservar su estado y documentar brechas, sin duplicarlos.
El enriquecimiento que consuma créditos requiere autorización explícita para el conjunto acotado, salvo que
ya exista; una autorización individual no se extiende a otros contactos. Investigar o registrar no autoriza
envíos, secuencias ni Deals. Después de escribir, verificar correo, propiedades, empresa Primary, notas y
membresía por lectura independiente según el contrato vigente.

### Delta 2026-10-12 — la industria vive en la empresa

El operador observó que los contactos del segmento de bancos casi no aparecían en el de finanzas. Causa: los
dos segmentos usaban llaves sin relación. 188 enumeraba 14 Company IDs; 153 leía `industria`, una propiedad del
Contact que se llena a mano. De los 28 contactos de bancos, 19 la tenían vacía, y seis bancos no tenían
`industry` en la empresa. Un segmento activo cuya regla es una lista de IDs no agrupa por atributo.

Decisión, que **sustituye el punto 4 del contrato** y la «Aplicación por cuentas bancarias» del 11/10:

1. El sector se clasifica una vez, en `industry` de Company. Los segmentos sectoriales de Contact 151–155 leen
   la empresa principal: `ASSOCIATION(object = '0-2', association = 1) { industry IN (...) }`, con los mismos
   conjuntos de valores que 144–148. `industria` de Contact deja de alimentar segmentos; no se borra, no se
   exige en altas nuevas y no se copia desde la empresa.
2. Cada alta deja `industry` y `country` en la empresa. Sin industria, todos sus contactos quedan fuera.
3. 188 pasa a atributos: fecha conocida AND `individual_email` AND email conocido AND empresa principal con
   `industry IN ('BANKING') AND country = 'Chile'`. Un banco chileno nuevo entra sin editar el filtro.
4. Ningún filtro delimita un universo con IDs de registros. Un subsegmento usa la llave de su padre y se
   verifica contenido en él. Si el universo aprobado es más estrecho que el atributo, falta un atributo.
5. No se cambia un dato verdadero para que un registro calce; el caso se reporta.

Aplicado y verificado el 12/10 con Agent CLI 0.15.1. Trece empresas corregidas: `BANKING` en los seis bancos
sin industria (cinco también sin país) y en BCI y Santander, que figuraban como servicios financieros; más
cinco clasificaciones erróneas del enriquecimiento detectadas en la simulación. Membresía leída completa por
`ilsListIds` y comparada con el conjunto esperado, sin faltantes ni sobrantes en los seis segmentos:

| Segmento | Antes | Después | De la prospección vigente |
| --- | --- | --- | --- |
| 151 Tecnología | 17 | 380 | 17 |
| 152 Retail | 17 | 223 | 19 |
| 153 Finanzas | 14 | 147 | 35 |
| 154 Educación | 9 | 52 | 8 |
| 155 Gobierno | 14 | 63 | 14 |
| 188 Bancos Chile | 28 | 26 | 26 |

El salto de 151–155 es el alcance global que su nombre ya declaraba: ahora incluyen los contactos históricos
de esas empresas, no sólo los que alguien etiquetó. Los 26 de 188 están todos en 153. Consorcio salió de 188
con dos contactos porque su empresa es el grupo asegurador (`INSURANCE`); sigue en 153 y contarlo como banco
es decisión del operador sobre ese campo. Dos contactos investigados cambiaron de sector al seguir a su empresa.

Consecuencias: los segmentos globales crecen; ninguna automatización se dispara por entrar a una lista (la
automatización del Prospecting Agent «cuando se agregue un contacto a cualquier lista» está desactivada,
lectura del 08/10). Los segmentos históricos 166–170 siguen leyendo `industria` y no se migran. Recuperación:
restaurar las seis expresiones y los valores previos de las trece empresas desde el
[snapshot](../operations/HUBSPOT_INDUSTRY_SEGMENTS_2026-10-12.json), que guarda ambos.

### Delta 2026-10-12 — fecha de investigación, encaje de adyacentes y evento mínimo de Lead

Tres vacíos que salieron al probar la skill de prospección bajo Claude; el operador aprobó las tres reglas.

- `efeonce_prospecting_researched_on` lleva el día en que se verificó la evidencia, no el de la escritura ni
  `createdate`. Si pasan más de 7 días entre verificar y escribir, se revalidan empleo y correo y se escribe
  esa fecha. El plazo de 7 días lo propuso el agente por delegación del operador y es revisable.
- `efeonce_prospecting_service_fit` de un contacto adyacente se decide por su propia función y el encaje de la
  cuenta. La señal de otra persona no es evidencia para un colega. Sin valor aplicable queda vacío y se
  reporta. Sumar opciones al enum (canal, SEO/AEO, Salesforce) cambia propiedad y segmentos: tarea aparte.
- Un Lead se crea sólo tras una interacción real de una persona registrable: respuesta con interés, reunión
  aceptada o solicitud entrante. Investigar y registrar no lo crea. Lectura del portal `48713323` ese día:
  2.251 Leads, 2.222 creados por el workflow «Create Lead Upon Contact LCS Update», 28 por integración y 1
  por interfaz. El operador pidió apagarla y se apagó ese mismo día.

Estado del portal tras el cambio, leído en la interfaz con la sesión del operador:

- La creación automática era una automatización con plantilla del pipeline de Leads (Objetos → Leads →
  Pipelines → Lead pipeline → Automatizar → «Crea un lead»), no un workflow de la lista. Creaba un Lead de
  tipo «Nueva empresa» cuando un contacto pasaba a la etapa de ciclo de vida `Lead`. Quedó desactivada, con
  confirmación del operador y relectura tras recargar. Las dos reglas de progresión de etapa del Lead
  (a «Intentando contactar» y a «Conectado») siguen activas.
- `Lead` no discriminaba: 3.187 de 4.240 contactos estaban en esa etapa. De los 2.251 Leads, 2.233 seguían
  en «New»; 11 en «Attempting», 3 en «Connected», 1 calificado y 3 descalificados.
- Hallazgo sin acción: en Contactos → Etapa del ciclo de vida → Reglas del pipeline, la regla «Limitar la
  creación de objetos a etapas específicas» está activa con `Sales Qualified Lead` como etapa predeterminada
  de un contacto creado por un usuario; 2.733 registros están en esa etapa (954 contactos, 1.778 empresas).
  El operador aprobó pasarla a `Lead`: quedó aplicada en Empresas y pendiente en Contactos. Los Leads y
  las etapas ya asignadas no se depuraron; el análisis previo está en el
  [manual de operación](../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md).

Sin cambio de schema ni de segmentos. [Origen](../audits/commercial/2026-10-12-prospecting-claude-blind-differential.md).

## Revisit when

Cambie la granularidad de cohortes, se requiera ingestión programada o sincronización cross-object, o un campo
existente pase a representar exactamente estos hechos. Automatización de ingestión y cambios de canal requieren
su propia autorización; esta decisión sólo configura clasificación y selección nativa activa.

### Evidencia de aplicación sin cambio de decisión — 2026-10-22

[Kibernum: intake focalizado y seis membresías del Contact verificadas](../commercial/prospecting-agent/runs/2026-10-22-0056-kibernum-growth-colombia.md).
Se reutilizó Company y se confirmaron Primary, industria/país y fecha de investigación en ambos objetos.
No se cambiaron schema, filtros, cohortes históricas ni autoridad; encaje CRM separado de solicitud Growth.
