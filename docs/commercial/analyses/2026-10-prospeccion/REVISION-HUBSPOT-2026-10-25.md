# Revisión nativa de agente y secuencias

25/10/2026 · Corte de lectura: aproximadamente 10:50 UTC · Confidencial.
Mandato: comprobar qué debemos ajustar en el agente y las secuencias. **Revisión y cambios propuestos;
sin guardar configuración, editar contenido efectivo, pausar inscripciones, enrolar o enviar.**

[Implementación general](IMPLEMENTACION-Y-PAUTA.md) · [Revisión anterior de mensajes enviados](REVISION-MENSAJES.md)
· [Propuesta completa de instrucciones](PROPUESTA-STARTER-PLAY-2026-10-25.txt).

**Actualización posterior:** [cambios autorizados aplicados y releídos](APLICACION-HUBSPOT-2026-10-25.md).
Este archivo conserva el diagnóstico anterior a la aplicación.

## Conclusión

Sí hay ajustes nativos pendientes. El foco es **Prospecting Agent**, su cola ya generada y las
**inscripciones individuales de secuencias**, además de las plantillas reutilizables. Customer Agent
es otra superficie: en este portal abrió onboarding, no se observó un agente de atención configurado.
No corresponde activarlo ni crear otro flujo para corregir la prospección existente.

No hay que rehacer toda la cartera. Hay contenido útil y coherente en los pasos guardados. Las
prioridades son respetar espera/admisión, reparar encaje/acceso, elegir el material pertinente y
reducir el trabajo pedido al destinatario. La evaluación no demuestra que estos cambios causen más ventas.

## 1. Qué se verificó

| Superficie | Cobertura y límite |
| --- | --- |
| Identidad | Conector y CLI confirman Julio, portal Efeonce Group/Kortex `48713323`; UI coincide |
| CLI | `0.16.0`, scope de lectura de secuencias presente; `sequences list` rechazó OAuth de usuario con 403. Se usó UI, sin cambiar credenciales ni crear service key |
| Customer Agent | Ruta `/customer-agent/48713323/onboarding`, botón «Continuar con la configuración del agente»; no se pulsó |
| Prospecting Agent | Vista general, guía Starter Play `101042425`, audiencia, contexto, comunicaciones e instrucciones completas, automatización |
| Catálogo de secuencias | Dos páginas, **20 secuencias creadas**, owner Julio en las filas observadas. Total histórico inscrito no equivale a personas únicas o inscripciones vigentes |
| Bandeja de programados | **13 próximos correos de 12 secuencias**, visibles entre 27 y 29/10; son próximos pasos, no todos los correos futuros de esas inscripciones |
| Contenido base | **35 pasos de las 12 secuencias con próximos envíos**, leídos íntegros. Incluyen pasos ya enviados; no son 35 correos nuevos pendientes |
| Contenido individual | Inscripciones Sigelec (2 pasos) y Teva (3, uno enviado y dos futuros) abiertas y leídas, firma gráfica presente; «Guardar cambios» deshabilitado. No se acredita una lectura individual completa de los otros 11 próximos correos |
| Estados adicionales | Unilever, izipay Ariana/Diego/Iris, Indecaucho y Sergio/Kibernum; los datos de estado se detallan abajo |

Al intentar abrir otras ediciones individuales desde Programado, algunos intentos dejaron el iframe
vacío; se recuperó la navegación y se continuó por plantillas/estados. Se abrió una confirmación de
cancelación de Olivos durante esa exploración y se cerró con **No**; no se confirmó una baja. No se
atribuyó el panel vacío a una causa probada. Los mensajes base no certifican personalizaciones vigentes:
antes de aplicar un cambio se debe leer la inscripción efectiva que vaya a modificarse.

## 2. Prospecting Agent: conservar base y actualizar criterio

