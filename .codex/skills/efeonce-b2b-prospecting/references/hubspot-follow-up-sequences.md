# Seguimientos personalizados programados en HubSpot

Cargar cuando el operador pide programar una secuencia o ejecutar seguimientos por email.
Prospecting posee contexto, mensaje y cadencia; [HubSpot](../../hubspot-as-a-service/SKILL.md) posee
portal, mailbox, configuración, inscripción y readback. Commercial conserva respuestas y compromisos.
El [caso del 13/10/2026](../../../../docs/commercial/follow-up-agent/runs/2026-10-13-secuencia-hubspot.md)
acredita una ejecución concreta; sus fechas, personas y cantidad de pasos no son valores universales.

## Alcance y plataforma

- **Para las secuencias de Julio, usar HubSpot. No sustituirlo por Apollo.** Apollo puede aportar datos
  dentro de su permiso; un mailbox listado allí no verifica la firma ni autoriza cambiar el transporte.
  Cambiar de plataforma requiere una instrucción específica del operador.
- Reutilizar el mandato vigente: un pedido explícito de programar/enviar seguimientos automáticos a un
  lote identificado permite preparar, inscribir y activar ese lote dentro de sus condiciones. No volver
  a pedir una autorización ya dada. Si sólo pidió propuesta, borradores o crear sin activar, conservar
  ese límite. «Cadencia razonable» permite resolver intervalos/horarios con criterio dentro del alcance.
- Conservar exclusiones, HOLD, bajas y desconocidos. Personas investigadas adicionales no se inscriben
  por efecto de crear una secuencia. No extrapolar una excepción individual de email deducido a nuevas
  altas ni convertir inscripción/envío en verificación de la dirección.
- Leer hilo inicial, respuestas, rebotes, actividad CRM y programaciones existentes antes de inscribir.
  Preparar contenido y horarios concretos antes de pedir cualquier aclaración realmente necesaria.
  Distinguir el resultado de una búsqueda/asistente del mensaje o actividad que lo respalda.
- Comprobar capabilities de la sesión: tools/CLI de CRM o lectura de secuencias no prueban soporte de
  escritura/enrollment. Usar UI autorizada cuando corresponde. Si falta acceso, conservar el trabajo
  preparado y resolver ese carril; no crear secuencias en otro proveedor como fallback implícito.

## Componer cada paso

Escribir los pasos completos por persona, con su contexto y relación reales. Mantener empatía, primera
persona de Julio y una pregunta fácil de responder; conservar si es autor, contacto adyacente o receptor
de propuestas. Una vacante no se transforma en una solicitud de agencia por incluirla en una secuencia.

Cada correo aporta **algo nuevo y útil**: dato con fuente/fecha, ejemplo señalado como ilustrativo,
herramienta pequeña, criterio de evaluación o prueba autorizada de capacidad. Explicar cómo ayuda a su
decisión y por qué Efeonce puede resolver ese trabajo —capacidad y mecanismo concretos—. No repetir la
presentación inicial, inventar resultados ni prometer uplift para llenar el seguimiento.

Criterio confirmado de Julio: incluir un brochure pertinente en cada correo de prospección, salvo
instrucción distinta, y escribir **qué encontrará y para qué le sirve** antes del enlace. En HubSpot: **Insertar → Documentos**, material aprobado, texto
legible del enlace, descarga permitida; sin exigir correo ni miniatura, salvo instrucción distinta.
No copiar enlaces de tracking de otra persona ni adjuntar propuestas privadas de otros clientes.
Usar el brochure aprobado íntegro y el documento existente de HubSpot. No recortar, reescribir ni subir
una copia por criterio del agente; una modificación requiere instrucción explícita de Julio sobre ese
material. No reabrir validaciones históricas: los brochures están aprobados y no necesitan nada más.
Verificar identidad/ID del documento elegido y el enlace correcto, sin convertir esa comprobación en una
revisión editorial. Aplicar la [regla vigente](../../../../docs/operations/EFEONCE_APPROVED_BROCHURES_POLICY_V1.md).

Si los cuerpos difieren de forma sustancial, usar una secuencia por persona o una personalización nativa
que permita comprobar cada texto final; sustituir sólo nombre/empresa no basta. Desde el segundo paso,
usar respuesta nativa al hilo previo cuando corresponda. No fabricar un «Re:» como asunto de hilo nuevo.

