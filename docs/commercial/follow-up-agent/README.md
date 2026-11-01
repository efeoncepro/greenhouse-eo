# Seguimiento comercial recurrente

**ARMOR / Indecaucho, delta26/10:** [expediente por iniciativa](../accounts/indecaucho-armor/README.md).
Katia respondió; reunión27/10 14:30Chile, invitación y confirmación con firma verificadas. Preparación y
caso v0 listos; lectura posterior de grabación/transcripción HubSpot/Notion autorizada y programada en
este hilo27/10 16h, una ejecución. El seguimiento global se observó PAUSED y permanece así; no duplicar
cadencia, correo, reunión ni tarea por este dossier. [Protocolo](../accounts/indecaucho-armor/POSTREUNION.md).

**Mandato focal 24/10:** [Lucía y Yvette](runs/2026-10-24-lucia-yvette-secuencias.md) tienen dos secuencias
con dos pasos futuros por persona, Programado verificado y excepción expresa al CCO con registro nativo.
Conservar firma gráfica y parada por respuesta/reunión; este agente no duplica esos correos ni amplía el lote.

## Continuidad del chat de prospección — corte 24/10/2026

El [consolidado de cinco casos](../prospecting-agent/runs/2026-10-24-cierre-chat-prospeccion.md) complementa
la cola existente. NIASA conserva una secuencia nativa inscrita, observada como Programado con pasos
29/10 y 05/11 en zona de México; no duplicarla desde este agente. Arcor mantiene su revisión interna
registrada por el radar separado y LinkedIn sin realizar en el chat. Las revisiones de Fundación Luz y
Arcor existentes en `state.json` no se recrean. María José y Paola no heredan la secuencia de Liliana.
Releer mensajes, rebotes, restricciones y estado nativo antes de proponer continuidad; este cierre
no autoriza nuevos envíos, validaciones pagadas, tareas ni inscripciones.


Owner: Julio Reyes / Commercial. Corte inicial: 2026-10-08, America/Santiago.
Autorización: solicitud explícita del operador de alertas, borradores, tareas en Efeonce Comercial y registro en Markdown; frecuencia confirmada lunes a viernes 09:00 y 16:00.

