import { describe, expect, it } from 'vitest'

import { downgradeStructuralHeadings, toPlainExcerpt } from './strip-markdown-excerpt'

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

describe('downgradeStructuralHeadings (TASK-1149)', () => {
  it('baja un `##` a negrita preservando el texto', () => {
    expect(downgradeStructuralHeadings('## Períodos de nómina')).toBe('**Períodos de nómina**')
  })

  it('cubre todos los niveles ATX (`#` … `######`)', () => {
    expect(downgradeStructuralHeadings('# H1')).toBe('**H1**')
    expect(downgradeStructuralHeadings('### H3')).toBe('**H3**')
    expect(downgradeStructuralHeadings('###### H6')).toBe('**H6**')
  })

  it('quita el cierre ATX opcional (`## Título ##`)', () => {
    expect(downgradeStructuralHeadings('## Título ##')).toBe('**Título**')
  })

  it('preserva viñetas, énfasis y links (NO aplana como toPlainExcerpt)', () => {
    const input = '## Estados\n- **Borrador**: en preparación.\n- Ver [el manual](https://x.com).'
    const out = downgradeStructuralHeadings(input)

    expect(out).toBe('**Estados**\n- **Borrador**: en preparación.\n- Ver [el manual](https://x.com).')
  })

  it('preserva headers dentro de un bloque de código (```)', () => {
    const input = 'Ejemplo:\n```md\n## No tocar esto\n```\n## Sí bajar esto'
    const out = downgradeStructuralHeadings(input)

    expect(out).toContain('## No tocar esto') // dentro del fence: intacto
    expect(out).toContain('**Sí bajar esto**') // fuera del fence: downgrade
  })

  it('es idempotente (aplicar dos veces = una vez)', () => {
    const once = downgradeStructuralHeadings('## Título\ntexto')

    expect(downgradeStructuralHeadings(once)).toBe(once)
  })

  it('no toca un header que ya viene como negrita (no doble-envuelve)', () => {
    expect(downgradeStructuralHeadings('## **Ya negrita**')).toBe('**Ya negrita**')
  })

  it('no toca prosa sin headers ni un `#` a mitad de línea', () => {
    expect(downgradeStructuralHeadings('texto con # numeral a mitad')).toBe('texto con # numeral a mitad')
    expect(downgradeStructuralHeadings('RpA mide rondas de revisión.')).toBe('RpA mide rondas de revisión.')
  })

  it('es seguro con string vacío', () => {
    expect(downgradeStructuralHeadings('')).toBe('')
  })
})