## Cadencia laboral y remitente

Elegir un número finito de pasos y espaciarlos según el último envío, motivo, proceso y relación. Anotar
fechas locales concretas, hora/ventana y zona horaria del destinatario. Comprobar fines de semana y festivos
de los días de envío; **días laborables de HubSpot no demuestra exclusión automática de festivos**.
No convertir un plazo interno en compromiso comprador ni enviar pasos atrasados juntos.

Ejemplo del caso: primer correo manual el 13/10; seguimientos 16/22/29 de octubre, con retrasos de cuatro
y cinco días laborables entre los tres pasos, por la mañana local. Los siguientes pasos usaron ventanas
de cinco minutos, por lo que HubSpot eligió minutos distintos. No prometer hora exacta si se guardó ventana.

Verificar correo conectado/activado y remitente en la inscripción; estar autenticado en HubSpot no lo
prueba. Comprobar firma global y, si existe, la específica del mailbox. Mantener **una sola firma oficial**:
la plantilla usa la predeterminada, no añadir otra copia. HTML configurado, preview renderizado y firma
entregada son evidencias distintas; un iframe blob vacío no acredita ni refuta el envío de la firma.

Registro nativo HubSpot y CCO Outlook tienen carriles distintos; no afirmar CCO si la pantalla no lo
expone. Si el mandato exige expresamente CCO y la inscripción no permite configurarlo, terminar la
preparación concreta y verificable, conservar las secuencias sin inscribir y explicar la limitación.
El registro nativo no sustituye ese requisito por decisión del agente. Una instrucción posterior explícita
puede autorizar registro nativo con excepción al CCO para el lote nombrado: reutilizarla y activar sólo
ese alcance, sin volver a pedirla ni convertirla en una excepción general. Mantener firma gráfica,
reglas de parada y evidencia por persona; no añadir reglas globales del mailbox, cambiar de plataforma
o duplicar correos para resolverlo. Para los demás envíos conserva la
[política de firma/CCO](../../../../docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md).

## Ejecutar en HubSpot

### Plantilla y contenido de una inscripción son estados distintos

La [lectura nativa del 25/10/2026](../../../../docs/commercial/analyses/2026-10-prospeccion/REVISION-HUBSPOT-2026-10-25.md)
verificó el aviso del editor: cambiar la secuencia no afecta a contactos ya inscritos. Para corregir
próximos envíos, leer y editar dentro del mandato **cada inscripción y sus pasos futuros**, además de
alinear la plantilla para usos posteriores. No reenrolar ni duplicar una secuencia para forzar el cambio.
Verificar asunto/cuerpo, documentos, firma, calendario y paradas en la inscripción efectiva después de
guardar; una plantilla correcta no acredita el correo individual. Si el editor individual queda vacío,
conservar el bloqueo de ese readback: la plantilla base no certifica sus personalizaciones.

Una pausa por créditos del Prospecting Agent no demuestra pausa de Sales Sequences. Consultar su cola
independiente y distinguir histórico inscrito, persona única, en curso, programado, error y finalizado.

### Recorrido autorizado

1. Buscar secuencias/inscripciones existentes y resolver duplicados antes de crear. Preparar mapa
   persona → textos → documentos → calendario → parada con la [plantilla de cadencia](../templates/account-cadence.md).
2. Crear desde cero con correos automatizados, o clonar una estructura ya revisada dentro del lote
   autorizado. Al clonar, **clonar también las plantillas** para personalizar sin alterar las de otra
   persona. Revisar nombres, cuerpos, reglas y calendario heredados. Evitar la secuencia dinámica por
   defecto cuando el mandato exige continuar pese a aperturas/clics. Guardar cada plantilla y documento.
3. Configuración: días laborables activados, retrasos revisados y ventana local de envío. Guardar la
   secuencia con nombre reconocible, owner correcto y visibilidad acotada al alcance.
4. Automatizar: comprobar **respuesta a cualquier correo → desinscribir el contacto**. Esta regla
   cubre una respuesta al primer mensaje de Outlook, no sólo a pasos de la secuencia. Si el mandato
   dice seguir hasta respuesta, desactivar la regla por reunión y no añadir ramas por aperturas/clics.
   Verificar alcance Contact/Company; no desinscribir a toda la empresa por defecto. Si el mandato no
   pide continuar hasta respuesta exclusivamente, comprobar también la parada por reunión; no desactivarla
   por copiar la configuración de otro caso. Releer ambas reglas guardadas y mantener bajas/rebotes.
