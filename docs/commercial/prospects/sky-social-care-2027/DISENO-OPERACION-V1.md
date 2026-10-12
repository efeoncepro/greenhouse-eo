# SKY — Atención de comentarios en redes 2027: diseño de la operación (V1)

> **Estado:** borrador de diseño para revisión de Julio Reyes. **Corte:** 10/10/2026.
> **No es** una cotización, un SOW ni un compromiso con SKY. El precio se calcula después de aprobar este diseño.
> **Fuentes:** correo de Jaime Herrera del 09/10/2026 («RE: Piloto comentarios Efeonce»), informes semanales del
> piloto (mayo–junio 2026), caso de negocio del piloto, propuesta de febrero 2026 y el canon de servicio
> ([Social Media Operating Model](../../../services/creative-services/EFEONCE_SOCIAL_MEDIA_OPERATING_MODEL_V1.md),
> [equipos humano-agente](../../../services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md)).
> Contexto comercial: [README del expediente](README.md).

Cada cifra lleva su origen: **[SKY]** dato del correo de Jaime · **[piloto]** medido en el piloto ·
**[hipótesis]** supuesto de este diseño, por validar.

## 1. Mandato

Efeonce es la **primera línea pública** de SKY en los comentarios de sus 13 cuentas: lee y clasifica todo lo que
entra, responde tres tipos de comentario, deriva lo que no le corresponde y devuelve a Marketing lo que la
conversación enseña.

| Dentro | Fuera |
|---|---|
| Clasificar todos los comentarios públicos de las 13 cuentas | Engagement (campañas, concursos, dinámicas): BBDO **[SKY]** |
| Responder precio y destinos, consultas generales y quiebres | Resolver el caso del pasajero: lo hace personal de SKY por DM **[SKY]** |
| Derivar quiebres a DM con registro del traspaso | Atender mensajes directos |
| Detectar y escalar riesgos (P0/P1) | Vocería institucional, decisiones legales o de compensación |
| Informe semanal y lectura mensual de fricciones | Publicar contenido, pauta o listening general |

Por confirmar con SKY: si los comentarios en **anuncios (pauta oscura)** y en **X** entran al alcance. La base de
1.300 que pidió Jaime viene del período en que ambos se contaban **[SKY]**.

## 2. Demanda

| Variable | Valor | Origen |
|---|---|---|
| Cuentas | 13: Facebook e Instagram de Chile, Perú, Brasil, Argentina y Uruguay; TikTok, LinkedIn y X transversales | [SKY] |
| Comentarios totales por mes, jul-25 a abr-26 | promedio 14.354; máximo 25.238 (ago-25); mínimo 6.602 (dic-25) | [SKY] |
| Comentarios totales por mes, may-26 a ago-26 | promedio 4.831 (otra plataforma: sin X ni pauta oscura; suma LinkedIn) | [SKY] |
| Engagement | más del 80 % del mes | [SKY] |
| Precio + generales + quiebres | 1.300–1.500/mes antes de mayo; 818/mes desde mayo | [SKY] |
| Base para dimensionar | **1.300 respuestas/mes** (≈ 43 por día calendario) | [SKY] |
| Canal | Instagram primero, luego Facebook; TikTok, LinkedIn y X muy bajos | [SKY] |
| Mercado | Chile primero; Perú y Argentina parecidos; Brasil y Uruguay 100–200 comentarios/mes | [SKY] |
| Concentración en campaña | 60 % del volumen de seis días llegó en dos (Cyber de junio) | [piloto] |
| Horario | parte del volumen entra después de las 19:00 | [piloto] |
| Tema principal en campaña | queja por precio o promoción, 42,7 %; cotización, 33,3 % | [piloto] |
| Reparto de los 1.300 entre los tres tipos | **desconocido**: hay que pedirlo | — |
| Día pico | 170–260 respuestas (4 a 6 veces el promedio) | [hipótesis] |
| Tiempo por respuesta | 4 min manual (estimado en el piloto, nunca medido); 2,5 min con borrador del agente | [hipótesis] |

