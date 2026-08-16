# Promotion dataset — formato y reglas (TASK-1734 Slice 3)

> Formato del dataset de eval de **grado promoción** para el scoring IA de assessments
> (ADR `GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`, D2 + Slice 3).
> Lo consume `runPromotionEval` (`../promotion-eval.ts`) y lo audita el gate mecánico
> `scripts/hiring/assessment-ai-promotion-gate.mjs` (`pnpm hiring:ai:promotion-gate`).

## Qué es (y qué no es)

- **Es** la evidencia que justifica promover la revisión por excepción (`batch_eligible`):
  respuestas con **doble rating humano independiente + adjudicación**, estratificadas por
  pregunta/template/banda, con casos adversariales.
- **No es** el baseline de TASK-1361 (`eval-baseline-scoring.v1.json`, 6 casos curados): ese es un
  smoke de provider y **no** sirve como evidencia de promoción.
- El fixture `promotion-dataset.synthetic.v1.json` está marcado `"synthetic": true` y existe SOLO
  para probar el harness. **Jamás promueve**: el gate sale `exit 1` mientras el dataset humano
  real no exista.

## Formato

```jsonc
{
  "_meta": {
    "version": "promotion-dataset.<slug>.vN",
    "synthetic": false,               // true ⇒ el gate BLOQUEA la promoción
    "scale": "0-100",
    "doubleRating": {
      "independent": true,            // A y B ratearon sin verse entre sí ni ver la propuesta IA
      "adjudicated": true,            // discrepancias resueltas por adjudicación humana
      "raterTrainingReference": "docs/..." // material de rater training / gold set (null si pendiente)
    },
    "notes": "procedencia, contrato de anonimización/borrado, propósito aprobado"
  },
  "cases": [
    {
      "id": "unico-por-dataset",
      "questionId": "q-...",              // pregunta exacta (inmutable, SME-approved)
      "templateKey": "tpl-...",           // template exacto
      "templateVersion": "v1",
      "competencyKey": "leadership",
      "competencyName": "Liderazgo",
      "level": "intermedio",
      "questionPrompt": "...",
      "rubric": { "criteria": ["..."] },
      "answerText": "...",                // sintética o real ANONIMIZADA con propósito aprobado
      "caseKind": "standard",             // "standard" | "adversarial"
      "humanRatingA": 82,                 // rater A, independiente
      "humanRatingB": 88,                 // rater B, independiente
      "adjudicatedScore": 85,             // adjudicación humana (NO promedio automático)
      "band": "high"                      // consistente con adjudicatedScore y las fronteras de banda
    }
  ]
}
```

## Reglas duras

1. **Doble rating independiente**: `humanRatingA` y `humanRatingB` los emiten dos raters entrenados
   sin ver el rating del otro ni ninguna propuesta IA. `_meta.doubleRating.independent = true` es
   una declaración auditable, no decorativa. El harness además bloquea si el MAE humano-humano da
   exactamente 0 en todo el dataset (`human_human_agreement_implausible`): dos raters
   independientes sin ningún desacuerdo huele a ratings copiados.
2. **Adjudicación**: cada discrepancia A/B la resuelve una tercera instancia humana
   (`adjudicatedScore`). Promediar automáticamente NO es adjudicar.
3. **Estratificación**: casos `standard` cubren cada estrato `templateKey@templateVersion × band`
   (bandas: `low` [0,40) · `mid` [40,70) · `high` [70,100], fronteras en
   `DEFAULT_AI_RUN_PROMOTION_THRESHOLDS.bandBoundaries`). La banda `mid` contiene la zona
   decision-near de la risk policy — por eso su tolerancia es más estricta.
4. **Casos adversariales** (`caseKind: "adversarial"`): prompt injection, PII embebida (ficticia en
   sintéticos), off-topic, respuesta vacía/mínima, multilingüe/out-of-distribution. Para estos
   casos la **abstención o el ruteo a revisión es el comportamiento deseado**: se reportan aparte
   y NO entran a las métricas headline de acuerdo.
5. **Mínimos por estrato**: los define la **policy aceptada junto con el dataset humano real** —
   la spec prohíbe inventar un N universal. Los defaults de
   `DEFAULT_AI_RUN_PROMOTION_THRESHOLDS.minCasesPerStratum` / `minAdversarialCases` son un piso
   provisional del harness para que el gate sea ejecutable; el valor definitivo lo fija la policy
   con Talent.
6. **Privacidad**: respuestas reales solo anonimizadas, con propósito aprobado, allowlist y
   contrato de retención/borrado (spec §Migration/backfill). Nunca nombre, contacto, CV, etapa,
   decisión ni atributos protegidos. `answerText` sintético se declara en `_meta.notes`.
7. **Versionado**: el dataset es inmutable por versión. Ampliar/corregir casos ⇒ `vN+1`; un
   reporte de eval referencia la versión exacta que corrió.
8. **Protected-group (TASK-1365)**: análisis best-effort solo cuando sea lícito, consentido y
   suficientemente agregado; su ausencia **no bloquea** los gates de promoción (cláusula de
   (no-)dependencia en la spec de TASK-1734).

## Flujo de promoción

1. Talent produce el gold set humano (doble rating + adjudicación + rater training) — trabajo de
   personas con lead time; **ningún agente puede fabricarlo**.
2. `pnpm hiring:ai:promotion-eval -- --dataset <path>` corre el harness con el provider real y
   escribe reporte JSON + markdown en `.eval-reports/hiring-assessment-ai-promotion/`.
3. `pnpm hiring:ai:promotion-gate` lee el reporte más reciente + el dataset: exit 1 si el dataset
   es sintético, falta doble rating/adjudicación, faltan estratos/mínimos o alguna métrica no pasa
   los thresholds (`getAiRunPromotionThresholds()` en `scoring-run/config.ts`).
4. Solo con gate verde + actividades humanas cerradas (canary owner nombrado) se considera
   habilitar `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` (siempre shadow → canary primero).
