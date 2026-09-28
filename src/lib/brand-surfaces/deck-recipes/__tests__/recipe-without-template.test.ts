import { describe, expect, it, vi } from 'vitest'

// Las 69 recetas tienen plantilla: para probar el aviso se simula el catálogo con una receta sin ella.
vi.mock('../catalog.generated.json', async importOriginal => {
  const original = (await importOriginal()) as { default: { recipes: { id: string; template: string | null }[] } }
  const catalog = structuredClone(original.default)

  catalog.recipes.find(recipe => recipe.id === 'decision-case')!.template = null

  return { default: catalog }
})

const { validateDeckPlan } = await import('../validate')

describe('recipe-without-template', () => {
  it('avisa (warning) cuando una receta aprobada todavía no tiene plantilla', () => {
    const result = validateDeckPlan({
      document: 'qbr',
      slides: ['cover-classic', 'decision-case', 'close-classic'].map(recipeId => ({ recipeId }))
    })

    const issue = result.issues.find(entry => entry.code === 'recipe-without-template')

    expect(issue).toMatchObject({ severity: 'warning', source: 'catalog', slideIndex: 1, recipeId: 'decision-case' })
  })

  it('no avisa con recetas que sí tienen plantilla', () => {
    const result = validateDeckPlan({
      document: 'qbr',
      slides: ['cover-classic', 'decision-chart', 'close-classic'].map(recipeId => ({ recipeId }))
    })

    expect(result.issues.map(entry => entry.code)).not.toContain('recipe-without-template')
  })
})
