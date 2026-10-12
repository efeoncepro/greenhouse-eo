# Entregabilidad operativa antes y después del envío

Cargar al preparar outreach autorizado, dimensionar una ola o revisar una incidencia de correo. Este módulo
organiza la evidencia y el siguiente chequeo; no es una auditoría ya ejecutada de Efeonce ni autoriza un envío,
cambio DNS, alta de dominio, suscripción, secuencia o corrección del proveedor. Usar
[delivery-readiness](../templates/delivery-readiness.md) en el dossier privado existente.

Un correo individual verificado habilita el gate de datos de [calidad de contacto](contact-quality-and-enrichment.md).
La aptitud del remitente y el permiso de usar el canal son decisiones separadas. Apollo `verified` no certifica
el empleo, la identidad, el consentimiento, la reputación del remitente ni que un mensaje llegue a Inbox.
Conservar la incertidumbre catch-all; no admitir direcciones deducidas ni resolverla con un envío de prueba al
prospecto. Un cambio de empleo o un rebote exige revisar la dimensión afectada antes del siguiente uso.

## Preparar una lectura proporcional

Identificar remitente/mailbox, dominio From, transporte real, tipo de mensaje, destinatarios y ventana. Una
secuencia desde inbox conectada, correo de marketing y envío Outlook directo tienen contratos y telemetría
distintos; un estado de uno no prueba el otro. Reutilizar evidencia vigente del mismo carril y aprobaciones del
alcance; no repetir una auditoría completa para cada respuesta individual. Para ampliar volumen/cambiar
carril o ante una incidencia, revisar el baseline y sus límites antes del tramo dependiente.

Usar **conocido**, **pendiente** y **bloqueado** en cada dimensión. Conocido exige resultado, fuente/fecha y
alcance; puede ser favorable o adverso. Pendiente significa evidencia insuficiente, nunca aprobación tácita.
Bloqueado indica restricción o fallo concreto que impide esa acción; un defecto conocido y corregible (firma
incompleta, CCO ausente) se decide «no listo: defecto conocido corregible». Lo no aplicable lleva razón; no
es un cuarto resultado técnico. El próximo chequeo tiene responsable y fecha/evento, sin crear otro scheduler.

| Dimensión | Evidencia mínima útil y lectura | Responsable / próximo chequeo |
| --- | --- | --- |
| Destinatario | Dirección exacta atribuida, empleo y verificación con fuente/fecha; contradicción o catch-all sin resolver queda pendiente | Prospecting; refrescar dato afectado, sin gasto fuera del alcance |
| Uso y restricciones | Autorización concreta, preferencias/baja/HOLD y proceso comprador; comprobar alcance persona/canal/cuenta. No sortearlos con otro email, remitente o colega | Commercial / owner de cuenta; detener lo restringido y conservar evidencia |
| Remitente y transporte | Mailbox/identidad autorizados y conexión efectiva del rail; no inferir por login CRM o dominio del sitio | Owner de correo/HubSpot según rail; lectura o prueba autorizada si hace falta |
| Autenticación y alineación | Evidencia DNS/config y, cuando disponible, headers de mensaje representativo del mismo rail: SPF, DKIM y DMARC por separado, dominios y resultado/alineación | Administrador de correo/DNS; verificar brecha exacta. Un TXT presente no demuestra firma efectiva |
| Reputación y restricciones de envío | Incidentes, bloqueos, quejas, NDR/rebotes y telemetría disponible con ventana/muestra. Falta de dashboard o muestra no equivale a reputación buena ni cero quejas | Owner de correo; revisar alcance afectado antes de reanudar/ampliar |
| Volumen y capacidad | Límite efectivo de proveedor/tenant/mailbox/rail y carga ya existente, incluyendo destinatarios Para/CC/BCC; lote propuesto y capacidad de responder/seguir por cuenta | Owner de correo + Commercial; elegir alcance justificable, no cuota tomada de un benchmark |
| Mensaje y salida | Contexto verificable, identidad/asunto transparentes, enlaces/adjuntos aprobados, destinatarios exactos y mecanismo de baja apropiado al tipo de correo | Copywriting + owner de envío; revisar borrador autorizado |
| Parada y seguimiento | Owner, condición de pausa, respuestas/bajas/rebotes visibles y mecanismo real de contención; configuración efectiva de secuencia si se usará | Commercial + HubSpot; comprobar antes de enrollment, sin activarlo como prueba |
| Registro CRM | Carril de logging/asociación y readback previsto; no confundir BCC con actividad registrada | HubSpot; verificar actividad después del envío permitido |