Dos consecuencias de diseño:

1. **Se clasifica todo para responder una parte.** Para responder 1.300 hay que leer entre 4.800 y 14.000
   comentarios al mes, y hasta 25.000 en el mes más alto. Esa lectura no puede ser humana: es el trabajo del agente.
2. **Hay dos tipos de pico.** La campaña comercial es previsible (calendario). La contingencia operacional
   (cancelaciones, clima, paro, incidente) no lo es y sube los quiebres sin aviso. La operación necesita un modo
   para cada una.

## 3. Flujo

```text
Entra el comentario (13 cuentas, una bandeja)
  → Clasificar   tipo · mercado · idioma · ruta · tono · prioridad · ¿contestable?
  → Enrutar      engagement → BBDO | precio, generales, quiebres → Efeonce | P0/P1 → alerta
  → Responder    borrador del agente desde la base → una persona aprueba y envía
  → Derivar      quiebres: respuesta pública de contención + invitación a DM + registro del traspaso
  → Cerrar       estado, tiempo de primera respuesta, evidencia
  → Aprender     lo nuevo actualiza la base; las fricciones van al informe
```

### Qué se hace con cada tipo

| Tipo | Respuesta | Termina en | No se hace |
|---|---|---|---|
| Precio y destinos | Tarifa vigente «desde» por ruta, mercado y moneda, con enlace medible; si es queja por promoción, se explica la condición (fecha, disponibilidad) | La persona cotiza en skyairline.com | Dar un precio que no esté vigente en la base; prometer disponibilidad |
| Consultas generales | Respuesta aprobada de la base (equipaje, check-in, servicios, programa) | Duda resuelta a la vista | Interpretar políticas; improvisar |
| Quiebres y reclamos | Contención breve, sin discutir, e invitación a DM | Personal de SKY toma el caso | Pedir datos personales en público; ofrecer compensación; resolver |
| No contestable | Se registra con motivo (sin contexto, insulto, spam, concurso) | Informe | — |
| Suplantación o estafa | Se oculta o reporta según la política de SKY y se alerta | SKY | Responder al estafador |

Reglas transversales: un solo seguimiento por persona, y si insiste pasa a DM; un comentario con datos personales
(código de reserva, documento, teléfono) se oculta y se deriva; nada se responde fuera de lo aprobado.

### La unidad es la conversación, no la respuesta

Los 1.300 que pide Jaime son comentarios **a contestar**, pero un comentario no se cierra con una respuesta.
**Lectura de Julio (10/10/2026):** esa cifra cuenta comentarios iniciales y no incluye las réplicas, así que 1.300
comentarios equivalen a 1.300 conversaciones. Es el supuesto de trabajo; se confirma con Jaime en una línea. Cada uno
abre una conversación con un antes y un después, y eso es lo que se dimensiona, se mide y se contrata.

| Momento | Qué pasa | Trabajo |
|---|---|---|
| Antes | Hay que entender a qué publicación y promoción responde, leer el hilo y lo que ya se dijo, ver si la persona ya escribió antes y buscar el dato vigente en la base | Lectura, clasificación, verificación |
| Respuesta | El agente propone, una persona aprueba y envía; si es quiebre, se registra el traspaso | Redacción, aprobación, registro |
| Después | La persona replica; otras personas se suman al hilo con la misma duda o el mismo reclamo; el caso derivado puede no ser tomado y volver a los comentarios; el hilo puede crecer y subir de prioridad | Seguimiento, segunda respuesta, re-derivación, alerta |
| Cierre | Estado final, evidencia y, si apareció algo nuevo, actualización de la base | Registro y aprendizaje |

Reglas del hilo:

