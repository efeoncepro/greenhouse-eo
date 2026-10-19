# Correos de Julio por Outlook: firma oficial y registro HubSpot

## Decisión 2026-10-08 — Accepted: dos vías de envío

- **Autoridad y owner:** Julio Reyes, instrucción explícita en conversación con Codex.
- **Alcance:** todo correo que un agente prepare para enviar o envíe desde `jreyes@efeoncepro.com` por Outlook/Microsoft 365, incluidos nuevos mensajes, respuestas y reenvíos.
- **Estado:** contrato documental vigente; no instala una firma ni cambia automáticamente el conector o las preferencias de Outlook.
- **Reversibilidad:** instrucción operativa reversible por el operador; confidence alta sobre la preferencia, capacidades del transporte a verificar en cada sesión.

## Fuente laboral y alcance

- **Correo laboral:** el correo de trabajo de Efeonce y sus clientes, incluido ANAM, vive en Outlook/Microsoft 365. Gmail, incluido `jreysgo@gmail.com`, es correo personal y no es fuente de verdad laboral; si Outlook no está disponible, informar el bloqueo y no sustituirlo por Gmail.

## Contrato obligatorio

1. **Firma completa de Julio en una de las dos vías aprobadas:** conector Outlook con la firma en texto de abajo, u Outlook UI con la firma gráfica oficial. Ambas son válidas de forma permanente por instrucción del operador; no pedir otra aprobación sólo por elegir la vía. Respetar una vía o formato específico si el pedido lo indica. No reducirla a «Saludos, Julio» ni inventar datos o diseño. Saludos y despedida pertenecen al cuerpo; insertar la firma una sola vez en el mensaje nuevo, sin borrar firmas del historial citado.
2. **BCC/CCO `48713323@bcc.hubspot.com`** para registro en el portal Efeonce `48713323`. Debe estar en destinatarios ocultos, nunca en Para/CC ni escrito como parte del cuerpo. Si ya existe, no duplicarlo. Preservar otros destinatarios autorizados.
3. Aplicar ambos requisitos también a borradores preparados para envío y a respuestas/reenvíos. Para estos envíos por agentes, la firma completa prevalece sobre la recomendación histórica de firma abreviada. Una excepción debe venir de una instrucción explícita posterior del operador para ese envío.
4. Esta preferencia autoriza añadir ese BCC al correo cuyo envío esté autorizado; **no autoriza nuevos envíos**, respuestas automáticas, ampliar destinatarios de negocio, cambiar otro portal, activar tracking ni modificar deals. No extender la identidad/firma/BCC de Julio a otros remitentes, clientes o emails transaccionales de Greenhouse/Resend.

## Fuente de la firma

