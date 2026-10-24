# Correos de Julio por Outlook: firma oficial y registro HubSpot

## Decisión 2026-10-21 — Accepted: firma gráfica obligatoria siempre

Julio instruyó: «Deja registrado que todos mis correos deben salir siempre con mi firma gráfica, incluidos los seguimientos». Esta decisión sustituye la autorización del 08/10/2026 de usar firma en texto por conector. Rige para todos sus correos nuevos, respuestas, reenvíos y seguimientos, tanto manuales como programados o enviados por secuencias.

- **Autoridad y owner:** Julio Reyes, instrucción explícita en conversación con Codex.
- **Alcance:** todo correo que un agente prepare para enviar o envíe desde `jreyes@efeoncepro.com` por Outlook/Microsoft 365, incluidos nuevos mensajes, respuestas, reenvíos y seguimientos, manuales o programados y mediante secuencias.
- **Estado:** contrato documental vigente; no instala una firma ni cambia automáticamente el conector o las preferencias de Outlook.
- **Reversibilidad:** instrucción operativa reversible por el operador; confidence alta sobre la preferencia, capacidades del transporte a verificar en cada sesión.

## Fuente laboral y alcance

- **Correo laboral:** el correo de trabajo de Efeonce y sus clientes, incluido ANAM, vive en Outlook/Microsoft 365. Gmail, incluido `jreysgo@gmail.com`, es correo personal y no es fuente de verdad laboral; si Outlook no está disponible, informar el bloqueo y no sustituirlo por Gmail.

## Contrato obligatorio

1. **Firma gráfica oficial de Julio siempre:** usar Outlook UI o un transporte HTML autorizado que conserve el diseño completo. El texto plano no es una alternativa permitida. Comprobar foto, nombre/cargo, datos, marca, eslogan, enlaces y franja de partners; insertar una sola firma nueva, sin borrar las del historial citado. Si la herramienta no puede conservarla, dejar el correo pendiente y explicar el bloqueo, sin enviarlo con firma textual. Esta regla también se comprueba antes de programar o activar seguimientos/secuencias.
2. **BCC/CCO `48713323@bcc.hubspot.com`** para registro en el portal Efeonce `48713323`. Debe estar en destinatarios ocultos, nunca en Para/CC ni escrito como parte del cuerpo. Si ya existe, no duplicarlo. Preservar otros destinatarios autorizados.
3. Aplicar ambos requisitos también a borradores preparados para envío, respuestas, reenvíos y seguimientos. Para estos envíos por agentes, la firma gráfica completa prevalece sobre la recomendación histórica de firma abreviada. Una excepción debe venir de una instrucción explícita posterior del operador para ese envío.
4. Esta preferencia autoriza añadir ese BCC al correo cuyo envío esté autorizado; **no autoriza nuevos envíos**, respuestas automáticas, ampliar destinatarios de negocio, cambiar otro portal, activar tracking ni modificar deals. No extender la identidad/firma/BCC de Julio a otros remitentes, clientes o emails transaccionales de Greenhouse/Resend.

## Fuente de la firma