- **Una conversación** = el comentario inicial de una persona y todo lo que esa persona escribe en ese hilo, hasta
  cerrarla. Cada réplica no cuenta como una conversación nueva.
- **Ventana de seguimiento:** el hilo se vigila 72 horas después de la última respuesta **[hipótesis]**; lo que llegue
  después abre otra conversación.
- **Un solo seguimiento público por persona.** A la segunda réplica, la conversación pasa a DM.
- **Varias personas con la misma duda en un hilo:** una respuesta visible para todas; respuesta individual sólo a
  quien trae un caso distinto.
- **Reapertura:** si alguien vuelve a los comentarios porque no lo atendieron por DM, la conversación se reabre, se
  re-deriva con urgencia y entra a la conciliación semanal con Experiencia de clientes. No es una conversación nueva.
- **Hilo que crece** (muchas personas o tono que sube): alerta y cambio de prioridad.

Lo que hace el agente en esta parte: lee el hilo completo y el historial de la persona antes de proponer, agrupa los
comentarios repetidos y avisa cuando un hilo crece.

Supuestos para dimensionar, **todos por medir en la semana de operación en sombra**:

| Tipo | Respuestas públicas por conversación [hipótesis] | Tiempo por conversación con borrador del agente [hipótesis] |
|---|---|---|
| Precio y destinos | 1,4 | 4 min |
| Consultas generales | 1,3 | 3 min |
| Quiebres y reclamos | 1,8 (contención, seguimiento y traspaso) | 8 min |

Con un reparto supuesto de 50 % precio, 25 % generales y 25 % quiebres, 1.300 conversaciones son unas 1.950
respuestas públicas y unos 325 traspasos al mes, a ≈ 5 minutos por conversación (≈ 8 si se opera a mano). El reparto
real hay que pedírselo a Jaime; el piloto no midió ni réplicas por comentario ni tiempos.

### Prioridades

Siguen la escala del canon de servicio (§9 del Operating Model).

| Nivel | Qué es | Qué pasa |
|---|---|---|
| P0 | Seguridad, accidente, fraude masivo, filtración de datos, autoridad, viralidad extrema | No se responde sin SKY. Alerta inmediata a los contactos de crisis |
| P1 | Reclamo con tracción (prensa, creador, muchas reacciones), acusación de estafa sobre una pieza con pauta | Alerta al líder; respuesta aprobada |
| P2 | Quiebre individual; consulta de precio durante una campaña | Cola prioritaria |
| P3 | Consulta general o de precio en día normal | Cola normal |

## 4. Cobertura y modos de operación

Hora de Chile. Lima va una o dos horas antes; Buenos Aires, Montevideo y São Paulo, igual o una hora después.

### Ventanas (nivel recomendado: «Extendida»)

| Ventana | Horario | Quién | Objetivo de primera respuesta [hipótesis] |
|---|---|---|---|
| Núcleo | Lun–vie 09:00–19:00 | Titular + líder | P1: 30 min · P2: 1 h · P3: 2 h |
| Extendida | Lun–vie 19:00–22:00; sáb, dom y feriados 10:00–20:00 | Respaldo, en bloques | P1: 1 h · P2 y P3: 4 h |
| Guardia | 22:00–09:00 | Agente clasifica; guardia humana sólo por alerta | P0/P1: aviso a SKY en 30 min; el resto, primer bloque del día |

Los tiempos son objetivos de diseño. Se vuelven compromiso sólo después de medirlos en las primeras cuatro semanas.

### Niveles de cobertura que SKY puede elegir

| Nivel | Ventana con personas | Para qué alcanza | Riesgo |
|---|---|---|---|
| A · Hábil | Lun–vie 09:00–19:00 | Operación diaria | Tardes y fines de semana quedan para el día hábil siguiente; un reclamo de sábado espera hasta el lunes |
| **B · Extendida** | A + tardes hasta las 22:00 + fines de semana y feriados en bloques | Lo que mostró el piloto: volumen después de las 19:00 y campañas que cruzan el fin de semana | Madrugada sólo con guardia por alerta |
| C · Continua | Todos los días 07:00–23:00 con persona conectada | Marca con atención casi permanente | Tres personas para un volumen que no las ocupa; se justifica sólo si SKY lo exige |

