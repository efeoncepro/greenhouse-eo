# SKY — Atención de comentarios en redes 2027: diseño de la operación (V2, detallado)

> **Estado:** borrador de diseño para revisión de Julio Reyes. **Corte:** 10/10/2026. Reemplaza a la V1.
> **No es** una cotización, un SOW ni un compromiso con SKY. El precio se calcula después de aprobar este diseño.
> **Fuentes:** correo de Jaime Herrera del 09/10/2026 («RE: Piloto comentarios Efeonce»), informes semanales del
> piloto (mayo–junio 2026), caso de negocio del piloto, propuesta de febrero 2026 y el canon de servicio:
> [Social Media Operating Model](../../../services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md),
> [equipos humano-agente](../../../services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md) y
> [arquitectura de Efeonce Insights](../../../architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md).
> Contexto comercial: [README del expediente](README.md). Propuesta en el canvas: «Propuesta Sky».

Cada cifra lleva su origen: **[SKY]** dato del correo de Jaime · **[piloto]** medido en el piloto ·
**[hipótesis]** supuesto de este diseño, por validar · **[por construir]** capacidad que Efeonce todavía no tiene.

## 0. Resumen

- Efeonce es la **primera línea pública** de SKY en los comentarios de sus 13 cuentas: clasifica todo, responde tres
  tipos, deriva los reclamos a DM y devuelve a Marketing lo que la conversación enseña.
- La unidad es la **conversación** (el comentario inicial y su hilo), no la respuesta. Base: 1.300 al mes.
- Operan **personas con agentes**: un agente clasifica todo lo que entra y otro propone cada respuesta desde una base
  de conocimiento que SKY aprueba; una persona aprueba y envía. El agente no responde solo.
- Cobertura recomendada: lunes a viernes de 09:00 a 22:00 y fines de semana y feriados de 10:00 a 20:00, con guardia
  por alerta de noche. Tres modos: normal, campaña y contingencia.
- Se mide con 27 indicadores (incluye una encuesta de esfuerzo, CES, en los traspasos) y se reporta en cinco cadencias; el informe mensual es una edición de **Efeonce
  Insights**, que hoy no tiene fuente de social care **[por construir]**.
- Lo que todavía no existe como operación: las dos personas, la bandeja elegida, los agentes y la fuente de datos de
  Insights. Todo eso es trabajo de la puesta en marcha y condiciona la fecha de inicio.

## 1. Mandato y fronteras

| Dentro | Fuera |
|---|---|
| Clasificar todos los comentarios públicos de las 13 cuentas | Engagement (campañas, concursos, dinámicas): lo atiende la agencia de community de SKY **[SKY]** |
| Responder precio y destinos, consultas generales y quiebres | Resolver el caso del pasajero: lo hace personal de SKY por DM **[SKY]** |
| Derivar quiebres a DM con registro del traspaso | Atender mensajes directos |
| Detectar y escalar riesgos (P0/P1) | Vocería institucional, decisiones legales o de compensación |
| Ocultar o reportar suplantaciones, según la política de SKY | Publicar contenido, pauta o monitoreo general de marca |
| Informes y lectura de fricciones | Acceso a reservas, datos de pasajeros o sistemas internos de SKY |

Por confirmar con SKY: si entran los comentarios en **anuncios (pauta oscura)** y en **X**. La base de 1.300 viene
del período en que ambos se contaban **[SKY]**.

Fronteras con otros equipos:

| Con quién | Dónde está la línea |
|---|---|
| Agencia de community | El tipo de comentario decide: campañas, concursos y dinámicas son suyos; precio, generales y quiebres, nuestros. Un concurso con una pregunta de precio es nuestro |
| Experiencia de clientes de SKY | Nosotros contenemos y derivamos; ellos resuelven. Nunca pedimos datos del pasajero ni prometemos una solución |
| Marketing digital y squad creativo | Les devolvemos fricciones por pieza, ruta y promoción; ellos corrigen piezas y páginas |
| Comunicaciones y Legal | Declaran y cierran una contingencia; aprueban mensajes de espera; deciden en P0/P1 |

## 2. Demanda y supuestos

| Variable | Valor | Origen |
|---|---|---|
| Cuentas | 13: Facebook e Instagram de Chile, Perú, Brasil, Argentina y Uruguay; TikTok, LinkedIn y X transversales | [SKY] |
| Comentarios totales por mes, jul-25 a abr-26 | promedio 14.354; máximo 25.238 (ago-25); mínimo 6.602 (dic-25) | [SKY] |
| Comentarios totales por mes, may-26 a ago-26 | promedio 4.831 (otra plataforma: sin X ni pauta oscura; suma LinkedIn) | [SKY] |
| Engagement | más del 80 % del mes | [SKY] |
| Precio + generales + quiebres | 1.300–1.500/mes antes de mayo; 818/mes desde mayo | [SKY] |
| Base para dimensionar | **1.300 conversaciones/mes** (≈ 43 por día calendario); comentarios iniciales, sin réplicas | [SKY] + lectura de Julio |
| Canal | Instagram primero, luego Facebook; TikTok, LinkedIn y X muy bajos | [SKY] |
| Mercado | Chile primero; Perú y Argentina parecidos; Brasil y Uruguay 100–200 comentarios/mes | [SKY] |
| Concentración en campaña | 60 % del volumen de seis días llegó en dos (Cyber de junio) | [piloto] |
| Horario | parte del volumen entra después de las 19:00 | [piloto] |
| Tema principal en campaña | queja por precio o promoción, 42,7 %; cotización, 33,3 % | [piloto] |
| Reparto entre los tres tipos | 50 % precio · 25 % generales · 25 % quiebres | [hipótesis] |
| Respuestas públicas por conversación | precio 1,4 · generales 1,3 · quiebres 1,8 (≈ 1,5 en promedio) | [hipótesis] |
| Tiempo por conversación | precio 4 min · generales 3 min · quiebres 8 min (≈ 5 en promedio; ≈ 8 a mano) | [hipótesis] |
| Día pico | 170–260 conversaciones (4 a 6 veces el promedio) | [hipótesis] |

Con esos supuestos, 1.300 conversaciones son unas 1.950 respuestas públicas y unos 325 traspasos al mes. Todo lo
marcado como hipótesis se mide en la semana de operación en sombra (§22) antes de comprometer tiempos.

## 3. Catálogo de casos

La taxonomía del piloto, ampliada a los tres tipos. Cada comentario recibe tipo, subtipo, mercado, idioma, ruta (si
aplica), tono y prioridad.

