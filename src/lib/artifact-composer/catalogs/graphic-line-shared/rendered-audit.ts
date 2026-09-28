/**
 * Auditoría de La órbita sobre la lámina YA RENDERIZADA (TASK-1928). Dos reglas de la norma que ni el contrato de
 * AXIS ni el `slots.json` pueden ver, porque dependen del cuerpo real con que Chromium pinta el texto:
 *
 *   - **D1 · `accent-text-min-size`**: ningún texto de menos de 24 px lleva el color de acento de la línea
 *     (`EFEONCE_SURFACE_COMPOSITION_V1.md` §reglas 6). Se mide todo nodo con texto propio cuyo `color` computado es
 *     el `--gl-accent` que ese mismo nodo hereda.
 *   - **3× · `answer-ratio`**: en las láminas de decisión (cotización, clientes, plan, partners) la respuesta mide al
 *     menos 3× la pregunta. Sólo rige en `ANSWER_RATIO_CONTENT_TYPES`; una lámina de esa lista que no pinte pregunta y
 *     respuesta también falla, porque la regla no se puede comprobar.
 *
 * La corre `pnpm composer:visual-gate` sobre cada probe de los catálogos de La órbita: una violación falla el gate
 * igual que un píxel. Es una medición, no una afirmación sobre el texto del CSS.
 */

import type { Page } from 'playwright'

export const ACCENT_TEXT_MIN_PX = 24
export const ANSWER_TO_QUESTION_MIN_RATIO = 3

/** Las láminas donde la respuesta es la decisión y la norma exige ≥ 3× la pregunta (TASK-1928 §QA). */
export const ANSWER_RATIO_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'deck.content-pricing',
  'deck.content-pricing.stage',
  'deck.content-pricing.live',
  'deck.content-clients',
  'deck.decision-plan',
  'deck.content-partners',
  // TASK-1934: las siete láminas SEO/AEO (la respuesta a 3× la pregunta, 120 px como mínimo).
  'deck.decision-ai-answer',
  'deck.decision-ai-market',
  'deck.method-surround-cycle',
  'deck.decision-difference',
  'deck.method-eeat',
  'deck.decision-traffic-to-revenue',
  'deck.decision-diagnosis-map'
])

export interface RenderedAuditViolation {
  rule: 'accent-text-min-size' | 'answer-ratio'
  detail: string
}

interface InPageArgs {
  minPx: number
  ratio: number
  checkRatio: boolean
}

/** `contentTypes`: los que la plantilla sirve; el 3× rige si alguno está en la lista. */
export const auditGraphicLineRendered = async (page: Page, contentTypes: readonly string[]): Promise<RenderedAuditViolation[]> =>
  page.evaluate(
    ({ minPx, ratio, checkRatio }: InPageArgs) => {
      const violations: { rule: 'accent-text-min-size' | 'answer-ratio'; detail: string }[] = []

      // El acento se normaliza pintándolo: `--gl-accent` puede llegar como hex, rgb o color-mix.
      const probe = document.createElement('span')

      probe.style.display = 'none'
      document.body.appendChild(probe)

      const normalized = new Map<string, string>()

      const toRgb = (value: string): string => {
        const cached = normalized.get(value)

        if (cached !== undefined) return cached

        probe.style.color = ''
        probe.style.color = value
        const rgb = probe.style.color ? getComputedStyle(probe).color : ''

        normalized.set(value, rgb)

        return rgb
      }

      const describe = (element: Element): string => {
        const classes = element.getAttribute('class')?.trim().replace(/\s+/g, '.') ?? ''
        const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40)

        return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''} «${text}»`
      }

      for (const element of Array.from(document.body.querySelectorAll('*'))) {
        const ownText = Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())

        if (!ownText) continue

        const style = getComputedStyle(element)
        const box = element.getBoundingClientRect()

        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue
        if (box.width === 0 || box.height === 0) continue

        const accent = style.getPropertyValue('--gl-accent').trim()

        if (!accent) continue

        const size = Number.parseFloat(style.fontSize)

        if (size < minPx && style.color === toRgb(accent)) {
          violations.push({ rule: 'accent-text-min-size', detail: `${describe(element)} a ${size}px en el acento` })
        }
      }

      if (checkRatio) {
        const question = document.querySelector('.gl-question')
        const answer = document.querySelector('.gl-answer')

        if (!question || !answer) {
          violations.push({ rule: 'answer-ratio', detail: 'la lámina no pinta .gl-question y .gl-answer: el 3× no se puede medir' })
        } else {
          const q = Number.parseFloat(getComputedStyle(question).fontSize)
          const a = Number.parseFloat(getComputedStyle(answer).fontSize)

          if (a < q * ratio) {
            violations.push({ rule: 'answer-ratio', detail: `respuesta ${a}px = ${(a / q).toFixed(2)}× la pregunta (${q}px); mínimo ${ratio}×` })
          }
        }
      }

      probe.remove()

      return violations
    },
    {
      minPx: ACCENT_TEXT_MIN_PX,
      ratio: ANSWER_TO_QUESTION_MIN_RATIO,
      checkRatio: contentTypes.some(contentType => ANSWER_RATIO_CONTENT_TYPES.has(contentType))
    }
  )
