import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

import { existsSync, readdirSync } from 'node:fs'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { buildCaptureIndexModel } from './capture-index'
import { scenarioFromDirName } from './capture-paths'
import { pruneScenarioRuns, pruneCapturesBudget, shouldRunAutoGc } from '../gc'

let CAP = ''

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

const makeRun = (name: string, ageMs: number): void => {
  const path = resolve(CAP, name)

  mkdirSync(path, { recursive: true })
  const t = (Date.now() - ageMs) / 1000

  utimesSync(path, t, t)
}

beforeEach(() => {
  CAP = mkdtempSync(resolve(tmpdir(), 'gvc-idx-'))
})

afterEach(() => {
  rmSync(CAP, { recursive: true, force: true })
})

describe('scenarioFromDirName', () => {
  it('extracts the scenario after the first underscore', () => {
    expect(scenarioFromDirName('2026-06-11T01-34-42_tmp-toggle')).toBe('tmp-toggle')
    expect(scenarioFromDirName('2026-06-11T01-34-42_design-system-charts')).toBe('design-system-charts')
  })

  it('falls back to the full name when there is no underscore', () => {
    expect(scenarioFromDirName('concepts')).toBe('concepts')
  })

  it('keeps underscores inside the scenario label', () => {
    expect(scenarioFromDirName('2026-06-11T01-34-42_a_b')).toBe('a_b')
  })
})

describe('buildCaptureIndexModel', () => {
  it('groups runs by scenario and picks the newest as evidence', () => {
    makeRun('2026-06-11T00-00-00_charts', 3 * HOUR)
    makeRun('2026-06-11T01-00-00_charts', 1 * HOUR)
    makeRun('2026-06-11T02-00-00_buttons', 30 * 60 * 1000)

    const model = buildCaptureIndexModel(CAP)

    expect(model.totalScenarios).toBe(2)
    expect(model.totalRuns).toBe(3)

    const charts = model.scenarios.find(s => s.scenario === 'charts')

    expect(charts?.runCount).toBe(2)
    expect(charts?.evidence.dir).toBe('2026-06-11T01-00-00_charts') // newest of the two
  })

  it('flags a scenario active only when its newest run is within the window', () => {
    makeRun('2026-06-11T00-00-00_fresh', 30 * 60 * 1000) // 30m → active
    makeRun('2026-06-10T00-00-00_stale', 5 * HOUR) // 5h → idle

    const model = buildCaptureIndexModel(CAP)

    expect(model.scenarios.find(s => s.scenario === 'fresh')?.active).toBe(true)
    expect(model.scenarios.find(s => s.scenario === 'stale')?.active).toBe(false)
    expect(model.activeScenarios).toBe(1)
  })

  it('sorts active scenarios first', () => {
    makeRun('2026-06-10T00-00-00_old', 6 * HOUR)
    makeRun('2026-06-11T00-00-00_now', 10 * 60 * 1000)

    const model = buildCaptureIndexModel(CAP)

    expect(model.scenarios[0].scenario).toBe('now')
  })

  it('enriches runs with route/env/task from audit.jsonl', () => {
    makeRun('2026-06-11T00-00-00_charts', 1 * HOUR)
    writeFileSync(
      resolve(CAP, 'audit.jsonl'),
      JSON.stringify({
        timestamp: '2026-06-11T00:00:00.000Z',
        scenarioName: 'charts',
        route: '/design-system/charts',
        env: 'local',
        outputDir: '<repo>/.captures/2026-06-11T00-00-00_charts',
        exitCode: 0,
        durationMs: 1000,
        actor: 'user:test',
        task: 'TASK-1053'
      }) + '\n'
    )

    const model = buildCaptureIndexModel(CAP)
    const charts = model.scenarios.find(s => s.scenario === 'charts')

    expect(charts?.route).toBe('/design-system/charts')
    expect(charts?.task).toBe('TASK-1053')
    expect(charts?.evidence.env).toBe('local')
  })

  it('returns an empty model for an empty dir', () => {
    const model = buildCaptureIndexModel(CAP)

    expect(model.totalScenarios).toBe(0)
    expect(model.totalRuns).toBe(0)
  })
})

