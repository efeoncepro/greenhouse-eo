/**
 * TASK-1697 — Re-export shim. Los helpers de parseo HTML viven en
 * `@/lib/growth/site-substrate` (`html.ts`, movido con `git mv`). Cero lógica propia.
 */

export {
  extractJsonLdBlocks,
  flattenJsonLdNodes,
  jsonLdTypes,
  analyzeDomSemantics,
  assessHtmlObservability,
  type DomSemanticsSnapshot,
  type HtmlObservabilityAssessment
} from '@/lib/growth/site-substrate'
