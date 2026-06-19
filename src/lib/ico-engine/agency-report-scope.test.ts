/**
 * TASK-1171 Slice 2 — Agency report data-driven scope.
 *
 * El reporte de agencia pasó de hardcode `{efeonce, sky}` a DATA-DRIVEN sobre
 * todos los clientes reales (ICO transversal a las 4 unidades). Único excluido:
 * demo. Estos tests fijan ese contrato.
 */

import { describe, expect, it } from 'vitest'

import { buildAgencyReportScopeSql, isAgencyReportIncludedSpace } from './shared'

describe('isAgencyReportIncludedSpace — data-driven (TASK-1171 Slice 2)', () => {
  it('incluye Efeonce internal', () => {
    expect(isAgencyReportIncludedSpace({ clientId: 'efeonce_internal', clientName: 'Efeonce' })).toBe(true)
  })

  it('incluye Sky', () => {
    expect(isAgencyReportIncludedSpace({ clientId: 'hubspot-company-30825221458', clientName: 'Sky Airline' })).toBe(true)
  })

  it('incluye Grupo Berel (cliente real que ANTES quedaba fuera)', () => {
    expect(
      isAgencyReportIncludedSpace({
        clientId: 'cli-0863869c-eaac-4630-9bd0-af283c56f7fb',
        clientName: 'Grupo Berel'
      })
    ).toBe(true)
  })

  it('incluye cualquier cliente real nuevo', () => {
    expect(isAgencyReportIncludedSpace({ clientId: 'cli-nuevo-123', clientName: 'Cliente Nuevo' })).toBe(true)
  })

  it('EXCLUYE el teamspace demo', () => {
    expect(isAgencyReportIncludedSpace({ clientName: 'Greenhouse Demo' })).toBe(false)
    expect(isAgencyReportIncludedSpace({ spaceId: 'space-demo-x', clientName: 'Demo' })).toBe(false)
  })

  it('false cuando no hay contexto (sin space/client/name)', () => {
    expect(isAgencyReportIncludedSpace({})).toBe(false)
    expect(isAgencyReportIncludedSpace({ spaceId: '', clientId: '', clientName: '' })).toBe(false)
  })
})

describe('buildAgencyReportScopeSql — data-driven (TASK-1171 Slice 2)', () => {
  const sql = buildAgencyReportScopeSql({
    spaceIdExpression: 'te.space_id',
    clientIdExpression: 'te.client_id',
    primaryNameExpression: 'c1.client_name',
    secondaryNameExpression: 'c2.client_name'
  })

  it('incluye toda fila con espacio/cliente real', () => {
    expect(sql).toContain('COALESCE(te.space_id, te.client_id) IS NOT NULL')
  })

  it('excluye demo vía NOT LIKE', () => {
    expect(sql).toContain("NOT LIKE '%demo%'")
  })

  it('YA NO hardcodea efeonce/sky', () => {
    expect(sql).not.toContain("'efeonce'")
    expect(sql.toLowerCase()).not.toContain("like '%sky%'")
  })
})