Diseño dueño: [La órbita, §10.2](brand-graphic-line/EFEONCE_GRAPHIC_LINE_V1.md#102-firma-de-mail).
Archivo aprobado de Julio, versión clara:
[`firma-fondo-blanco.html`](../../ai-generations/2026-09-29_avatares-equipo/firmas/entregables/firma-julio-reyes/firma-fondo-blanco.html).
Instalador: [`julio-reyes.html`](../../ai-generations/2026-09-29_avatares-equipo/firmas/instalar/julio-reyes.html).
Reusar el HTML/fragmento aprobado y sus PNG HTTPS; no reconstruir el diseño ni copiar enlaces de tracking de un correo viejo.
Si falta el archivo local, seguir [AI Generations Storage](AI_GENERATIONS_STORAGE_V1.md) (`ai-gen:where` / `ai-gen:pull`), sin regenerar la firma.

Identidad contrastada en un correo enviado el 2026-10-07: **Julio Reyes**, **Managing & GTM Director · Efeonce**, `+56 9 3480 2860`, `jreyes@efeoncepro.com`; foto/órbita, web, LinkedIn, logo, «Empower your Growth» y franja de partners. Tomar los datos y activos del archivo gráfico vigente. La versión textual autorizada el 08/10 queda sustituida por la decisión del 21/10; no reutilizarla como alternativa de envío.

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
   **Delta 2026-10-19:** en otra sesión, el conector Microsoft 365 de claude.ai (app `07c030f6-5743-41b7-ba00-0a6e85f37c17`) tenía sólo permisos de lectura: `Mail.Read`, sin `Mail.ReadWrite`. `outlook_create_reply_draft` respondió `FORBIDDEN: Missing scope 'Mail.ReadWrite'`. Los permisos dependen del consentimiento otorgado: verificarlos en cada sesión (`get_granted_scopes`), sin asumir que la capacidad del 08-10 sigue vigente. Si no hay escritura, preparar el cuerpo y dejar que Julio envíe desde Outlook web con la firma gráfica oficial y el CCO comprobados; hacer el readback de Enviados con el conector. Dar consentimiento en Entra es una decisión de seguridad del administrador, nunca de un agente. Caso: respuesta a Pibank del 19-10 (destinatario, CCO y adjunto verificados en Enviados).
3. Usar Outlook UI o una integración HTML autorizada que conserve la firma gráfica oficial. Comprobar su inserción automática o insertar el fragmento oficial; verificar diseño, imágenes y enlaces. Un conector que sólo admite texto plano no sirve para enviar estos correos; puede usarse para lectura o preparación del cuerpo. No inventar endpoints, credenciales ni permisos para sortear una limitación.
4. Abrir/comprobar el campo CCO: debe contener exactamente `48713323@bcc.hubspot.com`. Confirmar el resto de destinatarios y la correspondencia entre enlaces/adjuntos y el contenido aprobado.
5. Enviar una sola vez. Si ninguna vía disponible conserva la firma gráfica y el BCC, mantener el correo pendiente y explicar la limitación concreta. No degradar a firma en texto. Tras un resultado incierto, buscar la copia enviada antes de reintentar.
6. Leer **Elementos enviados** para comprobar remitente, destinatario, asunto, cuerpo/firma y BCC. Un envío aceptado, la entrega al destinatario y el registro en HubSpot son estados distintos.
7. Verificar, cuando el acceso lo permita, la actividad de correo asociada en HubSpot. **BCC enviado no prueba ingestión, asociación a contacto/empresa/deal, apertura, clic ni seguimiento automático**. Si no hay readback CRM, informar «enviado por Outlook con BCC; registro en HubSpot pendiente de verificación».

## Prospección personalizada — criterio confirmado el 13/10/2026

Julio pidió primeros contactos individualizados, empáticos, con un motivo concreto para elegir Efeonce,
diferenciadores pertinentes y **al menos un brochure relacionado con el contexto**, enviado desde su
mailbox con la firma gráfica instalada. Aplicar este criterio al preparar próximos correos comerciales;
aplica la firma gráfica obligatoria siempre y conserva la autorización específica de cada envío.

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

Todo borrador nacido por conector en texto debe convertirse antes de enviarse. Abrir ese borrador en
Outlook web, elegir **Opciones → Cambiar a HTML** y conservar cuerpo, párrafos, enlaces y destinatarios.
Retirar sólo la firma de texto del mensaje nuevo e insertar la firma oficial instalada mediante
**Mensaje → Firma → Julio** (nombre observado; verificar el actual). Pegar contenido enriquecido cuando
sea necesario: reemplazar texto plano de todo el editor puede colapsar párrafos o destruir la firma.
Comprobar una sola firma gráfica y CCO antes de enviar. No cambiar preferencias globales para resolver
un envío puntual. Tras enviar, buscar Elementos enviados por identidad/asunto/fecha: el ID puede cambiar
y el enlace del borrador puede conservar una vista obsoleta. No reenviar por esa vista.
[Envío y lectura independientes del caso](../commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md).

### Delta 2026-10-20 — Outlook web: DOM antes que captura, CCO resuelto y adjuntos

Lecciones del envío de la propuesta a Assetplan desde Outlook web en el navegador integrado:

- **Sesión.** Outlook no tenía sesión iniciada en el navegador integrado; Julio la inició. El agente no
  ingresa contraseñas: si falta la sesión, pedirla y esperar.
- **La captura puede ir atrasada.** Con un viewport emulado (`resize_window` 1440×900), las capturas
  llegaron atrasadas respecto del DOM: parecía que el texto no se escribía, se reescribió y el destinatario
  quedó duplicado. Verificar Para, CCO y cuerpo leyendo el DOM (`innerText` de los `contenteditable` con
  `aria-label` «Para», «CCO» y «Cuerpo del mensaje»), no la captura. Trabajar sin emulación o tratar la
  captura como no confiable.
- **Foco antes de teclear.** Unas teclas de borrado cayeron en el cuerpo porque el foco estaba ahí.
  Antes de escribir o borrar, confirmar `document.activeElement`.
- **El CCO escrito no es un destinatario hasta ser píldora.** El borrador guardado, leído con el conector
  (`read_resource`), mostraba `bccRecipients: []` aunque la dirección estaba escrita. Se resolvió escribiendo
  la dirección y pulsando **Enter** sobre la sugerencia; luego Enviados mostró el CCO correcto. Hacer clic en la
  sugerencia abrió el complemento HubSpot Sales y una ventana de inicio de sesión de HubSpot que el agente no
  puede cerrar y que bloquea el JavaScript de la página; Julio la cerró. Resolver con teclado y comprobar el
  CCO en el borrador guardado por conector antes de enviar.
- **Espacios entre párrafos.** Julio corrigió: «No estás dejando nada de espacios». El cuerpo lleva una línea en
  blanco entre saludo, introducción, resumen con viñetas, inversión, invitación y despedida. Verificarlo leyendo
  el borrador guardado por conector, no sólo el editor.
- **Adjuntos.** En esta sesión, **Examinar este equipo** abrió un diálogo nativo que el navegador integrado no
  controla, y el selector **OneDrive** abrió el OneDrive personal, mientras `Alineación/4. Comercial/...` vive
  en la biblioteca SharePoint GrowthMarketing (Documentos compartidos). Julio adjuntó los PDF y envió. Si el
  agente no puede adjuntar, dejar el borrador verificado y pedirle al operador que adjunte y envíe.
- **Readback después del envío humano.** Por conector se comprobó remitente, Para, CC vacío, CCO, asunto y los
  dos adjuntos con nombre y tamaño; en HubSpot `48713323`, la actividad EMAIL `SENT` asociada al Deal.
- **Dirección inferida.** La dirección de la destinataria seguía inferida (patrón nombre.apellido), no
  verificada. Se avisó al operador antes de enviar y se comprobó que el correo anterior no había rebotado; eso
  no la convierte en dirección verificada.

[Caso, adjuntos y readback](../commercial/prospecting-agent/runs/2026-10-20-1221-assetplan-deal.md#propuesta-enviada--20102026).

### Seguimiento nativo autorizado en HubSpot — 13/10/2026

El operador precisó que las secuencias de seguimiento se ejecutan **en HubSpot, no Apollo**.
[Lote autorizado y readback](../commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md): mailbox
Outlook 365 conectado, firma global Julio verificada, documentos nativos contextualizados, horas locales
laborales y desinscripción por respuesta. No duplicar firma ni afirmar CCO en una pantalla que no lo expone.
Este caso usa registro nativo CRM y conserva el alcance separado de la política CCO para envíos por Outlook;
no concede autorización general de futuros mensajes ni sustituye el readback de un envío real.

### Persistencia de contenido enriquecido — observación del 24/10/2026

En el [caso Disney](../commercial/prospecting-agent/runs/2026-10-24-disney-paola.md), el editor mostró el cuerpo
completo tras pegar HTML, pero la primera copia guardada conservó sólo la firma. Ver el texto en pantalla no
acredita que el borrador se haya persistido: comprobar la copia guardada si se entrega como borrador y, tras
el envío autorizado, abrir el ID nuevo de Enviados mediante lectura independiente. Verificar cuerpo completo,
ambos enlaces de brochure cuando se solicitaron, landings, una firma nueva y destinatarios/CCO exactos.
Una sugerencia de Viva Insights o un botón deshabilitado no prueba programación ni envío; reconciliar el
resultado real antes de otra acción. No repetir el envío por un borrador obsoleto ni sustituir la firma gráfica.
El InMail se comprueba en su conversación; la actividad EMAIL no cierra por sí sola ese canal.

## Evidencia, alternativas y límites

El 2026-10-08 se verificó en Enviados el correo a Dianesty sobre diseñador senior: salió desde Outlook con los dos enlaces, pero con cierre simple y sin BCC. El operador pidió esta corrección permanente. El contrato aplica a futuros envíos; no reenvía ni registra retroactivamente ese correo sin mandato específico.

La decisión inicial de exigir sólo HTML quedó sustituida el mismo 2026-10-08 tras la prueba por conector con firma completa en texto y BCC, verificada en Enviados. El operador aceptó entonces ambas vías (autorización sustituida el 21/10/2026): «podemos usar las dos vías, la del conector y la otra donde no usas el conector y pones mi firma». Sigue descartado confiar en que el conector añadirá por sí solo la firma configurada en Outlook. Desde el 21/10/2026 se comprueba siempre la firma gráfica oficial y el BCC antes del envío.

Revisar esta decisión si cambia el remitente, la firma aprobada, la dirección de registro de HubSpot o el soporte HTML del conector. La documentación no demuestra instalación, automatización técnica ni recepción de un nuevo correo.

Evidencia del cierre documental: [cobertura, controles y límites](../audits/commercial/2026-10-08-outlook-signature-bcc.md).
