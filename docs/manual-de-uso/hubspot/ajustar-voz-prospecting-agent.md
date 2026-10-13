# Ajustar la voz del Prospecting Agent de HubSpot

Fecha de la práctica observada: 2026-10-07. Owner: Julio Reyes / Commercial.
Aplica al agente nativo de prospección comercial de HubSpot; no al Customer Agent de servicio, al Agent CLI
ni a un agente propio de Kortex. La disponibilidad, etiquetas y límites deben releerse en cada portal.

## Fuentes y alcance

- [Decisión de voz y CTA](../../architecture/HUBSPOT_PROSPECTING_AGENT_VOICE_DECISION_V1.md).
- [Referencia funcional del agente](../../../.codex/skills/hubspot-solutions-partner/references/prospecting-agent.md).
- [Voz personal de Julio](../../../.codex/skills/copywriting/efeonce/JULIO_REYES_VOICE_SYSTEM.md).
- [Auditoría de la calibración](../../audits/commercial/2026-10-07-hubspot-prospecting-agent-voz.md).
- [Texto vigente guardado: 7.969 caracteres](../../operations/hubspot-prospecting-agent/julio-reyes-starter-play-2026-10-07-enlace-web.txt)
- [Snapshot previo: 7.550 caracteres](../../operations/hubspot-prospecting-agent/julio-reyes-starter-play-2026-10-07.txt).

El archivo de texto es el snapshot aprobado para Julio, portal Efeonce Group 48713323, Starter Play
101042425. HubSpot conserva la configuración efectiva: leerla antes de modificarla y reconciliar cualquier
cambio posterior. No sobrescribir el estado vivo con el snapshot ni aplicarlo a otros remitentes o clientes
por defecto. El método es reusable; la voz personal y los datos de contexto no lo son.

## Calibración de voz

Leer entre cinco y diez mensajes escritos por el remitente, con contexto suficiente para distinguir un primer
contacto de una relación existente. Excluir duplicados y texto citado de terceros. En esta sesión se eligieron
ocho mensajes de Outlook entre el 29 de septiembre y el 7 de octubre de 2026: prospección, seguimientos,
coordinación y respuestas breves. No es fine-tuning ni prueba de resultados comerciales. No copiar el corpus
privado al repo ni trasladar información de un cliente a otro.

Traducir patrones observados a instrucciones concretas:

- Contexto antes de la propuesta; una situación, una capacidad pertinente y una invitación.
- Trato de igual a igual, curiosidad concreta y ayuda útil. La empatía no requiere halagos, falsa intimidad,
  disculpas ni una cadena de «quizás», «podría» y «no sé si es prioridad».
- Investigar para encontrar un motivo de conversación, sin recitar el cargo ni resumir la empresa al destinatario.
- Una expansión o adquisición no prueba problemas internos. Formular la necesidad desconocida como posibilidad
  o pregunta, con una sola condición suficiente.
- Párrafos cortos y lenguaje cotidiano; tecnicismos solo si aportan precisión. Orientación del snapshot:
  100–170 palabras en primer contacto, 60–110 en seguimientos, sin firma; no son límites técnicos de HubSpot.
- Capacidades, casos, cifras y promesas verificables y habilitados para uso comercial.
- Seguimientos con un aporte nuevo, respetando respuestas, negativas y reuniones ya agendadas.

No convertir los giros de ejemplo en muletillas ni trasladar automáticamente la voz de artículos, motivos
pedagógicos o emojis a correos fríos.

## Mantener el enlace de reunión

La voz y el CTA son dos controles distintos. Una instrucción como «no impongas agenda» puede ser interpretada
como omitir el enlace, aunque siga configurado en Directrices. En la sesión el operador reportó esa omisión;
la influencia de la redacción es una hipótesis, no una causa técnicamente aislada.

En Comunicaciones → Directrices, verificar el enlace real seleccionado. El portal observado mostraba
«Enlace predeterminando del remitente a la reunión» y «1 enlace». El snapshot exige incluir ese enlace
en el primer contacto y los seguimientos, con texto natural, propósito de la conversación y opción de
responder por correo. Agendar o responder son dos vías para una misma invitación. Nunca inventar la URL,
presionar tras una negativa ni seguir invitando si ya hay reunión.

La presencia visual del hipervínculo no verifica su destino. Revisar la URL y la duración configurada antes
de prometer «15 minutos» u otra duración. No abrir una reserva ni agendar una reunión como parte del QA.

## Enlace institucional como respaldo

Delta aprobado y guardado el 2026-10-07: enlazar la primera mención de Efeonce del primer correo a
https://efeoncepro.com/, dentro de la presentación de la capacidad pertinente. Complementa el enlace
real de reunión y no añade otra llamada a la acción. No es obligatorio repetirlo en seguimientos ni
explicar la ausencia del brochure. La selección de Directrices sigue siendo el enlace de reunión;
la presencia de ambos enlaces debe comprobarse en un borrador nuevo, todavía pendiente.

## Guardar y verificar

1. Confirmar identidad, portal, remitente y play. En este caso: Julio Reyes, portal 48713323, Starter Play
   101042425. Para acceso CLI/MCP, aplicar el [runbook de carriles](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md);
   la autorización de un portal no se hereda a otro.
2. Leer el texto real, las directrices y el estado de revisión humana. Guardar el estado previo y preparar
   un delta dentro del alcance autorizado. El ejemplo gris con contador 0/10000 era un placeholder, no
   instrucciones guardadas. El límite observado fue 10.000 caracteres; el snapshot vigente usa 7.969.
3. Editar Comunicaciones → Instrucciones avanzadas, sin introducir reglas incompatibles o bloques repetidos.
   Verificar el contador del producto, además del conteo local.
4. Pulsar Guardar en el panel. En la UI observada esto creó un cambio pendiente en la guía.
5. Abrir Revisar cambios, comprobar que el delta sea únicamente el esperado y pulsar Aprobar 1 cambio.
   Si aparecen otros cambios pendientes, reconciliar su autoría y alcance antes de aprobarlos.
6. Recargar. Volver a Comunicaciones → Instrucciones avanzadas si la navegación abrió Audiencia o el resumen.
   Leer de nuevo el valor completo, compararlo exactamente con el texto previsto y comprobar que no haya
   cambios pendientes. Un botón deshabilitado o una captura sin recarga no prueban persistencia.
7. Generar un borrador nuevo y revisar primer correo y seguimientos. No asumir que los borradores existentes
   se regeneraron por guardar instrucciones. Separar esa revisión de iniciar comunicación o enviar mensajes.

La autorización para ajustar copy no autoriza cambios de audiencia, enrollment, autonomía, frecuencia ni
envíos. En esta práctica se conservó la revisión humana y no se pulsó Iniciar comunicación.
Para revertir, usar el estado previo verificado y el mismo flujo de guardado/readback dentro del alcance
autorizado; no desactivar el agente ni cambiar automatización para corregir una instrucción de voz.

## Revisión de salida

Comprobar motivo concreto, una sola idea, fluidez oral, ausencia de diagnóstico inventado, capacidad pertinente
y una invitación con enlace real y respuesta por correo como alternativa. Verificar investigación, claims y
duración de reunión por separado. Registrar cuatro estados distintos: configuración guardada, borrador
generado, envío autorizado/realizado y resultado comercial observado.

Al cierre del 2026-10-07: configuración final guardada y releída; enlace visible en los borradores intermedios
aportados por el operador. Pendientes: nueva generación posterior al último ajuste, seguimientos, destino y
duración del enlace, y sustento de claims del borrador. No hay evidencia de envío ni de rendimiento.