| Tipo | Subtipos | Destino |
|---|---|---|
| Precio y destinos | Cotización de una ruta · vigencia o condiciones de una promoción · queja porque la promoción no coincide con el precio al cotizar · medios de pago y cuotas · consulta por destinos o frecuencias | Respuesta pública con dato vigente y enlace |
| Consultas generales | Equipaje · check-in y documentos · cambios y devoluciones (política) · mascotas, menores, asistencia especial · programa de viajeros · fallas de la web o la app (sin caso personal) | Respuesta pública desde la base |
| Quiebres y reclamos | Retraso o cancelación · equipaje perdido o dañado · reembolso pendiente · cobro duplicado · trato recibido · embarque denegado · caso sin respuesta por otro canal | Contención pública + traspaso a DM |
| No contestable | Sin contexto · insulto sin caso · spam · etiquetado entre usuarios · comentario de concurso | Registro con motivo |
| Riesgo | Suplantación o estafa · datos personales expuestos · amenaza · tema de seguridad operacional · prensa o figura pública | Ocultar o reportar según política + alerta |
| Temas vetados | Los que SKY indique que no se responden (en el piloto: descuento con un banco y canje de millas) | Registro; se informa la frecuencia para que SKY decida |

## 4. Proceso, paso a paso

| # | Paso | Quién | Dónde | Resultado |
|---|---|---|---|---|
| 1 | Entra el comentario | — | Bandeja | Comentario con cuenta, publicación y hora |
| 2 | Clasificar | Agente clasificador | Bandeja (etiquetas) | Tipo, subtipo, mercado, idioma, ruta, tono, prioridad |
| 3 | Enrutar | Reglas | Bandeja (colas) | Engagement a su cola; lo nuestro a la cola de Efeonce; P0/P1 dispara alerta |
| 4 | Revisar lo dudoso | Especialista | Bandeja | Clasificación corregida cuando el agente no tiene certeza |
| 5 | Leer el contexto | Agente redactor | Bandeja + base | Hilo completo, historial de la persona, entrada vigente de la base |
| 6 | Proponer | Agente redactor | Bandeja (borrador) | Respuesta con la fuente citada |
| 7 | Aprobar y enviar | Especialista | Bandeja | Respuesta pública publicada |
| 8 | Derivar (quiebres) | Especialista | Canal de traspaso | Registro con usuario, mercado, tema, urgencia y lo dicho en público |
| 9 | Seguir el hilo | Bandeja + especialista | Bandeja | Réplicas atendidas durante 72 h; un seguimiento público por persona |
| 10 | Cerrar | Especialista | Bandeja | Estado final, tiempos y evidencia |
| 11 | Revisar calidad | Líder | Muestra semanal | Nota por pauta; correcciones |
| 12 | Aprender | Especialista + líder | Base de conocimiento | Entrada nueva o corregida; fricción registrada para el informe |

### Matriz de decisión

| Si el comentario… | Entonces |
|---|---|
| Pregunta un precio y la ruta está en la base, vigente | Responder con tarifa «desde», condición y enlace del mercado |
| Pregunta un precio y la ruta no está o venció | Responder con el enlace al calendario de precios; registrar el vacío en la base |
| Reclama que la promoción «es falsa» | Explicar la condición (fecha, disponibilidad) sin discutir; un solo seguimiento |
| Hace una consulta de servicio que está en la base | Responder con la entrada aprobada |
| Hace una consulta que no está en la base | No improvisar: derivar al canal oficial y pedir la entrada a SKY |
| Describe un problema con su viaje | Contener, invitar a DM, registrar el traspaso |
| Publica su código de reserva, documento o teléfono | Ocultar según política, invitar a DM, registrar |
| Es de una cuenta que se hace pasar por SKY | Ocultar o reportar según política; alerta |
| Menciona seguridad, accidente, amenaza o autoridad | No responder; alerta P0 a SKY |
| Viene de prensa, figura pública o acumula reacciones | Alerta P1; respuesta aprobada por el líder |
| Es de un tema vetado por SKY | No responder; registrar |
| Insiste después de un seguimiento | Pasar a DM; no abrir debate |

### Reglas del hilo

- **Una conversación** = el comentario inicial de una persona y todo lo que escribe en ese hilo, hasta cerrarla.
- **Ventana de seguimiento:** 72 horas después de la última respuesta **[hipótesis]**; después, conversación nueva.
- **Un solo seguimiento público por persona.** A la segunda réplica, a DM.
- **Varias personas con la misma duda:** una respuesta visible para todas; individual sólo a quien trae un caso distinto.
- **Reapertura:** si alguien vuelve porque no lo atendieron por DM, se reabre, se deriva otra vez con urgencia y entra
  a la conciliación semanal. No es una conversación nueva.
- **Hilo que crece:** alerta y cambio de prioridad.

## 5. Cómo se escribe una respuesta

Estructura fija: saludo con el nombre · el dato o la contención · el siguiente paso (enlace o DM) · cierre breve. Sin
tecnicismos, sin mayúsculas sostenidas, sin emojis salvo que la guía de tono de SKY los pida, y en el idioma y la
variante del mercado.

| Tipo | Modelo (los valores entre corchetes salen de la base) |
|---|---|
| Cotización | «Hola, [nombre]. Para [ruta] hay tarifas desde [valor vigente] por tramo, según fecha y disponibilidad. Aquí ves el calendario con los mejores días: [enlace del mercado].» |
| Queja por promoción | «Hola, [nombre]. Entendemos la confusión. La tarifa de la promoción aplica a [condición vigente] y se agota por fecha. En este enlace ves qué días la tienen disponible: [enlace].» |
| Consulta general | «Hola, [nombre]. [Respuesta aprobada de la base]. El detalle completo está aquí: [enlace oficial].» |
| Quiebre | «Hola, [nombre]. Lamentamos lo ocurrido y queremos revisarlo contigo. Escríbenos por mensaje directo para que el equipo de SKY tome tu caso.» |
| Seguimiento único | «[nombre], para no dejarte sin respuesta, sigamos por mensaje directo: ahí el equipo puede ver tu caso.» |

Los textos definitivos son de SKY: se redactan con Marca en la puesta en marcha y viven en la base.

## 6. Prioridades y tiempos

| Nivel | Qué es | Núcleo | Extendida | Guardia |
|---|---|---|---|---|
| P0 | Seguridad, accidente, fraude masivo, filtración de datos, autoridad, viralidad extrema | Aviso a SKY en 15 min | Aviso en 30 min | Aviso en 30 min |
| P1 | Reclamo con tracción, acusación de estafa sobre una pieza con pauta | Respuesta en 30 min | 1 h | Aviso al líder; primer bloque |
| P2 | Quiebre individual; precio durante una campaña | 1 h | 4 h | Primer bloque del día |
| P3 | Consulta general o de precio en día normal | 2 h | 4 h | Primer bloque del día |
| Réplica | Respuesta de la persona en una conversación abierta | 2 h | 4 h | Primer bloque del día |

Todos los tiempos son **[hipótesis]** y son objetivos de diseño. Cómo se miden:

- El reloj parte cuando el comentario entra a la bandeja y se detiene cuando se publica la primera respuesta.
- Sólo corre dentro de la ventana con personas; un comentario de las 23:30 se mide desde las 09:00.
- Se excluyen las caídas de la plataforma social o de la bandeja, y lo que espera una definición de SKY.
- Se informa mediana y percentil 90, por ventana y por prioridad; nunca un promedio solo.
- Los objetivos se vuelven compromiso después de las primeras cuatro semanas medidas, en la primera revisión.

