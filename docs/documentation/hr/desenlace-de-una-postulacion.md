# Desenlace de una Postulación — Cómo Termina el Proceso de una Persona

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-08-22 por Claude (TASK-1765)
> **Ultima actualizacion:** 2026-08-22 por Claude (TASK-1765)
> **Documentacion tecnica:** [ADR del vocabulario](../../architecture/GREENHOUSE_HIRING_PIPELINE_STAGE_OUTCOME_VOCABULARY_DECISION_V1.md) · [Arquitectura Hiring/ATS](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md)

## Dos preguntas distintas, dos respuestas distintas

El pipeline de Hiring responde dos preguntas que antes se mezclaban en una sola columna:

| Pregunta | Se responde con | Ejemplo |
|---|---|---|
| ¿**Dónde va** esta persona en el proceso? | la **etapa** | «en Entrevista» |
| ¿**Cómo terminó** su proceso? | el **desenlace** | «no quedó, porque el cupo lo tomó otra persona» |

Una postulación puede estar en una etapa sin tener desenlace (su proceso sigue vivo). Lo que **no**
puede pasar es lo contrario: si el recorrido terminó, alguien tiene que haber dicho cómo terminó.

> **Cerrar es decidir.** No existe un cierre sin desenlace.

## Los seis desenlaces

| Desenlace | Qué significa | ¿Le llega correo? | ¿Entra al Banco de Talento? |
|---|---|---|---|
| **Selección** | La elegimos | sí, la oferta | no — pasa a ser parte del equipo |
| **Reserva** | La elegimos como respaldo | sí | no — hay un compromiso vigente |
| **Sin selección** | Llegó al final y no quedó | sí, según la causa | **sí — es justo la gente que quieres volver a llamar** |
| **Descarte** | No cumplía para este rol | sí, agradecimiento | no por defecto |
| **Retiro** | La persona **dijo** que se retiraba | acuse de recibo | según su consentimiento |
| **Sin respuesta** | Dejó de responder y no dijo nada | **ninguno** | no |

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

> Detalle técnico: el eje de desenlace vive en `greenhouse_hiring.hiring_application`
> (`decision`, `decision_cause`) y su único escritor es `decideHiringApplication`
> (`src/lib/hiring/decide.ts`). El invariante `stage='closed'` ⟺ desenlace declarado se aplica como
> restricción de base de datos. Ver [la arquitectura](../../architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md).
