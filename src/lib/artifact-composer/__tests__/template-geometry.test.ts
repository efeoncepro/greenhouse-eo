import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const TEMPLATES_DIR = path.join(process.cwd(), 'src/lib/artifact-composer/catalogs/deck-axis')

const templateFiles = fs
  .readdirSync(TEMPLATES_DIR)
  .filter(file => file.endsWith('.html') && !file.startsWith('_'))
  .sort()

/** Cada regla CSS `selector { … }` del `<style>` de una plantilla, sin comentarios. */
const cssRules = (html: string): { selector: string; body: string }[] => {
  const rules: { selector: string; body: string }[] = []
  const withoutComments = html.replace(/\/\*[\s\S]*?\*\//g, '')

  for (const match of withoutComments.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    rules.push({ selector: match[1].trim().replace(/\s+/g, ' '), body: match[2] })
  }

  return rules
}

describe('geometría de las plantillas del deck', () => {
  it('hay plantillas que auditar', () => {
    expect(templateFiles.length).toBeGreaterThan(20)
  })

  // Bug class real (lámina `metodo` del deck SKY, 2026-07-12): `.hero` declaraba
  // `grid-template-columns: 30% 35% 35%` + `gap: 46px`. Los porcentajes de CSS Grid se calculan
  // sobre el content-box y NO descuentan el gap — así que los tracks sumaban 100% + 92px y la última
  // columna terminaba 20px FUERA del lienzo. Con `.slide { overflow:hidden }`, el resultado no era
  // un error: era un PDF con una palabra guillotinada ("sosteni|ble") que parecía terminado.
  //
  // `fr` reparte lo que queda DESPUÉS del gap, así que no puede desbordar. Esta prueba prohíbe el
  // patrón en las 25 plantillas — incluso donde hoy está latente porque el copy no llena el track.
  it.each(templateFiles)('%s — ninguna grilla mezcla columnas porcentuales con gap', file => {
    const html = fs.readFileSync(path.join(TEMPLATES_DIR, file), 'utf8')

    const offenders = cssRules(html)
      .filter(rule => {
        const columns = /grid-template-columns:([^;]*)/.exec(rule.body)?.[1]

        if (columns === undefined || !columns.includes('%')) return false

        // Un `%` suelto en una sola columna (`grid-template-columns: 40% 1fr`) no desborda: el `fr`
        // absorbe el gap. Sólo miente cuando TODOS los tracks son `%` y suman ~100.
        const percentages = [...columns.matchAll(/([\d.]+)%/g)].map(match => Number(match[1]))

        const hasNonPercentTrack = /\b(?:\d+(?:\.\d+)?(?:fr|px|em|rem)|auto|min-content|max-content|minmax)\b/.test(
          columns
        )

        if (hasNonPercentTrack) return false

        const total = percentages.reduce((sum, value) => sum + value, 0)
        const hasGap = /(?:^|[;\s])(?:grid-)?(?:column-)?gap:\s*[^;]*[1-9]/.test(rule.body)

        return hasGap && total >= 99
      })
      .map(rule => rule.selector)

    expect(
      offenders,
      `${file}: ${offenders.join(', ')} usa columnas en % que suman 100% MÁS un gap. ` +
        `Los tracks se salen del lienzo y .slide{overflow:hidden} corta el copy en silencio. Usa fr.`
    ).toEqual([])
  })
})