### Tres modos

| Modo | Cuándo | Qué cambia |
|---|---|---|
| Normal | Todo el año | Ventanas y tiempos de la tabla |
| Campaña | Las campañas grandes (Travel Sale, Cyber Sky, Black Friday) y lanzamientos de ruta, según calendario | Preparación una semana antes (respuestas por promoción, base al día); dos personas conectadas; ventana 08:00–23:00; tiempos más cortos; informe de fricciones al cierre |
| Contingencia | Cancelaciones masivas, clima, paro, incidente, crisis reputacional. Lo activa SKY o un umbral de volumen o de tono | Mensaje de espera aprobado por SKY; los quiebres van a una sola ruta de derivación; se pausan las respuestas comerciales en las piezas afectadas; reporte de situación cada hora al contacto de SKY; revisión posterior |

El modo contingencia necesita, antes de partir: contactos de crisis de SKY con teléfono, mensajes de espera
aprobados y la regla de quién declara y quién cierra la contingencia.

## 5. Equipo

Dimensionado para 1.300 conversaciones al mes en cobertura Extendida.

| Rol | Qué hace | Dedicación [hipótesis] |
|---|---|---|
| Especialista titular | Aprueba y envía respuestas, deriva, mantiene la base día a día | 100 % |
| Especialista de respaldo | Tardes, fines de semana y feriados; reemplaza al titular | 75 % |
| Líder de servicio y calidad | Revisa muestras, calibra, decide excepciones, firma el informe; guardia P0/P1 | 15–20 % |
| Responsable de cuenta | Único interlocutor de SKY; alcance, riesgos y revisiones | 5–10 % |
| Operación de agentes y base de conocimiento | Fichas de los agentes, evaluación, incidentes, estructura de la base | Intensivo en la puesta en marcha; 10 % en régimen |
| Analista | Lectura mensual de fricciones por ruta, promoción y mercado | 5–10 % |
| Refuerzo de campaña | Una persona entrenada más por ventana de campaña | Por evento |

Condiciones de robustez:

- **Tres personas con acceso y entrenamiento** en todo momento (titular, respaldo, líder). La ausencia de una no
  detiene la operación.
- **Portugués:** el agente redacta y lo revisa una persona con dominio del idioma. Con 100–200 comentarios al mes en
  Brasil y Uruguay no se justifica una persona dedicada.
- **Personas por contratar o asignar.** Estos roles no están cubiertos hoy. El plazo de selección y entrenamiento
  condiciona la fecha de inicio.
- **El squad creativo de SKY ya está en Efeonce.** Las fricciones que salgan de los comentarios (copy que confunde,
  promoción mal entendida) llegan directo al equipo que diseña las piezas.

### Cómo cambia con el volumen

| Conversaciones al mes | Respuestas públicas [hipótesis] | Trabajo estimado al mes [hipótesis] | Equipo en cobertura Extendida |
|---|---|---|---|
| 818 | ≈ 1.230 | ≈ 138 h | Titular 100 % + respaldo 50 % |
| 1.300 | ≈ 1.950 | ≈ 178 h | Titular 100 % + respaldo 75 % |
| 1.500 | ≈ 2.250 | ≈ 195 h | Dos especialistas a tiempo completo |

Trabajo = conversaciones × 5 min + 70 h fijas (revisión de lo que el agente no clasifica con certeza, base de
conocimiento, calidad, informe, coordinación, calibración y conciliación de traspasos). Una persona rinde unas 120 a
130 horas de trabajo efectivo al mes. Si el agente falla y se opera a mano (8 min), 1.300 conversaciones piden
≈ 243 h: el equipo de 1,75 personas lo cubre justo, y por eso existe el refuerzo de campaña.