## 7. Cobertura y turnos

Hora de Chile. Lima va una o dos horas antes; Buenos Aires, Montevideo y São Paulo, igual o una hora después.

| Ventana | Horario | Quién |
|---|---|---|
| Núcleo | Lun–vie 09:00–19:00 | Titular (09:00–18:00) + líder disponible |
| Extendida | Lun–vie 17:00–22:00; sáb, dom y feriados 10:00–20:00 en bloques | Respaldo; una hora de cruce con el titular |
| Guardia | 22:00–09:00 | Agente clasifica; alerta P0/P1 al teléfono de guardia |

Un día normal:

| Hora | Qué pasa |
|---|---|
| 08:45 | El titular revisa lo que clasificó el agente en la noche y las alertas |
| 09:00 | Abre el núcleo: primero P1 y P2 de la noche, después la cola normal |
| 11:30 | Revisión de la base: promociones que parten o vencen hoy |
| 13:00–14:00 | Colación escalonada; el líder cubre alertas |
| 17:00 | Entra el respaldo; traspaso de pendientes en una hora de cruce |
| 18:00 | Sale el titular |
| 22:00 | Cierre: pendientes anotados, cola en cero o justificada; pasa a guardia |

Feriados: se atienden como fin de semana. Rige el calendario de Chile para el equipo; los feriados de los otros
mercados no cierran la operación. Fines de semana: bloques de 10:00–12:00, 14:00–16:00 y 18:00–20:00 **[hipótesis]**.

### Niveles de cobertura que SKY puede elegir

| Nivel | Ventana con personas | Para qué alcanza | Riesgo |
|---|---|---|---|
| A · Hábil | Lun–vie 09:00–19:00 | Operación diaria | Tardes y fines de semana esperan al día hábil siguiente |
| **B · Extendida** | A + tardes hasta las 22:00 + fines de semana y feriados | Volumen después de las 19:00 y campañas que cruzan el fin de semana | Madrugada sólo con guardia por alerta |
| C · Continua | Todos los días 07:00–23:00 con persona conectada | Atención casi permanente | Tres personas para un volumen que no las ocupa |

## 8. Modo campaña

> **Lectura de Julio (10/10/2026):** para este servicio, una campaña grande ya es por sí misma una contingencia. La
> propuesta lo presenta así: un solo «modo contingencia» con dos entradas, **con fecha** (campañas, este apartado) y
> **sin aviso** (§9). Cambia cuándo se activa y con cuánta preparación; el protocolo es el mismo.

Para Travel Sale, Cyber Sky, Black Friday y lanzamientos de ruta, según el calendario comercial que entregue SKY.

| Momento | Qué se hace |
|---|---|
| 14 días antes | SKY confirma fechas, mercados, rutas y condiciones; se reserva el refuerzo |
| 7 días antes | Respuestas por promoción y legales por mercado aprobados; base actualizada; prueba del agente con casos de la campaña anterior |
| 1 día antes | Revisión de enlaces y precios; turnos confirmados; alertas ajustadas al volumen esperado |
| Durante | Dos personas conectadas; ventana 08:00–23:00; precio pasa a P2; revisión de la base dos veces al día; parte diario a SKY |
| 3 días después | Informe de campaña: volumen, tiempos, fricciones por ruta y promoción, recomendaciones para la siguiente |

## 9. Modo contingencia

Para cancelaciones masivas, clima, paro, incidente o crisis reputacional.

- **Quién la activa:** Comunicaciones de SKY, o el líder de Efeonce cuando se cruza un umbral: los quiebres por hora
  triplican el promedio del mes, o tres P1 abiertos sobre el mismo tema **[hipótesis]**. Si activa Efeonce, avisa a
  SKY en el acto.
- **Qué cambia:** se usa el mensaje de espera aprobado; todos los quiebres del tema van a una sola ruta de
  derivación; se pausan las respuestas comerciales en las publicaciones afectadas; se suma el refuerzo; el líder
  envía un parte diario mientras dure (volumen, temas, tono, casos sensibles). El reporte cada hora se descartó el 10/10/2026 por decisión de Julio: es difícil de sostener.
- **Qué no se hace:** explicar causas, dar plazos, hablar de compensaciones o responder a prensa.
- **Quién la cierra:** Comunicaciones de SKY. Dentro de tres días hábiles se entrega la revisión del evento.
- **Antes de partir se acuerda:** contactos de crisis con teléfono y suplentes, mensajes de espera por tipo de evento
  y la regla de activación.

## 10. Equipo

Dimensionado para 1.300 conversaciones al mes en cobertura Extendida.

| Rol | Responsabilidades | Perfil | Dedicación [hipótesis] |
|---|---|---|---|
| Especialista titular | Aprueba y envía, deriva, mantiene la base día a día, corrige la clasificación | Atención al cliente o community con redacción impecable; experiencia en viajes o retail deseable | 100 % |
| Especialista de respaldo | Tardes, fines de semana y feriados; reemplaza al titular | Mismo perfil; portugués funcional deseable | 75 % |
| Líder de servicio y calidad | Calidad, calibración, excepciones, informe, guardia P0/P1, contingencias | Experiencia liderando atención o community en una marca masiva | 15–20 % |
| Responsable de cuenta | Interlocutor único; alcance, riesgos, revisiones | Ya existe en la cuenta | 5–10 % |
| Operación de agentes y base | Fichas de los agentes, pruebas, incidentes, estructura de la base | Diseño de agentes y automatización | Intensivo en la puesta en marcha; 10 % en régimen |
| Analista | Lectura mensual de fricciones; edición de Insights | Análisis de datos de marketing | 5–10 % |
| Refuerzo de campaña | Una persona entrenada más por ventana de campaña | Formada junto con el equipo base | Por evento |

Trabajo estimado por volumen **[hipótesis]** (conversaciones × 5 min + 70 h fijas; una persona rinde 120–130 h
efectivas al mes):

| Conversaciones al mes | Respuestas públicas | Trabajo al mes | Equipo en cobertura Extendida |
|---|---|---|---|
| 818 | ≈ 1.230 | ≈ 138 h | Titular 100 % + respaldo 50 % |
| 1.300 | ≈ 1.950 | ≈ 178 h | Titular 100 % + respaldo 75 % |
| 1.500 | ≈ 2.250 | ≈ 195 h | Dos especialistas a tiempo completo |

Condiciones de robustez:

- **Tres personas con acceso y entrenamiento** en todo momento (titular, respaldo, líder).
- **Vacaciones y licencias:** el respaldo sube a tiempo completo y el refuerzo cubre su turno; se planifican con un mes.
- **Rotación:** una persona nueva no responde sola hasta aprobar la certificación interna (abajo).
- **Portugués:** el agente redacta y lo revisa una persona con dominio del idioma.
- **Estos roles no están cubiertos hoy.** Selección y entrenamiento condicionan la fecha de inicio.

