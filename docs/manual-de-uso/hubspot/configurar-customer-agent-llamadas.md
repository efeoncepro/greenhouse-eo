# Configurar Customer Agent para llamadas en HubSpot

Práctica verificada el **19 de octubre de 2026**. Owner: práctica HubSpot as a Service.
Aplica a Customer Agent Voice, observado en beta pública; no al Prospecting Agent ni a un agente propio.
La elegibilidad, catálogo de voces, etiquetas y tarifas deben verificarse de nuevo en cada portal.
Este manual conserva el método; los números, destinatarios, horarios, créditos y autorizaciones de un cliente
permanecen en su expediente y no son valores predeterminados para otro.

## 1. Confirmar cuenta, alcance y autorización

1. Leer el contexto del cliente y verificar nombre de cuenta, portal ID y usuario autenticado en la superficie
   que se operará. Aplicar el [runbook de acceso CLI/MCP](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md).
   Tener acceso a un portal por una vía no acredita acceso al mismo portal por otra.
2. Inventariar agente, números, canales, implementaciones y menús IVR antes de crear o reasignar nada.
   Registrar el estado previo y los objetos que se conservarán, incluidos otros canales del agente.
3. Comprobar suscripción, asiento, permisos y disponibilidad de la beta. La documentación revisada contempla
   Sales Hub o Service Hub Pro/Enterprise; no garantiza disponibilidad universal. Confirmar además el canal
   Help Desk o Inbox y sus requisitos propios.
4. Si aparece la aceptación de términos beta, obtener consentimiento previo específico de la persona autorizada
   para aceptarlos. Una solicitud de revisar la configuración no lo sustituye. Si la conversación ya contiene
   esa autorización expresa, conservarla como evidencia y continuar sin pedirla de nuevo.
5. Antes de publicar, concretar el diseño aprobado: quién atiende primero, cobertura de IA, horario humano,
   destinatarios, buzones, aviso de grabación, idioma/voz y consumo autorizado. Comprar créditos, aumentar límites
   o cambiar ampliación automática requiere autorización específica; no se deduce de habilitar el canal.

