/**
 * No-regresión de los intents publicados (TASK-1927): un bump de AXIS o un cambio del mapper no puede mover el plan
 * de un intent que ya componía. El snapshot guarda lo que llega al composer (catálogo, contentType, slots y assets),
 * no el manifest de AXIS: sus textos de reglas cambian entre versiones sin mover un píxel.
 *
 * Si el snapshot cambia, el cambio de píxel se declara en BASELINE_DELTAS.md antes de actualizarlo.
 */

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { planSurfacePiece, type SurfaceIntent } from '../index'

const EXAMPLES_DIR = path.resolve(__dirname, '../examples')

const examples = fs
  .readdirSync(EXAMPLES_DIR)
  .filter(file => file.endsWith('-intent.json'))
  .sort()

describe('planes de los intents de ejemplo', () => {
  it('hay ejemplos que vigilar', () => {
    expect(examples.length).toBeGreaterThanOrEqual(19)
  })

  it.each(examples)('%s compone el mismo plan', file => {
    const intent = JSON.parse(fs.readFileSync(path.join(EXAMPLES_DIR, file), 'utf8')) as SurfaceIntent
    const piece = planSurfacePiece(intent, { artifactId: file.replace(/-intent\.json$/, '') })

    expect({ catalog: piece.catalog, contentType: piece.contentType, plan: piece.plan, assets: piece.assets }).toMatchSnapshot()
  })
})
