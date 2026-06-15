# TASK-1127 — Nexa Knowledge QA nightly + eval offline ampliado

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
