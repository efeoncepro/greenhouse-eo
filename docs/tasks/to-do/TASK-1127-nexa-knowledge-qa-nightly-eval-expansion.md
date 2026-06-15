# TASK-1127 — Nexa Knowledge QA nightly + eval offline ampliado

## Delta 2026-06-15

- **TASK-1134 (complete) destraba lo que esta task necesitaba saber:** el chat ahora manda `modelMode: 'auto'` → con `NEXA_AUTO_ROUTER_ENABLED` ON, las preguntas de conocimiento **sí** enrutan a Claude desde `/api/home/nexa` (antes quedaba clavado en Gemini). La QA nightly puede ejercitar el provider real; el provider/modelo resuelto + failover quedan auditables en el ledger `greenhouse_ai.nexa_turn_telemetry` (TASK-1129) y en la signal `nexa.turn.degraded_outcomes`. — por trabajo en TASK-1134 + TASK-1129.

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Domain: `nexa|knowledge|reliability|dx`

## Por qué existe

Follow-up de TASK-1124. La calidad de respuesta hoy se verifica de dos formas, ambas con huecos:

- `pnpm qa:nexa-knowledge` (QA matrix live) es **on-demand/manual** → una regresión de voz/cita/
  síntesis del **modelo real** (Claude en staging/prod) puede pasar desapercibida hasta que un
  usuario la ve.
- El eval offline de retrieval (`golden-questions.live.test.ts`) cubre correctitud básica, pero
  **no** tiene casos explícitos de *wrong-source* (heading genérico que matchea por ruido) ni de
  *cross-document synthesis* → el rerank y el synthesis brief carecen de regresión sobre datos reales.

## Qué hacer

1. **QA matrix nightly contra staging** (GitHub Actions schedule, con auto-router → Claude). Publica
   resultado (PASS/FAIL por caso) + alerta si baja de umbral. Reusa `scripts/nexa-knowledge-qa-matrix.mjs`.
   Clasificar como `tooling`/`prod_only` per `GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1.md` (no async-critical).
2. **Ampliar golden questions** con casos de:
   - *wrong-source*: pregunta donde el chunk correcto tiene heading específico y un distractor tiene
     heading genérico → assert que el rerank pone el correcto primero.
   - *cross-document synthesis*: pregunta cuya respuesta requiere ≥2 documentos → assert que el packet
     trae ≥2 documentos distintos (diversidad).
3. (Opcional) Métrica de citation-rate / no-source-answer en el nightly para tendencia.

## Aceptación

- Nightly de QA matrix contra staging corriendo + alerta honesta en fallo.
- Golden questions con casos wrong-source + cross-doc verdes (regresión del rerank/brief).

## Referencias

- `docs/architecture/nexa-intelligence/07-knowledge-retrieval-answer-quality.md`.
- QA matrix: `scripts/nexa-knowledge-qa-matrix.mjs`; golden: `src/lib/knowledge/search/golden-questions*.ts`.
- Procedencia: TASK-1124.
