# ANAM — Emma: revisión de voz, soporte y correspondencia del 21-10-2026

> **Estado:** análisis y correo enviados; ajustes de configuración no ejecutados.
> **Cliente / portal:** ANAM / `19893546`.
> **Owner:** Julio Reyes / práctica HubSpot as a Service.
> **Corte:** 21-10-2026, después de la respuesta de María Paz de las 18:28:40, America/Santiago.
> **Alcance de este registro:** continuidad de la revisión de este hilo, evidencia de correspondencia y clasificación de soporte. No es una nueva auditoría live completa del portal.

## Decisión del operador

Mantener la implementación ya entregada y limitar la intervención de la agencia a ajustes menores de soporte.
Cualquier cambio sustancial se evalúa primero por viabilidad, impacto y esfuerzo; puede requerir cotización
adicional y aprobación independiente. No comprometer proyectos, reuniones, migraciones, automatizaciones ni
cambios de canal como consecuencia implícita de esta revisión.

El soporte documentado cubre del 13-08 al 12-11-2026: incidentes, correcciones, dudas de operación y recuperación
de lo construido. Ver [contrato de soporte](../documentation/hubspot-as-a-service/anam-entrega-documentacion-y-soporte-2026-09-02.md).
La autorización de Julio para enviar la respuesta no autorizó modificar Emma. El pedido posterior de guardar
y hacer commit tampoco autoriza nuevos correos ni cambios en HubSpot.

## Hallazgos conservados de la revisión

- La voz del 600 sigue siendo Lina, aceptada por Julio. Diseño: Emma primero, IA 24/7 y humanos lunes a viernes
  09:00–18:00, America/Santiago, con Pablo Puga, María Paz Haeger y Marco Jiménez como destinatarios simultáneos.
  No se configuró menú IVR. Base y prueba inicial: [auditoría del 19-10](ANAM_CUSTOMER_AGENT_VOICE_SETUP_2026-10-19.md).
- Las preguntas técnicas responden al diseño ANAM para orientar y reunir antecedentes por servicio. Acortar
  indiscriminadamente las instrucciones generales podría degradar chat y correo. No se validó una separación
  nativa e independiente de todos los cuestionarios por canal; no equivale a declarar que toda diferenciación sea imposible.
- En las llamadas revisadas en este hilo, Emma entendió la petición de una persona e intentó transferir; la atención
  terminó en buzón. No se estableció la causa exacta ni se acreditó una transferencia atendida por una persona.
  El correo enviado conserva este resultado; los IDs de esas llamadas no quedaron incluidos en esta síntesis.
- La revisión previa situó voz y chat en Help Desk y el correo Ventas en Inbox. No es correcto afirmar que voz
  esté necesariamente fuera del lugar del chat, ni que los tres compartan hoy la misma bandeja.
  Unificar o mover canales queda como evaluación separada, no como corrección prometida.
- Pedir nombre, empresa o correo durante una llamada no prueba asociación del contacto, identidad del cliente
  ni determinación de su ejecutivo. Una coincidencia telefónica depende de los datos existentes y puede ser ambigua.
  No atribuir la ausencia de asociación a una causa única sin examinar el número y los registros.

## Capacidad, límite y alcance

| Tema | Clasificación y criterio |
| --- | --- |
| Saludo telefónico y mensaje de buzón | Ajuste menor de soporte sobre mensajes existentes; conservar voz y diseño aprobados. |
| Repeticiones y extensión de respuestas | Ajuste puntual solo si conserva la captura técnica y no cambia reglas globales de atención. Si exige separar comportamientos o rediseñar el flujo, evaluar alcance. |
| Destinatarios, horario y timbrado | Revisar y corregir discrepancias con lo ya configurado; no introducir otra distribución por defecto. |
| Disponibilidad y recepción en el equipo del usuario | Duda de operación cubierta por soporte; verificar estado, entorno y permisos existentes. No asumir que falta una licencia ni comprar/ampliar permisos por inferencia. |
| Voz que solo identifica y deriva, mientras texto mantiene asesoría técnica | Cambio funcional por evaluar: capacidad real del portal, aislamiento por canal e impacto en texto. No está validado ni incluido como simple ajuste. |
| Derivación automática al ejecutivo de cada cliente | Requiere validar identificación, dato del responsable y destino telefónico soportado. No está acreditada por el handoff por intención del chat. |
| IVR, nuevos workflows, integraciones o unificación de canales | Evaluación de alcance y eventual cotización; no necesarios para explicar cómo recibir una transferencia de la línea actual. |