describe('pruneScenarioRuns', () => {
  it('keeps the N newest runs of a scenario and removes older ones past grace', () => {
    for (let i = 0; i < 5; i++) makeRun(`2026-06-0${i + 1}T00-00-00_zz-test`, (10 + i) * DAY)

    const removed = pruneScenarioRuns('zz-test', 3, 2, CAP)

    expect(removed).toBe(2)
    expect(buildCaptureIndexModel(CAP).scenarios.find(s => s.scenario === 'zz-test')?.runCount).toBe(3)
  })

  it('never removes runs inside the grace window', () => {
    for (let i = 0; i < 5; i++) makeRun(`2026-06-11T0${i}-00-00_zz-fresh`, 30 * 60 * 1000)

    const removed = pruneScenarioRuns('zz-fresh', 1, 2, CAP)

    expect(removed).toBe(0) // all within 2-day grace
    expect(buildCaptureIndexModel(CAP).scenarios.find(s => s.scenario === 'zz-fresh')?.runCount).toBe(5)
  })

  it('does not touch other scenarios', () => {
    makeRun('2026-06-01T00-00-00_zz-a', 10 * DAY)
    makeRun('2026-06-02T00-00-00_zz-a', 9 * DAY)
    makeRun('2026-06-01T00-00-00_zz-b', 10 * DAY)

    pruneScenarioRuns('zz-a', 1, 2, CAP)

    const model = buildCaptureIndexModel(CAP)

    expect(model.scenarios.find(s => s.scenario === 'zz-a')?.runCount).toBe(1)
    expect(model.scenarios.find(s => s.scenario === 'zz-b')?.runCount).toBe(1)
  })
})

// Crea un run con un archivo de `sizeMb` MB y la edad dada (para size-cap tests).
const makeSizedRun = (name: string, ageMs: number, sizeMb: number): void => {
  const path = resolve(CAP, name)

  mkdirSync(path, { recursive: true })
  writeFileSync(resolve(path, 'frame.bin'), Buffer.alloc(sizeMb * 1024 * 1024))
  const t = (Date.now() - ageMs) / 1000

  utimesSync(path, t, t)
}

describe('pruneCapturesBudget (TASK-927 captures governance)', () => {
  it('purga lo más viejo hasta quedar bajo el cap', () => {
    makeSizedRun('2026-06-01T00-00-00_zz-old', 20 * DAY, 3) // viejo, 3MB
    makeSizedRun('2026-06-02T00-00-00_zz-mid', 15 * DAY, 3) // 3MB
    makeSizedRun('2026-06-03T00-00-00_zz-new', 10 * DAY, 3) // 3MB → total 9MB

    // cap ~5MB, keepNewest=1, grace 2d (todos son viejos > 2d).
    const { removed } = pruneCapturesBudget({
      maxGb: 5 / 1024,
      keepNewest: 1,
      graceDays: 2,
      capturesDir: CAP
    })

    expect(removed).toBeGreaterThanOrEqual(1)
    // el más nuevo (protegido por keepNewest) sobrevive.
    expect(existsSync(resolve(CAP, '2026-06-03T00-00-00_zz-new'))).toBe(true)
  })

  it('NUNCA toca lo reciente (grace window) aunque exceda el cap', () => {
    makeSizedRun('2026-06-10T00-00-00_zz-recent-a', 1 * HOUR, 5)
    makeSizedRun('2026-06-10T01-00-00_zz-recent-b', 2 * HOUR, 5) // total 10MB, ambos < 2d

    const { removed } = pruneCapturesBudget({
      maxGb: 1 / 1024, // cap 1MB (excedido) pero todo es reciente
      keepNewest: 0,
      graceDays: 2,
      capturesDir: CAP
    })

    expect(removed).toBe(0) // grace protege la sesión en curso del agente
    expect(readdirSync(CAP).length).toBe(2)
  })

  it('no hace nada si está bajo el cap', () => {
    makeSizedRun('2026-06-01T00-00-00_zz-a', 10 * DAY, 1)

    const { removed } = pruneCapturesBudget({ maxGb: 1, capturesDir: CAP }) // cap 1GB >> 1MB

    expect(removed).toBe(0)
  })

  it('maxGb=0 desactiva el size-cap (no-op)', () => {
    makeSizedRun('2026-06-01T00-00-00_zz-a', 10 * DAY, 5)

    const { removed } = pruneCapturesBudget({ maxGb: 0, capturesDir: CAP })

    expect(removed).toBe(0)
  })
})

describe('shouldRunAutoGc throttle (TASK-927)', () => {
  it('corre la 1ra vez y throttlea la 2da dentro del intervalo', () => {
    expect(shouldRunAutoGc(12, CAP)).toBe(true) // 1ra vez: crea el stamp
    expect(shouldRunAutoGc(12, CAP)).toBe(false) // dentro del intervalo: throttle
  })

  it('intervalo 0 → siempre corre', () => {
    expect(shouldRunAutoGc(0, CAP)).toBe(true)
    expect(shouldRunAutoGc(0, CAP)).toBe(true)
  })
})