La instrucción nativa tiene **7.969 caracteres**, igual al snapshot del 07/10. Se comparó el valor del
campo DOM con el archivo por longitud y checksum FNV32 `3870440582`; el texto se leyó completo. El
botón «Revisar cambios» estaba deshabilitado: no había un cambio de guía pendiente visible.

### Lo que funciona y se conserva

Voz cálida, contexto verificable, no diagnosticar desde fuera, una capacidad pertinente, enlace de
reunión real y alternativa por correo. Idioma **Español - Chile**, sólo días laborables, ventana
**09:00–17:00 UTC−04:00** según la UI; no se reinterpretó ni corrigió esa zona. Remitente alternativo
Julio con su buzón comercial seleccionado. La automatización exige revisión antes del envío y detiene
por respuesta a cualquier correo, reunión o 30 días. Se conserva esa revisión humana.

El plan permite **hasta 5 correos en 30 días**, retrasos inteligentes y mínimo de 2 días. Es un tope,
no prueba de que se manden cinco ni una recomendación universal. No propongo cambiar esos controles
globales a ciegas: primero aplicar criterio y revisar cada continuidad.

### Cambios concretos preparados

1. Leer historia y última respuesta por **cuenta/marca/país/iniciativa**, no sólo la señal más reciente.
2. Separar Lead, intent score, clic y cargo de relación cálida, demanda y presupuesto. En las razones
   visibles de sugerencias hay inferencias de ese tipo; no se verificaron como hechos del comprador.
3. Resolver mandante, responsable o admisión fuera de plazo antes de seguir desarrollando una oferta.
4. Mantener una pregunta principal proporcional y continuidad de oferta; no saltar a CRM por silencio.
5. Reemplazar la orientación general de 100–170 / 60–110 palabras por extensión según contexto,
   conservando la arquitectura robusta de Julio cuando corresponda.
6. Explicitar brochure íntegro y pertinente, sin reemplazar los originales ni revalidarlos.
7. Respetar «los contactaremos si surge una oportunidad» y diferenciar revisión interna de recontacto.
8. Evitar generalizar un caso de ecommerce/automatización a experiencia en plataformas de visita médica.

La [propuesta completa](PROPUESTA-STARTER-PLAY-2026-10-25.txt) **reconcilia esas instrucciones dentro del
texto verificado y tiene 9.705 caracteres**, bajo el límite observado de 10.000. Sustituye como propuesta
de implementación al bloque aditivo anterior; **no se deben pegar ambos**. Conserva los enlaces y las
directrices existentes. No fue guardada ni aprobada en HubSpot; tampoco se generó un borrador nuevo.

El Contexto nativo conserva una oferta amplia, nueve etiquetas de producto y cinco grupos de buyer
personas; su texto está en inglés, mientras las directrices de salida son español. Eso por sí solo no
prueba un fallo de idioma. No se renombraron productos ni segmentos. Conviene revisar por iniciativa
qué capacidad y función compradora aplican, sin abrir una normalización global de catálogo en este pedido.

### Restricción actual de capacidad

La vista general informa **uso en pausa por créditos agotados**, con renovación el **29/10/2026**.
La guía puede aparecer «Activado» a la vez: habilitación y disponibilidad de créditos son estados
distintos. No se compraron créditos ni se intentó reactivar. No se infiere que esa pausa detenga Sales
Sequences: éstas muestran su propia cola programada vigente.

Los indicadores también tienen ventanas distintas: vista general últimos 30 días y guía «Todo».
No se mezclan con la tasa auditada de seis cuentas de la cohorte ni prueban calidad de respuesta.

## 3. Próximos correos: cambio por cuenta

Horas y etiquetas de zona **tal como aparecen en la bandeja**. No son una conversión nueva a Santiago.
La programación puede cambiar por respuesta, baja o intervención posterior; releerla antes de actuar.

