# Auditoría de prospección y segmentación HubSpot — 2026-10-06

## Estado actual: incorporación Sika México — 2026-10-06, 18 h Chile

Alta explícitamente autorizada: [Sika México LIC-1164](../../commercial/tenders/sika-mexico-campana-creativa-1164/README.md). Delta exacto **una Company México + un Contact individual creativo**; la cohorte devuelve **81 empresas y 81 contactos**, exactamente el corte anterior más esos registros. Primary verificada en Sika Mexicana. El registro vacío automático por dominio de email permanece secundario y fuera de la cohorte.

Membresías automáticas: **174 Individuales con email 63**, **176 Fit creativo 51**, **175 HubSpot/CRM 26 sin cambios**. Nuevo **ACTIVE 177 Química y materiales** (Company): cohorte `research_2026_10_06` AND `industry IN ('BUILDING_MATERIALS', 'CHEMICALS')`, con **una empresa**. Las 19 reglas de cohorte derivan de atributos; no hay inscripción manual. Comparación contra el prestate completo: cero faltantes y cero extras en cohorte y conjuntos 174/175/176/177.

Evidencia fuera de Git: `/Users/jreye/Documents/Codex/2026-10-06-sika-mexico-1164/CRM-CIERRE-READBACK.json` y `CONTACTOS-COHORTE-CIERRE.json`; originales y registro interno en OneDrive. Cargo/identidad personal no revalidados independientemente; email aportado por el operador, no validado por Apollo. No se enviaron correos ni se presentó oferta. Los apartados siguientes conservan sus cortes históricos de 80/80 y 79 contactos iniciales.

## Cierre documental y nueva lectura completa — 2026-10-06

Pedido: que cualquier agente pueda continuar la segmentación. Se volvió a verificar identidad CLI/MCP en portal
48713323 y Agent CLI 0.15.1. Lectura independiente de **34 definiciones ACTIVE**: 19 de cohorte (159–177) y
15 generales (144–158); los 18 filtros existentes de cohorte y las 15 reglas generales coinciden exactamente
con su prestate. Lectura completa de **19 conjuntos** por MCP: corte anterior más Sika en 174/176 y 177,
sin faltantes ni extras. Sin nuevas escrituras CRM, definiciones, emails o automatizaciones durante este cierre.

El [modelo funcional](../../documentation/hubspot-as-a-service/prospeccion-segmentos-activos.md) concentra el
catálogo resumido y los casos; el [catálogo JSON fechado](../../operations/HUBSPOT_PROSPECT_SEGMENTS_CATALOG_2026-10-06.json)
conserva nombres/IDs/objetos/expresiones exactas sin PII. Manual actualizado con pasos, preview, consulta MCP,
paginación, recuperación y diagnóstico; decisión/runbook, índices y routers de agentes enlazados. Skill
`hubspot-as-a-service` y referencias de prospección/schema sincronizadas byte por byte Codex/Claude.

Evidencia individual fuera de Git: `Cierre-documentacion/Definiciones-live.json`, `Membresias-live.json` y
`Verificacion-live.json`, bajo `/Users/jreye/Documents/Codex/2026-10-06-segmentos-busquedas-nuevas/`.
Las cifras son un corte fechado y deben refrescarse antes de seleccionar destinatarios.

### Validación documental

Paridad explícita de las tres referencias/entrypoint HubSpot Codex/Claude, enlaces locales y restricciones de
las 19 expresiones: PASS. Gate general de mirrors: PASS. Routing bridge abreviado en CLAUDE y su texto íntegro
preservado en el runbook para conservar contenido y reducir presupuesto. La auditoría global de CLAUDE detecta
una línea histórica de arquitectura de marca no alcanzable literalmente, previa a este cambio y ajena a
segmentación; no se restaura una regla de identidad obsoleta ni se modifica su allowlist dentro de este alcance.
El canon vigente de identidad está en `DESIGN_TOKENS_BRAND_AGENT_INVARIANTS.md`, con decisión del 05/10.

## Corte anterior: corrección a propiedades activas — 2026-10-06

El operador corrigió el método: incorporar mediante propiedades, sin inscripciones manuales en bases estáticas.
Se crearon por Agent CLI cuatro definiciones en grupo `efeonce_prospecting`, con diccionario canónico en la
[decisión aceptada](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).
Cohorte verificada en **80 empresas y 80 contactos**; tipo/fit en los contactos. Escrituras y readbacks completos
coinciden fila por fila. La consulta global por la nueva cohorte devuelve exactamente esos conjuntos, sin extras.

