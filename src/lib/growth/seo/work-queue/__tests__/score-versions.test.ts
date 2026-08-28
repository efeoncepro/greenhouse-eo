import { describe, expect, it } from 'vitest'

import {
  ACTIVE_PRIORITY_SCORE_VERSION,
  PRIORITY_SCORE_CONFIGS,
  fingerprintPriorityScoreConfig,
  getPriorityScoreConfig
} from '../score-versions'

/**
 * TASK-1700 — El test que hace del versionado un contrato y no una intención.
 *
 * El modo de falla que cierra: alguien ajusta un umbral "para que la lista se vea mejor", el
 * ranking histórico entero se mueve, y ningún snapshot lo declara. La huella está congelada
 * acá abajo; editar un valor sin bumpear la versión rompe este test con instrucciones.
 */

/**
 * 🔴 HUELLAS CONGELADAS — append-only, igual que el registro.
 *
 * Si este test falla:
 *   - ¿Cambiaste un valor a propósito? → NO edites la huella. Agrega una versión nueva a
 *     `PRIORITY_SCORE_CONFIGS`, mueve `ACTIVE_PRIORITY_SCORE_VERSION` y agrega SU huella acá.
 *   - ¿No querías cambiarlo? → revierte.
 *
 * Editar la huella de una versión ya publicada es exactamente lo que este test existe para
 * impedir: deja los snapshots viejos afirmando reglas que ya nadie puede reconstruir.
 */
const FROZEN_FINGERPRINTS: Record<string, string> = {
  'incremental-clicks-v1':
    'ctrCurveScope=all_rows|curveMinBucketClicks=5|curveMinBucketImpressions=1000|impressionsPercentile=0.75|maxPosition=20|minImpressionsFloor=10|minPosition=8|targetPosition=5|windowDays=28'
}

describe('TASK-1700 — registro de versiones del score', () => {
  it('toda versión publicada conserva su huella exacta', () => {
    for (const [version, config] of Object.entries(PRIORITY_SCORE_CONFIGS)) {
      expect(FROZEN_FINGERPRINTS[version], `falta la huella congelada de ${version}`).toBeDefined()
      expect(fingerprintPriorityScoreConfig(config), `la config de ${version} cambió sin bumpear la versión`).toBe(
        FROZEN_FINGERPRINTS[version]
      )
    }
  })

  it('el registro es append-only: ninguna huella congelada perdió su versión', () => {
    // El reverso del test anterior. Borrar una versión publicada deja ilegibles los snapshots
    // que la citan — y un snapshot ilegible es peor que uno viejo.
    for (const version of Object.keys(FROZEN_FINGERPRINTS)) {
      expect(PRIORITY_SCORE_CONFIGS, `se borró la versión publicada ${version}`).toHaveProperty(version)
    }
  })

  it('la versión activa existe en el registro', () => {
    expect(getPriorityScoreConfig(ACTIVE_PRIORITY_SCORE_VERSION).version).toBe(ACTIVE_PRIORITY_SCORE_VERSION)
  })

  it('el alcance de la curva es un valor implementado, no una promesa', () => {
    // `non_brand` está en el TIPO a propósito (evidencia medida de la skill seo-aeo), pero
    // v1 NO lo implementa. Este assert es el que impide que una versión futura lo declare y
    // sirva una curva `all_rows` diciendo que es no-marca.
    const config = getPriorityScoreConfig(ACTIVE_PRIORITY_SCORE_VERSION)

    expect(config.ctrCurveScope).toBe('all_rows')
  })

  it('el piso de muestra de la curva descarta el caso medido que lo motivó', () => {
    // efeoncepro.com, bucket posición 5 medido contra PG real el 2026-08-28: 75 impresiones,
    // 0 clics. Con un CTR verdadero de ~1%, observar cero ahí es una moneda al aire (≈47%).
    const config = getPriorityScoreConfig(ACTIVE_PRIORITY_SCORE_VERSION)

    expect(75).toBeLessThan(config.curveMinBucketImpressions)
    expect(0).toBeLessThan(config.curveMinBucketClicks)

    // Y acepta el caso que SÍ es medición: berel.com, mismo bucket, 37.600 impresiones / 370 clics.
    expect(37_600).toBeGreaterThanOrEqual(config.curveMinBucketImpressions)
    expect(370).toBeGreaterThanOrEqual(config.curveMinBucketClicks)
  })
})
