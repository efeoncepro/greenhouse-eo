# Calificar el gold set de referencia (scoring IA de assessments)

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-08-17 por Claude (TASK-1734)
> **Documentacion funcional:** [scoring-ia-de-assessments.md](../../documentation/hr/scoring-ia-de-assessments.md)
> **Rúbrica de anclaje:** [gold-set-rubrica-de-anclaje.md](../../documentation/hr/gold-set-rubrica-de-anclaje.md)

## Para qué sirve (en simple)

Antes de dejar que la IA corrija respuestas a escala, hay que responder una pregunta:
**¿la IA califica dentro del rango en que dos personas competentes difieren entre sí?**

Ese matiz es todo. Si la IA le pone 72 a una respuesta y tú le pones 80, esa diferencia de 8
puntos **no significa nada por sí sola**. Solo cobra sentido comparada con cuánto difieren dos
personas calificando la misma respuesta: si dos evaluadores entrenados se separan típicamente
10 puntos, entonces la IA a 8 está *dentro del ruido humano* y es confiable. Si se separan 3,
la IA a 8 es un problema.

Por eso el gold set necesita **dos calificaciones humanas independientes**: la segunda no es
una aprobación, es el **metro** contra el que se mide la primera y la de la IA.

## Antes de empezar

1. Lee la [rúbrica de anclaje](../../documentation/hr/gold-set-rubrica-de-anclaje.md) completa.
   Está derivada de las rúbricas reales del banco de preguntas, no de teoría.
2. Calibra con los 3 casos de práctica marcados en el instrumento. Compara tu criterio con la
   rúbrica **antes** de empezar la tanda real.
3. Bloquea tiempo sin interrupciones. Calificar en ráfagas dispersas introduce deriva.

## Reglas duras

- **Calificas en ciego.** El instrumento no incluye el puntaje de la IA ni el puntaje humano
  previo — no los busques en el portal antes de calificar. Verlos contamina el metro.
- **No te saltes casos.** Un caso omitido rompe la estratificación de la muestra.
- **No cambies el orden.** El archivo viene aleatorizado a propósito: calificar por competencia
  agrupada genera efecto de arrastre.
- **Anota la razón cuando dudes.** El campo de nota es lo que hace posible la adjudicación
  después; sin él, un desacuerdo es irresoluble.
- **Cada rater trabaja solo.** Si conversan los casos mientras califican, las dos lecturas dejan
  de ser independientes y el metro se rompe.

## Paso a paso

1. Genera el instrumento: `pnpm hiring:ai:gold-set-sample`. Produce dos archivos: el
   **instrumento** (lo que calificas) y una **llave sellada** de estratificación que no debes
   abrir antes de terminar.
2. Cada rater llena su columna (`humanRatingA` o `humanRatingB`) con un entero 0-100 y su nota.
3. Adjudicación: cuando dos ratings difieren más del umbral declarado en la policy, se hace una
   **tercera lectura con la rúbrica en mano** — nunca se promedia a ciegas. El adjudicado se
   escribe en `adjudicatedScore` con su razón.
4. Corre el análisis: `pnpm hiring:ai:promotion-eval`.
5. Corre el gate: `pnpm hiring:ai:promotion-gate`. Te dirá qué ruta detectó y qué habilita.

## Las tres rutas (cuando no tienes dos evaluadores dedicados)

Ninguna de estas rutas es equivalente a la otra. Elige con los ojos abiertos:

| Ruta | Qué es | Qué habilita | Qué NO habilita |
|---|---|---|---|
| **A — Doble rating independiente** | Dos personas entrenadas califican la misma muestra por separado, con adjudicación de los desacuerdos | Todo, incluida la **confirmación en lote** (`HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` + `..._RUN_CONFIRM_ENABLED`) | — |
| **B — Test-retest intra-rater** | La misma persona califica dos veces, con ≥7 días de separación y orden distinto | Detectar **deriva del modelo** entre versiones de prompt; calibrar umbrales del router | El lote ciego. Mide tu consistencia contigo mismo, **no** la varianza entre personas — que es la fuente de desacuerdo más grande |
| **C — Routing binario** | Un solo evaluador responde solo *"¿esta respuesta necesita revisión humana?"* (sí/no), en vez de puntuar | Mejorar el **clasificador de riesgo** con menos supuestos estadísticos | Cualquier confirmación en lote: nunca validó el puntaje, solo la detección |

**Recomendación práctica para Efeonce hoy:** ruta A con un account senior entrenado con la
rúbrica como segundo evaluador. No necesita ser especialista en evaluación: la rúbrica de
anclaje es precisamente lo que permite que dos personas distintas converjan.

## Qué NO puede hacer un agente

Un agente de IA **no puede llenar estas calificaciones**, y el gate lo detecta: si el desacuerdo
humano-humano da exactamente cero, lo marca como implausible. La razón no es de proceso, es de
lógica: si la IA genera el metro contra el que se mide la IA, el resultado siempre sale perfecto
y no significa nada.

## Problemas comunes

- **"El muestreo dice estratos incompletos"**: la base no tiene suficientes respuestas humanas
  calificadas todavía. No lo rellenes con casos de otro estrato — el sesgo resultante es peor
  que la muestra chica. Sigue corrigiendo assessments por el carril uno-a-uno: cada corrección
  tuya alimenta la muestra futura.
- **"Los dos raters difieren mucho en casi todos los casos"**: no es un fracaso, es información.
  Probablemente la rúbrica necesita anclas más específicas en esa competencia. Ajústala y
  recalibra antes de culpar a la IA.
- **"¿Puedo usar los puntajes que ya di en el portal?"**: no como rating de gold set. Los diste
  viendo el contexto completo y, en algunos casos, la sugerencia de la IA — no son ciegos.