Un único primer mensaje individual exige atribución y empleo vigentes, supresión u opt-out efectivos
consultados, autorización de envío, firma y CCO según la política vigente y salida desde la casilla
corporativa normal. Como una respuesta puntual autorizada, sin indicios de problema no exige dashboards de
reputación ni baseline de rebote; declarar lo que no se observa. Una restricción/baja, destinatario no
elegible o incidente activo sí detiene su carril. Una ola exige volumen aprobado, baseline y alineación de
autenticación; si una brecha impide justificarla, dejarla pendiente de su owner y avanzar con
investigación/borradores. Si el pedido dice «campaña» y los hechos describen un solo contacto, declarar esa
lectura y responderla. Nunca convertir falta de telemetría en permiso para escalar. Cambios correctivos se
entregan como propuesta concreta al owner con su autoridad propia.

## Autenticación: qué verificar y qué no inferir

SPF evalúa la fuente autorizada para el dominio del envelope; DKIM verifica una firma del dominio firmante.
DMARC vincula el From visible con un mecanismo que pasa y alinea según la configuración aplicable. Registrar
dominio From, MAIL FROM/Return-Path y DKIM `d=` cuando existan: SPF y DKIM `pass` separados no aseguran
DMARC si no hay alineación. DNS/configuración y resultados de un mensaje son evidencias diferentes.
[Microsoft explica estos mecanismos](https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about).

La autenticación no acredita interés, permiso, entrega ni lectura. Los headers de un envío antiguo, otro
dominio o transporte no validan el carril nuevo. No subir `p=none` a `quarantine/reject`, añadir un sender a
SPF, configurar DKIM ni modificar filtros como efecto de una revisión de prospección. No adoptar rotación de
dominios/remitentes, dominios alternos o parecidos ni bots de warm-up, ni de forma preventiva ni para rodear
restricciones; tampoco listas compradas o allowlists para rodearlas. Esa infraestructura la decide su owner.

## Reglas del proveedor: alcance antes que cifras

Separar requisitos **del receptor** de límites **del emisor**. Para cada norma aplicable registrar producto,
tipo de destinatario/mensaje, ventana y agregación de volumen; volver a la fuente si cambia el rail/lote.

