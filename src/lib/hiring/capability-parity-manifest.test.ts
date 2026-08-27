/**
 * TASK-1773 Slice 5 — el guard de parity.
 *
 * El hueco no fue una ruta faltante: fue que nadie se hizo la pregunta. Este test la vuelve obligatoria.
 */
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { HIRING_CAPABILITY_PARITY_MANIFEST } from './capability-parity-manifest'

const collectHiringCapabilities = (): string[] => {
  const raw = execSync(
    `grep -rhoE "can\\([a-zA-Z]+, 'hiring\\.[^']+', '[^']+'(, '[^']+')?\\)" src/app src/lib 2>/dev/null || true`,
    { encoding: 'utf8' }
  )

  const seen = new Set<string>()

  for (const line of raw.split('\n')) {
    const match = line.match(/can\([a-zA-Z]+, '(hiring\.[^']+)'/)

    if (match) seen.add(match[1])
  }

  return [...seen].sort()
}

describe('TASK-1773 — parity del dominio Hiring', () => {
  const declared = new Map(HIRING_CAPABILITY_PARITY_MANIFEST.map(entry => [entry.capability, entry]))
  const checked = collectHiringCapabilities()

  it('sanity: el barrido encuentra capabilities (si no, el grep se rompió)', () => {
    expect(checked.length).toBeGreaterThan(10)
  })

  it('🔴 toda capability `hiring.*` chequeada con can() está declarada en el manifiesto', () => {
    const undeclared = checked.filter(capability => !declared.has(capability))

    // Si esto falla, alguien entregó una capability de Hiring sin decidir si se federa. La respuesta
    // puede ser `deliberately-internal` — lo inaceptable es el silencio, que es como nació este hueco.
    expect(undeclared).toEqual([])
  })

  it('una entrada `federated` apunta a una ruta del lane `app` que EXISTE', () => {
    const broken = HIRING_CAPABILITY_PARITY_MANIFEST.filter(
      entry => entry.status === 'federated' && (!entry.evidence || !existsSync(entry.evidence))
    ).map(entry => `${entry.capability} → ${entry.evidence ?? '(sin evidencia)'}`)

    // Declarar "federada" sin ruta real es peor que declararla pendiente: miente con confianza.
    expect(broken).toEqual([])
  })

  it('`deliberately-internal` y `pending` explican SU RAZÓN', () => {
    const silent = HIRING_CAPABILITY_PARITY_MANIFEST.filter(
      entry => entry.status !== 'federated' && !entry.reason?.trim()
    ).map(entry => entry.capability)

    expect(silent).toEqual([])
  })

  it('el manifiesto no acumula capabilities muertas', () => {
    const checkedSet = new Set(checked)

    const orphans = HIRING_CAPABILITY_PARITY_MANIFEST.filter(entry => !checkedSet.has(entry.capability)).map(
      entry => entry.capability
    )

    expect(orphans).toEqual([])
  })
})
