# ANAM — Activación de voz de Emma

Fecha: 2026-10-19. Portal verificado: **19893546 (ANAM)**. Operador autenticado: Julio Reyes.

## Estado real

**Configuración publicada y releída en HubSpot. Llamada real, ticket y transcripción verificados; grabación disponible; transferencia y buzón todavía sin prueba específica.**

El número `+56-6-0091-42234` estaba etiquetado «Anam - Emma», pero **Sin asignar**. La verificación regulatoria de Chile figuraba aprobada. No existía un IVR. La etiqueta por sí sola no implementaba el agente.

El usuario decidió Emma primero, atención de IA 24/7 y transferencias humanas de lunes a viernes 09:00–18:00, zona Santiago. Autorizó expresamente aceptar los términos beta de Customer Agent Voice y habilitar voz con consumo de 50 créditos/minuto, usando los créditos existentes y sin comprar paquetes ni ampliar límites.

## Configuración aplicada y verificada

| Elemento | Estado guardado |
| --- | --- |
| Customer Agent Voice beta | Habilitada; UI muestra «Salir de beta» |
| Canal | Anam - Emma, Help Desk / Asistencia al cliente, ID `4316530466` |
| Número | `+56-6-0091-42234` |
| Implementación Emma | Llamadas: Activado, todas las horas, 100% |
| Horario humano | Lun. a vie., 9:00 AM–6:00 PM, Santiago (UI UTC -03:00 en esta fecha) |
| Transferencias | Marco Jiménez Venegas, Pablo Puga y Maria Paz Haeger |
| Rotación | Simultánea entre usuarios disponibles |
| Fuera de horario | Emma; si requiere atención humana, buzón |
| Sin respuesta humana | Buzón de atención en español |
| Voz Emma | Lina, mujer, español, colombiano |
| Parámetros de voz | Velocidad 1; estabilidad 0,5; similitud 0,75; estilo 0; mejora del orador activada |
| Ticket inicial | Support Pipeline / New / sin prioridad |
| IVR | No creado: el diseño aprobado es Emma primero |

La configuración del canal se volvió a abrir **después** de implementar Emma: conservaba horario, tres destinatarios, buzón y Emma fuera de horario. La configuración de voz se volvió a abrir y mostraba el saludo y Lina guardados, con cero cambios en borrador. El aviso de grabación también se releyó en Configurar.

No se modificaron el segundo número `+56-6-0091-42321`, el canal Ventas@anam.cl ni las implementaciones existentes de chat/correo. No se modificaron límites ni se adquirieron créditos. No se comprobó saldo suficiente para un volumen concreto.

## Mensajes

Saludo publicado de Emma:

> Hola, soy Emma, el agente de inteligencia artificial de ANAM. ¿En qué puedo ayudarte hoy?

Audio «ANAM | Aviso de grabación | Español», TTS español México, Mia:

> Esta llamada será grabada. Si prefieres comunicarte por escrito, puedes escribir a ventas arroba anam punto cl.

Audio «ANAM | Buzón de atención | Español», TTS español México, Mia; seleccionado tanto dentro como fuera del horario:

> Gracias por llamar a ANAM. En este momento no hay una persona disponible para atenderte. Nuestro horario de atención humana es de lunes a viernes, de nueve de la mañana a seis de la tarde, hora de Santiago de Chile. Después de la señal, deja tu nombre, empresa, teléfono y motivo de la llamada. También puedes escribir a ventas arroba anam punto cl.

## Alcance y pruebas pendientes

La transferencia telefónica usa los destinatarios y horarios del canal. **No hereda** las reglas de transferencia por intención del chat (workflow `1876744588`). Los tres humanos deben estar disponibles en HubSpot para recibir llamadas; su estado en Teams no prueba esa disponibilidad.

- [x] Confirmar cuenta y número objetivo.
- [x] Aceptación beta autorizada y activación leída en UI.
- [x] Canal y cobertura 24/7 publicados.
- [x] Horario, usuarios, buzón, aviso y voz releídos tras guardar.
- [x] Llamada entrante real: el usuario confirma atención satisfactoria y voz en español; no hay medición independiente de latencia.
- [ ] Respuesta útil sobre servicios ANAM y uso efectivo de su conocimiento por voz.
- [ ] Transferencia a un humano disponible en horario.
- [ ] Buzón por falta de disponibilidad y fuera de horario; revisar ticket y grabación resultantes.

