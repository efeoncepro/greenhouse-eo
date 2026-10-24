# Prospección B2B Efeonce

Nombres de Deal/Lead: [convención vigente Efeonce](../../operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md),
aceptada el 15/10/2026. Marca/cuenta primero y separador ` | `; nuevas altas autorizadas la adoptan.
El histórico se normaliza sólo por lote autorizado con identidad/dedupe, antes/después y readback;
no reescribir snapshots fechados ni alterar asociaciones para acomodar el nombre.

Método compartido para transformar una cuenta, señal o lista focalizada en una ruta comercial sustentada.
Se opera con [efeonce-b2b-prospecting](../../../.codex/skills/efeonce-b2b-prospecting/SKILL.md).
[Decisión técnica](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md) y
[manual](../../manual-de-uso/comercial/operar-prospeccion-b2b.md).

## Qué entrega

Cuenta/entidad compradora, fit con evidencia, problema o hipótesis, objetivo y personas adicionales,
calidad de correo, relación/demanda/proceso separados, ruta principal/alternativa, mensaje o prueba sugerida
y siguiente decisión. Fuentes por campo, fecha de corte, contradicciones y cobertura visibles.
Investigación, preparación, aprobación, escritura/readback y comunicación se informan separadas.

## Cómo se comporta

| Situación | Resultado esperado |
| --- | --- |
| Fría | Hipótesis pertinente y pregunta de encaje/interés basada en señal verificable |
| Tibia/referida | Contexto real del vínculo y acceso posible, sin suponer aval o presupuesto |
| Cálida | Respuesta a la última conversación y siguiente paso bilateral |
| Reactivación | Historia revalidada y motivo nuevo; espera/negativa se respeta |
| Expansión | Impacto/delivery y nueva necesidad separados de aceptación de otra oferta |
| Licitación | Tenders gobierna admisión, canal y plazos; recuperación no es proceso abierto |

Siempre investiga objetivo + una base inicial de 2–3 adicionales relevantes; amplía según roles, decisiones y
riesgos de la oportunidad/fase. La base no es techo ni prueba de grupo completo. Cuenta personas únicas y
funciones críticas por separado; una persona puede asumir varios roles y la cuenta tener varios grupos.
La suficiencia es para el siguiente paso, con brechas/owner/ruta visibles; no exige todo el comité ni champion
confirmado para la primera conversación. Identidad, participación, autoridad, correo y acceso son distintos.
Un rol crítico sin email sigue en el mapa de investigación, sin alta vacía. Comité formal requiere evidencia.
Sigue el [método de cobertura](../../../.codex/skills/efeonce-b2b-prospecting/references/buying-group-and-access.md). Los contactos extra no heredan intención o
relación y no se contactan simultáneamente como efecto de haberlos encontrado. Sin correo corporativo
individual verificado no hay nueva alta Contact/Lead; señal del objetivo permanece en investigación o nota
Company autorizada. La cobertura parcial se entrega con brechas, sin rellenar datos ni gasto ilimitado.
El historial sin correo permanece histórico, sin borrado o migración automática.

### Inferencia, comprobación técnica y atribución

Cuando el operador solicita inferir una dirección, ejemplos públicos de la empresa pueden sustentar una
candidata; no confirman su titular. La comprobación técnica de esa casilla es una operación separada, con
su alcance/costo aprobados, estado normalizado y proveedor real. Una dirección extrapolada con veredicto
inválido se descarta, sin usar el envío como prueba ni enumerar alternativas automáticamente.

