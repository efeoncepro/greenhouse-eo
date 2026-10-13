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
El documento aprobado no certifica todas sus cifras. Usar [mensaje y prueba](message-and-contextual-proof.md).

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

Registro nativo HubSpot y CCO Outlook tienen carriles distintos. En esta ruta usar logging/asociación
nativos; no afirmar CCO si la pantalla no lo expone. Para Outlook directo conservar la
[política de firma/CCO](../../../../docs/operations/EFEONCE_OUTLOOK_AGENT_SEND_POLICY_V1.md).

## Ejecutar en HubSpot

1. Buscar secuencias/inscripciones existentes y resolver duplicados antes de crear. Preparar mapa
   persona → textos → documentos → calendario → parada con la [plantilla de cadencia](../templates/account-cadence.md).
2. Crear **desde cero** con correos automatizados. Evitar la secuencia dinámica por defecto cuando el
   mandato exige continuar pese a aperturas/clics. Guardar cada plantilla con su mensaje y documento.
3. Configuración: días laborables activados, retrasos revisados y ventana local de envío. Guardar la
   secuencia con nombre reconocible, owner correcto y visibilidad acotada al alcance.
4. Automatizar: comprobar **respuesta a cualquier correo → desinscribir el contacto**. Esta regla
   cubre una respuesta al primer mensaje de Outlook, no sólo a pasos de la secuencia. Si el mandato
   dice seguir hasta respuesta, desactivar la regla por reunión y no añadir ramas por aperturas/clics.
   Verificar alcance Contact/Company; no desinscribir a toda la empresa por defecto.
5. Seleccionar únicamente el contacto aprobado; comprobar Para y De, zona horaria, documento y firma.
   Para inicio futuro elegir **Enviar más tarde** antes de **Iniciar secuencia**. El primer paso ofrece
   Enviar ahora por defecto: guardar la secuencia no programa por sí solo el inicio deseado.
6. Leer las fechas calculadas de **todos** los pasos en la inscripción, no sólo los retrasos del editor.
   Confirmar primer envío futuro, días/horas locales, destinatario único y contenidos finales. Iniciar
   dentro del mandato vigente; ante resultado incierto, conciliar antes de pulsar otra vez.
7. «Procesando inscripciones» es intermedio. Hacer lectura nueva de Inscripciones: contacto correcto,
   **Programado**, fecha de inicio y errores. Releer reglas guardadas de Automatizar. Conservar IDs y
   evidencia privada del calendario; una fila «Total inscritos 1» por sí sola no prueba Programado.

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

Fuentes de comportamiento, contrastadas en el caso del 13/10: [crear/editar secuencias](https://knowledge.hubspot.com/sequences/create-and-edit-sequences)
y [desinscripción](https://knowledge.hubspot.com/sequences/unenroll-from-sequence). Revalidar el portal y
el carril efectivo cuando cambien. Autoridad: [mandato acotado](../../../../docs/architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md#mandato-separado-y-acotado--2026-10-13).