El usuario hizo la prueba y reportó: «Quedó espectacular, me atendió con todo», observando el acento colombiano y aceptándolo. Esto confirma atención real satisfactoria según el operador, sin inferir éxito de transferencia, contenido exacto de respuestas ni buzón. Se inspeccionó el probador de voz y se dejó detenido; no se concedieron permisos de micrófono ni se realizó una prueba conversacional desde el agente. La llamada de ejemplo que HubSpot anuncia al crear un canal no cuenta como prueba real.

### Revisión de acento tras la llamada

El 19 de octubre se revisó el catálogo completo del selector de voz de ANAM, y se filtró por Español. Hay seis opciones: Lina (mujer joven, colombiano), Maria (mujer madura, colombiano), Ana (mujer joven, mexicano), El Faraon (hombre de mediana edad, colombiano), Enrique (hombre de mediana edad, mexicano) y Benjamin (hombre maduro, mexicano). **No aparece una voz chilena en el catálogo disponible de esta cuenta.** La documentación oficial explica la selección de voces, pero no documenta una vía para importar una voz chilena personalizada en este flujo. Se conserva Lina sin cambios. Evidencia: `.captures/anam-voice-2026-10-19/spanish-voice-catalog.jpg`.

## Lectura de la llamada real y costos — 19 de octubre, 12:06–12:08 Santiago

Se encontró el ticket **49630925083**, hilo **11315753837**, contacto Julio Reyes Rangel y llamada **118907575473**. Fecha de creación y encabezado de llamada: **19/10/2026 12:02 PM GMT-3**, duración **41 segundos** (reproductor 0:40). Ticket en **Nuevo**, Pipeline de asistencia, propietario **Emma**, descripción/prioridad sin completar. No se cambió ningún campo.

La transcripción contiene tres intervenciones: Emma se identifica como IA (0:02); el interlocutor pide cotizar (0:11; transcripción literal «un servicio de valores»); Emma pregunta por matriz y objetivo (0:16), ejemplificando agua potable, residual, suelo y aire. Es un primer paso pertinente para cotización: no inventa precios, plazos ni oferta. No hay respuesta posterior, solicitud de humano ni transferencia en la transcripción. La expresión «valores» podría corresponder a lo dicho o a reconocimiento de voz; no se corrigió por inferencia ni se afirmó QA auditiva independiente.

El resumen automático del ticket decía 11:02, discrepante con los campos de creación y llamada 12:02 GMT-3; prevalece el encabezado estructurado. El resumen/seguimientos de la pantalla de grabación aún indicaba procesamiento, pese a mostrar las tres intervenciones. La grabación tiene reproductor disponible, no se descargó ni se reprodujo para análisis auditivo.

Créditos leídos en ANAM: período 8/10–7/11/2026; **33.000 mensuales**, **250 usados**, **32.750 globales disponibles**; reinicio 8/11. Desglose: workflows 60, agente de datos 140 y Customer Agent 50. El detalle de Customer Agent confirma **1 unidad de voz × 50 créditos = 50**, **0 resoluciones de texto**, y ambas tarifas de **50 créditos por uso**. Su límite es **33.000 compartidos** entre acciones; no reserva saldo frente a otras funciones. Estos datos son consistentes con 41 segundos redondeados a un minuto; el panel es agregado por período, no un comprobante individual de cobro por ID de llamada.

La cuenta muestra máximo mensual **33.000** y modalidad **Ampliación automática**; ambos preexistentes y sin editar. La vista general muestra **30.000 créditos adicionales** contratados y **US$3.240** en facturación anual (equivalente aritmético US$270/mes; sin confirmar tratamiento tributario del renglón). Cupo base restante: 3.000. Otros límites: 2/3 números y 7/3.000 minutos de telefonía; no confundir minutos telefónicos con minutos de IA. El saldo del panel puede actualizarse después de cada lectura.

