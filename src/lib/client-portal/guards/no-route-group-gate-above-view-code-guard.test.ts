import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1679 follow-up — ninguna página puede poner un gate de routeGroup ENCIMA del guard
 * canónico.
 *
 * Detectado en staging el 2026-08-09 recorriendo las 9 rutas con las tres personas agente:
 * `/proyectos` devolvía `/401` al operador interno mientras las otras 8 abrían normal. La
 * causa era una migración incompleta — `TASK-827` reemplazó el gate de routeGroup por
 * `requireViewCodeAccess`, dejó el comentario que lo dice… y dejó el gate viejo cuatro
 * líneas más arriba. Al correr primero, ganaba, y como el `route_group_scope` del operador
 * interno no incluye `client`, el bypass D1 de soporte nunca se alcanzaba.
 *
 * El guard canónico ya cubre los dos tenant types: interno por bypass D1, cliente por módulo
 * contratado o vista base. Un segundo gate que corre antes sólo puede contradecirlo, y la
 * contradicción es invisible en review porque las dos líneas se leen como defensa en
 * profundidad.
 *
 * Nota de implementación: el patrón perseguido se compone en runtime en vez de escribirse
 * literal, porque este archivo vive dentro del árbol que el propio test escanea — un gate
 * que se detecta a sí mismo es ruido garantizado.
 */

const ROUTE_GROUP_GATE_PATTERN = ['routeGroups', '.includes('].join('')
const CANONICAL_GUARD_CALL = ['requireViewCodeAccess', '('].join('')

const listGuardedPages = (): readonly string[] =>
  execFileSync('git', ['ls-files', 'src/app/(dashboard)'], { encoding: 'utf8' })
    .split('\n')
    .filter(path => path.endsWith('page.tsx'))
    .filter(path => readFileSync(path, 'utf8').includes(CANONICAL_GUARD_CALL))

describe('no routeGroup gate above requireViewCodeAccess (TASK-1679 follow-up)', () => {
  it('finds the guarded pages (sanity: el barrido funciona)', () => {
    // Si esto da 0, el test pasa por vacío y no prueba nada. Al 2026-08-09 son 9.
    expect(listGuardedPages().length).toBeGreaterThanOrEqual(9)
  })

  it('does not gate on routeGroups before the canonical guard runs', () => {
    const offenders: string[] = []

    for (const path of listGuardedPages()) {
      const source = readFileSync(path, 'utf8')
      const guardIndex = source.indexOf(CANONICAL_GUARD_CALL)

      // Sólo el código ANTES del guard puede robarle la decisión. Un chequeo de routeGroup
      // después es otra cosa (por ejemplo, elegir qué renderizar) y no lo contradice.
      const beforeGuard = source
        .slice(0, guardIndex)
        .split('\n')
        .filter(line => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
        .join('\n')

      if (beforeGuard.includes(ROUTE_GROUP_GATE_PATTERN)) offenders.push(path)
    }

    expect(offenders).toEqual([])
  })
})
