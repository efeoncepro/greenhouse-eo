# Desenlace de una Postulación — Cómo Termina el Proceso de una Persona

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-08-22 por Claude (TASK-1765)
> **Ultima actualizacion:** 2026-08-23 por Claude (TASK-1772)
> **Documentacion tecnica:** [ADR del vocabulario](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md) · [Arquitectura Hiring/ATS](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

## Tres preguntas distintas, tres respuestas distintas

El pipeline de Hiring responde tres preguntas que antes se mezclaban en una sola columna:

| Pregunta | Se responde con | Ejemplo |
|---|---|---|
| ¿**Dónde va** esta persona en el proceso? | la **etapa** | «en Entrevista» |
| ¿**Cómo terminó** su proceso? | el **desenlace** | «no quedó, porque el cupo lo tomó otra persona» |
| ¿El registro **se muestra**? | el **archivado** | «esta postulación se retiró de la vista» |

Una postulación puede estar en una etapa sin tener desenlace (su proceso sigue vivo). Lo que **no**
puede pasar es lo contrario: si el recorrido terminó, alguien tiene que haber dicho cómo terminó.

> **Cerrar es decidir.** No existe un cierre sin desenlace.

> **Archivar no es cerrar.** Retirar un registro de la vista no dice nada sobre cómo terminó el
> proceso de esa persona — de hecho, normalmente ni siquiera terminó.

## Los seis desenlaces

| Desenlace | Qué significa | ¿Le llega correo? | ¿Entra al Banco de Talento? |
|---|---|---|---|
| **Selección** | La elegimos | **sí, hoy** — la oferta | no — pasa a ser parte del equipo |
| **Reserva** | La elegimos como respaldo | diseñado; **todavía no sale** | no — hay un compromiso vigente |
| **Sin selección** | Llegó al final y no quedó | diseñado según la causa; **todavía no sale** | **sí — es justo la gente que quieres volver a llamar** |
| **Descarte** | No cumplía para este rol | **sí, hoy** — agradecimiento | no por defecto |
| **Retiro** | La persona **dijo** que se retiraba | acuse de recibo diseñado; **todavía no sale** | según su consentimiento |
| **Sin respuesta** | Dejó de responder y no dijo nada | **ninguno, y es deliberado** | no |

> **Ojo con la columna de correo.** Hoy sólo salen dos: la oferta de «Selección» y el agradecimiento
> de «Descarte». Los otros tres están **diseñados pero sin plantilla**, así que cerrar con esos
> desenlaces **no le escribe nada a la persona**. Si necesitas avisarle, hazlo por fuera hasta que
> existan: «Sin selección» los crea `TASK-1762`, y «Reserva» y «Retiro» esperan su propia task.
> El sistema **no miente por omisión**: registra el cierre igual, simplemente no notifica.

### Las dos distinciones que importan de verdad

**«Sin selección» no es «Descarte».** «Descarte» dice algo *sobre la persona*: no daba para el rol.
«Sin selección» no dice nada sobre ella: llegó al final y el cupo era uno. Confundirlas tiene tres
consecuencias concretas:

- El Banco de Talento se vuelve inútil. La gente que quieres volver a llamar es la que llegó lejos y
  no quedó, no la que no daba el ancho. Si las dos figuran igual, no puedes distinguirlas.
- Sesga a quien lea su historia mañana.
- **Distorsiona el análisis de equidad.** Si cierras una vacante con 33 personas y las marcas a todas
  como descarte, inflas la tasa de rechazo de la cohorte demográfica que estuviera ahí, y el sistema
  reporta un impacto adverso que nunca ocurrió.

**«Sin respuesta» no es «Retiro».** A quien deja de responder, antes había que inventarle un retiro
que nunca declaró o un juicio que nunca hubo. Las dos cosas le atribuyen algo que no pasó. «Sin
respuesta» no atribuye nada — y por eso tampoco manda correo.

## La causa: obligatoria en «Sin selección», prohibida en el resto

Cuando el desenlace es **Sin selección**, el sistema **exige** decir por qué. No es un campo
opcional ni una nota al pie:

| Causa | Qué pasó | ¿Cuenta como proceso concluido? |
|---|---|---|
| **El cupo lo tomó otra persona** | Hubo comparación y elegimos a alguien más | **sí** |
| **Se cerró la búsqueda** | La vacante se cerró antes de terminar | no |
| **Se canceló el proceso** | El proceso se canceló | no |

En los otros cinco desenlaces el sistema **rechaza** la causa. Es a propósito: la causa explica por
qué alguien que llegó al final no quedó, y no tiene sentido en un retiro o en un descarte.

**La causa es una lista cerrada, nunca texto libre.** El motivo es práctico: el embudo de equidad y
el texto del correo cambian según cuál sea. Si fuera texto libre, dos personas escribirían lo mismo
de dos formas distintas y el análisis dejaría de ser reproducible.

> **La vacante nunca es el desenlace de la persona.** Que se cerrara la búsqueda es algo que le pasó
> a la vacante, no a ella. Por eso entra como *causa* y la persona queda como «Sin selección».

## Una pausa no es un cierre

Antes existía «Dejar en espera» como si fuera una forma de terminar. No lo es: la persona sigue
viva en el proceso. Ahora una pausa se registra **moviendo la tarjeta a la columna «Decisión»** y
dejándola ahí. Su proceso no terminó, así que no tiene desenlace.

## Archivar no es cerrar

Archivar un registro (por ejemplo, datos de prueba) es una operación de **mantenimiento del
registro**. Cerrar es declarar cómo terminó el proceso de **una persona**. Son dos cosas distintas y
ahora viven en campos distintos.

Confundirlas tenía una consecuencia invisible y seria: dejaba postulaciones marcadas como «cerradas»
sin ninguna decisión detrás, y eso **congelaba el borrado de los documentos de esa persona en todas
sus postulaciones** — una obligación legal (Ley 21.719) bloqueada sin que nadie se enterara.

## Estado a hoy (2026-08-22): qué ya rige y qué todavía no

Lo que **ya rige**: cerrar exige declarar el desenlace, la causa es obligatoria en «Sin selección», y
existen los seis desenlaces. Eso está activo.

Lo que **todavía no**: la base **aún no impide** por sí sola que exista una postulación marcada como
cerrada sin desenlace. Hoy quedan 33 registros en ese estado —32 son datos de prueba y 1 es un
registro real que sí tiene su decisión, sólo que en una etapa antigua— y se limpian antes de activar
la restricción definitiva. Mientras tanto, el estado real es visible en `/admin/operations` bajo la
señal «Desenlace del pipeline: cierres sin desenlace declarado».

> Detalle técnico: el eje de desenlace vive en `greenhouse_hiring.hiring_application`
> (`decision`, `decision_cause`) y su único escritor es `decideHiringApplication`
> (`src/lib/hiring/decide.ts`). El `CHECK` del invariante `stage='closed'` ⟺ desenlace declarado está
> escrito y **pendiente de aplicar** en `docs/tasks/pending-migrations/`. Ver
> [la arquitectura](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md).

## Qué cuenta como «proceso activo», y qué no

Varias pantallas necesitan saber si una persona **sigue en juego**: el conteo de postulaciones
activas por vacante en el desk, el Banco de Talento (que decide si una persona es buscable), y el
carril que asigna pruebas automáticamente.

La respuesta correcta necesita **dos** de los tres ejes, no uno:

> Una postulación está **en proceso activo** cuando **no tiene desenlace** *y* **no está archivada**.

| ¿Tiene desenlace? | ¿Está archivada? | ¿Cuenta como activa? | Qué pasó de verdad |
|---|---|---|---|
| No | No | **Sí** | la persona está en el pipeline |
| No | **Sí** | No | alguien retiró el registro de la vista, sin cerrar el proceso |
| Sí | No | No | el recorrido terminó |
| Sí | Sí | No | terminó y además se archivó |

### Por qué la etapa NO sirve para esta pregunta

Es tentador preguntar «¿está en la etapa Cerrado?». No sirve, y el motivo es concreto: **archivar
devuelve la postulación a su etapa anterior**. Una postulación archivada vuelve a verse como si
estuviera en «Preseleccionado» o donde estuviera antes — así que preguntando por etapa cuenta como
viva.

Eso tuvo una consecuencia real y medida: **5 personas reales** quedaron marcadas como «en proceso
activo» en el Banco de Talento, y por lo tanto **buscables e invitables**, únicamente por una
postulación que alguien había archivado a propósito.

### Si ves que un conteo de activas bajó

Es lo esperado desde el 2026-08-23. Los conteos dejaron de incluir postulaciones archivadas. **No se
perdió ningún dato**: las postulaciones archivadas siguen ahí, con toda su historia; sólo dejaron de
contarse como procesos vivos. La señal `hiring.data_quality.active_process_predicate_drift` en
`/admin/operations` reporta cuántas son (`archived_gap`).

> Detalle técnico: la definición ejecutable vive en un solo lugar,
> [`src/lib/hiring/active-process.ts`](../../../src/lib/hiring/active-process.ts). Ninguna pantalla
> escribe su propia versión, y un gate de CI (`pnpm hiring:active-process-gate`) rechaza que alguien
> vuelva a hacerlo. Contrato completo en el
> [ADR del vocabulario, §19](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md).
