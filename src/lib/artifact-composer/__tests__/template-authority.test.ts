import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { composeDeck, TemplateAuthorityError } from '../index'
import type { DeckPlan } from '../contracts'

const TEMPLATES_DIR = path.join(process.cwd(), 'docs/architecture/tender-deck-composer-prototypes')

/**
 * TASK-1393 Slice 1 — el autor declara INTENCIÓN, nunca AUTORIDAD DE PRESENTACIÓN.
 *
 * El `DeckPlan` histórico trae `template` en el JSON. El adaptador sólo lo acepta si coincide
 * EXACTAMENTE con lo que el selector deriva del `contentType`: un agente que elija una plantilla
 * semánticamente incorrecta (aunque sus slots pasaran validación de forma) aborta ANTES de validar
 * y de renderizar nada.
 */
describe('composeDeck — template authority', () => {
  it('un template declarado que contradice al selector aborta con TemplateAuthorityError', async () => {
    const plan: DeckPlan = {
      tenderId: 'AUTHORITY-PROBE',
      slides: [
        {
          slideId: 'probe',
          contentType: 'one-metric', // el selector deriva StatSplit…
          template: 'PricingFull', // …pero el "autor" intenta imponer otra plantilla
          slots: {}
        }
      ]
    }

    await expect(composeDeck({ templatesDir: TEMPLATES_DIR }, plan, '.captures/never-written')).rejects.toThrow(
      TemplateAuthorityError
    )
  })
})
