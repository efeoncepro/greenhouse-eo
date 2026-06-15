import { describe, expect, it } from 'vitest'

import { toPlainExcerpt } from './strip-markdown-excerpt'

describe('toPlainExcerpt (TASK-1124 follow-up)', () => {
  it('quita encabezados ATX crudos preservando el título', () => {
    const input = '## Las 7 fases de la CSC con habilitadores ICO\n1. **Planning** — calendario en Notion.'

    const out = toPlainExcerpt(input)

    expect(out).not.toContain('##')
    expect(out).not.toContain('**')
    expect(out).toContain('Las 7 fases de la CSC con habilitadores ICO')
    expect(out).toContain('Planning')
    expect(out).toContain('calendario en Notion')
  })

  it('colapsa saltos de línea a una sola corrida de prosa', () => {
    expect(toPlainExcerpt('línea uno\n\nlínea dos')).toBe('línea uno línea dos')
  })

  it('preserva el texto de links y descarta la URL', () => {
    expect(toPlainExcerpt('Ver [el manual](https://x.com/manual) para más.')).toBe('Ver el manual para más.')
  })

  it('quita blockquote, listas, énfasis y backticks', () => {
    expect(toPlainExcerpt('> cita importante')).toBe('cita importante')
    expect(toPlainExcerpt('- item de lista')).toBe('item de lista')
    expect(toPlainExcerpt('texto con _itálica_ y `código`')).toBe('texto con itálica y código')
  })

  it('es seguro con string vacío', () => {
    expect(toPlainExcerpt('')).toBe('')
  })

  it('no toca prosa plana', () => {
    expect(toPlainExcerpt('RpA mide las rondas de revisión por pieza.')).toBe(
      'RpA mide las rondas de revisión por pieza.'
    )
  })
})