Los **18 ACTIVE 159–176** mantienen IDs, nombres y objetos, ahora sin `IN_LIST` ni dependencias de bases
estáticas. Las **15 definiciones globales 144–158** coinciden exactamente con el prestate. Los conjuntos de los
18 segmentos coinciden con los históricos más la incorporación autorizada de un contacto individual creativo:
**0 faltantes, 0 extras, 0 ajenos al lote**. El contacto entra automáticamente en 167, 171, 174 y 176, y queda
fuera de 172, 173 y 175. La solicitud audiovisual no se forzó en `servicio_de_interes`.

| Segmento                            | Corte inicial | Actual verificado |
| ----------------------------------- | ------------: | ----------------: |
| 167 Retail                          |            10 |                11 |
| 171 Marketing/Growth/Comunicaciones |            31 |                32 |
| 174 Individuales con email          |            61 |                62 |
| 176 Fit creativo                    |            49 |                50 |
| 175 Fit HubSpot/CRM                 |            26 |                26 |

Los otros 13 conteos del catálogo histórico no cambian. El universo de preparación actual tiene **62** emails
individuales y 57 cuentas; nueve contactos sin email, siete buzones y dos identidades pendientes permanecen aparte.
No es un recuento de destinatarios habilitados. La incorporación manual intermedia a la base 118 (79 → 80)
queda reconocida; 140/122/124 conservaron su corte. Esas bases históricas ya no gobiernan los segmentos activos.

Evidencia local: `Propiedades-activas/Schema-contactos.jsonl`, `Schema-empresas.jsonl`, propuestas, escrituras,
`Registros-readback.json` y `Segmentos-readback-y-verificacion.json`. El prestate y los filtros previos permiten
restaurar los atributos y definiciones, preservando registros. La operación no envió correos; sí se observó en
el CRM un correo comercial ya enviado por el operador. Consultar actividad previa antes de preparar otro contacto.
La regla duradera de alta está en las skills HubSpot Codex/Claude y en el manual enlazado. Los apartados
siguientes conservan el corte anterior y explican su evidencia; sus cifras no sustituyen este estado actual.

## Corte inicial histórico: alcance y estado

Portal: **48713323, Efeonce**. Alcance de esta auditoría: contraste de los artefactos de creación, definiciones y
readback de miembros, con nueva lectura independiente de los 18 segmentos el 06-10-2026 durante el cierre documental. La investigación tiene **80 cuentas investigadas**: 40 empresas
nuevas y 40 registros preexistentes reinvestigados; **79 contactos nuevos**. “Base nueva” identifica esta cohorte,
no la fecha de creación de todas las empresas. No incluye el resto histórico del CRM.

Los **18 segmentos activos 159–176** están acotados a esa cohorte. Los **15 generales 144–158** siguen intactos
para otros usos. El readback registrado de los 18 segmentos coincide exactamente con los conjuntos esperados:
**0 faltantes, 0 extras y 0 miembros fuera de cohorte**. La nueva lectura independiente registrada en
`Readback-cierre-documental-2026-10-06.json` volvió a verificar los mismos conjuntos y cifras de los 18 segmentos.
El estado mutable debe refrescarse antes de seleccionar destinatarios.

**61 contactos individuales tienen un email disponible para preparación**, distribuidos en **57 cuentas**.
Esta cifra no representa destinatarios habilitados para envío. Buffalo Waffles conserva una bandera
`do_not_mail` en la evidencia de Apollo y ya quedó fuera de los 61 individuales con email; no debe reincorporarse
a una selección de envío. Dentro de los 61, Topitop tiene una discrepancia entre la etiqueta de Apollo “Verified”
y el estado del validador “unknown”: el buzón debe revalidarse antes de enviar.
No se activó ninguna campaña, workflow ni envío como parte de esta auditoría.

## Catálogo verificado