Diseño dueño: [La órbita, §10.2](brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#102-firma-de-mail).
Archivo aprobado de Julio, versión clara:
[`firma-fondo-blanco.html`](../../ai-generations/2026-09-29_avatares-equipo/firmas/entregables/firma-julio-reyes/firma-fondo-blanco.html).
Instalador: [`julio-reyes.html`](../../ai-generations/2026-09-29_avatares-equipo/firmas/instalar/julio-reyes.html).
Reusar el HTML/fragmento aprobado y sus PNG HTTPS; no reconstruir el diseño ni copiar enlaces de tracking de un correo viejo.
Si falta el archivo local, seguir [AI Generations Storage](AI_GENERATIONS_STORAGE_V1.md) (`ai-gen:where` / `ai-gen:pull`), sin regenerar la firma.

Identidad contrastada en un correo enviado el 2026-10-07: **Julio Reyes**, **Managing & GTM Director · Efeonce**, `+56 9 3480 2860`, `jreyes@efeoncepro.com`; foto/órbita, web, LinkedIn, logo, «Empower your Growth» y franja de partners. Para la vía gráfica, los datos y activos se toman del archivo vigente. Para el conector, usar la siguiente versión completa en texto, probada y aceptada por el operador el 2026-10-08; actualizar ambas si cambia la identidad aprobada.

### Firma en texto aprobada para el conector

```text
Julio Reyes
Managing & GTM Director · Efeonce
Teléfono: +56 9 3480 2860
Correo: jreyes@efeoncepro.com
Web: https://efeoncepro.com
LinkedIn: https://linkedin.com/in/cesargrowth

Efeonce — Empower your Growth

Partner oficial de HubSpot, Salesforce, Adobe, Microsoft, AWS, Google Cloud, Claude, OpenAI y BytePlus.
```

Esta variante conserva los datos y enlaces; no incluye foto, logo ni diseño gráfico. La firma gráfica oficial se conserva para la vía Outlook UI o un transporte HTML ya autorizado.

## Procedimiento antes de enviar

### Expedientes y formularios externos — precisión del 19/10/2026

Julio confirmó retirar del entregable todas las notas internas de búsqueda/QA y descripciones innecesarias
como «oficina virtual arrendada». No convertir esta corrección editorial en datos falsos: los campos
exigidos se responden con evidencia o se dejan pendientes con el operador. Aplicar el
[manual de partnerships y distribuidores](../manual-de-uso/comercial/operar-partnerships-y-distribuidores.md).

- Antes de adjuntar, revisar todas las páginas y campos del PDF final; preparar lista exacta de archivos,
  versiones/períodos y destinatarios autorizados. No incluir manifiestos internos, comentarios de búsqueda
  ni respaldos adicionales fuera del alcance. Informar al operador qué documentos se transmitirán.
- En Outlook, comprobar que el cuerpo preceda a una única firma nueva. Si el cursor/atajo coloca texto
  después de la firma, corregir el orden y verificar visualmente; un atajo ejecutado no prueba ubicación.
- Para varios archivos, usar el selector soportado y **Adjuntar como una copia** cuando se solicitaron PDF,
  sin convertirlos en vínculos públicos. Esperar la carga completa. Nombres, cantidad y tamaños se verifican
  de nuevo mediante `list_attachments` en la copia enviada; no basta `has_attachments=true`.
- Enviar documentación para revisión no firma el formulario ni acepta contratos. La firma gráfica del
  correo no se traslada al espacio de firma del PDF. Mantener ese estado explícito en el expediente interno.
- Tras timeout o resultado incierto, buscar primero en Enviados. El enlace de origen puede mostrar el
  mensaje anterior; abrir el ID nuevo confirmado. CCO no demuestra registro CRM: comprobarlo aparte.

### Secuencia de envío


1. Confirmar mailbox, destinatarios, asunto y contenido autorizado. Mantener los cambios dentro de lo pedido; «envíalo» después de revisar el texto ya es autorización, no pedirla otra vez por esta norma.
2. Revisar la capacidad real de la herramienta. El conector Outlook `send_email` observado el 2026-10-08 admite `text_content` y BCC, pero **sólo texto plano**: no preserva una firma HTML ni añade la firma configurada en Outlook. No pasar HTML en `text_content` ni asumir que Outlook la incorporará después.
   **Delta 2026-10-19:** en otra sesión, el conector Microsoft 365 de claude.ai (app `07c030f6-5743-41b7-ba00-0a6e85f37c17`) tenía sólo permisos de lectura: `Mail.Read`, sin `Mail.ReadWrite`. `outlook_create_reply_draft` respondió `FORBIDDEN: Missing scope 'Mail.ReadWrite'`. Los permisos dependen del consentimiento otorgado: verificarlos en cada sesión (`get_granted_scopes`), sin asumir que la capacidad del 08-10 sigue vigente. Si no hay escritura, entregar el texto final (incluida la firma en texto y el CCO anotado), dejar que Julio envíe desde Outlook web y hacer el readback de Enviados con el conector. Dar consentimiento en Entra es una decisión de seguridad del administrador, nunca de un agente. Caso: respuesta a Pibank del 19-10 (destinatario, CCO y adjunto verificados en Enviados).
3. Elegir la vía indicada por el usuario o la disponible adecuada. **Conector:** añadir explícitamente la firma completa en texto al cuerpo. **Outlook UI o integración HTML autorizada:** comprobar la firma gráfica insertada automáticamente o insertar la oficial; verificar render, imágenes y enlaces. En ambas, una sola firma en el mensaje nuevo. No inventar endpoints, credenciales ni permisos para sortear una limitación.
4. Abrir/comprobar el campo CCO: debe contener exactamente `48713323@bcc.hubspot.com`. Confirmar el resto de destinatarios y la correspondencia entre enlaces/adjuntos y el contenido aprobado.
5. Enviar una sola vez. Si ninguna de las vías aprobadas permite incluir su firma correspondiente y BCC, conservar el borrador y explicar la limitación concreta. El texto completo por conector es una opción aprobada; no exige permiso adicional salvo que el pedido requiera específicamente firma gráfica. Tras un resultado incierto, buscar la copia enviada antes de reintentar.
6. Leer **Elementos enviados** para comprobar remitente, destinatario, asunto, cuerpo/firma y BCC. Un envío aceptado, la entrega al destinatario y el registro en HubSpot son estados distintos.
7. Verificar, cuando el acceso lo permita, la actividad de correo asociada en HubSpot. **BCC enviado no prueba ingestión, asociación a contacto/empresa/deal, apertura, clic ni seguimiento automático**. Si no hay readback CRM, informar «enviado por Outlook con BCC; registro en HubSpot pendiente de verificación».

## Prospección personalizada — criterio confirmado el 13/10/2026

Julio pidió primeros contactos individualizados, empáticos, con un motivo concreto para elegir Efeonce,
diferenciadores pertinentes y **al menos un brochure relacionado con el contexto**, enviado desde su
mailbox con la firma gráfica instalada. Aplicar este criterio al preparar próximos correos comerciales;
conserva las dos vías aprobadas y la autorización específica de cada envío.

- Leer la señal original y el historial de la cuenta. Una búsqueda de un colega no se atribuye al
  destinatario; una vacante no se presenta como solicitud de agencia. Formular las inferencias como tales.
- Explicar cómo trabajaríamos sobre su necesidad y por qué Efeonce encaja: capacidades, mecanismo y
  experiencia autorizada. Evitar elogios genéricos, catálogo completo, promesas de resultados y experiencia
  sectorial/regulatoria no acreditada. Respetar el trabajo que ya realiza el equipo interno.
- Elegir la versión pertinente del brochure y explicar en el cuerpo qué encontrará y por qué se comparte.
  Para presentar Efeonce completa, el pertinente es el brochure oficial «Agencia de Marketing 360°» (aprobado
  el 2026-10-16; versión corta de 26 láminas para conversar, completa de 84 para leer), en OneDrive
  `Alineación/4. Comercial/Brochures/2026/Agencia de Marketing 360/`; si la necesidad es de una sola línea,
  el brochure de esa línea. Julio ratificó el 17-10-2026 que los brochures aprobados no necesitan nada más:
  usarlos íntegros, sin reabrir validaciones ni recortar, conforme a la
  [regla vigente](EFEONCE_APPROVED_BROCHURES_POLICY_V1.md).
  Explicar su utilidad antes del enlace. Usar el documento original existente en HubSpot; si el enlace
  de Documents fue creado para otra persona, generar uno para el destinatario sobre el mismo documento.
  No adjuntar el PDF cuando Julio haya pedido enlace, ni crear una variante del brochure.

- Cerrar con una invitación proporcionada y una pregunta útil. No inventar agenda, duración ni URL.
- Dirección cargada, dirección verificada y permiso de envío son estados distintos. La excepción
  documentada de Paula en esta ronda no convierte direcciones deducidas en un canal validado ni en regla
  para próximos envíos. No utilizar un envío de prueba como validación.

### Ruta gráfica comprobada: Outlook web

El 13/10 funcionó `https://outlook.office.com/mail/`, redirigido a
`https://outlook.cloud.microsoft/mail/`, en el navegador integrado con sesión de Julio.
Es una observación de esta sesión: comprobar identidad y conexión de nuevo, sin asumir sesión permanente.

1. Crear un correo nuevo y comprobar la firma gráfica insertada: nombre/cargo, teléfono, correo,
   foto, Efeonce, eslogan, enlaces y franja de partners. Reusar la firma instalada/oficial, no reconstruirla.
2. Completar Para, asunto y CCO; comprobar que no haya CC ni destinatarios de negocio adicionales fuera
   del mandato. Personalizar a una persona; coordinar las rutas alternativas por cuenta.
3. Insertar el cuerpo como contenido enriquecido conservando **una** firma. En la ejecución se leyó
   el fragmento visible de la firma del borrador y se pegó cuerpo HTML + ese fragmento una sola vez.
   Verificar el resultado en el editor; los índices de UI de una sesión anterior no se reutilizan.
4. Adjuntar mediante **Adjuntar archivo → Examinar este equipo** y la ruta local absoluta. Para PDFs
   grandes, Outlook ofreció **Adjuntar como una copia**; se eligió esa opción. Descartar la sugerencia
   posterior de Adobe de convertir el PDF en enlace público cuando el alcance es enviar una copia.
5. Esperar a que termine la carga y comprobar nombre/tamaño del PDF, destinatario, CCO, texto y firma
   antes de enviar una sola vez. Ante resultado incierto, conciliar Enviados antes de reintentar.
6. Usar lectura independiente del conector para Enviados y `list_attachments` para nombre, tamaño y
   tipo real del PDF. La UI preserva la firma; el conector de lectura aporta el readback. Un campo de
   cuerpo convertido por el conector no es necesariamente HTML crudo reutilizable.
7. En HubSpot `48713323`, verificar actividad EMAIL saliente `SENT`, remitente, destinatario, asunto y
   asociación al contacto. No crear una nota/actividad duplicada sólo por haber enviado CCO.

Resultado de referencia: [seis envíos, materiales, actividades CRM y límites](../commercial/follow-up-agent/runs/2026-10-13-outreach-personalizado.md).

### Convertir un borrador de texto a firma gráfica — 18/10/2026

Cuando el pedido exige firma gráfica y el borrador nació por conector en texto, abrir ese borrador en
Outlook web, elegir **Opciones → Cambiar a HTML** y conservar cuerpo, párrafos, enlaces y destinatarios.
Retirar sólo la firma de texto del mensaje nuevo e insertar la firma oficial instalada mediante
**Mensaje → Firma → Julio** (nombre observado; verificar el actual). Pegar contenido enriquecido cuando
sea necesario: reemplazar texto plano de todo el editor puede colapsar párrafos o destruir la firma.
Comprobar una sola firma gráfica y CCO antes de enviar. No cambiar preferencias globales para resolver
un envío puntual. Tras enviar, buscar Elementos enviados por identidad/asunto/fecha: el ID puede cambiar
y el enlace del borrador puede conservar una vista obsoleta. No reenviar por esa vista.
[Envío y lectura independientes del caso](../commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md).

### Seguimiento nativo autorizado en HubSpot — 13/10/2026

El operador precisó que las secuencias de seguimiento se ejecutan **en HubSpot, no Apollo**.
[Lote autorizado y readback](../commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md): mailbox
Outlook 365 conectado, firma global Julio verificada, documentos nativos contextualizados, horas locales
laborales y desinscripción por respuesta. No duplicar firma ni afirmar CCO en una pantalla que no lo expone.
Este caso usa registro nativo CRM y conserva el alcance separado de la política CCO para envíos por Outlook;
no concede autorización general de futuros mensajes ni sustituye el readback de un envío real.

## Evidencia, alternativas y límites

El 2026-10-08 se verificó en Enviados el correo a Dianesty sobre diseñador senior: salió desde Outlook con los dos enlaces, pero con cierre simple y sin BCC. El operador pidió esta corrección permanente. El contrato aplica a futuros envíos; no reenvía ni registra retroactivamente ese correo sin mandato específico.

La decisión inicial de exigir sólo HTML quedó sustituida el mismo 2026-10-08 tras la prueba por conector con firma completa en texto y BCC, verificada en Enviados. El operador aceptó permanentemente ambas vías: «podemos usar las dos vías, la del conector y la otra donde no usas el conector y pones mi firma». Sigue descartado confiar en que el conector añadirá por sí solo la firma configurada en Outlook. Se comprueba la firma correspondiente a la vía y el BCC antes del envío.

Revisar esta decisión si cambia el remitente, la firma aprobada, la dirección de registro de HubSpot o el soporte HTML del conector. La documentación no demuestra instalación, automatización técnica ni recepción de un nuevo correo.

Evidencia del cierre documental: [cobertura, controles y límites](../audits/commercial/2026-10-08-outlook-signature-bcc.md).
