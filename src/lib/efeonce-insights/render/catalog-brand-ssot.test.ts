/**
 * TASK-1889 — el chrome de marca de los catálogos Insights no puede divergir del SSOT.
 *
 * El eslogan y el set de redes son chrome de PLANTILLA (el catálogo es dato autocontenido y el motor
 * no puede importar `@/config`), así que viven escritos en el HTML. Este test es la guarda: si el SSOT
 * de marca cambia, las plantillas que lo repiten fallan acá en vez de salir distintas en un PDF.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { EFEONCE_DOCUMENT_SOCIAL_CHANNELS, EFEONCE_SLOGAN_PARTS, EFEONCE_SLOGAN_TEXT } from '@/config/efeonce-brand'

const CATALOGS = ['insights-report', 'insights-deck'].map(name =>
  path.resolve(process.cwd(), 'src/lib/artifact-composer/catalogs', name)
)

const templates = CATALOGS.flatMap(dir =>
  fs
    .readdirSync(dir)
    .filter(file => file.endsWith('.html'))
    .map(file => ({ file: `${path.basename(dir)}/${file}`, html: fs.readFileSync(path.join(dir, file), 'utf8') }))
)

describe('chrome de marca de los catálogos Insights = SSOT de marca', () => {
  const withSlogan = templates.filter(({ html }) => html.includes('data-brand="slogan"'))

  it('hay plantillas con eslogan (la guarda no pasa en vacío)', () => {
    expect(withSlogan.length).toBeGreaterThan(0)
  })

  it.each(withSlogan)('$file escribe el eslogan del SSOT con sus pesos', ({ html }) => {
    const slogan = /<span class="slogan"[^>]*data-brand="slogan">(.*?)<\/span><\/span>/s.exec(html)?.[0] ?? ''
    const text = slogan.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

    expect(text).toBe(EFEONCE_SLOGAN_TEXT)

    // Cada parte con su clase de peso: 800 italic / 800 / 900 italic (EFEONCE_SLOGAN_PARTS).
    for (const part of EFEONCE_SLOGAN_PARTS) {
      expect(slogan).toContain(`class="slogan-${part.text.toLowerCase()}">${part.text}</span>`)
    }
  })

  const withSocials = templates.filter(({ html }) => html.includes('data-slot="socialSet"'))

  it.each(withSocials)('$file lista las redes del SSOT, en su orden', ({ html }) => {
    const channels = [...html.matchAll(/data-channel="([a-z]+)" role="img" aria-label="([^"]+)"/g)].map(m => ({
      channel: m[1],
      label: m[2]
    }))

    expect(channels).toEqual(EFEONCE_DOCUMENT_SOCIAL_CHANNELS.map(({ channel, label }) => ({ channel, label })))
  })
})