| ID / HubSpot                                                             | Segmento                                 | Objeto y universo             | Miembros registrados |
| ------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------- | -------------------: |
| [159](https://app.hubspot.com/contacts/48713323/objectLists/159/filters) | Software                                 | Empresa                       |                   16 |
| [160](https://app.hubspot.com/contacts/48713323/objectLists/160/filters) | Retail y consumo                         | Empresa                       |                   11 |
| [161](https://app.hubspot.com/contacts/48713323/objectLists/161/filters) | Finanzas y seguros                       | Empresa                       |                    8 |
| [162](https://app.hubspot.com/contacts/48713323/objectLists/162/filters) | Educación                                | Empresa                       |                    8 |
| [163](https://app.hubspot.com/contacts/48713323/objectLists/163/filters) | Gobierno                                 | Empresa                       |                   15 |
| [164](https://app.hubspot.com/contacts/48713323/objectLists/164/filters) | Chile - rango 51 a 1000                  | Empresa                       |                   38 |
| [165](https://app.hubspot.com/contacts/48713323/objectLists/165/filters) | Tecnología Chile - rango 51 a 1000       | Empresa                       |                   15 |
| [166](https://app.hubspot.com/contacts/48713323/objectLists/166/filters) | Tecnología                               | Contacto individual con email |                   16 |
| [167](https://app.hubspot.com/contacts/48713323/objectLists/167/filters) | Retail                                   | Contacto individual con email |                   10 |
| [168](https://app.hubspot.com/contacts/48713323/objectLists/168/filters) | Finanzas                                 | Contacto individual con email |                    4 |
| [169](https://app.hubspot.com/contacts/48713323/objectLists/169/filters) | Educación                                | Contacto individual con email |                    5 |
| [170](https://app.hubspot.com/contacts/48713323/objectLists/170/filters) | Gobierno                                 | Contacto individual con email |                   11 |
| [171](https://app.hubspot.com/contacts/48713323/objectLists/171/filters) | Roles Marketing y Growth                 | Contacto individual con email |                   31 |
| [172](https://app.hubspot.com/contacts/48713323/objectLists/172/filters) | Solicitud observada - HubSpot            | Contacto individual con email |                    3 |
| [173](https://app.hubspot.com/contacts/48713323/objectLists/173/filters) | Solicitud observada - Contenido y social | Contacto individual con email |                    1 |
| [174](https://app.hubspot.com/contacts/48713323/objectLists/174/filters) | Individuales con email                   | Contacto individual con email |                   61 |
| [175](https://app.hubspot.com/contacts/48713323/objectLists/175/filters) | Fit HubSpot y CRM                        | Contacto individual con email |                   26 |
| [176](https://app.hubspot.com/contacts/48713323/objectLists/176/filters) | Fit servicios creativos                  | Contacto individual con email |                   49 |

Las reglas de empresa intersectan atributos con la cohorte **119**. Las reglas de contacto intersectan atributos
con **118** y los individuales con email de **140**. El universo **174** equivale a esa última intersección. Los
segmentos **175** y **176** intersectan además las clasificaciones de investigación **124** y **122**: son fit
estimado por servicio, no solicitudes de contratación ni compradores confirmados. No hay una propiedad nativa
que identifique por sí sola la procedencia de este lote; la lista de cohorte fija el alcance y las propiedades
permiten subdividirlo sin reabrir la base histórica.

“Activo” significa que la membresía responde a cambios en los filtros y datos dentro del universo permitido.
No significa que se incorporen automáticamente los contactos de futuras búsquedas a esta cohorte fechada.
Las definiciones persistidas completas están en el artefacto local de readback; el [manual operativo](../../manual-de-uso/hubspot/segmentar-prospeccion-por-cohorte.md)
explica cómo refrescar el alcance y verificar una nueva cohorte.

## Cómo interpretar los grupos

- **Empresas 159–165:** investigación, calificación y planificación por cuenta; no son listas de destinatarios.
- **Industria 166–170:** lenguaje y ejemplos pertinentes para personalización. Cubren **46 de los 61** contactos;
  los **15 restantes** siguen en 174 y pertenecen a inmobiliario, logística, alimentos, transporte o medios.
- **Rol 171:** 31 cargos que contienen Marketing, Growth o Comunicaciones. El cargo aporta pertinencia funcional,
  pero no prueba autoridad de compra ni presupuesto.
- **Solicitud observada 172–173:** señal pública concreta compatible con las opciones existentes de servicio.
  **172 tiene 3 personas de una sola cuenta, TVN**; **173 tiene 1 persona de Maestra Inmobiliaria**. La solicitud
  pertenece a la organización y puede ser histórica; no debe atribuirse a cada contacto como interés personal.
- **Fit 175–176:** 26 contactos para CRM/HubSpot y 49 para creativos. Hay **17 en ambos**, **9 sólo CRM**,
  **32 sólo creativos** y **3 en ninguno**. No deben sumarse como 75 personas únicas ni disparar dos cadencias.

El segmento tecnológico de empresas Chile/rango 51–1.000 (**165, 15 cuentas**) y el de contactos tecnológicos
(**166, 16 personas**) usan filtros y universos distintos; no representan una correspondencia persona–empresa
uno a uno. El país de empresa tampoco prueba residencia del contacto ni separa siempre una filial local del grupo.

## Abordaje recomendado

Aplicar el [método de calificación por intención](../../operations/PROSPECT_INTENT_QUALIFICATION_AND_APPROACH_V1.md).
Las siguientes son recomendaciones para preparar mensajes, no campañas aprobadas.

| Prioridad | Evidencia que permite asignarla                                                        | Abordaje                                                                                    | Primer resultado buscado                               |
| --------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| 1         | Solicitud explícita con admisión vigente revalidada                                    | Referir alcance y requisitos exactos; usar canal y contraparte del proceso                  | Confirmar participación o conversación con responsable |
| 2         | Solicitud explícita histórica, plazo pasado o continuidad desconocida                  | Preguntar si permanece una necesidad o si habrá nueva ronda, mencionando la fecha observada | Revalidar necesidad y dueño actual                     |
| 3         | Uso de CRM, crecimiento o demanda de producción observados, sin solicitud de proveedor | Hipótesis concreta sobre el proceso de esa cuenta; no afirmar que busca agencia             | Validar problema y disponibilidad de conversación      |
| Pendiente | Empleo, identidad, tamaño, supresión o email contradictorios                           | Resolver la contradicción con fuente vigente; excluir de selección mientras esté bloqueado  | Dato y decisión trazables                              |

**TVN:** la fuente registra fin **05-10-2026**, inicio **29-09-2029** inconsistente y estado visual “En Proceso”.
El plazo registrado pasó; el estado completo y la recepción actual no están confirmados. Abordar por Compras para
preguntar si admiten incorporación o una próxima ronda, y coordinar TI como contraparte técnica. Los dos contactos
de compras y uno de TI son un buying group por investigar, no tres oportunidades independientes ni prueba de
responsabilidad en esa licitación. HubSpot y Zoho aparecen como alternativas; no hay elección de plataforma comprobada.

**Maestra:** referencia histórica de agencia de Content Marketing, contenidos y gestión de Instagram, TikTok y
LinkedIn. Al observarse, el post mostraba “5 meses”; fecha exacta y continuidad no verificadas. Preguntar por la
necesidad actual y responsable de Marketing antes de preparar propuesta. **Metro** y **QuePlan** también conservan
solicitudes históricas relevantes: no afirmar que siguen buscando ni atribuir la solicitud al contacto enriquecido
salvo evidencia expresa. El autor histórico de QuePlan ya había cambiado de empresa.

**CRM/HubSpot:** empezar por cuentas con uso de HubSpot observado, con una hipótesis de operación, calidad de datos,
integración o adopción específica. El segmento 175 incluye otras necesidades CRM: UFRO, INAPI e ISL muestran Zoho;
no convertirlas en compra de HubSpot. **Creativos:** mostrar comprensión de formatos, volumen, canal y aprobaciones
que constan en la señal; no asumir que un equipo in-house necesita reemplazo. **SEO/AEO/GEO:** citar sólo la disciplina
pedida. Una solicitud SEO/SEM no demuestra demanda AEO/GEO, y no existe opción específica para esas disciplinas en
el campo usado por 172–173: su ausencia allí no elimina la investigación original.

## Control del solapamiento antes de personalizar

Elegir un mensaje y una conversación por cuenta según el trigger más fuerte. Resolver primero los **17 contactos
con fit doble**; mantener un frente principal y usar el segundo sólo si aparece un problema conectado. Coordinar
las cuentas con más de una persona en 174: TVN tiene 3, Fracttal 2 y Cueros Vélez 2. No ejecutar envíos simultáneos
por industria, cargo y servicio al mismo contacto. Los 3 individuos sin fit de servicio clasificado requieren
revisión, no asignación automática.

El mínimo de la ficha para preparar un mail es: cuenta compradora, señal exacta, fecha propia y fecha de observación,
estado del proceso, rol verificado, hipótesis de necesidad, propuesta de conversación, fuente y restricción de envío.
Un email con validación de buzón no acredita empleo actual, autoridad, consentimiento ni suscripción de marketing.
La selección de envío debe contrastarse con las supresiones, bajas y condiciones del canal real usado; no activar
marketing masivo por el hecho de integrar 174.

## Pendientes de calidad

1. **9 discrepancias de empleados** entre CRM y banda publicada: Caffarena, HealthAtom, Lippi, Casaideas, Poliglota,
   Tenpo, Rex+, Gestión Diversa y Habita. Se conservaron cifras CRM sin inventar un exacto; no usarlas como nómina confirmada.
2. **Comercial Torino / Gama Chile:** industria pendiente. No confundir su identidad con fabricante homónimo.
   **Karün Life** corresponde a la cuenta investigada, no a Karün Eyewear.
3. **2 vínculos laborales actuales inciertos:** contactos de Comercial Torino y DESA. Permanecen fuera de los 61
   individuales con email; no se completaron industria y tamaño como si el vínculo fuera actual.
4. **9 sin email, 7 buzones de área y 2 pendientes de identidad** forman parte de los 79, pero quedan fuera del
   universo individual 174. Los buzones compartidos requieren tratamiento de área y no personalización ficticia.
5. El [ICP vigente](../../context/13_icp-buyer-personas-jtbd.md) conserva el piso de 50 personas. Para esta investigación
   el operador pidió no restringir tamaño salvo microempresas o solopreneurs: se conserva esa excepción de alcance
   sin cambiar el canon. Rangos 11–50 o tamaño de unidad desconocido requieren validar entidad compradora, capacidad
   de compra y alcance; no se descartan automáticamente ni se califican como ICP aprobado.
6. **Supresión aplicada:** Buffalo Waffles quedó sin email cargado y fuera de los 61, conservando el estado
   `do_not_mail` en la nota de fuente. **Validación pendiente:** el contacto de Topitop dentro de los 61 tiene
   Apollo “Verified” y validador “unknown”. La fase documental no modificó CRM ni creó una lista de envío final.
   La cifra actual de habilitados para envío **no está determinada**.

## Evidencia y límites del cierre

Los nombres siguientes identifican los artefactos de operador, mantenidos fuera del repositorio para evitar
incluir emails y datos personales. Sus hashes permiten identificar la versión contrastada. Los enlaces HubSpot
anteriores exigen acceso al portal; no son superficies públicas.

| Artefacto                                    | SHA-256 de la versión auditada                                     |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `Plan-segmentos-nuevos.json`                 | `5aa21f034895bb2e6e65a4b968d3439bfe8ef418001088744b1922d4a9f121db` |
| `Readback-definiciones-nuevas.json`          | `90fd8b5115cbab1b6a2fe100bd73bec4311c0d572542893664bc8eb93df7f347` |
| `Verificacion-miembros-nuevos.json`          | `3269bb5f913cd8a1c3fa84b84b7c96d21c2d86629b2fc8e9471bb11ddb1a6bcd` |
| `Verificacion-globales-conservados.json`     | `4e611c52f83b2cc881d0fe5227c9e098717a8dbd9edcff05d937fc84cae42794` |
| `Cohorte-prospeccion.json`                   | `f7462ff6a969f7e506e16cdd3c3c4487b379a8ebb29ac31d7d0f3122a61a8059` |
| `Readback-cierre-documental-2026-10-06.json` | `539f42583c2ba67ed5bb7143326a55d0328e23949abc2ea6f6bfcd5cb5b2d83b` |

El Changeset de atributos registra **372 valores**, **49 empresas** y **77 contactos** actualizados: propiedades
existentes, sin crear schema/opciones, modificar emails, consentimiento, lifecycle ni asociaciones. Esta auditoría
no publica la evidencia individual y no sustituye la nota fuente de cada cuenta. No se hizo commit, push, publicación,
activación de workflow ni envío de mails durante este trabajo documental.

## Cierre documental

Tres subagentes actualizaron el manual, runbook, método de intención y skills HubSpot/licitaciones.
Se mantuvieron cinco pares de archivos Codex/Claude idénticos. El cierre documental acotado no encontró
faltantes ni warnings; formato, enlaces locales y hashes de evidencia se contrastaron. Los gates de flags,
índice de Creative Studio e inventario/frescura de modelos pasaron; el aviso de TTL de fichas de modelos
es previo e informativo, sin uso de esas rutas en este trabajo.

Se actualizó la entrada HubSpot de Handoff y se añadió el changelog; la rotación archivó íntegramente una
entrada antigua para conservar la ventana activa de 60. `project_context.md` y los routers mantienen su
enlace existente al runbook. La decisión vigente
[de contexto y router](../../architecture/GREENHOUSE_AGENT_CONTEXT_ROUTER_DECISION_V1.md) cubre la
distribución documental; este cierre no cambia schema, autoridad, fuente de verdad ni runtime y no propone
un ADR nuevo. La estrategia individual y la evidencia con PII permanecen fuera del repositorio.
