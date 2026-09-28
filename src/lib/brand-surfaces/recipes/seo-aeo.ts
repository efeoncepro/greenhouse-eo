/**
 * Builders de las nueve láminas SEO/AEO del deck (TASK-1934): siete plantillas nuevas, un archivo por lámina en
 * `seo-aeo/`. Las dos propuestas SEO usan los builders de `proposal-service` y `proposal-cinematic`.
 */

import type { RecipeBuilder } from './deck'
import { decisionAiAnswer } from './seo-aeo/decision-ai-answer'
import { decisionAiMarket } from './seo-aeo/decision-ai-market'
import { decisionDiagnosisMap } from './seo-aeo/decision-diagnosis-map'
import { decisionDifference } from './seo-aeo/decision-difference'
import { decisionTrafficToRevenue } from './seo-aeo/decision-traffic-to-revenue'
import { methodEeat } from './seo-aeo/method-eeat'
import { methodSurroundCycle } from './seo-aeo/method-surround-cycle'

export const SEO_AEO_BUILDERS: Record<string, RecipeBuilder> = {
  'decision-ai-answer': decisionAiAnswer,
  'decision-ai-market': decisionAiMarket,
  'method-surround-cycle': methodSurroundCycle,
  'decision-difference': decisionDifference,
  'method-eeat': methodEeat,
  'decision-traffic-to-revenue': decisionTrafficToRevenue,
  'decision-diagnosis-map': decisionDiagnosisMap
}