### Entrenamiento y certificación

| Módulo | Contenido | Duración [hipótesis] |
|---|---|---|
| SKY | Rutas, mercados, productos, tarifas, promociones, canales oficiales | 1 día |
| Tono | Guía de voz de SKY, diferencias por mercado, portugués | Medio día |
| Casos | Catálogo, matriz de decisión, quiebres, temas vetados, riesgos | 1 día |
| Herramientas | Bandeja, base de conocimiento, traspasos, agentes | 1 día |
| Práctica | Respuestas sobre comentarios reales, revisadas por el líder | 2 días |

Certificación: 50 respuestas de práctica con nota de calidad sobre el umbral acordado y cero errores de precio.

## 11. Base de conocimiento

| Módulo | Contenido | Dueño propuesto en SKY | Actualización |
|---|---|---|---|
| Precios y rutas | Tarifa «desde» por ruta, mercado, moneda y punto de venta; enlace medible | Marketing digital | Semanal; diaria en campaña |
| Promociones | Condiciones, vigencia, legales por mercado, preguntas esperadas | Marketing | Antes de cada promoción |
| Servicio | Equipaje, check-in, cambios, programa de viajeros, canales oficiales | Experiencia de clientes | Con cada cambio de política |
| Quiebres | Respuestas de contención y ruta de derivación por tipo de caso | Experiencia de clientes | Trimestral |
| Tono | Voz de SKY, saludo y diferencias por mercado; portugués | Marca | Semestral |
| Contingencia | Mensajes de espera aprobados | Comunicaciones | Antes de partir y tras cada evento |
| Temas vetados | Lo que no se responde y por qué | Marketing | Cuando cambie |

Cada entrada lleva: identificador, módulo, mercado, idioma, texto aprobado, fuente, dueño, quién aprobó, vigente
desde, vence el, y enlace. Reglas:

- **Una entrada vencida no se puede usar**, ni por el agente ni por la persona.
- Todo cambio queda registrado con fecha y aprobador; se conserva el historial.
- Un vacío detectado (pregunta sin entrada) se pide a SKY dentro del día hábil y se informa en el reporte semanal.
- **La base es de SKY.** Si el servicio termina, se entrega completa (§23).
- El piloto dejó una primera versión de precios y rutas y la taxonomía de temas.

## 12. Agentes de IA

Dos agentes, cada uno con su ficha de rol según el canon de equipos humano-agente. Ninguno está construido **[por
construir]**.

| Campo | Clasificador | Redactor |
|---|---|---|
| Disparador | Entra un comentario a la bandeja | Un comentario queda clasificado como contestable |
| Tarea | Etiquetar tipo, subtipo, mercado, idioma, ruta, tono y prioridad; separar engagement; alertar P0/P1 | Leer el hilo y el historial, buscar la entrada vigente y proponer la respuesta con su fuente |
| Fuentes | El comentario, la publicación, el hilo | Lo anterior + la base de conocimiento |
| Acciones | `leer` y `etiquetar` (reversible) | `proponer` |
| Autonomía al partir | Etiqueta solo; lo dudoso lo revisa una persona | Ninguna: nunca envía |
| Límites | No oculta, no borra, no responde | Sin precio fuera de la base vigente; sin pedir datos personales; sin compensaciones; quiebres siempre con persona |
| Dueño humano | Líder de servicio | Especialista que aprueba |
| Prueba previa | Muestra etiquetada del piloto y del histórico de SKY | Lote de respuestas revisado por SKY |
| Telemetría | Acierto por etiqueta; alertas perdidas | Borradores aprobados sin cambios; errores detectados en auditoría |
| Retiro | Si pierde un P0/P1 o baja del umbral dos semanas seguidas, se revisa y puede apagarse | Si publica (vía aprobación) un error de precio atribuible al borrador, se suspende ese tipo de consulta |

Etapas antes de producción: prueba fuera de línea con la muestra → operación en sombra (propone, no se usa) →
producción asistida → comparación con la línea base → ampliar, corregir o retirar.

**Subir de tramo** (que el agente responda solo lo frecuente) es decisión de SKY, por tipo de consulta, con evidencia:
al menos cuatro semanas de operación, tasa alta de borradores aprobados sin cambios, cero errores de precio en la
auditoría y aprobación escrita. Quiebres, seguridad y todo P0/P1 no suben nunca. Los umbrales se acuerdan en la
puesta en marcha.

Datos: el proveedor de IA no entrena con datos de SKY; los comentarios son públicos, pero el historial y las
etiquetas se tratan como datos de SKY. Si el agente o su proveedor fallan, se opera a mano con el mismo equipo.

Dónde corren queda abierto: en las automatizaciones propias de la bandeja o como agente de Efeonce conectado a la
bandeja y a la base. La segunda da control sobre taxonomía y citas, y depende de que la bandeja lo permita. **La
elección de bandeja y la de agentes son una sola decisión**, y el canon asigna el diseño de agentes a RevOps & CRM.

## 13. Herramientas

| Capa | Para qué | Estado |
|---|---|---|
| Bandeja unificada | Recibir, etiquetar, asignar, responder, medir tiempos | Por elegir. El piloto usó Sprout Social; febrero la comparó con Statusbrew. Capacidades y precios por verificar |
| Base de conocimiento | Fuente única de lo que se responde | En el piloto, Notion; se mantiene y se formaliza |
| Agentes | Clasificar y proponer | Por construir |
| Canal de traspaso | Entregar quiebres a Experiencia de clientes | Por acordar con SKY (§14) |
| Alertas | P0/P1 y umbrales | Bandeja + teléfono de guardia |
| Informes | Semanal, mensual, campaña, contingencia | Efeonce Insights para el mensual **[por construir la fuente]**; ver §17 |
| Monitoreo de marca | — | YouScan sigue siendo de SKY; no la operamos |

Requisitos de la bandeja: las 13 cuentas en una vista, con comentarios en anuncios de Meta y X si entran al alcance;
etiquetas, asignación, estados y temporizador; colas separadas para no pisarse con la agencia de community; ocultar
comentarios; respuestas guardadas; registro de auditoría; conexión para agentes y exportación de datos; usuarios
nominales con doble factor. No se elige sin una prueba con las cuentas reales. Quién compra la licencia (SKY o
Efeonce) queda abierto; el canon de pricing la trata como costo de plataforma, separado del fee.

## 14. Traspasos

| Hacia | Qué se entrega | Acuerdo necesario |
|---|---|---|
| Experiencia de clientes de SKY (DM) | Comentario, usuario, mercado, tema, urgencia y lo ya dicho en público | Quién recibe, por qué canal, en qué horario y en cuánto toma el caso |
| Agencia de community | Engagement mal clasificado; dudas de frontera | Regla de frontera y sincronía semanal de 15 minutos |
| Comunicaciones y Legal de SKY | P0/P1 con evidencia | Contactos con teléfono y suplentes |
| Marketing digital y squad creativo | Fricciones repetidas por pieza, ruta o promoción | Espacio en la reunión semanal |
| Ventas (grupos, corporativo) | Consultas comerciales que no son de pasajero | Casilla o formulario de destino |