Si la candidata pasa la comprobación técnica pero sigue sin atribución directa a la persona, la
[excepción informada individual](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md#aplicación-documental-24102026--calidad-técnica-y-atribución)
conserva ambas dimensiones y requiere autorización de las acciones concretas. No se registra calidad
técnica pendiente cuando ya se obtuvo un resultado favorable, ni se convierte ese resultado en identidad
confirmada. [Lucía y Yvette](../../commercial/prospecting-agent/runs/2026-10-24-lucia-yvette-prospeccion.md)
ilustran el carril normal y la excepción de atribución, con registros y envíos verificados por separado.

## ABM y ABS

El [módulo compartido](../../../.codex/skills/efeonce-b2b-prospecting/references/abm-and-abs.md) conecta ABM
(marketing para cuentas seleccionadas) y ABS (relaciones y proceso comprador). La cuenta se selecciona;
el problema/iniciativa y buying group se desarrollan con Commercial y Customer Model. Intensidad/inversión,
fit ICP, tipo de cliente y relación son dimensiones separadas. Digital Marketing conserva el plan ABM.

La salida incorpora tesis/proof por función, owners, capacidad/costo y progreso observable. Contenido,
actividad y pipeline influenciado no prueban ingreso incremental; muestras/benchmarks no fijan cuotas ni ROI.
[Investigación](../../audits/commercial/2026-10-11-abm-abs-research.md) y [verificación](../../audits/commercial/2026-10-11-abm-abs-skill-update.md).
Método aprobado, piloto/eficacia local pendientes. Uso interno y una posible oferta ABM cliente son decisiones distintas.

## Capacidad operativa ampliada

El [adapter HubSpot](../../../.codex/skills/hubspot-as-a-service/references/account-based-prospecting.md)
guía campos/roles, changeset, concurrencia y readback; es método de agentes, no nuevo software ni API del
gráfico. [Capacidad/economía](../../../.codex/skills/efeonce-b2b-prospecting/references/capacity-and-economics.md)
dimensiona por owner/período con seguimiento y costos conocidos/pendientes. [Discovery/proof](../../../.codex/skills/efeonce-b2b-prospecting/references/discovery-and-proof.md)
conecta criterios con oferta/función, material y derechos. [Aprendizaje](../../../.codex/skills/efeonce-b2b-prospecting/references/experiments-and-learning.md)
conserva outcomes/motivos y vigencia por iniciativa. Plantillas progresivas evitan cargar detalle irrelevante.
[Actualización y verificación](../../audits/commercial/2026-10-11-prospecting-operational-modules-update.md).

## Recorridos operativos por cuenta

La skill convierte señales en hipótesis comprobables y siguiente validación; ofrece entradas para proveedor
actual, saturación del equipo, proyecto puntual, transformación CRM y operación continua. Coordina los pasos
por persona/canal bajo una tesis y owner, con esfuerzo y paradas explícitas. Una respuesta reorganiza el plan:
pedir información no califica, referido no confirma introducción, silencio no demuestra rechazo e interés
no se infiere de bots. Restricciones por persona/iniciativa/cuenta se conservan en el alcance observado.

Correo verificado es un requisito de alta distinto de la preparación del remitente/canal. El módulo de
entregabilidad diagnostica autenticación, suppression, restricciones, reputación y rebotes con evidencia/owner;
no garantiza inbox ni cambia configuración. La pausa diseñada y aplicada, envío y entrega, respuesta e
ingestión HubSpot se informan separadas. Commercial conserva venta/objeciones; HubSpot/proveedor las acciones.
[Manual del recorrido](../../manual-de-uso/comercial/operar-prospeccion-b2b.md#se%C3%B1al-entrada-cadencia-respuesta-y-entrega).

## Seguimientos programados

Con mandato explícito, el [módulo de secuencias HubSpot](../../../.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md)
convierte el plan en pasos personalizados, brochures con contexto, firma predeterminada y calendario
laboral local. Para Julio se conserva HubSpot, no Apollo. Comprobar respuesta a cualquier correo, inicio
futuro y estado Programado por persona; no confundir inscripción, envío, entrega o eficacia. La autorización
es por lote, sin ampliar el heartbeat. [Caso del 13/10](../../commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md).
La versión del documento compartido y el cuerpo/calendario personalizados de inscripción se conservan
como evidencia separada de la plantilla y ventana generales. Firma configurada, preview renderizado y
firma entregada no son equivalentes. [Caso web del 16/10](../../commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md).

## Roles y continuidad

Para radar de convocatorias, la [guía de primera entrada](../../commercial/tenders/RADAR_EARLY_ENTRY_GUIDE.md)
prioriza interés/credenciales/inscripción/visita además de propuesta final. Se avisan señales tempranas
documentadas con acción útil al operador sin esperar el RFP ni certificar elegibilidad. Descubrimiento
amplio y vigilancia de conocidos son independientes, igual que público/privado por Chile/Colombia/México/
Perú; nonprofit aparte, LATAM primero y Palm Desert condicionado. Solape mínimo de 72 horas ampliable
ante indexación tardía acreditada; bloqueo canónico de identidad/URL impide reintentos y avance de marcadores.
Publicación, disponibilidad pública, detección, validación, aviso y margen útil se registran separados;
alta CRM no acredita detección. Menos de cinco días hábiles a la primera puerta muestra detección tardía.
[Socopur 2027](../../commercial/tenders/socopur-agencia-marketing-digital-2027/README.md): entrada tardía
cerrada, sin adjudicación inferida. Método documental; frecuencia, suscripciones y permisos intactos,
sin promesa de exhaustividad o automatización desplegada.

Commercial dirige avance de venta; Customer Model el ICP/grupo comprador; prácticas oferta/capacidad/proof;
Copywriting mensajes; HubSpot CRM/dedupe/asociaciones/readback. Sales opcional apoya la fase adecuada cuando
se encuentra instalado o se invoca; no sustituye reglas Efeonce. El radar personal conserva HSP, reporte,
datos privados y scheduler. La investigación no crea una segunda lista ni automatización; una secuencia
requiere su mandato concreto y readback.

## Límites y verificación

No son resultados comerciales: opens, intent score, etapa/Lead automático, cargo, fee propuesto o brochure
aprobado. Medir conversaciones útiles y pasos acordados por cuenta, con costo y denominador.
La invocación de la skill no fija tarifas ni autoriza cambios de ICP, provider settings, lifecycle/schema o permisos. Gate económico
ICP y estado propuesto del plan outbound tienen discrepancia visible; decisiones del caso van al operador.
Una dependencia ausente afecta el carril concreto; no equivale a ausencia de demanda.
Evaluación offline y espejos validan método/archivos; eficacia, deliverability y ejecución live requieren
evidencia real de uso y, cuando corresponde, una autorización de acción distinta.

Desde el 2026-10-12 la respuesta es proporcional al pedido: contesta primero lo que se preguntó y deja la
entrega completa para dossier o handoff. Un [diferencial ciego bajo Claude](../../audits/commercial/2026-10-12-prospecting-claude-blind-differential.md)
mostró que la skill evita el alta de contactos sin correo, y que antes de la corrección respondía 74 % más largo.

## Seguimiento de largo plazo

La [política aceptada](../../operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md) conserva cuentas con encaje y proveedor
actual tras detener el acercamiento. Hito comprador prevalece; proveedor recién contratado sin hito deja
revisión interna a seis meses, owner/TASK única en **HubSpot** y restricciones vigentes. Notion conserva
trabajo operativo/entregables; no duplica las tareas comerciales. El seguimiento recupera esa
cola aunque cambie el mes del proyecto. Revisar, nutrir con permiso y recontactar autorizado son acciones
distintas; la respuesta no crea opt-in ni oportunidad. [Caso Fabrimetal](../../commercial/follow-up-agent/runs/2026-10-13-fabrimetal-respuesta-parada.md).


## Evidencia por persona y canal — cierre del 24/10/2026

El [lote documentado del chat](../../commercial/prospecting-agent/runs/2026-10-24-cierre-chat-prospeccion.md)
conserva cinco casos con permisos, calidad del correo y resultados independientes. Los cinco EMAIL `SENT`
se corroboraron en CRM; LinkedIn tiene su propia evidencia y Arcor sigue sin ese envío. Sólo NIASA tiene
secuencia autorizada e inscrita. Estados automáticos de lifecycle o Documents no acreditan calificación.
La matriz global se distingue de la persona local; una dirección inferida o un catch-all conservan su
incertidumbre aunque exista un envío. Reutilizar estos casos exige leer su corte y revalidar el dato pertinente.