La primera versión de este diseño contaba 2,5 minutos por respuesta y una respuesta por comentario: subestimaba el
trabajo a la mitad. **La cobertura sigue moviendo al equipo más que el volumen**, pero el volumen pesa más de lo que
parecía: de 818 a 1.500 conversaciones hay medio especialista de diferencia.

## 6. Base de conocimiento

Es lo que permite responder precio sin improvisar. Sin ella no hay operación.

| Módulo | Contenido | Dueño en SKY | Actualización |
|---|---|---|---|
| Precios y rutas | Tarifa «desde» por ruta, mercado, moneda y punto de venta; enlace medible | Marketing digital | Semanal; diaria en campaña |
| Promociones | Condiciones, vigencia, legales por mercado, preguntas esperadas | Marketing | Antes de cada promoción |
| Servicio | Equipaje, check-in, cambios, programa de viajeros, canales oficiales | Experiencia de clientes | Cuando cambie la política |
| Quiebres | Respuestas de contención y ruta de derivación por tipo de caso | Experiencia de clientes | Trimestral |
| Tono | Voz de SKY, saludo y diferencias por mercado; portugués | Marca | Semestral |
| Contingencia | Mensajes de espera aprobados | Comunicaciones | Antes de partir y tras cada evento |

Reglas: cada entrada tiene dueño, fecha de vigencia y vencimiento; **una entrada vencida no se puede usar** (ni el
agente ni la persona); todo cambio queda registrado con quién lo aprobó. El piloto dejó una primera versión de
precios y rutas y la taxonomía de temas.

## 7. Agentes de IA

Dos agentes, cada uno con su ficha de rol (canon de equipos humano-agente).

| | Clasificador | Redactor |
|---|---|---|
| Trabajo | Etiqueta cada comentario: tipo, mercado, idioma, ruta, tono, prioridad | Propone la respuesta desde la base, citando la entrada que usó |
| Autoridad al partir | Lee y etiqueta (reversible) | Propone; **nunca envía** |
| Quién responde por él | Líder de servicio | Especialista que aprueba |
| Prueba antes de producción | Muestra etiquetada del piloto y del histórico de SKY | Lote de respuestas revisado por SKY |
| Límites | No oculta ni borra | Sin precio fuera de la base vigente; sin pedir datos personales; sin compensaciones; quiebres siempre con persona |

**Subir de tramo** (que el agente responda solo lo frecuente) es una decisión de SKY, por tipo de consulta, y sólo
con evidencia: al menos cuatro semanas de operación, una tasa alta de borradores aprobados sin cambios, cero errores
de precio en la auditoría y aprobación escrita. Los umbrales se acuerdan en la puesta en marcha. Quiebres, temas de
seguridad y todo P0/P1 no suben nunca.

Si el agente o su proveedor fallan, la operación sigue a mano con el mismo equipo; se avisa a SKY y los tiempos de
respuesta se relajan mientras dure.

## 8. Herramientas

Requisitos de la bandeja, antes de elegir marca:

- las 13 cuentas en una sola vista, incluidos comentarios en anuncios de Meta y, si entra al alcance, X;
- etiquetas, asignación, estados y temporizador de primera respuesta;
- forma de **no pisarse con BBDO**: o BBDO trabaja en la misma bandeja con sus etiquetas, o hay reglas de ruteo que
  separan las colas;
- respuestas guardadas, ocultar comentarios, registro de auditoría;
- conexión para el agente (API o webhooks) y exportación de datos;
- usuarios nominales con doble factor.

Candidatas conocidas: Sprout Social (usada en el piloto) y Statusbrew (comparadas en la propuesta de febrero).
**Capacidades y precios por verificar a la fecha**; no elegir sin una prueba con las cuentas reales. YouScan sigue
siendo la plataforma de monitoreo de SKY; hay que confirmar desde dónde responde hoy BBDO.

