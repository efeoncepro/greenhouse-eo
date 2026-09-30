/**
 * Builders de las seis láminas nativas del deck SEO/AEO (Search Visibility 360, TASK-1949): un archivo por lámina en
 * `sv360/`; lo compartido (voz, escenario, plataforma, haces, columnas de luz y paleta de las maquetas) vive en
 * `sv360/kit.ts`. Componen cuando AXIS publica cada receta como aprobada (Slice 3 de TASK-1949).
 */

import type { RecipeBuilder } from './deck'
import { contentBrandFamily } from './sv360/content-brand-family'
import { contentCommitteeDeck } from './sv360/content-committee-deck'
import { contentIndustries } from './sv360/content-industries'
import { contentMarkets } from './sv360/content-markets'
import { contentReportFormats } from './sv360/content-report-formats'
import { contentServiceMockups } from './sv360/content-service-mockups'

export const SV360_BUILDERS: Record<string, RecipeBuilder> = {
  'content-brand-family': contentBrandFamily,
  'content-service-mockups': contentServiceMockups,
  'content-report-formats': contentReportFormats,
  'content-committee-deck': contentCommitteeDeck,
  'content-industries': contentIndustries,
  'content-markets': contentMarkets
}