5. Seleccionar únicamente el contacto aprobado; comprobar Para y De, zona horaria, documento y firma.
   Para inicio futuro elegir **Enviar más tarde** antes de **Iniciar secuencia**. El primer paso ofrece
   Enviar ahora por defecto: guardar la secuencia no programa por sí solo el inicio deseado.
6. Leer las fechas calculadas de **todos** los pasos en la inscripción, no sólo los retrasos del editor.
   Confirmar primer envío futuro, días/horas locales, destinatario único y contenidos finales. Distinguir
   ventana de la secuencia y hora personalizada de la inscripción: la evidencia de la segunda gobierna
   el calendario que se comunica. Revisar también saltos de párrafo junto al documento nativo y el cierre;
   guardar el cuerpo final personalizado cuando difiera de la plantilla base. Iniciar
   dentro del mandato vigente; ante resultado incierto, conciliar antes de pulsar otra vez.
7. «Procesando inscripciones» es intermedio. Hacer lectura nueva de Inscripciones: contacto correcto,
   **Programado**, fecha de inicio y errores. Releer reglas guardadas de Automatizar. Conservar IDs y
   evidencia privada del calendario; una fila «Total inscritos 1» por sí sola no prueba Programado,
   ni Programado significa En curso o correo enviado.

En UI esperar al selector **Seleccionar contactos** antes de escribir en su buscador: el buscador global
es otro control. Si la vista angosta solapa nombres y botones, inspeccionar estado/layout y resolverlo;
no repetir clics sin comprobar efectos. Ningún índice de UI de esta sesión se reutiliza como receta.

## Respuestas, cierre y continuidad

Mantener bajas, rebotes y errores como protecciones nativas. «Parar por respuesta» describe la regla
comercial; no prometer que el proveedor enviará pese a opt-out/rebote ni confundir OOO con respuesta humana.
Ante respuesta, [clasificar](response-handling.md), trabajar su hilo y comprobar cancelación de pendientes
en el canal. No reinscribir automáticamente ni reemplazarlo por colegas, otro dominio o proveedor.

Registrar preparado, guardado, inscripción solicitada, **programado verificado** y enviado por separado.
Actividad EMAIL `SENT`, recepción, apertura y respuesta requieren sus evidencias posteriores. No declarar
18 enviados cuando sólo se programaron 18. No duplicar desde Outlook manual, el heartbeat o Apollo;
cancelar/pausar un carril no detiene los demás. Conservar la autorización finita y el siguiente paso donde
se lee, sin cambiar el corte global del pipeline ni crear otro scheduler.

Datos/direcciones/cuerpos reales permanecen en CRM/Outlook y expediente privado. Repo/skills conservan
método; el registro del caso conserva IDs, contexto y estados fechados. Documentar límites de lectura o
rendering. Esta actualización documental no autoriza nuevos envíos, altas, permisos o reinicios.

[Aplicación del 16/10](../../../../docs/commercial/follow-up-agent/runs/2026-10-16-fabricio-web-hubspot.md):
copia de brochure identificada, calendario personalizado y firma configurada con preview limitado.
Sus tres pasos y fechas son decisiones del caso, no una cadencia universal.