Quién compra la licencia (SKY o Efeonce) queda abierto. El canon de pricing la trata como costo de plataforma,
separado del fee.

## 9. Traspasos

| Hacia | Qué se entrega | Acuerdo necesario |
|---|---|---|
| Experiencia de clientes de SKY (DM) | Comentario, usuario, mercado, tema, urgencia y lo ya dicho en público | Quién recibe, por qué canal, en qué horario y en cuánto toma el caso. Sin esto, el reclamo vuelve a los comentarios |
| BBDO | Engagement mal clasificado; dudas de frontera | Regla de frontera (un concurso con pregunta de precio es de Efeonce) y sincronía semanal de 15 minutos |
| Comunicaciones y Legal de SKY | P0/P1 con evidencia | Contactos con teléfono y suplentes |
| Marketing digital de SKY y squad creativo | Fricciones repetidas por pieza, ruta o promoción | Espacio en la reunión semanal |
| Ventas (grupos, corporativo) | Consultas comerciales que no son de pasajero | Casilla o formulario de destino |

Evolución posible, fuera de esta propuesta: que la derivación cree el caso directamente en el sistema de atención de
SKY en vez de invitar a DM.

## 10. Gobierno

- **Diario (interno):** cola, pendientes, cambios de la base.
- **Semanal con SKY (30 min):** informe, fricciones, cambios de promociones, derivaciones sin tomar.
- **Mensual:** lectura de negocio y de calidad; ajustes de alcance.
- **Trimestral:** calibración, revisión de tiempos, decisión sobre el tramo de los agentes.
- **Después de cada contingencia:** revisión y ajuste del protocolo.

Control de cambios: alcance, horario, cuentas o autoridad del agente no cambian por conversación; cambian por
acuerdo escrito.

## 11. Calidad

- Revisión del 100 % de las respuestas a quiebres el primer mes; después, muestra semanal del 10 % de todas.
- Pauta de evaluación: exactitud, tono, cumplimiento de reglas y derivación correcta.
- **Protocolo de error público:** si se publica un dato equivocado, se corrige o elimina, se responde de nuevo, se
  avisa a SKY si fue de precio y se registra la causa.
- Sesión mensual de calibración con SKY sobre casos reales.

## 12. Métricas

| Plano | Indicadores |
|---|---|
| Operación | Comentarios clasificados; conversaciones atendidas, respuestas públicas, traspasos y reaperturas; respuestas por conversación; tiempo de primera respuesta y de respuesta a una réplica (mediana y percentil 90) por ventana; pendientes al cierre del día |
| Calidad | Nota de la pauta; errores públicos; derivaciones sin tomar; reclamos que vuelven |
| Conversación | Temas, tono y fricciones por ruta, promoción y mercado |
| Negocio | Clics en enlaces medibles; ventas atribuidas sólo con el seguimiento que SKY acuerde |
| Agentes | Acierto de la clasificación; borradores aprobados sin cambios; tiempo humano por respuesta |

En el piloto no se midió el tiempo de primera respuesta. Se mide desde el primer día.

## 13. Riesgos y controles

| Riesgo | Control |
|---|---|
| Precio equivocado en público | Entradas con vencimiento; el agente sólo propone; auditoría semanal; protocolo de error |
| Respuesta doble o contradictoria con BBDO | Una bandeja o ruteo por etiquetas; regla de frontera; sincronía semanal |
| El DM no toma el caso y el reclamo rebota | Acuerdo de traspaso con Experiencia de clientes; conciliación semanal de derivaciones |
| Contingencia fuera de horario | Guardia por alerta; mensajes de espera aprobados; modo contingencia |
| Datos personales expuestos en comentarios | Ocultar y derivar; nunca pedirlos en público |
| Cuentas falsas que «ayudan» a pasajeros | Detección por el clasificador; ocultar o reportar según la política de SKY |
| Ausencia de una persona | Tres personas entrenadas; respaldo nombrado |
| Caída de la herramienta o del agente | Operación manual documentada; aviso a SKY |
| Vencimiento de accesos o permisos | Inventario de accesos; revisión mensual |
| Promoción con condiciones distintas por mercado | Módulo de promociones con legales por mercado, aprobado antes de publicar |
| El volumen real supera la base | Tramo acordado; revisión trimestral; nada se absorbe en silencio |

