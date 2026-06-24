/**
 * TASK-1226 — Growth AI Visibility Grader · Brand fixtures (Slice 5).
 *
 * Marcas para el smoke/eval low-volume (promovidas de brand-set.v1.json de
 * TASK-1228). Incluye el sujeto (Efeonce) + una marca neutra (proxy enterprise,
 * sin exponer cliente Globe real — data posture confidential del ADR). El golden
 * set de findings (golden-set.v1.json) lo promueve TASK-1227 a evals/.
 */

import { type GrowthAiVisibilityExecutionMode, type GrowthAiVisibilityRunKind } from '../contracts'

export interface GraderBrandFixture {
  id: string
  role: 'subject' | 'neutral_control'
  brandName: string
  websiteUrl: string | null
  market: string
  locale: string
  category: string
  competitorsDeclared: string[]
}

export const GROWTH_AI_VISIBILITY_BRAND_FIXTURES: GraderBrandFixture[] = [
  {
    id: 'subject_efeonce',
    role: 'subject',
    brandName: 'Efeonce',
    websiteUrl: 'https://efeoncepro.com',
    market: 'Chile',
    locale: 'es-CL',
    category: 'marketing y diseño',
    competitorsDeclared: ['Cebra']
  },
  {
    // Control neutro fuera de nicho (no debería aparecer en prompts de agencia).
    id: 'neutral_control',
    role: 'neutral_control',
    brandName: 'Banco de Chile',
    websiteUrl: 'https://www.bancochile.cl',
    market: 'Chile',
    locale: 'es-CL',
    category: 'marketing y diseño',
    competitorsDeclared: []
  }
]

export const GROWTH_AI_VISIBILITY_SMOKE_MODE: GrowthAiVisibilityExecutionMode = 'light'
export const GROWTH_AI_VISIBILITY_SMOKE_RUN_KIND: GrowthAiVisibilityRunKind = 'smoke'
