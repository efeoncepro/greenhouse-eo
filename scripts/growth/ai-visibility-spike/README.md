# AI Visibility Grader — Discovery & Eval Spike harness (TASK-1228)

Harness **throwaway** local/manual. NO es el adapter canónico (ese lo construye
`TASK-1226` en `src/lib/growth/ai-visibility/providers/**`). Sirve para producir
evidencia que calibra el modelo de medición del grader antes de hornearlo.

## Qué hace

Corre el prompt pack borrador (`docs/architecture/growth/ai-visibility/prompt-pack.v1.json`)
contra el golden brand set (`brand-set.v1.json`) en los answer engines disponibles
(OpenAI / Perplexity / Gemini), y captura observaciones bounded para analizar:
discriminación de dimensiones, pesos, varianza run-to-run, costo/run y extracción.

## Requisitos

Keys **solo locales** en `.env.local` (raíz del repo, gitignored), valor crudo:

```
OPENAI_API_KEY=sk-...
PERPLEXITY_API_KEY=pplx-...
GEMINI_API_KEY=AIza...
```

Con **al menos una** key, el harness corre ese provider y salta los demás. Sin
ninguna key, hace dry-run e imprime el plan (exit 0).

Antes de la corrida real: completar las marcas `operatorFill` en `brand-set.v1.json`
(competidores, strong/weak, neutrales) con marcas reales y públicas.

## Uso

```bash
# carga .env.local en la sesión si hace falta
set -a && source .env.local && set +a

# dry-run o run real según keys presentes
node scripts/growth/ai-visibility-spike/run.mjs

# experimento de varianza: cada prompt N veces
N_VARIANCE=3 node scripts/growth/ai-visibility-spike/run.mjs
```

Salida: `./captures/` (gitignored) con el raw por observación + `summary.json`.

## Notas

- Model ids / tool config (`gpt-4.1` + web_search, `sonar`, `gemini-2.5-flash` +
  google_search) pueden requerir verificación contra los docs vigentes de cada
  provider al momento de correr (freshness).
- NO envía PII a los providers; interpola marca/categoría como dato.
- Raw payloads NUNCA se committean (`.gitignore`). Los hallazgos curados van a
  `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` y el golden
  set a `docs/architecture/growth/ai-visibility/golden-set.v1.json`.