## 14. Seguridad y datos

Accesos por rol de socio en las plataformas, nunca contraseñas compartidas; usuarios nominales, doble factor y baja
en 24 horas al salir alguien. Los comentarios pueden traer datos personales: se define con SKY qué se guarda, por
cuánto tiempo y dónde. El proveedor de IA no entrena con datos de SKY. Efeonce actuaría por encargo de SKY sobre
datos personales de pasajeros de cinco países, así que el contrato necesita su cláusula de tratamiento de datos.
**Revisión legal pendiente** (Chile, Perú, Argentina, Brasil y Uruguay): esto es orientación, no asesoría legal.

## 15. Puesta en marcha

Seis semanas, con una puerta antes de operar.

| Semana | Trabajo | Resultado |
|---|---|---|
| 1 | Acuerdos: alcance, cobertura, contactos, traspasos, herramienta | Acta de operación firmada |
| 2 | Accesos, bandeja, etiquetas, ruteo con BBDO | Las 13 cuentas en una vista |
| 3 | Base de conocimiento v1 y respuestas por tipo, con portugués | Base aprobada por SKY |
| 4 | Agentes: fichas y prueba con la muestra etiquetada | Resultados de la prueba |
| 5 | Operación en sombra: el equipo responde, se mide todo | Línea base de tiempos |
| 6 | Calibración con SKY y ensayo de contingencia | Decisión de partir |

**Puerta de inicio:** accesos completos, base aprobada, contactos de crisis y de traspaso confirmados, equipo
entrenado, prueba de los agentes superada, operación manual de respaldo ensayada.

Primeros 90 días: estabilizar (1–30), optimizar (31–60) y primera revisión trimestral (61–90), donde se confirman
los tiempos de respuesta y se decide si algún tipo de consulta sube de tramo.

Si la operación parte el lunes 4 de enero de 2027, la puesta en marcha empieza el 23 de noviembre de 2026 y la
selección de personas, antes. Jaime dijo que en 2026 no operan nada en esta línea: hay que confirmar si la
preparación puede ocurrir en diciembre.

## 16. Lo que hay que preguntarle a Jaime

1. ¿Los comentarios en anuncios (pauta oscura) y en X entran al alcance?
2. ¿Cómo se reparten los 1.300 entre precio, generales y quiebres? Y confirmar que cuentan comentarios iniciales, sin réplicas (lectura de Julio).
3. ¿Qué cobertura espera: horario hábil, tardes y fines de semana, o más?
4. ¿Quién recibe los reclamos en DM, por qué canal y en qué horario?
5. ¿Desde qué herramienta responde hoy BBDO, y puede compartir bandeja o ruteo?
6. ¿Las respuestas automáticas que Experiencia de clientes deja hasta fin de 2026 siguen en 2027?
7. ¿Cuál es la fuente vigente de tarifas y promociones por mercado?
8. ¿Puede la preparación ocurrir en diciembre de 2026 para partir en enero?

## 17. Decisiones de Julio antes de poner precio

- Nivel de cobertura a ofrecer como base (recomendado: Extendida) y si se ofrecen los otros como opción.
- Si la propuesta parte con los agentes en «proponer» (recomendado) o compromete autonomía desde el inicio.
- Quién compra la licencia de la bandeja.
- De dónde salen las personas: contratación nueva o reasignación, y con qué plazo.
- Quién opera los agentes dentro de Efeonce.
