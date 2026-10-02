/**
 * Guarda de marca (TASK-1965).
 *
 * Un modelo no sostiene una marca: cada pasada inventa otro logotipo. Un logo, isotipo o asset de marca no se genera
 * ni se "arregla" con inpainting; el SVG oficial se compone después
 * (`docs/operations/EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1.md`). Si el prompt los nombra, el comando se detiene
 * hasta que el operador confirme con --allow-brand que la edición sólo toca el contexto.
 */
const BRAND_TERMS = /\b(logos?|logotipos?|isotipos?|imagotipos?|wordmarks?|emblemas?|marcas?|brand(?:ing)?|efeonce|greenhouse|nexa)\b/i

export const findBrandTerm = (prompt: string): string | null => BRAND_TERMS.exec(prompt)?.[0] ?? null

export const assertBrandSafePrompt = (prompt: string, allowBrand: boolean): void => {
  const term = findBrandTerm(prompt)

  if (!term || allowBrand) return

  throw new Error(
    `El prompt nombra "${term}". Un logo o asset de marca no se genera con inpainting: compón el SVG oficial después ` +
      '(EFEONCE_BRAND_ASSET_REFERENCE_SELECTION_V1). Si la edición sólo toca el contexto, repite con --allow-brand.'
  )
}