- [Registro vivo y cola completa](REGISTRO.md)
- [Estado estructurado para deduplicar](state.json)
- [Decisión de autonomía](../../architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md)
- [Proyecto Notion](https://app.notion.com/3f339c2fefe7816ab5b2d29551199c43)
- [Índice comercial](../README.md), [registro CRM](../CRM_DEAL_REGISTER.md), [investigación de licitaciones](../tenders/LICITALAB_PRIORITY_QUEUE_2026-10-05.md).

## Contrato operativo

Este agente de Codex revisa el trabajo comercial existente. Complementa el radar diario de prospección HubSpot; no lo sustituye ni duplica. No depende de créditos de Breeze. El scheduler vive en la app Codex, no en producción Greenhouse.

HubSpot es la fuente de objetos, etapas y **tareas comerciales**; Notion de trabajo operativo y
entregables; Outlook de comunicaciones. Revisiones de cuenta, follow-ups, llamadas y próximos pasos
comerciales nuevos se crean/reutilizan como TASK de HubSpot. Los históricos Notion se conservan, sin
migración masiva ni duplicados por defecto. Las bases, ficha y anuncios vigentes del comprador gobiernan plazos y admisibilidad. Markdown guarda evidencia observada, decisiones y continuidad, no es un CRM alternativo.

## Seguimiento de correos manuales

Aplicar [cadencia y reconciliación](../../../.codex/skills/hubspot-as-a-service/references/manual-outreach-follow-up.md). Yanbal, Lotus y Olivos tienen primer correo enviado el 08/10 y tareas con borradores para el 13/10; revisiones tentativas 19/10 y 26/10. [Evidencia y textos compartidos](runs/2026-10-08-outreach-manual.md). Una conversación por cuenta; no avanzar sin envío previo confirmado ni insistir ante respuesta/rechazo/rebote. El heartbeat existente prepara y alerta, sin envío automático.

[Ronda del 13/10](runs/2026-10-13-outreach-personalizado.md): Paula, Nicol, Fiorella, Sergio, Hernán y Jesús
ya tienen un primer correo enviado desde Outlook; seis actividades HubSpot `SENT` verificadas. No preparar
otro primer contacto para ellos ni escribir a sus alternativas como efecto de la revisión. Rafael quedó
excluido por Julio. Mandato posterior: [18 seguimientos programados en HubSpot](runs/2026-10-13-secuencia-hubspot.md)
para el 16/22/29 de octubre; seis inscripciones `Programado` verificadas, parada por respuesta. No duplicarlos
desde el heartbeat ni usar Apollo. Esta autorización es acotada y no amplía la autonomía general.

## Señales de documentos después del envío

En las fuentes ya cubiertas por cada corte, revisar avisos pertinentes de Documents y aplicar
[visitas a documentos](../../../.codex/skills/efeonce-b2b-prospecting/references/document-engagement-signals.md).
Contrastar detalle nativo e historial antes de recomendar un borrador o cambio de prioridad. Si no se
puede leer el documento, declarar esa brecha; no reportar cobertura integral de Documents por un aviso.
Visita no es respuesta ni permiso de envío; HOLD/bajas y pasos existentes prevalecen. Reusar expediente,
clave y scheduler. [Caso26/10](runs/2026-10-26-indecaucho-documento-seguimiento.md): envío humano autorizado
por separado, con Enviados y EMAIL corroborados, sin nueva autonomía recurrente.

## Seguimiento de largo plazo

Aplicar la [política aceptada](../../operations/EFEONCE_LONG_TERM_PROSPECT_FOLLOWUP_POLICY_V1.md): conservar cuenta con encaje,
proveedor/motivo y restricciones; seis meses de revisión interna para proveedor recién contratado sin hito.
Recuperar las TASK de HubSpot abiertas de largo plazo por ID/clave de `state.json.actions`, aunque no haya lead/correo
reciente o termine el proyecto de origen. No crear otra por cambiar de mes. Mantenerlas como espera futura
hasta la ventana de siete días, salvo señal pertinente; sin alertas reiteradas, borrador ni envío automático.
Al vencer, decidir continuidad con evidencia actual; nutrición por email requiere permiso verificable y
mandato, y recontacto nueva autorización dentro de las restricciones. [Fabrimetal](runs/2026-10-13-fabrimetal-respuesta-parada.md)
es el primer caso con revisión interna 13/04/2027; comunicaciones siguen detenidas.

Caso autorizado separado del 16/10: [Fabricio / web](runs/2026-10-16-fabricio-web-hubspot.md), tres
seguimientos programados en HubSpot. Conservar la secuencia nativa; no duplicarla desde este agente.

## Cada ejecución

1. Leer AGENTS.md, project_context.md, Handoff.md, este contrato, REGISTRO.md y state.json. Cargar hubspot-as-a-service, greenhouse-public-private-tenders y documentación comercial pertinente; notion-platform si hay trabajo operativo, entregables o históricos Notion que consultar.
2. Confirmar fecha/hora America/Santiago, portal HubSpot 48713323, identidad y mailbox Outlook jreyes@efeoncepro.com. Leer todos los pipelines; paginar hasta agotar todos los negocios abiertos. Recuperar además todas las revisiones internas futuras abiertas del ledger por ID/clave, independientemente del mes/proyecto de origen. Revisar también investigación reciente sin Deal, leads y compromisos de los últimos 14 días; incluir propuestas cerradas solo si dejan un compromiso pendiente verificado.
3. Cruzar descripción, hs_next_step, fecha_de_cierre_de_licitacion, notes_next_activity_date y cambios recientes. closedate es forecast, nunca deadline de oferta. Leer las notas/hilos/documentos que cambien la decisión. Buscar Outlook desde el último corte exitoso con 48h de solapamiento; primera recuperación usa 14 días. Paginar y declarar cobertura parcial cuando proceda.
4. Buscar respuestas, enviados, borradores y tareas previas antes de proponer un envío. Leer el último mensaje real completo; resumen IA no prevalece sobre respuesta directa del comprador. Respetar rechazos, opt-outs, NO-BID, HOLD y límites de propuesta.
5. Revalidar cambios de fechas en LicitaLAB/Mercado Público/Wherex o correos oficiales. Mantener fecha original, zona, fuente y observación. Si hay conflicto, alertar y pedir validación con margen conservador; nunca inventar UTC. Un cierre vencido no prueba pérdida ni postulación.
6. Priorizar: plazo vencido con acción sin conciliar; cierre/compromiso antes de la siguiente revisión; <=24h; <=72h; <=7d; después preparación. Anticipar lunes y fin de semana en el corte del viernes. Si el plazo cae a las 09:00, resolver el día hábil anterior. La fecha interna recomendada se etiqueta distinta del plazo del cliente. La cadencia es lunes–viernes; no se omiten festivos automáticamente.
7. Crear/reutilizar **TASK comerciales en HubSpot portal 48713323**, tras verificar identidad, permiso TASK read/write, enums y owner (Julio 75788512, revalidar). Incluir objetivo, criterios de revisión, contexto/fuentes, fecha del equipo vs deadline externo, bloqueo y siguiente paso; asociar registros Contact/Company/Deal existentes pertinentes. Buscar duplicados y leer contenido/estado/fecha/owner/asociaciones después. Notion data source 2a539c2f-efe7-8177-a02d-000b4e8604c0 conserva trabajo operativo/entregables y tareas históricas; no crear allí duplicado de la tarea comercial ni migrar otros históricos en lote.
8. Aplicar la [política de firma gráfica oficial y CCO HubSpot](../../operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md) a todos los borradores de Julio, incluidos seguimientos: CCO `48713323@bcc.hubspot.com` y firma gráfica oficial siempre, por Outlook UI o HTML autorizado. La decisión del 21/10/2026 sustituye la ruta histórica de firma en texto; si no se conserva la firma gráfica, el borrador queda incompleto. No amplía la autorización del agente. Preparar borradores personalizados cuando haya contexto suficiente. Reutilizar hilo original y destinatarios verificados. No inventar adjuntos, reuniones, credenciales, experiencia, precios, garantía de resultados ni autoridad de compra. Si Outlook permite guardar, crear borrador y leerlo de vuelta; si devuelve 403, registrar el texto en la tarea/Markdown, sin reintentos repetidos ni escalación de permisos. No sobrescribir borradores humanos; conservarlos y sugerir ajustes en la tarea.
9. Verificar cada escritura por lectura independiente y registrar resultado/ID. No cerrar tareas por haber creado un archivo: requiere evidencia de la DoD. Si hay respuesta pero falta acción, cambiar la recomendación sin dar el trabajo por terminado. No modificar campos humanos ajenos al seguimiento.
10. Actualizar REGISTRO.md y state.json, añadir una entrada fechada de ejecución con cobertura, cambios, IDs, borradores, alertas y bloqueos. Preservar historia; archivarla con enlace si crece. En checkout compartido, releer antes de editar y preservar cambios ajenos.
11. Entregar SIEMPRE reporte en español en este chat: urgente antes del próximo corte; próximos siete días; tareas/borradores nuevos o actualizados con links; esperas/decisiones; cobertura y fallas. Si no hay novedades, decirlo. Alertas en Codex; no mandar notificaciones por email/Teams/Slack.

## Deduplicación y autoridad

Clave estable: followup:<deal-id o código licitación o cuenta>:<acción-semántica>. Fechas/versiones se guardan aparte; no crear otra tarea por ejecutar el agente de nuevo. Consultar también tareas terminadas y relaciones padre/proyecto. Una propuesta terminada no impide una tarea posterior distinta de seguimiento, pero no se reabre ni duplica.

Tras timeout/resultado incierto de una escritura, buscar y leer antes de reintentar. Registrar proposed, attempted, created, verified, blocked o unknown de forma honesta. No duplicar alertas como hallazgos nuevos; un riesgo crítico abierto puede repetirse con su ID y estado.

Autorizado de forma recurrente: lectura, investigación, crear/actualizar TASK comerciales en HubSpot y asociarlas a registros existentes verificados, borradores sin envío y documentación local. Prohibido sin nuevo mandato: enviar/programar emails, mensajes externos, secuencias/Prospecting Agent, presentar ofertas, cambiar otros objetos CRM/etapas/segmentos, crear Contact/Company/Lead/Deal, compras/créditos, permisos, borrados y commits/push. La TASK no crea autoridad de contacto; sólo se marca completada con evidencia de su resultado.

Criterio del operador sobre postulaciones por plataforma (08/10/2026): en licitaciones por plataforma en general —Wherex, Mercado Público y oportunidades consultadas mediante LicitaLAB conectado con Mercado Público—, no exigir conversación o respuesta previa del comprador como condición automática para preparar la oferta. Buscar contacto del proceso/canal de preguntas disponible; si no existe, registrar esa limitación y trabajar con bases y supuestos acordados. No repetir aclaraciones imposibles como bloqueos. Facturación/soporte no son interlocutores del proceso. [Detalle y búsqueda UTEM](../EFEONCE_DATOS_PARA_LICITACIONES.md#operación-por-plataforma-y-contacto-previo--criterio-de-julio-08102026).

Una señal sigue siendo lead hasta calificación. Los Deals existentes se conservan por instrucción del operador; tener un Deal o pertenecer a un segmento no acredita calificación, consentimiento ni autoridad de envío. Para altas autorizadas por separado, reutilizar segmentos activos existentes y completar sólo propiedades respaldadas; no crear más segmentos ni eliminar los estáticos. El agente de seguimiento sólo recomienda estas acciones: su autonomía recurrente no incluye ejecutarlas. [Readback de Diego/Emily y segmentos](../../audits/commercial/2026-10-08-prospecting-agent-active-segments.md). Sika Q4 continúa HOLD; Sika 1164 conserva técnica descartada fuera de uso. Nunca deducir GO por tener un plazo próximo.

## Continuidad vigente de preparación

UTEM `5251-1060-COT26`: anexos 1, 2B, 3 y 4 completados y firmados en Word/PDF, con originales preservados. Julio confirmó accionista único 100%, teléfono y cuenta bancaria; para este proceso confirmó ausencia de vínculos y deudas con UTEM y ejecución in-house sin subcontratación. Confirmó además habilitación en Mercado Público. Reutilizar los [datos confirmados](../EFEONCE_DATOS_PARA_LICITACIONES.md), sin pedirlos otra vez salvo evidencia nueva; son declaraciones del operador, no certificados ni nueva consulta de plataforma.

Carpeta: `Licitaciones/UTEM/1. Agencia SEO-AEO`. Convención permanente: `Licitaciones/<Empresa o institución>/<N>. <Nombre de la licitación>`. Mantener cada proceso separado, sus originales y código oficial. La autorización de usar la firma corresponde a los anexos de UTEM y no se extiende a otras declaraciones o propuestas.

Siguiente acción UTEM: **revisar evaluación/resultado**. Oferta presentada por Julio el08/10/2026, confirmación de Mercado Público conservada; tres meses, netoCLP4.800.000, IVA912.000, total5.712.000. HubSpot Presentación de soluciones/amount4.800.000 verificados; tarea Notion existente en Enviada, DoD y resumen actualizados y releídos. No repetir preparación ni exigir otra decisión de envío. [Evidencia](../tenders/utem-seo-aeo-2026/PRESENTACION-2026-10-08.md). Validaciones internas de costo/margen/capacidad/panel siguen pendientes y no se declaran completadas. Sin adjudicación confirmada.

## Estado técnico observado en el corte inicial

Evidencia histórica del 08/10/2026 a las 07:11 Chile: primera revisión manual ejecutada; heartbeat `seguimiento-comercial-plazos-y-pr-ximos-pasos` ACTIVE y configuración verificada en la app y archivo local, adjunto a este chat. L–V 09:00/16:00 America/Santiago; en ese corte se esperaba la primera corrida a las 09:00 del 08/10. Esa previsión no confirma que se haya ejecutado. Una corrida programada aún no es evidencia de ejecución. Si faltan conectores, continuar con las fuentes disponibles y marcar el corte parcial; no afirmar pipeline actualizado.

Outlook lectura verificada en el corte inicial; creación de reply draft devolvió `403 ErrorAccessDenied` el 08/10. Es el último intento documentado, no una comprobación permanente de que siga bloqueado. Una reconexión o cambio informado requiere prueba acotada de guardar y leer un borrador, sin envío ni asumir permisos por la sola disponibilidad de la herramienta. Tres textos preparados en Notion (Pibank SEO, Pibank CRM y SGS), ninguno enviado. Existen borradores SKY del usuario que se preservan.

Actualización documental del 08/10: no constituye una nueva auditoría completa del CRM/correo, readback del scheduler ni sincronización de tareas externas. `state.json.observed_at` conserva el corte de datos; los deltas documentales se registran por separado.