- [Gmail](https://support.google.com/mail/answer/81126?hl=en) diferencia requisitos generales y bulk para
  cuentas personales `gmail.com`/`googlemail.com`. Su
  [FAQ](https://support.google.com/mail/answer/14229414?hl=en) define bulk por cerca de 5.000 o más mensajes
  a esas cuentas en 24 horas, agregados por dominio principal; no equivale a 5.000 por mailbox ni a todas las
  cuentas corporativas con MX Google. Para bulk, SPF/DKIM/DMARC y alineación tienen exigencias específicas;
  one-click unsubscribe aplica a mensajes de marketing/suscritos. Ese umbral no es una cuota objetivo Efeonce.
  Google conserva la clasificación bulk una vez alcanzada: revisar historial/estatus, no sólo el lote actual.
- [Exchange Online](https://learn.microsoft.com/en-us/defender-office-365/outbound-spam-sending-limits-troubleshoot)
  combina límites del servicio y políticas outbound; revisar los efectivos del tenant/mailbox. Microsoft
  aclara que no está diseñado para envío masivo. Una cuota máxima del servicio no es volumen recomendado
  ni permiso de envío. Una norma de Outlook.com consumidor no se generaliza a todos los tenants Microsoft 365.
- [Outlook.com consumidor](https://techcommunity.microsoft.com/blog/microsoftdefenderforoffice365blog/strengthening-email-ecosystem-outlook%E2%80%99s-new-requirements-for-high%E2%80%90volume-senders/4399730)
  publica requisitos high-volume para dominios de más de 5.000 mensajes/día, en el servicio que cubre
  `outlook.com`, `hotmail.com` y `live.com`: SPF/DKIM/DMARC y rechazo por autenticación incumplida con
  `5.7.515`. Confirmar alcance/agregación del caso en la fuente vigente; no trasladar esa cifra a una cuota
  permitida del emisor ni tratar cualquier NDR de Microsoft 365 como ese diagnóstico.
- [HubSpot](https://knowledge.hubspot.com/sequences/unenroll-from-sequence) puede retirar de secuencia por
  rebote/baja y configurar paradas por respuesta/reunión a persona o empresa. Verificar configuración real:
  no asumir que todo colega queda detenido. Enrollment ejecuta el primer paso inmediatamente; no es una
  forma de comprobar readiness. Marketing, secuencias e inbox directo conservan restricciones distintas.

No adoptar tasas de bounce, volúmenes por día, número de toques ni warm-up del vendor como defaults.
Dimensionar con [capacidad](capacity-and-economics.md), evidencia del rail y tesis de cuenta. La revisión de
entregabilidad no decide una base jurídica ni autoriza un canal prohibido por términos/política efectiva.

## Diagnosticar rebotes sin castigar la dimensión equivocada

Guardar NDR/código, mensaje/fecha, destinatario afectado y rail en el dossier privado. No guardar headers
completos con PII/tokens en ejemplos del repo. Leer motivo y respuesta del servidor además del label del CRM.
[HubSpot distingue hard/soft y límites de observabilidad por rail](https://knowledge.hubspot.com/marketing-email/what-is-the-difference-between-a-hard-bounce-and-a-soft-bounce).

| Evidencia | Decisión prudente y siguiente validación |
| --- | --- |
| Dirección inexistente o empleo/casilla desactualizados confirmados | Detener uso de esa dirección; refrescar identidad/empleo y obtener otra dirección atribuida/verificada dentro de permisos. No crear una por patrón, borrar historial ni reenviar para comprobar |
| Hard bounce sin diagnóstico, filtro, autenticación o bloqueo de política; incluye un 5.7.x sin reporte completo | Un 5.7.x es permanente por clase y de política o seguridad por causa: como cualquier hard bounce, no prueba por sí solo que la persona/email no exista ni invalida el correo. Pausar tramo afectado —al menos los envíos a esa dirección por ese canal—, conseguir el NDR completo y diagnosticar con el owner del canal. Sin reenvío automático; no quitar supresión ni cambiar de dominio o remitente para pasar |
| Soft/deferred, cuota o problema temporal | Conservar pendiente; revisar cola/reintentos del transporte antes de otro envío. Elegibilidad futura del provider no autoriza reintento manual automático; fijar condición/owner de recuperación |
| Varios destinatarios fallan en mismo rail/ventana | Revisar causa común y contener tramo relacionado; no invalidar en masa correos individuales por un fallo del emisor |
| Baja, queja o negativa | Respetar alcance de restricción y detener contactos dependientes. No tratarlo como falla técnica que resolver con enriquecimiento o contactos adyacentes |

HubSpot no detecta bounces de mensajes enviados fuera de su herramienta; para Outlook directo revisar
Outlook/NDR además del registro por BCC. Tampoco asumir que cada bounce visible en inbox se sincronizó a
supresión CRM. La corrección de estado, pausa/unenrollment o desbloqueo real necesita carril/permiso y
readback; documentar una incidencia no ejecuta esas acciones.

## Verificar resultado con estados separados

| Estado | Evidencia que permite afirmarlo | Límite |
| --- | --- | --- |
| Preparado | Borrador y readiness revisados | No enviado |
| Aceptado por API/cola | Respuesta del transporte/request ID | Puede fallar después; resultado incierto exige reconciliar antes de repetir |
| Enviado | Copia/readback en Enviados con remitente, destinatarios, cuerpo y tiempo | No certifica entrega |
| Entrega reportada | Traza/evento exacto de mensaje y destinatario | Describir rail/evento; no afirmar Inbox ni lectura |
| Inbox observado | Evidencia autorizada del destino o confirmación explícita pertinente | No generalizar a otros destinatarios/envíos |
| Respuesta humana | Mensaje humano pertinente leído en contexto | Separar OOO/bot/baja/negativa de conversación útil; no heredar calidez a colegas |
| Ingestión HubSpot | Actividad exacta y asociaciones leídas independientemente en portal autorizado | No prueba entrega ni nuevas acciones de CRM |

Una traza Exchange `Delivered` puede incluir spam/quarantine: revisar eventos antes de describir ubicación.
[Microsoft documenta esta limitación](https://learn.microsoft.com/en-us/exchange/monitoring/trace-an-email-message/message-trace-faq).
Open/click tampoco certifican Inbox o interés. Si falta readback, reportar el estado obtenido y el pendiente,
sin enviar un duplicado para completar la evidencia.

Para Julio en Outlook se aplica la [política vigente](../../../../docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md):
firma oficial por la vía aprobada y el CCO de registro que esa política define (el literal, sólo cuando el
operador lo necesita para corregir o preparar ese envío), comprobados antes; Enviados y actividad CRM después
cuando haya acceso. La política no se extiende a otro remitente ni concede autorización de envío.

## Fuentes, vigencia y límites

Consulta de documentos públicos: **2026-10-11**. Método Efeonce: gates/owners de este bundle y política Outlook.
Las fuentes primarias enlazadas sustentan mecanismos/comportamientos del producto, no su configuración
efectiva en Efeonce. No se auditó DNS, tenant, sender, reputación ni cuentas de destino en esta actualización.
Reconsultar requisitos y reglas efectivas antes de aplicarlos a un caso, sin extrapolar destinatarios o cuotas.

[Apollo Email Status Overview](https://knowledge.apollo.io/hc/en-us/articles/4423314404621-Email-Status-Overview)
describe labels y catch-all. Sus afirmaciones comerciales de precisión/Inbox no se convierten en garantías
de esta skill. No fija créditos/costos vigentes; usar contrato y plan verificados de enriquecimiento.
Fuentes se refrescan por cambio de transporte, proveedor, regla, comportamiento o evidencia contradictoria.
