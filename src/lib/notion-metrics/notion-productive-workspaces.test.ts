import { describe, expect, it } from 'vitest'

import {
  resolveProductiveWorkspace,
  isDemoTareasDataSource,
  PRODUCTIVE_TAREAS_DATA_SOURCE_IDS,
  DEMO_TAREAS_DATA_SOURCE_ID
} from './notion-productive-workspaces'

describe('TASK-912 — resolveProductiveWorkspace', () => {
  it('resuelve Efeonce + Sky por data source id canónico', () => {
    expect(resolveProductiveWorkspace(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce)).toBe('efeonce')
    expect(resolveProductiveWorkspace(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.sky)).toBe('sky')
  })

  it('tolera ids sin guiones (dashless) — Notion puede reportar ambos formatos', () => {
    expect(resolveProductiveWorkspace(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce.replace(/-/g, ''))).toBe('efeonce')
    expect(resolveProductiveWorkspace(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.sky.toUpperCase())).toBe('sky')
  })

  it('retorna null para el demo data source (NUNCA productivo)', () => {
    expect(resolveProductiveWorkspace(DEMO_TAREAS_DATA_SOURCE_ID)).toBeNull()
  })

  it('retorna null para id desconocido / vacío / null', () => {
    expect(resolveProductiveWorkspace('00000000-0000-0000-0000-000000000000')).toBeNull()
    expect(resolveProductiveWorkspace('')).toBeNull()
    expect(resolveProductiveWorkspace(null)).toBeNull()
    expect(resolveProductiveWorkspace(undefined)).toBeNull()
  })
})

describe('TASK-912 — isDemoTareasDataSource', () => {
  it('TRUE para el demo data source (con/sin guiones)', () => {
    expect(isDemoTareasDataSource(DEMO_TAREAS_DATA_SOURCE_ID)).toBe(true)
    expect(isDemoTareasDataSource(DEMO_TAREAS_DATA_SOURCE_ID.replace(/-/g, ''))).toBe(true)
  })

  it('FALSE para Efeonce/Sky/desconocido/null', () => {
    expect(isDemoTareasDataSource(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.efeonce)).toBe(false)
    expect(isDemoTareasDataSource(PRODUCTIVE_TAREAS_DATA_SOURCE_IDS.sky)).toBe(false)
    expect(isDemoTareasDataSource('whatever')).toBe(false)
    expect(isDemoTareasDataSource(null)).toBe(false)
  })
})
