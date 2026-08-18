# Scoring IA de Assessments — corrección asistida a escala con revisión humana

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-08-16 por Claude (TASK-1734)
> **Ultima actualizacion:** 2026-08-17 por Claude (cierre del programa — instrumento del gold set y su hallazgo de volumen)
> **Rúbrica del gold set:** [gold-set-rubrica-de-anclaje.md](gold-set-rubrica-de-anclaje.md) · **protocolo:** [calificar-gold-set-de-referencia.md](../../manual-de-uso/hr/calificar-gold-set-de-referencia.md)
> **Documentacion tecnica:** [GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md) (Delta 2026-08-16 (2)) · ADR [GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md](../../architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md)

## Qué hace

Cuando un candidato termina su test, una plantilla real puede dejar diez respuestas abiertas por
corregir; una cohorte de 70 personas produce 700 correcciones manuales. Este sistema hace que la IA
**proponga** un puntaje para cada respuesta abierta de un test recién enviado, de forma automática y en
segundo plano, agrupando todo el test en un **run**: una unidad de trabajo con estado propio que se puede
revisar, confirmar, cancelar o revertir.

La IA nunca decide. Cada propuesta se clasifica por riesgo:

- **Revisión obligatoria** — casos dudosos (respuesta rara, evidencia débil, puntaje cerca del corte):
  un humano los corrige uno a uno.
- **Muestra de calidad (ciega)** — una muestra al azar donde el revisor puntúa **sin ver** la propuesta
  de la IA; sirve para vigilar que la IA no se desvíe.
- **Elegible por lote** — el resto puede confirmarse en conjunto, pero solo después de que la revisión
  obligatoria y la muestra ciega estén cerradas.

La confirmación del lote deja un **manifiesto permanente**: qué propuestas cubrió, qué muestra se revisó,
qué excepciones se resolvieron, quién confirmó y si el revisor vio la propuesta antes de puntuar. Un botón
"aceptar todo" sin esa evidencia no existe.

## Quién ve qué

- **El candidato no ve nada.** Solo ve que su test fue enviado. Nunca ve puntaje, resultado por
  competencia, propuestas de IA, explicaciones, nivel de confianza ni estado de revisión — ni en la
  página del test, ni por correo, ni en ninguna superficie pública o de cliente. Esto está prohibido por
  contrato (con tests que lo verifican) y **no tiene interruptor**: no hay configuración que lo habilite.
- **Solo operadores internos autorizados** (con el permiso de puntuar assessments) ven la cola de
  revisión, las propuestas y el estado del run.

## Desde la pantalla

La revisión ya no se opera solo por API: vive dentro de la ficha del postulante.

- **Dónde está.** En `Personas y equipos → Hiring → la candidatura → pestaña Evaluación`, la tarjeta del
  assessment muestra una fila con el estado del run y cuántas excepciones esperan. Si no hay run, la
  tarjeta se ve exactamente como antes. Si no tienes el permiso de puntuar, la fila no se dibuja.
- **Qué abre.** Un espacio de trabajo (diálogo) con tres zonas: **la cobertura del run arriba**, la
  **cola de revisión** al medio y la **confirmación** abajo.
- **La cobertura no se pierde de vista.** Queda fija mientras recorres la cola: cuántas excepciones
  llevas resueltas, cuántas de la muestra, cuántas devolviste a corrección manual. Es el techo que
  impide dar por cerrado un run que está a medias.
- **La cola viene ordenada por riesgo:** primero lo que exige revisión obligatoria, después la muestra
  de calidad, al final el lote elegible (agrupado y colapsado, porque no pide trabajo).
- **La muestra ciega es ciega de verdad.** En esos items la propuesta de la IA **no llega al navegador**:
  puntúas con tu propio criterio y recién después ves el contraste con lo que había propuesto la IA. No
  es una cortina visual; el dato no está.
