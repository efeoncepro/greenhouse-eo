/**
 * TASK-1178 Slice 3 — Anti-regression guard de gobernanza de routes de mutación.
 * =============================================================================
 *
 * Convierte el reader de Full API Parity (TASK-1172) + el triage (TASK-1178 Slice 1)
 * en ENFORCEMENT: una route de mutación de negocio nueva NO puede nacer
 * `session-coarse` sin un capability-check (en el route o en su command) salvo que
 * se reconozca explícitamente como excepción ownership-governed en el allowlist de
 * abajo, con justificación.
 *
 * Por qué: la directiva CEO 2026-06-19 fija Full API Parity como base — toda
 * capability/acción nace con contrato gobernado a nivel capability (un primitive,
 * muchos consumers; Nexa/MCP la operan por construcción). El triage probó que el
 * 97.6% de la cola session-coarse YA está gobernada vía command; este guard impide
 * que la deuda vuelva a crecer en silencio cuando se agreguen routes nuevas.
 *
 * Cómo lee el resultado un dev cuando falla:
 *   "Tu route nueva muta estado sin capability-check. Agregá `can(subject, '<cap>', …)`
 *    en el route o (mejor) en su command de `src/lib/**` — patrón canónico enable-sync.
 *    Si es una operación self-service sobre datos PROPIOS del miembro (ownership-scoped,
 *    no admin-coarse), agregala al ALLOWLIST con su razón."
 *
 * Pure (sin DB): deriva de archivos del repo (git grep + reads). Corre en CI.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { REPO_ROOT, buildTriageReport } from './session-coarse-triage'

/**
 * Excepciones reconocidas: routes session-coarse SIN capability fina que NO son
 * deuda admin-coarse porque operan EXCLUSIVAMENTE datos propios del miembro
 * (ownership-scoped por `session.user.userId`), o son captura pública con su propio
 * contrato (rate-limit). No gobiernan estado de negocio compartido → una capability
 * fina sería over-governance (cada miembro la necesitaría granteada y no gatea nada).
 *
 * Regla para agregar una entrada: solo si la mutación está acotada al actor mismo
 * (o es público intencional). Cualquier acción que toque estado/permisos/datos de
 * OTROS, aprobaciones, exports, configuración o tenant compartido → NO va acá, va
 * gobernada con `can()`.
 */
const OWNERSHIP_GOVERNED_ALLOWLIST: Record<string, string> = {
  'src/app/api/coming-soon/notify/route.ts':
    'Captura pública/self de launch-notify (anónimo permitido + rate-limit propio). No es acción de negocio gobernada.',
  'src/app/api/home/inbox/[action]/route.ts':
    'Triage de notificaciones PROPIAS (markAsRead con session.user.userId). Ownership-scoped.',
  'src/app/api/home/nexa/feedback/route.ts':
    'Feedback sobre la respuesta Nexa PROPIA (userId/clientId de sesión). Ownership-scoped.',
  'src/app/api/home/nexa/threads/[threadId]/route.ts':
    'Rename/delete de thread Nexa PROPIO (store filtra por userId+clientId). Ownership-scoped.',
  'src/app/api/home/preferences/route.ts':
    'Update de preferencias PROPIAS del usuario. Ownership-scoped.',
  'src/app/api/home/recents/track/route.ts':
    'Track de recientes PROPIOS del usuario. Ownership-scoped.'
}

describe('TASK-1178 — session-coarse mutation-route governance gate', () => {
  const report = buildTriageReport()
  const debtFiles = report.debt.map(row => row.file)

  it('ninguna route de mutación nueva nace session-coarse sin capability (fuera del allowlist)', () => {
    const unacknowledged = debtFiles.filter(file => !(file in OWNERSHIP_GOVERNED_ALLOWLIST))

    expect(
      unacknowledged,
      [
        '',
        'Routes de mutación session-coarse SIN capability-check en ninguna capa (route ni command):',
        ...unacknowledged.map(file => `  - ${file}`),
        '',
        'Acción: gobernar con `can(subject, \'<cap>\', \'<action>\', \'<scope>\')` en el route o (mejor)',
        'en su command de src/lib/** (patrón canónico enable-sync). Si la operación es self-service',
        'sobre datos PROPIOS del miembro (ownership-scoped), agregala a OWNERSHIP_GOVERNED_ALLOWLIST',
        'con su justificación en scripts/audit/session-coarse-governance-gate.test.ts.',
        ''
      ].join('\n')
    ).toEqual([])
  })

  it('el allowlist no tiene entradas obsoletas (route gobernada o eliminada → quitarla)', () => {
    const stale = Object.keys(OWNERSHIP_GOVERNED_ALLOWLIST).filter(file => {
      const fileGone = !existsSync(path.join(REPO_ROOT, file))
      const nowGoverned = existsSync(path.join(REPO_ROOT, file)) && !debtFiles.includes(file)

      return fileGone || nowGoverned
    })

    expect(
      stale,
      `\nEntradas del allowlist que ya no son deuda session-coarse (route eliminada o ya gobernada). Quitalas:\n${stale
        .map(file => `  - ${file}`)
        .join('\n')}\n`
    ).toEqual([])
  })

  it('el triage sigue cubriendo la cola completa (sanity del reader)', () => {
    // Si esto baja de golpe, el detector de session-coarse se rompió (no que se
    // gobernó todo). Cota inferior defensiva, holgada.
    expect(report.sessionCoarseTotal).toBeGreaterThan(50)
    expect(report.commandGoverned + report.debtCandidates).toBe(report.sessionCoarseTotal)
  })
})
