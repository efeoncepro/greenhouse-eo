import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

/**
 * TASK-1300 — Paridad entre el allowlist TS y el CHECK de la base.
 *
 * Cierra un drift que de otro modo se paga en dinero: si alguien agrega una familia a
 * `DATAFORSEO_FAMILIES` sin migrar el CHECK de `seo_provider_spend_daily`, cada llamada de
 * esa familia gasta de verdad, el INSERT del contador falla, el transporte lo observa pero
 * NO invalida el resultado ya cobrado — y el gate de presupuesto lee cero para esa familia
 * **para siempre**. Se descubriría en la factura.
 *
 * Este test hace imposible el escenario en vez de manejarlo: el drift rompe el build.
 */

import { DATAFORSEO_FAMILIES, DATAFORSEO_FAMILY_NAMES } from '../dataforseo-families'

const MIGRATION = join(
  process.cwd(),
  'migrations',
  '20260805194114467_task-1300-seo-provider-spend-daily.sql'
)

describe('paridad allowlist TS ↔ CHECK de seo_provider_spend_daily', () => {
  it('el CHECK de family enumera exactamente las familias del registry', () => {
    const sql = readFileSync(MIGRATION, 'utf8')
    const match = sql.match(/CHECK \(family IN \(([^)]+)\)\)/)

    expect(match, 'no se encontró el CHECK de family en la migración').not.toBeNull()

    const inMigration = (match?.[1] ?? '')
      .split(',')
      .map(value => value.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort()

    // Si esto falla: agregaste (o quitaste) una familia en el TS sin migrar el CHECK.
    // NO relajes el test — escribe la migración additive que sincroniza la base.
    expect(inMigration).toEqual([...DATAFORSEO_FAMILY_NAMES].sort())
  })
})

describe('serp.requiresOrganization sigue en false (TASK-1696)', () => {
  it('no exige organización, porque el grader público es un caso legítimo sin ella', () => {
    // 🔴 NO lo pongas en `true` "para cerrar la deuda": el grader corre sobre prospectos que no
    // son clientes y el camino público del lead magnet compartiría el fallo. Desde TASK-1696 la
    // atribución YA existe (el adapter pasa la organización cuando el perfil la tiene); lo que
    // no se puede es exigirla. El tipo no puede exigir lo que el dominio permite que falte.
    expect(DATAFORSEO_FAMILIES.serp.requiresOrganization).toBe(false)
  })

  it('las cuatro familias SEO sí la exigen: su gasto es siempre per-cliente', () => {
    expect(DATAFORSEO_FAMILIES.labs.requiresOrganization).toBe(true)
    expect(DATAFORSEO_FAMILIES.backlinks.requiresOrganization).toBe(true)
    expect(DATAFORSEO_FAMILIES.onpage.requiresOrganization).toBe(true)
    expect(DATAFORSEO_FAMILIES.domain.requiresOrganization).toBe(true)
  })
})
