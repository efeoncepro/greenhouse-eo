/**
 * Data honesty + enterprise rubric (TASK-1018 Slice 7).
 *
 * Heurísticas de evidencia para detectar fake-green visual y desvíos enterprise:
 * placeholders, exceso de tokens vacíos (—/0), múltiples botones primarios por
 * header, saturación cromática de chips semánticos y data-capture faltante.
 *
 * Es APOYO al review humano, no un juicio estético absoluto. Warning-first.
 */

import type { Page } from 'playwright'

import { FINDING_CODES } from './failure-taxonomy'
import type { CaptureFinding, EnterpriseRubricVerdict } from './manifest'
import type { CaptureEnterpriseRubricOptions } from './scenario'

const DEFAULT_PLACEHOLDER_TERMS = ['lorem', 'tbd', 'mock', 'fake', 'todo', 'placeholder', 'xxxx']

interface RawRubricIssue {
  code: string
  message: string
  selector?: string
}

export const computeRubricVerdict = (findings: CaptureFinding[]): EnterpriseRubricVerdict => {
  if (findings.some(f => f.severity === 'error')) return 'blocked'
  if (findings.some(f => f.severity === 'warning')) return 'warning'

  return 'pass'
}

export const analyzeEnterpriseRubric = async (
  page: Page,
  options: CaptureEnterpriseRubricOptions
): Promise<CaptureFinding[]> => {
  const severity: CaptureFinding['severity'] = options.failOnViolations ? 'error' : 'warning'

  let raw: RawRubricIssue[]

  try {
    raw = await page.evaluate(
      ({ includeSelector, placeholderTerms, maxPrimary, maxEmptyRatio, expectedRegions }) => {
        const issues: RawRubricIssue[] = []
        const root = (includeSelector ? document.querySelector(includeSelector) : document.body) as HTMLElement | null

        if (!root) return issues

        const text = (root.innerText || '').toLowerCase()

        // 1. Placeholders.
        for (const term of placeholderTerms) {
          if (new RegExp(`\\b${term}\\b`, 'i').test(text)) {
            issues.push({ code: 'enterprise_placeholder_text', message: `Texto placeholder "${term}" visible en la superficie.` })
          }
        }

        // 2. Exceso de tokens vacíos (—/0) en celdas/chips.
        const cells = Array.from(root.querySelectorAll('td, .MuiChip-label'))

        const emptyTokens = cells.filter(c => {
          const t = (c.textContent || '').trim()

          return t === '—' || t === '-' || t === '0' || t === '0,0' || t === '$0' || t === 'N/A'
        })

        if (cells.length >= 8 && emptyTokens.length / cells.length > maxEmptyRatio) {
          issues.push({
            code: 'enterprise_empty_tokens',
            message: `${emptyTokens.length}/${cells.length} celdas/chips son tokens vacíos (—/0/N/A) — posible fake-green sin datos.`
          })
        }

        // 3. Múltiples botones primarios por header.
        const headers = Array.from(root.querySelectorAll('header, .MuiCardHeader-root, [data-capture-header]'))

        for (const header of headers) {
          const primaries = header.querySelectorAll('.MuiButton-contained')

          if (primaries.length > maxPrimary) {
            issues.push({
              code: 'enterprise_multiple_primary_actions',
              message: `Header con ${primaries.length} botones primarios (contained) > ${maxPrimary}. Sólo debe haber 1 acción primaria.`
            })
          }
        }

        // 4. Saturación cromática de chips semánticos.
        const semanticChips = root.querySelectorAll(
          '.MuiChip-colorSuccess, .MuiChip-colorWarning, .MuiChip-colorError, .MuiChip-colorInfo'
        )

        if (semanticChips.length > 12) {
          issues.push({
            code: 'enterprise_color_saturation',
            message: `${semanticChips.length} chips semánticos (success/warning/error/info) visibles — saturación cromática diluye la jerarquía.`
          })
        }

        // 5. data-capture regions declaradas que faltan.
        for (const region of expectedRegions) {
          if (!document.querySelector(`[data-capture="${region}"]`)) {
            issues.push({
              code: 'enterprise_data_capture_missing',
              message: `Región data-capture="${region}" declarada pero ausente en la superficie.`,
              selector: `[data-capture="${region}"]`
            })
          }
        }

        return issues
      },
      {
        includeSelector: options.includeSelector ?? null,
        placeholderTerms: options.placeholderTerms ?? DEFAULT_PLACEHOLDER_TERMS,
        maxPrimary: options.maxPrimaryButtonsPerHeader ?? 1,
        maxEmptyRatio: options.maxEmptyTokensRatio ?? 0.5,
        expectedRegions: options.expectedDataCaptureRegions ?? []
      }
    )
  } catch (err) {
    return [
      {
        severity: 'warning',
        category: 'enterprise',
        code: FINDING_CODES.enterprise_probe_failed,
        message: `Enterprise rubric probe falló: ${err instanceof Error ? err.message : String(err)}`
      }
    ]
  }

  return raw.map(issue => ({
    severity,
    category: 'enterprise' as const,
    code: issue.code,
    message: issue.message,
    selector: issue.selector
  }))
}
