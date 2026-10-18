# Seguimiento de outreach manual

Aplicar cuando el operador confirma un correo enviado o pide próximos contactos. El contrato de autonomía sigue en `docs/architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md`; no se amplía por mantener una cadencia.

1. Leer el mensaje en Elementos enviados: remitente, Para/CC/CCO, asunto, fecha y cuerpo pertinente. Confirmación del operador, copia enviada, recepción, apertura y respuesta son evidencias distintas. Si sólo existe confirmación humana, declararlo; no inventar precisión. `receivedDateTime` de una copia no se etiqueta como `sentDateTime`.
2. Buscar notas/actividades existentes antes de crear. Con autorización para registrar, una nota por envío y asociarla a los contactos efectivamente involucrados. Una copia a cuatro personas no son cuatro envíos. Si el buzón es funcional, dejar explícito que no se escribió a la dirección personal del contacto. Verificar cada asociación por lectura independiente. CCO HubSpot no demuestra ingestión de actividad EMAIL.
3. Crear/reutilizar las **tareas comerciales en HubSpot** (revisión de cuenta, follow-up, llamada, próximos pasos) y su clave estable de `docs/commercial/follow-up-agent/state.json`; buscar también tareas terminadas. Verificar owner, fecha, enums y asociaciones a registros existentes. Notion conserva trabajo operativo/entregables; no duplicar allí la tarea comercial. Distinguir preparación, enviado y seguimiento pendiente. Mantener historia, pero anteponer el siguiente paso vigente. Normalizar escapes Markdown al comparar claves devueltas por Notion.
4. Elegir fechas internas y una cantidad finita de contactos; no confundirlas con compromisos del cliente. Primera revisión, aporte concreto y cierre de ciclo son propósitos distintos. Nunca avanzar un paso por transcurso del tiempo si el envío anterior no consta. Recalcular desde el envío real, sin acumular envíos atrasados.
5. Antes de recomendar: revisar respuestas, enviados, rebotes, reuniones y borradores humanos. Respuesta/opt-out/rechazo/rebote pausa la cadencia y exige resolver el caso. Mantener un hilo por cuenta; no duplicar mensajes a personas en copia. Ampliar interlocutores sólo con propósito, identidad/rol/canal verificados y autorización de envío; investigación no autoriza enriquecimiento pagado.
6. Borradores: una idea útil ligada a la demanda, CTA concreto, firma completa y CCO según `docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`. No reenviar la misma presentación con otras palabras. Petición freelance no prueba demanda B2B; demanda de compañías no debe reducir a Efeonce a especialistas individuales. Probar experiencia regional con fuentes autorizadas, sin atribuir resultados a IA sin baseline.
7. Reusar el heartbeat comercial de 09:00/16:00 cuando esté activo; no crear un recordatorio competidor. Configuración activa no prueba ejecución futura. Preparar textos en Notion es distinto de guardar en Outlook; si falla un borrador, registrar intento/fallback. La autoridad recurrente permite TASK comerciales en HubSpot y asociaciones existentes verificadas; no activar secuencias/Prospecting Agent, enviar ni cambiar otros objetos, etapas o segmentos CRM.
8. Mantener registro y estado con IDs, fuentes, nivel de evidencia, fecha próxima, paso enviado y límites. Un delta focalizado no renueva el corte de todo el pipeline. Guardar datos individuales en CRM/Notion, no exportar correos o cuerpos originales al repo. Skills contienen criterios; expedientes contienen hechos.

Preparación de primeros contactos personalizados y envío con firma gráfica: sección de prospección de
`docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md`. Incluye selección/contexto del brochure,
Outlook web, conservación de la firma instalada y readback de adjuntos/EMAIL; no amplía permisos de envío.

Casos y evidencia: `docs/commercial/follow-up-agent/runs/2026-10-08-outreach-manual.md` y
`docs/commercial/follow-up-agent/runs/2026-10-13-outreach-personalizado.md`.

## Reply con firma gráfica y PDF en Outlook

- En una respuesta al propio mensaje enviado, comprobar Para/CC/CCO tras abrir el reply: el comando de
  respuesta no garantiza que el destinatario sea el comprador. Conservar el hilo, la firma instalada nueva
  y el historial citado, sin duplicar firmas en el cuerpo nuevo ni incorporar otros colegas por defecto.
- Para adjuntar un PDF desde navegador, esperar el selector de archivo antes de accionar la carga y usar
  la ruta exacta aprobada. Si Outlook propone compartir por OneDrive o un complemento propone un enlace
  público, mantener copia adjunta cuando ése sea el alcance autorizado. Esperar a que termine la carga.
- Antes de enviar: destinatarios, asunto, cuerpo, firma renderizada y adjunto sin progreso pendiente.
  Ante envío incierto, consultar Enviados antes de repetir. Después: recuperar el mensaje y metadatos del
  PDF; verificar EMAIL nativo y asociaciones a Contact/Company. No duplicar esa actividad con una creación
  manual. CCO no acredita ingestión inmediata; si sigue pendiente, informar ese estado por separado.

Aplicación verificada y límites: `docs/commercial/tenders/socopur-agencia-marketing-digital-2027/research/seguimiento-2026-10-15-INTERNO.md`.

## Secuencias autorizadas explícitamente

Preferencia confirmada 13/10: **HubSpot, no Apollo**. Método reusable dueño de Prospecting:
[seguimientos personalizados programados](../../efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md).
HubSpot ejecuta dentro del lote autorizado: mailbox/firma, documentos nativos, fechas de todos los pasos,
Enviar más tarde, reglas de respuesta y lectura independiente de Programado. No duplicar desde el heartbeat,
no inferir CCO ni delivery/rendering. El siguiente lote necesita su propio alcance; conservar la plataforma.
Casos y límites: `docs/commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md` y
[web del 16/10](../../../../docs/commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md).
Comprobar ID/versión del documento y cuerpo final de inscripción; una personalización puede diferir de la
plantilla y fijar horas dentro de la ventana. Firma HTML configurada y render de preview son pruebas distintas.
Un 403 de secuencias con OAuth de usuario limita ese endpoint: usar el carril UI autorizado, sin escalar
permisos, inventar soporte de escritura CLI ni cambiar de plataforma.
