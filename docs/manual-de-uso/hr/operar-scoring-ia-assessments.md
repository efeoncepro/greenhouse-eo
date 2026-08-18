# Operar el Scoring IA de Assessments

> **Tipo de documento:** Manual de uso / runbook operador
> **Version:** 1.2
> **Creado:** 2026-08-16 por Claude (TASK-1734)
> **Ultima actualizacion:** 2026-08-17 por Claude (cierre del programa — uno a uno vs lote y estado real del gold set)
> **Protocolo del gold set:** [calificar-gold-set-de-referencia.md](calificar-gold-set-de-referencia.md) · **rúbrica:** [gold-set-rubrica-de-anclaje.md](../../documentation/hr/gold-set-rubrica-de-anclaje.md)
> **Documentacion tecnica:** [GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md](../../architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md) · funcional [scoring-ia-de-assessments.md](../../documentation/hr/scoring-ia-de-assessments.md)

## Para qué sirve

Revisar y confirmar los runs de scoring IA de un assessment enviado: resolver excepciones una a una,
completar la muestra ciega, confirmar el lote elegible, cancelar un run o revertir todo a la cola manual.

## Antes de empezar

- Necesitas el permiso `hiring.assessment.score` (el mismo que autoriza puntuar assessments).
- **El sistema está apagado hoy** (flags OFF en todos los ambientes, scheduler pausado). Prenderlo NO es
  parte de este manual: sigue el runbook de rollout
  [`docs/operations/runbooks/assessment-ai-scoring-rollout.md`](../../operations/runbooks/assessment-ai-scoring-rollout.md)
  (shadow → canary → promoción, con el gate de eval bloqueante) y requiere señal del operador.
- La revisión tiene **dos carriles equivalentes**: el workbench en pantalla (recomendado, ver la
  sección siguiente) y la API (para automatización, diagnóstico o scripts). Ambos usan los mismos
  comandos gobernados: lo que hagas en uno se ve en el otro.

## Uno a uno vs lote: cuál corresponde hoy

Son dos modos de resolver la cola, y **hoy sólo uno está disponible de verdad**.

| Modo | Qué es | Estado hoy |
|---|---|---|
| **Uno a uno** | Resuelves cada item con tu criterio; en la muestra ciega puntúas antes de ver la propuesta | **Es el modo correcto ahora.** No depende del gate de promoción |
| **Por lote** | Confirmas de una vez el conjunto `batch_eligible`, tras cerrar excepciones y muestra | **Bloqueado** hasta que el gate de promoción pase |

Por qué el lote sigue bloqueado: el gate exige un **gold set** de respuestas reales calificadas por dos
personas independientes. El instrumento para armarlo ya existe (`pnpm hiring:ai:gold-set-sample`, rúbrica
BARS y protocolo en ciego), pero el muestreo real mostró que la base tiene **11 respuestas calificadas
frente a un piso de 49**. O sea: **falta volumen de datos, no faltan personas**.

Consecuencia práctica: **trabajar uno a uno no es un rodeo, es el camino.** Cada item que resuelves con
criterio humano produce exactamente la materia prima que el gate necesita. Si quieres acelerarlo
deliberadamente, sigue el protocolo de
[calificar el gold set de referencia](calificar-gold-set-de-referencia.md).

Un detalle de lectura que cambió el 2026-08-17: **cada criterio se lee como aporte sobre su peso**
(`18 / 25`), no como una nota suelta. Los aportes suman el puntaje global. Antes el router comparaba esos
aportes contra su promedio y marcaba como contradictorias 11 de 14 respuestas reales — justo las buenas —,
lo que dejaba el carril por lote muerto aun cuando estuviera habilitado.

## Revisar desde el workbench (pantalla)

### Dónde está la entrada

`Personas y equipos → Hiring → abre la candidatura → pestaña Evaluación`. En la **tarjeta del
assessment** aparece una fila con el estado del run y el número de excepciones pendientes, con el botón
para abrir la revisión.

Si no la ves, revisa en este orden:

1. **No hay run** para ese assessment (el run nace del evento de submit, y depende del flag
   `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED`). Sin run, la tarjeta se ve como siempre — es correcto.
2. **No tienes el permiso** `hiring.assessment.score`. La fila no se dibuja para quien no puede puntuar.

### Cómo resolver excepciones

El workbench ordena la cola por riesgo: **excepciones obligatorias → muestra ciega → lote elegible**
(este último agrupado y colapsado, porque no pide trabajo).

En cada excepción obligatoria tienes tres salidas:

| Acción | Cuándo usarla |
|---|---|
| **Confirmar propuesta** | El puntaje de la IA es correcto. Solo aparece **con la propuesta desplegada** — no puedes confirmar lo que no miraste. |
| **Corregir con mi puntaje** | La propuesta está desviada: escribes tu puntaje 0–100 y ese es el que vale. |
| **Devolver a manual** | El caso no debería resolverse por este carril. Vuelve a la cola de corrección manual sin perder nada. |

Cada resolución es **terminal-once**: si otra persona resolvió el mismo item mientras trabajabas, verás
el estado recargado en vez de una doble aplicación. No fuerces el reintento.

La **cobertura queda fija arriba** mientras recorres la cola (resueltas / pendientes por carril). Si
aparece el banner de contenido desactualizado, el run ya no corresponde a lo que se puntuó: no se puede
confirmar, pero sí cancelar.

### Qué es la muestra ciega y por qué no ves la propuesta