Fuentes de comportamiento, contrastadas en el caso del 13/10: [crear/editar secuencias](https://knowledge.hubspot.com/sequences/create-and-edit-sequences)
y [desinscripción](https://knowledge.hubspot.com/sequences/unenroll-from-sequence). Revalidar el portal y
el carril efectivo cuando cambien. Autoridad: [mandato acotado](../../../../docs/architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md#mandato-separado-y-acotado--2026-10-13).

## Un seguimiento condicionado, sin ampliar la cadencia

Si el operador pide «un seguimiento si no responde», preparar un único correo futuro; no heredar los tres
pasos de otros expedientes. El aporte puede ser un criterio concreto para comparar propuestas, seguido de
una pregunta sobre admisión cuando la autora ya está revisando una shortlist. Confirmar que respuesta a
cualquier correo cubra el mensaje inicial enviado por Outlook; reunión/baja/rebote conservan sus reglas.
Tras Programado, reabrir Editar de la inscripción para leer hora/zona persistidas si la fila sólo muestra
el día; salir sin guardar cambios. No interpretar «Procesando» o un ID viejo de borrador como fallo para
repetir el envío. [Caso verificado](../../../../docs/commercial/follow-up-agent/runs/2026-10-18-indecaucho-katia-hubspot.md).

## Edición y persistencia verificadas en la UI — 21/10/2026

- Plantilla, configuración de secuencia e inscripción son guardados diferentes. Después de cambiar
  ventanas/reglas, pulsar **Guardar secuencia existente** y comprobar persistencia antes de inscribir;
  guardar el correo no guarda por sí solo esos ajustes. Esperar que termine cada guardado antes del siguiente.
- No sobrescribir plantillas compartidas al reutilizar una estructura. Elegir la opción de clonar las
  plantillas y verificar independencia después de personalizar. El nombre de la secuencia no basta.
- El documento es un elemento nativo del editor: borrar con una operación de texto vacía puede dejarlo.
  Si ocurre, seleccionar el cuerpo completo y borrarlo; insertar el documento correcto por su nombre,
  luego colocar el texto antes del vínculo. Releer cuerpo para comprobar una sola inserción, párrafos y
  cierre. No convertir selectores o teclas de una sesión en una receta universal.
- En el selector de documentos, confirmar el nombre exacto; Enter sobre una opción puede elegir otra.
  El botón Insertar del menú y el que confirma documento pueden estar en contenedores distintos: leer
  estado visible y comprobar que el vínculo fue incorporado, no repetir clics a ciegas.
- Seleccionar zona del destinatario por desfase y reglas horarias, no sólo etiqueta de ciudad. En el caso
  Perú se usó UTC−05 fijo; no universalizar esa opción a países con cambios estacionales.
- Una fila sin fecha o todavía cargando no prueba fallo. Leer Inscripciones después del procesamiento;
  recargar si sigue mostrando estado anterior, sin repetir Iniciar. Conservar calendario del formulario
  final y Programado por persona. Total inscritos verifica cantidad, no sustituye ese estado.

[Registro del lote y Laura sin inscripción por rebote](../../../../docs/commercial/follow-up-agent/runs/2026-10-21-agencia-creativa-izipay.md).

## Inscripción guardada y lector fallido — aplicación 24/10/2026

En [Lucía y Yvette](../../../../docs/commercial/follow-up-agent/runs/2026-10-24-lucia-yvette-secuencias.md),
el mandato posterior resolvió el CCO con una excepción acotada; cada destinataria conserva dos plantillas
propias, brochure nativo explicado, firma oficial y segundo paso como respuesta al primero de su secuencia.
Las fechas de ese caso no son un valor por defecto para otras personas.

- Reabrir **Editar** de la inscripción programada para leer las fechas/horas y zona persistidas de todos
  los pasos; salir con **Cancelar** si sólo se leyó. La ventana general y la fila con día de inicio no
  sustituyen ese calendario. Una etiqueta de ciudad se evalúa por su desfase y reglas estacionales.
- `RESPONSE_DECODE_FAILED` del lector CLI de inscripciones es un error de lectura, no prueba de alta
  fallida ni motivo para reintentar Iniciar. Conciliar en la UI autenticada y, como corroboración distinta,
  leer `hs_sequences_is_enrolled`, `hs_sequences_enrolled_count` y `hs_latest_sequence_enrolled` del Contact.
  Esos campos no prueban calendario, firma, reglas de parada o entrega.
- Esperar que «Procesando» llegue a un estado legible; comprobar persona/secuencia, Programado y errores.
  Leer de nuevo las reglas Contact de respuesta a cualquier correo y reunión. No crear un scheduler o
  seguimiento manual paralelo por un fallo del reader ni reinscribir por una vista todavía vacía.
- Comprobar párrafos y firma en el correo renderizado, además del texto guardado. Un preview puede
  generar nuevos enlaces para la misma destinataria sin implicar otra inscripción; no contar URLs
  transitorias como envíos ni reutilizar tracking de otra persona. Cuerpos y enlaces reales quedan privados.
