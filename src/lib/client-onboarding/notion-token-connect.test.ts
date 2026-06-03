/**
 * TASK-998 — test del clasificador de DBs Notion por título.
 */
import { describe, expect, it } from 'vitest'

import { classifyNotionDatabaseTitle } from './notion-token-connect'

describe('classifyNotionDatabaseTitle — TASK-998', () => {
  it('clasifica las 3 canónicas (es + en)', () => {
    expect(classifyNotionDatabaseTitle('Tareas')).toBe('tareas')
    expect(classifyNotionDatabaseTitle('Tasks')).toBe('tareas')
    expect(classifyNotionDatabaseTitle('Proyectos')).toBe('proyectos')
    expect(classifyNotionDatabaseTitle('Sprints')).toBe('sprints')
    expect(classifyNotionDatabaseTitle('Ciclos')).toBe('sprints')
  })

  it('tolera espacio final, mayúsculas y acentos (caso Berel "Sprints ")', () => {
    expect(classifyNotionDatabaseTitle('Sprints ')).toBe('sprints')
    expect(classifyNotionDatabaseTitle('  TAREAS  ')).toBe('tareas')
    expect(classifyNotionDatabaseTitle('Revisiónes')).toBe('revisiones') // acento normalizado
    expect(classifyNotionDatabaseTitle('Rondas de revisión')).toBe('revisiones')
  })

  it('lo demás cae en "otras" (Wiki, Content Hub, OKRs, etc.)', () => {
    expect(classifyNotionDatabaseTitle('Wiki de Berel')).toBe('otras')
    expect(classifyNotionDatabaseTitle('Content Hub')).toBe('otras')
    expect(classifyNotionDatabaseTitle('OKRs')).toBe('otras')
    expect(classifyNotionDatabaseTitle('')).toBe('otras')
  })
})
