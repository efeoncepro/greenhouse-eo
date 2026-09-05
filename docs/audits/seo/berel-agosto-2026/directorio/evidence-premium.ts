import type { Page } from 'playwright'

type EvidenceSlide = { slideId: string; slots?: unknown }

/** Recompose existing filled nodes: no independent copy/data source and no lost plan text. */
export async function enhanceEvidence(page: Page, slide: EvidenceSlide): Promise<void> {
  if (slide.slideId !== 'ia' && slide.slideId !== 'medicion') return
  await page.evaluate(({ slideId }) => {
    const root = document.querySelector<HTMLElement>('.slide')
    const content = root?.querySelector<HTMLElement>('.content')
    if (!root || !content) throw new Error(`Missing evidence canvas: ${slideId}`)
    if (root.dataset.evidenceEnhanced === 'true') return
    root.dataset.evidenceEnhanced = 'true'
    root.classList.add(`evidence-${slideId}`)

    if (slideId === 'ia') {
      const metrics = Array.from(content.querySelectorAll<HTMLElement>('.metric'))
      if (metrics.length !== 3) throw new Error('IA evidence requires exactly three filled metrics')
      content.classList.add('evidence-grid')
      metrics[0].classList.add('evidence-primary')
      metrics[1].classList.add('evidence-secondary')
      metrics[2].classList.add('evidence-calibration')
      const state = document.createElement('span')
      state.className = 'calibration-state'
      state.textContent = 'EN CALIBRACIÓN'
      metrics[2].prepend(state)
      // Keep the original values, labels and explanatory details as live text nodes.
      return
    }

    const cards = Array.from(content.querySelectorAll<HTMLElement>('.card'))
    if (cards.length !== 3) throw new Error('Measurement evidence requires exactly three filled stages')
    content.classList.add('measurement-register')
    cards.forEach((card, i) => {
      card.classList.add('measurement-stage', i === 0 ? 'stage-observed' : 'stage-pending')
      // Existing icons are decorative; the state from the plan is the meaningful identifier.
      card.querySelectorAll('.section-icon,.icon').forEach(icon => icon.remove())
      const marker = document.createElement('span')
      marker.className = 'stage-marker'
      marker.setAttribute('aria-hidden', 'true')
      marker.textContent = i === 0 ? '✓' : String(i + 1).padStart(2, '0')
      const tag = card.querySelector<HTMLElement>('[data-slot-field="tag"]')
      const heading = card.querySelector<HTMLElement>('[data-slot-field="heading"]')
      const body = card.querySelector<HTMLElement>('[data-slot-field="body"]')
      if (!tag || !heading || !body) throw new Error('Measurement stage is missing filled fields')
      const identity = document.createElement('div')
      identity.className = 'stage-identity'
      identity.append(tag, heading)
      card.replaceChildren(marker, identity, body)
    })
  }, { slideId: slide.slideId })
}