Conciliación semanal de traspasos: cuántos se derivaron, cuántos tomó SKY, cuántos volvieron a los comentarios. Si el
DM no toma los casos, el reclamo rebota en público y el servicio se ve mal sin que sea nuestro: por eso este acuerdo
es condición de inicio.

Evolución posible, fuera de esta propuesta: que la derivación cree el caso en el sistema de atención de SKY.

## 15. Gobierno y RACI

Cadencias: diaria interna · semanal con SKY (30 min) · mensual (lectura de negocio y calidad) · trimestral
(calibración, tiempos, tramo de los agentes, alcance) · después de cada campaña y contingencia.

| Actividad | Efeonce | SKY Marketing | SKY Exp. de clientes | SKY Comunicaciones |
|---|---|---|---|---|
| Clasificar y responder | R/A | I | — | — |
| Aprobar base y respuestas tipo | R | A | C | C |
| Mantener precios y promociones al día | C | R/A | — | — |
| Resolver casos derivados | I | I | R/A | — |
| Declarar y cerrar contingencia | C | I | C | R/A |
| Subir el tramo de un agente | R | A | C | — |
| Informes | R/A | I | I | I |
| Cambios de alcance, horario o cuentas | R | A | C | — |

R: ejecuta · A: decide · C: se consulta · I: se informa. Ningún cambio de alcance, horario, cuentas o autoridad del
agente ocurre por conversación: se acuerda por escrito.

## 16. Indicadores

Objetivos iniciales **[hipótesis]**; se fijan con la línea base de las primeras cuatro semanas.

| Grupo | Indicador | Cómo se calcula | Objetivo inicial |
|---|---|---|---|
| Volumen | Comentarios clasificados | Total que entra a la bandeja | — (contexto) |
| Volumen | Conversaciones atendidas | Comentarios iniciales contestables con primera respuesta | Dentro del tramo |
| Volumen | Respuestas por conversación | Respuestas públicas ÷ conversaciones | Se mide; referencia 1,5 |
| Volumen | No contestables | Por motivo, sobre el total de lo nuestro | Se informa |
| Oportunidad | Tiempo de primera respuesta | Mediana y percentil 90, por ventana y prioridad | Tabla §6 |
| Oportunidad | Cumplimiento del tiempo | Conversaciones dentro del objetivo ÷ total | ≥ 90 % |
| Oportunidad | Tiempo de respuesta a réplica | Mediana y percentil 90 | Tabla §6 |
| Oportunidad | Pendientes al cierre | Conversaciones sin primera respuesta al cerrar la ventana | 0 o justificadas |
| Oportunidad | Aviso de P0/P1 | Tiempo entre el comentario y el aviso a SKY | Tabla §6 |
| Calidad | Nota de calidad | Promedio de la pauta sobre la muestra | ≥ 90 % |
| Calidad | Errores públicos | Respuestas corregidas o eliminadas ÷ respuestas | < 0,5 % |
| Calidad | Errores de precio | Respuestas con dato de precio incorrecto | 0 |
| Calidad | Cobertura de la base | Consultas con entrada vigente ÷ consultas | ≥ 95 % |
| Calidad | Entradas vencidas en uso | Usos de una entrada vencida | 0 |
| Derivación | Traspasos | Quiebres derivados a DM | Se informa |
| Derivación | Traspasos tomados | Tomados por SKY ÷ derivados | Lo fija SKY |
| Derivación | Reaperturas | Conversaciones que vuelven por falta de atención ÷ derivadas | Bajar mes a mes |
| Negocio | Clics en enlaces medibles | Clics en los enlaces de las respuestas de precio | Se mide |
| Negocio | Ventas atribuidas | Sólo con el seguimiento que SKY acuerde | Lo define SKY |
| Conversación | Temas | Volumen por subtipo, ruta, promoción y mercado | Se informa |
| Conversación | Tono | Distribución por tipo y campaña | Se informa |
| Conversación | Fricciones recurrentes | Temas que se repiten con su causa probable | 3 a 5 por mes, con recomendación |
| Agentes | Acierto de clasificación | Etiquetas correctas ÷ muestra revisada | Umbral acordado |
| Agentes | Alertas perdidas | P0/P1 no detectados por el agente | 0 |
| Agentes | Borradores aprobados sin cambios | Sobre los borradores propuestos | Se mide; define el tramo |
| Operación | Tiempo humano por conversación | Minutos de especialista ÷ conversaciones | Se mide; referencia 5 min |
| Derivación | CES (esfuerzo en el traspaso) | Respuestas «fácil» o «muy fácil» ÷ respuestas, escala 1 a 5 | Línea base el primer trimestre |

Reglas: toda cifra lleva período, denominador y fuente. Una métrica sin dato se informa como «sin dato», nunca como
cero. Las ventas no se atribuyen sin un método de seguimiento acordado con SKY.

### Encuesta de esfuerzo en los traspasos (CES) — 2026-10-10

Decisión de Julio (10/10/2026): **sólo CES**. La encuesta de satisfacción con la atención (CSAT) se descartó: el
servicio responde en público y no atiende mensajes directos, así que no tiene dónde ocurrir de forma natural. Lo que
resolvemos en público (precio y dudas generales) se mide con hechos: tiempo, calidad, clics y reaperturas. La
satisfacción con el caso la mide SKY, que es quien lo resuelve.

- **CES** — «¿Fue fácil llegar al canal correcto?», escala 1 a 5. Se pregunta después del traspaso de un reclamo, con
  un único mensaje directo coordinado con el equipo de SKY que atiende los mensajes. Mide la parte que controlamos (el
  paso del comentario al canal correcto). Se informa el porcentaje que respondió fácil o muy fácil.

Reglas: un solo mensaje por traspaso; cada cifra con su tasa de respuesta y su número de respuestas; sin meta el primer
trimestre (línea base) y después se fija con datos. Entra a Efeonce Insights por mercado, red y tema.

**[por verificar]** el envío depende de la bandeja y de las reglas de mensajería de cada red; se prueba en la
preparación y sólo aplica donde la red lo permite. **[pregunta para Jaime]** si SKY ya mide esfuerzo o satisfacción en
su centro de contacto, usar la misma escala. Las cifras del prototipo de Insights (71 %, 92 respuestas de 318
traspasos) son de ejemplo.

## 17. Reportería

| Informe | Cadencia | Para quién | Contenido | Formato |
|---|---|---|---|---|
| Parte de contingencia | Diario, sólo en campañas grandes e imprevistos | Marketing digital y Comunicaciones | Volumen, tiempos, temas del día, casos sensibles | Mensaje breve |
| Informe operativo | Semanal | Marketing; Experiencia de clientes en copia | Indicadores de volumen, oportunidad y derivación; vacíos de la base; conciliación de traspasos | Página breve |
| **Edición mensual** | Mensual | Jefaturas y gerencia de Marketing | Los 27 indicadores con su tendencia, fricciones con recomendación, calidad, agentes, limitaciones | **Efeonce Insights** |
| Informe de campaña | 3 días después de cada campaña | Marketing | Lo ocurrido contra lo esperado y qué cambiar | Página breve |
| Revisión de contingencia | 3 días hábiles después | Comunicaciones y Marketing | Cronología, decisiones, aprendizajes | Documento |
| Revisión trimestral | Trimestral | Sponsor del servicio | Tiempos, calidad, alcance, tramo de los agentes | Reunión + edición de Insights |

