import type { Page } from 'playwright'

/** Recompose two analytical stories from their governed slot data. */
export async function enhanceCommercialAndOnTime(page: Page, slide: { slideId: string; slots: unknown }) {
  if (!['comercial', 'puntualidad'].includes(slide.slideId)) return
  await page.evaluate(({ id, slots }: { id: string; slots: any }) => {
    const root = document.querySelector('.slide')!
    const content = document.querySelector('.content')!
    const node = (tag: string, className: string, text?: string) => {
      const element = document.createElement(tag)
      element.className = className
      if (text !== undefined) element.textContent = text
      return element
    }
    const percent = (value: number) => new Intl.NumberFormat('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value).replace('.', ',') + '%'
    if (id === 'comercial') {
      root.classList.add('commercial-story')
      content.className = 'content commercial-comparisons'
      content.replaceChildren()
      const bars = slots.bars as { label: string; display: string; amount: string; note?: string }[]
      if (bars.length !== 4) throw new Error('Commercial comparison requires two period pairs')
      const maximum = Math.max(...bars.map(item => Number(item.amount)))
      const panels = node('div', 'commercial-panels')
      for (let i = 0; i < bars.length; i += 2) {
        const before = Number(bars[i].amount), after = Number(bars[i + 1].amount)
        if (!(before > 0) || !Number.isFinite(after)) throw new Error('Invalid commercial period base')
        const panel = node('section', 'commercial-panel')
        const title = node('div', 'commercial-heading')
        title.append(node('span', 'commercial-route', bars[i].label.split(' · ')[0]))
        const change = (after - before) / before * 100
        title.append(node('strong', 'commercial-change', (change < 0 ? '−' : '+') + percent(Math.abs(change))))
        panel.append(title, node('p', 'commercial-change-label', 'Variación de clics · julio → agosto'))
        for (const [j, item] of bars.slice(i, i + 2).entries()) {
          const row = node('div', 'commercial-row')
          row.append(node('span', 'commercial-period', item.label))
          const track = node('div', 'commercial-track')
          const fill = node('div', `commercial-fill ${j === 0 ? 'prior' : 'current'}`)
          fill.style.width = `${Number(item.amount) / maximum * 100}%`
          track.append(fill)
          row.append(track, node('b', 'commercial-value', item.display))
          if (item.note) row.append(node('small', 'commercial-note', item.note))
          panel.append(row)
        }
        panel.append(node('div', 'commercial-axis', `0 — ${new Intl.NumberFormat('es-MX').format(maximum)} clics · misma escala en ambos recorridos`))
        panels.append(panel)
      }
      content.append(panels)
      const bridge = node('div', 'commercial-bridge')
      bridge.append(node('span', 'commercial-count', slots.heroValue), node('p', '', slots.heroText))
      content.append(bridge)
    } else {
      root.classList.add('ontime-story')
      content.className = 'content ontime-measurements'
      content.replaceChildren()
      const metrics = slots.metrics as { value: string; label: string; detail: string }[]
      if (metrics.length !== 3) throw new Error('On-time story requires closure, submissions and coverage')
      const countPair = (text: string) => {
        const match = text.match(/(\d+)\s*(?:de|\/)\s*(\d+)/)
        if (!match) throw new Error('Missing explicit on-time numerator/base')
        return [Number(match[1]), Number(match[2])]
      }
      const [closedOnTime, closureBase] = countPair(metrics[0].detail)
      const [sentOnTime, documentedSubmissions] = countPair(metrics[1].value)
      const [documented, eligible] = countPair(metrics[2].detail)
      if (documented !== documentedSubmissions || documented > eligible || sentOnTime > documented || closedOnTime > closureBase) throw new Error('Inconsistent on-time bases')
      const bar = (numerator: number, denominator: number, firstLabel: string, restLabel: string) => {
        const group = node('div', 'ontime-bar-group')
        const track = node('div', 'ontime-track')
        const filled = node('div', 'ontime-fill')
        filled.style.width = `${numerator / denominator * 100}%`
        track.append(filled)
        const labels = node('div', 'ontime-bar-labels')
        labels.append(node('span', '', `${numerator} ${firstLabel}`), node('span', '', `${denominator - numerator} ${restLabel}`))
        group.append(track, labels)
        return group
      }
      const closure = node('section', 'ontime-measure closure')
      closure.append(node('span', 'ontime-step', '01 / CIERRE DE TAREAS'), node('strong', 'ontime-value', metrics[0].value), node('h2', '', metrics[0].label), node('p', 'ontime-detail', metrics[0].detail))
      closure.append(bar(closedOnTime, closureBase, 'dentro del plazo', 'cierres posteriores'))
      const submission = node('section', 'ontime-measure submission')
      submission.append(node('span', 'ontime-step', '02 / PRIMER ENVÍO A REVISIÓN'), node('strong', 'ontime-value', metrics[1].value), node('h2', '', metrics[1].label), node('p', 'ontime-detail', metrics[1].detail))
      const coverage = node('section', 'ontime-coverage')
      const heading = node('div', 'coverage-heading')
      heading.append(node('h3', '', metrics[2].label), node('strong', '', metrics[2].value))
      coverage.append(heading, node('p', 'coverage-detail', metrics[2].detail), bar(documented, eligible, 'con fecha', 'sin fecha'))
      submission.append(coverage)
      content.append(closure, submission)
    }
  }, { id: slide.slideId, slots: slide.slots })
}
