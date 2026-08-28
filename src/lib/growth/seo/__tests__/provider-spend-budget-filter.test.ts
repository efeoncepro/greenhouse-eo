import { describe, expect, it } from 'vitest'

/**
 * TASK-1696 — El presupuesto SEO sólo suma dólares del consumidor SEO.
 *
 * Con la dimensión ya en la tabla y sin este filtro, el primer dólar que el grader AEO atribuya
 * a una organización se descuenta del presupuesto SEO de ese cliente **sin que nada falle**: el
 * gate empieza a bloquear capturas de rankings por un gasto que no es suyo, y el síntoma
 * (`budget_exhausted`) no se parece a la causa. Por eso el fragmento y el `ON CONFLICT` viajan
 * en el mismo commit, y por eso este test existe: es el que rompe si alguien "simplifica" la
 * query quitando la condición.
 */

import { buildSeoProviderSpendMonthlySumSql } from '../provider-spend'

describe('fragmento canónico del gasto mensual SEO (TASK-1696)', () => {
  const sql = buildSeoProviderSpendMonthlySumSql('$1')

  it('filtra por consumer = seo', () => {
    expect(sql).toContain("sp.consumer = 'seo'")
  })

  it('sigue tomando el placeholder por parámetro, sin fijar $1', () => {
    expect(buildSeoProviderSpendMonthlySumSql('$3')).toContain('sp.organization_id = $3')
  })

  it('acota al mes en curso', () => {
    expect(sql).toContain("sp.spend_date >= date_trunc('month', CURRENT_DATE)::date")
  })
})