Fuentes actuales: [definición de resolución y ventana de 72h](https://knowledge.hubspot.com/customer-agent/understand-the-customer-agent), [redondeo de voz y corte de minutos IA al transferir](https://knowledge.hubspot.com/calling/set-up-customer-agent-voice), [tarifas de créditos](https://legal.hubspot.com/hubspot-product-and-services-catalog), [límites y ampliaciones](https://knowledge.hubspot.com/account-management/understand-hubspot-credits-and-billing).

Se redactó correo completo para Oscar Carrasco y María Paz Haeger, direcciones verificadas en el hilo Outlook «DOCS para línea 0600 - ANAM». Tras aprobación explícita del usuario, se envió por Outlook el 19-10-2026 a las 12:16:41 America/Santiago, con firma gráfica oficial «Julio» y CCO `48713323@bcc.hubspot.com`. Copia enviada verificada por UI y conector: Oscar `ocarrascos@aguasandinas.cl`, María Paz `mhaeger@anam.cl`, remitente `jreyes@efeoncepro.com`, contenido HTML y firma gráfica presente. El envío no acredita entrega o lectura. Copia: [correo enviado](ANAM_EMMA_VOICE_CORREO_OSCAR_MARIA_PAZ_2026-10-19.md).

## Superficies y evidencia

- [Implementación y canales](https://app.hubspot.com/customer-agent/19893546/deployment-and-channels)
- [Canal telefónico y enrutamiento](https://app.hubspot.com/helpdesk-settings/19893546/inboxes/edit/calling/4316530466)
- [Configuración de voz](https://app.hubspot.com/customer-agent/19893546/channel-settings?tab=voice)
- [Ticket real](https://app.hubspot.com/help-desk/19893546/view/106468465/ticket/49630925083/thread/11315753837)
- [Grabación y transcripción](https://app.hubspot.com/schedule-workspace/19893546/review/0-48/118907575473)
- [Créditos de ANAM](https://app.hubspot.com/account-and-billing/19893546/usage/hubspot-credits)
- Capturas de esta revisión: `call-transcript-118907575473.jpg` y `voice-credits-verified.jpg`, en la misma carpeta ignorada.
- Capturas locales, ignoradas por Git: `.captures/anam-voice-2026-10-19/` — `beta-enabled.jpg`, `emma-voice-active.jpg`, `channel-routing-saved.jpg`, `voice-settings-saved.jpg`.

Para revertir, revisar la eliminación de la implementación **solo del canal telefónico de Emma**, y verificar expresamente el destino de llamadas restante antes de dejarlo operativo. No eliminar el número ni alterar chat/correo como parte de esa reversión. No se ejecutó reversión.

## Fuentes y contexto contrastado

Se revisó el contexto ANAM con tres subagentes (contexto, documentación de voz y documentación IVR), y se contrastó con el portal actual.

- [HubSpot: Customer Agent Voice](https://knowledge.hubspot.com/calling/set-up-customer-agent-voice)
- [HubSpot: canal de llamadas en Help Desk](https://knowledge.hubspot.com/calling/set-up-a-calling-channel-in-help-desk)
- [HubSpot: horarios, routing y voicemail](https://knowledge.hubspot.com/calling/configure-call-routing-work-hours-and-voicemail)
- [HubSpot: IVR](https://knowledge.hubspot.com/calling/set-up-interactive-voice-response)
- [Términos beta aceptados con autorización](https://legal.hubspot.com/hubspot-beta-terms)
- [Checkpoint ANAM 9 septiembre](https://app.notion.com/p/3d639c2fefe78148b096f1047df98a5b)
- [Emma 14 septiembre](https://app.notion.com/p/3db39c2fefe781ecb3dfc915b5b0cfe0)
- Contexto local: `.codex/skills/hubspot-as-a-service/references/anam-case.md` y `docs/audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md`.

Kortex permanece hibernado; no se usó ni reactivó. Este registro no modifica la configuración histórica de chat ni afirma que la antigua propuesta Aircall sea la solución vigente.


## Verificación de registro en CRM

El CCO generó el objeto EMAIL `118930883467` en Efeonce `48713323`, con estado **SENT**, asunto exacto y ambos destinatarios. Actividad: 19-10-2026 12:16:45 America/Santiago; creación 12:17:10. No se creó una nota ni actividad duplicada. Esto confirma registro del envío, no entrega ni lectura.
