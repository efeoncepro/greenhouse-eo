/**
 * Layout integrity gate (TASK-1018 Slice 2).
 *
 * Detecta best-effort, con baja flakiness, problemas de layout que el axe gate
 * no cubre: overflow horizontal, elementos fuera del viewport, targets bajo el
 * mínimo WCAG, texto cortado, regiones scrollables sin label y cards anidadas.
 *
 * Todo el scan vive en UN `page.evaluate` (una pasada de DOM por frame). El
 * mapeo a `CaptureFinding` + severidad ocurre en Node. Warning-first salvo que
 * el scenario declare `failOnViolations`.
 */

import type { Page } from 'playwright'

import { FINDING_CODES } from './failure-taxonomy'
import type { CaptureFinding } from './manifest'
import type { CaptureLayoutQualityOptions } from './scenario'

const DEFAULT_MIN_TARGET = 24
const MAX_PER_CODE = 8

interface RawLayoutIssue {
  code: string
  message: string
  selector?: string
}

export const analyzeLayoutIntegrity = async (
  page: Page,
  frameLabel: string,
  options: CaptureLayoutQualityOptions
): Promise<CaptureFinding[]> => {
  const severity: CaptureFinding['severity'] = options.failOnViolations ? 'error' : 'warning'

  let raw: RawLayoutIssue[]

  try {
    raw = await page.evaluate(
      ({ includeSelector, ignoreSelectors, allowHScrollSelectors, minTarget, maxPerCode }) => {
        const issues: RawLayoutIssue[] = []
        const root = (includeSelector ? document.querySelector(includeSelector) : document.body) as HTMLElement | null

        if (!root) return issues

        const ignore = ignoreSelectors
          .flatMap(sel => Array.from(document.querySelectorAll(sel)))
          .filter((el): el is Element => Boolean(el))

        const allowHScroll = allowHScrollSelectors
          .flatMap(sel => Array.from(document.querySelectorAll(sel)))
          .filter((el): el is Element => Boolean(el))

        // NOTE: declaradas como function declarations (no `const fn = () =>`)
        // a propósito: esbuild keepNames envuelve arrow-consts con `__name(...)`
        // que NO existe en el contexto del browser de page.evaluate.
        function isIgnored(el: Element): boolean {
          if (el.closest('[aria-hidden="true"]')) return true
          for (const ig of ignore) if (ig === el || ig.contains(el)) return true

          return false
        }

        function describe(el: Element): string {
          const tag = el.tagName.toLowerCase()
          const id = el.id ? `#${el.id}` : ''
          const cls = typeof el.className === 'string' && el.className.trim() ? `.${el.className.trim().split(/\s+/)[0]}` : ''
          const dataCapture = el.getAttribute('data-capture')

          return dataCapture ? `${tag}[data-capture="${dataCapture}"]` : `${tag}${id}${cls}`
        }

        function isVisible(el: Element): boolean {
          const style = getComputedStyle(el)

          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false

          const r = el.getBoundingClientRect()

          return r.width > 0 && r.height > 0
        }

        function cap(code: string): boolean {
          return issues.filter(i => i.code === code).length >= maxPerCode
        }

        const vw = window.innerWidth

        // 1. Horizontal overflow de página.
        if (document.documentElement.scrollWidth > vw + 2 && !allowHScroll.length) {
          issues.push({
            code: 'layout_horizontal_overflow',
            message: `La página tiene scroll horizontal inesperado (scrollWidth ${document.documentElement.scrollWidth} > viewport ${vw}).`
          })
        }

        const candidates = Array.from(root.querySelectorAll<HTMLElement>('*')).filter(el => !isIgnored(el) && isVisible(el))

        for (const el of candidates) {
          const r = el.getBoundingClientRect()

          // 2. Elemento desbordando el viewport horizontalmente.
          if (!cap('layout_element_overflow')) {
            const overflowsRight = r.right > vw + 2
            const overflowsLeft = r.left < -2
            const inAllowedScroll = allowHScroll.some(s => s.contains(el))

            if ((overflowsRight || overflowsLeft) && !inAllowedScroll && r.width <= vw + 2) {
              issues.push({
                code: 'layout_element_overflow',
                message: `Elemento fuera del viewport horizontal (left=${Math.round(r.left)}, right=${Math.round(r.right)}, vw=${vw}).`,
                selector: describe(el)
              })
            }
          }

          // 3. Texto cortado en controles con overflow hidden.
          if (!cap('layout_text_clipped')) {
            const style = getComputedStyle(el)
            const clips = style.overflowX === 'hidden' || style.overflow === 'hidden'
            const isTextHost = /^(button|a|span|label|p|h[1-6]|td|th|li)$/.test(el.tagName.toLowerCase())

            if (clips && isTextHost && el.scrollWidth > el.clientWidth + 2 && el.textContent && el.textContent.trim().length > 0) {
              issues.push({
                code: 'layout_text_clipped',
                message: `Texto cortado (scrollWidth ${el.scrollWidth} > clientWidth ${el.clientWidth}) en "${(el.textContent || '').trim().slice(0, 40)}".`,
                selector: describe(el)
              })
            }
          }
        }

        // 4. Target interactivo bajo el mínimo.
        const interactiveSel = 'button, a[href], [role="button"], [role="tab"], [role="menuitem"], input[type="checkbox"], input[type="radio"], summary'
        const interactives = Array.from(root.querySelectorAll<HTMLElement>(interactiveSel)).filter(el => !isIgnored(el) && isVisible(el))

        for (const el of interactives) {
          if (cap('layout_target_too_small')) break

          const r = el.getBoundingClientRect()

          if (r.width < minTarget || r.height < minTarget) {
            issues.push({
              code: 'layout_target_too_small',
              message: `Target interactivo ${Math.round(r.width)}×${Math.round(r.height)}px < mínimo ${minTarget}px.`,
              selector: describe(el)
            })
          }
        }

        // 5. Región scrollable sin label/role accesible.
        for (const el of candidates) {
          if (cap('layout_scroll_region_unlabeled')) break

          const style = getComputedStyle(el)
          const scrollable = (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 8

          if (scrollable) {
            const labeled = el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('role') || el.tabIndex >= 0

            if (!labeled) {
              issues.push({
                code: 'layout_scroll_region_unlabeled',
                message: 'Región scrollable sin role/label/foco — un usuario de teclado no puede alcanzarla.',
                selector: describe(el)
              })
            }
          }
        }

        // 6. Cards MUI anidadas (anti-pattern de jerarquía).
        const cards = Array.from(root.querySelectorAll<HTMLElement>('.MuiCard-root')).filter(el => !isIgnored(el))

        for (const el of cards) {
          if (cap('layout_nested_cards')) break

          if (el.parentElement?.closest('.MuiCard-root')) {
            issues.push({
              code: 'layout_nested_cards',
              message: 'Card MUI anidada dentro de otra Card (jerarquía visual ambigua).',
              selector: describe(el)
            })
          }
        }

        return issues
      },
      {
        includeSelector: options.includeSelector ?? null,
        ignoreSelectors: options.ignoreSelectors ?? [],
        allowHScrollSelectors: options.allowHorizontalScrollSelectors ?? [],
        minTarget: options.minTargetSize ?? DEFAULT_MIN_TARGET,
        maxPerCode: MAX_PER_CODE
      }
    )
  } catch (err) {
    return [
      {
        severity: 'warning',
        category: 'layout',
        code: FINDING_CODES.layout_probe_failed,
        message: `Layout probe falló en frame "${frameLabel}": ${err instanceof Error ? err.message : String(err)}`,
        frameLabel
      }
    ]
  }

  return raw.map(issue => ({
    severity,
    category: 'layout' as const,
    code: issue.code,
    message: issue.message,
    frameLabel,
    selector: issue.selector
  }))
}