### La edición mensual en Efeonce Insights

> **Decisión de Julio (10/10/2026):** Insights se extiende con el módulo Social care y toda la reportería del
> servicio va ahí: edición breve semanal, edición completa mensual, edición por campaña y edición trimestral. El
> parte diario de contingencia (campañas e imprevistos) sigue por mensaje, sobre los mismos datos; el reporte horario se eliminó. La
> propuesta ya lo muestra (láminas 26 a 32) con un prototipo de cifras de ejemplo. Sigue pendiente abrir la tarea de
> producto con fecha: la puerta de inicio de la lámina 35 compromete «Insights midiendo Social care».

Qué es hoy **[verificado en la skill y el ledger de Insights]**: una capacidad de Greenhouse que, por organización y
período, produce una edición versionada e inmutable; entrega informe A4 en PDF, deck en PDF y una versión web
compartible con enlace que vence; una persona de Efeonce revisa y emite cada edición (no se emite sola); las cifras
nunca se inventan y lo que falta se declara como límite. Efeonce ya generó ediciones internas de Insights para la
cuenta SKY (SEO/AEO, 26/09/2026, según el ledger del programa); si SKY ya las recibe como cliente está **por
confirmar** y no se afirma en la propuesta.

Qué falta **[por construir]**: Insights toma sus cifras de módulos dueños de la métrica (hoy SEO, AEO y entrega
creativa). **No existe un módulo de social care**, así que para esta edición hay que:

1. guardar las conversaciones, tiempos y etiquetas de la bandeja en una fuente gobernada;
2. construir el lector de métricas de social care y su adaptador para Insights;
3. definir las páginas de la edición con las plantillas ya publicadas.

Es trabajo de producto de Efeonce, con su propia tarea y sus pruebas. **Hasta que exista, el informe mensual se
entrega como en el piloto** (página con los mismos indicadores), y no se promete a SKY una fecha de Insights que no
esté respaldada por esa tarea.

Contenido propuesto de la edición: portada con el período · lo esencial del mes en tres hallazgos · volumen y reparto
por tipo, mercado y canal · tiempos contra objetivo · calidad y errores · traspasos y reaperturas · fricciones por
ruta y promoción con recomendación · desempeño de los agentes · limitaciones y datos faltantes.

## 18. Calidad

Pauta de evaluación (100 puntos):

| Criterio | Peso | Qué mira |
|---|---|---|
| Exactitud | 35 | El dato coincide con la base vigente; el enlace es el del mercado |
| Cumplimiento de reglas | 25 | No pide datos, no promete, no discute, respeta temas vetados y el seguimiento único |
| Derivación correcta | 20 | Lo que era quiebre se derivó; lo que no, se resolvió en público |
| Tono | 15 | Voz de SKY, idioma y variante del mercado, ortografía |
| Registro | 5 | Etiquetas, estado y evidencia completos |

Muestreo: 100 % de las respuestas a quiebres el primer mes; después, 10 % semanal de todo, con peso extra en
quiebres y en la persona más nueva. Sesión mensual de calibración con SKY sobre casos reales.

Errores públicos por gravedad:

| Gravedad | Ejemplo | Qué se hace |
|---|---|---|
| Alta | Precio incorrecto, promesa indebida, dato personal expuesto por nosotros | Corregir o eliminar en el acto, responder de nuevo, avisar a SKY el mismo día, registrar causa y medida |
| Media | Enlace de otro mercado, derivación omitida | Corregir, registrar, revisar en la reunión semanal |
| Baja | Ortografía, saludo | Corregir y registrar |

## 19. Riesgos y controles

| Riesgo | Control |
|---|---|
| Precio equivocado en público | Entradas con vencimiento; el agente sólo propone; auditoría semanal; protocolo de error |
| Respuesta doble o contradictoria con la agencia de community | Colas separadas o una bandeja común; regla de frontera; sincronía semanal |
| El DM no toma el caso y el reclamo rebota | Acuerdo de traspaso como condición de inicio; conciliación semanal |
| Contingencia fuera de horario | Guardia por alerta; mensajes de espera aprobados; modo contingencia |
| Datos personales expuestos en comentarios | Ocultar y derivar; nunca pedirlos en público |
| Cuentas falsas que «ayudan» a pasajeros | Detección por el clasificador; ocultar o reportar según la política de SKY |
| Ausencia de una persona | Tres personas entrenadas; respaldo nombrado |
| Caída de la herramienta o del agente | Operación manual documentada; aviso a SKY |
| Vencimiento de accesos o permisos | Inventario de accesos; revisión mensual |
| Promoción con condiciones distintas por mercado | Módulo de promociones con legales por mercado, aprobado antes de publicar |
| El volumen real supera el tramo | Tramo acordado; aviso al 80 %; revisión trimestral; nada se absorbe en silencio |
| El agente se degrada con el tiempo | Telemetría semanal; criterio de retiro |
| La base queda desactualizada | Dueño y vencimiento por entrada; vacíos informados cada semana |

## 20. Seguridad, privacidad y cumplimiento

> **Prioridad marcada por Julio (10/10/2026):** SKY delega en Efeonce tratamiento de datos personales. SKY es el
> **responsable** y Efeonce el **encargado**; la bandeja y el proveedor de IA son **subencargados** que se declaran.
> Marco por mercado: Chile, Ley 21.719 (en plena vigencia desde el 01/12/2026, antes del inicio de la operación)
> **[verificado en la referencia legal interna, as-of 2026-07]**; Perú, Ley 29733 y su reglamento vigente desde el
> 31/03/2025 **[ídem]**; Brasil, LGPD (Lei 13.709/2018); Argentina, Ley 25.326; Uruguay, Ley 18.331 **[sin verificar
> en nuestra referencia, que no cubre esos tres países]**. Hace falta contrato de encargo antes de partir, y revisar
> transferencias internacionales si la bandeja o la IA procesan fuera de cada país. Todo esto es orientación: lo
> valida un abogado.

- **Accesos:** por rol de socio en las plataformas, nunca contraseñas compartidas; usuarios nominales, doble factor,
  mínimo privilegio; baja en 24 horas cuando alguien sale; inventario revisado cada mes.
- **Sin acceso a sistemas de SKY:** la operación no necesita reservas, datos de pasajeros ni sistemas internos.
- **Datos personales:** los comentarios pueden traerlos. Se define con SKY qué se guarda, por cuánto tiempo y dónde;
  no se copian fuera de la bandeja salvo lo necesario para el traspaso.