La [documentación de Customer Agent Voice](https://knowledge.hubspot.com/calling/set-up-customer-agent-voice),
releída el 21-10, confirma que comparte configuración y conocimiento con texto, pero el handoff de voz usa
horarios y destinatarios del canal telefónico. Las opciones generales de Actions & handoff no se aplican
al canal de llamadas. No se puede trasladar directamente el workflow de chat `1876744588` al teléfono.
HubSpot documenta transferencia a humanos o a un IVR existente: IVR posible no significa necesario ni configurado.
La conversación telefónica requiere transferencia en ese momento; no conserva una llamada en espera durante horas
como una conversación escrita pendiente. La beta admite propiedades de contacto según permisos, pero no acredita
acciones CRM avanzadas o integraciones externas equivalentes a texto. No se declara imposible lo que solo está
pendiente de validación en ANAM.

## Correo enviado y verificado

- **Asunto:** RE: Emma ya atiende el 600 de ANAM: prueba, operación y consumo de créditos
- **Enviado:** 21-10-2026 18:20:34 America/Santiago (`2026-10-21T21:20:34Z`).
- **De:** Julio Reyes, `jreyes@efeoncepro.com`.
- **Para:** María Paz Haeger, `mhaeger@anam.cl`; Oscar Carrasco, `ocarrascos@aguasandinas.cl`.
- **CCO:** `48713323@bcc.hubspot.com`.
- **Formato:** respuesta en el hilo, firma gráfica oficial de Julio conservada y comprobada visualmente,
  con retrato, logo, lema y franja de partners; historial citado preservado.
- **Verificación:** copia enviada reabierta en Outlook y leída mediante connector; destinatarios, CCO,
  contenido y firma contrastados. [Abrir correo enviado](https://outlook.office365.com/owa/?ItemID=AAMkAGZlMmI1M2U1LTIyZWQtNDFkNC05MTJjLTE3ZWU2ZDM0NWFiNQBGAAAAAADxl4bkLvSfSYZqEzxL3EY1BwAR61VaBWh6QqphZWDfIIRIAAAAAAEJAAAR61VaBWh6QqphZWDfIIRIAAQSWNunAAA%3D&exvsurl=1&viewmodel=ReadMessageItem).
- **Registro CRM:** portal Efeonce `48713323`, EMAIL `119253278227`, estado `SENT`, fecha de actividad
  `2026-10-21T21:20:40.167Z`, ambos destinatarios coincidentes.
  [Abrir registro en HubSpot](https://app.hubspot.com/contacts/48713323/objects/0-49?filters=%5B%7B%22property%22%3A%22hs_object_id%22%2C%22operator%22%3A%22EQ%22%2C%22value%22%3A%22119253278227%22%7D%5D&utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search).
  No se creó nota duplicada ni integración de datos ANAM→Greenhouse.
- Envío/registro no prueban lectura de Oscar. La respuesta posterior de María Paz sí acredita que recibió
  el mensaje al que responde; no una aceptación de cambios.

### Texto enviado, sin firma gráfica ni historial citado

Hola María Paz y Oscar,

Revisé las llamadas registradas, sus transcripciones y la configuración de
Emma para distinguir qué podemos ajustar dentro del soporte y qué implicaría
cambiar el funcionamiento implementado.

Las preguntas de Emma responden a la parametrización que trabajamos para ANAM:
orientar y reunir los antecedentes necesarios según el servicio solicitado.
Como las instrucciones generales se comparten entre voz, chat y correo,
reducirlas globalmente podría afectar la atención de los canales escritos.

Dentro del soporte podemos abordar ajustes puntuales:

• Acortar y aclarar el saludo telefónico.

• Afinar repeticiones y respuestas innecesariamente extensas, conservando los
antecedentes técnicos necesarios.

• Revisar que los destinatarios, horarios y timbrado correspondan a la
transferencia configurada, y corregir cualquier discrepancia.

• Mejorar el mensaje del buzón cuando no se logre completar la transferencia.

En las llamadas revisadas, Emma reconoció la solicitud de hablar con una
persona e intentó transferir, pero la atención terminó en el buzón. Esto no
confirma por sí solo una falla: la recepción también depende de que los
usuarios estén disponibles y tengan habilitadas las condiciones necesarias
para recibir llamadas en HubSpot.

Respecto de la identificación, Emma puede pedir datos durante la conversación,
pero eso es distinto de reconocer automáticamente al contacto y conocer su
ejecutivo. El reconocimiento telefónico depende de que HubSpot encuentre una
coincidencia con los datos registrados; no debemos asumir que cualquier
llamada permite identificar al cliente.

Si necesitan un funcionamiento diferente —por ejemplo, que por teléfono Emma
solo identifique y derive, que transfiera al ejecutivo de cada cliente o que
incorporemos un menú IVR—, primero evaluaríamos la viabilidad y el alcance.
HubSpot permite algunas de estas configuraciones, pero no todas se resuelven
con un ajuste menor, y aún no tenemos validada una separación independiente de
preguntas por canal. Según lo que se requiera, determinaríamos si corresponde
al soporte o necesita cotización adicional.

La propuesta es mantener el diseño actual y concentrarnos en los ajustes
menores señalados, sin modificar las reglas de atención ni la organización de
los canales. No he aplicado cambios todavía.

Saludos,

## Respuesta nueva de María Paz

**Recibida:** 21-10-2026 18:28:40 America/Santiago (`2026-10-21T21:28:40Z`).
**Para:** Julio y Oscar. **Sin adjuntos.**
[Correo fuente](https://outlook.office365.com/owa/?ItemID=AAMkAGZlMmI1M2U1LTIyZWQtNDFkNC05MTJjLTE3ZWU2ZDM0NWFiNQBGAAAAAADxl4bkLvSfSYZqEzxL3EY1BwAR61VaBWh6QqphZWDfIIRIAAAAAAEMAAAR61VaBWh6QqphZWDfIIRIAAQSWN%2FKAAA%3D&exvsurl=1&viewmodel=ReadMessageItem).

> Hola Julio:
>
> Cuando se habla de que "los usuarios estén disponibles y tengan habilitadas
> las condiciones necesarias para recibir llamadas en HubSpot"....¿como se
> habilita?
>
> Saludos….MPaz

**Interpretación:** solicita instrucciones para habilitar la recepción/disponibilidad humana.
No es aceptación de un rediseño, solicitud de IVR ni aprobación de una cotización.
Su pregunta no demuestra por sí sola que la indisponibilidad haya sido la causa de las llamadas anteriores.

### Base para contestar, aún no enviada

Dar instrucciones breves para el canal existente. Según la
[guía oficial de Help Desk](https://knowledge.hubspot.com/calling/set-up-a-calling-channel-in-help-desk),
cada destinatario debe entrar al menos una vez en Servicio → Help Desk / Centro de ayuda tras su asignación
y activar el interruptor de disponibilidad de la esquina superior izquierda.

Para recepción en navegador, la [guía de llamadas entrantes](https://knowledge.hubspot.com/calling/receive-calls-in-hubspot)
indica sesión iniciada, estado disponible y ventana de llamadas abierta (o extensión Chrome compatible activa).
Abrir el icono de teléfono → alertas → abrir pestaña de llamadas → usar el marcador desde esa ventana;
comprobar la preferencia de timbrado en navegador y el acceso al micrófono/audio. Safari no admite esta recepción.
No confundir estos controles personales con volver a asignar el número o reconfigurar el agente.
Las etiquetas pueden variar con idioma/UI; el entorno de María Paz no se inspeccionó en esta revisión.

## Estado y continuidad

- [x] Hallazgos, límites y frontera soporte/alcance documentados.
- [x] Respuesta aprobada enviada con firma gráfica y CCO; Outlook y HubSpot verificados.
- [x] Nueva respuesta de María Paz leída y clasificada como duda operativa de soporte.
- [ ] Responder la duda nueva: texto base disponible; ningún nuevo envío ejecutado ni autorizado en este pedido.
- [ ] Corregir únicamente discrepancias comprobadas o aplicar ajustes menores cuando el operador lo indique.
- [ ] Acreditar una transferencia humana contestada; no inferirla de configuración guardada o intento de transferencia.
- [ ] Cualquier IVR, derivación por ejecutivo, separación funcional por canal o reorganización de bandejas:
  evaluar solo si se solicita y cotizar si excede el soporte.

No hubo cambios en la configuración de ANAM, compra de créditos, ampliación de límites, nueva llamada de prueba,
migración, activación de workflow ni reactivación de Kortex al preparar este registro.