La beta documentada atiende **llamadas entrantes**. No ofrecer llamadas salientes, calificación comercial
completa ni autoservicio irrestricto. Las capacidades disponibles para texto no se extienden a voz por inferencia.
[Requisitos y límites de Voice](https://knowledge.hubspot.com/calling/set-up-customer-agent-voice) ·
[Términos beta](https://legal.hubspot.com/hubspot-beta-terms).

## 2. Distinguir las capas de la línea

| Capa | Qué verificar | Lo que no demuestra |
| --- | --- | --- |
| Número | Número exacto, proveedor, aprobación/aprovisionamiento y asignación actual | Una aprobación regulatoria no prueba recepción real |
| Etiqueta interna | Nombre descriptivo junto al número | Llamarlo como el agente no lo conecta al agente |
| Caller ID saliente | Tipo de registro y capacidad que habilita | Registrar un identificador saliente no crea una línea entrante |
| Canal telefónico | Help Desk/Inbox, número, propiedades del ticket, routing, horarios y buzones | Canal conectado no equivale a IA implementada |
| Implementación del agente | Canal correcto, activo, horas y porcentaje de cobertura | 100% configurado no prueba una llamada atendida |
| IVR | Número de entrada, ramas, destinos y estado publicado | No nace automáticamente al conectar el agente |

Leer Configuración → Llamadas → Configuración de llamadas → Números. Conservar el número exacto que muestra
el portal; no corregir dígitos por su agrupación visual. Si falta aprovisionamiento, resolverlo antes de
interpretar el problema como routing. Un número entrante de HubSpot y un número externo desviado hacia él
son arquitecturas distintas que deben quedar documentadas.

Los números se reasignan entre usuario, canal e IVR; no asumir que pueden conservar todos esos destinos
simultáneamente. Antes de quitar una asignación, guardar qué ruta deja de atender.
[Adquirir y asignar números](https://knowledge.hubspot.com/calling/acquire-and-validate-hubspot-provided-phone-numbers) ·
[Países y tipos disponibles](https://knowledge.hubspot.com/calling/calling-supported-countries-and-phone-number-availability).

## 3. Diseñar IA, humanos y eventual IVR

La cobertura del agente y el horario de atención humana son decisiones separadas. Es válido configurar IA
24/7 y humanos en horario laboral si ese es el diseño aprobado; no convertir el horario humano en una promesa
de disponibilidad continua de personas. Registrar la zona horaria por nombre y comprobar el cambio estacional;
el offset visible en un día no es una zona permanente.

En voz, la transferencia usa el canal telefónico: destinatarios, disponibilidad, horario y buzón.
**No hereda las acciones ni el workflow de handoff por intención del chat.** Un usuario existente no prueba
que sea elegible o esté disponible para recibir llamadas. Verificar su configuración en HubSpot y el entorno
de recepción; un estado disponible en Teams u otra aplicación no sustituye este control.

Si el diseño es agente primero, no crear un IVR solo porque exista la opción. Si se requieren ramas, preparar
la matriz entrada → opción → destino → sin respuesta → fuera de horario. La documentación admite transferencia
del agente a un IVR existente, pero hay que comprobar el enlace real en el portal y probarlo.

Para construir IVR: Configuración → Llamadas → Respuesta de voz interactiva → Añadir menú. El número de entrada
requiere estar sin asignación a usuario/canal. Crear ramas por teclado o voz, hacer coincidir audio y opciones,
y configurar destinos y buzones. Guardar sin publicar permite revisar; publicar es un paso separado. No
liberar el número que atiende el agente para experimentar: primero resolver la arquitectura y su recuperación.
[IVR oficial](https://knowledge.hubspot.com/calling/set-up-interactive-voice-response).

## 4. Conectar el canal y preparar mensajes

En Configuración → Bandeja de entrada y centro de ayuda → Centro de ayuda → Canales, conectar Llamadas o
abrir el canal existente. Para Inbox, usar su superficie equivalente y confirmar que se está editando el mismo
número. Elegir el número existente correcto y registrar el canal creado. Completar:

- Nombre interno y propiedades de nuevos tickets, con pipeline/estado reales del portal.
- Horario humano, zona, destinatarios elegibles y modalidad de distribución visible.
- Buzón durante horario cuando nadie responde y buzón fuera de horario.
- Aviso de grabación y alternativa de contacto aprobada por el cliente.

Revisar si elegir un número existente cambia sus asignaciones anteriores. Los receptores deben cumplir los
requisitos de asiento y disponibilidad. Según su preferencia, verificar ventana de llamadas o extensión
compatible activa en navegador, o aplicación móvil y notificaciones habilitadas; confirmar acceso a Help Desk.
[Canal Help Desk](https://knowledge.hubspot.com/calling/set-up-a-calling-channel-in-help-desk) ·
[Horarios, routing y buzón](https://knowledge.hubspot.com/calling/configure-call-routing-work-hours-and-voicemail).

Mantener separados tres mensajes: saludo del agente, aviso de grabación y buzón. Pueden tener selectores de
voz diferentes. Redactarlos en el idioma objetivo y escuchar las vistas previas disponibles. Ejemplos que
requieren adaptación y aprobación:

> Hola, soy [nombre], el agente de inteligencia artificial de [organización]. ¿En qué puedo ayudarte hoy?

> Esta llamada será grabada. Si prefieres comunicarte por escrito, puedes escribir a [correo aprobado, expresado de forma audible].

> En este momento no hay una persona disponible para atenderte. Nuestro horario de atención humana es [horario y zona]. Después de la señal, deja [datos mínimos aprobados] y el motivo de la llamada.

El aviso no constituye por sí solo una evaluación jurídica de consentimiento o retención. Usar la política
aplicable del cliente; no inventar términos legales ni pedir información innecesaria en un buzón.

## 5. Voz e implementación

En Servicio → Agente de clientes, seleccionar el agente correcto. Revisar Identidad/idiomas y Configuración
del canal → Voz: bienvenida, voz, idioma/acento y parámetros disponibles. Guardar, revisar cambios pendientes y
publicar únicamente el delta autorizado. Una voz en español no implica acento chileno; filtrar y revisar el
catálogo completo visible. Registrar ausencia como limitación de esa cuenta/fecha, no de todas las cuentas.
No prometer importación o clonación de voz sin una capacidad verificada.

En Canales/Implementación, desplegar al canal telefónico exacto, con horario y cobertura aprobados. Volver al
canal para verificar que el horario humano y los buzones persistieron y que el comportamiento fuera de horario
coincide con el diseño. No modificar chat/correo para resolver un problema telefónico.

Las fuentes documentadas para voz incluyen base de conocimientos, páginas web/landing y respuestas breves.
Comprobar mediante conversación las fuentes y capacidades que realmente usa. Una respuesta de descubrimiento
comercial pertinente no demuestra calificación completa ni una cotización emitida.

## 6. Créditos y capacidad

Tarifa estándar contrastada al **19-10-2026** en documentación y UI: **50 créditos por minuto de voz del agente**,
frente a **50 por resolución de texto**. La voz redondea hacia arriba al minuto entero y cobra el tramo de IA
antes de transferir; al tomar la llamada una persona deja de acumular minutos de IA. No describir una llamada
transferida como gratuita ni aplicar a voz la regla de cobro por resolución de texto.

Ejemplo aritmético: 41 segundos de IA corresponden a un minuto facturable; 61 segundos, a dos. Si el panel
solo muestra consumo agregado del período, la coincidencia con una llamada es consistencia, no comprobante
individual de cobro por su ID. Para texto, conservar la definición y ventana de evaluación de resolución;
una conversación corta sin humano no basta para certificarla.

Leer y fechar estas magnitudes por separado:

| Magnitud | Interpretación |
| --- | --- |
| Créditos incluidos/adicionales | Capacidad contratada; distinguir adicionales preexistentes de compras nuevas |
| Consumo y saldo global del período | Compartidos con otras funciones; registrar fechas y reinicio |
| Límite de Customer Agent | Compartido entre voz/texto; no reserva saldo frente a otras funciones |
| Máximo mensual de la cuenta | Techo global vigente; distinguirlo del límite de la función y del saldo disponible |
| Modalidad de excedentes | Ampliación automática o modalidad que muestre la cuenta; leer sin cambiar |
| Minutos telefónicos | Cupo de telefonía distinto de créditos/minutos de IA |
| Números disponibles | Límite de líneas, no capacidad de minutos ni autorización para adquirir otra |

Un límite alto no demuestra saldo suficiente. Para estimar cobertura, usar minutos facturables esperados,
otros consumos y saldo actual; distinguir la estimación de una garantía. Las tarifas de esquemas flexibles
pueden diferir y los valores cambian: revisar contrato/catálogo y portal antes de comprometer costos.
[Tarifas](https://legal.hubspot.com/hubspot-product-and-services-catalog) ·
[Límites y ampliaciones](https://knowledge.hubspot.com/account-management/understand-hubspot-credits-and-billing) ·
[Definición de resolución](https://knowledge.hubspot.com/customer-agent/understand-the-customer-agent).

## 7. Readback y QA del resultado

Tras guardar/publicar, abandonar y reabrir cada superficie. Leer número/asignación, canal, implementación,
horarios, zona, destinatarios, buzones, aviso, saludo y voz; comprobar cambios pendientes. Registrar URLs/IDs
internamente, sin datos de clientes en una plantilla genérica. Un banner de éxito no sustituye esta lectura.

El tester sirve para revisar respuestas antes de exponerlas a clientes. No acredita la red telefónica,
transferencia o buzón. La llamada de ejemplo que muestra el producto tampoco sustituye una llamada real.
Coordinar una prueba entrante con identidad conocida y consumo autorizado; no contactar terceros para probar.

| Escenario | Evidencia mínima para marcarlo verificado |
| --- | --- |
| Entrada real al número | Atención, saludo y voz oídos; fecha/zona y llamada identificada |
| Consulta conocida, varios turnos | Respuesta útil, continuidad y fuente sustentable; sin promesas inventadas |
| Consulta desconocida o acción no disponible | Reconoce límite y sigue la ruta aprobada |
| Solicitud explícita de persona, en horario | Humano disponible recibe y responde; contexto y propietario comprobados |
| Sin humanos disponibles | Ruta efectiva a buzón; mensaje, grabación y seguimiento comprobados |
| Fuera de horario | IA/canal actúan según diseño; buzón si requiere persona |
| IVR, si existe | Opciones válidas/alternativas y destino correcto sin bucles |
| Cierre de llamada | Ticket, asociaciones, estado, responsable y transcripción/grabación disponibles |
| Consumo | Período y unidades voz/texto separados; alcance agregado o individual declarado |

Registrar esperado, observado, evidencia, responsable y pendiente por fila. Una prueba de saludo no aprueba
transferencia ni conocimiento. Separar relato del operador, revisión de transcripción y escucha independiente:
un reproductor visible acredita disponibilidad de la grabación, no que se escuchó. No corregir transcripciones
por inferencia. Ante diferencias entre resumen IA y campos estructurados, conservar ambos y contrastar fecha/zona;
no tratar el resumen como fuente principal del horario.

## 8. Recuperación y cierre

Ante un fallo, identificar la capa antes de mutar: aprovisionamiento/asignación, canal, implementación, voz,
routing humano, IVR o capacidad. Volver al estado previo solo de la capa afectada. Si hay que pausar o retirar
la implementación telefónica del agente, verificar expresamente quién atenderá después y probar esa ruta.
No eliminar el número para desactivar IA, no alterar canales de texto y no comprar otra línea como solución
por defecto. Una reasignación puede dejar una línea sin atención aunque el número siga existiendo.

Cerrar con estado separado de configuración, llamada real, conocimiento, transferencia, buzón y costo. Mantener
pendientes las rutas no ejercitadas y dejar responsable humano para seguimiento. El expediente debe conservar
el consentimiento beta/publicación, configuración anterior/final, pruebas, límites y procedimiento de recuperación.
