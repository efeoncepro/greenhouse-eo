/**
 * Structural enterprise rubric.
 *
 * These heuristics detect evidence that a surface is unfinished, misleading or
 * generic. They support — never replace — the twelve-dimension visual scorecard.
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
  if (findings.some(finding => finding.severity === 'error')) return 'blocked'
  if (findings.some(finding => finding.severity === 'warning')) return 'warning'

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
      ({
        includeSelector,
        placeholderTerms,
        maxPrimary,
        maxEmptyRatio,
        expectedRegions,
        requireSurfaceRecipeMarker,
        maxUniformCards,
        maxNestedSurfaceDepth,
        maxContainedSurfacesInViewport,
        minHeadingScaleRatio
      }) => {
        const issues: RawRubricIssue[] = []
        const root = (includeSelector ? document.querySelector(includeSelector) : document.body) as HTMLElement | null

        if (!root) return issues

        const text = (root.innerText || '').toLowerCase()

        for (const term of placeholderTerms) {
          if (new RegExp(`\\b${term}\\b`, 'i').test(text)) {
            issues.push({
              code: 'enterprise_placeholder_text',
              message: `Texto placeholder \"${term}\" visible en la superficie.`
            })
          }
        }

        const cells = Array.from(root.querySelectorAll('td, .MuiChip-label'))

        const emptyTokens = cells.filter(cell => {
          const token = (cell.textContent || '').trim()

          return token === '—' || token === '-' || token === '0' || token === '0,0' || token === '$0' || token === 'N/A'
        })

        if (cells.length >= 8 && emptyTokens.length / cells.length > maxEmptyRatio) {
          issues.push({
            code: 'enterprise_empty_tokens',
            message: `${emptyTokens.length}/${cells.length} cells/chips are empty tokens; data may look complete when it is not.`
          })
        }

        const headers = Array.from(root.querySelectorAll('header, .MuiCardHeader-root, [data-capture-header]'))

        for (const header of headers) {
          const primaries = header.querySelectorAll('.MuiButton-contained')

          if (primaries.length > maxPrimary) {
            issues.push({
              code: 'enterprise_multiple_primary_actions',
              message: `Header has ${primaries.length} contained primary actions; maximum is ${maxPrimary}.`
            })
          }
        }

        const semanticChips = root.querySelectorAll(
          '.MuiChip-colorSuccess, .MuiChip-colorWarning, .MuiChip-colorError, .MuiChip-colorInfo'
        )

        if (semanticChips.length > 12) {
          issues.push({
            code: 'enterprise_color_saturation',
            message: `${semanticChips.length} semantic chips are visible; color saturation weakens hierarchy.`
          })
        }

        for (const region of expectedRegions) {
          if (!document.querySelector(`[data-capture=\"${region}\"]`)) {
            issues.push({
              code: 'enterprise_data_capture_missing',
              message: `Declared data-capture region \"${region}\" is missing.`,
              selector: `[data-capture=\"${region}\"]`
            })
          }
        }

        if (requireSurfaceRecipeMarker && !root.matches('[data-surface-recipe]') && !root.querySelector('[data-surface-recipe]')) {
          issues.push({
            code: 'enterprise_surface_recipe_missing',
            message: 'Premium surface does not declare data-surface-recipe; canonical composition grammar is not evidenced.'
          })
        }

        const cards = Array.from(
          root.querySelectorAll('.MuiCard-root, [data-ui-surface="contained"]')
        ) as HTMLElement[]

        const geometryCounts = new Map<string, number>()

        for (const card of cards) {
          const rect = card.getBoundingClientRect()
          const key = `${Math.round(rect.width / 8) * 8}x${Math.round(rect.height / 8) * 8}`

          geometryCounts.set(key, (geometryCounts.get(key) ?? 0) + 1)
        }

        const mostUniformCards = Math.max(0, ...geometryCounts.values())

        if (mostUniformCards > maxUniformCards) {
          issues.push({
            code: 'enterprise_uniform_card_wallpaper',
            message: `${mostUniformCards} cards share nearly identical geometry; probable generic card wallpaper.`
          })
        }

        const containedInViewport = Array.from(
          root.querySelectorAll('[data-ui-surface="contained"]')
        ).filter(surface => {
          const rect = (surface as HTMLElement).getBoundingClientRect()

          return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight
        })

        if (containedInViewport.length > maxContainedSurfacesInViewport) {
          issues.push({
            code: 'enterprise_contained_surface_saturation',
            message: `${containedInViewport.length} contained surfaces compete in one viewport; probable card wallpaper instead of spatial hierarchy.`
          })
        }

        const surfaceSelector = '.MuiCard-root, .MuiPaper-root, [data-ui-surface]:not([data-ui-surface="open"])'
        let deepest = 0

        for (const surface of Array.from(root.querySelectorAll(surfaceSelector))) {
          let depth = 1
          let parent = surface.parentElement

          while (parent && parent !== root) {
            if (parent.matches(surfaceSelector)) depth += 1
            parent = parent.parentElement
          }

          deepest = Math.max(deepest, depth)
        }

        if (deepest > maxNestedSurfaceDepth) {
          issues.push({
            code: 'enterprise_nested_surfaces',
            message: `Surface nesting depth ${deepest} exceeds ${maxNestedSurfaceDepth}; probable card-inside-card composition.`
          })
        }

        const heading = root.querySelector('h1, [role=\"heading\"][aria-level=\"1\"], h2') as HTMLElement | null
        const bodyText = root.querySelector('p, .MuiTypography-body1, .MuiTypography-body2') as HTMLElement | null

        if (heading && bodyText) {
          const headingSize = Number.parseFloat(getComputedStyle(heading).fontSize)
          const bodySize = Number.parseFloat(getComputedStyle(bodyText).fontSize)
          const ratio = bodySize > 0 ? headingSize / bodySize : 0

          if (ratio < minHeadingScaleRatio) {
            issues.push({
              code: 'enterprise_flat_typography',
              message: `Heading/body scale ratio ${ratio.toFixed(2)} is below ${minHeadingScaleRatio}; hierarchy is visually flat.`
            })
          }
        }

        const unnamedIconButtons = Array.from(root.querySelectorAll('button.MuiIconButton-root')).filter(button => {
          const textContent = (button.textContent || '').trim()

          return !textContent &&
            !button.getAttribute('aria-label') &&
            !button.getAttribute('aria-labelledby') &&
            !button.getAttribute('title')
        })

        if (unnamedIconButtons.length) {
          issues.push({
            code: 'enterprise_unnamed_icon_actions',
            message: `${unnamedIconButtons.length} icon buttons have no accessible name.`
          })
        }

        return issues
      },
      {
        includeSelector: options.includeSelector ?? null,
        placeholderTerms: options.placeholderTerms ?? DEFAULT_PLACEHOLDER_TERMS,
        maxPrimary: options.maxPrimaryButtonsPerHeader ?? 1,
        maxEmptyRatio: options.maxEmptyTokensRatio ?? 0.5,
        expectedRegions: options.expectedDataCaptureRegions ?? [],
        requireSurfaceRecipeMarker: options.requireSurfaceRecipeMarker ?? false,
        maxUniformCards: options.maxUniformCards ?? 12,
        maxNestedSurfaceDepth: options.maxNestedSurfaceDepth ?? 2,
        maxContainedSurfacesInViewport: options.maxContainedSurfacesInViewport ?? 6,
        minHeadingScaleRatio: options.minHeadingScaleRatio ?? 1.35
      }
    )
  } catch (error) {
    return [
      {
        severity: 'warning',
        category: 'enterprise',
        code: FINDING_CODES.enterprise_probe_failed,
        message: `Enterprise rubric probe failed: ${error instanceof Error ? error.message : String(error)}`
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