- **Mirar la propuesta queda registrado.** En las excepciones obligatorias la propuesta viene plegada
  detrás de "Ver propuesta IA (queda registrado)". Abrirla no está mal — mentir sobre si la abriste sí.
  El sistema anota el hecho para que la evidencia de supervisión sea honesta.
- **Confirmar el run no siempre se puede.** Si falta resolver excepciones, completar la muestra o el
  contenido cambió desde que se puntuó, el botón queda deshabilitado **con la causa escrita al lado**.
  Cancelar el run, en cambio, siempre está disponible: es el camino de vuelta a la corrección manual.
- **Puntaje por criterio.** Cada criterio se muestra como su aporte sobre el máximo posible (`18 / 25`),
  no como una nota suelta: así se ve de inmediato si el aporte fue bueno.

> Detalle técnico: `src/views/greenhouse/hiring/AssessmentAiRunWorkbench.tsx` ·
> [manual del operador](../../manual-de-uso/hr/operar-scoring-ia-assessments.md) ·
> task [TASK-1738](../../tasks/complete/TASK-1738-assessment-ai-review-workbench.md)

## El gate humano

Ningún puntaje propuesto por la IA se vuelve oficial sin confirmación humana. Además, la capacidad
completa está bloqueada por un **gate de promoción**: antes de reducir la revisión humana, Talent debe
producir un set de casos calificados por **dos evaluadores humanos independientes** más adjudicación, y la
IA debe pasar esa vara. Un comando mecánico verifica ese requisito y bloquea la promoción si no se cumple;
ningún agente puede fabricar esas calificaciones.

## El gold set: el instrumento ya existe, faltan datos

Para medir si la IA está a la altura hace falta un **gold set de referencia**: un conjunto de respuestas
reales calificadas por personas, contra el cual comparar. Ese instrumento ya está construido:

- un **muestreo** que elige casos de forma equilibrada por competencia y por banda de desempeño,
  incluyendo casos difíciles a propósito, con una semilla fija para que la muestra sea reproducible.
  Cuando un grupo no tiene suficientes casos, **lo declara en vez de rellenarlo**;
- una **rúbrica de anclaje** con ejemplos concretos de qué es una respuesta buena, regular o mala en cada
  competencia, para que dos personas distintas califiquen parecido;
- un **protocolo de calificación en ciego**, con tres rutas posibles y el alcance honesto de cada una.

**El hallazgo importante:** al correr el muestreo sobre datos reales apareció que la base tiene
**11 respuestas calificadas por personas frente a un piso de 49** que la ruta principal necesita. Es
decir, hoy el gate está bloqueado **por falta de datos, no por falta de personas**. El instrumento se
entrega **vacío**: ningún agente puede llenarlo.

**Qué implica en la práctica:** el modo correcto hoy es el **carril uno a uno** — corregir respuesta por
respuesta con criterio humano —, que además es exactamente lo que produce la materia prima que falta. El
carril por **lote** queda bloqueado hasta que ese volumen exista y la IA pase la vara.

## Estado actual: apagado

El sistema está **completo en código pero apagado en todos los ambientes** (2026-08-16). Los tres
interruptores nuevos están en OFF, el trabajo en segundo plano está pausado, y encenderlo sigue una
secuencia gradual documentada (sombra → canary → promoción) que requiere señal explícita del operador. Si
algo sale mal, existe un procedimiento de reversa que devuelve todo a la cola de corrección manual sin
perder ninguna respuesta.

Además del gate de promoción, encender el carril por lote depende del volumen del gold set descrito
arriba. Mientras tanto la revisión uno a uno es el modo de trabajo, no una limitación temporal molesta:
es la que genera la evidencia para poder confiar en el lote.

> Detalle técnico: ADR [GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md](../../architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) ·
> runbook de rollout [assessment-ai-scoring-rollout.md](../../operations/runbooks/assessment-ai-scoring-rollout.md) ·
> código `src/lib/hiring/assessment/ai/scoring-run/` · manual del operador
> [operar-scoring-ia-assessments.md](../../manual-de-uso/hr/operar-scoring-ia-assessments.md)