| Cuenta / persona | Próximo paso visible | Qué conservar / ajuste propuesto |
| --- | --- | --- |
| Unilever / Karla | #2 · 27/10, 10:02 CST | Revisar primero encaje/mandante y acceso tras el rebote de Denis. El asunto se refiere a Foods; su cargo no confirma que la búsqueda publicada tenga ese alcance. No continuar cinco pasos a dos personas por inercia |
| Unilever / Estefanía | #2 · 27/10, 10:02 CST | Coordinar con la misma iniciativa de Karla. La base pide brief y mantiene ejemplos de alimentos; reducir a una validación de alcance/responsable, o proponer pausa si el canal sigue sin resolver |
| Toyota / Fabricio | #2 · 28/10, 10:00 CST | El material Web es pertinente. El siguiente paso desarrolla cotización/posventa antes de confirmar mandante; priorizar esa aclaración y evitar otro desarrollo automotor condicionado a una suposición |
| Teva / Felipe | #2 · 29/10, 10:35 −03 | La pregunta sobre plataformas e integraciones es buena y está en la inscripción individual. Precisar que Eusari demuestra ecommerce/contenido/automatización; no acredita experiencia con su plataforma de visita médica |
| Olivos / Emily | #1 · 29/10, 09:34 EST | Los tres textos son amables y aportan criterios, pero el comprador ya quedó en revisión interna. Propongo pausar la continuidad y conservar revisión interna; no enviar tres aportes sólo porque están preparados |
| Flesan / Lucía | #1 · 29/10, 10:00 EST | Conservar idea ilustrativa, coordinación y brochure. Afinar la pregunta a «¿Sigue abierta la búsqueda de aliados creativos para algún proyecto?»; pedir etapa/audiencia/fecha después de que confirme encaje |
| Sigelec / Yvette | #1 · 29/10, 10:00 EST | Los dos frentes estaban en la señal y el texto ya ofrece priorizar. Ajuste pequeño: «¿Cuál de los dos frentes sigue abierto: merchandising o web?»; dejar fecha y demás precisiones para su respuesta. No borrar arbitrariamente uno de los servicios solicitados |
| Evinka / Paula | #3 · 29/10, 10:15 EST | Conservar coordinación regional. Cambiar la entrada CRM/brochure repetido por validación de marca/alcance y prueba de agencia pertinente. No asumir que contratarán HubSpot |
| Besco / Nicol | #3 · 29/10, 10:25 EST | Mantener pauta, calidad y contenido interno del comprador. Usar brochure aprobado de Medios/Performance, no CRM como material principal. Pregunta: «¿Qué criterio define hoy un lead que su equipo comercial sí quiere atender?» |
| WIN / Fiorella | #3 · 29/10, 10:35 EST | Mantener contenido y coordinación PE/US. Facilitar derivación: «¿Quién está coordinando la evaluación de agencia para los próximos lanzamientos de WIN?»; pedir responsable y reunión de 20 minutos a la vez agrega fricción |
| Pizza Hut/Delosi / Hernán | #3 · 29/10, 10:55 EST | Material creativo y control de versiones útiles. Resolver acceso: «¿La evaluación sigue con Gustavo o la está coordinando otra persona?»; no pedir otro brief y reunión si aún falta quién lleva la selección |
| NIASA / Liliana | #1 · 29/10, 10:00 CST | Ya reconoce el plazo vencido, hecho positivo que conserva. Centrar el primer paso en «¿Todavía reciben credenciales para esta selección o debemos esperar una próxima evaluación?»; no mantener el segundo ejemplo del 05/11 sin resolver admisión |
| Station24 / Jesús | #3 · 29/10, 10:13 CST | Buen criterio de retención y reconocimiento explícito de que la señal era una vacante. Separar permiso de reunión: «¿Además de incorporar al especialista, están evaluando apoyo externo para implementar HubSpot?» |

Estos cambios de pregunta son propuestas editoriales. No se pegaron en las inscripciones ni sustituyen
las otras partes del cuerpo, brochure o firma. No se certificó aquí la ausencia de respuestas nuevas en
todos los buzones/canales; la revisión del hilo antes de aplicar sigue siendo necesaria.