- **IA:** el proveedor no entrena con datos de SKY; se registra qué modelo y qué versión propuso cada borrador.
- **Trazabilidad:** quién aprobó cada respuesta, con qué entrada de la base y a qué hora.
- **Incidente de seguridad:** aviso a SKY dentro del plazo que fije el contrato, con contención y revisión.
- **Contrato:** Efeonce actuaría por encargo de SKY sobre datos personales de pasajeros de cinco países; el contrato
  necesita su cláusula de tratamiento de datos. **Revisión legal pendiente** (Chile, Perú, Argentina, Brasil y
  Uruguay): esto es orientación, no asesoría legal.

## 21. Continuidad

| Escenario | Respuesta | Aviso a SKY |
|---|---|---|
| Falta una persona | Respaldo o líder cubren el turno; refuerzo si dura más de tres días | Sólo si afecta la cobertura |
| Cae la bandeja | Respuesta directa en las plataformas con registro manual; se concilia al volver | En el acto |
| Cae el agente o su proveedor | Operación manual; los tiempos se relajan mientras dure | En el acto |
| Cae una plataforma social | Se espera; se informa el período excluido de la medición | En el informe |
| Se pierde un acceso | Cuenta de respaldo con rol equivalente; solicitud a SKY | En el acto |
| Pico no previsto | Refuerzo; priorización P1/P2; si triplica el promedio, modo contingencia | En el acto |
| Sale un especialista | Refuerzo ya entrenado pasa a respaldo; selección inmediata | Dentro de la semana |

Los procedimientos manuales se ensayan en la semana 6 de la puesta en marcha y una vez por semestre.

## 22. Puesta en marcha

Seis semanas, con una puerta antes de operar.

| Semana | Trabajo | Entregable | Responsable |
|---|---|---|---|
| 1 | Acuerdos: alcance, cobertura, contactos, traspasos, herramienta, calendario comercial | Acta de operación firmada | Cuenta + SKY Marketing |
| 2 | Accesos, bandeja, etiquetas, colas, alertas | Las 13 cuentas en una vista; inventario de accesos | Operación de agentes + SKY |
| 3 | Base de conocimiento v1 y respuestas por tipo, con portugués | Base aprobada por SKY | Especialista + dueños en SKY |
| 4 | Agentes: fichas y prueba con la muestra etiquetada; entrenamiento del equipo | Resultados de la prueba; equipo certificado | Operación de agentes + líder |
| 5 | Operación en sombra: el equipo responde, el agente propone sin usarse, se mide todo | Línea base de tiempos, respuestas por conversación y reparto por tipo | Equipo completo |
| 6 | Calibración con SKY; ensayo de contingencia y de operación manual | Decisión de partir | Líder + SKY |

**Puerta de inicio:** accesos completos · base aprobada · contactos de crisis y de traspaso confirmados · equipo
certificado · prueba de los agentes superada · operación manual ensayada · tablero de indicadores funcionando.

Primeros 90 días: estabilizar (1–30), optimizar (31–60) y primera revisión trimestral (61–90). Los tiempos pasan de
objetivo a compromiso al día 30, con la línea base de cuatro semanas (alineado el 10/10/2026 con §6 y con la
propuesta); en la revisión del día 90 se decide si algún tipo de consulta sube de tramo.

**Actualización del mismo día:** la fecha de inicio la decide SKY, así que la propuesta ya no muestra calendario; sólo dice «seis semanas de preparación, en 2027». Las fechas de abajo quedan como referencia interna.

**Calendario (decisión de Julio, 10/10/2026):** el servicio entra al presupuesto 2027, así que en 2026 no se opera ni
se cobra. La preparación parte el lunes 4 de enero de 2027 y la operación, el lunes 15 de febrero de 2027. Entre el
1 de enero y el 15 de febrero nadie responde, salvo que SKY mantenga sus respuestas automáticas: hay que pedírselo.
Para partir la preparación el 4 de enero, las dos personas deben estar seleccionadas en diciembre de 2026, por cuenta
y riesgo de Efeonce.

Dependencias internas de Efeonce: contratar o asignar dos especialistas · elegir bandeja · construir los agentes ·
construir la fuente de social care para Insights.

## 23. Salida y transición

- La base de conocimiento, la taxonomía, las respuestas tipo y el historial de conversaciones son de SKY.
- Al terminar, Efeonce entrega todo en formato abierto, revoca sus accesos y acompaña la transición durante el plazo
  de aviso que fije el contrato.
- Si la licencia de la bandeja es de SKY, la operación sigue sin migrar datos; si es de Efeonce, se exporta.
- Los agentes son configuración de Efeonce; lo que se entrega es su especificación (taxonomía, reglas, pruebas).

## 24. Objeciones previsibles y respuesta

### Marketing

| Objeción | Respuesta |
|---|---|
| «Es caro para responder comentarios» | No se paga por comentario: se paga una operación con cobertura, calidad y reporte. Para responder 1.300 hay que leer hasta 14.000. Hay tres niveles de cobertura para ajustar la inversión |
| «¿Cómo sé que vende?» | Con clics en enlaces medibles desde el primer día. Las ventas se atribuyen sólo con el seguimiento que SKY acuerde; no se promete una cifra |
| «El volumen bajó a 818» | El conteo bajó porque la plataforma nueva no incluye X ni anuncios. El servicio se arma por tramos: si el volumen real es menor, se contrata el tramo menor |
| «¿Y si el volumen se dispara?» | Aviso al 80 % del tramo, refuerzo de campaña y revisión trimestral. Nada se absorbe ni se cobra en silencio |
| «Ya tenemos una agencia en redes» | Esa agencia atiende el engagement. Estos tres tipos necesitan base de precios, tiempos y derivación; el piloto ya los operó. Efeonce además diseña las piezas de SKY, así que la fricción vuelve al equipo que puede corregirla |
| «¿Por qué no lo hacemos interno?» | Se puede: requiere dos personas, respaldo, herramienta, base y supervisión. La propuesta entrega eso funcionando en seis semanas y medido |

### Experiencia de clientes

| Objeción | Respuesta |
|---|---|
| «Van a prometer cosas que no podemos cumplir» | Las respuestas a quiebres son de contención y están aprobadas por ustedes. No se dan plazos, causas ni compensaciones |
| «Nos van a llenar el DM» | Sólo se deriva lo que es un caso. Se informa cada semana cuánto se derivó, por qué tema y cuánto se tomó |
| «¿Quién resuelve?» | SKY. Efeonce no accede a reservas ni datos del pasajero |
| «¿Y las respuestas automáticas que dejamos?» | Hay que decidir si siguen en 2027; si siguen, se coordinan para que una persona no reciba dos respuestas |

### Legal y cumplimiento