Un porcentaje de los items se sortea de forma determinística como **muestra de calidad**. En esos items
la propuesta de la IA **no viaja al navegador**: no está escondida por CSS ni detrás de un clic, el dato
simplemente no está en la respuesta del servidor.

Existe para medir si la IA se desvía. Si vieras su propuesta antes de puntuar, tu criterio quedaría
anclado a ella y la medición no valdría nada. Puntúas primero con tu criterio; **al resolver aparece el
contraste** entre tu puntaje y el que había propuesto la IA.

En las excepciones obligatorias sí puedes mirar la propuesta, pero el botón lo dice: **"Ver propuesta IA
(queda registrado)"**. Abrirla no está mal — el sistema solo anota el hecho para que la evidencia de
supervisión sea honesta. Los criterios se leen como aporte sobre su máximo (`18 / 25`), no como notas
sueltas.

### Cómo confirmar el run

El botón de confirmar vive al pie del workbench. Está deshabilitado **con la causa escrita al lado**
mientras falte cualquier gate: excepciones sin resolver, muestra ciega incompleta, items aún puntuándose,
contenido desactualizado, o el flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` en OFF.

Cuando confirmas, los puntajes se aplican por el camino canónico y queda el manifiesto permanente. Es
**irreversible por diseño**: si dudas, resuelve más items o cancela el run.

**Cancelar siempre está disponible**, sin flag: es el camino de vuelta a la corrección manual y ninguna
respuesta se pierde.

## Revisar excepciones y muestra (por API)

```bash
# Estado del run + cola de revisión (items con clase de riesgo, reason codes y evidencia)
GET /api/hiring/assessments/ai/scoring-runs/<runId>
```

El reader devuelve cada item con su clase (`mandatory_review` / `quality_sample` / `batch_eligible`),
razones estables y la propuesta/evidencia — nunca datos de identidad del candidato.

Resolver un item (uno a uno):

```bash
POST /api/hiring/assessments/ai/scoring-runs/<runId>
{ "action": "resolve_item", "runItemId": "...", "resolution": "...",
  "finalScore": 4, "decisionNote": "...", "sawProposalBeforeScoring": false }
```

- `sawProposalBeforeScoring` es obligatorio y honesto: registra si viste la propuesta de la IA antes de
  emitir tu puntaje. En la **muestra ciega** debe ser `false` — puntúa primero, mira después.

## Confirmar el run (lote)

```bash
POST /api/hiring/assessments/ai/scoring-runs/<runId>
{ "action": "confirm_run", "decisionNote": "..." }
```

Solo pasa si: todas las excepciones obligatorias están resueltas, la muestra ciega está completa, los
digests (respuestas/rubrica/modelo/policy) siguen vigentes y el flag `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED`
está ON. La confirmación aplica los scores por el camino canónico y deja el manifiesto append-only. Un
`409`/`422` te dice qué gate falta — no lo fuerces.

## Cancelar / revertir

- Cancelar un run (siempre disponible, sin flag — es camino de rollback):

```bash
POST /api/hiring/assessments/ai/scoring-runs/<runId>
{ "action": "cancel_run", "reasonCode": "..." }
```

- Rollback masivo a la cola manual (drena runs en vuelo, preserva propuestas y auditoría, cero
  respuestas perdidas):

```bash
pnpm hiring:ai:run-rollback            # dry-run (default)
pnpm hiring:ai:run-rollback -- --apply # aplicar
```

- La secuencia completa de reversa es por los **flags nuevos + comandos de run** (confirm OFF → enqueue
  OFF → drain/cancel/reconcile → cola manual). **Nunca** apagues el master `HIRING_ASSESSMENT_AI_ENABLED`
  como rollback: no gatea confirm/reject y ya está ON en producción.

## Qué significan las señales

En `/admin/operations`, módulo hiring: `hiring.assessment_ai.run_backlog_stuck` (runs atascados),
`provider_failure_rate`, `abstention_rate`, `override_delta` (humanos corrigiendo mucho a la IA),
`orphan_reconciliation`. Con flags OFF todas deben estar en `ok` (steady=0).

## Qué no hacer

- No confirmar un run sin haber cerrado excepciones y muestra ciega (el sistema lo bloquea; no lo rodees).
- No puntuar la muestra ciega mirando la propuesta primero (y no mentir en `sawProposalBeforeScoring`).
- No mostrar ni comunicar puntajes/resultados al candidato por ningún canal — prohibido por contrato.
- No prender flags fuera de la secuencia del runbook ni sin el gate de promoción verde
  (`pnpm hiring:ai:promotion-gate`).
- No calificar tú mismo el gold set "para desbloquear el gate" saltándote el protocolo en ciego: un gold
  set contaminado es peor que no tenerlo, porque valida a la IA contra su propia sugerencia.
- No pedirle a un agente que complete calificaciones del gold set. Ninguna. El instrumento se entrega
  vacío a propósito.

## Problemas comunes

- **"El confirm devuelve 409/422"** — hay excepciones o muestra sin cerrar, o un digest quedó stale
  (cambió rúbrica/modelo/policy): el run requiere nueva propuesta/revisión, no un reintento.
- **"No se crean runs"** — el enqueue está OFF o el scheduler `ops-assessment-ai-drain` está pausado
  (estado esperado hoy). Verifica flags en la revisión ACTIVA del ops-worker, no en `deploy.sh`.

## Referencias técnicas

Runbook de rollout: `docs/operations/runbooks/assessment-ai-scoring-rollout.md` · ADR
`docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md` · código
`src/lib/hiring/assessment/ai/scoring-run/` · flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