En Sigelec se verificaron dos pasos: 29/10 10:00 y 05/11 10:05, UTC−05 fijo. En Teva, el primero figura
enviado el 22/10 y los siguientes 29/10 y 05/11 a las 10:35, UTC−03 Santiago. Esas vistas individuales
incluyen su firma gráfica; su presencia no acredita entrega futura ni un CCO nuevo.

## 4. Qué queda fuera de reactivación

- **Unilever:** seis inscripciones históricas representan tres personas, no seis compradores.
  Dos están en curso (Karla/Estefanía), una en error por rebote (Denis), tres finalizadas por cancelación
  manual del 20/10. No hay que recrear esos históricos ni «arreglarlos» reactivando al contacto rebotado.
  La plantilla base contiene el nombre Denis; **no prueba** que el correo individual de Karla o Estefanía
  lleve ese saludo. Eso debe leerse en sus personalizaciones antes de cambiarlo.
- **izipay:** Ariana y Diego finalizados por cancelación manual; Iris finalizada por respuesta. Mantener
  el proceso comercial vigente y no reabrir estas secuencias como efecto de actualizar el método.
- **Indecaucho:** secuencia de un paso, finalizada. No fabricar un segundo mensaje por este ajuste.
- **Sergio/Kibernum:** la inscripción figura en error por rebote, paso 2 de 3. No reintentar ni reenrolar;
  reconciliar casilla/persona e historial con los envíos manuales antes de cualquier nueva propuesta de contacto.
- **Antalis/Glasstech:** el catálogo registra cero inscripciones. Sus plantillas guardadas no son actividad
  realizada; quedan sujetas al criterio nuevo y revisión individual antes de activarse. No se auditó su copy
  completo en esta intervención. Laura/izipay conserva cero en catálogo y su exclusión de activación.

## 5. Orden para aplicar sin dejar una copia vieja en circulación

1. **Prospecting Agent:** usar la propuesta reconciliada, verificar que la base no haya cambiado, guardar
   y revisar/aprobar sólo ese delta de configuración dentro del mandato. Releer después. Conservar autonomía,
   audiencia, remitente y revisión humana. Un cambio de guía no regenera borradores anteriores.
2. **Antes del 27/10:** revisar las dos inscripciones activas de Unilever y su canal/encaje; resolver si
   corresponde un mensaje de aclaración o pausa. No sustituir esta decisión por editar la plantilla común.
3. **Antes del 28–29/10:** confrontar Toyota, Olivos, NIASA y demás filas con el último hilo. Separar las
   pausas propuestas de los ajustes editoriales que sí corresponda aplicar.
4. **Inscripciones actuales:** entrar al contacto/inscripción y revisar todos los pasos futuros, asunto,
   cuerpo, material, firma, fechas y paradas. Guardar sólo dentro del alcance autorizado y leer de nuevo.
5. **Plantillas reutilizables:** mantenerlas alineadas para futuras inscripciones, preservando personalización
   y documentos aprobados. No duplicar secuencias ni reenrolar para «forzar» una actualización.
6. **Cola del agente:** revisar borradores ya generados por separado, especialmente después de la renovación
   de créditos. No pulsar «Iniciar comunicación» ni aprobar envíos por haber actualizado instrucciones.

**Hallazgo de ejecución decisivo:** el editor de Flesan/Sigelec muestra «Los cambios que hagas no afectarán
a los que ya están inscritos». Cambiar sólo la plantilla deja pendiente el contenido de las inscripciones
actuales. El [manual compartido](../../../../.codex/skills/efeonce-b2b-prospecting/references/hubspot-follow-up-sequences.md)
incorpora esta distinción y la necesidad de readback individual.

La revisión completa el diagnóstico y deja texto concreto para el agente y decisiones por cuenta.
**La aplicación nativa y su QA de salida permanecen pendientes.** No hubo envío, compra de créditos,
pausa nueva, alta o cambio en los permisos/audiencia durante esta revisión.