| Objeción | Respuesta |
|---|---|
| «¿Qué datos personales tratan?» | Los que el público escribe en comentarios. No se piden datos; si aparecen, se ocultan y se deriva. Retención y cláusula de tratamiento se definen en el contrato |
| «¿La IA usa nuestros datos?» | El proveedor no entrena con ellos. Queda registro de qué propuso el agente y quién lo aprobó |
| «¿Quién responde por un error público?» | Hay un protocolo: corrección inmediata, aviso el mismo día y registro de causa. La responsabilidad contractual la define el contrato |
| «Promociones con legales distintos por país» | Cada promoción entra a la base con sus condiciones por mercado, aprobadas antes de publicarse |

### TI y ciberseguridad

| Objeción | Respuesta |
|---|---|
| «¿Qué accesos necesitan?» | Rol de socio en las cuentas sociales y usuarios en la bandeja. Ningún sistema interno de SKY |
| «¿Cómo controlan los accesos?» | Usuarios nominales, doble factor, mínimo privilegio, baja en 24 horas e inventario mensual |
| «¿Dónde quedan los datos?» | En la bandeja y en la base. Se define con SKY la región y la retención cuando se elija la herramienta |
| «¿Qué pasa si los vulneran?» | Aviso dentro del plazo contractual, contención, revocación de accesos y revisión |

### Compras y Finanzas

| Objeción | Respuesta |
|---|---|
| «¿Por qué no un call center?» | Un call center resuelve casos. Esto es respuesta pública de marca con base de precios y lectura para Marketing; el caso lo sigue resolviendo SKY |
| «¿Qué pasa si no cumplen los tiempos?» | Se informan mediana y percentil 90 cada semana. Los objetivos se vuelven compromiso tras cuatro semanas medidas; las consecuencias las fija el contrato |
| «¿Quedamos amarrados?» | No: la base, la taxonomía y el historial son de SKY y se entregan en formato abierto (§23) |
| «¿Qué incluye el precio y qué no?» | Fee por tramo de conversaciones; puesta en marcha, refuerzo de campaña y licencia van en líneas separadas |

### Gerencia

| Objeción | Respuesta |
|---|---|
| «¿Y si hay una crisis?» | Modo contingencia acordado antes de partir: mensajes aprobados, una ruta de derivación y parte diario. La decisión es siempre de SKY |
| «¿Y si la IA responde algo incorrecto?» | El agente no responde: propone. Una persona aprueba cada respuesta. Darle autonomía es decisión de SKY, por tipo de consulta y con evidencia |
| «¿Cuánto demora partir?» | Seis semanas de preparación, con una semana de operación en sombra y una puerta de inicio |
| «¿Qué prueba hay?» | El piloto de mayo y junio: 96 comentarios de precio resueltos en un Cyber, taxonomía, respuestas tipo y base de precios. Lo que el piloto no midió (tiempos) se mide desde el día uno |

## 25. Preguntas para Jaime

1. ¿Los comentarios en anuncios (pauta oscura) y en X entran al alcance?
2. ¿Cómo se reparten los 1.300 entre precio, generales y quiebres? Y confirmar que cuentan comentarios iniciales, sin
   réplicas (lectura de Julio).
3. ¿Qué cobertura espera: horario hábil, tardes y fines de semana, o más?
4. ¿Quién recibe los reclamos en DM, por qué canal y en qué horario?
5. ¿Desde qué herramienta responde hoy la agencia de community, y puede compartir bandeja o colas?
6. ¿Las respuestas automáticas que Experiencia de clientes deja hasta fin de 2026 siguen en 2027?
7. ¿Cuál es la fuente vigente de tarifas y promociones por mercado?
8. ¿Puede la preparación ocurrir en diciembre de 2026 para partir en enero?
9. ¿Qué temas no se responden (como el descuento con un banco y el canje de millas en el piloto)?
10. ¿Cuáles son las campañas grandes de 2027 y sus fechas?
11. ¿SKY ya mide esfuerzo (CES) o satisfacción en su centro de contacto? ¿Con qué escala y pregunta? (para usar la
    misma en la encuesta de esfuerzo de los traspasos).

## 26. Decisiones de Julio antes de poner precio

- Nivel de cobertura a ofrecer como base (recomendado: Extendida) y si los otros van como opción.
- Si la propuesta parte con los agentes en «proponer» (recomendado) o compromete autonomía desde el inicio.
- Qué bandeja se usa y quién compra la licencia.
- De dónde salen las personas: contratación nueva o reasignación, y con qué plazo.
- Quién opera los agentes dentro de Efeonce.
- Si se abre la tarea de la fuente de social care para Insights y con qué fecha, o si el informe mensual parte en el
  formato del piloto.

## 27. Revisión de coherencia de la propuesta (2026-10-10)

Pasada completa sobre las 59 láminas del canvas. Corregido: aperturas de capítulo del anexo (listan sólo lo que viene
en el anexo); mapa de Insights a 28 indicadores con satisfacción; encuesta de satisfacción reencuadrada como mensaje
directo posterior a la respuesta pública (antes contradecía «no atendemos mensajes directos»); MCP y API con el mismo
encuadre que el resto de Insights (en producción; social care se suma con la operación); «Cyber SKY» unificado;
«14.350» en el encargo; prototipo sin la exclusión de X y con 418 encuestas (402 ya era el volumen de la semana 3).
Resuelto después por instrucción de Julio (mismo día): todo el deck habla de «SKY» en tercera persona (sin tuteo, salvo
los ejemplos de respuesta al pasajero); «reclamos» en todas partes, con una sola mención de que SKY los llama
«quiebres»; el piloto se fecha «mayo y junio de 2026», que es lo que respaldan los informes semanales (abril de 2026
era la fecha de la propuesta del piloto). Después se eliminó la encuesta de satisfacción (CSAT) y quedó sólo la de
esfuerzo (CES): 27 indicadores en ocho grupos. Pendiente: precio y opciones de cobertura.

## 28. Delta 10/10/2026 — estructura y precio acordados

Decisión del operador, posterior a las secciones 9 y 10 (que describen el equipo y la cobertura anteriores):

- **Equipo:** un especialista dedicado (100 %), líder de servicio al 20 % como respaldo formal, y un especialista que
  mantiene los agentes al 10 %. Sin segundo especialista, sin analista (Efeonce Insights calcula de los datos) y sin
  línea de cuenta propia.
- **Cobertura base:** lunes a viernes de 09:00 a 18:00; respuesta en 2 a 4 horas hábiles; tope de 1.300
  conversaciones al mes. Fuera de horario, primer bloque hábil y alerta automática de lo crítico.
- **Cobertura extendida:** opcional, con agentes autónomos (precio y consultas generales); los reclamos esperan al
  bloque hábil. Sprout no permite responder por API, así que requiere la conexión directa a cada red que el operador
  va a construir.
- **Plataforma:** un asiento de Sprout Social Advanced al inicio; después, bandeja propia.
- **Precio:** CLP 4.990.000 más IVA al mes, todo incluido; puesta en marcha bonificada; extendida + CLP 1.290.000 al
  mes; refuerzo de campaña CLP 1.250.000 por semana. Detalle y supuestos en `pricing/README.md`.
- El deck (versión 84 del canvas) ya refleja esta estructura.
