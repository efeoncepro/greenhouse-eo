# Operar el Scoring IA de Assessments

> **Tipo de documento:** Manual de uso / runbook operador
> **Version:** 1.0
> **Creado:** 2026-08-16 por Claude (TASK-1734)
> **Ultima actualizacion:** 2026-08-16 por Claude
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
- La UI de workbench es un follow-up: hoy la revisión se opera **por API**.

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

## Problemas comunes

- **"El confirm devuelve 409/422"** — hay excepciones o muestra sin cerrar, o un digest quedó stale
  (cambió rúbrica/modelo/policy): el run requiere nueva propuesta/revisión, no un reintento.
- **"No se crean runs"** — el enqueue está OFF o el scheduler `ops-assessment-ai-drain` está pausado
  (estado esperado hoy). Verifica flags en la revisión ACTIVA del ops-worker, no en `deploy.sh`.

## Referencias técnicas

Runbook de rollout: `docs/operations/runbooks/assessment-ai-scoring-rollout.md` · ADR
`docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md` · código
`src/lib/hiring/assessment/ai/scoring-run/` · flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`.
