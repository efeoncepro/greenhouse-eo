/**
 * Catálogo `deck-axis` — reglas y layout derivado de `TimelineFull` (TASK-1393 Slice 2).
 *
 * Vivían dentro del motor (`validate.ts`/`render.ts` hardcodeaban `TimelineFull`); son semántica
 * del deck, así que ahora el catálogo las declara y el motor las ejecuta por contrato:
 *   - `timelineSlideValidator` — el schedule (timeUnit, eje discreto, fases, hitos) se valida en
 *     forma junto al resto de los slots.
 *   - `timelineLayoutHook` — el carril derivado post-fill: labels, rombos y CONECTORES salen del
 *     MISMO schedule. No puede ser un slot autorado: podrían discrepar, y un hito dibujado en una
 *     fecha que el eje no pinta es fabricación, no layout.
 */

import type { Page } from 'playwright'

import type { SlideSpec, SlotViolation } from '../../contracts'
import { SlotFillError } from '../../render'
import type { SlideValidator } from '../../validate'
import { layoutTimelineSchedule, parseTimelineSchedule } from './timeline'

export const timelineSlideValidator: SlideValidator = (slide: SlideSpec): SlotViolation[] =>
  parseTimelineSchedule(slide.slots).issues.map(issue => ({
    slideId: slide.slideId,
    template: slide.template,
    slot: issue.slot,
    code: 'invalid_value',
    message: issue.message
  }))

export const timelineLayoutHook = async (page: Page, slide: SlideSpec): Promise<void> => {
  const parsed = parseTimelineSchedule(slide.slots)

  if (!parsed.schedule) {
    throw new SlotFillError(
      slide.slideId,
      parsed.issues.map(issue => `[${issue.slot}] ${issue.message}`)
    )
  }

  const layout = layoutTimelineSchedule(parsed.schedule)

  const problem = await page.evaluate(({ unitWidth, milestonePositions }) => {
    const root = document.querySelector<HTMLElement>('[data-template="TimelineFull"]')
    const connectorHost = root?.querySelector<HTMLElement>('.vlines')
    const milestoneNodes = root ? Array.from(root.querySelectorAll<HTMLElement>('.mstone')) : []

    if (!root || !connectorHost) return 'TimelineFull no declara el canvas o el host .vlines requerido por el layout.'

    if (milestoneNodes.length !== milestonePositions.length) {
      return `TimelineFull tiene ${milestoneNodes.length} marcadores para ${milestonePositions.length} hitos; no se puede garantizar su correspondencia.`
    }

    root.style.setProperty('--m', unitWidth)
    milestoneNodes.forEach((milestone, index) => milestone.style.setProperty('left', milestonePositions[index]!))
    connectorHost.replaceChildren(
      ...milestonePositions.map(left => {
        const connector = document.createElement('div')

        connector.className = 'vline'
        connector.style.left = left
        connector.setAttribute('aria-hidden', 'true')

        return connector
      })
    )

    return null
  }, layout)

  if (problem) throw new SlotFillError(slide.slideId, [problem])
}
